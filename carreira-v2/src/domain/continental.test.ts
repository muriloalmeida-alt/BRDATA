// Testes do domínio das copas continentais: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { continentalSummary, defaultCup, defaultPhase, duelOutcome, duelScore, type CCup, type CDuel, type ContinentalView } from "./continental.ts";

const club = (id: string, meu = false) => ({ id, nome: id.toUpperCase(), sigla: null, escudo: null, meu });
const duel = (a: string, b: string, meuA = false, extra: Partial<CDuel> = {}): CDuel => ({ id: `${a}${b}`, a: club(a, meuA), b: club(b), pernas: 2, neutro: false, placares: [], agregado: { a: 2, b: 2 }, vencedor: a, como: "penaltis", ...extra });
const cup = (id: string, meu: boolean): CCup => ({
  id, nome: id, souParticipante: meu, campeao: null,
  fases: [
    { id: "grupos", nome: "Fase de grupos", tipo: "grupos", grupos: [{ grupo: "A", linhas: [{ pos: 1, ...club("x", meu), j: 6, v: 4, e: 1, d: 1, sg: 5, gp: 9, pts: 13 }] }] },
    { id: "oitavas", nome: "Oitavas de final", tipo: "mata", duelos: [duel("y", "z")] },
  ],
});

test("copa e fase iniciais: a do seu clube; a última fase em que ele está", () => {
  const v: ContinentalView = { confederacoes: [{ confed: "CONMEBOL", ano: 2026, rotuloAno: "2026", copas: [cup("LIB", false), cup("SUD", true)], historico: [], pendente: null }] };
  assert.equal(defaultCup(v), "SUD");
  assert.equal(defaultPhase(cup("SUD", true)), "grupos");
  assert.equal(defaultPhase(cup("LIB", false)), "oitavas");
});

test("confronto: agregado e decisão", () => {
  assert.equal(duelScore(duel("a", "b")), "2 × 2");
  assert.equal(duelOutcome(duel("a", "b")), "A nos pênaltis");
  assert.equal(duelOutcome(duel("a", "b", false, { como: "agregado", vencedor: "b" })), "Passa: B");
  assert.equal(duelScore(duel("a", "b", false, { agregado: null })), "— × —");
});

test("resumo na aba Jogos: jogo da semana ou o acesso às chaves", () => {
  assert.equal(continentalSummary({}), null);
  assert.equal(continentalSummary({ copas: { uefa: { edicao: {}, historico: [] } } }), "Grupos, chaves e campeões");
  assert.equal(continentalSummary({ copas: { conmebol: { edicao: {}, pendente: { id: "x", copa: "LIB", nomeCopa: "Libertadores", fase: "grupos", nomeFase: "fase de grupos", grupo: "A", perna: null, pernas: 1, data: "2026-04-08", souMandante: true, neutro: false, adversario: { id: "1", nome: "Bolívar", escudo: null }, ida: null } } } }), "Libertadores: jogo nesta semana contra Bolívar");
});
