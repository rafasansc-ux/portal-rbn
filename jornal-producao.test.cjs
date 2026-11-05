const {test}=require('node:test'),assert=require('node:assert/strict');
const {catalogo,preparar,pedidoBloco,automatico}=require('./lib/jornal-producao.cjs');
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
test('Seleção automática distribui por editoria, alterna fontes e não repete notícias',()=>{
 const n=(id,editoria,fonte)=>({id,editoria,fonte,texto:'Resumo com dados da fonte.',titulo:id,url:'https://a.example/'+id});
 const pool=[n('a','Local','A'),n('b','Local','A'),n('c','Local','B'),n('d','Esporte','C'),n('e','Política','D')];
 const plano=automatico({nome:'Manhã',meta_segundos:3600,blocos:[{nome:'Abertura e manchetes',tipo:'editorial',segundos:180},{nome:'Local e regional',tipo:'editorial',segundos:960},{nome:'Esportes',tipo:'editorial',segundos:420},{nome:'Outro bloco local',tipo:'editorial',segundos:60},{nome:'Comercial',tipo:'comercial',segundos:300}]},pool);
 assert.deepEqual(plano.selecao,[[],['a','c','b'],['d'],[],[]]);assert.equal(plano.geracao_habilitada,false);assert.match(plano.blocos[0].alertas[0],/Apresentação pendente/);assert.match(plano.blocos[3].alertas[0],/Nenhuma notícia/);
 assert.equal(new Set(plano.selecao.flat()).size,plano.selecao.flat().length);
});
test('Seleção automática vazia informa lacuna e não fabrica notícias',()=>{
 const p=automatico(modelo,[]);assert.deepEqual(p.selecao,[[],[]]);assert.match(p.blocos[0].alertas[0],/Nenhuma notícia/);
});
