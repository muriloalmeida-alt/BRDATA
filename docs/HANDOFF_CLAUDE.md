HANDOFF_CLAUDE — Demandas vigentes e histórico

As regras de governança deste Handoff estão definidas em
docs/README_HANDOFF.md. Claude deve consultar o README_HANDOFF.md
para conhecer as regras (responsabilidades, fluxo, estados, escopo,
divergências, aprovação) — elas não são repetidas aqui.

⸻

Demandas vigentes

S5-DIL-001 — Motor de Dilemas (Fase 1 de "A Semana do Treinador")

Status: PRONTO PARA IMPLEMENTAÇÃO

Registrado em 27/10/2026 a pedido do Murilo ("registre a Fase 1"),
a partir da proposta de design "A Semana do Treinador" (conversa de
26/10/2026, mockups das 4 telas publicados como artefato). Só a Fase 1
é demanda; as Fases 2–5 abaixo são visão, não escopo aprovado.
Sprint: S5 — Loop de carreira (primeira demanda da Sprint)
Prioridade: P1 (CLAUDE.md §47 — Game Engine: profundidade + explicabilidade)
Etapa do loop (CLAUDE.md §11): Events — avaliado no fim de cada rodada,
depois de Finances/Player Evolution e antes de News/Notifications.

Objetivo

Transformar situações que hoje o jogador só descobre se for procurar
numa tela (insatisfação, proposta recebida, contrato acabando, meta do
conselho em risco) em **dilemas**: cartões que chegam até ele, com
rosto, contexto, 2–3 escolhas com consequência anunciada e efeito
**lembrado** pelo jogo. Uma decisão não é mais "um botão de moral"; é um
compromisso que volta a cobrar depois.

Contexto

* A proposta "A Semana do Treinador" tem 4 pilares (Semana, Dilemas,
  Vestiário, Partida). Dilemas vêm primeiro porque são a base que os
  outros consomem (a Semana mostra dilemas do dia; a Partida gera
  dilemas no live) e porque o risco de UI é o menor — reaproveitam
  sistemas e overlays existentes.
* Fases futuras (não fazem parte desta demanda): 2 Semana como linha do
  tempo (nova Central); 3 Partida (momentos de decisão no live, discurso
  do intervalo, manchete pós-jogo); 4 Vestiário + quadro tático unificado;
  5 Legado (linha da vida do técnico/jogadores).

Problema (verificado no código de `main` @ `6be4e6c`)

1. **Decisões sem memória.** `applyTalkOption()` (`public/js/carreira.js`,
   ~l.1313) — "prometer" dá +10 de moral e zera `benchStreak`, e o
   próprio comentário registra que **não rastreia promessa cumprida ou
   não**. Exploit (CLAUDE.md §29): prometer toda rodada mantém o
   jogador satisfeito para sempre sem nunca escalá-lo (limitado só por
   `lastTalkRound`, 1 conversa/rodada).
2. **Sistemas dispersos, descoberta passiva.** Conversa (`canTalkTo`/
   `openTalkModal`), proposta por jogador (`maybeGenerateOffer`/
   `openPlayerOfferModal`), proposta de clube (`maybeGenerateClubProposals`),
   contrato (`computeContractFields`, tela Contratos), metas
   (`openBoardGoalsScreen`) e coletiva (`openPressConferenceModal`) têm
   gatilhos e telas próprios; não há um lugar que diga "isto precisa de
   você agora" nem cooldown comum.
3. Não existe `schemaVersion` no save (0 ocorrências) — migração hoje é
   só `migrateCareerDefaults()` com `if (x === undefined)`.

Escopo

1. **Event Engine mínima** (CLAUDE.md §28): definição declarativa de
   dilema = `id`, `trigger` (função pura sobre `CAREER` → candidatos),
   `conditions`, `options[]` (rótulo, consequência anunciada em texto,
   `effect`), `cooldown` (em rodadas, por dilema e por jogador),
   `expiresIn` (rodadas até expirar sem resposta, com efeito default).
2. **6 dilemas iniciais**, todos usando estado/funções que já existem:
   | # | Dilema | Gatilho (existente) | Opções (efeito) |
   |---|---|---|---|
   | D1 | Jogador insatisfeito no banco | `benchStreak >= TALK_BENCH_STREAK_THRESHOLD` ou moral ≤ 30 (`canTalkTo`) | Prometer titularidade (cria **compromisso**) · Pedir paciência · Liberar para negociar (`wantsTransfer`/listagem existente) |
   | D2 | Proposta por um jogador seu | oferta gerada por `maybeGenerateOffer` | Aceitar · Recusar (moral do jogador cai se ele queria sair) · Contraproposta (fluxo existente) |
   | D3 | Contrato acabando | ≤ 1 temporada restante (`computeContractFields`) em titular ou jovem promissor | Renovar agora (abre `renewOverlay`) · Deixar para depois (risco de perder de graça) · Vender |
   | D4 | Meta do conselho em risco | progresso das metas da diretoria abaixo do ritmo | Assumir publicamente (confiança ± maior) · Pedir paciência (confiança cai pouco agora) |
   | D5 | Lesionado quer voltar antes | lesão existente em titular, ≤ 1 rodada restante | Liberar (risco de recaída) · Segurar (moral −) |
   | D6 | Joia da base pede chance | jogador da base com potencial alto e sem minutos | Subir ao profissional · Emprestar (fluxo de empréstimo) · Manter na base (moral −) |
3. **Compromissos** (corrige o Problema 1): "Prometer titularidade"
   grava `{ playerId, type: "titular", madeRound, dueRound, minStarts }`.
   No prazo, se cumprido → moral +, notícia positiva; se quebrado →
   moral cai **mais** do que a promessa deu e o jogador fica com
   `wantsTransfer` mais cedo. Não é possível ter 2 promessas abertas ao
   mesmo jogador. O botão "prometer" do `talkOverlay` passa a usar o
   mesmo compromisso (sem segunda implementação — CLAUDE.md §5).
4. **UI — DilemmaCard**: cartão com foto/escudo, frase em primeira
   pessoa, contexto em 1 linha (dado real: "5 jogos no banco"), opções
   com consequência visível antes de tocar. Entrega:
   * fila de dilemas pendentes no topo da Central (substitui a
     necessidade de procurar o jogador no Elenco);
   * abre em bottom sheet (padrão `.ct-modal-overlay` existente,
     tokens `--m3-*`, sem estilo isolado);
   * badge na navegação inferior quando há dilema pendente;
   * resolver gera feedback (toast) + entrada em Notícias quando
     relevante; "ver detalhes" leva à tela existente correspondente.
5. **Persistência e migração**: `CAREER.dilemmas = { pending: [],
   commitments: [], cooldowns: {} }` com default em
   `migrateCareerDefaults()`; introduzir `CAREER.schemaVersion` (save sem
   o campo = v1; esta demanda grava v2) e uma função de migração
   v1 → v2 explícita (primeiro passo do `migrateCareer` do CLAUDE.md
   §10). Histórico de dilemas resolvidos **não** é guardado inteiro: só
   cooldowns e compromissos abertos (limite de 768 KB, §9).
6. **Determinismo**: escolha de quais dilemas aparecem na rodada usa
   RNG semeado pelo estado da rodada (mesma seed → mesmos dilemas).
   Máx. 2 dilemas novos por rodada.

Fora de escopo

* Fases 2–5 da proposta (linha do tempo da semana, momentos de decisão
  no live, vestiário, quadro tático, legado).
* Mudar fórmula de moral, força de equipe, mercado ou finanças além do
  efeito explícito de cada opção.
* Remover as telas/fluxos atuais (Conversa, Contratos, Metas, propostas):
  continuam acessíveis e funcionando; o dilema é um novo caminho até elas.
* Dilemas para clubes da CPU (a IA não "responde dilemas" nesta fase).
* Som/háptico.

Dependências

