// Testes do domínio da Partida: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLiveLineup, buildMatch, buildResult, buildSubs } from "./match.ts";
import type { MatchSnapshot } from "../adapters/match.ts";

const ev = (minuto: number, tipo: string, meu: boolean, extra = {}) => ({ minuto, tipo, meu, jogador: null, assistencia: null, entra: null, sai: null, penalti: false, ...extra });
function snap(): MatchSnapshot {
  return {
    fase: "jogando", minuto: 45, segundoTempo: false, contexto: "liga", rodada: 12, copa: null,
    mandante: { id: "fla", nome: "Flamengo" }, visitante: { id: "pal", nome: "Palmeiras" }, souMandante: true,
    gh: 1, ga: 0, velocidade: 1, substituicoes: { usadas: 1, total: 5 },
    eventos: [
      ev(15, "chance_perdida", false, { jogador: "Raphael Veiga" }),
      ev(30, "gol", true, { jogador: "Bruno Henrique", assistencia: "Gerson Santos" }),
      ev(45, "var_check", true),
      ev(45, "defesa", false, { jogador: "Endrick Felipe" }),
    ],
  };
}

test("cabeçalho, placar, minuto e tempo", () => {
  const m = buildMatch(snap(), "brasileirao")!;
  assert.equal(m.kicker, "Brasileirão Série A · Rodada 12");
  assert.equal(m.minute, "45’");
  assert.equal(m.period, "1º tempo");
  assert.equal(`${m.gh}-${m.ga}`, "1-0");
  const s = snap(); s.fase = "intervalo"; assert.equal(buildMatch(s)!.period, "Intervalo");
  s.fase = "jogando"; s.minuto = 60; s.segundoTempo = true; assert.equal(buildMatch(s)!.period, "2º tempo");
  s.contexto = "copa"; s.copa = { fase: "r16", perna: 2 }; assert.equal(buildMatch(s)!.kicker, "Copa do Brasil · Oitavas de final · Volta");
});

test("último evento ignora lances menores (VAR, defesa, chance) e descreve o gol", () => {
  const m = buildMatch(snap())!;
  assert.deepEqual(m.last, { minute: 30, goal: true, mine: true, title: "Gol do Flamengo", sub: "B. Henrique" });
});

test("lances: mais recente primeiro, rótulos fixos, termina em 'Início da partida'", () => {
  const m = buildMatch(snap())!;
  assert.deepEqual(m.timeline.map((t) => [t.minute, t.title, t.sub, t.kind]), [
    [45, "Finalização defendida · E. Felipe", "Palmeiras", "neutro"],
    [45, "Revisão do VAR", "Flamengo", "neutro"],
    [30, "Gol · B. Henrique", "Flamengo · assistência de G. Santos", "gol-meu"],
    [15, "Chance perdida · R. Veiga", "Palmeiras", "neutro"],
    [0, "Início da partida", "Flamengo × Palmeiras", "inicio"],
  ]);
});

test("no mesmo minuto, o gol vem antes do cartão (último evento e lances)", () => {
  const s = snap();
  s.eventos = [ev(15, "gol", true, { jogador: "Bruno Henrique" }), ev(15, "chance_perdida", false, { jogador: "A B" }), ev(15, "amarelo", true, { jogador: "C D" })];
  const m = buildMatch(s)!;
  assert.equal(m.last!.title, "Gol do Flamengo");
  assert.deepEqual(m.timeline.map((t) => t.title), ["Gol · B. Henrique", "Cartão amarelo · C. D", "Chance perdida · A. B", "Início da partida"]);
});

test("sem lance importante ainda; sem partida", () => {
  const s = snap(); s.eventos = [ev(15, "chance_perdida", true, { jogador: "A B" })];
  assert.equal(buildMatch(s)!.last, null);
  assert.equal(buildMatch({ fase: "sem-partida" }), null);
});

test("Revisar time: escalação ao vivo da ponte no campo da Escalação (formação e titulares atuais)", () => {
  const s = snap();
  const P = (id: string, grupo: "G" | "D" | "M" | "F", status = "ok") => ({ id, nome: `Nome ${id}`, grupo, overall: 70, status, voltaRodada: status === "ok" ? null : 20, condicao: 80 });
  s.escalacao = {
    formacao: "4-3-3",
    titulares: [P("g", "G"), P("d1", "D"), P("d2", "D"), P("d3", "D"), P("d4", "D", "contundido"), P("m1", "M"), P("m2", "M"), null, P("f1", "F"), P("f2", "F"), P("f3", "F")],
    banco: [P("b1", "M")],
  };
  const l = buildLiveLineup(s)!;
  assert.equal(l.formation, "4-3-3");
  assert.equal(l.rows.flat().length, 11);
  assert.equal(l.rows.flat().find((x) => x.index === 4)!.out, "Lesionado");
  assert.equal(l.rows.flat().find((x) => x.index === 7)!.player, null);
  assert.deepEqual(l.bench.map((b) => b.player.id), ["b1"]);
  assert.equal(buildLiveLineup({ fase: "jogando" }), null);
});

test("substituição: sai = titulares em campo; entra = só reservas com status ok; limite real", () => {
  const s = snap();
  const P = (id: string, status = "ok") => ({ id, nome: `Nome ${id}`, grupo: "M" as const, overall: 70, status, voltaRodada: null, condicao: 61 });
  s.escalacao = { formacao: "4-4-2", titulares: [P("a"), null, P("c", "contundido")], banco: [P("r1"), P("r2", "suspenso"), P("r3")] };
  s.substituicoes = { usadas: 4, total: 6 };
  const m = buildSubs(s)!;
  assert.deepEqual(m.starters.map((x) => x.id), ["a", "c"]);
  assert.deepEqual(m.bench.map((x) => x.id), ["r1", "r3"]);
  assert.deepEqual([m.used, m.total, m.left], [4, 6, 2]);
  assert.equal(m.starters[0].short, "N. a");
});

test("resultado: título e frase pelo placar (pontos só na liga) e gols em ordem de minuto", () => {
  const s = snap(); s.fase = "encerrada"; s.gh = 2; s.ga = 1;
  s.eventos = [ev(60, "gol", false, { jogador: "Endrick Felipe" }), ev(30, "gol", true, { jogador: "Bruno Henrique" }), ev(75, "gol", true, { jogador: "Gerson Santos", penalti: true })];
  const r = buildResult(s, "Brasileirão Série A")!;
  assert.equal(r.title, "Vitória do Flamengo.");
  assert.equal(r.line, "O Flamengo venceu o Palmeiras e somou três pontos no Brasileirão Série A.");
  assert.deepEqual(r.goals.map((g) => [g.minute, g.scorer, g.team, g.mine, g.penalty]), [[30, "B. Henrique", "Flamengo", true, false], [60, "E. Felipe", "Palmeiras", false, false], [75, "G. Santos", "Flamengo", true, true]]);
  s.souMandante = false; // agora o "meu" time é o Palmeiras (visitante), placar 2-1 para o mandante
  assert.equal(buildResult(s, "x")!.title, "Derrota do Palmeiras.");
  s.ga = 2; assert.equal(buildResult(s, "x")!.line, "Palmeiras e Flamengo empataram: um ponto para cada lado.");
  s.contexto = "copa"; assert.equal(buildResult(s, "x")!.line, "Palmeiras e Flamengo empataram.");
});
