# Preparação de jornais — entrega de 05/11/2026

O botão Criar com IA abre a seleção de notícias por bloco. A geração automática continua desativada: não há endpoint que envie esta seleção à OpenAI, nenhuma chave é usada e nenhuma franquia é debitada.

## Disponível

- Catálogo derivado no servidor exclusivamente da coleta e das fontes ativas da emissora autenticada.
- IDs calculados por URL, título e resumo: se o conteúdo mudar, a seleção antiga é rejeitada, não trocada silenciosamente.
- Limpeza de resíduos e deduplicação com o utilitário existente do portal.
- Filtros por editoria e busca textual, seleção de até 12 notícias por bloco e bloqueio de repetição entre blocos. Intervalos comerciais não recebem notícias.
- Plano com tempo previsto, estimativa da leitura dos resumos e alertas de insuficiência. Não representa duração de roteiro ainda inexistente.
- Abrir rascunho salva os resumos originais em um boletim existente, cada notícia com título, texto, fonte e link próprios; seções do espelho aparecem como cabeçalhos. Não é texto adaptado por IA. Sujeito ao limite já existente de 100 itens por boletim.
- Seleção provisória fica somente na janela até abrir o rascunho. Trocar o espelho descarta a seleção; salvar modelo não salva seleção de notícias. Não há histórico de versões ou aprovação editorial de jornais nesta entrega.

## Preparado, ainda sem execução

`lib/jornal-producao.cjs:pedidoBloco` define o contrato estruturado do futuro pedido de geração: notícias, passagens do apresentador, IDs de fontes e alertas. Não realiza chamadas de rede. Testes conferem o contrato, não a qualidade de uma resposta real.

## Antes de ativar geração

Implementar reservas e limites próprios de jornal, idempotência, registro real de tokens e modelo, estados de falha, persistência das fontes utilizadas, comparação/aplicação de sugestões e versões. Registrar autorização das fontes para adaptação; fonte ativa na coleta não comprova licença. Acrescentar validação dos IDs na resposta e revisão humana obrigatória.

Conferir saldo da API e testar um único bloco com fontes atuais autorizadas. Depois validar abertura, manchetes e encerramento a partir dos blocos aceitos e medir qualidade/custo do jornal completo.

## Verificações

48 testes automatizados passaram: validação, isolamento existente por emissora, RLS de modelos, proteção de versões, fontes ativas, conteúdo alterado, repetição e contrato sem chamadas pagas. O fluxo autenticado completo no navegador depende de sessão válida e deve ser conferido na publicação.
