'use strict';
let janelaBoletim=null,filaBoletim=[];
function confirmarBoletim(text,action){const d=document.createElement('dialog');d.className='confirmar-boletim';const p=document.createElement('p');p.textContent=text;const cancel=document.createElement('button');cancel.textContent='Cancelar';cancel.onclick=()=>{d.close();d.remove()};const ok=document.createElement('button');ok.textContent='Continuar';ok.onclick=()=>{d.close();d.remove();action()};d.append(p,cancel,ok);document.body.append(d);d.showModal()}
function prepararBoletim(id,duplicar=false,confirmado=false){
 const url='/boletim.html'+(id?'?id='+encodeURIComponent(id)+(duplicar?'&duplicar=1':''):'');
 let panel=document.getElementById('editor-lateral');
 if(!id&&panel){panel.hidden=false;document.body.classList.add('editor-aberto');return janelaBoletim}
 if(id&&panel&&!confirmado){confirmarBoletim('Abrir este boletim no editor? Salve antes as alterações do roteiro atual.',()=>prepararBoletim(id,duplicar,true));return null;}
 if(!panel){panel=document.createElement('aside');panel.id='editor-lateral';panel.setAttribute('aria-label','Editor de boletim');const bar=document.createElement('div');bar.className='editor-lateral-bar';const title=document.createElement('strong');title.textContent='Preparar boletim';const separate=document.createElement('button');separate.textContent='Janela separada ↗';separate.onclick=()=>{const current=panel.querySelector('iframe');confirmarBoletim('Salve as alterações no editor antes de abrir uma janela separada. Continuar?',()=>{const w=window.open(current.contentWindow.location.href,'_blank','popup,width=1000,height=850,resizable=yes,scrollbars=yes');toast(w?'Janela aberta. Salve seu roteiro antes de continuar em outra janela.':'Seu navegador bloqueou a janela. Continue no editor lateral.');});};const minimize=document.createElement('button');minimize.textContent='Minimizar';minimize.onclick=()=>{panel.hidden=true;document.body.classList.remove('editor-aberto')};bar.append(title,separate,minimize);panel.append(bar);document.body.append(panel)}
 const previous=panel.querySelector('iframe');if(previous)previous.remove();const frame=document.createElement('iframe');frame.title='Editor do boletim';frame.src=url;panel.append(frame);panel.hidden=false;document.body.classList.add('editor-aberto');if(id)filaBoletim=[];janelaBoletim=frame.contentWindow;return janelaBoletim;
}
function enviarNoticiaBoletim(item){const existing=janelaBoletim&&!janelaBoletim.closed;const w=prepararBoletim();if(!w)return;const token=crypto.randomUUID();const message={type:'boletim-adicionar',item,token};filaBoletim.push(message);if(existing)w.postMessage(message,location.origin);toast('Enviando notícia ao editor…')}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin)return;
 if(e.data?.type==='boletim-salvo'){renderBoletim();return}
 if(e.source!==janelaBoletim)return;
 if(e.data?.type==='boletim-pronto'){for(const m of filaBoletim)janelaBoletim.postMessage(m,location.origin)}
 if(e.data?.type==='boletim-recebido'){filaBoletim=filaBoletim.filter(m=>m.token!==e.data.token);toast(e.data.ok?'Notícia adicionada ao boletim.':'Confira o editor: a notícia não foi incluída.')}
});
const renderCardOriginal=renderCard;
renderCard=function(n,i,cor,fonte){const html=renderCardOriginal(n,i,cor,fonte),data=encodeURIComponent(JSON.stringify({titulo:n.t,texto:n.r||'',fonte:fonte||'',url:safeURL(n.l)==='#'?'':safeURL(n.l)})).replace(/'/g,'%27');return html.replace('<span class="c-fonte">','<button class="btn-ac bs adicionar-boletim" data-noticia="'+esc(data)+'">+ Adicionar ao boletim</button><span class="c-fonte">')};
document.addEventListener('click',e=>{const button=e.target.closest('[data-noticia]');if(button){try{enviarNoticiaBoletim(JSON.parse(decodeURIComponent(button.dataset.noticia)))}catch{toast('Não foi possível adicionar esta notícia.')}}});
let arquivoRequest=0;
renderBoletim=async function(){
 const target=document.getElementById('bol-prev');if(!target)return;const request=++arquivoRequest;target.textContent='Carregando boletins salvos…';
 try{const rows=await api('roteiros');if(request!==arquivoRequest)return;target.replaceChildren();if(!rows.length){target.textContent='Nenhum boletim salvo. Clique em Preparar boletim para criar seu primeiro roteiro.';return}
 for(const row of rows){const card=document.createElement('article');card.className='arquivo-boletim';const h=document.createElement('h3');h.textContent=row.titulo;const date=document.createElement('p');date.textContent='Criado em '+new Date(row.criado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' · Editado em '+new Date(row.atualizado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});card.append(h,date);for(const [label,duplicate] of [['Abrir / editar',false],['Duplicar',true]]){const b=document.createElement('button');b.className='btn-ac '+(duplicate?'bs':'bp');b.textContent=label;b.onclick=()=>prepararBoletim(row.id,duplicate);card.append(b)}const del=document.createElement('button');del.className='btn-ac bs';del.style.color='#ff9c9c';del.textContent='Excluir';del.onclick=async()=>{if(!confirm('Excluir o boletim “'+row.titulo+'” da lista?'))return;del.disabled=true;try{await api('roteiros?id='+encodeURIComponent(row.id),'DELETE',{});toast('Boletim excluído.');await renderBoletim()}catch(e){toast(e.message);del.disabled=false}};card.append(del);target.append(card)}
 }catch(e){if(request===arquivoRequest)target.textContent=e.message}
};
updateStats=function(){const total=document.getElementById('tot');if(total)total.textContent=DADOS_JSON?.total||0};
