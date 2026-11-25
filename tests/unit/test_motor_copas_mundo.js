// MUNDO-001, M9b (25/11/2026): as copas da CONMEBOL no save (public/js/motor/copasmundo.js).
// Confere, sem rede e sem navegador:
//   1) vagas: a tabela do pacote por associação (28 nos grupos da Libertadores com os
//      2 titulares, 13 na fase 2, 6 na fase 1, 12 nos grupos da Sul-Americana, 32 na
//      1ª fase); o titular que também se classificou pela liga passa a vaga ao próximo;
//      sem titulares (1ª edição), as 2 vagas vão para Brasil e Argentina;
//   2) classificação da temporada: campeões na ordem dos títulos, sem repetir, depois a
//      tabela; tabela anual dos andinos determinística por ano e diferente entre anos;
//      Brasil com o mundo: a Série A e o campeão da Copa do Brasil na virada;
//   3) save da edição: compactar e expandir no meio dá o mesmo plano que jogar direto;
//   3b) save na Argentina, um ano inteiro pelo relógio: a edição de 2026 é montada antes
//      da fase 1, jogada até a final, fecha com campeões no histórico, titulares da
//      próxima e notícia; o técnico classificado tem os jogos e os prêmios no caixa e no
//      ledger (em R$, na escala da Copa do Brasil), sem crédito em dobro; o save guarda
//      a edição sem as regras do pacote;
//   4) a mesma carreira dá a mesma edição; o save relido no meio da edição termina igual;
//   5) save na Inglaterra (começa em julho): a edição de 2026 já começou e é pulada; a de
//      2027 sai das classificações de 2026 do mundo leve (campeões de cada país nos
//      grupos da Libertadores).
// Uso: node tests/unit/test_motor_copas_mundo.js
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");
globalThis.window = globalThis;

let n = 0, failed = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
const imp = (m) => import(pathToFileURL(path.join(ROOT, "public/js/motor", m)).href);

