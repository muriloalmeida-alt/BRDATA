/* ===================================================================
   MOTOR — MERCADO E CLUBE (plano "sem página escondida", etapa E, 09/11)
   -------------------------------------------------------------------
   As ações de mercado e de clube, extraídas de carreira.js sem mudar
   regra nem texto (os comentários de cada regra continuam junto dos
   atalhos em carreira.js):
   - mercado: suas propostas (fazer, aumentar, retirar, aceitar a
     contraproposta), anúncios de venda (criar, aceitar, recusar,
     cancelar), empréstimos (de saída e de entrada), proposta recebida
     por jogador seu, renovação (o veredito do jogador) e conversa;
   - clube: comissão técnica, obras do estádio, patrocínio, olheiros
     (contratar, dispensar, missões, trazer para a base), pedido de
     orçamento à diretoria, itens da loja, histórico de compras e a
     pontuação do ranking.

   Não chama a tela: avisos viram o evento "aviso" e o que a página
   antiga fazia depois de cada ação (gravar, redesenhar uma tela, abrir a
   coletiva, fechar um painel) vira o evento "tela", que ela atende na
   mesma ordem. A v2 não ouve "tela": ela grava e redesenha por conta
   própria (decisão de 09/11).
=================================================================== */
import { carreiraAtual, ligaAtual, todosTimes, timePorId, forcaMediaDoElenco, competicaoAtual } from "./estado.js";
import { emitir } from "./eventos.js";
import { pushNotification, ensureObjectivesFresh, bumpObjective } from "./registro.js";
import { fmtBRL, abbreviateName } from "./texto.js";
import { MAX_PRINCIPAL, REGION_LABEL, SCOUT_MISSION_DURATIONS, SCOUT_MISSION_TYPES, UF_TO_REGION, ambiente, avisar, finalizeIncomingPurchase, financeiroScore, leagueSquadFor, marketTeamsPool, maxSquadSizeFor, pickWeightedByScore, pruneRecentDeclines, pushLedger, pushTransferLog, transferScore } from "./semana.js";
import { TALK_BENCH_STREAK_THRESHOLD, WANTS_TRANSFER_BENCH_STREAK, WANTS_TRANSFER_MORALE_MAX, playerComplaintFactor } from "./aovivo.js";
import { firePressConference } from "./posjogo.js";
import * as financas from "./financas.js";
import * as mercado from "./mercado.js";
import * as tabela from "./tabela.js";
import * as temporada from "./temporada.js";
import * as registro from "./registro.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const teamById = (id) => timePorId(id);
const squadAvgOverallOf = (clubId) => forcaMediaDoElenco(clubId);
const sortedStandings = () => tabela.sortRows(carreiraAtual().standings);
const positionInStandings = (standings) => tabela.positionOf(standings, carreiraAtual().clubId);
const myLeaguePosition = () => sortedStandings().findIndex((r) => String(r.id) === String(carreiraAtual().clubId)) + 1;
const wageBillOf = (squad) => financas.wageBill(squad);
const computeContractFields = (overall, age, potential, rng) => temporada.computeContractFields(overall, age, potential, rng, ambiente.temporadaReal());

// O que a página antiga fazia depois de cada ação (gravar, redesenhar,
// abrir a coletiva, fechar um painel) vira o evento "tela", na mesma ordem.
function tela(nome, ...args) { emitir("tela", { nome, args }); }

export function fmtBRLShort(v) {
  const n = v || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return fmtBRL(n);
}

export function canTalkTo(p) {
  const CAREER = carreiraAtual();
  const morale = p.morale == null ? 70 : p.morale;
  const eligible = (p.benchStreak || 0) >= TALK_BENCH_STREAK_THRESHOLD || morale <= 30;
  return eligible && p.lastTalkRound !== CAREER.currentRound;
}

export function applyTalkEffect(p, option) {
  const CAREER = carreiraAtual();
  const morale = p.morale == null ? 70 : p.morale;
  let delta, resultText;
  if (option === "apoiar") {
    delta = 12;
    resultText = `${abbreviateName(p.name)} se sentiu ouvido e ficou mais tranquilo.`;
  } else if (option === "prometer") {
    delta = 10;
    p.benchStreak = 0; // esperançoso com a promessa — reinicia a contagem de insatisfação
    resultText = `${abbreviateName(p.name)} ficou esperançoso com a promessa de mais chances.`;
  } else {
    delta = morale <= 30 ? -8 : 6;
    resultText = delta > 0
      ? `${abbreviateName(p.name)} levou a cobrança na esportiva e prometeu se superar.`
      : `${abbreviateName(p.name)} não gostou nada do tom — ficou ainda mais incomodado.`;
  }
  const newMorale = clamp(morale + delta, 0, 100);
  p.moraleTrend = newMorale > morale ? "subindo" : newMorale < morale ? "caindo" : "estavel";
  p.morale = newMorale;
  p.moraleReason = "Conversou recentemente com o técnico";
  p.wantsTransfer = p.benchStreak >= WANTS_TRANSFER_BENCH_STREAK && p.morale <= WANTS_TRANSFER_MORALE_MAX;
  p.lastTalkRound = CAREER.currentRound;
  return { delta, resultText, applied: newMorale - morale };
}

