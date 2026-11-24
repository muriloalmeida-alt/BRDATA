// MUNDO-001, etapa M5 (24/11/2026): virada por país (public/js/motor/viradapais.js),
// ligada ao relógio, às fases europeias e aos formatos sul-americanos, com os
// clubes, zonas e catálogos reais do índice do mundo. Confere:
//   1) 3 temporadas seguidas nos 10 países (calendário gerado com os clubes do
//      save, fases, virada): tamanhos das divisões, conjuntos disjuntos,
//      catálogo conservado (divisões + catálogo = mesmo total), clube
//      bloqueado nunca entra, determinístico (mesma seed = mesma virada);
//   2) Espanha: o principal cai para a 2ª onde está o B -> o B cai para o
//      catálogo e entra mais um; o B condicional do catálogo só é elegível com
//      o principal na 1ª;
//   3) Alemanha: II bloqueados nunca sorteados (200 sorteios) e representante do
//      barrage sempre elegível;
//   4) proteção do clube do jogador (Inglaterra, Uruguai pelo promedio): fica na
//      divisão, cai o próximo da zona de baixo, exceção registrada;
//   5) Argentina: zonas da temporada nova (15/15 e 18/18) e reposição pelos dois
//      circuitos (Metropolitana e Federal A);
//   6) histórico do promedio pela janela; entrada inválida falha sem mexer em nada.
// Uso: node tests/unit/test_motor_viradapais.js
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
const imp = (m) => import(pathToFileURL(path.join(ROOT, "public/js/motor", m)).href);

