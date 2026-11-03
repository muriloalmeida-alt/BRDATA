#!/usr/bin/env node
/* Carreira 2.0 — Fase 0: grafo de chamadas de public/js/carreira.js.
   Para cada função de entrada da fatia vertical, calcula o fecho de
   dependências (funções de topo chamadas, transitivamente) e quantas
   delas tocam DOM / rede / persistência / Math.random — o tamanho real
   do "motor" que a v2 precisa extrair sem copiar regras.
   Uso: node tools/inventario/grafo.js [entrada ...] */
const fs = require("fs");
const path = require("path");
const js = fs.readFileSync(path.join(__dirname, "..", "..", "public/js/carreira.js"), "utf8");
const fnRe = /^(?:async )?function ([A-Za-z_]\w*)\(/gm;
const idx = []; let m;
while ((m = fnRe.exec(js))) idx.push({ name: m[1], start: m.index });
const names = new Set(idx.map((f) => f.name));
const info = {};
idx.forEach((f, i) => {
  const body = js.slice(f.start, i + 1 < idx.length ? idx[i + 1].start : js.length);
  const calls = new Set();
  for (const c of body.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) if (names.has(c[1]) && c[1] !== f.name) calls.add(c[1]);
  info[f.name] = {
    calls: [...calls],
    dom: /document\.|\.innerHTML|classList|getElementById|querySelector|requestAnimationFrame|window\./.test(body),
    net: /fetchJSON\(|fetch\(/.test(body), persist: /persistCareer\(/.test(body), random: /Math\.random\(/.test(body),
    lines: body.split("\n").length,
  };
});
function closure(entry) {
  const seen = new Set(); const stack = [entry];
  while (stack.length) { const n = stack.pop(); if (seen.has(n) || !info[n]) continue; seen.add(n); info[n].calls.forEach((c) => stack.push(c)); }
  return [...seen];
}
const entries = process.argv.slice(2).length ? process.argv.slice(2) : [
  "resolveRoundInstant", "simulateRound", "advanceSeason", "autoLineup", "applyWeeklyTraining",
  "computeContractFields", "boardConfidence", "humanFixtures", "startCareer", "migrateCareerDefaults", "goToMatch",
];
const rows = entries.filter((e) => info[e]).map((e) => {
  const c = closure(e);
  const pick = (k) => c.filter((n) => info[n][k]);
  return { entrada: e, funcoes: c.length, linhas: c.reduce((a, n) => a + info[n].lines, 0), dom: pick("dom").length, rede: pick("net").length, persiste: pick("persist").length, random: pick("random").length, exemplosDOM: pick("dom").slice(0, 6) };
});
console.log(JSON.stringify(rows, null, 2));

// Pontos de corte: chamadas de uma função SEM DOM pra uma COM DOM, dentro
// do fecho de uma entrada — onde a lógica "pula" pra interface. Cada um
// vira um evento/porta na extração (GameEnginePort).
if (process.env.CORTES) {
  const out = {};
  for (const e of process.env.CORTES.split(",")) {
    const c = new Set(closure(e));
    const seams = [];
    c.forEach((n) => { if (!info[n].dom) info[n].calls.forEach((t) => { if (info[t] && info[t].dom) seams.push(`${n} → ${t}`); }); });
    out[e] = { cortes: seams.length, alvosUI: [...new Set(seams.map((s) => s.split(" → ")[1]))].sort(), lista: seams.sort() };
  }
  console.log(JSON.stringify(out, null, 2));
}
