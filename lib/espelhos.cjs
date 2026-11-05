'use strict';
function validarEspelho(b){
 if(!b||typeof b.nome!=='string'||!b.nome.trim()||b.nome.length>160||!Number.isInteger(b.meta_segundos)||b.meta_segundos<60||b.meta_segundos>86400||!Array.isArray(b.blocos)||!b.blocos.length||b.blocos.length>50)throw Error('Informe nome, duração do jornal e entre 1 e 50 blocos.');
 const blocos=b.blocos.map(x=>{if(!x||typeof x.nome!=='string'||!x.nome.trim()||x.nome.length>160||!['editorial','comercial'].includes(x.tipo)||!Number.isInteger(x.segundos)||x.segundos<1||x.segundos>86400)throw Error('Cada bloco precisa de nome, tipo e duração positiva.');return {nome:x.nome.trim(),tipo:x.tipo,segundos:x.segundos}});
 if(blocos.reduce((s,b)=>s+b.segundos,0)>86400)throw Error('O espelho deve ter no máximo 24 horas.');
 return {nome:b.nome.trim(),meta_segundos:b.meta_segundos,blocos};
}
function totais(blocos){const editorial=blocos.filter(b=>b.tipo==='editorial').reduce((s,b)=>s+b.segundos,0),comercial=blocos.filter(b=>b.tipo==='comercial').reduce((s,b)=>s+b.segundos,0);return {editorial,comercial,total:editorial+comercial}}
module.exports={validarEspelho,totais};
