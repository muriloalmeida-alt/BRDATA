// GOLS-REAIS (17/11): com dados reais, a força de jogo dos clubes ganha o
// nível de gols do campeonato e tem os extremos suavizados (motor/partida.js,
// motor/estado.js). A força gravada (atk/def) não muda.
// Uso: node tests/unit/test_motor_gols_reais.js   (sai com 1 se algo falhar)
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..", "..");
let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
const perto = (a, b, tol, rotulo) => assert.ok(Math.abs(a - b) <= tol, `${rotulo}: ${a} (esperado ${b} ± ${tol})`);

// Liga real do catálogo congelado: força como calibrateStrengths calcula.
function ligaDoCatalogo(id, carga) {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "server", "frozen-catalog", `snapshot-${id}.json`), "utf8"));
  const forcas = carga.calibrateStrengths(snap.standings);
  const jogados = snap.standings.filter((r) => r.j > 0);
  const golsReais = jogados.reduce((s, r) => s + r.gp, 0) / (jogados.reduce((s, r) => s + r.j, 0) / 2);
  return { times: jogados.map((r) => ({ id: r.id, ...forcas[r.id] })), media: carga.mediaGolsDaLiga(snap.standings), golsReais };
}
// Gols por jogo, chance de 0x0 por jogo (média e pior clube), turno e returno.
function medir(times, forca, P) {
  let gols = 0, p0 = 0, jogos = 0;
  const p0DoClube = times.map((me) => {
    let soma = 0, k = 0;
    times.forEach((o) => {
      if (o === me) return;
      [[me, o], [o, me]].forEach(([h, a]) => {
        const l = P.goalLambdas(forca(h), forca(a));
        const p = Math.exp(-l.home - l.away);
        soma += p; k++; gols += l.home + l.away; p0 += p; jogos++;
      });
    });
    return soma / k;
  });
  return { golsPorJogo: gols / jogos, p0: p0 / jogos, pior: Math.max(...p0DoClube) };
}
// Chance de pelo menos `seq` 0x0 seguidos em `jogos` partidas com chance p.
function chanceDeSequencia(p, seq, jogos) {
  let est = Array(seq).fill(0); est[0] = 1; let ok = 0;
  for (let j = 0; j < jogos; j++) {
    const novo = Array(seq).fill(0);
    est.forEach((v, i) => { novo[0] += v * (1 - p); if (i + 1 < seq) novo[i + 1] += v * p; else ok += v * p; });
    est = novo;
  }
  return ok;
}

