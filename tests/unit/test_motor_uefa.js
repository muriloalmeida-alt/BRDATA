// MUNDO-001, M10a (25/11/2026): Champions, Europa League e Conference
// (public/js/motor/uefa.js) pelo regulamento do pacote continental, com
// participantes sintéticos que passam por todas as fases de qualificação.
// Confere:
//   1) edição completa: fases de liga de 36 (8 rodadas na Champions e na Europa
//      League, 6 na Conference), 144/144/108 jogos; cada clube com 4 jogos em casa
//      e 4 fora (3 e 3 na Conference), 2 adversários de cada pote (1 na
//      Conference), uma partida por rodada; mata-mata e 3 campeões;
//   2) restrições do sorteio: sem adversário da mesma associação e no máximo 2 de
//      outra associação; sem confronto repetido;
//   3) qualificação: o derrotado desce pelo fluxo do pacote (Champions Q1 ->
//      Conference Q2; Champions PO -> fase de liga da Europa League...);
//   4) mata-mata: playoff 9–24 pelos blocos, volta na casa do 9º ao 16º; oitavas
//      com 1º–8º e volta em casa; final neutra em jogo único;
//   5) tabela: pontos e depois os critérios do pacote (saldo, gols...);
//   6) premiação: participação, vitória/empate, fases e título, sem duplicar;
//   7) determinismo e plano relido no meio; 30 edições aleatórias terminam.
// Uso: node tests/unit/test_motor_uefa.js
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

