# RADIOAR News — editor de jornais

Proposta de arquitetura, 05/11/2026. Documento de projeto; módulo ainda não implementado ou publicado.

## Diagnóstico do código atual

- `lib/supabase-handler.cjs` autentica a sessão, identifica uma única emissora ativa e protege escritas por perfil, origem e CSRF. Reaproveitar essa entrada.
- `/api/noticias` lê `portal_boletins.dados`, agrupado por editoria e fonte. Não é um catálogo histórico normalizado de matérias.
- `collector.cjs` limita a cinco destaques por fonte e elimina links repetidos. A amostra local `noticias.json` contém títulos, resumos e links; é antiga e não serve como seleção atual para exibição ao vivo.
- `portal_roteiros` guarda boletins com itens de título, texto, fonte e URL. O contador de versão evita sobrescritas concorrentes, mas não guarda cada versão anterior.
- `lib/revisao.cjs` revisa um texto de até 6.000 caracteres, preservando todos os números e citações. Seu contrato de revisão não serve para compor um jornal, selecionar assuntos ou resumir. Criar serviço próprio.
- A coleta atual não deve ser presumida como autorização de adaptação. Registrar autorização editorial de cada fonte antes de incluí-la na geração.
- Data de publicação, região e relevância precisam ser verificadas na saída atual do coletor e normalizadas com origem explícita. Data de coleta não equivale a data de publicação. Região desconhecida não pode ser preenchida por suposição silenciosa.

## Fluxo do protótipo

Botão **Produzir jornal** abre nome do jornal, espelho demonstrativo e escolhas **Criar com IA** / **Criar manualmente**. Preservar o boletim existente e a identidade da emissora; RADIOAR News identifica o novo módulo sem renomear toda a plataforma nesta etapa.

IA: selecionar e conferir notícias reais da coleta atual, mostrar lacunas e estimativa de custo, gerar blocos como rascunho. Manual: abrir o mesmo espelho vazio, sem chamada nem consumo de API. Ambos permitem editar, reordenar, substituir/remover notícias, salvar, consultar versões e exportar TXT.

### Espelho inicial: Jornal da Manhã, 60 minutos totais

| Bloco | Alvo |
|---|---:|
| Abertura e manchetes | 3min |
| Local e regional | 16min |
| Política e economia | 10min |
| Esportes | 7min |
| Tempo e serviços | 4min |
| Variedades e encerramento | 5min |
| Intervalos comerciais (distribuídos no espelho) | 15min |
| **Total do programa** | **60min** |

Conforme esclarecimento do usuário: uma hora de programa, com aproximadamente 45 minutos de conteúdo e 15 minutos de comerciais. A divisão entre editorias acima é uma proposta inicial ajustável, não uma duração confirmada por bloco. Intervalos têm posição e duração próprias; a IA não gera conteúdo para preencher o espaço comercial.

Alvo de fala a calibrar inicialmente em 140 palavras/minuto: aproximadamente 6.300 palavras para 45 minutos inteiramente falados. Entrevistas, comentários e vinhetas reduzem o espaço de texto gerado conforme sua duração no espelho. Mostrar separadamente tempo editorial, comercial e total; calcular a duração do texto e a diferença para o previsto. Se só houver resumos insuficientes, entregar roteiro menor e marcar a lacuna; jamais repetir ou inventar para completar os 45 minutos. Previsão meteorológica exige fonte e validade compatíveis com a edição.

### Ajuste de duração por bloco

Cada bloco editorial e cada intervalo comercial terá campos editáveis de minutos e segundos, tanto no espelho quanto na edição do jornal. O operador poderá aumentar ou reduzir o tempo individualmente, além de adicionar, excluir e reordenar blocos.

- Recalcular imediatamente os totais editorial, comercial e geral após qualquer alteração.
- Exibir a meta do programa (inicialmente 60 minutos), o total configurado e quanto falta ou excede. Permitir ajustar também a meta geral.
- Validar duração positiva em segundos inteiros. Bloco removido deixa de contar no total.
- Mostrar por bloco o tempo previsto e a estimativa de leitura do texto, com diferença entre os dois. Estimativa depende do ritmo de leitura configurado e não garante duração exata no ar.
- A geração por IA usa a duração prevista do bloco e desconta entradas manuais reservadas para entrevistas, vinhetas ou comentários. Não gera textos comerciais.
- Alterar a duração não corta, reescreve nem regenera automaticamente o roteiro. O usuário decide editar ou solicitar nova geração, com aviso de consumo antes da chamada.
- Ajuste na edição afeta somente aquele jornal. O modelo permanece igual; salvar como modelo é uma ação explícita, disponível quando a personalização de modelos for liberada.
- Exportar o espelho com duração prevista por bloco, intervalos e total. Aprovação editorial não deve ocultar diferenças de tempo pendentes.

## Arquitetura proposta

