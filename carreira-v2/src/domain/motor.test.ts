// Fase 12, etapa 1: a v2 importa o núcleo da partida (public/js/motor/)
// com os tipos de partida.d.ts. A equivalência com a implementação
// anterior está em tests/unit/test_motor_partida.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { goalLambdas, pickGoalAuthors, scoreGoals, type Side } from "../../../public/js/motor/partida.js";

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test("Motor da partida na v2: mesma semente, mesmo placar; mando de campo de 12%", () => {
  const home: Side = { atk: 1.2, def: 0.9 }, away: Side = { atk: 1, def: 1.1 };
  assert.deepEqual(scoreGoals(home, away, 1, seeded(7)), scoreGoals(home, away, 1, seeded(7)));
  const l = goalLambdas({ atk: 1, def: 1 }, { atk: 1, def: 1 });
  assert.equal(l.home.toFixed(2), "1.12");
  assert.equal(l.away, 1);
  const sq = [{ id: "a", name: "A", group: "F" }, { id: "b", name: "B", group: "M" }];
  assert.equal(pickGoalAuthors(sq, 3, seeded(1)).length, 3);
});