* S4 (Redesign Mobile) — bottom sheets e tokens navy+lima já em `main`
  (PR #47 e blocos). Nenhuma demanda aberta bloqueia.

Requisitos

R1. Cada dilema é testável isoladamente: `trigger(CAREER)` puro, sem
    DOM; efeito aplicado por função que recebe estado e retorna delta.
R2. Toda opção mostra a consequência **antes** da escolha (§34/§45).
R3. Dilema expirado aplica o efeito default anunciado (ignorar também é
    decisão) e respeita cooldown.
R4. Nenhum dilema se repete para o mesmo jogador/contexto dentro do
    cooldown; promessa só pode ser feita de novo depois de resolvida.
R5. Save antigo (sem `dilemmas`/`schemaVersion`) carrega sem erro e
    vira v2; save v2 recarrega idêntico.
R6. Mobile first: cartão legível e operável com uma mão a 390×844.

Critérios de aceite

1. Os 6 dilemas disparam pelos gatilhos da tabela, num save de teste
   montado para cada caso, e não disparam fora deles.
2. Promessa de titularidade: cumprida → moral sobe; quebrada → moral
   cai mais do que subiu e `wantsTransfer` é antecipado. O exploit
   "prometer toda rodada" deixa de funcionar (teste dedicado).
3. "Prometer" pelo `talkOverlay` e pelo dilema D1 produzem o mesmo
   compromisso (uma implementação só).
4. Máx. 2 dilemas novos por rodada; mesma seed → mesmos dilemas.
5. Save v1 (antigo), save incompleto e save grande carregam e migram
   para v2 sem perder dados; payload continua abaixo de 768 KB.
6. Fila na Central + badge na nav + bottom sheet aparecem e somem
   conforme o estado; resolver gera toast e, quando relevante, notícia.
7. Fluxos antigos (Conversa, Contratos, Metas, propostas) seguem
   passando nos testes existentes.
8. `npm run test:fast` e `npm run test:full` verdes (exceto
   intermitentes já conhecidos, listados no relatório); testes novos
   seguem `tests/e2e/README.md` (`check()`, espera por estado).
9. Capturas 390×844 e 1280×800 do DilemmaCard e da fila no relatório.

Riscos

* **Fadiga de decisão**: dilemas demais viram ruído → teto de 2/rodada
  e cooldown; balancear olhando uma temporada inteira (§30).
* **Exploit de expiração**: deixar expirar não pode ser sempre a opção
  ótima → efeito default nunca é neutro.
* **Monólito**: `carreira.js` tem ~16 mil linhas → motor de dilemas em
  bloco próprio e coeso (candidato a primeiro módulo extraído, §40), sem
  refatorar o resto.
* Migração de schema é a primeira explícita do projeto — testar save
  antigo real, não só sintético.

⸻

S4-AUDIT-BACKLOG-001 — Auditoria de prontidão das demandas #12 a #21

Status: APROVADO

Decisão do PM (Murilo, 10/09/2026): os 4 critérios de aceite foram
cumpridos — as 10 demandas têm veredito com evidência (tabela abaixo),
9 foram formalmente aprovadas (#12,13,14,15,16,17,18,19,21 — #14 com
2 divergências de design resolvidas, ver seção `S4-B2-003`), 1 foi
redefinida com mini-spec nova (`S4-B3-004`/#20, tela não existia), e a
cadeia de dependências foi revalidada sem quebras. Auditoria concluída.
Sprint: S4 — Redesign Mobile
Fase: pós-implementação transversal (Batch 2 + Batch 3) — auditoria de
consolidação. Substitui a demanda anterior desta seção, que era
`S4-B4-000` (auditoria das 7 telas do Batch 4) — reescopada a pedido
do Murilo. Correção (mesmo pedido, 10/09/2026): esta é uma auditoria
**pós-implementação**, não um gate pré-implementação — ver Objetivo e
Contexto abaixo, ajustados.
Prioridade: P1

Objetivo

Depois que uma ou mais das 10 demandas já especificadas e abertas como
issue — `S4-B2-001` (#12), `S4-B2-002` (#13), `S4-B2-003` (#14),
`S4-B2-004` (#15), `S4-B2-005` (#16), `S4-B3-001` (#17), `S4-B3-002`
(#18), `S4-B3-003` (#19), `S4-B3-004` (#20), `S4-B3-005` (#21) — forem
implementadas por qualquer sessão, auditar o resultado real entregue:
confirmar o que foi de fato implementado/aprovado/mesclado, atualizar
o handoff de acordo, e revalidar a cadeia de dependências entre as
demandas restantes à luz do que já foi concluído.

Contexto

Esta sessão especificou as 10 demandas acima em sequência, sem
implementar nenhuma delas diretamente — mas já se confirmou 2 vezes
que sessões de implementação externas pegam demandas do handoff e as
executam sem avisar esta sessão em tempo real: `S3-DS20-S4-PREP-001` e
`S3-DS20-S4-PREP-002` foram ambas implementadas, aprovadas e mescladas
em `main` por sessões separadas — a segunda só foi descoberta porque o
Murilo pediu explicitamente pra verificar ("Veja se Perfil de Jogador
não está liberado").

Esta auditoria **não é um gate antes do trabalho começar** —
implementações acontecem de forma assíncrona, por sessões que este PM
não controla nem consegue bloquear (o próprio precedente de
PREP-001/002 mostra isso: aconteceram sem aviso, não depois de uma
autorização prévia). É, em vez disso, o processo de **consolidação que
roda depois** que qualquer uma das 10 demandas for implementada —
formalizando como demanda o mesmo processo que já foi feito
manualmente pra PREP-001/PREP-002 (checar branch/commit, confirmar
status real, atualizar o handoff, revalidar dependências), em vez de
depender de alguém lembrar de pedir a checagem.

Escopo

Quando uma ou mais das 10 demandas tiver sido implementada, Claude
deve, para cada uma que tiver progresso:

1. Verificar se existe branch, commit ou Pull Request associado no
   repositório (mesmo processo usado quando se confirmou que
   `S3-DS20-S4-PREP-002` já estava implementada) — buscar por
   referências relacionadas ao ID da demanda ou ao seu conteúdo.
2. Confirmar o status real (em implementação? pronta pra revisão? já
   aprovada e mesclada?) e atualizar a seção correspondente do handoff
   de acordo — mesmo tratamento dado a `S3-DS20-S4-PREP-002` quando
   sua conclusão foi descoberta.
3. Para as demandas que ainda não tiverem nenhum progresso: confirmar
   que a especificação continua válida — inspecionar a implementação
   atual da tela/componente relacionado e confirmar que nada mudou
   desde a especificação original que invalide o escopo, as
   dependências ou os riscos descritos nela.
4. Revalidar a cadeia de dependências entre as demandas à luz do que
   foi encontrado — em particular, se alguma das demandas do Batch 3
   já pode prosseguir porque `S4-B3-001` foi concluída, ou se a ordem
   recomendada precisa mudar dado o estado real.
5. Registrar, por demanda, um veredito único: "sem progresso externo,
   especificação continua válida" / "sem progresso externo,
   especificação precisa de ajuste (detalhar o quê)" / "progresso
   externo encontrado (detalhar o estado e a atualização feita no
   handoff)".
6. Produzir um relatório consolidado nesta mesma seção do handoff,
   com a lista das 10 demandas e o veredito de cada uma.
7. Retornar `REVISÃO DO PM NECESSÁRIA`.

Fora de escopo

* implementar qualquer coisa nova — mudanças de código só acontecem
  se decorrerem diretamente de uma demanda já aprovada encontrada com
  progresso pendente de finalização (mesmo tratamento que
  `S3-DS20-S4-PREP-001` recebeu quando sua aprovação foi processada);
* a auditoria original das 7 telas do Batch 4 (Onboarding, Comparar
  jogadores, Eixos táticos, Marcação individual, Meus esquemas,
  Notícias/Eventos, Histórico/Estatísticas) — não faz mais parte desta
  demanda (era o escopo de `S4-B4-000`, substituído); se ainda for
  necessária, precisa virar uma demanda própria depois desta.

Dependências

* as 10 demandas em si (`S4-B2-001` a `S4-B2-005`, `S4-B3-001` a
  `S4-B3-005`), já especificadas em `docs/HANDOFF_CLAUDE.md` e como
  issues #12-#21 — pelo menos uma delas precisa ter algum progresso
  real (branch/commit/PR) pra esta auditoria fazer sentido; se nenhuma
  tiver, o resultado é só confirmar que todas as specs continuam
  válidas, sem muito mais a fazer.
* `docs/sprints/S4/S4_REQUISITOS_VIGENTES.md`.

Requisitos

Mesma sequência obrigatória de sempre: inspecionar → localizar →
entender → planejar → (alterar só se decorrer de aprovação já
concluída) → testar (se houver alteração) → revisar. Cada veredito
deve vir com evidência real (branch/commit encontrado, ou trecho de
código conferido), mesmo rigor da S3.2.7 original — não presunção.

Critérios de aceite

* as 10 demandas têm veredito registrado, cada um com evidência;
* qualquer progresso externo encontrado está refletido no handoff
  (status atualizado, movido pro Histórico se aprovado);
* qualquer especificação desatualizada está corrigida ou marcada pra
  correção;
* a cadeia de dependências entre as demandas foi revalidada.

Validações

O PM deverá validar: cobertura das 10 demandas, qualidade da evidência
por trás de cada veredito, qualquer atualização de status feita no
handoff, coerência da cadeia de dependências revalidada.

Riscos

* baixo — é auditoria/verificação de estado, mudança de código só
  ocorre se decorrer de algo já formalmente aprovado e ainda não
  processado.

Observações

Esta demanda existe pra formalizar, como processo repetível, o mesmo
tipo de checagem que já foi feita manualmente 2 vezes nesta sessão
(progresso externo descoberto depois do fato) — não é um bloqueio
antes de qualquer trabalho começar, é a consolidação que roda depois
que ele acontecer. Especificar novas demandas em cima das #12-#21 não
precisa esperar esta auditoria — ela existe pra manter o handoff
alinhado com a realidade à medida que implementações forem
acontecendo, não pra travar o fluxo até rodar.

Relatório consolidado (auditoria, 10/09/2026)

Todas as 10 demandas tinham progresso real no momento desta auditoria
— nenhuma foi encontrada "sem progresso" (não existe o caso "sem
progresso, spec continua válida"/"sem progresso, spec precisa de
ajuste" nesta rodada). Evidência coletada por demanda: `git branch -r`
+ `git log origin/main..origin/<branch>` (confirma cada branch existe,
o commit exato, e quantos commits à frente de `main`), `list_pull_requests`
(nenhum PR aberto pra nenhuma das 10 — confirmado 2x, antes e depois
desta auditoria) e `get_comments` em cada uma das 10 issues (exatamente
1 comentário em cada — o meu próprio relatório técnico; nenhuma
resposta ou aprovação do usuário ainda em nenhuma delas).

| # | Demanda | Branch | Commits à frente de `main` | Veredito |
|---|---|---|---|---|
| #12 | `S4-B2-001` | `claude/s4-b2-001-loading` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #13 | `S4-B2-002` | `claude/s4-b2-002-login` | 1 | Progresso externo encontrado — implementada (sem mudança de código), aguardando revisão. Proposto: APROVADO |
| #14 | `S4-B2-003` | `claude/s4-b2-003-tatica` | 1 | Progresso externo encontrado — parcial, 2 divergências aguardando decisão do PM. Proposto: ADJUSTMENTS REQUIRED |
| #15 | `S4-B2-004` | `claude/s4-b2-004-treino` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #16 | `S4-B2-005` | `claude/s4-b2-005-perfil` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #17 | `S4-B3-001` | `claude/s4-b3-001-transfer-contract-card` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #18 | `S4-B3-002` | `claude/s4-b3-002-mercado` | 3 (empilhada sobre #17) | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #19 | `S4-B3-003` | `claude/s4-b3-003-negociacao` | 4 (empilhada sobre #17/#18) | Progresso externo encontrado — implementada, corrigiu bug crítico pré-existente. Proposto: APROVADO |
| #20 | `S4-B3-004` | `claude/s4-b3-004-contratos` | 5 (empilhada, só docs) | Progresso externo encontrado — bloqueada por decisão de produto, nenhum código alterado. Proposto: BLOQUEADO |
| #21 | `S4-B3-005` | `claude/s4-b3-005-matchcard-financialsummary` | 6 (empilhada sobre as anteriores) | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |

("Progresso externo" no sentido da demanda original — trabalho que
esta auditoria encontrou pronto, não necessariamente de uma sessão
diferente; nestes 10 casos específicos, o trabalho foi feito pela
mesma linha de sessões deste handoff, mas a auditoria trata a
verificação do mesmo jeito independente de quem implementou, que é o
ponto do processo.)

Cadeia de dependências revalidada:

* `S4-B3-002`/`003` dependiam de `S4-B3-001` (TransferCard) como
  bloqueante — confirmado: ambas as branches partem de
  `claude/s4-b3-001-transfer-contract-card` (empilhadas de propósito,
  não paralelas), então o TransferCard que elas consomem já é o mesmo
  código, sem risco de divergência entre "o que `S4-B3-001` propôs" e
  "o que `S4-B3-002`/`003` realmente usam".
* `S4-B3-004` dependia de `ContractCard` (`S4-B3-001`) — o componente
  existe, mas a dependência real que bloqueia é outra (a tela em si
  não existe), então a conclusão de `S4-B3-001` não desbloqueia
  `S4-B3-004` sozinha, como o relatório daquela demanda já registrou.
* `S4-B3-005` era o pré-requisito declarado de "Resumo da rodada" —
  confirmado concluído; "Resumo da rodada" pode ser especificada como
  demanda própria a qualquer momento agora, não depende de mais nada.
* Nenhuma dependência quebrada ou invalidada foi encontrada — a ordem
  de execução usada (Batch 2 em sequência, depois `S4-B3-001` antes de
  `002`/`003`/`004`, `S4-B3-005` em paralelo por ser independente)
  continua fazendo sentido.

Risco de coordenação identificado (não é sobre as 10 demandas em si):
`docs/sprints/S4/S4_REQUISITOS_VIGENTES.md` foi movido de
`docs/requirements/ui-ux/` pra `docs/sprints/S4/` por uma sessão
paralela (commit `ce2a25b`, depois de todas as 10 branches acima terem
sido criadas) — as 10 branches ainda editam o arquivo no caminho
antigo. Isso vai gerar um conflito de rename no merge (não um
conflito de conteúdo — o `git mv` deve resolver automaticamente na
maioria dos casos, mas quem for mesclar deve conferir). Registrado
aqui, não corrigido nas branches (mudar o caminho editado em 9
branches já com relatório fechado estaria fora do escopo desta
auditoria — é um ajuste mecânico pro momento do merge, não uma
mudança de conteúdo).

Decisão do PM (Murilo, 10/09/2026): aprovadas 8 das 10 demandas
auditadas (#12, #13, #15, #16, #17, #18, #19, #21) — todas mescladas
em `main` nesta sessão, ver `Histórico` abaixo. `S4-B2-003` (#14)
ficou como `AJUSTES NECESSÁRIOS` até o PM decidir as 2 divergências
registradas — decidido em seguida (mesma sessão do usuário) e também
mesclada. `S4-B3-004` (#20) ficou `BLOQUEADO` até decisão de produto
sobre a tela Contratos — o PM escolheu "criar do zero"; implementada
e aguardando revisão (ver seção própria acima). Risco de coordenação
do rename de `S4_REQUISITOS_VIGENTES.md` confirmado e resolvido
manualmente em cada merge, sem perda de conteúdo.

⸻

Histórico

Demanda	Data	Commit	Changelog
S4-B5-QA-001 — Batch 5: QA Visual/UX transversal (fecha a S4)	26/10/2026	branch `claude/s4-b5-qa-001` (`09a967b`)	docs/project/CHANGELOG.md (v11.0.0)

S4-B5-QA-001 — Batch 5: QA Visual/UX transversal — fecha a S4

Status: APROVADO
Sprint: S4 — Redesign Mobile
Fase: Batch 5 (QA Visual/UX) — última etapa, fecha a Sprint por inteiro
Prioridade: P1
Issue: https://github.com/muriloalmeida-alt/FitOS/issues/37

Objetivo

Revisão transversal do redesign inteiro — as 18 telas migradas (Batch
2 + Batch 3 + Batch 4) e os 5 componentes formalizados (PlayerCard,
MatchCard, TransferCard, ContractCard, NewsCard) — conforme
`docs/sprints/S3/S3_S4_MATRIZ_TELAS_MOBILE.md` (Batch 5 — QA Visual/
UX, §35 Critérios gerais de aceite). Não é uma tela nova nem um
componente novo: é a auditoria que confirma que o conjunto migrado
tela por tela também funciona como um TODO coerente, e fecha
formalmente a Sprint S4 — Redesign Mobile.

Contexto

Cada demanda de migração (S4-B2-*, S4-B3-*, S4-B4-*) validou sua
própria tela isoladamente — nenhuma validou consistência CRUZADA entre
telas, nem os eixos transversais que só aparecem quando se olha o
app inteiro (densidade de toque, ordem de leitura, uso de emoji como
ícone em vez de asset, ARIA). A matriz original já previa esta etapa
como item separado, com critérios de aceite próprios (§35): Layout,
Componentes, Interação, Acessibilidade, Produto.

Gaps já conhecidos e registrados ao longo da Sprint, que esta
auditoria deve confirmar/reavaliar com evidência (não presumir que
continuam do jeito que foram registrados — o app mudou muito desde
então):

* uso de emoji como ícone de interface (262 ocorrências na contagem
  original da S3.2.7) — nunca tratado como projeto isolado, conforme
  decidido; confirmar estado atual;
* densidade de ARIA geral baixa (achado original da S3.2.7);
* `LeagueTable` — único dos 6 BRDATA Product Patterns do CLAUDE.md §7
  ainda sem componente formal (segue tabela HTML tradicional,
  confirmado em `S4_REQUISITOS_VIGENTES.md` §3);
* `.icon-btn` abaixo de 48dp (área de toque);
* divergências já decididas mas que precisam ser conferidas como
  aplicadas de forma CONSISTENTE em todo o app, não só na tela que as
  originou: tipografia Rajdhani/Bebas Neue como BRDATA Extension
  (decidido em `S4-B2-003`, também usado em `S4-B2-004`/`S4-B4-004`/
  `S4-B4-005`) e verde do gramado como BRDATA Extension;
* setas de tendência (▲/▼) do Perfil do jogador, registradas como
  divergência aberta em `S4-B2-005` (token `--brd-*` sem equivalente
  `--m3-*` estabelecido) — nunca resolvida;
* falhas de teste pré-existentes já confirmadas (via `git stash`, não
  regressão de nenhuma demanda) em múltiplos relatórios ao longo da
  Sprint — `test_cup.js`, `test_tabela_modal.js`, 2 checks de
  `test_intervalo_noticias_proposta_destino.js`, 1 flake em
  `test_noticias_fullscreen_fluxo.js` — consolidar essa lista aqui,
  confirmar quais ainda procedem, e decidir (registrar decisão, não
  resolver sozinho se for grande) o que entra nesta demanda vs. vira
  demanda própria de dívida técnica.

Escopo

Chapéu implementador deve, para o conjunto das 18 telas + 5
componentes:

1. Layout: confirmar ausência de zoom horizontal, conteúdo cortado,
   hierarquia clara, CTAs identificáveis — em telas reais, mobile-
   first, não só nas que tiveram teste E2E dedicado.
2. Componentes: confirmar reuso real dos 5 componentes formalizados
   (nenhuma duplicação nova introduzida durante a Sprint), uso de
   tokens `--m3-*` consistente, estados (vazio/erro/carregando)
   tratados onde aplicável, ausência de padrão paralelo sem
   justificativa registrada.
3. Interação: áreas de toque adequadas (confirmar `.icon-btn` com
   evidência, não presunção), feedback presente, navegação
   consistente entre as 18 telas, ações críticas claras.
4. Acessibilidade: contraste adequado, labels quando necessário,
   informação não dependente só de cor, ordem de leitura lógica —
   medir a densidade real de ARIA (não só repetir o número da S3.2.7
   original, esse número está desatualizado).
5. Produto: confirmar que nenhuma funcionalidade existente foi
   removida e nenhuma regra de negócio alterada em nenhuma das 28
   demandas anteriores desta rodada — auditoria de regressão
   consolidada, não uma nova rodada de testes do zero.
6. Consolidar a lista de falhas de teste pré-existentes (item de
   Contexto acima) com evidência atualizada — quais ainda procedem,
   quais já não existem mais.
7. Para cada gap confirmado (emoji, ARIA, LeagueTable, `.icon-btn`,
   setas de tendência): registrar com evidência real, classificar
   P1/P2, e decidir (com o PM, não sozinho, se a correção for grande)
   o que é corrigido nesta própria demanda (pequeno, mecânico) vs. o
   que vira demanda própria depois da S4 encerrar.
8. Retornar relatório técnico nesta mesma seção, com o veredito de
   cada eixo (Layout/Componentes/Interação/Acessibilidade/Produto) e
   a lista consolidada de gaps + falhas de teste, status `REVISÃO DO
   PM NECESSÁRIA`.

Fora de escopo

* criar o componente `LeagueTable` (é um achado desta auditoria, não
  o trabalho dela — vira demanda própria se o PM priorizar);
* resolver a densidade de ARIA num único esforço monolítico, se a
  auditoria confirmar que ainda é baixa (mesmo critério: registrar,
  não resolver tudo de uma vez sem escopo definido);
* qualquer mudança de regra de negócio;
* Batch 6 ou qualquer trabalho fora do escopo original da S4 —
  Redesign Mobile (ex.: `GE-BALANCE-*`, `GE-COPA-001`, `SAVE-LIMIT-001`
  já são frentes próprias, fora da S4, não deste QA).

Dependências

* As 18 telas migradas + 5 componentes formalizados (Batches 2, 3 e
  4 — todos aprovados e mesclados).
* `docs/sprints/S3/S3_S4_MATRIZ_TELAS_MOBILE.md` (Batch 5, §35
  Critérios gerais de aceite).
* `docs/sprints/S4/S4_REQUISITOS_VIGENTES.md`.

Requisitos

Mesma sequência obrigatória: inspecionar → localizar → entender →
planejar → alterar (só o pequeno/mecânico, registrado) → testar →
revisar. Mesmo rigor de evidência de toda a Sprint — nenhum veredito
sem grep/leitura de código/teste confirmando.

Critérios de aceite

Os mesmos do §35 da matriz original: Layout, Componentes, Interação,
Acessibilidade e Produto todos com veredito registrado e evidência;
lista consolidada de gaps conhecidos revisada com estado atual; lista
de falhas de teste pré-existentes consolidada; nenhuma regressão
funcional encontrada nas 28 demandas anteriores.

Validações

O PM deverá validar: cobertura dos 5 eixos, qualidade da evidência,
classificação de gaps (P1/P2) e a decisão sobre o que é corrigido
aqui vs. vira demanda própria.

Riscos

* baixo — é auditoria transversal, mudança de código só se for
  pequena/mecânica e explicitamente registrada como tal.

Observações

**Com esta demanda concluída e aprovada, a Sprint S4 — Redesign
Mobile está formalmente encerrada** — fundação (`S3-DS20-S4-PREP-001`/
`002`), Batch 2 (8 telas), Batch 3 (5 itens), Batch 4 (6 telas) e
Batch 5 (esta), todos aprovados. Por fim: nenhuma das demandas fora
da S4 (`GE-BALANCE-*`, `GE-COPA-001`, `SAVE-LIMIT-001`) depende do
fechamento formal da S4 pra continuar evoluindo — são frentes
paralelas independentes, como já registrado desde que começaram.


**Relatório técnico (Claude, 26/10/2026)** — branch `claude/s4-b5-qa-001`,
sobre `main` 4b539c7 (já com o redesign da referência visual, PRs #47–#49).
Medição: varredura do código (fora de comentários) + script Playwright em
360×780 em 6 painéis, 5 telas e o menu (`docs` não guardam o script; ele
fica no scratchpad da sessão).

| Eixo | Veredito | Evidência |
|---|---|---|
| Layout | APROVADO | 0 px de rolagem horizontal em todos os 12 contextos medidos a 360px; hierarquia/CTA lima conferidos por captura nos blocos 1–5 (`docs/REDESIGN_BLOCOS.md`) |
| Componentes | APROVADO COM RESSALVA | tokens `--m3-*` com a paleta nova; sheets/diálogos no mesmo padrão (fundação); `LeagueTable` segue sem componente formal (a Tabela já não é `<table>` — 0 ocorrências —, é lista `.mt-tr`); 11 regras CSS ainda com `var(--brd-*)` |
| Interação | APROVADO COM RESSALVA | corrigido aqui: X das modais 26→44px, "?" de ajuda e `.mt-icon-btn` (42→44); continuam < 44px: chips de filtro, segmentos (`.mt-seg-btn`), itens do menu e botões de atalho da Início — aumentá-los muda a densidade das telas (decisão de PM) |
| Acessibilidade | APROVADO COM RESSALVA | contraste AA em todos os pares principais (texto 16,2:1; secundário 7,2–7,8:1; botão lima 11,6:1; erro 6,0:1; borda 3,6:1); corrigido aqui: botão destrutivo (`--m3-on-error` 4,1→5,4:1), nome acessível nos 57 X das modais e `role="switch"`/`aria-checked`/rótulo nos toggles de Configurações — 0 botões sem nome nos 12 contextos; ARIA geral continua baixa: 39 `aria-*` e 2 `role` pra ~300 botões, 0 `role="dialog"` nas 63 modais fixas |
| Produto | APROVADO | redesign só de apresentação (diff em `public/` = CSS/markup + paleta/tema/`confirmModal`); suíte completa 152/153 nesta branch (falha: `test_noticias_fullscreen_fluxo`, intermitente já listado) |

**Gaps conhecidos — estado atual**

| Gap | Hoje | Classe | Proposta |
|---|---|---|---|
| Emoji como ícone | 267 fora de comentários (121 HTML + 146 JS), ~igual aos 262 originais | P2 | demanda própria (troca por ícones SVG do DS) |
| ARIA baixa | ver Acessibilidade; modais sem `role="dialog"`/foco preso (só as dinâmicas `m3-*` têm) | P1 | demanda própria: `role="dialog"` + `aria-labelledby` + foco nas 63 modais |
| `LeagueTable` | lista `.mt-tr`, sem componente formal | P2 | demanda própria (fora de escopo aqui) |
| `.icon-btn` < 48dp | `.mt-icon-btn` 44px (corrigido); chips/segmentos/menu < 44px | P1 | decidir densidade (PM) |
| Rajdhani/Bebas | Bebas eliminada (redesign); Rajdhani em 66 usos como extensão BRDATA | — | manter como extensão decidida |
| Setas ▲/▼ do Perfil | 4 usos em JS; 15 `var(--brd-*)` (11 CSS + 4 JS) sem par `--m3-*` | P2 | migrar junto com a limpeza de `--brd-*` |

**Falhas de teste pré-existentes — consolidado** (10 suítes completas
locais hoje + CI): `test_tabela_modal` e
`test_intervalo_noticias_proposta_destino` **não falharam mais**;
intermitentes de carga ainda vistos 1× cada: `test_cup`,
`test_noticias_fullscreen_fluxo`, `test_h2h` (também no CI — a Tabela abre
atrasada, causa não identificada), `test_resumo_rodada`,
`test_serie_b_escudos`, `test_save`/`test_comissao_tecnica` (só no CI, com
diagnóstico já no código); `test_regressao_gate` falhou 1× por rede do
ambiente. Proposta: uma demanda própria de dívida técnica pros
intermitentes (não resolvidos aqui).

**Arquivos alterados nesta demanda:** `public/carreira.html` (aria-label
nos X, áreas de toque, `--m3-on-error`), `public/js/carreira.js` (toggles
com `role="switch"`), este handoff.

Recomendação: aprovar o fechamento da S4 com os gaps P1/P2 acima virando
demandas próprias (ARIA de modais, densidade de toque, emoji, LeagueTable,
`--brd-*`, intermitentes).

APROVADO pelo Murilo em 26/10/2026, diretamente na conversa ("Aprovado"). **Sprint S4 — Redesign Mobile formalmente encerrada.** Gaps P1/P2 acima viram demandas próprias quando priorizados.

⸻

S3-DS20-S4-READINESS-001 — S3.2.7 Readiness Review	11/09/2026	sem commit de código — demanda de auditoria/decisão; nota de fechamento registrada no commit `9ac51bf`	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026, diretamente nesta conversa
("Aprovado"). Auditoria original (09/09/2026) determinou
`AJUSTES NECESSÁRIOS` com 6 itens — os 3 bloqueantes (convergência de
tokens, Dialog/Bottom Sheet/Skeleton, migração das 9 telas P0)
resolvidos por `S3-DS20-S4-PREP-001` e pelos Batches 2/3 da S4,
completos e mesclados; os 3 não-bloqueantes (emoji, cobertura de
teste, gaps P1/P2) tratados incrementalmente conforme previsto, sem
virar projeto isolado. Relatório técnico completo (evidência original
da auditoria + nota de fechamento com o mapeamento de cada item pra
sua demanda de resolução) em `git show 9ac51bf:docs/HANDOFF_CLAUDE.md`.

S3-DS20-S4-PREP-001 — Dialog/Bottom Sheet/Skeleton (`--m3-*`) + convergência de tokens	09/09/2026	merge de `claude/s4-prep-001-tokens-components` em `main` (commit de código original `4d80d99`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 09/09/2026. Relatório técnico completo (o que
foi implementado, testes, gaps, arquivos avaliados/alterados) fica
preservado no histórico do git — `git show dc382a8:docs/HANDOFF_CLAUDE.md`
(commit em que este relatório foi registrado) — e não é reproduzido
aqui, pra manter este documento como o estado operacional atual, não um
arquivo permanente (esse é o papel do CHANGELOG.md, conforme
`docs/README.md`).

**Merge do código:** exceção pontual aberta pelo Murilo pra concluir
esta demanda já aprovada — nenhuma alteração de código nova, só a
integração em `main` do que já estava implementado, testado e
revisado na branch. A instrução geral de "não mexer em código" desta
sessão continua valendo pra qualquer outra alteração.

S3-DS20-S4-PREP-002 — Formalizar PlayerCard (`playerRow()`), retroativo em Elenco	09/09/2026	merge de `claude/s3-ds20-s4-prep-002` em `main` (commit de código original `1998f02`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 09/09/2026. Relatório técnico completo (o que
foi implementado — mudança puramente documental, zero comportamento
alterado —, testes, a divergência encontrada em relação à
especificação original, e a regressão pré-existente de
`S3-DS20-S4-PREP-001` encontrada mas fora de escopo) fica preservado no
histórico do git — `git show 1998f02:docs/HANDOFF_CLAUDE.md` (commit em
que este relatório foi registrado) — e não é reproduzido aqui, pelo
mesmo motivo do item acima.

**Merge do código:** autorizado pela aprovação formal acima
(`docs/README_HANDOFF.md` §13) — feito nesta mesma sessão, já com
chapéu implementador (diferente do caso da PREP-001, onde o merge
ficou pendente de outra sessão).

S4-B2-001 — Migrar tela Loading/Bootstrap para o Design System novo	10/09/2026	merge de `claude/s4-b2-001-loading` em `main` (commit de código original `6267fc6`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #12, junto com #13/#15/#16/
#17/#18/#19/#21). Relatório técnico completo fica preservado no
histórico do git — `git show 6267fc6:docs/HANDOFF_CLAUDE.md` — e não é
reproduzido aqui, mesmo motivo dos itens acima.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#12, executado nesta sessão junto com as outras 7 demandas aprovadas
no mesmo lote.

S4-B2-002 — Migrar tela Login/Entrada para o Design System novo	10/09/2026	merge de `claude/s4-b2-002-login` em `main` (commit de código original `7fcb3a7`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #13). Achado de inspeção: a
tela já estava migrada (`#screenLoginRequired`) — mudança puramente
documental, zero código de produção alterado. Relatório técnico
completo em `git show 7fcb3a7:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#13, executado nesta sessão junto com o lote de 8 demandas.

S4-B2-003 — Migrar tela Tática/Formação para o Design System novo	10/09/2026	merge de `claude/s4-b2-003-tatica` em `main` (commit de código original `f92a339`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #14), depois de resolvidas
as 2 divergências registradas na inspeção original (`.mt-bench-row`
mantido como padrão próprio; tipografia `Rajdhani` classificada como
BRDATA Extension). Relatório técnico completo em
`git show f92a339:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#14, executado nesta sessão.

S4-B2-004 — Migrar tela Treino para o Design System novo	10/09/2026	merge de `claude/s4-b2-004-treino` em `main` (commit de código original `6bf1467`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #15). Relatório técnico
completo em `git show 6bf1467:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#15, executado nesta sessão junto com o lote de 8 demandas.

S4-B2-005 — Migrar tela Perfil do jogador para o Design System novo	10/09/2026	merge de `claude/s4-b2-005-perfil` em `main` (commit de código original `13c0991`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #16). Relatório técnico
completo (inclui a divergência registrada sobre as setas de tendência
▲/▼ não migradas, sem token `--m3-*` equivalente) em
`git show 13c0991:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#16, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-001 — Criar os componentes TransferCard e ContractCard	10/09/2026	merge de `claude/s4-b3-001-transfer-contract-card` em `main` (commit de código original `44edc50`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #17). Relatório técnico
completo em `git show 44edc50:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#17, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-002 — Migrar tela Mercado para o Design System novo	10/09/2026	merge de `claude/s4-b3-002-mercado` em `main` (commit de código original `48289d1`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #18). Relatório técnico
completo em `git show 48289d1:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#18, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-003 — Migrar tela Negociação/Proposta para o Design System novo	10/09/2026	merge de `claude/s4-b3-003-negociacao` em `main` (commit de código original `4d3f703`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #19). Relatório técnico
completo — inclui o bug crítico pré-existente de CSS (Dialog/Bottom
Sheet sem `position:fixed`/`z-index` de verdade desde
`S3-DS20-S4-PREP-001`) encontrado e corrigido nesta demanda — em
`git show 4d3f703:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#19, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-005 — Inspecionar e formalizar MatchCard e FinancialSummary	10/09/2026	merge de `claude/s4-b3-005-matchcard-financialsummary` em `main` (commit de código original `7ef29b6`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #21). Relatório técnico
completo (MatchCard construído novo — motor de partidas só produz 2
dos 5 estados suportados pelo componente; FinancialSummary formalizado
retroativamente sobre o card "Financeiro" já existente) em
`git show 7ef29b6:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#21, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-004 — Criar a tela Contratos (redefinida de "migrar" para "criar do zero")	10/09/2026	merge de `claude/s4-b3-004-contratos` em `main` (commit de código original `ba88891`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #20), depois de decidir a
opção 1 (criar a tela do zero) e revisar a implementação. Relatório
técnico completo (inspeção original que bloqueou a demanda, mini-spec
do PM, e a implementação final — reaproveitando 100% da lógica já
existente, nenhuma regra de contrato nova) em
`git show ba88891:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#20, executado nesta sessão.

**Nota de governança (sessão PM, 10/09/2026):** ao contrário das
outras 9 demandas desta rodada (aprovadas pelo Murilo diretamente
nesta conversa, com a mensagem "Aprovado" registrada), o "Aprovado"
que fechou esta demanda foi postado pela sessão implementadora na
própria issue #20
(https://github.com/muriloalmeida-alt/FitOS/issues/20#issuecomment-5625550397),
sem um checkpoint externo verificável nesta conversa — o tipo exato de
situação que `docs/README_HANDOFF.md` §1 veda ("quem implementa e
especifica não pode também aprovar formalmente o próprio trabalho sem
checagem externa"). Pode ser que o Murilo tenha autorizado essa
implementação/merge diretamente com a sessão implementadora (mesmo
padrão de "passei a instrução para o dev" usado nesta conversa pras
outras 9) — mas essa sessão PM não tem como confirmar isso pelas
fontes disponíveis (GitHub, git). Registrado aqui pra transparência;
não desfeito unilateralmente (o merge de código já é fato consumado,
reverter é decisão de produto/técnica, não documental). Se o Murilo
não autorizou, é um gap de processo a corrigir daqui pra frente, não
desta demanda específica retroativamente.

**Resolução (sessão implementadora, 11/09/2026):** confirmado — o
Murilo autorizou a aprovação/merge de `S4-B3-004` diretamente na
conversa desta sessão implementadora ("Aprovar a #20", mesmo padrão
usado pras outras 9 demandas do lote). O gap era só de
visibilidade cruzada entre sessões paralelas (a sessão PM não tinha
como ver esta conversa), não uma aprovação ausente de fato. Nenhuma
ação de reversão necessária.

⸻

DOCS-REQ-001 — Povoar docs/requirements/ com regras vigentes migradas de docs/sprints/	11/09/2026	merge de `claude/docs-req-001` em `main` (commit de código original `a493286`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #23), diretamente nesta
conversa ("Pode mesclar. Aprovado pelo PM"). Relatório técnico completo
(4 documentos criados em `docs/requirements/` — um por subpasta —,
cada um citando a origem em `docs/sprints/S2/`/`S3/` e separando
estado atual confirmado de direção futura/proposta) em
`git show a493286:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#23, executado nesta sessão.

S4-B3-006 — Migrar Resumo da rodada e Rodada (menu) pro MatchCard	11/09/2026	merge de `claude/s4-b3-006-resumo-rodada` em `main` (commit de código original `29fa8f7`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #24), diretamente nesta
conversa ("Pode seguir com o desenvolvimento"). Relatório técnico
completo (3 pontos de código migrados pro MatchCard —
`showRoundResultsModal()`, `cupRoundResultsHTML()`, `renderRodada()` —
sem alterar a definição do componente; 4º ponto de `.ct-round-result-row`
confirmado fora do escopo) em `git show 29fa8f7:docs/HANDOFF_CLAUDE.md`.
Com esta demanda, o **Batch 3 (Transactional) da S4 fecha 100%**.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#24, executado nesta sessão.

SAVE-LIMIT-001 — Save de carreira "grande demais": eliminar o beco sem saída	11/09/2026	merge de `claude/save-limit-001` em `main` (commit de código original `5ab43d8`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #29), diretamente nesta
conversa ("mesclar e seguir para a próxima"). Relatório técnico
completo (medição real — `leagueSquads` responde por ~79% do save,
não estruturas acumulativas; compressão gzip 92-93% real,
`MAX_BYTES` passa a valer sobre o tamanho comprimido; poda automática
de histórico não-essencial como última linha de defesa; `clubHistory`
capado) em `git show 5ab43d8:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#29, executado nesta sessão.

GE-BALANCE-001 — Reduzir sequências de invencibilidade do clube humano	11/09/2026	merge de `claude/ge-balance-001` em `main` (commit de código original `4fc3cde`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #26), diretamente nesta
conversa ("Merge"). Relatório técnico completo (inspeção real da curva
de fadiga/rotação, achado da inversão `club.def/defMult`, mecanismo
"motivação do adversário" implementado e validado por simulação Monte
Carlo — 5000 temporadas, queda de 6.2% pra 4.0% na fração de
temporadas com sequência ≥10 jogos invicto —, recomendação de
`GE-BALANCE-003` separada pra corrigir a inversão de calibração
ataque/defesa) em `git show 4fc3cde:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#26, executado nesta sessão.

GE-BALANCE-002 — Peso da tradição/força de clube na simulação (relegação)	11/09/2026	merge de `claude/ge-balance-002` em `main` (commit de código original `830a051`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #27), diretamente nesta
conversa ("Aprovar #27"). Relatório técnico completo (club.atk/def já
reaproveitado por buildGeneratedProPlayer sem mudança, mas não é
tradição — CLUB_TRADITION_IDS novo, pequeno e curado; mecanismo de
reprieve probabilístico na zona de rebaixamento, gap encontrado e
corrigido pela própria simulação de validação — 17.3% → 40.7% de
redução medida) em `git show 830a051:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#27, executado nesta sessão.

S4-B4-READINESS-001 — Verificação individual das 7 telas do Batch 4	11/09/2026	merge de `claude/s4-b4-readiness-001` em `main` (commit de código original `38884d8`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #25), diretamente nesta
conversa ("ordem da #25 aprovada"). Relatório técnico completo
(auditoria com evidência das 7 telas — 6 existem e precisam de
migração, 1 — Eixos táticos — já está coberta dentro de Tática/
Formação; ordem de execução recomendada: Onboarding → Meus esquemas →
Marcação individual → Comparar jogadores → Notícias/Eventos →
Histórico/Estatísticas) em `git show 38884d8:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** auditoria pura, sem código de produção — merge
autorizado pela aprovação formal do PM na issue #25, executado nesta
sessão.

GE-COPA-001 — Expandir Copa do Brasil (60 clubes, ida e volta, cabeças de chave, ao vivo)	11/09/2026	merge de `claude/ge-copa-001-impl` em `main` (commit de código original `9e416d7`; checkpoint de desenho aprovado antes, `claude/ge-copa-001-design`, commit `729033f`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #28), diretamente nesta
conversa — em 2 etapas, como a especificação exigia dado o tamanho da
mudança: (1) desenho de fases validado ("desenho da #28 aprovado" +
escolha de cabeças de chave por força atual via pergunta direta), (2)
implementação + validação por simulação aprovada ("Pode fazer o merge
de 25 a 28"). Relatório técnico completo (60 clubes cruzando as 3
divisões, 4 cabeças de chave pulando a Fase 1, ida e volta em todas
as 6 fases, motor ao vivo 100% reaproveitado de resolveLiveChunk,
formato legado de 16 clubes preservado intacto pra saves antigos,
3 temporadas inteiras simuladas sem quebra de chaveamento,
`test_cup.js` reescrito por ter ficado obsoleto) em
`git show 9e416d7:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#28, executado nesta sessão.

S4-B4-001 — Migrar tela Onboarding para o Design System novo	11/09/2026	merge de `claude/s4-b4-001-onboarding` em `main` (commit de código original `d36d8e0`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #31), diretamente nesta
conversa ("Aprovado. Seguir para o próximo"). Relatório técnico
completo (3 seletores CSS migrados — `.mt-onboard-title`/`.mt-onboard-text`/
`.mt-onboard-skip`, `--mt-ivory-50`/`--mt-ink-muted` →
`--m3-on-surface`/`--m3-on-surface-variant`; tipografia Bebas Neue do
título mantida como BRDATA Extension) em
`git show d36d8e0:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#31, executado nesta sessão.

S4-B4-002 — Migrar tela Meus esquemas para o Design System novo	11/09/2026	merge de `claude/s4-b4-002-meus-esquemas` em `main` (commit de código original `c8b1b28`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #32), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (achado que corrige
a auditoria `S4-B4-READINESS-001` — a tela não era "100% legada": a
casca de modal/sheet e as linhas da lista de esquemas já estavam 100%
`--m3-*` de demandas anteriores; único token legado real era o campo
de nome do sheet "Novo esquema", `.mt-friend-input` cru fora de
`.mt-form-row`; migrado envolvendo-o em `.mt-form-row`, reaproveitando
regra que já existia pra "Editar perfil", sem CSS novo) em
`git show c8b1b28:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#32, executado nesta sessão.

S4-B4-003 — Migrar tela Marcação individual para o Design System novo	11/09/2026	merge de `claude/s4-b4-003-marcacao-individual` em `main` (commit de código original `a4cdb6d`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #33), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (mesmo achado de
`S4-B4-002` — casca de modal já `--m3-*` antes desta demanda; tokens
legados reais eram `.mt-sel-row`/`.mt-sel-name`/`.mt-info-line b`,
migrados via override CSS ESCOPADO a `#markingOverlay` em vez de mudar
a regra base, compartilhada com Comparar jogadores e o seletor de
substituição ao vivo, ambos fora de escopo; decisão registrada de NÃO
reaproveitar `playerRow()`/PlayerCard — o componente não mostra
posição/subposição, informação essencial numa lista não agrupada por
posição; guard `:not(.selected)` necessário pra não quebrar o estado
selecionado pré-existente, achado e corrigido no próprio teste antes do
merge) em `git show a4cdb6d:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#33, executado nesta sessão.

S4-B4-004 — Migrar tela Comparar jogadores para o Design System novo	11/09/2026	merge de `claude/s4-b4-004-comparar-jogadores` em `main` (commit de código original `74465a1`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #34), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (decisão registrada:
reaproveitar `playerRow()`/PlayerCard na lista de escolha — SIM, ao
contrário de `S4-B4-003`, porque aqui o pool já é sempre da mesma
subposição e o subtítulo já anuncia qual, então o chip por linha seria
redundante; achado de 3 tokens exclusivos do resultado que a auditoria
tinha marcado como "novo" — `.m3-compare-player b`/`.m3-compare-row`/
`.m3-compare-val`, migrados na regra base já que a classe é exclusiva
desta tela, sem precisar de override escopado) em
`git show 74465a1:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#34, executado nesta sessão.

S4-B4-005 — Migrar tela Notícias/Eventos e formalizar NewsCard	11/09/2026	merge de `claude/s4-b4-005-noticias-eventos` em `main` (commit de código original `4f56673`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #35), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (`NewsCard`
formalizado PARCIALMENTE retroativo — `newsItemHTML()` já cobria o
layout de linha do feed; a manchete em destaque, que nunca foi função
própria, virou a variação `featured` do MESMO componente; classes
`.mt-news-*` renomeadas `.m3-news-*`, tokens `--mt-gold-400/600` →
`--m3-secondary` e demais → `--m3-on-surface(-variant)`/
`--m3-outline-variant`; cores categóricas por tipo e destaque "mine"
preservados como cor categórica da BRDATA; verificação pós-merge
encontrou 1 flake em `test_noticias_fullscreen_fluxo.js` — timing de
simulação ao vivo, não relacionado a esta demanda, confirmado
reproduzindo isoladamente 2x limpo em seguida) em
`git show 4f56673:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#35, executado nesta sessão.

S4-B4-006 — Migrar tela Histórico/Estatísticas para o Design System novo	11/09/2026	merge de `claude/s4-b4-006-historico-estatisticas` em `main` (commit de código original `a4238b0`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #36), diretamente nesta
conversa ("Aprovado e a 30 tbm"). Relatório técnico completo
(`kpiHTML()` já tinha a variante `block:"m3"` em produção no card
Financeiro — Estatísticas nunca adotou, migração foi só passar `"m3"`
em cada chamada, zero CSS novo; `.mt-obj-tabs`/`.mt-obj-tab`/
`.mt-mini-*` migrados via override ESCOPADO a `#panel-estatisticas`,
compartilhados com Objetivos/Loja e o Histórico por temporada do
Perfil do jogador; MatchCard avaliado e não aplicável, nenhuma lista
de "resultados recentes" nesta tela) em
`git show a4238b0:docs/HANDOFF_CLAUDE.md`.

**Última tela do Batch 4 (Complementary) — fecha 100% (6/6 telas
migradas + Eixos táticos já coberto, sem demanda própria).** Resta só
o Batch 5 (QA Visual/UX transversal) pra completar a Sprint S4 por
inteiro.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#36, executado nesta sessão.

GE-BALANCE-003 — Corrigir inversão de defesa no motor de partida	11/09/2026	checkpoint de desenho mesclado (`claude/ge-balance-003-design`, commit `fe77506`); implementação mesclada em seguida (`claude/ge-balance-003-impl` em `main`, commit de código original `422d523`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #30), em 2 etapas nesta
conversa — checkpoint de desenho ("Aprovada a 30") e implementação
("Aprovado"). Relatório técnico completo: causa raiz determinada com
evidência (hipótese a — o operador da fórmula de gol estava errado,
`atk/def` deveria ser `atk*def`; os ~180 valores de `def` em
`data.js` já estavam curados certos, confirmado por
`buildRealPlayer`/`buildGeneratedProPlayer`, que já fazem
`(2-club.def)` pra inverter o mesmo valor em outro lugar). Isso
revisou o item 1 original da especificação: `computeHumanStrength`
já estava correto e NÃO foi alterado. 6 funções/11 divisões
corrigidas (`simulateCupLeg`/`resolveOtherDivisionsRound`/
`attributeChances`/`resolveCpuFixture`/`resolveLiveChunk`/
`suggestTactics`), mais 2 ajustes multiplicativos encontrados durante
a implementação (penalidade de familiaridade tática e o mecanismo de
"adversário motivado" de `GE-BALANCE-001`, ambos dependiam do sentido
antigo de `def`). Validado com simulação de campeonato completo nova
(300 temporadas, 20 clubes reais do Brasileirão — achado extra: o
ranking de pontos era essencialmente achatado com o bug, e passa a
refletir a força real dos clubes depois do fix) e reexecução de
`sim_ge_balance_001.js` (atualizado, mecanismo de motivação continua
funcionando mas proporcionalmente mais fraco contra a nova baseline —
achado registrado pra uma possível demanda futura de recalibração)/
`sim_ge_balance_002.js` (inalterado, 40,7% idêntico ao já medido) em
`git show 422d523:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#30, executado nesta sessão.

GE-BALANCE-005 — Evolução de jogadores realista (fim da inflação de overall)	25/10/2026	merge de `claude/ge-balance-005-impl` em `main` (commit de código original `5949f4a`, merge `ed42a7b`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, nesta conversa ("Faça o merge do
que está pronto"). Teto de ganho por temporada por idade/minutagem,
freio de faixa alta, potencial que cai a partir dos 30, base/olheiro
com potencial enviesado e evolução anual dos elencos CPU. Validado por
`tests/e2e/sim_ge_balance_005.js`: top-11 +13,8 → +4,3 em 10
temporadas; jogadores 90+ por elenco 8,9 → 0,8. Relatório técnico
completo em `git show 5949f4a:docs/HANDOFF_CLAUDE.md`. Pendências
registradas lá: ids de base repetidos na reposição anual (P0, demanda
própria a abrir) e potencial da base acima do nível de elenco de
preenchimento.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

UX-COMISSAO-001 — Acessos rápidos da Comissão com confirmação	25/10/2026	merge de `claude/ux-comissao-001` em `main` (commit de código original `c586cf5`, merge `c1e4e37`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, nesta conversa ("Faça o merge da
UX-Comissao-001"). O ícone da Comissão no Início abre um diálogo com a
sugestão completa e os botões Aplicar / Agora não / Ver na Comissão.
Relatório completo em `git show c586cf5:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

UX-MERCADO-001 — Mercado acessível e proposta de qualquer lugar	25/10/2026	PR #40 (`claude/ux-mercado-001` → `main`, commit de código original `0f77c0c`, merge `4ed8938`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026: ele mesmo fez o merge do PR #40.
Card de jogador de outro clube com proposta, empréstimo e comparar;
nomes clicáveis em lances e premiações; operações de mercado não
voltam pra home; atalhos no topo do Mercado; filtros em bottom sheet
com ordenação; card Mercado no Início. Relatório completo e o achado
de ids de jogador repetidos entre clubes em
`git show 0f77c0c:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** feito pelo Murilo (PR #40).

P0-IDS-001 — Ids de jogador únicos no save inteiro	25/10/2026	merge de `claude/ge-calendar-001-b1` (que contém `claude/p0-ids-unicos`, commit de código original `647c783`) em `main`, merge `ed04331`	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Branches Aprovadas").
`ensureUniquePlayerIds()` ao criar a carreira, ao carregar o save e na
virada de temporada; referências por (clube, jogador) atualizadas.
Relatório em `git show 647c783:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GE-SCOUT-001 — Olheiros nacionais e unificados	25/10/2026	mesmo merge `ed04331` (commit de código original `1f3bb67`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Branches Aprovadas"). Catálogo
nacional com Avaliação/Rede, missão com foco e indicações do Mercado
vindas da missão Profissional, com relatório. Ponto deixado para
decisão futura: o especialista regional acha um pouco mais que o
olheiro-chefe na própria região (mantido como está). Relatório em
`git show 1f3bb67:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GE-CALENDAR-001 (B1) — Calendário real jan–dez	25/10/2026	mesmo merge `ed04331` (commit de código original `fb21130`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Branches Aprovadas"), com as
decisões da implementação: carreira nova começa na pré-temporada;
semanas de 2 jogos = semanas de Copa; recalibração via Cota de TV.
B2 (amistosos) e B3 (tela de calendário) seguem na seção vigente da
demanda. Relatório em `git show fb21130:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GAME-2048-001 — Minijogo "BRDATA 2048" (webview, estilo 2048)	25/10/2026	PR de `claude/game-2048-spec` para `main` (commit de código original `a113f6a`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, diretamente nesta conversa
("Aprovado"), aceitando as 5 divergências do relatório: fundo nas
superfícies neutras `--m3-surface*`, sem "voltar"/menu (só "Como
jogar"), `<dialog>` nativo com o visual de `.m3-dialog`, 128 e 1024 no
mesmo fundo (1024 com contorno dourado) e gancho `window.__game2048`.
Página `/2048.html` standalone (só números, sem ligação com a
carreira, sem desfazer, sem atalho no site); tokens `--m3-*` extraídos
para `public/css/m3-tokens.css`. Testes: motor 20/20, E2E 25/25, suíte
E2E sem regressão (mesmas falhas pré-existentes antes/depois). Após
trazer o `main` (`7c253e8`) para o branch, tokens e screenshots da
carreira conferidos de novo (idênticos, exceto a animação do aviso de
recompensa). Especificação + relatório em
`git show a113f6a:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo, via PR.

GE-CALENDAR-001 (B2, B3) — Amistosos e tela Calendário	25/10/2026	merge `c44dd4c` (commits de código originais `f193c9c` B2 e `546a773` B3)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, diretamente nesta conversa ("Faça
merge da Ge-balance-004" — a branch levava B2 e B3 empilhadas). B2: 3
amistosos na pré-temporada + até 2 opcionais em julho, com as regras
de amistoso escolhidas na implementação (sem tabela/cartões/pontos
oficiais). B3: tela Calendário por mês, data no topo e aviso de
rodízio. Especificação + relatórios em
`git show d972dc0:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GE-BALANCE-004 — Realismo de acesso/rebaixamento: força relativa à divisão	25/10/2026	mesmo merge `c44dd4c` (commit de código original `ec21b48`; suíte em `d972dc0`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Faça merge da Ge-balance-004"),
com a decisão anterior "Sem convergência". Reposicionamento por degrau
na virada de temporada (issue #39). Os 2 critérios que ficaram no
limite (rebaixado volta em 50–52%; promovido à B cai de novo em
45–48%) foram ACEITOS pelo Murilo em 25/10/2026, depois do merge ("Os
critérios estão ok").
Validação no merge: testes novos 4/4, rota rápida 18/18, suíte
completa sem regressão (única falha fora da lista conhecida,
`test_loan_advanced`, é o flake de onboarding sob carga descrito em
`docs/MOTOR_TESTES_FASE_A.md` e passou 2/2 isolado). Especificação +
relatório em `git show d972dc0:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.
