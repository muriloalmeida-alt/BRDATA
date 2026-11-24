// MUNDO-001, etapa M6b (24/11/2026): a carreira num país do mundo. Cresce a cada
// passo da M6b. Confere:
//   1) M6b-1, divisões do país do save: sem o campo, as 3 do Brasil (todo save
//      de hoje); com `divisoes` gravado, as do país (Inglaterra), e a divisão de
//      um clube na negociação (0 = 1ª, 1 = 2ª) segue o país do save.
// Uso: node tests/unit/test_motor_mundo_carreira.js
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");
globalThis.window = globalThis;

let n = 0, failed = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
const imp = (m) => import(pathToFileURL(path.join(ROOT, "public/js/motor", m)).href);

(async () => {
  const estado = await imp("estado.js");
  const negociacao = await imp("negociacao.js");
  const virada = await imp("virada.js");

  await check("M6b-1: divisões do país do save (Brasil sem o campo; Inglaterra com ele)", () => {
    assert.deepStrictEqual([...estado.divisoesDoPais(null)], ["brasileirao", "serie_b", "serie_c"]);
    assert.deepStrictEqual([...estado.divisoesDoPais({ clubId: 1 })], ["brasileirao", "serie_b", "serie_c"]);
    assert.strictEqual(virada.ALL_COMPETITIONS_ORDER, estado.DIVISOES_BRASIL, "a lista antiga continua a do Brasil");
    // Save brasileiro: um clube da Série B é a divisão 1.
    estado.definirCarreira({ clubId: 1 });
    estado.definirCompeticaoAtual("brasileirao");
    estado.definirLigaAtual([{ id: 1, name: "Meu" }]);
    estado.definirTodosTimes([{ id: 2, name: "B", competitionId: "serie_b" }, { id: 3, name: "C", competitionId: "serie_c" }]);
    assert.strictEqual(negociacao.divisaoDoClube(2), 1);
    assert.strictEqual(negociacao.divisaoDoClube(3), 2);
    // Save do mundo na Inglaterra.
    estado.definirCarreira({ clubId: 10, divisoes: ["premier_league", "efl_championship"] });
    estado.definirCompeticaoAtual("efl_championship");
    estado.definirLigaAtual([{ id: 10, name: "Meu" }]);
    estado.definirTodosTimes([{ id: 20, name: "PL", competitionId: "premier_league" }, { id: 21, name: "EFL", competitionId: "efl_championship" }]);
    assert.deepStrictEqual(estado.divisoesDoPais(), ["premier_league", "efl_championship"]);
    assert.strictEqual(negociacao.divisaoDoClube(10), 1, "o seu clube na Championship");
    assert.strictEqual(negociacao.divisaoDoClube(20), 0, "clube da Premier League");
    assert.strictEqual(negociacao.divisaoDoClube(21), 1, "clube da Championship");
    estado.definirCarreira(null);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
