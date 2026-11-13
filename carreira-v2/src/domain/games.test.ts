// Testes da aba Jogos (fase 10): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAwards, buildCupDetail, buildH2H, buildStats } from "./games.ts";
import type { Career, Team } from "./types.ts";

const T: Record<string, Team> = { fla: { id: "fla", name: "Flamengo", short: "FLA" }, pal: { id: "pal", name: "Palmeiras", short: "PAL" }, cor: { id: "cor", name: "Corinthians", short: "COR" } };
const tb = (id: string | number) => T[String(id)] || { id, name: `Clube ${id}` };
function career(): Career {
  return {
    clubId: "fla", clubName: "Flamengo", seasonYear: 2026, currentRound: 15, schedule: {},
    standings: { fla: { id: "fla", j: 10, v: 6, e: 2, d: 2, gp: 18, gc: 9, sg: 9, pts: 20 }, pal: { id: "pal", j: 10, v: 7, e: 1, d: 2, gp: 20, gc: 8, sg: 12, pts: 22 }, cor: { id: "cor", j: 10, v: 1, e: 1, d: 8, gp: 6, gc: 20, sg: -14, pts: 4 } },
    cup: { active: true, expanded: true, phase: "qf", humanAlive: true, ties: {
      r32: [{ home: "fla", away: "cor", leg1: { gh: 2, ga: 0 }, leg2: { gh: 1, ga: 1 }, winner: "fla" }],
      r16: [{ home: "pal", away: "fla", leg1: { gh: 1, ga: 2 }, leg2: { gh: 0, ga: 0 }, winner: "fla", penalties: false }],
      qf: [{ home: "fla", away: "pal", leg1: { gh: null, ga: null }, leg2: { gh: null, ga: null } }],
    } },
    teamStats: { cleanSheets: 3, assists: 12, yellow: 15, red: 1, home: { j: 5, v: 4, e: 1, d: 0, gp: 11, gc: 3 }, away: { j: 5, v: 2, e: 1, d: 2, gp: 7, gc: 6 } },
    careerTotals: { j: 48, v: 25, e: 10, d: 13, gp: 70, gc: 50, longestWinStreak: 6, copaEditions: 1, copaV: 3 },
    currentWinStreak: 2, currentUnbeatenStreak: 4,
    squad: [{ id: "a", name: "Ana Lima", group: "F", overall: 80, goalsSeason: 7, assistsSeason: 2, goalsCareer: 20 }],
    leagueSquads: { pal: [{ id: "b", name: "Bia Melo", group: "F", overall: 82, goalsSeason: 9, assistsSeason: 1 }] },
    matchLog: [{ seasonYear: 2026, round: 9, opponentId: "pal", home: false, gh: 1, ga: 1 }, { seasonYear: 2025, round: 30, opponentId: "pal", home: true, gh: 3, ga: 0 }],
    seasonAwards: [{ seasonYear: 2025, brasileirao: { campeao: "fla", vice: "pal", artilheiro: { jogadorId: "a", nome: "Ana Lima", clubeId: "fla", clubeName: "Flamengo", valor: 21 }, assistencias: null, melhorJogador: null }, copaDoBrasil: { disputou: false } }],
  };
}

test("Copa: título pela situação, fases disputadas, confronto do ponto de vista do seu clube (ida, volta, agregado)", () => {
  const c = career();
  const m = buildCupDetail(c, tb, null);
  assert.equal(m.title, "A caminho da taça.");
  assert.deepEqual(m.phases.map((p) => p.id), ["r32", "r16", "qf"]);
  assert.equal(m.phase, "qf");
  const r16 = buildCupDetail(c, tb, "r16").tie!;
  assert.deepEqual([r16.ida, r16.volta, r16.agregado, r16.result], ["2 × 1", "0 × 0", "2 × 1", "Classificado"]);
  c.cup!.humanAlive = false; c.cup!.humanEliminatedStage = "qf";
  assert.equal(buildCupDetail(c, tb, null).title, "Sua campanha terminou.");
  c.cup!.championIsHuman = true;
  assert.equal(buildCupDetail(c, tb, null).title, "A Copa é sua.");
  c.cup = { active: false };
  assert.equal(buildCupDetail(c, tb, null).state, "fora");
});

