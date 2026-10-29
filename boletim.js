'use strict';
let me,csrf='',id=null,versao=0,itens=[],dirty=false,busy=false,ready=false,criado=null,atualizado=null,writable=false,pendentes=[];
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('erro',error)}
async function api(route,method='GET',body){const r=await fetch('/api/'+route,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw Error(b.error||'Não foi possível acessar o portal.');return b}
function changed(){dirty=true;status('Alterações não salvas. Clique em Salvar boletim.');duration()}
function date(value){return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}
function duration(){const text=itens.map(i=>i.titulo+' '+i.texto).join(' '),words=text.trim()?text.trim().split(/\s+/).length:0,seconds=Math.ceil(words/140*60);$('duracao').textContent=`${words} palavras · leitura estimada ${Math.floor(seconds/60)}min ${seconds%60}s`}
function metadata(){$('datas').textContent=criado?'Criado em '+date(criado)+' · Salvo em '+date(atualizado):'Novo boletim · ainda não salvo';duration()}
function render(){
 const list=$('itens');list.replaceChildren();$('vazio').hidden=itens.length>0;
 itens.forEach((item,index)=>{
  const block=document.createElement('section');block.className='bloco';const top=document.createElement('div');top.className='bloco-top';const number=document.createElement('strong');number.textContent='BLOCO '+String(index+1).padStart(2,'0');top.append(number);const actions=document.createElement('div');
  for(const [label,fn,disabled] of [['↑',()=>{[itens[index-1],itens[index]]=[itens[index],itens[index-1]];changed();render()},index===0],['↓',()=>{[itens[index+1],itens[index]]=[itens[index],itens[index+1]];changed();render()},index===itens.length-1],['Retirar',()=>{if(confirm('Retirar este bloco do roteiro? A alteração só será gravada ao salvar.')){itens.splice(index,1);changed();render()}},false]]){const b=document.createElement('button');b.textContent=label;b.className='secondary';b.disabled=!writable||busy||disabled;b.setAttribute('aria-label',label==='↑'?'Mover bloco para cima':label==='↓'?'Mover bloco para baixo':label);b.onclick=fn;actions.append(b)}
  top.append(actions);block.append(top);const title=document.createElement('input');title.value=item.titulo;title.maxLength=500;title.setAttribute('aria-label','Título do bloco '+(index+1));title.disabled=!writable||busy;title.oninput=()=>{item.titulo=title.value;changed()};const text=document.createElement('textarea');text.value=item.texto;text.maxLength=30000;text.setAttribute('aria-label','Texto do bloco '+(index+1));text.disabled=!writable||busy;text.oninput=()=>{item.texto=text.value;changed()};block.append(title,text);
  if(item.fonte){const source=document.createElement('p');source.className='fonte';source.textContent='Fonte: '+item.fonte;if(item.url){try{const u=new URL(item.url);if(['http:','https:'].includes(u.protocol)){const a=document.createElement('a');a.href=u.href;a.textContent=' · Ler original ↗';a.target='_blank';a.rel='noopener noreferrer';source.append(a)}}catch{}}block.append(source)}list.append(block);
 });metadata();
}
function add(item){if(!ready||!writable)return;if(busy){pendentes.push(item);return}if(itens.length>=100)return status('Limite de 100 blocos por boletim.',true);if(item.url&&itens.some(i=>i.url===item.url))return status('Esta notícia já está no boletim.');itens.push({titulo:String(item.titulo||'').slice(0,500),texto:String(item.texto||'').slice(0,30000),fonte:String(item.fonte||'').slice(0,200),url:String(item.url||'').slice(0,2000)});changed();render();}
function reading(){const doc=$('roteiro-leitura');doc.replaceChildren();const h=document.createElement('h1');h.textContent=$('titulo').value||'Boletim';const brand=document.createElement('p');brand.textContent=me.radio+' · '+(criado?date(criado):'Rascunho não salvo');doc.append(h,brand);for(const item of itens){const title=document.createElement('h2');title.textContent=item.titulo;const p=document.createElement('p');p.textContent=item.texto;doc.append(title,p);if(item.fonte){const f=document.createElement('p');f.style.fontSize='0.7em';f.textContent='Fonte: '+item.fonte;doc.append(f)}}}
$('titulo').oninput=changed;
$('nota').onclick=()=>add({titulo:'Nota da redação',texto:'',fonte:'',url:''});
$('tempo').onclick=async()=>{const b=$('tempo');b.disabled=true;try{const d=await api('epagri');add({titulo:'Previsão do tempo · '+d.titulo,texto:(d.paragrafos||[]).join('\n\n')+(d.publicadoEm?'\n\nBoletim de '+date(d.publicadoEm):'')+(d.desatualizado?'\nAtenção: boletim anterior; atualização indisponível.':''),fonte:'Epagri/Ciram'+(d.autor?' · '+d.autor:''),url:'https://ciram.epagri.sc.gov.br/index.php/previsao-5-dias/'})}catch(e){status(e.message,true)}finally{b.disabled=!writable}};
$('salvar').onclick=async()=>{
 if(!writable||busy)return;if(!$('titulo').value.trim())return status('Dê um título ao boletim antes de salvar.',true);
 busy=true;for(const b of document.querySelectorAll('button,input,textarea'))b.disabled=true;status('Salvando boletim…');
 try{const record=await api('roteiros'+(id?'?id='+encodeURIComponent(id):''),id?'PUT':'POST',{titulo:$('titulo').value,itens,versao});id=record.id;versao=record.versao;criado=record.criado_em;atualizado=record.atualizado_em;dirty=false;history.replaceState(null,'','?id='+id);metadata();status('Boletim salvo na aba Boletins.');if(window.opener)window.opener.postMessage({type:'boletim-salvo'},location.origin)}catch(e){status(e.message,true)}finally{busy=false;for(const b of document.querySelectorAll('button,input,textarea'))b.disabled=!writable;$('leitura').disabled=false;$('imprimir').disabled=false;render();for(const item of pendentes.splice(0))add(item)}
};
$('leitura').onclick=()=>{reading();const on=document.body.classList.toggle('lendo');$('roteiro-leitura').hidden=!on;$('leitura').textContent=on?'Voltar à edição':'Modo de leitura'};
$('imprimir').onclick=()=>{reading();window.print()};window.addEventListener('beforeprint',reading);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window.opener||!ready)return;if(e.data?.type==='boletim-adicionar'&&e.data.item){add(e.data.item);e.source.postMessage({type:'boletim-recebido',token:e.data.token},location.origin)}});
(async()=>{try{
 me=await api('me');csrf=me.csrf;writable=['administrador','editor'].includes(me.role);$('radio').textContent=me.radio;
 const requested=params.get('id');if(requested){const r=await api('roteiros?id='+encodeURIComponent(requested));id=params.has('duplicar')?null:r.id;versao=id?r.versao:0;criado=id?r.criado_em:null;atualizado=id?r.atualizado_em:null;itens=r.dados.itens;$('titulo').value=(id?'':'Cópia · ')+r.titulo;dirty=!id}
 else $('titulo').value='Boletim · '+new Date().toLocaleDateString('pt-BR');
 ready=true;for(const b of document.querySelectorAll('button,input,textarea'))b.disabled=!writable;$('leitura').disabled=false;$('imprimir').disabled=false;render();status(writable?(dirty?'Cópia ainda não salva.':id?'Boletim aberto.':'Escolha notícias no portal ou adicione uma nota própria.'):'Acesso de leitura.');if(window.opener)window.opener.postMessage({type:'boletim-pronto'},location.origin);
 }catch(e){status(e.message+' Abra o portal e entre na sua conta.',true);for(const b of document.querySelectorAll('button,input,textarea'))b.disabled=true}
})();
