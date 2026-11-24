// MUNDO-001, M9a (25/11/2026): Libertadores e Sul-Americana (public/js/motor/continental.js)
// pelo regulamento do pacote continental, com participantes sintéticos montados pela
// tabela de vagas por associação do próprio pacote. Confere os critérios de aceite
// do pacote (docs/mundo/pacotes/continentais/02-integracao.md):
//   1) edição completa: 155 jogos na Libertadores e 157 na Sul-Americana, 96 de
//      grupos em cada uma, cada clube com 3 jogos em casa e 3 fora nos grupos;
//   2) transferências: os 4 derrotados da fase 3 da Libertadores nos grupos da
//      Sul-Americana; os 8 terceiros no playoff dela, com a ida na casa do 3º da
//      Libertadores; pares 9x24, 10x23...;
//   3) grupos sem dois clubes da mesma associação (na Libertadores, exceto quem
//      vem da fase 3);
//   4) oitavas: o líder do grupo decide em casa; mata-mata de ida e volta termina
//      nos pênaltis se o empate persistir; final em jogo único neutro, com
//      prorrogação e pênaltis;
//   5) premiação: vitória em casa nos grupos da Libertadores gera mando e vitória;
//      reprocessar não duplica (o mesmo jogo não volta a ser registrado; chaves únicas);
//   6) a mesma seed dá a mesma edição; o plano relido no meio termina igual;
//   7) 80 edições aleatórias terminam, com os 2 campeões (fora da suíte: 200).
// Uso: node tests/unit/test_motor_continental.js
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
  const CT = await import(pathToFileURL(path.join(ROOT, "public/js/motor/continental.js")).href);
  const { rngDaChave } = await import(pathToFileURL(path.join(ROOT, "public/js/motor/desempate.js")).href);
  const F = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/fonte/continentais", n), "utf8"));
  const regras = F("competicoes.json"), calendario = F("calendarios.json"), premiacao = F("premiacao.json"), acesso = F("acesso-e-transferencias.json");

  // Participantes: clubes "<ASSOC><n>"; ranking pela ordem (ARG e BRA na frente).
  function edicao(ano = 2026, chave = "teste") {
    const assoc = {}, ranking = {};
    const P = { LIB: { grupos: [], fase2: [], fase1: [] }, SUD: { grupos: [], primeiraFase: {} } };
    let rk = 1;
    const novo = (cod) => { const id = `${cod}${Object.keys(assoc).filter((x) => assoc[x] === cod).length + 1}`; assoc[id] = cod; ranking[id] = rk++; return id; };
    const cols = acesso.CONMEBOL.colunas;
    for (const [cod, vagas] of Object.entries(acesso.CONMEBOL.por_associacao)) {
      const q = Object.fromEntries(cols.map((c, i) => [c, vagas[i]]));
      for (let i = 0; i < q.LIB_grupos; i++) P.LIB.grupos.push(novo(cod));
      for (let i = 0; i < q.LIB_fase_2; i++) P.LIB.fase2.push(novo(cod));
      for (let i = 0; i < q.LIB_fase_1; i++) P.LIB.fase1.push(novo(cod));
      for (let i = 0; i < q.SUD_grupos; i++) P.SUD.grupos.push(novo(cod));
      if (q.SUD_primeira_fase) P.SUD.primeiraFase[cod] = Array.from({ length: q.SUD_primeira_fase }, () => novo(cod));
    }
    // Os 2 campeões continentais anteriores nos grupos da Libertadores.
    P.LIB.grupos.push(novo("BRA"), novo("ARG"));
    return CT.montarEdicao({ ano, chave, regras, calendario, premiacao, participantes: P, ranking, associacao: assoc });
  }
  const sim = (chave, golsMax = 4) => {
    const rng = rngDaChave(chave);
    const g = () => Math.floor(rng() * golsMax);
    return { jogar: () => ({ gh: g(), ga: g() }), prorrogacao: () => ({ gh: rng() < 0.3 ? 1 : 0, ga: rng() < 0.3 ? 1 : 0 }), penaltis: (p) => (rng() < 0.5 ? p.casa : p.fora) };
  };

  let plano;
  await check("edição completa: 155 jogos (Libertadores) e 157 (Sul-Americana), 96 de grupos, 3 em casa e 3 fora", () => {
    plano = edicao();
    assert.strictEqual(plano.participantes.LIB.grupos.length, 28);
    assert.strictEqual(plano.participantes.LIB.fase2.length, 13);
    assert.strictEqual(plano.participantes.LIB.fase1.length, 6);
    assert.strictEqual(plano.participantes.SUD.grupos.length, 12);
    assert.strictEqual(Object.values(plano.participantes.SUD.primeiraFase).flat().length, 32);
    CT.jogarTudo(plano, sim("e1"));
    const conta = (copa, fase) => plano.jogos.filter((j) => j.copa === copa && (!fase || j.fase === fase)).length;
    assert.strictEqual(conta("LIB"), 155);
    assert.strictEqual(conta("SUD"), 157);
    assert.strictEqual(conta("LIB", "grupos"), 96);
    assert.strictEqual(conta("SUD", "grupos"), 96);
    for (const copa of ["LIB", "SUD"]) {
      const casa = {}, fora = {};
      for (const j of plano.jogos.filter((x) => x.copa === copa && x.fase === "grupos")) { casa[j.casa] = (casa[j.casa] || 0) + 1; fora[j.fora] = (fora[j.fora] || 0) + 1; }
      assert.strictEqual(Object.keys(casa).length, 32);
      assert.ok(Object.values(casa).every((x) => x === 3) && Object.values(fora).every((x) => x === 3), `${copa}: mandos`);
    }
    assert.ok(plano.jogos.every((j) => j.data.startsWith("2026")), "jogo fora de 2026");
  });

  await check("transferências: 4 da fase 3 nos grupos da Sul-Americana; 8 terceiros no playoff (9x24...), ida na casa do 3º da Libertadores", () => {
    const perdedoresF3 = plano.confrontos.filter((c) => c.copa === "LIB" && c.etapa === "fase_3").map((c) => c.perdedor);
    const sudGrupos = Object.values(plano.grupos.SUD).flat();
    assert.ok(perdedoresF3.every((id) => sudGrupos.includes(id)), "perdedor da fase 3 fora dos grupos da Sul-Americana");
    const terceiros = plano.marcos.fimGruposLIB.terceiros;
    const segundos = plano.marcos.fimGruposSUD.segundos;
    const po = plano.confrontos.filter((c) => c.copa === "SUD" && c.etapa === "playoff");
    assert.strictEqual(po.length, 8);
    po.forEach((c, i) => {
      assert.deepStrictEqual([c.a, c.b], [segundos[i], terceiros[7 - i]], `par ${9 + i}x${24 - i}`);
      assert.strictEqual(c.placares[0].casa, c.b, "ida na casa do 3º da Libertadores");
    });
  });

  await check("grupos sem dois clubes da mesma associação (Libertadores: exceto quem vem da fase 3)", () => {
    const vemF3 = new Set(plano.confrontos.filter((c) => c.copa === "LIB" && c.etapa === "fase_3").map((c) => c.vencedor));
    for (const [copa, grupos] of Object.entries(plano.grupos)) {
      for (const [g, ids] of Object.entries(grupos)) {
        const assocs = ids.filter((id) => !(copa === "LIB" && vemF3.has(id))).map((id) => plano.associacao[id]);
        assert.strictEqual(new Set(assocs).size, assocs.length, `${copa} grupo ${g}: ${ids.join(",")}`);
      }
    }
  });

  await check("oitavas com volta na casa do líder; pênaltis no empate do duelo; final neutra com prorrogação", () => {
    for (const copa of ["LIB", "SUD"]) {
      const lideres = new Set(plano.marcos[`fimGrupos${copa}`].primeiros);
      for (const c of plano.confrontos.filter((x) => x.copa === copa && x.etapa === "oitavas")) {
        assert.ok(lideres.has(c.a) && c.placares[1].casa === c.a, `${copa}: oitavas sem o líder na volta em casa`);
      }
      const fin = plano.confrontos.find((x) => x.copa === copa && x.etapa === "final");
      assert.ok(fin.neutro && fin.pernas === 1);
      assert.deepStrictEqual(fin.resolucao, ["agregado", "prorrogacao", "penaltis"]);
    }
    // Duelo roteirizado: 1x0 e 0x1 (pontos e saldo iguais) -> pênaltis.
    const p = edicao(2026, "roteiro");
    const s = { jogar: (j) => (j.perna === 1 ? { gh: 1, ga: 0 } : { gh: 1, ga: 0 }), prorrogacao: () => ({ gh: 0, ga: 0 }), penaltis: (x) => x.fora };
    const [j1] = CT.jogosPendentes(p).filter((j) => j.fase === "fase_1");
    const c = p.confrontos.find((x) => x.id === j1.conf);
    for (const j of p.jogos.filter((x) => x.conf === c.id)) CT.registrarJogo(p, j.id, s.jogar(j), s);
    assert.strictEqual(c.como, "penaltis");
  });

  await check("premiação: vitória em casa nos grupos da Libertadores = mando + vitória; sem duplicar", () => {
    const j = plano.jogos.find((x) => x.copa === "LIB" && x.fase === "grupos" && x.gh > x.ga);
    const doJogo = plano.premios.filter((p) => p.chave.includes(`|${j.id}|`));
    assert.deepStrictEqual(doJogo.map((p) => [p.clube, p.tipo, p.valorUSD]).sort(), [[j.casa, "mando", premiacao.LIB.por_mando.grupos], [j.casa, "vitoria", premiacao.LIB.por_vitoria_grupos]].sort());
    assert.strictEqual(new Set(plano.premios.map((p) => p.chave)).size, plano.premios.length, "chave repetida");
    assert.throws(() => CT.registrarJogo(plano, j.id, { gh: 1, ga: 0 }, sim("x")), /já jogado/);
    const camp = plano.premios.find((p) => p.copa === "LIB" && p.tipo === "campeao");
    assert.strictEqual(camp.valorUSD, premiacao.LIB.final.campeao);
    assert.strictEqual(camp.clube, plano.resultado.campeoes.LIB);
  });

  await check("mesma seed = mesma edição; relido no meio termina igual; edição de 2027 com datas de 2027", () => {
    const a = edicao(2026, "det"), b = edicao(2026, "det");
    assert.deepStrictEqual(CT.jogarTudo(a, sim("d")), CT.jogarTudo(b, sim("d")));
    const s = sim("r");
    const direto = CT.jogarTudo(edicao(2026, "rel"), sim("r"));
    let p = edicao(2026, "rel");
    for (let k = 0; k < 150; k++) {
      const [j] = CT.jogosPendentes(p);
      CT.registrarJogo(p, j.id, s.jogar(j), s);
      if (k % 25 === 0) p = JSON.parse(JSON.stringify(p));
    }
    assert.deepStrictEqual(CT.jogarTudo(p, s), direto);
    const e27 = edicao(2027, "e27");
    CT.jogarTudo(e27, sim("e27"));
    assert.ok(e27.jogos.every((j) => j.data.startsWith("2027")), "edição de 2027 fora de 2027");
  });

  await check("80 edições aleatórias terminam (placares curtos e longos)", () => {
    for (let k = 0; k < 80; k++) {
      const p = edicao(2026, `al${k}`);
      const r = CT.jogarTudo(p, sim(`al${k}`, k % 3 === 0 ? 2 : 5));
      assert.ok(r.campeoes.LIB && r.campeoes.SUD);
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
