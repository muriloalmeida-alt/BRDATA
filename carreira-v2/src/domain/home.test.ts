// Testes do domínio do Início: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHome, moneyShort, matchDay } from "./home.ts";
import type { Career, Team } from "./types.ts";

const T = (id: string, name: string): Team => ({ id, name });
const teams: Record<string, Team> = { fla: T("fla", "Flamengo"), pal: T("pal", "Palmeiras"), cui: T("cui", "Cuiabá") };
const byId = (id: string | number) => teams[String(id)] || T(String(id), "?");

function base(): Career {
  return {
    clubId: "fla", clubName: "Flamengo", competitionId: "brasileirao", seasonYear: 2026, currentRound: 12,
    schedule: { 12: [{ home: "fla", away: "pal" }, { home: "cui", away: "x" }] },
    standings: {
      fla: { id: "fla", j: 11, v: 6, e: 2, d: 3, gp: 18, gc: 10, sg: 8, pts: 20 },
      pal: { id: "pal", j: 11, v: 7, e: 2, d: 2, gp: 20, gc: 9, sg: 11, pts: 23 },
      cui: { id: "cui", j: 11, v: 6, e: 2, d: 3, gp: 15, gc: 10, sg: 5, pts: 20 },
    },
    lineup: { starters: Array(11).fill("p") },
    recentForm: [0, 3, 1, 3, 0, 3],
    boardGoal: { label: "Terminar entre os 6 primeiros" },
    finances: { cash: 12_400_000 },
    newsFeed: [{ texto: "Liga agitada", mine: false }, { texto: "Foco na próxima rodada", mine: true }],
    calendar: { year: 2026, idx: 30, weeks: Array.from({ length: 52 }, (_, i) => ({ d: "08-12", p: "temporada" as const, r: i === 30 ? 12 : null })) },
  };
}

test("semana de jogo: confronto, data + rodada, CTA Preparar partida", () => {
  const h = buildHome(base(), byId);
  assert.equal(h.state, "match");
  assert.equal(h.next?.home.name, "Flamengo");
  assert.equal(h.next?.away.name, "Palmeiras");
  assert.equal(h.next?.line, "18 AGO · RODADA 12");
  assert.deepEqual(h.cta, { label: "Preparar partida", action: "preparar" });
});

test("posição com o mesmo desempate do legado (pts, V, SG, GP)", () => {
  assert.equal(buildHome(base(), byId).position, 2);
});

test("sem jogos ainda: sem posição inventada", () => {
  const c = base(); c.standings.fla.j = 0;
  assert.equal(buildHome(c, byId).position, null);
});

test("forma: últimos 5, do mais antigo ao mais recente", () => {
  assert.deepEqual(buildHome(base(), byId).form, ["V", "E", "V", "D", "V"]);
});

test("notícia do próprio clube tem prioridade; finanças formatadas", () => {
  const h = buildHome(base(), byId);
  assert.equal(h.news, "Foco na próxima rodada");
  assert.equal(h.cash, "R$ 12,4 mi");
  assert.equal(moneyShort(-850_000), "-R$ 850 mil");
});

test("pré-temporada: fase real e CTA Avançar semana; amistoso quando houver", () => {
  const c = base();
  c.currentRound = 1;
  c.schedule = { 1: [{ home: "pal", away: "fla" }] };
  c.calendar = { year: 2026, idx: 5, weeks: [
    ...Array.from({ length: 5 }, () => ({ d: "01-05", p: "ferias" as const, r: null })),
    { d: "02-02", p: "pre", r: null }, { d: "02-09", p: "pre", r: null }, { d: "02-16", p: "pre", r: null }, { d: "02-23", p: "pre", r: null },
    { d: "03-02", p: "temporada", r: 1 },
  ] };
  let h = buildHome(c, byId);
  assert.equal(h.state, "offweek");
  assert.equal(h.next?.phase, "Pré-temporada · semana 1 de 4");
  assert.equal(h.next?.line, "08 MAR · RODADA 1");
  assert.equal(h.cta.action, "avancar-semana");
  c.calendar.friendlies = [{ wi: 5, optional: false }];
  h = buildHome(c, byId);
  assert.deepEqual(h.cta, { label: "Ir para o amistoso", action: "amistoso" });
});

test("fim de temporada: sem confronto, CTA Próxima temporada", () => {
  const c = base(); c.currentRound = 39;
  const h = buildHome(c, byId);
  assert.equal(h.state, "ended");
  assert.equal(h.next, null);
  assert.equal(h.cta.action, "proxima-temporada");
});

test("alertas reais: escalação incompleta e proposta de clube", () => {
  const c = base(); c.lineup = { starters: [...Array(9).fill("p"), null, null] }; c.clubProposals = [{ clubName: "Grêmio" }];
  const h = buildHome(c, byId);
  assert.deepEqual(h.alerts.map((a) => a.id), ["escalacao", "proposta"]);
  assert.equal(h.alerts[0].sub, "9/11 titulares definidos");
});

test("save antigo sem calendário: confronto sem data, rodada mantida", () => {
  const c = base(); delete c.calendar;
  assert.equal(buildHome(c, byId).next?.line, "RODADA 12");
  assert.equal(matchDay(c, 12), null);
});
