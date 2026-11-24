// MUNDO-001, etapa M2 (24/11/2026): o relógio do mundo (public/js/motor/relogio.js).
// Confere, sem rede e sem navegador, com os jogos reais do índice do mundo:
//   1) semana = segunda-feira; virada de ano; soma e diferença de semanas;
//   2) "k anos depois" cai numa segunda a até 3 dias do mesmo dia, sem
//      escorregar em 12 anos (sempre a partir da semana original);
//   3) temporada 1 das 20 ligas: todo jogo na semana da própria data, nenhum
//      perdido, semanas em ordem;
//   4) temporada seguinte gerada (turno e returno, como no Brasil): cada clube
//      um jogo por rodada, cada rodada na semana do modelo 1 ano (e 5 anos)
//      depois, a mesma quantidade de jogos, determinística;
//   5) formato com duas fases (Apertura/Clausura da Colômbia) com gerador
//      próprio de turno único por fase;
//   6) início do save na pré-temporada da liga escolhida e pré-simulação das
//      outras até lá (Premier League: a América do Sul já jogou; a Europa não);
//   7) situação da liga (antes, andamento, fim) e semanas com 2 jogos;
//   8) calendário brasileiro de hoje (mesma regra de virada.buildSeasonCalendar)
//      em semanas do relógio: as 52/53 segundas do ano, rodadas 1–38 intactas.
// Uso: node tests/unit/test_motor_relogio.js
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");

let n = 0, failed = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
const diaDaSemana = (d) => new Date(d + "T00:00:00Z").getUTCDay();
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

