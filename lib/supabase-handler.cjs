'use strict';
const {createClient}=require('@supabase/supabase-js');
const crypto=require('node:crypto');
const {identity,seal,unseal,validSources,cookieKey}=require('./cloud-security.cjs');
const {collect}=require('../collector.cjs');
const {getEpagri}=require('./epagri.cjs');
const noSession={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
function createCloudHandler({env=process.env,clientFactory=createClient,collectNews=collect}={}) {
  const url=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY;
  const secure=env.NODE_ENV==='production'||!!env.VERCEL;
  const client=()=>clientFactory(url,key,noSession);
  const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))};
  const setCookie=(res,s)=>res.setHeader('Set-Cookie',`portal_session=${s?seal(s,env.SESSION_SECRET):''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${s?Math.max(0,Math.floor((s.until-Date.now())/1000)):0}${secure?'; Secure':''}`);
  async function readBody(req){if(req.body!==undefined){const b=typeof req.body==='string'?JSON.parse(req.body):req.body;if(Buffer.byteLength(JSON.stringify(b))>2_000_000)throw Error('Solicitação excede o limite');return b}let value='';for await(const part of req){value+=part;if(Buffer.byteLength(value)>2_000_000)throw Error('Solicitação excede o limite')}return JSON.parse(value||'{}')}
  const checked=async(p)=>{const r=await p;if(r.error)throw Error('Não foi possível acessar os dados da rádio.');return r.data};
  async function radioContext(db,user){
    const members=await checked(db.from('portal_membros').select('radio_id,papel').eq('usuario_id',user.id).eq('ativo',true));
    if(members.length!==1)throw Object.assign(Error('Conta sem rádio ativa ou com mais de um vínculo. Fale com o administrador.'),{status:403});
    const rows=await checked(db.from('portal_radios').select('id,nome,acesso_ate').eq('id',members[0].radio_id));
    if(rows.length!==1)throw Object.assign(Error('Acesso suspenso ou vencido. Fale com o administrador.'),{status:403});
    return {radio:rows[0],role:members[0].papel};
  }
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    try{
      if(!url||!key)return send(res,503,{error:'Conexão Supabase ainda não configurada.'});cookieKey(env.SESSION_SECRET);
      const parsed=new URL(req.url,'http://localhost');const route=req.query?.route||parsed.searchParams.get('route')||parsed.pathname.split('/').pop();
      const method=req.method||'GET';const write=['POST','PUT','DELETE'].includes(method);
      if(write){const expected=env.APP_ORIGIN||`${secure?'https':'http'}://${req.headers.host}`;if(req.headers.origin!==expected)return send(res,403,{error:'Origem não autorizada'});if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'Envie JSON'})}
      if(route==='login'&&method==='POST'){
        const b=await readBody(req);let internal;try{internal=identity(b.login)}catch(e){return send(res,400,{error:e.message})}
        if(typeof b.password!=='string'||b.password.length<1||b.password.length>512)return send(res,400,{error:'Informe uma senha válida.'});
        const db=client();const {data,error}=await db.auth.signInWithPassword({email:internal,password:b.password});
        if(error)return send(res,error.status===429?429:401,{error:error.status===429?'Muitas tentativas. Aguarde e tente novamente.':'Login ou senha incorretos.'});
        try{await radioContext(db,data.user)}catch(e){await db.auth.signOut({scope:'local'});throw e}
        setCookie(res,{access:data.session.access_token,refresh:data.session.refresh_token,expires:data.session.expires_at*1000,csrf:crypto.randomBytes(24).toString('hex'),until:Date.now()+8*3600000});return send(res,200,{ok:true});
      }
      const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('portal_session='))?.slice(15);
      const s=unseal(raw,env.SESSION_SECRET);if(!s)return send(res,401,{error:'Entre na sua conta.'});
      if(write&&req.headers['x-csrf-token']!==s.csrf)return send(res,403,{error:'Sessão inválida.'});
      const db=client();let authResult;
      if(s.expires<Date.now()+60000){authResult=await db.auth.refreshSession({refresh_token:s.refresh})}else{authResult=await db.auth.setSession({access_token:s.access,refresh_token:s.refresh})}
      if(authResult.error){setCookie(res,null);return send(res,401,{error:'Sua sessão terminou. Entre novamente.'})}
      if(authResult.data.session){s.access=authResult.data.session.access_token;s.refresh=authResult.data.session.refresh_token;s.expires=authResult.data.session.expires_at*1000;setCookie(res,s)}
      const verified=await db.auth.getUser();if(verified.error||!verified.data.user)return send(res,401,{error:'Entre novamente.'});
      if(route==='logout'&&method==='POST'){await db.auth.signOut({scope:'local'});setCookie(res,null);return send(res,200,{ok:true})}
      const {radio,role}=await radioContext(db,verified.data.user);
      if(route==='automacao'&&method==='GET')return send(res,200,await checked(db.rpc('portal_automacao_status')));
      if(route==='epagri'&&method==='GET'){const stored=await db.from('portal_tempo').select('dados').eq('id','epagri').maybeSingle();return send(res,200,await getEpagri(stored.data?.dados))}
      if(route==='me'&&method==='GET')return send(res,200,{login:verified.data.user.user_metadata?.login||verified.data.user.email?.split('@')[0],radio:radio.nome,role,accessUntil:Date.parse(radio.acesso_ate),csrf:s.csrf});
      const writable=['administrador','editor'].includes(role);if(write&&!writable)return send(res,403,{error:'Seu perfil permite apenas leitura.'});
      if(route==='fontes'){
        if(method==='GET'){const rows=await checked(db.from('portal_fontes').select('nome,editoria,rss,ativa').eq('radio_id',radio.id).order('criado_em'));return send(res,200,rows.map(f=>({nome:f.nome,editoria:f.editoria,rss:f.rss,ativo:f.ativa})))}
        if(method==='PUT'){const sources=await readBody(req);if(!validSources(sources))return send(res,400,{error:'Use até 40 fontes HTTPS válidas, sem duplicatas.'});await checked(db.rpc('portal_substituir_fontes',{p_radio:radio.id,p_fontes:sources}));return send(res,200,{ok:true})}
      }
      if(route==='preferences'){
        if(method==='GET'){const rows=await checked(db.from('portal_preferencias').select('dados').eq('radio_id',radio.id));return send(res,200,rows[0]?.dados||{})}
        if(method==='PUT'){const prefs=await readBody(req);if(!prefs||Array.isArray(prefs)||typeof prefs!=='object'||Object.keys(prefs).some(k=>!/^portal_(nome|slogan|cor|tema|fonte|logo)$/.test(k)||typeof prefs[k]!=='string'))return send(res,400,{error:'Preferências inválidas.'});await checked(db.from('portal_preferencias').upsert({radio_id:radio.id,dados:prefs}));return send(res,200,{ok:true})}
      }
      if(route==='noticias'&&method==='GET'){const rows=await checked(db.from('portal_boletins').select('dados').eq('radio_id',radio.id));return send(res,200,rows[0]?.dados||{editorias:[]})}
      if(route==='coletar'&&method==='POST'){
        const nonce=await checked(db.rpc('portal_iniciar_coleta',{p_radio:radio.id}));if(!nonce)return send(res,429,{error:'Coleta em andamento ou realizada há menos de um minuto.'});
        const sources=await checked(db.from('portal_fontes').select('nome,editoria,rss,ativa').eq('radio_id',radio.id));const old=await checked(db.from('portal_boletins').select('dados').eq('radio_id',radio.id));
        const news=await collectNews(sources.map(f=>({...f,ativo:f.ativa})),old[0]?.dados||{editorias:[]});
        await checked(db.rpc('portal_salvar_boletim',{p_radio:radio.id,p_token:nonce,p_dados:news}));return send(res,200,news);
      }
      return send(res,404,{error:'Recurso não encontrado.'});
    }catch(e){return send(res,e.status||400,{error:e.message==='Configure SESSION_SECRET com 32 bytes aleatórios em base64.'?'Sessão do servidor ainda não configurada.':e.message||'Falha ao processar solicitação.'})}
  };
}
module.exports={createCloudHandler};
