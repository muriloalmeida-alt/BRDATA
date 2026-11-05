// Fase 12, etapa 2 (05/11): equivalência da tabela, do calendário e da
// rodada simples extraídos (public/js/motor/) com o código anterior.
// REF = cópia congelada de carreira.js e js/data.js antes da etapa 2.
// Uso: node tests/unit/test_motor_tabela.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const realRandom = Math.random;
function withRandom(rng, fn) { Math.random = rng; try { return fn(); } finally { Math.random = realRandom; } }
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------------- REF ----------------
const REF = (() => {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function poissonSample(lambda, rng) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; }
  function applyResultToStandings(r, standings) {
    const H = standings[r.home], A = standings[r.away];
    if (!H || !A) return;
    H.j++; A.j++; H.gp += r.gh; H.gc += r.ga; A.gp += r.ga; A.gc += r.gh;
    if (r.gh > r.ga) { H.v++; H.pts += 3; A.d++; }
    else if (r.gh < r.ga) { A.v++; A.pts += 3; H.d++; }
    else { H.e++; A.e++; H.pts++; A.pts++; }
    H.sg = H.gp - H.gc; A.sg = A.gp - A.gc;
  }
  const sorted = (standings) => Object.values(standings).sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp));
  function relegationZoneIds(sortedRows, n, protectedId) {
    const ids = sortedRows.map((r) => String(r.id));
    let zone = ids.slice(ids.length - n);
    if (protectedId != null && zone.includes(String(protectedId))) { zone = zone.filter((id) => id !== String(protectedId)); zone.push(ids[ids.length - n - 1]); }
    return zone;
  }
  function accessZoneIds(sortedRows, n) { return sortedRows.slice(0, n).map((r) => String(r.id)); }
  function generateAllRounds(teamIds) {
    const teams = [...teamIds];
    if (teams.length % 2 !== 0) teams.push(null);
    const n = teams.length, roundsPerLeg = n - 1, half = n / 2, turno = [];
    let arr = [...teams];
    for (let r = 0; r < roundsPerLeg; r++) {
      const roundMatches = [];
      for (let i = 0; i < half; i++) {
        const home = arr[i], away = arr[n - 1 - i];
        if (home !== null && away !== null) { if (r % 2 === 0) roundMatches.push({ home, away }); else roundMatches.push({ home: away, away: home }); }
      }
      turno.push(roundMatches);
      const fixed = arr[0], rest = arr.slice(1); rest.unshift(rest.pop()); arr = [fixed, ...rest];
    }
    const returno = turno.map((round) => round.map((m) => ({ home: m.away, away: m.home })));
    const allRounds = {};
    turno.forEach((round, i) => allRounds[i + 1] = round);
    returno.forEach((round, i) => allRounds[roundsPerLeg + i + 1] = round);
    return allRounds;
  }
  // resolveOtherDivisionsRound (uma divisão), antes da etapa 1.
  function otherDivisionRound(fixtures, teamsById, standings) {
    fixtures.forEach((fx) => {
      const home = teamsById.get(String(fx.home)), away = teamsById.get(String(fx.away));
      if (!home || !away) return;
      const lambdaHome = clamp((home.atk * away.def) * 1.12, 0.05, 6);
      const lambdaAway = clamp(away.atk * home.def, 0.05, 6);
      const gh = poissonSample(lambdaHome, Math.random);
      const ga = poissonSample(lambdaAway, Math.random);
      applyResultToStandings({ home: fx.home, away: fx.away, gh, ga }, standings);
    });
  }
  return { applyResultToStandings, sorted, relegationZoneIds, accessZoneIds, generateAllRounds, otherDivisionRound };
})();

const ids = (k) => Array.from({ length: k }, (_, i) => `c${i}`);
function season(seed, k = 20) {
  const r = seeded(seed);
  const st = Object.fromEntries(ids(k).map((id) => [id, { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }]));
  const results = [];
  for (let i = 0; i < k * 9; i++) {
    const a = Math.floor(r() * k), b = (a + 1 + Math.floor(r() * (k - 1))) % k;
    results.push({ home: `c${a}`, away: `c${b}`, gh: Math.floor(r() * 4), ga: Math.floor(r() * 4) });
  }
  return { st, results };
}
const SEEDS = Array.from({ length: 200 }, (_, i) => 500 + i * 104729);

