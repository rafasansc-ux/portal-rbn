'use strict';
(()=>{
 const el=id=>document.getElementById('revisao-'+id);let running=false,active=false,target=null,original='',request=null;
 const aviso=text=>{el('aviso').textContent=text};
 function selecionar(){
  target=itens[Number(el('bloco').value)]||null;original=target?.texto||'';request=null;
  el('original').value=original;el('sugestao').value='';el('alertas').textContent='';el('aplicar').disabled=true;
  el('gerar').disabled=running||!active||!writable||!original.trim()||Array.from(original).length>6000;
 }
 document.getElementById('abrir-revisao').onclick=async()=>{
  if(!ready||!writable||busy)return;el('painel').showModal();el('bloco').replaceChildren();
  itens.forEach((item,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`Bloco ${index+1} · ${item.titulo||'Sem título'}`;el('bloco').append(option)});
  el('bloco').value='0';selecionar();aviso(itens.length?'Confira a sugestão antes de aplicar. O texto selecionado será enviado à IA; ela não verifica fatos.':'Adicione uma notícia ou nota própria ao boletim para revisar.');
  try{const config=await api('revisao');active=config.habilitado;selecionar();if(!config.habilitado){aviso(config.aviso);el('gerar').disabled=true}}catch(e){aviso(e.message);el('gerar').disabled=true}
 };
 el('bloco').onchange=selecionar;
 el('fechar').onclick=()=>{if(!running)el('painel').close()};
 el('painel').addEventListener('cancel',e=>{if(running)e.preventDefault()});
 el('sugestao').oninput=()=>{el('aplicar').disabled=!el('sugestao').value.trim()||running};
 el('gerar').onclick=async()=>{
  if(running||!target||!writable||!original.trim()||Array.from(original).length>6000)return;
  running=true;el('gerar').disabled=true;el('bloco').disabled=true;el('fechar').disabled=true;el('aplicar').disabled=true;
  if(!request)request={chave:crypto.randomUUID(),texto:original};aviso('Revisando o texto. Aguarde…');
  try{const result=await api('revisao','POST',request);el('sugestao').value=result.texto;el('alertas').textContent=(result.alertas||[]).join('\n');el('aplicar').disabled=false;aviso('Sugestão pronta. Confira nomes, fatos e declarações antes de aplicar. O original ainda não foi alterado.');}
  catch(e){aviso(e.message)}finally{running=false;el('gerar').disabled=false;el('bloco').disabled=false;el('fechar').disabled=false}
 };
 el('aplicar').onclick=()=>{
  if(running||!writable||busy||!target||!el('sugestao').value.trim())return;
  if(!itens.includes(target)||target.texto!==original){aviso('O bloco mudou durante a revisão. Feche e revise novamente para não sobrescrever alterações.');el('aplicar').disabled=true;return}
  target.texto=el('sugestao').value;changed();render();el('painel').close();status('Revisão aplicada ao rascunho. Clique em Salvar boletim para guardar.');
 };
})();