(async () => {
  const R = await import(pathToFileURL(path.join(ROOT, "public/js/motor/relogio.js")).href);
  const { generateAllRounds } = await import(pathToFileURL(path.join(ROOT, "public/js/motor/calendario.js")).href);
  globalThis.window = globalThis;
  const { CALENDAR_PHASE_BY_MONTH } = await import(pathToFileURL(path.join(ROOT, "public/js/motor/semana.js")).href);
  const mundo = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const agendas = Object.keys(mundo.competicoes).map((id) => [id, R.agendaDoPacote(mundo.partidas[id])]);
  const agendaDe = (id) => agendas.find(([l]) => l === id)[1];
  const clubesDe = (id) => mundo.clubes.filter((c) => c.liga === id).map((c) => c.id);

  await check("semana = segunda-feira; virada de ano; soma e diferença", () => {
    assert.strictEqual(R.segundaDe("2026-11-24"), "2026-11-23"); // terça
    assert.strictEqual(R.segundaDe("2026-11-23"), "2026-11-23"); // segunda
    assert.strictEqual(R.segundaDe("2026-11-29"), "2026-11-23"); // domingo
    assert.strictEqual(R.segundaDe("2027-01-02"), "2026-12-28"); // sábado do ano novo
    assert.strictEqual(R.somarSemanas("2026-12-28", 1), "2027-01-04");
    assert.strictEqual(R.proximaSemana("2026-12-28"), "2027-01-04");
    assert.strictEqual(R.somarSemanas("2026-08-17", -4), "2026-07-20");
    assert.strictEqual(R.semanasEntre("2026-07-20", "2026-08-17"), 4);
    assert.strictEqual(R.semanasEntre("2026-08-17", "2026-07-20"), -4);
  });

  await check("k anos depois: segunda, a até 3 dias do mesmo dia, sem escorregar em 12 anos", () => {
    for (const inicio of ["2026-08-17", "2026-01-05", "2026-12-28", "2027-02-22"]) {
      for (let k = 1; k <= 12; k++) {
        const s = R.mesmaSemanaAnos(inicio, k);
        assert.strictEqual(diaDaSemana(s), 1, `${s} não é segunda`);
        const [a, m, d] = inicio.split("-").map(Number);
        const alvo = new Date(Date.UTC(a + k, m - 1, d)).toISOString().slice(0, 10);
        assert.ok(Math.abs(diasEntre(alvo, s)) <= 3, `${inicio} + ${k} anos = ${s} (alvo ${alvo})`);
      }
    }
  });

  await check("temporada 1 das 20 ligas: cada jogo na semana da própria data, nenhum perdido", () => {
    for (const [id, agenda] of agendas) {
      let total = 0, anterior = "";
      for (const [semana, jogos] of agenda) {
        assert.strictEqual(diaDaSemana(semana), 1, `${id}: ${semana} não é segunda`);
        assert.ok(semana > anterior, `${id}: semanas fora de ordem`);
        anterior = semana;
        for (const j of jogos) {
          assert.strictEqual(R.segundaDe(j.data), semana, `${id}: jogo de ${j.data} na semana ${semana}`);
          total++;
        }
      }
      assert.strictEqual(total, mundo.partidas[id].length, `${id}: jogos`);
    }
  });

  const umJogoPorRodada = (agenda, clubes, rodadasEsperadas, rotulo) => {
    const porFaseRodada = {};
    for (const jogos of agenda.values()) for (const j of jogos) {
      const k = `${j.fase}#${j.rodada}`;
      (porFaseRodada[k] ||= []).push(j.casa, j.fora);
    }
    assert.strictEqual(Object.keys(porFaseRodada).length, rodadasEsperadas, `${rotulo}: rodadas`);
    for (const [k, ids] of Object.entries(porFaseRodada)) {
      assert.strictEqual(new Set(ids).size, ids.length, `${rotulo} ${k}: clube com 2 jogos na rodada`);
      assert.strictEqual(ids.length, clubes.length - (clubes.length % 2), `${rotulo} ${k}: clubes na rodada`);
    }
  };

  await check("temporada seguinte das 10 europeias: um jogo por rodada e por dia, semana do modelo +1 e +5 anos, determinística", () => {
    for (const [id, agenda] of agendas.filter(([l]) => mundo.competicoes[l].regiao === "europa")) {
      const comp = mundo.competicoes[id];
      const clubes = clubesDe(id);
      const nova = R.agendaGerada({ agendaModelo: agenda, clubes });
      const total = [...nova.values()].reduce((s, l) => s + l.length, 0);
      assert.strictEqual(total, mundo.partidas[id].length, `${id}: total de jogos`);
      umJogoPorRodada(nova, clubes, comp.rodadas, id);
      const modelo = R.modeloDeSemanas(agenda)["Fase Regular"];
      for (const [semana, jogos] of nova) for (const j of jogos) {
        assert.strictEqual(semana, R.umAnoDepois(modelo[j.rodada]), `${id}: rodada ${j.rodada} fora da semana`);
      }
      assert.ok(R.primeiraSemana(nova) > R.ultimaSemana(agenda), `${id}: a temporada nova começa antes da anterior acabar`);
      assert.strictEqual(JSON.stringify([...R.agendaGerada({ agendaModelo: agenda, clubes })]), JSON.stringify([...nova]), `${id}: não determinística`);
      const porDia = {};
      for (const jogos of nova.values()) for (const j of jogos) for (const c of [j.casa, j.fora]) {
        const k = `${c}@${j.data}`;
        assert.ok(!porDia[k], `${id}: clube ${c} com 2 jogos em ${j.data}`);
        porDia[k] = 1;
      }
      const quinta = R.agendaGerada({ agendaModelo: agenda, clubes, anos: 5 });
      for (const [semana, jogos] of quinta) for (const j of jogos) {
        assert.strictEqual(semana, R.mesmaSemanaAnos(modelo[j.rodada], 5), `${id}: 5ª temporada, rodada ${j.rodada} fora da semana`);
      }
      assert.throws(() => R.agendaGerada({ agendaModelo: agenda, clubes, anos: 0 }), /anos inválido/);
    }
  });

  await check("formato com duas fases (Colômbia, Apertura e Clausura em turno único)", () => {
    const id = "col_primera_a";
    const clubes = clubesDe(id);
    const turnoUnico = (fase, ids) => {
      const todas = generateAllRounds(ids);
      const metade = ids.length - 1;
      return Object.fromEntries(Object.entries(todas).filter(([r]) => Number(r) <= metade)
        .map(([r, jogos]) => [r, fase === "Clausura" ? jogos.map((m) => ({ home: m.away, away: m.home })) : jogos]));
    };
    const nova = R.agendaGerada({ agendaModelo: agendaDe(id), clubes, fases: ["Apertura", "Clausura"], confrontos: turnoUnico });
    umJogoPorRodada(nova, clubes, 38, id);
    const fim = (fase) => Math.max(...[...nova.entries()].filter(([, js]) => js.some((j) => j.fase === fase)).map(([s]) => Date.parse(s)));
    const ini = (fase) => Math.min(...[...nova.entries()].filter(([, js]) => js.some((j) => j.fase === fase)).map(([s]) => Date.parse(s)));
    assert.ok(fim("Apertura") < ini("Clausura"), "Clausura começa antes do fim da Apertura");
    assert.throws(() => R.agendaGerada({ agendaModelo: agendaDe(id), clubes, fases: ["Intermedio"] }), /sem modelo/);
  });

  await check("início do save na Premier League e pré-simulação das outras ligas até lá", () => {
    const inicio = R.inicioDoMundo(agendaDe("premier_league"));
    assert.strictEqual(inicio, "2026-07-20"); // 1º jogo em 21/08/2026 (semana de 17/08), 4 semanas antes
    const antes = R.jogosAntesDe(agendas, inicio);
    const ligas = new Set(antes.map((j) => j.liga));
    for (const sa of ["arg_liga_profesional", "chi_liga_primera", "uru_primera"]) assert.ok(ligas.has(sa), `${sa} não jogou antes`);
    for (const l of ligas) assert.strictEqual(mundo.competicoes[l].regiao, "america_sul", `${l} jogou antes da Europa começar`);
    assert.ok(antes.every((j) => R.segundaDe(j.data) < inicio), "jogo da semana de início entrou na pré-simulação");
    for (let i = 1; i < antes.length; i++) assert.ok(R.segundaDe(antes[i - 1].data) <= R.segundaDe(antes[i].data), "fora de ordem");
    assert.strictEqual(JSON.stringify(R.jogosAntesDe(agendas, inicio)), JSON.stringify(antes), "não determinística");
    const semana = R.jogosDaSemana(agendas, "2026-08-17");
    assert.ok(semana.some((j) => j.liga === "premier_league") && semana.some((j) => j.liga === "arg_liga_profesional"), "a semana não junta Europa e América do Sul");
  });

  await check("situação da liga e semanas com 2 jogos do mesmo clube", () => {
    const pl = agendaDe("premier_league");
    assert.strictEqual(R.situacaoDaLiga(pl, "2026-07-20"), "antes");
    assert.strictEqual(R.situacaoDaLiga(pl, "2026-12-28"), "andamento");
    assert.strictEqual(R.situacaoDaLiga(pl, R.proximaSemana(R.ultimaSemana(pl))), "fim");
    let cheias = 0;
    for (const [, agenda] of agendas) cheias += R.semanasCheias(agenda).length;
    console.log(`   (semanas com 2+ jogos do mesmo clube nos pacotes: ${cheias})`);
    const teste = R.agendaDoPacote([["F", 1, "2026-09-01", 1, 2], ["F", 2, "2026-09-05", 2, 3]]);
    assert.deepStrictEqual(R.semanasCheias(teste), [{ semana: "2026-08-31", clube: "2", jogos: 2 }]);
  });

  await check("calendário brasileiro de hoje em semanas do relógio, rodadas intactas", () => {
    // Mesma regra de virada.buildSeasonCalendar (segundas do ano; rodadas
    // 1–38 nas semanas de "temporada"), sem depender do estado da carreira.
    const FASE_POR_MES = CALENDAR_PHASE_BY_MONTH;
    for (const year of [2026, 2027, 2030]) {
      const jan1 = new Date(Date.UTC(year, 0, 1));
      const weeks = [];
      for (let d = new Date(jan1.getTime() + ((8 - jan1.getUTCDay()) % 7) * 86400000); d.getUTCFullYear() === year; d = new Date(d.getTime() + 7 * 86400000)) {
        weeks.push({ d: d.toISOString().slice(5, 10), p: FASE_POR_MES[d.getUTCMonth()], r: null });
      }
      let r = 1;
      weeks.forEach((w) => { if (w.p === "temporada" && r <= 38) w.r = r++; });
      const s = R.semanasDoCalendarioBrasileiro({ year, weeks });
      assert.strictEqual(s.length, weeks.length);
      s.forEach((x, i) => {
        assert.strictEqual(diaDaSemana(x.semana), 1, `${x.semana} não é segunda`);
        assert.strictEqual(R.segundaDe(x.semana), x.semana);
        assert.strictEqual(x.rodada, weeks[i].r);
        if (i) assert.strictEqual(R.semanasEntre(s[i - 1].semana, x.semana), 1, "semana pulada");
      });
      assert.deepStrictEqual(s.filter((x) => x.rodada).map((x) => x.rodada), Array.from({ length: 38 }, (_, i) => i + 1));
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
