/* ===================================================================
   MOTOR — MERCADO (Fase 12, etapa 5 do plano de independência, 05/11)
   -------------------------------------------------------------------
   Núcleo de regras do mercado, extraído de carreira.js sem mudar
   nenhuma: janela de transferências, interesse do clube (TransferScore:
   necessidade, adequação, financeiro e contexto), avaliação do valor,
   reserva do vendedor, contraproposta, decisões de quem vende e de quem
   compra, a negociação completa, a chance de nascer proposta e o valor
   efetivo de uma proposta parcelada.

   Forma (decisão de 05/11): tudo chega por parâmetro. Um clube é um
   objeto de dados que o carreira.js monta (ver marketClub):
     { id, squad, minSize, maxSize, avgOverall, ambition, starters, roster }
   - squad: elenco do clube como o mercado sempre usou (elencos CPU);
   - avgOverall / ambition: força média e ambição (tabela ou força);
   - starters: titulares, só no clube do técnico (null nos CPU);
   - roster: elenco considerado na reserva do vendedor.
   Nada aqui lê CAREER, DOM ou save.

   Sorteio: recebe o gerador `rng`, na mesma ordem de antes; o jogo passa
   Math.random (equivalência em tests/unit/test_motor_mercado.js).
=================================================================== */

import { wageBill } from "./financas.js";

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------- Janela de transferências ----------
export const TRANSFER_WINDOWS = [[1, 3], [20, 22]];
// Sem calendário: janela por rodada.
export function windowByRound(round) {
  for (const [open, close] of TRANSFER_WINDOWS) {
    if (round >= open && round <= close) return { open: true, closesAtRound: close };
  }
  const next = TRANSFER_WINDOWS.find(([open]) => open > round);
  return { open: false, opensAtRound: next ? next[0] : null };
}
// Com calendário: a janela é a fase do ano (férias, pré-temporada, pausa).
// Devolve a última semana da janela aberta, ou a 1ª semana da próxima.
export function windowByCalendar(weeks, idx, windowPhases) {
  if (windowPhases.has(weeks[idx].p)) {
    let j = idx;
    while (j + 1 < weeks.length && windowPhases.has(weeks[j + 1].p)) j++;
    return { open: true, lastIdx: j };
  }
  const k = weeks.findIndex((w, i) => i > idx && windowPhases.has(w.p));
  return { open: false, nextIdx: k };
}
// Urgência no fim da janela: só quem tem necessidade real sente.
export function urgencyMultiplier(necessidade, round) {
  const win = TRANSFER_WINDOWS.find(([open, close]) => round >= open && round <= close);
  if (!win) return 1;
  const [open, close] = win;
  const progress = clamp((round - open) / Math.max(close - open, 1), 0, 1);
  const needGate = clamp((necessidade - 0.15) / 0.35, 0, 1);
  return 1 + progress * needGate * 0.30;
}

// ---------- TransferScore ----------
// 1) Necessidade (35%): déficit de grupo, déficit de qualidade e tamanho do elenco.
export const SQUAD_GROUP_PROPORTION = { G: 0.12, D: 0.32, M: 0.32, F: 0.24 };
export function idealCountForGroup(squad, grp) {
  return Math.max(1, Math.round(squad.length * SQUAD_GROUP_PROPORTION[grp]));
}
export function groupDeficitScore(candidate, squad) {
  const ideal = idealCountForGroup(squad, candidate.group);
  const atual = squad.filter((p) => p.group === candidate.group).length;
  return clamp((ideal - atual) / ideal, 0, 1);
}
export function qualityDeficitScore(candidate, squad) {
  if (candidate.overall == null) return 0;
  const peers = squad.filter((p) => p.group === candidate.group && p.overall != null);
  if (!peers.length) return 1;
  const avgOverall = peers.reduce((s, p) => s + p.overall, 0) / peers.length;
  return clamp((candidate.overall - avgOverall) / 20, 0, 1);
}
// club null = sem clube informado (neutro).
export function squadSizeNeedFactor(squad, club) {
  if (club == null) return 1;
  const min = club.minSize, max = club.maxSize;
  if (max <= min) return 1;
  const frac = clamp((squad.length - min) / (max - min), 0, 1);
  return 1.25 - frac * 0.55;
}
export function necessidadeScore(candidate, squad, club) {
  const groupDeficit = groupDeficitScore(candidate, squad);
  const qualDeficit = qualityDeficitScore(candidate, squad);
  const combined = clamp(groupDeficit * 0.75 + qualDeficit * 0.25, 0, 1);
  return clamp(combined * squadSizeNeedFactor(squad, club), 0, 1);
}

