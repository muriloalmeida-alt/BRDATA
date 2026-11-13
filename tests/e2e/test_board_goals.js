// Metas da diretoria e demissão por sequência ruim (lote L4a, sem a tela
// antiga). Pelo motor na página da v2 (proximaTemporada, o mesmo comando do
// "Continuar" do Encerramento da v2) e pelo Início da v2:
//  1) A meta existe desde a criação da carreira e aparece no Início da v2.
//  2) Cenário B (antes o 4): 2 temporadas ruins seguidas + temporada BOA:
//     não demite, avança a temporada e zera a sequência.
//  3) Cenário A (antes o 2): 2 seguidas + temporada RUIM (última posição):
//     demite (3ª seguida), sem avançar a temporada.
// O antigo item 3 ("Escolher outro clube" volta à escolha de competição e
// apaga o save) está no test_v2_temporada, item 5 ("Começar nova carreira").
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, base, skipAutoOpen } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `boardgoals${Date.now()}@teste.com`);

  // 1) Meta inicial no save e no Início.
  const meta = await noMotor(page, ({ CAREER }) => CAREER.boardGoal);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await skipAutoOpen(page);
  await page.waitForSelector(".home", { timeout: 20000 });
  const linhas = await page.evaluate(() => [...document.querySelectorAll(".home .row-title")].map((t) => t.textContent));
  check("1) A meta existe desde a criação da carreira e aparece no Início da v2:", !!meta && !!meta.label && linhas.includes(meta.label), JSON.stringify({ meta, linhas }));

  // Fim de temporada com o clube em 1º ("first") ou em último ("last"), e a
  // sequência de temporadas ruins em `seguidas`; depois, o "Continuar".
  const virar = (rank, seguidas) => noMotor(page, async ({ CAREER, ponte }, { rank, seguidas }) => {
    Object.keys(CAREER.standings).forEach((id, i) => {
      const s = CAREER.standings[id];
      if (String(id) === String(CAREER.clubId)) { s.pts = rank === "first" ? 999 : -999; s.v = rank === "first" ? 38 : 0; s.j = 38; s.sg = rank === "first" ? 100 : -100; s.gp = rank === "first" ? 100 : 0; }
      else { s.pts = rank === "first" ? i : 500 - i; s.j = 38; }
    });
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = seguidas;
    const ano = CAREER.seasonYear;
    const r = await ponte.proximaTemporada();
    return { r, ano, anoDepois: CAREER.seasonYear, seguidas: CAREER.negativeSeasonsStreak, rodada: CAREER.currentRound };
  }, { rank, seguidas });

  // 2) Cenário B: temporada boa.
  const b = await virar("first", 2);
  check("2) Cenário B (2 seguidas + temporada boa): não demite, avança a temporada e zera a sequência:",
    b.r.ok && b.r.demitido === false && b.r.metaBatida === true && b.anoDepois === b.ano + 1 && b.seguidas === 0 && b.rodada === 1, JSON.stringify(b));

  // 3) Cenário A: temporada ruim.
  const a = await virar("last", 2);
  check("3) Cenário A (2 seguidas + temporada ruim): demite na 3ª seguida, sem avançar a temporada:",
    a.r.ok && a.r.demitido === true && a.r.seguidas === 3 && a.seguidas === 3 && a.anoDepois === a.ano, JSON.stringify(a));

  check("4) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
