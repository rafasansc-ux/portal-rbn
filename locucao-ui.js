'use strict';
(()=>{
 let config=null,working=false,request=null;
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
  const selected=el('voz').value;config=await api('locucao');el('voz').replaceChildren();for(const v of config.vozes){const o=document.createElement('option');o.value=v.id;o.textContent=v.nome;el('voz').append(o)}const suggested=selected||new URLSearchParams(location.search).get('voz');if(config.vozes.some(v=>v.id===suggested))el('voz').value=suggested;
  avisar(config.aviso||(!config.habilitado?'Sua emissora ainda não tem franquia de locução.':dirty||!id?'Salve o boletim e reabra esta opção antes de gerar.':!config.vozes.length?'Nenhuma voz autorizada disponível.':'Cada nova geração utiliza a franquia da emissora.'));
  const c=config.creditos;
  el('consumo').textContent=c?`Saldo disponível: ${c.disponiveis} créditos · Utilizados: ${c.usados} · Reservados: ${c.reservados}. `+(c.modo==='piloto'?'Franquia de teste.':c.expirado?'Ciclo encerrado. Renovação após confirmação do pagamento.':`Ciclo válido até ${new Date(c.fim).toLocaleString('pt-BR')}. Renovação após confirmação do pagamento.`)+(c.total&&c.disponiveis<=c.total*0.2?' Atenção: saldo próximo do fim.':''):'';
  el('historico').replaceChildren();for(const item of config.historico){
   const section=document.createElement('section'),title=document.createElement('p');title.textContent=`${item.titulo} · ${new Date(item.criado_em).toLocaleString('pt-BR')} · ${item.estornado_em?'Créditos devolvidos':item.estado==='pronto'?'Pronto':item.estado==='incerto'?'Pendente de conferência':'Em processamento'} · ${item.creditos??Math.ceil(item.caracteres/100)} crédito(s)`;section.append(title);
   if(item.estado==='pronto'){
    const player=document.createElement('audio');player.controls=true;player.preload='none';player.src='/api/locucao?id='+encodeURIComponent(item.id);section.append(player);
    if(item.aprovado_em){const a=document.createElement('a');a.href=player.src+'&download=1';a.textContent='Baixar MP3 aprovado';a.download='boletim.mp3';section.append(a)}
    else if(writable){const approve=document.createElement('button');approve.textContent='Aprovar áudio';approve.disabled=true;player.addEventListener('ended',()=>{approve.disabled=false});approve.onclick=async()=>{approve.disabled=true;try{await api('locucao?id='+item.id,'PUT',{});await load()}catch(e){avisar(e.message);approve.disabled=false}};section.append(approve);const hint=document.createElement('small');hint.textContent='Ouça a prévia até o fim para liberar a aprovação.';section.append(hint)}
   }el('historico').append(section);
  }if(!config.historico.length)el('historico').textContent='Nenhuma locução registrada.';estimate();
 }
 document.getElementById('abrir-locucao').onclick=async()=>{el('painel').showModal();avisar('Consultando vozes e franquia…');try{await load()}catch(e){avisar(e.message);el('gerar').disabled=true}};
 el('fechar').onclick=()=>el('painel').close();el('ritmo').onchange=estimate;
 el('gerar').onclick=async()=>{
  if(working||!id||dirty||!writable)return;working=true;estimate();avisar('Gerando áudio. Aguarde; não envie novamente.');
  const payload={roteiro:id,versao,voz:el('voz').value,ritmo:Number(el('ritmo').value),estilo:el('estilo').value,creditosConfirmados:Math.ceil(Array.from(spoken()).length/100)};const signature=JSON.stringify(payload);
  if(request?.signature!==signature)request={signature,chave:crypto.randomUUID()};
  try{await api('locucao','POST',{...payload,chave:request.chave});request=null;await load();avisar('Solicitação registrada. Confira o áudio e o estado no histórico.')}catch(e){avisar(e.message+' Reabra este painel para consultar o histórico.')}finally{working=false;estimate()}
 };
})();
