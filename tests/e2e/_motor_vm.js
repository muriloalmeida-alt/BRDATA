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
const ORDER = ["partida", "tabela", "calendario", "rodada", "financas", "treino", "mercado", "temporada", "estado", "eventos", "registro", "texto", "semana", "fechamento", "aovivo", "posjogo", "clube", "virada", "ponte"];

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
// `so` (opcional): só os módulos listados voltam para a página (ex.: ["virada"]
// remonta a página de antes da etapa F, para os testes das etapas anteriores).
function paginaComoAntes(src, rev, so) {
  const ler = (m) => (so && !so.includes(m) ? "" : readModule(m, rev));
  const semana = ler("semana"), texto = ler("texto"), fechamento = ler("fechamento"), aovivo = ler("aovivo"), posjogo = ler("posjogo"), clube = ler("clube"), virada = ler("virada"), ponte = ler("ponte");
  if (semana == null || (so && !so.length)) return src;
  const comoPagina = (t) => t.replace(/^export /gm, "").replace(/ *const CAREER = carreiraAtual\(\);\n?/g, "")
    .replace(/\bconst CAREER = carreiraAtual\(\); /g, "")
    .replace(/\btodosTimes\(\)/g, "ALL_TEAMS_FLAT").replace(/\bligaAtual\(\)/g, "LEAGUE_TEAMS")
    .replace(/(^|[^\w./]|\.\.\.)rodada\.(?=[A-Za-z_])/gm, (_, a) => `${a}motorModulo("rodada").`)
    .replace(/(^|[^\w./]|\.\.\.)(financas|mercado|treino|temporada|partida|tabela|registro)\.(?=[A-Za-z_])/gm, (_, a, m) => `${a}motor${m[0].toUpperCase()}${m.slice(1)}().`)
    .replace(/\bambiente\.primeirosNomes\b/g, "DEMO_FIRST_NAMES").replace(/\bambiente\.sobrenomes\b/g, "DEMO_LAST_NAMES")
    .replace(/\bambiente\.rngDaChave\(/g, "seededRngFromKey(").replace(/\bavisar\(/g, "toast(")
    // etapa F: o mundo (estado.js) e o que vem da página pelo ambiente
    .replace(/\bdefinirCompeticaoAtual\(([^;\n]+)\);/g, "CURRENT_COMPETITION_ID = $1;").replace(/\bdefinirLigaAtual\(([^;\n]+)\);/g, "LEAGUE_TEAMS = $1;")
    .replace(/\bdefinirTodosTimes\(([^;\n]+)\);/g, "ALL_TEAMS_FLAT = $1;").replace(/\bcompeticaoAtual\(\)/g, "CURRENT_COMPETITION_ID")
    .replace(/\bambiente\.timesSerieD\(\)/g, "DEMO_TEAMS_SERIE_D").replace(/\bambiente\.temporadaReal\(\)/g, "LIVE_SEASON")
    .replace(/\bambiente\.buscarJogadores\(/g, "fetchRealPlayers(").replace(/\benvJogador\(\)/g, "playerBuildEnv()")
    .replace(/\bambiente\.contaCriadaEm\(\)/g, "ME && ME.createdAt")
    // etapa G1a: estado da partida e da coletiva, o da ponte e o que vem da página
    .replace(/\bpartidaAtual\(\)/g, "LIVE_MATCH").replace(/\bcoletivaPendente\(\)/g, "PENDING_PRESS")
    .replace(/(^|[^\w.])ponte\./gm, "$1PONTE.").replace(/\bambiente\.gravar\(\)/g, "ponteGravar()")
    .replace(/\bambiente\.somLigado\(\)/g, "SFX_ENABLED").replace(/\bambiente\.nomeTecnico\(\)/g, "(ME && ME.name)")
    .replace(/(^|[^\w./]|\.\.\.)(estado|calendario)\.(?=[A-Za-z_])/gm, (_, a, m) => m === "estado" ? `${a}motorEstado().` : `${a}motorModulo("calendario").`)
    .replace(/tela\("fecharOverlay", "(\w+)"\);/g, 'document.getElementById("$1").classList.remove("open");')
    .replace(/tela\("(\w+)"\)/g, "$1()").replace(/tela\("(\w+)", /g, "$1(")
    .replace(/emitir\("coletiva", \{ id: "15", rodada: CAREER\.currentRound \}\);/g, '{ firePressConference("15", CAREER.currentRound, false); openPressConferenceModal(); }');
  const defs = {};
  // Só o que o módulo exporta volta para a página (os atalhos locais do
  // cabeçalho de cada módulo, como myLeaguePosition, não substituem nada).
  const crus = [semana, texto, fechamento, aovivo, posjogo, clube, virada, ponte].map((t) => t || "").join("\n");
  const exportados = new Set([...crus.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map((m) => m[1]));
  const blocos = comoPagina(semana + "\n" + (texto || "") + "\n" + (fechamento || "") + "\n" + (aovivo || "") + "\n" + (posjogo || "") + "\n" + (clube || "") + "\n" + (virada || "") + "\n" + (ponte || ""));
  for (const m of blocos.matchAll(/^((?:async )?function (\w+)\(|const (\w+) = )/gm)) {
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
    .replace(/^((?:async )?function (\w+)\([^\n]*\) \{\n  (?:\/\/[^\n]*\n  )?return motor(?:Semana|Texto|Fechamento|AoVivo|PosJogo|Clube|Virada|Ponte)\(\)\.\w+\([^\n]*\);\n\})/gm, (bloco, _, nome) => (exportados.has(nome) && defs[nome]) || bloco)
    .replace(/^Object\.defineProperty\(window, "(\w+)", \{ configurable: true, get\(\) \{ return motor(?:Semana|Fechamento|AoVivo|PosJogo|Clube|Virada|Ponte)\(\)\.\w+; \} \}\);$/gm, (linha, nome) => (exportados.has(nome) && defs[nome]) || linha);
}
module.exports = { motorCode, ORDER, paginaComoAntes };
