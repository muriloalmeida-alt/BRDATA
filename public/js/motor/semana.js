/* ===================================================================
   MOTOR — SEMANA (plano "sem página escondida", etapa C2, 09/11)
   -------------------------------------------------------------------
   A semana sem jogo e tudo o que ela resolve, extraído de carreira.js
   sem mudar regra nem texto (os comentários de cada regra continuam
   junto dos atalhos em carreira.js):
   - calendário (semana atual, fase, janela, virada de mês com folha,
     comissão, olheiros, patrocínio e cota de TV);
   - treino semanal, recuperação, volta de lesão;
   - obras do estádio e missões de olheiro (base e Mercado);
   - mercado da CPU, propostas recebidas, suas propostas (com
     concorrência e contraproposta), anúncios e parcelas;
   - extrato e histórico de transferências.

   Lê e grava a carreira atual do módulo de estado (motor/estado.js).
   Não chama a tela (decisões de 09/11): avisos viram o evento "aviso"
   e a coletiva depois de uma contratação grande vira o evento
   "coletiva" (motor/eventos.js); a página antiga mostra os dois como
   sempre. Nomes de jogador, sorteio por chave e o ano da temporada real
   vêm do ambiente (dados do mundo real, definirAmbiente).
=================================================================== */
import { carreiraAtual, ligaAtual, todosTimes, timePorId, forcaMediaDoElenco } from "./estado.js";
import { emitir } from "./eventos.js";
import { pushNotification, ensureObjectivesFresh, bumpObjective } from "./registro.js";
import { fmtBRL, abbreviateName } from "./texto.js";
import { sortRows } from "./tabela.js";
import * as financas from "./financas.js";
import * as mercado from "./mercado.js";
import * as treino from "./treino.js";
import * as temporada from "./temporada.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ---------- Ambiente: dados do mundo real (data.js e a API) ----------
// Também lido pelo fechamento da rodada (motor/fechamento.js, etapa C3).
export const ambiente = { primeirosNomes: [], sobrenomes: [], rngDaChave: null, temporadaReal: () => new Date().getFullYear(), contaCriadaEm: () => null };
let ambientePronto = false;
export function definirAmbiente(a) { Object.assign(ambiente, a); ambientePronto = true; }
export function temAmbiente() { return ambientePronto; }

// Avisos de tela viram o evento "aviso" (texto solto ou título e detalhe).
export function avisar(input, opts) {
  const tipo = opts && opts.type ? opts.type : null;
  // Duração própria do aviso (ex.: recusa de empréstimo, 5 s); sem ela, a da tela.
  const extra = opts && opts.durationMs ? { duracaoMs: opts.durationMs } : {};
  if (typeof input === "string") emitir("aviso", { texto: input, tipo, ...extra });
  else emitir("aviso", { titulo: input.title, detalhe: input.detail, tipo, ...extra });
}

// Mesmos atalhos de carreira.js para regras de outros módulos.
const teamById = (id) => timePorId(id);
const squadAvgOverallOf = (clubId) => forcaMediaDoElenco(clubId);
const sortedStandings = () => sortRows(carreiraAtual().standings);
const wageBillOf = (squad) => financas.wageBill(squad);
const computeContractFields = (overall, age, potential, rng) => temporada.computeContractFields(overall, age, potential, rng, ambiente.temporadaReal());
const youthPotentialRoll = (rng, bonus) => temporada.youthPotentialRoll(rng, bonus);

export const SUBPOS_LABEL = { GOL: "Goleiro", DEF: "Defensor", MEI: "Meio-campo", ATA: "Atacante" };

export function subPositionOf(p) {
  return { G: "GOL", D: "DEF", M: "MEI", F: "ATA" }[p.group] || "DEF";
}

export function marketClub(clubId) {
  const CAREER = carreiraAtual();
  let avg, amb, roster;
  return {
    id: String(clubId),
    squad: leagueSquadFor(clubId),
    minSize: minSquadSizeFor(clubId),
    maxSize: maxSquadSizeFor(clubId),
    // Titulares só no seu clube (CPU não tem titular fixo, ver pickCpuXI).
    starters: String(clubId) === String(CAREER.clubId) ? (CAREER.lineup.starters || []) : null,
    // Calculados só quando a regra precisa (mesmo custo de antes).
    get avgOverall() { if (avg === undefined) avg = squadAvgOverallOf(clubId); return avg; },
    get ambition() { if (amb === undefined) amb = clubAmbitionFactor(clubId); return amb; },
    get roster() { if (roster === undefined) roster = squadForClub(clubId); return roster; },
  };
}

export function applyFinanceEntries(entries, round) {
  const CAREER = carreiraAtual();
  entries.forEach((e) => {
    CAREER.finances.cash += e.amount;
    pushLedger(e.type, e.label, e.amount, round);
  });
}

export const MAX_PRINCIPAL = 60;

export function tickStadiumUpgrade() {
  const CAREER = carreiraAtual();
  const st = CAREER.stadium;
  if (!st || !st.pendingUpgrade) return;
  st.pendingUpgrade.roundsLeft -= 1;
  if (st.pendingUpgrade.roundsLeft <= 0) {
    const done = st.pendingUpgrade;
    st.capacityBonus += done.capacityGain;
    st.completed.push(done.id);
    st.pendingUpgrade = null;
    pushTransferLog(`Obra concluída no estádio: ${done.name}.`, CAREER.currentRound);
  }
}

export const MAX_LEAGUE_SQUAD = 26;

export const MIN_LEAGUE_SQUAD = 16;

export const MAX_LEAGUE_SQUAD_OTHER_DIVISION = 16;

export const MIN_LEAGUE_SQUAD_OTHER_DIVISION = 12;

export function leagueSquadFor(clubId) {
  const CAREER = carreiraAtual();
  return (CAREER.leagueSquads && CAREER.leagueSquads[String(clubId)]) || [];
}

