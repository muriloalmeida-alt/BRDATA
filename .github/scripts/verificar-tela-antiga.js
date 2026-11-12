#!/usr/bin/env node
/* A tela antiga da carreira (public/carreira.html, /carreira-old) está
   DESCONTINUADA e congelada desde 09/11 (ver CLAUDE.md, seção 0, e
   tests/e2e/README.md). A carreira oficial é /carreira (a v2) com o motor
   em public/js/motor/.

   Esta checagem impede que testes NOVOS dependam da tela antiga: só os
   testes da lista congelada (tests/e2e/tela_antiga_legado.json, os que já
   existiam em 09/11) podem abri-la. A lista só diminui: quando um deles
   for reescrito pela v2 (_v2_carreira.js) ou sem tela (_sem_tela.js), sai
   da lista.

   Conta como "usa a tela antiga" (tests/e2e/test_*.js e tests/unit):
   - abrir /carreira.html ou /carreira-old;
   - usar os ajudantes que passam por ela (_startup, _round,
     _calendar_skip, _v2_match).
   (A página escondida /carreira/motor saiu na etapa G2d: o endereço leva à
   v2, então pedir por ele não abre mais a tela antiga.)

   Exceção explícita ("soRedirecionamento" na mesma lista): testes que só
   abrem /carreira.html ou /carreira-old com o cabeçalho de produção, para
   conferir que os links antigos levam à v2 (301). Em produção esses
   endereços nunca mostram a tela antiga. Eles continuam proibidos de usar
   os ajudantes antigos.
   Uso: node .github/scripts/verificar-tela-antiga.js */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const LISTA = path.join(ROOT, "tests", "e2e", "tela_antiga_legado.json");
// Uso de verdade (navegar, buscar, entrar no quadro), fora de comentários.
const SINAIS = [
  [/\b(goto|fetch|open)\(\s*[`"'][^`"']*(\/carreira\.html|\/carreira-old)|\b(goto|fetch)\([^)]*\+\s*[`"'](\/carreira\.html|\/carreira-old)/, "abre a tela antiga"],
  [/require\(\s*["']\.\/(_startup|_round|_calendar_skip|_v2_match)["']\s*\)/, "usa ajudante da tela antiga"],
];
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

function arquivosDeTeste() {
  const out = [];
  for (const dir of ["tests/e2e", "tests/unit"]) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) if (/^test_.*\.js$/.test(f)) out.push(path.posix.join(dir, f));
  }
  return out.sort();
}
function motivos(arquivo) {
  const src = semComentarios(fs.readFileSync(path.join(ROOT, arquivo), "utf8"));
  return SINAIS.filter(([re]) => re.test(src)).map(([, m]) => m);
}

if (require.main === module) {
  const lista = JSON.parse(fs.readFileSync(LISTA, "utf8"));
  const permitidos = new Set(lista.testes);
  const soRedir = new Set(lista.soRedirecionamento || []);
  const usam = arquivosDeTeste().map((f) => [f, motivos(f).filter((m) => !(soRedir.has(f) && m === "abre a tela antiga"))]).filter(([, m]) => m.length);
  const novos = usam.filter(([f]) => !permitidos.has(f));
  const naoUsamMais = [...permitidos].filter((f) => !usam.some(([u]) => u === f));
  if (naoUsamMais.length) {
    console.log(`Aviso: ${naoUsamMais.length} teste(s) da lista já não usam a tela antiga (ou não existem mais) — tire-os de tests/e2e/tela_antiga_legado.json:`);
    naoUsamMais.forEach((f) => console.log(`  - ${f}`));
  }
  if (novos.length) {
    console.log("A tela antiga da carreira está descontinuada: teste novo não pode depender dela.");
    novos.forEach(([f, m]) => console.log(`  - ${f}: ${m.join(", ")}`));
    console.log("Use a carreira oficial: tests/e2e/_v2_carreira.js (telas da v2) ou tests/e2e/_sem_tela.js (regra do jogo pela ponte, sem navegador).");
    process.exit(1);
  }
  console.log(`Tela antiga: ${usam.length} teste(s) antigos ainda a usam (lista congelada de ${permitidos.size}); nenhum teste novo depende dela.`);
}

module.exports = { arquivosDeTeste, motivos };