export function signSponsorProposal(kind, idx) {
  const CAREER = carreiraAtual();
  const proposal = (CAREER.sponsorProposals[kind] || [])[idx];
  if (!proposal) return;
  CAREER.sponsorship[kind] = { empresa: proposal.empresa, valorTemporada: proposal.valorTemporada, temporadasRestantes: proposal.duracao };
  CAREER.sponsorProposals[kind] = null;
  tela("fecharOverlay", "sponsorProposalsOverlay");
  tela("persistCareer");
  tela("renderCentral");
  avisar(`Contrato assinado com ${proposal.empresa}!`, { type: "pos" });
}

export const BOARD_REQUEST_COOLDOWN = 4;

export function evaluateBoardRequest() {
  const CAREER = carreiraAtual();
  const pos = myLeaguePosition();
  const total = Object.keys(CAREER.standings).length || 20;
  const relegationZone = pos > total - 4;
  const titleRace = pos > 0 && pos <= 4;
  let approved, boost, reason;
  if (relegationZone) {
    approved = true;
    boost = 0.4 + Math.random() * 0.3;
    reason = `A diretoria, preocupada com o risco de rebaixamento (${pos}º lugar), liberou recursos extras pro elenco.`;
  } else if (titleRace) {
    approved = true;
    boost = 0.3 + Math.random() * 0.3;
    reason = `Animada com a briga pelo título (${pos}º lugar), a diretoria decidiu investir mais no elenco.`;
  } else {
    approved = Math.random() < 0.15;
    boost = 0.12;
    reason = approved
      ? `Mesmo sem urgência (${pos}º lugar, meio de tabela), a diretoria aprovou um aporte pontual.`
      : `A diretoria negou o pedido — ${pos}º lugar não justifica risco de rebaixamento nem disputa de título no momento.`;
  }
  const raise = approved ? Math.round(CAREER.finances.wageCap * boost / 1000) * 1000 : 0;
  const cashBoost = approved ? raise * 3 : 0;
  return { approved, raise, cashBoost, reason, pos };
}

export function boardRequest() {
  const CAREER = carreiraAtual();
  const last = CAREER.lastBoardRequestRound;
  if (last != null && CAREER.currentRound - last < BOARD_REQUEST_COOLDOWN) {
    const wait = BOARD_REQUEST_COOLDOWN - (CAREER.currentRound - last);
    return { ok: false, motivo: "espera", wait, texto: `A diretoria já respondeu recentemente — espere mais ${wait} rodada${wait > 1 ? "s" : ""}.` };
  }
  const result = evaluateBoardRequest();
  CAREER.lastBoardRequestRound = CAREER.currentRound;
  if (result.approved) {
    CAREER.finances.wageCap += result.raise;
    CAREER.finances.cash += result.cashBoost;
    if (result.cashBoost) pushLedger("diretoria", "Reforço de orçamento da diretoria", result.cashBoost, CAREER.currentRound);
    CAREER.boardDecision = `✅ ${result.reason} Teto salarial +${fmtBRLShort(result.raise)}, caixa +${fmtBRLShort(result.cashBoost)}.`;
  } else {
    CAREER.boardDecision = `❌ ${result.reason}`;
  }
  return { ok: true, ...result };
}

export const STADIUM_UPGRADES = [
  { id: "setor_norte", name: "Setor Norte +3.000 lugares", icon: "🪑", capacityGain: 3000, cost: 4200000, roundsNeeded: 10, requires: null },
  { id: "iluminacao", name: "Iluminação LED completa", icon: "💡", capacityGain: 0, cost: 900000, roundsNeeded: 4, requires: null },
  { id: "camarotes", name: "Camarotes premium", icon: "🏟️", capacityGain: 0, cost: 6800000, roundsNeeded: 14, requires: "setor_norte" },
];

