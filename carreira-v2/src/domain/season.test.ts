// Testes da temporada e da carreira do treinador (fase 5):
// node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClubOffer, buildCoach, buildDismissal, buildHistory, buildNewSeason, buildSeasonEnd, dismissalPending, type CoachHistory, type NewSeasonSummary } from "./season.ts";
import type { Career, Team } from "./types.ts";

const T = (id: string, name: string): Team => ({ id, name });
const teams: Record<string, Team> = { cui: T("cui", "Cuiabá"), pal: T("pal", "Palmeiras"), spt: T("spt", "Sport") };
const byId = (id: string | number) => teams[String(id)] || T(String(id), "?");
const row = (id: string, pts: number) => ({ id, j: 38, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts });

function ended(over: Partial<Career> = {}): Career {
  return {
    clubId: "cui", clubName: "Cuiabá", competitionId: "brasileirao", seasonYear: 2026, currentRound: 39, schedule: {},
    standings: { pal: row("pal", 80), cui: row("cui", 60), spt: row("spt", 40) },
    boardGoal: { label: "Terminar entre os 10 primeiros", target: 10 },
    divisionTeams: { brasileirao: [teams.cui, teams.pal], serie_b: [teams.spt] },
    ...over,
  };
}

test("Encerramento: posição, competição e ano; meta cumprida pela regra do jogo (posição ≤ alvo)", () => {
  const m = buildSeasonEnd(ended(), byId);
  assert.equal(m.position, 2);
  assert.equal(m.kicker, "Brasileirão Série A 2026");
  assert.equal(m.line, "O Cuiabá concluiu a temporada de 2026 em 2º lugar no Brasileirão Série A.");
  assert.deepEqual(m.goal, { label: "Terminar entre os 10 primeiros", met: true });
  assert.equal(m.nextYear, 2027);
  assert.equal(buildSeasonEnd(ended({ boardGoal: { label: "Ser campeão", target: 1 } }), byId).goal?.met, false);
});

test("Demissão pendente: temporada encerrada e 3 temporadas seguidas sem meta (regra do jogo)", () => {
  assert.equal(dismissalPending(ended({ negativeSeasonsStreak: 3 })), true);
  assert.equal(dismissalPending(ended({ negativeSeasonsStreak: 2 })), false);
  assert.equal(dismissalPending(ended({ negativeSeasonsStreak: 3, currentRound: 12 })), false);
});

test("Demissão: motivo com a última temporada; passagem com jogos, vitórias e títulos", () => {
  const m = buildDismissal(ended({ negativeSeasonsStreak: 3, careerTotals: { j: 114, v: 30 },
    seasonHistory: [{ year: 2026, position: 17, goalLabel: "Terminar entre os 10 primeiros", goalWasMet: false }],
    seasonAwards: [{ seasonYear: 2024, brasileirao: { campeao: "pal" }, copaDoBrasil: { disputou: true, campeao: "cui" } }] }));
  assert.equal(m.reason, "3 temporadas seguidas sem cumprir a meta. Em 2026: Terminar entre os 10 primeiros, e o time terminou em 17º lugar.");
  assert.deepEqual(m.rows.map((r) => r.value), ["114", "30", "1"]);
});

test("Nova temporada: virada, saídas por nome, acesso só quando houve, finanças e proposta", () => {
  const r: NewSeasonSummary = { ano: 2027, anoAnterior: 2026, posicao: 2, metaAnterior: "Entre os 10", metaBatida: true, envelhecidos: 31,
    saidas: ["Bruno Santos", "Carlos Dias"], novosBase: 3, contratacoes: 0, divisao: null, meta: "Entre os 6 primeiros", teto: 4_200_000, caixa: 30_000_000, propostas: 1 };
  const m = buildNewSeason(r);
  assert.equal(m.title, "Temporada 2027.");
  assert.deepEqual(m.turn.map((t) => [t.label, t.value]), [["Elenco envelhecido", "31 jogadores"], ["Contratos encerrados", "2 jogadores"]]);
  assert.equal(m.leaving, "Saíram por fim de contrato: B. Santos, C. Dias.");
  assert.deepEqual(m.last.map((l) => [l.label, l.value]), [["Posição final", "2º lugar"], ["Entre os 10", "Meta cumprida"]]);
  assert.deepEqual(m.squad.map((s) => s.label), ["Jovens novos na base"]);
  assert.deepEqual(m.money.map((s) => s.value), ["R$ 4,2 mi", "R$ 30 mi"]);
  assert.equal(m.hasOffer, true);
  const sub = buildNewSeason({ ...r, saidas: [], divisao: { texto: "Acesso! Série B → Série A.", subiu: true }, propostas: 0 });
  assert.deepEqual(sub.turn.slice(1), [{ label: "Contratos encerrados", value: "Nenhum" }, { label: "Acesso", value: "Série B → Série A.", tone: "pos" }]);
  assert.equal(sub.leaving, null);
});

test("Proposta ao treinador: clube e série, orçamento no lugar do objetivo; clube atual e posição", () => {
  const c = ended({ currentRound: 1, reputation: 62, clubProposals: [{ clubId: "pal", clubName: "Palmeiras", reputationRequired: 60, budgetOffered: 9_500_000 }],
    standings: { cui: { ...row("cui", 0), j: 0 }, pal: { ...row("pal", 0), j: 0 } } });
  const m = buildClubOffer(c, byId)!;
  assert.deepEqual([m.clubName, m.division, m.budget, m.current.name, m.current.division, m.current.position, m.reputation],
    ["Palmeiras", "Série A", "R$ 9,5 mi", "Cuiabá", "Série A", "Temporada no início", "62"]);
  assert.equal(buildClubOffer(ended(), byId), null);
});

const H: CoachHistory = {
  nome: "Murilo Almeida", reputacao: 62, status: "Estabelecido", conquistasTotal: 30,
  atual: { nome: "Cuiabá", temporadas: 2, melhorPosicao: 2, titulos: 1 },
  anteriores: [{ nome: "Sport", temporadas: 3, titulos: 0, posicaoMedia: 12, saida: "dismissed" }],
  titulos: [{ ano: 2025, competicao: "copa" }],
  conquistas: [{ id: "a1", titulo: "Campeão da Copa", data: Date.UTC(2026, 10, 3) }],
};

test("Perfil: inicial, nome, cargo, temporada e reputação com status", () => {
  const m = buildCoach(H, "x", ended());
  assert.deepEqual(m, { initial: "M", name: "Murilo Almeida", role: "Treinador do Cuiabá", season: "Temporada 2026", reputation: "62 · Estabelecido" });
  assert.equal(buildCoach({ ...H, nome: null }, "Ana", ended()).name, "Ana");
});

test("Histórico: clube atual e anteriores (motivo da saída), títulos e conquistas com data; vazio só nas conquistas", () => {
  const m = buildHistory(H);
  assert.deepEqual(m.clubs.map((c) => [c.name, c.value, c.sub]), [
    ["Cuiabá", "2 temporadas", "Melhor posição: 2º · 1 título · Clube atual"],
    ["Sport", "3 temporadas", "Posição média: 12º · 0 títulos · Saiu por demissão"],
  ]);
  assert.deepEqual(m.titles.map((t) => [t.name, t.value]), [["Copa do Brasil", "2025"]]);
  assert.deepEqual(m.achievements.map((a) => [a.name, a.value]), [["Campeão da Copa", "03/11/2026"]]);
  const vazio = buildHistory({ ...H, conquistas: [] });
  assert.equal(vazio.empty, true);
  assert.equal(vazio.clubs.length, 2);
});
