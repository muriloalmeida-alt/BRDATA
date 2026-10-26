const { chromium } = require("playwright-core");
const { enterGame, waitForBoot } = require("./_startup");
const { check } = require("./_check");
const { playNextMatchRound } = require("./_round");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const base = "http://localhost:8787";
  const email = `ticketform${Date.now()}@teste.com`;

  await page.goto(base + "/", { waitUntil: "load" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ticket Form", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });

  await page.goto(base + "/carreira.html", { waitUntil: "load" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(200);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await enterGame(page);

  // Força forma recente artificialmente (5 vitórias seguidas) via API,
  // testando o efeito no público sem depender do resultado aleatório.
  await page.evaluate(async () => {
    const r = await fetch("/api/career");
    const data = await r.json();
    data.career.recentForm = [0, 0, 0, 0, 0]; // 5 vitórias
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.career) });
  });
  await page.reload({ waitUntil: "load" });
  await waitForBoot(page);

  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);

  let found = false;
  for (let i = 0; i < 8 && !found; i++) {
    const r = await playNextMatchRound(page, {
      onMatchDetail: async (p) => {
        const text = await p.evaluate(() => document.getElementById("matchDetailTickets").textContent);
        if (text) { found = true; console.log("Com a forma recente forçada:", text); }
      },
    });
    if (r.stoppedAt === "playerOfferOverlay") await page.click("#btnPlayerOfferDecline");
    else if (r.stoppedAt) throw new Error(`jogo ${i + 1} parou numa tela inesperada: ${r.stoppedAt}`);
    await page.click(".m3-nav-item[data-panel='central']").catch(() => {});
  }
  check("1) Com a forma recente forçada, jogo em casa mostra a bilheteria:", found);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