// 2) Adequação (30%): nível, espaço para crescer e idade.
export function overallFitCurve(diff) {
  if (diff <= -15) return 0.15;
  if (diff <= 0) return 0.15 + (diff + 15) / 15 * 0.35;
  if (diff <= 8) return 0.50 + diff / 8 * 0.35;
  if (diff <= 20) return 0.85 + (diff - 8) / 12 * 0.15;
  return clamp(1.00 - (diff - 20) * 0.02, 0.55, 1.00);
}
export function adequacaoScore(candidate, squad, club) {
  const squadAvg = club.avgOverall;
  const overallFit = overallFitCurve(candidate.overall - squadAvg);
  const roomToGrow = candidate.potential != null
    ? clamp((candidate.potential - candidate.overall) / 20, 0, 1) : 0;
  const ageFit = candidate.age <= 23 ? 0.8 + roomToGrow * 0.2
    : candidate.age <= 30 ? 1.0
    : clamp(1 - (candidate.age - 30) * 0.08, 0.2, 1);
  return clamp(overallFit * 0.6 + roomToGrow * 0.2 + ageFit * 0.2, 0, 1);
}

// 3) Financeiro (20%): orçamento do clube derivado do próprio elenco.
export function clubBudget(club) {
  const wageCap = Math.round(wageBill(club.squad) * 1.35 / 1000) * 1000;
  const cash = Math.round(wageCap * 6 / 1000) * 1000;
  return { cash, wageCap };
}
export function affordabilityRatio(ratio) {
  if (ratio <= 1) return 1;
  if (ratio >= 2.5) return 0;
  return clamp(1 - (ratio - 1) / 1.5, 0, 1);
}
export function financeiroScore(candidate, squad, club) {
  const budget = clubBudget(club);
  const wageRatio = (wageBill(squad) + candidate.wage) / Math.max(1, budget.wageCap);
  const valueRatio = candidate.value / Math.max(1, budget.cash);
  return Math.min(affordabilityRatio(wageRatio), affordabilityRatio(valueRatio));
}

// 4) Contexto (15%): ambição do clube × quanto o jogador eleva o time.
// Ambição pela tabela (1º = 1, lanterna = 0) ou, fora da divisão, pela força.
export function tablePositionFactor(idx, size) {
  if (idx < 0 || size <= 1) return 0.5;
  return 1 - idx / (size - 1);
}
export function strengthAmbition(avgOverall, peersAvg) {
  const maxAvg = Math.max(...peersAvg, 1);
  return clamp(avgOverall / maxAvg, 0, 1);
}
export function contextoScore(candidate, squad, club) {
  const squadAvg = club.avgOverall;
  const ambicao = club.ambition;
  const upgrade = clamp((candidate.overall - squadAvg) / 15, -1, 1);
  return clamp(0.5 + ambicao * upgrade * 0.5, 0, 1);
}

// Pesos: necessidade 35% + adequação 30% + financeiro 20% + contexto 15%.
export function transferScore(candidate, club) {
  const squad = club.squad;
  const necessidade = necessidadeScore(candidate, squad, club);
  const adequacao = adequacaoScore(candidate, squad, club);
  const financeiro = financeiroScore(candidate, squad, club);
  const contexto = contextoScore(candidate, squad, club);
  return necessidade * 0.35 + adequacao * 0.30 + financeiro * 0.20 + contexto * 0.15;
}

// Escolha ponderada entre os 5 melhores (peso = score²).
export function pickWeightedByScore(scoredList, rng) {
  const top = scoredList.slice().sort((a, b) => b.score - a.score).slice(0, 5);
  const weights = top.map((x) => x.score * x.score);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return top.length ? top[0].item : null;
  let roll = rng() * total;
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return top[i].item;
  }
  return top[top.length - 1].item;
}

// Chance de a proposta nascer, pelo TransferScore.
export function offerProbabilityFromScore(score) {
  if (score < 0.25) return 0.02;
  if (score < 0.40) return 0.05;
  if (score < 0.55) return 0.10;
  if (score < 0.70) return 0.18;
  if (score < 0.80) return 0.28;
  if (score < 0.90) return 0.40;
  return 0.55;
}

// ---------- Avaliação e negociação ----------
// context: { seasonYear, baseValue?, competitorCount?, sellerAsking? }
export function transferValuation(player, buyer, seller, context = {}) {
  const base = context.baseValue != null ? context.baseValue : player.value;
  const squad = buyer.squad;
  const yearsLeft = clamp((player.contractUntil || context.seasonYear) - context.seasonYear, 0, 4);
  const contractFactor = 0.85 + yearsLeft * 0.05;
  const necessidade = necessidadeScore(player, squad, buyer);
  const needFactor = 0.95 + necessidade * 0.10;
  const interesse = transferScore(player, buyer);
  const scoreFactor = 0.90 + interesse * 0.20;
  const financeiro = financeiroScore(player, squad, buyer);
  const finFactor = 0.97 + financeiro * 0.05;
  const contexto = contextoScore(player, squad, buyer);
  const ctxFactor = 0.95 + contexto * 0.10;
  const competitorCount = clamp(context.competitorCount || 0, 0, 10);
  const concFactor = 1 + Math.min(0.10, competitorCount * 0.03);
  // Só quando quem vende é o técnico (titulares conhecidos).
  let sellerFactor = 1;
  if (seller.starters != null) {
    const isStarter = seller.starters.includes(player.id);
    sellerFactor = isStarter ? 1.05 : 0.97;
  }
  const raw = base * contractFactor * needFactor * scoreFactor * finFactor * ctxFactor * concFactor * sellerFactor;
  return Math.round(clamp(raw, base * 0.70, base * 1.50) / 1000) * 1000;
}

