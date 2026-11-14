// Premiações da temporada — lote L4d, sem a tela antiga. As regras pelo motor
// na página da v2 (o mesmo advanceSeason); a tela é a Premiações da v2
// (Mais → Premiações, "Quem fez a diferença."), no lugar do overlay da tela
// antiga. Cenário controlado: teamA lidera (campeão), teamB é vice, meu
// jogador vira artilheiro/assistências/melhor (empatado com um rival de mais
// jogos, para provar o desempate) e a Copa do Brasil tem teamC campeão.
//  1) Campeão e vice.  2) Artilheiro é o meu (desempate por menos jogos).
//  3) Assistências.  4) Melhor jogador.  5) Copa com o campeão certo.
//  6) A moral do premiado sobe.  7) goalsSeason zera na virada.
//  8) A tela Premiações da v2 mostra a temporada: Campeão (teamA), Vice,
//     Artilheiro com o meu jogador (meu clube, 25 gols, ★) e o campeão da Copa.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `premios${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(async () => {
    const teamIds = Object.keys(CAREER.leagueSquads).filter((id) => String(id) !== String(CAREER.clubId));
    const [teamA, teamB, teamC] = teamIds;
    Object.values(CAREER.standings).forEach((s, i) => { s.pts = 50 - i; s.v = 10; s.sg = 5; s.gp = 20; });
    CAREER.standings[teamA].pts = 99;
    CAREER.standings[teamB].pts = 90;

    const meu = CAREER.squad.find((p) => p.origin === "principal");
    meu.goalsSeason = 25; meu.assistsSeason = 15; meu.overall = 99; meu.apps = 30;
    const rival = CAREER.leagueSquads[teamB][0];
    rival.goalsSeason = 25; rival.assistsSeason = 15; rival.overall = 99; rival.apps = 34;

    CAREER.cup = CAREER.cup || {};
    CAREER.cup.active = true;
    CAREER.cup.phase = "done";
    CAREER.cup.champion = teamC;
    CAREER.cup.ties = CAREER.cup.ties || {};
    CAREER.cup.ties.final = [{ home: teamC, away: teamA, winner: teamC }];

    const moraleBefore = meu.morale;
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = -99; // o teste mede as premiações, não a diretoria
    const summary = await advanceSeason();
    await persistCareer();
    const award = CAREER.seasonAwards[0];
    const depois = CAREER.squad.find((p) => p.id === meu.id);
    return {
      dismissed: summary && summary.dismissed, teamA, teamB, teamC,
      nomeA: teamById(teamA).name, nomeC: teamById(teamC).name, meuClube: teamById(CAREER.clubId).name, meuId: meu.id,
      campeao: award.brasileirao.campeao, vice: award.brasileirao.vice,
      artilheiro: award.brasileirao.artilheiro, assistencias: award.brasileirao.assistencias, melhor: award.brasileirao.melhorJogador,
      copa: award.copaDoBrasil, moraleBefore, moraleAfter: depois ? depois.morale : null,
      gols: depois ? depois.goalsSeason : "saiu",
    };
  });

  check("1) Campeão e vice corretos:", r.campeao === r.teamA && r.vice === r.teamB, JSON.stringify({ campeao: r.campeao, vice: r.vice }));
  check("2) Artilheiro é o meu jogador (desempate por menos jogos):", r.artilheiro && r.artilheiro.jogadorId === r.meuId, JSON.stringify(r.artilheiro));
  check("3) Mais assistências é o meu jogador:", r.assistencias && r.assistencias.jogadorId === r.meuId, JSON.stringify(r.assistencias));
  check("4) Melhor jogador é o meu:", r.melhor && r.melhor.jogadorId === r.meuId, JSON.stringify(r.melhor));
  check("5) Copa do Brasil disputada, com o campeão certo:", r.copa && r.copa.disputou && r.copa.campeao === r.teamC, JSON.stringify(r.copa));
  check("6) A moral do premiado subiu:", r.moraleAfter > r.moraleBefore, `${r.moraleBefore} -> ${r.moraleAfter}`);
  check("7) goalsSeason zerou na virada:", r.gols === 0, String(r.gols));

  // 8) Tela Premiações da v2.
  await page.goto(base + "/premiacoes", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Quem fez a diferença.", null, { timeout: 30000 }).catch(() => {});
  const tela = await page.evaluate(() => ({ h1: (document.querySelector("h1") || {}).textContent, txt: document.querySelector(".wk").innerText }));
  const linha = (rotulo) => (tela.txt.split("\n").map((l, i, a) => (l.trim() === rotulo ? a[i + 1] : null)).find(Boolean) || "");
  const art = tela.txt.split("\n").find((l, i, a) => a[i - 1] && a[i - 1].trim() === "Artilheiro") || "";
  check("8) A Premiações da v2 mostra Campeão (o líder), Artilheiro (o meu, com ★) e a Copa do Brasil (o campeão dela):",
    tela.h1 === "Quem fez a diferença." && tela.txt.includes(r.nomeA) && /Copa do Brasil/i.test(tela.txt) && tela.txt.includes(r.nomeC)
    && art.includes(`(${r.meuClube})`) && art.includes("25 gols") && art.includes("★"), JSON.stringify({ h1: tela.h1, art, campeao: linha("Campeão") }));

  check("9) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