export const TRANSFER_LOG_MAX = 60;

export function pushTransferLog(text, round) {
  const CAREER = carreiraAtual();
  CAREER.transferLog = CAREER.transferLog || [];
  CAREER.transferLog.unshift({ round, text });
  if (CAREER.transferLog.length > TRANSFER_LOG_MAX) CAREER.transferLog.length = TRANSFER_LOG_MAX;
}

export function pushLedger(type, label, amount, round) {
  const CAREER = carreiraAtual();
  // Mais recente primeiro, até 60 lançamentos (motor/financas.js, LEDGER_MAX).
  CAREER.financeLedger = financas.addLedgerEntry(CAREER.financeLedger, { round, type, label, amount });
}

export const CALENDAR_PHASE_BY_MONTH = ["ferias", "pre", "temporada", "temporada", "temporada", "temporada", "pausa", "temporada", "temporada", "temporada", "temporada", "temporada"];

export const CALENDAR_PHASE_LABEL = { ferias: "Férias", pre: "Pré-temporada", temporada: "Temporada", pausa: "Pausa de julho" };

export const CALENDAR_WINDOW_PHASES = new Set(["ferias", "pre", "pausa"]);

export const MONTH_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function calendarOn() { const CAREER = carreiraAtual(); return !!(CAREER && CAREER.calendar && Array.isArray(CAREER.calendar.weeks)); }

export function calendarWeek(i) { const CAREER = carreiraAtual(); return calendarOn() ? CAREER.calendar.weeks[i == null ? CAREER.calendar.idx : i] || null : null; }

export function calendarWeekMonth(w) { return Number(w.d.slice(0, 2)) - 1; }

export function calendarTurnKey() { const CAREER = carreiraAtual(); return calendarOn() ? `${CAREER.calendar.year}w${CAREER.calendar.idx}` : String(CAREER.currentRound); }

export function calendarWeekIndexOfRound(round) {
  const CAREER = carreiraAtual();
  return calendarOn() ? CAREER.calendar.weeks.findIndex((w) => w.r === round) : -1;
}

export function syncCalendarToRound() {
  const CAREER = carreiraAtual();
  if (!calendarOn() || CAREER.currentRound > 38) return;
  const wi = calendarWeekIndexOfRound(CAREER.currentRound);
  if (wi >= 0 && CAREER.calendar.idx > wi) CAREER.calendar.idx = wi;
}

export function applyCalendarMonthlyFinances(monthIdx) {
  const CAREER = carreiraAtual();
  const m = financas.monthEntries({
    squad: CAREER.squad, staffHired: !!(CAREER.technicalStaff && CAREER.technicalStaff.hired), scouts: CAREER.scouts,
    sponsorship: CAREER.sponsorship, tvMonthly: CAREER.calendar.tvMonthly, month: MONTH_LONG[monthIdx],
  });
  applyFinanceEntries(m.entries, CAREER.currentRound);
  return { wagePaid: m.wagePaid, sponsorIncome: m.income };
}

export function advanceCalendarWeek() {
  const CAREER = carreiraAtual();
  const cal = CAREER.calendar;
  const prev = calendarWeek();
  if (cal.idx >= cal.weeks.length - 1) return { wagePaid: 0, sponsorIncome: 0 };
  cal.idx += 1;
  const cur = calendarWeek();
  let money = { wagePaid: 0, sponsorIncome: 0 };
  if (calendarWeekMonth(cur) !== calendarWeekMonth(prev)) money = applyCalendarMonthlyFinances(calendarWeekMonth(cur));
  if (cur.p !== prev.p) {
    const win = CALENDAR_WINDOW_PHASES.has(cur.p);
    pushNotification("calendario", `${CALENDAR_PHASE_LABEL[cur.p]} — ${win ? "janela de transferências aberta" : "janela de transferências fechada (vender continua liberado)"}.`);
  }
  return money;
}

export function runCalendarOffWeek() {
  const CAREER = carreiraAtual();
  const week = calendarWeek();
  if (!week || week.r) return null;
  const round = CAREER.currentRound;
  if (week.p === "ferias") {
    CAREER.squad.forEach((p) => { p.condition = 100; });
  } else {
    applyWeeklyTraining();
    CAREER.squad.forEach((p) => { p.condition = clamp((p.condition == null ? 100 : p.condition) + 15, 0, 100); });
  }
  const healOneWeek = (p) => { if (p.status === "contundido" && p.outUntilRound != null && p.outUntilRound >= round) p.outUntilRound -= 1; };
  CAREER.squad.forEach(healOneWeek);
  Object.values(CAREER.leagueSquads || {}).forEach((sq) => sq.forEach(healOneWeek));
  refreshAvailability(round);
  tickStadiumUpgrade();
  tickScoutMissions(round);
  if (transferWindowStatus(round).open && CAREER.calendar.idx % 2 === 0) {
    simulateAiTransfers(round);
    maybeGenerateOffer(round);
  }
  resolvePendingOffersOutRound(round);
  resolvePendingListingsRound();
  const installmentsPaid = processPendingInstallments();
  if (installmentsPaid) pushLedger("parcela", "Parcela de contratação", -installmentsPaid, round);
  const installmentsReceived = processPendingReceivables();
  if (installmentsReceived) pushLedger("transferencia", "Parcela de venda", installmentsReceived, round);
  const money = advanceCalendarWeek();
  return { phase: week.p, ...money, installmentsPaid, installmentsReceived };
}