// Preço de reserva: "quanto me custa perder esse jogador".
export function calculateSellerReservationValue(player, seller, context = {}) {
  if (context.sellerAsking != null) return Math.round(context.sellerAsking / 1000) * 1000;
  const base = context.baseValue != null ? context.baseValue : player.value;
  let titularityFactor = 1;
  if (seller.starters != null) {
    const isStarter = seller.starters.includes(player.id);
    titularityFactor = isStarter ? 1.15 : 1.0;
  }
  const sellerNeed = necessidadeScore(player, seller.roster, seller);
  const needFactor = 1 + sellerNeed * 0.15;
  return Math.round(clamp(base * titularityFactor * needFactor, base * 0.95, base * 1.30) / 1000) * 1000;
}

export const MAX_NEGOTIATION_ROUNDS = 3;

// Contraproposta: sobe pelo menos 3% ou 60% da distância até a reserva.
export function calculateCounterOffer(offerValue, reservationValue) {
  const gap = Math.max(reservationValue - offerValue, 0);
  const raw = offerValue + Math.max(gap * 0.6, offerValue * 0.03);
  const capped = Math.min(raw, reservationValue * 1.05);
  return Math.round(Math.max(capped, offerValue + 1000) / 1000) * 1000;
}

// Decisão do vendedor: faixas pela razão oferta/reserva (sorteio só perto dela).
export function sellerNegotiationDecision(offerValue, reservationValue, rng) {
  const ratio = reservationValue > 0 ? offerValue / reservationValue : 1;
  if (ratio < 0.75) return { action: "reject", value: null };
  if (ratio < 0.95) return { action: "counter", value: calculateCounterOffer(offerValue, reservationValue) };
  if (ratio < 1.05) {
    if (rng() < 0.85) return { action: "accept", value: offerValue };
    return { action: "counter", value: calculateCounterOffer(offerValue, reservationValue) };
  }
  return { action: "accept", value: offerValue };
}

// Teto do comprador: caixa e 150% do valor base.
export function buyerHardCap(player, buyer, context = {}) {
  const budget = clubBudget(buyer);
  const base = context.baseValue != null ? context.baseValue : player.value;
  return Math.min(budget.cash, base * 1.50);
}
export function buyerNegotiationDecision(counterValue, initialOfferValue, player, buyer, context = {}) {
  const score = transferScore(player, buyer);
  const hardCap = buyerHardCap(player, buyer, context);
  const toleranceFromScore = score < 0.40 ? 0.03 : score < 0.60 ? 0.08 : 0.15;
  const maxWillingToPay = Math.min(initialOfferValue * (1 + toleranceFromScore), hardCap);
  if (counterValue > hardCap) return { action: "walk", value: null };
  if (counterValue <= maxWillingToPay) return { action: "accept", value: counterValue };
  const raised = Math.min(maxWillingToPay, hardCap);
  if (raised > initialOfferValue) return { action: "raise", value: Math.round(raised / 1000) * 1000 };
  return { action: "walk", value: null };
}

// Negociação completa (até MAX_NEGOTIATION_ROUNDS rodadas).
export function negotiateOffer(player, buyer, seller, context, rng) {
  const initialOffer = transferValuation(player, buyer, seller, context);
  const reservation = calculateSellerReservationValue(player, seller, context);
  let currentOffer = initialOffer;
  let rounds = 0;
  while (rounds < MAX_NEGOTIATION_ROUNDS) {
    rounds++;
    const sellerDecision = sellerNegotiationDecision(currentOffer, reservation, rng);
    if (sellerDecision.action === "accept") return { outcome: "accepted", finalValue: currentOffer, initialOffer, reservation, rounds };
    if (sellerDecision.action === "reject") return { outcome: "rejected", finalValue: null, initialOffer, reservation, rounds };
    const buyerDecision = buyerNegotiationDecision(sellerDecision.value, initialOffer, player, buyer, context);
    if (buyerDecision.action === "accept") return { outcome: "accepted", finalValue: sellerDecision.value, initialOffer, reservation, rounds };
    if (buyerDecision.action === "walk" || buyerDecision.value <= currentOffer) return { outcome: "walked", finalValue: null, lastOffer: currentOffer, initialOffer, reservation, rounds };
    currentOffer = buyerDecision.value;
  }
  return { outcome: "walked", finalValue: null, lastOffer: currentOffer, initialOffer, reservation, rounds };
}

// Peso de uma proposta parcelada para quem vende (-3% por parcela extra).
export function offerEffectiveValue(offerValue, installments) {
  return offerValue * (1 - 0.03 * (installments - 1));
}