export function startStadiumUpgrade(id) {
  const CAREER = carreiraAtual();
  const upgrade = STADIUM_UPGRADES.find((u) => u.id === id);
  if (!upgrade) return;
  const st = CAREER.stadium;
  if (st.pendingUpgrade) {
    avisar("Já existe uma obra em andamento — espere terminar antes de iniciar outra.", { type: "warn" });
    return;
  }
  if (st.completed.includes(id)) {
    avisar("Essa melhoria já foi concluída.", { type: "warn" });
    return;
  }
  if (upgrade.requires && !st.completed.includes(upgrade.requires)) {
    avisar("Essa melhoria depende de outra ainda não concluída.", { type: "warn" });
    return;
  }
  if (CAREER.finances.cash < upgrade.cost) {
    avisar(`Caixa insuficiente — a obra custa ${fmtBRL(upgrade.cost)}.`, { type: "warn" });
    return;
  }
  CAREER.finances.cash -= upgrade.cost;
  pushLedger("estadio", `Obra iniciada: ${upgrade.name}`, -upgrade.cost, CAREER.currentRound);
  st.pendingUpgrade = { id: upgrade.id, name: upgrade.name, capacityGain: upgrade.capacityGain, roundsLeft: upgrade.roundsNeeded };
  tela("persistCareer");
  tela("renderStadiumScreen");
  tela("renderCentral");
  avisar(`Obra iniciada: ${upgrade.name}.`, { type: "pos" });
}

export function findInterestedBuyer(excludeId, player) {
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

export const LOAN_REFUSAL_EFFECTIVE_THRESHOLD = 55;

export function isLoanOutRefused(p) {
  return p.overall * playerComplaintFactor(p) >= LOAN_REFUSAL_EFFECTIVE_THRESHOLD;
}

export async function finalizeLoanOut(id, { returnRound, buyOption, buyer: passedBuyer } = {}) {
  const CAREER = carreiraAtual();
  const p = CAREER.squad.find((x) => x.id === id);
  if (!p) return false;
  if (isLoanOutRefused(p)) {
    avisar(`${abbreviateName(p.name)} recusou o empréstimo — quer continuar brigando por espaço no elenco principal.`, { durationMs: 5000, type: "warn" });
    return false;
  }
  // AJUSTE (pedido do usuário, item 7) — o comprador já foi resolvido e
  // mostrado ao técnico em openLoanOutModal (pra não trocar quem
  // aparece na confirmação por outro clube no fim); só re-sorteia aqui
  // se chamado direto sem passar por lá (ex: chamada avulsa/teste).
  const buyer = passedBuyer || findInterestedBuyer(CAREER.clubId, p);
  if (!buyer) {
    avisar(`Nenhum time demonstrou interesse em pegar ${abbreviateName(p.name)} emprestado agora.`);
    return false;
  }
  CAREER.squad = CAREER.squad.filter((x) => x.id !== id);
  CAREER.lineup.starters = CAREER.lineup.starters.map((x) => (x === id ? null : x));
  CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== id);
  p.onLoanFromClubId = CAREER.clubId;
  p.loanReturnRound = returnRound;
  p.loanBuyOption = buyOption;
  (CAREER.leagueSquads[String(buyer.id)] = CAREER.leagueSquads[String(buyer.id)] || []).push(p);
  // Taxa de empréstimo — bem menor que uma venda de verdade (10% do
  // valor de mercado; metade disso se for só por 6 meses).
  const fee = Math.round((p.value * 0.10 * (returnRound ? 0.5 : 1)) / 1000) * 1000;
  CAREER.finances.cash += fee;
  const durationLabel = returnRound ? "por 6 meses" : "até o fim da temporada";
  const clauseLabel = buyOption ? (buyOption.mandatory ? ` (compra obrigatória de ${fmtBRL(buyOption.value)} ao fim)` : ` (opção de compra de ${fmtBRL(buyOption.value)} ao fim)`) : "";
  pushTransferLog(`Você emprestou ${p.name} pro ${buyer.name} ${durationLabel} por ${fmtBRL(fee)}${clauseLabel}.`, CAREER.currentRound);
  pushLedger("transferencia", `Empréstimo — ${p.name} (${buyer.name})`, fee, CAREER.currentRound);
  avisar(`${abbreviateName(p.name)} emprestado por ${fmtBRL(fee)}.`, { type: "pos" });
  ensureObjectivesFresh(); bumpObjective("daily", "obj_market_1_move", 1);
  return true;
}

