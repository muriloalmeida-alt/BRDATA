// Cópia congelada do carreira.js de ANTES da etapa D2 (09/11): a coletiva
// (estado pendente, disparo e efeito da resposta), a perna da Copa ao vivo e
// o amistoso ao vivo, que foram para public/js/motor/posjogo.js ou passaram
// a chamá-lo, tal e qual. A coletiva pendente era uma variável da página.
// Referência do test_motor_posjogo.js: não editar.
let PENDING_PRESS = null;
let PRESS_CHAIN_TO_ROUND_RESULTS = false;
const PRESS_LOG_MAX = 40;

const MORAL_INTERVIEW_SCALE = 3;

const REPUTATION_INTERVIEW_POINTS = 10;

const REPUTATION_INTERVIEW_WEIGHT = 0.1;

const FRIENDLY_TICKET_SHARE = 0.3;

function firePressConference(id, roundPlayed, chainToRoundResults) {
  const entry = pressLibraryEntry(id);
  if (!entry) return;
  PENDING_PRESS = { entry, roundPlayed: roundPlayed != null ? roundPlayed : CAREER.currentRound };
  PRESS_CHAIN_TO_ROUND_RESULTS = !!chainToRoundResults;
}

function applyPressEffects(entry, roundPlayed, letra) {
  const resposta = entry.respostas.find((r) => r.letra === letra);
  if (!resposta) return null;
  const repDelta = Math.round(resposta.reputacao * REPUTATION_INTERVIEW_POINTS * REPUTATION_INTERVIEW_WEIGHT);
  CAREER.reputation = clamp((CAREER.reputation == null ? 50 : CAREER.reputation) + repDelta, 0, 100);
  const moralDelta = resposta.moral * MORAL_INTERVIEW_SCALE;
  if (moralDelta) {
    CAREER.squad.filter((p) => p.origin === "principal").forEach((p) => {
      p.morale = clamp((p.morale == null ? 70 : p.morale) + moralDelta, 0, 100);
    });
  }
  CAREER.pressLog = CAREER.pressLog || [];
  CAREER.pressLog.unshift({ round: roundPlayed, gatilho: entry.gatilho, pergunta: entry.pergunta, letra, texto: resposta.texto, reputacao: repDelta, moral: moralDelta });
  if (CAREER.pressLog.length > PRESS_LOG_MAX) CAREER.pressLog.length = PRESS_LOG_MAX;
  return { repDelta, moralDelta };
}

function startCupLegLive(tie, phase, leg, round) {
  const hostId = leg === 1 ? tie.home : tie.away;
  const guestId = leg === 1 ? tie.away : tie.home;
  const isHome = String(hostId) === String(CAREER.clubId);
  const home = teamById(hostId), away = teamById(guestId);
  const cpuTeamId = isHome ? guestId : hostId;
  const cpuXI = pickCpuXI(leagueSquadFor(cpuTeamId));
  LIVE_MATCH = {
    round, humanFx: { home: hostId, away: guestId }, isHome, home, away, cpuXI, otherResults: [], standingsBefore: null,
    cupContext: { tie, phase, leg },
    chunkIndex: 0, gh: 0, ga: 0, events: [], appeared: new Set(),
    subsUsed: 0, subsBonus: 0, formationPenaltyChunksLeft: 0,
    lastHsStarters: [], lastAsStarters: [],
    timerId: null, paused: false, finished: false,
    speed: 1,
    stats: { possWeightHome: 0, shots: { home: 0, away: 0 }, shotsOnTarget: { home: 0, away: 0 }, fouls: { home: 0, away: 0 } },
    goalHighlightQueue: [], goalHighlightOnDone: null, goalHighlightTimer: null,
    injuredBeforeIds: new Set(CAREER.squad.filter((p) => p.status === "contundido").map((p) => p.id)),
  };
  renderLiveMatch();
  document.getElementById("liveMatchOverlay").classList.add("open");
  playWhistle(1);
  startCrowdAmbience();
  // Nenhum aviso de "adversário motivado" aqui — GE-BALANCE-001 é
  // deliberadamente só Brasileirão (ver opponentMotivationMod), a
  // sequência de invencibilidade não é lida nem afetada pela Copa.
  toast({ title: `Copa do Brasil — ${leg === 1 ? "Ida" : "Volta"}`, detail: `${CUP_PHASE_LABEL[phase]} contra ${isHome ? away.name : home.name}.` }, { type: "info" });
  scheduleNextChunk();
}

