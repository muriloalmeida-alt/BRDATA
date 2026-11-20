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

test("EXPULSAO: a vaga do expulso fica vazia com o nome dele; ele não aparece para sair; a Pausa avisa que o time joga com menos", () => {
  const s = snap();
  const P = (id: string, grupo: "G" | "D" | "M" | "F", extra = {}) => ({ id, nome: `Nome ${id}`, grupo, overall: 70, status: "ok", voltaRodada: null, condicao: 80, ...extra });
  s.escalacao = {
    formacao: "4-3-3",
    titulares: [P("g", "G"), P("d1", "D"), P("d2", "D"), P("d3", "D"), P("d4", "D"), P("m1", "M", { status: "suspenso", voltaRodada: 13, expulso: true }), P("m2", "M"), P("m3", "M"), P("f1", "F"), P("f2", "F"), P("f3", "F")],
    banco: [P("b1", "M")],
  };
  const vaga = buildLiveLineup(s)!.rows.flat().find((x) => x.index === 5)!;
  assert.equal(vaga.player, null);
  assert.equal(vaga.expelled, "N. m1");
  assert.equal(buildLiveLineup(s)!.rows.flat().filter((x) => x.player).length, 10);
  assert.ok(!buildSubs(s)!.starters.some((x) => x.id === "m1"));
  s.paradaPor = [{ tipo: "vermelho", jogador: "Nome m1", minuto: 30 }];
  s.expulsos = { meus: 1, adversario: 0 };
  assert.deepEqual(buildMatch(s)!.stoppage!.lines, ["N. m1 foi expulso (30’)", "Seu time joga com 10, sem reposição"]);
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

test("lances: o jogador do lance vira link (seu → ficha; do adversário → perfil no Mercado); sem id ou substituição, sem link", () => {
  const s = snap();
  s.eventos = [
    ev(10, "gol", true, { jogador: "Bruno Henrique", jogadorId: "real_9" }),
    ev(20, "amarelo", false, { jogador: "Raphael Veiga", jogadorId: "pal_7" }),
    ev(25, "gol", false, { jogador: "Endrick Felipe" }), // sem id: sem link
    ev(30, "substituicao", true, { entra: "Pedro Guilherme", sai: "Bruno Henrique" }),
  ];
  const t = buildMatch(s)!.timeline;
  const by = (min: number) => t.find((x) => x.minute === min)!;
  assert.deepEqual(by(10).player, { label: "B. Henrique", mine: true, href: "/elenco/ficha?id=real_9" });
  assert.deepEqual(by(20).player, { label: "R. Veiga", mine: false, href: "/mercado/alvo?clube=pal&id=pal_7" });
  assert.ok(by(10).title.endsWith(by(10).player!.label) && by(20).title.endsWith(by(20).player!.label));
  assert.equal(by(25).player, undefined);
  assert.equal(by(30).player, undefined);
});

// PAUSA-EVENTO (15/11)
test("Parada automática: uma linha por lance (lesão, expulsão), chave por parada; sem parada, nada", async () => {
  const { stoppageOf } = await import("./match.ts");
  assert.equal(stoppageOf({ fase: "pausada" }), null);
  const s = stoppageOf({ fase: "pausada", paradaPor: [{ tipo: "lesao", jogador: "Gabriel Barbosa", minuto: 30 }, { tipo: "vermelho", jogador: "Bruno Henrique", minuto: 30 }] })!;
  assert.equal(s.lines.length, 2);
  assert.match(s.lines[0], /se lesionou \(30’\)/);
  assert.match(s.lines[1], /foi expulso \(30’\)/);
  const outra = stoppageOf({ fase: "pausada", paradaPor: [{ tipo: "lesao", jogador: "Gabriel Barbosa", minuto: 60 }] })!;
  assert.notEqual(outra.key, s.key);
});

test("PARIDADE-CPU E1b: mudança tática do adversário nos lances (D3)", () => {
  const s = snap();
  s.eventos = [...s.eventos, { ...ev(45, "tatica", false), texto: "parte para o ataque (postura ofensiva)" }];
  const m = buildMatch(s)!;
  const t = m.timeline.find((x) => x.title === "Mudança tática")!;
  assert.equal(t.sub, "Palmeiras parte para o ataque (postura ofensiva)");
  assert.equal(t.minute, 45);
});
