// PARIDADE-CPU · E3, PR2 (20–21/11): mercado CPU × CPU com os avaliadores do
// seu mercado (CPU-07, V06, A9). Decisões do Murilo: "Libera excedente
// antes", "Lista de agentes livres", volume "Moderado", propostas pelos seus
// jogadores "~35%". Sem navegador, pela ponte (_sem_tela.js), perfil frozen.
//  1) Elenco cheio (26) tem vaga se houver excedente: um reserva com a
//     posição coberta sem ele (o pior).
//  2) O reforço chega a um elenco cheio: o excedente vai para os agentes
//     livres (com a data) e o elenco fica em 26.
//  3) Negociação CPU × CPU: o vendedor pede a reserva da regra do seu
//     mercado; o atleta decide pela mesma regra (titular de clube grande não
//     vai ser reserva de um clube pequeno).
//  4) Rodada de mercado: transferências acontecem, o dinheiro sai de um
//     caixa e entra no outro e nenhum elenco passa do máximo.
//  5) Propostas pelos seus jogadores: aparecem em ~35% das semanas de janela.
//  6) Regra desligada (equivalência): elenco cheio não tem vaga.
const { check } = require("./_check");
const { abrirPagina } = require("./_sem_tela");

(async () => {
  const pg = await abrirPagina();
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const comp = await pg.P.escolherCompeticao("brasileirao");
  await pg.P.criarCarreira(comp.clubes[5].id);
  const ler = (codigo) => JSON.parse(pg.rodar(`JSON.stringify((() => { const M = window.BRDATA_MOTOR, E = M.estado, S = M.semana, N = M.negociacao, MC = M.mercado, C = E.carreiraAtual();
    const ids = Object.keys(C.leagueSquads);
    ${codigo} })())`, "teste"));

  // 1) Excedente.
  const r1 = ler(`const id = ids[0], sq = S.leagueSquadFor(id); const ex = S.excedenteDoElenco(id);
    const doGrupo = sq.filter((p) => p.group === ex.group && p !== ex).length;
    return { n: sq.length, max: S.maxSquadSizeFor(id), vaga: S.temVagaCpu(id), papel: MC.papelNoElenco(ex, sq), doGrupo, cob: MC.MER_PARAMETROS.coberturaMinima[ex.group],
      pior: sq.filter((p) => MC.papelNoElenco(p, sq) === "reserva" && p.group === ex.group).every((p) => p.overall >= ex.overall) };`);
  check("1) Elenco cheio tem vaga se houver excedente (reserva com a posição coberta sem ele, o pior):",
    r1.n === r1.max && r1.vaga && r1.papel === "reserva" && r1.doGrupo >= r1.cob && r1.pior, JSON.stringify(r1));

  // 2) Reforço chega ao elenco cheio.
  const r2 = ler(`const id = ids[1], de = ids[2]; const ex = S.excedenteDoElenco(id); const p = S.leagueSquadFor(de).pop();
    S.entrarNoElencoCpu(id, p); const livre = (C.agentesLivres || []).find((x) => x.id === ex.id);
    return { n: S.leagueSquadFor(id).length, chegou: S.leagueSquadFor(id).includes(p), saiu: !S.leagueSquadFor(id).includes(ex), livre: livre && livre.livreDesde, ultimo: livre && livre.ultimoClube === String(id), log: (C.transferLog[0] || {}).text };`);
  check("2) Reforço num elenco cheio: o excedente vai para os agentes livres (com a data e o último clube) e o elenco fica em 26:",
    r2.n === 26 && r2.chegou && r2.saiu && r2.livre && r2.ultimo && /dispensou/.test(r2.log || ""), JSON.stringify(r2));

  // 3) Negociação.
  const r3 = ler(`const forca = (id) => E.forcaMediaDoElenco(id);
    const A = ids.filter((id) => N.divisaoDoClube(id) === 0).sort((a, b) => forca(b) - forca(a));
    const Cc = ids.filter((id) => N.divisaoDoClube(id) === 2).sort((a, b) => forca(a) - forca(b));
    const grande = A[0], pequeno = Cc[0];
    const sqG = S.leagueSquadFor(grande);
    const titular = sqG.filter((p) => MC.papelNoElenco(p, sqG) === "titular").sort((a, b) => b.overall - a.overall)[0];
    const recusa = N.negociacaoCpu(titular, grande, pequeno);
    const sqP = S.leagueSquadFor(pequeno);
    const reserva = sqP.filter((p) => MC.papelNoElenco(p, sqP) === "reserva" && p.onLoanFromClubId == null)[0];
    const n = N.negociacaoCpu(reserva, pequeno, A[3]);
    const esperado = MC.reservaParaProposta(reserva, S.marketClub(pequeno), { aVenda: N.motivosAVendaNoClube(reserva, pequeno).length > 0 }).reserva;
    return { recusa: [recusa.ok, recusa.motivo, recusa.atleta], n, esperado };`);
  check("3) Negociação CPU × CPU: o titular do maior da A não vai para o menor da C; com acordo, o preço é a reserva da regra do seu mercado:",
    r3.recusa[0] === false && (r3.n.ok ? r3.n.preco === r3.esperado : true), JSON.stringify(r3));

  // 4) Rodada de mercado.
  const r4 = ler(`C.caixaCpu = C.caixaCpu || {}; ids.forEach((id) => { C.caixaCpu[id] = S.caixaDaCpu(id); });
    const total = () => Object.values(C.caixaCpu).reduce((s, v) => s + v, 0);
    const t0 = total(); let feitas = [];
    for (let i = 0; i < 5 && feitas.length < 3; i++) feitas = feitas.concat(N.mercadoCpuDaRodada(C.currentRound));
    const maior = Math.max(...ids.map((id) => S.leagueSquadFor(id).length - S.maxSquadSizeFor(id)));
    return { feitas: feitas.length, ex: feitas[0], dinheiro: total() - t0, maior };`);
  check("4) Rodada de mercado: há transferências, o dinheiro só troca de caixa e nenhum elenco passa do máximo:",
    r4.feitas > 0 && r4.dinheiro === 0 && r4.maior <= 0, JSON.stringify(r4));

  // 5) Propostas pelos seus jogadores.
  const r5 = ler(`let n = 0; for (let i = 0; i < 200; i++) { C.pendingOffer = null; S.maybeGenerateOffer(C.currentRound); if (C.pendingOffer) n++; } C.pendingOffer = null; return { n };`);
  check("5) Propostas pelos seus jogadores aparecem em ~35% das semanas de janela (entre 15% e 40%):",
    r5.n >= 30 && r5.n <= 80, JSON.stringify(r5));

  // 6) Regra desligada.
  const r6 = ler(`E.PARIDADE_CPU.mercado = false;
    try { const id = ids.find((x) => S.leagueSquadFor(x).length >= S.maxSquadSizeFor(x)); return { vaga: S.temVagaCpu(id) }; }
    finally { E.PARIDADE_CPU.mercado = true; }`);
  check("6) Regra desligada (só os testes de equivalência): elenco cheio não tem vaga, como antes:", r6.vaga === false, JSON.stringify(r6));

  console.log("OK");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
