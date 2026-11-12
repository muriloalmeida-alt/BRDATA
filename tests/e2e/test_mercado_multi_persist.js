// Confere que a gravação funciona de verdade numa carreira "multi" depois de
// jogar uma rodada inteira (não só na criação) — é aqui que o save "grande
// demais" (413) apareceria se a correção de tamanho não fosse suficiente.
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes a rodada
// pela tela antiga (#btnSimulate, #btnPreMatchGo); agora pela ponte do motor
// da v2 (jogarRodadaV2: semana, partida, pós-jogo), e o save lido do servidor.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, jogarRodadaV2, saveNoServidor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `mercadopersist${Date.now()}@teste.com`); // semana da rodada 1

  const rodada = await jogarRodadaV2(page);
  const saved = await saveNoServidor(page);
  const size = Buffer.byteLength(JSON.stringify(saved));
  check("1) Save gravado no servidor sem erro 413 depois de jogar a rodada (carreira multi):",
    rodada.ok && saved.marketScope === "multi" && saved.currentRound === 2 && size < 768 * 1024, JSON.stringify({ passos: rodada.passos, round: saved.currentRound, kb: (size / 1024).toFixed(1) }));
  console.log("   Tamanho do save depois de 1 rodada:", (size / 1024).toFixed(1), "KB (limite: 768 KB)");

  check("2) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
