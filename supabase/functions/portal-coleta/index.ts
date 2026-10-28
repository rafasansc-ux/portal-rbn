import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {XMLParser,XMLValidator} from 'npm:fast-xml-parser@5.11.2';
const arr=x=>x===undefined?[]:Array.isArray(x)?x:[x];const text=x=>typeof x==='string'?x:typeof x==='number'?String(x):x?.['#text']||'';function decodeText(value){let result=text(value);const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};for(let i=0;i<3;i++)result=result.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(all,entity)=>{if(entity[0]!=='#')return named[entity.toLowerCase()]||all;const n=entity[1]?.toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):' '});return result}
const clean=x=>decodeText(x).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function parse(xml){if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('XML inválido ou contém declaração não permitida');const d=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false}).parse(xml);const rows=d.rss?.channel?.item??d.feed?.entry;if(!rows)return [];return arr(rows).slice(0,200).map(n=>{const links=arr(n.link);const href=links.find(l=>l?.['@_rel']==='alternate')?.['@_href']||links.find(l=>l?.['@_href'])?.['@_href']||text(n.link);let link='';try{const u=new URL(decodeText(href));if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password)link=u.href}catch{}return {titulo:clean(n.title).slice(0,500),resumo:clean(n.description??n.summary??n.content??'').slice(0,1500),link,publicadoEm:clean(n.pubDate??n.published??n.updated??'').slice(0,100)}}).filter(n=>n.titulo&&n.link)}

const MAX_PER_SOURCE=5;
function selectHighlights(items,limit=MAX_PER_SOURCE){
 const seen=new Set();return items.map((item,index)=>({item,index,time:Date.parse(item.publicadoEm)||0}))
 .sort((a,b)=>b.time-a.time||a.index-b.index).map(x=>x.item)
 .filter(n=>{if(!n.titulo||!n.link||seen.has(n.link))return false;seen.add(n.link);return true}).slice(0,limit);
}
const EPAGRI_URL='https://ciram.epagri.sc.gov.br/index.php/previsao-5-dias/';
function parseEpagri(html){
 const content=html.match(/<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1];
 if(!content)throw Error('Formato do boletim Epagri não reconhecido');
 const paragraphs=[...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1].replace(/<br\s*\/?\s*>/gi,' '))).filter(Boolean);
 const title=paragraphs[0]||'Previsão de tempo para Santa Catarina';
 const days=paragraphs.filter(p=>/^(Segunda-feira|Terça-feira|Quarta-feira|Quinta-feira|Sexta-feira|Sábado|Domingo)\s*\(/i.test(p));
 if(!days.length)throw Error('Texto de previsão da Epagri não encontrado');
 let remaining=150;const excerpt=[];for(const day of days.slice(0,2)){const words=day.split(/\s+/);const part=words.slice(0,remaining);if(!part.length)break;excerpt.push(part.join(' ')+(words.length>remaining?'…':''));remaining-=part.length}
 const published=html.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1]||null;
 const author=paragraphs.find(p=>/meteorologista/i.test(p))?.slice(0,140)||null;
 return {fonte:'Epagri/Ciram',abrangencia:'Santa Catarina',titulo:title.slice(0,200),paragrafos:excerpt,publicadoEm:published,consultadoEm:new Date().toISOString(),autor:author,url:EPAGRI_URL};
}


