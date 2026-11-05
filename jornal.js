'use strict';
const $=id=>document.getElementById(id);
let csrf='',writable=false,busy=false,dirty=false,id=null,versao=0,modelos=[],blocos=[];
const initial=()=>[
 {nome:'Abertura e manchetes',tipo:'editorial',segundos:180},
 {nome:'Local e regional',tipo:'editorial',segundos:960},
 {nome:'Intervalo comercial 1',tipo:'comercial',segundos:300},
 {nome:'Política e economia',tipo:'editorial',segundos:600},
 {nome:'Esportes',tipo:'editorial',segundos:420},
 {nome:'Intervalo comercial 2',tipo:'comercial',segundos:300},
 {nome:'Tempo e serviços',tipo:'editorial',segundos:240},
 {nome:'Variedades e encerramento',tipo:'editorial',segundos:300},
 {nome:'Intervalo comercial 3',tipo:'comercial',segundos:300}
];
function status(t,error=false){$('status').textContent=t;$('status').classList.toggle('erro',error)}
async function api(route,method='GET',body){const r=await fetch('/api/'+route,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw Error(b.error||'Não foi possível acessar os modelos.');return b}
const tempo=s=>`${Math.floor(s/60)}min ${s%60}s`;
function totals(){let e=0,c=0;for(const b of blocos){if(b.tipo==='comercial')c+=b.segundos;else e+=b.segundos}const meta=Number($('meta').value)*60,total=e+c; $('editorial').textContent=tempo(e);$('comercial').textContent=tempo(c);$('total').textContent=tempo(total);$('diferenca').textContent=!Number.isInteger(meta)||meta<60?'Informe uma meta válida.':total===meta?'Tempo completo.':total<meta?'Faltam '+tempo(meta-total)+' para a meta.':'Excede a meta em '+tempo(total-meta)+'.'}
function changed(){dirty=true;totals();status('Alterações não salvas. Clique em Salvar modelo.')}
function controls(){for(const key of ['modelos','nome','meta','adicionar','novo','copia','salvar','manual'])$(key).disabled=!writable||busy}
function render(){const target=$('blocos');target.replaceChildren();blocos.forEach((b,i)=>{
 const row=document.createElement('div');row.className='bloco';const n=document.createElement('span');n.className='ordem';n.textContent=i+1;row.append(n);
 function field(label,el,cls){const l=document.createElement('label');l.className=cls||'';l.append(document.createTextNode(label),el);row.append(l);el.disabled=!writable||busy;return el}
 const name=document.createElement('input');name.value=b.nome;name.maxLength=160;field('Nome do bloco '+(i+1),name,'titulo');name.oninput=()=>{b.nome=name.value;changed()};
 const duration=document.createElement('div');const ml=document.createElement('label'),sl=document.createElement('label'),m=document.createElement('input'),s=document.createElement('input');ml.textContent='Minutos';sl.textContent='Segundos';for(const el of [m,s]){el.type='number';el.min='0';el.step='1';el.disabled=!writable||busy}m.max='1440';s.max='59';m.value=Math.floor(b.segundos/60);s.value=b.segundos%60;ml.append(m);sl.append(s);duration.append(ml,sl);row.append(duration);
 const update=()=>{const mm=Number(m.value),ss=Number(s.value);if(!m.value||!s.value||!Number.isInteger(mm)||!Number.isInteger(ss)||mm<0||mm>1440||ss<0||ss>59||mm*60+ss<1||mm*60+ss>86400){status('Informe uma duração positiva: minutos e segundos entre 0 e 59.',true);return}b.segundos=mm*60+ss;changed()};m.onchange=update;s.onchange=update;
 const arrows=document.createElement('div');arrows.className='setas';for(const [label,delta]of [['↑',-1],['↓',1]]){const a=document.createElement('button');a.textContent=label;a.setAttribute('aria-label','Mover '+b.nome+(delta<0?' para cima':' para baixo'));a.disabled=!writable||busy||i+delta<0||i+delta>=blocos.length;a.onclick=()=>{[blocos[i],blocos[i+delta]]=[blocos[i+delta],blocos[i]];changed();render()};arrows.append(a)}row.append(arrows);
 const del=document.createElement('button');del.className='remover';del.textContent='×';del.setAttribute('aria-label','Excluir bloco '+b.nome);del.disabled=!writable||busy;del.onclick=()=>{if(confirm('Excluir o bloco “'+b.nome+'” deste espelho?')){blocos.splice(i,1);changed();render()}};row.append(del);target.append(row);
 });totals();controls()}
function body(){const nome=$('nome').value.trim(),meta_segundos=Number($('meta').value)*60;if(!nome||!Number.isInteger(meta_segundos)||meta_segundos<60||meta_segundos>86400||!blocos.length||blocos.some(b=>!b.nome.trim()))throw Error('Preencha o nome, a duração total e os blocos.');for(const el of $('blocos').querySelectorAll('input[type=number]'))if(!el.value||!el.checkValidity())throw Error('Confira a duração de cada bloco.');return {nome,meta_segundos,blocos}}
function options(){const select=$('modelos');select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent='Novo modelo';select.append(first);for(const m of modelos){const o=document.createElement('option');o.value=m.id;o.textContent=m.nome;select.append(o)}select.value=id||''}
function load(m){id=m?.id||null;versao=m?.versao||0;$('nome').value=m?.nome||'Jornal da Manhã';$('meta').value=(m?.meta_segundos||3600)/60;blocos=structuredClone(m?.blocos||initial());dirty=false;render();status(m?'Modelo aberto.':'Novo espelho: 45 minutos de conteúdo e 15 de comerciais.')}
$('nome').oninput=changed;$('meta').oninput=changed;
$('adicionar').onclick=()=>{if(blocos.length>=50)return status('Limite de 50 blocos.',true);blocos.push({nome:'Novo bloco',tipo:'editorial',segundos:60});changed();render()};
$('novo').onclick=()=>{if(!dirty||confirm('Descartar as alterações não salvas?')){load(null);options()}};
$('modelos').onchange=()=>{const selected=$('modelos').value;if(dirty&&!confirm('Descartar as alterações não salvas?')){$('modelos').value=id||'';return}load(modelos.find(m=>m.id===selected));options()};
async function save(copy){if(busy||!writable)return;try{const data=body();if(copy&&!confirm('Salvar uma cópia como novo modelo?'))return;busy=true;render();const row=await api('espelhos'+(!copy&&id?'?id='+encodeURIComponent(id):''),!copy&&id?'PUT':'POST',{...data,versao});modelos=modelos.filter(m=>m.id!==row.id);modelos.unshift(row);load(row);options();status('Modelo salvo na conta da emissora.')}catch(e){status(e.message,true)}finally{busy=false;render()}}
$('salvar').onclick=()=>save(false);$('copia').onclick=()=>save(true);
$('manual').onclick=async()=>{if(busy||!writable)return;try{const data=body();if(!confirm('Criar um boletim em branco com estes blocos? O modelo só é salvo pelo botão Salvar modelo.'))return;busy=true;render();const row=await api('roteiros','POST',{titulo:data.nome+' · '+new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),itens:data.blocos.map(b=>({titulo:b.nome+' · '+tempo(b.segundos)+(b.tipo==='comercial'?' · INTERVALO COMERCIAL':''),texto:'',fonte:'',url:''}))});location.href='/boletim.html?id='+encodeURIComponent(row.id)}catch(e){status(e.message,true);busy=false;render()}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
(async()=>{try{const me=await api('me');csrf=me.csrf;writable=['editor','administrador'].includes(me.role);$('radio').textContent=me.radio;load(null);modelos=await api('espelhos');options();if(!writable)status('Seu perfil permite apenas consultar os modelos.')}catch(e){writable=false;controls();status(e.message+' Volte ao portal para conferir sua sessão.',true)}})();
