// Fase B do motor de testes — veredito honesto.
// Até aqui os testes imprimiam cada verificação com
// `console.log("N) descrição:", condição, detalhes...)` e só saíam com
// código ≠ 0 em EXCEÇÃO: uma verificação impressa como `false` passava
// batido e o runner marcava PASS (16 verificações false em 13 testes
// "aprovados" na medição de 25/10/2026 — ver docs/MOTOR_TESTES_FASE_B.md).
//
// check() imprime exatamente a mesma linha e, se a condição (2º
// argumento) for `false` — ou `undefined`/`null`, o que sobra de uma
// expressão como `o && o.status === "x"` quando `o` não existe —, marca
// o processo para sair com código 1 e lista as verificações que falharam
// no fim. Valores de diagnóstico (números, textos, JSON) só são
// impressos, como antes.
const failed = [];

function check(label, ...rest) {
  // Só o rótulo (sem veredito): é aviso de passo pulado, não verificação
  // — imprime como antes e não conta (ex.: "checagem pulada").
  if (rest.length === 0) { console.log(label); return undefined; }
  const [verdict, ...details] = rest;
  console.log(label, verdict, ...details);
  if (verdict === false || verdict === undefined || verdict === null) {
    failed.push(String(label).replace(/:\s*$/, ""));
    process.exitCode = 1;
  }
  return verdict;
}

process.on("exit", (code) => {
  if (!failed.length) return;
  console.log(`\n${failed.length} verificação(ões) falharam:`);
  failed.forEach((l) => console.log(`  - ${l}`));
  if (code === 0) process.exitCode = 1;
});

module.exports = { check };