export function transferWindowStatus(round) {
  const CAREER = carreiraAtual();
  // GE-CALENDAR-001 — com calendário, a janela é a FASE do ano (férias,
  // pré-temporada e pausa de julho), não mais um intervalo de rodadas.
  if (calendarOn()) {
    const weeks = CAREER.calendar.weeks;
    const w = mercado.windowByCalendar(weeks, CAREER.calendar.idx, CALENDAR_WINDOW_PHASES);
    if (w.open) return { open: true, closesLabel: `até o fim de ${MONTH_LONG[calendarWeekMonth(weeks[w.lastIdx])]}` };
    return { open: false, opensLabel: w.nextIdx >= 0 ? `reabre em ${MONTH_LONG[calendarWeekMonth(weeks[w.nextIdx])]}` : "reabre em janeiro" };
  }
  return mercado.windowByRound(round);
}

export function marketTeamsPool() {
  const CAREER = carreiraAtual();
  const pool = CAREER.marketScope === "multi" ? todosTimes() : ligaAtual();
  return pool.filter((t) => t.competitionId !== "serie_d");
}

export function pickRandomOtherClub(excludeId) {
  const pool = marketTeamsPool().filter((t) => String(t.id) !== String(excludeId));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function isOwnDivisionTeam(teamId) {
  const CAREER = carreiraAtual();
  return Object.prototype.hasOwnProperty.call(CAREER.standings, teamId);
}

export function maxSquadSizeFor(teamId) {
  return isOwnDivisionTeam(teamId) ? MAX_LEAGUE_SQUAD : MAX_LEAGUE_SQUAD_OTHER_DIVISION;
}

export function minSquadSizeFor(teamId) {
  return isOwnDivisionTeam(teamId) ? MIN_LEAGUE_SQUAD : MIN_LEAGUE_SQUAD_OTHER_DIVISION;
}

export function necessidadeScore(candidate, squad, buyingClubId) {
  return mercado.necessidadeScore(candidate, squad, buyingClubId == null ? null : marketClub(buyingClubId));
}

export function financeiroScore(candidate, squad, buyingClubId) {
  return mercado.financeiroScore(candidate, squad, marketClub(buyingClubId));
}

export function clubPositionFactor(clubId) {
  if (!isOwnDivisionTeam(clubId)) return null; // sem tabela — clube de outra divisão
  const ranked = sortedStandings(); // já existe — mesmo critério de desempate de sempre
  return mercado.tablePositionFactor(ranked.findIndex((r) => String(r.id) === String(clubId)), ranked.length);
}

export function clubAmbitionFactor(clubId) {
  const posFactor = clubPositionFactor(clubId);
  if (posFactor != null) return posFactor;
  // Fora da própria divisão: sem tabela — força relativa contra os pares
  // da própria competição (motor/mercado.js, strengthAmbition).
  const team = teamById(clubId);
  const peers = todosTimes().filter((t) => t.competitionId === team.competitionId);
  return mercado.strengthAmbition(squadAvgOverallOf(clubId), peers.map((t) => squadAvgOverallOf(t.id)));
}

export function transferScore(candidate, buyingClubId) {
  return mercado.transferScore(candidate, marketClub(buyingClubId));
}

export function pickWeightedByScore(scoredList) {
  return mercado.pickWeightedByScore(scoredList, Math.random);
}

export function offerProbabilityFromScore(score) {
  return mercado.offerProbabilityFromScore(score);
}

export function squadForClub(clubId) {
  const CAREER = carreiraAtual();
  return String(clubId) === String(CAREER.clubId) ? CAREER.squad.filter((p) => p.origin === "principal") : leagueSquadFor(clubId);
}

export function calculateSellerReservationValue(player, sellingClubId, context = {}) {
  return mercado.calculateSellerReservationValue(player, marketClub(sellingClubId), context);
}

export function sellerNegotiationDecision(offerValue, reservationValue, rng = Math.random) {
  return mercado.sellerNegotiationDecision(offerValue, reservationValue, rng);
}

export function negotiateOffer(player, buyingClubId, sellingClubId, context = {}) {
  const CAREER = carreiraAtual();
  return mercado.negotiateOffer(player, marketClub(buyingClubId), marketClub(sellingClubId), { ...context, seasonYear: CAREER.seasonYear }, Math.random);
}

export function simulateAiTransfers(round) {
  const CAREER = carreiraAtual();
  let count = 0;
  if (Math.random() < 0.35) count = 1;
  if (Math.random() < 0.08) count = 2;
  for (let i = 0; i < count; i++) {
    const fromClub = pickRandomOtherClub(CAREER.clubId);
    if (!fromClub) continue;
    const fromSquad = leagueSquadFor(fromClub.id);
    // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das
    // 3 ligas") — teto/piso certo por time (ver maxSquadSizeFor/
    // minSquadSizeFor) — um time de outra divisão tem elenco menor de
    // propósito (MAX/MIN_LEAGUE_SQUAD_OTHER_DIVISION), então usar o
    // piso/teto do time da própria divisão pra ele deixaria o elenco
    // dele encolher demais ou crescer sem limite de verdade.
    if (fromSquad.length <= minSquadSizeFor(fromClub.id)) continue; // não esvazia um elenco CPU
    const toClub = pickRandomOtherClub(fromClub.id);
    if (!toClub || String(toClub.id) === String(CAREER.clubId)) continue; // negociação CPU x CPU só, não mexe no SEU elenco sem sua ação
    const toSquad = leagueSquadFor(toClub.id);
    if (toSquad.length >= maxSquadSizeFor(toClub.id)) continue; // elenco de destino já cheio
    // Fase 1.1 — Transfer AI: em vez de sortear um jogador qualquer do
    // elenco vendedor, ranqueia por transferScore (necessidade do
    // comprador + adequação ao seu nível + orçamento + contexto
    // esportivo, ver definições acima) e sorteia PONDERADO entre os
    // melhores (pickWeightedByScore) — quem vende/compra (fromClub/
    // toClub) continua escolhido do mesmo jeito de sempre, só QUAL
    // jogador muda de sorteio uniforme pra contextual.
    const candidatos = fromSquad
      .filter((p) => financeiroScore(p, toSquad, toClub.id) > 0)
      .map((p) => ({ item: p, score: transferScore(p, toClub.id) }));
    if (!candidatos.length) continue; // nenhum jogador daquele elenco cabe no orçamento do comprador agora
    const player = pickWeightedByScore(candidatos);
    fromSquad.splice(fromSquad.indexOf(player), 1);
    (CAREER.leagueSquads[String(toClub.id)] = CAREER.leagueSquads[String(toClub.id)] || []).push(player);
    pushTransferLog(`${toClub.name} contratou ${player.name} (${SUBPOS_LABEL[subPositionOf(player)]}) do ${fromClub.name} por ${fmtBRL(player.value)}.`, round);
  }
}

export const DECLINE_COOLDOWN_ROUNDS = 3; // cobre o resto da janela atual (janelas têm 3 rounds, ver TRANSFER_WINDOWS)

export function pruneRecentDeclines(round) {
  const CAREER = carreiraAtual();
  // "d.round <= round" também descarta entradas de uma temporada
  // ANTERIOR (currentRound volta pra 1 em advanceSeason — sem essa
  // checagem, round-d.round ficaria negativo e a entrada nunca seria
  // podada, crescendo pra sempre no save).
  CAREER.recentDeclines = (CAREER.recentDeclines || []).filter((d) => d.round <= round && round - d.round < DECLINE_COOLDOWN_ROUNDS);
  return CAREER.recentDeclines;
}

export function wasRecentlyDeclined(playerId, clubId, round) {
  return pruneRecentDeclines(round).some((d) => String(d.playerId) === String(playerId) && String(d.clubId) === String(clubId));
}

export function urgencyMultiplier(necessidade, round) {
  return mercado.urgencyMultiplier(necessidade, round);
}

export const OFFER_CHANCE_PER_ROUND = 0.18;

export function maybeGenerateOffer(round) {
  const CAREER = carreiraAtual();
  if (CAREER.pendingOffer) return; // só 1 proposta pendente por vez
  if (Math.random() >= OFFER_CHANCE_PER_ROUND) return;
  const principal = CAREER.squad.filter((p) => p.origin === "principal");
  if (principal.length <= 14) return;
  const player = principal[Math.floor(Math.random() * principal.length)];
  const eligible = marketTeamsPool().filter((t) =>
    String(t.id) !== String(CAREER.clubId) && leagueSquadFor(t.id).length < maxSquadSizeFor(t.id)
  );
  if (!eligible.length) return;
  const scored = eligible
    .filter((t) => financeiroScore(player, leagueSquadFor(t.id), t.id) > 0) // elimina quem claramente não pode pagar ANTES do RNG
    .filter((t) => !wasRecentlyDeclined(player.id, t.id, round)) // Fase 1.5 — não reoferece o mesmo par jogador/clube logo depois de recusado
    .map((t) => ({ item: t, score: transferScore(player, t.id) }));
  if (!scored.length) return; // nenhum clube consegue bancar esse jogador agora (ou só sobrou quem já foi recusado)
  const club = pickWeightedByScore(scored);
  const score = scored.find((s) => s.item === club).score;
  // Fase 1.5 — urgência de fim de janela (necessidade REAL do clube por
  // este jogador específico, não um estado de clube inventado).
  const urgency = urgencyMultiplier(necessidadeScore(player, leagueSquadFor(club.id), club.id), round);
  if (Math.random() >= offerProbabilityFromScore(score) * urgency) return; // score baixo -> raríssimo; score alto -> frequente
  // Fase 1.4 — a proposta única (transferValuation) vira o PONTO DE
  // PARTIDA de uma negociação interna (reserva do vendedor = você vs.
  // tolerância do comprador = o clube), resolvida antes de qualquer
  // coisa aparecer na tela (ver negotiateOffer) — você continua vendo
  // só Aceitar/Recusar um valor final, sem UI nova. Sem acordo
  // (vendedor rejeitou de vez, ou comprador não teve fôlego pra
  // fechar): nenhuma proposta nasce nesta rodada, igual a qualquer
  // outro "return" acima.
  const deal = negotiateOffer(player, club.id, CAREER.clubId);
  if (deal.outcome !== "accepted") return;
  const fee = Math.max(1000, deal.finalValue);
  CAREER.pendingOffer = { playerId: player.id, playerName: player.name, clubId: String(club.id), clubName: club.name, fee, round };
}

export function refreshAvailability(uptoRound) {
  const CAREER = carreiraAtual();
  const r = uptoRound != null ? uptoRound : CAREER.currentRound;
  CAREER.squad.forEach((p) => {
    if (p.status !== "ok" && p.outUntilRound != null && r > p.outUntilRound) {
      // Pedido do usuário: retorno de lesão baixa a condição (o
      // jogador não está com ritmo de jogo, mesmo tendo passado a
      // lesão toda descansando — ver INJURY_RETURN_CONDITION). Só
      // lesão, não suspensão — suspenso treinava normal, só não podia
      // entrar em campo.
      if (p.status === "contundido") {
        const cap = INJURY_RETURN_CONDITION[p.injurySeverity] ?? 60;
        p.condition = Math.min(p.condition == null ? 100 : p.condition, cap);
      }
      p.status = "ok"; p.outUntilRound = null; p.injurySeverity = null;
    }
  });
}

export function applyWeeklyTraining() {
  const CAREER = carreiraAtual();
  // GE-CALENDAR-001 — 1x por TURNO (semana no calendário; rodada no
  // modelo antigo), ver calendarTurnKey.
  if (String(CAREER.trainingAppliedForRound) === calendarTurnKey()) return null;
  const { patches, gains } = treino.trainingWeek({
    plan: CAREER.trainingPlan,
    squad: CAREER.squad,
    roundsSoFar: CAREER.currentRound - 1,
    // GE-CALENDAR-001 — pré-temporada: treino físico rende 1 ponto a mais.
    preseason: !!(calendarOn() && (calendarWeek() || {}).p === "pre"),
    round: CAREER.currentRound,
  }, Math.random);
  CAREER.squad.forEach((p) => Object.assign(p, patches.get(p.id)));
  CAREER.trainingAppliedForRound = calendarTurnKey();
  // Retenção/Engajamento — "Treine 1 jogador" (objetivo diário) conta
  // a SEMANA aplicada como 1 evento (não 1 por jogador afetado, senão
  // uma semana de "misto" já bateria a meta sozinha de propósito).
  if (gains.size) { ensureObjectivesFresh(); bumpObjective("daily", "obj_train_1_player", 1); }
  return gains;
}

export const INJURY_RETURN_CONDITION = { leve: 75, media: 60, grave: 45 };

export function allMarketPlayers() {
  const CAREER = carreiraAtual();
  const mine = CAREER.squad.filter((p) => p.origin === "principal")
    .map((p) => ({ p, club: teamById(CAREER.clubId), mine: true }));
  // Empréstimo: um jogador que VOCÊ deu emprestado (onLoanFromClubId)
  // fica temporariamente no elenco de outro clube, mas não é oferta de
  // mercado de verdade — filtra fora pra não aparecer como se fosse
  // "à venda" um jogador que já é seu (ver resolveLoanReturns).
  const others = Object.entries(CAREER.leagueSquads || {}).flatMap(([clubId, squad]) =>
    squad.filter((p) => !p.onLoanFromClubId).map((p) => ({ p, club: teamById(clubId), mine: false }))
  );
  return [...mine, ...others];
}

export function pendingOfferOutFor(playerId) {
  const CAREER = carreiraAtual();
  return (CAREER.pendingOffersOut || []).find((o) => String(o.playerId) === String(playerId));
}

export function finalizeIncomingPurchase(o) {
  const CAREER = carreiraAtual();
  const squad = leagueSquadFor(o.clubId);
  const idx = squad.findIndex((x) => String(x.id) === String(o.playerId));
  if (idx < 0) {
    avisar(`${abbreviateName(o.playerName)} não está mais disponível — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: `${abbreviateName(o.playerName)} não está mais disponível — negociação cancelada.` };
  }
  const p = squad[idx];
  // FASE1-MER: salário combinado com o atleta (propostas de antes: o atual).
  const salario = o.salario ? Math.round(o.salario) : p.wage;
  if (wageBillOf(CAREER.squad) + salario > CAREER.finances.wageCap) {
    avisar(`${o.clubName} aceitou, mas contratar ${abbreviateName(p.name)} agora estouraria seu teto salarial — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: `Contratar ${abbreviateName(p.name)} agora estouraria seu teto salarial — negociação cancelada.` };
  }
  if (CAREER.squad.length >= MAX_PRINCIPAL + 20) {
    avisar(`${o.clubName} aceitou, mas seu elenco está grande demais agora — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: "Seu elenco está grande demais agora — negociação cancelada." };
  }
  const perInstallment = Math.round(o.offerValue / o.installments / 1000) * 1000;
  const firstPayment = o.installments === 1 ? o.offerValue : perInstallment;
  if (CAREER.finances.cash < firstPayment) {
    avisar(`${o.clubName} aceitou, mas seu caixa não cobre nem a 1ª parcela agora — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: "Seu caixa não cobre nem a 1ª parcela agora — negociação cancelada." };
  }
  squad.splice(idx, 1);
  CAREER.finances.cash -= firstPayment;
  if (o.installments > 1) {
    CAREER.pendingInstallments = CAREER.pendingInstallments || [];
    CAREER.pendingInstallments.push({ roundsLeft: o.installments - 1, perRoundAmount: perInstallment, label: `Parcela de ${p.name}` });
  }
  p.origin = "principal";
  // FASE1-MER: contrato e promessa da proposta (propostas de antes: como eram).
  if (o.salario) p.wage = salario;
  if (o.anos) p.contractUntil = CAREER.seasonYear + Math.max(1, Number(o.anos)) - 1;
  if (o.papel) p.promessa = { papel: o.papel, temporada: CAREER.seasonYear };
  CAREER.squad.push(p);
  pushTransferLog(`Você contratou ${p.name} do ${o.clubName} por ${fmtBRL(o.offerValue)}${o.installments > 1 ? ` (${o.installments}x)` : ""}.`, CAREER.currentRound);
  pushLedger("transferencia", `Contratação — ${p.name} (${o.clubName})${o.installments > 1 ? ` — 1ª de ${o.installments} parcelas` : ""}`, -firstPayment, CAREER.currentRound);
  avisar(`${abbreviateName(p.name)} contratado! O ${o.clubName} aceitou sua proposta.`, { type: "pos" });
  ensureObjectivesFresh(); bumpObjective("daily", "obj_market_1_move", 1);
  if (p.overall >= 82) emitir("coletiva", { id: "15", rodada: CAREER.currentRound });
  return { ok: true, player: p };
}

export const RIVAL_OFFER_CHANCE_PER_ROUND = 0.35;

export function maybeSpawnRivalOffer(o) {
  const CAREER = carreiraAtual();
  if (o.rivalOffer || o.status !== "pending") return;
  if (Math.random() >= RIVAL_OFFER_CHANCE_PER_ROUND) return;
  const player = leagueSquadFor(o.clubId).find((x) => String(x.id) === String(o.playerId));
  if (!player) return; // jogador já não está mais lá — nada a disputar
  const pool = marketTeamsPool().filter((t) =>
    String(t.id) !== String(o.clubId) && String(t.id) !== String(CAREER.clubId) && leagueSquadFor(t.id).length < maxSquadSizeFor(t.id)
  );
  if (!pool.length) return;
  const scored = pool
    .filter((t) => financeiroScore(player, leagueSquadFor(t.id), t.id) > 0)
    .map((t) => ({ item: t, score: transferScore(player, t.id) }));
  if (!scored.length) return; // nenhum clube consegue bancar esse jogador agora
  const rivalClub = pickWeightedByScore(scored);
  const score = scored.find((s) => s.item === rivalClub).score;
  // Fase 1.5 — mesma urgência de fim de janela dos outros 2 caminhos.
  const urgency = urgencyMultiplier(necessidadeScore(player, leagueSquadFor(rivalClub.id), rivalClub.id), CAREER.currentRound);
  if (Math.random() >= offerProbabilityFromScore(score) * urgency) return;
  // Fase 1.4 — mesma negociação interna (vendedor = o clube dono do
  // jogador, o.clubId; comprador = o clube rival) — se o vendedor e o
  // rival não chegam a acordo internamente, simplesmente não nasce
  // oferta rival nesta rodada (igual a qualquer outro "return" acima).
  const rivalDeal = negotiateOffer(player, rivalClub.id, o.clubId, { baseValue: o.marketValue, competitorCount: 1 });
  if (rivalDeal.outcome !== "accepted") return;
  const rivalValue = Math.max(1000, rivalDeal.finalValue);
  const rivalInstallments = Math.random() < 0.7 ? 1 : 2; // clube CPU quase sempre paga à vista
  o.rivalOffer = { clubId: String(rivalClub.id), clubName: rivalClub.name, offerValue: rivalValue, installments: rivalInstallments };
  avisar({ title: "Concorrência pelo alvo", detail: `${rivalClub.name} também quer ${abbreviateName(o.playerName)} — compare as propostas.` }, { type: "warn" });
}

export function offerEffectiveValue(offerValue, installments) {
  return mercado.offerEffectiveValue(offerValue, installments);
}

export function resolvePendingOffersOutRound(round) {
  const CAREER = carreiraAtual();
  const list = CAREER.pendingOffersOut || [];
  // FASE1-MER (13/11/2026): cada proposta do técnico passa pelo clube
  // vendedor (reserva com importância, cobertura e reposição) e pelo atleta,
  // com sorteio com chave (motor/negociacao.js). Contraproposta, pedido de
  // salário e recusa ficam na lista, com o motivo, para a tela.
  CAREER.pendingOffersOut = list.filter((o) => ganchos.resolverProposta(o, round));
}

// Ganchos preenchidos por módulos que vêm depois deste (a negociação do
// técnico, motor/negociacao.js), sem import circular.
export const ganchos = { resolverProposta: null };

export function processPendingInstallments() {
  const CAREER = carreiraAtual();
  const { total, remaining } = financas.settleInstallments(CAREER.pendingInstallments);
  CAREER.finances.cash -= total;
  CAREER.pendingInstallments = remaining;
  return total;
}

export const LISTING_OFFER_CHANCE_PER_ROUND = 0.4;

export const LISTING_MAX_OFFERS = 3;

export const LISTING_BUYER_ANCHOR_CAP = 1.3; // âncora do comprador num anúncio: no máximo 1,3x o valor de mercado (ver maybeSpawnListingOffer)

export function maybeSpawnListingOffer(listing) {
  const CAREER = carreiraAtual();
  if (listing.offers.length >= LISTING_MAX_OFFERS) return;
  if (Math.random() >= LISTING_OFFER_CHANCE_PER_ROUND) return;
  const p = CAREER.squad.find((x) => x.id === listing.playerId);
  if (!p) return;
  const alreadyOffered = new Set(listing.offers.map((o) => String(o.clubId)));
  const eligible = marketTeamsPool().filter((t) =>
    String(t.id) !== String(CAREER.clubId) && !alreadyOffered.has(String(t.id)) && leagueSquadFor(t.id).length < maxSquadSizeFor(t.id)
  );
  if (!eligible.length) return;
  const scored = eligible
    .filter((t) => financeiroScore(p, leagueSquadFor(t.id), t.id) > 0) // elimina quem claramente não pode pagar ANTES do RNG
    .map((t) => ({ item: t, score: transferScore(p, t.id) }));
  if (!scored.length) return; // nenhum clube elegível consegue bancar esse jogador agora
  const club = pickWeightedByScore(scored);
  const score = scored.find((s) => s.item === club).score;
  // Fase 1.5 — mesma urgência de fim de janela de maybeGenerateOffer
  // (fora da janela, urgencyMultiplier devolve 1x — anúncio de venda
  // continua liberado o ano inteiro, sem mudança de ritmo fora dela).
  const urgency = urgencyMultiplier(necessidadeScore(p, leagueSquadFor(club.id), club.id), CAREER.currentRound);
  if (Math.random() >= offerProbabilityFromScore(score) * urgency) return; // score baixo -> raríssimo; score alto -> frequente
  // Fase 1.4 — mesma negociação interna de maybeGenerateOffer, com
  // askingValue como âncora (item 19 — nunca substituído): passa por
  // context.baseValue tanto pra transferValuation (valor inicial, já
  // era assim) quanto pra calculateSellerReservationValue (reserva
  // também ancorada no anúncio, não em player.value).
  // P2 (motor de testes, Fase B) — a reserva continua sendo o pedido
  // (sellerAsking), mas a âncora do COMPRADOR tem teto de
  // LISTING_BUYER_ANCHOR_CAP x o valor de mercado: sem ele, anunciar um
  // jogador por 10x o valor gerava proposta de ~10x (medido: 30% das
  // negociações fechavam assim). Pedido muito acima do mercado agora
  // simplesmente não atrai comprador.
  const buyerAnchor = Math.min(listing.askingValue, Math.round(p.value * LISTING_BUYER_ANCHOR_CAP));
  const dealCtx = { baseValue: buyerAnchor, sellerAsking: listing.askingValue, competitorCount: listing.offers.length };
  const deal = negotiateOffer(p, club.id, CAREER.clubId, dealCtx);
  // P2 — num anúncio quem decide é o técnico (Minhas vendas): se a
  // negociação interna parou sem acordo, o último lance do comprador
  // ainda vira proposta quando não está "muito abaixo" do pedido (mesmo
  // corte de 75% de sellerNegotiationDecision). Sem isso, jogador com
  // contrato acabando (transferValuation desconta até 15%) anunciado pelo
  // valor de mercado nunca recebia proposta nenhuma.
  let dealValue = deal.outcome === "accepted" ? deal.finalValue : null;
  if (deal.outcome === "walked" && deal.lastOffer >= listing.askingValue * 0.75) dealValue = deal.lastOffer;
  if (dealValue == null) return;
  const value = Math.max(1000, dealValue);
  const installments = Math.random() < 0.6 ? 1 : Math.random() < 0.7 ? 2 : 3; // clube CPU às vezes parcela também
  listing.offers.unshift({
    id: `listingoffer_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    clubId: String(club.id), clubName: club.name, value, installments, round: CAREER.currentRound,
  });
  avisar({ title: "Proposta recebida", detail: `${club.name} ofereceu ${fmtBRL(value)} por ${abbreviateName(p.name)} — veja em Minhas vendas.` }, { type: "info" });
}

export function resolvePendingListingsRound() {
  const CAREER = carreiraAtual();
  (CAREER.pendingListings || []).forEach(maybeSpawnListingOffer);
}

export function processPendingReceivables() {
  const CAREER = carreiraAtual();
  const { total, remaining } = financas.settleInstallments(CAREER.pendingReceivables);
  CAREER.finances.cash += total;
  CAREER.pendingReceivables = remaining;
  return total;
}

export const UF_TO_REGION = {
  AC: "norte", AP: "norte", AM: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
  AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste", PE: "nordeste", PI: "nordeste", RN: "nordeste", SE: "nordeste",
  DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
  ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
  PR: "sul", RS: "sul", SC: "sul",
};

export const REGION_LABEL = { norte: "Norte", nordeste: "Nordeste", "centro-oeste": "Centro-Oeste", sudeste: "Sudeste", sul: "Sul" };

export const SCOUT_MISSION_TYPES = {
  sub17: { label: "Sub-17", ages: [15, 17] },
  sub20: { label: "Sub-20", ages: [18, 20] },
  pro: { label: "Profissional (Mercado)" },
};

export const SCOUT_MISSION_DURATIONS = {
  curta: { label: "Curta", rounds: 2, rolls: 1 },
  media: { label: "Média", rounds: 4, rolls: 2 },
  longa: { label: "Longa", rounds: 6, rolls: 3 },
};

export function scoutPotentialRange(potential, overall, evaluation, rng) {
  const fuzz = 1 + (5 - clamp(evaluation || 3, 1, 5)) * 2 + Math.floor(rng() * 2);
  const lo = clamp(potential - fuzz, overall, 99);
  return { lo, hi: clamp(potential + fuzz, lo, 99) };
}

export function scoutReport(p, range, mode, weakestStarterOverall) {
  const attrs = [["ataque", p.atk], ["defesa", p.def], ["físico", p.phys]].sort((a, b) => b[1] - a[1]);
  let recommendation;
  if (mode === "pro") {
    recommendation = weakestStarterOverall != null && p.overall > weakestStarterOverall ? "Reforço imediato"
      : (range.hi - p.overall >= 8 && p.age <= 23) ? "Aposta de futuro" : "Observar";
  } else {
    recommendation = range.hi >= 78 ? "Promover já" : range.hi >= 70 ? "Acompanhar" : "Baixa projeção";
  }
  return { strength: attrs[0][0], weakness: attrs[2][0], recommendation };
}

export const SCOUT_PROSPECTS_MAX = 12;

export const SCOUT_NOTE_POOL = [
  "Jogador com leitura de jogo acima da idade. Recomendo acompanhar de perto.",
  "Fisicamente ainda precisa desenvolver, mas a técnica já chama atenção.",
  "Categoria diferenciada — pode virar referência do elenco principal em poucas temporadas.",
  "Ainda irregular, mas o potencial de crescimento é real.",
  "Discreto em campo, mas decisivo nos momentos certos.",
];

export function generateScoutProspect(scout, region, round, idx, { ages = [15, 20], group: focusGroup = null } = {}) {
  const rng = ambiente.rngDaChave(`scoutprospect:${scout.id}:${round}:${idx}`);
  const rolledGroup = temporada.BASE_COMPOSITION[Math.floor(rng() * temporada.BASE_COMPOSITION.length)];
  const group = focusGroup || rolledGroup;
  const age = ages[0] + Math.floor(rng() * (ages[1] - ages[0] + 1));
  const starBoost = (scout.stars - 3) * 3;
  // GE-BALANCE-005 (issue #38) — mesma distribuição enviesada da base
  // (ver youthPotentialRoll); olheiro melhor puxa a curva pra cima.
  const potential = youthPotentialRoll(rng, starBoost);
  const overall = Math.round(clamp(potential * (0.35 + rng() * 0.25), 22, 55));
  const atk = clamp(overall + (group === "F" ? 5 : group === "M" ? 2 : -8) + Math.round(rng() * 6 - 3), 15, 78);
  const def = clamp(overall + (group === "D" || group === "G" ? 5 : -8) + Math.round(rng() * 6 - 3), 15, 78);
  const phys = clamp(Math.round(50 + rng() * 32), 30, 88);
  const first = ambiente.primeirosNomes[Math.floor(rng() * ambiente.primeirosNomes.length)];
  const last = ambiente.sobrenomes[Math.floor(rng() * ambiente.sobrenomes.length)];
  const note = SCOUT_NOTE_POOL[Math.floor(rng() * SCOUT_NOTE_POOL.length)];
  const potRange = scoutPotentialRange(potential, overall, scout.evaluation, rng);
  const prospect = {
    id: `prospect_${scout.id}_${round}_${idx}`, name: `${first} ${last}`,
    group, age, overall, atk, def, phys, potential,
    ...computeContractFields(overall, age, potential, rng),
    foundRegion: region, scoutName: scout.name, scoutNote: note, potRange,
  };
  prospect.report = scoutReport(prospect, potRange, "base");
  return prospect;
}

export function pushScoutProspects(list) {
  const CAREER = carreiraAtual();
  CAREER.scoutMissionProspects = list.concat(CAREER.scoutMissionProspects || []);
  if (CAREER.scoutMissionProspects.length > SCOUT_PROSPECTS_MAX) CAREER.scoutMissionProspects.length = SCOUT_PROSPECTS_MAX;
}

export function tickScoutMissions(round) {
  const CAREER = carreiraAtual();
  (CAREER.scouts || []).forEach((scout) => {
    if (!scout.mission) return;
    scout.mission.roundsLeft -= 1;
    if (scout.mission.roundsLeft > 0) return;
    const { regionUf: region, type, group, duration } = scout.mission;
    scout.mission = null;
    const rng = ambiente.rngDaChave(`scoutfind:${scout.id}:${calendarTurnKey()}`);
    const specialtyMatch = scout.regionScope !== "any" && scout.regionScope.includes(region);
    // GE-SCOUT-001 — Rede (não mais as estrelas) decide a chance de
    // achar; duração decide quantas tentativas. Missão de save antigo
    // (sem type) continua do jeito de sempre: 2 tentativas, base 15-20.
    const network = scout.network != null ? scout.network : scout.stars;
    const chance = clamp(0.35 + network * 0.08 + (specialtyMatch ? 0.15 : 0), 0.2, 0.9);
    const rolls = type ? (SCOUT_MISSION_DURATIONS[duration] || SCOUT_MISSION_DURATIONS.media).rolls : 2;
    let hits = 0;
    for (let i = 0; i < rolls; i++) if (rng() < chance) hits++;
    if (type === "pro") {
      const added = scoutMarketFinds(scout, region, group, hits, rng);
      pushTransferLog(added
        ? `${scout.name} voltou da missão em ${REGION_LABEL[region]} com ${added} indicação${added > 1 ? "ões" : ""} pro Mercado.`
        : `${scout.name} voltou da missão em ${REGION_LABEL[region]} sem nenhuma indicação dessa vez.`, round);
      return;
    }
    const ages = type ? SCOUT_MISSION_TYPES[type].ages : [15, 20];
    const found = Array.from({ length: hits }, (_, i) => generateScoutProspect(scout, region, calendarTurnKey(), i, { ages, group }));
    if (found.length) {
      pushScoutProspects(found);
      pushTransferLog(`${scout.name} voltou da missão em ${REGION_LABEL[region]} com ${found.length} promissor${found.length > 1 ? "es" : ""}.`, round);
    } else {
      pushTransferLog(`${scout.name} voltou da missão em ${REGION_LABEL[region]} sem achar ninguém dessa vez.`, round);
    }
  });
}

export function scoutMarketFinds(scout, region, group, hits, rng) {
  const CAREER = carreiraAtual();
  if (!hits) return 0;
  const listed = new Set((CAREER.scoutSuggestions || []).map((sg) => `${sg.clubId}|${sg.playerId}`));
  const evaluation = scout.evaluation != null ? scout.evaluation : scout.stars;
  const regionOf = (club) => UF_TO_REGION[club.uf];
  let pool = allMarketPlayers().filter(({ p, club, mine }) => !mine && !listed.has(`${club.id}|${p.id}`) && !pendingOfferOutFor(p.id)
    && (!group || p.group === group));
  const inRegion = pool.filter(({ club }) => regionOf(club) === region);
  if (inRegion.length) pool = inRegion; // sem UF no dado do fornecedor, olha o país todo
  const weakestBySubpos = {};
  CAREER.lineup.starters.map((id) => CAREER.squad.find((p) => p.id === id)).filter(Boolean).forEach((p) => {
    const sp = subPositionOf(p);
    weakestBySubpos[sp] = Math.min(weakestBySubpos[sp] ?? 99, p.overall);
  });
  const noise = (6 - evaluation) * 3;
  const scored = pool.map((e) => {
    const sp = subPositionOf(e.p);
    const upgrade = weakestBySubpos[sp] != null ? e.p.overall - weakestBySubpos[sp] : 0;
    const growth = (e.p.potential != null ? e.p.potential : e.p.overall) - e.p.overall;
    return { ...e, read: upgrade * 1.2 + growth + (rng() * 2 - 1) * noise };
  }).sort((a, b) => b.read - a.read).slice(0, hits);
  CAREER.scoutSuggestions = CAREER.scoutSuggestions || [];
  scored.forEach(({ p, club }) => {
    const range = scoutPotentialRange(p.potential != null ? p.potential : p.overall, p.overall, evaluation, rng);
    const report = scoutReport(p, range, "pro", weakestBySubpos[subPositionOf(p)]);
    CAREER.scoutSuggestions.unshift({
      id: `scout_${scout.id}_${CAREER.currentRound}_${p.id}`,
      playerId: p.id, playerName: p.name, clubId: String(club.id), clubName: club.name,
      subpos: subPositionOf(p), overall: p.overall, age: p.age, value: p.value,
      potLo: range.lo, potHi: range.hi, report, scoutName: scout.name, foundRegion: region,
    });
    pushNotification("olheiro", `${scout.name} indicou ${abbreviateName(p.name)} (${club.name}) — ${report.recommendation.toLowerCase()}.`);
  });
  if (CAREER.scoutSuggestions.length > SCOUT_MAX_SUGGESTIONS) CAREER.scoutSuggestions.length = SCOUT_MAX_SUGGESTIONS;
  return scored.length;
}

export const SCOUT_MAX_SUGGESTIONS = 8; // teto da lista (mais novas primeiro), pra não virar bagunça