(async () => {
  const U = await import(pathToFileURL(path.join(ROOT, "public/js/motor/uefa.js")).href);
  const { rngDaChave } = await import(pathToFileURL(path.join(ROOT, "public/js/motor/desempate.js")).href);
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8")).continentais;

  // 16 associações; clubes "<ASSOC>-<n>" com coeficiente decrescente.
  const ASSOCS = ["ENG", "ESP", "ITA", "GER", "FRA", "POR", "NED", "BEL", "TUR", "SCO", "AUT", "SUI", "DEN", "GRE", "CZE", "NOR"];
  function edicaoValida(ano, chave) {
    const associacao = {}, coeficiente = {};
    let total = 0;
    const novo = () => { const a = ASSOCS[total % ASSOCS.length]; const id = `${a}-${++total}`; associacao[id] = a; coeficiente[id] = 1000 - total; return id; };
    const lote = (q) => Array.from({ length: q }, novo);
    // UCL: Q1 4 -> 2 vencem (2 perdem -> UECL Q2); Q2 2 + 2 = 4 -> 2 (2 -> UEL Q3);
    //      Q3 2 + 2 = 4 -> 2 (2 -> UEL PO); PO 2 + 6 = 8 -> 4 (4 -> UEL liga); liga 32 + 4 = 36.
    // UEL: Q3 2 + 2 = 4 -> 2 (2 -> UECL PO); PO 2 + 2 + 4 = 8 -> 4 (4 -> UECL liga);
    //      liga 28 + 4 + 4 = 36.
    // UECL: Q2 2 + 2 = 4 -> 2; Q3 2 + 2 = 4 -> 2; PO 2 + 2 + 12 = 16 -> 8; liga 24 + 4 + 8 = 36.
    const P = {
      UCL: { liga: lote(32), PO: lote(6), Q3: lote(2), Q2: lote(2), Q1: lote(4) },
      UEL: { liga: lote(28), PO: lote(4), Q3: lote(2) },
      UECL: { liga: lote(24), PO: lote(12), Q3: lote(2), Q2: lote(2) },
    };
    return U.montarEdicao({ ano, chave, regras: c.competicoes, calendario: c.calendarios, acesso: c.acesso, participantes: P, coeficiente, associacao });
  }
  const sim = (chave, golsMax = 4) => {
    const rng = rngDaChave(chave);
    const g = () => Math.floor(rng() * golsMax);
    return { jogar: () => ({ gh: g(), ga: g() }), prorrogacao: () => ({ gh: rng() < 0.3 ? 1 : 0, ga: rng() < 0.3 ? 1 : 0 }), penaltis: (p) => (rng() < 0.5 ? p.casa : p.fora) };
  };

  let plano;
  await check("edição completa: fases de liga de 36 (144/144/108 jogos), mandos, adversários por pote, uma partida por rodada, 3 campeões", () => {
    plano = edicaoValida(2026, "e1");
    U.jogarTudo(plano, sim("e1"));
    for (const [copa, jogos, rod, porPote, casa] of [["UCL", 144, 8, 2, 4], ["UEL", 144, 8, 2, 4], ["UECL", 108, 6, 1, 3]]) {
      const liga = plano.jogos.filter((j) => j.copa === copa && j.fase === "liga");
      assert.strictEqual(liga.length, jogos, `${copa}: jogos`);
      const potes = plano.ligas[copa].potes;
      assert.strictEqual(potes.flat().length, 36);
      const poteDe = new Map(potes.flatMap((p, i) => p.map((x) => [x, i])));
      for (const id of potes.flat()) {
        const meus = liga.filter((j) => j.casa === id || j.fora === id);
        assert.strictEqual(meus.filter((j) => j.casa === id).length, casa, `${copa} ${id}: jogos em casa`);
        assert.strictEqual(meus.length, rod, `${copa} ${id}: jogos`);
        const porP = {};
        for (const j of meus) { const o = j.casa === id ? j.fora : j.casa; porP[poteDe.get(o)] = (porP[poteDe.get(o)] || 0) + 1; }
        assert.ok(Object.values(porP).every((q) => q === porPote) && Object.keys(porP).length === potes.length, `${copa} ${id}: adversários por pote ${JSON.stringify(porP)}`);
        const rods = meus.map((j) => j.rodada).sort((a, b) => a - b);
        assert.deepStrictEqual(rods, Array.from({ length: rod }, (_, i) => i + 1), `${copa} ${id}: rodadas`);
      }
      // Conference: casa e fora por par de potes (1–2, 3–4, 5–6).
      if (copa === "UECL") {
        const grupo = (p) => Math.floor(p / 2);
        for (const id of potes.flat()) {
          const meus = liga.filter((j) => j.casa === id || j.fora === id);
          for (let g = 0; g < 3; g++) {
            const doG = meus.filter((j) => grupo(poteDe.get(j.casa === id ? j.fora : j.casa)) === g);
            assert.strictEqual(doG.filter((j) => j.casa === id).length, 1, `${id}: mandos contra os potes do grupo ${g}`);
          }
        }
      }
      assert.ok(plano.resultado.campeoes[copa]);
    }
    assert.ok(plano.jogos.every((j) => /^202[67]-/.test(j.data)), "data fora de 2026/27");
  });

  await check("sorteio: sem a mesma associação, no máximo 2 de outra associação, sem confronto repetido", () => {
    for (const copa of ["UCL", "UEL", "UECL"]) {
      const liga = plano.jogos.filter((j) => j.copa === copa && j.fase === "liga");
      const pares = new Set();
      const porAssoc = {};
      for (const j of liga) {
        assert.notStrictEqual(plano.associacao[j.casa], plano.associacao[j.fora], `${copa}: ${j.casa} x ${j.fora}`);
        const k = [j.casa, j.fora].sort().join("|");
        assert.ok(!pares.has(k), `${copa}: confronto repetido ${k}`);
        pares.add(k);
        for (const [x, y] of [[j.casa, j.fora], [j.fora, j.casa]]) { const m = (porAssoc[x] ||= {}); m[plano.associacao[y]] = (m[plano.associacao[y]] || 0) + 1; }
      }
      for (const [id, m] of Object.entries(porAssoc)) assert.ok(Object.values(m).every((q) => q <= 2), `${copa} ${id}: ${JSON.stringify(m)}`);
    }
  });

  await check("qualificação: derrotados descem pelos fluxos do pacote", () => {
    const perd = (copa, fase) => plano.confrontos.filter((x) => x.copa === copa && x.etapa === fase).map((x) => x.perdedor);
    const em = (copa, fase) => new Set(plano.confrontos.filter((x) => x.copa === copa && x.etapa === fase).flatMap((x) => [x.a, x.b]));
    for (const id of perd("UCL", "Q1")) assert.ok(em("UECL", "Q2").has(id), "Champions Q1 -> Conference Q2");
    for (const id of perd("UCL", "Q2")) assert.ok(em("UEL", "Q3").has(id), "Champions Q2 -> Europa League Q3");
    for (const id of perd("UCL", "Q3")) assert.ok(em("UEL", "PO").has(id), "Champions Q3 -> Europa League PO");
    for (const id of perd("UCL", "PO")) assert.ok(plano.ligas.UEL.potes.flat().includes(id), "Champions PO -> fase de liga da Europa League");
    for (const id of perd("UEL", "PO")) assert.ok(plano.ligas.UECL.potes.flat().includes(id), "Europa League PO -> fase de liga da Conference");
    for (const id of plano.confrontos.filter((x) => x.copa === "UCL" && x.etapa === "PO").map((x) => x.vencedor)) assert.ok(plano.ligas.UCL.potes.flat().includes(id));
    for (const x of plano.confrontos.filter((y) => ["Q1", "Q2", "Q3", "PO"].includes(y.etapa))) assert.notStrictEqual(plano.associacao[x.a], plano.associacao[x.b], "qualificação com a mesma associação");
  });

  await check("mata-mata: playoff 9–24 pelos blocos (volta do 9º–16º), oitavas com 1º–8º em casa na volta, final neutra", () => {
    for (const copa of ["UCL", "UEL", "UECL"]) {
      const ord = plano.ligas[copa].ordem;
      const pos = (id) => ord.indexOf(id) + 1;
      const po = plano.confrontos.filter((x) => x.copa === copa && x.etapa === "playoff_mata_mata");
      assert.strictEqual(po.length, 8);
      for (const x of po) {
        const [pa, pb] = [pos(x.a), pos(x.b)];
        assert.ok(pa >= 9 && pa <= 16 && pb >= 17 && pb <= 24, `${copa}: playoff ${pa}x${pb}`);
        const bloco = c.competicoes[copa].mata_mata.playoff_blocos.find(([cima]) => cima.includes(pa));
        assert.ok(bloco[1].includes(pb), `${copa}: ${pa}x${pb} fora do bloco`);
        assert.strictEqual(x.placares[1].casa, x.a, "volta na casa do 9º–16º");
      }
      const oit = plano.confrontos.filter((x) => x.copa === copa && x.etapa === "oitavas");
      assert.strictEqual(oit.length, 8);
      for (const x of oit) { assert.ok(pos(x.a) <= 8); assert.strictEqual(x.placares[1].casa, x.a); }
      const fin = plano.confrontos.find((x) => x.copa === copa && x.etapa === "final");
      assert.ok(fin.neutro && fin.pernas === 1);
      for (const x of plano.confrontos.filter((y) => y.copa === copa)) assert.ok(x.vencedor != null);
    }
  });

  await check("tabela da fase de liga: pontos e depois os critérios do pacote", () => {
    const t = U.tabelaDaLiga(plano, "UCL");
    assert.strictEqual(t.length, 36);
    for (let i = 1; i < t.length; i++) {
      const a = t[i - 1], b = t[i];
      assert.ok(a.pts > b.pts || (a.pts === b.pts && (a.sg > b.sg || (a.sg === b.sg && a.gp >= b.gp))), `ordem ${i}`);
    }
    assert.strictEqual(t.reduce((s, l) => s + l.j, 0), 288);
    assert.deepStrictEqual(plano.ligas.UCL.ordem, t.map((l) => l.id));
  });

  await check("premiação: participação, vitória/empate, fases e título; sem duplicar", () => {
    const pr = U.PREMIACAO_UEFA;
    const camp = plano.resultado.campeoes.UCL;
    const meus = U.premiosDoClube(plano, camp);
    assert.ok(meus.some((p) => p.tipo === "participacao" && p.valorEUR === pr.UCL.participacao));
    assert.ok(meus.some((p) => p.tipo === "campeao" && p.valorEUR === pr.UCL.campeao));
    assert.ok(meus.some((p) => p.tipo === "final"));
    const liga = plano.jogos.filter((j) => j.copa === "UEL" && j.fase === "liga");
    const vit = liga.filter((j) => j.gh !== j.ga).length, emp = liga.filter((j) => j.gh === j.ga).length;
    assert.strictEqual(plano.premios.filter((p) => p.copa === "UEL" && p.tipo === "vitoria").length, vit);
    assert.strictEqual(plano.premios.filter((p) => p.copa === "UEL" && p.tipo === "empate").length, 2 * emp);
    assert.strictEqual(plano.premios.filter((p) => p.tipo === "participacao").length, 108);
    assert.strictEqual(new Set(plano.premios.map((p) => p.chave)).size, plano.premios.length);
    assert.throws(() => U.registrarJogo(plano, liga[0].id, { gh: 1, ga: 0 }, sim("x")), /já jogado/);
  });

  await check("mesma seed = mesma edição; relido no meio termina igual; 30 edições aleatórias terminam", () => {
    const a = edicaoValida(2026, "det"), b = edicaoValida(2026, "det");
    assert.deepStrictEqual(U.jogarTudo(a, sim("d")), U.jogarTudo(b, sim("d")));
    const s = sim("r");
    const direto = U.jogarTudo(edicaoValida(2026, "rel"), sim("r"));
    let p = edicaoValida(2026, "rel");
    for (let k = 0; k < 300; k++) {
      const [j] = U.jogosPendentes(p);
      U.registrarJogo(p, j.id, s.jogar(j), s);
      if (k % 40 === 0) p = JSON.parse(JSON.stringify(p));
    }
    assert.deepStrictEqual(U.jogarTudo(p, s), direto);
    const e27 = edicaoValida(2027, "e27");
    U.jogarTudo(e27, sim("e27"));
    assert.ok(e27.jogos.every((j) => /^202[78]-/.test(j.data)), "edição de 2027/28 fora das datas");
    const t0 = Date.now();
    for (let k = 0; k < 30; k++) {
      const r = U.jogarTudo(edicaoValida(2026, `al${k}`), sim(`al${k}`, k % 3 === 0 ? 2 : 5));
      assert.ok(r.campeoes.UCL && r.campeoes.UEL && r.campeoes.UECL);
    }
    console.log(`   30 edições em ${Date.now() - t0} ms`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
