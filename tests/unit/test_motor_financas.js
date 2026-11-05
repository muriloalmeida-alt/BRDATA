// Fase 12, etapa 3 (05/11): equivalência das finanças extraídas
// (public/js/motor/financas.js) com o código anterior de carreira.js.
// REF = cópia congelada antes da etapa 3, com o CAREER simulado por
// parâmetro; Math.random trocado por um gerador com semente.
// Uso: node tests/unit/test_motor_financas.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const realRandom = Math.random;
function withRandom(rng, fn) { Math.random = rng; try { return fn(); } finally { Math.random = realRandom; } }
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------------- REF (carreira.js antes da etapa 3; CAREER = C) ----------------
let C = null;
const REF = (() => {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function wageBillOf(squad) { return squad.filter((p) => p.origin === "principal" || p.origin === "loan").reduce((s, p) => s + (p.wage || 0), 0); }
  function initialFinances(squad) { const wageCap = Math.round(wageBillOf(squad) * 1.35 / 1000) * 1000; const cash = Math.round(wageCap * 6 / 1000) * 1000; return { cash, wageCap }; }
  const TECHNICAL_STAFF_WAGE_PCT = 0.05;
  function technicalStaffMonthlyCost() { return Math.round(wageBillOf(C.squad) * TECHNICAL_STAFF_WAGE_PCT / 1000) * 1000; }
  function scoutsMonthlyCost() { return (C.scouts || []).reduce((sum, s) => sum + s.monthlyCost, 0); }
  const SPONSOR_MASTER_NAMES = ["Banco Vértice", "Seguradora Ipê", "TotalBet Apostas", "ConectaTelecom", "Ouro Fino Bebidas", "Vitalis Saúde"];
  const SPONSOR_MATERIAL_NAMES = ["Aro Sports", "Fortex", "Zênite Esportes", "Rael Wear", "Lance Esportivo", "Bravo Sport"];
  const SPONSOR_BASE_VALUE = { master: 5000000, material: 2000000 };
  function sponsorshipTier() {
    const lastSeason = (C.seasonHistory || [])[0];
    let score = 40;
    if (lastSeason) {
      if (lastSeason.position <= 4) score += 35; else if (lastSeason.position <= 8) score += 20; else if (lastSeason.position <= 12) score += 5; else if (lastSeason.position >= 17) score -= 15;
      if (lastSeason.position === 1) score += 25;
    }
    if (C.cup && C.cup.championIsHuman) score += 20;
    return clamp(score, 10, 100);
  }
  function generateSponsorProposals(kind) {
    const base = SPONSOR_BASE_VALUE[kind]; const tier = sponsorshipTier(); const mult = 0.6 + (tier / 100) * 1.2;
    const names = kind === "master" ? SPONSOR_MASTER_NAMES : SPONSOR_MATERIAL_NAMES;
    const pool = [...names].sort(() => Math.random() - 0.5).slice(0, 3);
    return pool.map((empresa) => { const duracao = 2 + Math.floor(Math.random() * 2); const variance = 0.85 + Math.random() * 0.3; const valorTemporada = Math.round((base * mult * variance) / 50000) * 50000; return { empresa, valorTemporada, duracao }; });
  }
  function sponsorshipSeasonTotal() { return ["master", "material"].reduce((sum, kind) => sum + (C.sponsorship[kind] ? C.sponsorship[kind].valorTemporada : 0), 0); }
  function stadiumCapacityFor(club, rng) {
    const base = 15000 + rng() * 20000; const bonus = clamp((club.atk || 1.3) - 1, 0, 1) * 45000;
    const upgradeBonus = C && String(club.id) === String(C.clubId) ? (C.stadium?.capacityBonus || 0) : 0;
    return Math.round((base + bonus) / 1000) * 1000 + upgradeBonus;
  }
  function avgTicketPriceFor(club) { return Math.round(25 + clamp((club.atk || 1.3) - 1, 0, 1) * 65); }
  function currentAttendancePct() { const form = C.recentForm || []; if (!form.length) return 0.6; const avgPts = form.reduce((s, x) => s + x, 0) / form.length; return clamp(0.35 + (avgPts / 3) * 0.6, 0.25, 0.98); }
  function computeTicketRevenue(club, rng) { const capacity = stadiumCapacityFor(club, rng); const pct = currentAttendancePct(); const price = avgTicketPriceFor(club); const attendance = Math.round(capacity * pct); return { capacity, attendance, pct, price, revenue: attendance * price }; }
  const FINANCE_LEDGER_MAX = 60;
  function pushLedger(type, label, amount, round) { C.financeLedger = C.financeLedger || []; C.financeLedger.unshift({ round, type, label, amount }); if (C.financeLedger.length > FINANCE_LEDGER_MAX) C.financeLedger.length = FINANCE_LEDGER_MAX; }
  function applyCalendarMonthlyFinances(month) {
    const round = C.currentRound;
    const wagePaid = wageBillOf(C.squad);
    C.finances.cash -= wagePaid;
    if (wagePaid) pushLedger("salario", `Folha salarial de ${month}`, -wagePaid, round);
    if (C.technicalStaff && C.technicalStaff.hired) { const staffCost = technicalStaffMonthlyCost(); C.finances.cash -= staffCost; if (staffCost) pushLedger("salario", `Comissão Técnica (${month})`, -staffCost, round); }
    const scoutsCost = scoutsMonthlyCost();
    if (scoutsCost) { C.finances.cash -= scoutsCost; pushLedger("salario", `Olheiros (${month})`, -scoutsCost, round); }
    const sponsorIncome = Math.round(sponsorshipSeasonTotal() / 12);
    C.finances.cash += sponsorIncome;
    if (sponsorIncome) pushLedger("patrocinio", `Patrocínio de ${month}`, sponsorIncome, round);
    const tv = C.calendar.tvMonthly || 0;
    C.finances.cash += tv;
    if (tv) pushLedger("tv", `Cota de TV de ${month}`, tv, round);
    return { wagePaid, sponsorIncome: sponsorIncome + tv };
  }
  function roundFinances(round) {
    let wagePaid = Math.round(wageBillOf(C.squad) / 4);
    C.finances.cash -= wagePaid;
    if (wagePaid) pushLedger("salario", "Folha salarial do elenco", -wagePaid, round);
    if (C.technicalStaff && C.technicalStaff.hired) { const staffCost = Math.round(technicalStaffMonthlyCost() / 4); C.finances.cash -= staffCost; if (staffCost) pushLedger("salario", "Custo da Comissão Técnica", -staffCost, round); }
    const scoutsCost = Math.round(scoutsMonthlyCost() / 4);
    if (scoutsCost) { C.finances.cash -= scoutsCost; pushLedger("salario", "Salário dos olheiros", -scoutsCost, round); }
    const sponsorIncome = Math.round(sponsorshipSeasonTotal() / 38);
    C.finances.cash += sponsorIncome;
    if (sponsorIncome) pushLedger("patrocinio", "Parcela de patrocínio", sponsorIncome, round);
    return { wagePaid, sponsorIncome };
  }
  function processPendingInstallments() {
    const list = C.pendingInstallments || []; let totalDue = 0; const stillPending = [];
    list.forEach((inst) => { totalDue += inst.perRoundAmount; inst.roundsLeft -= 1; if (inst.roundsLeft > 0) stillPending.push(inst); });
    C.finances.cash -= totalDue; C.pendingInstallments = stillPending; return totalDue;
  }
  return { wageBillOf, initialFinances, technicalStaffMonthlyCost, scoutsMonthlyCost, sponsorshipTier, generateSponsorProposals, sponsorshipSeasonTotal, computeTicketRevenue, pushLedger, applyCalendarMonthlyFinances, roundFinances, processPendingInstallments };
})();

