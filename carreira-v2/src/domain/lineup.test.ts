// Testes do domínio da Escalação: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FORMATIONS, MAX_BENCH, applyLineupChange, buildLineup, buildSubstitute, shortName } from "./lineup.ts";
import type { Career, Player } from "./types.ts";

const P = (id: string, group: Player["group"], overall: number, extra: Partial<Player> = {}): Player => ({ id, name: `Jogador ${id.toUpperCase()}`, group, overall, status: "ok", ...extra });

function career(): Career {
  const squad = [
    P("g1", "G", 70), P("d1", "D", 72), P("d2", "D", 71), P("d3", "D", 69), P("d4", "D", 68),
    P("m1", "M", 75), P("m2", "M", 74), P("m3", "M", 73), P("f1", "F", 78), P("f2", "F", 77), P("f3", "F", 76),
    P("g2", "G", 60), P("m4", "M", 66), P("f4", "F", 65), P("d5", "D", 64, { status: "contundido", outUntilRound: 9 }),
    P("x1", "M", 50),
  ];
  return {
    clubId: "fla", clubName: "Flamengo", seasonYear: 2026, currentRound: 5, schedule: {}, standings: {},
    squad,
    lineup: { formation: "4-3-3", starters: ["g1", "d1", "d2", "d3", "d4", "m1", "m2", "m3", "f1", "f2", "f3"], bench: ["g2", "m4", "f4", "d5"], tactics: { tempo: 3 } },
    activeSchemeId: "scheme_1",
    finances: { cash: 1 },
  };
}

test("FORMATIONS é cópia fiel da do legado (public/js/carreira.js)", () => {
  const src = readFileSync(new URL("../../../public/js/carreira.js", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("const FORMATIONS = {"), src.indexOf("};", src.indexOf("const FORMATIONS = {")) + 2);
  const legacy = new Function(`${block.replace(/\/\/.*$/gm, "")}; return FORMATIONS;`)();
  assert.deepEqual(FORMATIONS, legacy);
  assert.match(src, /const MAX_BENCH = 11;/);
  assert.equal(MAX_BENCH, 11);
});

test("campo: ataque em cima, goleiro embaixo; vagas e jogadores reais; banco por posição/overall", () => {
  const m = buildLineup(career());
  assert.equal(m.formation, "4-3-3");
  assert.deepEqual(m.rows.map((r) => r.map((s) => s.label)), [["PONTA D", "CENTROAV.", "PONTA E"], ["VOL", "MEI", "MEI"], ["LAT D", "ZAG", "ZAG", "LAT E"], ["GOL"]]);
  assert.equal(m.rows[3][0].player?.id, "g1");
  assert.deepEqual(m.bench.map((b) => b.player.id), ["g2", "d5", "m4", "f4"]);
  assert.equal(m.bench.find((b) => b.player.id === "d5")?.out, "Lesionado");
});

test("ausência já cumprida conta como disponível (sem gravar nada)", () => {
  const c = career(); c.currentRound = 10;
  const m = buildLineup(c);
  assert.equal(m.bench.find((b) => b.player.id === "d5")?.out, null);
  assert.equal(c.squad!.find((p) => p.id === "d5")!.status, "contundido");
});

test("Quem entra?: elenco disponível, sem o que sai, com titular/banco marcados", () => {
  const s = buildSubstitute(career(), { kind: "starter", index: 6 })!; // m2 (MEI)
  assert.equal(s.outgoing?.id, "m2");
  assert.equal(s.slotLabel, "MEI");
  const ids = s.options.map((o) => o.player.id);
  assert.ok(!ids.includes("m2") && !ids.includes("d5"));
  assert.equal(s.options.find((o) => o.player.id === "m4")?.where, "banco");
  assert.equal(s.options.find((o) => o.player.id === "m1")?.where, "titular");
  assert.equal(s.options.find((o) => o.player.id === "x1")?.where, null);
  // mesma posição de quem sai primeiro (maior overall antes), depois a ordem do legado
  assert.deepEqual(ids.slice(0, 4), ["m1", "m3", "m4", "x1"]);
  assert.equal(ids[4], "g1");
});

test("troca titular ↔ reserva: reserva entra na vaga, titular vai para a vaga do banco", () => {
  const r = applyLineupChange(career(), { kind: "swap", target: { kind: "starter", index: 6 }, expectOutgoing: "m2", playerId: "m4" }) as Career;
  assert.equal(r.lineup!.starters[6], "m4");
  assert.deepEqual(r.lineup!.bench, ["g2", "m2", "f4", "d5"]);
  assert.equal(r.activeSchemeId, null);
  assert.deepEqual(r.lineup!.tactics, { tempo: 3 });
});

test("troca entre titulares e entrada de quem está fora da lista", () => {
  const a = applyLineupChange(career(), { kind: "swap", target: { kind: "starter", index: 5 }, expectOutgoing: "m1", playerId: "m3" }) as Career;
  assert.equal(a.lineup!.starters[5], "m3");
  assert.equal(a.lineup!.starters[7], "m1");
  const b = applyLineupChange(career(), { kind: "swap", target: { kind: "bench", playerId: "f4" }, expectOutgoing: "f4", playerId: "x1" }) as Career;
  assert.deepEqual(b.lineup!.bench, ["g2", "m4", "x1", "d5"]);
});

test("não grava quando a escalação mudou desde a abertura ou o jogador não pode jogar", () => {
  assert.ok("conflict" in applyLineupChange(career(), { kind: "swap", target: { kind: "starter", index: 6 }, expectOutgoing: "m1", playerId: "m4" }));
  assert.ok("conflict" in applyLineupChange(career(), { kind: "swap", target: { kind: "starter", index: 6 }, expectOutgoing: "m2", playerId: "d5" }));
  assert.ok("conflict" in applyLineupChange(career(), { kind: "swap", target: { kind: "bench", playerId: "zz" }, expectOutgoing: "zz", playerId: "x1" }));
});

test("formação: troca só o esquema, titulares nas mesmas vagas; save original intacto", () => {
  const c = career();
  const r = applyLineupChange(c, { kind: "formation", formation: "4-4-2" }) as Career;
  assert.equal(r.lineup!.formation, "4-4-2");
  assert.deepEqual(r.lineup!.starters, c.lineup!.starters);
  assert.equal(c.lineup!.formation, "4-3-3");
  assert.equal(c.activeSchemeId, "scheme_1");
  assert.ok("conflict" in applyLineupChange(c, { kind: "formation", formation: "9-9-9" }));
});

test("save antigo sem formação/banco não quebra", () => {
  const c = career(); c.lineup = { starters: [] };
  const m = buildLineup(c);
  assert.equal(m.formation, "4-4-2");
  assert.equal(m.rows.flat().every((s) => s.player === null), true);
  assert.deepEqual(m.bench, []);
});

test("nome abreviado como no legado", () => {
  assert.equal(shortName("Kevin Viveiros"), "K. Viveiros");
  assert.equal(shortName("Pedro"), "Pedro");
});
