// Resumo em Markdown de tests/e2e/_last_parallel_run.json pro
// $GITHUB_STEP_SUMMARY: contagens, testes que falharam (com as
// verificações que falharam, quando houver) e o que não rodou.
// Uso (de dentro de tests/e2e): node ../../.github/scripts/resumo-testes.js "Título"
const fs = require("fs");
const titulo = process.argv[2] || "Testes";
let run;
try { run = JSON.parse(fs.readFileSync("_last_parallel_run.json", "utf8")); }
catch (_) { console.log(`### ${titulo}\n\nSem resultado: o runner não chegou a gravar \`_last_parallel_run.json\` (ver o log do passo anterior).`); process.exit(0); }
const { meta, results } = run;
const falhas = results.filter((r) => r.code !== 0).sort((a, b) => a.file.localeCompare(b.file));
const linhas = [`### ${titulo}`, "",
  `**${meta.passed}/${results.length} passaram**, ${meta.failed} falharam${meta.timedOut.length ? ` (${meta.timedOut.length} por timeout)` : ""}; não executados: ${meta.notRun}; retries: 0 — ${(meta.totalMs / 1000).toFixed(1)} s, concorrência ${meta.concurrency}, commit \`${String(meta.commit).slice(0, 7)}\`.`, ""];
if (falhas.length) {
  linhas.push("| Teste | Resultado | Verificações que falharam / erro |", "|---|---|---|");
  for (const r of falhas) {
    const checks = r.out.split("\n").filter((l) => l.startsWith("  - ")).map((l) => l.slice(4).trim());
    const erro = (r.out.match(/(FATAL:[^\n]*|Error:[^\n]*)/) || [])[1] || "";
    const motivo = (checks.length ? checks.join("<br>") : erro).replace(/\|/g, "\\|").slice(0, 400);
    linhas.push(`| \`${r.file}\` | ${r.timedOut ? `TIMEOUT ${r.timeoutMs / 1000}s` : `FAIL(${r.code})`} | ${motivo} |`);
  }
  linhas.push("", "Log completo de cada falha: artefato do job (`_artifacts/<teste>.log`).");
}
console.log(linhas.join("\n"));
