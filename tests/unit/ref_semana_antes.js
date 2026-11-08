// Cópia congelada do carreira.js de ANTES da etapa C2 (09/11): as funções
// e constantes da semana sem jogo que foram para public/js/motor/semana.js
// (e a formatação, para motor/texto.js), tal e qual. Referência do
// test_motor_semana.js: não editar.
const SUBPOS_LABEL = { GOL: "Goleiro", DEF: "Defensor", MEI: "Meio-campo", ATA: "Atacante" };

function subPositionOf(p) {
  return { G: "GOL", D: "DEF", M: "MEI", F: "ATA" }[p.group] || "DEF";
}

function marketClub(clubId) {
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

function applyFinanceEntries(entries, round) {
  entries.forEach((e) => {
    CAREER.finances.cash += e.amount;
    pushLedger(e.type, e.label, e.amount, round);
  });
}

function abbreviateName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name || "?";
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`;
}

function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const MAX_PRINCIPAL = 60;

function tickStadiumUpgrade() {
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

const MAX_LEAGUE_SQUAD = 26;

const MIN_LEAGUE_SQUAD = 16;

const MAX_LEAGUE_SQUAD_OTHER_DIVISION = 16;

const MIN_LEAGUE_SQUAD_OTHER_DIVISION = 12;

function leagueSquadFor(clubId) {
  return (CAREER.leagueSquads && CAREER.leagueSquads[String(clubId)]) || [];
}

const TRANSFER_LOG_MAX = 60;

function pushTransferLog(text, round) {
  CAREER.transferLog = CAREER.transferLog || [];
  CAREER.transferLog.unshift({ round, text });
  if (CAREER.transferLog.length > TRANSFER_LOG_MAX) CAREER.transferLog.length = TRANSFER_LOG_MAX;
}

function pushLedger(type, label, amount, round) {
  // Mais recente primeiro, até 60 lançamentos (motor/financas.js, LEDGER_MAX).
  CAREER.financeLedger = motorFinancas().addLedgerEntry(CAREER.financeLedger, { round, type, label, amount });
}

const CALENDAR_PHASE_BY_MONTH = ["ferias", "pre", "temporada", "temporada", "temporada", "temporada", "pausa", "temporada", "temporada", "temporada", "temporada", "temporada"];

const CALENDAR_PHASE_LABEL = { ferias: "Férias", pre: "Pré-temporada", temporada: "Temporada", pausa: "Pausa de julho" };

const CALENDAR_WINDOW_PHASES = new Set(["ferias", "pre", "pausa"]);

const MONTH_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function calendarOn() { return !!(CAREER && CAREER.calendar && Array.isArray(CAREER.calendar.weeks)); }

function calendarWeek(i) { return calendarOn() ? CAREER.calendar.weeks[i == null ? CAREER.calendar.idx : i] || null : null; }

function calendarWeekMonth(w) { return Number(w.d.slice(0, 2)) - 1; }

function calendarTurnKey() { return calendarOn() ? `${CAREER.calendar.year}w${CAREER.calendar.idx}` : String(CAREER.currentRound); }

function calendarWeekIndexOfRound(round) {
  return calendarOn() ? CAREER.calendar.weeks.findIndex((w) => w.r === round) : -1;
}

function syncCalendarToRound() {
  if (!calendarOn() || CAREER.currentRound > 38) return;
  const wi = calendarWeekIndexOfRound(CAREER.currentRound);
  if (wi >= 0 && CAREER.calendar.idx > wi) CAREER.calendar.idx = wi;
}

function applyCalendarMonthlyFinances(monthIdx) {
  const m = motorFinancas().monthEntries({
    squad: CAREER.squad, staffHired: !!(CAREER.technicalStaff && CAREER.technicalStaff.hired), scouts: CAREER.scouts,
    sponsorship: CAREER.sponsorship, tvMonthly: CAREER.calendar.tvMonthly, month: MONTH_LONG[monthIdx],
  });
  applyFinanceEntries(m.entries, CAREER.currentRound);
  return { wagePaid: m.wagePaid, sponsorIncome: m.income };
}

function advanceCalendarWeek() {
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

function runCalendarOffWeek() {
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

function transferWindowStatus(round) {
  // GE-CALENDAR-001 — com calendário, a janela é a FASE do ano (férias,
  // pré-temporada e pausa de julho), não mais um intervalo de rodadas.
  if (calendarOn()) {
    const weeks = CAREER.calendar.weeks;
    const w = motorMercado().windowByCalendar(weeks, CAREER.calendar.idx, CALENDAR_WINDOW_PHASES);
    if (w.open) return { open: true, closesLabel: `até o fim de ${MONTH_LONG[calendarWeekMonth(weeks[w.lastIdx])]}` };
    return { open: false, opensLabel: w.nextIdx >= 0 ? `reabre em ${MONTH_LONG[calendarWeekMonth(weeks[w.nextIdx])]}` : "reabre em janeiro" };
  }
  return motorMercado().windowByRound(round);
}

function marketTeamsPool() {
  const pool = CAREER.marketScope === "multi" ? ALL_TEAMS_FLAT : LEAGUE_TEAMS;
  return pool.filter((t) => t.competitionId !== "serie_d");
}

function pickRandomOtherClub(excludeId) {
  const pool = marketTeamsPool().filter((t) => String(t.id) !== String(excludeId));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function isOwnDivisionTeam(teamId) {
  return Object.prototype.hasOwnProperty.call(CAREER.standings, teamId);
}

function maxSquadSizeFor(teamId) {
  return isOwnDivisionTeam(teamId) ? MAX_LEAGUE_SQUAD : MAX_LEAGUE_SQUAD_OTHER_DIVISION;
}

function minSquadSizeFor(teamId) {
  return isOwnDivisionTeam(teamId) ? MIN_LEAGUE_SQUAD : MIN_LEAGUE_SQUAD_OTHER_DIVISION;
}

function necessidadeScore(candidate, squad, buyingClubId) {
  return motorMercado().necessidadeScore(candidate, squad, buyingClubId == null ? null : marketClub(buyingClubId));
}

function financeiroScore(candidate, squad, buyingClubId) {
  return motorMercado().financeiroScore(candidate, squad, marketClub(buyingClubId));
}

function clubPositionFactor(clubId) {
  if (!isOwnDivisionTeam(clubId)) return null; // sem tabela — clube de outra divisão
  const ranked = sortedStandings(); // já existe — mesmo critério de desempate de sempre
  return motorMercado().tablePositionFactor(ranked.findIndex((r) => String(r.id) === String(clubId)), ranked.length);
}

function clubAmbitionFactor(clubId) {
  const posFactor = clubPositionFactor(clubId);
  if (posFactor != null) return posFactor;
  // Fora da própria divisão: sem tabela — força relativa contra os pares
  // da própria competição (motor/mercado.js, strengthAmbition).
  const team = teamById(clubId);
  const peers = ALL_TEAMS_FLAT.filter((t) => t.competitionId === team.competitionId);
  return motorMercado().strengthAmbition(squadAvgOverallOf(clubId), peers.map((t) => squadAvgOverallOf(t.id)));
}

function transferScore(candidate, buyingClubId) {
  return motorMercado().transferScore(candidate, marketClub(buyingClubId));
}

function pickWeightedByScore(scoredList) {
  return motorMercado().pickWeightedByScore(scoredList, Math.random);
}

function offerProbabilityFromScore(score) {
  return motorMercado().offerProbabilityFromScore(score);
}

function squadForClub(clubId) {
  return String(clubId) === String(CAREER.clubId) ? CAREER.squad.filter((p) => p.origin === "principal") : leagueSquadFor(clubId);
}

function calculateSellerReservationValue(player, sellingClubId, context = {}) {
  return motorMercado().calculateSellerReservationValue(player, marketClub(sellingClubId), context);
}

function sellerNegotiationDecision(offerValue, reservationValue, rng = Math.random) {
  return motorMercado().sellerNegotiationDecision(offerValue, reservationValue, rng);
}

function negotiateOffer(player, buyingClubId, sellingClubId, context = {}) {
  return motorMercado().negotiateOffer(player, marketClub(buyingClubId), marketClub(sellingClubId), { ...context, seasonYear: CAREER.seasonYear }, Math.random);
}

function simulateAiTransfers(round) {
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

const DECLINE_COOLDOWN_ROUNDS = 3; // cobre o resto da janela atual (janelas têm 3 rounds, ver TRANSFER_WINDOWS)

function pruneRecentDeclines(round) {
  // "d.round <= round" também descarta entradas de uma temporada
  // ANTERIOR (currentRound volta pra 1 em advanceSeason — sem essa
  // checagem, round-d.round ficaria negativo e a entrada nunca seria
  // podada, crescendo pra sempre no save).
  CAREER.recentDeclines = (CAREER.recentDeclines || []).filter((d) => d.round <= round && round - d.round < DECLINE_COOLDOWN_ROUNDS);
  return CAREER.recentDeclines;
}

function wasRecentlyDeclined(playerId, clubId, round) {
  return pruneRecentDeclines(round).some((d) => String(d.playerId) === String(playerId) && String(d.clubId) === String(clubId));
}

function urgencyMultiplier(necessidade, round) {
  return motorMercado().urgencyMultiplier(necessidade, round);
}

const OFFER_CHANCE_PER_ROUND = 0.18;

function maybeGenerateOffer(round) {
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

function refreshAvailability(uptoRound) {
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

function applyWeeklyTraining() {
  // GE-CALENDAR-001 — 1x por TURNO (semana no calendário; rodada no
  // modelo antigo), ver calendarTurnKey.
  if (String(CAREER.trainingAppliedForRound) === calendarTurnKey()) return null;
  const { patches, gains } = motorTreino().trainingWeek({
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

const INJURY_RETURN_CONDITION = { leve: 75, media: 60, grave: 45 };

function allMarketPlayers() {
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

function pendingOfferOutFor(playerId) {
  return (CAREER.pendingOffersOut || []).find((o) => String(o.playerId) === String(playerId));
}

function finalizeIncomingPurchase(o) {
  const squad = leagueSquadFor(o.clubId);
  const idx = squad.findIndex((x) => String(x.id) === String(o.playerId));
  if (idx < 0) {
    toast(`${abbreviateName(o.playerName)} não está mais disponível — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: `${abbreviateName(o.playerName)} não está mais disponível — negociação cancelada.` };
  }
  const p = squad[idx];
  if (wageBillOf(CAREER.squad) + p.wage > CAREER.finances.wageCap) {
    toast(`${o.clubName} aceitou, mas contratar ${abbreviateName(p.name)} agora estouraria seu teto salarial — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: `Contratar ${abbreviateName(p.name)} agora estouraria seu teto salarial — negociação cancelada.` };
  }
  if (CAREER.squad.length >= MAX_PRINCIPAL + 20) {
    toast(`${o.clubName} aceitou, mas seu elenco está grande demais agora — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: "Seu elenco está grande demais agora — negociação cancelada." };
  }
  const perInstallment = Math.round(o.offerValue / o.installments / 1000) * 1000;
  const firstPayment = o.installments === 1 ? o.offerValue : perInstallment;
  if (CAREER.finances.cash < firstPayment) {
    toast(`${o.clubName} aceitou, mas seu caixa não cobre nem a 1ª parcela agora — negociação cancelada.`, { type: "warn" });
    return { ok: false, texto: "Seu caixa não cobre nem a 1ª parcela agora — negociação cancelada." };
  }
  squad.splice(idx, 1);
  CAREER.finances.cash -= firstPayment;
  if (o.installments > 1) {
    CAREER.pendingInstallments = CAREER.pendingInstallments || [];
    CAREER.pendingInstallments.push({ roundsLeft: o.installments - 1, perRoundAmount: perInstallment, label: `Parcela de ${p.name}` });
  }
  p.origin = "principal";
  CAREER.squad.push(p);
  pushTransferLog(`Você contratou ${p.name} do ${o.clubName} por ${fmtBRL(o.offerValue)}${o.installments > 1 ? ` (${o.installments}x)` : ""}.`, CAREER.currentRound);
  pushLedger("transferencia", `Contratação — ${p.name} (${o.clubName})${o.installments > 1 ? ` — 1ª de ${o.installments} parcelas` : ""}`, -firstPayment, CAREER.currentRound);
  toast(`${abbreviateName(p.name)} contratado! O ${o.clubName} aceitou sua proposta.`, { type: "pos" });
  ensureObjectivesFresh(); bumpObjective("daily", "obj_market_1_move", 1);
  if (p.overall >= 82) { firePressConference("15", CAREER.currentRound, false); openPressConferenceModal(); }
  return { ok: true, player: p };
}