(async () => {
  const V = await imp("viradapais.js");
  const Fa = await imp("fases.js");
  const Fo = await imp("formatos.js");
  const Rel = await imp("relogio.js");
  const D = await imp("desempate.js");
  const mundo = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const C = mundo.competicoes;
  const clube = new Map([...mundo.clubes, ...mundo.terceira].map((c) => [c.id, c]));
  const catalogoInicial = (pais) => mundo.terceira.filter((c) => c.pais === pais).map((c) => ({ id: c.id, elegibilidade: c.elegibilidade, clubePai: c.clubePai, grupo: c.grupo }));
  const reservasDoMundo = mundo.clubes.filter((c) => c.reserva && c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai }))
    .concat(mundo.terceira.filter((c) => c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai })));

  const simDe = (chave, forcar = null) => {
    const rng = D.rngDaChave(chave);
    const g = () => { const x = rng(); return x < 0.3 ? 0 : x < 0.65 ? 1 : x < 0.88 ? 2 : 3; };
    return {
      jogar: (j) => {
        if (forcar && (j.casa === forcar || j.fora === forcar)) return j.casa === forcar ? { gh: 0, ga: 4 } : { gh: 4, ga: 0 };
        return { gh: g(), ga: g() };
      },
      prorrogacao: () => ({ gh: rng() < 0.3 ? 1 : 0, ga: rng() < 0.3 ? 1 : 0 }),
      penaltis: (p) => (forcar === p.casa ? p.fora : forcar === p.fora ? p.casa : rng() < 0.5 ? p.casa : p.fora),
    };
  };

  // Uma temporada de um país; devolve a virada aplicada e o estado novo.
  function temporada(pais, estado, ano, k, { humano = null, forcar = null } = {}) {
    const [l1, l2] = pais.ligas;
    const sim = simDe(`${pais.codigo}:${ano}:${k}`, forcar);
    const reservasAtivas = reservasDoMundo.filter((r) => [...estado[l1], ...estado[l2]].includes(r.id));
    const agendaDe = (liga) => {
      const pacote = Rel.agendaDoPacote(mundo.partidas[liga]);
      if (ano === estado.anoInicial) return pacote;
      const fases = [...new Set(mundo.partidas[liga].map((p) => p[0]))];
      const ger = C[liga].regiao === "europa" ? undefined : Fo.geradorDeConfrontos(liga, estado.zonas[liga] || null);
      return Rel.agendaGerada({ agendaModelo: pacote, anos: ano - estado.anoInicial, clubes: estado[liga], fases, confrontos: ger });
    };
    let mov;
    if (pais.regiao === "europa") {
      const tab = {};
      for (const liga of [l1, l2]) {
        const linhas = Object.fromEntries(estado[liga].map((id) => [id, { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }]));
        const resultados = [];
        for (const jogos of agendaDe(liga).values()) for (const j of jogos) {
          const r = sim.jogar(j);
          resultados.push({ home: j.casa, away: j.fora, gh: r.gh, ga: r.ga });
          for (const [id, a, b] of [[j.casa, r.gh, r.ga], [j.fora, r.ga, r.gh]]) { const L = linhas[id]; L.j++; L.gp += a; L.gc += b; if (a > b) { L.v++; L.pts += 3; } else if (a === b) { L.e++; L.pts++; } else L.d++; }
        }
        const ordem = D.classificar(Object.values(linhas), D.opcoesDaLiga(C[liga], mundo.perfisDesempate, resultados, `${liga}:${ano}`)).ordem;
        tab[liga] = { ordem: ordem.map((l) => l.id), pontos: Object.fromEntries(ordem.map((l) => [l.id, l.pts])) };
      }
      const divAtual = (id) => (estado[l1].includes(id) ? 1 : estado[l2].includes(id) ? 2 : null);
      const temBarrage = !!(C[l2].regras || {}).interDivisionPlayoff;
      const rep = temBarrage ? V.sortearRepresentante({ catalogo: estado.catalogo, divisaoAtual: divAtual, chave: `${pais.codigo}:${ano}` }) : null;
      const plano = Fa.montarPosTemporada({ pais: pais.codigo, comps: [C[l1], C[l2]], ordens: { [l1]: tab[l1].ordem, [l2]: tab[l2].ordem }, pontos: { [l1]: tab[l1].pontos, [l2]: tab[l2].pontos }, reservas: reservasAtivas.map((r) => r.id), representanteTerceira: rep, chave: `${pais.codigo}:${ano}` });
      const res = Fa.jogarTudo(plano, sim);
      mov = { sobemD2: res.sobem[l2], descemD1: res.descem[l1], descemD2: res.descem[l2], sobemTerceira: res.sobem.terceira, quedaD2: tab[l2].ordem.slice().reverse(), rep };
    } else {
      const res = {};
      for (const liga of [l1, l2]) {
        const plano = Fo.montarTemporada({ comp: C[liga], ano, clubes: estado[liga], grupos: estado.zonas[liga] || null, jogosFixos: [...agendaDe(liga).values()].flat(), historico: estado.historico[liga] || {}, reservas: reservasAtivas.map((r) => r.id) });
        res[liga] = Fo.jogarTudo(plano, sim);
        if (res[liga].promedio) {
          const porClube = Object.fromEntries(Object.entries(res[liga].promedio).map(([id, p]) => [id, { pts: p.ptsTemporada, j: p.jTemporada }]));
          estado.historico[liga] = V.atualizarHistorico(estado.historico[liga], ano, porClube, C[liga].regras.relegation.seasonWindow);
        }
      }
      const r2 = res[l2];
      const quedaD2 = r2.promedio ? Object.keys(r2.promedio).map(Number).sort((a, b) => r2.promedio[a].pts * r2.promedio[b].j - r2.promedio[b].pts * r2.promedio[a].j)
        : (r2.anual || r2.reclassificacao || [...(r2.zonas ? [...r2.zonas.A, ...r2.zonas.B] : []), ...(r2.grupos ? Object.values(r2.grupos).flat() : [])]).slice().reverse();
      mov = { sobemD2: res[l2].sobem.map((x) => x.id), descemD1: res[l1].descem.map((x) => x.id), descemD2: res[l2].descem.map((x) => x.id), sobemTerceira: [], quedaD2, res };
    }
    const v = V.aplicarVirada({
      pais: pais.codigo, chave: `${pais.codigo}:${ano}`, d1: { id: l1, clubes: estado[l1] }, d2: { id: l2, clubes: estado[l2] },
      ...mov, catalogo: estado.catalogo, reservas: reservasDoMundo, humano,
      zonas: Object.keys(estado.zonas).length ? estado.zonas : undefined,
    });
    return { v, mov };
  }

  const estadoInicial = (pais) => {
    const [l1, l2] = pais.ligas;
    const zonas = {};
    for (const l of [l1, l2]) if (mundo.grupos[l] && l.startsWith("arg_")) zonas[l] = mundo.grupos[l];
    return {
      anoInicial: C[l1].temporada.anoInicial, [l1]: mundo.clubes.filter((c) => c.liga === l1).map((c) => c.id), [l2]: mundo.clubes.filter((c) => c.liga === l2).map((c) => c.id),
      catalogo: catalogoInicial(pais.codigo), zonas, historico: JSON.parse(JSON.stringify(mundo.promedioInicial)),
      gruposUru: mundo.grupos.uru_segunda,
    };
  };
  const avancarEstado = (pais, estado, v, ano) => {
    const [l1, l2] = pais.ligas;
    estado[l1] = v[l1]; estado[l2] = v[l2]; estado.catalogo = v.catalogo;
    if (v.zonas) estado.zonas = v.zonas;
    if (pais.codigo === "UY") estado.zonas = { uru_segunda: V.sortearGrupos(v[l2], ["A", "B"], `UY:${ano + 1}`) };
  };

  await check("3 temporadas nos 10 países: tamanhos, disjunção, catálogo conservado, bloqueado nunca entra, determinístico", () => {
    for (const pais of mundo.paises) {
      const [l1, l2] = pais.ligas;
      const estado = estadoInicial(pais);
      if (pais.codigo === "UY") estado.zonas = { uru_segunda: mundo.grupos.uru_segunda };
      const total = estado[l1].length + estado[l2].length + estado.catalogo.length;
      for (let k = 0; k < 3; k++) {
        const ano = estado.anoInicial + k;
        const estado2 = JSON.parse(JSON.stringify(estado)); // antes: a temporada atualiza o histórico
        const { v } = temporada(pais, estado, ano, k);
        const de = JSON.stringify(v);
        assert.strictEqual(JSON.stringify(temporada(pais, estado2, ano, k).v), de, `${pais.codigo} ${ano}: virada não determinística`);
        assert.strictEqual(v[l1].length, C[l1].clubes, `${pais.codigo} ${ano}: 1ª`);
        assert.strictEqual(v[l2].length, C[l2].clubes, `${pais.codigo} ${ano}: 2ª`);
        assert.strictEqual(v[l1].length + v[l2].length + v.catalogo.length, total, `${pais.codigo} ${ano}: clubes sumiram ou apareceram`);
        for (const id of v.entraramDoCatalogo) {
          const c = clube.get(id);
          assert.ok(!c || c.elegibilidade !== "blocked", `${pais.codigo}: bloqueado entrou (${c && c.nome})`);
          assert.ok(!c || c.elegibilidade !== "simulation_only", `${pais.codigo}: simulation_only entrou`);
        }
        for (const r of reservasDoMundo) assert.ok(!v[l1].includes(r.id), `${pais.codigo}: clube B na 1ª`);
        for (const r of reservasDoMundo) assert.ok(!(v[l2].includes(r.id) && v[l2].includes(r.clubePai)), `${pais.codigo}: B e principal na 2ª`);
        if (v.zonas) for (const [liga, z] of Object.entries(v.zonas)) {
          const tam = Object.values(mundo.grupos[liga]).map((x) => x.length);
          assert.deepStrictEqual(Object.values(z).map((x) => x.length), tam, `${liga}: tamanho das zonas`);
          assert.deepStrictEqual(Object.values(z).flat().sort(), v[liga].slice().sort(), `${liga}: zonas x clubes`);
        }
        avancarEstado(pais, estado, v, ano);
      }
    }
  });

  await check("Espanha: o principal cai onde está o B -> B vai ao catálogo; B condicional do catálogo só com o principal na 1ª", () => {
    const [l1, l2] = ["la_liga", "laliga_hypermotion"];
    const d1 = mundo.clubes.filter((c) => c.liga === l1).map((c) => c.id), d2 = mundo.clubes.filter((c) => c.liga === l2).map((c) => c.id);
    const bReal = mundo.clubes.find((c) => c.liga === l2 && c.reserva);
    const pai = bReal.clubePai;
    const sobem = d2.filter((id) => !mundo.clubes.find((c) => c.id === id).reserva).slice(0, 3);
    const descemD1 = [pai, ...d1.filter((id) => id !== pai).slice(0, 2)];
    const descemD2 = d2.filter((id) => !sobem.includes(id) && id !== bReal.id).slice(-4);
    const catalogo = catalogoInicial("ES");
    const v = V.aplicarVirada({ pais: "ES", chave: "ES:b", d1: { id: l1, clubes: d1 }, d2: { id: l2, clubes: d2 }, sobemD2: sobem, descemD1, descemD2, catalogo, reservas: reservasDoMundo });
    assert.ok(!v[l2].includes(bReal.id) && v.foramParaOCatalogo.includes(bReal.id), "o B deveria cair");
    assert.strictEqual(v.entraramDoCatalogo.length, 5, "entram 4 + 1 no lugar do B");
    assert.ok(v.excecoes.some((e) => e.tipo === "clube-b"));
    const castilla = catalogo.find((c) => c.elegibilidade === "conditional_parent_above_target");
    const div = (comPaiNa1) => (id) => (id === castilla.clubePai ? (comPaiNa1 ? 1 : 2) : null);
    assert.strictEqual(V.elegivelDoCatalogo(castilla, div(true)), true);
    assert.strictEqual(V.elegivelDoCatalogo(castilla, div(false)), false);
    // O B que caiu volta ao catálogo como condicional ao principal.
    const volta = v.catalogo.find((c) => c.id === bReal.id);
    assert.strictEqual(volta.elegibilidade, "conditional_parent_above_target");
  });

  await check("Alemanha: II bloqueados nunca sorteados e representante sempre elegível (200 sorteios)", () => {
    const catalogo = catalogoInicial("DE");
    const bloqueados = new Set(catalogo.filter((c) => c.elegibilidade === "blocked").map((c) => c.id));
    assert.strictEqual(bloqueados.size, 2);
    const d1 = mundo.clubes.filter((c) => c.liga === "bundesliga").map((c) => c.id), d2 = mundo.clubes.filter((c) => c.liga === "bundesliga_2").map((c) => c.id);
    for (let k = 0; k < 200; k++) {
      const rep = V.sortearRepresentante({ catalogo, divisaoAtual: () => null, chave: `DE:${k}` });
      assert.ok(!bloqueados.has(rep));
      const v = V.aplicarVirada({ pais: "DE", chave: `DE:${k}`, d1: { id: "bundesliga", clubes: d1 }, d2: { id: "bundesliga_2", clubes: d2 }, sobemD2: d2.slice(0, 2), descemD1: d1.slice(-2), descemD2: d2.slice(-3), sobemTerceira: [rep], catalogo, reservas: reservasDoMundo });
      assert.ok(v.entraramDoCatalogo.every((id) => !bloqueados.has(id)));
      assert.ok(v.entraramDoCatalogo.includes(rep));
      assert.strictEqual(v.entraramDoCatalogo.length, 3);
    }
  });

  await check("proteção do clube do jogador: fica na divisão, cai o próximo da zona de baixo, exceção registrada", () => {
    for (const cod of ["GB-ENG", "UY"]) {
      const pais = mundo.paises.find((p) => p.codigo === cod);
      const estado = estadoInicial(pais);
      if (cod === "UY") estado.zonas = { uru_segunda: mundo.grupos.uru_segunda };
      const humano = estado[pais.ligas[1]][0];
      const { v, mov } = temporada(pais, estado, estado.anoInicial, 0, { humano, forcar: humano });
      assert.ok(mov.descemD2.includes(humano), `${cod}: o roteiro deveria rebaixar o humano`);
      assert.ok(v[pais.ligas[1]].includes(humano), `${cod}: o humano caiu`);
      const ex = v.excecoes.find((e) => e.tipo === "protecao");
      assert.ok(ex && ex.protegido === humano && v.foramParaOCatalogo.includes(ex.caiNoLugar), `${cod}: exceção`);
      assert.ok(!mov.descemD2.includes(ex.caiNoLugar), `${cod}: o substituto já caía`);
    }
  });

  await check("Argentina: zonas novas 15/15 e 18/18 e reposição pelos dois circuitos", () => {
    const pais = mundo.paises.find((p) => p.codigo === "AR");
    const estado = estadoInicial(pais);
    const { v } = temporada(pais, estado, 2026, 0);
    assert.deepStrictEqual(Object.values(v.zonas.arg_liga_profesional).map((z) => z.length), [15, 15]);
    assert.deepStrictEqual(Object.values(v.zonas.arg_primera_nacional).map((z) => z.length), [18, 18]);
    const circ = v.entraramDoCatalogo.map((id) => clube.get(id).grupo);
    assert.strictEqual(circ.filter((g) => g.startsWith("Primera B Metropolitana")).length, 2, `circuitos ${circ}`);
    assert.strictEqual(circ.filter((g) => g.startsWith("Federal A")).length, 2, `circuitos ${circ}`);
    // Quem continua na LPF não muda de zona.
    for (const [z, ids] of Object.entries(mundo.grupos.arg_liga_profesional)) {
      for (const id of ids) if (v.arg_liga_profesional.includes(id)) assert.ok(v.zonas.arg_liga_profesional[z].includes(id));
    }
  });

  await check("histórico do promedio pela janela; entrada inválida falha sem mexer na entrada", () => {
    const h = { 1: [{ ano: 2024, pts: 30, j: 27 }, { ano: 2025, pts: 40, j: 32 }] };
    const n3 = V.atualizarHistorico(h, 2026, { 1: { pts: 50, j: 32 }, 2: { pts: 20, j: 32 } }, 3);
    assert.deepStrictEqual(n3[1].map((x) => x.ano), [2025, 2026], "janela 3: 2027 usa 2025 e 2026");
    assert.deepStrictEqual(n3[2], [{ ano: 2026, pts: 20, j: 32 }]);
    assert.deepStrictEqual(V.atualizarHistorico(h, 2026, { 1: { pts: 50, j: 32 } }, 2)[1].map((x) => x.ano), [2026]);
    const d1 = mundo.clubes.filter((c) => c.liga === "premier_league").map((c) => c.id), d2 = mundo.clubes.filter((c) => c.liga === "efl_championship").map((c) => c.id);
    const entrada = { pais: "GB-ENG", chave: "x", d1: { id: "premier_league", clubes: d1 }, d2: { id: "efl_championship", clubes: d2 }, sobemD2: d2.slice(0, 2), descemD1: d1.slice(-3), descemD2: d2.slice(-3), catalogo: catalogoInicial("GB-ENG") };
    const antes = JSON.stringify(entrada);
    assert.throws(() => V.aplicarVirada(entrada), /2 sobem e 3 descem/);
    assert.strictEqual(JSON.stringify(entrada), antes, "entrada alterada");
    entrada.sobemD2 = d2.slice(0, 3);
    V.aplicarVirada(entrada);
    assert.strictEqual(JSON.stringify(entrada), antes.replace(JSON.stringify(d2.slice(0, 2)), JSON.stringify(d2.slice(0, 3))), "virada válida alterou a entrada");
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
