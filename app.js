const storage={getItem(){return null},setItem(){},removeItem(){}};
function toast(msg){const el=document.getElementById('status-global');if(el){el.textContent=msg;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,5000)}}
function safeURL(s){try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'#'}catch{return '#'}}
function validateNews(d){
 if(!d||!Array.isArray(d.editorias)||d.editorias.length>50)throw Error('Editorias inválidas');
 let count=0;for(const ed of d.editorias){if(typeof ed.nome!=='string'||!Array.isArray(ed.fontes))throw Error('Editoria inválida');for(const f of ed.fontes){if(typeof f.nome!=='string'||!Array.isArray(f.noticias))throw Error('Fonte inválida');for(const n of f.noticias){if(++count>5000||typeof n.titulo!=='string'||typeof n.resumo!=='string'||typeof n.link!=='string')throw Error('Notícia inválida')}}}
}

// ═══════════════════════════════════════
// DADOS — notícias reais do boletim
// ═══════════════════════════════════════
const NOTICIAS = [
  {
    editoria:'Local', cor:'#4D8FFF', bg:'rgba(77,143,255,.11)', icone:'📍',
    fontes:[{
      nome:'OCP News',
      items:[
        {t:'14º BPM receberá 44 policiais temporários para reforçar efetivo em Jaraguá do Sul e região',r:'O comandante-geral da PM de SC, coronel Emerson Fernandes, anunciou o reforço durante visita a Jaraguá do Sul.',l:'https://ocp.news/cotidiano/14o-bpm-recebera-44-policiais-temporarios-para-reforcar-efetivo-em-jaragua-do-sul-e-regiao'},
        {t:'OAB/SC apresenta proposta de reforma do Supremo Tribunal Federal',r:'A OAB/SC concluiu estudo técnico-jurídico com diretrizes para uma proposta de reforma no STF.',l:'https://ocp.news/politica/oab-sc-apresenta-proposta-de-reforma-do-supremo-tribunal-federal'},
        {t:'Eleições 2026: prazo para regularizar pendências termina em uma semana',r:'Os eleitores têm até o dia 6 de maio para regularizar pendências e garantir o direito de votar em outubro.',l:'https://ocp.news/politica/eleicoes-2026-prazo-para-regularizar-pendencias-termina-em-uma-semana'},
        {t:'Prefeitura de Jaraguá do Sul manterá serviços essenciais no feriado do Dia do Trabalhador',r:'Não haverá expediente nos equipamentos municipais no feriado de 1º de maio.',l:'https://ocp.news/cotidiano/prefeitura-de-jaragua-do-sul-mantera-servicos-essenciais-no-feriado-do-dia-do-trabalhador'},
        {t:'Chiodini reprova encontro com governador e manda carta aos filiados do MDB',r:'O presidente do MDB/SC respondeu de forma firme ao encontro realizado com o governador.',l:'https://ocp.news/politica/chiodini-reprova-encontro-com-governador-e-manda-carta-aos-filiados-do-mdb'}
      ]
    }]
  },
  {
    editoria:'Estado', cor:'#FBBF24', bg:'rgba(251,191,36,.09)', icone:'🏛',
    fontes:[
      {nome:'ND Mais',items:[
        {t:'Mais de 10,2 milhões de vazamentos de dados do Pix desde 2021, aponta BC',r:'Ao menos 23 incidentes envolvendo chaves e informações sensíveis foram registrados, segundo o Banco Central.',l:'https://ndmais.com.br/economia/vazamento-de-dados-do-pix-expoe-milhoes-de-chaves-desde-2021/'},
        {t:'Ferrovia de SC pode ter contrato renovado por 30 anos com R$ 131 mi em investimentos',r:'O processo de prorrogação da Ferrovia Tereza Cristina avança após audiência pública.',l:'https://ndmais.com.br/infraestrutura/ferrovia-de-sc-pode-ter-contrato-renovado-30-anos/'},
        {t:'Jovem de 20 anos morre eletrocutado em Barra Bonita',r:'Tragédia ocorreu na tarde de segunda-feira no Oeste de Santa Catarina.',l:'https://ndmais.com.br/video/jovem-de-20-anos-morre-eletrocutado-em-barra-bonita/'},
        {t:'Brasileiro é procurado por feminicídio de jovem no Paraguai',r:'O caso ganha novos desdobramentos com a fuga do suspeito Vitor Rangel Aguiar.',l:'https://ndmais.com.br/video/brasileiro-e-procurado-por-feminicidio-de-jovem-no-paraguai/'},
        {t:'Itajaí recebe Festival de Dança nos dias 28 a 30 de abril',r:'O festival reúne grupos de dança de todo o estado no município de Itajaí.',l:'https://ndmais.com.br/video/itajai-recebe-festival-de-danca-entre-os-dias-28-e-30-de-abril/'}
      ]},
      {nome:'G1 SC',items:[
        {t:'Cliente aplica golpe para comer sushi de graça e é condenado em SC',r:'A Justiça de SC manteve condenação de homem que aplicou golpes em restaurante delivery ao menos três vezes.',l:'https://g1.globo.com/sc/santa-catarina/noticia/2026/04/28/cliente-aplica-golpe-comer-sushi-graca-condenado-sc-diz-tj.ghtml'},
        {t:'Desaparecimento foi voluntário, diz polícia sobre mulher que sumiu após entrar em carro de app',r:'A Polícia Civil classificou o sumiço de Karyn Lima, 24 anos, como voluntário. Ela foi encontrada após 8 dias.',l:'https://g1.globo.com/sc/santa-catarina/noticia/2026/04/28/desaparecimento-foi-voluntario-diz-policia-sobre-mulher-sumiu-apos-entrar-carro-aplicativo-sc.ghtml'},
        {t:'Casa do Empreendedor de Florianópolis conquista Selo Sebrae Ouro inédito',r:'Florianópolis recebe pela primeira vez o Selo Sebrae de Referência em Atendimento na categoria Ouro.',l:'https://g1.globo.com/sc/santa-catarina/noticia/2026/04/28/casa-do-empreendedor-conquista-selo-sebrae-ouro-inedito.ghtml'},
        {t:'MP do Paraguai denuncia ex-namorado por feminicídio contra brasileira estudante de medicina',r:'O MP paraguaio denunciou Vitor Rangel Aguiar pelo assassinato da estudante Julia Vitoria, 22 anos.',l:'https://g1.globo.com/sc/santa-catarina/noticia/2026/04/28/mp-paraguai-denuncia-feminicidio-brasileira-estudante-medicina.ghtml'}
      ]}
    ]
  },
  {
    editoria:'Brasil', cor:'#6EE7B7', bg:'rgba(110,231,183,.07)', icone:'🇧🇷',
    fontes:[
      {nome:'G1 Brasil',items:[
        {t:'Rei Charles III faz discurso histórico ao Congresso dos EUA',r:'Charles III reforçou os laços entre EUA e Reino Unido em momento de tensão entre os aliados históricos.',l:'https://g1.globo.com/mundo/ao-vivo/rei-charles-iii-visita-eua-trump.ghtml'},
        {t:'Haribo encerra produção no Brasil e fecha fábrica em Bauru',r:'A indústria alemã anunciou o fechamento da unidade de Bauru, encerrando atividades fabris no país.',l:'https://g1.globo.com/sp/bauru-marilia/noticia/2026/04/28/dona-dos-ursinhos-de-ouro-haribo-encerra-producao-no-brasil.ghtml'},
        {t:'Vídeo mostra homem incendiando vereador no litoral do Paraná',r:'Câmeras registraram o momento em que homem ateou fogo no vereador João Luiz em Guaraqueçaba.',l:'https://g1.globo.com/pr/parana/noticia/2026/04/28/video-mostra-homem-incendiando-vereador-no-litoral-do-parana.ghtml'},
        {t:'Hospital é condenado por morte de jovem após demora em cirurgia de apendicite em MG',r:'A Justiça de MG condenou hospital pela morte de paciente de 21 anos após atraso em cirurgia.',l:'https://g1.globo.com/mg/vales-mg/noticia/2026/04/28/hospital-e-condenado-por-morte-de-jovem-apos-demora-em-cirurgia-de-apendicite-em-mg.ghtml'}
      ]},
      {nome:'CNN Brasil',items:[
        {t:'Petrobras pode aumentar gasolina se houver redução de tributos, diz CEO',r:'Magda Chambriard disse que a empresa não vai transferir ao consumidor a ansiedade do momento.',l:'https://www.cnnbrasil.com.br/infra/petrobras-pode-aumentar-gasolina-se-houver-reducao-de-tributos-diz-ceo/'},
        {t:'BCE enfrenta dilema com inflação em alta e crescimento em queda',r:'O Banco Central Europeu deve manter juros na quinta-feira, mas novos aumentos são esperados em junho.',l:'https://www.cnnbrasil.com.br/economia/macroeconomia/aumento-da-inflacao-e-deterioracao-do-crescimento-criam-dilema-para-o-bce/'}
      ]},
      {nome:'Agência Brasil',items:[
        {t:'Lista de peixes e invertebrados ameaçados de extinção é atualizada no Brasil',r:'A revisão incluiu 100 novas espécies, mantendo 490 classificadas como ameaçadas.',l:'https://agenciabrasil.ebc.com.br/meio-ambiente/noticia/2026-04/lista-de-peixes-e-invertebrados-ameacados-de-extincao-e-atualizada'},
        {t:'Estudo de 22 anos na Amazônia descarta teoria da savanização',r:'A pesquisa realizada em Querência (MT) concluiu que o bioma não está se transformando em savana.',l:'https://agenciabrasil.ebc.com.br/meio-ambiente/noticia/2026-04/estudo-de-longo-prazo-na-amazonia-descarta-teoria-de-savanizacao'},
        {t:'Redução da jornada vai favorecer o empreendedorismo, afirma ministro',r:'O ministro Paulo Pereira disse que a medida terá impacto positivo na qualidade de vida e na economia.',l:'https://agenciabrasil.ebc.com.br/economia/noticia/2026-04/reducao-da-jornada-vai-favorecer-o-empreendodorismo-diz-ministro'},
        {t:'PF e Receita Federal investigam fraude de R$ 86 bilhões no Porto do Rio',r:'A Operação Mare Liberum mira esquema de corrupção na alfândega do Porto do Rio de Janeiro.',l:'https://agenciabrasil.ebc.com.br/esportes/noticia/2026-04/pf-e-receita-combatem-fraude-de-rs-86-bilhoes-no-porto-do-rio'}
      ]}
    ]
  }
];

