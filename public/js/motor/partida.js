/* ===================================================================
   MOTOR — PARTIDA (Fase 12, etapa 1 do plano de independência, 05/11)
   -------------------------------------------------------------------
   Núcleo PURO do cálculo de uma partida, extraído de carreira.js sem
   mudar nenhuma regra (CLAUDE.md §40: monólito → extrair função →
   testar). Nada aqui lê ou grava CAREER, DOM ou save: tudo entra por
   parâmetro e sai no retorno. Quem aplica o resultado no jogo (gols e
   assistências no jogador, tabela, notificações) continua sendo o
   carreira.js.

   Sorteio: toda função recebe o gerador `rng` (() => número em [0,1)).
   O jogo passa Math.random (comportamento idêntico ao de antes); os
   testes passam um gerador com semente (tests/unit/test_motor_partida.js)
   e comparam, sorteio a sorteio, com a implementação anterior. A ORDEM
   dos sorteios é a mesma do código original — é ela que garante o
   mesmo resultado com a mesma sequência de números.

   Formato: ES module em public/js/motor/ (decisão de 05/11). A versão
   anterior carrega por <script type="module"> (window.BRDATA_MOTOR, ver
   carreira.html); a v2 pode importar no build. Tipos em partida.d.ts.
=================================================================== */

export const HOME_ADVANTAGE = 1.12;
export const LAMBDA_MIN = 0.05;
export const LAMBDA_MAX = 6;

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Mesma amostragem de Poisson de js/data.js (algoritmo de Knuth).
export function poissonSample(lambda, rng) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

