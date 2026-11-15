// Histórico do jogador por temporada — lote L5d, sem a tela antiga. As regras
// pelo motor na página da v2 (as rodadas pela ponte, a virada por
// advanceSeason). A linha de histórico do detalhe da tela antiga saiu; a Ficha
// da v2 lê o mesmo seasonHistory (clubes por temporada).
//  1) Na 1ª temporada o jogador ainda não tem histórico.
//  2) Jogando rodadas, os números da temporada (jogos) acumulam.
//  3) Na virada, o histórico ganha 1 linha com os jogos, gols e assistências
//     da temporada, e os contadores da temporada nova voltam a zero.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `histjogador${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const id = CAREER.lineup.starters.find((x) => x && CAREER.squad.find((p) => p.id === x && p.group !== "G"));
    const p = () => CAREER.squad.find((x) => x.id === id);
    p().contractUntil = CAREER.seasonYear + 3; // não sai por fim de contrato na virada
    const antes = (p().seasonHistory || []).length;
    for (let n = 0; n < 3; n++) {
      if (!CAREER.lineup.starters.includes(id)) { const vaga = CAREER.lineup.starters.findIndex((x) => x && CAREER.squad.find((q) => q.id === x && q.group === p().group)); if (vaga >= 0) CAREER.lineup.starters[vaga] = id; }
      const j = await jogarPartidaDaRodada();
      if (!j.ok) return { erro: j.passos };
    }
    const temporada = { apps: p().appsSeason || 0, goals: p().goalsSeason || 0, assists: p().assistsSeason || 0, ano: CAREER.seasonYear };
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = -99; // o teste mede o histórico, não a diretoria
    await advanceSeason();
    const d = p();
    return { antes, temporada, hist: d && d.seasonHistory, agora: d && { apps: d.appsSeason, goals: d.goalsSeason, assists: d.assistsSeason } };
  });

  check("1) Na 1ª temporada o jogador ainda não tem histórico:", r.antes === 0, JSON.stringify(r.antes));
  check("2) Jogando rodadas, os jogos da temporada acumulam:", r.temporada && r.temporada.apps > 0, JSON.stringify(r.temporada));
  const h = (r.hist || [])[0] || {};
  check("3) Na virada: 1 linha com os jogos, gols e assistências da temporada; contadores da nova em zero:",
    (r.hist || []).length === 1 && h.apps === r.temporada.apps && h.goals === r.temporada.goals && h.assists === r.temporada.assists
    && r.agora.apps === 0 && r.agora.goals === 0 && r.agora.assists === 0, JSON.stringify({ hist: r.hist, agora: r.agora }));
  check("4) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
