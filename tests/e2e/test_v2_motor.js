// Carreira 2.0 — plano de independência, fase 1: motor aberto uma vez e
// reaproveitado entre telas. Desde a etapa G2c do plano "sem página
// escondida", o motor é módulo na própria página da v2 (sem quadro): o
// "mesmo motor" é a mesma carreira na memória do motor (marca não
// enumerável, que some se a carreira for recarregada).
//  1) A v2 abre o motor pelo /js/motor/v2.js e não aponta para /carreira-old;
//     /carreira/motor ainda responde (só com ?motor=quadro, até a G2d).
//  2) Pré-carga: com o Início aberto, o motor abre sozinho, sem quadro, e NÃO
//     grava o save ao abrir.
//  3) Reaproveitamento: sem mudança no save, a partida usa o MESMO motor
//     pré-carregado, que segue aberto e escondido depois do pós-jogo.
//  4) Save atualizado: a v2 troca a formação com o motor já aberto; ao
//     iniciar a partida, o motor é recarregado e o resultado gravado mantém a
//     formação nova (sem sobrescrever com o save antigo).
//  5) Depois do pós-jogo, abrir /partida não reapresenta a partida
//     encerrada ("Nenhuma partida em andamento"); continua um motor só.
//  Toda navegação é DENTRO da v2 (sem recarregar a página).
//  6) Tempo de abertura do motor (medida, para o relatório).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer, continueToHome, motorNaPagina } = require("./_v2_match");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2motor${Date.now()}@teste.com`);
  await page.goto("about:blank");

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const puts = [];
  let motorPedido = false;
  v2.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (r.method() === "PUT" && path === "/api/career") puts.push(Date.now());
    if (path === "/js/motor/v2.js") motorPedido = true;
  });

  // 1) Rota do motor e bundle da v2.
  await v2.goto("http://localhost:8787/privacidade.html", { waitUntil: "domcontentloaded" });
  const r1 = await v2.evaluate(async () => {
    const html = await (await fetch("/carreira/motor", { cache: "no-store" })).text();
    const v2html = await (await fetch("/", { cache: "no-store" })).text();
    const js = v2html.match(/\/carreira\/assets\/[^"]+\.js/)[0];
    const bundle = await (await fetch(js, { cache: "no-store" })).text();
    return { base: /<head>\s*<base href="\/">/.test(html), legacy: html.includes("ctLoginForm"), noindex: html.includes("noindex"),
      bundleModulo: bundle.includes("/js/motor/v2.js") && bundle.includes("/js/data.js"), bundlePonteOld: bundle.includes("/carreira-old?ponte") };
  });
  check("1) A v2 abre o motor pelo /js/motor/v2.js (com o data.js), não por /carreira-old; /carreira/motor ainda responde (até a G2d):",
    r1.base && r1.legacy && r1.noindex && r1.bundleModulo && !r1.bundlePonteOld, JSON.stringify(r1));

  // 2) Pré-carga no Início, escondida e sem gravar.
  const t0 = Date.now();
  await v2.goto("http://localhost:8787/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  // Pronto = a v2 já pediu o hospedeiro e o motor tem a carreira carregada.
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    ready = motorPedido && await v2.evaluate(async () => {
      if (typeof DEMO_FIRST_NAMES === "undefined") return false; // data.js ainda não carregou
      const e = await import("/js/motor/estado.js");
      return !!e.carreiraAtual();
    }).catch(() => false);
    if (!ready) await v2.waitForTimeout(250);
  }
  const loadMs = Date.now() - t0;
  await motorNaPagina(v2);
  const pre = await v2.evaluate(() => ({ count: document.querySelectorAll("iframe").length, fase: __motor.ponte.estado().fase }));
  check("2) Com o Início aberto, o motor pré-carrega sozinho, sem quadro, e não grava o save ao abrir:",
    ready && pre.count === 0 && pre.fase !== "carregando" && puts.length === 0, JSON.stringify({ ready, pre, puts: puts.length, loadMs }));
  // Marca a carreira em memória: se o motor recarregar, a marca some.
  const marcar = (m) => v2.evaluate((m) => { Object.defineProperty(__motor.estado.carreiraAtual(), "__marca", { value: m, configurable: true }); }, m);
  await marcar("pre");
  // Navegação DENTRO da v2 (sem recarregar a página, que recriaria tudo).
  const go = (path) => v2.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new Event("bd:navigate")); }, path);
  const frameInfo = () => v2.evaluate(() => ({ count: document.querySelectorAll("iframe").length, marca: (__motor.estado.carreiraAtual() || {}).__marca || null, shown: 0 }));

  // 3) Sem mudança no save: a partida usa o MESMO motor pré-carregado.
  const before = await serverCareer(v2);
  await go("/pre-jogo");
  await v2.waitForSelector(".pm-cta", { timeout: 15000 });
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  const reuse = await frameInfo();
  await v2.click(".mt-skip");
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 30000 });
  await continueToHome(v2);
  const home1 = await frameInfo();
  const after1 = await serverCareer(v2);
  check("3) Sem mudança no save, a partida usa o mesmo motor pré-carregado; depois do pós-jogo ele segue aberto, sem quadro:",
    reuse.count === 0 && reuse.marca === "pre" && home1.count === 0 && home1.marca === "pre" && home1.shown === 0 && after1.currentRound === before.currentRound + 1,
    JSON.stringify({ reuse, home1, round: [before.currentRound, after1.currentRound] }));

  // 4) A v2 grava a formação com o motor aberto: ao iniciar, o motor é
  //    recarregado e o resultado mantém a formação nova.
  await go("/escalacao");
  await v2.waitForSelector(".lu-form-btn");
  await v2.click(".lu-form-btn");
  await v2.waitForSelector('[role="dialog"] [role="radio"]');
  const target = await v2.evaluate((cur) => [...document.querySelectorAll('[role="dialog"] [role="radio"]')].map((b) => b.textContent.trim()).find((t) => t !== cur), after1.lineup.formation);
  await v2.locator('[role="dialog"] [role="radio"]', { hasText: target }).first().click();
  await v2.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 10000 });
  const lineupSaved = (await serverCareer(v2)).lineup.formation;
  const stillPre = (await frameInfo()).marca === "pre";
  await go("/pre-jogo");
  await v2.waitForSelector(".pm-cta", { timeout: 15000 });
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-skip", { timeout: 40000 });
  const reloaded = await frameInfo();
  await v2.click(".mt-skip");
  await v2.waitForSelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])', { timeout: 30000 });
  const after2 = await serverCareer(v2);
  check("4) Formação gravada pela v2 com o motor aberto: ao iniciar, o motor é recarregado (sem quadro) e o resultado gravado mantém a formação nova:",
    lineupSaved === target && stillPre && reloaded.count === 0 && reloaded.marca === null && after2.currentRound === after1.currentRound + 1 && after2.lineup.formation === target,
    JSON.stringify({ target, lineupSaved, stillPre, reloaded, round: [after1.currentRound, after2.currentRound], formation: after2.lineup.formation }));

  // 5) Depois do pós-jogo, abrir a Partida de novo não reapresenta o jogo.
  await marcar("partida");
  await continueToHome(v2);
  await go("/partida");
  await v2.waitForFunction(() => /Nenhuma partida em andamento/.test(document.body.textContent), null, { timeout: 20000 });
  const after5 = await frameInfo();
  check("5) Abrir a Partida depois do pós-jogo não reapresenta o jogo encerrado; continua o mesmo motor, sem quadro:",
    after5.count === 0 && after5.marca === "partida" && after5.shown === 0, JSON.stringify(after5));

  // 6) Medida (não é critério): abertura do motor até ficar pronto.
  check(`6) Tempo de abertura do motor (pré-carga, inclui 1,5 s de espera): ${loadMs} ms`, loadMs < 60000, String(loadMs));

  await browser.close();
})();
