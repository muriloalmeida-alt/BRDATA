#!/usr/bin/env node
/* Carreira 2.0 — captura de TODAS as telas da v2 numa mesma carreira, para o
   comparativo final com as pranchas (docs/carreira-v2/COMPARATIVO_FINAL.md).
   Uso: node tools/capture/capture-v2-todas.js <baseUrl> <saída> [w×h]
   Cria conta e carreira (Flamengo, Série A), pula a pré-temporada, joga 2
   rodadas pela versão atual e fotografa as telas de gestão; depois joga a
   3ª rodada pela v2 e fotografa o bloco da partida. */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { passCareerSetup, enterGame } = require("../../tests/e2e/_startup");
const { skipPreseason } = require("../../tests/e2e/_calendar_skip");
const { playRound, closeLeftoverTabela } = require("../../tests/e2e/_round");

const base = process.argv[2] || "http://localhost:8791";
const out = process.argv[3] || "/tmp/v2todas";
const [W, H] = (process.argv[4] || "390x844").split("x").map(Number);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const email = `v2todas_${Date.now()}@teste.com`;
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
  await skipPreseason(page);
  const declineOffer = () => page.evaluate(() => { const o = document.getElementById("playerOfferOverlay"); if (o && o.classList.contains("open")) document.getElementById("btnPlayerOfferDecline").click(); });
  for (let i = 0; i < 2; i++) { await closeLeftoverTabela(page); await declineOffer(); await page.waitForTimeout(150); await playRound(page); }
  await declineOffer(); await closeLeftoverTabela(page);
  await page.evaluate(() => { CAREER.lineup.formation = "4-3-3"; return persistCareer(); });
  await page.waitForTimeout(400);
  const striker = await page.evaluate(() => CAREER.lineup.starters.map((id) => CAREER.squad.find((p) => p.id === id)).find((p) => p && p.group === "F").id);
  await page.close();

  const p = await ctx.newPage();
  const shot = async (name) => { await p.waitForTimeout(450); await p.screenshot({ path: path.join(out, `${name}.png`) }); console.log("ok", name); };
  const go = async (url, sel) => { await p.goto(base + url, { waitUntil: "domcontentloaded" }); await p.waitForSelector(sel, { timeout: 20000 }); };

  await go("/carreira/", ".home"); await shot("01-inicio");
  await go("/carreira/escalacao", ".lu-pitch"); await shot("02-escalacao");
  await p.locator(".lu-slot").nth(5).click(); await p.waitForSelector(".qs-opt");
  await p.locator(".qs-opt", { hasText: "No banco" }).first().click(); await p.evaluate(() => window.scrollTo(0, 0)); await shot("03-quem-entra");
  await go("/carreira/pre-jogo", ".pm-pitch"); await shot("04-pre-jogo");
  await go("/carreira/tabela", ".tb-table"); await shot("05-tabela");
  await go("/carreira/calendario", ".cal-list"); await shot("06-calendario");
  await go("/carreira/elenco", ".sq-row"); await shot("07-elenco");
  await go("/carreira/elenco/jogador?id=" + encodeURIComponent(striker), ".pf-hero"); await shot("08-perfil");
  await go("/carreira/diretoria", ".bd-list"); await shot("09-diretoria");
  await go("/carreira/financas", ".fn-cash"); await shot("10-financas");

  // Bloco da partida (3ª rodada, pela v2)
  await go("/carreira/pre-jogo", ".pm-cta");
  await p.click(".pm-cta");
  await p.waitForSelector(".mt-score", { timeout: 40000 });
  await p.waitForFunction(() => document.querySelector(".mt-last-row") && /^(15|30)/.test(document.querySelector(".mt-min")?.textContent || ""), null, { timeout: 40000 }).catch(() => {});
  await p.screenshot({ path: path.join(out, "11-partida.png") }); console.log("ok", "11-partida"); // rodando (botão Pausar)
  await p.click(".mt-actions .mt-secondary"); await p.waitForSelector(".pz-title"); await shot("12-pausa");
  await p.click(".pz-row[href$='tela=time']"); await p.waitForSelector(".pm-pitch"); await shot("13-revisar-time");
  await p.goBack(); await p.waitForSelector(".pz-title");
  await p.click(".pz-row[href$='tela=sai']"); await p.waitForSelector(".sb-list"); await shot("14-quem-sai");
  await p.locator(".sb-list .sb-opt").nth(9).click(); await p.waitForSelector(".sb-pair");
  await p.locator(".sb-bench .sb-opt").nth(2).click(); await p.evaluate(() => window.scrollTo(0, 0)); await shot("15-substituicao");
  await p.click(".sb-foot .cta"); await p.waitForSelector(".pz-title");
  await p.click(".pz-row[href$='tela=tatica']"); await p.waitForSelector(".tk-forms"); await shot("16-ajustar-tatica");
  await p.click(".sb-foot .btn-secondary"); await p.waitForSelector(".pz-title");
  await p.click(".pz-row[href$='tela=lances']"); await p.waitForSelector(".ev-list"); await shot("17-lances");
  await p.click(".pz-foot .cta"); await p.waitForSelector(".pz-title");
  await p.click(".pz-foot .mt-primary"); await p.waitForSelector(".mt-score");
  await p.waitForSelector(".pz-title", { timeout: 40000 }); await shot("18-intervalo");
  await p.click(".pz-foot .mt-primary"); await p.waitForSelector(".mt-score");
  await p.click(".mt-skip");
  await p.waitForSelector(".rs-title", { timeout: 30000 });
  await p.waitForFunction(() => !document.querySelector(".pz-foot .cta").disabled, null, { timeout: 20000 });
  await shot("19-resultado");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
