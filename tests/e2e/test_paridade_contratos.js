// PARIDADE-CPU · E3, PR3 (22/11): contratos da CPU e agentes livres (CPU-08;
// decisão do Murilo "Lista de agentes livres"). Sem navegador, pela ponte
// (_sem_tela.js), perfil frozen.
//  1) Virada: quem a CPU não renova vai para os agentes livres; a vaga é
//     ocupada primeiro por um agente livre da mesma posição e do nível.
//  2) Quem está livre desde antes da temporada que acabou sai da lista.
//  3) Você contrata um agente livre sem taxa, só com o salário pedido, por 2
//     temporadas; a ponte lista os agentes livres no mercado.
//  4) Salário acima do teto: não contrata e o jogador continua livre.
//  5) Cláusula de compra da CPU: decide pelo preço, caixa e papel no elenco
//     (sem sorteio): paga até 1,2× o valor se ele não for reserva.
//  6) Regra desligada (equivalência): a virada não mexe nos agentes livres.
const { check } = require("./_check");
const { abrirPagina } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[0].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, S = M.semana, V = M.virada, C = E.carreiraAtual();
    const ids = Object.keys(C.leagueSquads);
    ${codigo} })())`, "teste"));

  // 1) Virada de um elenco.
  const r1 = ler(`const id = ids[0], club = E.timePorId(id), sq = S.leagueSquadFor(id).map((p) => ({ ...p }));
    const velho = sq.find((p) => p.group === "M" && p.onLoanFromClubId == null);
    velho.age = 36; velho.overall = 50; velho.contractUntil = C.seasonYear - 1;
    const bom = { ...sq.find((p) => p.group === "M"), id: "livre_teste", name: "Livre Teste", overall: 85, age: 25, livreDesde: { temporada: C.seasonYear - 1, rodada: 0 }, ultimoClube: ids[5] };
    C.agentesLivres = [bom];
    const novo = V.renovarElencoDaCpu(club, sq);
    return { saiu: !novo.some((p) => p.id === velho.id), livre: (C.agentesLivres || []).some((a) => a.id === velho.id && a.livreDesde && a.ultimoClube === String(id)),
      entrou: novo.some((p) => p.id === "livre_teste"), naLista: (C.agentesLivres || []).some((a) => a.id === "livre_teste"), tam: [sq.length, novo.length] };`);
  check("1) Virada: quem a CPU não renova vai para os agentes livres; a vaga é ocupada por um agente livre da mesma posição e do nível:",
    r1.saiu && r1.livre && r1.entrou && !r1.naLista && r1.tam[0] === r1.tam[1], JSON.stringify(r1));

  // 2) Expiração.
  const r2 = ler(`C.agentesLivres = [{ id: "a", livreDesde: { temporada: C.seasonYear - 2 } }, { id: "b", livreDesde: { temporada: C.seasonYear - 1 } }, { id: "c", livreDesde: { temporada: C.seasonYear } }];
    V.viradaDosAgentesLivres(); return { ficam: C.agentesLivres.map((a) => a.id) };`);
  check("2) Na virada, sai da lista quem está livre desde antes da temporada que acabou:", JSON.stringify(r2.ficam) === JSON.stringify(["b", "c"]), JSON.stringify(r2));

  // 3) Você contrata.
  const r3 = ler(`const base = S.leagueSquadFor(ids[2])[3];
    C.agentesLivres = [{ ...base, id: "livre_meu", name: "Livre Meu", livreDesde: { temporada: C.seasonYear, rodada: 1 }, ultimoClube: ids[2] }];
    const lista = M.ponte.comandosGestao.mercado().agentesLivres;
    const caixa = C.finances.cash, salario = M.clube.salarioDoAgenteLivre(C.agentesLivres[0]);
    const r = M.clube.contratarAgenteLivre("livre_meu");
    const p = C.squad.find((x) => x.id === "livre_meu");
    return { lista: lista.map((a) => [a.id, a.salario]), ok: r.ok, noElenco: !!p, salario, wage: p && p.wage, contrato: p && p.contractUntil, ano: C.seasonYear, caixa: C.finances.cash - caixa, saiu: C.agentesLivres.length === 0, livreDesde: p && p.livreDesde };`);
  check("3) Você contrata um agente livre sem taxa (o caixa não muda), com o salário pedido, por 2 temporadas; a ponte lista os agentes livres:",
    r3.ok && r3.noElenco && r3.lista.length === 1 && r3.lista[0][1] === r3.salario && r3.wage === r3.salario && r3.contrato === r3.ano + 1 && r3.caixa === 0 && r3.saiu && !r3.livreDesde, JSON.stringify(r3));

  // 4) Teto salarial.
  const r4 = ler(`const base = S.leagueSquadFor(ids[3])[2];
    C.agentesLivres = [{ ...base, id: "livre_caro", name: "Livre Caro", livreDesde: { temporada: C.seasonYear, rodada: 1 } }];
    const teto = C.finances.wageCap; C.finances.wageCap = 1;
    const r = M.clube.contratarAgenteLivre("livre_caro");
    C.finances.wageCap = teto;
    return { ok: r.ok, motivo: r.motivo, livre: C.agentesLivres.some((a) => a.id === "livre_caro") };`);
  check("4) Salário acima do teto: não contrata e o jogador continua livre:", !r4.ok && r4.motivo === "teto" && r4.livre, JSON.stringify(r4));

  // 5) Cláusula de compra.
  const r5 = ler(`const id = ids[4], sq = S.leagueSquadFor(id);
    const caixa = S.caixaDaCpu(id);
    const titular = sq.filter((p) => M.mercado.papelNoElenco(p, sq) !== "reserva" && p.value * 1.1 <= caixa).sort((a, b) => b.overall - a.overall)[0];
    const F = M.fechamento;
    const barata = F.shouldExerciseBuyOption({ value: Math.round(titular.value * 1.1), mandatory: false }, { human: false, clubId: id, player: titular });
    const cara = F.shouldExerciseBuyOption({ value: titular.value * 2, mandatory: false }, { human: false, clubId: id, player: titular });
    const sorteio = Math.random; let chamou = 0; Math.random = () => { chamou++; return 0.5; };
    try { F.shouldExerciseBuyOption({ value: titular.value, mandatory: false }, { human: false, clubId: id, player: titular }); } finally { Math.random = sorteio; }
    return { barata, cara, chamou };`);
  check("5) Cláusula de compra da CPU: paga até 1,2× o valor por quem não é reserva; acima disso, não; sem sorteio:",
    r5.barata === true && r5.cara === false && r5.chamou === 0, JSON.stringify(r5));

  // 6) Regra desligada.
  const r6 = ler(`E.PARIDADE_CPU.contratos = false;
    try { const id = ids[6], sq = S.leagueSquadFor(id).map((p) => ({ ...p })); sq[0].contractUntil = C.seasonYear - 1; sq[0].age = 36; sq[0].overall = 40;
      C.agentesLivres = []; V.renovarElencoDaCpu(E.timePorId(id), sq); return { livres: C.agentesLivres.length }; }
    finally { E.PARIDADE_CPU.contratos = true; }`);
  check("6) Regra desligada (só os testes de equivalência): a virada não mexe nos agentes livres:", r6.livres === 0, JSON.stringify(r6));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