(async () => {
  const dir = path.join(__dirname, "..", "..", "public", "js", "motor");
  const T = await import(pathToFileURL(path.join(dir, "tabela.js")).href);
  const C = await import(pathToFileURL(path.join(dir, "calendario.js")).href);
  const R = await import(pathToFileURL(path.join(dir, "rodada.js")).href);

  await check("Aplicar resultados: tabela idêntica (200 temporadas de 180 jogos, inclusive clube fora da tabela)", () => {
    for (const s of SEEDS) {
      const { st, results } = season(s);
      results.push({ home: "c0", away: "fora", gh: 3, ga: 0 });
      const a = clone(st), b = clone(st);
      results.forEach((r) => { REF.applyResultToStandings(r, a); T.applyResult(b, r); });
      assert.deepStrictEqual(b, a);
    }
  });

  await check("Ordem da tabela, posição e empates totais na ordem do save (sort estável)", () => {
    for (const s of SEEDS) {
      const { st, results } = season(s);
      results.forEach((r) => T.applyResult(st, r));
      assert.deepStrictEqual(T.sortRows(st).map((x) => x.id), REF.sorted(clone(st)).map((x) => x.id));
      const me = `c${s % 20}`;
      assert.strictEqual(T.positionOf(st, me), REF.sorted(clone(st)).findIndex((r) => r.id === me) + 1);
    }
    const tie = { b: { id: "b", pts: 1, v: 0, sg: 0, gp: 1 }, a: { id: "a", pts: 1, v: 0, sg: 0, gp: 1 } };
    assert.deepStrictEqual(T.sortRows(tie).map((r) => r.id), ["b", "a"], "empate total: ordem do save");
    assert.strictEqual(T.positionOf(tie, "zz"), 0);
  });

  await check("Zonas de acesso e rebaixamento (com e sem clube protegido) iguais", () => {
    for (const s of SEEDS) {
      const { st, results } = season(s);
      results.forEach((r) => T.applyResult(st, r));
      const rows = T.sortRows(st);
      const prot = s % 3 === 0 ? rows[rows.length - 1 - (s % 4)].id : null;
      assert.deepStrictEqual(T.relegationZoneIds(rows, 4, prot), REF.relegationZoneIds(rows, 4, prot));
      assert.deepStrictEqual(T.accessZoneIds(rows, 4), REF.accessZoneIds(rows, 4));
    }
  });

  await check("Calendário: idêntico para 20, 19 e 4 clubes; 38 rodadas, cada par se enfrenta 2 vezes com mando trocado", () => {
    for (const k of [20, 19, 4]) assert.deepStrictEqual(C.generateAllRounds(ids(k)), REF.generateAllRounds(ids(k)));
    const cal = C.generateAllRounds(ids(20));
    assert.strictEqual(Object.keys(cal).length, 38);
    const seen = new Map();
    Object.values(cal).flat().forEach((m) => { const k = `${m.home}>${m.away}`; seen.set(k, (seen.get(k) || 0) + 1); });
    assert.strictEqual(seen.size, 380);
    assert.ok([...seen.values()].every((v) => v === 1));
  });

  await check("Rodada simples (outras divisões): mesmos placares e mesma tabela que o código anterior", () => {
    for (const s of SEEDS) {
      const r0 = seeded(s);
      const teams = ids(20).map((id) => ({ id, atk: 0.6 + r0() * 1.2, def: 0.6 + r0() * 1.2 }));
      const byId = new Map(teams.map((t) => [t.id, t]));
      const fixtures = C.generateAllRounds(ids(20))[1 + (s % 38)].concat([{ home: "c0", away: "inexistente" }]);
      const a = T.emptyStandings(ids(20)), b = T.emptyStandings(ids(20));
      withRandom(seeded(s + 1), () => REF.otherDivisionRound(fixtures, byId, a));
      const res = R.playSimpleRound(fixtures, byId, b, seeded(s + 1));
      assert.deepStrictEqual(b, a);
      assert.strictEqual(res.length, 10);
    }
  });

  await check("cloneStandings copia as linhas (mudar a cópia não mexe na original)", () => {
    const st = T.emptyStandings(["x", "y"]);
    const c = T.cloneStandings(st);
    T.applyResult(c, { home: "x", away: "y", gh: 2, ga: 0 });
    assert.strictEqual(st.x.pts, 0);
    assert.strictEqual(c.x.pts, 3);
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
