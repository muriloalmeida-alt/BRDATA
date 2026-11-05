# Carreira 2.0: fase 12, etapa 1 (núcleo da partida extraído)

- **Data:** 05/11/2026.
- **Branch:** `fase12-partida`, a partir de `main` (com o #70).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (05/11):
- **Formato:** JavaScript puro em `public/js/motor/` (ES modules), com tipos em `.d.ts`.
- **Sorteio:** o gerador passa a ser injetado, sem mudar nada. O jogo continua passando `Math.random`.
- **Escopo:** primeiro o núcleo puro. A v2 continua jogando pela ponte nesta etapa.

## Resultado principal
O cálculo da partida saiu do `carreira.js` para `public/js/motor/partida.js`, **sem mudar nenhuma regra nem nenhum resultado**.
- **Funções puras:** nada lê nem grava `CAREER`, DOM ou save; tudo entra por parâmetro.
- **Equivalência comprovada:** um teste roda a implementação antiga (cópia congelada) e a nova com o mesmo gerador com semente. Elas dão o mesmo resultado, sorteio a sorteio, em 300 sementes por caso.
- **Quem usa:** a versão anterior (e portanto o motor escondido da v2) já usa o módulo. A v2 importa e tipa o módulo, mas ainda não roda partida sozinha. Isso só acontece quando o estado e a gravação também saírem, nas próximas etapas.

## O que foi para o motor
| Função nova (`motor/partida.js`) | Substitui, no `carreira.js` |
|---|---|
| `scoreGoals`, `goalLambdas` (mando de 12%, limites 0,05–6) | as 4 cópias da conta de gols: `resolveLiveChunk`, `resolveCpuFixture`, `simulateCupLeg` e `resolveOtherDivisionsRound` |
| `withFormationPenalty`, `withMotivation` | penalidade de formação e adversário motivado (`resolveLiveChunk`) |
| `pickGoalAuthors`, `goalEvents` | o sorteio de artilheiro, assistência e pênalti de `attributeGoals`. Os contadores do jogador continuam sendo somados no `carreira.js` |
| `chanceEvents`, `penaltyMissEvents` | `attributeChances`, `attributePenaltyMisses` |
| `varCheckEvents` | o VAR de `resolveLiveChunk` |
| `addChunkStats` | `updateLiveStats` (posse, finalizações, no alvo, faltas) |
| `cupPenaltyHomeWins` | os pênaltis da Copa: jogo único e agregado |
| `weightedPick`, `moraleFactor`, `poissonSample` | as versões do `carreira.js`, que agora delegam ao motor |

**Carga:**
- O `carreira.html` importa o módulo por `<script type="module">` em `window.BRDATA_MOTOR`.
- Módulos rodam antes do `DOMContentLoaded`, que é quando o `carreira.js` dá boot.
- Se o arquivo não carregar, a partida dá um erro claro ("Motor da partida… não carregou.").
- O service worker pré-carrega o arquivo novo.

**Continuam no `carreira.js`** (ficam para as etapas seguintes, porque mexem no estado do jogador e da carreira):
- desgaste, cartões e lesões (`applyMatchWearChunk`);
- força do time humano (`computeHumanStrength`);
- marcação individual;
- tabela;
- gravação.

**Sem mudança de regra, de schema, de API nem de tela.**

## Pontos para sua avaliação
1. **`poissonSample` duplicada:** existe também em `js/data.js`, usada pelo site. Deixei a do site como está para não mexer no site nesta etapa. A Carreira usa a do motor.
2. **Determinismo (§12/§44):** com o gerador injetado, uma partida com semente gravada no save fica possível. Como decidido, isso fica para uma etapa própria.
3. **Próxima etapa (rodada e tabela):** `applyResultToStandings`, a ordenação e os critérios de desempate e a resolução da rodada da CPU. Vou levantar e trazer as decisões antes.

## Testes
- **Novo `tests/unit/test_motor_partida.js`,** com 8 verificações: 7 de equivalência com a implementação anterior (300 sementes cada) e 1 de sanidade estatística (10 mil jogos).
- **Novo `carreira-v2/src/domain/motor.test.ts`:** a v2 importa o motor com tipos. Unitários da v2: 117/117; `tsc` limpo.
- **Testes de partida e Copa:** 13/13 (partida, resultado, motor, ao vivo, play-by-play v1/v2, Copa, Copa do motor, GE-COPA, GE-BALANCE-003, marcação individual, service worker offline).
- **Suíte completa:** **187/187** (`run_parallel.js --isolated-server`), sem falhas e sem retries.
