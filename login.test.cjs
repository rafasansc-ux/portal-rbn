const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('Login lento bloqueia novo envio e identifica a senha realmente enviada',async()=>{
 const source=fs.readFileSync('saas.js','utf8');const code=source.slice(source.indexOf('let loginEmAndamento=false;'),source.indexOf('\nsair=async'));
 const user={value:'rbn.admin'},password={value:'primeira-senha'},btn={},err={};let release,calls=0,sent;
 const context={document:{querySelector:()=>btn,getElementById:id=>({'login-user':user,'login-password':password,err})[id]},api:async(route,method,data)=>{calls++;sent=data;return new Promise(r=>release=r)},openSession:async()=>{}};
 vm.createContext(context);vm.runInContext(code,context);
 const first=vm.runInContext('fazerLogin()',context);password.value='outra-senha';await vm.runInContext('fazerLogin()',context);
 assert.equal(calls,1);assert.equal(sent.password,'primeira-senha');assert.equal(password.disabled,true);assert.equal(btn.textContent,'Verificando…');
 release({ok:true});await first;assert.equal(password.value,'');assert.equal(password.disabled,false);assert.equal(btn.textContent,'Entrar');
});
