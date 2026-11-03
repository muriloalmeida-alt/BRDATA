// Recompensa diária — dia 7 ("pacote de elite"). O servidor manda o prêmio
// sem valor ({ type: "premium_pack", id: "weekly_elite" }, users.js); o caixa
// virava NaN (gravado como null). Agora usa o valor do ciclo do jogo
// (R$ 3.000) e o save gravado continua com caixa numérico.
//  1) applyDailyLoginReward com o formato exato do servidor: caixa +3.000,
//     moral e condição sobem, detalhe com o valor.
//  2) Fluxo real de coleta (claimDailyLoginNow) com a resposta do servidor
//     para o dia 7: o save no servidor fica com caixa numérico (+3.000).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer } = require("./_v2_match");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `dia7${Date.now()}@teste.com`);

  const r1 = await page.evaluate(() => {
    const before = CAREER.finances.cash;
    const moraleBefore = CAREER.squad[0].morale == null ? 70 : CAREER.squad[0].morale;
    const out = applyDailyLoginReward({ type: "premium_pack", id: "weekly_elite" });
    return { before, after: CAREER.finances.cash, morale: [moraleBefore, CAREER.squad[0].morale], detail: out.detail };
  });
  check("1) Dia 7 com o formato do servidor (sem amount): caixa numérico +R$ 3.000, moral sobe, detalhe com o valor:",
    Number.isFinite(r1.after) && r1.after === r1.before + 3000 && r1.morale[1] >= r1.morale[0] && /3\.000/.test(r1.detail), JSON.stringify(r1));

  // 2) Coleta real com a resposta do servidor para o dia 7.
  await page.route("**/api/daily-login/claim", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ currentStreakDay: 7, reward: { type: "premium_pack", id: "weekly_elite" } }) }));
  const before2 = await page.evaluate(() => CAREER.finances.cash); // em memória (o item 1 já somou, sem gravar)
  await page.evaluate(() => { renderDailyLoginModal(7); });
  await page.click("#btnClaimDailyLogin");
  await page.waitForFunction(() => !document.getElementById("dailyLoginOverlay").classList.contains("open"), null, { timeout: 15000 });
  const saved = await serverCareer(page);
  check("2) Coleta real do dia 7: o save gravado fica com caixa numérico e +R$ 3.000 (antes ficava null):",
    Number.isFinite(saved.finances.cash) && saved.finances.cash === before2 + 3000, JSON.stringify({ before2, after: saved.finances.cash }));

  await browser.close();
})();
