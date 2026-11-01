#!/usr/bin/env node
/* Carreira 2.0 — captura real do Pré-jogo da v2.
   Uso: node tools/capture/capture-v2-prejogo.js <baseUrl> <saída> [w×h,...]
   Cria conta e carreira (Flamengo, Série A) pela tela atual, pula a
   pré-temporada e fotografa o Pré-jogo: sem avisos e com um titular
   lesionado (aviso no estilo do Início). */
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
  const email = `v2pre_${Date.now()}@teste.com`;
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

  const shoot = async (label) => {
    for (const [w, h] of sizes) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: w, height: h });
      await p.goto(base + "/carreira-v2/pre-jogo", { waitUntil: "networkidle" });
      await p.waitForSelector(".pm-pitch", { timeout: 15000 });
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(out, `${label}-${w}x${h}.png`) });
      await p.screenshot({ path: path.join(out, `${label}-full-${w}x${h}.png`), fullPage: true });
      await p.close();
      console.log("ok", label, `${w}x${h}`);
    }
  };
  await shoot("pre-jogo");
  const api = await ctx.newPage();
  await api.goto(base + "/", { waitUntil: "domcontentloaded" });
  await api.evaluate(async () => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    const p = c.squad.find((x) => x.id === c.lineup.starters[1]);
    p.status = "contundido"; p.outUntilRound = c.currentRound + 2;
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  });
  await api.close();
  await shoot("pre-jogo-aviso");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
