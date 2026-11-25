// PARIDADE-CPU · E3, PR1 (20/11, D2 "Guardado por clube"): o caixa de cada
// clube da CPU fica no save (CAREER.caixaCpu) e as transferências mexem nos
// dois lados. Sem navegador, pela ponte (_sem_tela.js), perfil frozen.
//  1) O caixa nasce no "normal" do porte (6 tetos de folha) e fica no save.
//  2) O mercado olha o caixa guardado: sem dinheiro, o clube não pode pagar
//     um jogador caro (financeiroScore 0); com o normal, pode.
//  3) Você vende para a CPU (proposta recebida aceita): o caixa do comprador
//     cai o valor pago e o seu sobe.
//  4) CPU × CPU: o dinheiro sai de um caixa e entra no outro (com vagas
//     abertas nos elencos, que nascem cheios).
//  5) Virada: as receitas menos a folha levam o caixa metade do caminho até
//     o normal (quem estava zerado volta a meio caminho).
//  6) Regra desligada (equivalência): sem caixa guardado, o derivado de antes.
const { check } = require("./_check");
const { abrirPagina } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  // ECON-001b: estes casos conferem a regra da CPU de antes (a dos saves sem a
  // economia v2); a v2 tem teste próprio (tests/unit/test_economia_mercado.js).
  pg.rodar("window.BRDATA_MOTOR.economia.ECONOMIA_V2.ativa = false;", "economia");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, S = M.semana, MC = M.mercado, C = E.carreiraAtual();
    const ids = Object.keys(C.standings).filter((x) => x !== String(C.clubId));
    const normal = (id) => MC.clubBudget({ squad: S.leagueSquadFor(id) }).cash;
    ${codigo} })())`, "teste"));

  // 1) Caixa inicial.
  const r1 = ler(`const id = ids[0]; const c = S.caixaDaCpu(id); const lidoGrava = !!(C.caixaCpu && C.caixaCpu[id] != null);
    S.moverCaixaCpu(id, 1000); return { c, normal: normal(id), lidoGrava, noSave: C.caixaCpu[id], meu: S.caixaDaCpu(C.clubId) };`);
  check("1) O caixa da CPU nasce no normal do porte; ler não grava, a primeira movimentação grava no save; o seu clube não tem caixa da CPU:",
    r1.c > 0 && r1.c === r1.normal && !r1.lidoGrava && r1.noSave === r1.c + 1000 && r1.meu === null, JSON.stringify(r1));

  // 2) O mercado olha o caixa guardado.
  const r2 = ler(`const id = ids[1]; const caro = C.squad.slice().sort((a, b) => b.value - a.value)[0];
    const antes = S.caixaDaCpu(id); C.caixaCpu = C.caixaCpu || {};
    const comNormal = S.financeiroScore(caro, S.leagueSquadFor(id), id);
    C.caixaCpu[id] = 0; const semDinheiro = S.financeiroScore(caro, S.leagueSquadFor(id), id);
    C.caixaCpu[id] = antes; return { comNormal, semDinheiro, valor: caro.value, caixa: antes };`);
  check("2) Sem dinheiro no caixa, o clube não consegue pagar um jogador caro; com o caixa normal, consegue:",
    r2.comNormal > 0 && r2.semDinheiro === 0, JSON.stringify(r2));

  // 3) Você vende para a CPU.
  const r3 = ler(`const id = ids[2]; const p = C.squad.find((x) => x.origin === "principal" && x.group === "M");
    const fee = 1000000; const antes = S.caixaDaCpu(id), meuAntes = C.finances.cash;
    C.pendingOffer = { playerId: p.id, playerName: p.name, clubId: id, clubName: E.timePorId(id).name, fee };
    M.clube.acceptOffer();
    return { cpu: C.caixaCpu[id] - antes, meu: C.finances.cash - meuAntes, foi: S.leagueSquadFor(id).some((x) => x.id === p.id), fee };`);
  check("3) Você vende para a CPU: o caixa do comprador cai o valor pago e o seu sobe o mesmo:",
    r3.cpu === -r3.fee && r3.meu === r3.fee && r3.foi, JSON.stringify(r3));

  // 4) CPU × CPU (janela aberta, sorteio que faz uma transferência).
  // (Os elencos da CPU nascem cheios: abre 3 vagas em cada para o sorteio.)
  const r4 = ler(`C.caixaCpu = C.caixaCpu || {}; Object.keys(C.leagueSquads).forEach((id) => { C.caixaCpu[id] = S.caixaDaCpu(id); C.leagueSquads[id].splice(-3, 3); });
    const total = () => Object.values(C.caixaCpu).reduce((s, v) => s + v, 0);
    const t0 = total(), log0 = (C.transferLog || []).length;
    let tentativas = 0;
    while ((C.transferLog || []).length === log0 && tentativas < 200) { S.simulateAiTransfers(C.currentRound); tentativas++; }
    const linha = (C.transferLog || [])[0];
    return { total: total() - t0, transferiu: (C.transferLog || []).length > log0, tentativas, linha: linha && linha.text };`);
  check("4) CPU × CPU: o dinheiro sai de um caixa e entra no outro (a soma dos caixas da CPU não muda):",
    r4.transferiu && r4.total === 0, JSON.stringify(r4));

  // 5) Virada.
  const r5 = ler(`const id = ids[3]; C.caixaCpu = C.caixaCpu || {}; C.caixaCpu[id] = 0; S.viradaDoCaixaCpu();
    return { c: C.caixaCpu[id], metade: Math.round(0.5 * normal(id)) };`);
  check("5) Virada: quem estava zerado volta a meio caminho do normal (receitas menos folha):",
    Math.abs(r5.c - r5.metade) <= 1, JSON.stringify(r5));

  // 6) Regra desligada.
  const r6 = ler(`E.PARIDADE_CPU.financas = false;
    try { const id = ids[4]; return { c: S.caixaDaCpu(id), b: MC.clubBudget(S.marketClub(id)).cash, normal: normal(id) }; }
    finally { E.PARIDADE_CPU.financas = true; }`);
  check("6) Regra desligada (só os testes de equivalência): sem caixa guardado, o orçamento derivado de antes:",
    r6.c === null && r6.b === r6.normal, JSON.stringify(r6));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