(async () => {
  const motor = (m) => import(pathToFileURL(path.join(ROOT, "public", "js", "motor", `${m}.js`)).href);
  const P = await motor("partida");
  const E = await motor("estado");
  const C = await motor("carga");

  await check("Nível de gols: k = √(2 × média por time ÷ 2,12); sem média, sem nível", () => {
    assert.strictEqual(P.nivelDeGols(1.06), 1);
    assert.strictEqual(P.nivelDeGols(1.318), 1.115);
    assert.strictEqual(P.nivelDeGols(0), null);
    assert.strictEqual(P.nivelDeGols(undefined), null);
  });
  await check("Força de jogo: ((0,7 × força) + 0,3) × k; sem nível, a força de sempre", () => {
    const f = P.forcaComNivel({ atk: 2, def: 0.5 }, 1.1);
    perto(f.atk, 1.87, 1e-9, "atk"); perto(f.def, 0.715, 1e-9, "def");
    assert.deepStrictEqual(P.forcaComNivel({ atk: 2, def: 0.5 }, null), { atk: 2, def: 0.5 });
    assert.strictEqual(P.GOLS_SUAVIZACAO, 0.3);
  });
  await check("O nível do catálogo de 2026 é o calculado das tabelas congeladas", () => {
    ["brasileirao", "serie_b", "serie_c"].forEach((id) => {
      assert.strictEqual(E.NIVEL_GOLS_CATALOGO[id], P.nivelDeGols(ligaDoCatalogo(id, C).media), id);
    });
  });
  await check("Ligas reais simuladas: gols por jogo perto do real e 0x0 médio entre 6% e 12% (antes: ~2,1 gols e ~13%)", () => {
    ["brasileirao", "serie_b", "serie_c"].forEach((id) => {
      const liga = ligaDoCatalogo(id, C);
      const antes = medir(liga.times, (t) => t, P);
      const depois = medir(liga.times, (t) => P.forcaComNivel(t, E.NIVEL_GOLS_CATALOGO[id]), P);
      assert.ok(antes.golsPorJogo < 2.2 && antes.p0 > 0.12, `${id} antes: ${JSON.stringify(antes)}`);
      perto(depois.golsPorJogo, liga.golsReais, 0.15, `${id} gols por jogo`);
      assert.ok(depois.p0 >= 0.06 && depois.p0 <= 0.12, `${id} 0x0 médio ${depois.p0}`);
    });
  });
  await check("Pior clube de cada divisão: 5 0x0 seguidos em 38 jogos ≤ 0,5% (antes até ~1,8%)", () => {
    ["brasileirao", "serie_b", "serie_c"].forEach((id) => {
      const liga = ligaDoCatalogo(id, C);
      const depois = medir(liga.times, (t) => P.forcaComNivel(t, E.NIVEL_GOLS_CATALOGO[id]), P);
      const seq5 = chanceDeSequencia(depois.pior, 5, 38);
      assert.ok(seq5 <= 0.005, `${id}: pior clube ${depois.pior}, 5 seguidos ${seq5}`);
    });
  });
  await check("Migração 2: preenche o nível dos campeonatos em modo real (da tabela carregada, ou do catálogo) e sobe a versão", () => {
    E.definirModoRealPorCompeticao({ brasileirao: true, serie_b: true, serie_c: false });
    E.niveisDeGolsDaCarga().brasileirao = 1.2;
    const save = { schemaVersion: 1 };
    assert.deepStrictEqual(E.migrarSave(save), [2]);
    assert.deepStrictEqual(save.nivelGols, { brasileirao: 1.2, serie_b: E.NIVEL_GOLS_CATALOGO.serie_b });
    assert.strictEqual(save.schemaVersion, 2);
    assert.deepStrictEqual(E.migrarSave(save), []);
    delete E.niveisDeGolsDaCarga().brasileirao;
  });
  await check("Modo Exemplo: a migração não cria o nível e a força de jogo é a de sempre", () => {
    E.definirModoRealPorCompeticao({ brasileirao: false });
    const save = { schemaVersion: 1 };
    E.migrarSave(save);
    assert.strictEqual(save.nivelGols, undefined); // sem campo: o save de Modo Exemplo fica como era
    assert.strictEqual(save.schemaVersion, 2);
    E.definirCarreira(save);
    assert.deepStrictEqual(E.forcaDeJogo({ atk: 1.4, def: 0.8, competitionId: "brasileirao" }), { atk: 1.4, def: 0.8 });
  });
  await check("Completar o nível não muda o que já está gravado (fixo depois da criação)", () => {
    const save = { nivelGols: { brasileirao: 1.05 } };
    E.niveisDeGolsDaCarga().brasileirao = 1.3;
    E.completarNivelGols(save, { brasileirao: true, serie_c: true });
    assert.deepStrictEqual(save.nivelGols, { brasileirao: 1.05, serie_c: E.NIVEL_GOLS_CATALOGO.serie_c });
    delete E.niveisDeGolsDaCarga().brasileirao;
  });
  await check("forcaDeJogo usa o campeonato do clube; Série D (sem nível) fica igual; a força gravada não muda", () => {
    E.definirCarreira({ nivelGols: { brasileirao: 1.1, serie_b: 1.04 } });
    const a = { atk: 1.5, def: 0.9, competitionId: "brasileirao" }, b = { atk: 1.5, def: 0.9, competitionId: "serie_b" };
    const fa = E.forcaDeJogo(a), fb = E.forcaDeJogo(b);
    perto(fa.atk, (0.7 * 1.5 + 0.3) * 1.1, 1e-9, "A atk"); perto(fb.atk, (0.7 * 1.5 + 0.3) * 1.04, 1e-9, "B atk");
    assert.deepStrictEqual(E.forcaDeJogo({ atk: 1.04, def: 1.25, competitionId: "serie_d" }), { atk: 1.04, def: 1.25 });
    assert.deepStrictEqual(a, { atk: 1.5, def: 0.9, competitionId: "brasileirao" });
    E.definirCarreira(null);
  });
  await check("Força do seu time na partida (computeHumanStrength) usa a força de jogo (nível e suavização)", async () => {
    const F = await motor("fechamento");
    const squad = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, origin: "principal", status: "ok", atk: 70, def: 70, condition: 100, group: i ? "M" : "G" }));
    const carreira = (nivelGols) => ({ squad, lineup: { formation: "4-4-2", starters: squad.map((p) => p.id), bench: [], tactics: {} }, nivelGols });
    const clube = { id: "x", atk: 1.6, def: 0.7, competitionId: "brasileirao" };
    E.definirCarreira(carreira({}));
    const sem = F.computeHumanStrength(clube);
    E.definirCarreira(carreira({ brasileirao: 1.1 }));
    const com = F.computeHumanStrength(clube);
    const fj = E.forcaDeJogo(clube);
    perto(com.atk / sem.atk, fj.atk / clube.atk, 1e-9, "atk proporcional à força de jogo");
    perto(com.def / sem.def, fj.def / clube.def, 1e-9, "def proporcional à força de jogo");
    E.definirCarreira(null);
  });
  await check("Save novo nasce na versão do jogo (2)", () => {
    assert.strictEqual(E.SCHEMA_VERSION, 2);
  });

  console.log(failed ? `\n${failed}/${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