async function finishCupLegLive() {
  const lm = LIVE_MATCH;
  const { tie, phase, leg } = lm.cupContext;
  lm.finished = true;
  playWhistle(3);
  stopCrowdAmbience();
  const legScore = leg === 1 ? tie.leg1 : tie.leg2;
  if (leg === 1) { legScore.gh = lm.gh; legScore.ga = lm.ga; }
  else { legScore.gh = lm.ga; legScore.ga = lm.gh; }
  const summaryEvents = lm.events.filter((e) => e.type === "gol" || e.type === "amarelo" || e.type === "vermelho");
  // Copa NÃO soma em CAREER.teamStats (tallyTeamStats) — só em
  // careerTotals.copa* (ver settleCupTieOutcome), mesma separação já
  // estabelecida pelo formato legado.
  applyConditionRecovery(Array.from(lm.appeared));
  let ticketRevenue = null;
  if (lm.isHome) {
    ticketRevenue = computeTicketRevenue(lm.home);
    CAREER.finances.cash += ticketRevenue.revenue;
  }
  applyNaturalAgingEvolution(lm.isHome ? lm.lastHsStarters : lm.lastAsStarters);
  CAREER.cup.pendingLiveLeg = null;
  let finalResult = null;
  if (leg === 2) finalResult = finalizeCupPhaseExpanded(phase, lm.round, false);
  document.getElementById("liveMatchOverlay").classList.remove("open");
  LIVE_MATCH = null;
  ponteFim(await persistCareer());
  renderAll();
  // Explicabilidade (CLAUDE.md §45) — resumo por toast em vez de um
  // modal dedicado (fora de escopo — "não misturar engine com redesign
  // visual", ver checkpoint aprovado): placar da perna + o que
  // significa pro chaveamento.
  const isHomeTieNow = String(tie.home) === String(CAREER.clubId);
  const myLegGoals = isHomeTieNow ? legScore.gh : legScore.ga, oppLegGoals = isHomeTieNow ? legScore.ga : legScore.gh;
  let detail = `${myLegGoals} x ${oppLegGoals}${summaryEvents.some((e) => e.type !== "gol") ? " — ver Copa do Brasil pra detalhes de cartão" : ""}.`;
  if (leg === 2) {
    const won = String(tie.winner) === String(CAREER.clubId);
    const aggMine = isHomeTieNow ? tie.leg1.gh + tie.leg2.gh : tie.leg1.ga + tie.leg2.ga;
    const aggOpp = isHomeTieNow ? tie.leg1.ga + tie.leg2.ga : tie.leg1.gh + tie.leg2.gh;
    detail = `Agregado ${aggMine} x ${aggOpp}${tie.penalties ? " (pênaltis)" : ""} — ${won ? (phase === "final" ? "campeão da Copa do Brasil! 🏆" : "classificado") : "eliminado"}.`;
  }
  toast({ title: `Copa do Brasil — ${leg === 1 ? "Ida" : "Volta"} decidida`, detail }, { type: leg === 2 && String(tie.winner) !== String(CAREER.clubId) ? "warn" : "pos" });
  // Continua a mesma cadeia de sempre depois de "Resultados da rodada"
  // (ver btnRoundResultsContinue) — a perna ao vivo intercala ANTES
  // dela, não substitui o resto do fluxo. Carreira 2.0 (fase 4): no
  // pós-jogo da v2 a cadeia é da v2 (ponte posJogo), não destes modais.
  if (V2_PONTE && PONTE.seq) return;
  if (CAREER.pendingOffer) openPlayerOfferModal();
  else openTabelaModal();
}

