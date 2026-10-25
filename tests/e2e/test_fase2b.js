const { chromium } = require("playwright-core");
const { skipOnboarding } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");
const { playRound, playNextMatchRound } = require("./_round");
const { check } = require("./_check");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  const base = "http://localhost:8787";
  const email = `fase2b${Date.now()}@teste.com`;

  await page.goto(base + "/", { waitUntil: "load" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Fase Dois B", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
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
  await page.waitForTimeout(500);

  // Card Financeiro na Central
  await page.screenshot({ path: "f2b-1-central-financeiro.png" });

  // Modal de detalhe do jogador com salário/contrato/valor
  await page.click(".m3-nav-item[data-panel='elenco']");
  await page.waitForTimeout(300);
  await page.click("#squadMainList [data-id]");
  await page.waitForSelector("#detailOverlay.open");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "f2b-2-detalhe-jogador.png" });

  // Confere valores calculados no console
  const info = await page.evaluate(async () => {
    const r = await fetch("/api/career");
    const data = await r.json();
    const p = data.career.squad[0];
    return {
      wage: p.wage, value: p.value, contractUntil: p.contractUntil,
      finances: data.career.finances,
    };
  });
  console.log("Jogador de exemplo:", JSON.stringify(info));

  // Tenta promover um jogador de base (pra ver bloqueio de teto, se aplicável)
  await page.click("#detailClose");
  await page.waitForTimeout(200);
  const baseRow = await page.$("#squadBaseList [data-id]");
  if (baseRow) {
    await baseRow.click();
    await page.waitForTimeout(200);
    const promoteBtn = await page.$('[data-act="promote"]');
    const disabled = promoteBtn ? await promoteBtn.evaluate((b) => b.disabled) : null;
    console.log("Botão promover desabilitado (base):", disabled);
    await page.screenshot({ path: "f2b-3-detalhe-base.png" });
  }

  // Simula uma rodada e confere modal de resultados com "Salários pagos"
  await page.click("#detailClose").catch(() => {});
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);
  await skipPreseason(page); // GE-CALENDAR-001: carreira nova começa na pré-temporada
  // Fluxo atual da rodada (ver _round.js) — o screenshot é tirado nos Resultados.
  let sawResults = false;
  await playNextMatchRound(page, {
    onRoundResults: async (p) => { sawResults = true; await p.screenshot({ path: "f2b-4-round-results-financeiro.png" }); },
  });
  check("1) A rodada simulada chega nos Resultados da rodada:", sawResults);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
