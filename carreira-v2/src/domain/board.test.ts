// Testes do domínio da Diretoria: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBoard } from "./board.ts";
import type { Career, StandingRow } from "./types.ts";

const row = (id: string, pts: number, j = 5): StandingRow => ({ id, j, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts });
function career(): Career {
  return {
    clubId: "me", clubName: "Eu", seasonYear: 2027, currentRound: 6, schedule: {},
    standings: { a: row("a", 15), b: row("b", 12), me: row("me", 11), c: row("c", 3) },
    boardGoal: { label: "Terminar entre os 6 primeiros", target: 6 },
    objectives: { season: [{ title: "Vencer 3 jogos seguidos", status: "active", target: 3, currentProgress: 5 }, { title: "Revelar um jogador da base", status: "claimed", target: 1 }] },
    seasonHistory: [{ year: 2026, position: 7, goalLabel: "Terminar entre os 10 primeiros", goalWasMet: true }],
  };
}

test("meta, posição atual e 'dentro da meta' com o critério do legado", () => {
  const b = buildBoard(career());
  assert.equal(b.goal, "Terminar entre os 6 primeiros");
  assert.equal(b.position, 3);
  assert.equal(b.onTrack, true);
  const c = career(); c.boardGoal!.target = 2;
  assert.equal(buildBoard(c).onTrack, false);
});

test("antes da 1ª rodada: sem posição nem avaliação", () => {
  const c = career();
  Object.values(c.standings).forEach((r) => { r.j = 0; r.pts = 0; });
  const b = buildBoard(c);
  assert.equal(b.position, null);
  assert.equal(b.onTrack, false);
});

test("outros objetivos (progresso limitado ao alvo) e temporadas anteriores", () => {
  const b = buildBoard(career());
  assert.deepEqual(b.objectives, [
    { title: "Vencer 3 jogos seguidos", done: false, status: "Em andamento · 3/3" },
    { title: "Revelar um jogador da base", done: true, status: "Cumprido" },
  ]);
  assert.deepEqual(b.history, [{ year: 2026, goal: "Terminar entre os 10 primeiros", position: 7, met: true }]);
  const c = career(); delete c.objectives; delete c.seasonHistory;
  assert.deepEqual(buildBoard(c).objectives, []);
  assert.deepEqual(buildBoard(c).history, []);
});
