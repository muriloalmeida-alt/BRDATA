// Cópia congelada do carreira.js de ANTES da etapa C3 (09/11): as funções
// e constantes do fechamento da rodada que foram para
// public/js/motor/fechamento.js, tal e qual. Referência do
// test_motor_fechamento.js: não editar.
const FORMATIONS = {
  "4-4-2":     [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","MEI D"],["M","VOL"],["M","VOL"],["M","MEI E"],["F","ATA"],["F","ATA"]],
  "4-3-3":     [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","VOL"],["M","MEI"],["M","MEI"],["F","PONTA D"],["F","CENTROAV."],["F","PONTA E"]],
  "4-2-3-1":   [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","VOL"],["M","VOL"],["M","MEIA D"],["M","MEIA C"],["M","MEIA E"],["F","CENTROAV."]],
  "3-5-2":     [["G","GOL"],["D","ZAG"],["D","ZAG"],["D","ZAG"],["M","ALA D"],["M","VOL"],["M","MEI"],["M","VOL"],["M","ALA E"],["F","ATA"],["F","ATA"]],
  "4-5-1":     [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","MEI D"],["M","VOL"],["M","MEI"],["M","VOL"],["M","MEI E"],["F","CENTROAV."]],
  "5-3-2":     [["G","GOL"],["D","ALA D"],["D","ZAG"],["D","ZAG"],["D","ZAG"],["D","ALA E"],["M","VOL"],["M","MEI"],["M","VOL"],["F","ATA"],["F","ATA"]],
  // Pedido do usuário ("precisamos expandir as formações, existem
  // outras várias que não estão disponíveis") — mesmo padrão de sempre
  // (grupo real G/D/M/F + rótulo só ilustrativo do rótulo da vaga, ver
  // comentário de SUBPOS_ORDER acima sobre por que não existe posição
  // mais fina que isso). Cobre esquemas clássicos do futebol brasileiro
  // que ainda não tinham representante (linha de 5 só tinha o mais
  // defensivo 5-3-2; faltava toda a família 3-4-X; faltava um losango
  // de meio-campo e o "quadrado mágico", os dois bem característicos
  // do Brasileirão).
  "4-1-4-1":   [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","VOL"],["M","MEI D"],["M","MEI"],["M","MEI"],["M","MEI E"],["F","CENTROAV."]],
  "4-4-1-1":   [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","MEI D"],["M","VOL"],["M","VOL"],["M","MEI E"],["F","SEGUNDO ATA"],["F","CENTROAV."]],
  "3-4-3":     [["G","GOL"],["D","ZAG"],["D","ZAG"],["D","ZAG"],["M","ALA D"],["M","VOL"],["M","VOL"],["M","ALA E"],["F","PONTA D"],["F","CENTROAV."],["F","PONTA E"]],
  "4-1-3-2":   [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","VOL"],["M","MEIA D"],["M","MEIA C"],["M","MEIA E"],["F","ATA"],["F","ATA"]],
  "3-4-2-1":   [["G","GOL"],["D","ZAG"],["D","ZAG"],["D","ZAG"],["M","ALA D"],["M","VOL"],["M","VOL"],["M","ALA E"],["F","MEIA D"],["F","MEIA E"],["F","CENTROAV."]],
  "4-3-1-2":   [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","VOL"],["M","MEI D"],["M","MEI E"],["M","ENGANCHE"],["F","ATA"],["F","ATA"]],
  "4-2-2-2":   [["G","GOL"],["D","LAT D"],["D","ZAG"],["D","ZAG"],["D","LAT E"],["M","VOL"],["M","VOL"],["M","MEIA D"],["M","MEIA E"],["F","ATA"],["F","ATA"]],
  "5-4-1":     [["G","GOL"],["D","ALA D"],["D","ZAG"],["D","ZAG"],["D","ZAG"],["D","ALA E"],["M","MEI D"],["M","VOL"],["M","VOL"],["M","MEI E"],["F","CENTROAV."]],
};

const FORMATION_MOD = {
  "4-4-2": { atk: 1.00, def: 1.00 },
  "4-3-3": { atk: 1.06, def: 0.96 },
  "4-2-3-1": { atk: 1.02, def: 1.02 },
  "3-5-2": { atk: 1.05, def: 0.95 },
  "4-5-1": { atk: 0.93, def: 1.07 },
  "5-3-2": { atk: 0.90, def: 1.10 },
  "4-1-4-1": { atk: 0.97, def: 1.05 },
  "4-4-1-1": { atk: 0.98, def: 1.03 },
  "3-4-3": { atk: 1.10, def: 0.88 },
  "4-1-3-2": { atk: 1.07, def: 0.95 },
  "3-4-2-1": { atk: 1.04, def: 0.94 },
  "4-3-1-2": { atk: 1.05, def: 0.96 },
  "4-2-2-2": { atk: 1.08, def: 0.92 },
  "5-4-1": { atk: 0.88, def: 1.12 },
};

const TACTIC_AXES = [
  { id: "ritmo", label: "Ritmo de jogo", lowLabel: "Muito paciente", highLabel: "Muito direto" },
  { id: "pressao", label: "Pressão", lowLabel: "Baixa", highLabel: "Alta" },
  { id: "linhaDefensiva", label: "Linha defensiva", lowLabel: "Recuada", highLabel: "Adiantada" },
  { id: "estiloPasse", label: "Estilo de passe", lowLabel: "Curto", highLabel: "Bola longa" },
];

const TACTIC_AXIS_DELTA = {
  ritmo: { atk: 0.025, def: -0.02 },
  pressao: { atk: 0.02, def: -0.025 },
  linhaDefensiva: { atk: 0.015, def: -0.025 },
  estiloPasse: { atk: 0.02, def: -0.015 },
};

function tacticAxisMod(axisId, level) {
  const d = TACTIC_AXIS_DELTA[axisId];
  const steps = (level == null ? 3 : level) - 3; // -2..+2
  return { atk: 1 + d.atk * steps, def: 1 + d.def * steps };
}

function combinedTacticMod() {
  const t = CAREER.lineup.tactics || {};
  let atk = 1, def = 1;
  TACTIC_AXES.forEach((ax) => {
    const m = tacticAxisMod(ax.id, t[ax.id]);
    atk *= m.atk; def *= m.def;
  });
  const sectorMod = combinedSectorTacticMod();
  atk *= sectorMod.atk; def *= sectorMod.def;
  // Segurança: 19 dials ao todo (4 eixos gerais + 15 instruções por
  // setor) combinados multiplicativamente PODERIAM, no extremo teórico
  // de maximizar todos na mesma direção, compor um multiplicador bem
  // maior que qualquer categoria isolada já produzia antes — trava no
  // mesmo teto que o resto do motor já respeita pra atk/def efetivos
  // (computeHumanStrength usa 0.7-1.3 pros outros multiplicadores).
  return { atk: clamp(atk, 0.7, 1.35), def: clamp(def, 0.7, 1.35) };
}

const SECTOR_INSTRUCTIONS = {
  defesa: [
    { id: "linhaDefensivaSetor", label: "Linha defensiva", lowLabel: "Recuada", highLabel: "Adiantada", atk: 0.008, def: -0.01 },
    { id: "pressaoPosPerda", label: "Pressão pós-perda", lowLabel: "Baixa", highLabel: "Alta", atk: 0.006, def: -0.01 },
    { id: "compactacao", label: "Compactação", lowLabel: "Aberta", highLabel: "Compacta", atk: -0.004, def: 0.01 },
    { id: "saidaDeBola", label: "Saída de bola", lowLabel: "Direta", highLabel: "Construída", atk: 0.006, def: 0.004 },
    { id: "bolaParadaDefensiva", label: "Bola parada defensiva", lowLabel: "Zona", highLabel: "Individual", atk: 0, def: 0.008 },
  ],
  meio: [
    { id: "marcacaoIntensidade", label: "Intensidade de marcação", lowLabel: "Leve", highLabel: "Severa", atk: 0.004, def: 0.008 },
    { id: "amplitude", label: "Amplitude", lowLabel: "Estreito", highLabel: "Largo", atk: 0.008, def: -0.004 },
    { id: "transicao", label: "Transição defesa-ataque", lowLabel: "Lenta", highLabel: "Rápida", atk: 0.01, def: -0.006 },
    { id: "rotacaoDeBola", label: "Rotação de bola", lowLabel: "Direta", highLabel: "Construída", atk: 0.006, def: 0.004 },
    { id: "coberturaEspacos", label: "Cobertura de espaços", lowLabel: "Individual", highLabel: "Coletiva", atk: -0.004, def: 0.01 },
  ],
  ataque: [
    { id: "amplitudeOfensiva", label: "Amplitude ofensiva", lowLabel: "Concentrado", highLabel: "Aberto", atk: 0.008, def: -0.004 },
    { id: "movimentacao", label: "Movimentação sem bola", lowLabel: "Estática", highLabel: "Dinâmica", atk: 0.01, def: -0.002 },
    { id: "ultimosPasses", label: "Últimos passes", lowLabel: "Seguros", highLabel: "Arriscados", atk: 0.012, def: -0.008 },
    { id: "finalizacao", label: "Finalização", lowLabel: "Seletiva", highLabel: "Voluntariosa", atk: 0.01, def: -0.006 },
    { id: "bolaParadaOfensiva", label: "Bola parada ofensiva", lowLabel: "Direta", highLabel: "Trabalhada", atk: 0.008, def: 0 },
  ],
};

const SECTOR_IDS = Object.keys(SECTOR_INSTRUCTIONS); // ["defesa", "meio", "ataque"]
const SECTOR_LABEL = { defesa: "Defesa", meio: "Meio", ataque: "Ataque" };

function combinedSectorTacticMod() {
  const st = CAREER.lineup && CAREER.lineup.sectorTactics;
  let atk = 1, def = 1;
  if (!st) return { atk, def };
  SECTOR_IDS.forEach((sector) => {
    const values = st[sector] || {};
    SECTOR_INSTRUCTIONS[sector].forEach((instr) => {
      const level = values[instr.id] == null ? 3 : values[instr.id];
      const steps = level - 3;
      atk *= 1 + instr.atk * steps;
      def *= 1 + instr.def * steps;
    });
  });
  return { atk, def };
}

const CUP_PHASES = ["r16", "qf", "sf", "final"];

const CUP_ROUNDS = { r16: 6, qf: 14, sf: 22, final: 30 };

const CUP_PRIZE = {
  // NOVOS (GE-COPA-001) — prêmio por avançar da Fase 1 (r32) e da 2ª
  // fase (r16). Sem colisão com o formato legado: lá "r16" é a fase de
  // ENTRADA (ninguém "avança pra" ela, CUP_PRIZE.r16 nunca é lido —
  // ver CUP_PHASES.indexOf(phase)+1 em resolveCupPhaseLegacy), a mesma
  // fórmula de indexação no formato expandido (CUP_PHASES_EXPANDED)
  // agora sim lê essa chave ao avançar da r32 pra r16.
  r32: 150000, r16: 350000,
  qf: 500000, sf: 1500000, final: 4000000, champion: 10000000, runnerUp: 3000000, // preservados tal e qual
};

const CUP_PHASES_EXPANDED = ["fase1", "r32", "r16", "qf", "sf", "final"];

const CUP_ROUNDS_EXPANDED = {
  fase1: { ida: 3, volta: 6 }, r32: { ida: 9, volta: 12 }, r16: { ida: 15, volta: 18 },
  qf: { ida: 21, volta: 24 }, sf: { ida: 27, volta: 30 }, final: { ida: 33, volta: 36 },
};

function shuffleWithRng(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function freshCupTie(home, away) {
  return { home, away, leg1: { gh: null, ga: null }, leg2: { gh: null, ga: null }, winner: null, penalties: false };
}

function simulateCupLeg(hostId, guestId, round) {
  const host = teamById(hostId), guest = teamById(guestId);
  const isHost = String(hostId) === String(CAREER.clubId), isGuest = String(guestId) === String(CAREER.clubId);
  const hs = isHost ? computeHumanStrength(host) : { atk: host.atk, def: host.def, starters: pickCpuXI(leagueSquadFor(hostId)) };
  const as = isGuest ? computeHumanStrength(guest) : { atk: guest.atk, def: guest.def, starters: pickCpuXI(leagueSquadFor(guestId)) };
  // GE-BALANCE-003 (issue #30) — club.def é "menor = defesa melhor"
  // (coeficiente de propensão a sofrer gol, não uma força — ver
  // buildRealPlayer/buildGeneratedProPlayer, que já fazem
  // (2 - club.def) pra inverter isso quando precisam de "maior =
  // melhor"). A fórmula de gol multiplica pelo def do DEFENSOR (não
  // divide) pra respeitar esse sentido: defesa melhor (def menor) ->
  // lambda menor (menos gols esperados contra ela).
  const { gh, ga } = motorPartida().scoreGoals(hs, as, 1, Math.random);
  if (isHost) applyConditionRecovery(hs.starters.map((p) => p.id));
  if (isGuest) applyConditionRecovery(as.starters.map((p) => p.id));
  if (isHost) simulatePlayerEvents(hs.starters, gh, round);
  if (isGuest) simulatePlayerEvents(as.starters, ga, round);
  return { gh, ga };
}

function simulateCupTie(homeId, awayId, round) {
  const { gh, ga } = simulateCupLeg(homeId, awayId, round);
  let winner, penalties = false;
  if (gh > ga) winner = homeId;
  else if (ga > gh) winner = awayId;
  else {
    // Empate no jogo único -> pênaltis (sem prorrogação simulada, vai
    // direto pra decisão). Levemente enviesado pelo overall médio dos
    // 2 elencos, mas ainda bem sujeito ao acaso — pênalti é loteria
    // até no futebol de verdade.
    penalties = true;
    winner = motorPartida().cupPenaltyHomeWins(squadAvgOverallOf(homeId), squadAvgOverallOf(awayId), Math.random) ? homeId : awayId;
  }
  return { gh, ga, penalties, winner };
}

function resolveCupPhase(round, opts = {}) {
  const cup = CAREER.cup;
  if (!cup || !cup.active || cup.phase === "done") return null;
  return cup.expanded ? resolveCupPhaseExpanded(round, opts) : resolveCupPhaseLegacy(round, opts);
}

function settleCupTieOutcome({ phase, winner, myGoals, oppGoals, round, silent, nextPrizeKey }) {
  const cup = CAREER.cup;
  const humanWon = String(winner) === String(CAREER.clubId);
  if (!silent) {
    if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
    CAREER.careerTotals.copaJ++;
    CAREER.careerTotals.copaGp += myGoals;
    CAREER.careerTotals.copaGc += oppGoals;
    if (myGoals > oppGoals) CAREER.careerTotals.copaV++;
    else if (myGoals === oppGoals) CAREER.careerTotals.copaE++;
    else CAREER.careerTotals.copaD++;
    if (phase === "sf") CAREER.careerTotals.copaSemisReached = (CAREER.careerTotals.copaSemisReached || 0) + 1;
    if (phase === "final") CAREER.careerTotals.copaFinalsReached = (CAREER.careerTotals.copaFinalsReached || 0) + 1;
  }
  if (humanWon) {
    if (!silent) {
      const prize = phase === "final" ? CUP_PRIZE.champion : CUP_PRIZE[nextPrizeKey];
      if (prize) {
        CAREER.finances.cash += prize;
        pushTransferLog(`Copa do Brasil: classificação${phase === "final" ? " como campeão" : ""} rendeu ${fmtBRL(prize)} aos cofres do clube.`, round);
        pushLedger("premiacao", `Copa do Brasil — premiação${phase === "final" ? " de campeão" : ""}`, prize, round);
      }
    }
  } else {
    cup.humanAlive = false;
    cup.humanEliminatedAtRound = silent ? null : round;
    cup.humanEliminatedStage = phase;
    if (phase === "final" && !silent) {
      CAREER.finances.cash += CUP_PRIZE.runnerUp;
      pushTransferLog(`Copa do Brasil: vice-campeão rendeu ${fmtBRL(CUP_PRIZE.runnerUp)} aos cofres do clube.`, round);
      pushLedger("premiacao", "Copa do Brasil — premiação de vice-campeão", CUP_PRIZE.runnerUp, round);
    }
  }
}

function resolveCupPhaseLegacy(round, { silent = false } = {}) {
  const cup = CAREER.cup;
  const phase = cup.phase;
  if (!silent && CUP_ROUNDS[phase] !== round) return null;
  const ties = cup.ties[phase];
  ties.forEach((tie) => {
    const r = silent
      ? { gh: 0, ga: 0, penalties: true, winner: (squadAvgOverallOf(tie.home) + Math.random() * 10) >= (squadAvgOverallOf(tie.away) + Math.random() * 10) ? tie.home : tie.away }
      : simulateCupTie(tie.home, tie.away, round);
    tie.gh = r.gh; tie.ga = r.ga; tie.winner = r.winner; tie.penalties = r.penalties;
    const humanInvolved = String(tie.home) === String(CAREER.clubId) || String(tie.away) === String(CAREER.clubId);
    if (!humanInvolved) return;
    const isHomeTie = String(tie.home) === String(CAREER.clubId);
    const myGoals = isHomeTie ? r.gh : r.ga, oppGoals = isHomeTie ? r.ga : r.gh;
    settleCupTieOutcome({ phase, winner: r.winner, myGoals, oppGoals, round, silent, nextPrizeKey: CUP_PHASES[CUP_PHASES.indexOf(phase) + 1] });
  });
  const results = ties.map((t) => ({ ...t }));
  if (phase === "final") {
    cup.champion = ties[0].winner;
    cup.championIsHuman = String(cup.champion) === String(CAREER.clubId);
    cup.phase = "done";
    // Retenção/Engajamento — "Campeão da Copa" (conquista permanente,
    // nunca reseta). Contador cumulativo, não boolean direto, pro
    // mesmo motivo do "Ídolo"/"Joia da Base": um save de migração
    // "silent" não deveria contar título nenhum retroativo que a
    // simulação normal (com prêmio/notícia de verdade) nunca gerou.
    if (!silent && cup.championIsHuman) {
      CAREER.titlesWonCopa = (CAREER.titlesWonCopa || 0) + 1;
      evaluateAlwaysCheckableAchievements();
    }
  } else {
    const winners = ties.map((t) => t.winner);
    const nextPhase = CUP_PHASES[CUP_PHASES.indexOf(phase) + 1];
    const nextTies = [];
    for (let i = 0; i < winners.length; i += 2) nextTies.push({ home: winners[i], away: winners[i + 1], gh: null, ga: null, winner: null, penalties: false });
    cup.ties[nextPhase] = nextTies;
    cup.phase = nextPhase;
  }
  return { phase, results };
}

function resolveCupPhaseExpanded(round, { silent = false } = {}) {
  const cup = CAREER.cup;
  const phase = cup.phase;
  const rounds = CUP_ROUNDS_EXPANDED[phase];
  const ties = cup.ties[phase];
  let leg;
  if (silent) {
    leg = ties.some((t) => t.leg1.gh == null) ? 1 : 2;
  } else if (round === rounds.ida) leg = 1;
  else if (round === rounds.volta) leg = 2;
  else return null; // essa rodada não é dia de Copa nesta fase
  let deferredHuman = false;
  ties.forEach((tie) => {
    const humanInvolved = String(tie.home) === String(CAREER.clubId) || String(tie.away) === String(CAREER.clubId);
    if (humanInvolved && !silent) {
      cup.pendingLiveLeg = { phase, leg, round };
      deferredHuman = true;
      return;
    }
    const hostId = leg === 1 ? tie.home : tie.away;
    const guestId = leg === 1 ? tie.away : tie.home;
    const r = silent ? { gh: 0, ga: 0 } : simulateCupLeg(hostId, guestId, round);
    const legScore = leg === 1 ? tie.leg1 : tie.leg2;
    // gh/ga do "tie" são sempre relativos à identidade home/away DO
    // CONFRONTO (não de quem jogou em casa nesta perna) — a perna de
    // volta inverte o mando de campo, então inverte a atribuição aqui.
    if (leg === 1) { legScore.gh = r.gh; legScore.ga = r.ga; }
    else { legScore.gh = r.ga; legScore.ga = r.gh; }
  });
  if (deferredHuman) return { phase, leg, deferred: true, results: ties.map((t) => ({ ...t })) };
  if (leg === 1) return { phase, leg: 1, results: ties.map((t) => ({ ...t })) };
  return finalizeCupPhaseExpanded(phase, round, silent);
}

function finalizeCupPhaseExpanded(phase, round, silent) {
  const cup = CAREER.cup;
  const ties = cup.ties[phase];
  ties.forEach((tie) => {
    const aggHome = tie.leg1.gh + tie.leg2.gh, aggAway = tie.leg1.ga + tie.leg2.ga;
    let winner, penalties = false;
    if (aggHome > aggAway) winner = tie.home;
    else if (aggAway > aggHome) winner = tie.away;
    else {
      // Empate no agregado -> pênaltis direto (sem regra de gols fora
      // — abolida na Copa do Brasil e na UEFA de verdade desde 2021,
      // ver checkpoint de desenho aprovado). Mesmo enviesamento leve
      // do formato legado.
      penalties = true;
      winner = motorPartida().cupPenaltyHomeWins(squadAvgOverallOf(tie.home), squadAvgOverallOf(tie.away), Math.random) ? tie.home : tie.away;
    }
    tie.winner = winner; tie.penalties = penalties;
    const humanInvolved = String(tie.home) === String(CAREER.clubId) || String(tie.away) === String(CAREER.clubId);
    if (!humanInvolved) return;
    const isHomeTie = String(tie.home) === String(CAREER.clubId);
    const myGoals = isHomeTie ? aggHome : aggAway, oppGoals = isHomeTie ? aggAway : aggHome;
    settleCupTieOutcome({ phase, winner, myGoals, oppGoals, round, silent, nextPrizeKey: CUP_PHASES_EXPANDED[CUP_PHASES_EXPANDED.indexOf(phase) + 1] });
  });
  const results = ties.map((t) => ({ ...t }));
  if (phase === "final") {
    cup.champion = ties[0].winner;
    cup.championIsHuman = String(cup.champion) === String(CAREER.clubId);
    cup.phase = "done";
    if (!silent && cup.championIsHuman) {
      CAREER.titlesWonCopa = (CAREER.titlesWonCopa || 0) + 1;
      evaluateAlwaysCheckableAchievements();
    }
  } else {
    const winners = ties.map((t) => t.winner);
    const nextPhase = CUP_PHASES_EXPANDED[CUP_PHASES_EXPANDED.indexOf(phase) + 1];
    let nextTies;
    if (nextPhase === "r32") {
      // Funde os vencedores da Fase 1 com os cabeças de chave — mesmo
      // sorteio determinístico de sempre, chave própria (não reusa a
      // seed do sorteio da Fase 1, pra não repetir o mesmo embaralhado).
      const pool = shuffleWithRng([...winners, ...cup.seeds], seededRngFromKey(`cup-r32-draw:${CAREER.clubId}:${CAREER.seasonYear}`));
      nextTies = [];
      for (let i = 0; i < pool.length; i += 2) nextTies.push(freshCupTie(pool[i], pool[i + 1]));
    } else {
      nextTies = [];
      for (let i = 0; i < winners.length; i += 2) nextTies.push(freshCupTie(winners[i], winners[i + 1]));
    }
    cup.ties[nextPhase] = nextTies;
    cup.phase = nextPhase;
  }
  return { phase, leg: 2, results };
}

const CPU_XI_MIX = { G: 1, D: 4, M: 4, F: 2 };

function pickCpuXI(squad) {
  if (!squad.length) return [];
  const okFirst = squad.filter((p) => p.status === "ok");
  const pool = okFirst.length >= 11 ? okFirst : squad; // sem gente "ok" suficiente, usa todo mundo mesmo
  const used = new Set();
  const xi = [];
  Object.entries(CPU_XI_MIX).forEach(([g, n]) => {
    pool.filter((p) => p.group === g && !used.has(p.id)).sort((a, b) => b.overall - a.overall)
      .slice(0, n).forEach((p) => { xi.push(p); used.add(p.id); });
  });
  if (xi.length < 11) {
    pool.filter((p) => !used.has(p.id)).sort((a, b) => b.overall - a.overall)
      .slice(0, 11 - xi.length).forEach((p) => { xi.push(p); used.add(p.id); });
  }
  return xi;
}

function resolveOtherDivisionsRound(round) {
  if (!CAREER.otherDivisions) return; // carreira sem o sistema ativado (ver migrateCareerDefaults) — nada a fazer
  Object.entries(CAREER.otherDivisions).forEach(([compId, division]) => {
    const teamsById = new Map((CAREER.divisionTeams[compId] || []).map((t) => [String(t.id), t]));
    // Fase 12, etapa 2: rodada só de placar (motor/rodada.js).
    motorModulo("rodada").playSimpleRound(division.schedule[round] || [], teamsById, division.standings, Math.random);
  });
}

const CASH_HISTORY_MAX = 8;

function pushCashSnapshot(round) {
  CAREER.cashHistory = CAREER.cashHistory || [];
  CAREER.cashHistory.push({ round, cash: CAREER.finances.cash });
  if (CAREER.cashHistory.length > CASH_HISTORY_MAX) CAREER.cashHistory.shift();
}

function shouldExerciseBuyOption(option, { human }) {
  if (!option) return false;
  if (option.mandatory) return true;
  if (human) return false;
  return Math.random() < 0.55;
}

function settleLoanOut(clubId, p) {
  const club = teamById(clubId);
  const option = p.loanBuyOption;
  if (shouldExerciseBuyOption(option, { human: false })) {
    CAREER.finances.cash += option.value;
    delete p.onLoanFromClubId; delete p.loanReturnRound; delete p.loanBuyOption;
    pushTransferLog(`${club.name} acionou a cláusula de compra e ficou definitivamente com ${p.name} por ${fmtBRL(option.value)}.`, CAREER.currentRound);
    pushLedger("transferencia", `Cláusula de compra — ${p.name} (${club.name})`, option.value, CAREER.currentRound);
    toast(`${abbreviateName(p.name)} foi comprado em definitivo pelo ${club.name}!`);
    return;
  }
  CAREER.leagueSquads[clubId] = (CAREER.leagueSquads[clubId] || []).filter((x) => x !== p);
  delete p.onLoanFromClubId; delete p.loanReturnRound; delete p.loanBuyOption;
  CAREER.squad.push(p);
  pushTransferLog(`${p.name} voltou do empréstimo no ${club.name}.`, CAREER.currentRound);
  toast(`${abbreviateName(p.name)} voltou do empréstimo!`, { type: "pos" });
}

function settleLoanIn(p) {
  const option = p.loanBuyOption;
  let buys = false;
  if (option) {
    if (option.mandatory) buys = true;
    else {
      // Opcional do seu lado: só compra se realmente couber no
      // orçamento com o salário CHEIO de volta (contrato definitivo
      // não sai mais pelo valor reduzido do empréstimo).
      const wageAfter = wageBillOf(CAREER.squad) - p.wage + p.loanOriginalWage;
      buys = CAREER.finances.cash >= option.value && wageAfter <= CAREER.finances.wageCap;
    }
  }
  if (buys) {
    CAREER.finances.cash -= option.value;
    p.wage = p.loanOriginalWage;
    p.origin = "principal";
    delete p.loanFromClubId; delete p.loanOriginalWage; delete p.loanReturnRound; delete p.loanBuyOption;
    pushTransferLog(`Você acionou a cláusula e comprou ${p.name} em definitivo por ${fmtBRL(option.value)}.`, CAREER.currentRound);
    pushLedger("transferencia", `Cláusula de compra — ${p.name}`, -option.value, CAREER.currentRound);
    toast(`${abbreviateName(p.name)} contratado em definitivo!`, { type: "pos" });
    return;
  }
  const fromId = String(p.loanFromClubId);
  const fromClub = teamById(fromId);
  CAREER.squad = CAREER.squad.filter((x) => x !== p);
  p.origin = "principal";
  if (p.loanOriginalWage != null) p.wage = p.loanOriginalWage;
  delete p.loanFromClubId; delete p.loanOriginalWage; delete p.loanReturnRound; delete p.loanBuyOption;
  (CAREER.leagueSquads[fromId] = CAREER.leagueSquads[fromId] || []).push(p);
  const remainingIds = new Set(CAREER.squad.map((x) => x.id));
  CAREER.lineup.starters = CAREER.lineup.starters.map((id) => (id && remainingIds.has(id) ? id : null));
  CAREER.lineup.bench = CAREER.lineup.bench.filter((id) => remainingIds.has(id));
  pushTransferLog(`${p.name} voltou pro ${fromClub.name} depois do empréstimo.`, CAREER.currentRound);
  toast(`Empréstimo de ${abbreviateName(p.name)} terminou — ele voltou pro ${fromClub.name}.`);
}

function checkMidSeasonLoanReturns(round) {
  Object.keys(CAREER.leagueSquads).forEach((clubId) => {
    const due = (CAREER.leagueSquads[clubId] || []).filter((p) =>
      p.onLoanFromClubId && String(p.onLoanFromClubId) === String(CAREER.clubId) && p.loanReturnRound != null && p.loanReturnRound <= round
    );
    due.forEach((p) => settleLoanOut(clubId, p));
  });
  CAREER.squad.filter((p) => p.origin === "loan" && p.loanReturnRound != null && p.loanReturnRound <= round)
    .forEach((p) => settleLoanIn(p));
}

function autoFixLineup(round) {
  const changes = [];
  const usedIds = new Set([...CAREER.lineup.starters.filter(Boolean), ...CAREER.lineup.bench]);
  CAREER.lineup.starters = CAREER.lineup.starters.map((id, idx) => {
    const p = id ? CAREER.squad.find((x) => x.id === id) : null;
    if (p && p.status === "ok") return id;
    const grp = FORMATIONS[CAREER.lineup.formation][idx][0];
    const benchPlayers = CAREER.lineup.bench.map((bid) => CAREER.squad.find((x) => x.id === bid)).filter(Boolean);
    let repl = benchPlayers.find((x) => x.status === "ok" && x.group === grp)
      || benchPlayers.find((x) => x.status === "ok")
      || CAREER.squad.filter((x) => x.status === "ok" && !usedIds.has(x.id)).sort((a, b) => b.overall - a.overall)
        .find((x) => x.group === grp)
      || CAREER.squad.filter((x) => x.status === "ok" && !usedIds.has(x.id)).sort((a, b) => b.overall - a.overall)[0];
    if (repl) {
      usedIds.delete(id); usedIds.add(repl.id);
      CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== repl.id);
      if (p) changes.push(`${abbreviateName(repl.name)} entra no time titular no lugar de ${abbreviateName(p.name)} (indisponível)`);
      return repl.id;
    }
    return null;
  });
  return changes;
}

function computeHumanStrength(club) {
  // "loan" conta junto com "principal" aqui — jogador emprestado é
  // força de verdade do seu elenco enquanto estiver com você (mesmo
  // critério de wageBillOf).
  const principal = CAREER.squad.filter((p) => p.origin === "principal" || p.origin === "loan");
  const baselineAtk = avg(principal.map((p) => p.atk)) || 60;
  const baselineDef = avg(principal.map((p) => p.def)) || 60;
  const starters = CAREER.lineup.starters.map((id) => id && CAREER.squad.find((p) => p.id === id)).filter((p) => p && p.status === "ok");
  const usable = starters.length ? starters : principal.filter((p) => p.status === "ok").slice(0, 11);
  const startAtk = avg(usable.map((p) => p.atk)) || baselineAtk;
  const startDef = avg(usable.map((p) => p.def)) || baselineDef;
  const completeness = clamp(usable.length / 11, 0.6, 1);
  let atkMult = clamp(startAtk / baselineAtk, 0.7, 1.3) * completeness;
  let defMult = clamp(startDef / baselineDef, 0.7, 1.3) * completeness;
  const fMod = FORMATION_MOD[CAREER.lineup.formation] || { atk: 1, def: 1 };
  const tacticMod = combinedTacticMod();
  atkMult *= fMod.atk * tacticMod.atk;
  defMult *= fMod.def * tacticMod.def;
  const avgCond = avg(usable.map((p) => p.condition)) ?? 100;
  atkMult *= 0.85 + 0.15 * (avgCond / 100);
  defMult *= 0.90 + 0.10 * (avgCond / 100);
  return {
    atk: clamp(club.atk * atkMult, 0.35, 2.6),
    def: clamp(club.def / clamp(defMult, 0.55, 1.6), 0.3, 2.6),
    starters: usable,
  };
}

const INJURY_HISTORY_MAX = 10;

const INJURY_SEVERITY = [
  { type: "leve", label: "Leve", chance: 0.70, minRounds: 1, maxRounds: 3 },
  { type: "media", label: "Média", chance: 0.25, minRounds: 4, maxRounds: 7 },
  { type: "grave", label: "Grave", chance: 0.05, minRounds: 8, maxRounds: 14 },
];

function injurySeverityLabel(type) {
  return (INJURY_SEVERITY.find((t) => t.type === type) || INJURY_SEVERITY[0]).label;
}

function rollInjurySeverity() {
  const roll = Math.random();
  let acc = 0;
  for (const tier of INJURY_SEVERITY) {
    acc += tier.chance;
    if (roll < acc) return tier;
  }
  return INJURY_SEVERITY[0];
}

function injuryChanceFor(p) {
  const physFactor = clamp((70 - (p.phys || 70)) / 100, 0, 0.3);
  const condFactor = clamp((70 - (p.condition == null ? 100 : p.condition)) / 100, 0, 0.3);
  return clamp(0.02 + physFactor * 0.02 + condFactor * 0.02, 0.02, 0.04);
}

function attributeGoals(starters, goals, suppress) {
  const events = [];
  if (!starters || !starters.length || !goals) return events;
  // FASE 2 (b) — moral pesa no sorteio (ver moraleFactor); factor 1
  // pra quem nunca teve moral mexida (CPU/moral neutra), não muda nada.
  // Fase 12, etapa 1: quem marca e quem dá o passe vem do motor
  // (motor/partida.js, pickGoalAuthors, mesmos pesos e mesma ordem de
  // sorteio); aqui só se aplica no jogador o que foi sorteado.
  // - goalsSeason: contador SÓ da temporada atual, zerado na virada de
  //   ano (ver renewHumanSquad/renewLeagueSquad); goalsCareer nunca zera.
  // - Gol e assistência são UM evento atômico (assistPlayer); ~8% dos
  //   gols viram "de pênalti" na narrativa (sem assistência), sem somar
  //   gol nenhum (o placar já estava fechado pelo lambda).
  const picks = motorPartida().pickGoalAuthors(starters, goals, Math.random, suppress);
  picks.forEach(({ scorer, assister }) => {
    scorer.goalsCareer = (scorer.goalsCareer || 0) + 1;
    scorer.goalsSeason = (scorer.goalsSeason || 0) + 1;
    if (assister) {
      assister.assistsCareer = (assister.assistsCareer || 0) + 1;
      assister.assistsSeason = (assister.assistsSeason || 0) + 1;
    }
  });
  // UX-MERCADO-001 — ids junto dos nomes pra o lance virar link pro
  // perfil do jogador (ver playerLinkHTML/matchEventsSummaryHTML).
  events.push(...motorPartida().goalEvents(picks));
  return events;
}

function applyMatchWearChunk(starters, round, chunkShare, appearedSet) {
  const events = [];
  const redCardIds = [];
  if (!starters || !starters.length) return { events, redCardIds };
  starters.forEach((p) => {
    if (appearedSet && !appearedSet.has(p.id)) {
      p.apps = (p.apps || 0) + 1;
      // Item 6 da lista de melhorias ("histórico individual do
      // jogador... jogos/gols/assistências por ano") — appsSeason
      // reaproveita o MESMO padrão de goalsSeason/assistsSeason
      // (reseta na virada de temporada, ver renewHumanSquad/
      // renewLeagueSquad); p.apps continua sendo o total DE CARREIRA,
      // nunca zera, como sempre foi.
      p.appsSeason = (p.appsSeason || 0) + 1;
      appearedSet.add(p.id);
    }
    const roll = Math.random();
    if (roll < 0.012 * chunkShare) {
      p.status = "suspenso"; p.outUntilRound = round + 1; p.yellowCards = 0;
      events.push({ type: "vermelho", player: p.name, playerId: p.id });
      redCardIds.push(p.id);
    } else if (roll < 0.11 * chunkShare) {
      p.yellowCards = (p.yellowCards || 0) + 1;
      events.push({ type: "amarelo", player: p.name, playerId: p.id });
      if (p.yellowCards >= 3) {
        p.status = "suspenso"; p.outUntilRound = round + 1; p.yellowCards = 0;
        redCardIds.push(p.id);
      }
    }
    if (p.status === "ok" && Math.random() < injuryChanceFor(p) * chunkShare) {
      const severity = rollInjurySeverity();
      const dur = severity.minRounds + Math.floor(Math.random() * (severity.maxRounds - severity.minRounds + 1));
      // Bloco 5 ("pendentes" — tela "Histórico de fadiga") — snapshot da
      // fadiga ANTES desta lesão (a linha de baixo ainda vai atualizar
      // p.condition pelo desgaste deste chunk) — injuryChanceFor já pesa
      // condição/físico na chance de lesão, então essa correlação é
      // real, não só decorativa.
      const fadigaAntes = Math.round(100 - (p.condition == null ? 100 : p.condition));
      p.status = "contundido"; p.outUntilRound = round + dur; p.injurySeverity = severity.type;
      p.injuryHistory = p.injuryHistory || [];
      p.injuryHistory.push({ round, severity: severity.type, durationRounds: dur, fadigaAtInjury: fadigaAntes });
      if (p.injuryHistory.length > INJURY_HISTORY_MAX) p.injuryHistory.shift();
      // Central de notificações (Bloco 8 pendentes) — só o SEU clube
      // (applyMatchWearChunk também roda pros outros 19 times, ver
      // resolveCpuFixture; CAREER.squad contém as MESMAS referências de
      // jogador do seu elenco, então .includes() por identidade basta,
      // sem precisar de um parâmetro extra só pra isso). Gate pelo
      // toggle "Alertas de lesão" de Configurações.
      if (CAREER.squad && CAREER.squad.includes(p)) {
        pushNotification("lesao", `${abbreviateName(p.name)} sofreu uma lesão (${injurySeverityLabel(severity.type)}) — fora por ${dur} rodada(s).`, { gateBy: "lesao" });
      }
      // AJUSTE (Play-by-Play v2, pedido do usuário — documento "BR Data
      // Play-by-Play", catálogo INJURY) — a lesão já existia (a
      // mecânica em si é de antes desta sessão), só era silenciosa: não
      // virava evento nenhum no feed ao vivo. Agora narrada como
      // qualquer outro evento (ver COMMENTARY_BANK.lesao).
      events.push({ type: "lesao", player: p.name, playerId: p.id });
    }
    p.condition = clamp((p.condition == null ? 100 : p.condition) - (15 + Math.random() * 15) * chunkShare, 25, 100);
  });
  return { events, redCardIds };
}

function simulatePlayerEvents(starters, goals, round) {
  if (!starters || !starters.length) return [];
  const appeared = new Set(); // local — replica o "apps += 1 uma vez" de sempre numa chamada só
  const wear = applyMatchWearChunk(starters, round, 1, appeared);
  return [...attributeGoals(starters, goals), ...wear.events];
}

function freshMatchBucket() { return { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }; }

function freshCareerTotals() {
  return {
    j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, cleanSheets: 0, yellow: 0, red: 0, assists: 0,
    home: freshMatchBucket(), away: freshMatchBucket(),
    biggestWin: null, biggestLoss: null,
    longestWinStreak: 0, longestUnbeatenStreak: 0,
    seasonsPlayed: 0,
    // Copa do Brasil — separada do campeonato de pontos corridos (jogo
    // único eliminatório, decisão do usuário: "incluir, separado dos
    // números do Brasileirão").
    copaEditions: 0, copaJ: 0, copaV: 0, copaE: 0, copaD: 0, copaGp: 0, copaGc: 0,
    copaSemisReached: 0, copaFinalsReached: 0,
  };
}

function applyConditionRecovery(starterIds) {
  const set = new Set(starterIds);
  CAREER.squad.forEach((p) => {
    if (!set.has(p.id)) p.condition = clamp((p.condition == null ? 100 : p.condition) + (10 + Math.random() * 12), 0, 100);
  });
}

function myLeaguePosition() {
  return sortedStandings().findIndex((r) => String(r.id) === String(CAREER.clubId)) + 1;
}

function resolveCpuFixture(fx, round) {
  const home = teamById(fx.home), away = teamById(fx.away);
  const hs = { atk: home.atk, def: home.def, starters: pickCpuXI(leagueSquadFor(fx.home)) };
  const as = { atk: away.atk, def: away.def, starters: pickCpuXI(leagueSquadFor(fx.away)) };
  // GE-BALANCE-003 (issue #30) — ver comentário em simulateCupLeg.
  const { gh, ga } = motorPartida().scoreGoals(hs, as, 1, Math.random);
  // FASE 2 (a) — pedido do usuário: "estatísticas reais de todos os
  // times". Antes só o SEU time tinha elenco individual — o
  // adversário virava "Gol do <Time>" sem autor (ver histórico desse
  // comentário no git). Agora TODO clube tem elenco (ver
  // buildLeagueSquads/pickCpuXI), então toda partida da rodada —
  // não só a sua — credita gol/assistência/cartão a um jogador de
  // verdade, alimentando o ranking de artilheiros da competição
  // inteira (ver renderEstatisticas) mesmo em jogos CPU x CPU.
  const homeEvents = simulatePlayerEvents(hs.starters, gh, round);
  const awayEvents = simulatePlayerEvents(as.starters, ga, round);
  applyConditionRecovery(hs.starters.map((p) => p.id));
  applyConditionRecovery(as.starters.map((p) => p.id));
  const events = [...homeEvents, ...awayEvents];
  const result = { home: fx.home, away: fx.away, gh, ga };
  if (events.length) result.events = events;
  applyResultToStandings(result);
  (CAREER.resultsByRound[round] = CAREER.resultsByRound[round] || []).push(result);
  return result;
}

function finishRoundTail(round, allResults, humanMatch, standingsBefore) {
  // BUG CORRIGIDO: resultsByRound guardava o placar (e os eventos) de
  // TODOS os 380 jogos da temporada pra sempre, mas só a rodada
  // imediatamente anterior é lida em algum lugar (renderCentral, "Último
  // jogo"). Isso fazia o save crescer sem parar e, num relato real de
  // "não dá pra salvar o progresso" ao simular rodada, passar do limite
  // de 400KB do careerStore (server/src/careerStore.js) depois de
  // algumas dezenas de rodadas — daí em diante TODO PUT /api/career
  // falhava (413). Mantém só a rodada atual e a anterior.
  Object.keys(CAREER.resultsByRound).forEach((k) => {
    if (Number(k) < round - 1) delete CAREER.resultsByRound[k];
  });
  // Nova feature — Marcação individual: a designação só vale pro
  // confronto que acabou de rolar (é sobre um jogador ESPECÍFICO do
  // adversário DESSA rodada) — sempre limpa depois do jogo, força o
  // técnico a decidir de novo antes da próxima partida em vez de deixar
  // um efeito antigo grudado sem ninguém perceber.
  CAREER.manMarking = null;
  const nextRound = round + 1;
  refreshAvailability(nextRound);
  const lineupChanges = autoFixLineup(nextRound);
  CAREER.currentRound = nextRound;
  // FASE 3 (item 3) — empréstimo de 6 meses (loanReturnRound definido)
  // pode terminar NO MEIO da temporada — checa isso toda rodada, antes
  // do resto do fluxo (folha salarial, mercado) rodar com o elenco já
  // atualizado. Empréstimo de temporada inteira só resolve em
  // advanceSeason (ver resolveLoanReturns).
  checkMidSeasonLoanReturns(nextRound);
  // FASE 2 (b) — paga a folha salarial do elenco PRINCIPAL a cada
  // rodada simulada (aproximação: ~4 rodadas por mês numa temporada de
  // 38 rodadas, então 1/4 da folha mensal por rodada) — o caixa vai
  // diminuindo de verdade ao longo da temporada mesmo antes de existir
  // mercado de transferências (fase seguinte) pra gastar nele.
  // GE-CALENDAR-001 — com calendário, salário/patrocínio/TV são MENSAIS
  // (cobrados quando a semana vira o mês, ver advanceCalendarWeek, no fim
  // deste turno); sem calendário (carreira antiga até a próxima virada),
  // segue 1/4 do mês por rodada como sempre.
  let wagePaid = 0, sponsorIncome = 0;
  if (!calendarOn()) {
    // FASE 2 (b)/FASE 4 (item 5)/Bloco 6: 1/4 do mês de folha, comissão e
    // olheiros por rodada e 1/38 do patrocínio da temporada (motor/financas.js).
    const m = motorFinancas().roundEntries({
      squad: CAREER.squad, staffHired: !!(CAREER.technicalStaff && CAREER.technicalStaff.hired), scouts: CAREER.scouts, sponsorship: CAREER.sponsorship,
    });
    applyFinanceEntries(m.entries, round);
    wagePaid = m.wagePaid; sponsorIncome = m.sponsorIncome;
  }
  // Nova feature (Bloco 3) — parcelas de contratações já FECHADAS
  // (ver finalizeIncomingPurchase) continuam descontando o caixa a
  // cada rodada MESMO fora da janela de contratações (é dívida já
  // assumida, não uma negociação nova) — ver processPendingInstallments.
  const installmentsPaid = processPendingInstallments();
  if (installmentsPaid) pushLedger("parcela", "Parcela de contratação", -installmentsPaid, round);
  // Nova feature (Bloco 3, 3/4) — parcelas de vendas já FECHADAS (ver
  // acceptListingOffer) entram no caixa a cada rodada, mesmo espírito
  // de installmentsPaid acima, só que dinheiro chegando em vez de
  // saindo (ver processPendingReceivables).
  const installmentsReceived = processPendingReceivables();
  if (installmentsReceived) pushLedger("transferencia", "Parcela de venda", installmentsReceived, round);
  // Bloco 4 — extrato/mini-gráfico de caixa (ver pushCashSnapshot/
  // pushLedger) e andamento de obra do estádio (ver
  // tickStadiumUpgrade): 1x por rodada simulada, igual ao resto do
  // pagamento acima. ticketRevenue (bilheteria) já foi somado ao caixa
  // antes, em finishLiveMatch — só falta registrar no extrato aqui.
  if (humanMatch && humanMatch.ticketRevenue) {
    pushLedger("bilheteria", "Renda de bilheteria (jogo em casa)", humanMatch.ticketRevenue.revenue, round);
  }
  tickStadiumUpgrade();
  tickScoutMissions(round);
  pushCashSnapshot(round);
  // FASE 2 (c) — mercado de transferências: os outros 19 times também
  // negociam entre si (ver simulateAiTransfers) e, de vez em quando,
  // um deles propõe comprar um jogador SEU (ver maybeGenerateOffer,
  // resolvido em Mercado com aceitar/recusar).
  // FASE 1 (item 2) — só roda dentro da janela de transferências (ver
  // transferWindowStatus): fora da janela o mercado inteiro esfria,
  // não só a sua ação de comprar — senão os outros 19 times
  // continuariam negociando por baixo dos panos, minando a mesma
  // tensão de prazo que a janela existe pra criar.
  if (transferWindowStatus(round).open) {
    simulateAiTransfers(round);
    maybeGenerateOffer(round);
  }
  // Nova feature (Bloco 3) — resolve as propostas de compra pendentes
  // (ver resolvePendingOffersOutRound) MESMO fora da janela: a
  // proposta já foi enviada legitimamente dentro dela, só a resposta
  // do clube que pode cair um pouco depois do fechamento.
  resolvePendingOffersOutRound(round);
  // Nova feature (Bloco 3, 3/4) — sorteia propostas novas pros anúncios
  // de venda ativos (ver resolvePendingListingsRound) — mesmo raciocínio
  // de rodar fora da janela também (vender sempre foi liberado o ano
  // inteiro, ver transferWindowStatus).
  resolvePendingListingsRound();
  // Nova feature (pedido do usuário: "reinicie o tema do
  // rebaixamento") — a tabela das 2 divisões que o técnico não joga
  // avança 1 rodada em segundo plano, junto com a sua (ver
  // resolveOtherDivisionsRound — sem efeito nenhum em carreira sem o
  // sistema ativado).
  resolveOtherDivisionsRound(round);
  // FASE 2 (a) — Copa do Brasil: só resolve alguma coisa nas 4 rodadas
  // certas (ver CUP_ROUNDS) e só se seu clube ainda estiver na
  // competição (resolveCupPhase devolve null em qualquer outro caso —
  // ver comentário lá).
  const cup = resolveCupPhase(round);
  // FASE 4 (item 3) — notícias da rodada (ver generateRoundNews) — só
  // faz sentido calcular DEPOIS de tudo (tabela e Copa já atualizadas
  // pra essa rodada), mas usando o standingsBefore capturado no início
  // de simulateRound (ANTES de qualquer resultado dessa rodada mexer
  // na tabela) pra saber quem virou líder etc.
  const news = generateRoundNews(round, allResults, standingsBefore);
  // AJUSTE (pedido do usuário: "esperava uma tela exclusiva pra
  // notícias nos padrões de um portal de esportes") — até aqui as
  // manchetes só existiam durante o modal de resultados da rodada, sem
  // ficar guardadas em lugar nenhum. Agora também entram num feed
  // navegável (ver renderNewsScreen), com round/temporada anexados pra
  // dar contexto — mais NOVAS primeiro, capado em NEWS_FEED_MAX pra
  // não pesar o save (mesmo espírito de MAX_SEASON_HISTORY). AJUSTE
  // (pedido do usuário, revisão das modais de pós-jogo) — o flash
  // rápido dentro do modal de resultados da rodada foi removido (a
  // cobertura completa já mora na tela de Notícias, que abre antes
  // dele no mesmo fluxo); `news` não sai mais no objeto devolvido
  // abaixo, só alimenta CAREER.newsFeed aqui.
  const roundEntries = news.map((n) => ({ ...n, round, seasonYear: CAREER.seasonYear }));
  CAREER.newsFeed = roundEntries.concat(CAREER.newsFeed || []);
  if (CAREER.newsFeed.length > motorRegistro().NEWS_FEED_MAX) CAREER.newsFeed.length = motorRegistro().NEWS_FEED_MAX;
  // Central de notificações (Bloco 8 pendentes) — "posicao" não tem
  // toggle no mockup (sempre entra); "partida" (lembrete do próximo
  // jogo) tem toggle em Configurações. Comparado contra standingsBefore
  // (capturado ANTES desta rodada em simulateRound), não um campo à
  // parte — evita divergir se algo mudar a tabela no meio do caminho.
  const posBefore = positionInStandings(standingsBefore);
  const posAfter = myLeaguePosition();
  if (posBefore && posAfter && posBefore !== posAfter) {
    const verbo = posAfter < posBefore ? "subiu para" : "caiu para";
    pushNotification("posicao", `${CAREER.clubName} ${verbo} o ${posAfter}º lugar após a rodada.`);
  }
  if (calendarOn()) {
    const money = advanceCalendarWeek();
    wagePaid = money.wagePaid; sponsorIncome = money.sponsorIncome;
  }
  const nextFixture = (CAREER.schedule[nextRound] || []).find((m) => String(m.home) === String(CAREER.clubId) || String(m.away) === String(CAREER.clubId));
  if (nextFixture) {
    const oppId = String(nextFixture.home) === String(CAREER.clubId) ? nextFixture.away : nextFixture.home;
    const opp = teamById(oppId);
    if (opp) pushNotification("partida", `Seu próximo jogo é contra o ${opp.name}.`, { gateBy: "partida" });
  }
  return { round, humanMatch, allResults, lineupChanges, wagePaid, sponsorIncome, installmentsPaid, installmentsReceived, newOffer: CAREER.pendingOffer, cup };
}

function resolveRoundInstant(round, fixtures, standingsBefore) {
  const allResults = fixtures.map((fx) => resolveCpuFixture(fx, round));
  return finishRoundTail(round, allResults, null, standingsBefore);
}