test("Estatísticas: meu time (temporada × histórico), campeonato (competição, times, artilheiros, campeões)", () => {
  const c = career();
  const t = buildStats(c, tb, "time", "temporada");
  assert.deepEqual(t.map((s) => s.id), ["retro", "gols", "disc", "casa", "seq", "copa", "art"]);
  assert.deepEqual(t[0].rows!.map((r) => r.value), ["10", "6", "2", "2", "67%"]);
  assert.equal(t[3].rows![0].value, "4V 1E 0D · 11–3");
  assert.equal(buildStats(c, tb, "time", "historico")[0].rows![0].value, "48");
  assert.equal(buildStats(c, tb, "time", "historico")[4].rows!.length, 6, "recordes só no histórico");
  const lg = buildStats(c, tb, "campeonato", "temporada");
  assert.equal(lg[0].rows![2].value, "PAL (20)");
  assert.deepEqual(lg[2].table!.rows.map((r) => r.cells[0]), ["B. Melo", "A. Lima"]);
  assert.equal(buildStats(c, tb, "campeonato", "historico")[0].empty, "Os campeões aparecem a partir da primeira temporada encerrada.");
});

test("H2H e Premiações: V-E-D e jogos nesta carreira; temporada com prêmios e seus títulos", () => {
  const c = career();
  const h = buildH2H(c, tb, "pal");
  assert.deepEqual([h.v, h.e, h.d, h.form.join("")], [1, 1, 0, "EV"]);
  assert.equal(h.games[0].left.name, "Palmeiras");
  const a = buildAwards(c, tb, null);
  assert.equal(a.year, 2025);
  assert.equal(a.season!.champion.mine, true);
  assert.equal(a.season!.scorer!.value, "21 gols");
  assert.equal(a.titles.text, "1× Brasileirão");
  assert.equal(buildAwards({ ...c, seasonAwards: [] }, tb, null).season, null);
});

// SERIED-001: fase preliminar (jogo único) e edições anteriores.
test("Copa com a Série D: preliminar em jogo único, eliminação com a frase certa e edições anteriores", async () => {
  const { buildCupDetail: detail, buildCupEditions } = await import("./games.ts");
  const teams: Record<string, { id: string; name: string; short: string }> = { me: { id: "me", name: "Meu FC", short: "MEU" }, d1: { id: "d1", name: "Manaus FC", short: "MNA" }, a1: { id: "a1", name: "Flamengo", short: "FLA" }, a2: { id: "a2", name: "Palmeiras", short: "PAL" } };
  const byId = (id: string | number) => teams[String(id)] as never;
  const base = { clubId: "me", clubName: "Meu FC", seasonYear: 2027, currentRound: 2, schedule: {}, standings: {}, squad: [] } as never as import("./types.ts").Career;
  const tie = { home: "me", away: "d1", leg1: { gh: 1, ga: 1 }, leg2: { gh: null, ga: null }, winner: "d1", penalties: true };
  const c1 = { ...base, cup: { active: true, expanded: true, phase: "fase1", humanAlive: false, humanEliminatedStage: "prelim", humanEliminatedAtRound: 1, prelim: { direct: [] }, ties: { prelim: [tie], fase1: [] } } };
  const m = detail(c1, byId, null);
  assert.equal(m.phase, "prelim");
  assert.equal(m.tie!.volta, null);
  assert.equal(m.tie!.result, "Eliminado");
  assert.equal(m.tie!.penalties, true);
  assert.equal(m.note, "Eliminado na fase preliminar (rodada 1).");
  const c2 = { ...base, copaHistorico: [
    { ano: 2026, campeao: "a1", vice: "a2", participantes: 96, fase: "prelim", jogos: [{ fase: "prelim", adversario: "d1", ida: [1, 1], volta: null, venceu: false, penaltis: true }] },
    { ano: 2027, campeao: "me", vice: "a1", participantes: 96, fase: "campeao", jogos: [] },
  ] };
  const eds = buildCupEditions(c2 as never, byId);
  assert.deepEqual(eds.map((e) => [e.ano, e.campeao, e.campanha, e.mine]), [[2027, "Meu FC", "Campeão", true], [2026, "Flamengo", "Eliminado na fase preliminar pelo Manaus FC", false]]);
});
