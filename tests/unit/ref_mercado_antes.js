// Cópia congelada do mercado em public/js/carreira.js ANTES da Fase 12,
// etapa 5 (05/11), tal e qual. Referência do test_motor_mercado.js:
// não editar (é o "antes" da equivalência). Roda num vm com stubs.

const TRANSFER_WINDOWS = [[1, 3], [20, 22]];
function transferWindowStatus(round) {
  // GE-CALENDAR-001 — com calendário, a janela é a FASE do ano (férias,
  // pré-temporada e pausa de julho), não mais um intervalo de rodadas.
  if (calendarOn()) {
    const weeks = CAREER.calendar.weeks, i = CAREER.calendar.idx;
    if (CALENDAR_WINDOW_PHASES.has(weeks[i].p)) {
      let j = i;
      while (j + 1 < weeks.length && CALENDAR_WINDOW_PHASES.has(weeks[j + 1].p)) j++;
      return { open: true, closesLabel: `até o fim de ${MONTH_LONG[calendarWeekMonth(weeks[j])]}` };
    }
    const k = weeks.findIndex((w, idx) => idx > i && CALENDAR_WINDOW_PHASES.has(w.p));
    return { open: false, opensLabel: k >= 0 ? `reabre em ${MONTH_LONG[calendarWeekMonth(weeks[k])]}` : "reabre em janeiro" };
  }
  for (const [open, close] of TRANSFER_WINDOWS) {
    if (round >= open && round <= close) return { open: true, closesAtRound: close };
  }
  const next = TRANSFER_WINDOWS.find(([open]) => open > round);
  return { open: false, opensAtRound: next ? next[0] : null };
}
function urgencyMultiplier(necessidade, round) {
  const win = TRANSFER_WINDOWS.find(([open, close]) => round >= open && round <= close);
  if (!win) return 1; // fora de janela isto nunca é chamado, defensivo
  const [open, close] = win;
  const progress = clamp((round - open) / Math.max(close - open, 1), 0, 1); // 0 no 1º round, 1 no último
  const needGate = clamp((necessidade - 0.15) / 0.35, 0, 1); // só quem tem necessidade real sente urgência
  return 1 + progress * needGate * 0.30;
}
const SQUAD_GROUP_PROPORTION = { G: 0.12, D: 0.32, M: 0.32, F: 0.24 };
function idealCountForGroup(squad, grp) {
  return Math.max(1, Math.round(squad.length * SQUAD_GROUP_PROPORTION[grp]));
}
function groupDeficitScore(candidate, squad) {
  const ideal = idealCountForGroup(squad, candidate.group);
  const atual = squad.filter((p) => p.group === candidate.group).length;
  return clamp((ideal - atual) / ideal, 0, 1);
}
function qualityDeficitScore(candidate, squad) {
  if (candidate.overall == null) return 0; // sem overall (ex.: candidato sintético de teste) — sem sinal, não inventa
  const peers = squad.filter((p) => p.group === candidate.group && p.overall != null);
  if (!peers.length) return 1; // grupo vazio — já capturado por groupDeficitScore, reforça igual
  const avgOverall = peers.reduce((s, p) => s + p.overall, 0) / peers.length;
  return clamp((candidate.overall - avgOverall) / 20, 0, 1); // 0 até não superar a média; 1 a partir de +20
}
function squadSizeNeedFactor(squad, buyingClubId) {
  if (buyingClubId == null) return 1;
  const min = minSquadSizeFor(buyingClubId), max = maxSquadSizeFor(buyingClubId);
  if (max <= min) return 1;
  const frac = clamp((squad.length - min) / (max - min), 0, 1); // 0 = no piso, 1 = no teto
  return 1.25 - frac * 0.55; // no piso -> 1.25x (amplia); no teto -> 0.70x (reduz)
}
function necessidadeScore(candidate, squad, buyingClubId) {
  const groupDeficit = groupDeficitScore(candidate, squad);
  const qualDeficit = qualityDeficitScore(candidate, squad);
  const combined = clamp(groupDeficit * 0.75 + qualDeficit * 0.25, 0, 1);
  return clamp(combined * squadSizeNeedFactor(squad, buyingClubId), 0, 1);
}
function overallFitCurve(diff) {
  if (diff <= -15) return 0.15;                              // muito abaixo do nível — baixa, nunca zero
  if (diff <= 0) return 0.15 + (diff + 15) / 15 * 0.35;       // abaixo do nível — 0.15 a 0.50
  if (diff <= 8) return 0.50 + diff / 8 * 0.35;               // próximo do nível — 0.50 a 0.85 (bom)
  if (diff <= 20) return 0.85 + (diff - 8) / 12 * 0.15;       // acima do nível — 0.85 a 1.00 (ótimo)
  return clamp(1.00 - (diff - 20) * 0.02, 0.55, 1.00);        // absurdamente acima — leve penalização, nunca < 0.55
}
function adequacaoScore(candidate, squad, buyingClubId) {
  const squadAvg = squadAvgOverallOf(buyingClubId);
  const overallFit = overallFitCurve(candidate.overall - squadAvg);
  const roomToGrow = candidate.potential != null
    ? clamp((candidate.potential - candidate.overall) / 20, 0, 1) : 0;
  const ageFit = candidate.age <= 23 ? 0.8 + roomToGrow * 0.2
    : candidate.age <= 30 ? 1.0
    : clamp(1 - (candidate.age - 30) * 0.08, 0.2, 1);
  return clamp(overallFit * 0.6 + roomToGrow * 0.2 + ageFit * 0.2, 0, 1);
}
function clubBudgetProxy(clubId) {
  const squad = leagueSquadFor(clubId);
  const wageCap = Math.round(wageBillOf(squad) * 1.35 / 1000) * 1000;
  const cash = Math.round(wageCap * 6 / 1000) * 1000;
  return { cash, wageCap };
}
function affordabilityRatio(ratio) {
  if (ratio <= 1) return 1;
  if (ratio >= 2.5) return 0; // claramente fora de alcance — continua bloqueado
  return clamp(1 - (ratio - 1) / 1.5, 0, 1);
}
function financeiroScore(candidate, squad, buyingClubId) {
  const budget = clubBudgetProxy(buyingClubId);
  const wageRatio = (wageBillOf(squad) + candidate.wage) / Math.max(1, budget.wageCap);
  const valueRatio = candidate.value / Math.max(1, budget.cash);
  // o mais restritivo dos dois decide (mesmo espírito do "&&" original:
  // precisa caber nos dois pra valer o score cheio) — nunca inflaciona
  // ao invés de restringir; transferValuation continua responsável
  // pelo preço (ver finFactor, sem nenhuma mudança nesta fase).
  return Math.min(affordabilityRatio(wageRatio), affordabilityRatio(valueRatio));
}
function clubPositionFactor(clubId) {
  if (!isOwnDivisionTeam(clubId)) return null; // sem tabela — clube de outra divisão
  const ranked = sortedStandings(); // já existe — mesmo critério de desempate de sempre
  const idx = ranked.findIndex((r) => String(r.id) === String(clubId));
  if (idx < 0 || ranked.length <= 1) return 0.5;
  return 1 - idx / (ranked.length - 1); // 1º lugar = 1.0, lanterna = 0.0
}
function clubAmbitionFactor(clubId) {
  const posFactor = clubPositionFactor(clubId);
  if (posFactor != null) return posFactor;
  // Fora da própria divisão: sem tabela — usa a MESMA força relativa
  // (squadAvgOverallOf) já usada em adequação, comparada contra os
  // pares da própria competição — nenhum dado novo.
  const team = teamById(clubId);
  const peers = ALL_TEAMS_FLAT.filter((t) => t.competitionId === team.competitionId);
  const maxAvg = Math.max(...peers.map((t) => squadAvgOverallOf(t.id)), 1);
  return clamp(squadAvgOverallOf(clubId) / maxAvg, 0, 1);
}
function contextoScore(candidate, squad, buyingClubId) {
  const squadAvg = squadAvgOverallOf(buyingClubId);
  const ambicao = clubAmbitionFactor(buyingClubId);
  const upgrade = clamp((candidate.overall - squadAvg) / 15, -1, 1);
  return clamp(0.5 + ambicao * upgrade * 0.5, 0, 1);
}
function transferScore(candidate, buyingClubId) {
  const squad = leagueSquadFor(buyingClubId);
  const necessidade = necessidadeScore(candidate, squad, buyingClubId);
  const adequacao = adequacaoScore(candidate, squad, buyingClubId);
  const financeiro = financeiroScore(candidate, squad, buyingClubId);
  const contexto = contextoScore(candidate, squad, buyingClubId);
  return necessidade * 0.35 + adequacao * 0.30 + financeiro * 0.20 + contexto * 0.15;
}
function pickWeightedByScore(scoredList) {
  const top = scoredList.slice().sort((a, b) => b.score - a.score).slice(0, 5);
  const weights = top.map((x) => x.score * x.score);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return top.length ? top[0].item : null;
  let roll = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return top[i].item;
  }
  return top[top.length - 1].item;
}
function offerProbabilityFromScore(score) {
  if (score < 0.25) return 0.02;
  if (score < 0.40) return 0.05;
  if (score < 0.55) return 0.10;
  if (score < 0.70) return 0.18;
  if (score < 0.80) return 0.28;
  if (score < 0.90) return 0.40;
  return 0.55;
}
function transferValuation(player, buyingClubId, sellingClubId, context = {}) {
  const base = context.baseValue != null ? context.baseValue : player.value;
  const squad = leagueSquadFor(buyingClubId);

  // Contratual — contrato acabando enfraquece o poder de negociação de
  // quem vende (o comprador sabe que pode esperar o jogador sair de
  // graça); contrato longo sustenta o preço. Só o dado que já existe
  // (contractUntil, sempre presente — ver computeContractFields), sem
  // inventar cláusula/agente/rescisão (fora do escopo desta fase).
  const yearsLeft = clamp((player.contractUntil || CAREER.seasonYear) - CAREER.seasonYear, 0, 4);
  const contractFactor = 0.85 + yearsLeft * 0.05; // 0 anos restantes -> 0.85x, 4+ anos -> 1.05x

  // Necessidade do comprador (reaproveita necessidadeScore, Fase 1.1/1.3.2).
  const necessidade = necessidadeScore(player, squad, buyingClubId);
  const needFactor = 0.95 + necessidade * 0.10; // 0.95x a 1.05x

  // Interesse do comprador (reaproveita transferScore, Fase 1.1/1.2) —
  // desloca o preço num range pequeno em torno do valor base, nunca
  // multiplica o valor pelo score direto.
  const interesse = transferScore(player, buyingClubId);
  const scoreFactor = 0.90 + interesse * 0.20; // 0.90x a 1.10x

  // Capacidade financeira (reaproveita financeiroScore/clubBudgetProxy,
  // Fase 1.1) — só a margem fina; SE o clube pode pagar ou não já foi
  // decidido antes desta função, nos 3 call sites (financeiroScore > 0).
  const financeiro = financeiroScore(player, squad, buyingClubId);
  const finFactor = 0.97 + financeiro * 0.05; // 0.99x (apertado) a 1.02x (folgado)

  // Contexto competitivo (reaproveita contextoScore, Fase 1.1 — já
  // combina clubAmbitionFactor/clubPositionFactor com o quanto o
  // jogador eleva o time do comprador).
  const contexto = contextoScore(player, squad, buyingClubId);
  const ctxFactor = 0.95 + contexto * 0.10; // 0.95x a 1.05x

  // Concorrência — só quando o chamador sabe de verdade quantos outros
  // clubes disputam o MESMO jogador agora (listing.offers.length numa
  // venda anunciada; 1 na oferta rival, que por definição só nasce
  // enquanto a proposta do técnico já está em andamento). Sem dado
  // confiável (maybeGenerateOffer não tem conceito de múltiplas
  // propostas simultâneas por um jogador seu), fica em 0 — documentado
  // como limitação, sem inventar contagem.
  const competitorCount = clamp(context.competitorCount || 0, 0, 10);
  const concFactor = 1 + Math.min(0.10, competitorCount * 0.03); // até +10%

  // Clube vendedor — só quando quem vende é VOCÊ (titularidade real via
  // CAREER.lineup.starters); clube CPU vendendo não tem titularidade
  // confiável (pickCpuXI escala uma XI ad-hoc a cada rodada, não um
  // conceito fixo de titular), fica neutro — documentado como limitação.
  let sellerFactor = 1;
  if (String(sellingClubId) === String(CAREER.clubId)) {
    const isStarter = (CAREER.lineup.starters || []).includes(player.id);
    sellerFactor = isStarter ? 1.05 : 0.97;
  }

  const raw = base * contractFactor * needFactor * scoreFactor * finFactor * ctxFactor * concFactor * sellerFactor;
  return Math.round(clamp(raw, base * 0.70, base * 1.50) / 1000) * 1000;
}
function squadForClub(clubId) {
  return String(clubId) === String(CAREER.clubId) ? CAREER.squad.filter((p) => p.origin === "principal") : leagueSquadFor(clubId);
}
function calculateSellerReservationValue(player, sellingClubId, context = {}) {
  // P2 (motor de testes, Fase B) — num anúncio seu (maybeSpawnListingOffer)
  // a reserva é o preço que VOCÊ pediu, sem os fatores de resistência
  // abaixo: quem anunciou já decidiu vender por esse valor. Antes a
  // titularidade (+15%) e a necessidade (até +15%) subiam a reserva acima
  // do próprio pedido e nenhum comprador chegava lá — titular anunciado
  // nunca recebia proposta.
  if (context.sellerAsking != null) return Math.round(context.sellerAsking / 1000) * 1000;
  const base = context.baseValue != null ? context.baseValue : player.value;

  let titularityFactor = 1;
  if (String(sellingClubId) === String(CAREER.clubId)) {
    const isStarter = (CAREER.lineup.starters || []).includes(player.id);
    titularityFactor = isStarter ? 1.15 : 1.0; // titular de verdade -> +15% de resistência
  }

  const sellerSquad = squadForClub(sellingClubId);
  const sellerNeed = necessidadeScore(player, sellerSquad, sellingClubId);
  const needFactor = 1 + sellerNeed * 0.15; // até +15% quando o próprio vendedor carece desse perfil

  return Math.round(clamp(base * titularityFactor * needFactor, base * 0.95, base * 1.30) / 1000) * 1000;
}
const MAX_NEGOTIATION_ROUNDS = 3;
function calculateCounterOffer(offerValue, reservationValue) {
  const gap = Math.max(reservationValue - offerValue, 0);
  const raw = offerValue + Math.max(gap * 0.6, offerValue * 0.03); // sobe pelo menos 3% ou 60% da distância até a reserva
  const capped = Math.min(raw, reservationValue * 1.05);
  return Math.round(Math.max(capped, offerValue + 1000) / 1000) * 1000; // garante estritamente > offerValue mesmo após arredondar
}
function sellerNegotiationDecision(offerValue, reservationValue, rng = Math.random) {
  const ratio = reservationValue > 0 ? offerValue / reservationValue : 1;
  if (ratio < 0.75) return { action: "reject", value: null }; // muito abaixo da reserva
  if (ratio < 0.95) return { action: "counter", value: calculateCounterOffer(offerValue, reservationValue) }; // perto, mas ainda abaixo
  if (ratio < 1.05) {
    // na reserva (com folga de arredondamento pros 2 lados) -> aceita
    // com alta probabilidade; pequena chance de tentar mais um pouco.
    if (rng() < 0.85) return { action: "accept", value: offerValue };
    return { action: "counter", value: calculateCounterOffer(offerValue, reservationValue) };
  }
  return { action: "accept", value: offerValue }; // claramente acima da reserva
}
function buyerHardCap(player, buyingClubId, context = {}) {
  const budget = clubBudgetProxy(buyingClubId);
  const base = context.baseValue != null ? context.baseValue : player.value;
  return Math.min(budget.cash, base * 1.50);
}
function buyerNegotiationDecision(counterValue, initialOfferValue, player, buyingClubId, context = {}) {
  const score = transferScore(player, buyingClubId);
  const hardCap = buyerHardCap(player, buyingClubId, context);
  const toleranceFromScore = score < 0.40 ? 0.03 : score < 0.60 ? 0.08 : 0.15; // baixo/médio/alto interesse
  const maxWillingToPay = Math.min(initialOfferValue * (1 + toleranceFromScore), hardCap);

  if (counterValue > hardCap) return { action: "walk", value: null }; // impossível pagar -> desiste, nunca força
  if (counterValue <= maxWillingToPay) return { action: "accept", value: counterValue };
  const raised = Math.min(maxWillingToPay, hardCap);
  if (raised > initialOfferValue) return { action: "raise", value: Math.round(raised / 1000) * 1000 };
  return { action: "walk", value: null };
}
function negotiateOffer(player, buyingClubId, sellingClubId, context = {}) {
  const initialOffer = transferValuation(player, buyingClubId, sellingClubId, context);
  const reservation = calculateSellerReservationValue(player, sellingClubId, context);
  // NOTA (item 12) — o teto financeiro (buyerHardCap) protege
  // explicitamente CONTRAPROPOSTAS ("o comprador nunca pode aceitar
  // uma contraproposta que ultrapasse sua capacidade financeira
  // real"), não a oferta INICIAL em si: transferValuation (Fase 1.3)
  // já não é limitada por caixa — financeiroScore>0 (Fase 1.3.2,
  // graduado até 2,5x a capacidade) decide só ELEGIBILIDADE pra
  // pontuar/competir, mesma característica que já existia antes desta
  // fase (ver outlier documentado no Balance Check 1.3.1/1.3.2: um
  // clube com financeiro=0.4 já podia gerar uma oferta de dezenas de
  // milhões). Manter esse comportamento aqui evita uma 2ª mudança de
  // regra fora do pedido desta fase (alterar quando um clube é
  // elegível) — só a CONTRAPROPOSTA ganha o teto rígido novo.
  let currentOffer = initialOffer;
  let rounds = 0;
  while (rounds < MAX_NEGOTIATION_ROUNDS) {
    rounds++;
    const sellerDecision = sellerNegotiationDecision(currentOffer, reservation);
    if (sellerDecision.action === "accept") return { outcome: "accepted", finalValue: currentOffer, initialOffer, reservation, rounds };
    if (sellerDecision.action === "reject") return { outcome: "rejected", finalValue: null, initialOffer, reservation, rounds };
    const buyerDecision = buyerNegotiationDecision(sellerDecision.value, initialOffer, player, buyingClubId, context);
    if (buyerDecision.action === "accept") return { outcome: "accepted", finalValue: sellerDecision.value, initialOffer, reservation, rounds };
    if (buyerDecision.action === "walk" || buyerDecision.value <= currentOffer) return { outcome: "walked", finalValue: null, lastOffer: currentOffer, initialOffer, reservation, rounds };
    currentOffer = buyerDecision.value; // "raise" com progresso real -> próxima rodada
  }
  return { outcome: "walked", finalValue: null, lastOffer: currentOffer, initialOffer, reservation, rounds }; // esgotou o limite -> encerra, nunca loop infinito
}
function findInterestedBuyer(excludeId, player) {
  const eligible = marketTeamsPool().filter((t) =>
    String(t.id) !== String(excludeId) && leagueSquadFor(t.id).length < maxSquadSizeFor(t.id)
  );
  if (!eligible.length) return null;
  if (Math.random() < 0.2) return null; // 20% de chance de ninguém topar agora, mesmo com vaga
  // Compat: chamada sem jogador (não deveria acontecer nos 2 call
  // sites atuais, ambos já passam o jogador) mantém o sorteio uniforme
  // de sempre em vez de quebrar.
  if (!player) return eligible[Math.floor(Math.random() * eligible.length)];
  const scored = eligible
    .filter((t) => financeiroScore(player, leagueSquadFor(t.id), t.id) > 0)
    .map((t) => ({ item: t, score: transferScore(player, t.id) }));
  if (!scored.length) return null; // ninguém consegue bancar nem o salário reduzido do empréstimo
  return pickWeightedByScore(scored);
}
function offerEffectiveValue(offerValue, installments) {
  return offerValue * (1 - 0.03 * (installments - 1));
}
