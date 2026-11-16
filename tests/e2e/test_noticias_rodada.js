// Notícias da rodada (manchetes geradas dos resultados) — lote L5c, sem a
// tela antiga. As regras pelo motor (generateRoundNews) na página da v2. A
// tela Notícias da rodada do pós-jogo da v2 está no test_v2_posjogo item 2;
// o bloco "Rádio Data FM" dos Resultados da tela antiga já tinha saído.
//  1) Mudança de líder vira manchete com o nome do novo líder.
//  2) Zebra (o mais fraco goleia o mais forte) vira manchete de zebra e de
//     goleada.
//  3) Empate do mais fraco contra o mais forte vira "empate defendido".
//  4) Vitória depois de 7 jogos sem vencer vira "jejum quebrado" (com o 7).
//  5) O lanterna vencendo vira "lanterna reage".
//  6) A manchete do meu clube vem primeiro, mesmo de um tipo menos
//     prioritário.
//  7) Sem nada para noticiar, sai o resumo da rodada (NOTICIAS-RODADA, 16/11:
//     no lugar da antiga manchete genérica; o seu jogo tem teste próprio em
//     tests/unit/test_motor_noticias_rodada.js).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `noticias${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const results = await page.evaluate(() => {
    const teamIds = LEAGUE_TEAMS.map((t) => t.id).filter((id) => String(id) !== String(CAREER.clubId));
    const [A, B, C, D, E, F] = teamIds; // 6 times CPU quaisquer, fora o seu

    const out = {};

    // 1) Líder: standingsBefore diz que A NÃO lidera; standings atual
    // (mockado na hora) diz que A lidera.
    const standingsBefore1 = cloneStandings(CAREER.standings);
    standingsBefore1[A] = { ...standingsBefore1[A], pts: 0 };
    standingsBefore1[B] = { ...standingsBefore1[B], pts: 99 }; // B "liderava" antes
    const savedStandings = CAREER.standings;
    CAREER.standings = cloneStandings(CAREER.standings);
    CAREER.standings[A] = { ...CAREER.standings[A], pts: 99 }; // A lidera agora
    CAREER.standings[B] = { ...CAREER.standings[B], pts: 0 };
    const newsLider = generateRoundNews(5, [], standingsBefore1);
    out.lider = newsLider.some((n) => n.type === "lider" && n.texto.includes(teamById(A).name));
    CAREER.standings = savedStandings;

    // 2) Zebra + goleada na mesma partida: acha um par de clubes CPU
    // com diferença real de overall >= 6, força o mais fraco vencendo
    // de goleada.
    let zebraPair = null;
    for (const x of teamIds) for (const y of teamIds) {
      if (x === y) continue;
      const ox = squadAvgOverallOf(x), oy = squadAvgOverallOf(y);
      if (ox != null && oy != null && ox <= oy - 6) { zebraPair = { fraco: x, forte: y }; break; }
      if (zebraPair) break;
    }
    if (zebraPair) {
      const resultZebra = { home: zebraPair.fraco, away: zebraPair.forte, gh: 4, ga: 0 };
      const newsZebra = generateRoundNews(6, [resultZebra], cloneStandings(CAREER.standings));
      out.zebra = newsZebra.some((n) => n.type === "zebra");
      out.goleada = newsZebra.some((n) => n.type === "goleada");
    } else {
      out.zebra = "sem par com gap de overall suficiente pra testar";
      out.goleada = "sem par pra testar goleada junto";
    }

    // 3) Empate defendido: mesmo par (fraco em casa, forte fora), empate.
    if (zebraPair) {
      const resultDraw = { home: zebraPair.fraco, away: zebraPair.forte, gh: 1, ga: 1 };
      const newsDraw = generateRoundNews(7, [resultDraw], cloneStandings(CAREER.standings));
      out.empateDefendido = newsDraw.some((n) => n.type === "empate_defendido");
    } else {
      out.empateDefendido = "sem par pra testar";
    }

    // 4) Jejum quebrado: força streak alto pro time C, C vence D.
    const streakBackup = { ...(CAREER.teamWinlessStreak || {}) };
    CAREER.teamWinlessStreak[String(C)] = 7;
    const resultJejum = { home: C, away: D, gh: 2, ga: 1 };
    const newsJejum = generateRoundNews(8, [resultJejum], cloneStandings(CAREER.standings));
    out.jejum = newsJejum.some((n) => n.type === "jejum_quebrado" && n.texto.includes("7"));
    CAREER.teamWinlessStreak = streakBackup;

    // 5) Lanterna reage: standingsBefore diz que E é o último colocado
    // (20º), E vence F.
    const standingsBeforeLanterna = cloneStandings(CAREER.standings);
    const allIds = Object.keys(standingsBeforeLanterna);
    allIds.forEach((id, i) => { standingsBeforeLanterna[id].pts = 100 - i; }); // ordem qualquer, só != empatado
    standingsBeforeLanterna[String(E)].pts = -999; // garante que E é o 20º (último)
    const resultLanterna = { home: E, away: F, gh: 1, ga: 0 };
    const newsLanterna = generateRoundNews(9, [resultLanterna], standingsBeforeLanterna);
    out.lanterna = newsLanterna.some((n) => n.type === "lanterna_reage");

    // 6) Prioridade: manchete do MEU clube sempre primeiro, mesmo que
    // seja de tipo "menor" (goleada) contra um líder virando em outro
    // jogo (tipo mais prioritário na ordem normal, mas não é meu clube
    // -- goleada só depende do placar, sem incerteza de overall).
    const myId = CAREER.clubId;
    const oppId = teamIds.find((id) => id !== A && id !== B) || A;
    const forcedMineGoleada = { home: myId, away: oppId, gh: 4, ga: 0 };
    const standingsBeforeMisto = cloneStandings(CAREER.standings);
    standingsBeforeMisto[B] = { ...standingsBeforeMisto[B], pts: 99 };
    const standingsAfterMistoBackup = CAREER.standings;
    CAREER.standings = cloneStandings(CAREER.standings);
    CAREER.standings[A] = { ...CAREER.standings[A], pts: 99 };
    CAREER.standings[B] = { ...CAREER.standings[B], pts: 0 };
    const newsMisto = generateRoundNews(10, [forcedMineGoleada], standingsBeforeMisto);
    out.prioridadeMinhaPrimeiro = newsMisto.length > 1 && newsMisto[0].mine === true && newsMisto.some((n) => n.type === "lider" && !n.mine);
    CAREER.standings = standingsAfterMistoBackup;

    // 7) Fallback genérico quando nada dispara.
    const newsVazia = generateRoundNews(11, [], null);
    out.generico = newsVazia.length === 1 && newsVazia[0].type === "resumo" && !newsVazia.some((n) => n.type === "generico");

    return out;
  });

  check("1) Mudança de líder vira manchete com o nome do novo líder:", results.lider === true);
  check("2) Zebra goleando vira manchete de zebra e de goleada:", results.zebra === true && results.goleada === true, JSON.stringify({ zebra: results.zebra, goleada: results.goleada }));
  check("3) Empate do mais fraco contra o mais forte vira 'empate defendido':", results.empateDefendido === true, JSON.stringify(results.empateDefendido));
  check("4) Vitória depois de 7 jogos sem vencer vira 'jejum quebrado' (com o 7):", results.jejum === true);
  check("5) O lanterna vencendo vira 'lanterna reage':", results.lanterna === true);
  check("6) A manchete do meu clube vem primeiro, mesmo de tipo menos prioritário:", results.prioridadeMinhaPrimeiro === true);
  check("7) Sem nada para noticiar, sai o resumo da rodada (sem a antiga manchete genérica):", results.generico === true);
  check("8) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
