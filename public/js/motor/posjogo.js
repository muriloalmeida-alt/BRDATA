/* ===================================================================
   MOTOR — PÓS-JOGO (plano "sem página escondida", etapa D2, 09/11)
   -------------------------------------------------------------------
   O que vem depois (ou ao lado) da partida do Brasileirão, extraído de
   carreira.js sem mudar regra nem texto:
   - a coletiva de imprensa: a coletiva pendente (motor/estado.js) e o
     efeito da resposta (reputação, moral do elenco, registro);
   - a perna da Copa do Brasil ao vivo: início e fim (placar no
     confronto, renda, evolução, decisão da fase);
   - o amistoso ao vivo: início e fim (só metade das lesões vale,
     cartões e números oficiais voltam, bilheteria reduzida).

   A partida em si (blocos, substituição, tática) é a de motor/aovivo.js.
   O modal da coletiva, o apito, a torcida, os avisos de fim e a
   gravação ficam na página (decisão de 09/11: regra no motor, modal na
   tela).
=================================================================== */
import { carreiraAtual, timePorId, partidaAtual, definirPartida, definirColetivaPendente, definirColetivaEncadeada } from "./estado.js";
import { pushNotification } from "./registro.js";
import { ambiente, calendarTurnKey, leagueSquadFor, pushLedger } from "./semana.js";
import { applyConditionRecovery, decidirPrelimDoTecnico, finalizeCupPhaseExpanded, finalizePrelim, pickCpuXI, settleCupTieOutcome } from "./fechamento.js";
import { pressLibraryEntry, computeTicketRevenue, applyNaturalAgingEvolution } from "./aovivo.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const teamById = (id) => timePorId(id);

export const REPUTATION_INTERVIEW_POINTS = 10;

export const REPUTATION_INTERVIEW_WEIGHT = 0.1;

export const PRESS_LOG_MAX = 40;

export const MORAL_INTERVIEW_SCALE = 3; // Efeito Moral do arquivo (-3..+3) vira -9..+9 de moral geral do elenco

export function applyPressEffects(entry, roundPlayed, letra) {
  const CAREER = carreiraAtual();
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

export const FRIENDLY_TICKET_SHARE = 0.3;

// ---------- A coletiva pendente ----------
// Mora em motor/estado.js (coletivaPendente), como o LIVE_MATCH; nunca é
// gravada. A página mostra o modal e responde chamando applyPressEffects.
export function firePressConference(id, roundPlayed, chainToRoundResults) {
  const CAREER = carreiraAtual();
  const entry = pressLibraryEntry(id);
  if (!entry) return;
  definirColetivaPendente({ entry, roundPlayed: roundPlayed != null ? roundPlayed : CAREER.currentRound });
  definirColetivaEncadeada(!!chainToRoundResults);
}

// ---------- Perna da Copa ao vivo (GE-COPA-001): as partes de regra de
// startCupLegLive e finishCupLegLive (carreira.js) ----------
export function iniciarPernaCopa(tie, phase, leg, round) {
  const CAREER = carreiraAtual();
  const hostId = leg === 1 ? tie.home : tie.away;
  const guestId = leg === 1 ? tie.away : tie.home;
  const isHome = String(hostId) === String(CAREER.clubId);
  const home = teamById(hostId), away = teamById(guestId);
  const cpuTeamId = isHome ? guestId : hostId;
  const cpuXI = pickCpuXI(leagueSquadFor(cpuTeamId));
  return definirPartida({
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
  });
}
// Fecha a perna: placar no confronto (relativo à identidade home/away DO
// CONFRONTO), recuperação, renda em casa, evolução e, na volta, a decisão da
// fase. Devolve o placar da perna, os lances do resumo e o resultado da fase.
export function encerrarPernaCopa() {
  const CAREER = carreiraAtual();
  const lm = partidaAtual();
  const { tie, phase, leg } = lm.cupContext;
  lm.finished = true;
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
  // SERIED-001: a preliminar é jogo único (empate vai aos pênaltis).
  if (phase === "prelim") { decidirPrelimDoTecnico(tie); finalResult = finalizePrelim(lm.round, false); }
  else if (leg === 2) finalResult = finalizeCupPhaseExpanded(phase, lm.round, false);
  return { legScore, summaryEvents, finalResult };
}

// ---------- Amistoso ao vivo (GE-CALENDAR-001, B2): as partes de regra de
// startFriendlyLive e finishFriendlyLive (carreira.js) ----------
export function iniciarAmistoso(slot) {
  const CAREER = carreiraAtual();
  if (!slot.opp) slot.opp = slot.invites[0];
  const home = teamById(CAREER.clubId), away = teamById(slot.opp);
  // Snapshot do que o amistoso NÃO pode mudar (ver finishFriendlyLive).
  const snapshot = new Map(CAREER.squad.map((p) => [p.id, {
    status: p.status, outUntilRound: p.outUntilRound, injurySeverity: p.injurySeverity, yellowCards: p.yellowCards,
    goalsSeason: p.goalsSeason, assistsSeason: p.assistsSeason, goalsCareer: p.goalsCareer, assistsCareer: p.assistsCareer, apps: p.apps,
  }]));
  return definirPartida({
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
  });
}
// Fecha o amistoso: recuperação, evolução, só metade das lesões vale, cartão
// e números oficiais voltam ao que eram, bilheteria reduzida, resultado no
// calendário e a notificação. Devolve as lesões que ficaram e a bilheteria.
export function encerrarAmistoso() {
  const CAREER = carreiraAtual();
  const lm = partidaAtual();
  const { slot, snapshot } = lm.friendlyContext;
  lm.finished = true;
  applyConditionRecovery(Array.from(lm.appeared));
  applyNaturalAgingEvolution(lm.lastHsStarters);
  const rng = ambiente.rngDaChave(`friendly-injury:${calendarTurnKey()}`);
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
  return { injuriesKept, ticket, opp };
}
