'use strict';
const crypto=require('node:crypto');
const {duracaoMP3}=require('./locucao.cjs');
const TERMOS_VERSAO='voz-2026-11-03-v1';
const TERMOS='Autorizo expressamente a emissora identificada neste cadastro a enviar minha amostra à ElevenLabs para criar uma voz sintética e gerar locuções dos boletins da própria emissora, até a data indicada. Não autorizo compartilhamento com outras emissoras nem uso para outras finalidades. Posso revogar a autorização pelo canal indicado; a revogação bloqueia novas gerações. O destino dos áudios já produzidos deve constar no documento assinado. Autorização e registros de auditoria serão mantidos conforme o prazo de guarda informado no documento. A emissora deve informar ao público quando necessário que a locução é sintética.';
function falha(message,status=400){throw Object.assign(Error(message),{status})}
function campo(value,name,max=160){if(typeof value!=='string'||!value.trim()||value.trim().length>max)falha('Informe '+name+'.');return value.trim()}
function arquivo(value,max,name){if(typeof value!=='string'||!value||value.length>Math.ceil(max/3)*4||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))falha('Arquivo inválido: '+name);const b=Buffer.from(value,'base64');if(!b.length||b.length>max||b.toString('base64')!==value)falha('Arquivo excede o limite ou está corrompido: '+name);return b}
function validarCadastro(b,now=Date.now()){
 if(!b||b.autorizacaoExpressa!==true||b.documentoConferido!==true||b.termosVersao!==TERMOS_VERSAO)falha('É obrigatório conferir a autorização expressa assinada antes de cadastrar a voz.');
 const nome=campo(b.nome,'o nome completo do locutor',100),responsavel=campo(b.responsavel,'o responsável pela conferência',100),canal=campo(b.canalRevogacao,'um canal para revogação',200);
 const destino=campo(b.destinoAudios,'o tratamento dos áudios já produzidos',500),guarda=campo(b.guardaDocumentos,'o prazo e finalidade de guarda dos documentos',500);
 if(typeof b.validade!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.validade))falha('Informe a validade da autorização.');
 const validade=new Date(b.validade+'T23:59:59-03:00');if(!Number.isFinite(validade.getTime())||new Date(b.validade+'T12:00:00Z').toISOString().slice(0,10)!==b.validade||validade.getTime()<=now||validade.getTime()>now+366*86400000*5)falha('A validade deve ser futura e de até cinco anos.');
 const documento=arquivo(b.documento,250000,'autorização PDF'),amostra=arquivo(b.amostra,1000000,'amostra MP3');
 if(documento.subarray(0,5).toString()!=='%PDF-'||!documento.subarray(-1024).includes(Buffer.from('%%EOF')))falha('Envie a autorização em PDF válido, até 250 KB.');
 let segundos;try{segundos=duracaoMP3(amostra)}catch{falha('Envie uma amostra MP3 padrão, sem trilha e com apenas um locutor.');}
 if(segundos<60||segundos>180)falha('A amostra deve ter de 1 a 3 minutos, em MP3 de até 1 MB.');
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 return {nome,responsavel,canal_revogacao:canal,destino_audios:destino,guarda_documentos:guarda,consentimento_ate:validade.toISOString(),termos_versao:TERMOS_VERSAO,termos_texto:TERMOS,termos_sha256:hash(Buffer.from(TERMOS)),documento_sha256:hash(documento),amostra_sha256:hash(amostra),amostra_segundos:segundos,documento,amostra};
}
function consentimentoValido(row,now=Date.now()){return !!row&&!row.revogado_em&&new Date(row.consentimento_ate).getTime()>now;}
function verificacao(d){const v=d?.voice_verification;return !!v&&v.requires_verification===false&&!['BAN','CAPTCHA','ENTERPRISE_BAN','ENTERPRISE_CAPTCHA'].includes(d.safety_control);}
async function clonar({key,nome,audio,fetcher=fetch}){
 const form=new FormData();form.append('name',nome);form.append('files',new Blob([audio],{type:'audio/mpeg'}),'amostra.mp3');form.append('description','Voz privada autorizada para boletins da emissora.');form.append('remove_background_noise','false');
 const r=await fetcher('https://api.elevenlabs.io/v1/voices/add',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(35000)});
 if(!r.ok)falha(r.status===401||r.status===403?'A chave ElevenLabs precisa da permissão Vozes: Escrita. Confira também os limites da conta.':'A ElevenLabs não concluiu a clonagem. Confira os limites e requisitos da conta.',502);
 const b=await r.json();if(!/^[A-Za-z0-9_-]{1,128}$/.test(b.voice_id||''))falha('Resposta inesperada da ElevenLabs; não repita a solicitação.',502);
 return {voice_id:b.voice_id,verificada:b.requires_verification===false};
}
async function consultar({key,voice,fetcher=fetch}){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(voice))falha('Identificador de voz inválido.');
 const r=await fetcher('https://api.elevenlabs.io/v1/voices/'+voice,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(10000)});
 if(!r.ok)falha('Não foi possível verificar a voz na ElevenLabs.',502);return verificacao(await r.json());
}
module.exports={TERMOS,TERMOS_VERSAO,validarCadastro,consentimentoValido,verificacao,clonar,consultar};
