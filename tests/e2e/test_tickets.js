const { chromium } = require("playwright-core");
const { enterGame } = require("./_startup");
const { check } = require("./_check");
const { playNextMatchRound } = require("./_round");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  const base = "http://localhost:8787";
  const email = `tickets${Date.now()}@teste.com`;

  await page.goto(base + "/", { waitUntil: "load" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Tickets Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });

  await page.goto(base + "/carreira.html", { waitUntil: "load" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(200);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await enterGame(page);
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);

  let sawHomeGame = false;
  // Até 8 jogos oficiais pela interface (fluxo atual, ver _round.js),
  // parando no primeiro em casa (o detalhe "Seu jogo" mostra a bilheteria).
  for (let i = 0; i < 8 && !sawHomeGame; i++) {
    const r = await playNextMatchRound(page, {
      onMatchDetail: async (p) => {
        const ticketsText = await p.evaluate(() => document.getElementById("matchDetailTickets").textContent);
        if (ticketsText) {
          sawHomeGame = true;
          console.log(`Rodada ${i + 1} (casa):`, ticketsText);
          await p.screenshot({ path: "tickets-home-game.png" });
        }
      },
    });
    if (r.stoppedAt === "playerOfferOverlay") await page.click("#btnPlayerOfferDecline");
    else if (r.stoppedAt) throw new Error(`jogo ${i + 1} parou numa tela inesperada: ${r.stoppedAt}`);
    await page.click(".m3-nav-item[data-panel='central']").catch(() => {});
  }
  const finalCash = await page.evaluate(async () => (await (await fetch("/api/career")).json()).career.finances.cash);
  const recentForm = await page.evaluate(async () => (await (await fetch("/api/career")).json()).career.recentForm);
  check("1) Jogo em casa mostra a receita de bilheteria no detalhe:", sawHomeGame);
  console.log("Caixa final:", finalCash);
  console.log("Forma recente:", JSON.stringify(recentForm));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