function career(seed) {
  const r = seeded(seed);
  const origins = ["principal", "principal", "principal", "loan", "base", "emprestado"];
  return {
    clubId: "fla", currentRound: 1 + Math.floor(r() * 38),
    squad: Array.from({ length: 28 }, (_, i) => ({ id: `p${i}`, origin: origins[Math.floor(r() * origins.length)], wage: r() < 0.05 ? undefined : Math.round(r() * 900000) })),
    scouts: Array.from({ length: Math.floor(r() * 3) }, () => ({ monthlyCost: Math.round(r() * 80000) })),
    technicalStaff: { hired: r() < 0.5 },
    sponsorship: { master: r() < 0.8 ? { valorTemporada: Math.round(r() * 9e6) } : null, material: r() < 0.8 ? { valorTemporada: Math.round(r() * 4e6) } : null },
    calendar: { tvMonthly: r() < 0.7 ? Math.round(r() * 3e6) : 0 },
    finances: { cash: Math.round(r() * 5e7) - 1e7 },
    seasonHistory: r() < 0.7 ? [{ position: 1 + Math.floor(r() * 20) }] : [],
    cup: { championIsHuman: r() < 0.2 },
    recentForm: Array.from({ length: Math.floor(r() * 6) }, () => [0, 1, 3][Math.floor(r() * 3)]),
    stadium: r() < 0.5 ? { capacityBonus: 3000 } : undefined,
    financeLedger: Array.from({ length: Math.floor(r() * 62) }, (_, i) => ({ round: i, type: "x", label: `l${i}`, amount: i })),
    pendingInstallments: Array.from({ length: Math.floor(r() * 4) }, () => ({ perRoundAmount: Math.round(r() * 1e6), roundsLeft: 1 + Math.floor(r() * 4) })),
  };
}
const SEEDS = Array.from({ length: 300 }, (_, i) => 77 + i * 15485863);

