# Carreira 2.0: fase 12, etapa 6 (regras da virada de temporada no motor)

- **Data:** 06/11/2026.
- **Branch:** `f12-temporada`, a partir de `main` (com o #78, etapa 5).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (06/11):
- **Escopo:** só as regras da virada. A Copa do Brasil e a orquestração (`advanceSeason`) ficam no `carreira.js`.
- **Renovação:** o motor devolve o elenco novo.
- **Página escondida:** fica para um plano à parte (`PLANO_SEM_PAGINA_ESCONDIDA.md`, para aprovação).

## Resultado principal
As regras da virada de temporada foram para `public/js/motor/temporada.js`, **sem mudar regra, número nem texto**. O motor não lê o save: recebe tudo por parâmetro, com o sorteio vindo de fora, na mesma ordem de antes.

- **Renovação dos elencos:** devolve o elenco novo (cópias dos jogadores) e o resumo (quem saiu, quantos vieram da base e do principal). O `carreira.js` troca a lista e a escalação.
- **Acesso e rebaixamento:** devolve quem sobe, quem cai, as divisões novas e a força nova de quem troca de divisão. O `carreira.js` aplica a força nos mesmos objetos de clube, monta os elencos de quem sobe da Série D e avisa a troca de divisão.

## O que foi para o motor
| Função nova | Substitui, no `carreira.js` |
|---|---|
| `computeBoardGoal`, `boardGoalMet`, `DISMISSAL_STREAK` | a meta da diretoria pela força do elenco, se foi batida e a demissão depois de 3 temporadas |
| `seasonReputation`, `countTitlesThisSeason`, `reputationLabel` e as constantes | a reputação do técnico (50% meta, 20% títulos) e os rótulos |
| `seasonAwards`, `awardedPlayerIds`, `AWARD_MORALE_BOOST` | premiações do Brasileirão (campeão, vice, artilheiro, assistências e melhor) e da Copa, e os +15 de moral dos seus premiados |
| `computeContractFields`, `fairWageFor`, `seasonMorale` | salário, valor e contrato, o salário justo e a moral da virada |
| `derivePotentialForAdult`, `youthPotentialRoll`, `potentialDeclineFor`, `cpuAnnualDelta` / `applyCpuAnnualEvolution` | potencial de adulto e de jovem, a queda pela idade e a evolução anual dos CPUs |
| `buildBasePlayer`, `buildGeneratedProPlayer` e as composições | os geradores de jogador da base e profissional. Os nomes e o ano chegam por parâmetro |
| `renewHumanSquad`, `renewLeagueSquad`, `snapshotSeason` | a renovação do seu elenco e dos CPUs, com o histórico por temporada |
| `promotionRelegation`, `applyTraditionReprieve`, `divisionStrengthScale`, `arrivalStrength` e as constantes | a cascata A ↔ B ↔ C ↔ D, o perdão da tradição e a força de quem troca de divisão |

**No `carreira.js`:** as funções antigas mantêm nome e parâmetros e só chamam o motor. Telas, ponte, `advanceSeason`, Copa, mercado e criação de carreira não mudaram.

**v2:**
- **Temporada:** reconhece a demissão com o `DISMISSAL_STREAK` do motor.
- **Tabela:** marca as zonas com o `RELEGATION_N` do motor.
- **Cópias:** essas duas eram cópias próprias e saíram.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker pré-carrega o arquivo.
- Os tipos ficam em `temporada.d.ts`.

**Sem mudança de regra, de schema, de API nem de tela.**

## Pontos para sua avaliação
1. **Simulações de balanceamento estavam quebradas:**
   - **Quebradas na `main`:** `sim_ge_balance_002` desde a etapa 2 (não conhecia o motor da tabela).
   - **Sem conserto, quebrariam agora:** `sim_ge_balance_004` e `005`, que extraem as regras do `carreira.js`.
   - **Correção:** as três usam o novo `tests/e2e/_motor_vm.js`, que carrega o motor dentro delas. A 004 continua aceitando o degrau calibrado pela linha de comando.
2. **Resultado da simulação de evolução (005):** idêntico antes e depois, com o mesmo sorteio, em 30 carreiras × 10 temporadas. Cobre treino, maturação, renovação, geradores, potencial e a liga CPU.
3. **Testes ajustados:** `test_ge_balance_002` e `test_rebaixamento` liam `CLUB_TRADITION_IDS` como variável global da página. Agora leem do motor.
4. **Cópia do jogador na renovação:** o motor copia os campos de topo e o histórico da temporada, que são o que a renovação muda. A equivalência confere o save inteiro depois da virada.
5. **Referência congelada em arquivo:** o código antigo ficou em `tests/unit/ref_temporada_antes.js`, como no mercado.

## Testes
- **Novo `tests/unit/test_motor_temporada.js`:** compara as funções antigas (congeladas) com as novas (do `carreira.js` atual, já chamando o motor). As duas rodam no mesmo mundo sorteado (3 divisões com clubes de tradição, Série D, tabelas, seu clube, Copa e ano variável) e com o mesmo `Math.random`. Conferem o valor devolvido e o save inteiro depois de cada chamada. Todas iguais:
  1. regras de jogador e geradores (60 mundos);
  2. diretoria, reputação, premiações e moral dos premiados (60);
  3. renovação dos elencos (60);
  4. acesso e rebaixamento completo, com divisões novas e aviso (120).
  - **Contraprova:** mudei, um por vez, a chance de perdão (0,5 → 0,6), a escolha do substituto, quantos sobem da D, o degrau, os pontos de reputação, o tamanho da base, o corte de contrato e a evolução CPU. A verificação certa falhou em cada caso.
  - **Correção no próprio teste:** a 1ª versão gerava tabelas sem `id`, e a zona saía vazia. A contraprova do perdão mostrou isso, e o mundo foi corrigido antes do resultado acima.
- **Testes da temporada:** 33/33. Entram temporada, rebaixamento e divisões, GE-BALANCE, diretoria, reputação, premiações, demissão, carreira do treinador, base, olheiros, contratos e os 3 testes de equivalência do motor.
- **v2:** 117/117 unitários, `tsc` limpo, build regenerado e `verificar-bundle-v2` idêntico.
- **Suíte completa:** __SUITE__.
