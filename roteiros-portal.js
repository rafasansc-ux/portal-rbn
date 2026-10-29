'use strict';
let janelaBoletim=null,filaBoletim=[];
function prepararBoletim(id,duplicar=false){
 if(!id&&janelaBoletim&&!janelaBoletim.closed){janelaBoletim.focus();return janelaBoletim}
 const url='/boletim.html'+(id?'?id='+encodeURIComponent(id)+(duplicar?'&duplicar=1':''):'');
 const w=window.open(url,id?'_blank':'editor-boletim','popup,width=1000,height=850,resizable=yes,scrollbars=yes');
 if(!w){toast('Permita a abertura de janelas para editar o boletim ao lado do portal.');return null}
 if(!id)janelaBoletim=w;return w;
}
function enviarNoticiaBoletim(item){const existing=janelaBoletim&&!janelaBoletim.closed;const w=prepararBoletim();if(!w)return;const token=crypto.randomUUID();const message={type:'boletim-adicionar',item,token};filaBoletim.push(message);if(existing)w.postMessage(message,location.origin);toast('Enviando notícia ao editor…')}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin)return;
 if(e.data?.type==='boletim-salvo'){renderBoletim();return}
 if(e.source!==janelaBoletim)return;
 if(e.data?.type==='boletim-pronto'){for(const m of filaBoletim)janelaBoletim.postMessage(m,location.origin)}
 if(e.data?.type==='boletim-recebido'){filaBoletim=filaBoletim.filter(m=>m.token!==e.data.token);toast('Notícia adicionada ao boletim.')}
});
const renderCardOriginal=renderCard;
renderCard=function(n,i,cor,fonte){const html=renderCardOriginal(n,i,cor,fonte),data=encodeURIComponent(JSON.stringify({titulo:n.t,texto:n.r||'',fonte:fonte||'',url:safeURL(n.l)==='#'?'':safeURL(n.l)})).replace(/'/g,'%27');return html.replace('<span class="c-fonte">','<button class="btn-ac bs adicionar-boletim" data-noticia="'+esc(data)+'">+ Adicionar ao boletim</button><span class="c-fonte">')};
document.addEventListener('click',e=>{const button=e.target.closest('[data-noticia]');if(button){try{enviarNoticiaBoletim(JSON.parse(decodeURIComponent(button.dataset.noticia)))}catch{toast('Não foi possível adicionar esta notícia.')}}});
let arquivoRequest=0;
renderBoletim=async function(){
 const target=document.getElementById('bol-prev');if(!target)return;const request=++arquivoRequest;target.textContent='Carregando boletins salvos…';
 try{const rows=await api('roteiros');if(request!==arquivoRequest)return;target.replaceChildren();if(!rows.length){target.textContent='Nenhum boletim salvo. Clique em Preparar boletim para criar seu primeiro roteiro.';return}
 for(const row of rows){const card=document.createElement('article');card.className='arquivo-boletim';const h=document.createElement('h3');h.textContent=row.titulo;const date=document.createElement('p');date.textContent='Criado em '+new Date(row.criado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' · Editado em '+new Date(row.atualizado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});card.append(h,date);for(const [label,duplicate] of [['Abrir / editar',false],['Duplicar',true]]){const b=document.createElement('button');b.className='btn-ac '+(duplicate?'bs':'bp');b.textContent=label;b.onclick=()=>prepararBoletim(row.id,duplicate);card.append(b)}target.append(card)}
 }catch(e){if(request===arquivoRequest)target.textContent=e.message}
};
updateStats=function(){const total=document.getElementById('tot');if(total)total.textContent=DADOS_JSON?.total||0};
