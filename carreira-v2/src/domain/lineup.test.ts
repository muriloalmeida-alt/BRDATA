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

test("FORMATIONS é cópia fiel da do motor (public/js/motor/fechamento.js, etapa C3)", () => {
  // Etapa G1c2 (10/11): o limite do banco saiu do carreira.js para o motor.
  const src = readFileSync(new URL("../../../public/js/motor/carga.js", import.meta.url), "utf8");
  // Etapa C3 (09/11): as formações saíram do carreira.js para o motor.
  const motor = readFileSync(new URL("../../../public/js/motor/fechamento.js", import.meta.url), "utf8");
  const block = motor.slice(motor.indexOf("const FORMATIONS = {"), motor.indexOf("};", motor.indexOf("const FORMATIONS = {")) + 2);
  const legacy = new Function(`${block.replace(/\/\/.*$/gm, "")}; return FORMATIONS;`)();
  assert.deepEqual(FORMATIONS, legacy);
  assert.match(src, /export const MAX_BENCH = 11;/);
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

// ---------------- FASE1-ESC (12/11/2026) ----------------
// Escalação válida: 11 titulares + 11 reservas, com goleiro no banco (g2) e
// um goleiro fora da escalação (g3).
function careerValida(): Career {
  const c = career();
  c.squad = [
    ...c.squad.filter((p) => p.id !== "d5"),
    P("d5", "D", 64), P("d6", "D", 63), P("d7", "D", 62), P("m5", "M", 61), P("m6", "M", 60), P("f5", "F", 59), P("f6", "F", 58), P("g3", "G", 55),
  ];
  c.lineup = { formation: "4-3-3", starters: ["g1", "d1", "d2", "d3", "d4", "m1", "m2", "m3", "f1", "f2", "f3"], bench: ["g2", "m4", "f4", "d5", "d6", "d7", "m5", "m6", "f5", "f6", "x1"], tactics: { tempo: 3 } };
  return c;
}

test("ESC: a escalação válida não tem pendência; save antigo com banco menor mostra o que falta e as vagas vazias", () => {
  assert.deepEqual(buildLineup(careerValida()).issues, []);
  const old = buildLineup(career()); // banco de 4, com um lesionado
  assert.equal(old.emptyBench, MAX_BENCH - 4);
  assert.ok(old.issues.some((t) => /11 reservas/.test(t)) && old.issues.some((t) => /lesionado/.test(t)), old.issues.join(" | "));
});

test("ESC-03: a troca que tira o único goleiro do banco devolve a recomposição (g3) e não grava sozinha; com ela, grava as duas", () => {
  const c = careerValida();
  const r = applyLineupChange(c, { kind: "swap", target: { kind: "starter", index: 10 }, expectOutgoing: "f3", playerId: "g2" });
  assert.ok("recompose" in r, JSON.stringify(r));
  const rec = (r as { recompose: { entra: string; sai: string | null } }).recompose;
  assert.equal(rec.entra, "g3");
  const ok = applyLineupChange(c, { kind: "swap", target: { kind: "starter", index: 10 }, expectOutgoing: "f3", playerId: "g2", recompose: rec }) as Career;
  assert.ok(ok.lineup, JSON.stringify(ok));
  assert.equal(ok.lineup!.starters[10], "g2");
  assert.ok(ok.lineup!.bench.includes("g3") && ok.lineup!.bench.length === 11);
  assert.deepEqual(buildLineup(ok).issues, []);
});

test("ESC-03: sem goleiro para o banco, a troca fica bloqueada com o motivo", () => {
  const c = careerValida();
  c.squad = c.squad.map((p) => (p.id === "g3" ? { ...p, status: "suspenso", outUntilRound: 7 } : p));
  const r = applyLineupChange(c, { kind: "swap", target: { kind: "starter", index: 10 }, expectOutgoing: "f3", playerId: "g2" });
  assert.ok("blocked" in r && /goleiro/i.test((r as { blocked: string }).blocked), JSON.stringify(r));
});

test("ESC-04: vaga vazia no banco só oferece quem está fora da escalação e completa o banco", () => {
  const c = career();
  const m = buildSubstitute(c, { kind: "bench-empty" })!;
  assert.ok(m.options.every((o) => o.where === null), JSON.stringify(m.options.map((o) => o.where)));
  const r = applyLineupChange(c, { kind: "swap", target: { kind: "bench-empty" }, expectOutgoing: null, playerId: "x1" }) as Career;
  assert.equal(r.lineup!.bench.length, 5);
  assert.ok(r.lineup!.bench.includes("x1"));
});
