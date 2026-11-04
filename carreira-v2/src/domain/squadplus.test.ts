// Testes do elenco avançado (fase 7): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_FILTERS, buildClubRoster, buildCompare, buildContracts, buildFicha, canRenew, canTalk, filterSquad, filtersActive, suggestedWage } from "./squadplus.ts";
import type { Career, Player } from "./types.ts";

const P = (id: string, name: string, group: Player["group"], overall: number, over: Partial<Player> = {}): Player => ({ id, name, group, overall, origin: "principal", status: "ok", age: 25, contractUntil: 2028, wage: 100_000, ...over });
function career(): Career {
  return {
    clubId: "fla", clubName: "Flamengo", competitionId: "brasileirao", seasonYear: 2026, currentRound: 10, schedule: {},
    standings: { fla: { id: "fla", j: 9, v: 6, e: 1, d: 2, gp: 15, gc: 8, sg: 7, pts: 19 }, pal: { id: "pal", j: 9, v: 7, e: 1, d: 1, gp: 18, gc: 6, sg: 12, pts: 22 } },
    squad: [
      P("g1", "Ana Lima", "G", 70), P("d1", "Bruno Dias", "D", 75, { contractUntil: 2026, morale: 80 }), P("m1", "Caio Melo", "M", 80, { benchStreak: 3 }),
      P("f1", "Davi Rocha", "F", 82, { status: "contundido", outUntilRound: 12, age: 30 }), P("b1", "Enzo Base", "M", 60, { origin: "base", age: 17 }),
      P("l1", "Fábio Loan", "F", 74, { origin: "loan", contractUntil: 2026 }), P("s1", "Gil Suspenso", "D", 72, { status: "suspenso", outUntilRound: 11, morale: 25 }),
    ],
    lineup: { formation: "4-3-3", starters: ["g1", "d1", "f1"], bench: ["m1"] },
    pendingListings: [{ playerId: "d1" }],
    leagueSquads: { pal: [P("p1", "Raul Pal", "F", 84), P("p2", "Sol Pal", "G", 77)] },
    divisionTeams: { brasileirao: [{ id: "fla", name: "Flamengo" }, { id: "pal", name: "Palmeiras" }] },
  };
}

test("Regras exibidas (as do jogo): renovar no último ano e não emprestado; conversar insatisfeito e 1x por rodada", () => {
  const c = career();
  const sq = c.squad!;
  assert.equal(canRenew(c, sq[1]), true);
  assert.equal(canRenew(c, sq[0]), false);
  assert.equal(canRenew(c, sq[5]), false, "emprestado");
  assert.equal(canTalk(c, sq[2]), true, "3 jogos no banco");
  assert.equal(canTalk(c, sq[6]), true, "moral ≤ 30");
  assert.equal(canTalk(c, sq[0]), false, "satisfeito");
  assert.equal(canTalk(c, { ...sq[2], lastTalkRound: 10 }), false, "já conversou na rodada");
});

test("Filtros: posição, situação (titular, banco, lesionado, suspenso, à venda), categoria, ordem e busca sem acento", () => {
  const c = career();
  const ids = (f: Partial<typeof NO_FILTERS>) => filterSquad(c, { ...NO_FILTERS, ...f }).map((r) => r.player.id);
  assert.deepEqual(ids({ pos: "F" }), ["f1", "l1"]);
  assert.deepEqual(ids({ sit: "titular" }).sort(), ["d1", "f1", "g1"]);
  assert.deepEqual(ids({ sit: "banco" }), ["m1"]);
  assert.deepEqual(ids({ sit: "lesionado" }), ["f1"]);
  assert.deepEqual(ids({ sit: "suspenso" }), ["s1"]);
  assert.deepEqual(ids({ sit: "venda" }), ["d1"]);
  assert.deepEqual(ids({ cat: "base" }), ["b1"]);
  assert.deepEqual(ids({ sort: "overall" }).slice(0, 2), ["f1", "m1"]);
  assert.deepEqual(ids({ sort: "idade" })[0], "b1");
  assert.deepEqual(ids({ sort: "contrato" }).slice(0, 2).sort(), ["d1", "l1"]);
  assert.deepEqual(ids({ q: "fabio" }), ["l1"]);
  assert.equal(filtersActive({ ...NO_FILTERS, pos: "G", sort: "idade" }), 2);
});

test("Ficha: fatos, contrato, ações conforme a situação (titular, base, emprestado), motivos de renovar/conversar", () => {
  const c = career();
  const f = buildFicha(c, "f1")!;
  assert.deepEqual(f.facts.map((x) => x.label), ["Idade", "Overall", "Potencial", "Moral", "Condição"]);
  assert.deepEqual(f.actions.map((a) => a.id), ["removeStarter", "demote", "release"]);
  assert.equal(f.renew.ok, false);
  assert.match(f.renew.why!, /último ano de contrato \(2028\)/);
  assert.match(f.talk.why!, /satisfeito/);
  assert.deepEqual(buildFicha(c, "b1")!.actions.map((a) => a.id), ["promote", "release"]);
  assert.deepEqual(buildFicha(c, "l1")!.contract, [{ label: "Contrato", value: "Emprestado ao clube" }]);
  assert.deepEqual(buildFicha(c, "l1")!.actions.map((a) => a.id), ["addBench"]);
  assert.equal(buildFicha(c, "d1")!.renew.ok, true);
  assert.equal(buildFicha(c, "d1")!.sale.listed, true);
  assert.equal(buildFicha(c, "x"), null);
});

test("Contratos: sem emprestados; 'Vencendo' só o último ano; salário sugerido = fórmula do jogo", () => {
  const c = career();
  assert.equal(buildContracts(c, false).length, 6);
  assert.deepEqual(buildContracts(c, true).map((x) => x.id), ["d1"]);
  assert.equal(suggestedWage({ ...c.squad![1] }), 115_000); // moral 80: 1,05 + 0,10
  assert.equal(suggestedWage({ ...c.squad![0], morale: 20 }), 100_000); // bônus mínimo −0,05
});

test("Comparar: atributos lado a lado e o veredito de custo-benefício da versão anterior", () => {
  const a = { id: "a", name: "Ana Lima", group: "F" as const, overall: 80, atk: 82, def: 40, phys: 70, age: 25, wage: 160_000, value: 10_000_000 };
  const b = { id: "b", name: "Bia Melo", group: "F" as const, overall: 80, atk: 78, def: 45, phys: 75, age: 28, wage: 80_000, value: 6_000_000 };
  const m = buildCompare(a, b);
  assert.deepEqual(m.rows[0], { label: "Ataque", a: "82", b: "78" });
  assert.match(m.verdict!, /^Melhor custo-benefício: B\. Melo/);
});

test("Elenco de outro clube: série, posição na divisão e jogadores por posição", () => {
  const m = buildClubRoster(career(), "pal", "Palmeiras");
  assert.deepEqual([m.division, m.position], ["Série A", "1º lugar"]);
  assert.deepEqual(m.players.map((p) => p.short), ["S. Pal", "R. Pal"]);
});
