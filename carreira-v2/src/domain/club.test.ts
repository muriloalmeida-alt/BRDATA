// Testes do clube (fase 9): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseCategoryOf, baseCounts, baseList, buildLedger, buildProspects, buildSuggestions, ledgerFilters, potText, scoutStatus } from "./club.ts";
import type { Career, Player } from "./types.ts";

const P = (id: string, age: number, over: Partial<Player> = {}): Player => ({ id, name: `Jovem ${id}`, group: "M", overall: 50, origin: "base", age, potential: 75, ...over });
function career(): Career {
  return {
    clubId: "fla", clubName: "Flamengo", seasonYear: 2026, currentRound: 5, schedule: {}, standings: {},
    finances: { cash: -1_500_000 },
    financeLedger: [
      { round: 5, type: "salario", label: "Folha", amount: -2_000_000 }, { round: 5, type: "bilheteria", label: "Jogo em casa", amount: 800_000 },
      { round: 4, type: "estadio", label: "Obra iniciada", amount: -900_000 }, { round: 4, type: "tv", label: "Cota", amount: 1_000_000 },
    ],
    squad: [P("a", 15), P("b", 16, { overall: 60 }), P("c", 17), P("d", 19), P("e", 25, { origin: "principal" })],
    scouts: [{ id: "s1", marketId: "r_moura", name: "R. Moura", specialty: "Especialista em Norte", monthlyCost: 6000, mission: null },
      { id: "s2", marketId: "a_lima", name: "A. Lima", specialty: "Generalista nacional", monthlyCost: 10000, mission: { regionUf: "sul", roundsLeft: 1, type: "pro" } }],
    scoutMissionProspects: [{ id: "pp", name: "Kauã Souza", group: "F", age: 16, overall: 40, atk: 45, def: 30, phys: 60, potential: 80, potRange: { lo: 76, hi: 82 }, foundRegion: "norte", scoutName: "R. Moura", scoutNote: "Promissor.", report: { recommendation: "Promover já", strength: "físico", weakness: "defesa" } }],
    scoutSuggestions: [{ id: "sg", playerId: "x", playerName: "Ítalo Reis", clubId: "pal", clubName: "Palmeiras", subpos: "VOL", overall: 74, age: 21, value: 3_000_000, potLo: 80, potHi: 80 }],
  };
}

test("Extrato: filtros do jogo (fixos + tipos presentes), agrupado por rodada, sinais e saldo negativo", () => {
  const c = career();
  assert.deepEqual(ledgerFilters(c).map((f) => f.id), ["todos", "salario", "transferencia", "patrocinio", "bilheteria", "tv", "estadio"]);
  const all = buildLedger(c, "todos");
  assert.equal(all.negative, true);
  assert.deepEqual(all.groups.map((g) => [g.round, g.items.length]), [[5, 2], [4, 2]]);
  assert.deepEqual(all.groups[0].items[0], { type: "Salários", label: "Folha", text: "−R$ 2 mi", tone: "neg" });
  assert.deepEqual(buildLedger(c, "estadio").groups.map((g) => g.round), [4]);
  assert.equal(buildLedger(c, "patrocinio").empty, true);
});

test("Base: categorias pela idade (Sub-15 até 15, Sub-17 até 17, Sub-20), só a base, ordem do elenco", () => {
  const c = career();
  assert.deepEqual([15, 16, 17, 18].map((a) => baseCategoryOf(P("z", a))), ["sub15", "sub17", "sub17", "sub20"]);
  assert.deepEqual(baseCounts(c), { sub15: 1, sub17: 2, sub20: 1 });
  assert.deepEqual(baseList(c, "sub17").map((p) => p.id), ["b", "c"]);
});

test("Olheiros: situação (livre/missão), relatórios com faixa de potencial e indicações", () => {
  const c = career();
  assert.deepEqual(scoutStatus(c.scouts![0]), { free: true, text: "Livre · Especialista em Norte" });
  assert.equal(scoutStatus(c.scouts![1]).text, "Missão Profissional (Mercado) em Sul · volta em 1 rodada");
  const p = buildProspects(c)[0];
  assert.equal(p.potential, "76–82");
  assert.equal(p.report, "Promover já: forte em físico, precisa evoluir em defesa.");
  assert.deepEqual(p.attrs.map((a) => a.value), ["45", "60", "30"]);
  const s = buildSuggestions(c)[0];
  assert.equal(s.potential, "80");
  assert.equal(s.meta, "VOL · overall 74 · 21 anos");
  assert.equal(potText(null, null), "—");
});
