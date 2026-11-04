# Revisão de texto — 04/11/2026

O editor apresenta Revisar texto no lugar da locução. Seleciona um bloco, mostra o original e solicita uma sugestão. Só Usar texto revisado altera o rascunho; Salvar boletim continua necessário. Mudanças no bloco durante a solicitação bloqueiam a aplicação para evitar sobrescrever trabalho posterior. Nome do bloco, fontes e links não são substituídos.

Integração preparada com OpenAI Responses API e modelo configurável OPENAI_REVIEW_MODEL (padrão gpt-5.4-mini). Entrada de até 6.000 caracteres, saída de até 4.500 tokens e resultado até 9.000 caracteres, sem ferramentas externas nem busca. Instrução de preservação de fatos, sem resumir ou acrescentar dados. Comparação de números e declarações entre aspas bloqueia algumas alterações indevidas; não é garantia de checagem factual nem preservação perfeita de nomes. O jornalista deve revisar a sugestão.

OPENAI_API_KEY fica somente no servidor. store:false é enviado à API; isso não é uma promessa de retenção zero pelo fornecedor. A reserva guarda o hash do original; o resultado fica privado por rádio no banco. Conteúdo não é registrado no console.

Migração 202611040012_revisao_texto.sql cria planos e reservas por rádio/mês. Limite mensal é aplicado atomicamente no banco, com idempotência por chave e hash. Falhas ou respostas inseguras conservam a reserva para conferência. Sem reenvio automático. O consumo real de tokens é registrado quando informado pelo provedor. Franquias de revisão são independentes dos créditos antigos de áudio.

## Ativação pendente

1. O proprietário cria a conta/chave no painel da OpenAI e configura pagamento/limites diretamente no fornecedor. Não enviar a chave pelo chat ou Git.
2. Salvar OPENAI_API_KEY como Secret na Vercel, ambiente Production. Modelo padrão gpt-5.4-mini; usar OPENAI_REVIEW_MODEL para mudar explicitamente.
3. Definir plano de teste de forma limitada, por exemplo (ainda não é franquia comercial):

```sql
insert into public.portal_revisao_planos(radio_id,ativo,limite_mensal)
values('UUID_DA_RADIO',true,10)
on conflict(radio_id) do update set ativo=excluded.ativo,limite_mensal=excluded.limite_mensal;
```

4. Definir REVISAO_ENABLED=true e republicar. Validar uma revisão real com autorização do proprietário antes de liberar clientes.
5. Conferir consumo/faturamento e só então definir preço e franquia comercial.

Até concluir chave, plano e flag, a interface informa revisão em configuração e não chama IA. Os testes automatizados usam provedor simulado, sem consumo pago.

## Vozes pausadas e conteúdo antigo

AUDIO_ENABLED=false e VOICE_CLONING_ENABLED=false foram configurados na produção, e navegação/arquivos públicos de voz foram retirados do build. Código antigo e credenciais continuam privados para eventual retomada; não há revogação da conta do fornecedor. A API conserva compatibilidade com arquivos antigos, sem novas gerações/clonagens.

Por solicitação do usuário, os boletins e áudios existentes da RBN foram retirados por exclusão recuperável no banco. O histórico de consumo e os objetos privados não foram apagados permanentemente. O projeto CRM não foi alterado.
