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
//      número de rodadas da temporada (38 sem o campo).
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

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
