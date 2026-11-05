// Fase 12, etapa 1 (05/11): equivalência do núcleo da partida extraído
// (public/js/motor/partida.js) com a implementação anterior de carreira.js.
// A seção REF abaixo é uma cópia congelada das funções antigas (que
// sorteavam com Math.random). Cada caso roda a REF com Math.random
// trocado por um gerador com semente e a função nova com o MESMO
// gerador; o resultado tem que ser idêntico, sorteio a sorteio.
// Uso: node tests/unit/test_motor_partida.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}

// Gerador com semente (mulberry32).
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const realRandom = Math.random;
function withRandom(rng, fn) { Math.random = rng; try { return fn(); } finally { Math.random = realRandom; } }

// ---------------- REF: cópia congelada de carreira.js (antes da etapa 1) ----------------
const REF = (() => {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function poissonSample(lambda, rng) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; }
  function weightedPick(items, weights) {
    const total = weights.reduce((s, w) => s + w, 0) || 1;
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function moraleFactor(p) { const m = p.morale == null ? 70 : p.morale; return clamp(1 + (m - 70) / 100, 0.6, 1.3); }
  function attributeGoals(starters, goals, suppress) {
    const events = [];
    if (!starters || !starters.length || !goals) return events;
    const weightFor = (p) => (suppress && p.id === suppress.playerId ? suppress.factor : 1);
    const atkWeights = starters.map((p) => ({ F: 4, M: 2, D: 0.6, G: 0.02 }[p.group] || 1) * moraleFactor(p) * weightFor(p));
    for (let i = 0; i < goals; i++) {
      const scorer = weightedPick(starters, atkWeights);
      scorer.goalsCareer = (scorer.goalsCareer || 0) + 1;
      scorer.goalsSeason = (scorer.goalsSeason || 0) + 1;
      const isPenalty = Math.random() < 0.08;
      let assistName = null, assistId = null;
      if (!isPenalty && starters.length > 1 && Math.random() < 0.72) {
        const assistPool = starters.filter((p) => p.id !== scorer.id);
        const assistWeights = assistPool.map((p) => ({ M: 3, F: 1.5, D: 0.8, G: 0.05 }[p.group] || 1) * moraleFactor(p) * weightFor(p));
        const assister = weightedPick(assistPool, assistWeights);
        assister.assistsCareer = (assister.assistsCareer || 0) + 1;
        assister.assistsSeason = (assister.assistsSeason || 0) + 1;
        assistName = assister.name; assistId = assister.id;
      }
      if (isPenalty) events.push({ type: "penalty_awarded", player: scorer.name });
      events.push({ type: "gol", player: scorer.name, playerId: scorer.id, assistPlayer: assistName, assistPlayerId: assistId, penalty: isPenalty });
    }
    return events;
  }
  function attributeChances(starters, atkStrength, defStrength, chunkShare) {
    const events = [];
    if (!starters || !starters.length) return events;
    const lambda = clamp((atkStrength * defStrength) * 7, 1, 14) * chunkShare;
    const count = poissonSample(lambda, Math.random);
    const weights = starters.map((p) => ({ F: 4, M: 2, D: 0.7, G: 0.05 }[p.group] || 1));
    for (let i = 0; i < count; i++) {
      const player = weightedPick(starters, weights);
      events.push({ type: Math.random() < 0.38 ? "defesa" : "chance_perdida", player: player.name });
    }
    return events;
  }
  function attributePenaltyMisses(starters, atkStrength, defStrength, chunkShare) {
    const events = [];
    if (!starters || !starters.length) return events;
    if (Math.random() >= 0.04 * chunkShare) return events;
    const weights = starters.map((p) => ({ F: 4, M: 2, D: 0.7 }[p.group] || 1.2));
    const player = weightedPick(starters, weights);
    events.push({ type: "penalty_awarded", player: player.name });
    events.push({ type: "penalty_missed", player: player.name });
    return events;
  }
  function updateLiveStats(lm, hs, as, chunkShare, chancesHome, chancesAway, ghChunk, gaChunk) {
    const s = lm.stats;
    const homeRatio = hs.atk / (hs.atk + as.atk || 1);
    s.possWeightHome += homeRatio * chunkShare;
    s.chunkShareSum = (s.chunkShareSum || 0) + chunkShare;
    s.shots.home += chancesHome.length + ghChunk;
    s.shots.away += chancesAway.length + gaChunk;
    s.shotsOnTarget.home += chancesHome.filter((e) => e.type === "defesa").length + ghChunk;
    s.shotsOnTarget.away += chancesAway.filter((e) => e.type === "defesa").length + gaChunk;
    s.fouls.home += poissonSample(11 * chunkShare, Math.random);
    s.fouls.away += poissonSample(11 * chunkShare, Math.random);
  }
  // Placar de um trecho do jogo ao vivo (resolveLiveChunk), já com as
  // penalidades de formação e motivação, e o VAR depois dos gols.
  function liveChunkScore(hsIn, asIn, isHome, chunkShare, formationPenalty, motivationMod) {
    const hs = { ...hsIn }, as = { ...asIn };
    const humanSide = isHome ? hs : as;
    if (formationPenalty) { humanSide.atk *= 0.92; humanSide.def /= 0.92; }
    const cpuSide = isHome ? as : hs;
    if (motivationMod > 1) { cpuSide.atk *= motivationMod; cpuSide.def /= motivationMod; }
    const lambdaHome = clamp((hs.atk * as.def) * 1.12, 0.05, 6) * chunkShare;
    const lambdaAway = clamp(as.atk * hs.def, 0.05, 6) * chunkShare;
    const gh = poissonSample(lambdaHome, Math.random);
    const ga = poissonSample(lambdaAway, Math.random);
    return { gh, ga, hs, as };
  }
  function fullMatchScore(home, away) {
    const lambdaHome = clamp((home.atk * away.def) * 1.12, 0.05, 6);
    const lambdaAway = clamp(away.atk * home.def, 0.05, 6);
    return { gh: poissonSample(lambdaHome, Math.random), ga: poissonSample(lambdaAway, Math.random) };
  }
  function varEvents(goals) { const out = []; goals.forEach((e) => { if (Math.random() < 0.12) out.push({ type: "var_check", mine: e.mine }); }); return out; }
  function cupPenaltyHomeWins(avgHome, avgAway) { const pHome = clamp(0.5 + (avgHome - avgAway) / 100, 0.25, 0.75); return Math.random() < pHome; }
  return { weightedPick, attributeGoals, attributeChances, attributePenaltyMisses, updateLiveStats, liveChunkScore, fullMatchScore, varEvents, cupPenaltyHomeWins };
})();

