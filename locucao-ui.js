'use strict';
(()=>{
 let config=null,working=false,request=null;
 const el=name=>document.getElementById('locucao-'+name);
 const avisar=text=>{el('aviso').textContent=text};
 const spoken=()=>itens.map(i=>[i.titulo,i.texto].filter(Boolean).join('.\n')).join('\n\n').trim();
 function estimate(){const n=Array.from(spoken()).length,rate=Number(el('ritmo').value);el('estimativa').textContent=`${n.toLocaleString('pt-BR')} caracteres · aproximadamente ${Math.ceil((spoken().trim().split(/\s+/).length||0)/140/rate)} min. `+(config?.plano?`Custo estimado: US$ ${(n*Number(config.plano.usd_por_mil)/1000).toFixed(4)} (referência, sem câmbio/impostos).`:'');el('gerar').disabled=working||!writable||!id||dirty||!config?.habilitado||!config.vozes.length||!n||n>3000;}
 async function load(){
  config=await api('locucao');el('voz').replaceChildren();for(const v of config.vozes){const o=document.createElement('option');o.value=v.id;o.textContent=v.nome;el('voz').append(o)}
  avisar(config.aviso||(!config.habilitado?'Sua emissora ainda não tem franquia de locução.':dirty||!id?'Salve o boletim e reabra esta opção antes de gerar.':!config.vozes.length?'Nenhuma voz autorizada disponível.':'Cada nova geração utiliza a franquia da emissora.'));
  const usage=config.uso,p=config.plano;el('consumo').textContent=p&&usage?`Mês atual: ${usage.caracteres}/${p.limite_caracteres} caracteres · ${(usage.segundos/60).toFixed(1)}/${(p.limite_segundos/60).toFixed(1)} min utilizados ou reservados.`+(usage.caracteres>=p.limite_caracteres*0.8||usage.segundos>=p.limite_segundos*0.8?' Atenção: franquia próxima do limite.':''):'';
  el('historico').replaceChildren();for(const item of config.historico){
   const section=document.createElement('section'),title=document.createElement('p');title.textContent=`${item.titulo} · ${new Date(item.criado_em).toLocaleString('pt-BR')} · ${item.estado==='pronto'?'Pronto':item.estado==='incerto'?'Pendente de conferência':'Em processamento'} · ${item.caracteres} caracteres`;section.append(title);
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
  const payload={roteiro:id,versao,voz:el('voz').value,ritmo:Number(el('ritmo').value),estilo:el('estilo').value};const signature=JSON.stringify(payload);
  if(request?.signature!==signature)request={signature,chave:crypto.randomUUID()};
  try{await api('locucao','POST',{...payload,chave:request.chave});request=null;await load();avisar('Solicitação registrada. Confira o áudio e o estado no histórico.')}catch(e){avisar(e.message+' Reabra este painel para consultar o histórico.')}finally{working=false;estimate()}
 };
})();
