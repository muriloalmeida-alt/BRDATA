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
const ORDER = ["partida", "tabela", "calendario", "rodada", "financas", "treino", "mercado", "temporada", "estado", "eventos", "registro", "texto", "semana"];

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
    .replace(/^import \* as (\w+) from "\.\/(\w+)\.js";$/gm, (_, nome, mod) => `const ${nome} = window.BRDATA_MOTOR.${mod};`)
    .replace(/^export /gm, "");
  return `window.BRDATA_MOTOR.${name} = (function () {\n${body}\nreturn { ${names.join(", ")} };\n})();\n`;
}
function motorCode(rev, transform) {
  return ORDER.map((n) => {
    const src = readModule(n, rev);
    return moduleCode(n, src != null && transform ? transform(n, src) : src);
  }).join("");
}
// Etapa C2 (09/11): a semana sem jogo saiu do carreira.js para
// motor/semana.js (e a formatação para motor/texto.js); no carreira.js ficaram
// atalhos. Para as simulações que recortam funções do carreira.js pelo nome,
// devolve o fonte da página com cada atalho trocado pelo texto de lá, no
// formato da página (CAREER, ALL_TEAMS_FLAT, motorMercado(), toast...).
// Revisão sem semana.js: o fonte como está.
function paginaComoAntes(src, rev) {
  const semana = readModule("semana", rev), texto = readModule("texto", rev);
  if (semana == null) return src;
  const comoPagina = (t) => t.replace(/^export /gm, "").replace(/ *const CAREER = carreiraAtual\(\);\n?/g, "")
    .replace(/\bconst CAREER = carreiraAtual\(\); /g, "")
    .replace(/\btodosTimes\(\)/g, "ALL_TEAMS_FLAT").replace(/\bligaAtual\(\)/g, "LEAGUE_TEAMS")
    .replace(/(^|[^\w./])(financas|mercado|treino|temporada)\./gm, (_, a, m) => `${a}motor${m[0].toUpperCase()}${m.slice(1)}().`)
    .replace(/\bambiente\.primeirosNomes\b/g, "DEMO_FIRST_NAMES").replace(/\bambiente\.sobrenomes\b/g, "DEMO_LAST_NAMES")
    .replace(/\bambiente\.rngDaChave\(/g, "seededRngFromKey(").replace(/\bavisar\(/g, "toast(")
    .replace(/emitir\("coletiva", \{ id: "15", rodada: CAREER\.currentRound \}\);/g, '{ firePressConference("15", CAREER.currentRound, false); openPressConferenceModal(); }');
  const defs = {};
  const blocos = comoPagina(semana + "\n" + (texto || ""));
  for (const m of blocos.matchAll(/^(function (\w+)\(|const (\w+) = )/gm)) {
    const nome = m[2] || m[3];
    // Função: do "{" que fecha a primeira linha ("...) {") até a chave que
    // o fecha. Constante: até o ";" fora de chaves, colchetes e parênteses.
    const i = m.index;
    const linha = blocos.slice(i, blocos.indexOf("\n", i));
    let j0 = m[2] ? i + linha.lastIndexOf(") {") + 2 : i, d = 0, fim = -1;
    for (let j = j0; j < blocos.length; j++) {
      const c = blocos[j];
      if (m[2]) { if (c === "{") d++; else if (c === "}" && --d === 0) { fim = j + 1; break; } continue; }
      if ("{[(".includes(c)) d++; else if ("}])".includes(c)) d--;
      else if (d === 0 && c === ";") { fim = j + 1; break; }
    }
    defs[nome] = blocos.slice(i, fim);
  }
  return src
    .replace(/^(function (\w+)\([^\n]*\) \{\n  (?:\/\/[^\n]*\n  )?return motor(?:Semana|Texto)\(\)\.\w+\([^\n]*\);\n\})/gm, (bloco, _, nome) => defs[nome] || bloco)
    .replace(/^Object\.defineProperty\(window, "(\w+)", \{ configurable: true, get\(\) \{ return motorSemana\(\)\.\w+; \} \}\);$/gm, (linha, nome) => defs[nome] || linha);
}
module.exports = { motorCode, ORDER, paginaComoAntes };
