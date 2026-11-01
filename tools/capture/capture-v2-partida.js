#!/usr/bin/env node
/* Carreira 2.0 — captura real da Partida ao vivo da v2 (ponte com a versão atual).
   Uso: node tools/capture/capture-v2-partida.js <baseUrl> <saída> [rodadas] [w×h,...]
   Cria conta, cria carreira (Flamengo, Série A) pela tela atual, joga N
   rodadas pela interface (mesmo caminho dos testes E2E) e fotografa
   /carreira-v2/partida?iniciar=1 na 1ª rodada: rodando, intervalo (Pausa
   abre sozinha), Revisar time, Pausa no 2º tempo e encerrada (depois de "Pular para o fim"). */
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
    await p.goto(base + "/carreira-v2/partida?iniciar=1", { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".mt-score", { timeout: 40000 });
    // rodando: espera o 1º lance importante (ou 30')
    await p.waitForFunction(() => document.querySelector(".mt-last-row") || /^(30|45)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 30000 }).catch(() => {});
    await p.screenshot({ path: path.join(out, `partida-rodando-${w}x${h}.png`) });
    // intervalo: a Pausa abre sozinha (A2)
    await p.waitForSelector(".pz-title", { timeout: 40000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `pausa-intervalo-${w}x${h}.png`) });
    await p.click(".pz-row[href$='tela=time']");
    await p.waitForSelector(".pm-pitch", { timeout: 10000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `revisar-time-${w}x${h}.png`) });
    await p.screenshot({ path: path.join(out, `revisar-time-full-${w}x${h}.png`), fullPage: true });
    await p.goBack();
    await p.waitForSelector(".pz-title", { timeout: 10000 });
    await p.click(".pz-foot .mt-primary"); // Começar 2º tempo
    await p.waitForSelector(".mt-score", { timeout: 10000 });
    await p.waitForFunction(() => /^(60|75)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 30000 });
    await p.click(".mt-actions .mt-primary"); // Pausar → Pausa
    await p.waitForSelector(".pz-title", { timeout: 10000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `pausa-${w}x${h}.png`) });
    await p.click(".pz-foot .mt-primary"); // Retomar partida
    await p.waitForSelector(".mt-score", { timeout: 10000 });
    await p.click(".mt-skip");
    await p.waitForFunction(() => document.querySelector(".mt-period")?.textContent === "Encerrado", null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, `partida-encerrada-${w}x${h}.png`) });
    await p.close();
    console.log("ok", `${w}x${h}`);
    break; // a partida consome a rodada: uma largura por carreira
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