const ESPORTE = [{
  editoria:'Esporte', cor:'#34D399', bg:'rgba(52,211,153,.09)', icone:'⚽',
  fontes:[{
    nome:'GE — Globo Esporte',
    items:[
      {t:'Marcus Buchecha amplia jejum sem vitórias e se complica no UFC',r:'Buchecha foi nocauteado por Ryan Spann no 2º round do UFC Vegas 116. São duas derrotas e um empate no UFC.',l:'https://ge.globo.com/sp/santos-e-regiao/noticia/2026/04/28/marcus-buchecha-amplia-jejum-sem-vitorias-e-se-complica-no-ufc.ghtml'},
      {t:'PSG x Bayern de Munique — Semifinal da Champions ao vivo',r:'Jogo de ida no Parc des Princes. Confira escalações e informações completas.',l:'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/jogo/28-04-2026/parissaintgermain-bayerndemunique.ghtml'},
      {t:'NBA, Fiba e EuroLeague avançam em criação de liga europeia de basquete',r:'As entidades mantêm diálogo sobre o formato e governança de uma nova liga continental.',l:'https://www.cnnbrasil.com.br/esportes/basquete/nba-fiba-e-euroleague-avancam-em-criacao-de-liga-europeia-de-basquete/'},
      {t:'Estádio Nogueirão, em Mossoró, é totalmente demolido',r:'A derrubada foi concluída na manhã de segunda como parte do projeto da nova Arena Nogueirão, de R$ 215 milhões.',l:'https://ge.globo.com/rn/noticia/2026/04/28/estadio-nogueirao-em-mossoro-e-totalmente-demolido-veja-imagens.ghtml'},
      {t:'Vanessa Cristina é convocada para representar o Brasil em competições na Suíça',r:'A atleta paralímpica de Santos disputará a Daniela Jutzeler Memorial e o Grand Prix de Nottwil em maio.',l:'https://ge.globo.com/sp/santos-e-regiao/noticia/2026/04/28/vanessa-cristina-e-convocada-para-representar-o-brasil-em-competicoes-na-suica.ghtml'}
    ]
  }]
}];

