// Coletiva de imprensa — lote L5c, sem a tela antiga. As regras pelo motor
// (biblioteca, gatilhos) e a resposta pela ponte (responderColetiva, o mesmo
// da coletiva do pós-jogo da v2). As telas — pergunta e respostas, efeito
// mostrado depois de responder, "Pular" sem efeito — estão no
// test_v2_posjogo itens 1 e 5 (antes: o modal e o X da tela antiga).
//  1) A biblioteca tem 21 situações, cada uma com 2 ou 3 respostas.
//  2) Goleada aplicada dispara a situação 12.
//  3) Derrota para um time bem mais fraco (zebra sofrida) dispara a 10.
//  4) O lanterna vencendo dispara a 09 (lanterna reage) ou a 08 (zona).
//  5) Meta em risco dispara a 20 (ou a 08, zona, também plausível em último).
//  6) A resposta A da goleada sobe a reputação e a moral, e fica no
//     histórico de coletivas (letra e rodada).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `coletiva${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const out = {};
    out.um = { total: PRESS_LIBRARY.length, ok: PRESS_LIBRARY.every((e) => e.respostas.length === 2 || e.respostas.length === 3) };
    const real = Math.random;
    Math.random = () => 0;
    const ctx = (o) => ({ isHome: true, myClubId: CAREER.clubId, winlessBefore: 0, injuredBeforeIds: new Set(), events: [], ...o });
    const fraco = LEAGUE_TEAMS.map((t) => t.id).find((id) => String(id) !== String(CAREER.clubId) && !isBigClub(id));
    out.dois = (determineMatchPressTrigger(ctx({ myGoals: 4, oppGoals: 0, oppClubId: fraco, roundPlayed: 10 })) || {}).id;
    CAREER.leagueSquads[String(fraco)].forEach((p) => { p.overall = 30; });
    CAREER.squad.filter((p) => p.origin === "principal").forEach((p) => { p.overall = 85; });
    out.tres = (determineMatchPressTrigger(ctx({ myGoals: 0, oppGoals: 1, oppClubId: fraco, roundPlayed: 11 })) || {}).id;
    const ids = Object.keys(CAREER.standings);
    const outros = ids.filter((id) => id !== String(CAREER.clubId));
    outros.forEach((id, i) => { CAREER.standings[id].pts = 200 + i; });
    CAREER.standings[CAREER.clubId].pts = 1;
    out.quatro = (determineMatchPressTrigger(ctx({ myGoals: 1, oppGoals: 0, oppClubId: outros.find((id) => !isBigClub(id)) || outros[0], roundPlayed: 12 })) || {}).id;
    CAREER.standings[CAREER.clubId].pts = -999;
    CAREER.boardGoal = { type: "posicao_tabela", target: 6, label: "Terminar entre os 6 primeiros" };
    CAREER.metaRiskWarnedSeason = null;
    out.cinco = (determineMatchPressTrigger(ctx({ myGoals: 0, oppGoals: 0, oppClubId: outros[0], roundPlayed: 13 })) || {}).id;
    Math.random = real;
    const repAntes = CAREER.reputation;
    const jog = CAREER.squad.find((p) => p.origin === "principal");
    const moralAntes = jog.morale;
    const logAntes = (CAREER.pressLog || []).length;
    firePressConference("12", 15, false);
    const resp = await P.responderColetiva("A");
    out.seis = { resp: resp && resp.ok !== false, repAntes, rep: CAREER.reputation, moralAntes, moral: jog.morale, log: (CAREER.pressLog || []).length - logAntes, entrada: (CAREER.pressLog || [])[0] };
    return out;
  });

  check("1) Biblioteca com 21 situações, cada uma com 2 ou 3 respostas:", r.um.total === 21 && r.um.ok, JSON.stringify(r.um));
  check("2) Goleada aplicada dispara a situação 12:", r.dois === "12", r.dois);
  check("3) Zebra sofrida dispara a 10:", r.tres === "10", r.tres);
  check("4) Lanterna vencendo dispara a 09 ou a 08:", r.quatro === "09" || r.quatro === "08", r.quatro);
  check("5) Meta em risco dispara a 20 (ou a 08):", r.cinco === "20" || r.cinco === "08", r.cinco);
  check("6) A resposta A da goleada sobe reputação e moral e fica no histórico (letra A, rodada 15):",
    r.seis.resp && r.seis.rep > r.seis.repAntes && r.seis.moral > r.seis.moralAntes && r.seis.log === 1 && r.seis.entrada.letra === "A" && r.seis.entrada.round === 15, JSON.stringify(r.seis));
  check("7) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
