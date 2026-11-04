// Testes do domínio da semana (fase 3): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFriendly, buildNews, buildNotices, buildWeekDone, skipInfo, timeAgo, type WeekSummary } from "./week.ts";
import { buildHome } from "./home.ts";
import type { Career, CalendarWeek, Team } from "./types.ts";

const T = (id: string, name: string): Team => ({ id, name });
const teams: Record<string, Team> = { fla: T("fla", "Flamengo"), cui: T("cui", "Cuiabá"), spt: T("spt", "Sport"), ago: T("ago", "Atlético-GO") };
const byId = (id: string | number) => teams[String(id)] || T(String(id), "?");

function summary(over: Partial<WeekSummary> = {}): WeekSummary {
  return {
    semanas: 1, agora: { fase: "Pré-temporada", semanaDe: "12 jan", temJogo: false },
    treino: { semanas: 1, sessoes: [{ foco: "tatico", intensidade: "moderada" }, { foco: "tatico", intensidade: "intensa" }, { foco: "fisico", intensidade: "moderada" }, { foco: "descanso", intensidade: null }] },
    condicao: { mediaAntes: 82, mediaDepois: 91, jogadores: [
      { id: "a", nome: "Bruno Santos", antes: 70, depois: 85 }, { id: "b", nome: "Lucas Freitas", antes: 90, depois: 84 },
      { id: "c", nome: "Ana Lima", antes: 100, depois: 100 }, { id: "d", nome: "Davi Rocha", antes: 60, depois: 61 },
      { id: "e", nome: "Eli Souza", antes: 50, depois: 60 }, { id: "f", nome: "Fábio Melo", antes: 50, depois: 59 }, { id: "g", nome: "Gil Pires", antes: 50, depois: 58 },
    ] },
    janela: null, salarios: 0, patrocinio: 0, parcelasPagas: 0, parcelasRecebidas: 0, caixa: 32_300_000,
    amistososPerdidos: 0, amistoso: null, ...over,
  };
}

test("Semana concluída: treino resumido por sessões e intensidade mais usada", () => {
  const m = buildWeekDone(summary(), "Flamengo");
  assert.equal(m.title, "A semana avançou.");
  assert.deepEqual(m.training, { sessions: "2 táticos · 1 físico · 1 descanso", intensity: "Moderada", perWeek: false });
});

test("Semana concluída: férias = sem treino; várias semanas = 'por semana' e título no plural", () => {
  assert.equal(buildWeekDone(summary({ treino: null }), "Flamengo").training, null);
  const m = buildWeekDone(summary({ semanas: 3 }), "Flamengo");
  assert.equal(m.title, "As semanas avançaram.");
  assert.match(m.sub, /^3 semanas/);
  assert.equal(m.training?.perWeek, true);
});

test("Condição: média antes → depois e até 5 maiores mudanças (sem as que não mudaram)", () => {
  const c = buildWeekDone(summary(), "Flamengo").condition!;
  assert.equal(c.average, "82% → 91%");
  assert.deepEqual(c.players.map((p) => [p.name, p.text]), [["B. Santos", "+15%"], ["E. Souza", "+10%"], ["F. Melo", "+9%"], ["G. Pires", "+8%"], ["L. Freitas", "−6%"]]);
  assert.ok(!c.players.some((p) => p.id === "c"));
});

test("Prazos: só o que aconteceu; nada → lista vazia; caixa sempre", () => {
  const vazio = buildWeekDone(summary(), "Flamengo");
  assert.deepEqual(vazio.deadlines, []);
  assert.equal(vazio.cash, "R$ 32,3 mi");
  const m = buildWeekDone(summary({ janela: { aberta: false, texto: "Fechada (reabre em julho)" }, salarios: 2_100_000, patrocinio: 500_000, parcelasRecebidas: 1_000_000 }), "Flamengo");
  assert.deepEqual(m.deadlines.map((d) => [d.label, d.value]), [
    ["Janela de transferências", "Fechada (reabre em julho)"], ["Salários pagos", "−R$ 2,1 mi"], ["Patrocínio", "+R$ 500 mil"], ["Parcelas de venda", "+R$ 1 mi"],
  ]);
});

test("Semana do amistoso: placar, lesões e bilheteria; amistosos pulados avisados", () => {
  const m = buildWeekDone(summary({ amistoso: { adversario: "Cuiabá", gh: 2, ga: 1, lesoes: 1, bilheteria: 300_000 } }), "Flamengo");
  assert.deepEqual(m.friendly, { score: "Flamengo 2 × 1 Cuiabá", note: "Não vale pontos · 1 lesão confirmada" });
  assert.ok(m.deadlines.some((d) => d.label === "Bilheteria do amistoso" && d.value === "+R$ 300 mil"));
  assert.equal(buildWeekDone(summary({ amistososPerdidos: 2 }), "Flamengo").skipped, "2 amistosos ficaram sem ser jogados.");
});

function offCareer(friendlies: NonNullable<Career["calendar"]>["friendlies"], idx = 2): Career {
  const weeks: CalendarWeek[] = [
    { d: "01-05", p: "ferias", r: null }, { d: "01-12", p: "pre", r: null }, { d: "01-19", p: "pre", r: null },
    { d: "01-26", p: "pre", r: null }, { d: "02-02", p: "temporada", r: 1 }, { d: "02-09", p: "temporada", r: 2 },
  ];
  return {
    clubId: "fla", clubName: "Flamengo", competitionId: "brasileirao", seasonYear: 2026, currentRound: 1,
    schedule: { 1: [{ home: "fla", away: "cui" }] }, standings: {},
    lineup: { formation: "4-3-3", starters: Array(10).fill("p").concat([null]) },
    calendar: { year: 2026, idx, weeks, friendlies },
    divisionTeams: { brasileirao: [teams.fla, teams.cui], serie_b: [teams.spt, teams.ago] },
  };
}

