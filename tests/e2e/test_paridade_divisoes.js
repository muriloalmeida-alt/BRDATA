// PARIDADE-CPU · E2 (20/11): as outras divisões e a Copa CPU × CPU jogam com
// os jogadores, pela mesma regra do CPU × CPU da sua divisão (postura, XI,
// força, cartões, lesões, autores e recuperação). Achados A6 e A7 do E0.
// Sem navegador, pela ponte (_sem_tela.js), perfil frozen.
//  1) Outra divisão: depois da rodada, os titulares dela somam jogo, a tabela
//     anda e os gols da divisão têm autores (somados nos jogadores).
//  2) Copa CPU × CPU: os 11 de cada lado somam jogo.
//  3) Lesão de jogador da CPU: histórico enxuto (as 3 últimas, sem a fadiga);
//     o seu jogador continua com o histórico completo.
//  4) Regra desligada (equivalência): a outra divisão volta a ser só placar.
const { check } = require("./_check");
const { abrirPagina, jogarRodada } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, F = M.fechamento, C = E.carreiraAtual(); ${codigo} })())`, "teste"));
  const FOTO = `const [compId, div] = Object.entries(C.otherDivisions)[0];
    const ids = (C.divisionTeams[compId] || []).map((t) => String(t.id));
    const jogadores = ids.flatMap((id) => C.leagueSquads[id] || []);
    const jogos = jogadores.reduce((s, p) => s + (p.appsSeason || 0), 0);
    const gols = jogadores.reduce((s, p) => s + (p.goalsSeason || 0), 0);
    const pts = Object.values(div.standings).reduce((s, r) => s + (r.pts || r.points || 0), 0);
    const golsTabela = Object.values(div.standings).reduce((s, r) => s + (r.gf || r.gp || r.goalsFor || 0), 0);`;

  // 1) Outra divisão.
  const antes = ler(`${FOTO} return { compId, jogos, gols, pts, golsTabela };`);
  const rr = await jogarRodada(pg.P);
  const depois = ler(`${FOTO} return { compId, jogos, gols, pts, golsTabela };`);
  const jogosNaRodada = depois.jogos - antes.jogos, golsNaRodada = depois.golsTabela - antes.golsTabela;
  // (A Copa da mesma semana também soma jogos e gols nesses jogadores.)
  check("1) Outra divisão: os titulares somam jogo (22 por partida), a tabela anda e todo gol da tabela tem autor:",
    rr.ok && jogosNaRodada >= 22 * 10 && jogosNaRodada % 22 === 0 && depois.pts > antes.pts && depois.gols - antes.gols >= golsNaRodada && golsNaRodada > 0,
    JSON.stringify({ antes, depois, jogosNaRodada, golsNaRodada }));

  // 2) Copa CPU × CPU, entre dois clubes da outra divisão.
  const r2 = ler(`const compId = Object.keys(C.otherDivisions)[0];
    const [a, b] = (C.divisionTeams[compId] || []).map((t) => String(t.id));
    const sqa = C.leagueSquads[a], sqb = C.leagueSquads[b];
    sqa.concat(sqb).forEach((p) => { if (p.status === "ok") p.condition = 70; });
    const apps = (sq) => sq.reduce((s, p) => s + (p.apps || 0), 0);
    const ja = apps(sqa), jb = apps(sqb);
    const xi = F.xiDaCpu(a, C.currentRound).map((p) => p.id);
    const r = F.simulateCupLeg(a, b, C.currentRound);
    const titular = sqa.find((p) => p.id === xi[0]);
    return { r, da: apps(sqa) - ja, db: apps(sqb) - jb, condTitular: titular && titular.condition };`);
  check("2) Copa CPU × CPU: os 11 de cada lado somam jogo, com placar:",
    r2.da === 11 && r2.db === 11 && typeof r2.r.gh === "number", JSON.stringify(r2));

  // 3) Histórico de lesões da CPU enxuto.
  const r3 = ler(`const id = Object.keys(C.standings).find((x) => x !== String(C.clubId));
    const cpu = M.semana.leagueSquadFor(id).find((p) => p.status === "ok" && p.group !== "G");
    const meu = C.squad.find((p) => p.status === "ok" && p.group !== "G");
    const guardados = [cpu, meu].map((p) => ({ p, h: p.injuryHistory, s: p.status, o: p.outUntilRound, v: p.injurySeverity, c: p.condition, y: p.yellowCards }));
    // Sorteio alternado: sem cartão (0,5), lesão (0,0001), lesão leve, menor duração.
    const sorteio = Math.random;
    try { for (let i = 0; i < 4; i++) [cpu, meu].forEach((p) => { p.status = "ok"; let n = 0; Math.random = () => (n++ % 2 ? 0.0001 : 0.5); F.applyMatchWearChunk([p], C.currentRound, 1, new Set()); }); }
    finally { Math.random = sorteio; }
    const r = { cpu: cpu.injuryHistory.slice(), meu: meu.injuryHistory.slice() };
    guardados.forEach((g) => { g.p.injuryHistory = g.h; g.p.status = g.s; g.p.outUntilRound = g.o; g.p.injurySeverity = g.v; g.p.condition = g.c; g.p.yellowCards = g.y; });
    return r;`);
  check("3) Lesão de jogador da CPU: guarda as 3 últimas, sem a fadiga; o seu jogador guarda todas, com a fadiga:",
    r3.cpu.length === 3 && r3.cpu.every((h) => !("fadigaAtInjury" in h) && h.durationRounds > 0) && r3.meu.length >= 4 && r3.meu.every((h) => "fadigaAtInjury" in h),
    JSON.stringify({ cpu: r3.cpu.length, meu: r3.meu.length, ex: r3.cpu[0] }));

  // 4) Regra desligada: só placar na outra divisão.
  const r4 = ler(`E.PARIDADE_CPU.divisoes = false;
    try {
      const compId = Object.keys(C.otherDivisions)[0];
      const jogadores = (C.divisionTeams[compId] || []).flatMap((t) => C.leagueSquads[String(t.id)] || []);
      const soma = () => jogadores.reduce((s, p) => s + (p.apps || 0), 0);
      const antes = soma(); F.resolveOtherDivisionsRound(C.currentRound); return { mudou: soma() - antes };
    } finally { E.PARIDADE_CPU.divisoes = true; }`);
  check("4) Regra desligada (só os testes de equivalência): a outra divisão volta a ser só placar:", r4.mudou === 0, JSON.stringify(r4));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
