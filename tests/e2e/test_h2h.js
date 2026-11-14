// Retrospecto H2H (confronto direto) — lote L4d, sem a tela antiga. Junta o
// test_h2h e o test_h2h2 (os dois abriam o H2H da tela antiga pelo card do
// próximo jogo). Na v2 o H2H é "O histórico do duelo." (Clube do adversário
// → "Histórico do duelo"), montado do mesmo CAREER.matchLog:
//  1) Sem histórico: 0 V, 0 E, 0 D e nenhum jogo listado.
//  2) Depois de 3 rodadas jogadas, o registro de partidas tem as 3.
//  3) Contra o adversário seguinte (novo), o duelo continua sem jogos.
//  4) Com 4 jogos no registro contra ele (3×1 em casa, 0×2 fora, 1×1 em casa,
//     2×0 fora), o duelo mostra 2 V, 1 E, 1 D e os 4 jogos (antes: test_h2h2).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, jogarRodadaV2, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `h2h${Date.now()}@teste.com`);

  const proximo = () => noMotor(page, ({ CAREER }) => {
    const fx = (CAREER.schedule[CAREER.currentRound] || []).find((f) => String(f.home) === String(CAREER.clubId) || String(f.away) === String(CAREER.clubId));
    return String(String(fx.home) === String(CAREER.clubId) ? fx.away : fx.home);
  });
  const duelo = async (id) => {
    await page.goto(base + `/clube-elenco?id=${encodeURIComponent(id)}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Conheça o adversário.", null, { timeout: 30000 });
    await page.locator("a.pr-row", { hasText: "Histórico do duelo" }).click();
    await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "O histórico do duelo.", null, { timeout: 30000 });
    return page.evaluate(() => ({ ved: [...document.querySelectorAll(".wk-item dd")].slice(0, 3).map((d) => d.textContent).join(","), jogos: document.querySelectorAll(".gm-game").length }));
  };

  // 1) Sem histórico.
  const opp1 = await proximo();
  const d1 = await duelo(opp1);
  check("1) Sem histórico: o duelo mostra 0 V, 0 E, 0 D e nenhum jogo:", d1.ved === "0,0,0" && d1.jogos === 0, JSON.stringify(d1));

  // 2) Três rodadas.
  for (let i = 0; i < 3; i++) { const r = await jogarRodadaV2(page); if (!r.ok) throw new Error("rodada: " + r.passos.join(" ")); }
  const log = await noMotor(page, ({ CAREER }) => (CAREER.matchLog || []).map((m) => ({ opp: String(m.opponentId), round: m.round })));
  check("2) O registro de partidas tem as 3 jogadas:", log.length === 3 && log.every((m) => m.opp), JSON.stringify(log));

  // 3) Adversário seguinte, novo.
  const opp2 = await proximo();
  const d3 = await duelo(opp2);
  check("3) Contra o adversário seguinte (ainda não enfrentado), o duelo continua sem jogos:", !log.some((m) => m.opp === opp2) && d3.ved === "0,0,0" && d3.jogos === 0, JSON.stringify({ opp2, d3 }));

  // 4) Quatro jogos no registro contra ele.
  await noMotor(page, ({ CAREER, persistir }, opp) => {
    CAREER.matchLog = [
      { seasonYear: 2023, round: 10, opponentId: opp, home: true, gh: 3, ga: 1 },  // vitória
      { seasonYear: 2022, round: 25, opponentId: opp, home: false, gh: 0, ga: 2 }, // vitória (fora: ga é o meu)
      { seasonYear: 2022, round: 5, opponentId: opp, home: true, gh: 1, ga: 1 },   // empate
      { seasonYear: 2021, round: 30, opponentId: opp, home: false, gh: 2, ga: 0 }, // derrota
    ].concat(CAREER.matchLog || []);
    return persistir();
  }, opp2);
  const d4 = await duelo(opp2);
  check("4) Com 4 jogos contra ele no registro, o duelo mostra 2 V, 1 E, 1 D e os 4 jogos:", d4.ved === "2,1,1" && d4.jogos === 4, JSON.stringify(d4));

  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
