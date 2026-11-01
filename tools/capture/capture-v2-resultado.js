#!/usr/bin/env node
/* Carreira 2.0 — captura real do Resultado e do pós-jogo da v2 (A4).
   Uso: node tools/capture/capture-v2-resultado.js <baseUrl> <saída> [rodadas] [w×h,...]
   Cria conta, cria carreira (Flamengo, Série A) pela tela atual, joga N
   rodadas pela interface (mesmo caminho dos testes E2E) e fotografa
   Pré-jogo → Iniciar partida (v2) → Pular para o fim → Resultado, Ver
   lances, Ver tabela, Continuar (sequência da versão atual) → Início. */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { passCareerSetup, enterGame } = require("../../tests/e2e/_startup");
const { skipPreseason } = require("../../tests/e2e/_calendar_skip");
const { playRound, closeLeftoverTabela } = require("../../tests/e2e/_round");

const base = process.argv[2] || "http://localhost:8791";
const out = process.argv[3] || "/tmp/v2";
const ROUNDS = Number(process.argv[4] || 3);
const sizes = (process.argv[5] || "390x844,360x780,430x932").split(",").map((s) => s.split("x").map(Number));
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const email = `v2_${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async (email) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, email);
  await page.goto(base + "/carreira", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await page.evaluate(() => persistCareer());

  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  await page.close();
  for (const [w, h] of sizes) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    const shot = (n) => p.screenshot({ path: path.join(out, `${n}-${w}x${h}.png`) });
    await p.goto(base + "/carreira-v2/pre-jogo", { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".pm-cta", { timeout: 20000 });
    await p.click(".pm-cta");
    await p.waitForSelector(".mt-score", { timeout: 40000 });
    await p.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 30000 });
    await p.click(".mt-skip");
    await p.waitForSelector(".rs-title", { timeout: 30000 });
    await p.waitForFunction(() => !document.querySelector(".pz-foot .cta").disabled, null, { timeout: 20000 });
    await p.waitForTimeout(400); await shot("resultado");
    await p.screenshot({ path: path.join(out, `resultado-full-${w}x${h}.png`), fullPage: true });
    await p.click(".rs-links a[href$='tela=lances']"); await p.waitForSelector(".ev-list"); await p.waitForTimeout(200); await shot("resultado-lances");
    await p.click(".pz-foot .cta"); await p.waitForSelector(".rs-title");
    await p.click(".rs-links a[href$='tela=tabela']"); await p.waitForSelector(".tb-table"); await p.waitForTimeout(300); await shot("resultado-tabela");
    await p.click(".tb-foot .cta"); await p.waitForSelector(".rs-title");
    await p.click(".pz-foot .cta"); // Continuar
    await p.waitForTimeout(1500); await shot("posjogo-versao-atual");
    const frame = p.frames().find((f) => f.url().includes("ponte=partida"));
    for (let k = 0; k < 40; k++) {
      if (await p.locator(".home").count()) break;
      await frame.evaluate(() => {
        const vis = (id) => { const el = document.getElementById(id); return el && el.offsetParent !== null; };
        const press = document.querySelector("#pressOverlay.open [data-press]"); if (press) { press.click(); return; }
        for (const id of ["btnMatchDetailContinue", "btnNewsContinue", "btnRoundResultsContinue", "btnPlayerOfferDecline", "tabelaModalClose", "btnLiveSkip"]) if (vis(id)) { document.getElementById(id).click(); return; }
      }).catch(() => {});
      await p.waitForTimeout(500);
    }
    await p.waitForSelector(".home", { timeout: 20000 });
    await p.waitForTimeout(400); await shot("inicio-depois");
    await p.close();
    console.log("ok", `${w}x${h}`);
    break;
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