(async () => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
  const Copas = await imp("copasmundo.js");
  const ML = await imp("mundoleve.js");
  const estado = await imp("estado.js");
  const v2 = await imp("v2.js");
  const semana = await imp("semana.js");
  const CMu = await imp("carreiramundo.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const acesso = indice.continentais.acesso;
  semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], armazem: { pedir: async () => ({ ok: true }) } });
  const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;

  // Ordens sintéticas: "<ASSOC><n>", 12 por associação.
  const ordens = Object.fromEntries(Object.keys(acesso.CONMEBOL.por_associacao).map((a) => [a, Array.from({ length: 16 }, (_, i) => `${a}${i + 1}`)]));
  const contar = (P) => [P.LIB.grupos.length, P.LIB.fase2.length, P.LIB.fase1.length, P.SUD.grupos.length, Object.values(P.SUD.primeiraFase).flat().length];

  await check("vagas: tabela do pacote, titular que já se classificou passa a vaga, 1ª edição com Brasil e Argentina", () => {
    const a = Copas.vagasConmebol({ acesso, ordens, titulares: ["URU9", "CHI1"] });
    assert.deepStrictEqual(contar(a.participantes), [28, 13, 6, 12, 32]);
    assert.ok(a.participantes.LIB.grupos.includes("URU9") && a.participantes.LIB.grupos.includes("CHI1"));
    // CHI1 já era titular: o Chile preenche as suas vagas a partir do CHI2.
    assert.deepStrictEqual(a.participantes.LIB.grupos.filter((x) => /^CHI/.test(x)), ["CHI1", "CHI2", "CHI3"]);
    assert.deepStrictEqual(a.participantes.LIB.fase2.filter((x) => /^CHI/.test(x)), ["CHI4", "CHI5"]);
    const todos = [...a.participantes.LIB.grupos, ...a.participantes.LIB.fase2, ...a.participantes.LIB.fase1, ...a.participantes.SUD.grupos, ...Object.values(a.participantes.SUD.primeiraFase).flat()];
    assert.strictEqual(new Set(todos).size, 91, "clube repetido");
    const b = Copas.vagasConmebol({ acesso, ordens, titulares: [null, null] });
    assert.deepStrictEqual(contar(b.participantes), [28, 13, 6, 12, 32]);
    assert.strictEqual(b.participantes.LIB.grupos.filter((x) => /^BRA/.test(x)).length, 6, "Brasil com a vaga do titular");
    assert.strictEqual(b.participantes.LIB.grupos.filter((x) => /^ARG/.test(x)).length, 6, "Argentina com a vaga do titular");
    assert.throws(() => Copas.vagasConmebol({ acesso, ordens: { ...ordens, PER: ["PER1"] } }), /PER sem clubes/);
  });

  await check("classificação da temporada, tabela andina e o Brasil na virada", () => {
    const c = ML.classificacaoDaTemporada(2026, { anual: 3, Clausura: 2, Apertura: 2, campeonato: null }, [3, 1, 2, 4]);
    assert.deepStrictEqual(c, { ano: 2026, campeoes: [2, 3], ordem: [3, 1, 2, 4] });
    assert.deepStrictEqual(ML.classificacaoDaTemporada(2026, 7, [5, 7]).campeoes, [7]);
    assert.deepStrictEqual(Copas.ordemDeAcesso([2, 3], [3, 1, 2, 4]), [2, 3, 1, 4]);
    const per = indice.copas.conmebol.clubes.filter((x) => x.assoc === "PER");
    const t1 = Copas.tabelaAndina(per, "k:PER:2026"), t2 = Copas.tabelaAndina(per, "k:PER:2026"), t3 = Copas.tabelaAndina(per, "k:PER:2027");
    assert.deepStrictEqual(t1, t2);
    assert.notDeepStrictEqual(t1, t3);
    assert.strictEqual(new Set(t1).size, 18);
    // Brasil com o mundo anexado: Série A e Copa do Brasil.
    const st = { 1: { id: 1, pts: 50, v: 15 }, 2: { id: 2, pts: 70, v: 21 }, 3: { id: 3, pts: 60, v: 18 } };
    const C = { mundoLeve: { paises: { BR: {} } }, competitionId: "brasileirao", standings: st, cup: { champion: 99 }, seasonYear: 2027 };
    CMu.fimDaTemporadaNoBrasil(C);
    assert.deepStrictEqual(C.mundoLeve.paises.BR.classificacao, { ano: 2026, campeoes: [2, 99], ordem: [2, 3, 1] });
  });

  await check("save da edição: compactar e expandir no meio da edição termina igual ao plano inteiro", async () => {
    const CT = await imp("continental.js");
    const { rngDaChave } = await imp("desempate.js");
    const R = { regras: indice.continentais.competicoes, calendario: indice.continentais.calendarios, premiacao: indice.continentais.premiacao };
    const { participantes, associacao } = Copas.vagasConmebol({ acesso, ordens, titulares: [null, null] });
    const ranking = Object.fromEntries(Object.keys(associacao).map((id, i) => [id, i + 1]));
    const nova = () => CT.montarEdicao({ ano: 2026, chave: "rt", regras: R.regras, calendario: R.calendario, premiacao: R.premiacao, participantes, ranking, associacao });
    const sim = { jogar: (j) => { const r = rngDaChave(`rt:${j.id}`); return { gh: Math.floor(r() * 4), ga: Math.floor(r() * 3) }; }, prorrogacao: () => ({ gh: 0, ga: 0 }), penaltis: (p) => p.fora };
    const inteiro = nova();
    CT.jogarTudo(inteiro, sim);
    let p = nova();
    for (let k = 0; k < 160; k++) {
      const [j] = CT.jogosPendentes(p);
      CT.registrarJogo(p, j.id, sim.jogar(j), sim);
      if (k % 20 === 7) p = Copas.expandir(JSON.parse(JSON.stringify(Copas.compactar(p, "BRA1"))), R);
    }
    CT.jogarTudo(p, sim);
    assert.deepStrictEqual(p.resultado, inteiro.resultado);
    assert.deepStrictEqual(p.jogos, inteiro.jogos);
    assert.deepStrictEqual(p.confrontos, inteiro.confrontos);
  });

  // Anda o calendário da carreira semana a semana (o mundo e as copas, sem as
  // partidas do técnico na liga: as copas só dependem do relógio).
  const andar = (C, de, ate) => { const ev = []; for (let i = de; i < ate; i++) { C.calendar.idx = i; ev.push(...(estado.ganchosMundo.semanaDoMundo(C) || [])); } return ev; };
  const novaNaArgentina = async (k = 0) => {
    CMu.definirIndiceDoMundo(indice);
    const clube = indice.clubes.filter((c) => c.liga === "arg_liga_profesional")[k];
    await CMu.criarCarreiraNoMundo({ indice, liga: "arg_liga_profesional", clubId: clube.id, elencosDaLiga });
    const C = estado.carreiraAtual();
    C.mundoLeve.chave = "teste-copas";
    return C;
  };

  let historicoA;
  await check("Argentina: a edição de 2026 do começo ao fim, com o técnico, prêmios, notícias e save compacto", async () => {
    const C = await novaNaArgentina(0);
    const cash0 = C.finances.cash;
    const total = C.calendar.weeks.length - 1;
    let maxKB = 0;
    const ev = [];
    for (let i = 0; i < total; i++) {
      ev.push(...andar(C, i, i + 1));
      const cc = C.copas && C.copas.conmebol;
      if (cc && cc.edicao) {
        assert.strictEqual(cc.edicao.regras, undefined, "regras do pacote no save");
        maxKB = Math.max(maxKB, JSON.stringify(C.copas).length / 1024);
      }
    }
    const cc = C.copas.conmebol;
    assert.ok(ev.some((e) => e.tipo === "edicao" && e.ano === 2026), "edição de 2026 não montada");
    assert.strictEqual(cc.edicao, null, "edição não fechou no ano");
    assert.strictEqual(cc.historico.length, 1);
    const h = cc.historico[0];
    assert.ok(h.LIB.campeao && h.SUD.campeao && h.LIB.vice && h.SUD.vice);
    assert.deepStrictEqual(cc.titulares, [h.LIB.campeao, h.SUD.campeao]);
    assert.ok(C.newsFeed.some((x) => x.type === "continental" && /campeão da Libertadores 2026/.test(x.texto)));
    const meus = ev.filter((e) => e.tipo === "jogo");
    assert.ok(meus.length >= 6, `técnico com ${meus.length} jogos (Defensa y Justicia, Sul-Americana pela força)`);
    const premios = C.financeLedger.filter((l) => l.type === "premiacao");
    assert.ok(premios.length >= 3, "sem prêmio no ledger");
    const soma = premios.reduce((s, l) => s + l.amount, 0);
    assert.ok(C.finances.cash - cash0 >= soma * 0.5, "prêmio fora do caixa");
    // Escala: a cota de mando dos grupos da Sul-Americana (US$ 300 mil) vale R$ 330 mil.
    assert.strictEqual(Copas.emReais(300000), 330000);
    assert.ok(premios.every((l) => l.amount <= Copas.emReais(25000000)));
    // Reprocessar a mesma semana não paga de novo.
    const antes = C.financeLedger.length;
    andar(C, total - 1, total);
    assert.strictEqual(C.financeLedger.length, antes);
    console.log(`   ${meus.length} jogos do técnico, ${premios.length} prêmios (R$ ${(soma / 1e6).toFixed(2)} mi), copas no save até ${maxKB.toFixed(0)} KB`);
    assert.ok(maxKB < 120, `copas no save com ${maxKB.toFixed(0)} KB`);
    historicoA = cc.historico;
  });

  await check("mesma carreira = mesma edição; save relido no meio da edição termina igual", async () => {
    const C = await novaNaArgentina(0);
    const total = C.calendar.weeks.length - 1;
    const meio = Math.floor(total / 2);
    andar(C, 0, meio);
    assert.ok(C.copas.conmebol.edicao, "edição não está em andamento no meio do ano");
    // Relido: o save passa por JSON (como no servidor) e o motor reabre o mundo.
    const relido = JSON.parse(JSON.stringify(C));
    estado.definirCarreira(relido);
    CMu.definirIndiceDoMundo(indice);
    andar(relido, meio, total);
    assert.deepStrictEqual(relido.copas.conmebol.historico, historicoA);
  });

  await check("Inglaterra: 2026 já começou (pulada); 2027 com os campeões de 2026 do mundo leve", async () => {
    CMu.definirIndiceDoMundo(indice);
    const ars = indice.clubes.find((c) => c.liga === "premier_league" && /Arsenal/.test(c.nome));
    await CMu.criarCarreiraNoMundo({ indice, liga: "premier_league", clubId: ars.id, elencosDaLiga });
    const C = estado.carreiraAtual();
    const total = C.calendar.weeks.length - 1;
    // Só os eventos da CONMEBOL (as copas da UEFA, M10b, andam no mesmo relógio).
    const ev = andar(C, 0, total).filter((e) => e.confed !== "UEFA");
    const cc = C.copas.conmebol;
    assert.ok(!ev.some((e) => e.tipo === "edicao" && e.ano === 2026), "edição de 2026 montada depois da fase 1");
    assert.ok(ev.some((e) => e.tipo === "edicao" && e.ano === 2027), "edição de 2027 não montada");
    const plano = Copas.edicaoAtual(C, indice);
    assert.strictEqual(plano.ano, 2027);
    for (const cod of ["AR", "CL", "CO", "EC", "UY", "BR"]) {
      const cl = C.mundoLeve.paises[cod].classificacao;
      assert.ok(cl && cl.ano === 2026, `${cod} sem a classificação de 2026`);
      assert.ok(plano.participantes.LIB.grupos.some((x) => String(x) === String(cl.campeoes[0])), `campeão de ${cod} fora dos grupos da Libertadores`);
    }
    assert.ok(Object.values(plano.associacao).filter((a) => a === "BOL").length === 8, "Bolívia com 8 clubes");
    assert.ok(!plano.participantes.LIB.grupos.some((x) => String(x) === String(C.clubId)), "o Arsenal numa copa sul-americana");
  });

  await check("M9c: o jogo do técnico ao vivo pela ponte da v2 (parada na semana, adversário de fora no save, placar no plano, prêmio)", async () => {
    const ponteMod = await imp("ponte.js");
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], indiceDoMundo: null, elencosDoMundo: async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")), armazem: { pedir: async () => ({ ok: true }) } });
    const C = await novaNaArgentina(0);
    const P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
    const fimDePartida = () => ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 30000);
    const ao = [];
    for (let g = 0; g < 80 && ao.length < 4 && C.currentRound <= C.rodadasLiga; g++) {
      const pend = P.jogoContinental();
      if (pend) {
        let r = await P.iniciarJogoContinental();
        if (r.motivo === "escalacao") { await P.escalarAutomaticamente(true); r = await P.iniciarJogoContinental(); }
        assert.ok(r.ok && r.aoVivo, `jogo continental não começou (${r.motivo})`);
        const durante = P.estado();
        assert.strictEqual(durante.contexto, "continental");
        assert.strictEqual(durante.continental.nomeCopa, pend.nomeCopa);
        P.pularParaFim();
        const e = await fimDePartida();
        assert.ok(e && e.gravada, "jogo continental não gravou");
        const plano = Copas.edicaoAtual(C, indice) || null;
        const j = plano ? plano.jogos.find((x) => x.id === pend.id) : null;
        if (j) assert.deepStrictEqual([j.gh, j.ga], [e.gh, e.ga], "placar ao vivo fora do plano");
        assert.ok(!C.copas.conmebol.pendente || C.copas.conmebol.pendente.id !== pend.id, "o jogo continua pendente");
        ao.push({ ...pend, gh: e.gh, ga: e.ga });
        continue;
      }
      const w = await P.avancarSemana(true);
      if (w.motivo === "continental") continue;
      let i = P.iniciar();
      if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
      if (!i || !i.ok) continue;
      if (!i.aoVivo) continue;
      P.pularParaFim();
      await fimDePartida();
      let etapa = P.iniciarPosJogo();
      for (let k = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && k < 12; k++) {
        if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
        else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
        else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
        else break;
      }
      P.encerrarPosJogo();
    }
    assert.ok(ao.length >= 2, `só ${ao.length} jogos continentais ao vivo`);
    const fora = ao.find((x) => !x.souMandante);
    assert.ok(fora, "sem jogo fora de casa");
    assert.ok(C.exterior && C.exterior.clubes[String(fora.adversario.id)] || C.leagueSquads[String(fora.adversario.id)], "adversário sem elenco no save");
    const casa = ao.find((x) => x.souMandante && x.fase === "grupos");
    if (casa) assert.ok(C.financeLedger.some((l) => l.type === "premiacao" && /cota de mando/.test(l.label)), "sem a cota de mando do jogo em casa");
    console.log(`   ${ao.map((x) => `${x.nomeCopa} ${x.nomeFase}: ${x.souMandante ? "casa" : "fora"} x ${x.adversario.nome} ${x.gh}-${x.ga}`).join("; ")}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
