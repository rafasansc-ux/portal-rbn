const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {validar,revisar}=require('./lib/revisao.cjs');const {revisaoHandler}=require('./lib/revisao-handler.cjs');const {PGlite}=require('@electric-sql/pglite');
const key='50000000-0000-4000-8000-000000000001';
test('Revisão preserva números e declarações e usa saída estruturada sem ferramentas',async()=>{
 assert.throws(()=>validar({chave:key,texto:'x'.repeat(6001)}));assert.equal(validar({chave:key,texto:'Texto'}).hash.length,64);
 let sent;const result=(texto,alertas=[])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({texto,alertas})}]}],usage:{input_tokens:200,output_tokens:100}});
 const fetcher=async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url,'https://api.openai.com/v1/responses');return Response.json(result('A cidade tem 30 escolas.'))};
 assert.equal((await revisar({key:'teste',texto:'A cidade tem 30 escola.',fetcher})).texto,'A cidade tem 30 escolas.');assert.equal(sent.store,false);assert.equal(sent.text.format.type,'json_schema');assert.equal(sent.max_output_tokens,4500);assert.equal(sent.tools,undefined);
 await assert.rejects(revisar({key:'teste',texto:'30 escolas',fetcher:async()=>Response.json(result('31 escolas'))}),/números/);
 await assert.rejects(revisar({key:'teste',texto:'Ele disse "não vou".',fetcher:async()=>Response.json(result('Ele disse "eu vou".'))}),/declaração/);
 await assert.rejects(revisar({key:'teste',texto:'Texto',fetcher:async()=>Response.json({status:'incomplete'})}),/interrompida/);
});
test('API não usa IA sem ativação, bloqueia leitor e não repete solicitação incerta',async()=>{
 let answer,calls=0;const base={req:{},res:{},method:'POST',db:{},admin:{rpc:async()=>({data:{nova:false,estado:'incerto'}})},radio:{id:'radio'},user:{id:'user'},role:'editor',env:{},readBody:async()=>({chave:key,texto:'Texto'}),send:(r,status,data)=>answer={status,data},review:async()=>{calls++}};
 await revisaoHandler(base);assert.equal(answer.status,503);assert.equal(calls,0);
 await revisaoHandler({...base,role:'leitor'});assert.equal(answer.status,403);
 await revisaoHandler({...base,env:{REVISAO_ENABLED:'true',OPENAI_API_KEY:'teste'}});assert.equal(answer.status,409);assert.equal(calls,0);
 const cached={texto:'Texto revisado',alertas:[]};await revisaoHandler({...base,env:{REVISAO_ENABLED:'true',OPENAI_API_KEY:'teste'},admin:{rpc:async()=>({data:{nova:false,estado:'pronto',resultado:cached}})}});assert.equal(answer.status,200);assert.deepEqual(answer.data,cached);assert.equal(calls,0);
});
test('Banco limita revisões por rádio e mês, protege resultado e idempotência',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;`);
 for(const f of ['202610280001_portal.sql','202611040012_revisao_texto.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',u='20000000-0000-4000-8000-000000000001',v='20000000-0000-4000-8000-000000000002';
 await db.exec(`insert into auth.users values('${u}'),('${v}');insert into portal_radios(id,nome,acesso_ate) values('${a}','A',now()+interval '30 days'),('${b}','B',now()+interval '30 days');insert into portal_membros values('${a}','${u}','editor',true),('${b}','${v}','editor',true);insert into portal_revisao_planos values('${a}',true,1);`);
 const reserve=(chave=key,usuario=u,hash='a'.repeat(64))=>`select portal_reservar_revisao('${a}','${usuario}','${chave}','${hash}') as job`;
 await assert.rejects(db.query(reserve(key,v)),/não autorizado/);
 assert.equal((await db.query(reserve())).rows[0].job.nova,true);assert.equal((await db.query(reserve())).rows[0].job.nova,false);
 await assert.rejects(db.query(reserve(key,u,'b'.repeat(64))),/outro texto/);await assert.rejects(db.query(reserve('50000000-0000-4000-8000-000000000002')),/Limite mensal/);
 await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[v]);assert.equal((await db.query('select * from portal_revisoes')).rows.length,0);await assert.rejects(db.query(reserve()));await db.exec('rollback');
 }finally{await db.close()}
});
test('Interface retira módulos de voz e só aplica sugestão com revisão humana',()=>{
 const html=fs.readFileSync('boletim.html','utf8'),nav=fs.readFileSync('index.html','utf8');assert.ok(html.includes('Revisar texto'));assert.ok(!html.includes('abrir-locucao'));assert.ok(!nav.includes('Vozes da emissora'));
 const vm=require('node:vm'),nodes=new Map();const node=()=>({value:'',disabled:false,textContent:'',children:[],events:{},append(v){this.children.push(v)},replaceChildren(){this.children=[]},addEventListener(k,f){this.events[k]=f},showModal(){},close(){}});const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 const target={titulo:'Teste',texto:'30 escola'},ctx={document:{getElementById:get,createElement:node},itens:[target],ready:true,writable:true,busy:false,crypto:require('node:crypto'),changed(){},render(){},status(){},api:async(route,method)=>method==='POST'?{texto:'30 escolas',alertas:[]}:{habilitado:true}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('revisao-ui.js','utf8'),ctx);
 return (async()=>{await get('abrir-revisao').onclick();await get('revisao-gerar').onclick();assert.equal(target.texto,'30 escola');get('revisao-aplicar').onclick();assert.equal(target.texto,'30 escolas');
 await get('abrir-revisao').onclick();await get('revisao-gerar').onclick();target.texto='Alteração posterior';get('revisao-aplicar').onclick();assert.equal(target.texto,'Alteração posterior');})();
});