const RIVAL_OFFER_CHANCE_PER_ROUND = 0.35;

function maybeSpawnRivalOffer(o) {
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
  toast({ title: "Concorrência pelo alvo", detail: `${rivalClub.name} também quer ${abbreviateName(o.playerName)} — compare as propostas.` }, { type: "warn" });
}

function offerEffectiveValue(offerValue, installments) {
  return motorMercado().offerEffectiveValue(offerValue, installments);
}

function resolvePendingOffersOutRound(round) {
  const list = CAREER.pendingOffersOut || [];
  const stillPending = [];
  list.forEach((o) => {
    if (o.status === "countered") { stillPending.push(o); return; } // esperando o técnico decidir, sem prazo
    maybeSpawnRivalOffer(o);
    o.roundsLeft -= 1;
    if (o.roundsLeft > 0) { stillPending.push(o); return; }
    if (o.rivalOffer) {
      const mine = offerEffectiveValue(o.offerValue, o.installments);
      const rival = offerEffectiveValue(o.rivalOffer.offerValue, o.rivalOffer.installments);
      const winChance = mine >= rival ? 0.8 : 0.25;
      if (Math.random() < winChance) { finalizeIncomingPurchase(o); return; }
      toast(`${o.clubName} vendeu ${abbreviateName(o.playerName)} pro ${o.rivalOffer.clubName} — a proposta concorrente venceu.`, { type: "warn" });
      pushTransferLog(`${o.rivalOffer.clubName} venceu a disputa por ${o.playerName} (sua proposta era de ${fmtBRL(o.offerValue)}).`, round);
      return;
    }
    // Fase 1.4 — decisão do vendedor CPU (aceitar/contrapor/recusar a
    // SUA proposta, digitada livremente em openOfferModal) trocada da
    // sequência de faixas de ratio ad hoc pras mesmas funções puras
    // reaproveitadas em todo o resto (calculateSellerReservationValue/
    // sellerNegotiationDecision) — mesma UI de sempre (contraproposta/
    // aceitar/retirar em CAREER.pendingOffersOut, nada muda aí).
    // o.counterRounds (novo campo temporário, só nesta oferta pendente
    // — não é schema de jogador/clube) limita esta negociação a
    // MAX_NEGOTIATION_ROUNDS contrapropostas (item 15): sem isso, o
    // técnico podia aumentar a proposta indefinidamente
    // (ver increaseOffer) e o vendedor contrapor de novo pra sempre,
    // sem nenhum teto — um loop sem fim que este item pede pra evitar.
    const sellerPlayer = leagueSquadFor(o.clubId).find((x) => String(x.id) === String(o.playerId));
    const reservation = sellerPlayer ? calculateSellerReservationValue(sellerPlayer, o.clubId, { baseValue: o.marketValue }) : o.marketValue;
    const roundsUsed = o.counterRounds || 0;
    let decision = sellerNegotiationDecision(o.offerValue, reservation);
    if (decision.action === "counter" && roundsUsed >= motorMercado().MAX_NEGOTIATION_ROUNDS) {
      // esgotou o limite de contrapropostas -> decide definitivamente
      // agora (aceita se ficou razoavelmente perto da reserva, senão
      // recusa), nunca mais um ciclo.
      decision = (o.offerValue / reservation) >= 0.85 ? { action: "accept", value: o.offerValue } : { action: "reject", value: null };
    }
    if (decision.action === "accept") { finalizeIncomingPurchase(o); return; }
    if (decision.action === "counter") {
      o.counterValue = decision.value;
      o.counterRounds = roundsUsed + 1;
      o.status = "countered";
      stillPending.push(o);
      toast({ title: "Contraproposta recebida", detail: `${o.clubName} quer ${fmtBRL(o.counterValue)} por ${abbreviateName(o.playerName)} — veja em Minhas propostas.` }, { type: "warn" });
      return;
    }
    toast(`${o.clubName} recusou sua proposta de ${fmtBRL(o.offerValue)} por ${abbreviateName(o.playerName)}.`, { type: "warn" });
    pushTransferLog(`${o.clubName} recusou sua proposta de ${fmtBRL(o.offerValue)} por ${o.playerName}.`, round);
    pushNotification("proposta", `${o.clubName} recusou sua proposta por ${abbreviateName(o.playerName)}.`);
  });
  CAREER.pendingOffersOut = stillPending;
}

