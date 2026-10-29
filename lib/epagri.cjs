'use strict';
const {download}=require('../collector.cjs');const {parseEpagri,EPAGRI_URL}=require('./feed-core.cjs');let cache=null,pending=null;
async function getEpagri(stored){
 const previous=stored&&(!cache||Date.parse(stored.consultadoEm)>Date.parse(cache.consultadoEm))?stored:cache;
 if(previous&&Date.now()-Date.parse(previous.consultadoEm)<2*3600000)return previous;
 if(pending)return pending;
 pending=(async()=>{try{cache=parseEpagri(await download(EPAGRI_URL));return cache}catch(e){if(previous)return {...previous,desatualizado:true,aviso:'Não foi possível atualizar a Epagri. Confira a data do boletim anterior.'};throw Error('Não foi possível consultar o boletim da Epagri/Ciram.')}})().finally(()=>pending=null);
 return pending;
}
module.exports={getEpagri};

