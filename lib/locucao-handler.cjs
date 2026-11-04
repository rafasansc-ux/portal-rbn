'use strict';
const {preparar,gerar}=require('./locucao.cjs');
const {uuid}=require('./roteiros.cjs');
const fields='id,roteiro_id,versao,titulo,voz_id,estado,caracteres,segundos,consumo_reportado,custo_estimado_usd,aprovado_em,criado_em';
async function locucaoHandler({req,res,parsed,method,db,admin,radio,user,env,send,readBody,checked,generate=gerar}){
 const id=parsed.searchParams.get('id');if(id&&!uuid.test(id))return send(res,400,{error:'Áudio inválido.'});
 if(method==='GET'&&!id){
  if(env.AUDIO_ENABLED!=='true'||!env.ELEVENLABS_API_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return send(res,200,{habilitado:false,vozes:[],historico:[],aviso:'Locução em preparação. Falta ativar a integração e a franquia de teste.'});
  if(!admin)return send(res,200,{habilitado:false,vozes:[],historico:[],aviso:'A chave privada do Supabase está incompleta ou inválida. Copie a chave completa pelo botão Copy API key, sem os pontos de máscara, e atualize SUPABASE_SERVICE_ROLE_KEY na Vercel.'});
  const planos=await checked(db.from('portal_audio_planos').select('ativo,limite_caracteres,limite_segundos,usd_por_mil').eq('radio_id',radio.id));
  const vozes=await checked(db.from('portal_vozes').select('id,nome').eq('radio_id',radio.id).eq('ativa',true).eq('autorizada',true));
  const dateParts=new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
  const mes=dateParts.find(p=>p.type==='year').value+'-'+dateParts.find(p=>p.type==='month').value+'-01';
  const uso=await checked(db.from('portal_locucoes').select('caracteres,segundos,segundos_reservados,custo_estimado_usd').eq('radio_id',radio.id).eq('mes',mes));
  const historico=await checked(db.from('portal_locucoes').select(fields).eq('radio_id',radio.id).order('criado_em',{ascending:false}).limit(50));
  return send(res,200,{habilitado:!!planos[0]?.ativo,plano:planos[0],vozes,historico,uso:uso.reduce((a,j)=>({caracteres:a.caracteres+j.caracteres,segundos:a.segundos+(j.segundos??j.segundos_reservados),usd:a.usd+Number(j.custo_estimado_usd)}),{caracteres:0,segundos:0,usd:0})});
 }
 if(method==='GET'&&id){
  const rows=await checked(db.from('portal_locucoes').select('*').eq('radio_id',radio.id).eq('id',id));const job=rows[0];
  if(!job||job.estado!=='pronto')return send(res,404,{error:'Áudio ainda indisponível.'});
  if(parsed.searchParams.has('download')&&!job.aprovado_em)return send(res,409,{error:'Ouça e aprove o áudio antes de baixar.'});
  if(!admin)return send(res,503,{error:'Armazenamento não configurado.'});
  const blob=await checked(admin.storage.from('portal-locucoes').download(job.caminho));
  res.statusCode=200;res.setHeader('Content-Type','audio/mpeg');res.setHeader('Content-Disposition',`${parsed.searchParams.has('download')?'attachment':'inline'}; filename="boletim-${id}.mp3"`);return res.end(Buffer.from(await blob.arrayBuffer()));
 }
 if(method==='PUT'&&id){
  if(!admin)return send(res,503,{error:'Integração não configurada.'});
  const rows=await checked(db.from('portal_locucoes').select('id').eq('radio_id',radio.id).eq('id',id).eq('estado','pronto'));
  if(!rows.length)return send(res,404,{error:'Áudio não encontrado.'});
  await checked(admin.from('portal_locucoes').update({aprovado_em:new Date().toISOString(),aprovado_por:user.id}).eq('id',id).eq('radio_id',radio.id));return send(res,200,{ok:true});
 }
 if(method==='POST'){
  if(env.AUDIO_ENABLED!=='true'||!env.ELEVENLABS_API_KEY||!admin)return send(res,503,{error:'Geração ainda não ativada. Nenhum consumo realizado.'});
  const body=await readBody(req);if(!uuid.test(body.roteiro||''))return send(res,400,{error:'Salve o boletim antes de gerar.'});
  const rows=await checked(db.from('portal_roteiros').select('*').eq('radio_id',radio.id).eq('id',body.roteiro).is('excluido_em',null));
  if(!rows.length)return send(res,404,{error:'Boletim não encontrado.'});
  const record=rows[0];if(body.versao!==record.versao)return send(res,409,{error:'Salve e reabra a versão atual do boletim.'});
  const prepared=preparar(record,body);
  const voces=await checked(db.from('portal_vozes').select('id,provedor_id').eq('radio_id',radio.id).eq('id',body.voz).eq('ativa',true).eq('autorizada',true));
  if(!voces.length)return send(res,403,{error:'Voz não autorizada para esta emissora.'});
  const reservation=await admin.rpc('portal_reservar_locucao',{p_radio:radio.id,p_usuario:user.id,p_roteiro:record.id,p_versao:record.versao,p_voz:body.voz,p_chave:body.chave,p_ritmo:prepared.ritmo,p_estilo:prepared.estilo});
  if(reservation.error){
   const code=String(reservation.error.code||'sem_codigo').replace(/[^a-zA-Z0-9_]/g,'').slice(0,30);
   const rejectedKey=/invalid api key|invalid jwt|unauthorized|no api key/i.test(reservation.error.message||'');
   return send(res,409,{error:rejectedKey?'O Supabase não aceitou a chave privada configurada no servidor. Copie novamente Secret keys → default para SUPABASE_SERVICE_ROLE_KEY na Vercel. Nenhuma geração foi enviada ao provedor.':code==='P0001'?'Franquia insuficiente, voz desativada ou boletim alterado. Atualize e confira os limites antes de tentar novamente.':`Não foi possível reservar a locução no servidor (${code}). Nenhuma geração foi enviada ao provedor.`});
  }
  const job=reservation.data;if(!job.nova)return send(res,200,{id:job.id,repetido:true});
  try{
   const result=await generate({key:env.ELEVENLABS_API_KEY,voice:voces[0].provedor_id,...prepared});
   const path=radio.id+'/'+job.id+'.mp3';
   await checked(admin.storage.from('portal-locucoes').upload(path,result.audio,{contentType:'audio/mpeg',upsert:false}));
   await checked(admin.from('portal_locucoes').update({estado:'pronto',caminho:path,segundos:result.segundos,consumo_reportado:result.consumoReportado,request_id:result.requestId}).eq('radio_id',radio.id).eq('id',job.id));
   return send(res,200,{id:job.id});
  }catch{
   // Never auto-release a reservation after a provider call: the remote request may have been billed.
   await admin.from('portal_locucoes').update({estado:'incerto'}).eq('radio_id',radio.id).eq('id',job.id);
   return send(res,502,{error:'Não foi possível confirmar a geração. A reserva foi mantida para evitar cobrança duplicada. Consulte o histórico e o administrador.',id:job.id});
  }
 }
 return send(res,405,{error:'Operação indisponível.'});
}
module.exports={locucaoHandler};
