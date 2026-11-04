'use strict';
(()=>{
 const $=id=>document.getElementById('voz-'+id);let csrf='',info=null,ocupado=false,pendente=null;
 const estados={cadastrada:'Autorização cadastrada',clonando:'Clonagem em processamento',aguardando_verificacao:'Verificação necessária na ElevenLabs',aguardando_aprovacao:'Aguardando liberação',ativa:'Liberada para boletins',desativada:'Desativada',revogada:'Autorização revogada',incerta:'Bloqueada para conferência do administrador'};
 function status(t,error=false){$('status').textContent=t;$('status').classList.toggle('erro',error)}
 async function api(route,method='GET',body){const r=await fetch('/api/'+route,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível acessar a emissora.');return d}
 async function load(){info=await api('vozes');$('termos').textContent=info.termos;$('limite').textContent=`Limite de clones da emissora: ${info.limiteVozes}. `+(info.clonagemHabilitada?'Clonagem instantânea integrada.':'Clonagem aguardando liberação técnica. Você já pode cadastrar os documentos e amostras autorizados.');render();}
 function confirmar(text,fn){$('confirmar-texto').textContent=text;pendente=fn;$('confirmacao').showModal()}
 $('cancelar').onclick=()=>{$('confirmacao').close();pendente=null};
 $('confirmar').onclick=async()=>{const fn=pendente;pendente=null;$('confirmacao').close();if(fn)await fn()};
 async function action(id,acao,extra={}){if(ocupado)return;ocupado=true;status('Processando solicitação…');render();try{const d=await api('vozes?id='+id,'POST',{acao,...extra});await load();status(d.verificacaoPendente?'Clone criado e bloqueado. Conclua a verificação exigida pela ElevenLabs.':'Solicitação concluída.')}catch(e){status(e.message,true);try{await load()}catch{}}finally{ocupado=false;render()}}
 function render(){
  const list=$('lista');list.replaceChildren();if(!info)return;
  if(!info.locutores.length)list.textContent='Nenhum locutor cadastrado.';
  for(const row of info.locutores){
   const s=document.createElement('section');s.className='bloco';const h=document.createElement('h3');h.textContent=row.nome;const p=document.createElement('p');const expired=new Date(row.consentimento_ate).getTime()<=Date.now();p.textContent=(expired?'Autorização vencida':estados[row.estado]||row.estado)+' · Válida até '+new Date(row.consentimento_ate).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});s.append(h,p);
   const channel=document.createElement('p');channel.textContent='Revogação: '+row.canal_revogacao;s.append(channel);const actions=document.createElement('div');actions.className='actions';
   for(const [file,label] of [...(row.documento_caminho?[['autorizacao','Baixar autorização']]:[]),['amostra','Baixar amostra']]){const a=document.createElement('a');a.href='/api/vozes?id='+row.id+'&arquivo='+file;a.textContent=label;actions.append(a)}
   const add=(label,fn,disabled=false)=>{const b=document.createElement('button');b.textContent=label;b.disabled=ocupado||disabled;b.onclick=fn;actions.append(b)};
   if(row.estado==='cadastrada'&&!expired)add('Solicitar clonagem',()=>confirmar('Enviar a amostra autorizada deste locutor à ElevenLabs para criar uma voz privada? A operação utiliza um espaço de voz da conta. Não repita solicitações em processamento.',()=>action(row.id,'clonar',{confirmarEnvio:true})),!info.clonagemHabilitada||info.limiteVozes<1);
   if(['aguardando_verificacao','aguardando_aprovacao','ativa','desativada'].includes(row.estado)&&!expired){add('Conferir verificação',()=>action(row.id,'verificar'));if(row.estado!=='ativa')add('Liberar para uso e teste',()=>confirmar('Liberar esta voz para os boletins da emissora dentro da finalidade e do prazo autorizados? O provedor será consultado antes da liberação.',()=>action(row.id,'ativar',{confirmarUso:true})))}
   if(row.estado==='aguardando_verificacao'){const link=document.createElement('a');link.href='https://elevenlabs.io/app/voice-lab';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Concluir verificação na ElevenLabs';actions.append(link)}
   if(row.estado==='ativa'&&!expired&&row.voz_id){const a=document.createElement('a');a.href='/boletim.html?voz='+row.voz_id;a.target='_blank';a.rel='noopener';a.textContent='Testar locução';actions.append(a)}
   if(!['revogada','desativada'].includes(row.estado))add('Desativar',()=>confirmar('Bloquear novas gerações com esta voz? Os áudios já produzidos e o clone no provedor serão preservados.',()=>action(row.id,'desativar')));
   if(row.estado!=='revogada')add('Registrar revogação',()=>confirmar('Registrar a revogação do consentimento e bloquear novas gerações? Uma nova autorização exigirá um novo cadastro. O destino dos áudios antigos deve seguir o documento assinado.',()=>action(row.id,'revogar')));
   s.append(actions);list.append(s);
  }
 }
 function base64(file,max,label){if(!file)throw Error('Selecione '+label+'.');if(file.size>max)throw Error('O arquivo '+file.name+' tem '+file.size.toLocaleString('pt-BR')+' bytes. O limite é '+max.toLocaleString('pt-BR')+' bytes.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Não foi possível ler '+label));reader.readAsDataURL(file)})}
 $('form').onsubmit=async e=>{
  e.preventDefault();if(ocupado||!info)return;ocupado=true;$('campos').disabled=true;status('Guardando o cadastro e a amostra de áudio…');
  try{
   const amostra=await base64($('amostra').files[0],1000000,'a amostra MP3');
   await api('vozes','POST',{acao:'cadastrar',guardaExterna:true,documentoSobGuarda:$('conferido').checked,nome:$('nome').value,validade:$('validade').value,amostra,autorizacaoExpressa:$('consentimento').checked,documentoConferido:$('conferido').checked,termosVersao:info.termosVersao});
   $('form').reset();await load();status('Cadastro e áudio guardados. Mantenha a autorização assinada sob sua guarda. Nenhuma clonagem foi enviada.');
  }catch(e){status(e.message,true)}finally{ocupado=false;$('campos').disabled=false;render()}
 };
 (async()=>{try{const me=await api('me');csrf=me.csrf;document.getElementById('emissora').textContent=me.radio;if(me.role!=='administrador')throw Error('Somente o administrador da emissora pode gerenciar vozes.');await load();$('campos').disabled=false;status('Cadastre somente locutores com autorização expressa documentada.')}catch(e){status(e.message,true)}})();
})();
