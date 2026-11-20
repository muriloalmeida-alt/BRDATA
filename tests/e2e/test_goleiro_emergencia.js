// O2 (decisão do Murilo 19/11, "Base de emergência"): sem goleiro disponível
// para titular e banco, o "Completar automaticamente" (e a escalação
// automática com a base) sobe da base goleiros gerados na hora, com aviso, e o
// jogo pode começar. Sem navegador, pela ponte (_sem_tela.js).
//  1) Um só goleiro disponível: sobe 1 da base; escalação válida; aviso e
//     notificação; o goleiro fica no elenco (origem base) e no save.
//  2) Nenhum goleiro disponível: sobem 2; escalação válida.
//  3) Com 2 goleiros disponíveis, ninguém sobe.
//  4) Escalação automática com a base: o mesmo socorro.
//  5) O jogo começa (sem bloqueio da escalação).
const { check } = require("./_check");
const { abrirPagina } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, C = E.carreiraAtual(); ${codigo} })())`, "teste"));
  const avisos = [];
  pg.rodar("window.__avisos = []; window.BRDATA_MOTOR.eventos.ouvir && window.BRDATA_MOTOR.eventos.ouvir('aviso', (a) => window.__avisos.push(a));", "avisos");
  const deixarGoleiros = (n) => ler(`
    const gks = C.squad.filter((p) => p.group === "G");
    gks.forEach((p, i) => { if (i >= ${n}) { p.status = "contundido"; p.outUntilRound = C.currentRound + 5; } else { p.status = "ok"; p.outUntilRound = null; } });
    return gks.length;`);
  const estado = () => ler(`
    const v = M.escalacao.validarEscalacao(C.lineup, C.squad, C.currentRound);
    return { valida: v.valida, pend: v.pendencias.map((p) => p.tipo), base: C.squad.filter((p) => p.group === "G" && String(p.id).includes("_gol_")).map((p) => ({ id: p.id, origem: p.origin })), notif: (C.notifications || []).filter((n) => /da base/.test(n.text)).length };`);

  // 1) Um goleiro disponível.
  const totalG = deixarGoleiros(1);
  const r1 = await pg.rodar("window.BRDATA_MOTOR.ponte.comandosGestao.completarEscalacao()", "completar");
  const e1 = estado();
  const salvo1 = (await pg.api("/api/career")).career;
  check("1) Um só goleiro disponível: sobe 1 da base, a escalação fica válida, há notificação e o goleiro está no save:",
    r1.ok && r1.valida && r1.goleirosDaBase.length === 1 && e1.valida && e1.base.length === 1 && e1.base[0].origem === "base" && e1.notif === 1
      && salvo1.squad.some((p) => p.id === e1.base[0].id),
    JSON.stringify({ totalG, r1, e1 }));

  // 2) Nenhum disponível (o da base de antes também lesionado).
  ler(`C.squad.filter((p) => p.group === "G").forEach((p) => { p.status = "contundido"; p.outUntilRound = C.currentRound + 5; }); return 0;`);
  const r2 = await pg.rodar("window.BRDATA_MOTOR.ponte.comandosGestao.completarEscalacao()", "completar");
  const e2 = estado();
  check("2) Nenhum goleiro disponível: sobem 2 da base (outros, não os de antes) e a escalação fica válida:",
    r2.ok && r2.valida && r2.goleirosDaBase.length === 2 && e2.valida && e2.base.length === 3 && new Set(e2.base.map((b) => b.id)).size === 3 && !r2.goleirosDaBase.some((g) => g.nome === r1.goleirosDaBase[0].nome), JSON.stringify({ r2, e2 }));

  // 3) Com 2 disponíveis, ninguém sobe.
  const r3 = await pg.rodar("window.BRDATA_MOTOR.ponte.comandosGestao.completarEscalacao()", "completar");
  check("3) Com 2 goleiros disponíveis, ninguém sobe:", r3.ok && r3.goleirosDaBase.length === 0, JSON.stringify(r3));

  // 4) Escalação automática com a base.
  ler(`C.squad.filter((p) => p.group === "G").forEach((p, i) => { p.status = i > 0 ? "contundido" : "ok"; p.outUntilRound = i > 0 ? C.currentRound + 5 : null; }); return 0;`);
  const antes4 = estado().base.length;
  const g4 = await pg.P.escalarAutomaticamente(true);
  const e4 = estado();
  check("4) Escalação automática com a base: o mesmo socorro (sobe 1) e a escalação fica válida:",
    g4 && g4.ok && e4.base.length === antes4 + 1 && e4.valida, JSON.stringify({ antes4, e4 }));

  // 5) O jogo começa.
  await pg.P.avancarSemana(true);
  const i5 = pg.P.iniciar();
  check("5) O jogo começa sem bloqueio da escalação:", i5 && i5.ok, JSON.stringify(i5));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
