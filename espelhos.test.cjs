const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {validarEspelho,totais}=require('./lib/espelhos.cjs');
const {PGlite}=require('@electric-sql/pglite');
test('Espelho valida limites e separa conteúdo de comerciais',()=>{
 const input={nome:' Manhã ',meta_segundos:3600,blocos:[{nome:'Notícias',tipo:'editorial',segundos:2700},{nome:'Intervalos',tipo:'comercial',segundos:900}]};
 assert.equal(validarEspelho(input).nome,'Manhã');assert.deepEqual(totais(input.blocos),{editorial:2700,comercial:900,total:3600});
 for(const invalid of [{...input,blocos:[]},{...input,meta_segundos:NaN},{...input,blocos:[{nome:'x',tipo:'editorial',segundos:0}]},{...input,blocos:[{nome:'x',tipo:'outro',segundos:60}]},{...input,blocos:Array(51).fill(input.blocos[0])}])assert.throws(()=>validarEspelho(invalid));
 assert.deepEqual(totais([...input.blocos].reverse()),totais(input.blocos));assert.equal(totais(input.blocos.slice(1)).total,900);
});
test('Modelos: isolamento por emissora, leitor e conflito de versão em PostgreSQL',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;`);
 for(const file of ['202610280001_portal.sql','202610290004_roteiros.sql','202611050013_espelhos.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',u='20000000-0000-0000-0000-000000000001',v='20000000-0000-0000-0000-000000000002',r='20000000-0000-0000-0000-000000000003';
 await db.exec(`insert into auth.users values('${u}'),('${v}'),('${r}');insert into portal_radios(id,nome,acesso_ate) values('${a}','A',now()+interval '1 day'),('${b}','B',now()+interval '1 day');insert into portal_membros values('${a}','${u}','editor',true),('${b}','${v}','editor',true),('${a}','${r}','leitor',true);insert into portal_jornal_modelos(radio_id,nome,meta_segundos,blocos) values('${a}','Manhã',3600,'[{"nome":"Notícias","tipo":"editorial","segundos":60}]'),('${b}','Tarde',3600,'[{"nome":"Notícias","tipo":"editorial","segundos":60}]');`);
 async function as(user,sql){await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);try{return await db.query(sql)}finally{await db.exec('rollback')}}
 assert.deepEqual((await as(u,'select nome from portal_jornal_modelos')).rows.map(x=>x.nome),['Manhã']);
 assert.equal((await as(u,`update portal_jornal_modelos set nome='Intrusão' where radio_id='${b}' returning id`)).rows.length,0);
 assert.equal((await as(r,"update portal_jornal_modelos set nome='Leitor' returning id")).rows.length,0);
 await assert.rejects(as(u,`insert into portal_jornal_modelos(radio_id,nome,meta_segundos,blocos) values('${b}','Intrusão',60,'[{}]')`));
 await assert.rejects(as(u,`update portal_jornal_modelos set radio_id='${b}' where radio_id='${a}'`));
 const saved=await as(u,`update portal_jornal_modelos set nome='Atualizado' where radio_id='${a}' and versao=1 returning versao`);assert.equal(saved.rows[0].versao,2);
 await db.exec(`update portal_jornal_modelos set nome='Atualizado' where radio_id='${a}' and versao=1`);
 assert.equal((await as(u,`update portal_jornal_modelos set nome='Atrasado' where radio_id='${a}' and versao=1 returning id`)).rows.length,0);
 }finally{await db.close()}
});
