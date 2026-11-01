#!/usr/bin/env node
/* Carreira 2.0 — captura real da Escalação e do "Quem entra?" da v2.
   Uso: node tools/capture/capture-v2-escalacao.js <baseUrl> <saída> [w×h,...]
   Cria conta e carreira (Flamengo, Série A) pela tela atual, pula a
   pré-temporada e fotografa: escalação, seletor de formação e "Quem
   entra?" com um reserva do meio-campo selecionado (sem confirmar). */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { passCareerSetup, enterGame } = require("../../tests/e2e/_startup");
const { skipPreseason } = require("../../tests/e2e/_calendar_skip");

const base = process.argv[2] || "http://localhost:8791";
const out = process.argv[3] || "/tmp/v2";
const sizes = (process.argv[4] || "390x844,360x780,430x932").split(",").map((s) => s.split("x").map(Number));
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const email = `v2esc_${Date.now()}@teste.com`;
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
  await skipPreseason(page);
  // Mesma formação da referência (4-3-3), pela própria tela atual.
  await page.evaluate(() => { CAREER.lineup.formation = "4-3-3"; return persistCareer(); });
  await page.close();

  for (const [w, h] of sizes) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto(base + "/carreira-v2/escalacao", { waitUntil: "networkidle" });
    await p.waitForSelector(".lu-pitch", { timeout: 15000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, `escalacao-${w}x${h}.png`) });
    await p.screenshot({ path: path.join(out, `escalacao-full-${w}x${h}.png`), fullPage: true });
    await p.click(".lu-form-btn");
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `formacao-${w}x${h}.png`) });
    await p.keyboard.press("Escape");
    // Um meia titular (3ª camisa da linha do meio) → Quem entra?
    await p.locator(".lu-slot").nth(5).click();
    await p.waitForSelector(".qs-opt", { timeout: 10000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `quem-entra-${w}x${h}.png`) });
    const benchMid = p.locator(".qs-opt", { hasText: "Meio-campo · No banco" }).first();
    await benchMid.click();
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, `quem-entra-sel-${w}x${h}.png`) });
    await p.screenshot({ path: path.join(out, `quem-entra-sel-full-${w}x${h}.png`), fullPage: true });
    await p.close();
    console.log("ok", `${w}x${h}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
