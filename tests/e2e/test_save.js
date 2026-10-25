const { chromium } = require("playwright-core");
const { skipOnboarding } = require("./_startup");
const { check } = require("./_check");
const { playNextMatchRound } = require("./_round");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text()); });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const puts = [];
  page.on("response", async (res) => {
    if (res.url().includes("/api/career") && res.request().method() === "PUT") {
      const postData = res.request().postData() || "";
      puts.push(res.status());
      console.log("PUT /api/career ->", res.status(), "body bytes:", Buffer.byteLength(postData, "utf8"));
      if (res.status() !== 200) {
        try { console.log("RESPONSE BODY:", await res.text()); } catch {}
      }
    }
  });

  const base = "http://localhost:8787";
  const email = `savetest${Date.now()}@teste.com`;

  await page.goto(base + "/", { waitUntil: "load" });
  const signupResp = await page.evaluate(async ({ email }) => {
    const r = await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Teste Save", email, password: "senha123", phone: "11999999999", plan: "freemium" }),
    });
    return { status: r.status, body: await r.text() };
  }, { email });
  console.log("signup:", signupResp.status);

  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "senha123" }),
    });
  }, { email });

  await page.goto(base + "/carreira.html", { waitUntil: "load" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(200);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await skipOnboarding(page);
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnClaimDailyLogin", { timeout: 3000 }).catch(() => {});
  await page.waitForSelector("#panel-elenco, .m3-nav-item", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);

  // Simula várias rodadas seguidas pela interface (fluxo atual completo:
  // confirmação pré-jogo, ao vivo, detalhe, coletiva, notícias,
  // resultados, tabela — ver _round.js; amistosos/semanas sem jogo do
  // calendário são atravessados no caminho).
  const roundBefore = await page.evaluate(() => CAREER.currentRound);
  for (let i = 0; i < 30; i++) {
    const r = await playNextMatchRound(page);
    if (r.stoppedAt === "playerOfferOverlay") await page.click("#btnPlayerOfferDecline");
    else if (r.stoppedAt) throw new Error(`rodada ${i + 1} parou numa tela inesperada: ${r.stoppedAt}`);
    await page.click(".m3-nav-item[data-panel='central']").catch(() => {});
    console.log(`--- round ${i + 1} done ---`);
  }
  const roundAfter = await page.evaluate(() => CAREER.currentRound);
  await page.waitForTimeout(1200); // persistência debounced (800 ms) da última rodada
  check("1) 30 rodadas oficiais simuladas pela interface:", roundAfter - roundBefore === 30, { roundBefore, roundAfter });
  check("2) Todo save (PUT /api/career) respondeu 200:", puts.length > 0 && puts.every((s) => s === 200), { puts: puts.length, naoOk: puts.filter((s) => s !== 200) });

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
