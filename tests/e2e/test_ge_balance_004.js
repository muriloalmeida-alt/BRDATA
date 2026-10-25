// GE-BALANCE-004 (issue #39) — virada de temporada real (advanceSeason)
// numa carreira multi-divisão: promovidos chegam abaixo da média da
// divisão nova, rebaixados acima, e a força nova persiste no save.
const { skipPreseason } = require("./_calendar_skip");
const { chromium } = require("playwright-core");
const { skipOnboarding } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `geb004${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Balance 004", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
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
  await skipPreseason(page);
  let ok = true;
  const check = (label, cond, extra) => { console.log(label, !!cond, extra !== undefined ? JSON.stringify(extra) : ""); ok = ok && !!cond; };

  const res = await page.evaluate(async () => {
    let guard = 0;
    while (CAREER.currentRound <= 38 && guard++ < 120) {
      const w = calendarWeek();
      if (w && !w.r) { const f = friendlySlotThisWeek(); if (f) f.played = true; runCalendarOffWeek(); continue; }
      const sum = simulateRound();
      if (sum === "live") { skipLiveMatch(); if (LIVE_MATCH && !LIVE_MATCH.finished) await finishLiveMatch(); }
    }
    const top4B = sortedDivisionRows("serie_b").slice(0, 4).map((r) => String(r.id));
    const scaleBBefore = divisionStrengthScale(CAREER.divisionTeams.serie_b);
    CAREER.negativeSeasonsStreak = -99;
    const r = await advanceSeason();
    const pr = r.promotionRelegation;
    const ids = (list) => list.map((t) => String(t.id));
    const A = CAREER.divisionTeams.brasileirao, B = CAREER.divisionTeams.serie_b;
    const stayA = A.filter((t) => !ids(pr.promotedB).includes(String(t.id)));
    const stayB = B.filter((t) => !ids(pr.relegatedA).includes(String(t.id)) && !ids(pr.promotedC).includes(String(t.id)));
    const sA = divisionStrengthScale(stayA), sB = divisionStrengthScale(stayB);
    const promoted = A.filter((t) => ids(pr.promotedB).includes(String(t.id)));
    const relegated = B.filter((t) => ids(pr.relegatedA).includes(String(t.id)));
    const zOf = (t, s) => ((t.atk - s.meanAtk) / s.sdAtk - (t.def - s.meanDef) / s.sdDef) / 2; // + = mais forte
    return {
      top4Match: ids(pr.promotedB).every((id) => top4B.includes(id)),
      promotedZ: promoted.map((t) => +zOf(t, sA).toFixed(2)),
      relegatedZ: relegated.map((t) => +zOf(t, sB).toFixed(2)),
      savedAtk: promoted.map((t) => t.atk),
    };
  });
  check("1) Promovidos à A são os 4 primeiros da B:", res.top4Match, res);
  // média do grupo (um clube dominante pode, legitimamente, chegar perto da média)
  const avgZ = (arr) => arr.reduce((a, v) => a + v, 0) / arr.length;
  check("2) Promovidos chegam, em média, ABAIXO da média da Série A (força combinada em desvios < 0):", res.promotedZ.length === 4 && avgZ(res.promotedZ) < 0, res.promotedZ);
  check("3) Rebaixados chegam, em média, ACIMA da média da Série B (força combinada em desvios > 0):", res.relegatedZ.length === 4 && avgZ(res.relegatedZ) > 0, res.relegatedZ);

  // 4) Persistência: recarrega e confere que a força nova veio do save.
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const reloaded = await page.evaluate((saved) => {
    const promotedNow = CAREER.divisionTeams.brasileirao.filter((t) => saved.includes(t.atk));
    return promotedNow.length;
  }, res.savedAtk);
  check("4) Força reposicionada persiste no save (recarregado):", reloaded === 4, reloaded);

  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.log("FATAL:", e.message); process.exit(1); });
