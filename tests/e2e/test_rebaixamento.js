// Nova feature (pedido do usuário: "reinicie o tema do rebaixamento")
// — acesso/rebaixamento entre Séries A/B/C + repositório da Série D.
// Ver initDivisionSystem/resolveOtherDivisionsRound/
// applyPromotionRelegation (hoje no motor: virada.js e fechamento.js).
// Lote L4a: sem a tela antiga; regras pelo motor na página da v2.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor, base } = require("./_v2_carreira");

// Grava o save (resultados da rodada das outras divisões) antes de abrir outra tela.
async function persistirEReabrir(page) { await page.evaluate(() => persistCareer()); }

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const email = `rebaixamento${Date.now()}@teste.com`;
  // Lote L4a: carreira pela v2 (Flamengo, como o 1º clube da tela antiga) e
  // as funções do jogo pelo motor na página da v2 (globaisDoMotor).
  await newCareer(page, email);
  await globaisDoMotor(page);

  // 1) Carreira nova nasce com o sistema ativado: divisionTeams (3 x 20
  // times), serieDPool (20 times) e otherDivisions (as 2 que não são a
  // sua, cada uma com calendário + tabela zerada).
  const check1 = await page.evaluate(() => ({
    hasDivisionTeams: !!CAREER.divisionTeams,
    countA: (CAREER.divisionTeams.brasileirao || []).length,
    countB: (CAREER.divisionTeams.serie_b || []).length,
    countC: (CAREER.divisionTeams.serie_c || []).length,
    dPoolCount: CAREER.serieDPool.length,
    otherDivisionIds: Object.keys(CAREER.otherDivisions).sort(),
    otherHasSchedule: Object.values(CAREER.otherDivisions).every((d) => Object.keys(d.schedule).length === 38),
    otherHasZeroedStandings: Object.values(CAREER.otherDivisions).every((d) => Object.values(d.standings).every((r) => r.j === 0)),
  }));
  check("1) Carreira nova nasce com o sistema ativado (3x20 + pool de 20 + 2 outras divisões zeradas):",
    check1.hasDivisionTeams && check1.countA === 20 && check1.countB === 20 && check1.countC === 20 && check1.dPoolCount === 36
    && JSON.stringify(check1.otherDivisionIds) === JSON.stringify(["serie_b", "serie_c"]) && check1.otherHasSchedule && check1.otherHasZeroedStandings,
    JSON.stringify(check1));

  // 2) Avança a tabela das outras 2 divisões (sem depender da tela Ao
  // Vivo — chama resolveOtherDivisionsRound direto, mesma função que
  // finishRoundTail chama de verdade toda rodada) e confere que pelo
  // menos 1 jogo em cada já tem j>0.
  const check2 = await page.evaluate(() => {
    resolveOtherDivisionsRound(1);
    return Object.fromEntries(Object.entries(CAREER.otherDivisions).map(([id, d]) => [id, Object.values(d.standings).some((r) => r.j > 0)]));
  });
  check("2) resolveOtherDivisionsRound avança as 2 outras divisões (não só a sua):",
    Object.values(check2).every(Boolean), JSON.stringify(check2));

  // 3) Tabela da v2: as abas das 3 divisões e, na Série B, os times certos
  // (sem G6/Libertadores; a legenda tem "Acesso"). Antes, a Tabela da tela
  // antiga (seletor #tabelaDivisionSwitch).
  const nomesB = await page.evaluate(() => CAREER.divisionTeams.serie_b.map((t) => t.name));
  await persistirEReabrir(page);
  await page.goto(base + "/tabela", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tb-seg", { timeout: 20000 });
  const check3a = await page.evaluate(() => ({ abas: [...document.querySelectorAll(".tb-seg")].map((b) => b.textContent.trim()) }));
  await page.click('.tb-seg:has-text("Série B")');
  await page.waitForFunction(() => /divisao=serie_b/.test(location.search) && document.querySelector(".tb-more"), null, { timeout: 20000 });
  await page.click(".tb-more");
  await page.waitForFunction(() => document.querySelectorAll(".tb-row").length === 20, null, { timeout: 20000 });
  const check3b = await page.evaluate((nomesB) => {
    const nomes = [...document.querySelectorAll(".tb-row .tb-name")].map((n) => n.textContent);
    const legenda = [...document.querySelectorAll(".tb-legend li")].map((l) => l.textContent);
    return { rowCount: nomes.length, allFromB: nomes.every((n) => nomesB.includes(n)), legenda };
  }, nomesB);
  check("3) Abas das 3 divisões na Tabela da v2 e, na Série B, os times certos (com 'Acesso', sem G6/Libertadores):",
    check3a.abas.length === 3 && check3a.abas.some((t) => /Série B/.test(t)) && check3a.abas.some((t) => /Série C/.test(t))
    && check3b.rowCount === 20 && check3b.allFromB && check3b.legenda.some((l) => /Acesso/.test(l)) && !check3b.legenda.some((l) => /Libertadores|G6/.test(l)),
    JSON.stringify({ check3a, check3b }));
  await globaisDoMotor(page);

  // 4) Cascata de acesso/rebaixamento (chamada direto, sem rodar 38
  // rodadas de verdade): força uma tabela final plausível pras 3
  // divisões e confere o resultado da cascata.
  const check4 = await page.evaluate(async () => {
    // GE-BALANCE-002 (issue #27) — este teste força o clube do técnico
    // a terminar em último pra testar a CASCATA de acesso/rebaixamento
    // em si, não o reprieve de tradição (esse mecanismo novo tem seu
    // próprio teste dedicado, ver test_ge_balance_002.js). O clube
    // padrão desta carreira de teste (1ª linha do seletor) é o
    // Flamengo, que É de tradição — sem neutralizar isso aqui, esta
    // asserção ficaria refém do sorteio determinístico do reprieve
    // (que pode mudar de resultado noutra CAREER.seasonYear, já que o
    // seed inclui o ano — ver applyTraditionReprieve), quebrando um
    // teste que não tem nada a ver com o mecanismo novo.
    const wasTraditionClub = motorTemporada().CLUB_TRADITION_IDS.has(String(CAREER.clubId));
    if (wasTraditionClub) motorTemporada().CLUB_TRADITION_IDS.delete(String(CAREER.clubId));

    const teamsA = CAREER.divisionTeams.brasileirao.map((t) => String(t.id));
    teamsA.forEach((id, i) => { CAREER.standings[id] = { id, j: 38, v: teamsA.length - i, e: 0, d: i, gp: 50, gc: 10, sg: 40, pts: (teamsA.length - i) * 3 }; });
    const lastId = teamsA[teamsA.length - 1];
    [CAREER.standings[String(CAREER.clubId)].pts, CAREER.standings[lastId].pts] =
      [CAREER.standings[lastId].pts, CAREER.standings[String(CAREER.clubId)].pts];
    [CAREER.standings[String(CAREER.clubId)].v, CAREER.standings[lastId].v] =
      [CAREER.standings[lastId].v, CAREER.standings[String(CAREER.clubId)].v];

    const beforeA = new Set(CAREER.divisionTeams.brasileirao.map((t) => String(t.id)));
    const beforeB = new Set(CAREER.divisionTeams.serie_b.map((t) => String(t.id)));
    const beforeDPool = new Set(CAREER.serieDPool.map((t) => String(t.id)));
    const prevCompId = CURRENT_COMPETITION_ID;

    const pr = await applyPromotionRelegation();

    return {
      prevCompId, newCompId: CURRENT_COMPETITION_ID, divisionChanged: pr.divisionChanged,
      myIdInB: CAREER.divisionTeams.serie_b.some((t) => String(t.id) === String(CAREER.clubId)),
      relegatedAIncludesMe: pr.relegatedA.some((t) => String(t.id) === String(CAREER.clubId)),
      countsStillOk: CAREER.divisionTeams.brasileirao.length === 20 && CAREER.divisionTeams.serie_b.length === 20 && CAREER.divisionTeams.serie_c.length === 20 && CAREER.serieDPool.length === 36, // SERIED-001: D do catálogo de 2026 (36 ativos)
      promotedBWereInB: pr.promotedB.every((t) => beforeB.has(String(t.id))),
      relegatedAWereInA: pr.relegatedA.every((t) => beforeA.has(String(t.id))),
      dPoolPromotedWereInPool: pr.promotedD.every((t) => beforeDPool.has(String(t.id))),
      squadsExistForPromotedD: pr.promotedD.every((t) => Array.isArray(CAREER.leagueSquads[String(t.id)]) && CAREER.leagueSquads[String(t.id)].length > 0),
      squadsGoneForRelegatedC: pr.relegatedC.every((t) => CAREER.leagueSquads[String(t.id)] === undefined),
    };
  });
  check("4) Cascata: nosso clube (último na Série A) desce pra Série B, contagens de 20 mantidas, elenco da Série D promovida existe, elenco da Série C rebaixada removido:",
    check4.divisionChanged && check4.newCompId === "serie_b" && check4.myIdInB && check4.relegatedAIncludesMe && check4.countsStillOk
    && check4.promotedBWereInB && check4.relegatedAWereInA && check4.dPoolPromotedWereInPool && check4.squadsExistForPromotedD && check4.squadsGoneForRelegatedC,
    JSON.stringify(check4));

  // 5) Exceção da Série D: forçando nosso clube (agora na Série B, ver
  // passo 4) pra dentro da Série C na zona de rebaixamento, ele NUNCA
  // vai pra Série D — outro time cai no lugar dele.
  const check5 = await page.evaluate(async () => {
    const teamsB = CAREER.divisionTeams.serie_b.filter((t) => String(t.id) !== String(CAREER.clubId));
    const myTeamObj = CAREER.divisionTeams.serie_b.find((t) => String(t.id) === String(CAREER.clubId));
    CAREER.divisionTeams.serie_b = teamsB.concat(CAREER.divisionTeams.serie_c[0]);
    CAREER.divisionTeams.serie_c = [myTeamObj, ...CAREER.divisionTeams.serie_c.slice(1)];
    CURRENT_COMPETITION_ID = "serie_c";
    CAREER.competitionId = "serie_c";
    LEAGUE_TEAMS = CAREER.divisionTeams.serie_c;
    ALL_TEAMS_FLAT = ALL_COMPETITIONS_ORDER.flatMap((id) => CAREER.divisionTeams[id]);
    CAREER.otherDivisions = {};
    ALL_COMPETITIONS_ORDER.filter((id) => id !== "serie_c").forEach((id) => { CAREER.otherDivisions[id] = freshDivisionRound(CAREER.divisionTeams[id]); });

    const teamsC = CAREER.divisionTeams.serie_c.map((t) => String(t.id));
    CAREER.standings = {};
    teamsC.forEach((id, i) => { CAREER.standings[id] = { id, j: 38, v: teamsC.length - i, e: 0, d: i, gp: 50, gc: 10, sg: 40, pts: (teamsC.length - i) * 3 }; });
    const lastId = teamsC[teamsC.length - 1];
    CAREER.standings[String(CAREER.clubId)].pts = -1;
    if (lastId !== String(CAREER.clubId)) CAREER.standings[lastId].pts = 999999;

    const pr = await applyPromotionRelegation();
    return {
      myIdInRelegatedC: pr.relegatedC.some((t) => String(t.id) === String(CAREER.clubId)),
      myIdStillInC: CAREER.divisionTeams.serie_c.some((t) => String(t.id) === String(CAREER.clubId)),
      relegatedCCount: pr.relegatedC.length,
      compIdUnchanged: CURRENT_COMPETITION_ID === "serie_c",
    };
  });
  check("5) Exceção da Série D: nosso clube nunca desce pra D mesmo em último na Série C (outro time desce no lugar, zona continua com 4):",
    !check5.myIdInRelegatedC && check5.myIdStillInC && check5.relegatedCCount === 4 && check5.compIdUnchanged,
    JSON.stringify(check5));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
