'use strict';
const CARACTERES_POR_CREDITO=100;
const custo=texto=>Math.ceil(Array.from(texto).length/CARACTERES_POR_CREDITO);
function saldo({plano,ciclos=[],recargas=[],jobs=[],mes,now=Date.now()}){
 const pago=plano?.creditos_ativo===true;
 const ciclo=pago?ciclos.find(c=>Date.parse(c.inicio)<=now&&Date.parse(c.fim)>now):null;
 const total=pago?(ciclo?ciclo.creditos+recargas.filter(r=>r.ciclo_id===ciclo.id).reduce((n,r)=>n+r.creditos,0):0):Math.floor((plano?.limite_caracteres||0)/100);
 const relevantes=jobs.filter(j=>!j.estornado_em&&(pago?ciclo&&j.ciclo_id===ciclo.id:j.mes===mes));
 const reservados=relevantes.filter(j=>j.estado!=='pronto').reduce((n,j)=>n+j.creditos,0);
 const usados=relevantes.filter(j=>j.estado==='pronto').reduce((n,j)=>n+j.creditos,0);
 return {caracteresPorCredito:100,total,usados,reservados,disponiveis:Math.max(0,total-usados-reservados),inicio:ciclo?.inicio||null,fim:ciclo?.fim||null,modo:pago?'assinatura':'piloto',expirado:pago&&!ciclo,renovacaoManual:true};
}
module.exports={CARACTERES_POR_CREDITO,custo,saldo};
