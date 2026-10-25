HANDOFF_CLAUDE — Demandas vigentes e histórico

As regras de governança deste Handoff estão definidas em
docs/README_HANDOFF.md. Claude deve consultar o README_HANDOFF.md
para conhecer as regras (responsabilidades, fluxo, estados, escopo,
divergências, aprovação) — elas não são repetidas aqui.

⸻

Demandas vigentes

S4-B5-QA-001 — Batch 5: QA Visual/UX transversal — fecha a S4

Status: PRONTO PARA IMPLEMENTAÇÃO
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

⸻

GE-BALANCE-004 — Realismo de acesso/rebaixamento: força relativa à divisão

Status: PRONTO PARA IMPLEMENTAÇÃO (decisões abertas respondidas pelo Murilo em 25/10/2026)
Sprint: fora da S4 (frente paralela Game Engine, mesma série de GE-BALANCE-001/002/003)
Prioridade: P1 (Game Engine — consistência/realismo)
Etapa do loop (CLAUDE.md §11): virada de temporada (Standings → Board → Next Round), efeito em Match

Pedido do usuário (25/10/2026)

"Times que sobem de uma divisão para outra não podem se destacar com
tanta facilidade no ano seguinte. Assim como os times que caem não
podem ir tão mal. Precisa de uma lógica que traga mais realismo."

Diagnóstico (inspeção do código atual, `public/js/carreira.js`)

* A força de partida dos clubes CPU é **só** `club.atk`/`club.def`
  (`resolveCpuFixture`, `resolveLiveChunk`, `simulateCupLeg` etc.) —
  o elenco do clube não entra no cálculo.