export async function finalizeLoanIn(clubId, playerId, { returnRound, buyOption, wagePct }) {
  const CAREER = carreiraAtual();
  const squad = leagueSquadFor(clubId);
  const idx = squad.findIndex((x) => x.id === playerId);
  if (idx < 0) return false;
  const p = squad[idx];
  if (isLoanOutRefused(p)) {
    avisar(`${teamById(clubId).name} recusou emprestar ${abbreviateName(p.name)} — é peça importante demais pro clube.`, { durationMs: 5000, type: "warn" });
    return false;
  }
  const loanWage = Math.round((p.wage * (wagePct / 100)) / 100) * 100;
  if (wageBillOf(CAREER.squad) + loanWage > CAREER.finances.wageCap) {
    avisar(`Pegar esse jogador emprestado estouraria o teto salarial (${fmtBRL(CAREER.finances.wageCap)}).`, { type: "warn" });
    return false;
  }
  if (CAREER.squad.length >= MAX_PRINCIPAL + 20) { avisar("Elenco já está muito grande — dispense ou negocie alguém antes.", { type: "warn" }); return false; }
  squad.splice(idx, 1);
  p.loanFromClubId = String(clubId);
  p.loanOriginalWage = p.wage;
  p.wage = loanWage;
  p.origin = "loan";
  p.loanReturnRound = returnRound;
  p.loanBuyOption = buyOption;
  CAREER.squad.push(p);
  const durationLabel = returnRound ? "por 6 meses" : "até o fim da temporada";
  const clauseLabel = buyOption ? (buyOption.mandatory ? `, com compra obrigatória de ${fmtBRL(buyOption.value)} ao fim` : `, com opção de compra de ${fmtBRL(buyOption.value)} ao fim`) : "";
  pushTransferLog(`Você pegou ${p.name} emprestado do ${teamById(clubId).name} ${durationLabel} (${wagePct}% do salário)${clauseLabel}.`, CAREER.currentRound);
  avisar(`${abbreviateName(p.name)} chegou emprestado!`, { type: "pos" });
  ensureObjectivesFresh(); bumpObjective("daily", "obj_market_1_move", 1);
  return true;
}

export function recordDecline(playerId, clubId, round) {
  pruneRecentDeclines(round).push({ playerId: String(playerId), clubId: String(clubId), round });
}

export function computeLeaderboardScore() {
  const CAREER = carreiraAtual();
  const row = CAREER.standings[CAREER.clubId] || { pts: 0, sg: 0 };
  const achievementsUnlocked = (CAREER.achievements || []).filter((a) => a.unlockedAt).length;
  return { score: row.pts * 10 + achievementsUnlocked * 50 + row.sg * 2, breakdown: { pts: row.pts, achievements: achievementsUnlocked, sg: row.sg } };
}

export function applyBoostEffect(item) {
  const CAREER = carreiraAtual();
  switch (item.id) {
    case "recuperacao_instantanea": {
      const target = CAREER.squad.filter((p) => p.origin !== "loan").sort((a, b) => (a.condition || 0) - (b.condition || 0))[0];
      if (!target) return null;
      target.condition = 100;
      return `Condição de ${abbreviateName(target.name)} zerada`;
    }
    case "reset_moral":
      CAREER.squad.forEach((p) => { p.morale = 90; p.moraleReason = "Impulso de moral (Loja)"; p.moraleTrend = "estavel"; });
      return "Moral do elenco inteiro no talo";
    case "treino_extra":
      CAREER.trainingAppliedForRound = null; // libera aplicar o treino da semana de novo (ver applyWeeklyTraining)
      return "Treino da semana liberado de novo";
    case "injecao_moral":
      CAREER.squad.forEach((p) => { p.morale = clamp((p.morale == null ? 70 : p.morale) + 15, 0, 100); });
      return "+15 de moral em todo o elenco";
    case "desconto_contratacao":
      CAREER.nextSigningDiscountPct = 15; // consumido em openOfferModal/confirmOfferFromModal
      return "-15% na próxima proposta de contratação";
    case "uniforme_alternativo":
      CAREER.altKitOwned = true;
      return "Uniforme alternativo desbloqueado";
    default:
      return null;
  }
}

export const PURCHASE_HISTORY_MAX = 30;

export function pushPurchaseHistory(icon, name, detail, valueLabel, valueType) {
  const CAREER = carreiraAtual();
  CAREER.purchaseHistory = CAREER.purchaseHistory || [];
  CAREER.purchaseHistory.unshift({ icon, name, detail, valueLabel, valueType, ts: Date.now() });
  if (CAREER.purchaseHistory.length > PURCHASE_HISTORY_MAX) CAREER.purchaseHistory.length = PURCHASE_HISTORY_MAX;
}

export function isContractExpiring(p) {
  const CAREER = carreiraAtual();
  // Jogador emprestado (origin "loan") não é seu pra renovar contrato
  // nenhum — o contractUntil dele é do clube DONO, não seu.
  return p.origin !== "loan" && p.contractUntil === CAREER.seasonYear;
}

export function suggestedRenewalWage(p) {
  const m = p.morale == null ? 70 : p.morale;
  const moraleBonus = clamp((m - 70) / 100, -0.05, 0.15);
  return Math.round((p.wage * (1.05 + moraleBonus)) / 100) * 100;
}

