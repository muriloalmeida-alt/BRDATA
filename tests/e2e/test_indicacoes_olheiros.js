// Indicações de olheiro (GE-SCOUT-001): vêm de olheiro contratado em missão
// Profissional, com posição, faixa de potencial e relatório (nunca o
// potencial exato); o catálogo de olheiros é só nacional.
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes pela tela
// antiga (#scoutSuggestionsOverlay, #scoutMarketOverlay). Agora:
// - 1) sem indicação: "Indicações dos olheiros." da v2 explica o que fazer,
//   e "Olheiros" oferece "Contratar olheiro";
// - 2) contratar o olheiro-chefe e mandá-lo em missão Profissional longa
//   pelos comandos do motor que as telas de olheiros da v2 usam
//   (contratarOlheiro, enviarMissao), as rodadas da missão pelo motor, e as
//   indicações na tela da v2 com o potencial estimado;
// - 3) o catálogo só nacional, pelo motor;
// - 4/5) "Recusar" e "Propor" são o item 8 do test_v2_clube.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `indicacoes${Date.now()}@teste.com`);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // 1) Sem olheiro: nenhuma indicação, e a tela explica; "Olheiros" oferece contratar.
  await page.goto(base + "/olheiros/indicacoes", { waitUntil: "domcontentloaded" });
  await h1("Indicações dos olheiros.");
  const vazio = await page.evaluate(() => ({ nota: (document.querySelector(".wk-note.pr-pad") || {}).textContent || "", linhas: document.querySelectorAll(".cl-actions").length }));
  await page.goto(base + "/olheiros", { waitUntil: "domcontentloaded" });
  await h1("Amplie seu alcance.");
  const contratar = await page.locator("a.pr-row", { hasText: "Contratar olheiro" }).waitFor({ timeout: 20000 }).then(() => 1, () => 0);
  check("1) Sem olheiro contratado: nenhuma indicação, a tela explica e \"Olheiros\" oferece contratar:",
    vazio.linhas === 0 && /missão Profissional/.test(vazio.nota) && contratar === 1, JSON.stringify({ ...vazio, contratar }));

  // 2) Olheiro-chefe em missão Profissional longa; as indicações voltam com relatório.
  const c2 = await noMotor(page, async ({ CAREER, ponte, semana, persistir }) => {
    CAREER.finances.wageCap = 999999999; CAREER.finances.cash = 999999999;
    const h = await ponte.contratarOlheiro("t_lacerda");
    const scout = CAREER.scouts.find((s) => s.marketId === "t_lacerda");
    const m = await ponte.enviarMissao(scout.id, "sudeste", "pro", null, "longa");
    const mission = scout.mission ? { type: scout.mission.type, duration: scout.mission.duration } : null;
    for (let r = 0; r < 6; r++) semana.tickScoutMissions(CAREER.currentRound);
    await persistir();
    const suggestions = CAREER.scoutSuggestions || [];
    return {
      contratou: h.ok, missao: m.ok, mission, suggestionCount: suggestions.length,
      allHaveReport: suggestions.every((s) => s.report && s.report.recommendation && s.potLo != null && s.potHi >= s.potLo),
      noExactPotentialField: suggestions.every((s) => s.potential === undefined),
    };
  });
  await page.goto(base + "/olheiros/indicacoes", { waitUntil: "domcontentloaded" });
  await h1("Indicações dos olheiros.");
  const tela2 = await page.evaluate(() => [...document.querySelectorAll(".wk-sec[aria-label]")].filter((s) => s.querySelector(".cl-actions")).map((s) => ({
    pos: (s.querySelector(".row-sub") || {}).textContent || "",
    potencial: ([...s.querySelectorAll(".wk-item")].find((d) => (d.querySelector("dt") || {}).textContent === "Potencial estimado") || { querySelector: () => ({}) }).querySelector("dd").textContent || "",
  })));
  check("2) A missão Profissional do olheiro traz indicações com posição, faixa de potencial e relatório (sem o potencial exato):",
    c2.contratou && c2.missao && c2.mission && c2.mission.type === "pro" && c2.mission.duration === "longa"
      && c2.suggestionCount > 0 && c2.allHaveReport && c2.noExactPotentialField
      && tela2.length === c2.suggestionCount && tela2.every((r) => /\d/.test(r.potencial) && r.pos.length > 0),
    JSON.stringify({ ...c2, tela: tela2.slice(0, 2) }));

  // 3) Catálogo de olheiros só nacional.
  const c3 = await noMotor(page, ({ clube, semana }) => clube.SCOUT_MARKET.every((c) => c.regionScope === "any" || c.regionScope.every((r) => semana.REGION_LABEL[r]))
    && !clube.SCOUT_MARKET.some((c) => /internacional|sul-americ/i.test(c.specialty)));
  check("3) Catálogo de olheiros só nacional:", c3);

  check("4) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
