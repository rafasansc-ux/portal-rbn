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
