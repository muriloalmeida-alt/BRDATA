// Testes do domínio de Finanças: node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFinance } from "./finance.ts";
import type { Career, Player } from "./types.ts";

const P = (id: string, origin: string, wage: number): Player => ({ id, name: id, group: "M", overall: 60, origin, wage });
function career(): Career {
  return {
    clubId: "me", clubName: "Eu", seasonYear: 2026, currentRound: 5, schedule: {}, standings: {},
    finances: { cash: 12_400_000, wageCap: 5_000_000 },
    squad: [P("a", "principal", 2_000_000), P("b", "loan", 1_100_000), P("c", "base", 900_000)],
    financeLedger: [{ round: 4, type: "salario", label: "Salários", amount: -310_000 }, { round: 4, type: "bilheteria", label: "Bilheteria", amount: 1_250_000 }, { round: 3, type: "tv", label: "Cota de TV", amount: 800 }],
  };
}

test("saldo curto como no legado; folha = principal + emprestados (base fora) × teto", () => {
  const f = buildFinance(career());
  assert.equal(f.cashText, "R$ 12,4 mi");
  assert.equal(f.negative, false);
  assert.deepEqual(f.wage, { bill: "R$ 3,1 mi", cap: "R$ 5 mi", over: false });
});

test("saldo negativo e folha acima do teto", () => {
  const c = career(); c.finances = { cash: -450_000, wageCap: 3_000_000 };
  const f = buildFinance(c);
  assert.equal(f.cashText, "-R$ 450 mil");
  assert.equal(f.negative, true);
  assert.equal(f.wage.over, true);
});

test("extrato na ordem gravada (mais recente primeiro) com sinal", () => {
  const f = buildFinance(career());
  assert.deepEqual(f.ledger.map((l) => [l.round, l.label, l.text]), [[4, "Salários", "−R$ 310 mil"], [4, "Bilheteria", "+R$ 1,3 mi"], [3, "Cota de TV", "+R$ 800"]]);
  const c = career(); delete c.financeLedger; delete c.finances;
  assert.deepEqual(buildFinance(c).ledger, []);
  assert.equal(buildFinance(c).wage.cap, null);
});
