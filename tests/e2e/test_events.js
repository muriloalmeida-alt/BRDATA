// Placar e lances do seu jogo, rodada a rodada — lote L5d, sem a tela antiga.
// Antes: jogava 10 rodadas pela tela antiga e lia o modal "Seu jogo". Agora as
// rodadas vão pela ponte (o caminho da v2) e o teste lê o que o motor grava; a
// tela Resultado da v2 (título pelo placar e gols) está no test_v2_resultado.
//  1) Em 6 rodadas seguidas, o seu jogo fica gravado no registro da rodada
//     com o placar, igual ao do registro de partidas.
//  2) Todo jogo seu com gol guarda os lances (gols e cartões), com um gol
//     para cada gol do placar.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, jogarRodadaV2 } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `eventos${Date.now()}@teste.com`);

  const jogos = [];
  for (let n = 0; n < 6; n++) {
    const rodada = await noMotor(page, ({ CAREER }) => CAREER.currentRound);
    const j = await jogarRodadaV2(page);
    if (!j.ok) throw new Error("rodada: " + j.passos.join(" "));
    jogos.push(await noMotor(page, ({ CAREER }, rodada) => {
      const me = String(CAREER.clubId);
      const r = ((CAREER.resultsByRound || {})[rodada] || []).find((x) => String(x.home) === me || String(x.away) === me);
      const log = (CAREER.matchLog || []).find((m) => m.round === rodada && m.seasonYear === CAREER.seasonYear);
      return r ? { rodada, gh: r.gh, ga: r.ga, log: log ? [log.gh, log.ga] : null, gols: (r.events || []).filter((e) => e.type === "gol").length, lances: (r.events || []).length } : { rodada, falta: true };
    }, rodada));
  }

  check("1) Em 6 rodadas, o seu jogo fica gravado com o placar, igual ao do registro de partidas:",
    jogos.length === 6 && jogos.every((g) => !g.falta && g.log && g.log[0] === g.gh && g.log[1] === g.ga), JSON.stringify(jogos));
  const comGol = jogos.filter((g) => g.gh + g.ga > 0);
  check("2) Todo jogo com gol guarda os lances, com um gol para cada gol do placar:", comGol.every((g) => g.lances > 0 && g.gols === g.gh + g.ga), JSON.stringify({ comGol: comGol.length, jogos }));
  check("3) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
