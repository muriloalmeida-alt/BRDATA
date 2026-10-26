const { chromium } = require("playwright-core");
const { enterGame } = require("./_startup");
const { check } = require("./_check");
const { playNextMatchRound, closeLeftoverTabela } = require("./_round");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  const base = "http://localhost:8787";
  const email = `eventstest${Date.now()}@teste.com`;

  await page.goto(base + "/", { waitUntil: "load" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Teste Eventos", email, password: "senha123", phone: "11999999999", plan: "freemium" }),
    });
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
  await enterGame(page);
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);

  // 10 jogos oficiais pela interface (fluxo atual completo, ver
  // _round.js); em cada um, o detalhe "Seu jogo" é lido antes de seguir.
  const matches = [];
  for (let i = 0; i < 10; i++) {
    const r = await playNextMatchRound(page, {
      onMatchDetail: async (p) => {
        const info = await p.evaluate(() => ({
          score: document.getElementById("matchDetailScore").textContent.replace(/\s+/g, " ").trim(),
          events: document.getElementById("matchDetailEvents").textContent.replace(/\s+/g, " ").trim(),
        }));
        matches.push(info);
        console.log(`round ${i + 1}:`, info.score, "|", info.events);
        if (i === 0 || info.events.includes("Gol do")) await p.screenshot({ path: `events-round${i + 1}.png` });
      },
    });
    if (r.stoppedAt === "playerOfferOverlay") { await page.click("#btnPlayerOfferDecline"); await closeLeftoverTabela(page); }
    else if (r.stoppedAt) throw new Error(`jogo ${i + 1} parou numa tela inesperada: ${r.stoppedAt}`);
    await page.click(".m3-nav-item[data-panel='central']").catch(() => {});
  }
  check("1) Os 10 jogos mostraram o detalhe 'Seu jogo' com placar:", matches.length === 10 && matches.every((m) => /\d+\D+\d+/.test(m.score)), matches.map((m) => m.score));
  // Jogo com gol tem que listar eventos (o detalhe lista gol/cartão).
  const goalsOf = (score) => (score.match(/\d+/g) || []).slice(0, 2).reduce((a, n) => a + Number(n), 0);
  const withGoals = matches.filter((m) => goalsOf(m.score) > 0);
  check("2) Todo jogo com gol lista eventos no detalhe:", withGoals.every((m) => m.events.length > 0), { jogosComGol: withGoals.length, semEventos: withGoals.filter((m) => !m.events.length).map((m) => m.score) });

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