// Curiosidades estáticas (futuro: RSS automático)
const CURIOSIDADES = [
  {tag:'Ciência',t:'Por que o céu é azul?',r:'A luz solar é dispersada pela atmosfera. As ondas azuis se espalham mais que as outras cores, por isso enxergamos o céu azul durante o dia.'},
  {tag:'Saúde',t:'Dormir menos de 6 horas aumenta risco de AVC em 45%',r:'Pesquisa da Universidade de Birmingham acompanhou 500 mil adultos e encontrou associação direta entre sono curto e doenças cardiovasculares.'},
  {tag:'Tecnologia',t:'IA já diagnostica câncer de pele com precisão maior que dermatologistas',r:'Algoritmos treinados em milhões de imagens identificaram melanomas com 95% de acerto, superando a média de 86% dos especialistas humanos.'},
  {tag:'Natureza',t:'Árvores se comunicam pelo solo através de fungos',r:'A "internet da floresta" conecta raízes de árvores diferentes, permitindo troca de nutrientes e até sinais de alerta contra pragas.'},
  {tag:'Curiosidade',t:'O mel nunca estraga — arqueólogos encontraram mel comestível de 3.000 anos',r:'Potes de mel encontrados em tumbas egípcias ainda estavam em perfeito estado. A alta concentração de açúcar impede o crescimento de bactérias.'},
  {tag:'Espaço',t:'Um dia em Vênus é mais longo que um ano em Vênus',r:'O planeta demora 243 dias terrestres para girar em torno do próprio eixo, mas apenas 225 dias para orbitar o Sol.'},
  {tag:'Corpo Humano',t:'O estômago produz um novo revestimento a cada 3 dias',r:'O ácido estomacal é tão forte que destruiria as paredes do próprio estômago sem essa renovação constante do revestimento mucoso.'},
  {tag:'História',t:'Cleópatra viveu mais perto da invenção do iPhone do que das Pirâmides',r:'As pirâmides foram construídas há 4.500 anos. Cleópatra viveu há 2.000 anos. A diferença temporal é de 2.500 anos — mais do que nos separa dela.'},
  {tag:'Animal',t:'Polvos têm três corações e sangue azul',r:'Dois corações bombeiam sangue pelas guelras, enquanto o terceiro circula pelo corpo. O sangue é azul por conter hemocianina em vez de hemoglobina.'},
  {tag:'Tecnologia',t:'O primeiro SMS da história disse "Feliz Natal"',r:'Em dezembro de 1992, o engenheiro Neil Papworth enviou a mensagem "Merry Christmas" para o diretor da Vodafone — o primeiro SMS do mundo.'},
  {tag:'Saúde',t:'Rir por 15 minutos tem efeito equivalente a 45 min de exercício leve',r:'Pesquisadores da Universidade de Vanderbilt calcularam que gargalhadas genuínas aumentam o gasto calórico e liberam endorfinas.'},
  {tag:'Natureza',t:'Flamingos são naturalmente brancos — a cor vem da comida',r:'Os pigmentos rosas e laranjas dos flamingos vêm de carotenoides presentes em algas e crustáceos. Em cativeiro sem essa dieta, eles ficam brancos.'},
  {tag:'Ciência',t:'Água quente pode congelar mais rápido que água fria',r:'O Efeito Mpemba, observado em 1963, mostra que em certas condições a água quente congela antes da fria — fenômeno ainda debatido pela ciência.'},
  {tag:'Curiosidade',t:'A língua portuguesa tem mais falantes na África do que em Portugal',r:'Com países como Angola, Moçambique e Cabo Verde, o continente africano soma mais de 30 milhões de falantes nativos de português.'},
  {tag:'Espaço',t:'Há mais estrelas no universo do que grãos de areia em todas as praias da Terra',r:'Estimativas apontam para 1 septilhão de estrelas (10²⁴) no universo observável — número impossível de imaginar em escala humana.'}
];

// Cidades para previsão do tempo
const CIDADES = [
  {nome:'Jaraguá do Sul', lat:-26.4851, lon:-49.0711}
];

const ICONES_TEMPO = {
  0:'☀️',1:'🌤',2:'⛅',3:'🌥',45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',
  71:'🌨',73:'🌨',75:'🌨',80:'🌦',81:'🌧',82:'🌧',
  95:'⛈',96:'⛈',99:'⛈'
};

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ═══════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════
function fazerLogin(){
 document.getElementById('tela-acesso').style.display='none';
 document.getElementById('portal').classList.add('on');
 init();
}
function sair(){
 document.querySelectorAll('[role="dialog"]').forEach(x=>x.style.display='none');
 document.getElementById('portal').classList.remove('on');
 document.getElementById('tela-acesso').style.display='flex';
 document.querySelector('.btn-entrar').focus();
}


// ═══════════════════════════════════════
// INIT — carrega do noticias.json se disponível
// ═══════════════════════════════════════
const COR_MAP = {
  'Local':          {cor:'#4D8FFF', bg:'rgba(77,143,255,.11)', icone:'📍'},
  'Estado':         {cor:'#FBBF24', bg:'rgba(251,191,36,.09)', icone:'🏛'},
  'Brasil':         {cor:'#6EE7B7', bg:'rgba(110,231,183,.07)', icone:'🇧🇷'},
  'Esporte':        {cor:'#34D399', bg:'rgba(52,211,153,.09)', icone:'⚽'},
  'Politica':       {cor:'#F87171', bg:'rgba(248,113,113,.09)', icone:'🏛️'},
  'Entretenimento': {cor:'#C084FC', bg:'rgba(192,132,252,.09)', icone:'🎬'},
  'Curiosidades':   {cor:'#F59E0B', bg:'rgba(245,158,11,.09)', icone:'💡'},
};

let DADOS_JSON = null; // dados do noticias.json

