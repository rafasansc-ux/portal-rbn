/* Integração SaaS: dados compartilhados apenas entre usuários da mesma rádio. */
let csrf='',preferences={},saving=Promise.resolve();
async function api(route,method='GET',data){const r=await fetch('/api/'+route,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:data===undefined?undefined:JSON.stringify(data)});const b=await r.json();if(!r.ok)throw Error(b.error||'Falha de comunicação');return b}
async function openSession(){const me=await api('me');csrf=me.csrf;const expiry=document.getElementById('plan-status');if(expiry)expiry.textContent=me.accessUntil?'Acesso até '+new Date(me.accessUntil).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Acesso liberado';preferences=await api('preferences');FONTES_CONFIG=await api('fontes');storage.getItem=k=>preferences[k]||null;storage.setItem=(k,v)=>{preferences[k]=v;saving=saving.catch(()=>{}).then(()=>api('preferences','PUT',preferences)).catch(e=>toast(e.message))};storage.removeItem=k=>{delete preferences[k];saving=saving.catch(()=>{}).then(()=>api('preferences','PUT',preferences)).catch(e=>toast(e.message))};aplicarTema(preferences.portal_tema||'oceano');aplicarFonte(preferences.portal_fonte||'montserrat');if(preferences.portal_cor&&/^#[a-f0-9]{6}$/i.test(preferences.portal_cor))document.documentElement.style.setProperty('--azul',preferences.portal_cor);for(const [id,key]of [['login-nome-radio','portal_nome'],['tb-nome-radio','portal_nome'],['login-slogan','portal_slogan']])document.getElementById(id).textContent=preferences[key]||(key==='portal_nome'?me.radio:'Portal da Redação');carregarLogoSalvaPortal();document.querySelector('.hero h1 em').textContent=preferences.portal_nome||me.radio;document.title=(preferences.portal_nome||me.radio)+' — Portal da Redação';document.getElementById('tb-freq-radio').textContent='Portal da Redação';document.getElementById('tela-acesso').style.display='none';document.getElementById('portal').classList.add('on');iniciarRelogio();try{const agenda=await api('automacao');const mode=document.getElementById('coleta-mode');if(mode)mode.textContent=agenda.ativa?'A cada 2h':'Manual'}catch{}await atualizarNoticias();if(DADOS_JSON && !DADOS_JSON.editorias.length && FONTES_CONFIG.some(f=>f.ativo) && ["administrador","editor"].includes(me.role)){await coletarNoticias()}}
fazerLogin=async function(){const btn=document.querySelector('.btn-entrar');btn.disabled=true;try{await api('login','POST',{login:document.getElementById('login-user').value,password:document.getElementById('login-password').value});document.getElementById('login-password').value='';document.getElementById('err').textContent='';await openSession()}catch(e){document.getElementById('err').textContent=e.message}finally{btn.disabled=false}};
sair=async function(){try{await api('logout','POST');location.reload()}catch(e){toast(e.message)}};
persistFontes=function(){const snapshot=JSON.parse(JSON.stringify(FONTES_CONFIG));saving=saving.catch(()=>{}).then(()=>api('fontes','PUT',snapshot)).then(()=>toast('Fontes salvas na conta da rádio. Até 40 fontes por conta.')).catch(e=>toast('Falha ao salvar: '+e.message));updateStats()};
atualizarNoticias=async function(){try{const d=await api('noticias');validateNews(d);DADOS_JSON=d;renderTodosDoJSON();const details=document.getElementById('coleta-diagnostico'),list=document.getElementById('coleta-falhas');if(details&&list){details.hidden=!d.erros?.length;list.replaceChildren();for(const failure of d.erros||[]){const li=document.createElement('li');li.textContent=failure.fonte+': '+failure.erro;list.appendChild(li)}}document.getElementById('hero-sub-data').textContent=d.editorias.length?'Última tentativa: '+(d.data||'')+' '+(d.hora||'')+(d.erros?.length?' · '+d.erros.length+' fonte(s) com falha; confira antes de usar.':''):FONTES_CONFIG.some(f=>f.ativo)?'Ainda sem notícias. Clique em Atualizar notícias para buscar nas fontes.':'Adicione fontes nas configurações para receber notícias.'}catch(e){toast(e.message)}};
document.getElementById('login-form').addEventListener('submit',e=>{e.preventDefault();fazerLogin()});
if(location.protocol==='file:'){document.getElementById('err').textContent='Inicie o servidor e abra http://127.0.0.1:9430 para acessar sua conta.'}else openSession().catch(()=>{});

let coletaEmAndamento=false;
async function coletarNoticias(){
 if(coletaEmAndamento)return;
 coletaEmAndamento=true;const buttons=[...document.querySelectorAll('.btn-coleta')];
 buttons.forEach(b=>{b.disabled=true;b.dataset.originalText=b.textContent;b.textContent='Buscando notícias…'});
 const status=document.getElementById('hero-sub-data');status.textContent='Buscando notícias nas fontes cadastradas. Aguarde…';
 toast('Buscando notícias nas fontes cadastradas…');
 try{const d=await api('coletar','POST',{});await atualizarNoticias();toast(d.erros.length?'Atualização concluída: '+d.total+' notícias. '+d.erros.length+' fonte(s) indisponível(is).':'Notícias atualizadas: '+d.total+' itens.');}
 catch(e){await atualizarNoticias();toast(e.message)}
 finally{coletaEmAndamento=false;buttons.forEach(b=>{b.disabled=false;b.textContent=b.dataset.originalText;delete b.dataset.originalText})}
}

const salvarFonteBase=salvarFonte;salvarFonte=function(){if(editandoIdx<0&&FONTES_CONFIG.length>=40){toast("Limite de 40 fontes por rádio.");return}salvarFonteBase()};

let epagriConsultadoEm=0,epagriOcupado=false,epagriVersao="";
async function carregarEpagri(force=false){
 if(epagriOcupado||(!force&&Date.now()-epagriConsultadoEm<2*3600000))return;epagriOcupado=true;
 const status=document.getElementById('epagri-status'),container=document.getElementById('epagri-texto');
 try{const d=await api('epagri');if(epagriVersao===d.consultadoEm&&!d.desatualizado)return;epagriVersao=d.consultadoEm;container.replaceChildren();const title=document.createElement('h3');title.textContent=d.titulo;title.style.fontSize='16px';title.style.marginBottom='10px';container.appendChild(title);for(const paragraph of d.paragrafos||[]){const p=document.createElement('p');p.textContent=paragraph;p.style.marginBottom='12px';container.appendChild(p)}if(d.autor){const p=document.createElement('p');p.textContent=d.autor;p.style.fontSize='12px';container.appendChild(p)}const date=d.publicadoEm?new Date(d.publicadoEm).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'data não informada';status.textContent='Santa Catarina · Boletim de '+date+(d.desatualizado?' · Atualização indisponível; exibindo boletim anterior.':'');epagriConsultadoEm=Date.now();}
 catch(e){status.textContent=e.message+' Use o link do boletim oficial abaixo.'}finally{epagriOcupado=false}
}
const carregarTempoNumerico=carregarTempo;
carregarTempo=async function(){await Promise.allSettled([carregarTempoNumerico(),carregarEpagri()])};
// O servidor coleta mesmo com a página fechada; a tela aberta consulta novos dados.
setInterval(()=>{if(!document.hidden&&document.getElementById('portal').classList.contains('on')&&!coletaEmAndamento){atualizarNoticias();if(document.getElementById('sec-tempo').classList.contains('on'))carregarEpagri(true)}},60000);
