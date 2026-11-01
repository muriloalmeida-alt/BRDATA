// Testes do domínio do Elenco/Perfil: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProfile, buildSquad, situationOf } from "./squad.ts";
import type { Career, Player } from "./types.ts";

const P = (id: string, group: Player["group"], overall: number, extra: Partial<Player> = {}): Player => ({ id, name: `Nome ${id.toUpperCase()}`, group, overall, status: "ok", origin: "principal", ...extra });

function career(): Career {
  return {
    clubId: "fla", clubName: "Flamengo", seasonYear: 2026, currentRound: 10, schedule: {}, standings: {},
    squad: [
      P("g1", "G", 70), P("d1", "D", 72), P("d2", "D", 75, { status: "contundido", outUntilRound: 12 }),
      P("m1", "M", 80, { wantsTransfer: true }), P("m2", "M", 60, { contractUntil: 2026 }), P("f1", "F", 77, { origin: "loan", contractUntil: 2026 }),
      P("f2", "F", 50), P("b1", "M", 55, { origin: "base" }), P("d3", "D", 65, { status: "suspenso", outUntilRound: 9 }),
    ],
    lineup: { formation: "4-4-2", starters: ["g1", "d1", "f2"], bench: ["d3"] },
  };
}

test("seções Goleiros/Defesa/Meio-campo/Ataque (ordem do legado) e base à parte; emprestado no elenco principal", () => {
  const m = buildSquad(career());
  assert.deepEqual(m.groups.map((g) => g.title), ["Goleiros", "Defesa", "Meio-campo", "Ataque"]);
  assert.deepEqual(m.groups[1].rows.map((r) => r.player.id), ["d2", "d1", "d3"]);
  assert.deepEqual(m.groups[3].rows.map((r) => r.player.id), ["f1", "f2"]);
  assert.deepEqual(m.base.map((r) => r.player.id), ["b1"]);
  assert.equal(m.groups[0].rows[0].short, "N. G1");
});

test("situação: lesão com retorno, pede transferência, fim de contrato, emprestado, titular/reserva/fora", () => {
  const c = career();
  const s = (id: string) => situationOf(c, c.squad!.find((p) => p.id === id)!);
  assert.deepEqual(s("d2"), { text: "Lesionado · volta na rodada 12", tone: "danger" });
  assert.deepEqual(s("m1"), { text: "Pede transferência", tone: "note" });
  assert.deepEqual(s("m2"), { text: "Fim de contrato", tone: "note" });
  assert.deepEqual(s("f1"), { text: "Emprestado", tone: null }); // contrato do emprestado é do clube de origem
  assert.equal(s("g1").text, "Titular");
  assert.equal(s("d3").text, "Reserva"); // suspensão já cumprida (rodada 10 > 9) — como o legado ao abrir
  assert.equal(s("b1").text, "Categoria de base");
  c.lineup!.bench = [];
  assert.equal(s("d3").text, "Fora da lista");
});

test("perfil: dados esportivos sem idade/salário; padrões do legado para condição e moral", () => {
  const c = career();
  Object.assign(c.squad![1], { atk: 40, def: 78, phys: 70, condition: 83.6, apps: 12, goalsSeason: 1, goalsCareer: 4 });
  const pr = buildProfile(c, "d1")!;
  assert.equal(pr.position, "Defesa");
  const f = Object.fromEntries(pr.facts.map((x) => [x.label, x.value]));
  assert.deepEqual(f, { "Posição": "Defesa", "Situação": "Titular", "Overall": "72", "Ataque": "40", "Defesa": "78", "Físico": "70", "Condição": "84%", "Moral": "70", "Jogos": "12", "Gols na temporada": "1", "Gols na carreira": "4" });
  assert.equal(pr.facts.some((x) => /idade|salário|contrato|valor/i.test(x.label)), false);
  assert.equal(buildProfile(c, "zz"), null);
  assert.equal(Object.fromEntries(buildProfile(c, "g1")!.facts.map((x) => [x.label, x.value]))["Condição"], "100%");
});