test("Amistoso da pré-temporada: convites com divisão; sem escolha vai o 1º; formação e titulares", () => {
  const f = buildFriendly(offCareer([{ wi: 2, invites: ["spt", "cui", "ago"], optional: false, opp: null, played: false }]), byId)!;
  assert.equal(f.optional, false);
  assert.equal(f.chosen, "spt");
  assert.equal(f.picked, false);
  assert.deepEqual(f.invites.map((i) => [i.team.name, i.division]), [["Sport", "Série B"], ["Cuiabá", "Série A"], ["Atlético-GO", "Série B"]]);
  assert.equal(f.formation, "4-3-3");
  assert.equal(f.filled, 10);
});

test("Amistoso de julho: opcional, sem escolha não há adversário; escolhido aparece", () => {
  const sem = buildFriendly(offCareer([{ wi: 2, invites: ["spt", "cui"], optional: true, opp: null }]), byId)!;
  assert.equal(sem.chosen, null);
  const com = buildFriendly(offCareer([{ wi: 2, invites: ["spt", "cui"], optional: true, opp: "cui" }]), byId)!;
  assert.equal(com.chosen, "cui");
  assert.equal(com.picked, true);
  assert.equal(buildFriendly(offCareer([{ wi: 2, invites: ["spt"], played: true }]), byId), null);
  assert.equal(buildFriendly(offCareer([]), byId), null);
});

test("Início: amistoso opcional sem convite aceito vira linha; aceito vira o botão principal", () => {
  const h = buildHome(offCareer([{ wi: 2, invites: ["spt", "cui", "ago"], optional: true, opp: null }]), byId);
  assert.deepEqual(h.optionalFriendly, { invites: 3 });
  assert.equal(h.cta.action, "avancar-semana");
  const h2 = buildHome(offCareer([{ wi: 2, invites: ["spt"], optional: true, opp: "spt" }]), byId);
  assert.equal(h2.optionalFriendly, null);
  assert.equal(h2.cta.action, "amistoso");
});

test("Avançar até o próximo jogo: semanas até a do jogo e amistosos que seriam jogados", () => {
  const c = offCareer([{ wi: 1, invites: ["spt"] }, { wi: 2, invites: ["cui"], optional: false }, { wi: 3, invites: ["ago"], optional: true, opp: null }], 1);
  assert.deepEqual(skipInfo(c), { weeks: 3, friendlies: 2 });
  const semana = offCareer([], 3);
  assert.equal(skipInfo(semana), null, "1 semana sem amistoso: o 'Avançar semana' já basta");
  const jogo = offCareer([], 4);
  assert.equal(skipInfo(jogo), null);
});

test("Notícias: elenco (lesionados antes dos suspensos) e manchetes com tipo, rodada e temporada", () => {
  const c = offCareer([]);
  c.squad = [
    { id: "s", name: "Carlos Dias", group: "D", overall: 70, status: "suspenso", outUntilRound: 5 },
    { id: "l", name: "Bruno Santos", group: "F", overall: 75, status: "contundido", outUntilRound: 7 },
    { id: "o", name: "Ok Silva", group: "M", overall: 70, status: "ok" },
  ];
  c.newsFeed = [{ type: "lider", texto: "Flamengo assume a ponta", round: 4, seasonYear: 2026, mine: true }, { texto: "Rodada movimentada", round: 4, seasonYear: 2026 }];
  const n = buildNews(c);
  assert.deepEqual(n.squad.map((s) => s.text), ["B. Santos · lesionado · volta na rodada 7", "C. Dias · suspenso · volta na rodada 5"]);
  assert.deepEqual(n.items.map((i) => [i.title, i.meta, i.mine]), [["Flamengo assume a ponta", "Liderança · Rodada 4 · Temporada 2026", true], ["Rodada movimentada", "Rodada · Rodada 4 · Temporada 2026", false]]);
  assert.equal(n.sub, "2026 · Flamengo · Temporada em andamento");
  assert.equal(buildNews({ ...c, squad: [], newsFeed: [] }).items.length, 0);
});

test("Avisos: não lidos contados; tempo relativo como na versão anterior", () => {
  const now = Date.UTC(2026, 10, 4, 12);
  const c = offCareer([]);
  c.notifications = [{ id: "1", type: "lesao", text: "B. Santos se lesionou", ts: now - 2 * 3600_000, read: false }, { id: "2", type: "proposta", text: "Proposta recebida", ts: now - 30 * 3600_000, read: true }];
  const m = buildNotices(c, now);
  assert.equal(m.unread, 1);
  assert.deepEqual(m.items.map((i) => [i.kind, i.when, i.unread]), [["lesao", "há 2 h", true], ["proposta", "ontem", false]]);
  assert.equal(timeAgo(now, now), "agora");
  assert.equal(timeAgo(now - 5 * 60000, now), "há 5 min");
  assert.equal(timeAgo(now - 4 * 86400_000, now), "há 4 dias");
  assert.equal(buildNotices({ ...c, notifications: undefined }, now).unread, 0);
});
