# Piloto de locução — etapa 1

Piloto publicado e testado em produção em 03/11/2026. Migrações 006 e 007 aplicadas ao projeto Portal (`amksnfyktkzewxcandpu`), com bucket privado e franquia RBN de 500 caracteres. Credenciais guardadas como segredos de produção na Vercel. Voz de catálogo Lax em português brasileiro vinculada somente à RBN; nenhuma clonagem própria realizada.

Uma geração real, ID `8b093a74-89dd-479b-9eb8-e4e861d32427`, enviou 230 caracteres do boletim demonstrativo. MP3 de 12,678 segundos (13 segundos no controle de franquia), reprodução completa sem erro, aprovação técnica e download verificados. Arquivo baixado em `C:/Users/User/Downloads/boletim-8b093a74-89dd-479b-9eb8-e4e861d32427.mp3` (conteúdo de demonstração, ainda sujeito à avaliação editorial pelo titular).

O registro inicial reservou 231 caracteres por incluir uma quebra de linha final; a migração 007 corrige a normalização para futuras gerações. O histórico inicial foi preservado. O provedor não enviou `x-character-count` nesse retorno, portanto consumo faturado está nulo e o custo mostrado é somente estimado. Não apresentar esse campo como fatura ou crédito efetivamente cobrado. Conferir o painel da ElevenLabs antes de definir preços comerciais.

## Uso

No editor, salve o boletim e abra **Gerar locução por IA**. Selecione voz de catálogo autorizada, ritmo (0,8 a 1,2) e estilo neutro/expressivo. O piloto lê títulos e textos dos blocos, até 3.000 caracteres. Não lê nome do boletim, fontes ou URLs. Cada nova geração consome novamente. Áudios anteriores preservam a versão do roteiro que foi lida.

Ouça a prévia até o fim, aprove e baixe o MP3. Histórico apresenta as últimas 50 gerações da rádio; os registros antigos continuam no banco. Prévia não aprovada continua acessível aos membros autenticados da emissora. Download oficial requer aprovação. Leitores podem ouvir e baixar áudios aprovados; editores e administradores geram e aprovam.

## Ativação técnica

1. Revisar/aplicar `supabase/migrations/202611030006_locucao.sql` **somente no projeto Portal**. Inclui bucket privado, tabelas com RLS e RPC restrita a service_role.
2. Configurar no servidor `AUDIO_ENABLED=true`, `ELEVENLABS_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca colocar essas chaves no navegador, arquivos públicos ou Git.
3. Administrador da infraestrutura cadastra `portal_audio_planos` com franquia de teste explícita e `ativo=true`. Por padrão não existe franquia nem autorização de excedentes.
4. Cadastrar em `portal_vozes` apenas voz de catálogo com licença compatível verificada, vinculada à rádio e evidência de licença. Marcar autorizada/ativa somente após conferência. Esta etapa **não permite cadastrar nem clonar voz de locutor**; há uma restrição no banco para `tipo=catalogo`.
5. Executar teste pago pequeno com autorização de consumo, verificar crédito faturado, pronúncia PT-BR, duração, quota, download e acesso entre duas emissoras. Não publicar franquias comerciais antes dessa medição.

O custo em USD é uma estimativa configurável por mil caracteres (referência inicial 0,08 para Multilingual v2, consultada em 03/11/2026), não uma fatura nem promessa de preço. Não inclui câmbio, impostos, assinatura, custos de armazenamento/transferência ou eventuais modificadores por voz. Verificar preços e licença efetivos da conta antes de ativar.

## Consumo e recuperação

A reserva é transacional e bloqueia a linha do plano por rádio; concorrência não ultrapassa a franquia. Cada solicitação reserva os caracteres e até 600 segundos; ao terminar, os segundos são substituídos pela duração medida dos frames MP3. A mesma chave de solicitação nunca dispara nova chamada ao provedor. O período é o mês civil em America/Sao_Paulo. O consumo retornado em `x-character-count` é armazenado separadamente, quando presente; não é tratado como crédito faturado.

Timeout, falha do provedor ou falha ao armazenar não liberam franquia automaticamente: o provedor pode ter cobrado. O registro fica incerto (ou processando se o processo for encerrado abruptamente) e demanda reconciliação pelo administrador com o histórico do provedor. Não há tentativa automática de regeneração. Arquivos eventualmente órfãos devem ser recuperados ou removidos após conferência. O limite de caracteres é conservado para todos os estados, inclusive falhas incertas.

## Limites conhecidos e próximas etapas

Geração síncrona limitada a 45s de resposta e 10 minutos de áudio: apropriada apenas ao piloto. Antes de uso comercial, migrar para fila/worker durável com reconciliação automática, retenção de arquivos e política de exclusão. O painel administrativo de custos, concessão de excedentes e gestão de franquias ainda não têm interface; dados e configuração ficam restritos à infraestrutura. Cada pedido exige espaço para uma reserva inteira de 600 segundos além do já utilizado; a franquia inicial de 600 segundos autoriza apenas uma geração enquanto houver consumo no mês. Não aumentar limites sem autorização comercial.

Clonagem com consentimento documentado, revogação e envio de amostras, área Vozes da emissora, trilhas, vinhetas, FFmpeg/ducking e normalização são etapas futuras. Nenhuma clonagem está habilitada neste piloto.

Referências oficiais: https://elevenlabs.io/docs/api-reference/text-to-speech/convert e https://elevenlabs.io/pricing/api
