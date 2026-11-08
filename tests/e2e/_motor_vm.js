// Carrega os módulos do motor (public/js/motor/*.js, ES modules) dentro
// de um `vm` das simulações (sim_*.js), sem `import`/`export`: cada módulo
// vira window.BRDATA_MOTOR.<nome>, e os imports entre módulos leem de lá.
// Uso: const { motorCode } = require("./_motor_vm");
//      vm.runInContext("var window = { BRDATA_MOTOR: {} };\n" + motorCode() + ..., sb);
// Com `rev` (revisão git), lê os módulos daquela revisão; módulo que não
// existe nela fica null (revisões antigas, sem o motor, não o chamam).
// `transform(nome, fonte)` permite ajustar um fonte antes (ex.: calibrar
// uma constante numa simulação).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
// Ordem de dependência (quem importa vem depois).
const ORDER = ["partida", "tabela", "calendario", "rodada", "financas", "treino", "mercado", "temporada", "estado"];

function readModule(name, rev) {
  try {
    return rev
      ? execSync(`git show ${rev}:public/js/motor/${name}.js`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      : fs.readFileSync(path.join(ROOT, `public/js/motor/${name}.js`), "utf8");
  } catch (_) { return null; }
}
function moduleCode(name, src) {
  if (src == null) return `window.BRDATA_MOTOR.${name} = null;\n`;
  const names = [...src.matchAll(/^export (?:async )?(?:function|const|let) (\w+)/gm)].map((m) => m[1]);
  const body = src
    .replace(/^import \{([^}]*)\} from "\.\/(\w+)\.js";$/gm, (_, list, mod) => `const {${list}} = window.BRDATA_MOTOR.${mod};`)
    .replace(/^export /gm, "");
  return `window.BRDATA_MOTOR.${name} = (function () {\n${body}\nreturn { ${names.join(", ")} };\n})();\n`;
}
function motorCode(rev, transform) {
  return ORDER.map((n) => {
    const src = readModule(n, rev);
    return moduleCode(n, src != null && transform ? transform(n, src) : src);
  }).join("");
}
module.exports = { motorCode, ORDER };