function processPendingInstallments() {
  const { total, remaining } = motorFinancas().settleInstallments(CAREER.pendingInstallments);
  CAREER.finances.cash -= total;
  CAREER.pendingInstallments = remaining;
  return total;
}

const LISTING_OFFER_CHANCE_PER_ROUND = 0.4;

const LISTING_MAX_OFFERS = 3;

const LISTING_BUYER_ANCHOR_CAP = 1.3; // âncora do comprador num anúncio: no máximo 1,3x o valor de mercado (ver maybeSpawnListingOffer)

function maybeSpawnListingOffer(listing) {
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
  toast({ title: "Proposta recebida", detail: `${club.name} ofereceu ${fmtBRL(value)} por ${abbreviateName(p.name)} — veja em Minhas vendas.` }, { type: "info" });
}

function resolvePendingListingsRound() {
  (CAREER.pendingListings || []).forEach(maybeSpawnListingOffer);
}

function processPendingReceivables() {
  const { total, remaining } = motorFinancas().settleInstallments(CAREER.pendingReceivables);
  CAREER.finances.cash += total;
  CAREER.pendingReceivables = remaining;
  return total;
}

const UF_TO_REGION = {
  AC: "norte", AP: "norte", AM: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
  AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste", PE: "nordeste", PI: "nordeste", RN: "nordeste", SE: "nordeste",
  DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
  ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
  PR: "sul", RS: "sul", SC: "sul",
};

