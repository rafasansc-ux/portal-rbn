'use strict';
const fs=require('node:fs');const {createClient}=require('@supabase/supabase-js');const {identity}=require('../lib/cloud-security.cjs');
(async()=>{
 const {SUPABASE_URL,SUPABASE_SECRET_KEY,PORTAL_LOGIN,PORTAL_PASSWORD,PORTAL_RADIO}=process.env;
 if(!SUPABASE_URL||!SUPABASE_SECRET_KEY||!PORTAL_RADIO||!PORTAL_LOGIN||!PORTAL_PASSWORD||PORTAL_PASSWORD.length<12)throw Error('Configure SUPABASE_URL, SUPABASE_SECRET_KEY, PORTAL_LOGIN, PORTAL_PASSWORD (mínimo 12 caracteres) e PORTAL_RADIO no ambiente local.');
 const client=createClient(SUPABASE_URL,SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:created,error:authError}=await client.auth.admin.createUser({email:identity(PORTAL_LOGIN),password:PORTAL_PASSWORD,email_confirm:true,user_metadata:{login:PORTAL_LOGIN.toLowerCase()}});if(authError)throw Error(authError.message);
 const {data:radio,error:radioError}=await client.from('portal_radios').insert({nome:PORTAL_RADIO,acesso_ate:new Date(Date.now()+30*86400000).toISOString()}).select('id').single();
 if(radioError){await client.auth.admin.deleteUser(created.user.id);throw Error('Não foi possível criar a rádio. O usuário recém-criado foi removido.')}
 const {error:memberError}=await client.from('portal_membros').insert({radio_id:radio.id,usuario_id:created.user.id,papel:'administrador'});
 if(memberError){await client.from('portal_radios').delete().eq('id',radio.id);await client.auth.admin.deleteUser(created.user.id);throw Error('Falha ao vincular a rádio. Operação desfeita.')}
 console.log('Rádio cadastrada e acesso inicial de 30 dias liberado. Remova PORTAL_PASSWORD do ambiente. Nenhum email foi enviado.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
