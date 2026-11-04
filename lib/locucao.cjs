'use strict';
const {uuid}=require('./roteiros.cjs');
function preparar(record,body={}){
 if(!uuid.test(body.voz||'')||!uuid.test(body.chave||''))throw Error('Escolha uma voz e uma solicitação válida.');
 const ritmo=Number(body.ritmo??1);if(!Number.isFinite(ritmo)||ritmo<0.8||ritmo>1.2)throw Error('Ritmo deve ficar entre 0,8 e 1,2.');
 if(!['neutro','expressivo'].includes(body.estilo))throw Error('Estilo inválido.');
 const texto=record.dados.itens.map(i=>[i.titulo,i.texto].filter(Boolean).join('.\n')).join('\n\n').trim();
 const caracteres=Array.from(texto).length;if(!caracteres||caracteres>3000)throw Error('O piloto aceita boletins de 1 a 3.000 caracteres.');
 return {texto,caracteres,ritmo,estilo:body.estilo,segundosEstimados:Math.ceil(texto.split(/\s+/).length/140*60/ritmo)};
}
// Count complete MPEG-1 Layer III frames, rather than treating file bytes as duration.
function duracaoMP3(b){let seconds=0,frames=0;for(let i=0;i+4<b.length;){
 if(b[i]===255&&(b[i+1]&254)===250){const rate=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][b[i+2]>>4],hz=[44100,48000,32000][(b[i+2]>>2)&3];
 if(rate&&hz){const n=Math.floor(144000*rate/hz)+((b[i+2]>>1)&1);if(i+n<=b.length){seconds+=1152/hz;frames++;i+=n;continue}}}i++;
 }if(!frames)throw Error('Formato de áudio inesperado.');return Math.ceil(seconds);}
async function gerar({key,voice,texto,ritmo,estilo,fetcher=fetch}){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(voice))throw Error('Voz do provedor inválida.');
 const response=await fetcher('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(voice)+'?output_format=mp3_44100_128',{
 method:'POST',signal:AbortSignal.timeout(45000),headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({text:texto,model_id:'eleven_multilingual_v2',voice_settings:{speed:ritmo,stability:estilo==='expressivo'?0.35:0.65,similarity_boost:0.75,style:estilo==='expressivo'?0.3:0,use_speaker_boost:true}})});
 if(!response.ok)throw Error('O provedor não concluiu a geração. Confira o histórico antes de tentar novamente.');
 if(!response.headers.get('content-type')?.includes('audio/'))throw Error('O provedor retornou um formato inesperado.');
 const chunks=[];let size=0;for await(const c of response.body){size+=c.length;if(size>9_600_000)throw Error('Áudio ultrapassou o limite do piloto.');chunks.push(Buffer.from(c))}
 const audio=Buffer.concat(chunks),segundos=duracaoMP3(audio);if(segundos>600)throw Error('Áudio ultrapassou dez minutos.');
 const count=response.headers.get('x-character-count');const used=count!==null&&/^\d+$/.test(count)?Number(count):null;
 return {audio,segundos,consumoReportado:used,requestId:response.headers.get('request-id')||null};
}
module.exports={preparar,gerar,duracaoMP3};
