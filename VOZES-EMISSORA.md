# Vozes da emissora — clonagem instantânea

Área publicada em 03/11/2026 em `/vozes.html`, vinculada no menu e no editor. Migrações 008 e 009 aplicadas no Supabase exclusivo do Portal. RBN preparada com limite piloto de um clone; a chave atual ainda precisa da permissão de escrita de vozes e `VOICE_CLONING_ENABLED` permanece desativado por ausência. Cadastro e guarda privada dos documentos estão disponíveis.

Usa a mesma sessão, proteção de origem/CSRF e vínculo de rádio do portal. Somente administrador gerencia os locutores; editores utilizam as vozes liberadas nos boletins. Nenhuma clonagem de pessoa real foi feita durante a implementação: faltam a amostra e a autorização do locutor. Não confundir testes locais do protocolo, consentimento e RLS com uma clonagem real já validada no provedor.

## Fluxo

1. Nome do locutor, responsável pela conferência, validade futura, canal de revogação, regras sobre áudios antigos e guarda dos documentos.
2. Upload obrigatório de autorização assinada em PDF (até 250 KB) e amostra MP3 padrão MPEG-1 Layer III (1 a 3 minutos, até 1 MB). Sugestão: um minuto de fala limpa em 44,1 kHz, sem música nem outras pessoas. A validação técnica não comprova que o conteúdo é de um único locutor nem que a assinatura é autêntica; essa conferência é responsabilidade expressamente assumida pelo administrador.
3. O administrador declara que o documento contém o consentimento expresso para finalidade, prazo e transferência à ElevenLabs. São guardados o texto e a versão das regras, os hashes SHA-256, a conta responsável, o horário e os arquivos privados.
4. Cadastro não envia arquivos à ElevenLabs. O botão **Solicitar clonagem** exige confirmação específica de envio. A transação bloqueia tentativas simultâneas e o limite de clones da rádio. O PDF não é enviado ao provedor; somente a amostra autorizada.
5. O clone nasce inativo. Se o provedor exigir verificação, o próprio locutor a conclui na ElevenLabs; o portal não resolve captchas, não contorna verificações e não aceita uma declaração do navegador como prova.
6. **Conferir verificação** consulta a API do provedor. A ativação exige consentimento atual e verificação aceita, além da confirmação do administrador. Segurança BAN/CAPTCHA mantém a voz bloqueada.
7. **Testar locução** abre um roteiro de teste editável. O administrador salva e gera pelo fluxo existente, consumindo a mesma franquia da emissora. Não há geração automática nem franquia ilimitada de testes.
8. Desativar suspende o uso. Revogar registra a revogação e impede reativação no mesmo cadastro. Vencimento bloqueia novas reservas automaticamente no banco, inclusive se uma janela antiga ainda mostrar a voz. Solicitações já enviadas ao provedor podem terminar; as novas ficam bloqueadas.

## Implantação

Aplicar `supabase/migrations/202611030008_vozes_emissora.sql` e `202611030009_storage_vozes_privado.sql` apenas ao projeto Portal, depois de 006 e 007. Mantêm as vozes de catálogo existentes, criam tabelas de locutores/auditoria com RLS, bucket privado e visão de vozes disponíveis; atualizam a reserva de locução para conferir consentimento e verificação a cada pedido. Identificadores de clones não podem ser reutilizados em outra rádio. A política restritiva de Storage impede acesso direto pelos usuários aos arquivos privados mesmo diante de uma política permissiva mais ampla; o servidor faz a conferência da emissora e do papel antes de servir um arquivo.

`VOICE_CLONING_ENABLED` é **false por ausência**. Antes de liberar o envio real:

- Conferir a conta ElevenLabs, os espaços de voz e as condições de uso. A modalidade profissional exige que o dono da voz crie e verifique a voz na própria conta; não está integrada nesta etapa.
- A chave no servidor precisa de **Vozes: Escrita**, além de leitura e Text to Speech. Não ampliar as demais permissões. A mudança deve ser autorizada pelo titular da conta.
- Definir `portal_audio_planos.limite_vozes` explicitamente; padrão zero, teto 20. Inclui clones remotos, desativados e pedidos incertos para não prometer espaços liberados sem confirmação. Não aumentar franquias de áudio automaticamente.
- Configurar `VOICE_CLONING_ENABLED=true` na produção e republicar somente quando as permissões e o primeiro consentimento estiverem prontos.

O campo `limite_vozes` é um limite da plataforma, não o saldo de espaços da ElevenLabs. O provedor pode ter um limite menor. Há no máximo 20 cadastros por emissora, protegidos por bloqueio transacional no banco. O JSON com arquivos em base64 cabe no limite de 2 MB do portal; amostras maiores exigirão upload assinado/resumível em uma etapa futura.

## Recuperação e retenção

Uma falha depois do início da chamada remota deixa o cadastro `incerta`, sem repetir automaticamente. Pode existir um clone remoto mesmo sem resposta; o administrador da plataforma deve conferir a conta antes de reconciliar. Não há botão de repetição automática. O endpoint não aceita IDs arbitrários de voz enviados pelo navegador.

Revogação não exclui automaticamente o clone do provedor nem os arquivos/áudios históricos: bloqueia o uso no portal. A emissora deve cumprir o destino e o prazo de guarda acordados com o locutor, e encaminhar pedidos de eliminação. Downloads dos documentos e amostras exigem administrador da própria rádio, são enviados como anexos e geram eventos de auditoria. Exclusão remota e gestão automática de retenção ficam pendentes; não apresentar esta etapa como assinatura eletrônica certificada ou cumprimento jurídico integral automatizado.

## Referências oficiais consultadas em 03/11/2026

- https://elevenlabs.io/docs/api-reference/voices/ivc/create
- https://elevenlabs.io/docs/api-reference/voices/get
- https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/instant-voice-cloning
- https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning
