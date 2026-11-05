const {test}=require('node:test'),assert=require('node:assert/strict');
const {catalogo,preparar,pedidoBloco}=require('./lib/jornal-producao.cjs');
const news={editorias:[{nome:'Local',fontes:[{nome:'Fonte A',noticias:[{titulo:'Prefeitura anuncia obras',resumo:'Serão 3 obras. The post lixo appeared first on A',link:'https://a.example/obras'}]},{nome:'Desativada',noticias:[{titulo:'Outra notícia',resumo:'Texto',link:'https://b.example/1'}]}]}]};
const fontes=[{nome:'Fonte A',editoria:'Local',ativa:true},{nome:'Desativada',editoria:'Local',ativa:false}];
const modelo={nome:'Jornal',meta_segundos:3600,blocos:[{nome:'Local',tipo:'editorial',segundos:2700},{nome:'Comercial',tipo:'comercial',segundos:900}]};
test('Catálogo usa fontes ativas da rádio, limpa resíduos e invalida seleção quando conteúdo muda',()=>{
 const c=catalogo(news,fontes);assert.equal(c.length,1);assert.equal(c[0].texto,'Serão 3 obras.');assert.equal(catalogo(news,[]).length,0);
 const changed=structuredClone(news);changed.editorias[0].fontes[0].noticias[0].resumo='Serão 4 obras.';assert.notEqual(c[0].id,catalogo(changed,fontes)[0].id);
 assert.throws(()=>preparar({...modelo,selecao:[[c[0].id],[]]},catalogo(changed,fontes)),/mudou/);
});
test('Preparação não inventa texto, aponta lacunas e rejeita fontes injetadas ou repetidas',()=>{
 const c=catalogo(news,fontes),input={...modelo,selecao:[[c[0].id],[]]},p=preparar(input,c);
 assert.equal(p.geracao_habilitada,false);assert.deepEqual(p.blocos[0].noticias,c);assert.ok(p.blocos[0].alertas.length);assert.equal(p.blocos[1].noticias.length,0);
 assert.throws(()=>preparar({...input,selecao:[['id-outra-emissora'],[]]},c));
 assert.throws(()=>preparar({...input,selecao:[[c[0].id],[c[0].id]]},c),/comerciais/);
 assert.throws(()=>preparar({...input,blocos:[modelo.blocos[0],modelo.blocos[0]],selecao:[[c[0].id],[c[0].id]]},c),/mais de um/);
 assert.throws(()=>preparar({...input,selecao:[[c[0].id,c[0].id],[]]},c));
});
test('Contrato futuro de geração inclui passagens, fontes e proibição de inventar; não chama API',()=>{
 const c=catalogo(news,fontes),b=preparar({...modelo,selecao:[[c[0].id],[]]},c).blocos[0],p=pedidoBloco(b);
 assert.equal(p.store,false);assert.equal(p.text.format.strict,true);assert.match(p.instructions,/passagens neutras/);assert.match(p.instructions,/sem novos fatos/);assert.match(p.input,/Serão 3 obras/);assert.equal(p.tools,undefined);
 assert.throws(()=>pedidoBloco({tipo:'comercial',noticias:c}));assert.throws(()=>pedidoBloco({tipo:'editorial',noticias:[]}));
});