// Sorteio ponderado (weightedPick de carreira.js).
export function weightedPick(items, weights, rng) {
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// Gols esperados de cada lado numa fração `share` da partida (1 = jogo
// inteiro). GE-BALANCE-003: `def` é "menor = defesa melhor", por isso a
// fórmula MULTIPLICA pelo def do defensor; o mandante ganha 12%.
export function goalLambdas(home, away, share = 1) {
  return {
    home: clamp((home.atk * away.def) * HOME_ADVANTAGE, LAMBDA_MIN, LAMBDA_MAX) * share,
    away: clamp(away.atk * home.def, LAMBDA_MIN, LAMBDA_MAX) * share,
  };
}

// Placar de um jogo (ou de um trecho): sorteia o mandante, depois o visitante.
export function scoreGoals(home, away, share, rng) {
  const l = goalLambdas(home, away, share);
  const gh = poissonSample(l.home, rng);
  const ga = poissonSample(l.away, rng);
  return { gh, ga };
}

// GE-BALANCE-003 — penalidade de formação recém-trocada (atk pior, def pior).
export function withFormationPenalty(side) {
  return { ...side, atk: side.atk * 0.92, def: side.def / 0.92 };
}
// GE-BALANCE-001 — adversário motivado contra sequência de invencibilidade.
// Degraus pela sequência de jogos sem perder do clube humano (Brasileirão).
export const OPPONENT_MOTIVATION_STREAK_STEPS = [
  { minStreak: 12, mod: 1.12 },
  { minStreak: 8, mod: 1.08 },
  { minStreak: 5, mod: 1.04 },
];
export function motivacaoDoAdversario(sequencia) {
  const step = OPPONENT_MOTIVATION_STREAK_STEPS.find((s) => (sequencia || 0) >= s.minStreak);
  return step ? step.mod : 1;
}
// AVISO-MOTIVADO (decisão do Murilo, 14/11): o aviso antes da partida, com o
// mesmo texto no motor (evento "aviso") e no Pré-jogo da v2. null sem bônus.
export function avisoAdversarioMotivado(sequencia) {
  if (!(motivacaoDoAdversario(sequencia) > 1)) return null;
  return { titulo: "Adversário motivado", detalhe: `Você chega com ${sequencia} jogos de invencibilidade — o rival hoje entra mais ligado para tentar frear a sequência.` };
}
export function withMotivation(side, mod) {
  if (!(mod > 1)) return side;
  return { ...side, atk: side.atk * mod, def: side.def / mod };
}

// Peso de sorteio da moral (moraleFactor de carreira.js).
export function moraleFactor(p) {
  const m = p.morale == null ? 70 : p.morale;
  return clamp(1 + (m - 70) / 100, 0.6, 1.3);
}

// Quem marca e quem dá o passe em `goals` gols (attributeGoals de
// carreira.js, sem tocar nos jogadores). `suppress` ({playerId, factor}):
// marcação individual reduz o peso de um jogador do time que ataca.
// Devolve, por gol: { scorer, assister|null, penalty }.
export function pickGoalAuthors(starters, goals, rng, suppress) {
  const out = [];
  if (!starters || !starters.length || !goals) return out;
  const weightFor = (p) => (suppress && p.id === suppress.playerId ? suppress.factor : 1);
  const atkWeights = starters.map((p) => ({ F: 4, M: 2, D: 0.6, G: 0.02 }[p.group] || 1) * moraleFactor(p) * weightFor(p));
  for (let i = 0; i < goals; i++) {
    const scorer = weightedPick(starters, atkWeights, rng);
    // ~8% dos gols viram "de pênalti" na narrativa (não muda o placar).
    const penalty = rng() < 0.08;
    let assister = null;
    // ~72% saem com assistência de um companheiro (nunca o artilheiro).
    if (!penalty && starters.length > 1 && rng() < 0.72) {
      const pool = starters.filter((p) => p.id !== scorer.id);
      const weights = pool.map((p) => ({ M: 3, F: 1.5, D: 0.8, G: 0.05 }[p.group] || 1) * moraleFactor(p) * weightFor(p));
      assister = weightedPick(pool, weights, rng);
    }
    out.push({ scorer, assister, penalty });
  }
  return out;
}

// Eventos de gol a partir das autorias (mesmo formato de antes).
export function goalEvents(picks) {
  const events = [];
  picks.forEach(({ scorer, assister, penalty }) => {
    if (penalty) events.push({ type: "penalty_awarded", player: scorer.name });
    events.push({ type: "gol", player: scorer.name, playerId: scorer.id, assistPlayer: assister ? assister.name : null, assistPlayerId: assister ? assister.id : null, penalty });
  });
  return events;
}

// Chances perdidas e defesas do goleiro (camada decorativa: não toca no placar).
export function chanceEvents(starters, atk, def, share, rng) {
  const events = [];
  if (!starters || !starters.length) return events;
  const lambda = clamp((atk * def) * 7, 1, 14) * share;
  const count = poissonSample(lambda, rng);
  const weights = starters.map((p) => ({ F: 4, M: 2, D: 0.7, G: 0.05 }[p.group] || 1));
  for (let i = 0; i < count; i++) {
    const player = weightedPick(starters, weights, rng);
    events.push({ type: rng() < 0.38 ? "defesa" : "chance_perdida", player: player.name });
  }
  return events;
}

// Pênalti perdido (decorativo, raro).
export function penaltyMissEvents(starters, share, rng) {
  const events = [];
  if (!starters || !starters.length) return events;
  if (rng() >= 0.04 * share) return events;
  const weights = starters.map((p) => ({ F: 4, M: 2, D: 0.7 }[p.group] || 1.2));
  const player = weightedPick(starters, weights, rng);
  events.push({ type: "penalty_awarded", player: player.name });
  events.push({ type: "penalty_missed", player: player.name });
  return events;
}

// ~12% dos gols passam pelo VAR, que sempre confirma (só narrativa).
export function varCheckEvents(goals, rng) {
  const out = [];
  goals.forEach((e) => { if (rng() < 0.12) out.push({ type: "var_check", mine: e.mine }); });
  return out;
}

// Estatísticas do trecho (posse ponderada, finalizações, no alvo, faltas).
// Devolve o NOVO objeto de estatísticas (o recebido não é alterado).
export function addChunkStats(stats, home, away, share, chancesHome, chancesAway, gh, ga, rng) {
  const s = {
    ...stats,
    shots: { ...stats.shots }, shotsOnTarget: { ...stats.shotsOnTarget }, fouls: { ...stats.fouls },
  };
  const homeRatio = home.atk / (home.atk + away.atk || 1);
  s.possWeightHome += homeRatio * share;
  s.chunkShareSum = (s.chunkShareSum || 0) + share;
  s.shots.home += chancesHome.length + gh;
  s.shots.away += chancesAway.length + ga;
  s.shotsOnTarget.home += chancesHome.filter((e) => e.type === "defesa").length + gh;
  s.shotsOnTarget.away += chancesAway.filter((e) => e.type === "defesa").length + ga;
  s.fouls.home += poissonSample(11 * share, rng);
  s.fouls.away += poissonSample(11 * share, rng);
  return s;
}

// Copa (formato de jogo único): empate vai direto para os pênaltis,
// levemente enviesado pelo overall médio dos dois elencos.
export function cupPenaltyHomeWins(avgHome, avgAway, rng) {
  const pHome = clamp(0.5 + (avgHome - avgAway) / 100, 0.25, 0.75);
  return rng() < pHome;
}