export function renewalVerdict(p, newWage, duration) {
  const CAREER = carreiraAtual();
  const minWage = suggestedRenewalWage(p);
  // Orçamento primeiro (o CLUBE não pode nem oferecer o que não cabe
  // no teto) — mesma trava de promote/buyPlayer. Base não conta pro
  // teto (wageBillOf só soma elenco principal, ver Fase 2b), então só
  // barra pra quem já está no principal.
  if (newWage > p.wage && p.origin === "principal" && wageBillOf(CAREER.squad) - p.wage + newWage > CAREER.finances.wageCap) {
    return { motivo: "teto", texto: `Essa renovação estouraria o teto salarial (${fmtBRL(CAREER.finances.wageCap)}).` };
  }
  // Recusa do JOGADOR (não do orçamento) — regras determinísticas de
  // propósito. FASE 2 (b): moral MUITO baixa é recusa na certa, valor
  // e duração nem importam mais; antes disso, mínimo sugerido continua
  // sendo recusa na certa, e proposta de 1 ano só passa pra quem
  // realmente não tem moral de pedir mais tempo.
  const morale = p.morale == null ? 70 : p.morale;
  if (morale < 30) return { motivo: "moral", texto: "Está infeliz no clube e não quer renovar agora.", toast: "está infeliz no clube e não quer renovar agora." };
  if (newWage < minWage) return { motivo: "salario", texto: `Quer pelo menos ${fmtBRL(minWage)}/mês.`, toast: `quer pelo menos ${fmtBRL(minWage)}/mês.` };
  if (duration === 1 && (p.age <= 23 || p.overall >= 85 || morale >= 85)) return { motivo: "duracao", texto: "Quer um contrato mais longo (pelo menos 2 anos).", toast: "quer um contrato mais longo (pelo menos 2 anos)." };
  return null;
}

export function markLineupDirty() {
  const CAREER = carreiraAtual();
  if (CAREER.activeSchemeId != null) CAREER.activeSchemeId = null;
}

export function hireTechnicalStaff() {
  const CAREER = carreiraAtual();
  CAREER.technicalStaff.hired = true;
  tela("persistCareer");
}

export function fireTechnicalStaff() {
  const CAREER = carreiraAtual();
  CAREER.technicalStaff.hired = false;
  tela("persistCareer");
}

export const OFFER_WAIT_ROUNDS = 2; // rodadas até o clube vendedor responder

export function submitOfferOut(clubId, playerId, rawValue, rawInstallments) {
  const CAREER = carreiraAtual();
  const p = leagueSquadFor(clubId).find((x) => x.id === playerId);
  if (!p) return { ok: false, motivo: "indisponivel", texto: "Esse jogador não está mais disponível." };
  const value = Math.max(1000, Math.round(Number(rawValue) || 0));
  const installments = Number(rawInstallments) || 1;
  if (wageBillOf(CAREER.squad) + p.wage > CAREER.finances.wageCap) {
    return { ok: false, motivo: "teto", texto: `Contratar esse jogador estouraria o teto salarial (${fmtBRL(CAREER.finances.wageCap)}).` };
  }
  if (CAREER.squad.length >= MAX_PRINCIPAL + 20) return { ok: false, motivo: "elenco-grande", texto: "Elenco já está muito grande — dispense ou venda alguém antes." };
  const clubName = teamById(clubId).name;
  CAREER.pendingOffersOut = CAREER.pendingOffersOut || [];
  const offer = {
    id: `offerout_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    playerId: p.id, playerName: p.name, clubId: String(clubId), clubName,
    marketValue: p.value, offerValue: value, installments,
    roundsLeft: OFFER_WAIT_ROUNDS, status: "pending", counterValue: null,
    submittedRound: CAREER.currentRound,
  };
  CAREER.pendingOffersOut.push(offer);
  // Item 7 — "Desconto de Contratação" vale pra UMA proposta só (mesmo
  // texto do boost, "1 janela de transferência" — na prática, a
  // primeira que o técnico realmente enviar depois de comprá-lo).
  CAREER.nextSigningDiscountPct = null;
  return { ok: true, offer, player: p, value, clubName };
}

export function increaseOffer(offerId, newValue) {
  const CAREER = carreiraAtual();
  const o = (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
  if (!o) return;
  const value = Math.max(o.offerValue, Math.round(Number(newValue) || 0));
  o.offerValue = value;
  o.status = "pending";
  o.counterValue = null;
  o.roundsLeft = OFFER_WAIT_ROUNDS;
  tela("persistCareer");
  tela("renderMyOffersScreen");
  avisar(`Proposta por ${abbreviateName(o.playerName)} atualizada pra ${fmtBRL(value)}.`, { type: "pos" });
}

export function withdrawOffer(offerId) {
  const CAREER = carreiraAtual();
  const o = (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
  if (!o) return;
  CAREER.pendingOffersOut = (CAREER.pendingOffersOut || []).filter((x) => x.id !== offerId);
  pushTransferLog(`Você retirou sua proposta por ${o.playerName} (${o.clubName}).`, CAREER.currentRound);
  tela("persistCareer");
  tela("renderMyOffersScreen");
  tela("renderMercado");
  avisar(`Proposta por ${abbreviateName(o.playerName)} retirada.`, { type: "info" });
}

export function acceptCounterOffer(offerId) {
  const CAREER = carreiraAtual();
  const o = (CAREER.pendingOffersOut || []).find((x) => x.id === offerId);
  if (!o || o.counterValue == null) return;
  o.offerValue = o.counterValue;
  o.counterValue = null;
  const r = finalizeIncomingPurchase(o);
  CAREER.pendingOffersOut = (CAREER.pendingOffersOut || []).filter((x) => x.id !== offerId);
  tela("persistCareer");
  tela("renderMyOffersScreen");
  tela("renderMercado"); tela("renderElenco"); tela("renderCentral");
  return r;
}

export function listingFor(playerId) {
  const CAREER = carreiraAtual();
  return (CAREER.pendingListings || []).find((l) => String(l.playerId) === String(playerId));
}

export function createListing(p, rawValue) {
  const CAREER = carreiraAtual();
  const askingValue = Math.max(1000, Math.round(Number(rawValue) || 0));
  CAREER.pendingListings = CAREER.pendingListings || [];
  const listing = {
    id: `listing_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    playerId: p.id, playerName: p.name, askingValue, marketValue: p.value,
    listedRound: CAREER.currentRound, offers: [],
  };
  CAREER.pendingListings.push(listing);
  return listing;
}

