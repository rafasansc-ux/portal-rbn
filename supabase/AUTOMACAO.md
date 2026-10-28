# Atualização automática de duas em duas horas

Ativada no projeto exclusivo portal-rbn (amksnfyktkzewxcandpu).

- Função: portal-coleta, implantada no Supabase.
- Agenda: portal-rbn-coleta-2h, ativa no pg_cron.
- Horários: 00h, 02h, 04h, 06h, 08h, 10h, 12h, 14h, 16h, 18h, 20h e 22h de Brasília.
- A execução ocorre no Supabase e independe do computador ou navegador do usuário.
- Coleta manual continua disponível, com trava compartilhada para evitar concorrência.

Cada fonte exibe até cinco notícias, ordenadas pela data quando disponível; sem
uma data válida, respeita-se a ordem enviada pelo feed. Isso não representa
curadoria editorial nem um ranking de importância calculado pela aplicação.
Na falha de uma fonte, preserva-se seu conteúdo anterior, também limitado a cinco.

## Autenticação e acesso

A verificação JWT da Edge Function permanece ativada. O Cron envia a chave anon
pública em formato JWT e um token exclusivo de 256 bits gerado no banco. O token
exclusivo fica no Vault, não é retornado ao navegador e é validado antes da coleta.
A função usa a credencial de servidor disponibilizada pelo próprio ambiente do
Supabase; ela não foi copiada para código cliente, chat, GitHub ou arquivos locais.
Chamadas sem o token exclusivo retornaram HTTP 401 no teste real.

Funções administrativas de agenda e gravação do cache global da Epagri não são
executáveis por usuários comuns. O teste PostgreSQL local usou substitutos para
as extensões de agenda/Vault; o funcionamento dessas extensões foi validado no
projeto real separadamente.

## Epagri/Ciram

Fonte: https://ciram.epagri.sc.gov.br/index.php/previsao-5-dias/

A seção Tempo apresenta trecho dos dois primeiros dias do boletim de Santa
Catarina, com até 150 palavras no total, data de publicação, autoria e link para
o boletim completo. A previsão numérica de Jaraguá do Sul permanece separada.
O cache textual é renovado pela função automática. Se a consulta falhar, o texto
anterior permanece com aviso e data visíveis. Nenhum texto de previsão é inventado.

## Verificação realizada

O disparo de teste foi enviado pelo próprio banco, sem depender do portal aberto.
A função respondeu HTTP 200 com 85 notícias, duas fontes em falha e o boletim
da Epagri atualizado. Na interface, 17 fontes exibiram exatamente cinco itens;
a indicação mostrou A cada 2h. A agenda foi conferida como ativa.

As duas fontes em falha continuam identificadas na interface. A inclusão de novos
domínios de RSS no coletor automático exige revisão da lista permitida da função,
para manter a proteção contra acessos a destinos internos. A coleta manual no
servidor usa validação de DNS por conexão e pode consultar outros domínios públicos.

## Operação

- Código compartilhado de leitura: lib/feed-core.mjs.
- Gerar função após alterar o parser: node tools/build-worker.cjs.
- Função gerada: supabase/functions/portal-coleta/index.ts.
- Estrutura do banco: migrations/202610280003_automacao_tempo.sql, já aplicada.
- SQL da agenda: ativar-agenda-2h.sql, já executado.
- O arquivo cron-public-jwt.local.sql contém só a configuração pública local e
  está excluído do versionamento. O segredo privado da agenda só existe no Vault.

A publicação da nova interface/backend na Vercel ainda está pendente. A agenda
está ativa no Supabase e atualiza os dados consumidos pela prévia local. O coletor
legado do repositório main ainda não foi substituído; suas execuções não são o
mecanismo de duas horas desta integração.