async function init(){
 iniciarRelogio();await atualizarNoticias();
}
async function atualizarNoticias(){
 try{
  const r=await fetch('noticias.json?t='+Date.now(),{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('Arquivo indisponível');
  const d=await r.json();validateNews(d);DADOS_JSON=d;
  renderTodosDoJSON();
  document.getElementById('hero-sub-data').textContent='Arquivo de notícias carregado · '+(d.data||'data não informada')+' '+(d.hora||'');
 }catch(e){
  if(!DADOS_JSON){activeNews=[...NOTICIAS,...ESPORTE];renderActive();document.getElementById('hero-sub-data').textContent='DEMONSTRAÇÃO · conteúdo do arquivo original, sem atualização ao vivo';}
  else toast('Falha ao atualizar. A última versão permanece visível.');
 }
}
function renderTodosDoJSON(){
 activeNews=DADOS_JSON.editorias.map(ed=>({...COR_MAP[ed.nome]||COR_MAP.Brasil,editoria:ed.nome,fontes:ed.fontes.map(f=>({nome:f.nome,items:f.noticias.map(n=>({t:n.titulo,r:n.resumo,l:n.link}))}))}));renderActive();
}
// ═══════════════════════════════════════
// NAV
// ═══════════════════════════════════════
function ir(id,btn){
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('sec-'+id).classList.add('on');
  btn.classList.add('on');
  if(id==='tempo') carregarTempo();
  if(id==='boletim') renderBoletim();
  if(id==='config'){
    document.getElementById('config-lock').style.display='flex';
    document.getElementById('config-conteudo').style.display='none';
    document.getElementById('cfg-senha').value='';
    document.getElementById('cfg-senha-erro').textContent='';
  }
}

// ═══════════════════════════════════════
// RELÓGIO
// ═══════════════════════════════════════
let clockStarted=false;
function iniciarRelogio(){
 if(clockStarted)return;clockStarted=true;
  function atualiza(){
    const agora = new Date();
    const hora  = agora.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'});
    const data  = agora.toLocaleDateString('pt-BR');
    // Topbar
    const rel = document.getElementById('relogio');
    if(rel) rel.textContent = hora;
    // Hero — só atualiza a hora se ainda não carregou o JSON
    const heroSub = document.getElementById('hero-sub-data');
    if(heroSub && heroSub.textContent === 'Carregando...'){
      heroSub.textContent = `${data} · ${hora}`;
    }
  }
  atualiza();
  setInterval(atualiza, 1000);
}

// ═══════════════════════════════════════
// TICKER
// ═══════════════════════════════════════
function renderTicker(){
  const titulos=[];
  [...NOTICIAS,...ESPORTE].forEach(e=>e.fontes.forEach(f=>f.items.forEach(i=>titulos.push(i.t))));
  const h=titulos.map(t=>`<span class="tk-item">${esc(t)}</span><span class="tk-sep">◆</span>`).join('');
  document.getElementById('ticker').innerHTML=h+h;
}

// ═══════════════════════════════════════
// RENDER NOTÍCIAS / ESPORTE (dados estáticos)
// ═══════════════════════════════════════
function renderNoticias(){document.getElementById('sec-noticias').innerHTML=NOTICIAS.map(renderEd).join('')}
function renderEsporte(){document.getElementById('sec-esporte').innerHTML=ESPORTE.map(renderEd).join('')}

function renderEd(e){
  const tot=e.fontes.reduce((a,f)=>a+f.items.length,0);
  return `<div class="ed-bloco" style="--cor:${e.cor}">
    <div class="ed-header">
      <div class="ed-pill" style="background:${e.bg};color:${e.cor}">${esc(e.icone)} ${esc(e.editoria)}</div>
      <div class="ed-count">${tot} notícias</div>
    </div>
    ${e.fontes.map(f=>renderFonte(f,e.cor,e.editoria)).join('')}
  </div>`;
}

function renderFonte(f,cor){
  return `<div class="fonte-bloco">
    <div class="fonte-label">${esc(f.nome)}</div>
    <div class="grid">${f.items.map((n,i)=>renderCard(n,i,cor,f.nome)).join('')}</div>
  </div>`;
}

function renderCard(n,i,cor,fonte){
  if(i===0) return `<div class="card dest" style="--cor:${cor}">
    <div class="dest-body">
      <div class="c-idx" style="color:${cor}">DESTAQUE</div>
      <div class="c-titulo">${esc(n.t)}</div>
      <div class="c-resumo">${esc(n.r)}</div>
      <div class="c-footer">
        <a class="c-link" href="${esc(safeURL(n.l))}" rel="noopener noreferrer" target="_blank" style="color:${cor}">Ler original →</a>
        <span class="c-fonte">${esc(fonte)}</span>
      </div>
    </div>
    <div class="dest-side">
      <div class="dest-num">01</div>
      <div class="dest-tag">Destaque</div>
    </div>
  </div>`;
  return `<div class="card" style="--cor:${cor}">
    <div class="c-idx" style="color:${cor}">${String(i+1).padStart(2,'0')}</div>
    <div class="c-titulo">${esc(n.t)}</div>
    <div class="c-resumo">${esc(n.r)}</div>
    <div class="c-footer">
      <a class="c-link" href="${esc(safeURL(n.l))}" rel="noopener noreferrer" target="_blank" style="color:${cor}">Ler original →</a>
      <span class="c-fonte">${esc(fonte)}</span>
    </div>
  </div>`;
}

// ═══════════════════════════════════════
// PREVISÃO DO TEMPO — Open-Meteo (grátis)
// ═══════════════════════════════════════
let tempoCarregado=false;
async function carregarTempo(){
  if(tempoCarregado)return;
  tempoCarregado=true;
  const container=document.getElementById('tempo-cards');
  const status=document.getElementById('tempo-status');
  try{
    const resultados=await Promise.all(CIDADES.map(async c=>{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America/Sao_Paulo&forecast_days=5`;
      const r=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(!r.ok)throw new Error('Previsão indisponível');
      const d=await r.json();
      return {cidade:c.nome,dados:d};
    }));
    status.textContent=`Atualizado agora · ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
    container.innerHTML=resultados.map(({cidade,dados})=>{
      const cur=dados.current;
      const daily=dados.daily;
      const temp=Math.round(cur.temperature_2m);
      const wc=cur.weathercode;
      const ico=ICONES_TEMPO[wc]||'🌡';
      const desc=descTempo(wc);
      const wind=Math.round(cur.windspeed_10m);
      const hum=cur.relativehumidity_2m;
      // próximos 4 dias com descrição
      const prev=daily.time.slice(1,5).map((d,i)=>{
        const dt=new Date(d+'T12:00:00');
        const dia=DIAS_SEMANA[dt.getDay()];
        const mx=Math.round(daily.temperature_2m_max[i+1]);
        const mn=Math.round(daily.temperature_2m_min[i+1]);
        const wcd=daily.weathercode[i+1];
        const ico2=ICONES_TEMPO[wcd]||'🌡';
        const desc2=descTempo(wcd);
        return `<div class="prev-dia">
          <div class="pd-dia">${dia}</div>
          <div class="pd-ico">${ico2}</div>
          <div class="pd-desc">${desc2}</div>
          <div class="pd-temps">
            <span class="pd-max">${mx}°</span>
            <span class="pd-min">${mn}°</span>
          </div>
        </div>`;
      }).join('');
      return `<div class="cidade-card">
        <div class="cidade-top">
          <div>
            <div class="cidade-nome">${cidade}</div>
            <div class="cidade-temp">${temp}<span>°C</span></div>
            <div class="cidade-desc">${desc}</div>
            <div class="cidade-extras">
              <div class="cidade-extra">💨 Vento ${wind} km/h</div>
              <div class="cidade-extra">💧 Umidade ${hum}%</div>
            </div>
          </div>
          <div class="cidade-icone-grande">${ico}</div>
        </div>
        <div class="previsao-row">${prev}</div>
      </div>`;
    }).join('');
  }catch(e){
    container.innerHTML=`<div class="tempo-loading">⚠️ Não foi possível carregar a previsão. Verifique a conexão.</div>`;
    status.textContent='Erro na conexão';
    tempoCarregado=false;
  }
}

function descTempo(code){
  const m={0:'Céu limpo',1:'Predominante limpo',2:'Parcialmente nublado',3:'Nublado',45:'Névoa',48:'Névoa com gelo',51:'Garoa leve',53:'Garoa moderada',55:'Garoa forte',61:'Chuva leve',63:'Chuva moderada',65:'Chuva forte',71:'Neve leve',73:'Neve moderada',75:'Neve forte',80:'Pancadas leves',81:'Pancadas moderadas',82:'Pancadas fortes',95:'Trovoada',96:'Trovoada com granizo',99:'Trovoada forte'};
  return m[code]||'Condição variável';
}

// ═══════════════════════════════════════
// CURIOSIDADES
// ═══════════════════════════════════════
function renderCuriosidades(){
  document.getElementById('curio-grid').innerHTML=CURIOSIDADES.map(c=>`
    <div class="curio-card">
      <div class="curio-tag">${c.tag}</div>
      <div class="curio-titulo">${esc(c.t)}</div>
      <div class="curio-texto">${esc(c.r)}</div>
    </div>`).join('');
  document.getElementById('curio-count').textContent=`${CURIOSIDADES.length} itens`;
}

// ═══════════════════════════════════════
// CALENDÁRIO — datas comemorativas
// ═══════════════════════════════════════
const CALENDARIO = {
  '01-01': '🎉 Confraternização Universal / Ano Novo',
  '01-25': '🏙️ Aniversário de São Paulo',
  '02-02': '🌊 Dia de Iemanjá',
  '02-14': '❤️ Dia de São Valentim',
  '03-08': '👩 Dia Internacional da Mulher',
  '03-21': '🌸 Dia Internacional da Eliminação da Discriminação Racial',
  '03-22': '💧 Dia Mundial da Água',
  '04-01': '🤡 Dia da Mentira',
  '04-07': '🏥 Dia Mundial da Saúde',
  '04-21': '⛪ Tiradentes',
  '04-22': '🌿 Dia do Descobrimento do Brasil / Dia da Terra',
  '04-23': '📚 Dia do Livro',
  '05-01': '👷 Dia do Trabalho',
  '05-25': '🌍 Dia da África',
  '06-05': '🌎 Dia Mundial do Meio Ambiente',
  '06-12': '❤️ Dia dos Namorados',
  '06-13': '🎊 Festa de Santo Antônio',
  '06-24': '🎆 Festa de São João',
  '06-29': '🎇 Festa de São Pedro',
  '07-02': '🇧🇷 Independência da Bahia',
  '07-09': '⚔️ Revolução Constitucionalista',
  '07-28': '🎵 Dia do Músico Brasileiro',
  '08-09': '🌿 Dia Internacional dos Povos Indígenas',
  '08-11': '⚖️ Dia do Advogado',
  '08-25': '🌺 Dia do Soldado',
  '09-07': '🇧🇷 Independência do Brasil',
  '09-08': '📖 Dia Internacional da Alfabetização',
  '09-21': '🌳 Dia da Árvore',
  '10-01': '👴 Dia do Idoso',
  '10-04': '🐾 Dia de São Francisco / Dia dos Animais',
  '10-12': '👼 Nossa Senhora Aparecida / Dia das Crianças',
  '10-15': '🍎 Dia do Professor',
  '10-28': '🏥 Dia do Servidor Público',
  '10-31': '🎃 Halloween',
  '11-02': '✝️ Finados',
  '11-15': '🏛️ Proclamação da República',
  '11-19': '🎮 Dia Internacional dos Homens',
  '11-20': '✊ Consciência Negra / Zumbi dos Palmares',
  '12-01': '🔴 Dia Mundial de Luta contra a AIDS',
  '12-08': '🙏 Imaculada Conceição',
  '12-25': '🎄 Natal',
  '12-31': '🎆 Véspera de Ano Novo',
};

function renderHeroDataExtra(){
  // Usa horário de Brasília (UTC-3)
  const agora = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const mes   = String(agora.getUTCMonth()+1).padStart(2,'0');
  const dia   = String(agora.getUTCDate()).padStart(2,'0');
  const chave = `${mes}-${dia}`;

  // Dias restantes no ano (em horário local)
  const hoje  = new Date();
  const fimAno = new Date(hoje.getFullYear(), 11, 31);
  const diff   = Math.ceil((fimAno - hoje) / (1000*60*60*24));
  const diasLabel = diff === 1 ? 'falta 1 dia' : `faltam ${diff} dias`;

  const dataCom = CALENDARIO[chave] || '';
  const extra   = document.getElementById('hero-data-extra');
  if(!extra) return;

  if(dataCom){
    extra.textContent = `${dataCom} · ${diasLabel} para o fim do ano`;
  } else {
    extra.textContent = `📅 ${diasLabel} para o fim do ano`;
  }
}

// Chama ao iniciar
renderHeroDataExtra();

// ═══════════════════════════════════════
// TEMAS E FONTES
// ═══════════════════════════════════════
const TEMAS = [
  {id:'oceano',  nome:'🔵 Oceano',   bg:'#0A1220', painel:'#0D1A30', card:'#101F38', borda:'#1A3260', hover:'#162A50', azul:'#1565E8', sutil:'#2A4070', cinza:'#6A85B0', branco:'#EEF3FF'},
  {id:'carbono', nome:'⚫ Carbono',  bg:'#111111', painel:'#1A1A1A', card:'#222222', borda:'#333333', hover:'#2A2A2A', azul:'#1565E8', sutil:'#444444', cinza:'#999999', branco:'#F0F0F0'},
  {id:'neutro',  nome:'🩶 Neutro',   bg:'#1A1A22', painel:'#22222E', card:'#2A2A38', borda:'#38384A', hover:'#303040', azul:'#6C8EF5', sutil:'#3A3A50', cinza:'#8888AA', branco:'#E8E8F0'},
  {id:'verde',   nome:'🟢 Floresta', bg:'#0A1A10', painel:'#0D2018', card:'#102818', borda:'#1A4028', hover:'#163020', azul:'#22C55E', sutil:'#1A3020', cinza:'#6A9080', branco:'#EEFAEF'},
];

const FONTES_OPTS = [
  {id:'montserrat', nome:'Montserrat', css:"'Montserrat',sans-serif", url:'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap'},
  {id:'inter',      nome:'Inter',      css:"'Inter',sans-serif",      url:'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'},
  {id:'poppins',    nome:'Poppins',    css:"'Poppins',sans-serif",    url:'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap'},
  {id:'roboto',     nome:'Roboto',     css:"'Roboto',sans-serif",     url:'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap'},
];

let temaAtivo  = storage.getItem('portal_tema')  || 'oceano';
let fonteAtiva = localStorage.getItem('portal_fonte') || 'montserrat';

function aplicarTema(id){
  const t = TEMAS.find(x=>x.id===id);
  if(!t) return;
  const r = document.documentElement.style;
  r.setProperty('--azul-bg',    t.bg);
  r.setProperty('--azul-painel',t.painel);
  r.setProperty('--azul-card',  t.card);
  r.setProperty('--azul-borda', t.borda);
  r.setProperty('--azul-hover', t.hover);
  r.setProperty('--azul',       t.azul);
  r.setProperty('--sutil',      t.sutil);
  r.setProperty('--cinza',      t.cinza);
  r.setProperty('--branco',     t.branco);
  temaAtivo = id;
  localStorage.setItem('portal_tema', id);
}

function aplicarFonte(id){
  const f = FONTES_OPTS.find(x=>x.id===id);
  if(!f) return;
  const linkId = 'font-link-'+id;
  if(!document.getElementById(linkId)){
    const link = document.createElement('link');
    link.id=linkId; link.rel='stylesheet'; link.href=f.url;
    document.head.appendChild(link);
  }
  document.documentElement.style.setProperty('--font', f.css);
  fonteAtiva = id;
  localStorage.setItem('portal_fonte', id);
}

// Aplica preferências salvas ao carregar
aplicarTema(temaAtivo);
aplicarFonte(fonteAtiva);

function renderTemasFontes(){
  const tg = document.getElementById('cfg-temas-grid');
  if(tg) tg.innerHTML = TEMAS.map(t=>`
    <div onclick="aplicarTema('${t.id}');renderTemasFontes()" style="
      background:${t.card};border:2px solid ${temaAtivo===t.id?t.azul:t.borda};
      border-radius:10px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .2s">
      <div style="font-size:12px;font-weight:700;color:${t.azul};margin-bottom:6px">${t.nome}</div>
      <div style="display:flex;gap:4px;justify-content:center">
        <div style="width:14px;height:14px;border-radius:50%;background:${t.bg};border:1px solid ${t.borda}"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${t.azul}"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${t.card};border:1px solid ${t.borda}"></div>
      </div>
    </div>`).join('');

  const fg = document.getElementById('cfg-fontes-grid');
  if(fg) fg.innerHTML = FONTES_OPTS.map(f=>`
    <div onclick="aplicarFonte('${f.id}');renderTemasFontes()" style="
      background:var(--azul-card);border:2px solid ${fonteAtiva===f.id?'var(--azul)':'var(--azul-borda)'};
      border-radius:10px;padding:10px;text-align:center;cursor:pointer;transition:all .2s;font-family:${f.css}">
      <div style="font-size:14px;font-weight:700;color:var(--branco)">${f.nome}</div>
      <div style="font-size:11px;color:var(--cinza);margin-top:2px">Aa Bb Cc 123</div>
    </div>`).join('');
}

// ═══════════════════════════════════════
// LOGO DO PORTAL
// ═══════════════════════════════════════
let logoPortalTemp = null;

function carregarLogoPortal(input){
  const file = input.files[0];
  if(!file) return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1500000){toast('Use PNG, JPG ou WebP de até 1,5 MB.');input.value='';return;}
  const reader = new FileReader();
  reader.onload = e => {
    logoPortalTemp = e.target.result;
    const prev = document.getElementById('cfg-logo-preview');
    const ph   = document.getElementById('cfg-logo-placeholder');
    if(prev){ prev.src = logoPortalTemp; prev.style.display = ''; }
    if(ph) ph.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function salvarLogoPortal(){
  if(!logoPortalTemp){ toast('Selecione uma imagem primeiro!'); return; }
  localStorage.setItem('portal_logo', logoPortalTemp);
  aplicarLogoPortal(logoPortalTemp);
  logoPortalTemp = null;
  document.getElementById('modal-cfg-visual').style.display='none';
  toast('Logo atualizada!');
}

function removerLogoPortal(){
  if(!confirm('Remover a logo e voltar ao padrão?')) return;
  localStorage.removeItem('portal_logo');
  logoPortalTemp = null;
  // Volta para a logo padrão do GitHub
  const logoUrl = 'https://raw.githubusercontent.com/rafasansc-ux/portal-rbn/main/LOGO_RBN-03.png';
  document.querySelectorAll('.logo-portal').forEach(img => { img.src = logoUrl; img.style.display = ''; });
  const prev = document.getElementById('cfg-logo-preview');
  const ph   = document.getElementById('cfg-logo-placeholder');
  if(prev) prev.style.display = 'none';
  if(ph)   ph.style.display   = '';
  document.getElementById('cfg-logo-input').value = '';
  toast('Logo removida — voltou ao padrão!');
}

function aplicarLogoPortal(src){
  document.querySelectorAll('.logo-portal').forEach(img => { img.src = src; img.style.display = ''; });
}

function carregarLogoSalvaPortal(){
  const src = localStorage.getItem('portal_logo');
  if(src) aplicarLogoPortal(src);
}

// Aplica logo salva ao carregar
carregarLogoSalvaPortal();

function abrirModalConfig(){
  renderTemasFontes();
  // Preenche campos com valores salvos
  document.getElementById('cfg-nome-radio').value = localStorage.getItem('portal_nome') || 'RBN 94,3';
  document.getElementById('cfg-slogan').value = localStorage.getItem('portal_slogan') || 'Portal da Redação';
  const corSalva = localStorage.getItem('portal_cor') || '#1565E8';
  document.getElementById('cfg-cor-picker').value = corSalva;
  document.getElementById('cfg-cor-hex').value = corSalva;
  document.getElementById('cfg-cor-preview').style.background = corSalva;

  // Color picker → hex
  document.getElementById('cfg-cor-picker').oninput = function(){
    document.getElementById('cfg-cor-hex').value = this.value;
    document.getElementById('cfg-cor-preview').style.background = this.value;
  };
  document.getElementById('cfg-cor-hex').oninput = function(){
    const hex = this.value;
    if(/^#[0-9A-Fa-f]{6}$/.test(hex)){
      document.getElementById('cfg-cor-picker').value = hex;
      document.getElementById('cfg-cor-preview').style.background = hex;
    }
  };

  // Preview logo
  const logoSalva = localStorage.getItem('portal_logo');
  const prev = document.getElementById('cfg-logo-preview');
  const ph   = document.getElementById('cfg-logo-placeholder');
  if(logoSalva && prev){ prev.src = logoSalva; prev.style.display = ''; if(ph) ph.style.display = 'none'; }
  else { if(prev) prev.style.display = 'none'; if(ph) ph.style.display = ''; }
  logoPortalTemp = null;
  document.getElementById('cfg-logo-input').value = '';

  document.getElementById('modal-cfg-visual').style.display='flex';
}

function aplicarIdentidade(){
  const nome   = document.getElementById('cfg-nome-radio').value.trim() || 'RBN 94,3';
  const slogan = document.getElementById('cfg-slogan').value.trim() || 'Portal da Redação';
  const cor    = document.getElementById('cfg-cor-hex').value.trim();
  const corVal = /^#[0-9A-Fa-f]{6}$/.test(cor) ? cor : '#1565E8';

  // Aplica nome
  const elNome = document.getElementById('login-nome-radio');
  const elSlogan = document.getElementById('login-slogan');
  const elTbNome = document.getElementById('tb-nome-radio');
  if(elNome) elNome.textContent = nome;
  if(elSlogan) elSlogan.textContent = slogan;
  if(elTbNome) elTbNome.textContent = nome.split(' ')[0].toLowerCase();

  // Aplica cor principal
  document.documentElement.style.setProperty('--azul', corVal);
  // Gera variações da cor
  document.documentElement.style.setProperty('--frequencia', corVal);

  // Salva
  localStorage.setItem('portal_nome', nome);
  localStorage.setItem('portal_slogan', slogan);
  localStorage.setItem('portal_cor', corVal);

  toast('Identidade aplicada!');
}

// Aplica identidade salva ao carregar
(function(){
  const nome   = localStorage.getItem('portal_nome');
  const slogan = localStorage.getItem('portal_slogan');
  const cor    = localStorage.getItem('portal_cor');
  if(nome){
    const elNome = document.getElementById('login-nome-radio');
    const elSlogan = document.getElementById('login-slogan');
    const elTbNome = document.getElementById('tb-nome-radio');
    if(elNome) elNome.textContent = nome;
    if(elSlogan) elSlogan.textContent = slogan||'Portal da Redação';
    if(elTbNome) elTbNome.textContent = nome.split(' ')[0].toLowerCase();
  }
  if(cor) document.documentElement.style.setProperty('--azul', cor);
})();

function renderBoletim(){
  document.getElementById('bol-prev').innerHTML=[...NOTICIAS,...ESPORTE].map(renderEd).join('');
}

// ═══════════════════════════════════════
// CONFIGURAÇÕES — gerenciador de fontes
// ═══════════════════════════════════════


function verificarSenhaConfig(){
 document.getElementById('config-lock').style.display='none';
 document.getElementById('config-conteudo').style.display='block';renderConfig();
}
function bloquearConfig(){
  document.getElementById('config-lock').style.display='flex';
  document.getElementById('config-conteudo').style.display='none';
}
const COR_EDITORIA = {
  'Local':'#4D8FFF','Estado':'#FBBF24','Brasil':'#6EE7B7',
  'Esporte':'#34D399','Curiosidades':'#F59E0B','Entretenimento':'#C084FC'
};

// Fontes iniciais carregadas do fontes.json (simulação — em produção vem de fetch)
let FONTES_CONFIG = [
  {nome:'OCP News',    editoria:'Local',   rss:'https://ocp.news/feed',                                          ativo:true},
  {nome:'RBN Portal',  editoria:'Local',   rss:'https://portal.rbnfm.com.br/feed/',                              ativo:true},
  {nome:'G1 SC',       editoria:'Estado',  rss:'https://g1.globo.com/rss/g1/sc/',                                ativo:true},
  {nome:'ND Mais',     editoria:'Estado',  rss:'https://ndmais.com.br/feed/',                                    ativo:true},
  {nome:'G1 Brasil',   editoria:'Brasil',  rss:'https://g1.globo.com/dynamo/rss2.xml',                           ativo:true},
  {nome:'G1 Economia', editoria:'Brasil',  rss:'https://g1.globo.com/dynamo/economia/rss2.xml',                  ativo:true},
  {nome:'Gazeta do Povo',editoria:'Brasil',rss:'https://www.gazetadopovo.com.br/rss/',                           ativo:true},
  {nome:'CNN Brasil',  editoria:'Brasil',  rss:'https://www.cnnbrasil.com.br/feed/',                             ativo:true},
  {nome:'Agência Brasil',editoria:'Brasil',rss:'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',  ativo:true},
  {nome:'GE',          editoria:'Esporte', rss:'https://ge.globo.com/rss/ge/',                                   ativo:true},
];

let editandoIdx = -1;

function renderConfig(){
  const lista = document.getElementById('cfg-lista');
  const count = document.getElementById('config-count');
  count.textContent = `${FONTES_CONFIG.length} fontes · ${FONTES_CONFIG.filter(f=>f.ativo).length} ativas`;

  // Agrupar por editoria
  const grupos = {};
  FONTES_CONFIG.forEach((f,i)=>{
    if(!grupos[f.editoria]) grupos[f.editoria]=[]; grupos[f.editoria].push({...f,_idx:i});
  });

  lista.innerHTML = Object.entries(grupos).map(([ed, fontes])=>`
    <div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--azul-borda)">
        <span style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${COR_EDITORIA[ed]||'#94C3FF'}">${esc(ed)}</span>
        <span style="font-size:11px;color:var(--sutil)">${fontes.length} fonte${fontes.length>1?'s':''}</span>
      </div>
      ${fontes.map(f=>`
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--azul-card);border:1px solid ${f.ativo?'var(--azul-borda)':'var(--sutil)'};border-radius:10px;margin-bottom:8px;opacity:${f.ativo?1:.5}">
          <div style="flex:1;min-width:0">
            <div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:15px;color:var(--branco);margin-bottom:3px">${esc(f.nome)}</div>
            <div style="font-size:11px;color:var(--sutil);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.rss)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <!-- Toggle ativo/inativo -->
            <button onclick="toggleFonte(${f._idx})"
              style="padding:5px 12px;border-radius:6px;border:1px solid ${f.ativo?'#34D399':'var(--azul-borda)'};background:${f.ativo?'rgba(52,211,153,.12)':'var(--azul-hover)'};color:${f.ativo?'#34D399':'var(--cinza)'};font-size:11px;font-weight:600;cursor:pointer;letter-spacing:1px;font-family:'Montserrat',sans-serif">
              ${f.ativo?'✓ ATIVA':'INATIVA'}
            </button>
            <button onclick="editarFonte(${f._idx})"
              style="padding:5px 10px;border-radius:6px;border:1px solid var(--azul-borda);background:none;color:var(--cinza);font-size:12px;cursor:pointer">✏</button>
            <button onclick="removerFonte(${f._idx})"
              style="padding:5px 10px;border-radius:6px;border:1px solid rgba(248,113,113,.3);background:none;color:#F87171;font-size:12px;cursor:pointer">✕</button>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function toggleFonte(idx){
  FONTES_CONFIG[idx].ativo = !FONTES_CONFIG[idx].ativo;persistFontes();
  renderConfig();
}

function removerFonte(idx){
  if(confirm(`Remover "${FONTES_CONFIG[idx].nome}"?`)){
    FONTES_CONFIG.splice(idx,1);persistFontes();
    renderConfig();
  }
}

function editarFonte(idx){
  editandoIdx = idx;
  const f = FONTES_CONFIG[idx];
  document.getElementById('modal-titulo').textContent = 'Editar Fonte';
  document.getElementById('f-nome').value = f.nome;
  document.getElementById('f-editoria').value = f.editoria;
  document.getElementById('f-rss').value = f.rss;
  document.getElementById('modal-fonte').style.display='flex';
}

function abrirModalFonte(){
  editandoIdx = -1;
  document.getElementById('modal-titulo').textContent = 'Adicionar Fonte';
  document.getElementById('f-nome').value = '';
  document.getElementById('f-editoria').value = 'Local';
  document.getElementById('f-rss').value = '';
  document.getElementById('modal-fonte').style.display='flex';
}

function fecharModal(){
  document.getElementById('modal-fonte').style.display='none';
}

function salvarFonte(){
  const nome = document.getElementById('f-nome').value.trim();
  const editoria = document.getElementById('f-editoria').value;
  const rss = document.getElementById('f-rss').value.trim();
  if(!nome||!rss){alert('Preencha nome e URL do RSS.');return;}
  if(safeURL(rss)==='#'){alert('Use uma URL HTTP ou HTTPS válida, sem usuário e senha.');return;}
  if(editandoIdx>=0){
    FONTES_CONFIG[editandoIdx] = {...FONTES_CONFIG[editandoIdx], nome, editoria, rss};
  } else {
    FONTES_CONFIG.push({nome, editoria, rss, ativo:true});
  }
  fecharModal();
  renderConfig();
  persistFontes();mostrarMsg('Salvando fonte na conta…');
}

function exportarFontes(){
  const json = JSON.stringify(FONTES_CONFIG.map(({nome,editoria,rss,ativo})=>({nome,editoria,rss,ativo})), null, 2);
  const blob = new Blob([json],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fontes.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function copiarFontes(){
  const json = JSON.stringify(FONTES_CONFIG.map(({nome,editoria,rss,ativo})=>({nome,editoria,rss,ativo})), null, 2);
  navigator.clipboard?.writeText(json).then(()=>mostrarMsg('JSON copiado!')).catch(()=>mostrarMsg('Não foi possível copiar. Exporte o arquivo.'));
}

function mostrarMsg(txt){
  const el = document.getElementById('cfg-msg');
  el.textContent = txt;
  el.style.opacity = 1;
  setTimeout(()=>el.style.opacity=0, 3000);
}

// ═══════════════════════════════════════
// UTILS
// ═══════════════════════════════════════
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

let activeNews=[];
function persistFontes(){storage.setItem('portal_fontes',JSON.stringify(FONTES_CONFIG));updateStats()}
try{const saved=JSON.parse(storage.getItem('portal_fontes'));if(Array.isArray(saved)&&saved.length<=200&&saved.every(f=>typeof f.nome==='string'&&typeof f.editoria==='string'&&safeURL(f.rss)!=='#'&&typeof f.ativo==='boolean'))FONTES_CONFIG=saved}catch{}
function updateStats(){document.querySelectorAll('.stat-n')[1].textContent=FONTES_CONFIG.filter(f=>f.ativo).length}
function renderActive(){
 const ids=['noticias','esporte','politica','entretenimento','curiosidades'];const map={Esporte:'esporte',Politica:'politica','Política':'politica',Entretenimento:'entretenimento',Curiosidades:'curiosidades'};
 for(const id of ids){const eds=activeNews.filter(e=>(map[e.editoria]||'noticias')===id);document.getElementById('sec-'+id).innerHTML=eds.length?eds.map(renderEd).join(''):'<div class="ph"><p>Nenhum conteúdo disponível nesta editoria.</p></div>'}
 const titles=activeNews.flatMap(e=>e.fontes.flatMap(f=>f.items.map(n=>n.t)));document.getElementById('tot').textContent=titles.length;
 document.getElementById('ticker').innerHTML=titles.length?[...titles,...titles].map(t=>'<span class="tk-item">'+esc(t)+'</span>').join(''):'<span class="tk-item">Nenhuma notícia disponível</span>';updateStats();renderBoletim();
}
function renderBoletim(){document.getElementById('bol-prev').innerHTML=activeNews.map(renderEd).join('')}
function downloadBulletin(html){const warning=document.getElementById('hero-sub-data').textContent;const body=html?'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Boletim RBN</title><p>'+esc(warning)+'</p>'+activeNews.map(renderEd).join('')+'</html>':warning+'\n\n'+activeNews.flatMap(e=>e.fontes.flatMap(f=>f.items.map(n=>e.editoria+' · '+f.nome+'\n'+n.t+'\n'+n.r+'\n'+safeURL(n.l)))).join('\n\n');const url=URL.createObjectURL(new Blob([body],{type:html?'text/html;charset=utf-8':'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='boletim-rbn.'+(html?'html':'txt');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('[role="dialog"]').forEach(m=>m.style.display='none');if(e.key==='Enter'&&e.target.closest('#modal-fonte')){e.preventDefault();salvarFonte()}});