// Requer o cabeçalho secreto emitido pelo Cron. Não aceita a chave pública como autorização.
const allowedHosts=new Set(['ocp.news','portal.rbnfm.com.br','g1.globo.com','ndmais.com.br','www.gazetadopovo.com.br','www.cnnbrasil.com.br','agenciabrasil.ebc.com.br','ge.globo.com','news.google.com','ciram.epagri.sc.gov.br']);
async function fetchPublic(url,deadline=Date.now()+10000,hops=0){
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!allowedHosts.has(u.hostname))throw Error('Domínio não liberado para coleta automática');
 if(hops>3||Date.now()>=deadline)throw Error('Tempo limite ou redirecionamentos excedidos');
 const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(Math.max(1,deadline-Date.now())),headers:{'User-Agent':'PortalRedacao/0.3 RSS'}});
 if([301,302,303,307,308].includes(r.status)&&r.headers.get('location')){await r.body?.cancel();return fetchPublic(new URL(r.headers.get('location'),u).href,deadline,hops+1)}
 if(!r.ok){await r.body?.cancel();throw Error('Fonte respondeu HTTP '+r.status)}
 const reader=r.body.getReader();let size=0;const parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw Error('Fonte excede o tamanho permitido');parts.push(value)}}catch(e){await reader.cancel();throw e}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return new TextDecoder().decode(bytes);
}
async function collectEdge(sources,previous){
 const active=sources.filter(s=>s.ativa).slice(0,40),results=new Array(active.length);let next=0;
 async function worker(){while(next<active.length){const i=next++,source=active[i];try{results[i]={source,items:parse(await fetchPublic(source.rss))}}catch(e){results[i]={source,error:e.message,items:previous.editorias?.find(ed=>ed.nome===source.editoria)?.fontes.find(f=>f.nome===source.nome)?.noticias||[]}}}}
 await Promise.all(Array.from({length:Math.min(10,active.length)},worker));
 const groups=new Map(),errors=[],seen=new Set();let total=0;
 for(const {source,items,error}of results){if(error)errors.push({fonte:source.nome,erro:error});const noticias=[];for(const n of selectHighlights(items,200)){if(seen.has(n.link))continue;seen.add(n.link);noticias.push(n);if(noticias.length===MAX_PER_SOURCE)break}if(!noticias.length)continue;if(!groups.has(source.editoria))groups.set(source.editoria,{nome:source.editoria,fontes:[]});groups.get(source.editoria).fontes.push({nome:source.nome,noticias});total+=noticias.length}
 const now=new Date();return {data:now.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),hora:now.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'}),tentativaEm:now.toISOString(),automatico:true,maxPorFonte:5,total,editorias:[...groups.values()],erros:errors};
}
Deno.serve(async req=>{
 const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return response(405,{error:'Use POST'});
 const token=req.headers.get('x-portal-job');if(!token||!/^[a-f0-9]{64}$/.test(token))return response(401,{error:'Não autorizado'});
 const db=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const authorization=await db.rpc('portal_job_validar',{p_token:token});if(authorization.error||authorization.data!==true)return response(403,{error:'Não autorizado'});
 try{
  const body=await req.text();if(body.length>1024)return response(413,{error:'Solicitação muito grande'});const {radio_id}=JSON.parse(body);
  if(typeof radio_id!=='string'||! /^[a-f0-9-]{36}$/i.test(radio_id))return response(400,{error:'Rádio inválida'});
  const lock=await db.rpc('portal_job_reservar',{p_radio:radio_id});if(lock.error)return response(403,{error:'Rádio indisponível'});if(!lock.data)return response(200,{ok:true,ignorado:'Coleta já em andamento ou recente'});
  const [sources,old]=await Promise.all([db.from('portal_fontes').select('nome,editoria,rss,ativa').eq('radio_id',radio_id),db.from('portal_boletins').select('dados').eq('radio_id',radio_id).single()]);if(sources.error||old.error)throw Error('Não foi possível ler as fontes');
  const news=await collectEdge(sources.data,old.data?.dados||{editorias:[]});const now=new Date().toISOString();
  const saved=await db.from('portal_boletins').update({dados:news,ultima_tentativa:now,...(!news.erros.length?{ultimo_sucesso:now}:{}),coleta_token:null,coleta_usuario:null,coleta_ate:null}).eq('radio_id',radio_id).eq('coleta_token',lock.data).select('radio_id');if(saved.error||!saved.data?.length)throw Error('Coleta expirada; conteúdo anterior preservado');
  let weatherOK=true;try{const weather=parseEpagri(await fetchPublic(EPAGRI_URL));const savedWeather=await db.from('portal_tempo').upsert({id:'epagri',dados:weather,atualizado_em:now});if(savedWeather.error)weatherOK=false}catch{weatherOK=false}
  return response(200,{ok:true,total:news.total,fontesComFalha:news.erros.length,tempoAtualizado:weatherOK});
 }catch(e){console.error('Falha na coleta automática:',e.message);return response(500,{error:'Coleta não concluída; confira os logs do servidor.'})}
});