(async () => {
  const F = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "financas.js")).href);
  // Aplica lançamentos do motor como o carreira.js passa a fazer.
  const apply = (c, entries, round) => entries.forEach((e) => { c.finances.cash += e.amount; c.financeLedger = F.addLedgerEntry(c.financeLedger, { round, type: e.type, label: e.label, amount: e.amount }); });

  await check("Folha, orçamento inicial, comissão e olheiros iguais (300 elencos, com salário faltando)", () => {
    for (const s of SEEDS) {
      C = career(s);
      assert.strictEqual(F.wageBill(C.squad), REF.wageBillOf(C.squad));
      assert.deepStrictEqual(F.initialFinances(C.squad), REF.initialFinances(C.squad));
      assert.strictEqual(F.staffMonthlyCost(C.squad), REF.technicalStaffMonthlyCost());
      assert.strictEqual(F.scoutsMonthlyCost(C.scouts), REF.scoutsMonthlyCost());
    }
  });

  await check("Patrocínio: nível, propostas (mesmo embaralhamento) e total da temporada iguais", () => {
    for (const s of SEEDS) {
      C = career(s);
      const tier = F.sponsorshipTier(C.seasonHistory[0], C.cup.championIsHuman);
      assert.strictEqual(tier, REF.sponsorshipTier());
      for (const kind of ["master", "material"]) assert.deepStrictEqual(F.sponsorProposals(kind, tier, seeded(s + 1)), withRandom(seeded(s + 1), () => REF.generateSponsorProposals(kind)));
      assert.strictEqual(F.sponsorshipSeasonTotal(C.sponsorship), REF.sponsorshipSeasonTotal());
    }
  });

  await check("Bilheteria (capacidade com obra, preço, público pela fase, renda) igual", () => {
    for (const s of SEEDS) {
      C = career(s);
      const r = seeded(s);
      const club = { id: s % 2 ? "fla" : "pal", atk: 0.7 + r() * 1.4 };
      const bonus = String(club.id) === String(C.clubId) ? (C.stadium?.capacityBonus || 0) : 0;
      assert.deepStrictEqual(F.ticketRevenue(club, seeded(s + 2), bonus, C.recentForm), REF.computeTicketRevenue(club, seeded(s + 2)));
    }
  });

  await check("Mês do calendário: mesmo caixa, mesmo extrato (textos, ordem, limite de 60) e mesmos totais", () => {
    for (const s of SEEDS) {
      C = career(s); const b = clone(C);
      const ref = REF.applyCalendarMonthlyFinances("março");
      const m = F.monthEntries({ squad: b.squad, staffHired: !!(b.technicalStaff && b.technicalStaff.hired), scouts: b.scouts, sponsorship: b.sponsorship, tvMonthly: b.calendar.tvMonthly, month: "março" });
      apply(b, m.entries, b.currentRound);
      assert.deepStrictEqual({ cash: b.finances.cash, ledger: b.financeLedger }, { cash: C.finances.cash, ledger: C.financeLedger });
      assert.deepStrictEqual({ wagePaid: m.wagePaid, sponsorIncome: m.income }, ref);
    }
  });

  await check("Rodada sem calendário (1/4 do mês, 1/38 do patrocínio): mesmo caixa e extrato", () => {
    for (const s of SEEDS) {
      C = career(s); const b = clone(C);
      const ref = REF.roundFinances(7);
      const m = F.roundEntries({ squad: b.squad, staffHired: !!(b.technicalStaff && b.technicalStaff.hired), scouts: b.scouts, sponsorship: b.sponsorship });
      apply(b, m.entries, 7);
      assert.deepStrictEqual({ cash: b.finances.cash, ledger: b.financeLedger }, { cash: C.finances.cash, ledger: C.financeLedger });
      assert.deepStrictEqual({ wagePaid: m.wagePaid, sponsorIncome: m.sponsorIncome }, ref);
    }
  });

  await check("Parcelas: mesmo total e mesmas pendentes; a lista recebida não é alterada", () => {
    for (const s of SEEDS) {
      C = career(s); const before = clone(C.pendingInstallments);
      const res = F.settleInstallments(before);
      const total = REF.processPendingInstallments();
      assert.strictEqual(res.total, total);
      assert.deepStrictEqual(res.remaining, C.pendingInstallments);
      assert.deepStrictEqual(before, career(s).pendingInstallments);
    }
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
