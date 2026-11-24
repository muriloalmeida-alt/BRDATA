/* ===================================================================
   MOTOR — FINANÇAS (Fase 12, etapa 3 do plano de independência, 05/11)
   -------------------------------------------------------------------
   Regras de dinheiro da Carreira, extraídas de carreira.js sem mudar
   nenhuma: folha salarial, orçamento inicial, custo da comissão e dos
   olheiros, patrocínio (nível, propostas, total da temporada), bilheteria
   (capacidade, preço, público, renda), parcelas a pagar/receber e o
   extrato. Nada aqui lê CAREER, DOM ou save.

   Forma (decisão de 05/11): o motor calcula e DEVOLVE os lançamentos
   ({ type, label, amount }) — o carreira.js só aplica no caixa e no
   extrato. Os textos do extrato são os mesmos de antes.

   Sorteio: recebe o gerador (`rng`). As propostas de patrocínio mantêm o
   embaralhamento de antes (sort com comparador aleatório, que não é
   uniforme) — decisão de 05/11: nenhuma regra muda nesta etapa; corrigir
   é ponto de balanceamento, numa entrega própria.
=================================================================== */

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------- Folha e custos ----------
// "loan" conta igual "principal": você paga o salário (reduzido) de quem
// pega emprestado.
export function wageBill(squad) {
  return (squad || []).filter((p) => p.origin === "principal" || p.origin === "loan").reduce((s, p) => s + (p.wage || 0), 0);
}
// Orçamento de uma carreira nova: teto 35% acima da folha; caixa de ~6 meses.
export function initialFinances(squad) {
  const wageCap = Math.round(wageBill(squad) * 1.35 / 1000) * 1000;
  const cash = Math.round(wageCap * 6 / 1000) * 1000;
  return { cash, wageCap };
}
// TETO-CAIXA (15/11): o técnico aumenta o teto salarial (mensal) com
// dinheiro do caixa. Cada R$ 1 a mais no teto custa R$ 12 do caixa (um ano de
// salário). Devolver só vale para o que ele mesmo aumentou na temporada
// (`bought`) e sem o teto ficar abaixo da folha; volta os mesmos 12×, sem
// lucro. O caixa não pode ficar abaixo de 1 mês de folha. Valores em passos
// de R$ 1 mil.
export const WAGE_CAP_CASH_MULT = 12;
export const WAGE_CAP_STEP = 1000;
const stepDown = (v) => Math.max(0, Math.floor(v / WAGE_CAP_STEP) * WAGE_CAP_STEP);
// Quanto dá para aumentar e devolver agora.
export function wageCapTradeLimits({ wageCap, bill, cash, bought }) {
  return {
    maxUp: stepDown((cash - bill) / WAGE_CAP_CASH_MULT),
    maxDown: stepDown(Math.min(bought || 0, wageCap - bill)),
  };
}
// delta > 0 aumenta, delta < 0 devolve. Devolve o estado novo ou o motivo.
export function wageCapTrade({ wageCap, bill, cash, bought }, delta) {
  bought = bought || 0;
  if (!Number.isFinite(delta) || delta === 0 || delta % WAGE_CAP_STEP !== 0) return { ok: false, motivo: "valor" };
  const lim = wageCapTradeLimits({ wageCap, bill, cash, bought });
  if (delta > 0 && delta > lim.maxUp) return { ok: false, motivo: "caixa", ...lim };
  if (delta < 0 && -delta > (bought || 0)) return { ok: false, motivo: "reservado", ...lim };
  if (delta < 0 && wageCap + delta < bill) return { ok: false, motivo: "folha", ...lim };
  const movimento = -delta * WAGE_CAP_CASH_MULT;
  return { ok: true, wageCap: wageCap + delta, cash: cash + movimento, bought: bought + delta, movimento };
}
// Comissão técnica: 5% da folha por mês, arredondado ao milhar.
export const STAFF_WAGE_PCT = 0.05;
export function staffMonthlyCost(squad) {
  return Math.round(wageBill(squad) * STAFF_WAGE_PCT / 1000) * 1000;
}
// Olheiros: soma do custo mensal de cada um.
export function scoutsMonthlyCost(scouts) {
  return (scouts || []).reduce((sum, s) => sum + s.monthlyCost, 0);
}

// ---------- Patrocínio ----------
export const SPONSOR_MASTER_NAMES = ["Banco Vértice", "Seguradora Ipê", "TotalBet Apostas", "ConectaTelecom", "Ouro Fino Bebidas", "Vitalis Saúde"];
export const SPONSOR_MATERIAL_NAMES = ["Aro Sports", "Fortex", "Zênite Esportes", "Rael Wear", "Lance Esportivo", "Bravo Sport"];
export const SPONSOR_BASE_VALUE = { master: 5000000, material: 2000000 };
// Nível (10–100) pelo desempenho: posição da última temporada encerrada
// e título do Brasileirão ou da Copa.
export function sponsorshipTier(lastSeason, cupChampion) {
  let score = 40; // base neutra (sem histórico ainda)
  if (lastSeason) {
    if (lastSeason.position <= 4) score += 35;
    else if (lastSeason.position <= 8) score += 20;
    else if (lastSeason.position <= 12) score += 5;
    else if (lastSeason.position >= 17) score -= 15;
    if (lastSeason.position === 1) score += 25;
  }
  if (cupChampion) score += 20;
  return clamp(score, 10, 100);
}
// 3 propostas: empresa, valor por temporada e duração (2 ou 3 temporadas).
export function sponsorProposals(kind, tier, rng) {
  const base = SPONSOR_BASE_VALUE[kind];
  const mult = 0.6 + (tier / 100) * 1.2;
  const names = kind === "master" ? SPONSOR_MASTER_NAMES : SPONSOR_MATERIAL_NAMES;
  const pool = [...names].sort(() => rng() - 0.5).slice(0, 3);
  return pool.map((empresa) => {
    const duracao = 2 + Math.floor(rng() * 2);
    const variance = 0.85 + rng() * 0.3;
    const valorTemporada = Math.round((base * mult * variance) / 50000) * 50000;
    return { empresa, valorTemporada, duracao };
  });
}
export function sponsorshipSeasonTotal(sponsorship) {
  return ["master", "material"].reduce((sum, kind) => sum + (sponsorship && sponsorship[kind] ? sponsorship[kind].valorTemporada : 0), 0);
}

