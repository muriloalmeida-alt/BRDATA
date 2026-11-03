#!/usr/bin/env node
/* Carreira 2.0 — captura real dos ajustes durante a partida da v2 (A3).
   Uso: node tools/capture/capture-v2-ajustes.js <baseUrl> <saída> [rodadas] [w×h,...]
   Cria conta, cria carreira (Flamengo, Série A) pela tela atual, joga N
   rodadas pela interface (mesmo caminho dos testes E2E) e fotografa
   /carreira/partida?iniciar=1: Pausa → Substituir (quem sai, Sai ⇄ Entra),
   Ajustar tática e Lances da partida. */
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
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
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
    await p.goto(base + "/carreira/partida?iniciar=1", { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".mt-score", { timeout: 40000 });
    await p.waitForFunction(() => /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 30000 });
    await p.click(".mt-actions .mt-primary");
    await p.waitForSelector(".pz-title", { timeout: 10000 });
    await p.waitForTimeout(300); await shot("pausa");
    await p.click(".pz-row[href$='tela=sai']");
    await p.waitForSelector(".sb-list", { timeout: 10000 });
    await p.waitForTimeout(200); await shot("sub-quem-sai");
    await p.locator(".sb-list .sb-opt").nth(9).click();
    await p.waitForSelector(".sb-pair", { timeout: 10000 });
    await p.waitForTimeout(200); await shot("sub-entra-vazio");
    await p.locator(".sb-bench .sb-opt").nth(2).click();
    await p.waitForTimeout(200); await shot("sub-entra");
    await p.screenshot({ path: path.join(out, `sub-entra-full-${w}x${h}.png`), fullPage: true });
    await p.click(".sb-foot .cta");
    await p.waitForSelector(".pz-title", { timeout: 10000 });
    await p.click(".pz-row[href$='tela=tatica']");
    await p.waitForSelector(".tk-forms", { timeout: 10000 });
    await p.waitForTimeout(200); await shot("tatica");
    await p.locator(".tk-form", { hasText: "4-4-2" }).first().click();
    await p.locator(".tk-seg").nth(1).locator(".tk-step").nth(4).click();
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, `tatica-alterada-full-${w}x${h}.png`), fullPage: true });
    await p.click(".sb-foot .cta");
    await p.waitForSelector(".pz-title", { timeout: 10000 });
    await p.click(".pz-row[href$='tela=lances']");
    await p.waitForSelector(".ev-list", { timeout: 10000 });
    await p.waitForTimeout(200); await shot("lances");
    await p.click(".pz-foot .cta");
    await p.waitForSelector(".pz-title", { timeout: 10000 });
    await p.waitForTimeout(200); await shot("pausa-depois");
    await p.click(".pz-foot .mt-primary");
    await p.waitForSelector(".mt-score", { timeout: 10000 });
    await p.click(".mt-skip");
    await p.waitForFunction(() => document.querySelector(".mt-period")?.textContent === "Encerrado", null, { timeout: 30000 });
    await p.waitForTimeout(800); await shot("encerrada");
    await p.close();
    console.log("ok", `${w}x${h}`);
    break;
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
