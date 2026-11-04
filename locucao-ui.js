'use strict';
(()=>{
 let config=null,working=false,request=null,excluidos=false;
 const el=name=>document.getElementById('locucao-'+name);
 const avisar=text=>{el('aviso').textContent=text};
 const spoken=()=>itens.map(i=>[i.titulo,i.texto].filter(Boolean).join('.\n')).join('\n\n').trim();
 function estimate(){
  const n=Array.from(spoken()).length,cost=Math.ceil(n/100),c=config?.creditos;
  el('estimativa').textContent=`Esta locução utiliza ${cost} crédito(s) · ${n.toLocaleString('pt-BR')} caracteres.`+(c?(cost>c.disponiveis?` Saldo insuficiente: faltam ${cost-c.disponiveis} créditos. Fale com o responsável para recarregar.`:` Saldo após gerar: ${c.disponiveis-cost} créditos.`):'');
  el('gerar').textContent=`Gerar locução · ${cost} crédito(s)`;
  el('gerar').disabled=working||!writable||!id||dirty||!config?.habilitado||!config.vozes.length||!n||n>3000||!!c&&(c.expirado||cost>c.disponiveis);
 }
 async function load(){
  const selected=el('voz').value;config=await api('locucao'+(excluidos?'?excluidos=1':''));el('voz').replaceChildren();for(const v of config.vozes){const o=document.createElement('option');o.value=v.id;o.textContent=v.nome;el('voz').append(o)}const suggested=selected||new URLSearchParams(location.search).get('voz');if(config.vozes.some(v=>v.id===suggested))el('voz').value=suggested;
  avisar(config.aviso||(!config.habilitado?'Sua emissora ainda não tem franquia de locução.':dirty||!id?'Salve o boletim e reabra esta opção antes de gerar.':!config.vozes.length?'Nenhuma voz autorizada disponível.':'Cada nova geração utiliza a franquia da emissora.'));
  el('excluidos').textContent=excluidos?'Voltar ao histórico':'Ver áudios excluídos';
  el('historico').replaceChildren();for(const item of config.historico){
   const section=document.createElement('section'),title=document.createElement('p');title.textContent=`${item.titulo} · ${new Date(item.criado_em).toLocaleString('pt-BR')} · ${item.excluido_em?'Excluído':item.estornado_em?'Créditos devolvidos':item.estado==='pronto'?'Pronto':item.estado==='incerto'?'Pendente de conferência':'Em processamento'} · ${item.creditos??Math.ceil(item.caracteres/100)} crédito(s)`;section.append(title);
   const actions=document.createElement('div');actions.className='locucao-acoes';
   if(item.estado==='pronto'&&!item.excluido_em){
    const player=document.createElement('audio');player.controls=true;player.preload='none';player.src='/api/locucao?id='+encodeURIComponent(item.id);section.append(player);
    const download=document.createElement('a');download.href=player.src+'&download=1';download.textContent='Baixar áudio';download.download='boletim.mp3';actions.append(download);
   }
   if(writable&&item.estado==='pronto'){const remove=document.createElement('button');remove.className='secondary';remove.textContent=item.excluido_em?'Restaurar áudio':'Excluir áudio';remove.disabled=working;remove.onclick=()=>alterarAudio(item);actions.append(remove)}
   section.append(actions);el('historico').append(section);
  }if(!config.historico.length)el('historico').textContent=excluidos?'Nenhum áudio excluído.':'Nenhuma locução registrada.';estimate();
 }
 async function alterarAudio(item){
  if(working||!writable)return;
  const restoring=!!item.excluido_em;
  if(!restoring&&!confirm('Excluir o áudio “'+item.titulo+'” do histórico? Você pode restaurá-lo em “Ver áudios excluídos”. Os créditos utilizados não serão devolvidos.'))return;
  working=true;estimate();
  try{await api('locucao?id='+item.id,restoring?'PATCH':'DELETE',{});await load();avisar(restoring?'Áudio restaurado.':'Áudio excluído do histórico. Você pode restaurá-lo em “Ver áudios excluídos”.')}catch(e){avisar(e.message)}finally{working=false;estimate()}
 }
 el('excluidos').onclick=async()=>{if(working)return;excluidos=!excluidos;try{await load()}catch(e){avisar(e.message)}};
 document.getElementById('abrir-locucao').onclick=async()=>{el('painel').showModal();avisar('Consultando vozes e franquia…');try{await load()}catch(e){avisar(e.message);el('gerar').disabled=true}};
 el('fechar').onclick=()=>el('painel').close();el('ritmo').onchange=estimate;
 el('gerar').onclick=async()=>{
  if(working||!id||dirty||!writable)return;working=true;estimate();avisar('Gerando áudio. Aguarde; não envie novamente.');
  const payload={roteiro:id,versao,voz:el('voz').value,ritmo:Number(el('ritmo').value),estilo:el('estilo').value,creditosConfirmados:Math.ceil(Array.from(spoken()).length/100)};const signature=JSON.stringify(payload);
  if(request?.signature!==signature)request={signature,chave:crypto.randomUUID()};
  try{await api('locucao','POST',{...payload,chave:request.chave});request=null;await load();avisar('Solicitação registrada. Confira o áudio e o estado no histórico.')}catch(e){avisar(e.message+' Reabra este painel para consultar o histórico.')}finally{working=false;estimate()}
 };
})();
