'use strict';
const {validar,revisar}=require('./revisao.cjs');
async function revisaoHandler({req,res,method,db,admin,radio,user,role,env,send,readBody,checked,review=revisar}){
 const enabled=env.REVISAO_ENABLED==='true'&&!!env.OPENAI_API_KEY&&!!admin;
 if(method==='GET'){
  const plans=enabled?await checked(db.from('portal_revisao_planos').select('ativo,limite_mensal').eq('radio_id',radio.id)):[];
  const available=enabled&&!!plans[0]?.ativo&&plans[0].limite_mensal>0;
  return send(res,200,{habilitado:available,aviso:available?'Revise a sugestão antes de aplicar. A IA não verifica fatos.':'Revisão por IA em configuração. O administrador precisa concluir a ativação.'});
 }
 if(method!=='POST')return send(res,405,{error:'Operação indisponível.'});
 if(!['editor','administrador'].includes(role))return send(res,403,{error:'Seu perfil permite apenas leitura.'});
 if(!enabled)return send(res,503,{error:'Revisão por IA ainda não ativada. Seu texto foi preservado.'});
 const body=await readBody(req),input=validar(body);
 const r=await admin.rpc('portal_reservar_revisao',{p_radio:radio.id,p_usuario:user.id,p_chave:body.chave,p_hash:input.hash});
 if(r.error)return send(res,409,{error:'Não foi possível iniciar a revisão. Confira a franquia da emissora ou uma solicitação anterior em andamento.'});
 const job=r.data;
 if(!job.nova){if(job.estado==='pronto'&&job.resultado)return send(res,200,job.resultado);return send(res,409,{error:'Esta revisão já foi solicitada e aguarda conferência. Nenhuma nova chamada foi enviada.'})}
 try{
  const result=await review({key:env.OPENAI_API_KEY,model:env.OPENAI_REVIEW_MODEL||'gpt-5.4-mini',texto:input.texto});
  await checked(admin.from('portal_revisoes').update({estado:'pronto',resultado:result}).eq('radio_id',radio.id).eq('id',job.id));
  return send(res,200,result);
 }catch(e){
  await admin.from('portal_revisoes').update({estado:'incerto',resultado:{erro:e.publico?e.categoria:'conferencia'}}).eq('radio_id',radio.id).eq('id',job.id);
  return send(res,502,{error:e.publico?e.message+' O original foi preservado.':'Não foi possível concluir a revisão com segurança. O original foi preservado. Consulte o administrador antes de repetir.'});
 }
}
module.exports={revisaoHandler};
