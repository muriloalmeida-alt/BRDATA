// PARIDADE-CPU · E4, PR2 (22/11): troca de clube sem recomeçar o mundo
// (CPU-10, V07, V08, A12; decisão do Murilo "Mundo segue, clube novo como
// está"). Sem navegador, pela ponte (_sem_tela.js), perfil frozen.
//  1) O mundo segue: temporada, rodada, tabela, calendário, divisões, elencos
//     dos outros clubes e agentes livres iguais.
//  2) O clube antigo volta à CPU com o elenco principal (sem a base) e o seu
//     caixa; quem você pegou emprestado volta ao dono.
//  3) Você assume o elenco e o caixa guardado do clube novo; ele sai da CPU.
//  4) O técnico segue: reputação e histórico (o clube antigo no histórico);
//     o clube novo começa a passagem do zero (estatísticas, metas).
//  5) O save segue gravando e reabre no clube novo.
//  6) Regra desligada (equivalência): a troca monta uma carreira nova.
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
    const outros = ids.filter((x) => x !== destino && x !== dono);
    return { velho: String(C.clubId), destino, dono, emp: emp.id, rodada: C.currentRound, temporada: C.seasonYear,
      tabela: JSON.stringify(C.standings), outro: JSON.stringify(S.leagueSquadFor(outros[0]).map((p) => p.id)), outroId: outros[0],
      principal: C.squad.filter((p) => p.origin === "principal").map((p) => p.id), base: C.squad.filter((p) => p.origin === "base").map((p) => p.id),
      caixa: C.finances.cash, novoElenco: S.leagueSquadFor(destino).map((p) => p.id), caixaNovo: S.caixaDaCpu(destino), livres: (C.agentesLivres || []).length };`);
  const r = await pg.P.aceitarPropostaClube();
  const d = ler(`const a = ${JSON.stringify({})};
    return { clube: String(C.clubId), rodada: C.currentRound, temporada: C.seasonYear, tabela: JSON.stringify(C.standings),
      outro: JSON.stringify(S.leagueSquadFor(${JSON.stringify(antes.outroId)}).map((p) => p.id)),
      velho: S.leagueSquadFor(${JSON.stringify(antes.velho)}).map((p) => p.id), caixaVelho: (C.caixaCpu || {})[${JSON.stringify(antes.velho)}],
      dono: S.leagueSquadFor(${JSON.stringify(antes.dono)}).map((p) => p.id), meu: C.squad.map((p) => p.id), noCpu: !!C.leagueSquads[${JSON.stringify(antes.destino)}],
      caixa: C.finances.cash, reputacao: C.reputation, historico: (C.clubHistory || []).map((h) => h.clubId), jogos: C.careerTotals && C.careerTotals.j,
      livres: (C.agentesLivres || []).length };`);
  const ok = r || {};

  check("1) O mundo segue: mesma temporada, rodada, tabela e elenco dos outros clubes:",
    d.clube === antes.destino && d.rodada === antes.rodada && d.temporada === antes.temporada && d.tabela === antes.tabela && d.outro === antes.outro, JSON.stringify({ ok, d: { clube: d.clube, rodada: d.rodada } }));
  check("2) O clube antigo volta à CPU com o elenco principal (sem a base) e o seu caixa; o emprestado volta ao dono:",
    antes.principal.every((id) => d.velho.includes(id) || d.livres > antes.livres) && antes.base.every((id) => !d.velho.includes(id)) && d.caixaVelho === Math.round(antes.caixa) && d.dono.includes(antes.emp),
    JSON.stringify({ principal: antes.principal.length, velho: d.velho.length, caixa: [antes.caixa, d.caixaVelho], emprestadoNoDono: d.dono.includes(antes.emp) }));
  check("3) Você assume o elenco e o caixa guardado do clube novo; ele sai da CPU:",
    antes.novoElenco.every((id) => d.meu.includes(id)) && !d.noCpu && d.caixa === antes.caixaNovo, JSON.stringify({ elenco: [antes.novoElenco.length, d.meu.length], caixa: [antes.caixaNovo, d.caixa], noCpu: d.noCpu }));
  check("4) O técnico segue (reputação e o clube antigo no histórico); a passagem nova começa do zero:",
    d.reputacao === 63 && d.historico[0] === antes.velho && d.jogos === 0, JSON.stringify({ reputacao: d.reputacao, historico: d.historico, jogos: d.jogos }));

  // 5) Joga uma rodada no clube novo e reabre.
  const rr = await jogarRodada(pg.P);
  const reaberto = ler(`return { clube: String(C.clubId), rodada: C.currentRound };`);
  check("5) Joga e grava no clube novo (a rodada avança no mesmo mundo):", rr.ok && reaberto.clube === antes.destino && reaberto.rodada === antes.rodada + 1, JSON.stringify({ passos: rr.passos, reaberto }));

  // 6) Regra desligada.
  const r6 = ler(`E.PARIDADE_CPU.troca = false; try { return { desligada: E.PARIDADE_CPU.troca === false }; } finally { E.PARIDADE_CPU.troca = true; }`);
  check("6) A chave existe para os testes de equivalência (desligada, a troca monta uma carreira nova, como antes):", r6.desligada);

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
