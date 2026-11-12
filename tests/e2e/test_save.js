// Persistência ao longo de muitas rodadas: 30 rodadas oficiais seguidas e
// todo save (PUT /api/career) responde 200 (o save não estoura o limite do
// servidor nem falha no caminho).
// Lote L2 do plano "testes sem a tela antiga": as rodadas agora passam
// pela ponte do motor da v2 (semana, partida e pós-jogo, como as telas da
// v2 fazem); antes, pela tela antiga.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, jogarRodadaV2 } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text()); });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const puts = [];
  page.on("response", async (res) => {
    if (res.url().includes("/api/career") && res.request().method() === "PUT") {
      puts.push(res.status());
      if (res.status() !== 200) { try { console.log("PUT /api/career ->", res.status(), await res.text()); } catch {} }
    }
  });
  await carreiraV2(page, `savetest${Date.now()}@teste.com`);
  const roundBefore = await noMotor(page, ({ CAREER }) => CAREER.currentRound);
  for (let i = 0; i < 30; i++) {
    const r = await jogarRodadaV2(page);
    if (!r.ok) throw new Error(`rodada ${i + 1} parou: ${r.passos.join(" ")}`);
  }
  const roundAfter = await noMotor(page, ({ CAREER }) => CAREER.currentRound);
  const server = await page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career.currentRound);
  check("1) 30 rodadas oficiais pela ponte do motor, gravadas no servidor:", roundAfter - roundBefore === 30 && server === roundAfter, { roundBefore, roundAfter, server });
  check("2) Todo save (PUT /api/career) respondeu 200:", puts.length > 0 && puts.every((s) => s === 200), { puts: puts.length, naoOk: puts.filter((s) => s !== 200) });
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
