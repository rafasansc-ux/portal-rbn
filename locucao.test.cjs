const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {preparar,gerar,duracaoMP3}=require('./lib/locucao.cjs');
test('Amostras MPEG-2 e MPEG-2.5 preservam duração de um minuto',()=>{
 for(const [header,hz] of [[0xf3,22050],[0xe3,11025]]){
  const frame=Buffer.alloc(Math.floor(72000*64/hz));frame.set([255,header,0x80,0]);
  const count=Math.ceil(64*hz/576);
  assert.equal(duracaoMP3(Buffer.concat(Array(count).fill(frame))),65);
 }
});
const {PGlite}=require('@electric-sql/pglite');
const {locucaoHandler}=require('./lib/locucao-handler.cjs');
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',u='20000000-0000-4000-8000-000000000001',v='20000000-0000-4000-8000-000000000002',voice='30000000-0000-4000-8000-000000000001',script='40000000-0000-4000-8000-000000000001',key='50000000-0000-4000-8000-000000000001';
test('Locução lê apenas títulos e texto, valida ritmo e limite de caracteres',()=>{
 const r={dados:{itens:[{titulo:'Manchete',texto:'Texto da notícia.',fonte:'Não ler',url:'https://example.com'}]}};
 const result=preparar(r,{voz:voice,chave:key,ritmo:1,estilo:'neutro'});assert.equal(result.texto,'Manchete.\nTexto da notícia.');assert.equal(result.caracteres,Array.from(result.texto).length);
 for(const bad of [{voz:'../x'},{ritmo:NaN},{ritmo:2},{estilo:'inventado'}])assert.throws(()=>preparar(r,{voz:voice,chave:key,ritmo:1,estilo:'neutro',...bad}));
 assert.throws(()=>preparar({dados:{itens:[{texto:'a'.repeat(3001)}]}},{voz:voice,chave:key,estilo:'neutro'}));
});
function mp3(){const frame=Buffer.alloc(417);frame.set([255,251,144,0]);return Buffer.concat(Array(40).fill(frame));}
test('Provedor recebe modelo, ritmo e chave no servidor e retorna consumo sem inventar créditos',async()=>{
 let input;const result=await gerar({key:'secret-test',voice:'voiceId',texto:'Bom dia.',ritmo:1,estilo:'neutro',fetcher:async(url,options)=>{input={url,options};return new Response(mp3(),{headers:{'content-type':'audio/mpeg','x-character-count':'8','request-id':'request-test'}})}});
 assert.equal(result.consumoReportado,8);assert.equal(result.segundos,2);assert.equal(input.options.headers['xi-api-key'],'secret-test');assert.equal(JSON.parse(input.options.body).model_id,'eleven_multilingual_v2');assert.equal(duracaoMP3(mp3()),2);
 await assert.rejects(gerar({key:'x',voice:'x',texto:'x',ritmo:1,estilo:'neutro',fetcher:async()=>new Response('error',{status:429})}));
 assert.throws(()=>duracaoMP3(Buffer.from('not audio')));
});
test('Reserva mensal: isolamento RLS, bloqueio de leitores, desativação e idempotência',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;create schema storage;create table storage.buckets(id text,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 for(const f of ['202610280001_portal.sql','202610290004_roteiros.sql','202610290005_excluir_roteiros.sql','202611030006_locucao.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/202611030007_contagem_locucao.sql','utf8'));
 await db.exec(`insert into auth.users values('${u}'),('${v}');insert into portal_radios(id,nome,acesso_ate) values('${a}','A',now()+interval '1 day'),('${b}','B',now()+interval '1 day');insert into portal_membros values('${a}','${u}','editor',true),('${b}','${v}','leitor',true);insert into portal_roteiros(id,radio_id,titulo,dados) values('${script}','${a}','Boletim','{"itens":[{"titulo":"Olá","texto":"Bom dia"}]}');insert into portal_audio_planos values('${a}',true,1000,600,0.08);insert into portal_vozes(id,radio_id,nome,provedor_id,autorizada,ativa,evidencia_licenca) values('${voice}','${a}','Voz catálogo','providerId',true,true,'Licença de teste documentada');`);
 const reserve=(usuario=u,request=key)=>`select portal_reservar_locucao('${a}','${usuario}','${script}',1,'${voice}','${request}',1,'neutro') as job`;
 await assert.rejects(db.query(reserve(v)));
 await db.exec(`update portal_roteiros set dados=jsonb_set(dados,'{itens,0,texto}',to_jsonb(E'Bom dia\n'::text));`);
 const reserveSQL=(usuario=u,request=key)=>reserve(usuario,request).replace(",1,'",",2,'");
 const first=(await db.query(reserveSQL())).rows[0].job;assert.equal(first.nova,true);const stored=(await db.query('select texto,caracteres from portal_locucoes')).rows[0];assert.equal(stored.texto,'Olá.\nBom dia');assert.equal(stored.caracteres,Array.from(stored.texto).length);
 const second=(await db.query(reserveSQL())).rows[0].job;assert.equal(second.nova,false);assert.equal(second.id,first.id);
 await assert.rejects(db.query(reserveSQL(u,'50000000-0000-4000-8000-000000000002')),/Franquia insuficiente/); // full minute reservation blocks another request
 await db.exec(`update portal_locucoes set segundos=5,estado='pronto';update portal_vozes set ativa=false;`);
 await assert.rejects(db.query(reserveSQL(u,'50000000-0000-4000-8000-000000000002')),/Voz indisponível/);
 await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[v]);
 assert.equal((await db.query('select * from portal_locucoes')).rows.length,0);await assert.rejects(db.query('update portal_audio_planos set limite_caracteres=999999'));await db.exec('rollback');
 await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[u]);
 assert.equal((await db.query('select * from portal_locucoes')).rows.length,1);await assert.rejects(db.query(reserve()));await db.exec('rollback');
 await db.exec(`update portal_vozes set ativa=true;update portal_audio_planos set limite_caracteres=1;`);await assert.rejects(db.query(reserveSQL(u,'50000000-0000-4000-8000-000000000002')),/Franquia insuficiente/);
 await db.exec(`update portal_audio_planos set limite_caracteres=1000;update portal_radios set acesso_ate=now()-interval '1 day';`);await assert.rejects(db.query(reserve(u,'50000000-0000-4000-8000-000000000002')));
 }finally{await db.close()}
});
test('API não chama provedor desativado, em repetição ou com voz de outra emissora; falha conserva reserva',async()=>{
 let calls=0,result,updates=[];
 const record={id:script,versao:1,titulo:'Teste',dados:{itens:[{titulo:'Bom dia',texto:'Notícias.'}]}};
 const query=data=>{const q={select(){return q},eq(){return q},is(){return q},then(resolve){return Promise.resolve({data}).then(resolve)}};return q};
 const db={from:table=>query(table==='portal_roteiros'?[record]:[{id:voice,provedor_id:'providerId'}])};
 const admin={rpc:async()=>({data:{id:key,nova:false}}),from:()=>({update(value){updates.push(value);return query([])}})};
 const base={req:{},res:{},parsed:new URL('https://example.com/api/locucao'),method:'POST',db,admin,radio:{id:a},user:{id:u},env:{AUDIO_ENABLED:'true',ELEVENLABS_API_KEY:'test'},send:(res,status,data)=>{result={status,data}},readBody:async()=>({roteiro:script,versao:1,voz:voice,chave:key,ritmo:1,estilo:'neutro'}),checked:async p=>{const r=await p;if(r.error)throw Error('Banco indisponível');return r.data},generate:async()=>{calls++;throw Error('Timeout')}};
 await locucaoHandler({...base,env:{}});assert.equal(result.status,503);assert.equal(calls,0);
 await locucaoHandler({...base,admin:null,method:'GET',env:{AUDIO_ENABLED:'true',ELEVENLABS_API_KEY:'test',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_mask••••'}});assert.equal(result.data.habilitado,false);assert.match(result.data.aviso,/incompleta ou inválida/);assert.equal(calls,0);
 const previousRpc=admin.rpc;admin.rpc=async()=>({error:{message:'Invalid API key'}});await locucaoHandler(base);assert.match(result.data.error,/não aceitou a chave privada/);assert.equal(calls,0);admin.rpc=previousRpc;
 await locucaoHandler(base);assert.equal(result.status,200);assert.equal(result.data.repetido,true);assert.equal(calls,0);
 await locucaoHandler({...base,db:{from:t=>query(t==='portal_roteiros'?[record]:[])}});assert.equal(result.status,403);assert.equal(calls,0);
 admin.rpc=async()=>({data:{id:key,nova:true}});await locucaoHandler(base);assert.equal(result.status,502);assert.equal(calls,1);assert.deepEqual(updates,[{estado:'incerto'}]);
 await locucaoHandler({...base,method:'GET',parsed:new URL('https://example.com/api/locucao?id='+key+'&download=1'),db:{from:()=>query([{estado:'pronto',aprovado_em:null}])}});assert.equal(result.status,409);
});
test('Tela de locução exige prévia antes da aprovação e bloqueia rascunho não salvo',async()=>{
 const vm=require('node:vm'),nodes=new Map(),calls=[];
 function element(){return {children:[],value:'1',disabled:false,textContent:'',events:{},append(...children){this.children.push(...children)},replaceChildren(){this.children=[]},addEventListener(name,fn){this.events[name]=fn},showModal(){this.open=true},close(){this.open=false}}}
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
 let approved=false;const context={document:{getElementById:get,createElement:element},itens:[{titulo:'Bom dia',texto:'Notícia.'}],writable:true,id:script,versao:1,dirty:false,crypto:require('node:crypto'),api:async(route,method)=>{calls.push({route,method});if(method==='PUT'){approved=true;return {ok:true}}return {habilitado:true,vozes:[{id:voice,nome:'Voz teste'}],plano:{limite_caracteres:1000,limite_segundos:600,usd_por_mil:0.08},uso:{caracteres:10,segundos:5},historico:[{id:key,titulo:'Boletim',estado:'pronto',caracteres:10,aprovado_em:approved?'2026-11-03':null,criado_em:'2026-11-03T12:00:00Z'}]}}};
 context.URLSearchParams=URLSearchParams;context.location={search:''};vm.createContext(context);vm.runInContext(fs.readFileSync('locucao-ui.js','utf8'),context);await get('abrir-locucao').onclick();
 const section=get('locucao-historico').children[0],player=section.children.find(c=>c.controls),button=section.children.find(c=>c.textContent==='Aprovar áudio');assert.equal(button.disabled,true);player.events.ended();assert.equal(button.disabled,false);await button.onclick();assert.equal(approved,true);assert.ok(get('locucao-historico').children[0].children.some(c=>c.textContent==='Baixar MP3 aprovado'));
 context.dirty=true;await get('abrir-locucao').onclick();assert.equal(get('locucao-gerar').disabled,true);
});
