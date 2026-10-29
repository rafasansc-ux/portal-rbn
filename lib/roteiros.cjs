const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validarRoteiro(b){
 if(!b||typeof b.titulo!=='string'||!b.titulo.trim()||b.titulo.length>160||!Array.isArray(b.itens)||b.itens.length>100)throw Error('Informe um título e use até 100 blocos no boletim.');
 const itens=b.itens.map(i=>{if(!i||typeof i.titulo!=='string'||i.titulo.length>500||typeof i.texto!=='string'||i.texto.length>30000||typeof i.fonte!=='string'||i.fonte.length>200||typeof i.url!=='string'||i.url.length>2000)throw Error('Bloco de texto inválido.');let url='';if(i.url){try{const u=new URL(i.url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();url=u.href}catch{throw Error('Link da fonte inválido.')}}return {titulo:i.titulo,texto:i.texto,fonte:i.fonte,url}});
 const dados={itens};if(Buffer.byteLength(JSON.stringify(dados))>200000)throw Error('Boletim muito grande. Divida o texto em mais de um boletim.');return {titulo:b.titulo.trim(),dados};
}
module.exports={uuid,validarRoteiro};
