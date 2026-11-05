# Carreira 2.0: fase 12, etapa 2 (rodada e tabela no motor)

- **Data:** 05/11/2026.
- **Branch:** `fase12-rodada`, a partir de `main` (com o #71, etapa 1).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (05/11):
- **Tabela:** um critério só, usado nas duas versões.
- **Desempate:** fica como está. Com tudo igual, vale a ordem em que os clubes estão no save.
- **Site do Brasileirão:** não muda nesta etapa.

## Resultado principal
A tabela, o calendário e a rodada "só de placar" foram para o motor, **sem mudar regra nem resultado**. **A v2 passou a usar o motor de verdade:** o Início, a Tabela e o elenco de outro clube ordenam a classificação pelo mesmo código que a versão anterior usa.

## Módulos novos (`public/js/motor/`)
| Módulo | Funções | Substitui |
|---|---|---|
| `tabela.js` | `emptyRow`, `emptyStandings`, `applyResult`, `cloneStandings`, `compareRows`, `sortRows`, `positionOf`, `accessZoneIds`, `relegationZoneIds` | <ul><li>no `carreira.js`: as **8 cópias** do critério (prêmios da temporada, tabela de cada divisão, posição, notícias da rodada, barra do topo, mini tabela da Central e tela da Tabela), `applyResultToStandings`, `cloneStandings`, as zonas e as 3 montagens de tabela zerada</li><li>na v2: as **3 cópias** do critério (`domain/home.ts`, `table.ts`, `squadplus.ts`)</li></ul> |
| `calendario.js` | `generateAllRounds` (turno e returno, método do círculo) | as 3 chamadas da Carreira ao `generateAllRounds` do `js/data.js` |
| `rodada.js` | `playSimpleRound` (placar + tabela) | o laço de `resolveOtherDivisionsRound`, a rodada das divisões que o técnico não joga |

**Carga e tipos:**
- O `carreira.html` importa os quatro módulos em `window.BRDATA_MOTOR`; o service worker pré-carrega todos.
- Os tipos ficam em `tabela.d.ts`, `calendario.d.ts` e `rodada.d.ts`.

**Ficam no `carreira.js` para as próximas etapas:** a rodada com elenco (CPU × CPU da própria divisão e a partida do técnico), porque aplica desgaste, cartões, lesões e estatística no jogador, e o fim de rodada (`finishRoundTail`: folha salarial, mercado, notícias, calendário da semana).

**Sem mudança de regra, de schema, de API nem de tela.**

## Pontos para sua avaliação
1. **Cópias que ficaram fora da Carreira** (decisão de manter o site como está):
   - `generateAllRounds` e `poissonSample` continuam também em `js/data.js`;
   - o critério da tabela continua também em `js/engine.js`.

   Os três servem ao site. O site desempata pelo código do clube; a Carreira, não.
2. **Desempate total:** segue sem critério final. Fica anotado para balanceamento (confronto direto, sorteio).
3. **Pacote da v2:** subiu 7 kB (516 kB), porque agora inclui o motor da tabela. Segue o aviso de pacote acima de 500 kB, já listado no diagnóstico.
4. **Próxima etapa (finanças):** levanto e trago as decisões antes.

## Testes
- **Novo `tests/unit/test_motor_tabela.js`,** com 6 verificações de equivalência com o código anterior (cópia congelada):
  - tabela em 200 temporadas de 180 jogos;
  - ordem e posição, com empate total;
  - zonas, com e sem clube protegido;
  - calendário com 20, 19 e 4 clubes;
  - rodada das outras divisões, sorteio a sorteio;
  - cópia da tabela.
- **Unitários da v2:** 117/117; `tsc` limpo; build ok.
- **Testes de tabela, temporada e divisões:** 18/18 (estatísticas, multidivisão, rebaixamento, temporada, Tabela da v2 e da partida, Início, hooks da rodada e service worker, entre outros).
- **Suíte completa:** **188/188** (`run_parallel.js --isolated-server`), sem falhas e sem retries.
