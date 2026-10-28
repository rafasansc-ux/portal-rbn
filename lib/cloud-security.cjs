'use strict';
const crypto = require('node:crypto');
function identity(login) {
  const value = typeof login === 'string' ? login.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9._-]{2,47}$/.test(value)) throw new Error('Use um login de 3 a 48 caracteres: letras, números, ponto, hífen ou sublinhado.');
  return `${value}@login.portal-rbn.invalid`;
}
function cookieKey(secret) {
  if (typeof secret !== 'string' || Buffer.from(secret,'base64').length !== 32) throw new Error('Configure SESSION_SECRET com 32 bytes aleatórios em base64.');
  return Buffer.from(secret,'base64');
}
function seal(data, secret) {
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',cookieKey(secret),iv);
  const body=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
function unseal(value, secret) {
  try { if(typeof value!=='string'||value.length>6000)return null;
    const bytes=Buffer.from(value,'base64url');if(bytes.length<29)return null;
    const decipher=crypto.createDecipheriv('aes-256-gcm',cookieKey(secret),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));
    const data=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
    return Number.isFinite(data.until)&&data.until>Date.now()?data:null;
  } catch { return null; }
}
function validSources(sources) {
  return Array.isArray(sources)&&sources.length<=40&&sources.every(f=>{
    if(!f||typeof f.nome!=='string'||!f.nome.trim()||f.nome.length>150||typeof f.editoria!=='string'||!f.editoria.trim()||f.editoria.length>80||typeof f.ativo!=='boolean')return false;
    try{const u=new URL(f.rss);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&f.rss.length<=2048}catch{return false}
  })&&new Set(sources.map(f=>f.rss)).size===sources.length;
}
module.exports={identity,seal,unseal,validSources,cookieKey};
