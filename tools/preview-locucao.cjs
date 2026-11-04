// Local visual preview only. No provider key, no Supabase connection, no billable calls.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files=new Set(['boletim.html','boletim.js','boletim.css','locucao-ui.js']);
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
 if(url.pathname.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if(req.method!=='GET'){res.statusCode=403;return res.end(JSON.stringify({error:'Prévia visual: alterações e geração desativadas.'}))}
  const data=url.pathname==='/api/me'?{radio:'Emissora de teste · prévia local',role:'editor',csrf:'preview-only'}:url.pathname==='/api/roteiros'?{id:'40000000-0000-4000-8000-000000000001',versao:1,titulo:'Boletim de teste',criado_em:new Date().toISOString(),atualizado_em:new Date().toISOString(),dados:{itens:[{titulo:'Bom dia',texto:'Este é um texto de demonstração para revisar a tela de locução.',fonte:'Redação',url:''}]}}:{habilitado:false,vozes:[],historico:[],aviso:'Prévia visual. Integração e geração paga desativadas.'};
  return res.end(JSON.stringify(data));
 }
 const name=url.pathname.slice(1)||'boletim.html';if(!files.has(name)){res.statusCode=404;return res.end()}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(__dirname,'..',name)));
}).listen(9433,'127.0.0.1',()=>console.log('Prévia visual sem cobrança: http://127.0.0.1:9433/boletim.html?id=40000000-0000-4000-8000-000000000001'));
