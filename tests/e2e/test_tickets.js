// Bilheteria: o primeiro jogo em casa gera a renda de bilheteria (no caixa
// e no extrato, "Renda de bilheteria (jogo em casa)"), e jogo fora não gera.
// Lote L2 do plano "testes sem a tela antiga": as rodadas passam pela
// ponte do motor da v2; a verificação olha o extrato do save (que a v2
// mostra em Finanças → Extrato, filtro Bilheteria). Antes, o detalhe da
// partida da tela antiga.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, saveNoServidor } = require("./_v2_carreira");
const { primeiraBilheteria } = require("./_bilheteria_v2");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `tickets${Date.now()}@teste.com`);
  const b = await primeiraBilheteria(page);
  const saved = await saveNoServidor(page);
  const noServidor = b && (saved.financeLedger || []).some((t) => t.type === "bilheteria" && t.round === b.r && t.amount > 0);
  check("1) Jogo em casa gera a renda de bilheteria (extrato do save, gravado no servidor); jogo fora não gera:",
    !!b && !b.foraComBilheteria && b.lancamentos.length === 1 && b.lancamentos[0].amount > 0 && noServidor, JSON.stringify(b));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
