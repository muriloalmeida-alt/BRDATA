// Testes da tática e do treino (fase 6): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvolution, dayLine, schemeAxes, schemeMeta, type SchemeItem, type TrainingDay } from "./prep.ts";
import type { Player } from "./types.ts";

const day = (over: Partial<TrainingDay>): TrainingDay => ({ dia: 0, nome: "Segunda", jogo: false, protegido: false, foco: "tecnico", intensidade: "moderada", grupo: "principal", duracao: 60, jogador: null, ...over });

test("Dia do treino: jogo sem edição; folga protegida; sessão com foco, intensidade e duração; individual com o jogador; aviso na folga ocupada", () => {
  assert.deepEqual(dayLine(day({ dia: 5, nome: "Sábado", jogo: true, foco: "jogo" })), { value: "Dia de jogo", editable: false, warn: false });
  assert.deepEqual(dayLine(day({ dia: 4, protegido: true, foco: "descanso", intensidade: null })), { value: "Folga protegida", editable: true, warn: false });
  assert.deepEqual(dayLine(day({ foco: "descanso", intensidade: null })), { value: "Descanso", editable: true, warn: false });
  assert.deepEqual(dayLine(day({})), { value: "Técnico · Moderada · 60 min", editable: true, warn: false });
  assert.equal(dayLine(day({ grupo: "individual", jogador: "p1", foco: "fisico", intensidade: "intensa", duracao: 75 }), [{ id: "p1", nome: "Bruno Santos" }]).value, "Físico · Intensa · 75 min · B. Santos");
  assert.equal(dayLine(day({ protegido: true, foco: "tatico" })).warn, true);
});

test("Esquema salvo: eixos em duas linhas e o resumo de quando foi salvo/usado", () => {
  const s: SchemeItem = { id: "s1", nome: "Retranca", formacao: "5-4-1", titulares: 11, criadoRodada: 4, usadoRodada: 9,
    eixos: [{ id: "ritmo", nome: "Ritmo de jogo", nivel: 2 }, { id: "pressao", nome: "Pressão", nivel: 1 }, { id: "linhaDefensiva", nome: "Linha defensiva", nivel: 1 }, { id: "estiloPasse", nome: "Estilo de passe", nivel: 4 }] };
  assert.deepEqual(schemeAxes(s), ["Ritmo 2 · Pressão 1", "Linha 1 · Passe 4"]);
  assert.equal(schemeMeta(s), "Salvo na rodada 4 · 11/11 titulares · usado na rodada 9");
  assert.equal(schemeMeta({ ...s, usadoRodada: null }), "Salvo na rodada 4 · 11/11 titulares");
});

test("Evolução: fadiga das últimas 8 rodadas (mais recente primeiro), overall por temporada só onde há, potencial e lesões", () => {
  const p: Player = { id: "p1", name: "Bruno Santos", group: "F", overall: 74, potential: 80, condition: 83,
    fatigueHistory: Array.from({ length: 10 }, (_, i) => ({ round: i + 1, fadiga: 10 + i })),
    seasonHistory: [{ year: 2025, overall: 72 }, { year: 2024 }],
    injuryHistory: [{ round: 6, severity: "moderada", durationRounds: 2 }] };
  const m = buildEvolution(p);
  assert.equal(m.name, "B. Santos");
  assert.equal(m.position, "Atacante");
  assert.equal(m.condition, "83%");
  assert.equal(m.fatigue.length, 8);
  assert.deepEqual(m.fatigue[0], { label: "Rodada 10", value: "19% de fadiga" });
  assert.deepEqual(m.seasons, [{ label: "Temporada 2025", value: "Overall 72" }]);
  assert.equal(m.potential, "74 · teto 80");
  assert.deepEqual(m.injuries, [{ label: "Lesão moderada", value: "Rodada 6 · 2 rodadas" }]);
  assert.equal(m.empty, false);
  const novo = buildEvolution({ id: "x", name: "Ana", group: "G", overall: 60 });
  assert.equal(novo.empty, true);
  const pre = buildEvolution({ ...p, fatigueHistory: [{ round: 1, fadiga: 5 }, { round: 1, fadiga: 8 }, { round: 2, fadiga: 20 }] });
  assert.deepEqual(pre.fatigue.map((f) => f.label), ["Rodada 2", "Rodada 1 · semana 2", "Rodada 1 · semana 1"]);
  assert.equal(novo.condition, "100%");
  assert.equal(novo.potential, "60");
});
