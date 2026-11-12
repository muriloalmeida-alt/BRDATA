// Confere que a virada de temporada não reenche elenco de time de outra
// divisão até o piso maior (16) por engano — deve ficar no piso menor (12,
// MIN_LEAGUE_SQUAD_OTHER_DIVISION).
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes a virada
// pela tela antiga (#btnAdvanceSeason); agora pelo comando do motor da v2
// (proximaTemporada), gravando a rodada 39 e reabrindo antes, como antes.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `mercadoseason${Date.now()}@teste.com`);

  // Elenco de um time de fora bem pequeno (abaixo do piso) e rodada 39.
  const before = await noMotor(page, async ({ CAREER, persistir }) => {
    const ownIds = new Set(Object.keys(CAREER.standings));
    const [otherId] = Object.keys(CAREER.leagueSquads).filter((id) => !ownIds.has(id));
    CAREER.leagueSquads[otherId] = CAREER.leagueSquads[otherId].slice(0, 5); // força bem pequeno
    CAREER.currentRound = 39;
    await persistir();
    return { otherId, sizeBefore: CAREER.leagueSquads[otherId].length };
  });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const virada = await noMotor(page, ({ ponte }) => ponte.proximaTemporada());
  let saved = await saveNoServidor(page);
  for (const t0 = Date.now(); saved.currentRound === 39 && Date.now() - t0 < 15000; await page.waitForTimeout(200)) saved = await saveNoServidor(page);
  const after = { sizeAfter: (saved.leagueSquads[before.otherId] || []).length, round: saved.currentRound, virada: virada && virada.ok };
  check("1) Elenco de time de fora reenchido até o piso MENOR (12), não o de sempre (16):", after.sizeAfter === 12, JSON.stringify({ before, after }));

  check("2) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