const REGION_LABEL = { norte: "Norte", nordeste: "Nordeste", "centro-oeste": "Centro-Oeste", sudeste: "Sudeste", sul: "Sul" };

const SCOUT_MISSION_TYPES = {
  sub17: { label: "Sub-17", ages: [15, 17] },
  sub20: { label: "Sub-20", ages: [18, 20] },
  pro: { label: "Profissional (Mercado)" },
};

const SCOUT_MISSION_DURATIONS = {
  curta: { label: "Curta", rounds: 2, rolls: 1 },
  media: { label: "Média", rounds: 4, rolls: 2 },
  longa: { label: "Longa", rounds: 6, rolls: 3 },
};

function scoutPotentialRange(potential, overall, evaluation, rng) {
  const fuzz = 1 + (5 - clamp(evaluation || 3, 1, 5)) * 2 + Math.floor(rng() * 2);
  const lo = clamp(potential - fuzz, overall, 99);
  return { lo, hi: clamp(potential + fuzz, lo, 99) };
}

function scoutReport(p, range, mode, weakestStarterOverall) {
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

const SCOUT_PROSPECTS_MAX = 12;

const SCOUT_NOTE_POOL = [
  "Jogador com leitura de jogo acima da idade. Recomendo acompanhar de perto.",
  "Fisicamente ainda precisa desenvolver, mas a técnica já chama atenção.",
  "Categoria diferenciada — pode virar referência do elenco principal em poucas temporadas.",
  "Ainda irregular, mas o potencial de crescimento é real.",
  "Discreto em campo, mas decisivo nos momentos certos.",
];

function generateScoutProspect(scout, region, round, idx, { ages = [15, 20], group: focusGroup = null } = {}) {
  const rng = seededRngFromKey(`scoutprospect:${scout.id}:${round}:${idx}`);
  const rolledGroup = motorTemporada().BASE_COMPOSITION[Math.floor(rng() * motorTemporada().BASE_COMPOSITION.length)];
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
  const first = DEMO_FIRST_NAMES[Math.floor(rng() * DEMO_FIRST_NAMES.length)];
  const last = DEMO_LAST_NAMES[Math.floor(rng() * DEMO_LAST_NAMES.length)];
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

function pushScoutProspects(list) {
  CAREER.scoutMissionProspects = list.concat(CAREER.scoutMissionProspects || []);
  if (CAREER.scoutMissionProspects.length > SCOUT_PROSPECTS_MAX) CAREER.scoutMissionProspects.length = SCOUT_PROSPECTS_MAX;
}

function tickScoutMissions(round) {
  (CAREER.scouts || []).forEach((scout) => {
    if (!scout.mission) return;
    scout.mission.roundsLeft -= 1;
    if (scout.mission.roundsLeft > 0) return;
    const { regionUf: region, type, group, duration } = scout.mission;
    scout.mission = null;
    const rng = seededRngFromKey(`scoutfind:${scout.id}:${calendarTurnKey()}`);
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

function scoutMarketFinds(scout, region, group, hits, rng) {
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

const SCOUT_MAX_SUGGESTIONS = 8; // teto da lista (mais novas primeiro), pra não virar bagunça
