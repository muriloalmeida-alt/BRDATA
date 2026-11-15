// Estatísticas do time e do campeonato — lote L5d, sem a tela antiga. As
// regras pelo motor na página da v2 (a partida pela ponte, a virada por
// advanceSeason). A tela Estatísticas da v2 (Meu time/Campeonato,
// Temporada/Histórico e as seções do jogo) está no test_v2_jogos_mais item 3.
//  1) Carreira nova: estatísticas da temporada e da carreira zeradas.
//  2) Depois de 1 jogo: o resultado entra do lado certo (mandante ou
//     visitante) na temporada e na carreira, com os gols da tabela, o jogo
//     sem sofrer gol quando foi o caso e as sequências certas.
//  3) Na virada: 1 temporada de campeões (com o nome do campeão) e 1
//     temporada jogada na carreira.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `estatisticas${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const T = (o) => JSON.parse(JSON.stringify(o || null));
    const um = { j: (CAREER.teamStats && (CAREER.teamStats.home.j + CAREER.teamStats.away.j)) || 0, carreira: (CAREER.careerTotals && CAREER.careerTotals.j) || 0 };
    const fx = CAREER.schedule[CAREER.currentRound].find((f) => String(f.home) === String(CAREER.clubId) || String(f.away) === String(CAREER.clubId));
    const lado = String(fx.home) === String(CAREER.clubId) ? "home" : "away";
    const j = await jogarPartidaDaRodada();
    if (!j.ok) return { erro: j.passos };
    const my = CAREER.standings[CAREER.clubId];
    const dois = { lado, ts: T(CAREER.teamStats), ct: T(CAREER.careerTotals), win: CAREER.currentWinStreak, inv: CAREER.currentUnbeatenStreak, tab: { v: my.v, e: my.e, d: my.d, gp: my.gp, gc: my.gc } };
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = -99; // o teste mede as estatísticas, não a diretoria
    await advanceSeason();
    const tres = { campeoes: T(CAREER.leagueChampions), temporadas: (CAREER.careerTotals || {}).seasonsPlayed };
    return { um, dois, tres };
  });

  check("1) Carreira nova: estatísticas zeradas:", r.um.j === 0 && r.um.carreira === 0, JSON.stringify(r.um));
  const d = r.dois;
  const res = d.tab.v ? "v" : d.tab.e ? "e" : "d";
  const semSofrer = d.tab.gc === 0 ? 1 : 0;
  check(`2) Depois de 1 jogo (${res}, ${d.tab.gp}x${d.tab.gc}, ${d.lado}): resultado no lado certo, na temporada e na carreira, sem sofrer gol e sequências certas:`,
    d.ts[d.lado].j === 1 && d.ts[d.lado][res] === 1 && d.ts[d.lado].gp === d.tab.gp && d.ts[d.lado].gc === d.tab.gc && d.ts.cleanSheets === semSofrer
    && d.ct.j === 1 && d.ct[res] === 1 && d.ct[d.lado].j === 1 && d.ct.cleanSheets === semSofrer
    && d.win === (res === "v" ? 1 : 0) && d.inv === (res !== "d" ? 1 : 0), JSON.stringify(d));
  check("3) Na virada: 1 temporada de campeões (com o nome) e 1 temporada jogada:", r.tres.campeoes.length === 1 && !!r.tres.campeoes[0].championName && r.tres.temporadas === 1, JSON.stringify(r.tres));
  check("4) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
