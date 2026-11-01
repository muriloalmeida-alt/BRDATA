// Testes do domínio do Calendário: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCalendar } from "./calendar.ts";
import type { Career, Team } from "./types.ts";

const byId = (id: string | number): Team => ({ id, name: { me: "Flamengo", a: "Palmeiras", b: "Santos", c: "Bahia" }[String(id)] || `Clube ${id}` });

function career(): Career {
  // semana i começa em 2026-01-05 + 7i; rodada r na semana 10 + r
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const dt = new Date(Date.UTC(2026, 0, 5 + 7 * i));
    return { d: `${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`, p: "temporada" as const, r: i >= 11 && i <= 48 ? i - 10 : null };
  });
  const schedule: Career["schedule"] = {};
  for (let r = 1; r <= 38; r++) schedule[r] = [r % 2 ? { home: "me", away: "a" } : { home: "b", away: "me" }, { home: "x", away: "y" }];
  return {
    clubId: "me", clubName: "Flamengo", seasonYear: 2026, currentRound: 3, schedule, standings: {},
    calendar: { year: 2026, idx: 13, weeks, friendlies: [{ wi: 5, played: true, result: { gh: 2, ga: 1 }, opp: "c" }, { wi: 50, played: false, opp: null, optional: true }] },
    matchLog: [{ seasonYear: 2026, round: 2, opponentId: "b", home: false, gh: 0, ga: 1 }, { seasonYear: 2026, round: 1, opponentId: "a", home: true, gh: 3, ga: 0 }, { seasonYear: 2025, round: 1, opponentId: "a", home: true, gh: 9, ga: 9 }],
  };
}

test("próximo compromisso é a rodada atual, no domingo, com mando e rótulo", () => {
  const m = buildCalendar(career(), byId, "Brasileirão Série A");
  const next = m.upcoming[0];
  assert.equal(next.key, "liga-3");
  assert.equal(next.label, "Brasileirão Série A · Rodada 3");
  assert.equal(next.day, "DOM");
  assert.equal(next.where, "Casa");
  // semana 13 começa 06/04/2026 (segunda); domingo = 12/04
  assert.equal(next.date, "12 ABR");
  assert.equal(m.upcoming.filter((i) => i.competition === "liga").length, 36);
});

test("disputados com placar do registro de partidas da temporada, mais recente primeiro", () => {
  const m = buildCalendar(career(), byId, "Brasileirão Série A");
  assert.deepEqual(m.past.map((i) => [i.key, i.score]), [["liga-2", { gh: 0, ga: 1 }], ["liga-1", { gh: 3, ga: 0 }], ["amistoso-5", { gh: 2, ga: 1 }]]);
  assert.equal(m.past[0].where, "Fora");
});

test("Copa: só confronto definido, quarta-feira, mando invertido e placar corrigido na volta", () => {
  const c = career();
  c.currentRound = 20;
  c.cup = { active: true, expanded: true, humanAlive: true, phase: "r16", ties: {
    fase1: [], r32: [{ home: "me", away: "c", leg1: { gh: 2, ga: 0 }, leg2: { gh: 1, ga: 3 }, winner: "me" }],
    r16: [{ home: "a", away: "me", leg1: { gh: 1, ga: 1 }, leg2: { gh: null, ga: null } }], qf: [],
  } };
  const m = buildCalendar(c, byId, "Brasileirão Série A");
  const copa = [...m.past, ...m.upcoming].filter((i) => i.competition === "copa").sort((a, b) => a.sort - b.sort);
  assert.deepEqual(copa.map((i) => i.key), ["copa-r32-1", "copa-r32-2", "copa-r16-1", "copa-r16-2"]);
  const volta = copa[1];
  assert.equal(volta.home.name, "Bahia"); // volta: mando do outro clube
  assert.deepEqual(volta.score, { gh: 3, ga: 1 }); // guardado relativo ao confronto (me 1 x c 3) → mandante Bahia 3 x 1
  assert.equal(volta.day, "QUA");
  assert.equal(copa[3].played, false);
  assert.equal(copa[3].where, "Casa");
});

test("amistoso opcional sem adversário aparece como a definir; save sem calendário usa a rodada", () => {
  const m = buildCalendar(career(), byId, "Série A");
  const fr = m.upcoming.find((i) => i.competition === "amistoso")!;
  assert.equal(fr.away.name, "A definir");
  assert.equal(fr.label, "Amistoso (opcional) · na semana");
  assert.equal(fr.day, "");
  const c = career(); delete c.calendar;
  const n = buildCalendar(c, byId, "Série A");
  assert.equal(n.upcoming[0].date, "R3");
  assert.equal(n.upcoming[0].day, "");
});

test("amistoso de semana já passada sem jogo não aparece", () => {
  const c = career();
  c.calendar!.friendlies!.push({ wi: 8, played: false, opp: null });
  const m = buildCalendar(c, byId, "Série A");
  assert.equal([...m.upcoming, ...m.past].some((i) => i.key === "amistoso-8"), false);
});

test("temporada encerrada: nenhum compromisso futuro", () => {
  const c = career(); c.currentRound = 39; delete c.calendar!.friendlies;
  assert.equal(buildCalendar(c, byId, "Série A").upcoming.length, 0);
});
