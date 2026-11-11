// Etapa G2c — o motor que a v2 importa como módulo (public/js/motor/) não
// pode depender de variáveis da página antiga (CAREER, LIVE_MATCH, ...): sem
// o quadro escondido, ninguém as define e o comando quebra só quando roda.
// Checagem estática com o compilador do TypeScript: todo nome usado nos
// módulos tem de ser declarado neles, vir do navegador ou do /js/data.js
// (que o hospedeiro carrega antes, ver adapters/hosted.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const pasta = fileURLToPath(new URL("../../../public/js/motor/", import.meta.url));
const dataJs = fileURLToPath(new URL("../../../public/js/data.js", import.meta.url));

// Nomes de topo do data.js (script comum: ficam no escopo global).
function nomesDoDataJs(): Set<string> {
  const sf = ts.createSourceFile("data.js", readFileSync(dataJs, "utf8"), ts.ScriptTarget.ES2022, false, ts.ScriptKind.JS);
  const nomes = new Set<string>();
  for (const st of sf.statements) {
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) { if (ts.isIdentifier(d.name)) nomes.add(d.name.text); }
    else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) nomes.add(st.name.text);
  }
  return nomes;
}

// Nomes usados nos módulos que ninguém declara ("Cannot find name").
export function nomesSoltos(arquivos: string[]): { arquivo: string; linha: number; nome: string }[] {
  const programa = ts.createProgram(arquivos, {
    allowJs: true, checkJs: true, noEmit: true, skipLibCheck: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"], types: [],
  });
  const soltos: { arquivo: string; linha: number; nome: string }[] = [];
  for (const sf of programa.getSourceFiles()) {
    if (!arquivos.includes(sf.fileName)) continue;
    for (const d of programa.getSemanticDiagnostics(sf)) {
      if (d.code !== 2304 && d.code !== 2552) continue; // Cannot find name 'X' (. Did you mean ...)
      const m = /'([^']+)'/.exec(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
      if (!m || d.start == null) continue;
      soltos.push({ arquivo: sf.fileName.slice(pasta.length), linha: sf.getLineAndCharacterOfPosition(d.start).line + 1, nome: m[1] });
    }
  }
  return soltos;
}

test("motor: nenhum módulo usa variável da página (só o que declara, o navegador e o data.js)", () => {
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".js")).map((f) => pasta + f);
  assert.ok(arquivos.length >= 20, "módulos do motor encontrados");
  const doDataJs = nomesDoDataJs();
  assert.ok(doDataJs.has("DEMO_TEAMS") && doDataJs.has("seededRngFromKey"), "nomes do data.js lidos");
  const soltos = nomesSoltos(arquivos).filter((s) => !doDataJs.has(s.nome));
  assert.deepEqual(soltos, []);
});

test("contraprova: a checagem acha uma variável da página num módulo", () => {
  const arquivo = pasta + "carga.js";
  const original = ts.sys.readFile;
  // Mesmo arquivo com um uso de CAREER, a variável da página antiga.
  ts.sys.readFile = (p, enc) => (p === arquivo ? original(p, enc) + "\nexport function x() { return CAREER.clubId; }\n" : original(p, enc));
  try {
    const soltos = nomesSoltos([arquivo]).map((s) => s.nome);
    assert.ok(soltos.includes("CAREER"), JSON.stringify(soltos));
  } finally {
    ts.sys.readFile = original;
  }
});
