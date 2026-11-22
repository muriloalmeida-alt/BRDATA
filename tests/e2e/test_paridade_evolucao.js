// PARIDADE-CPU · E4, PR1 (22/11): a CPU evolui pelo mesmo treino semanal e
// pela mesma evolução por rodada jogada do seu elenco, e tem moral pela regra
// da sua partida (CPU-09; decisões do Murilo "Treino semanal igual ao seu" e
// "Mesma regra, sem conversas"). Sem navegador, pela ponte, perfil frozen.
//  1) Semana de treino: jogador da CPU com espaço até o potencial evolui pela
//     regra do seu treino; sem histórico de fadiga nem tendência no save.
//  2) Jogo de liga da CPU: titulares zeram a sequência de banco e, vencendo,
//     ganham moral (+5); quem não jogou soma banco.
//  3) Moral baixa e banco seguido: pede para sair e entra nos motivos de venda
//     como "Insatisfeito".
//  4) Virada: sem a evolução anual de antes (quem fica mantém o overall).
//  5) Regra desligada (equivalência): a semana da CPU só mexe na condição.
const { check } = require("./_check");
const { abrirPagina } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, S = M.semana, F = M.fechamento, C = E.carreiraAtual();
    const ids = Object.keys(C.standings).filter((x) => x !== String(C.clubId));
    ${codigo} })())`, "teste"));

  // 1) Semana de treino.
  const r1 = ler(`const sq = S.leagueSquadFor(ids[0]);
    const alvo = sq.find((p) => p.potential != null && p.potential - p.overall >= 5 && p.age <= 23) || sq.find((p) => p.potential != null && p.potential > p.overall);
    const antes = { overall: alvo.overall, atk: alvo.atk, def: alvo.def, phys: alvo.phys };
    C.trainingAppliedForRound = null;
    const sorteio = Math.random; Math.random = () => 0;
    try { S.applyWeeklyTraining(); } finally { Math.random = sorteio; }
    const depois = { overall: alvo.overall, atk: alvo.atk, def: alvo.def, phys: alvo.phys };
    const ganho = Object.keys(antes).reduce((s, k) => s + (depois[k] - antes[k]), 0);
    return { antes, depois, ganho, potencial: alvo.potential, fadiga: sq.some((p) => p.fatigueHistory), tendencia: sq.some((p) => p.attrTrend) };`);
  check("1) Semana de treino: o jogador da CPU com espaço até o potencial evolui (regra do seu treino), sem histórico de fadiga nem tendência no save:",
    r1.ganho > 0 && !r1.fadiga && !r1.tendencia, JSON.stringify(r1));

  // 2) Jogo de liga da CPU.
  const r2 = ler(`const [a, b] = [ids[1], ids[2]];
    const sa = S.leagueSquadFor(a); sa.forEach((p) => { p.morale = 60; p.benchStreak = 2; });
    let res, tentativa = 0;
    do { sa.forEach((p) => { p.morale = 60; p.benchStreak = 2; }); res = F.jogoCpuComJogadores({ home: a, away: b }, C.currentRound, E.timePorId(a), E.timePorId(b), true); tentativa++; }
    while (!(res.gh > res.ga) && tentativa < 30);
    const xi = F.escalacaoDaCpu(a, C.currentRound).starters.map((p) => p.id);
    const titulares = sa.filter((p) => p.benchStreak === 0);
    const fora = sa.filter((p) => p.benchStreak === 3);
    return { venceu: res.gh > res.ga, titulares: titulares.length, moralTit: [...new Set(titulares.map((p) => p.morale))], fora: fora.length };`);
  check("2) Jogo de liga da CPU: titulares zeram a sequência de banco e, vencendo, ganham +5 de moral; quem não jogou soma banco:",
    r2.venceu && r2.titulares === 11 && r2.moralTit.length === 1 && r2.moralTit[0] === 65 && r2.fora >= 11, JSON.stringify(r2));

  // 3) Pede para sair.
  const r3 = ler(`const [a, b] = [ids[3], ids[4]]; const sa = S.leagueSquadFor(a);
    const xi = new Set(F.escalacaoDaCpu(a, C.currentRound).starters.map((p) => p.id));
    const p = sa.filter((x) => !xi.has(x.id) && x.group !== "G").sort((x, y) => x.overall - y.overall)[0];
    p.morale = 18; p.benchStreak = 6;
    F.jogoCpuComJogadores({ home: a, away: b }, C.currentRound, E.timePorId(a), E.timePorId(b), true);
    return { quer: p.wantsTransfer, moral: p.morale, motivos: M.negociacao.motivosAVendaNoClube(p, a) };`);
  check("3) Moral baixa e banco seguido: o jogador da CPU pede para sair e entra nos motivos de venda como \"Insatisfeito\":",
    r3.quer === true && r3.motivos.includes("insatisfeito"), JSON.stringify(r3));

  // 4) Virada sem evolução anual.
  const r4 = ler(`const id = ids[5], club = E.timePorId(id), sq = S.leagueSquadFor(id).map((p) => ({ ...p, contractUntil: C.seasonYear + 3 }));
    const novo = M.virada.renewLeagueSquad(club, sq);
    const mudou = sq.filter((p) => { const n = novo.find((x) => x.id === p.id); return n && n.overall !== p.overall; }).length;
    return { mudou, total: sq.length };`);
  check("4) Virada: sem a evolução anual de antes (quem fica mantém o overall; a evolução é a semanal):", r4.mudou === 0, JSON.stringify(r4));

  // 5) Regra desligada.
  const r5 = ler(`E.PARIDADE_CPU.evolucao = false;
    try { const sq = S.leagueSquadFor(ids[6]); const antes = sq.map((p) => p.overall + p.atk + p.def + p.phys).join();
      C.trainingAppliedForRound = null; const sorteio = Math.random; Math.random = () => 0;
      try { S.applyWeeklyTraining(); } finally { Math.random = sorteio; }
      return { igual: sq.map((p) => p.overall + p.atk + p.def + p.phys).join() === antes }; }
    finally { E.PARIDADE_CPU.evolucao = true; }`);
  check("5) Regra desligada (só os testes de equivalência): a semana da CPU só mexe na condição:", r5.igual, JSON.stringify(r5));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
