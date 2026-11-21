// PARIDADE-CPU · E1a, PR1 (18/11): a CPU convoca 11 titulares e 11 reservas
// pela mesma escalação automática do seu time (virada.convocacaoDaCpu), com
// o banco completado pela base gerada na hora quando o elenco é curto (D7),
// recupera condição de quem não jogou e volta de lesão e suspensão como o
// seu elenco (achados A2, A4 e A5 do E0). Sem navegador, pela ponte
// (_sem_tela.js), com o catálogo real congelado (perfil frozen).
//  1) Todo clube da CPU da sua divisão: escalação válida pela regra do seu
//     time (escalacao.validarEscalacao: 11+11, goleiro titular e no banco,
//     ninguém repetido, todos disponíveis).
//  2) Lesionado e suspenso não são convocados.
//  3) Elenco curto: o banco é completado com a base gerada na hora (ids
//     cpubase_), sempre a mesma, sem ir para o save.
//  4) Série D sem elenco no save: convoca do elenco gerado de 22.
//  5) Depois da rodada: o reserva cansado da CPU recupera condição e o
//     lesionado com retorno vencido volta (antes, só na virada).
//  6) Regra desligada (testes de equivalência): o XI de sempre e banco vazio.
const { check } = require("./_check");
const { abrirPagina, jogarRodada } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, F = M.fechamento, C = E.carreiraAtual(); ${codigo} })())`, "teste"));

  // 1) Todos os clubes da CPU da sua divisão.
  const r1 = ler(`
    const ids = Object.keys(C.standings).filter((id) => id !== String(C.clubId));
    return ids.map((id) => {
      const e = F.escalacaoDaCpu(id, C.currentRound);
      const elenco = [...M.semana.leagueSquadFor(id), ...e.starters, ...e.bench];
      const v = M.escalacao.validarEscalacao({ starters: e.starters.map((p) => p.id), bench: e.bench.map((p) => p.id) }, elenco, C.currentRound);
      return { id, valida: v.valida, pend: v.pendencias.map((p) => p.tipo), t: e.starters.length, b: e.bench.length, base: e.baseUsada, formacao: e.formation };
    });`);
  check("1) Todo clube da CPU da sua divisão convoca 11+11 válidos pela regra do seu time (goleiro titular e no banco, todos disponíveis):",
    r1.length === 19 && r1.every((x) => x.valida && x.t === 11 && x.b === 11 && x.formacao === "4-4-2"),
    JSON.stringify(r1.filter((x) => !x.valida).slice(0, 3).concat([{ clubes: r1.length, comBase: r1.filter((x) => x.base > 0).length }])));

  // 2) Lesionado e suspenso ficam fora.
  const r2 = ler(`
    const id = Object.keys(C.standings).find((x) => x !== String(C.clubId));
    const sq = M.semana.leagueSquadFor(id);
    const antes = F.escalacaoDaCpu(id, C.currentRound);
    const [a, b] = antes.starters.filter((p) => p.group !== "G");
    a.status = "contundido"; a.outUntilRound = C.currentRound + 3; b.status = "suspenso"; b.outUntilRound = C.currentRound + 1;
    const depois = F.escalacaoDaCpu(id, C.currentRound);
    const todos = [...depois.starters, ...depois.bench].map((p) => p.id);
    const r = { fora: !todos.includes(a.id) && !todos.includes(b.id), t: depois.starters.length, b: depois.bench.length };
    a.status = "ok"; a.outUntilRound = null; b.status = "ok"; b.outUntilRound = null;
    return r;`);
  check("2) Lesionado e suspenso não são convocados; a escalação segue com 11+11:", r2.fora && r2.t === 11 && r2.b === 11, JSON.stringify(r2));

  // 3) Elenco curto: base gerada na hora, sempre a mesma, fora do save.
  const r3 = ler(`
    const id = Object.keys(C.standings).find((x) => x !== String(C.clubId));
    const sq = C.leagueSquads[id];
    const guardado = sq.slice();
    C.leagueSquads[id] = sq.slice(0, 15);
    const e1 = F.escalacaoDaCpu(id, C.currentRound), e2 = F.escalacaoDaCpu(id, C.currentRound);
    const ids1 = [...e1.starters, ...e1.bench].map((p) => p.id), ids2 = [...e2.starters, ...e2.bench].map((p) => p.id);
    const r = { base: e1.baseUsada, mesma: JSON.stringify(ids1) === JSON.stringify(ids2), prefixo: ids1.filter((x) => String(x).startsWith("cpubase_")).length,
      noSave: C.leagueSquads[id].some((p) => String(p.id).startsWith("cpubase_")), t: e1.starters.length, b: e1.bench.length,
      valida: M.escalacao.validarEscalacao({ starters: e1.starters.map((p) => p.id), bench: e1.bench.map((p) => p.id) }, [...C.leagueSquads[id], ...e1.starters, ...e1.bench], C.currentRound).valida };
    C.leagueSquads[id] = guardado;
    return r;`);
  check("3) Elenco curto (15): o banco é completado com a base gerada na hora (sempre a mesma), sem ir para o save; escalação válida:",
    r3.base === 7 && r3.prefixo === 7 && r3.mesma && !r3.noSave && r3.t === 11 && r3.b === 11 && r3.valida, JSON.stringify(r3));

  // 4) Série D sem elenco no save.
  const r4 = ler(`
    const d = C.serieDPool.find((t) => !(C.elencosSerieD || {})[String(t.id)]);
    const e = F.escalacaoDaCpu(d.id, C.currentRound);
    return { t: e.starters.length, b: e.bench.length, base: e.baseUsada, noSave: !!(C.elencosSerieD || {})[String(d.id)] };`);
  check("4) Clube da Série D sem elenco no save convoca 11+11 do elenco gerado de 22, sem base e sem gravar:",
    r4.t === 11 && r4.b === 11 && r4.base === 0 && !r4.noSave, JSON.stringify(r4));

  // 5) Recuperação e retorno depois da rodada.
  const prep = ler(`
    const fx = C.schedule[C.currentRound].find((f) => String(f.home) !== String(C.clubId) && String(f.away) !== String(C.clubId));
    const id = String(fx.home);
    const e = F.escalacaoDaCpu(id, C.currentRound);
    const conv = new Set([...e.starters, ...e.bench].map((p) => p.id));
    const fora = M.semana.leagueSquadFor(id).filter((p) => !conv.has(p.id) && p.status === "ok");
    const cansado = fora[0] || e.bench[e.bench.length - 1];
    cansado.condition = 50;
    const les = M.semana.leagueSquadFor(id).find((p) => p !== cansado && !e.starters.includes(p));
    les.status = "contundido"; les.outUntilRound = C.currentRound; les.injurySeverity = "leve";
    return { id, cansado: cansado.id, les: les.id, rodada: C.currentRound };`);
  const rr = await jogarRodada(pg.P);
  const r5 = ler(`
    // (O mercado da CPU pode ter levado o jogador para outro clube na rodada.)
    const sq = [...Object.values(C.leagueSquads).flat(), ...(C.agentesLivres || [])];
    const p = (id) => sq.find((x) => x.id === id) || {};
    return { rodada: C.currentRound, cond: p(${JSON.stringify(prep.cansado)}).condition, status: p(${JSON.stringify(prep.les)}).status };`);
  check("5) Depois da rodada: o reserva cansado da CPU recupera condição e o lesionado com retorno vencido volta:",
    rr.ok && r5.rodada === prep.rodada + 1 && r5.cond > 50 && r5.status === "ok", JSON.stringify({ prep, r5, passos: rr.passos }));

  // 6) Regra desligada.
  const r6 = ler(`
    E.PARIDADE_CPU.convocacao = false;
    try {
      const id = Object.keys(C.standings).find((x) => x !== String(C.clubId));
      const e = F.escalacaoDaCpu(id, C.currentRound);
      const xi = F.pickCpuXI(M.semana.leagueSquadFor(id));
      return { mesmo: JSON.stringify(e.starters.map((p) => p.id)) === JSON.stringify(xi.map((p) => p.id)), banco: e.bench.length };
    } finally { E.PARIDADE_CPU.convocacao = true; }`);
  check("6) Regra desligada (só os testes de equivalência): o XI de sempre e banco vazio:", r6.mesmo && r6.banco === 0, JSON.stringify(r6));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
