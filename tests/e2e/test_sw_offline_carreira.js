// Pedido do usuário (item 9 da lista de melhorias, "Vamos implementar
// todos na ordem abaixo"): "o service worker (sw.js) só pré-carrega os
// arquivos do site principal (index.html, app.js…); carreira.html/
// carreira.js só entram em cache depois do 1º acesso online. Ajuste
// pequeno pra funcionar offline com mais confiança."
// Valida: o service worker pré-carrega a Carreira (desde a fase 11, a v2
// na raiz, com o JS/CSS do build), carreira.js e manifest-treinador.json
// na INSTALAÇÃO, e a tela abre de verdade offline logo na 1ª visita.
const { chromium } = require("playwright-core");
const { check } = require("./_check");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: "allow" });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  // 1) 1ª visita (só ao SITE DO BRASILEIRÃO, nunca abriu a Carreira) —
  // instala o service worker e espera ele ativar.
  await page.goto(base + "/brasileirao", { waitUntil: "load" });
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  await page.waitForTimeout(500); // dá tempo do "install" (cache.addAll) terminar de verdade

  // 2) Fase 11: a Carreira é a raiz ("/", a v2). O documento, o JS/CSS do
  // build da v2 (lista injetada pelo servidor no sw.js), o motor
  // (carreira.js) e o manifest já estão em cache sem nenhuma visita.
  const v2Html = await (await fetch(base + "/")).text();
  const v2Assets = [...new Set(v2Html.match(/\/carreira\/assets\/[^"]+\.(?:js|css)/g) || [])];
  const cached = await page.evaluate(async (v2Assets) => {
    const keys = await caches.keys();
    const shellKey = keys.find((k) => k.startsWith("brdata-shell-"));
    if (!shellKey) return { error: "cache shell não encontrado", keys };
    const cache = await caches.open(shellKey);
    const paths = ["/", ...v2Assets, "/js/carreira.js", "/manifest-treinador.json", "/img/brand-icon.png"];
    const results = {};
    for (const p of paths) results[p] = !!(await cache.match(p));
    results.carreiraHtml = !!(await cache.match("/carreira.html"));
    return results;
  }, v2Assets);
  const { carreiraHtml, ...must } = cached;
  check("1) a v2 (documento e JS/CSS do build), carreira.js, manifest-treinador.json e brand-icon já em cache sem nunca ter aberto a Carreira; /carreira.html (agora redirecionamento) fora do cache:",
    v2Assets.length >= 2 && Object.values(must).every(Boolean) && carreiraHtml === false, JSON.stringify(cached));

  // 3) Fica OFFLINE de verdade e abre "/" direto (1ª vez) — a v2 tem que
  // carregar do cache e desenhar alguma tela, não só dar erro de rede.
  await context.setOffline(true);
  const resp = await page.goto(base + "/", { waitUntil: "load" }).catch((e) => ({ error: e.message }));
  await page.waitForFunction(() => (document.getElementById("root")?.children.length || 0) > 0, null, { timeout: 10000 }).catch(() => {});
  const offlineLoaded = await page.evaluate(() => ({
    hasRoot: !!document.getElementById("root"),
    rendered: (document.getElementById("root")?.children.length || 0) > 0,
  })).catch((e) => ({ error: e.message }));
  check("2) / (Carreira 2.0) abre OFFLINE na 1ª vez, sem visita online prévia:", !resp?.error && offlineLoaded.hasRoot && offlineLoaded.rendered, JSON.stringify({ respOk: !resp?.error, offlineLoaded }));

  await context.setOffline(false);
  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
