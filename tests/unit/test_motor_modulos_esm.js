// Importa cada módulo de public/js/motor/ como ES module de verdade (como o
// navegador faz), para pegar import de um nome que o outro módulo não exporta.
// O carregador dos outros testes (tests/e2e/_motor_vm.js) junta os módulos num
// script só e não confere isso. Uso: node tests/unit/test_motor_modulos_esm.js
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const DIR = path.resolve(__dirname, "../../public/js/motor");
globalThis.window = globalThis;
(async () => {
  const mods = fs.readdirSync(DIR).filter((f) => f.endsWith(".js")).sort();
  let falhas = 0;
  for (const f of mods) {
    try { await import(pathToFileURL(path.join(DIR, f)).href); }
    catch (e) { falhas++; console.log(`${f}: ${e.message}`); }
  }
  console.log(`1) Os ${mods.length} módulos do motor carregam como ES module (imports e exports batem): ${!falhas}`);
  console.log(`\n${falhas ? 0 : 1}/1 ok`);
  process.exit(falhas ? 1 : 0);
})();