export function rejectListingOffer(listingId, offerId) {
  const CAREER = carreiraAtual();
  const listing = (CAREER.pendingListings || []).find((l) => l.id === listingId);
  if (!listing) return;
  listing.offers = listing.offers.filter((o) => o.id !== offerId);
  tela("persistCareer");
  tela("renderMySalesScreen");
  tela("renderMercado");
}

export function cancelListing(listingId) {
  const CAREER = carreiraAtual();
  const listing = (CAREER.pendingListings || []).find((l) => l.id === listingId);
  CAREER.pendingListings = (CAREER.pendingListings || []).filter((l) => l.id !== listingId);
  tela("persistCareer");
  tela("renderMySalesScreen");
  tela("renderMercado");
  avisar(listing ? `${abbreviateName(listing.playerName)} não está mais à venda.` : "Anúncio cancelado.", { type: "info" });
}

export function acceptListingOffer(listingId, offerId) {
  const CAREER = carreiraAtual();
  const listing = (CAREER.pendingListings || []).find((l) => l.id === listingId);
  if (!listing) return { ok: false, texto: "Anúncio não encontrado." };
  const offer = listing.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, texto: "Proposta não encontrada." };
  const p = CAREER.squad.find((x) => x.id === listing.playerId);
  if (!p) {
    avisar(`${abbreviateName(listing.playerName)} não está mais no seu elenco — anúncio cancelado.`, { type: "warn" });
    CAREER.pendingListings = (CAREER.pendingListings || []).filter((l) => l.id !== listingId);
    tela("persistCareer"); tela("renderMySalesScreen"); tela("renderMercado");
    return { ok: false, texto: `${abbreviateName(listing.playerName)} não está mais no seu elenco — anúncio cancelado.` };
  }
  const principalCount = CAREER.squad.filter((x) => x.origin === "principal").length;
  if (p.origin === "principal" && principalCount <= 14) {
    avisar("O elenco principal não pode ficar com menos de 14 jogadores — não dá pra fechar essa venda agora.", { type: "warn" });
    return { ok: false, texto: "O elenco principal não pode ficar com menos de 14 jogadores — não dá pra fechar essa venda agora." };
  }
  const perInstallment = Math.round(offer.value / offer.installments / 1000) * 1000;
  const firstPayment = offer.installments === 1 ? offer.value : perInstallment;
  CAREER.squad = CAREER.squad.filter((x) => x.id !== p.id);
  CAREER.lineup.starters = CAREER.lineup.starters.map((x) => (x === p.id ? null : x));
  CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== p.id);
  CAREER.finances.cash += firstPayment;
  if (offer.installments > 1) {
    CAREER.pendingReceivables = CAREER.pendingReceivables || [];
    CAREER.pendingReceivables.push({ roundsLeft: offer.installments - 1, perRoundAmount: perInstallment, label: `Parcela da venda de ${p.name}` });
  }
  (CAREER.leagueSquads[String(offer.clubId)] = CAREER.leagueSquads[String(offer.clubId)] || []).push(p);
  pushTransferLog(`Você vendeu ${p.name} pro ${offer.clubName} por ${fmtBRL(offer.value)}${offer.installments > 1 ? ` (${offer.installments}x)` : ""}.`, CAREER.currentRound);
  pushLedger("transferencia", `Venda — ${p.name} (${offer.clubName})${offer.installments > 1 ? ` — 1ª de ${offer.installments} parcelas` : ""}`, firstPayment, CAREER.currentRound);
  avisar(`${abbreviateName(p.name)} vendido! O ${offer.clubName} pagou ${fmtBRL(offer.value)}.`, { type: "pos" });
  ensureObjectivesFresh(); bumpObjective("daily", "obj_market_1_move", 1);
  CAREER.pendingListings = (CAREER.pendingListings || []).filter((l) => l.id !== listingId);
  // FASE 4 (item 2) — mesmo proxy de "venda de jogador querido pela
  // torcida" já usado em sellPlayer.
  if (p.overall >= 80) { firePressConference("16", CAREER.currentRound, false); tela("openPressConferenceModal"); }
  markLineupDirty();
  tela("persistCareer");
  tela("renderMySalesScreen");
  tela("renderMercado"); tela("renderElenco"); tela("renderEscalacao"); tela("renderCentral");
  return { ok: true, player: p, offer };
}

