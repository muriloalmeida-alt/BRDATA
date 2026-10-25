#!/usr/bin/env node
// Agrega a cobertura coletada por _coverage_preload.js (pasta _coverage/)
// por arquivo do app, em 2 métricas (união de todos os testes):
//  - BYTES executados / tamanho do script (métrica principal: não depende
//    de quais funções o V8 chegou a compilar). Cada coleta aplica os
//    ranges do V8 do mais externo pro mais interno (o interno prevalece,
//    mesmo critério do c8/v8-to-istanbul); um byte conta como coberto se
//    alguma coleta o executou.
//  - FUNÇÕES com count > 0 no 1º range (referência secundária).
// Grava _coverage_summary.json e imprime a tabela.
// Uso: node _coverage_report.js [pasta] [saida.json]
const fs = require("fs");
const path = require("path");

const DIR = process.argv[2] || path.join(__dirname, "_coverage");
const OUT = process.argv[3] || path.join(__dirname, "_coverage_summary.json");
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")) : [];
if (!files.length) { console.error(`Nenhum arquivo de cobertura em ${DIR}.`); process.exit(1); }

// url -> Map(chaveDaFunção -> { name, covered, tests:Set })
const byUrl = new Map();
// url -> Uint8Array (1 = byte executado por alguma coleta)
const bytesByUrl = new Map();
function markBytes(rel, e) {
  if (!e.sourceLength) return;
  if (!bytesByUrl.has(rel) || bytesByUrl.get(rel).length !== e.sourceLength) {
    if (!bytesByUrl.has(rel)) bytesByUrl.set(rel, new Uint8Array(e.sourceLength));
  }
  const union = bytesByUrl.get(rel);
  const local = new Uint8Array(e.sourceLength);
  const ranges = e.functions.flatMap((fn) => fn.ranges).sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
  for (const r of ranges) local.fill(r.count > 0 ? 1 : 0, r.startOffset, Math.min(r.endOffset, e.sourceLength));
  for (let i = 0; i < local.length && i < union.length; i++) if (local[i]) union[i] = 1;
}
for (const f of files) {
  const { test, entries } = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  for (const e of entries) {
    const rel = e.url.replace(/^http:\/\/localhost:\d+\//, "");
    markBytes(rel, e);
    if (!byUrl.has(rel)) byUrl.set(rel, new Map());
    const fns = byUrl.get(rel);
    for (const fn of e.functions) {
      const r0 = fn.ranges[0];
      if (!r0) continue;
      const key = `${r0.startOffset}:${r0.endOffset}`;
      if (!fns.has(key)) fns.set(key, { name: fn.functionName || "(anônima)", covered: false, tests: new Set() });
      const rec = fns.get(key);
      if (r0.count > 0) { rec.covered = true; rec.tests.add(test); }
    }
  }
}
const summary = {};
let totF = 0, totC = 0, totB = 0, totBC = 0;
for (const [url, fns] of [...byUrl.entries()].sort()) {
  const total = fns.size;
  const covered = [...fns.values()].filter((r) => r.covered).length;
  totF += total; totC += covered;
  const bytes = bytesByUrl.get(url);
  const bTotal = bytes ? bytes.length : 0, bCovered = bytes ? bytes.reduce((a, v) => a + v, 0) : 0;
  totB += bTotal; totBC += bCovered;
  summary[url] = {
    bytes: bTotal, bytesCovered: bCovered, bytesPct: bTotal ? +(100 * bCovered / bTotal).toFixed(2) : 0,
    functions: total, covered, pct: total ? +(100 * covered / total).toFixed(2) : 0,
    coveredFunctions: [...fns.entries()].filter(([, r]) => r.covered).map(([k, r]) => `${r.name}@${k}`).sort(),
  };
}
summary.__total = { bytes: totB, bytesCovered: totBC, bytesPct: totB ? +(100 * totBC / totB).toFixed(2) : 0, functions: totF, covered: totC, pct: totF ? +(100 * totC / totF).toFixed(2) : 0, files: files.length };
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
console.log("Cobertura JS do app (união de todos os testes) — bytes executados | funções:");
for (const [url, s] of Object.entries(summary)) {
  if (url === "__total") continue;
  console.log(`  ${url.padEnd(36)} bytes ${s.bytesPct.toFixed(2).padStart(6)}%  | funções ${String(s.covered).padStart(5)}/${String(s.functions).padEnd(5)} ${s.pct.toFixed(2)}%`);
}
const t = summary.__total;
console.log(`  ${"TOTAL".padEnd(36)} bytes ${t.bytesPct.toFixed(2).padStart(6)}%  | funções ${String(t.covered).padStart(5)}/${String(t.functions).padEnd(5)} ${t.pct.toFixed(2)}%  (${files.length} coletas)`);