// ---------- Bilheteria ----------
// Capacidade estimada pela força do clube, com sorteio fixo por clube
// (`rng` = seededRngFromKey(`stadium:${id}`)), mais as obras concluídas.
export function stadiumCapacity(club, rng, upgradeBonus = 0) {
  // MUNDO-001 (M7): clube do mundo com a capacidade do estádio no pacote.
  const real = club && club.venue && club.venue.capacity;
  if (real > 0) return Math.round(real / 1000) * 1000 + upgradeBonus;
  const base = 15000 + rng() * 20000;
  const bonus = clamp((club.atk || 1.3) - 1, 0, 1) * 45000;
  return Math.round((base + bonus) / 1000) * 1000 + upgradeBonus;
}
export function avgTicketPrice(club) {
  return Math.round(25 + clamp((club.atk || 1.3) - 1, 0, 1) * 65);
}
// Ocupação pela fase: média de pontos dos últimos jogos (0 a 3).
export function attendancePct(recentForm) {
  const form = recentForm || [];
  if (!form.length) return 0.6;
  const avgPts = form.reduce((s, x) => s + x, 0) / form.length;
  return clamp(0.35 + (avgPts / 3) * 0.6, 0.25, 0.98);
}
export function ticketRevenue(club, rng, upgradeBonus, recentForm) {
  const capacity = stadiumCapacity(club, rng, upgradeBonus);
  const pct = attendancePct(recentForm);
  const price = avgTicketPrice(club);
  const attendance = Math.round(capacity * pct);
  return { capacity, attendance, pct, price, revenue: attendance * price };
}

// ---------- Lançamentos do período ----------
// Mês do calendário: folha, comissão (se contratada), olheiros,
// patrocínio (total da temporada / 12) e cota de TV. Só entram os
// lançamentos diferentes de zero (os de valor zero não mexiam no caixa
// nem no extrato). wagePaid e income: totais para o resumo da semana.
export function monthEntries({ squad, staffHired, scouts, sponsorship, tvMonthly, month }) {
  const entries = [];
  const wagePaid = wageBill(squad);
  if (wagePaid) entries.push({ type: "salario", label: `Folha salarial de ${month}`, amount: -wagePaid });
  if (staffHired) {
    const staffCost = staffMonthlyCost(squad);
    if (staffCost) entries.push({ type: "salario", label: `Comissão Técnica (${month})`, amount: -staffCost });
  }
  const scoutsCost = scoutsMonthlyCost(scouts);
  if (scoutsCost) entries.push({ type: "salario", label: `Olheiros (${month})`, amount: -scoutsCost });
  const sponsorIncome = Math.round(sponsorshipSeasonTotal(sponsorship) / 12);
  if (sponsorIncome) entries.push({ type: "patrocinio", label: `Patrocínio de ${month}`, amount: sponsorIncome });
  const tv = tvMonthly || 0;
  if (tv) entries.push({ type: "tv", label: `Cota de TV de ${month}`, amount: tv });
  return { entries, wagePaid, income: sponsorIncome + tv };
}
// Rodada no modelo sem calendário (carreira antiga): 1/4 do mês de folha,
// comissão e olheiros, e 1/38 do patrocínio da temporada.
export function roundEntries({ squad, staffHired, scouts, sponsorship }) {
  const entries = [];
  const wagePaid = Math.round(wageBill(squad) / 4);
  if (wagePaid) entries.push({ type: "salario", label: "Folha salarial do elenco", amount: -wagePaid });
  if (staffHired) {
    const staffCost = Math.round(staffMonthlyCost(squad) / 4);
    if (staffCost) entries.push({ type: "salario", label: "Custo da Comissão Técnica", amount: -staffCost });
  }
  const scoutsCost = Math.round(scoutsMonthlyCost(scouts) / 4);
  if (scoutsCost) entries.push({ type: "salario", label: "Salário dos olheiros", amount: -scoutsCost });
  const sponsorIncome = Math.round(sponsorshipSeasonTotal(sponsorship) / 38);
  if (sponsorIncome) entries.push({ type: "patrocinio", label: "Parcela de patrocínio", amount: sponsorIncome });
  return { entries, wagePaid, sponsorIncome };
}
// Parcelas (a pagar ou a receber): soma o valor do período e devolve as
// que continuam (com roundsLeft já descontado). Não altera a lista recebida.
export function settleInstallments(list) {
  let total = 0;
  const remaining = [];
  (list || []).forEach((inst) => {
    total += inst.perRoundAmount;
    const next = { ...inst, roundsLeft: inst.roundsLeft - 1 };
    if (next.roundsLeft > 0) remaining.push(next);
  });
  return { total, remaining };
}

// ---------- Extrato ----------
export const LEDGER_MAX = 60;
// Novo extrato com o lançamento no topo (mais recente primeiro), até LEDGER_MAX.
export function addLedgerEntry(ledger, entry, max = LEDGER_MAX) {
  const out = [entry, ...(ledger || [])];
  if (out.length > max) out.length = max;
  return out;
}
