const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {custo,saldo}=require('./lib/creditos.cjs');
const {PGlite}=require('@electric-sql/pglite');
test('Tela informa 500 de saldo, custo 30 e saldo após gerar 470; bloqueia saldo menor',async()=>{
 const vm=require('node:vm'),nodes=new Map();
 const node=()=>({value:'1',textContent:'',disabled:false,children:[],append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},showModal(){},close(){},addEventListener(){}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 const config={habilitado:true,vozes:[{id:'voz',nome:'Rafa'}],historico:[],creditos:{total:500,disponiveis:500,usados:0,reservados:0,modo:'assinatura',fim:'2026-12-04T03:00:00Z'}};
 const context={document:{getElementById:get,createElement:node},itens:[{texto:'a'.repeat(3000)}],writable:true,id:'roteiro',versao:1,dirty:false,URLSearchParams,location:{search:''},crypto:require('node:crypto'),api:async()=>config};
 vm.createContext(context);vm.runInContext(fs.readFileSync('locucao-ui.js','utf8'),context);await get('abrir-locucao').onclick();
 assert.match(get('locucao-consumo').textContent,/Saldo disponível: 500/);assert.match(get('locucao-estimativa').textContent,/30 crédito/);assert.match(get('locucao-estimativa').textContent,/470 créditos/);assert.equal(get('locucao-gerar').disabled,false);assert.doesNotMatch(get('locucao-estimativa').textContent,/US\$/);
 config.creditos.disponiveis=29;await get('abrir-locucao').onclick();assert.equal(get('locucao-gerar').disabled,true);assert.match(get('locucao-estimativa').textContent,/faltam 1 créditos/);
});
test('Créditos: arredondamento, reservas, estorno e validade do ciclo',()=>{
 assert.equal(custo('x'.repeat(100)),1);assert.equal(custo('x'.repeat(101)),2);assert.equal(custo('😀'.repeat(100)),1);
 const cycle={id:'c',inicio:'2026-11-04T00:00:00Z',fim:'2026-12-04T00:00:00Z',creditos:500};
 const base={plano:{creditos_ativo:true},ciclos:[cycle],recargas:[{ciclo_id:'c',creditos:10}],now:Date.parse('2026-11-10'),jobs:[{ciclo_id:'c',creditos:30,estado:'pronto'},{ciclo_id:'c',creditos:5,estado:'incerto'},{ciclo_id:'c',creditos:2,estado:'incerto',estornado_em:'2026-11-09'},{ciclo_id:'outro',creditos:900,estado:'pronto'}]};
 assert.deepEqual([saldo(base).disponiveis,saldo(base).reservados],[475,5]);assert.equal(saldo({...base,now:Date.parse(cycle.fim)}).disponiveis,0);
});
test('Banco: créditos atômicos, renovação paga, recarga idempotente, estorno e isolamento',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;create schema storage;create table storage.buckets(id text,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 for(const name of ['202610280001_portal.sql','202610290004_roteiros.sql','202610290005_excluir_roteiros.sql','202611030006_locucao.sql','202611030007_contagem_locucao.sql','202611030008_vozes_emissora.sql','202611040010_creditos_locucao.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',u='20000000-0000-4000-8000-000000000001',v='20000000-0000-4000-8000-000000000002',voice='30000000-0000-4000-8000-000000000001',script='40000000-0000-4000-8000-000000000001';
 await db.exec(`insert into auth.users values('${u}'),('${v}');insert into portal_radios(id,nome,acesso_ate) values('${a}','A',now()+interval '60 days'),('${b}','B',now()+interval '60 days');insert into portal_membros values('${a}','${u}','administrador',true),('${b}','${v}','administrador',true);insert into portal_audio_planos(radio_id,ativo,limite_caracteres,limite_segundos) values('${a}',true,100,600);insert into portal_vozes(id,radio_id,nome,provedor_id,ativa,autorizada,evidencia_licenca) values('${voice}','${a}','Voz','provider',true,true,'Autorização teste');insert into portal_roteiros(id,radio_id,titulo,dados) values('${script}','${a}','Teste','{"itens":[{"texto":"${'x'.repeat(101)}"}]}');`);
 await db.exec("select set_config('request.jwt.claim.role','service_role',false)");
 const start=(await db.query('select now() as t')).rows[0].t.toISOString(),end=new Date(Date.parse(start)+30*86400000).toISOString();
 const pay=(ref='pagamento-001',n=2)=>`select portal_audio_pagamento('${a}','${ref}',${n},'${start}','${end}') as id`;
 const c=(await db.query(pay())).rows[0].id;assert.equal((await db.query(pay())).rows[0].id,c);
 await assert.rejects(db.query(pay('pagamento-001',3)),/outros valores/);await assert.rejects(db.query(pay('pagamento-002')),/sobreposto/);
 let counter=0;const reserve=(user=u)=>`select portal_reservar_locucao('${a}','${user}','${script}',1,'${voice}','50000000-0000-4000-8000-${String(++counter).padStart(12,'0')}',1,'neutro') as job`;
 const firstSQL=reserve(),job=(await db.query(firstSQL)).rows[0].job;assert.equal(job.nova,true);assert.equal((await db.query(firstSQL)).rows[0].job.nova,false);
 assert.equal((await db.query('select creditos from portal_locucoes')).rows[0].creditos,2);assert.equal((await db.query(`select portal_audio_saldo('${a}') as saldo`)).rows[0].saldo.disponiveis,0);
 await assert.rejects(db.query(reserve()),/Créditos insuficientes/);
 const topup=`select portal_audio_pagamento('${a}','recarga-001',2,null,null,'${c}') as id`;
 assert.equal((await db.query(topup)).rows[0].id,(await db.query(topup)).rows[0].id);
 await db.query(reserve());await assert.rejects(db.query(reserve()),/Créditos insuficientes/);
 await assert.rejects(db.query(`select portal_audio_pagamento('${a}','pagamento-001',2,null,null,'${c}')`),/já usado/);
 await assert.rejects(db.query(`select portal_audio_pagamento('${b}','recarga-alheia',2,null,null,'${c}')`));
 await db.exec(`update portal_locucoes set estado='incerto' where id='${job.id}';`);
 const refund=`select portal_audio_estornar('${a}','${job.id}','Falha confirmada sem áudio após conferência') as ok`;
 assert.equal((await db.query(refund)).rows[0].ok,true);assert.equal((await db.query(refund)).rows[0].ok,false);
 await db.query(reserve());await assert.rejects(db.query(reserve(v)),/não autorizado/);
 await db.exec(`update portal_audio_ciclos set inicio=now()-interval '31 days',fim=now()-interval '1 day';`);await assert.rejects(db.query(reserve()),/Ciclo expirado/);
 await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[v]);
 assert.equal((await db.query('select * from portal_audio_ciclos')).rows.length,0);await assert.rejects(db.query(pay()));await db.exec('rollback');
 }finally{await db.close()}
});
