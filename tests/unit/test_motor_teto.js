// TETO-CAIXA (15/11): o técnico aumenta o teto salarial com o caixa (12×) e
// devolve só o que reservou na temporada (public/js/motor/financas.js).
// Uso: node tests/unit/test_motor_teto.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}

(async () => {
  const F = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "financas.js")).href);
  // Teto 1,35 mi/mês, folha 1 mi/mês, caixa 8,1 mi, nada reservado.
  const base = { wageCap: 1350000, bill: 1000000, cash: 8100000, bought: 0 };

  await check("Aumentar X tira 12·X do caixa e soma X ao teto e ao reservado", () => {
    const r = F.wageCapTrade(base, 100000);
    assert.deepStrictEqual(r, { ok: true, wageCap: 1450000, cash: 6900000, bought: 100000, movimento: -1200000 });
  });
  await check("Limite de aumento: o caixa guarda 1 mês de folha ((8,1 mi − 1 mi) / 12, em passos de R$ 1 mil)", () => {
    const lim = F.wageCapTradeLimits(base);
    assert.strictEqual(lim.maxUp, 591000);
    assert.strictEqual(lim.maxDown, 0);
    assert.ok(F.wageCapTrade(base, 591000).ok);
    const r = F.wageCapTrade(base, 592000);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, "caixa"); assert.strictEqual(r.maxUp, 591000);
  });
  await check("Caixa menor que 1 mês de folha: não dá para aumentar nada", () => {
    const pobre = { ...base, cash: 900000 };
    assert.strictEqual(F.wageCapTradeLimits(pobre).maxUp, 0);
    assert.strictEqual(F.wageCapTrade(pobre, 1000).motivo, "caixa");
  });
  await check("Devolver Y ≤ reservado volta 12·Y; aumentar e devolver o mesmo valor não dá lucro", () => {
    const up = F.wageCapTrade(base, 100000);
    const down = F.wageCapTrade({ ...base, wageCap: up.wageCap, cash: up.cash, bought: up.bought }, -100000);
    assert.deepStrictEqual(down, { ok: true, wageCap: base.wageCap, cash: base.cash, bought: 0, movimento: 1200000 });
  });
  await check("Não devolve mais do que reservou (o aumento da diretoria não conta)", () => {
    const r = F.wageCapTrade({ ...base, bought: 50000 }, -60000);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, "reservado"); assert.strictEqual(r.maxDown, 50000);
  });
  await check("Não devolve a ponto de o teto ficar abaixo da folha", () => {
    const s = { wageCap: 1100000, bill: 1080000, cash: 5000000, bought: 100000 };
    assert.strictEqual(F.wageCapTradeLimits(s).maxDown, 20000);
    const r = F.wageCapTrade(s, -30000);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, "folha");
    assert.ok(F.wageCapTrade(s, -20000).ok);
  });
  await check("Valor inválido (zero, fora do passo de R$ 1 mil, não numérico) é recusado", () => {
    for (const v of [0, 1500, NaN, Infinity]) assert.strictEqual(F.wageCapTrade(base, v).motivo, "valor");
  });
  await check("Save antigo sem reservado (undefined) vale como 0", () => {
    const r = F.wageCapTrade({ wageCap: 1350000, bill: 1000000, cash: 8100000 }, -1000);
    assert.strictEqual(r.motivo, "reservado");
    assert.strictEqual(F.wageCapTrade({ wageCap: 1350000, bill: 1000000, cash: 8100000 }, 1000).bought, 1000);
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
