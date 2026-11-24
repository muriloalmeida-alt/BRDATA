// MUNDO-001, etapa M3 (24/11/2026): desempates e fases de fim de temporada das
// ligas europeias (public/js/motor/desempate.js e fases.js), com as regras reais
// do índice do mundo e placares roteirizados (sem sorte):
//   1) Premier: confronto direto só em posição decisiva (título); no meio da
//      tabela, o empate total vai ao sorteio e não é "decisivo";
//   2) Espanha: 2 empatados = saldo do confronto direto antes do saldo geral;
//      3 empatados = minitabela por pontos;
//   3) Alemanha: confronto direto só depois dos dois jogos entre os empatados;
//      Itália: pontos do confronto direto antes do saldo; EFL: vitórias;
//   4) Championship: playoff de 8, o 3º pega o vencedor pior colocado, final
//      em campo neutro, prorrogação e pênaltis;
//   5) Hypermotion: clube B não sobe, a vaga passa ao próximo elegível e o
//      playoff anda junto; empate no agregado e na prorrogação = melhor campanha;
//   6) Serie B: 3º sobe direto com mais de 14 pontos sobre o 4º; com 14,
//      playoff (eliminatória decidida pela campanha); playout com até 4 pontos,
//      queda direta do 17º com 5;
//   7) Serie A: pontos iguais no 1º e no 2º = jogo de título com pênaltis;
//      pontos iguais no 17º e 18º = decisão em ida e volta;
//   8) Alemanha: 16º da Bundesliga x 3º da 2. Bundesliga e 16º da 2. x
//      representante da 3ª divisão (que sobe ao vencer);
//   9) França: 4º x 5º, o vencedor no 3º, e o sobrevivente x 16º da Ligue 1;
//  10) o plano é JSON puro: salvo e relido no meio, termina igual;
//  11) 5 países x 300 temporadas aleatórias: sempre termina, quem sobe da 2ª =
//      quem cai da 1ª, clube B nunca sobe.
// Uso: node tests/unit/test_motor_fases_europa.js
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
  const D = await import(pathToFileURL(path.join(ROOT, "public/js/motor/desempate.js")).href);
  const F = await import(pathToFileURL(path.join(ROOT, "public/js/motor/fases.js")).href);
  const mundo = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const C = mundo.competicoes, P = mundo.perfisDesempate;
  const ids = (o) => D.classificar(...o).ordem.map((l) => l.id);
  const linha = (id, pts, gp, gc, extra = {}) => ({ id, pts, gp, gc, v: 0, ...extra });
  // Tabela sintética: clubes "<pre>1".."<pre>n" em ordem, pontos decrescentes.
  const tabela = (pre, n, ajustes = {}) => {
    const ordem = Array.from({ length: n }, (_, i) => `${pre}${i + 1}`);
    const pontos = Object.fromEntries(ordem.map((id, i) => [id, 100 - 2 * i]));
    Object.assign(pontos, ajustes);
    return { ordem, pontos };
  };
  // Simulador roteirizado: placar por confronto (a vitória do "a" ou do "b"),
  // prorrogação sem gols e pênaltis para quem o roteiro mandar.
  const roteiro = (regras = {}) => ({
    jogar: (p) => (regras.jogar ? regras.jogar(p) : { gh: 1, ga: 0 }),
    prorrogacao: (p) => (regras.prorrogacao ? regras.prorrogacao(p) : { gh: 0, ga: 0 }),
    penaltis: (p) => (regras.penaltis ? regras.penaltis(p) : p.casa),
  });
  const pais = (codigo, d1, d2, t1, t2, extra = {}) => F.montarPosTemporada({
    pais: codigo, comps: [C[d1], C[d2]], ordens: { [d1]: t1.ordem, [d2]: t2.ordem },
    pontos: { [d1]: t1.pontos, [d2]: t2.pontos }, chave: `teste:${codigo}`, ...extra,
  });

  await check("Premier: confronto direto só em posição decisiva; no meio, sorteio", () => {
    const o = D.opcoesDaLiga(C.premier_league, P, [{ home: "B", away: "A", gh: 2, ga: 0 }, { home: "A", away: "B", gh: 1, ga: 1 }], "pl");
    // A e B empatados em tudo no topo: B ganhou o confronto direto.
    let r = D.classificar([linha("A", 80, 70, 30), linha("B", 80, 70, 30), linha("C", 70, 50, 40)], o);
    assert.deepStrictEqual(r.ordem.map((l) => l.id), ["B", "A", "C"]);
    assert.strictEqual(r.sorteios.length, 0);
    // O mesmo empate em 9º/10º (sem nada em jogo): o confronto direto não vale.
    const meio = [...Array.from({ length: 8 }, (_, i) => linha(`T${i}`, 90 - i, 50, 40)), linha("A", 50, 40, 40), linha("B", 50, 40, 40),
      ...Array.from({ length: 10 }, (_, i) => linha(`Z${i}`, 40 - i, 30, 40))];
    r = D.classificar(meio, o);
    assert.strictEqual(r.sorteios.length, 0, "sorteio no meio não é decisivo");
    assert.deepStrictEqual(new Set(r.ordem.slice(8, 10).map((l) => l.id)), new Set(["A", "B"]));
    assert.deepStrictEqual(D.classificar(meio, o).ordem.map((l) => l.id), r.ordem.map((l) => l.id), "sorteio não determinístico");
  });

  await check("Espanha: 2 empatados pelo saldo do confronto direto; 3 pela minitabela", () => {
    const o2 = D.opcoesDaLiga(C.la_liga, P, [{ home: "A", away: "B", gh: 0, ga: 1 }, { home: "B", away: "A", gh: 0, ga: 2 }], "es");
    // A tem saldo geral pior, mas saldo de +1 no confronto direto.
    assert.deepStrictEqual(ids([[linha("A", 60, 40, 39), linha("B", 60, 50, 30)], o2]), ["A", "B"]);
    const res = [
      { home: "A", away: "B", gh: 1, ga: 0 }, { home: "B", away: "A", gh: 1, ga: 1 },
      { home: "B", away: "C", gh: 3, ga: 0 }, { home: "C", away: "B", gh: 0, ga: 0 },
      { home: "C", away: "A", gh: 1, ga: 0 }, { home: "A", away: "C", gh: 0, ga: 0 },
    ]; // minitabela: A 5 pts, B 5 pts, C 5 pts? (A: V,E,D,E = 1+... )
    // A: 3 (x B) + 1 (x B) + 0 (x C) + 1 (x C) = 5; B: 0 + 1 + 3 + 1 = 5; C: 0 + 1 + 3 + 1 = 5.
    // Empate de pontos na minitabela -> saldo da minitabela: A 0, B +2, C -2.
    const o3 = D.opcoesDaLiga(C.la_liga, P, res, "es");
    assert.deepStrictEqual(ids([[linha("A", 60, 45, 30), linha("B", 60, 40, 30), linha("C", 60, 50, 30)], o3]), ["B", "A", "C"]);
  });

  await check("Alemanha: confronto direto só com os dois jogos; Itália: pontos do confronto antes do saldo; EFL: vitórias", () => {
    // Alemanha: mesmo saldo e gols; A venceu o único jogo entre eles -> ainda não vale.
    const so1 = D.opcoesDaLiga(C.bundesliga, P, [{ home: "A", away: "B", gh: 2, ga: 0 }], "de");
    const r = D.classificar([linha("B", 70, 50, 30), linha("A", 70, 50, 30)], so1);
    assert.strictEqual(r.sorteios.length, 1, "sem o 2º jogo o empate vai ao sorteio");
    const ambos = D.opcoesDaLiga(C.bundesliga, P, [{ home: "A", away: "B", gh: 2, ga: 0 }, { home: "B", away: "A", gh: 1, ga: 0 }], "de");
    assert.deepStrictEqual(ids([[linha("B", 70, 50, 30), linha("A", 70, 50, 30)], ambos]), ["A", "B"]);
    // Itália: B tem saldo geral muito melhor, A ganhou os dois jogos entre eles.
    const it = D.opcoesDaLiga(C.serie_a_italia, P, [{ home: "A", away: "B", gh: 1, ga: 0 }, { home: "B", away: "A", gh: 0, ga: 1 }], "it");
    assert.deepStrictEqual(ids([[linha("B", 60, 60, 20), linha("A", 60, 40, 30)], it]), ["A", "B"]);
    // EFL: mesmo saldo, gols e confronto (2 empates) -> mais vitórias.
    const efl = D.opcoesDaLiga(C.efl_championship, P, [{ home: "A", away: "B", gh: 1, ga: 1 }, { home: "B", away: "A", gh: 1, ga: 1 }], "en");
    assert.deepStrictEqual(ids([[linha("A", 70, 60, 40, { v: 19 }), linha("B", 70, 60, 40, { v: 20 })], efl]), ["B", "A"]);
  });

  await check("Championship: playoff de 8, 3º x vencedor pior colocado, final neutra com pênaltis", () => {
    const t1 = tabela("P", 20), t2 = tabela("C", 24);
    const plano = pais("GB-ENG", "premier_league", "efl_championship", t1, t2);
    // Eliminatórias: 5x8 (o 8º vence fora) e 6x7 (o 6º vence em casa).
    const sim = roteiro({
      jogar: (p) => {
        if (p.etapa === "pp-1") return p.casa === "C5" ? { gh: 0, ga: 1 } : { gh: 1, ga: 0 };
        if (p.etapa === "pp-final") return { gh: 2, ga: 2 };
        return { gh: 1, ga: 0 }; // semis: cada mandante vence -> agregado 1x1 -> prorrogação 0x0 -> pênaltis
      },
      penaltis: (p) => (["C3", "C6"].includes(p.casa) ? p.casa : p.fora),
    });
    const pp1 = F.pernasPendentes(plano);
    assert.deepStrictEqual(pp1.map((p) => [p.casa, p.fora]), [["C5", "C8"], ["C6", "C7"]]);
    const res = F.jogarTudo(plano, sim);
    const semis = plano.confrontos.filter((c) => c.etapa === "pp-2");
    assert.deepStrictEqual(semis.map((c) => [c.a, c.b]), [["C3", "C8"], ["C4", "C6"]], "3º deve pegar o vencedor pior colocado (8º)");
    assert.ok(semis.every((c) => c.placares[1].casa === c.a), "volta na casa do melhor colocado");
    const fin = plano.confrontos.find((c) => c.etapa === "pp-final");
    assert.strictEqual(fin.neutro, true);
    assert.strictEqual(fin.pernas, 1);
    assert.strictEqual(fin.como, "penaltis");
    assert.deepStrictEqual(res.sobem.efl_championship, ["C1", "C2", fin.vencedor]);
    assert.deepStrictEqual(res.descem.efl_championship, ["C22", "C23", "C24"]);
    assert.deepStrictEqual(res.descem.premier_league, ["P18", "P19", "P20"]);
    assert.strictEqual(res.campeao.premier_league, "P1");
  });

  await check("Hypermotion: clube B não sobe e a vaga anda; empate no agregado e na prorrogação = melhor campanha", () => {
    const t1 = tabela("L", 20), t2 = tabela("H", 22);
    // H2 é clube B: sobem H1 e H3; o playoff é H4, H5, H6, H7.
    const plano = pais("ES", "la_liga", "laliga_hypermotion", t1, t2, { reservas: ["H2"] });
    const sim = roteiro({ jogar: () => ({ gh: 1, ga: 1 }) }); // tudo empatado
    const res = F.jogarTudo(plano, sim);
    const semis = plano.confrontos.filter((c) => c.etapa === "pp-1");
    assert.deepStrictEqual(semis.map((c) => [c.a, c.b]), [["H4", "H7"], ["H5", "H6"]]);
    assert.ok(semis.every((c) => c.como === "campanha" && c.vencedor === c.a));
    const fin = plano.confrontos.find((c) => c.etapa === "pp-final");
    assert.deepStrictEqual([fin.a, fin.b, fin.pernas, fin.vencedor], ["H4", "H5", 2, "H4"]);
    assert.deepStrictEqual(res.sobem.laliga_hypermotion, ["H1", "H3", "H4"]);
    assert.deepStrictEqual(res.descem.laliga_hypermotion, ["H19", "H20", "H21", "H22"]);
    assert.strictEqual(res.campeao.laliga_hypermotion, "H1", "o título honorífico continua do 1º");
  });

  await check("Serie B: 3º direto com +15; com +14, playoff; playout com 4 pontos, queda direta com 5", () => {
    const t1 = tabela("A", 20);
    let t2 = tabela("B", 20, { B3: 80, B4: 65, B16: 40, B17: 35 }); // 15 pontos; 5 pontos
    let plano = pais("IT", "serie_a_italia", "serie_b_italia", t1, t2);
    let res = F.jogarTudo(plano, roteiro());
    assert.deepStrictEqual(res.sobem.serie_b_italia, ["B1", "B2", "B3"]);
    assert.ok(!plano.confrontos.some((c) => c.etapa.startsWith("pp")), "não deveria haver playoff");
    assert.deepStrictEqual(res.descem.serie_b_italia, ["B17", "B18", "B19", "B20"]);

    t2 = tabela("B", 20, { B3: 79, B4: 65, B16: 40, B17: 36 }); // 14 pontos; 4 pontos
    plano = pais("IT", "serie_a_italia", "serie_b_italia", t1, t2);
    const sim = roteiro({
      jogar: (p) => {
        if (p.etapa === "pp-1") return { gh: 0, ga: 0 }; // 5x8 e 6x7 empatam; prorrogação 0x0 -> campanha (5º e 6º)
        if (p.etapa === "playout") return p.perna === 1 ? { gh: 2, ga: 0 } : { gh: 0, ga: 0 }; // 17º vence a ida em casa
        return { gh: 1, ga: 0 };
      },
    });
    res = F.jogarTudo(plano, sim);
    const pp1 = plano.confrontos.filter((c) => c.etapa === "pp-1");
    assert.deepStrictEqual(pp1.map((c) => [c.a, c.b, c.vencedor, c.como]), [["B5", "B8", "B5", "campanha"], ["B6", "B7", "B6", "campanha"]]);
    const semis = plano.confrontos.filter((c) => c.etapa === "pp-2");
    assert.deepStrictEqual(semis.map((c) => [c.a, c.b]), [["B3", "B6"], ["B4", "B5"]]);
    // Semis: cada mandante vence -> pontos iguais (3x3), saldo igual -> melhor campanha.
    assert.ok(semis.every((c) => c.como === "campanha" && c.vencedor === c.a));
    const po = plano.confrontos.find((c) => c.etapa === "playout");
    assert.deepStrictEqual([po.a, po.b, po.placares[1].casa, po.vencedor], ["B16", "B17", "B16", "B17"]);
    assert.ok(res.descem.serie_b_italia.includes("B16") && !res.descem.serie_b_italia.includes("B17"));
    assert.strictEqual(res.sobem.serie_b_italia.length, 3);
  });

  await check("Serie A: jogo de título com pênaltis e decisão de queda em ida e volta", () => {
    const t1 = tabela("A", 20, { A2: 100, A18: 66 }); // A1 = A2 = 100; A17 = 68... ajusta A17 e A18
    t1.pontos.A17 = 66;
    const plano = pais("IT", "serie_a_italia", "serie_b_italia", t1, tabela("B", 20, { B3: 90 }));
    const sim = roteiro({
      jogar: (p) => (p.etapa === "decisao-titulo" ? { gh: 0, ga: 0 } : p.etapa === "decisao-queda" ? (p.perna === 1 ? { gh: 0, ga: 1 } : { gh: 0, ga: 0 }) : { gh: 1, ga: 0 }),
      penaltis: (p) => p.fora, // A2 vence o título nos pênaltis
    });
    const res = F.jogarTudo(plano, sim);
    const dt = plano.confrontos.find((c) => c.etapa === "decisao-titulo");
    assert.deepStrictEqual([dt.pernas, dt.casaIda, dt.como, res.campeao.serie_a_italia], [1, "A1", "penaltis", "A2"]);
    const dq = plano.confrontos.find((c) => c.etapa === "decisao-queda");
    assert.deepStrictEqual([dq.a, dq.b, dq.placares[1].casa], ["A17", "A18", "A17"]);
    // Ida na casa do 18º: o 17º vence 1x0 fora e segura 0x0 -> 18º cai.
    assert.deepStrictEqual(res.descem.serie_a_italia, ["A19", "A20", "A18"]);
  });

  await check("Alemanha: 16º x 3º da 2. Bundesliga; 16º da 2. x representante da 3ª, que sobe ao vencer", () => {
    const plano = pais("DE", "bundesliga", "bundesliga_2", tabela("D", 18), tabela("Z", 18), { representanteTerceira: "L3", reservas: [] });
    const sim = roteiro({ jogar: (p) => (p.casa === "Z3" || p.casa === "L3" ? { gh: 3, ga: 0 } : { gh: 0, ga: 0 }) });
    const res = F.jogarTudo(plano, sim);
    const b1 = plano.confrontos.find((c) => c.etapa === "barrage-d1");
    const b2 = plano.confrontos.find((c) => c.etapa === "barrage-d2");
    assert.deepStrictEqual([b1.a, b1.b, b1.vencedor], ["D16", "Z3", "Z3"]);
    assert.deepStrictEqual([b2.a, b2.b, b2.vencedor], ["Z16", "L3", "L3"]);
    assert.deepStrictEqual(res.sobem.bundesliga_2, ["Z1", "Z2", "Z3"]);
    assert.deepStrictEqual(res.descem.bundesliga, ["D17", "D18", "D16"]);
    assert.deepStrictEqual(res.descem.bundesliga_2, ["Z17", "Z18", "Z16"]);
    assert.deepStrictEqual(res.sobem.terceira, ["L3"]);
    // Sem representante elegível no catálogo, o 16º da 2. fica.
    const sem = pais("DE", "bundesliga", "bundesliga_2", tabela("D", 18), tabela("Z", 18), { representanteTerceira: null });
    const r2 = F.jogarTudo(sem, roteiro());
    assert.deepStrictEqual(r2.descem.bundesliga_2, ["Z17", "Z18"]);
  });

  await check("França: 4º x 5º, vencedor no 3º, sobrevivente x 16º da Ligue 1 (empate em jogo único: pênaltis)", () => {
    const plano = pais("FR", "ligue_1", "ligue_2", tabela("F", 18), tabela("G", 18), { representanteTerceira: "T1" });
    const sim = roteiro({
      jogar: (p) => {
        if (p.etapa === "pp-1") return { gh: 1, ga: 1 }; // pênaltis: o 5º (fora) vence
        if (p.etapa === "pp-final") return { gh: 0, ga: 2 }; // o 5º vence o 3º fora
        if (p.etapa === "barrage-d1") return p.casa === "G5" ? { gh: 2, ga: 0 } : { gh: 1, ga: 0 }; // 2x1 no agregado para o G5
        return { gh: 1, ga: 0 };
      },
      penaltis: (p) => p.fora,
    });
    const res = F.jogarTudo(plano, sim);
    const pp1 = plano.confrontos.find((c) => c.etapa === "pp-1");
    assert.deepStrictEqual([pp1.a, pp1.b, pp1.casaIda, pp1.vencedor, pp1.como], ["G4", "G5", "G4", "G5", "penaltis"]);
    const fin = plano.confrontos.find((c) => c.etapa === "pp-final");
    assert.deepStrictEqual([fin.a, fin.b, fin.casaIda, fin.vencedor], ["G3", "G5", "G3", "G5"]);
    const b1 = plano.confrontos.find((c) => c.etapa === "barrage-d1");
    assert.deepStrictEqual([b1.a, b1.b, b1.placares[1].casa, b1.vencedor], ["F16", "G5", "F16", "G5"]);
    assert.deepStrictEqual(res.sobem.ligue_2, ["G1", "G2", "G5"]);
    assert.ok(res.descem.ligue_1.includes("F16"));
    assert.ok(b1.semanaRel > fin.semanaRel, "o barrage vem depois do playoff");
  });

  await check("plano é JSON puro: salvo e relido no meio, termina igual", () => {
    const sim = roteiro({ jogar: (p) => ({ gh: (String(p.casa).length + p.perna) % 3, ga: (String(p.fora).length) % 2 }) });
    const direto = F.jogarTudo(pais("GB-ENG", "premier_league", "efl_championship", tabela("P", 20), tabela("C", 24)), sim);
    let plano = pais("GB-ENG", "premier_league", "efl_championship", tabela("P", 20), tabela("C", 24));
    for (let k = 0; k < 3; k++) {
      const [p] = F.pernasPendentes(plano);
      F.registrarPerna(plano, p.confronto, sim.jogar(p), sim);
      plano = JSON.parse(JSON.stringify(plano));
    }
    assert.deepStrictEqual(F.jogarTudo(plano, sim), direto);
    assert.throws(() => F.registrarPerna(plano, plano.confrontos[0].id, { gh: 1, ga: 0 }, sim), /já decidido/);
  });

  await check("5 países x 300 temporadas aleatórias: sempre termina e as trocas entre divisões fecham", () => {
    const paises = [["GB-ENG", "premier_league", "efl_championship"], ["ES", "la_liga", "laliga_hypermotion"], ["IT", "serie_a_italia", "serie_b_italia"], ["DE", "bundesliga", "bundesliga_2"], ["FR", "ligue_1", "ligue_2"]];
    const rng = D.rngDaChave("aleatorio");
    const gols = () => Math.floor(rng() * 4);
    for (const [cod, d1, d2] of paises) {
      for (let k = 0; k < 300; k++) {
        // Pontos aleatórios (com empates frequentes) e ordem por pontos.
        const mk = (pre, n) => {
          const ps = Array.from({ length: n }, () => 30 + Math.floor(rng() * 40)).sort((a, b) => b - a);
          const ordem = ps.map((_, i) => `${pre}${i + 1}`);
          return { ordem, pontos: Object.fromEntries(ordem.map((id, i) => [id, ps[i]])) };
        };
        const t1 = mk("A", C[d1].clubes), t2 = mk("B", C[d2].clubes);
        const reservas = cod === "ES" && k % 2 ? [t2.ordem[Math.floor(rng() * 6)]] : [];
        const plano = pais(cod, d1, d2, t1, t2, { reservas, representanteTerceira: "X1" });
        const res = F.jogarTudo(plano, { jogar: () => ({ gh: gols(), ga: gols() }), prorrogacao: () => ({ gh: gols() % 2, ga: gols() % 2 }), penaltis: (p) => (rng() < 0.5 ? p.casa : p.fora) });
        const tag = `${cod} #${k}`;
        assert.strictEqual(res.sobem[d2].length, res.descem[d1].length, `${tag}: sobem ${res.sobem[d2]} / descem ${res.descem[d1]}`);
        assert.ok(res.sobem[d2].every((id) => !reservas.includes(id)), `${tag}: clube B subiu`);
        assert.ok(res.sobem[d2].every((id) => id.startsWith("B")) && res.descem[d1].every((id) => id.startsWith("A")), `${tag}: clube trocado de lado`);
        assert.strictEqual(new Set([...res.sobem[d2], ...res.descem[d2]]).size, res.sobem[d2].length + res.descem[d2].length, `${tag}: clube sobe e desce`);
        const esperado = { "GB-ENG": 3, ES: 3, IT: 3 }[cod];
        if (esperado) assert.strictEqual(res.sobem[d2].length, esperado, `${tag}: acessos`);
        else assert.ok(res.sobem[d2].length === 2 || res.sobem[d2].length === 3, `${tag}: acessos ${res.sobem[d2].length}`);
        assert.ok(res.campeao[d1] && res.campeao[d2], `${tag}: sem campeão`);
      }
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
