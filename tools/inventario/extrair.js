#!/usr/bin/env node
/* Carreira 2.0 — Fase 0: extrai do código REAL o inventário usado em
   docs/IMPLEMENTACAO_INVENTARIO_REAL.md (rotas da API, chamadas do
   cliente, campos de CAREER, telas/overlays, funções e efeitos).
   Uso: node tools/inventario/extrair.js > docs/carreira-v2/inventario.json */
const fs = require("fs");
const path = require("path");
const R = (p) => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8");
const server = R("server/server.js");
const js = R("public/js/carreira.js");
const html = R("public/carreira.html");

// 1) Rotas: `pathname === "/api/..." && req.method === "X"` e variações.
const routes = new Map();
for (const m of server.matchAll(/pathname\s*===\s*"(\/api\/[^"]+)"(?:\s*&&\s*req\.method\s*===\s*"([A-Z]+)")?/g)) {
  const k = `${m[2] || "*"} ${m[1]}`; routes.set(k, (routes.get(k) || 0) + 1);
}
for (const m of server.matchAll(/pathname\.startsWith\("(\/api\/[^"]+)"\)/g)) routes.set(`PREFIX ${m[1]}`, 1);
for (const m of server.matchAll(/pathname\.match\(\/\^(\\\/api[^/]*?)\//g)) routes.set(`REGEX ${m[1].replace(/\\\//g, "/")}`, 1);

// 2) Chamadas do cliente (fetchJSON/fetch) e método.
const calls = new Map();
for (const m of js.matchAll(/fetch(?:JSON)?\(\s*[`"](\/api\/[^`"?$]*)[^,)]*(?:,\s*\{\s*method:\s*"([A-Z]+)")?/g)) {
  const k = `${m[2] || "GET"} ${m[1]}`; calls.set(k, (calls.get(k) || 0) + 1);
}

// 3) Campos de CAREER: atribuições CAREER.x = ... e chaves do objeto criado em startCareer.
const fields = new Map();
for (const m of js.matchAll(/CAREER\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g)) fields.set(m[1], (fields.get(m[1]) || 0) + 1);
const migrate = (js.match(/function migrateCareerDefaults\(\)[\s\S]*?\n}\n/) || [""])[0];
const migrated = [...new Set([...migrate.matchAll(/CAREER\.([a-zA-Z_]\w*)\s*(?:===\s*undefined|==\s*null|=)/g)].map((m) => m[1]))];

// 4) Telas: screens, painéis, overlays (com título) e funções open*.
const screens = [...html.matchAll(/id="(screen[A-Za-z]+)"/g)].map((m) => m[1]);
const panels = [...html.matchAll(/class="ct-panel[^"]*" id="panel-([a-z]+)"/g)].map((m) => m[1]);
const overlays = [...html.matchAll(/<div class="ct-modal-overlay([^"]*)" id="([A-Za-z]+)"[\s\S]*?<h3[^>]*>([^<]*)</g)].map((m) => ({ id: m[2], fullscreen: m[1].includes("fullscreen"), title: m[3].trim() }));
const openFns = [...js.matchAll(/^(?:async )?function (open[A-Z]\w*)\(/gm)].map((m) => m[1]);

// 5) Funções: total, que tocam DOM, que persistem, puras candidatas.
const fnRe = /^(async )?function ([A-Za-z_]\w*)\(([^)]*)\)\s*\{/gm;
const idx = []; let m;
while ((m = fnRe.exec(js))) idx.push({ name: m[2], start: m.index, async: !!m[1] });
const fns = idx.map((f, i) => {
  const body = js.slice(f.start, i + 1 < idx.length ? idx[i + 1].start : js.length);
  return {
    name: f.name, lines: body.split("\n").length,
    dom: /document\.|\.innerHTML|classList|getElementById|querySelector/.test(body),
    persist: /persistCareer\(/.test(body) && f.name !== "persistCareer",
    net: /fetchJSON\(|fetch\(/.test(body),
    careerWrite: /CAREER(\.[\w.[\]"']+)?\s*=(?!=)|CAREER\.[\w.]+\.(push|splice|unshift|shift|pop)\(/.test(body),
    random: /Math\.random\(/.test(body),
  };
});
const out = {
  geradoEm: new Date().toISOString(),
  arquivos: { "server/server.js": server.split("\n").length, "public/js/carreira.js": js.split("\n").length, "public/carreira.html": html.split("\n").length },
  rotasServidor: [...routes.keys()].sort(),
  chamadasCliente: [...calls.entries()].sort().map(([k, n]) => ({ chamada: k, ocorrencias: n })),
  camposCareer: [...fields.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ campo: k, referencias: n, migrado: migrated.includes(k) })),
  telas: { screens, panels, overlays, openFns },
  funcoes: {
    total: fns.length,
    tocamDOM: fns.filter((f) => f.dom).length,
    persistem: fns.filter((f) => f.persist).map((f) => f.name),
    usamRede: fns.filter((f) => f.net).map((f) => f.name),
    usamMathRandom: fns.filter((f) => f.random).map((f) => f.name),
    candidatasPuras: fns.filter((f) => !f.dom && !f.net && !f.persist).map((f) => ({ nome: f.name, linhas: f.lines, escreveCareer: f.careerWrite })),
  },
};
process.stdout.write(JSON.stringify(out, null, 2));
