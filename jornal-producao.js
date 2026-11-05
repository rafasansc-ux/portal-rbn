'use strict';
(()=>{
 let noticias=[],selecao=[],signature='',preview=null,working=false;
 const el=id=>document.getElementById('producao-'+id);
 const aviso=t=>{el('aviso').textContent=t};
 function selected(){return selecao[Number(el('bloco').value)]||[]}
 function lista(){const target=el('noticias');target.replaceChildren();const idx=Number(el('bloco').value),block=blocos[idx];if(!block||block.tipo==='comercial'){target.textContent='Intervalo comercial: não recebe notícias.';return}
 const busca=el('busca').value.toLocaleLowerCase('pt-BR'),editoria=el('editoria').value;
 for(const n of noticias.filter(n=>(!editoria||n.editoria===editoria)&&(!busca||(n.titulo+' '+n.texto+' '+n.fonte).toLocaleLowerCase('pt-BR').includes(busca)))){
 const card=document.createElement('article'),label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=selected().includes(n.id);const other=selecao.some((s,i)=>i!==idx&&s.includes(n.id));check.disabled=other||working;
 check.onchange=()=>{const ids=selected();if(check.checked){if(ids.length>=12){check.checked=false;return aviso('Limite de 12 notícias por bloco.')}ids.push(n.id)}else ids.splice(ids.indexOf(n.id),1);preview=null;el('abrir').disabled=true;aviso('Seleção alterada. Confira o plano antes de abrir o rascunho.');count()};
 label.append(check,document.createTextNode(n.titulo+(other?' · Já escolhida em outro bloco':'')));const p=document.createElement('p');p.textContent=n.texto||'Fonte sem resumo disponível.';const a=document.createElement('a');a.href=n.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=n.fonte+' · '+n.editoria+' · Ler original ↗';card.append(label,p,a);target.append(card)
 }count();
 }
 function count(){el('contagem').textContent=selected().length+' selecionadas neste bloco · '+selecao.reduce((s,a)=>s+a.length,0)+' no jornal'}
 function mostrarPlano(){const target=el('resultado');target.replaceChildren();for(const b of preview.blocos){const article=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=b.nome+' · '+tempo(b.segundos);p.textContent=b.tipo==='comercial'?'Espaço reservado para comerciais.':b.noticias.length+' notícias · leitura dos resumos: '+tempo(b.leitura_segundos);article.append(h,p);for(const n of b.noticias){const link=document.createElement('a');link.href=n.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=n.titulo+' · '+n.fonte;const line=document.createElement('p');line.append(link);article.append(line)}for(const alert of b.alertas){const a=document.createElement('p');a.className='alerta';a.textContent=alert;article.append(a)}target.append(article)}aviso(preview.aviso);el('abrir').disabled=!preview.blocos.some(b=>b.noticias.length)}
 async function distribuir(){preview=await api('jornal-preparacao','POST',{...body(),automatico:true});selecao=preview.selecao;mostrarPlano()}
 $('ia').disabled=false;
 $('ia').onclick=async()=>{if(!writable||busy||working)return;try{const data=body(),sig=JSON.stringify(data);if(sig!==signature){signature=sig;selecao=data.blocos.map(()=>[]);preview=null;el('resultado').replaceChildren();el('abrir').disabled=true}el('painel').showModal();aviso('Carregando notícias disponíveis na sua emissora…');working=true;noticias=await api('jornal-preparacao');
 el('bloco').replaceChildren();data.blocos.forEach((b,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+b.nome;el('bloco').append(o)});
 el('editoria').replaceChildren();for(const v of ['',...new Set(noticias.map(n=>n.editoria))]){const o=document.createElement('option');o.value=v;o.textContent=v||'Todas as editorias';el('editoria').append(o)}if(!preview){if(selecao.some(s=>s.length)){preview=await api('jornal-preparacao','POST',{...body(),selecao});mostrarPlano()}else await distribuir()}else mostrarPlano();working=false;lista();
 }catch(e){working=false;aviso(e.message);status(e.message,true)}};
 el('bloco').onchange=lista;el('editoria').onchange=lista;el('busca').oninput=lista;
 el('fechar').onclick=()=>{if(!working)el('painel').close()};el('painel').addEventListener('cancel',e=>{if(working)e.preventDefault()});
 el('conferir').onclick=async()=>{if(working)return;working=true;el('conferir').disabled=true;el('abrir').disabled=true;try{preview=await api('jornal-preparacao','POST',{...body(),selecao});mostrarPlano()}catch(e){preview=null;aviso(e.message)}finally{working=false;el('conferir').disabled=false}};
 el('automatico').onclick=async()=>{if(working||!confirm('Refazer a seleção automática? Os ajustes manuais desta seleção serão substituídos.'))return;working=true;el('automatico').disabled=true;el('abrir').disabled=true;try{await distribuir()}catch(e){preview=null;aviso(e.message)}finally{working=false;el('automatico').disabled=false;lista()}};
 el('abrir').onclick=async()=>{if(working||!preview)return;if(!confirm('Criar um rascunho com os resumos originais selecionados? A IA não será utilizada.'))return;working=true;el('abrir').disabled=true;try{
 // Revalidar a coleta no servidor antes de persistir; nenhum texto enviado pelo navegador é aceito como fonte.
 const p=await api('jornal-preparacao','POST',{...body(),selecao});
 const itens=[];for(const b of p.blocos){itens.push({titulo:b.nome+' · '+tempo(b.segundos),texto:b.tipo==='comercial'?'[INTERVALO COMERCIAL]':'',fonte:'',url:''});for(const n of b.noticias)itens.push({titulo:n.titulo,texto:n.texto,fonte:n.fonte,url:n.url})}
 const row=await api('roteiros','POST',{titulo:p.nome+' · Rascunho de seleção',itens});dirty=false;location.href='/boletim.html?id='+encodeURIComponent(row.id);
 }catch(e){aviso(e.message);working=false;el('abrir').disabled=false}};
})();