function startFriendlyLive(slot) {
  if (!slot.opp) slot.opp = slot.invites[0];
  commitLineupTactics();
  const home = teamById(CAREER.clubId), away = teamById(slot.opp);
  // Snapshot do que o amistoso NÃO pode mudar (ver finishFriendlyLive).
  const snapshot = new Map(CAREER.squad.map((p) => [p.id, {
    status: p.status, outUntilRound: p.outUntilRound, injurySeverity: p.injurySeverity, yellowCards: p.yellowCards,
    goalsSeason: p.goalsSeason, assistsSeason: p.assistsSeason, goalsCareer: p.goalsCareer, assistsCareer: p.assistsCareer, apps: p.apps,
  }]));
  LIVE_MATCH = {
    round: CAREER.currentRound, humanFx: { home: CAREER.clubId, away: slot.opp }, isHome: true, home, away,
    cpuXI: pickCpuXI(leagueSquadFor(slot.opp)), otherResults: [], standingsBefore: null,
    friendlyContext: { slot, snapshot },
    chunkIndex: 0, gh: 0, ga: 0, events: [], appeared: new Set(),
    subsUsed: 0, subsBonus: 0, formationPenaltyChunksLeft: 0,
    lastHsStarters: [], lastAsStarters: [],
    timerId: null, paused: false, finished: false,
    speed: 1,
    stats: { possWeightHome: 0, shots: { home: 0, away: 0 }, shotsOnTarget: { home: 0, away: 0 }, fouls: { home: 0, away: 0 } },
    goalHighlightQueue: [], goalHighlightOnDone: null, goalHighlightTimer: null,
    injuredBeforeIds: new Set(CAREER.squad.filter((p) => p.status === "contundido").map((p) => p.id)),
  };
  renderLiveMatch();
  document.getElementById("liveMatchOverlay").classList.add("open");
  playWhistle(1);
  startCrowdAmbience();
  toast({ title: "Amistoso", detail: `${home.name} x ${away.name} — não vale pontos.` }, { type: "info" });
  scheduleNextChunk();
}

async function finishFriendlyLive() {
  const lm = LIVE_MATCH;
  const { slot, snapshot } = lm.friendlyContext;
  lm.finished = true;
  playWhistle(3);
  stopCrowdAmbience();
  applyConditionRecovery(Array.from(lm.appeared));
  applyNaturalAgingEvolution(lm.lastHsStarters);
  const rng = seededRngFromKey(`friendly-injury:${calendarTurnKey()}`);
  let injuriesKept = 0;
  CAREER.squad.forEach((p) => {
    const before = snapshot.get(p.id);
    if (!before) return;
    const newInjury = p.status === "contundido" && before.status !== "contundido";
    if (newInjury && rng() < 0.5) { injuriesKept++; } // lesão confirmada (risco menor: metade)
    else { p.status = before.status; p.outUntilRound = before.outUntilRound; p.injurySeverity = before.injurySeverity; }
    // cartão não vale em amistoso; gol/assistência/jogo oficial também não
    p.yellowCards = before.yellowCards;
    if (p.status === "suspenso" && before.status !== "suspenso") { p.status = before.status; p.outUntilRound = before.outUntilRound; }
    ["goalsSeason", "assistsSeason", "goalsCareer", "assistsCareer", "apps"].forEach((k) => { p[k] = before[k]; });
  });
  const ticket = Math.round(computeTicketRevenue(lm.home).revenue * FRIENDLY_TICKET_SHARE);
  CAREER.finances.cash += ticket;
  if (ticket) pushLedger("bilheteria", "Bilheteria de amistoso", ticket, CAREER.currentRound);
  slot.played = true;
  slot.result = { gh: lm.gh, ga: lm.ga };
  const opp = lm.away;
  pushNotification("partida", `Amistoso: ${CAREER.clubName} ${lm.gh} x ${lm.ga} ${opp.name}.`);
  document.getElementById("liveMatchOverlay").classList.remove("open");
  LIVE_MATCH = null;
  // O amistoso é o jogo da semana — fecha a semana (treino, prazos, mês).
  const weekTurn = runCalendarOffWeek();
  // Carreira 2.0 (fase 3): resumo da semana para a tela "Semana concluída".
  if (V2_PONTE && PONTE.antesSemana) {
    PONTE.semana = ponteResumoSemana(PONTE.antesSemana, [weekTurn], { amistososPerdidos: 0, amistoso: { adversario: opp.name, gh: lm.gh, ga: lm.ga, lesoes: injuriesKept, bilheteria: ticket } });
    PONTE.antesSemana = null;
  }
  ponteFim(await persistCareer());
  renderAll();
  toast({ title: `Amistoso: ${lm.gh} x ${lm.ga}`, detail: `Contra o ${opp.name} — não vale pontos${injuriesKept ? `; ${injuriesKept} lesão confirmada` : ""}. Semana concluída.` }, { type: lm.gh >= lm.ga ? "pos" : "info" });
}
