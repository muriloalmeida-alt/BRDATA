// Bilheteria com a forma recente forçada (5 vitórias seguidas, pelo save):
// o jogo em casa continua gerando a renda de bilheteria.
// Lote L2 do plano "testes sem a tela antiga": as rodadas passam pela
// ponte do motor da v2; a verificação olha o extrato do save. Antes, o
// detalhe da partida da tela antiga.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, base } = require("./_v2_carreira");
const { primeiraBilheteria } = require("./_bilheteria_v2");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `ticketform${Date.now()}@teste.com`);
  // Força forma recente artificialmente (5 vitórias seguidas) via API,
  // testando o efeito no público sem depender do resultado aleatório.
  await page.evaluate(async () => {
    const data = await (await fetch("/api/career", { cache: "no-store" })).json();
    data.career.recentForm = [0, 0, 0, 0, 0]; // 5 vitórias
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.career) });
  });
  // Recarrega: o motor carrega o save com a forma forçada.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const b = await primeiraBilheteria(page);
  check("1) Com a forma recente forçada, jogo em casa gera a renda de bilheteria:", !!b && !b.foraComBilheteria && b.lancamentos.length === 1 && b.lancamentos[0].amount > 0, JSON.stringify(b));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
