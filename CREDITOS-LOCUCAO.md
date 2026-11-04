# Créditos de locução — operação inicial

Regra publicada: 1 crédito para cada 100 caracteres do texto falado, arredondando para cima por geração. Inclui títulos e separadores; fontes e URLs não são falados. Até 3.000 caracteres por geração. Crédito do portal não equivale ao crédito do fornecedor. Preço e franquias comerciais ainda precisam de validação financeira.

O cliente vê saldo disponível, usado, reservado, custo da solicitação e saldo após gerar. O botão bloqueia saldo insuficiente e ciclo vencido. A reserva é aplicada no banco sob bloqueio transacional e vinculada à chave idempotente. Novo áudio/regeneração consome novamente; ouvir, aprovar e baixar não consomem. Falhas incertas ficam reservadas até conferência; falha confirmada sem áudio pode ser estornada pelo operador. Não há repetição automática nem cobrança automática de excedentes.

## Pagamentos e renovação manual

Ainda não existe checkout, débito automático ou painel de cobrança. Somente o operador da plataforma, no Supabase do **portal**, pode executar as funções abaixo. Usuários da emissora não podem liberar créditos, recargas ou estornos. Confirme o recebimento antes de registrar qualquer pagamento. Não registre números de cartão, dados bancários ou credenciais na referência: use um identificador interno único.

1. Defina com o cliente o preço mensal, quantidade de créditos, vencimento e regra de não acúmulo.
2. Receba o pagamento pelo meio combinado (ex.: Pix).
3. Registre a referência, créditos e datas do ciclo pago. O primeiro registro ativa o modo de créditos da rádio. Um ciclo dura no máximo 32 dias; use as datas de aniversário acordadas, ajustando meses curtos.
4. A renovação exige novo pagamento e novo ciclo. Créditos mensais não usados expiram. Nenhum saldo é criado automaticamente por falta de pagamento.
5. Recargas são pré-pagas, ligadas ao ciclo atual e expiram junto com ele. Informe essa validade antes de vender. Não acumule saldo para o próximo mês.

Exemplo ilustrativo, **não executar como venda real** sem definir franquia e confirmar pagamento:

```sql
select public.portal_audio_pagamento(
 p_radio => 'UUID_DA_RADIO',
 p_referencia => 'recebimento-interno-unico',
 p_creditos => 500,
 p_inicio => '2026-11-04T00:00:00-03:00',
 p_fim => '2026-12-04T00:00:00-03:00'
);
```

Recarga no ciclo pago atual (usar o ID retornado na criação do ciclo):

```sql
select public.portal_audio_pagamento(
 p_radio => 'UUID_DA_RADIO',
 p_referencia => 'recebimento-recarga-unico',
 p_creditos => 100,
 p_ciclo => 'UUID_DO_CICLO_ATUAL'
);
```

A mesma referência com os mesmos valores é idempotente. Outra referência com datas sobrepostas é recusada. O mesmo pagamento não pode ser usado em ciclo e recarga. Não reduzir/editar o histórico para liberar saldo.

Conferência pelo operador:

```sql
select public.portal_audio_saldo('UUID_DA_RADIO');
select titulo,estado,caracteres,creditos,segundos,custo_estimado_usd,
       consumo_reportado,request_id,estornado_em
from public.portal_locucoes where radio_id='UUID_DA_RADIO'
order by criado_em desc;
```

Os custos em dólar são estimativas internas, não faturas. Concilie a cobrança real do fornecedor. Não são exibidos no painel do cliente.

Estorno após comprovar falha sem áudio (não estorna áudio pronto nem gera reembolso financeiro no fornecedor):

```sql
select public.portal_audio_estornar('UUID_DA_RADIO','UUID_DA_GERACAO',
 'Conferência do operador: falha confirmada, sem arquivo gerado. Referência interna ...');
```

## Compatibilidade e autorização de voz

Planos existentes continuam em piloto, com os limites anteriores; não foram concedidos 500 créditos nem iniciadas assinaturas pagas automaticamente. O limite do piloto é convertido para créditos por `floor(limite_caracteres/100)` e o histórico por `ceil(caracteres/100)` em cada geração. A franquia comercial só começa quando o operador registra o primeiro ciclo.

A marca do fornecedor foi retirada das mensagens usuais. Termo de autorização, PDF e informações de tratamento da voz mantêm a identificação do fornecedor. A voz clonada e o histórico anterior são preservados. Os consentimentos e a separação entre emissoras continuam obrigatórios.

Migração: `supabase/migrations/202611040010_creditos_locucao.sql`. Os testes usam banco local e fornecedor simulado; esta atualização não gera áudio pago.
