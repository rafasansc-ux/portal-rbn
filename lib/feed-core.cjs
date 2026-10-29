// Generated from feed-core.mjs by tools/build-core.cjs.
const {XMLParser,XMLValidator}=require('fast-xml-parser');
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
module.exports={parse,clean,decodeText,selectHighlights,MAX_PER_SOURCE,parseEpagri,EPAGRI_URL};
