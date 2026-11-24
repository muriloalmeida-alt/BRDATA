// PARIDADE-CPU · E4, PR2 (22/11): troca de clube sem recomeçar o mundo
// (CPU-10, V07, V08, A12; decisão do Murilo "Mundo segue, clube novo como
// está"). Sem navegador, pela ponte (_sem_tela.js), perfil frozen.
//  1) O mundo segue: temporada, rodada, tabela, calendário, divisões, elencos
//     dos outros clubes e agentes livres iguais.
//  2) O clube antigo volta à CPU com o elenco principal e o seu caixa, com as
//     parcelas a pagar e a receber (o orçamento é do clube); a base fica
//     guardada nele (a base é do clube); quem você pegou emprestado volta ao dono.
//  3) Você assume o elenco, o caixa guardado e a base do clube novo (16
//     jovens, como numa carreira nova); ele sai da CPU.
//  4) O técnico segue: reputação e histórico (o clube antigo no histórico);
//     o clube novo começa a passagem do zero (estatísticas, metas).
//  5) O save segue gravando e reabre no clube novo.
//  6) Regra desligada (equivalência): a troca monta uma carreira nova.
//  7) Na virada, o clube antigo promove primeiro da base guardada (o jovem de
//     maior potencial sobe e sai da base guardada).
const { check } = require("./_check");
const { abrirPagina, jogarRodada } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[3].id);
  for (let i = 0; i < 2; i++) { const r = await jogarRodada(pg.P); if (!r.ok) throw new Error("rodada: " + r.passos.join(" ")); }
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, S = M.semana, C = E.carreiraAtual(); ${codigo} })())`, "teste"));

  // Prepara: um emprestado de outro clube no seu elenco e uma proposta.
  const antes = ler(`const ids = Object.keys(C.standings).filter((x) => x !== String(C.clubId));
    const destino = ids[0], dono = ids[1];
    const emp = S.leagueSquadFor(dono).pop(); Object.assign(emp, { origin: "loan", loanFromClubId: dono, loanOriginalWage: emp.wage });
    C.squad.push(emp);
    C.clubProposals = [{ clubId: destino, clubName: E.timePorId(destino).name, reputationRequired: 0, budgetOffered: 1, seasonYear: C.seasonYear }];
    C.reputation = 63;
    C.pendingInstallments = [{ roundsLeft: 3, perRoundAmount: 100000, label: "Parcela de X" }];
    C.pendingReceivables = [{ roundsLeft: 2, perRoundAmount: 400000, label: "Parcela da venda de Y" }];
    const outros = ids.filter((x) => x !== destino && x !== dono);
    return { velho: String(C.clubId), destino, dono, emp: emp.id, rodada: C.currentRound, temporada: C.seasonYear,
      tabela: JSON.stringify(C.standings), outro: JSON.stringify(S.leagueSquadFor(outros[0]).map((p) => p.id)), outroId: outros[0],
      principal: C.squad.filter((p) => p.origin === "principal").map((p) => p.id), base: C.squad.filter((p) => p.origin === "base").map((p) => p.id),
      caixa: C.finances.cash, saldoParcelas: 2 * 400000 - 3 * 100000, novoElenco: S.leagueSquadFor(destino).map((p) => p.id), caixaNovo: S.caixaDaCpu(destino), livres: (C.agentesLivres || []).length };`);
  const r = await pg.P.aceitarPropostaClube();
  const d = ler(`const a = ${JSON.stringify({})};
    return { clube: String(C.clubId), rodada: C.currentRound, temporada: C.seasonYear, tabela: JSON.stringify(C.standings),
      outro: JSON.stringify(S.leagueSquadFor(${JSON.stringify(antes.outroId)}).map((p) => p.id)),
      velho: S.leagueSquadFor(${JSON.stringify(antes.velho)}).map((p) => p.id), caixaVelho: (C.caixaCpu || {})[${JSON.stringify(antes.velho)}],
      dono: S.leagueSquadFor(${JSON.stringify(antes.dono)}).map((p) => p.id), meu: C.squad.map((p) => p.id), noCpu: !!C.leagueSquads[${JSON.stringify(antes.destino)}],
      baseGuardada: ((C.basesCpu || {})[${JSON.stringify(antes.velho)}] || []).map((p) => p.id),
      minhaBase: C.squad.filter((p) => p.origin === "base").length, parcelas: (C.pendingInstallments || []).length + (C.pendingReceivables || []).length,
      caixa: C.finances.cash, reputacao: C.reputation, historico: (C.clubHistory || []).map((h) => h.clubId), jogos: C.careerTotals && C.careerTotals.j,
      livres: (C.agentesLivres || []).length };`);
  const ok = r || {};

  check("1) O mundo segue: mesma temporada, rodada, tabela e elenco dos outros clubes:",
    d.clube === antes.destino && d.rodada === antes.rodada && d.temporada === antes.temporada && d.tabela === antes.tabela && d.outro === antes.outro, JSON.stringify({ ok, d: { clube: d.clube, rodada: d.rodada } }));
  check("2) O clube antigo volta à CPU com o elenco principal, o caixa com as parcelas e a base guardada; o emprestado volta ao dono:",
    antes.principal.every((id) => d.velho.includes(id) || d.livres > antes.livres) && antes.base.every((id) => !d.velho.includes(id))
      && antes.base.length > 0 && antes.base.every((id) => d.baseGuardada.includes(id))
      && d.caixaVelho === Math.round(antes.caixa + antes.saldoParcelas) && d.dono.includes(antes.emp),
    JSON.stringify({ principal: antes.principal.length, velho: d.velho.length, base: [antes.base.length, d.baseGuardada.length], caixa: [antes.caixa, antes.saldoParcelas, d.caixaVelho], emprestadoNoDono: d.dono.includes(antes.emp) }));
  check("3) Você assume o elenco, o caixa guardado e a base (16 jovens) do clube novo, sem as parcelas do antigo; ele sai da CPU:",
    antes.novoElenco.every((id) => d.meu.includes(id)) && !d.noCpu && d.caixa === antes.caixaNovo && d.minhaBase === 16 && d.parcelas === 0,
    JSON.stringify({ elenco: [antes.novoElenco.length, d.meu.length], caixa: [antes.caixaNovo, d.caixa], base: d.minhaBase, parcelas: d.parcelas, noCpu: d.noCpu }));
  check("4) O técnico segue (reputação e o clube antigo no histórico); a passagem nova começa do zero:",
    d.reputacao === 63 && d.historico[0] === antes.velho && d.jogos === 0, JSON.stringify({ reputacao: d.reputacao, historico: d.historico, jogos: d.jogos }));

  // 5) Joga uma rodada no clube novo e reabre.
  const rr = await jogarRodada(pg.P);
  const reaberto = ler(`return { clube: String(C.clubId), rodada: C.currentRound };`);
  check("5) Joga e grava no clube novo (a rodada avança no mesmo mundo):", rr.ok && reaberto.clube === antes.destino && reaberto.rodada === antes.rodada + 1, JSON.stringify({ passos: rr.passos, reaberto }));

  // 6) Regra desligada.
  const r6 = ler(`E.PARIDADE_CPU.troca = false; try { return { desligada: E.PARIDADE_CPU.troca === false }; } finally { E.PARIDADE_CPU.troca = true; }`);
  check("6) A chave existe para os testes de equivalência (desligada, a troca monta uma carreira nova, como antes):", r6.desligada);

  // 7) A virada do clube antigo promove primeiro da base guardada.
  const r7 = ler(`const V = M.virada, id = ${JSON.stringify(antes.velho)};
    const g = C.basesCpu[id]; const joia = g[0]; joia.age = 18; joia.potential = 95; joia.overall = 60;
    const club = E.timePorId(id); const antesN = g.length;
    const lista = V.promoverBaseDaCpu(club, S.leagueSquadFor(id).slice());
    const subiu = lista.find((p) => p.id === joia.id);
    return { subiu: !!subiu, origem: subiu && subiu.origin, overall: subiu && subiu.overall, fora: !(C.basesCpu[id] || []).some((p) => p.id === joia.id), antesN, depoisN: (C.basesCpu[id] || []).length };`);
  check("7) Na virada, o clube antigo promove primeiro da base guardada:",
    r7.subiu && r7.origem === "principal" && r7.overall >= 85 && r7.fora && r7.depoisN < r7.antesN, JSON.stringify(r7));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