export function scoutingAvailableRegions() {
  const set = new Set((todosTimes() || []).map((t) => UF_TO_REGION[t.uf]).filter(Boolean));
  return Array.from(set);
}

export const SCOUT_MARKET = [
  { id: "r_moura", name: "R. Moura", specialty: "Especialista em Norte", regionScope: ["norte"], evaluation: 3, network: 4, monthlyCost: 6000 },
  { id: "p_andrade", name: "P. Andrade", specialty: "Especialista em Nordeste", regionScope: ["nordeste"], evaluation: 4, network: 4, monthlyCost: 8000 },
  { id: "l_bastos", name: "L. Bastos", specialty: "Especialista em Centro-Oeste", regionScope: ["centro-oeste"], evaluation: 3, network: 3, monthlyCost: 5000 },
  { id: "f_quintana", name: "F. Quintana", specialty: "Especialista em Sudeste", regionScope: ["sudeste"], evaluation: 4, network: 3, monthlyCost: 9000 },
  { id: "g_weber", name: "G. Weber", specialty: "Especialista em Sul", regionScope: ["sul"], evaluation: 3, network: 4, monthlyCost: 6000 },
  { id: "c_nascimento", name: "C. Nascimento", specialty: "Generalista · Sul e Sudeste", regionScope: ["sul", "sudeste"], evaluation: 3, network: 3, monthlyCost: 5000 },
  { id: "a_lima", name: "A. Lima", specialty: "Generalista nacional", regionScope: "any", evaluation: 3, network: 3, monthlyCost: 10000 },
  // id mantido de propósito: era o "especialista em base internacional"
  // — quem já tinha contratado continua com ele, agora nacional (ver
  // migrateScoutsToNational).
  { id: "t_lacerda", name: "T. Lacerda", specialty: "Olheiro-chefe nacional", regionScope: "any", evaluation: 5, network: 5, monthlyCost: 22000 },
].map((c) => ({ ...c, stars: Math.round((c.evaluation + c.network) / 2) }));

export function scoutAllowedRegions(scout) {
  return scout.regionScope === "any" ? scoutingAvailableRegions() : scout.regionScope;
}

export function hireScout(marketId) {
  const CAREER = carreiraAtual();
  if ((CAREER.scouts || []).some((s) => s.marketId === marketId)) {
    avisar("Esse olheiro já faz parte do seu staff.", { type: "warn" });
    return;
  }
  const cand = SCOUT_MARKET.find((s) => s.id === marketId);
  if (!cand) return;
  CAREER.scouts = CAREER.scouts || [];
  CAREER.scouts.push({
    id: `scout_${cand.id}`, marketId: cand.id, name: cand.name, specialty: cand.specialty,
    regionScope: cand.regionScope, stars: cand.stars, evaluation: cand.evaluation, network: cand.network, monthlyCost: cand.monthlyCost, mission: null,
  });
  tela("persistCareer");
  tela("renderScoutMarketScreen");
  tela("renderScoutingScreen");
  avisar(`${cand.name} contratado!`, { type: "pos" });
}

export function releaseScout(scoutId) {
  const CAREER = carreiraAtual();
  const scout = (CAREER.scouts || []).find((s) => s.id === scoutId);
  if (!scout) return { ok: false, motivo: "olheiro-invalido" };
  if (scout.mission) return { ok: false, motivo: "em-missao", texto: "Esse olheiro está em missão — espere ele voltar antes de dispensar." };
  CAREER.scouts = CAREER.scouts.filter((s) => s.id !== scoutId);
  return { ok: true, scout };
}

