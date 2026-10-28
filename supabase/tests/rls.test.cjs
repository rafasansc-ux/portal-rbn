const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('PostgreSQL/RLS: isolamento, leitura, escrita, vencimento e vínculos protegidos',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(fs.readFileSync('supabase/migrations/202610280001_portal.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/202610280002_operacoes.sql','utf8'));
 await db.exec(`create schema vault;create table vault.secrets(name text primary key,decrypted_secret text);create view vault.decrypted_secrets as select * from vault.secrets;create function vault.create_secret(secret text,label text) returns void language sql as $$insert into vault.secrets values(label,secret)$$;create schema cron;create table cron.job(jobname text,active boolean);`);
 await db.exec(fs.readFileSync('supabase/migrations/202610280003_automacao_tempo.sql','utf8').replace(/create extension if not exists (pg_cron|pg_net);/g,''));
 const radioA='10000000-0000-0000-0000-000000000001',radioB='10000000-0000-0000-0000-000000000002',radioE='10000000-0000-0000-0000-000000000003';
 const userA='20000000-0000-0000-0000-000000000001',userB='20000000-0000-0000-0000-000000000002',reader='20000000-0000-0000-0000-000000000003',expired='20000000-0000-0000-0000-000000000004';
 await db.exec(`insert into auth.users values ('${userA}'),('${userB}'),('${reader}'),('${expired}');insert into portal_radios(id,nome,acesso_ate) values ('${radioA}','A',now()+interval '30 days'),('${radioB}','B',now()+interval '30 days'),('${radioE}','Vencida',now()-interval '1 day');insert into portal_membros values ('${radioA}','${userA}','administrador',true),('${radioB}','${userB}','administrador',true),('${radioA}','${reader}','leitor',true),('${radioE}','${expired}','administrador',true);insert into portal_fontes(radio_id,nome,editoria,rss) values ('${radioA}','Fonte A','Local','https://a.example/feed'),('${radioB}','Fonte B','Local','https://b.example/feed'),('${radioE}','Fonte vencida','Local','https://e.example/feed');`);
 async function asUser(user,query){await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);try{return await db.query(query)}finally{await db.exec('rollback')}}
 assert.deepEqual((await asUser(userA,'select nome from portal_fontes')).rows.map(x=>x.nome),['Fonte A']);
 assert.deepEqual((await asUser(userB,'select nome from portal_fontes')).rows.map(x=>x.nome),['Fonte B']);
 assert.equal((await asUser(userA,`insert into portal_fontes(radio_id,nome,editoria,rss) values ('${radioA}','Nova','Local','https://nova.example/feed') returning nome`)).rows[0].nome,'Nova');
 await assert.rejects(asUser(userA,`insert into portal_fontes(radio_id,nome,editoria,rss) values ('${radioB}','Invasão','Local','https://evil.example/feed')`),{code:'42501'});
 assert.equal((await asUser(userA,`update portal_fontes set nome='Invasão' where radio_id='${radioB}' returning nome`)).rows.length,0);
 await assert.rejects(asUser(userA,`update portal_fontes set radio_id='${radioB}' where radio_id='${radioA}'`),{code:'42501'});
 await assert.rejects(asUser(userA,`insert into portal_membros values ('${radioB}','${userA}','administrador',true)`),{code:'42501'});
 await assert.rejects(asUser(userA,"update portal_radios set acesso_ate=now()+interval '100 years'"),{code:'42501'});
 assert.equal((await asUser(reader,'select nome from portal_fontes')).rows.length,1);
 await assert.rejects(asUser(reader,`insert into portal_fontes(radio_id,nome,editoria,rss) values ('${radioA}','Não permitido','Local','https://reader.example/feed')`),{code:'42501'});
 assert.equal((await asUser(expired,'select nome from portal_fontes')).rows.length,0);
 await assert.rejects(asUser(userA,`select portal_job_validar('qualquer')`),{code:'42501'});await assert.rejects(asUser(userA,`select portal_job_reservar('${radioA}')`),{code:'42501'});assert.equal((await asUser(userA,'select portal_automacao_status() as status')).rows[0].status.ativa,false);await db.exec("insert into cron.job values('portal-rbn-coleta-2h',true)");assert.equal((await asUser(userA,'select portal_automacao_status() as status')).rows[0].status.intervaloMinutos,120);await assert.rejects(asUser(userA,`insert into portal_tempo(id,dados) values('epagri','{}')`),{code:'42501'});
 const rpcResult=await asUser(userA,`select portal_substituir_fontes('${radioA}','[{"nome":"RSS novo","editoria":"Local","rss":"https://new.example/feed","ativo":true}]')`);assert.ok(rpcResult);
 await assert.rejects(asUser(userA,`select portal_substituir_fontes('${radioB}','[]')`),{code:'42501'});
 await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[userA]);
 try{const first=await db.query(`select portal_iniciar_coleta('${radioA}') as token`);const token=first.rows[0].token;assert.ok(token);assert.equal((await db.query(`select portal_iniciar_coleta('${radioA}') as token`)).rows[0].token,null);await db.query(`select portal_salvar_boletim('${radioA}','${token}','{"editorias":[],"erros":[]}')`)}finally{await db.exec('rollback')}
 await db.exec(`update portal_radios set ativa=false where id='${radioA}'`);assert.equal((await asUser(userA,'select nome from portal_fontes')).rows.length,0);
 await db.exec('begin;set local role anon');try{await assert.rejects(db.query('select * from portal_fontes'),{code:'42501'})}finally{await db.exec('rollback')}
 await assert.rejects(db.query(`insert into portal_boletins(radio_id,dados) values ('${radioA}','{}')`),{code:'23514'});
 }finally{await db.close()}
});
