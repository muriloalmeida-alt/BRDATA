// Coleta de cobertura JS (V8, via Playwright) SEM editar nenhum teste.
// O runner carrega este módulo com `node -r ./_coverage_preload.js
// test_x.js` quando chamado com --coverage (ver run_parallel.js). Ele
// envolve chromium.launch / launchPersistentContext: toda página criada
// passa a coletar cobertura de JavaScript, e ao fechar o browser/contexto
// o resultado (só os scripts do próprio app, servidos por localhost) é
// gravado em _coverage/<teste>-<pid>-<n>.json. A agregação fica em
// _coverage_report.js. Fora do --coverage nada disto é carregado — a rota
// normal não paga o custo da coleta.
const fs = require("fs");
const path = require("path");
const pw = require("playwright-core");

const OUT_DIR = path.join(__dirname, "_coverage");
const testName = path.basename(process.argv[1] || "desconhecido", ".js");
let seq = 0;

function keepEntry(e) {
  return /^http:\/\/localhost:\d+\/.+\.js(\?|$)/.test(e.url);
}
function writeEntries(entries) {
  if (!entries.length) return;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${testName}-${process.pid}-${++seq}.json`);
  // só o necessário pra agregar por função (url + funções/ranges)
  const slim = entries.filter(keepEntry).map((e) => ({ url: e.url.replace(/\?.*$/, ""), sourceLength: (e.source || "").length, functions: e.functions }));
  fs.writeFileSync(file, JSON.stringify({ test: testName, entries: slim }));
}
function instrumentPage(page, bucket) {
  const started = page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false }).catch(() => {});
  bucket.push({ page, started });
}
async function collect(bucket) {
  const all = [];
  for (const { page, started } of bucket) {
    await started;
    try { all.push(...(await page.coverage.stopJSCoverage())); } catch (_) { /* página já fechada: nada a coletar */ }
  }
  bucket.length = 0;
  writeEntries(all);
}
function wrapContextLike(target, bucket) {
  const origNewPage = target.newPage.bind(target);
  target.newPage = async (...args) => {
    const page = await origNewPage(...args);
    instrumentPage(page, bucket);
    return page;
  };
  const origClose = target.close.bind(target);
  target.close = async (...args) => {
    await collect(bucket);
    return origClose(...args);
  };
}

const origLaunch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...args) => {
  const browser = await origLaunch(...args);
  const bucket = [];
  wrapContextLike(browser, bucket);
  const origNewContext = browser.newContext.bind(browser);
  browser.newContext = async (...cargs) => {
    const ctx = await origNewContext(...cargs);
    const origCtxNewPage = ctx.newPage.bind(ctx);
    ctx.newPage = async (...pargs) => {
      const page = await origCtxNewPage(...pargs);
      instrumentPage(page, bucket);
      return page;
    };
    return ctx;
  };
  return browser;
};
const origPersistent = pw.chromium.launchPersistentContext.bind(pw.chromium);
pw.chromium.launchPersistentContext = async (...args) => {
  const ctx = await origPersistent(...args);
  const bucket = [];
  wrapContextLike(ctx, bucket);
  ctx.pages().forEach((p) => instrumentPage(p, bucket));
  return ctx;
};
