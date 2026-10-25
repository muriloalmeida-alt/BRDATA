// GE-CALENDAR-001 (B3) — tela Calendário (menu e data do topo), data no
// topo do Início e aviso de rodízio na confirmação pré-jogo de semana
// de 2 jogos (Copa na quarta).
const { chromium } = require("playwright-core");
const { skipOnboarding } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `gecalb3${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Calendario B3", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
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
  await page.waitForTimeout(3500);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  const pill = await page.evaluate(() => document.getElementById("roundPill").textContent);
  check("1) Topo do Início mostra a data da semana (pré-temporada):", /^Semana de \d{2}\/fev$/.test(pill), pill);

  await page.click("#roundPill");
  await page.waitForTimeout(500);
  const cal = await page.evaluate(() => ({
    open: document.getElementById("calendarOverlay").classList.contains("open"),
    weeks: document.querySelectorAll("#calendarList .mt-cal-week").length,
    total: CAREER.calendar.weeks.length,
    months: document.querySelectorAll("#calendarList .mt-cal-month").length,
    now: !!document.getElementById("calendarNowRow"),
    friendlies: [...document.querySelectorAll("#calendarList .mt-cal-week")].filter((r) => /Amistoso/.test(r.textContent)).length,
    cupWeeks: [...document.querySelectorAll("#calendarList .mt-cal-week")].filter((r) => /Copa do Brasil na quarta/.test(r.textContent)).length,
    round1: [...document.querySelectorAll("#calendarList .mt-cal-week")].some((r) => /1ª rodada/.test(r.textContent)),
  }));
  await page.screenshot({ path: "screens/calendario_b3.png" });
  check("2) Tocar na data abre o Calendário: todas as semanas do ano em 12 meses, semana atual destacada, 5 amistosos, 12 semanas de Copa, rodadas listadas:",
    cal.open && cal.weeks === cal.total && cal.months === 12 && cal.now && cal.friendlies === 5 && cal.cupWeeks === 12 && cal.round1, cal);
  await page.click("#btnCalendarCloseFooter");
  await page.waitForTimeout(200);

  // 3) Semana de Copa: confirmação pré-jogo avisa sobre rodízio.
  const rot = await page.evaluate(async () => {
    let guard = 0;
    while (guard++ < 40 && !(calendarWeek().r && calendarWeek().c)) {
      const w = calendarWeek();
      if (!w.r) { const f = friendlySlotThisWeek(); if (f) f.played = true; runCalendarOffWeek(); continue; }
      const sum = simulateRound();
      if (sum === "live") { skipLiveMatch(); if (LIVE_MATCH && !LIVE_MATCH.finished) await finishLiveMatch(); }
    }
    document.querySelectorAll(".ct-modal-overlay.open").forEach((el) => el.classList.remove("open"));
    renderAll();
    openPreMatchConfirm();
    const el = document.getElementById("preMatchRotation");
    return { round: CAREER.currentRound, cup: !!calendarWeek().c, visible: !el.classList.contains("hidden"), text: el.textContent, pill: document.getElementById("roundPill").textContent };
  });
  check("3) Semana de 2 jogos: confirmação pré-jogo mostra o aviso de rodízio; topo mostra 'Dom dd/mmm · Nª rodada':",
    rot.cup && rot.visible && /Semana de 2 jogos/.test(rot.text) && /^Dom \d{2}\/\w{3} · \d+ª rodada$/.test(rot.pill), rot);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
