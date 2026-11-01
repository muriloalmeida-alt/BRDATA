#!/usr/bin/env node
/* Carreira 2.0 — captura real do Elenco e do Perfil do jogador da v2.
   Uso: node tools/capture/capture-v2-elenco.js <baseUrl> <saída> [rodadas] [w×h,...]
   Cria conta, cria carreira (Flamengo, Série A) pela tela atual, joga N
   rodadas pela interface (mesmo caminho dos testes E2E) e fotografa
   /carreira-v2/elenco e o perfil de um atacante titular, depois de N
   rodadas (situações reais: titular, reserva, lesões). */
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
  const declineOffer = () => page.evaluate(() => { const o = document.getElementById("playerOfferOverlay"); if (o && o.classList.contains("open")) document.getElementById("btnPlayerOfferDecline").click(); });
  for (let i = 0; i < ROUNDS; i++) { await closeLeftoverTabela(page); await declineOffer(); await page.waitForTimeout(150); await playRound(page); }
  await declineOffer();
  await closeLeftoverTabela(page);
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(500);
  const striker = await page.evaluate(() => CAREER.lineup.starters.map((id) => CAREER.squad.find((p) => p.id === id)).find((p) => p && p.group === "F").id);
  for (const [w, h] of sizes) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto(base + "/carreira-v2/elenco", { waitUntil: "networkidle" });
    await p.waitForSelector(".sq-row", { timeout: 15000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, `elenco-${w}x${h}.png`) });
    await p.screenshot({ path: path.join(out, `elenco-full-${w}x${h}.png`), fullPage: true });
    await p.goto(base + "/carreira-v2/elenco/jogador?id=" + encodeURIComponent(striker), { waitUntil: "networkidle" });
    await p.waitForSelector(".pf-hero", { timeout: 15000 });
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(out, `perfil-${w}x${h}.png`) });
    await p.screenshot({ path: path.join(out, `perfil-full-${w}x${h}.png`), fullPage: true });
    await p.close();
    console.log("ok", `${w}x${h}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
