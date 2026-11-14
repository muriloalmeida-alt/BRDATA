// GE-CALENDAR-001 (B1) — calendário real jan–dez. Cobre: carreira nova
// nasce na pré-temporada com janela aberta; "Avançar até o próximo jogo"
// chega na semana da rodada 1 com a janela fechada; 3 temporadas
// inteiras seguidas sem quebra (38 rodadas cada, 12 meses de folha por
// temporada completa, janela abrindo/fechando por fase, volume da IA de
// mercado comparável ao modelo antigo); carreira antiga (sem
// calendário) segue em rodadas e ganha o calendário na virada.
// Lote L4c (sem a tela antiga): pelo motor na página da v2. As semanas sem
// jogo são o mesmo runCalendarOffWeek de antes; o jogo da semana, no lugar
// do simulateRound da tela antiga, é a ponte (jogarPartidaDaRodada, os
// passos do Pré-jogo/Partida/pós-jogo da v2). Os botões da tela antiga
// viraram o CTA do Início da v2 ("Avançar semana" / "Preparar partida").
const { chromium } = require("playwright-core");
const { carreiraV2, signup, ensureDailyClaimed, globaisDoMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `gecal001${Date.now()}@teste.com`, { clube: "fla", preTemporada: true, criarConta: signup });
  await ensureDailyClaimed(page);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };
  const ctaDoInicio = async () => {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".home-main .cta", { timeout: 30000 });
    const t = await page.evaluate(() => document.querySelector(".home-main .cta").textContent.trim());
    await globaisDoMotor(page);
    return t;
  };

  // 1) Carreira nova na pré-temporada.
  const cta1 = await ctaDoInicio();
  const s1 = await page.evaluate(() => ({ phase: calendarWeek().p, win: transferWindowStatus(CAREER.currentRound), tv: CAREER.calendar.tvMonthly }));
  check("1) Carreira nova começa na pré-temporada, janela aberta, Início com 'Avançar semana':", s1.phase === "pre" && s1.win.open && cta1 === "Avançar semana" && s1.tv > 0, { ...s1, cta1 });

  // Contadores de folha mensal e de chamadas da IA de mercado. O estado
  // (lançamentos já vistos e as chamadas da pré-temporada) é guardado aqui
  // antes de "Avançar até o próximo jogo" e reinstalado depois de abrir o
  // Início (que recarrega a página).
  const antes = await page.evaluate(() => {
    let ai = 0;
    let i = CAREER.calendar.idx;
    while (CAREER.calendar.weeks[i] && !CAREER.calendar.weeks[i].r) {
      if (CALENDAR_WINDOW_PHASES.has(CAREER.calendar.weeks[i].p) && i % 2 === 0) ai++;
      i++;
    }
    return { ai, vistos: (CAREER.financeLedger || []).map((e) => JSON.stringify(e)) };
  });

  // 2) "Avançar até o próximo jogo" (a ponte da Semana da v2).
  const avancou = await page.evaluate(async () => (await import("/js/motor/v2.js")).criarPonte().avancarSemana(true));
  const cta2 = await ctaDoInicio();
  const s2 = await page.evaluate(() => ({ week: calendarWeek(), round: CAREER.currentRound, win: transferWindowStatus(CAREER.currentRound).open, trainingKey: CAREER.trainingAppliedForRound }));
  check("2) 'Avançar até o próximo jogo' chega na semana da rodada 1, janela fechada, Início com 'Preparar partida':",
    avancou.ok && s2.week.r === 1 && s2.round === 1 && !s2.win && cta2 === "Preparar partida" && /w\d+/.test(String(s2.trainingKey)), { ...s2, cta2 });

  await page.evaluate((antes) => {
    window.__cnt = { monthly: 0, ai: antes.ai };
    // Os que já existiam antes de recarregar (pelo conteúdo, uma vez só);
    // daqui em diante, pelo próprio lançamento (objeto), como no teste
    // antigo: a folha de um mês pode repetir o conteúdo do ano anterior.
    const jaEram = new Set(antes.vistos);
    const vistos = new Set((CAREER.financeLedger || []).filter((e) => jaEram.has(JSON.stringify(e))));
    window.__contarMeses = () => {
      (CAREER.financeLedger || []).forEach((e) => {
        if (vistos.has(e)) return;
        vistos.add(e);
        if (/^Folha salarial de /.test(e.label)) window.__cnt.monthly++;
      });
    };
    window.__contarIa = () => {
      const w = calendarWeek();
      if (!transferWindowStatus(CAREER.currentRound).open) return;
      if (w && w.r) window.__cnt.ai++;
      else if (w && CAREER.calendar.idx % 2 === 0) window.__cnt.ai++;
    };
  }, antes);

  // 3) 3 temporadas seguidas.
  // As temporadas correm sem rede (modo offline real desde a OFFLINE-001): o
  // save grava só no aparelho, sem mandar a cópia de ~600 KB ao servidor a
  // cada gravação — o teste mede o calendário, não a cópia. Sob carga no CI,
  // com a cópia, o teste passava do limite da classe longa.
  await page.context().setOffline(true);
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
          window.__contarIa();
          if (!w.r) { runCalendarOffWeek(); window.__contarMeses(); offWeeks++; continue; }
          const j = await jogarPartidaDaRodada();
          if (!j.ok) { errors.push(j.passos.join(" ")); break; }
          window.__contarMeses();
          roundsPlayed++;
        } catch (e) { errors.push(String(e && e.message || e)); break; }
      }
      window.__contarMeses();
      const monthlyCharges = count.monthly, aiCalls = count.ai;
      count.monthly = 0; count.ai = 0;
      const year = CAREER.seasonYear;
      CAREER.negativeSeasonsStreak = -99; // o teste mede o calendário, não a diretoria
      const r = await advanceSeason(); // já cobra o janeiro da próxima (conta pra ela)
      window.__contarMeses();
      out.push({ year, roundsPlayed, offWeeks, monthlyCharges, aiCalls, windowOpenWeeks, errors, dismissed: r && r.dismissed, newPhase: calendarWeek().p, newYear: CAREER.calendar.year });
    }
    return out;
  });
  seasons.forEach((x, i) => console.log(`   temporada ${i + 1}:`, JSON.stringify(x)));
  check("3) 3 temporadas seguidas sem erro, 38 rodadas cada:", seasons.every((x) => !x.errors.length && x.roundsPlayed === 38 && !x.dismissed));
  check("3b) Temporadas completas (2ª e 3ª) cobram 12 meses de folha; a 1ª (começa em fev) cobra 10 (mar–dez):", seasons[0].monthlyCharges === 10 && seasons[1].monthlyCharges === 12 && seasons[2].monthlyCharges === 12, seasons.map((x) => x.monthlyCharges));
  check("3c) Virada leva pra janeiro (férias) do ano seguinte:", seasons.every((x) => x.newPhase === "ferias" && x.newYear === x.year + 1));
  check("3d) IA de mercado roda em ~6–7 semanas por temporada completa (modelo antigo: 6 rodadas):", seasons.slice(1).every((x) => x.aiCalls >= 5 && x.aiCalls <= 8), seasons.map((x) => x.aiCalls));

  // 4) Carreira sem calendário (save antigo).
  const legacy = await page.evaluate(async () => {
    delete CAREER.calendar;
    const winRound1 = transferWindowStatus(1).open, winRound10 = transferWindowStatus(10).open;
    let guard = 0;
    const errors = [];
    while (CAREER.currentRound <= 38 && guard++ < 60) {
      const j = await jogarPartidaDaRodada();
      if (!j.ok) { errors.push(j.passos.join(" ")); break; }
    }
    const legacyWageEntries = CAREER.financeLedger.filter((l) => l.label === "Folha salarial do elenco").length;
    CAREER.negativeSeasonsStreak = -99;
    await advanceSeason();
    return { winRound1, winRound10, legacyWageEntries, errors, hasCalendar: calendarOn(), phase: calendarOn() && calendarWeek().p };
  });
  await page.context().setOffline(false);
  check("4) Carreira sem calendário segue no modelo de rodadas (janela 1–3, folha por rodada) e ganha calendário na virada:", legacy.winRound1 && !legacy.winRound10 && legacy.legacyWageEntries > 0 && !legacy.errors.length && legacy.hasCalendar && legacy.phase === "ferias", legacy);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
