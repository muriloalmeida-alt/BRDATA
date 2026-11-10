// Etapa G1c1 do plano "sem página escondida" (10/11): a conta (ME), a fonte de
// dados (LIVE_MODE e LIVE_MODE_BY_COMPETITION), a temporada real (LIVE_SEASON)
// e a herança do técnico (TECHNICIAN_CARRY) saíram de variáveis da página para
// public/js/motor/estado.js. Este teste roda a página INTEIRA num `vm` com a
// tela falsa e confere que a página e o motor veem o mesmo valor nos dois
// sentidos, e que o valor inicial é o de antes.
// Uso: node tests/unit/test_motor_variaveis.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "../..");
const { criarJanela } = require("../e2e/_tela_falsa");
const { motorCode } = require("../e2e/_motor_vm");

let n = 0, failed = 0;
function check(name, fn) {
  n++;
  try { fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}

const { win } = criarJanela({ base: "http://127.0.0.1:9" });
win.fetch = () => Promise.reject(new Error("sem rede"));
win.console = { log() {}, warn() {}, error() {}, info() {} };
const ctx = vm.createContext(win);
const rodar = (c) => vm.runInContext(c, ctx);
rodar("window.BRDATA_MOTOR = {};\n" + motorCode());
rodar(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
rodar(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"));
const E = "window.BRDATA_MOTOR.estado";

check("Valores iniciais iguais aos de antes (ME null, LIVE_MODE false, LIVE_MODE_BY_COMPETITION vazio, LIVE_SEASON o ano atual, TECHNICIAN_CARRY null)", () => {
  assert.deepStrictEqual(JSON.parse(rodar("JSON.stringify([ME, LIVE_MODE, LIVE_MODE_BY_COMPETITION, LIVE_SEASON, TECHNICIAN_CARRY])")),
    [null, false, {}, new Date().getFullYear(), null]);
});
check("O que a página escreve, o motor lê (estado e ambiente)", () => {
  rodar(`ME = { id: 7, name: "Ana", createdAt: 123 }; LIVE_MODE = true; LIVE_SEASON = 2031; TECHNICIAN_CARRY = { reputation: 61, clubHistory: [] }; LIVE_MODE_BY_COMPETITION.serie_b = true;`);
  assert.deepStrictEqual(JSON.parse(rodar(`JSON.stringify([${E}.conta(), ${E}.modoReal(), ${E}.temporadaReal(), ${E}.herancaDoTecnico(), ${E}.modoRealPorCompeticao()])`)),
    [{ id: 7, name: "Ana", createdAt: 123 }, true, 2031, { reputation: 61, clubHistory: [] }, { serie_b: true }]);
  // O ambiente do motor (etapas C a G1b) lê as mesmas variáveis.
  rodar("motorSemana()");
  const amb = JSON.parse(rodar("(() => { const a = window.BRDATA_MOTOR.semana.ambiente; return JSON.stringify([a.contaCriadaEm(), a.temporadaReal(), a.modoReal(), a.herancaDoTecnico(), a.nomeTecnico()]); })()"));
  assert.deepStrictEqual(amb, [123, 2031, true, { reputation: 61, clubHistory: [] }, "Ana"]);
});
check("O que o motor escreve, a página lê (inclusive o mesmo objeto de fonte por competição)", () => {
  rodar(`${E}.definirConta({ id: 9 }); ${E}.definirModoReal(false); ${E}.definirTemporadaReal(2027); ${E}.definirHerancaDoTecnico(null); ${E}.modoRealPorCompeticao().serie_c = false;`);
  assert.deepStrictEqual(JSON.parse(rodar("JSON.stringify([ME, LIVE_MODE, LIVE_SEASON, TECHNICIAN_CARRY, LIVE_MODE_BY_COMPETITION])")),
    [{ id: 9 }, false, 2027, null, { serie_b: true, serie_c: false }]);
  assert.strictEqual(rodar(`LIVE_MODE_BY_COMPETITION === ${E}.modoRealPorCompeticao()`), true);
});
console.log(`\n${n - failed}/${n} ok`);
process.exit(failed ? 1 : 0);
