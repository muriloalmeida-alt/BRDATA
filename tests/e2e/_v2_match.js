// Carreira 2.0 — ajudante ANTIGO, da tela antiga (lista congelada,
// tela_antiga_legado.json): só o newCareer que monta a carreira pela tela
// antiga (/carreira-old). Os outros ganchos foram para _v2_carreira.js
// (plano "testes sem a tela antiga", lote L1) e são reexportados daqui.
// Teste novo usa _v2_carreira.js.
const { passCareerSetup, enterGame } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");
const v2 = require("./_v2_carreira");
const { base, signup, ensureDailyClaimed } = v2;

// Conta nova + carreira no Brasileirão com `club`, já na rodada 1, pela tela antiga.
async function newCareer(page, email, club = "fla") {
  await signup(page, email);
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click(`.m3-club-row[data-id="${club}"]`);
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  await ensureDailyClaimed(page);
}

module.exports = { ...v2, newCareer };
