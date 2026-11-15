// Testes da prévia do "Ajustar teto salarial": node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { wageCapPreview, type WageCapInfo } from "./wagecap.ts";

const info = (o: Partial<WageCapInfo> = {}): WageCapInfo => ({ teto: 1_350_000, folha: 1_000_000, caixa: 8_100_000, reservado: 0, caixaMinimo: 1_000_000, multiplicador: 12, passo: 1000, maxUp: 591_000, maxDown: 0, ...o });

test("aumentar: novo teto, saída de 12× e caixa depois", () => {
  const p = wageCapPreview(info(), "up", 100);
  assert.deepEqual(p, { ok: true, delta: 100_000, novoTeto: 1_450_000, movimento: -1_200_000, caixaDepois: 6_900_000, why: null });
});
test("aumentar além do limite: motivo com o máximo; sem caixa: motivo próprio", () => {
  assert.match(wageCapPreview(info(), "up", 600).why!, /até R\$ 591 mil por mês/);
  assert.match(wageCapPreview(info({ maxUp: 0 }), "up", 1).why!, /Sem caixa/);
});
test("devolver: volta 12× até o reservado", () => {
  const p = wageCapPreview(info({ reservado: 100_000, maxDown: 100_000, teto: 1_450_000 }), "down", 40);
  assert.equal(p.ok, true); assert.equal(p.novoTeto, 1_410_000); assert.equal(p.movimento, 480_000);
  assert.match(wageCapPreview(info({ reservado: 100_000, maxDown: 100_000 }), "down", 150).why!, /até R\$ 100 mil/);
});
test("devolver sem reservado, ou com o teto encostado na folha: motivos diferentes", () => {
  assert.match(wageCapPreview(info(), "down", 1).why!, /não reservou/);
  assert.match(wageCapPreview(info({ reservado: 50_000, maxDown: 0 }), "down", 1).why!, /abaixo da folha/);
});
test("valor vazio, zero, negativo ou fracionado (fora do passo de R$ 1 mil) é recusado", () => {
  for (const v of [0, -5, NaN, 1.5]) assert.equal(wageCapPreview(info(), "up", v).ok, false);
});
