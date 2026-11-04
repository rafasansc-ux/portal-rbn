const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {validarCadastro,TERMOS_VERSAO,clonar,consultar,verificacao,consentimentoValido}=require('./lib/vozes.cjs');
const {vozesHandler}=require('./lib/vozes-handler.cjs');
test('Guarda externa exige declaração expressa e não cria PDF nem hash fictícios',()=>{
 const b={...body(),guardaExterna:true,documentoSobGuarda:true};delete b.documento;
 const valid=validarCadastro(b,Date.parse('2026-11-03'));assert.equal(valid.documento,null);assert.equal(valid.documento_sha256,'');
 assert.throws(()=>validarCadastro({...b,documentoSobGuarda:false}),/sob sua guarda/);
 assert.throws(()=>validarCadastro({...b,autorizacaoExpressa:false}));
 const html=fs.readFileSync('vozes.html','utf8');assert.ok(!html.includes('id="voz-documento"'));assert.ok(!html.includes('id="voz-responsavel"'));
});
test('API de guarda externa salva somente áudio e registra o administrador real',async()=>{
 let resposta,record;const uploads=[],events=[];
 const q={select(){return this},eq(){return this},limit(){return Promise.resolve({data:[]})}};
 const payload={...body(),acao:'cadastrar',guardaExterna:true,documentoSobGuarda:true,responsavel:'Ignorar identidade enviada',validade:'2027-11-01'};delete payload.documento;
 const admin={storage:{from:()=>({upload:async(path)=>{uploads.push(path);return {data:{}}},remove:async()=>({data:{}})})},from:table=>({insert:async(value)=>{if(table==='portal_locutores')record=value;else events.push(value);return {data:{}}}})};
 await vozesHandler({req:{},res:{},parsed:new URL('https://portal.example/api/vozes'),method:'POST',db:{from:()=>q},admin,radio:{id:'radio-teste'},user:{id:'admin-real'},role:'administrador',env:{},readBody:async()=>payload,checked:async p=>{const r=await p;if(r.error)throw r.error;return r.data},send:(r,status,data)=>{resposta={status,data}}});
 assert.equal(resposta.status,200);assert.equal(uploads.length,1);assert.ok(uploads[0].endsWith('/amostra.mp3'));assert.equal(record.documento_caminho,'');assert.equal(record.documento_sha256,'');assert.equal(record.responsavel,'Administrador autenticado admin-real');assert.equal(events[0].acao,'autorizacao_declarada_guarda_externa');
});
function sample(){const frame=Buffer.alloc(417);frame.set([255,251,144,0]);return Buffer.concat(Array(2390).fill(frame));}
const body=()=>({nome:'Locutor de teste',responsavel:'Responsável',validade:'2027-11-01',canalRevogacao:'redacao@example.com',destinoAudios:'Suspender novas exibições a pedido do locutor.',guardaDocumentos:'Cinco anos para comprovar a autorização, conforme documento.',documento:Buffer.from('%PDF-1.7\nDocumento fictício de teste\n%%EOF').toString('base64'),amostra:sample().toString('base64'),autorizacaoExpressa:true,documentoConferido:true,termosVersao:TERMOS_VERSAO});
test('Cadastro exige consentimento documentado, prazo válido, PDF e MP3 limitado',()=>{
 const now=Date.parse('2026-11-03'),valid=validarCadastro(body(),now);assert.ok(valid.amostra_segundos>=60);assert.equal(valid.documento_sha256.length,64);assert.equal(valid.termos_versao,TERMOS_VERSAO);
 for(const patch of [{autorizacaoExpressa:false},{documentoConferido:false},{termosVersao:'antigo'},{validade:'2026-01-01'},{validade:'2027-02-31'},{documento:Buffer.from('<html>falso</html>').toString('base64')},{amostra:'../arquivo'},{amostra:Buffer.from('not an MP3').toString('base64')},{amostra:Buffer.alloc(1000001).toString('base64')}])assert.throws(()=>validarCadastro({...body(),...patch},now));
 assert.equal(consentimentoValido({consentimento_ate:'2027-01-01',revogado_em:'2026-01-01'},now),false);
});
test('IVC usa multipart no servidor e nunca libera verificações pendentes',async()=>{
 let sent;const out=await clonar({key:'test-only',nome:'Locutor',audio:sample(),fetcher:async(url,options)=>{sent={url,options};return Response.json({voice_id:'voice_test',requires_verification:true})}});
 assert.equal(sent.url,'https://api.elevenlabs.io/v1/voices/add');assert.equal(sent.options.body.get('files').type,'audio/mpeg');assert.equal(sent.options.headers['xi-api-key'],'test-only');assert.equal(out.verificada,false);
 assert.equal(verificacao({}),false);assert.equal(verificacao({voice_verification:{requires_verification:false},safety_control:'CAPTCHA'}),false);assert.equal(verificacao({voice_verification:{requires_verification:false},safety_control:'NONE'}),true);
 assert.equal(verificacao({voice_verification:{requires_verification:true,is_verified:true}}),false);
 assert.equal(await consultar({key:'test',voice:'voice_test',fetcher:async()=>Response.json({voice_verification:{requires_verification:true,is_verified:false}})}),false);
 await assert.rejects(clonar({key:'test',nome:'Locutor',audio:sample(),fetcher:async()=>new Response('',{status:403})}),/Vozes: Escrita/);
});
test('API rejeita editor, voz alheia, consentimento revogado e clonagem desabilitada antes de transmitir',async()=>{
 let answer,calls=0;const id='40000000-0000-4000-8000-000000000001';
 const query=data=>{const q={select(){return q},eq(){return q},then(resolve){return Promise.resolve({data}).then(resolve)}};return q};
 const options={req:{},res:{},parsed:new URL('https://portal.example/api/vozes?id='+id),method:'POST',db:{from:()=>query([{consentimento_ate:'2099-01-01',estado:'cadastrada'}])},admin:{},role:'administrador',radio:{id},user:{id},env:{},readBody:async()=>({acao:'clonar',confirmarEnvio:true}),checked:async p=>(await p).data,send:(res,status,data)=>{answer={status,data}},clone:async()=>{calls++}};
 await vozesHandler({...options,role:'editor'});assert.equal(answer.status,403);
 await vozesHandler({...options,db:{from:()=>query([])}});assert.equal(answer.status,404);
 await vozesHandler({...options,db:{from:()=>query([{revogado_em:'2026-01-01',consentimento_ate:'2099-01-01'}])}});assert.equal(answer.status,409);
 await vozesHandler(options);assert.equal(answer.status,503);assert.equal(calls,0);
});
test('Banco: clones exclusivos, consentimento vencido/revogado, limites e privilégio de administrador',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;create schema storage;create table storage.buckets(id text,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 await db.exec(`create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select on storage.objects to authenticated;create policy broad_test_storage on storage.objects for select to authenticated using(true);`);
 for(const f of ['202610280001_portal.sql','202610290004_roteiros.sql','202610290005_excluir_roteiros.sql','202611030006_locucao.sql','202611030007_contagem_locucao.sql','202611030008_vozes_emissora.sql','202611030009_storage_vozes_privado.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',u='20000000-0000-4000-8000-000000000001',v='20000000-0000-4000-8000-000000000002',editor='20000000-0000-4000-8000-000000000003',voice='30000000-0000-4000-8000-000000000001',loc='40000000-0000-4000-8000-000000000001';
 await db.exec(`insert into auth.users values('${u}'),('${v}'),('${editor}');insert into portal_radios(id,nome,acesso_ate) values('${a}','A',now()+interval '30 days'),('${b}','B',now()+interval '30 days');insert into portal_membros values('${a}','${u}','administrador',true),('${b}','${v}','administrador',true),('${a}','${editor}','editor',true);insert into portal_audio_planos(radio_id,ativo,limite_vozes,limite_caracteres,limite_segundos) values('${a}',true,1,1000,1200);insert into portal_vozes(id,radio_id,nome,provedor_id,tipo,ativa,autorizada,evidencia_licenca) values('${voice}','${a}','Clone','provider_clone','ivc',true,true,'Autorização documentada');insert into portal_locutores(id,radio_id,nome,responsavel,canal_revogacao,destino_audios,guarda_documentos,consentimento_ate,termos_versao,termos_texto,termos_sha256,documento_caminho,documento_sha256,amostra_caminho,amostra_sha256,amostra_segundos,estado,voz_id,provedor_id,provedor_verificada,criado_por) values('${loc}','${a}','Locutor','Responsável','Contato','Regras','Prazo',now()+interval '1 day','v1','Autorização','hash','doc.pdf','hash','sample.mp3','hash',65,'ativa','${voice}','provider_clone',true,'${u}');`);
 async function as(user,sql){await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);try{return await db.query(sql)}finally{await db.exec('rollback')}}
 assert.equal((await as(u,'select * from portal_locutores')).rows.length,1);assert.equal((await as(v,'select * from portal_locutores')).rows.length,0);assert.equal((await as(editor,'select * from portal_locutores')).rows.length,0);
 await db.exec(`insert into storage.objects(bucket_id) values('portal-vozes-documentos'),('portal-locucoes'),('outro-bucket');`);assert.deepEqual((await as(u,'select bucket_id from storage.objects')).rows.map(x=>x.bucket_id),['outro-bucket']);
 assert.equal((await as(editor,'select * from portal_vozes_disponiveis')).rows.length,1);assert.equal((await as(v,'select * from portal_vozes_disponiveis')).rows.length,0);
 const roteiro='50000000-0000-4000-8000-000000000001';await db.exec(`insert into portal_roteiros(id,radio_id,titulo,dados) values('${roteiro}','${a}','Teste','{"itens":[{"titulo":"Teste","texto":"Texto autorizado"}]}');`);
 async function reserve(){await db.exec('begin');await db.query("select set_config('request.jwt.claim.role','service_role',true)");try{return await db.query(`select portal_reservar_locucao('${a}','${editor}','${roteiro}',1,'${voice}',gen_random_uuid(),1,'neutro') as job`)}finally{await db.exec('rollback')}}
 assert.equal((await reserve()).rows[0].job.nova,true);
 assert.equal((await as(v,`select portal_voz_liberada('${voice}','${a}') as liberada`)).rows[0].liberada,false);
 await assert.rejects(as(u,`update portal_locutores set consentimento_ate=now()+interval '100 years'`));
 await assert.rejects(db.exec(`insert into portal_vozes(radio_id,nome,provedor_id,tipo,evidencia_licenca) values('${b}','Outra rádio','provider_clone','ivc','Documento')`),{code:'23505'});
 await db.exec(`update portal_locutores set consentimento_ate=now()-interval '1 day'`);assert.equal((await as(editor,'select * from portal_vozes_disponiveis')).rows.length,0);await assert.rejects(reserve(),/Voz indisponível/);
 await db.exec(`update portal_locutores set consentimento_ate=now()+interval '1 day',revogado_em=now(),estado='revogada'`);assert.equal((await as(editor,'select * from portal_vozes_disponiveis')).rows.length,0);await assert.rejects(reserve(),/Voz indisponível/);
 await assert.rejects(db.query(`select portal_iniciar_clonagem('${a}','${loc}','${editor}')`),/administrador/);
 await assert.rejects(db.query(`select portal_iniciar_clonagem('${a}','${loc}','${u}')`),/Limite de vozes/);
 }finally{await db.close()}
});

