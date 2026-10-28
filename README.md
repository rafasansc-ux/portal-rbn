# Portal da Redação RBN — versão 0.3

Portal com login e senha, dados separados por rádio, assinatura de liberação
manual e atualização automática no Supabase.

## Funciona nesta versão

- Supabase Auth, sessões criptografadas em cookie HttpOnly, validação de origem,
  CSRF, vínculo por rádio, perfis e vencimento de acesso.
- Até cinco notícias por fonte, priorizando a data do RSS quando disponível.
- Coleta automática no Supabase de duas em duas horas, mesmo com o portal fechado.
- Botão Atualizar notícias para uma busca adicional e trava para evitar concorrência.
- Boletim da Epagri/Ciram em texto para Santa Catarina, com data, autoria e link.
- Dados numéricos de Jaraguá do Sul via Open-Meteo, apresentados separadamente.
- Exportação de boletim em HTML/TXT, identidade, temas, logo e fontes por rádio.

Projeto exclusivo do portal: amksnfyktkzewxcandpu, região São Paulo. O CRM não
foi alterado. A agenda portal-rbn-coleta-2h está ativa com execuções às 00h,
02h, 04h, 06h, 08h, 10h, 12h, 14h, 16h, 18h, 20h e 22h de Brasília.

A função automática foi testada pelo próprio banco: HTTP 200, 85 notícias,
duas fontes em falha e boletim Epagri atualizado. Na interface, 17 fontes
exibiram cinco itens cada. A agenda usa a verificação JWT existente e um token
exclusivo do coletor guardado no Vault. Chamadas sem esse token foram recusadas.

## Instalação e testes

Requer Node.js 24 ou superior. Instale as dependências usando npm ou pnpm;
o lockfile pnpm está incluído. Copie .env.example para .env.local e preencha
os valores do ambiente, sem versionar senhas ou chaves secretas.

- Preparar interface: node build-cloud.cjs.
- Gerar coletor após alterar parser: node tools/build-worker.cjs.
- Testar: node --test cloud.test.cjs collector.test.cjs automacao.test.cjs supabase/tests/rls.test.cjs.
- Prévia: node --env-file=.env.local tools/preview-cloud.cjs, em localhost:9432.

Configuração na Vercel: vercel.json publica public/ e utiliza api/portal.js.
Variáveis de servidor: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SESSION_SECRET
(32 bytes aleatórios em base64) e APP_ORIGIN (origem exata da publicação).
O backend de login/coleta manual não precisa de chave administrativa.

As migrações SQL e a agenda já foram executadas no projeto do portal pelo SQL
Editor; não as execute de novo nesse projeto. Elas não foram registradas via CLI.
Consulte supabase/AUTOMACAO.md para operação, autenticação e limitações da agenda.

## Acesso e operação

A entrada solicita apenas login e senha; um identificador interno é usado no
Supabase Auth. O primeiro login rbn.admin foi criado pelo responsável e vinculado
à RBN 94,3. Não existe senha padrão no código nem registro de senha em SQL.
A recuperação de senha é assistida pelo operador nesta etapa.

Perfis: administrador da rádio, editor e leitor. Administração de assinaturas
fica no servidor/operador; uma rádio não consegue renovar seu próprio prazo.
A ferramenta tools/cadastrar-radio.cjs exige credencial administrativa somente
no ambiente privado do operador e cria rádios novas; não a use para duplicar RBN.

## Limitações atuais

Duas fontes continuam indisponíveis e são identificadas na tela. Novos domínios
no coletor automático precisam entrar na lista permitida após revisão de rede.
O texto Epagri é um trecho do boletim estadual; não é previsão municipal produzida
pela aplicação. A leitura editorial dos conteúdos permanece necessária.

O novo backend/interface ainda não foi publicado na Vercel nem enviado ao GitHub.
A agenda Supabase está ativa e a prévia local já consome seus dados. O coletor
legado do main continua independente e não é a agenda de duas horas desta versão.

Antes de vender: publicar e homologar o novo ambiente, testar carga, recuperação
de dados e contas, completar administração visual e formalizar a operação comercial.
