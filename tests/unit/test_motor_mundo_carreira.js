// MUNDO-001, etapa M6b (24/11/2026): a carreira num país do mundo. Cresce a cada
// passo da M6b. Confere:
//   1) M6b-1, divisões do país do save: sem o campo, as 3 do Brasil (todo save
//      de hoje); com `divisoes` gravado, as do país (Inglaterra), e a divisão de
//      um clube na negociação (0 = 1ª, 1 = 2ª) segue o país do save;
//   2) M6b-2, calendário da carreira no mundo (Premier League 2026/27): semanas
//      seguidas da pré-temporada até a seguinte, rodadas 1–38 uma vez cada, 10
//      jogos por rodada, janela pelas datas da FIFA, ano em cada semana;
//   3) Championship: 46 rodadas; semana com 2 rodadas vira 2 entradas;
//   4) Argentina: Apertura e Clausura numeradas 1–32; a outra divisão (todos os
//      jogos) distribuída pelas entradas do calendário;
//   5) janela: com `j`, vale a data; sem `j` (Brasil), a fase do ano;
//      número de rodadas da temporada (38 sem o campo);
//   6) M6b-3, carreira nova no Arsenal (Premier League): divisões, calendário,
//      rodadas e janela do mundo; sem Copa do Brasil e sem Série D; elencos do
//      pacote nas 44 equipes do país; overall pelo nível da liga (Premier acima
//      da Championship); mundo leve dos outros 9 países pré-simulado até a
//      pré-temporada; save gravável (JSON) e de tamanho medido;
//   7) M6b-3, jogar: 4 rodadas do Arsenal pela ponte da v2 (semana, partida ao
//      vivo até o fim, pós-jogo), gravando; a Championship joga pelas datas e o
//      mundo leve acompanha a semana da carreira;
//   8) M6b-4, virada no save do mundo: temporada inteira na Championship com o
//      técnico em 1º -> sobe para a Premier League (divisões, rodadas 38,
//      calendário de 2027/28, elencos de quem entrou do catálogo, catálogo
//      conservado, aviso de acesso, sem Copa); segunda temporada na Premier
//      com o técnico em último -> volta à Championship (46 rodadas); o mundo
//      leve segue na semana da carreira;
//   9) M6b-4, reabrir o save do mundo (enterAfterAuth da v2, com o índice do
//      ambiente): mesma liga, divisões, rodada e semana; e a carreira continua
//      jogando e gravando depois de reaberta;
//  10) M6b-4b, América do Sul: temporada inteira na Liga Profesional argentina
//      (Apertura e Clausura com os mata-matas gerados pela semana, o plano
//      compacto no save), virada com 2 quedas por critérios distintos (anual e
//      promedio), zonas novas 15/15 e 18/18, histórico do promedio; e a Segunda
//      uruguaia com rodada de folga do técnico (grupos de 7 do Competencia);
//  11) M6b-5a, Brasil com o mundo em paralelo: carreira nova no Brasileirão
//      (modo exemplo, sem rede) com o índice do mundo -> os 10 países no mundo
//      leve, na semana da carreira, andando junto; sem o índice (mundo
//      desligado), a carreira nasce como sempre, sem `mundoLeve`;
//  12) M7, moeda e porte: carreira no Arsenal em libras (texto.fmtBRL pelo
//      câmbio fixo), caixa e caixa da CPU pelo porte relativo do pacote, TV
//      mensal > 0, bilheteria pela capacidade real do estádio; Argentina em
//      dólar; carreira no Brasil volta a R$.
// Uso: node tests/unit/test_motor_mundo_carreira.js
const assert = require("assert");
const path = require("path");
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
  const estado = await imp("estado.js");
  const negociacao = await imp("negociacao.js");
  const virada = await imp("virada.js");

  await check("M6b-1: divisões do país do save (Brasil sem o campo; Inglaterra com ele)", () => {
    assert.deepStrictEqual([...estado.divisoesDoPais(null)], ["brasileirao", "serie_b", "serie_c"]);
    assert.deepStrictEqual([...estado.divisoesDoPais({ clubId: 1 })], ["brasileirao", "serie_b", "serie_c"]);
    assert.strictEqual(virada.ALL_COMPETITIONS_ORDER, estado.DIVISOES_BRASIL, "a lista antiga continua a do Brasil");
    // Save brasileiro: um clube da Série B é a divisão 1.
    estado.definirCarreira({ clubId: 1 });
    estado.definirCompeticaoAtual("brasileirao");
    estado.definirLigaAtual([{ id: 1, name: "Meu" }]);
    estado.definirTodosTimes([{ id: 2, name: "B", competitionId: "serie_b" }, { id: 3, name: "C", competitionId: "serie_c" }]);
    assert.strictEqual(negociacao.divisaoDoClube(2), 1);
    assert.strictEqual(negociacao.divisaoDoClube(3), 2);
    // Save do mundo na Inglaterra.
    estado.definirCarreira({ clubId: 10, divisoes: ["premier_league", "efl_championship"] });
    estado.definirCompeticaoAtual("efl_championship");
    estado.definirLigaAtual([{ id: 10, name: "Meu" }]);
    estado.definirTodosTimes([{ id: 20, name: "PL", competitionId: "premier_league" }, { id: 21, name: "EFL", competitionId: "efl_championship" }]);
    assert.deepStrictEqual(estado.divisoesDoPais(), ["premier_league", "efl_championship"]);
    assert.strictEqual(negociacao.divisaoDoClube(10), 1, "o seu clube na Championship");
    assert.strictEqual(negociacao.divisaoDoClube(20), 0, "clube da Premier League");
    assert.strictEqual(negociacao.divisaoDoClube(21), 1, "clube da Championship");
    estado.definirCarreira(null);
  });

  const fs = require("fs");
  const Rel = await imp("relogio.js");
  const CM = await imp("calendariomundo.js");
  const mercado = await imp("mercado.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const agenda = (liga, k = 0) => {
    const pacote = Rel.agendaDoPacote(indice.partidas[liga]);
    if (!k) return pacote;
    const clubes = indice.clubes.filter((c) => c.liga === liga).map((c) => c.id);
    return Rel.agendaGerada({ agendaModelo: pacote, anos: k, clubes });
  };
  const janelas = (cod) => indice.paises.find((p) => p.codigo === cod).janelas;

  await check("M6b-2: calendário da Premier League (semanas, rodadas 1–38, janela, ano)", () => {
    const c = CM.montarCalendarioDaCarreira({ agendaTecnico: agenda("premier_league"), agendaSeguinte: agenda("premier_league", 1), outras: { efl_championship: agenda("efl_championship") }, janelas: janelas("GB-ENG") });
    const w = c.calendar.weeks;
    assert.strictEqual(c.inicio, "2026-07-20");
    assert.strictEqual(c.rodadas, 38);
    assert.deepStrictEqual(w.filter((x) => x.r).map((x) => x.r), Array.from({ length: 38 }, (_, i) => i + 1));
    for (let r = 1; r <= 38; r++) {
      const ids = c.schedule[r].flatMap((m) => [m.home, m.away]);
      assert.strictEqual(c.schedule[r].length, 10, `rodada ${r}`);
      assert.strictEqual(new Set(ids).size, 20, `rodada ${r}: clube repetido`);
    }
    assert.strictEqual(w[0].p, "pre");
    assert.strictEqual(w[w.length - 1].p, "ferias");
    assert.strictEqual(c.calendar.year, 2026);
    const ag = w.find((x) => x.a === 2026 && x.d === "08-17"), out = w.find((x) => x.a === 2026 && x.d === "10-19"), jan = w.find((x) => x.a === 2027 && x.d === "01-11");
    assert.deepStrictEqual([ag.j, out.j, jan.j], [1, 0, 1], "janela de agosto, fechada em outubro, aberta em janeiro");
    assert.ok(w.some((x) => x.a === 2027), "sem semanas de 2027");
    // Semanas seguidas, sem buraco (as entradas repetidas são da mesma semana).
    const semanas = [...new Set(w.map((x) => `${x.a}-${x.d}`))];
    for (let i = 1; i < semanas.length; i++) assert.strictEqual(Rel.semanasEntre(semanas[i - 1], semanas[i]), 1, `buraco em ${semanas[i]}`);
    assert.strictEqual(semanas[semanas.length - 1] < c.fim, true);
    const totalOutra = Object.values(c.outras.efl_championship).reduce((s, l) => s + l.length, 0);
    assert.strictEqual(totalOutra, indice.partidas.efl_championship.length, "jogos da Championship perdidos");
  });

  await check("M6b-2: Championship com 46 rodadas e semanas de 2 rodadas", () => {
    const c = CM.montarCalendarioDaCarreira({ agendaTecnico: agenda("efl_championship"), agendaSeguinte: agenda("efl_championship", 1), janelas: janelas("GB-ENG") });
    assert.strictEqual(c.rodadas, 46);
    const porSemana = {};
    for (const x of c.calendar.weeks) if (x.r) porSemana[`${x.a}-${x.d}`] = (porSemana[`${x.a}-${x.d}`] || 0) + 1;
    assert.ok(Object.values(porSemana).some((q) => q === 2), "nenhuma semana com 2 rodadas");
    assert.deepStrictEqual(c.calendar.weeks.filter((x) => x.r).map((x) => x.r), Array.from({ length: 46 }, (_, i) => i + 1));
  });

  await check("M6b-2: Argentina com Apertura e Clausura em 1–32 e a Primera Nacional pelas datas", () => {
    const c = CM.montarCalendarioDaCarreira({ agendaTecnico: agenda("arg_liga_profesional"), outras: { arg_primera_nacional: agenda("arg_primera_nacional") }, janelas: janelas("AR") });
    assert.strictEqual(c.rodadas, 32);
    assert.strictEqual(c.mapa["Apertura#1"], 1);
    assert.strictEqual(c.mapa["Clausura#16"], 32);
    assert.ok(c.mapa["Apertura#16"] < c.mapa["Clausura#1"]);
    const total = Object.values(c.outras.arg_primera_nacional).reduce((s, l) => s + l.length, 0);
    assert.strictEqual(total, indice.partidas.arg_primera_nacional.length);
  });

  await check("M6b-2: janela pela data com `j`, pela fase sem `j`; rodadas da temporada", () => {
    const fases = new Set(["ferias", "pre", "pausa"]);
    const br = [{ p: "temporada" }, { p: "pausa" }, { p: "pausa" }, { p: "temporada" }];
    assert.deepStrictEqual(mercado.windowByCalendar(br, 1, fases), { open: true, lastIdx: 2 });
    assert.deepStrictEqual(mercado.windowByCalendar(br, 0, fases), { open: false, nextIdx: 1 });
    const mu = [{ p: "pre", j: 0 }, { p: "temporada", j: 1 }, { p: "temporada", j: 1 }, { p: "ferias", j: 0 }];
    assert.deepStrictEqual(mercado.windowByCalendar(mu, 0, fases), { open: false, nextIdx: 1 }, "pré-temporada com janela fechada");
    assert.deepStrictEqual(mercado.windowByCalendar(mu, 1, fases), { open: true, lastIdx: 2 });
    assert.strictEqual(estado.rodadasDaTemporada({}), 38);
    assert.strictEqual(estado.rodadasDaTemporada({ rodadasLiga: 46 }), 46);
  });

  await check("M6b-3: carreira nova no Arsenal (Premier League)", async () => {
    const vm = require("vm");
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const CMu = await imp("carreiramundo.js");
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [] });
    const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
    const arsenal = indice.clubes.find((c) => c.liga === "premier_league" && /Arsenal/.test(c.nome));
    const t0 = Date.now();
    const C = await CMu.criarCarreiraNoMundo({ indice, liga: "premier_league", clubId: arsenal.id, elencosDaLiga });
    const ms = Date.now() - t0;
    assert.deepStrictEqual(C.divisoes, ["premier_league", "efl_championship"]);
    assert.strictEqual(C.competitionId, "premier_league");
    assert.strictEqual(C.clubId, String(arsenal.id));
    assert.strictEqual(C.rodadasLiga, 38);
    assert.strictEqual(C.seasonYear, 2026);
    assert.strictEqual(Object.keys(C.schedule).length, 38);
    assert.ok(C.calendar.weeks.every((w) => w.a && (w.j === 0 || w.j === 1)), "semanas sem ano ou janela");
    assert.strictEqual(C.calendar.idx, 0);
    assert.strictEqual(C.cup, null);
    assert.deepStrictEqual(C.serieDPool, []);
    assert.deepStrictEqual(Object.keys(C.divisionTeams).sort(), ["efl_championship", "premier_league"]);
    assert.strictEqual(C.divisionTeams.premier_league.length, 20);
    assert.strictEqual(C.divisionTeams.efl_championship.length, 24);
    const jogosOutra = Object.values(C.otherDivisions.efl_championship.schedule).reduce((s, l) => s + l.length, 0);
    assert.strictEqual(jogosOutra, 552, "jogos da Championship");
    assert.strictEqual(Object.keys(C.leagueSquads).length, 43);
    assert.ok(C.squad.filter((p) => p.origin === "principal").length >= 22, "elenco do Arsenal");
    assert.ok(C.squad.some((p) => p.real && /Saka|Rice|Ødegaard|Odegaard/.test(p.name)), "elenco real do pacote");
    const media = (ids) => { const ps = ids.flatMap((id) => C.leagueSquads[String(id)] || []); return ps.reduce((s, p) => s + p.overall, 0) / ps.length; };
    const pl = media(C.divisionTeams.premier_league.map((t) => t.id)), efl = media(C.divisionTeams.efl_championship.map((t) => t.id));
    assert.ok(pl > efl + 3, `overall: Premier ${pl.toFixed(1)} x Championship ${efl.toFixed(1)}`);
    assert.strictEqual(C.mundoLeve.ativos[0], "GB-ENG");
    assert.strictEqual(C.mundoLeve.semana, "2026-07-20");
    assert.ok(C.mundoLeve.paises.AR.ligas.arg_liga_profesional.placares.replace(/\.\./g, "").length > 100, "Argentina não pré-simulou");
    const json = JSON.stringify(C);
    const gz = require("zlib").gzipSync(json).length;
    console.log(`   criação ${ms} ms; save ${(json.length / 1024).toFixed(0)} KB JSON, ${(gz / 1024).toFixed(0)} KB gzip; overall médio Premier ${pl.toFixed(1)}, Championship ${efl.toFixed(1)}`);
    assert.ok(json.length < 1000 * 1024, "save acima de 1 MB de JSON");
  });

  await check("M6b-3: jogar 4 rodadas no Arsenal (ponte da v2), Championship e mundo leve junto", async () => {
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const ponteMod = await imp("ponte.js");
    const gravados = [];
    semana.definirAmbiente({ armazem: { pedir: async (url, opts) => { if (opts && opts.body) gravados.push(opts.body.length); return { ok: true }; } } });
    const P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 20)); } return null; };
    const C = () => estado.carreiraAtual();
    for (let k = 0; k < 4; k++) {
      await P.avancarSemana(true);
      let i = P.iniciar();
      if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
      assert.ok(i && i.ok, `rodada ${k + 1}: não iniciou (${i && i.motivo})`);
      P.pularParaFim();
      const est = await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 30000);
      assert.ok(est && est.gravada, `rodada ${k + 1}: não gravou`);
      let etapa = P.iniciarPosJogo();
      for (let g = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && g < 12; g++) {
        if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
        else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
        else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
        else break;
      }
      P.encerrarPosJogo();
    }
    assert.strictEqual(C().currentRound, 5);
    assert.strictEqual(C().standings[C().clubId].j, 4);
    const jogosOutra = Object.values(C().otherDivisions.efl_championship.standings).reduce((s, r) => s + r.j, 0) / 2;
    assert.ok(jogosOutra >= 4 * 12, `Championship com ${jogosOutra} jogos`);
    const w = C().calendar.weeks[C().calendar.idx];
    assert.strictEqual(C().mundoLeve.semana, `${w.a}-${w.d}`, "mundo leve fora da semana da carreira");
    assert.ok(gravados.length >= 4, "a carreira não gravou");
  });

  await check("M6b-4: acesso e queda do técnico no save do mundo (Championship <-> Premier League)", async () => {
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const CMu = await imp("carreiramundo.js");
    const ponteMod = await imp("ponte.js");
    const jogo = await imp("jogo.js");
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], armazem: { pedir: async () => ({ ok: true }) } });
    const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
    const clube = indice.clubes.find((c) => c.liga === "efl_championship");
    await CMu.criarCarreiraNoMundo({ indice, liga: "efl_championship", clubId: clube.id, elencosDaLiga });
    const P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    const C = () => estado.carreiraAtual();
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
    const temporadaInteira = async () => {
      for (let g = 0; C().currentRound <= C().rodadasLiga && g < 60; g++) {
        await P.avancarSemana(true);
        let i = P.iniciar();
        if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
        assert.ok(i && i.ok, `rodada ${C().currentRound}: ${i && i.motivo}`);
        P.pularParaFim();
        await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 30000);
        let etapa = P.iniciarPosJogo();
        for (let k = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && k < 12; k++) {
          if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
          else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
          else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
          else break;
        }
        P.encerrarPosJogo();
      }
    };
    const total = () => { const [a, b] = C().divisoes; return C().divisionTeams[a].length + C().divisionTeams[b].length + C().mundoLeve.paises["GB-ENG"].catalogo.length; };
    const antes = total();
    await temporadaInteira();
    C().standings[C().clubId].pts = 999; // o técnico termina em 1º
    let r = await P.proximaTemporada();
    assert.ok(r.ok && !r.demitido, `virada: ${JSON.stringify(r).slice(0, 200)}`);
    assert.strictEqual(C().competitionId, "premier_league", "o técnico não subiu");
    assert.strictEqual(C().rodadasLiga, 38);
    assert.strictEqual(C().seasonYear, 2027);
    assert.strictEqual(C().calendar.weeks[0].a, 2027);
    assert.strictEqual(C().cup, null);
    assert.deepStrictEqual(Object.keys(C().otherDivisions), ["efl_championship"]);
    assert.strictEqual(C().divisionTeams.premier_league.length, 20);
    assert.strictEqual(C().divisionTeams.efl_championship.length, 24);
    assert.ok(C().divisionTeams.premier_league.some((t) => String(t.id) === C().clubId));
    assert.strictEqual(total(), antes, "clubes sumiram ou apareceram");
    const ids = [...C().divisionTeams.premier_league, ...C().divisionTeams.efl_championship].map((t) => String(t.id)).filter((id) => id !== C().clubId);
    // Mínimo da regra de hoje para elenco da CPU de outra divisão (semana.MIN_LEAGUE_SQUAD_OTHER_DIVISION).
    const curtos = ids.filter((id) => (C().leagueSquads[id] || []).length < 12).map((id) => `${id}:${(C().leagueSquads[id] || []).length}`);
    assert.ok(!curtos.length, `clube sem elenco: ${curtos.join(" ")}`);
    assert.ok(/^Acesso! EFL Championship/.test(jogo.humanDivisionMove({ mundo: true, texto: `Acesso! EFL Championship → Premier League.` }).text));
    assert.strictEqual(C().mundo.k, 1);
    await temporadaInteira();
    C().standings[C().clubId].pts = -999; // agora em último
    r = await P.proximaTemporada();
    assert.ok(r.ok, "segunda virada");
    if (!r.demitido) {
      assert.strictEqual(C().competitionId, "efl_championship", "o técnico não caiu");
      assert.strictEqual(C().rodadasLiga, 46);
      assert.strictEqual(C().seasonYear, 2028);
      assert.strictEqual(total(), antes);
    }
    await P.avancarSemana(true);
    const w = C().calendar.weeks[C().calendar.idx];
    assert.strictEqual(C().mundoLeve.semana, `${w.a}-${w.d}`, "mundo leve fora da semana");
  });

  await check("M6b-4: reabrir o save do mundo e seguir jogando", async () => {
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const carga = await imp("carga.js");
    const ponteMod = await imp("ponte.js");
    const CMu = await imp("carreiramundo.js");
    const salvo = JSON.parse(JSON.stringify(estado.carreiraAtual()));
    let gravacoes = 0;
    semana.definirAmbiente({
      indiceDoMundo: async () => indice,
      armazem: { pedir: async (url, opts) => { if (opts && opts.body) { gravacoes++; return { ok: true }; } return url.startsWith("/api/career") ? { career: JSON.parse(JSON.stringify(salvo)) } : {}; } },
    });
    estado.definirCarreira(null);
    estado.definirLigaAtual([]); estado.definirTodosTimes([]); estado.definirCompeticaoAtual("brasileirao");
    CMu.definirIndiceDoMundo(null);
    ponteMod.ponte.pronta = false;
    await carga.enterAfterAuth();
    const C = () => estado.carreiraAtual();
    assert.ok(C(), "não reabriu");
    assert.strictEqual(C().competitionId, salvo.competitionId);
    assert.strictEqual(estado.competicaoAtual(), salvo.competitionId);
    assert.strictEqual(estado.ligaAtual().length, salvo.divisionTeams[salvo.competitionId].length);
    assert.strictEqual(C().currentRound, salvo.currentRound);
    assert.strictEqual(C().calendar.idx, salvo.calendar.idx);
    assert.strictEqual(C().cup, null, "a carga recriou a Copa");
    assert.ok(CMu.indiceDoMundo(), "índice não carregado");
    ponteMod.ponte.pronta = true;
    const P = v2.criarPonte();
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
    await P.avancarSemana(true);
    let i = P.iniciar();
    if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
    assert.ok(i && i.ok, `não iniciou depois de reabrir (${i && i.motivo})`);
    P.pularParaFim();
    const est = await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 30000);
    assert.ok(est && est.gravada, "não gravou depois de reabrir");
    assert.ok(gravacoes > 0);
    const w = C().calendar.weeks[C().calendar.idx];
    assert.strictEqual(C().mundoLeve.semana, `${w.a}-${w.d}`);
  });

  await check("M6b-4b: Argentina (fases, mata-matas, quedas por anual e promedio) e folga na Segunda uruguaia", async () => {
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const CMu = await imp("carreiramundo.js");
    const ponteMod = await imp("ponte.js");
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], indiceDoMundo: null, armazem: { pedir: async () => ({ ok: true }) } });
    const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
    const C = () => estado.carreiraAtual();
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
    const temporadaInteira = async (P) => {
      let folgas = 0;
      for (let g = 0; C().currentRound <= C().rodadasLiga && g < 60; g++) {
        await P.avancarSemana(true);
        let i = P.iniciar();
        if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
        assert.ok(i && i.ok, `rodada ${C().currentRound}: ${i && i.motivo}`);
        if (!i.aoVivo) { folgas++; continue; } // rodada de folga do técnico: resolvida na hora
        P.pularParaFim();
        await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 30000);
        let etapa = P.iniciarPosJogo();
        for (let k = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && k < 12; k++) {
          if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
          else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
          else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
          else break;
        }
        P.encerrarPosJogo();
      }
      return folgas;
    };
    // Argentina.
    const arg = indice.clubes.filter((c) => c.liga === "arg_liga_profesional")[3];
    await CMu.criarCarreiraNoMundo({ indice, liga: "arg_liga_profesional", clubId: arg.id, elencosDaLiga });
    let P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    await temporadaInteira(P);
    const planos = C().mundo.planos;
    assert.ok(planos && planos.arg_liga_profesional && planos.arg_primera_nacional, "plano da temporada fora do save");
    const ko = planos.arg_liga_profesional.confrontos.filter((c) => /^Apertura-/.test(c.etapa));
    assert.strictEqual(ko.length, 8 + 4 + 2 + 1, "mata-mata do Apertura");
    assert.strictEqual(planos.arg_liga_profesional.placares.replace(/\.\./g, "").length / 2, 480, "jogos das fases de zonas sem placar no plano");
    const r = await P.proximaTemporada();
    assert.ok(r.ok, `virada: ${JSON.stringify(r).slice(0, 200)}`);
    const virada = C().mundoLeve.paises.AR.viradas.slice(-1)[0];
    assert.strictEqual(virada.descem.length, 2);
    assert.strictEqual(new Set(virada.descem.map(String)).size, 2);
    const z = C().mundoLeve.paises.AR.zonas;
    assert.deepStrictEqual(Object.values(z.arg_liga_profesional).map((x) => x.length), [15, 15]);
    assert.deepStrictEqual(Object.values(z.arg_primera_nacional).map((x) => x.length), [18, 18]);
    assert.ok(Object.values(C().mundoLeve.paises.AR.historico.arg_liga_profesional).some((h) => h.some((x) => x.ano === 2026)), "histórico do promedio sem 2026");
    assert.deepStrictEqual(C().mundo.planos, {}, "planos da temporada anterior ficaram no save");
    assert.strictEqual(C().seasonYear, 2027);
    // Segunda uruguaia: rodadas de folga no Competencia.
    const uru = indice.clubes.filter((c) => c.liga === "uru_segunda")[0];
    await CMu.criarCarreiraNoMundo({ indice, liga: "uru_segunda", clubId: uru.id, elencosDaLiga });
    P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    const folgas = await temporadaInteira(P);
    assert.ok(folgas >= 1, "sem rodada de folga no Competencia");
    const r2 = await P.proximaTemporada();
    assert.ok(r2.ok, "virada no Uruguai");
  });

  await check("M6b-5a: carreira nova no Brasil com o mundo em paralelo (e sem ele, como sempre)", async () => {
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const CMu = await imp("carreiramundo.js");
    const ponteMod = await imp("ponte.js");
    const fetchAntes = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("sem rede"); };
    const C = () => estado.carreiraAtual();
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
    const nova = async (comIndice) => {
      estado.definirCarreira(null);
      CMu.definirIndiceDoMundo(null);
      semana.definirAmbiente({ ...v2.ambienteSemPagina(), indiceDoMundo: comIndice ? async () => indice : null, armazem: { pedir: async (u, o) => (o && o.body ? { ok: true } : {}) } });
      const P = v2.criarPonte();
      ponteMod.ponte.pronta = true;
      const comp = await P.escolherCompeticao("brasileirao");
      assert.ok(comp.ok, "escolher competição");
      const r = await P.criarCarreira(comp.clubes[0].id);
      assert.ok(r && r.ok !== false, "criar carreira");
      return P;
    };
    try {
      // Sem o índice: como sempre.
      await nova(false);
      assert.strictEqual(C().mundoLeve, undefined, "nasceu com mundo sem o índice");
      assert.strictEqual(C().mundo, undefined);
      // Com o índice: o mundo em paralelo.
      const P = await nova(true);
      assert.ok(C().mundoLeve, "sem mundo leve");
      assert.strictEqual(C().mundo, undefined, "o Brasil não é save do mundo");
      assert.ok(C().cup, "a Copa do Brasil continua");
      assert.strictEqual(C().mundoLeve.semana, `${C().calendar.year}-${C().calendar.weeks[C().calendar.idx].d}`);
      assert.deepStrictEqual(C().mundoLeve.ativos, ["BR"]);
      for (let k = 0; k < 3; k++) {
        await P.avancarSemana(true);
        let i = P.iniciar();
        if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
        assert.ok(i && i.ok, `rodada: ${i && i.motivo}`);
        if (i.aoVivo) { P.pularParaFim(); await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null ? e : null; }, 30000); }
        let etapa = P.iniciarPosJogo();
        for (let g = 0; etapa && etapa.ok !== false && etapa.etapa !== "fim" && g < 12; g++) {
          if (etapa.etapa === "coletiva") etapa = await P.responderColetiva(etapa.respostas[0].letra);
          else if (etapa.etapa === "noticias" || etapa.etapa === "resultados") etapa = P.concluirEtapa(etapa.etapa);
          else if (etapa.etapa === "proposta") etapa = await P.responderProposta("recusar");
          else if (etapa.etapa === "copa") {
            let c = P.iniciarPernaCopa();
            if (c.motivo === "escalacao") { await P.escalarAutomaticamente(true); c = P.iniciarPernaCopa(); }
            if (c.ok && c.aoVivo) { P.pularParaFim(); await ate(() => { const e = P.estado(); return e.fase === "encerrada" && e.gravada != null; }, 30000); }
            etapa = P.posJogo();
          } else break;
        }
        P.encerrarPosJogo();
      }
      assert.strictEqual(C().mundoLeve.semana, `${C().calendar.year}-${C().calendar.weeks[C().calendar.idx].d}`, "mundo leve fora da semana");
      assert.ok(C().mundoLeve.paises.AR.ligas.arg_liga_profesional.placares.replace(/\.\./g, "").length > 0, "a Argentina não jogou");
    } finally {
      globalThis.fetch = fetchAntes;
    }
  });

  await check("M7: moeda do país, porte do clube, TV e capacidade do estádio", async () => {
    const v2 = await imp("v2.js");
    const semana = await imp("semana.js");
    const CMu = await imp("carreiramundo.js");
    const texto = await imp("texto.js");
    const financas = await imp("financas.js");
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], indiceDoMundo: null, armazem: { pedir: async () => ({ ok: true }) } });
    const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
    const ars = indice.clubes.find((c) => c.liga === "premier_league" && /Arsenal/.test(c.nome));
    const C = await CMu.criarCarreiraNoMundo({ indice, liga: "premier_league", clubId: ars.id, elencosDaLiga });
    assert.strictEqual(C.moeda, "GBP");
    assert.strictEqual(texto.moedaDeExibicao(), "GBP");
    assert.ok(/£/.test(texto.fmtBRL(7000000)), texto.fmtBRL(7000000));
    assert.strictEqual(texto.fmtBRL(7000000).replace(/\D/g, ""), "1000000", "câmbio de 7 por libra");
    const porte = CMu.porteDoClube(indice, ars.id);
    assert.ok(porte > 1, `Arsenal deveria ter porte acima da mediana (${porte})`);
    assert.ok(Object.keys(C.caixaCpu).length >= 43, "caixa da CPU do país");
    assert.ok(C.calendar.tvMonthly > 0, "sem cota de TV");
    const cap = financas.stadiumCapacity({ venue: { capacity: 60704 } }, () => 0.5, 0);
    assert.strictEqual(cap, 61000, "capacidade real do estádio");
    assert.strictEqual(financas.stadiumCapacity({ atk: 1.3 }, () => 0.5, 0), Math.round((15000 + 0.5 * 20000 + 0.3 * 45000) / 1000) * 1000, "sem capacidade: a estimativa de sempre");
    const arg = indice.clubes.find((c) => c.liga === "arg_liga_profesional");
    const A = await CMu.criarCarreiraNoMundo({ indice, liga: "arg_liga_profesional", clubId: arg.id, elencosDaLiga });
    assert.strictEqual(A.moeda, "USD");
    assert.ok(/US\$/.test(texto.fmtBRL(5500000)), texto.fmtBRL(5500000));
    texto.definirMoeda(null);
    assert.ok(/R\$/.test(texto.fmtBRL(1000)), "Brasil em reais");
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