* `applyPromotionRelegation` move o clube de divisão **com o mesmo
  `atk`/`def`** (comentário explícito no código: "clube rebaixado
  continua com o MESMO id/atk/def"). Nada reescala a força para a
  divisão nova.
* Em modo ao vivo, `calibrateStrengths` calcula `atk`/`def` **relativo à
  média da própria liga** (`gp/j ÷ média da liga`). O líder da Série B
  ganha um `atk` na mesma escala do líder da Série A — ao subir, chega
  na A com força de candidato ao título. O simétrico vale para quem
  cai: o lanterna da A chega na B com força de lanterna.
* No Modo Exemplo (`data.js`), as escalas das divisões se sobrepõem
  (topo da B ≈ meio da A: Athletico 1.55/0.85 vs. Fortaleza 1.55/0.92;
  topo da C ≈ meio da B), mas também nada é ajustado na troca de
  divisão.
* O clube humano usa o mesmo `club.atk`/`club.def` como base
  (`computeHumanStrength` multiplica por fatores relativos ao próprio
  elenco), então herda o mesmo problema.
* Times promovidos da Série D ganham elenco novo, mas a força segue a
  do catálogo da D.

Objetivo

Clube que troca de divisão passa a ter força coerente com a divisão
nova: promovido chega como time de meio/baixo da tabela (com chance
real de brigar contra a queda), rebaixado chega como candidato ao
acesso (sem ficar imune a uma 2ª queda). Mérito esportivo continua
existindo — um promovido pode surpreender, só não como regra.

Escopo

1. **Escala de força por divisão** — derivar, para cada divisão, a
   distribuição atual de `atk`/`def` (percentis) a partir de
   `CAREER.divisionTeams`. Não criar tabela fixa paralela.
2. **Reposicionamento na troca de divisão** (dentro de
   `applyPromotionRelegation`, mesmo ponto onde a troca já acontece):
   * promovido: `atk`/`def` reposicionados para uma faixa de percentil
     baixa/média da divisão nova (proposta: percentil 20–45, ordenado
     pela colocação no acesso — campeão da B no topo dessa faixa);
   * rebaixado: reposicionado para a faixa alta da divisão nova
     (proposta: percentil 65–90), com um "paraquedas" que decai
     (proposta: ~1 temporada) — reflete elenco/receita maiores que a
     média da divisão;
   * mesma regra para clube humano e CPU (o humano só tem a base
     `club.atk/def` ajustada — os multiplicadores do elenco/tática de
     `computeHumanStrength` continuam iguais).
3. **Convergência gradual** — nas temporadas seguintes, a força deixa
   de ser congelada: puxa uma fração (proposta: 30%/temporada) em
   direção ao desempenho real da temporada anterior (saldo de gols/
   pontos dentro da divisão), para que um promovido que se firma
   suba de nível ao longo dos anos e um rebaixado que não reage
   continue caindo. Reaproveita a ideia de `calibrateStrengths` (gols
   pró/contra vs. média da liga), em vez de fórmula nova.
4. Compatibilidade com `GE-BALANCE-002` (reprieve de tradição) e com a
   proteção do clube humano na Série C — ambos continuam intactos.
5. Notícia de virada de temporada (`NewsCard`) explicando o contexto
   quando o clube humano sobe/cai (CLAUDE.md §45 — explicabilidade),
   ex.: "Recém-promovido, o elenco ainda está abaixo da média da Série
   A — a diretoria espera permanência."

Fora de escopo

* Ligar a força de partida dos clubes CPU ao overall do elenco (mudança
  estrutural do motor — registrada como risco/possível demanda futura).
* Mudar quantos clubes sobem/descem (`RELEGATION_N` continua 4).
* Recalibrar a meta da diretoria — só se o teste mostrar meta
  incoerente com a nova força (aí reportar como divergência).

Persistência / saves

* `atk`/`def` já vivem em `CAREER.divisionTeams` (já persistidos) — o
  reposicionamento grava ali mesmo.
* Campo novo pequeno por clube só para o paraquedas/convergência
  (proposta: `strengthMeta: { since, origin }`), com default ausente =
  sem ajuste. Save antigo: nenhum ajuste retroativo; a regra passa a
  valer na próxima virada de temporada. Impacto no tamanho do save:
  desprezível (60 clubes × poucos bytes).

Critérios de aceite (validados por simulação Monte Carlo, mesmo padrão
de `tests/e2e/sim_ge_balance_00*.js`, ≥300 temporadas, Modo Exemplo e
força estilo "ao vivo")

1. Promovidos à Série A na 1ª temporada: posição média entre 11º e 16º;
   ≤5% terminam no G4; 25–45% são rebaixados de novo.
2. Rebaixados à Série B na 1ª temporada: posição média entre 4º e 9º;
   30–50% voltam à A; ≤5% caem para a C.
3. Mesma lógica medida entre B↔C.
4. Clube humano promovido com o elenco que tinha: na média, não termina
   no G4 da divisão nova (com elenco reforçado, pode).
5. `sim_ge_balance_002.js` e `sim_ge_balance_003.js` continuam passando
   (sem regressão de tradição nem do motor).
6. Determinismo preservado (sorteios via `seededRngFromKey`).
7. Save antigo carrega e avança temporada sem erro.

Decisões abertas para o Murilo (valores propostos acima são o default)

* D1 — Faixas de reposicionamento (promovido p20–45 / rebaixado p65–90)
  e metas de realismo dos critérios 1–2 estão boas?
* D2 — Paraquedas do rebaixado dura 1 temporada ou 2?
* D3 — Convergência anual de 30% para o desempenho real é um bom ritmo?

Decisões do Murilo (25/10/2026): D1 — proposta padrão (promovido
p20–45 / rebaixado p65–90, metas dos critérios 1–2 mantidas); D2 — 1
temporada; D3 — 30%/temporada.

⸻

GE-BALANCE-005 — Evolução de jogadores realista (fim da inflação de overall)

Status: PRONTO PARA IMPLEMENTAÇÃO (decisões abertas respondidas pelo Murilo em 25/10/2026)
Sprint: fora da S4 (frente paralela Game Engine)
Prioridade: P1 (Game Engine / Player Engine)
Etapa do loop (CLAUDE.md §11): Training + Player Evolution + virada de temporada

Pedido do usuário (25/10/2026)

"Os jogadores evoluem demais e chega um momento que o time todo é acima
de 90. Isso não é real. Precisa ter uma inteligência."

Diagnóstico (inspeção do código atual)

* **Treino satura o teto rápido demais.** `applyWeeklyTraining` com o
  esquema padrão "Equilíbrio" tem 2 sessões técnicas moderadas/semana
  (ganho possível 2 cada). `attributeTrainingGain` converte cada ponto
  com chance `espaço/15` — com 10 pontos de espaço, ~67%. Na prática um
  jogador chega ao `potential` em poucas semanas, não em anos.
* **Veterano não declina de verdade.** Aos 30+, `derivePotentialForAdult`
  fixa `potential = overall`, e `applyNaturalAgingEvolution` tira ~2–3
  pontos/temporada — mas o treino da semana seguinte devolve tudo até o
  mesmo teto, que nunca baixa. O resultado é um elenco que só sobe.
* **Potencial nunca muda.** `p.potential` é fixado na criação e jamais
  revisto com a idade.
* **Base gera craques demais.** `buildBasePlayer` sorteia potencial
  uniforme entre 42 e 90 (+ bônus de clube, até 92), e `renewHumanSquad`
  repõe a base até 16 jovens **toda temporada**. Cerca de 10% de cada
  safra tem teto 85+ — em 4–5 temporadas o clube acumula uma dúzia de
  jogadores 85–92 só promovendo os melhores.
* **Atributos não têm teto próprio.** `atk`/`def`/`phys` usam o mesmo
  `potential` do overall como teto, e o overall é treinado direto, não
  derivado dos atributos.
* **O mundo CPU não acompanha.** `renewLeagueSquad` só envelhece e repõe
  jogador; não há evolução dos elencos CPU. O elenco humano infla
  enquanto o resto da liga fica parado, e o overall humano vira
  incomparável com o da liga.

Objetivo

Curva de carreira plausível: jovem cresce ao longo de anos, pico entre
~26 e 30, declínio real depois. Overall 90+ é raro (poucos jogadores
na liga inteira), e um elenco inteiro acima de 85 não acontece sem
investimento de mercado excepcional.

Escopo (evoluir as funções existentes — CLAUDE.md §5, nada paralelo)

1. **Ganho sazonal limitado por idade** — teto de ganho total (treino +
   maturação) por temporada, por faixa etária (proposta: ≤21: +6;
   22–25: +4; 26–29: +2; 30+: 0), contado em `attributeTrainingGain`/
   `applyNaturalAgingEvolution`. Zera na virada de temporada.
2. **Retorno decrescente mais forte** — a chance de converter cada ponto
   cai mais rápido perto do teto e também em faixas altas absolutas
   (proposta: acima de 80 o ganho fica ~2× mais difícil; acima de 88,
   ~4×). É a regra do CLAUDE.md §17 ("quanto mais próximo do potencial,
   menor o ganho marginal") aplicada de verdade.
3. **Potencial dinâmico com a idade** — na virada de temporada, a partir
   do pico (proposta: 30 linha / 32 goleiro), o `potential` desce junto
   com a idade (proposta: −1 a −3/ano, acelerando com a idade). Treino
   deixa de "recuperar" declínio de veterano; serve para frear a queda,
   não para revertê-la.
4. **Distribuição realista na base** — potencial da base com
   distribuição enviesada (maioria 55–75; 85+ raro, proposta ≤2% por
   safra; 90+ excepcional), escalada pelo nível do clube/divisão. Só
   para jovens gerados daqui pra frente.
5. **Minutagem importa** — quem não joga cresce bem menos (a maturação
   natural já distingue titular/reserva; o treino passa a respeitar o
   mesmo princípio no teto sazonal).
6. **Evolução leve dos elencos CPU na virada de temporada** — aplicar a
   mesma curva idade/potencial de forma agregada (uma vez por
   temporada, sem treino semanal) para que a liga envelheça e revele
   jovens como o clube humano. Custo de processamento e de save
   controlado (sem campos novos por jogador além dos já existentes).
7. **Explicabilidade** — o detalhe do jogador mostra quando ele bateu o
   limite de evolução da temporada ou está em declínio por idade (texto
   curto, usando os componentes existentes do perfil).

Fora de escopo

* Atributos detalhados novos (técnica, passe etc.).
* Mudar a força de partida para depender do overall absoluto (ver
  GE-BALANCE-004, fora de escopo).
* Rebaixar retroativamente o overall de jogadores já inflados em saves
  existentes (decisão D7 abaixo).

Persistência / saves

* Campo novo por jogador só para o contador de ganho da temporada
  (proposta: `seasonGain`, número pequeno, default 0 — ausente = 0).
  Impacto no save: ~10 bytes × ~60 jogadores humanos; CPU não precisa
  do campo (evolução anual agregada).
* Save antigo: potencial dinâmico e teto sazonal passam a valer na
  próxima rodada/virada, sem corromper nada; jogadores já acima do
  novo teto não perdem overall de imediato, só declinam
  naturalmente com a idade.

Anti-exploit (CLAUDE.md §29)

* Farm de treino: limitado pelo teto sazonal.
* "Comprar jovem promissor e treinar até 90": continua possível, mas
  em anos, e com ≤2% de chance por safra/mercado de teto 85+.
* Veterano eterno: impossível com potencial decrescente.

Critérios de aceite (simulação de 10 temporadas, ≥200 carreiras, mesmo
padrão de `tests/e2e/sim_*.js`, usando as funções reais)

1. Média do top-11 humano sem mercado sobe no máximo ~+3 a +5 em 10
   temporadas (hoje: medir e registrar o baseline no relatório).
2. Após 10 temporadas, ≤2 jogadores com overall 90+ no elenco humano em
   ≥95% das carreiras sem mercado; elenco inteiro ≥85 em 0% das
   carreiras.
3. Distribuição de overall da liga inteira (60 clubes) estável entre a
   temporada 1 e a 10 (média ±2, percentil 99 ≤ 90).
4. Jogador de 33+ perde overall em média, mesmo treinando intensamente.
5. Jovem da base com teto 80+ leva em média 4+ temporadas para chegar a
   ele.
6. Testes existentes de treino (`test_bloco5_treino.js`) e de
   renovação/contratos continuam passando; save antigo carrega e
   avança sem erro.

Decisões abertas para o Murilo

* D4 — Tetos de ganho por temporada (+6/+4/+2/0 por faixa etária)
  estão no ritmo que você imagina?
* D5 — Idade de início do declínio do potencial (30 linha / 32
  goleiro) e ritmo (−1 a −3/ano) ok?
* D6 — Evolução anual dos elencos CPU (item 6) entra nesta demanda ou
  fica para uma demanda separada?
* D7 — Saves existentes já inflados: só aplicar daqui pra frente
  (proposto) ou fazer uma "correção" única de rebalanceamento?

Decisões do Murilo (25/10/2026): D4 — +6/+4/+2/0; D5 — 30 linha /
32 goleiro, −1 a −3/ano acelerando com a idade; D6 — entra nesta
demanda; D7 — só daqui pra frente (sem correção retroativa).

Ordem sugerida: GE-BALANCE-005 antes de GE-BALANCE-004 (é a queixa
mais visível e não depende da outra); as duas antes ou em paralelo ao
S4-B5-QA-001 (QA visual não toca no motor).

⸻

Pacote "Mercado, calendário e olheiros" — pedido do Murilo em 25/10/2026

Pedido (resumo): (1) Mercado escondido e com muito scroll; indicações
dos olheiros escondidas; ao fazer proposta o jogo volta pra home;
querer propor a qualquer jogador em qualquer tela clicando no nome.
(2) Mercado curto; pré-temporada com amistosos; calendário real
jan–dez com 30 dias de férias, 30 de pré-temporada, 30 de pausa em
julho e jogos nos outros 9 meses. (3) Olheiros sul-americanos não
fazem sentido num jogo nacional; melhorar olheiros. (4) Acessos
rápidos devem abrir modal de confirmação em vez de aplicar direto.

Diagnóstico (código atual):
* Mercado (`#panel-mercado`): busca + 4 selects empilhados antes da
  lista; "Indicações dos olheiros", "Minhas propostas", "Minhas
  vendas" e "Histórico" são botões no FIM da tela, depois da lista.
* `confirmOfferFromModal` chama `finishOperationAndGoHome()`.
* `openPlayerCard` (jogador de outro clube) é "consulta apenas — pra
  negociar, use o Mercado"; nomes clicáveis só em ~7 lugares.
* Sem conceito de data: temporada = 38 rodadas; `TRANSFER_WINDOWS =
  [[1, 3], [20, 22]]`; salário cobrado 1/4 do mês por rodada (≈9,5
  meses/ano).
* `SCOUT_MARKET`: 3 olheiros, um "Especialista em base internacional".
  "Indicações dos olheiros" (Mercado) é sistema separado, não usa os
  olheiros contratados.
* Comissão Técnica no Início (`renderCommissionSummaryCard`): tocar no
  ícone aplica a sugestão direto.

Ordem de execução decidida: UX-COMISSAO-001 → UX-MERCADO-001 →
GE-SCOUT-001 → GE-CALENDAR-001 (B1 → B2 → B3).

⸻

UX-COMISSAO-001 — Acessos rápidos da Comissão com confirmação

Status: PRONTO PARA IMPLEMENTAÇÃO
Prioridade: P4 (UX) · Etapa do loop: Market/Management

Escopo: tocar num ícone da Comissão no Início abre um `openM3Dialog`
com o texto completo da sugestão e as ações "Aplicar" (executa o
`apply()` já existente de `COMMISSION_AREAS`), "Agora não" e "Ver na
Comissão". Ícone sem sugestão continua desabilitado. Nada muda na tela
cheia da Comissão.
Aceite: nenhuma sugestão é aplicada sem confirmação; o texto é o mesmo
da tela cheia; funciona no mobile; testes de Comissão continuam
passando.

⸻

UX-MERCADO-001 — Mercado acessível e proposta de qualquer lugar

Status: PRONTO PARA IMPLEMENTAÇÃO
Prioridade: P4 (UX) · Etapa do loop: Market/Management

Escopo:
1. `openPlayerCard` (outro clube) ganha ações: Fazer proposta
   (`openOfferModal`), Pedir empréstimo (fluxo de empréstimo existente)
   e Comparar com meu elenco (Comparar jogadores existente). Janela
   fechada → botão desabilitado com o motivo e a data de reabertura.
2. Nome de jogador clicável (→ `openPlayerCard`) em todo lugar onde
   aparece: notícias, lances/eventos de partida, artilharia,
   premiações, indicações, histórico de negociações, elencos de outros
   clubes.
3. Enviar proposta mantém o usuário na tela de origem (remover o
   `finishOperationAndGoHome` desse fluxo); toast com atalho "Ver
   propostas".
4. Mercado com abas no topo (Buscar · Indicações · Minhas propostas ·
   Vendas · Histórico) com contadores; telas atuais reaproveitadas como
   conteúdo das abas.
5. Busca compacta: campo + linha de chips de filtro (posição,
   divisão, nível, clube) abrindo bottom sheet M3; ordenação (valor,
   overall, idade); botão "Propor" direto no TransferCard.
6. Card "Mercado" no Início: status da janela, propostas pendentes,
   indicações novas.
Fora de escopo: regras de negociação/preço (não mudam).
Aceite: proposta possível a partir de qualquer nome de jogador de outro
clube; nenhuma volta forçada à home; indicações/propostas visíveis sem
rolar a lista; testes de mercado/negociação continuam passando; mobile
390px conferido.

⸻

GE-SCOUT-001 — Olheiros nacionais e unificados

Status: PRONTO PARA IMPLEMENTAÇÃO
Prioridade: P3 (Mundo) · Etapa do loop: Market/Management

Decisão do Murilo: indicações do Mercado passam a vir dos olheiros
contratados (unificar).

Escopo:
1. Catálogo só nacional (~8 olheiros): 1 especialista por região (5),
   2 generalistas, 1 olheiro-chefe (caro). Atributos: estrelas,
   Avaliação (precisão da faixa de potencial — alimenta
   `scoutedPotentialRange`), Rede (chance de achar), Especialidade
   (região e, opcionalmente, posição).
2. Missão com foco: região; tipo (Sub-17 / Sub-20 para a base, ou
   Profissional para o mercado); posição opcional; duração (curta/
   média/longa — mais tempo, mais achados).
3. Missão "Profissional" gera as indicações do Mercado (substitui a
   busca automática atual com cooldown). Sem olheiro, sem indicações.
4. Relatório por achado: faixa de potencial, pontos fortes/fracos,
   recomendação ("contratar já" / "observar").
5. Saves: olheiro "base internacional" contratado vira "Especialista
   nacional" (mesmo custo/estrelas); indicações já existentes ficam.
Anti-exploit: custo mensal escala com qualidade; nº de missões
simultâneas = nº de olheiros.
Aceite: nenhum texto/olheiro internacional; indicações dependem dos
olheiros; olheiro melhor → faixa de potencial mais estreita e mais
achados (medido por simulação); saves antigos carregam.

⸻

GE-CALENDAR-001 — Calendário real jan–dez, pré-temporada e amistosos

Status: PRONTO PARA IMPLEMENTAÇÃO (entrega em 3 partes, B1 → B2 → B3)
Prioridade: P1 (Game Engine) · Etapa do loop: todo o loop (Calendar)

Decisões do Murilo: semanas com 2 jogos; 3 amistosos na pré-temporada +
até 2 opcionais em julho; salário mensal (12×/ano) com receitas
recalibradas pra manter o saldo anual equivalente.

Modelo: unidade de tempo = semana (o treino já é semanal). Ano:
* Jan (4 sem.) férias — sem jogos/treino, recuperação de condição e
  moral, contratos vencem em 31/12, mercado ABERTO;
* Fev (4 sem.) pré-temporada — treinos (ganho físico maior), 3
  amistosos, mercado ABERTO;
* Mar–Jun (~18 sem.) rodadas 1–19 + Copa, mercado fechado p/ compra;
* Jul (4 sem.) pausa — descanso, treinos, até 2 amistosos, mercado
  ABERTO;
* Ago–Dez (~22 sem.) rodadas 20–38 + fases finais da Copa.
Venda continua permitida fora da janela (regra atual).

B1 — Motor de calendário: `CAREER.calendar` gerado na virada de
temporada (semanas com data, fase e compromissos; ~10 semanas com jogo
quarta + domingo); `transferWindowStatus` por data; "Avançar" vai ao
próximo compromisso ("Avançar 1 semana" / "Ir para a pré-temporada" em
semana sem jogo); prazos (lesão, proposta, missão, empréstimo) em
semanas; IA de mercado CPU escalada por semana (sem explosão de
transferências); finanças mensais + recalibração por simulação.
B2 — Pré-temporada e amistosos: convites (3 clubes de divisão
igual/inferior) com escolha; motor de partida reaproveitado (inclusive
ao vivo); sem pontos, sem suspensão por cartão, lesão com risco
menor, minutagem conta pra evolução (GE-BALANCE-005), bilheteria
pequena.
B3 — Calendário na UI: data no topo ("Dom 14/mar · 3ª rodada"), tela
Calendário por mês, aviso de semana com 2 jogos (rodízio).

Persistência: temporada em andamento termina no modelo atual; o
calendário entra na próxima virada (`schemaVersion`/migração
explícita). Impacto no save medido (limite ~768 KB).
Aceite: ano completo simulado sem quebra (3 temporadas seguidas); 38
rodadas + Copa encaixadas sem conflito; janelas abrem/fecham nas datas;
saldo anual de caixa equivalente ao atual (±10%) em simulação; volume
de transferências CPU por temporada dentro de ±20% do atual; saves
antigos carregam e viram a temporada sem erro.

⸻

GAME-2048-001 — Minijogo "BRDATA 2048" (webview, estilo 2048)

Status: REVISÃO DO PM NECESSÁRIA (implementado em 25/10/2026; relatório no fim desta seção)
Prioridade: P5 (Retenção) · Fora do roadmap S1–S16 (frente paralela, não altera status de Sprint)
Etapa do loop da carreira: nenhuma (v1 não toca em `CAREER`)
Especificado em: 25/10/2026, a pedido do Murilo

Objetivo

Minijogo casual estilo 2048, jogável em navegador e embutível em
WebView (Android/iOS), com identidade BRDATA. Serve de retenção (sessões
curtas entre rodadas) sem interferir na economia/estado da carreira.

1. Regras

* Tabuleiro 4×4. Começa com 2 peças aleatórias.
* Jogada = deslizar (swipe) ou setas/WASD. Todas as peças andam ao
  máximo na direção.
* Duas peças iguais que se encontram na direção da jogada fundem em uma
  com o dobro do valor (2+2 → 4).
* Cada peça funde no máximo 1 vez por jogada; a prioridade é da borda
  para onde se desliza. Casos de referência (deslizando à esquerda):
  `[2,2,2,2] → [4,4,_,_]`, `[2,2,2,_] → [4,2,_,_]`,
  `[4,4,8,_] → [8,8,_,_]` (o 8 novo não funde com o 8 na mesma jogada).
* Jogada só é válida se algo se mexer. Válida → nasce 1 peça numa casa
  vazia aleatória: 2 (90%) ou 4 (10%). Inválida → nada nasce, feedback
  de "tremida" no tabuleiro.
* Pontuação: soma dos valores criados por fusão. Recorde salvo.
* Vitória: chegar a 2048 → diálogo "Continuar jogando" / "Novo jogo"
  (pode seguir até 4096+).
* Derrota: sem casa vazia e sem par adjacente igual → diálogo de fim
  com pontos, recorde e "Jogar de novo".
* Determinismo (CLAUDE.md §12/§44): PRNG com seed (ex.: mulberry32),
  seed guardada no estado — mesma seed + mesmas jogadas = mesma
  partida (base para testes e reprodução de bug).
* Tema: só números (decisão 1), com as cores do BRDATA.

2. Layout (mobile-first, 390px como referência)

```
┌──────────────────────────────┐
│ ←  BRDATA 2048          ⋮    │  top app bar M3 (voltar, menu: novo jogo/como jogar)
├──────────────────────────────┤
│ ┌──────────┐ ┌──────────┐    │
│ │ PONTOS   │ │ RECORDE  │    │  2 cards de placar (fonte de display BRDATA)
│ │  1.284   │ │  9.920   │    │
│ └──────────┘ └──────────┘    │
│ ┌──────────────────────────┐ │
│ │ ┌──┐┌──┐┌──┐┌──┐         │ │
│ │ │ 2││  ││ 8││  │         │ │  tabuleiro quadrado:
│ │ └──┘└──┘└──┘└──┘         │ │  largura min(100vw − 32px, 480px),
│ │  ... 4×4 ...             │ │  gap 8px, raio --m3-shape-md
│ └──────────────────────────┘ │
│   Deslize para mover as peças│  dica (some após 1ª jogada)
│ [ Novo jogo ]                │  botão M3 (tonal)
└──────────────────────────────┘
```

* Paleta: fundo navy; peças em progressão navy → azul → branco →
  dourado (2048 = dourado cheio). Só tokens `--m3-*`/BRDATA DS, nada de
  hex solto (CLAUDE.md §6.3).
* Animações: deslize 100 ms (transform), nascimento (scale 0→1),
  fusão (pop 1→1.12→1). `prefers-reduced-motion` desliga.
* Desktop: mesma coluna centralizada (máx. 480px), setas do teclado.
* Diálogos de vitória/derrota no padrão `openM3Dialog` (mesmo visual).
* Acessibilidade: tabuleiro `role="grid"`, peças com `aria-label`
  ("128"), região `aria-live` anunciando pontos/fim de jogo,
  alvos de toque ≥ 48dp, contraste AA nos números.
* Safe areas (`viewport-fit=cover` + `env(safe-area-inset-*)`) para
  WebView com notch.

3. Tecnologia

* Mesma stack do projeto: HTML + CSS + JavaScript puro, sem framework e
  sem build. Servido pelo Node já existente (`server/server.js`) como
  arquivo estático.
* Renderização em DOM (16 casas + peças com `transform`), não canvas:
  acessível, fácil de tematizar com tokens, desempenho de sobra.
* Arquivos novos:
  * `public/2048.html` — página standalone (abre direto em WebView ou
    por link direto; sem atalho no site — decisão 4);
  * `public/js/game2048/engine.js` — regras puras, sem DOM
    (`move(state, dir)`, `spawn`, `isGameOver`, PRNG com seed),
    exportável em Node para teste;
  * `public/js/game2048/ui.js` — render, input, animação, diálogos.
* Input: Pointer Events com limiar de 24px e direção pelo eixo
  dominante; `touch-action: none` só no tabuleiro (a página não rola
  durante o swipe); teclado setas/WASD.
* Persistência: `localStorage` (estado da partida em andamento +
  recorde), com try/catch — sem backend na v1. `careerStore.js` e o
  limite de ~768 KB do save não são tocados.
* PWA/offline: incluir a página e os 2 JS no cache do `sw.js` (o jogo
  funciona sem rede, importante em WebView).
* Design System: os tokens `--m3-*` hoje vivem inline em
  `carreira.html`. Para não duplicar (CLAUDE.md §6.3), extrair o bloco
  `:root` de tokens para `public/css/m3-tokens.css`, linkado pelas duas
  páginas — extração incremental (CLAUDE.md §40), sem mudar valores;
  `carreira.html` precisa continuar idêntica visualmente (conferir por
  screenshot antes/depois).
* Testes: unitários Node do `engine.js` (todos os casos de fusão da
  seção 1, jogada inválida não gera peça, game over, determinismo por
  seed) + E2E Playwright em `tests/e2e` (swipe, teclado, vitória
  forçada por estado, derrota, 390px sem scroll horizontal, recorde
  persiste após reload).

Fora de escopo (v1)

Recompensa na carreira, ranking online, anúncios/monetização,
multiplayer, tabuleiros 5×5/6×6, desfazer.

Riscos / anti-exploit (CLAUDE.md §29)

* v1 sem integração com a carreira → sem exploit econômico.
* Se no futuro der recompensa (fora da v1 por decisão 2): recorde fica no
  cliente e é trivialmente forjável via `localStorage`; qualquer
  recompensa exigiria validação no servidor (replay da seed + lista de
  jogadas, possível graças ao determinismo) e teto diário.
* Extração de tokens pode quebrar visual da carreira → mitigado por
  comparação de screenshot e suíte E2E existente.

Critérios de aceite

1. Os casos de fusão da seção 1 passam em teste unitário.
2. Jogada inválida não gera peça; derrota detectada corretamente.
3. Mesma seed + mesmas jogadas = mesmo tabuleiro final.
4. Jogável por swipe em 390px e por teclado em desktop, sem scroll
   horizontal nem rolagem da página durante o swipe.
5. Partida em andamento e recorde sobrevivem a reload e a modo offline.
6. Só tokens do DS; `carreira.html` sem diferença visual após extração.
7. Suíte de testes existente continua passando.

Decisões (respondidas pelo Murilo em 25/10/2026)

1. Tema: só números (sem rótulos de futebol).
2. Carreira: standalone, sem recompensa — não toca em `CAREER`.
3. Desfazer: sem desfazer.
4. Acesso: só a página `/2048.html` (WebView ou link direto), sem
   atalho no `index.html` nem na carreira.

Relatório de implementação (Claude, 25/10/2026)

O que foi feito: jogo completo conforme seções 1–3, com as 4 decisões
acima. Código ainda NÃO commitado (aguarda aprovação, regra 13 do
README_HANDOFF) — está só no ambiente de trabalho da sessão.

Arquivos criados:
* `public/2048.html` — página standalone (layout, estilos, diálogo);
* `public/js/game2048/engine.js` — regras puras, PRNG com seed,
  validação de save (`isValidState`), exporta para Node;
* `public/js/game2048/ui.js` — render DOM, swipe/teclado, animações,
  diálogos, `localStorage` (`brdata2048:v1`, `schemaVersion: 1`),
  registro do service worker;
* `public/css/m3-tokens.css` — tokens `--m3-*` extraídos de
  `carreira.html`, sem mudar valores;
* `tests/unit/test_game2048_engine.js` — 20 casos do motor;
* `tests/e2e/test_game2048.js` — 25 checks no navegador.

Arquivos alterados:
* `public/carreira.html` — bloco `:root` de `--m3-*` removido do
  `<style>` e trocado por `<link rel="stylesheet" href="css/m3-tokens.css">`;
* `public/sw.js` — 4 arquivos novos no `APP_SHELL` (offline).

Testes:
* Unitários do motor: 20/20 (fusões de referência, jogada inválida,
  derrota, vitória, determinismo por seed, distribuição 2/4 ≈ 90/10,
  partida longa com invariantes, save corrompido).
* E2E do jogo: 25/25 em 390×844 (swipe, toque curto ignorado, página
  não rola, teclado setas/WASD, vitória e "continuar", derrota durante
  a partida e ao reabrir, confirmação de novo jogo, reload preserva
  partida e recorde, save corrompido, offline via service worker, sem
  erro de console).
* Extração de tokens: os 110 custom properties computados em
  `carreira.html` e 4 screenshots (login, escolha de clube, Início com
  paleta do clube, Central) idênticos pixel a pixel antes/depois.
* Suíte E2E completa: 117/146 tanto ANTES (via `git stash`) quanto
  DEPOIS — as mesmas 29 falhas pré-existentes, exceto uma troca:
  `test_escalacao_avancada.js` falhou só no "depois" (overlay de
  onboarding interceptando clique) e `test_botoes_rodape.js` só no
  "antes"; ambos passam isolados com as mudanças (escalacao 2×) —
  flake de concorrência, não regressão.
* Contraste: todas as peças ≥ 5,4:1 (AA).

Divergências / decisões de implementação para o PM avaliar:
1. "Fundo navy" (seção 2) virou as superfícies neutras `--m3-surface*`:
   são os tokens M3 vigentes (mesmo fundo da carreira hoje); os tons
   navy (`--mt-*`) não são compartilhados e são do sistema anterior.
2. Top app bar sem "voltar" e sem menu ⋮: pela decisão 4 não há
   página de origem; ficou título + botão "Como jogar". "Novo jogo"
   fica abaixo do tabuleiro e pede confirmação se a partida estiver
   em andamento.
3. Diálogo: `openM3Dialog` vive dentro do monólito `carreira.js` (não
   dá para carregar sem a carreira), então o jogo usa `<dialog>` nativo
   com o mesmo visual de `.m3-dialog`. Sugestão futura: extrair a
   primitiva de overlay M3 para um módulo compartilhado.
4. Paleta: os tokens M3 não têm 11 tons distintos; 128 e 1024 usam o
   mesmo fundo (`--m3-secondary-container`), e o 1024 se diferencia
   pelo contorno dourado.
5. `window.__game2048` (gancho de teste para carregar tabuleiros)
   fica exposto na página; não dá vantagem em nada, porque não há
   prêmio nem ligação com a carreira.

Riscos: baixos. Única mudança fora do jogo é a extração de tokens,
validada por valor computado e por pixel.

Recomendação: APROVADO, se as divergências 1–4 forem aceitas.

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
