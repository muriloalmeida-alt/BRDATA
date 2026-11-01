// Testes do domínio da Tabela: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCup, buildTable, zoneOf } from "./table.ts";
import type { Career, StandingRow, Team } from "./types.ts";

const byId = (id: string | number): Team => ({ id, name: `Clube ${id}` });
const row = (id: string, pts: number, extra: Partial<StandingRow> = {}): StandingRow => ({ id, j: 10, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts, ...extra });

function career(myPts = 0): Career {
  const standings: Record<string, StandingRow> = {};
  for (let i = 1; i <= 20; i++) standings[`t${i}`] = row(`t${i}`, 100 - i * 3);
  standings.me = row("me", myPts);
  delete standings.t20;
  return {
    clubId: "me", clubName: "Eu", competitionId: "brasileirao", seasonYear: 2026, currentRound: 11,
    schedule: {}, standings,
    resultsByRound: { 10: [{ home: "t1", away: "t2", gh: 2, ga: 2 }, { home: "t3", away: "me", gh: 0, ga: 1 }] },
  };
}

test("RELEGATION_N e faixas de zona iguais às do legado", () => {
  const src = readFileSync(new URL("../../../public/js/carreira.js", import.meta.url), "utf8");
  assert.match(src, /const RELEGATION_N = 4;/);
  assert.match(src, /pos === 1 \? "campeao" : pos <= 6 \? "libertadores" : pos <= 12 \? "sula" : pos > total - RELEGATION_N \? "reb" : ""/);
  assert.deepEqual([1, 6, 7, 12, 13, 16, 17, 20].map((p) => zoneOf(p, 20, "brasileirao")), ["top", "top", "mid", "mid", null, null, "reb", "reb"]);
  assert.deepEqual([1, 4, 5, 16, 17].map((p) => zoneOf(p, 20, "serie_b")), ["top", "top", null, null, "reb"]);
});

test("trecho de 6 linhas ao redor do seu clube, nas bordas da tabela também", () => {
  assert.deepEqual(buildTable(career(89), byId).excerpt.map((r) => r.pos), [1, 2, 3, 4, 5, 6]); // 4º
  const mid = buildTable(career(65), byId); // 12º
  assert.equal(mid.rows.find((r) => r.mine)!.pos, 12);
  assert.deepEqual(mid.excerpt.map((r) => r.pos), [9, 10, 11, 12, 13, 14]);
  assert.deepEqual(buildTable(career(0), byId).excerpt.map((r) => r.pos), [15, 16, 17, 18, 19, 20]);
  assert.equal(buildTable(career(0), byId).rows.length, 20);
});

test("resultados da última rodada disputada, o seu primeiro; legenda da Série A", () => {
  const t = buildTable(career(50), byId);
  assert.equal(t.lastRound, 10);
  assert.deepEqual(t.results.map((r) => `${r.home.id} ${r.gh}-${r.ga} ${r.away.id}`), ["t3 0-1 me", "t1 2-2 t2"]);
  assert.deepEqual(t.legend.map((l) => l.label), ["Libertadores", "Pré-Libertadores", "Rebaixamento"]);
  assert.equal(t.switcher, null);
});

test("outras divisões: só com sistema de divisões; sem resultados de outra divisão", () => {
  const c = career(50);
  assert.equal(buildTable(c, byId, "serie_b").division, "brasileirao");
  c.otherDivisions = { serie_b: { standings: { x1: row("x1", 30), x2: row("x2", 31) } } };
  const b = buildTable(c, byId, "serie_b");
  assert.equal(b.division, "serie_b");
  assert.equal(b.divisionName, "Brasileirão Série B");
  assert.deepEqual(b.rows.map((r) => r.team.id), ["x2", "x1"]);
  assert.deepEqual(b.results, []);
  assert.deepEqual(b.legend.map((l) => l.label), ["Acesso", "Rebaixamento"]);
  assert.equal(b.switcher?.length, 3);
});

test("antes da 1ª rodada: sem resultados", () => {
  const c = career(0); c.currentRound = 1;
  assert.equal(buildTable(c, byId).lastRound, 0);
  assert.deepEqual(buildTable(c, byId).results, []);
});

test("Copa: fora, viva (formato expandido), eliminada, campeã — mesmos textos do legado", () => {
  const c = career(0);
  assert.equal(buildCup(c, byId).outcome, "fora");
  c.cup = { active: true, expanded: true, humanAlive: true, phase: "r32", ties: {
    fase1: [{ home: "me", away: "t5", leg1: { gh: 2, ga: 0 }, leg2: { gh: 1, ga: 1 }, winner: "me" }],
    r32: [{ home: "t7", away: "me", leg1: { gh: 1, ga: 0 }, leg2: { gh: null, ga: null } }],
  } };
  const v = buildCup(c, byId);
  assert.equal(v.status, "Fase atual: 2ª fase (volta). Próximo confronto: rodada 12 contra Clube t7.");
  assert.deepEqual(v.history.map((h) => [h.phase, h.score, h.note]), [
    ["1ª fase", "2 x 0 / 1 x 1", "Agregado 3 x 1 — Classificado"],
    ["2ª fase", "0 x 1", "Ida disputada, aguardando a volta"],
  ]);
  c.cup = { active: true, humanAlive: false, humanEliminatedStage: "qf", humanEliminatedAtRound: 14, ties: { r16: [{ home: "me", away: "t2", gh: 1, ga: 1, penalties: true, winner: "me" }] } };
  const e = buildCup(c, byId);
  assert.equal(e.status, "Eliminado da Copa do Brasil nas Quartas de final (rodada 14).");
  assert.deepEqual(e.history[0], { phase: "Oitavas de final", opp: byId("t2"), score: "1 x 1 (pên.)", note: "Classificado", won: true });
  c.cup = { active: true, expanded: true, humanAlive: true, phase: "fase1", seeds: ["me", "t1"], ties: { fase1: [{ home: "t3", away: "t4", leg1: { gh: null, ga: null } }] } };
  assert.equal(buildCup(c, byId).status, "Fase atual: 1ª fase. Seu clube é cabeça de chave e entra na 2ª fase (rodada 9).");
  c.cup = { active: true, championIsHuman: true };
  assert.equal(buildCup(c, byId).status, "Campeão da Copa do Brasil 2026!");
});