// Elenco de teste: 11 titulares com grupos, moral e ids variados.
function squad(seed) {
  const r = seeded(seed);
  const groups = ["G", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F"];
  return groups.map((g, i) => ({ id: `p${seed}_${i}`, name: `Jogador ${i}`, group: g, morale: Math.round(30 + r() * 70), goalsCareer: 0, goalsSeason: 0 }));
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 7919);

(async () => {
  const M = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "partida.js")).href);

  await check("weightedPick idêntico (300 sementes)", () => {
    for (const s of SEEDS) {
      const items = ["a", "b", "c", "d"], w = [1, 3, 0.5, 2];
      assert.deepStrictEqual(M.weightedPick(items, w, seeded(s)), withRandom(seeded(s), () => REF.weightedPick(items, w)));
    }
  });

  await check("Placar do jogo inteiro (CPU, Copa, outras divisões): mesmos gols, com forças variadas", () => {
    for (const s of SEEDS) {
      const r = seeded(s);
      const home = { atk: 0.6 + r() * 1.2, def: 0.6 + r() * 1.2 }, away = { atk: 0.6 + r() * 1.2, def: 0.6 + r() * 1.2 };
      assert.deepStrictEqual(M.scoreGoals(home, away, 1, seeded(s + 1)), withRandom(seeded(s + 1), () => REF.fullMatchScore(home, away)));
    }
  });

  await check("Trecho ao vivo: penalidade de formação, motivação e fração do jogo dão os mesmos gols", () => {
    for (const s of SEEDS) {
      const r = seeded(s);
      const hs = { atk: 0.6 + r() * 1.2, def: 0.6 + r() * 1.2 }, as = { atk: 0.6 + r() * 1.2, def: 0.6 + r() * 1.2 };
      const isHome = r() < 0.5, pen = r() < 0.3, mot = [1, 1.05, 1.1][Math.floor(r() * 3)], share = [15 / 90, 30 / 90][Math.floor(r() * 2)];
      const ref = withRandom(seeded(s + 2), () => REF.liveChunkScore(hs, as, isHome, share, pen, mot));
      let h = { ...hs }, a = { ...as };
      if (pen) { if (isHome) h = M.withFormationPenalty(h); else a = M.withFormationPenalty(a); }
      if (isHome) a = M.withMotivation(a, mot); else h = M.withMotivation(h, mot);
      const got = M.scoreGoals(h, a, share, seeded(s + 2));
      assert.deepStrictEqual(got, { gh: ref.gh, ga: ref.ga });
      assert.ok(Math.abs(h.atk - ref.hs.atk) < 1e-12 && Math.abs(a.def - ref.as.def) < 1e-12);
    }
  });

  await check("Autoria dos gols (artilheiro, assistência, pênalti) igual, com e sem marcação individual", () => {
    for (const s of SEEDS) {
      const goals = s % 5;
      const supp = s % 3 === 0 ? { playerId: `p${s}_9`, factor: 0.35 } : null;
      const a = squad(s), b = clone(a);
      const ref = withRandom(seeded(s + 3), () => REF.attributeGoals(a, goals, supp));
      const picks = M.pickGoalAuthors(b, goals, seeded(s + 3), supp);
      assert.deepStrictEqual(M.goalEvents(picks), ref);
    }
  });

  await check("Chances perdidas/defesas e pênalti perdido iguais", () => {
    for (const s of SEEDS) {
      const r = seeded(s); const atk = 0.6 + r() * 1.2, def = 0.6 + r() * 1.2, share = 15 / 90;
      const sq = squad(s);
      assert.deepStrictEqual(M.chanceEvents(sq, atk, def, share, seeded(s + 4)), withRandom(seeded(s + 4), () => REF.attributeChances(sq, atk, def, share)));
      assert.deepStrictEqual(M.penaltyMissEvents(sq, 1, seeded(s + 5)), withRandom(seeded(s + 5), () => REF.attributePenaltyMisses(sq, atk, def, 1)));
    }
  });

  await check("VAR e estatísticas do trecho iguais; a função nova não altera o objeto recebido", () => {
    for (const s of SEEDS) {
      const goals = Array.from({ length: s % 4 }, (_, i) => ({ type: "gol", mine: i % 2 === 0 }));
      assert.deepStrictEqual(M.varCheckEvents(goals, seeded(s + 6)), withRandom(seeded(s + 6), () => REF.varEvents(goals)));
      const base = { possWeightHome: 0.3, chunkShareSum: 0.5, shots: { home: 2, away: 1 }, shotsOnTarget: { home: 1, away: 0 }, fouls: { home: 3, away: 4 } };
      const lm = { stats: clone(base) };
      const hs = { atk: 1.1, def: 0.9 }, as = { atk: 0.95, def: 1.05 };
      const ch = [{ type: "defesa" }, { type: "chance_perdida" }], ca = [{ type: "chance_perdida" }];
      withRandom(seeded(s + 7), () => REF.updateLiveStats(lm, hs, as, 15 / 90, ch, ca, 1, 0));
      const frozen = clone(base);
      const got = M.addChunkStats(base, hs, as, 15 / 90, ch, ca, 1, 0, seeded(s + 7));
      assert.deepStrictEqual(got, lm.stats);
      assert.deepStrictEqual(base, frozen);
    }
  });

  await check("Pênaltis da Copa (jogo único e agregado): mesmo vencedor", () => {
    for (const s of SEEDS) {
      const r = seeded(s); const h = 55 + r() * 30, a = 55 + r() * 30;
      assert.strictEqual(M.cupPenaltyHomeWins(h, a, seeded(s + 8)), withRandom(seeded(s + 8), () => REF.cupPenaltyHomeWins(h, a)));
    }
  });

  await check("Sanidade estatística: média de gols do mandante > visitante em forças iguais (10 mil jogos)", () => {
    const rng = seeded(42); let h = 0, a = 0;
    for (let i = 0; i < 10000; i++) { const g = M.scoreGoals({ atk: 1, def: 1 }, { atk: 1, def: 1 }, 1, rng); h += g.gh; a += g.ga; }
    assert.ok(h / 10000 > a / 10000 && Math.abs(h / 10000 - 1.12) < 0.05 && Math.abs(a / 10000 - 1) < 0.05, `${h / 10000} × ${a / 10000}`);
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
