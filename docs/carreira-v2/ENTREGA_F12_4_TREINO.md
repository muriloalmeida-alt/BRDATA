# Carreira 2.0: fase 12, etapa 4 (treino no motor)

- **Data:** 05/11/2026.
- **Branch:** `f12-treino`, a partir de `main` (com o #75, etapa 3, e o #76, comissão técnica).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (05/11):
- **Forma:** o motor devolve o efeito por jogador.
- **Sorteio:** o motor recebe o sorteio de fora, na mesma ordem de antes.

## Resultado principal
O treino semanal e a evolução natural por idade foram para `public/js/motor/treino.js`, **sem mudar regra, número nem texto**.

O motor simula sobre cópias dos jogadores e devolve, para cada um, os campos novos (`patch`):
- condição;
- overall, ataque, defesa e físico;
- moral e motivo;
- teto da temporada;
- tendência;
- histórico de fadiga.

O `carreira.js` só aplica (`Object.assign`) e continua cuidando de 3 coisas:
- 1 treino por semana (`calendarTurnKey`);
- a meta diária "Treine 1 jogador";
- o bônus físico da pré-temporada, que o motor recebe pronto.

## O que foi para o motor
| Função nova | Substitui, no `carreira.js` |
|---|---|
| `trainingWeek` | o corpo de `applyWeeklyTraining`: descanso, fadiga, ganho por foco (técnico, físico, tático), moral do Sub-20 no misto, moral de cansaço e histórico de fadiga |
| `agingWeek` | o corpo de `applyNaturalAgingEvolution`: maturação de quem joga e declínio a partir dos 30 (goleiro, 32) |
| `attributeTrainingGain`, `highBandGainFactor` | ganho ponto a ponto com teto e freio da faixa alta |
| `seasonGainBaseCap`, `playTimeGainFactor`, `seasonGainCap`, `seasonGainRoom`, `SEASON_GAIN_CAP_BY_AGE` | teto de ganho da temporada por idade e minutagem (GE-BALANCE-005) |
| `defaultTrainingPlan`, `trainingTargets`, `isProtectedTrainingDay` e as constantes (`TRAINING_SCHEMES`, dias, multiplicadores, durações, `FATIGUE_HISTORY_MAX`) | os 5 esquemas, quem treina em cada grupo e as folgas protegidas |

As funções antigas viraram chamadas ao motor (`motorTreino()`), e as constantes são lidas de lá. Só há uma cópia de cada regra.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker pré-carrega o arquivo.
- Os tipos ficam em `treino.d.ts`.

**Ficam no `carreira.js`:**
- **Telas:** rótulos de tela (intensidade, grupo) e os limites do editor de duração.
- **Evolução e histórico:** `recordSeasonGain`, usado também pela evolução anual dos clubes CPU, e o histórico de lesões.
- **Etapa da temporada:** queda de potencial (`potentialDeclineFor`), potencial da base e evolução anual dos clubes CPU.

**Sem mudança de regra, de schema, de API nem de tela.** A v2 só tem rótulos de treino, nenhuma regra duplicada.

## Pontos para sua avaliação
1. **Simulação de balanceamento (`sim_ge_balance_005.js`) estava quebrada na `main`:** desde o calendário (GE-CALENDAR-001), ela parava com `calendarTurnKey is not defined`. Ela não roda no CI.
   - **Correção:** carrega o motor, simula o modo por rodada, sem calendário, e sorteia com semente fixa.
   - **Efeito:** antes e depois agora sorteiam a mesma sequência e dão resultado idêntico (40 carreiras × 10 temporadas, mais a liga CPU).
2. **Teste ajustado:** `test_training_evolution` lia `TRAINING_GAME_DAY` como variável global da página. Agora lê do motor.
3. **Próxima etapa (mercado):** levanto e trago as decisões antes.

## Testes
- **Novo `tests/unit/test_motor_treino.js`,** com 4 verificações de equivalência com o código anterior (cópia congelada) e o mesmo sorteio:
  1. plano de 7 dias dos 5 esquemas;
  2. semana de treino: mesmo elenco final e mesmos ganhos, nos 5 esquemas, plano individual e pré-temporada;
  3. evolução natural por idade;
  4. teto da temporada e ganho de treino.
- **Simulação de balanceamento:** antes = depois, com o mesmo sorteio (ponto 1).
- **Testes de treino e evolução:** 8/8, entre eles Treinos, Bloco 5, evolução de atributos, `training_evolution`, Semana e Tática/Treino da v2.
- **Suíte completa:** 189/190. A única falha foi `test_v2_mercado`, por tempo-limite com a máquina carregada. Depois do merge com a `main` (que trouxe o #76), ela passou de novo junto com comissão e treino: 5/5. Total: **190/190**.
