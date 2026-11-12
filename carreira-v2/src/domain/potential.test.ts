// A faixa de potencial da v2 é a mesma do jogo: compara com as funções
// originais (data.js e carreira.js), lidas do próprio código da versão anterior.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoutedPotentialRange, potentialText } from "./potential.ts";

const pick = (src: string, name: string) => { const i = src.indexOf(`function ${name}(`); let d = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) break; } return src.slice(i, j + 1); };
const data = readFileSync(new URL("../../../public/js/data.js", import.meta.url), "utf8");
const game = readFileSync(new URL("../../../public/js/carreira.js", import.meta.url), "utf8");
const legacy = new Function(`const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)); ${pick(data, "mulberry32")} ${pick(data, "seededRngFromKey")} ${pick(game, "scoutedPotentialRange")} return scoutedPotentialRange;`)() as (p: object) => unknown;

test("Faixa de potencial idêntica à do jogo (scoutedPotentialRange), por idade e por id", () => {
  const cases = [];
  for (const id of ["a1", "base_fla_3", "scouted_x_123", "p-99", "Ünïcödé"]) for (const age of [15, 17, 18, 19, 22, 30]) for (const [ov, pot] of [[40, 80], [70, 72], [80, 80], [60, 99]]) cases.push({ id, age, overall: ov, potential: pot });
  cases.push({ id: "r", age: 16, overall: 50, potential: 70, scoutRevealed: true }, { id: "n", age: 16, overall: 50 });
  for (const c of cases) assert.deepEqual(scoutedPotentialRange(c), legacy(c), JSON.stringify(c));
  assert.equal(potentialText({ id: "n", overall: 80, potential: 80, age: 25 }), null);
  assert.equal(potentialText({ id: "r", overall: 50, potential: 70, age: 16, scoutRevealed: true }), "70");
});

// Lote L3d (12/11/2026): os limites que o test_scout antigo conferia na tela
// antiga — determinística, mínimo >= overall, máximo <= 99, mínimo <= máximo
// — e sem faixa quando não há espaço de crescimento.
test("Faixa de potencial: determinística e dentro dos limites; sem espaço de crescimento, sem faixa", () => {
  let n = 0;
  for (let i = 0; i < 300; i++) {
    const age = 15 + (i % 8), overall = 35 + (i % 50), potential = Math.min(99, overall + (i % 30));
    const p = { id: `base_${i}`, age, overall, potential };
    const r1 = scoutedPotentialRange(p), r2 = scoutedPotentialRange(p);
    assert.deepEqual(r1, r2, "determinística");
    if (!r1) continue;
    n++;
    assert.ok(r1.lo >= overall && r1.hi <= 99 && r1.lo <= r1.hi, JSON.stringify({ p, r1 }));
  }
  assert.ok(n > 100, "a maioria dos jovens com espaço tem faixa");
  assert.equal(scoutedPotentialRange({ id: "veterano", age: 30, overall: 75, potential: 75 }), null);
});
