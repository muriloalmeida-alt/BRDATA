// Testes do domínio da Partida: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLiveLineup, buildMatch } from "./match.ts";
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
