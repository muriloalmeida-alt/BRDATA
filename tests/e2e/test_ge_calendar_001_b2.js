// GE-CALENDAR-001 (B2) — amistosos: 3 na pré-temporada (convites com
// escolha) + até 2 opcionais em julho. Motor ao vivo reaproveitado; não
// vale ponto, gol/assistência oficial nem suspensão; bilheteria pequena;
// a semana fecha sozinha depois do jogo.
const { chromium } = require("playwright-core");
const { skipOnboarding } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `gecalb2${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Amistosos Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await skipOnboarding(page);
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 6; i++) { await page.click("#btnWizardSkip", { timeout: 2500 }).catch(() => {}); await page.waitForTimeout(300); }
  await page.click("#btnClaimDailyLogin", { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  const s0 = await page.evaluate(() => ({
    slots: CAREER.calendar.friendlies.map((f) => ({ phase: CAREER.calendar.weeks[f.wi].p, invites: f.invites.length, optional: f.optional })),
    thisWeek: !!friendlySlotThisWeek(),
  }));
  check("1) Calendário nasce com 3 amistosos na pré (obrigatórios) + 2 em julho (opcionais), 3 convites cada:",
    s0.slots.filter((x) => x.phase === "pre" && !x.optional).length === 3 && s0.slots.filter((x) => x.phase === "pausa" && x.optional).length === 2 && s0.slots.every((x) => x.invites === 3) && !s0.thisWeek, s0);

  // 2) Semana seguinte da pré: convites aparecem e o botão vira "Ir para o amistoso".
  await page.click("#btnSimulate"); // avança a 1ª semana (sem amistoso)
  await page.waitForTimeout(700);
  const s2 = await page.evaluate(() => ({
    chips: document.querySelectorAll("#nextMatchBox [data-friendly-pick]").length,
    fab: document.getElementById("btnSimulate").textContent.trim(),
  }));
  check("2) Semana de amistoso mostra 3 convites e o botão 'Ir para o amistoso':", s2.chips === 3 && /Ir para o amistoso/.test(s2.fab), s2);

  // 3) Escolhe o 2º convite e joga (ao vivo, pulando pro fim).
  const before = await page.evaluate(() => ({
    pts: Object.values(CAREER.standings).reduce((a, r) => a + r.pts + r.j, 0),
    goals: CAREER.squad.reduce((a, p) => a + (p.goalsSeason || 0) + (p.goalsCareer || 0), 0),
    yellows: CAREER.squad.reduce((a, p) => a + (p.yellowCards || 0), 0),
    idx: CAREER.calendar.idx, round: CAREER.currentRound,
    pick: friendlySlotThisWeek().invites[1],
  }));
  await page.click(`#nextMatchBox [data-friendly-pick="${before.pick}"]`);
  await page.waitForTimeout(300);
  await page.click("#btnSimulate");
  await page.waitForSelector("#liveMatchOverlay.open", { timeout: 5000 });
  await page.evaluate(() => skipLiveMatch());
  await page.waitForTimeout(800);
  const after = await page.evaluate(({ idxBefore }) => {
    const slot = CAREER.calendar.friendlies.find((f) => f.wi === idxBefore);
    return {
      played: slot.played, opp: slot.opp, result: slot.result,
      pts: Object.values(CAREER.standings).reduce((a, r) => a + r.pts + r.j, 0),
      goals: CAREER.squad.reduce((a, p) => a + (p.goalsSeason || 0) + (p.goalsCareer || 0), 0),
      yellows: CAREER.squad.reduce((a, p) => a + (p.yellowCards || 0), 0),
      suspended: CAREER.squad.filter((p) => p.status === "suspenso").length,
      idx: CAREER.calendar.idx, round: CAREER.currentRound,
      ticket: (CAREER.financeLedger || []).some((l) => l.label === "Bilheteria de amistoso" && l.amount > 0),
      liveOpen: document.getElementById("liveMatchOverlay").classList.contains("open"),
    };
  }, { idxBefore: before.idx });
  check("3) Amistoso jogado contra o convite escolhido, com resultado guardado:", after.played && after.opp === before.pick && after.result && !after.liveOpen, after);
  check("3b) Não mexe na tabela, em gol/assistência oficial nem em cartão/suspensão:", after.pts === before.pts && after.goals === before.goals && after.yellows === before.yellows && after.suspended === 0, { before, after });
  check("3c) Rende bilheteria e fecha a semana sozinho (calendário avança, rodada não):", after.ticket && after.idx === before.idx + 1 && after.round === before.round, { idx: [before.idx, after.idx], round: [before.round, after.round] });

  // 4) "Pular até o próximo jogo" abre mão dos amistosos restantes da pré.
  await page.click("#btnSkipToMatch");
  await page.waitForTimeout(800);
  const s4 = await page.evaluate(() => ({
    round: CAREER.currentRound, week: calendarWeek(),
    preSlots: CAREER.calendar.friendlies.filter((f) => !f.optional).map((f) => ({ played: f.played, hasResult: !!f.result })),
  }));
  check("4) 'Pular até o próximo jogo' chega na rodada 1 e marca os amistosos pulados como não jogados (sem resultado):",
    s4.week.r === 1 && s4.preSlots.every((f) => f.played) && s4.preSlots.filter((f) => f.hasResult).length === 1, s4);

  // 5) Julho: amistoso opcional — sem aceitar convite o botão só avança a semana.
  const july = await page.evaluate(async () => {
    let guard = 0;
    while (guard++ < 80) {
      const w = calendarWeek();
      if (!w.r && friendlySlotThisWeek()) break;
      if (!w.r) { runCalendarOffWeek(); continue; }
      const sum = simulateRound();
      if (sum === "live") { skipLiveMatch(); if (LIVE_MATCH && !LIVE_MATCH.finished) await finishLiveMatch(); }
    }
    renderAll();
    const slot = friendlySlotThisWeek();
    return { phase: calendarWeek().p, optional: slot && slot.optional, fab: document.getElementById("btnSimulate").textContent.trim() };
  });
  await page.evaluate(() => { document.querySelectorAll(".ct-modal-overlay.open").forEach((el) => el.classList.remove("open")); });
  // escolha pela UI já coberta no passo 3; aqui via função (depois do
  // laço headless a Central re-renderiza seguido e o chip é recriado)
  const julyFab = await page.evaluate(() => { pickFriendlyOpponent(friendlySlotThisWeek().invites[0]); return document.getElementById("btnSimulate").textContent.trim(); });
  check("5) Em julho o amistoso é opcional: 'Avançar semana' até aceitar um convite, depois 'Ir para o amistoso':",
    july.phase === "pausa" && july.optional && /Avançar semana/.test(july.fab) && /Ir para o amistoso/.test(julyFab), { ...july, julyFab });

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