1. Interface própria `jornal.html` e módulo de navegação, sem substituir `boletim.html`.
2. API autenticada `/api/jornais` para rascunhos, versões, aprovação e exportação; `/api/jornal-geracoes` para reservar e executar uma geração por bloco. Nenhuma chave chega ao navegador.
3. Seleção no servidor a partir de notícias autorizadas da própria emissora. URL normalizada, similaridade de títulos e revisão humana para assuntos duplicados entre fontes. Relevância é critério editorial visível, não um fato fornecido pela IA.
4. Congelar uma seleção de fontes por edição antes de gerar. Cada bloco recebe apenas o conteúdo selecionado e referências estáveis. Sem navegação livre da IA nem busca externa.
5. Gerar primeiro os blocos noticiosos; depois abertura, manchetes, passagens e encerramento a partir dos textos aceitos. Passagens conectam temas sem criar relações causais, declarações ou fatos novos.
6. Usar Responses API com saída estruturada: trechos, tipo (notícia/passagem/manchete), IDs das fontes e alertas. Validar IDs contra a seleção; texto de fontes é dado não confiável, nunca instrução.
7. Execução por bloco para limitar tempo, custo e falhas. Persistir estado e permitir retomar blocos não enviados. Cliques duplicados usam a mesma chave idempotente; uma falha incerta exige conferência antes de nova cobrança.
8. Regeneração entrega sugestão comparável, preservando a versão editada até aceitação. Alterações concorrentes geram conflito em vez de apagar texto.
9. Aprovação humana explícita sobre uma versão imutável, com responsável e data. Nova edição/regeneração volta a rascunho. Exportação pode distinguir rascunho de aprovado.

## Modelo de dados proposto

Todas as relações usam `radio_id`, RLS e vínculos compostos que impeçam referências entre emissoras. Dados de auditoria e custos só podem ser escritos pelo servidor.

| Tabela | Conteúdo |
|---|---|
| `portal_jornal_modelos` | Nome, revisão do espelho, blocos ordenados, editorias, região e segundos previstos; inicialmente um modelo demonstrativo |
| `portal_jornal_fontes` | Fonte cadastrada, autorização de adaptação, finalidade, validade e responsável; não presumir licença pelo RSS |
| `portal_jornal_noticias` | ID estável, URL, fonte, editoria, região conhecida, publicação quando disponível, coleta, texto autorizado e hash |
| `portal_jornais` | Nome, data da edição, cópia do espelho, estado, versão atual, criador e datas |
| `portal_jornal_versoes` | Snapshot imutável do roteiro por blocos, autoria, versão anterior, aprovação e instante |
| `portal_jornal_referencias` | Versão, bloco, notícia e snapshot do texto efetivamente utilizado; links originais |
| `portal_jornal_geracoes` | Pedido idempotente, bloco, versão de origem, hashes, modelo, instruções versionadas, estado, duração, tokens reais, custo estimado e erro seguro |
| `portal_jornal_planos` | Limites mensais de gerações, tokens e orçamento por emissora, período de vigência e reservas |

Limites reservados atomicamente antes da chamada; reconciliar consumo real depois. Regenerações consomem franquia. Edição manual e exportação não chamam a API. Custos estimados usam tabela de preços datada e modelo efetivamente usado, não uma conversão fixa de caracteres em tokens.

## Fidelidade e revisão

Não reutilizar a validação de igualdade de TODOS os números da revisão atual: resumos legítimos omitem informações. Em vez disso, verificar números e declarações presentes na saída contra as fontes selecionadas, sinalizando alterações para revisão. Isso não comprova automaticamente veracidade, equivalência semântica ou nomes corretos. Aprovação humana continua obrigatória.

Mostrar fonte por notícia, texto de origem e alertas; passagens sem fatos podem ser identificadas como apresentação. Manchetes podem retomar uma notícia como recurso editorial, sem repeti-la integralmente em outro bloco. Não atribuir fala direta que não exista no conteúdo autorizado.

## Custos de planejamento

Modelo inicial de avaliação: `gpt-5.4-mini`, preço padrão consultado em 05/11/2026: US$0,75/milhão de tokens de entrada e US$4,50/milhão de saída.
Fonte: https://developers.openai.com/api/docs/models/gpt-5.4-mini

Cenários hipotéticos de SOMA das chamadas de uma edição, não medições nem orçamento validado para 45 minutos de conteúdo. O novo alvo exige recalcular os tokens após o primeiro teste:

| Entrada / saída | Custo por edição | 30 edições/mês |
|---|---:|---:|
| 20.000 / 5.000 tokens | US$0,0375 | US$1,125 |
| 40.000 / 8.000 tokens | US$0,066 | US$1,98 |

Não incluem regenerações, impostos, câmbio, hospedagem, banco ou atendimento. Uma nova geração completa de mesmo porte aproximadamente duplica esse consumo. Estes valores não definem preço de venda nem garantem qualidade. Registrar tokens reais do teste antes de definir franquia comercial. Não requer conta OpenAI por rádio: servidor pode usar um projeto com controle interno por emissora.

## Entrega e critérios de validação

1. Construir protótipo isolado e fluxo manual com espelho fixo, armazenamento, versões, referências e TXT.
2. Integrar geração por bloco, reservas e rastreamento de uso; manter desativada até migração e configuração.
3. Confirmar saldo da API e autorização das fontes. Última conferência de saldo foi zero; não há confirmação de recarga neste trabalho.
4. Testar com seleção atual real da própria emissora, sem usar a amostra antiga como notícia do dia. Registrar tamanho da base, duração obtida, tempo de cada chamada, tokens, custo, fontes e avaliação humana.
5. Testar acesso cruzado entre emissoras, versão concorrente, clique duplicado, falha parcial, quota, notícias insuficientes, edição e exportação. Guardar resultado e limitações.
6. Só depois de validar qualidade e fidelidade, disponibilizar múltiplos modelos editáveis por emissora.

Vozes e mixagem permanecem como etapa futura, dependente de aprovação editorial e consentimento de locutores. Nenhuma chamada paga, migração de banco, publicação ou alteração das funções atuais foi feita nesta análise.