export const SCOUT_GROUP_LABEL = { G: "Goleiro", D: "Defensor", M: "Meio-campo", F: "Atacante" };

export function startScoutMission(scoutId, region, { type = "sub17", group = null, duration = "media" } = {}) {
  const CAREER = carreiraAtual();
  const scout = (CAREER.scouts || []).find((s) => s.id === scoutId);
  if (!scout) return;
  if (scout.mission) { avisar("Esse olheiro já está em missão.", { type: "warn" }); return; }
  if (!scoutAllowedRegions(scout).includes(region)) { avisar("Esse olheiro não atua nessa região.", { type: "warn" }); return; }
  const dur = SCOUT_MISSION_DURATIONS[duration] || SCOUT_MISSION_DURATIONS.media;
  scout.mission = { regionUf: region, roundsLeft: dur.rounds, roundsTotal: dur.rounds, type, group, duration };
  tela("persistCareer");
  tela("renderScoutingScreen");
  const focus = [SCOUT_MISSION_TYPES[type].label, group ? SCOUT_GROUP_LABEL[group] : null].filter(Boolean).join(" · ");
  avisar(`${scout.name} partiu em missão pelo ${REGION_LABEL[region]} (${focus}) — retorna em ${dur.rounds} rodadas.`, { type: "pos" });
}

export function recruitProspectToBase(id) {
  const CAREER = carreiraAtual();
  const idx = (CAREER.scoutMissionProspects || []).findIndex((p) => p.id === id);
  if (idx === -1) return;
  const prospect = CAREER.scoutMissionProspects[idx];
  CAREER.scoutMissionProspects.splice(idx, 1);
  const player = {
    id: `scouted_${CAREER.clubId}_${Date.now()}`, name: prospect.name, photo: null,
    group: prospect.group, age: prospect.age, overall: prospect.overall, atk: prospect.atk, def: prospect.def, phys: prospect.phys, potential: prospect.potential,
    origin: "base", real: false,
    status: "ok", outUntilRound: null, yellowCards: 0, condition: 100, morale: 70,
    benchStreak: 0, moraleReason: "Neutro no clube", moraleTrend: "estavel",
    wantsTransfer: false, lastTalkRound: null,
    goalsCareer: 0, assistsCareer: 0, apps: 0,
    wage: prospect.wage, value: prospect.value, contractUntil: prospect.contractUntil,
  };
  CAREER.squad.push(player);
  tela("closeProspectSheet");
  tela("persistCareer");
  tela("renderScoutingScreen");
  avisar(`${player.name} promovido pra categoria de base!`, { type: "pos" });
}

export function acceptOffer() {
  const CAREER = carreiraAtual();
  const offer = CAREER.pendingOffer;
  if (!offer) return;
  const p = CAREER.squad.find((x) => x.id === offer.playerId);
  if (!p) { CAREER.pendingOffer = null; tela("renderMercado"); return; } // jogador já saiu do elenco por outro motivo
  CAREER.finances.cash += offer.fee;
  CAREER.squad = CAREER.squad.filter((x) => x.id !== p.id);
  CAREER.lineup.starters = CAREER.lineup.starters.map((x) => (x === p.id ? null : x));
  CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== p.id);
  (CAREER.leagueSquads[offer.clubId] = CAREER.leagueSquads[offer.clubId] || []).push(p);
  pushTransferLog(`Você vendeu ${p.name} pro ${offer.clubName} por ${fmtBRL(offer.fee)}.`, CAREER.currentRound);
  pushLedger("transferencia", `Venda — ${p.name} (${offer.clubName})`, offer.fee, CAREER.currentRound);
  avisar(`Proposta aceita — ${fmtBRL(offer.fee)} no caixa.`, { type: "pos" });
  ensureObjectivesFresh(); bumpObjective("daily", "obj_market_1_move", 1);
  CAREER.pendingOffer = null;
  tela("persistCareer");
  tela("renderMercado"); tela("renderElenco"); tela("renderEscalacao"); tela("renderCentral");
}

export function declineOffer() {
  const CAREER = carreiraAtual();
  if (!CAREER.pendingOffer) return;
  // Fase 1.5 — registra a recusa (item 11) pra maybeGenerateOffer não
  // reofertar o mesmo par jogador/clube nos próximos DECLINE_COOLDOWN_ROUNDS
  // rounds (sem isso, nada impedia a mesma proposta idêntica reaparecer
  // rodada após rodada).
  recordDecline(CAREER.pendingOffer.playerId, CAREER.pendingOffer.clubId, CAREER.currentRound);
  avisar("Proposta recusada.");
  CAREER.pendingOffer = null;
  tela("persistCareer");
  tela("renderMercado");
}
