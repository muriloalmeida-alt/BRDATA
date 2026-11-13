// Testes do domínio do Pré-jogo: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPreMatch } from "./prematch.ts";
import type { Career, Player, Team } from "./types.ts";

const P = (id: string, group: Player["group"], extra: Partial<Player> = {}): Player => ({ id, name: `Jogador ${id.toUpperCase()}`, group, overall: 70, status: "ok", ...extra });
const byId = (id: string | number): Team => ({ id, name: { fla: "Flamengo", pal: "Palmeiras" }[String(id)] || "?" });

function career(): Career {
  const ids = ["g1", "d1", "d2", "d3", "d4", "m1", "m2", "m3", "f1", "f2", "f3"];
  return {
    clubId: "fla", clubName: "Flamengo", competitionId: "brasileirao", seasonYear: 2026, currentRound: 12,
    schedule: { 12: [{ home: "pal", away: "fla" }] }, standings: {},
    squad: ids.map((id) => P(id, id[0] === "g" ? "G" : id[0] === "d" ? "D" : id[0] === "m" ? "M" : "F")),
    lineup: { formation: "4-3-3", starters: [...ids], bench: [] },
    calendar: { year: 2026, idx: 30, weeks: Array.from({ length: 52 }, (_, i) => ({ d: "08-12", p: "temporada" as const, r: i === 30 ? 12 : null })) },
  };
}

test("semana de jogo: confronto, data sem horário, competição + rodada, formação e campo", () => {
  const m = buildPreMatch(career(), byId);
  assert.equal(m.available, true);
  assert.equal(m.subtitle, "Brasileirão Série A · Rodada 12");
  assert.equal(m.next?.home.name, "Palmeiras");
  assert.equal(m.next?.date, "18 AGO");
  assert.equal(m.formation, "4-3-3");
  assert.equal(m.rows.flat().length, 11);
  assert.deepEqual(m.alerts, []);
});

test("avisos da confirmação atual: incompleta, indisponível, semana de 2 jogos", () => {
  const c = career();
  c.lineup!.starters[10] = null;
  c.squad!.find((p) => p.id === "d1")!.status = "suspenso";
  c.squad!.find((p) => p.id === "d1")!.outUntilRound = 13;
  c.squad!.find((p) => p.id === "m1")!.condition = 60.4;
  c.calendar!.weeks[30].c = 1;
  const a = buildPreMatch(c, byId).alerts;
  assert.deepEqual(a.map((x) => x.id), ["incompleta", "indisponivel", "rodizio"]);
  assert.match(a[0].sub, /^10\/11 titulares/);
  assert.equal(a[1].sub, "J. D1 (suspenso)");
  assert.match(a[2].sub, /J\. M1 \(60%\)/);
});

test("fora da semana de jogo não está disponível", () => {
  const c = career(); c.calendar!.idx = 29;
  assert.equal(buildPreMatch(c, byId).available, false);
});

test("bloqueio do início (12/11): pendência da escalação bloqueia; 11 + 11 com goleiros libera", () => {
  const c = career();
  // Banco vazio (fixture): bloqueado, com os textos das pendências.
  const b = buildPreMatch(c, byId).blocked;
  assert.ok(b.some((t) => /11 reservas/.test(t)));
  assert.ok(b.some((t) => /goleiro/.test(t)));
  // 11 reservas com goleiro: libera.
  const bench = ["g2", "d5", "d6", "d7", "d8", "m4", "m5", "m6", "f4", "f5", "f6"];
  c.squad!.push(...bench.map((id) => P(id, id[0] === "g" ? "G" : id[0] === "d" ? "D" : id[0] === "m" ? "M" : "F")));
  c.lineup!.bench = bench;
  assert.deepEqual(buildPreMatch(c, byId).blocked, []);
  // Sem goleiro titular: bloqueia.
  c.lineup!.starters[0] = "d8"; c.lineup!.bench[4] = "g1";
  assert.deepEqual(buildPreMatch(c, byId).blocked, ["Os titulares precisam de um goleiro disponível."]);
});

// SERIED-001: na semana da preliminar da Copa, o aviso de 2 jogos só vale
// para quem está nela (quem entra direto na 1ª fase joga uma vez só).
test("Semana da preliminar: aviso de 2 jogos só para quem joga a preliminar", () => {
  const c = career();
  c.currentRound = 1;
  c.schedule = { 1: [{ home: "pal", away: "fla" }] };
  c.calendar!.weeks[30] = { d: "08-12", p: "temporada", r: 1, c: 1 };
  c.cup = { active: true, expanded: true, phase: "prelim", humanAlive: true, prelim: { direct: ["fla"], round: 1 }, ties: { prelim: [{ home: "x", away: "y", leg1: { gh: null, ga: null } }] } };
  assert.ok(!buildPreMatch(c, byId).alerts.some((a) => a.id === "rodizio"));
  c.cup.ties!.prelim = [{ home: "fla", away: "y", leg1: { gh: null, ga: null } }];
  assert.ok(buildPreMatch(c, byId).alerts.some((a) => a.id === "rodizio"));
});
