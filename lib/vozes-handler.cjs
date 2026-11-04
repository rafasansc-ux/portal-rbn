'use strict';
const crypto=require('node:crypto');
const {uuid}=require('./roteiros.cjs');
const {TERMOS,TERMOS_VERSAO,validarCadastro,consentimentoValido,clonar,consultar}=require('./vozes.cjs');
const bucket='portal-vozes-documentos';
async function vozesHandler({req,res,parsed,method,db,admin,radio,user,role,env,send,readBody,checked,clone=clonar,verify=consultar}){
 if(role!=='administrador')return send(res,403,{error:'Somente administradores podem gerenciar vozes e autorizações.'});
 if(!admin)return send(res,503,{error:'Armazenamento privado de vozes ainda não configurado.'});
 const id=parsed.searchParams.get('id');if(id&&!uuid.test(id))return send(res,400,{error:'Cadastro inválido.'});
 const event=(locutor,acao)=>checked(admin.from('portal_voz_eventos').insert({radio_id:radio.id,locutor_id:locutor,usuario_id:user.id,acao}));
 if(method==='GET'&&!id){
  const rows=await checked(db.from('portal_locutores').select('id,nome,responsavel,canal_revogacao,consentimento_ate,estado,voz_id,provedor_verificada,criado_em,revogado_em,documento_caminho').eq('radio_id',radio.id).order('criado_em',{ascending:false}).limit(100));
  const plano=await checked(db.from('portal_audio_planos').select('limite_vozes').eq('radio_id',radio.id));
  return send(res,200,{locutores:rows,termos:TERMOS,termosVersao:TERMOS_VERSAO,limiteVozes:plano[0]?.limite_vozes||0,clonagemHabilitada:env.VOICE_CLONING_ENABLED==='true'&&!!env.ELEVENLABS_API_KEY});
 }
 if(method==='GET'&&id){
  const rows=await checked(db.from('portal_locutores').select('*').eq('radio_id',radio.id).eq('id',id));const row=rows[0];if(!row)return send(res,404,{error:'Locutor não encontrado.'});
  const file=parsed.searchParams.get('arquivo');if(!['autorizacao','amostra'].includes(file))return send(res,400,{error:'Escolha autorização ou amostra.'});
  if(file==='autorizacao'&&!row.documento_caminho)return send(res,404,{error:'Autorização mantida pelo responsável da emissora; o PDF não foi enviado ao portal.'});
  const data=await checked(admin.storage.from(bucket).download(file==='autorizacao'?row.documento_caminho:row.amostra_caminho));
  await event(id,'download_'+file);res.statusCode=200;res.setHeader('Content-Type',file==='autorizacao'?'application/pdf':'audio/mpeg');res.setHeader('Content-Disposition',`attachment; filename="${file}-${id}.${file==='autorizacao'?'pdf':'mp3'}"`);return res.end(Buffer.from(await data.arrayBuffer()));
 }
 if(method!=='POST')return send(res,405,{error:'Operação indisponível.'});
 const body=await readBody(req);
 if(body.acao==='cadastrar'&&!id){
  const externa=body.guardaExterna===true;
  const dados=externa?{responsavel:'Administrador autenticado '+user.id,canalRevogacao:'Canal informado no documento sob guarda do responsável da emissora.',destinoAudios:'Conforme autorização assinada mantida pelo responsável da emissora.',guardaDocumentos:'Documento mantido fora do portal pelo responsável autenticado da emissora.'}:{};
  const info=validarCadastro({...body,...dados});const existing=await checked(db.from('portal_locutores').select('id').eq('radio_id',radio.id).limit(20));
  if(existing.length>=20)return send(res,409,{error:'Limite de 20 cadastros por emissora. Fale com o administrador da plataforma.'});
  const recordId=crypto.randomUUID(),folder=radio.id+'/'+recordId;
  const documento_caminho=externa?'':folder+'/autorizacao.pdf',amostra_caminho=folder+'/amostra.mp3';
  if(!externa)await checked(admin.storage.from(bucket).upload(documento_caminho,info.documento,{contentType:'application/pdf',upsert:false}));
  try{
   await checked(admin.storage.from(bucket).upload(amostra_caminho,info.amostra,{contentType:'audio/mpeg',upsert:false}));
   const {documento,amostra,...record}=info;
   await checked(admin.from('portal_locutores').insert({...record,id:recordId,radio_id:radio.id,criado_por:user.id,documento_caminho,amostra_caminho}));
  }catch(e){await admin.storage.from(bucket).remove([documento_caminho,amostra_caminho].filter(Boolean));throw e}
  await event(recordId,externa?'autorizacao_declarada_guarda_externa':'autorizacao_documentada');return send(res,200,{id:recordId});
 }
 if(!id)return send(res,400,{error:'Informe o locutor.'});
 const rows=await checked(db.from('portal_locutores').select('*').eq('radio_id',radio.id).eq('id',id));const row=rows[0];
 if(!row)return send(res,404,{error:'Locutor não encontrado.'});
 if(body.acao==='desativar'||body.acao==='revogar'){
  if(row.revogado_em)return send(res,200,{ok:true});
  const revoked=body.acao==='revogar';
  await checked(admin.from('portal_locutores').update({estado:revoked?'revogada':'desativada',...(revoked?{revogado_em:new Date().toISOString()}:{} )}).eq('radio_id',radio.id).eq('id',id));
  if(row.voz_id)await checked(admin.from('portal_vozes').update({ativa:false,autorizada:false}).eq('radio_id',radio.id).eq('id',row.voz_id));
  await event(id,revoked?'consentimento_revogado':'voz_desativada');return send(res,200,{ok:true});
 }
 if(!consentimentoValido(row))return send(res,409,{error:'Autorização vencida ou revogada. Não é permitido clonar ou ativar esta voz.'});
 if(body.acao==='clonar'){
  if(env.VOICE_CLONING_ENABLED!=='true'||!env.ELEVENLABS_API_KEY)return send(res,503,{error:'Cadastro salvo. A clonagem depende da liberação técnica e da permissão Vozes: Escrita na chave ElevenLabs.'});
  if(body.confirmarEnvio!==true)return send(res,400,{error:'Confirme o envio da amostra autorizada à ElevenLabs.'});
  const reservation=await admin.rpc('portal_iniciar_clonagem',{p_radio:radio.id,p_locutor:id,p_usuario:user.id});
  if(reservation.error||!reservation.data)return send(res,409,{error:'Clonagem não iniciada: confira o limite do plano, a validade e o estado do cadastro. Não repita pedidos em processamento ou incertos.'});
  try{
   const blob=await checked(admin.storage.from(bucket).download(row.amostra_caminho));const audio=Buffer.from(await blob.arrayBuffer());
   if(crypto.createHash('sha256').update(audio).digest('hex')!==row.amostra_sha256)throw Error('Amostra não corresponde ao cadastro.');
   // Recheck revocation immediately before the external upload.
   const current=await checked(admin.from('portal_locutores').select('*').eq('id',id).eq('radio_id',radio.id));if(!consentimentoValido(current[0])||current[0].estado!=='clonando')throw Error('Autorização alterada.');
   const voice=await clone({key:env.ELEVENLABS_API_KEY,nome:'Emissora '+radio.id.slice(0,8)+' · '+row.nome,audio});
   const voices=await checked(admin.from('portal_vozes').insert({radio_id:radio.id,nome:row.nome,provedor_id:voice.voice_id,tipo:'ivc',ativa:false,autorizada:false,evidencia_licenca:'Consentimento documentado '+id}).select('id'));
   await checked(admin.from('portal_locutores').update({provedor_id:voice.voice_id,voz_id:voices[0].id,provedor_verificada:voice.verificada}).eq('id',id).eq('radio_id',radio.id));
   await checked(admin.from('portal_locutores').update({estado:voice.verificada?'aguardando_aprovacao':'aguardando_verificacao'}).eq('id',id).eq('radio_id',radio.id).eq('estado','clonando').is('revogado_em',null));
   await event(id,'clone_criado_bloqueado');return send(res,200,{ok:true,verificacaoPendente:!voice.verificada});
  }catch(e){await admin.from('portal_locutores').update({estado:'incerta'}).eq('id',id).eq('radio_id',radio.id).eq('estado','clonando');return send(res,502,{error:'Não foi possível confirmar a clonagem. O cadastro ficou bloqueado para conferência; não haverá repetição automática. '+(e.message.startsWith('A chave ElevenLabs')?e.message:'Confira a conta ElevenLabs antes de tentar qualquer novo cadastro.')})}
 }
 if(body.acao==='verificar'||body.acao==='ativar'){
  if(!row.provedor_id||!row.voz_id||!['aguardando_verificacao','aguardando_aprovacao','desativada','ativa'].includes(row.estado))return send(res,409,{error:'Esta voz ainda não pode ser liberada.'});
  const verified=await verify({key:env.ELEVENLABS_API_KEY,voice:row.provedor_id});
  if(!verified){await checked(admin.from('portal_locutores').update({provedor_verificada:false,estado:'aguardando_verificacao'}).eq('id',id).eq('radio_id',radio.id).is('revogado_em',null));return send(res,409,{error:'A ElevenLabs exige verificação. O próprio locutor deve concluí-la no provedor; o portal manterá a voz bloqueada.'})}
  const activate=body.acao==='ativar';
  if(activate&&body.confirmarUso!==true)return send(res,400,{error:'Confirme a liberação para a finalidade autorizada.'});
  const changed=await checked(admin.from('portal_locutores').update({provedor_verificada:true,estado:activate?'ativa':row.estado==='aguardando_verificacao'?'aguardando_aprovacao':row.estado}).eq('radio_id',radio.id).eq('id',id).is('revogado_em',null).gt('consentimento_ate',new Date().toISOString()).in('estado',['aguardando_verificacao','aguardando_aprovacao','desativada','ativa']).select('id'));
  if(!changed.length)return send(res,409,{error:'A autorização mudou durante a conferência. Voz bloqueada.'});
  if(activate)await checked(admin.from('portal_vozes').update({ativa:true,autorizada:true}).eq('id',row.voz_id).eq('radio_id',radio.id));
  await event(id,activate?'voz_ativada':'verificacao_consultada');return send(res,200,{ok:true});
 }
 return send(res,400,{error:'Ação inválida.'});
}
module.exports={vozesHandler};
