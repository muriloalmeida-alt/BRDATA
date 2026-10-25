// GE-CALENDAR-001 (B1) — calendário real jan–dez. Cobre: carreira nova
// nasce na pré-temporada com janela aberta; "Pular até o próximo jogo"
// chega na semana da rodada 1 com a janela fechada; 3 temporadas
// inteiras seguidas sem quebra (38 rodadas cada, 12 meses de folha por
// temporada completa, janela abrindo/fechando por fase, volume da IA de
// mercado comparável ao modelo antigo); carreira antiga (sem
// calendário) segue em rodadas e ganha o calendário na virada.
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `gecal001${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Calendario Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await page.click("#btnOnboardSkip", { timeout: 2000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  for (let i = 0; i < 6; i++) { await page.click("#btnWizardSkip", { timeout: 2500 }).catch(() => {}); await page.waitForTimeout(300); }
  await page.click("#btnClaimDailyLogin", { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  // 1) Carreira nova: pré-temporada, janela aberta, FAB "Avançar semana".
  const s1 = await page.evaluate(() => ({
    phase: calendarWeek().p, win: transferWindowStatus(CAREER.currentRound),
    fab: document.getElementById("btnSimulate").textContent.trim(),
    skipVisible: !document.getElementById("btnSkipToMatch").classList.contains("hidden"),
    tv: CAREER.calendar.tvMonthly,
  }));
  check("1) Carreira nova começa na pré-temporada, janela aberta, botão 'Avançar semana':", s1.phase === "pre" && s1.win.open && /Avançar semana/.test(s1.fab) && s1.skipVisible && s1.tv > 0, s1);

  // Contadores instalados ANTES de qualquer avanço (o pulo do passo 2 já
  // cruza a virada de fevereiro pra março).
  await page.evaluate(() => {
    window.__cnt = { monthly: 0, ai: 0 };
    const origMonthly = applyCalendarMonthlyFinances;
    applyCalendarMonthlyFinances = (m) => { window.__cnt.monthly++; return origMonthly(m); };
    const origAi = simulateAiTransfers;
    simulateAiTransfers = (r) => { window.__cnt.ai++; return origAi(r); };
  });

  // 2) Pular até o próximo jogo (clique real).
  await page.click("#btnSkipToMatch");
  await page.waitForTimeout(800);
  const s2 = await page.evaluate(() => ({
    week: calendarWeek(), round: CAREER.currentRound, win: transferWindowStatus(CAREER.currentRound).open,
    fab: document.getElementById("btnSimulate").textContent.trim(),
    trainingKey: CAREER.trainingAppliedForRound,
  }));
  check("2) 'Pular até o próximo jogo' chega na semana da rodada 1, janela fechada, botão 'Ir para o jogo':", s2.week.r === 1 && s2.round === 1 && !s2.win && /Ir para o jogo/.test(s2.fab) && /w\d+/.test(String(s2.trainingKey)), s2);

  // 3) 3 temporadas inteiras, headless (partida ao vivo encerrada na hora).
  const seasons = await page.evaluate(async () => {
    const count = window.__cnt;
    const out = [];
    for (let season = 0; season < 3; season++) {
      let guard = 0, windowOpenWeeks = 0, roundsPlayed = 0, offWeeks = 0;
      const errors = [];
      while (CAREER.currentRound <= 38 && guard++ < 120) {
        try {
          const w = calendarWeek();
          if (transferWindowStatus(CAREER.currentRound).open) windowOpenWeeks++;
          if (!w.r) { runCalendarOffWeek(); offWeeks++; continue; }
          const sum = simulateRound();
          if (sum === "live") { skipLiveMatch(); if (LIVE_MATCH && !LIVE_MATCH.finished) await finishLiveMatch(); }
          roundsPlayed++;
        } catch (e) { errors.push(String(e && e.message || e)); break; }
      }
      // meses cobrados NESTA temporada (inclui o janeiro cobrado na
      // virada anterior) e chamadas da IA de mercado
      const monthlyCharges = count.monthly, aiCalls = count.ai;
      count.monthly = 0; count.ai = 0;
      const year = CAREER.seasonYear;
      CAREER.negativeSeasonsStreak = -99; // o teste mede o calendário, não a diretoria
      const r = await advanceSeason(); // já cobra o janeiro da próxima (conta pra ela)
      out.push({ year, roundsPlayed, offWeeks, monthlyCharges, aiCalls, windowOpenWeeks, errors, dismissed: r && r.dismissed, newPhase: calendarWeek().p, newYear: CAREER.calendar.year });
    }
    return out;
  });
  seasons.forEach((x, i) => console.log(`   temporada ${i + 1}:`, JSON.stringify(x)));
  check("3) 3 temporadas seguidas sem erro, 38 rodadas cada:", seasons.every((x) => !x.errors.length && x.roundsPlayed === 38 && !x.dismissed));
  check("3b) Temporadas completas (2ª e 3ª) cobram 12 meses de folha; a 1ª (começa em fev) cobra 10 (mar–dez):", seasons[0].monthlyCharges === 10 && seasons[1].monthlyCharges === 12 && seasons[2].monthlyCharges === 12, seasons.map((x) => x.monthlyCharges));
  check("3c) Virada leva pra janeiro (férias) do ano seguinte:", seasons.every((x) => x.newPhase === "ferias" && x.newYear === x.year + 1));
  check("3d) IA de mercado roda em ~6–7 semanas por temporada completa (modelo antigo: 6 rodadas):", seasons.slice(1).every((x) => x.aiCalls >= 5 && x.aiCalls <= 8), seasons.map((x) => x.aiCalls));

  // 4) Carreira antiga (sem calendário) segue em rodadas e ganha o
  // calendário na virada.
  const legacy = await page.evaluate(async () => {
    delete CAREER.calendar;
    const winRound1 = transferWindowStatus(1).open, winRound10 = transferWindowStatus(10).open;
    let guard = 0;
    while (CAREER.currentRound <= 38 && guard++ < 60) {
      const sum = simulateRound();
      if (sum === "live") { skipLiveMatch(); if (LIVE_MATCH && !LIVE_MATCH.finished) await finishLiveMatch(); }
    }
    const legacyWageEntries = CAREER.financeLedger.filter((l) => l.label === "Folha salarial do elenco").length;
    CAREER.negativeSeasonsStreak = -99;
    await advanceSeason();
    return { winRound1, winRound10, legacyWageEntries, hasCalendar: calendarOn(), phase: calendarOn() && calendarWeek().p };
  });
  check("4) Carreira sem calendário segue no modelo de rodadas (janela 1–3, folha por rodada) e ganha calendário na virada:", legacy.winRound1 && !legacy.winRound10 && legacy.legacyWageEntries > 0 && legacy.hasCalendar && legacy.phase === "ferias", legacy);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
