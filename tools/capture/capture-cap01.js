#!/usr/bin/env node
/* Capturas reais do Capítulo 1 (splash → dashboard) em vários viewports.
   Uso: node tools/capture/capture-cap01.js <baseUrl> <saída> [w×h,...]
   Ex.: node tools/capture/capture-cap01.js http://localhost:8791 /tmp/cap01 390x844,430x932,360x780,1280x800
   Cada viewport usa uma conta nova (signup pela API) — dados reais do jogo. */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const base = process.argv[2] || "http://localhost:8791";
const out = process.argv[3] || "/tmp/cap01";
const sizes = (process.argv[4] || "390x844,430x932").split(",").map((s) => s.split("x").map(Number));
fs.mkdirSync(out, { recursive: true });

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, name + ".png") });
  console.log("ok", name);
}

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of sizes) {
    const tag = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));

    // T01 — splash: segura /api/auth/me pra fotografar o carregamento.
    let release;
    const hold = new Promise((r) => { release = r; });
    await page.route("**/api/auth/me", async (route) => { await hold; await route.continue().catch(() => {}); });
    await page.goto(base + "/carreira.html", { waitUntil: "load" });
    await shot(page, `t01-splash-${tag}`);
    release();

    // T02 — login (sem sessão) + erro de validação
    await page.waitForSelector("#screenLoginRequired:not(.hidden)");
    await shot(page, `t02-login-${tag}`);
    await page.click("#screenLoginRequired button[type=submit]");
    await shot(page, `t02-login-erro-${tag}`);

    const email = `cap01_${tag}_${Date.now()}@teste.com`;
    await page.evaluate(async (email) => {
      await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    }, email);
    await page.fill("#ctLoginEmail", email);
    await page.fill("#ctLoginPassword", "senha123");
    await page.click("#btnTogglePassword");
    await shot(page, `t02-login-preenchido-${tag}`);
    await page.click("#screenLoginRequired button[type=submit]");

    // T03 — competição
    await page.waitForSelector("#screenCompetitionPicker:not(.hidden)");
    await shot(page, `t03-competicao-${tag}`);
    await page.click('.mt-competition-card[data-competition="brasileirao"]');

    // T04 — clube
    await page.waitForSelector(".m3-club-row", { timeout: 20000 });
    await shot(page, `t04-clube-${tag}`);
    await page.click('.m3-club-row[data-id="fla"]');
    await page.click('.m3-club-row[data-id="pal"] .bd-fav');
    await shot(page, `t04-clube-selecionado-${tag}`);
    await page.fill("#clubSearch", "porto");
    await shot(page, `t04-clube-busca-${tag}`);
    await page.fill("#clubSearch", "");
    await page.click('.m3-club-row[data-id="fla"]');
    await page.click("#btnConfirmClub");

    // T05 — configurar carreira
    await page.waitForSelector("#screenSetup:not(.hidden)");
    await page.selectOption("#setupNationality", "BR");
    await shot(page, `t05-onboarding-${tag}`);
    await page.click("#btnStartCareer");

    // T06 — primeira entrada
    await page.waitForSelector("#screenFirstEntry:not(.hidden)", { timeout: 30000 });
    await shot(page, `t06-primeira-entrada-${tag}`);
    await page.click("#btnFirstEntryGo");

    // T07 — dashboard (fecha tutorial/assistente/login diário)
    await page.waitForSelector("#screenGame:not(.hidden)");
    for (let i = 0; i < 12; i++) {
      if (await page.locator("#onboardingOverlay.open").count()) await page.click("#btnOnboardSkip");
      else if (await page.locator("#startupWizardOverlay.open").count()) await page.click("#btnWizardSkip");
      else if (await page.locator("#dailyLoginOverlay.open").count()) await page.click("#btnClaimDailyLogin");
      else break;
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(800);
    await shot(page, `t07-dashboard-${tag}`);
    await page.screenshot({ path: path.join(out, `t07-dashboard-full-${tag}.png`), fullPage: true });
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
