// Carreira 2.0 — fase 11 (corte). A v2 é a raiz do domínio, o site do
// Brasileirão mora em /brasileirao/* e a versão anterior não é mais aberta
// (desde a etapa G2d do plano "sem página escondida", nem como motor
// escondido em /carreira/motor: a v2 abre o motor como módulo).
//  1) O build da v2 não cita "carreira-old" nem carreira.html, e só usa
//     /carreira/… para os próprios arquivos.
//  2) Roteamento de produção (cabeçalho x-brdata-producao, ver server.js):
//     /carreira.html e /carreira-old vão para "/" com a query (convite,
//     retorno do pagamento, source=pwa); /carreira/… e /carreira-v2/… vão
//     para o mesmo caminho na raiz; os endereços antigos do site vão para
//     /brasileirao/… (301).
//  3) SEO: sitemap e canonical só com /brasileirao (e a privacidade).
//  4) Navegando por todas as telas alcançáveis pelos links da v2 (Início,
//     Jogos, Clube, Mais e o que se abre delas), nenhuma navegação sai da v2.
//  5) Convite por link: /carreira.html?convite=CÓDIGO (link antigo) chega
//     na raiz, adiciona o amigo uma vez e limpa a URL.
//  6) Volta do pagamento na Loja da v2 (/loja?status=…): mostra a situação
//     e limpa a URL.
//  7) Site em /brasileirao: abas com URL própria, página de time pela URL,
//     "Modo Técnico" aponta para a raiz.
//  8) sw.js: pré-carrega o JS/CSS da v2 e as notificações abrem "/".
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, signup, newCareer } = require("./_v2_match");

const PROD = { "x-brdata-producao": "1" };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });

  // 1) Varredura do build.
  const dir = path.join(__dirname, "..", "..", "public", "carreira");
  const files = [path.join(dir, "index.html"), ...fs.readdirSync(path.join(dir, "assets")).filter((f) => /\.(js|css)$/.test(f)).map((f) => path.join(dir, "assets", f))];
  const hits = {};
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    const bad = [...txt.matchAll(/carreira-old|carreira\.html|\/carreira\/(?!assets)[a-z-]*/g)].map((m) => m[0]);
    if (bad.length) hits[path.basename(f)] = [...new Set(bad)];
  }
  check("1) Build da v2 sem 'carreira-old', sem carreira.html e sem /carreira/… fora dos arquivos (nem o motor escondido):", Object.keys(hits).length === 0 && files.length >= 3, JSON.stringify(hits));

  // 2) Roteamento de produção.
  const ctxP = await browser.newContext({ extraHTTPHeaders: PROD });
  const rq = ctxP.request;
  const loc = async (u) => { const r = await rq.get(base + u, { maxRedirects: 0 }); return `${r.status()} ${(r.headers().location || "").replace(base, "")}`; };
  const routes = {
    "/carreira.html?convite=ABC123": "301 /?convite=ABC123",
    "/carreira.html?source=pwa": "301 /?source=pwa",
    "/carreira.html?status=approved&payment_id=1": "301 /?status=approved&payment_id=1",
    "/carreira-old": "301 /",
    "/carreira": "301 /",
    "/carreira/elenco/ficha?id=7": "301 /elenco/ficha?id=7",
    "/carreira-v2/tabela?divisao=b": "301 /tabela?divisao=b",
    "/times/flamengo": "301 /brasileirao/times/flamengo",
    "/jogadores/123-fulano": "301 /brasileirao/jogadores/123-fulano",
    "/jogos/456-a-x-b": "301 /brasileirao/jogos/456-a-x-b",
    "/seja-premium?x=1": "301 /brasileirao/seja-premium?x=1",
    "/apoie?status=approved": "301 /brasileirao/apoie?status=approved",
    "/brasileirao/apoie?status=approved": "301 /brasileirao/seja-premium?status=approved",
    // Etapa G2d: a página escondida saiu; /carreira/motor é como /carreira/….
    "/carreira/motor": "301 /motor",
  };
  const got = {};
  for (const u of Object.keys(routes)) got[u] = await loc(u);
  const wrong = Object.entries(routes).filter(([u, exp]) => got[u] !== exp).map(([u, exp]) => ({ u, exp, got: got[u] }));
  const page200 = async (u) => { const r = await rq.get(base + u); const t = await r.text(); return { s: r.status(), v2: t.includes('id="root"') && t.includes("/carreira/assets/"), site: t.includes('id="authGate"'), motor: t.includes("btnConfirmClub") && t.includes('<base href="/">') }; };
  const pages = { root: await page200("/"), tabela: await page200("/tabela"), loja: await page200("/loja?status=approved"), site: await page200("/brasileirao"), siteTabela: await page200("/brasileirao/tabela"), motor: await page200("/carreira/motor") };
  check("2) Produção: /carreira.html e /carreira-old → / com a query; /carreira/… e /carreira-v2/… → raiz; site antigo → /brasileirao/… (301); / e /tabela são a v2, /brasileirao é o site; /carreira/motor leva à v2 (sem a página escondida):",
    wrong.length === 0 && pages.root.v2 && pages.tabela.v2 && pages.loja.v2 && pages.site.site && pages.siteTabela.site && pages.motor.v2 && !pages.motor.motor && !pages.root.site,
    JSON.stringify({ wrong, pages }));

  // 3) SEO.
  const sitemap = await (await rq.get(base + "/sitemap.xml")).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const siteHtml = await (await rq.get(base + "/brasileirao")).text();
  const canonical = (siteHtml.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const robots = await (await rq.get(base + "/robots.txt")).text();
  check("3) Sitemap só com /brasileirao/… (e a privacidade); canonical do site em /brasileirao; robots com o sitemap:",
    locs.length >= 5 && locs.every((p) => p === "/brasileirao" || p.startsWith("/brasileirao/") || p === "/privacidade.html") && /\/brasileirao$/.test(canonical || "") && /Sitemap:/.test(robots),
    JSON.stringify({ locs, canonical }));
  await ctxP.close();

  // 4) Navegação por toda a v2.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const emailA = `v2corte${Date.now()}@teste.com`;
  await newCareer(page, emailA);
  const v2 = await ctx.newPage();
  v2.on("dialog", (d) => d.dismiss());
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const visited = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visited.push(new URL(f.url()).pathname); });
  const outside = (href) => /^https?:/.test(href) && !href.startsWith(base);
  const leaves = (p) => p.startsWith("/carreira") || p.startsWith("/brasileirao") || p.endsWith(".html");
  // Links que mudam o jogo ao abrir (avançar a semana, iniciar a partida)
  // ficam de fora: aqui só se navega.
  const risky = /avancar|iniciar|partida|reiniciar/;
  const seen = new Set(), queue = ["/", "/jogos", "/clube", "/mais"], links = new Set();
  while (queue.length && seen.size < 70) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    await v2.goto(base + u, { waitUntil: "domcontentloaded" });
    await v2.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
    await v2.waitForFunction(() => !document.querySelector(".state[aria-busy='true'], .state.is-loading"), null, { timeout: 8000 }).catch(() => {});
    const hrefs = await v2.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
    for (const h of hrefs) {
      if (!h || h.startsWith("#") || outside(h)) continue;
      links.add(h);
      const p = new URL(h, base);
      const key = p.pathname + p.search;
      if (!leaves(p.pathname) && !risky.test(key) && !seen.has(key) && queue.length < 120) queue.push(key);
    }
  }
  // Cliques reais nas abas e nas linhas dos hubs (navegação por History API).
  for (const tab of ["Jogos", "Mais", "Elenco"]) {
    await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
    await v2.waitForSelector(".home", { timeout: 15000 });
    await v2.locator(".tabbar .tab", { hasText: tab }).click();
    await v2.waitForTimeout(400);
  }
  await v2.goto(base + "/mais", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".hb-row", { timeout: 10000 });
  const maisRows = await v2.locator(".hb-row").count();
  for (let i = 0; i < maisRows; i++) {
    const row = v2.locator(".hb-row").nth(i);
    if (/Sair/.test(await row.textContent())) continue;
    await row.click();
    await v2.waitForTimeout(400);
    await v2.goto(base + "/mais", { waitUntil: "domcontentloaded" });
    await v2.waitForSelector(".hb-row", { timeout: 10000 });
  }
  const badLinks = [...links].filter((h) => { const p = new URL(h, base).pathname; return leaves(p) && h !== "/privacidade.html"; });
  const badNav = visited.filter((p) => leaves(p));
  check("4) Por toda a v2 (" + seen.size + " telas, " + links.size + " links), nenhum link nem navegação sai da v2 (só a Política de Privacidade):",
    seen.size >= 30 && badLinks.length === 0 && badNav.length === 0, JSON.stringify({ badLinks, badNav, telas: seen.size }));

  // 5) Convite pelo link antigo (/carreira.html?convite=…), em produção.
  const codeA = await page.evaluate(async () => (await (await fetch("/api/friends")).json()).friendCode);
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: PROD });
  const pb = await ctxB.newPage();
  await signup(pb, `v2corteb${Date.now()}@teste.com`);
  await pb.goto(`${base}/carreira.html?convite=${codeA}`, { waitUntil: "domcontentloaded" });
  await pb.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
  await pb.waitForFunction(async (code) => {
    const f = await (await fetch("/api/friends")).json();
    return (f.friends || []).some((x) => x.friendCode === code || x.code === code) || (f.friends || []).length > 0;
  }, codeA, { timeout: 10000, polling: 500 }).catch(() => {});
  const inv = await pb.evaluate(async () => ({ url: location.pathname + location.search, friends: ((await (await fetch("/api/friends")).json()).friends || []).length }));
  await pb.reload({ waitUntil: "domcontentloaded" });
  await pb.waitForTimeout(1500);
  const inv2 = await pb.evaluate(async () => ((await (await fetch("/api/friends")).json()).friends || []).length);
  check("5) /carreira.html?convite=CÓDIGO chega na v2, adiciona o amigo uma vez e limpa a URL:", inv.friends === 1 && inv2 === 1 && !inv.url.includes("convite") && !inv.url.startsWith("/carreira"), JSON.stringify({ inv, inv2 }));
  await ctxB.close();

  // 6) Volta do pagamento na Loja da v2.
  await v2.goto(`${base}/loja?collection_status=pending&status=pending&payment_id=123&external_reference=credits:x:bronze`, { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".mo-pay", { timeout: 15000 }).catch(() => {});
  const pay = await v2.evaluate(() => ({ text: document.querySelector(".mo-pay")?.textContent || "", url: location.pathname + location.search, h1: document.querySelector("h1")?.textContent }));
  check("6) Volta do pagamento (/loja?status=…) mostra a situação na Loja da v2 e limpa a URL:", /pendente/i.test(pay.text) && pay.url === "/loja" && pay.h1 === "Mais opções de jogo.", JSON.stringify(pay));

  // 7) Site em /brasileirao.
  const sp = await ctx.newPage();
  await sp.goto(base + "/brasileirao", { waitUntil: "load" });
  await sp.waitForTimeout(1200);
  const modo = await sp.evaluate(() => [...document.querySelectorAll("a.side-link")].find((a) => /Modo Técnico/.test(a.textContent))?.getAttribute("href"));
  await sp.locator('[data-page="tabela"]:visible').first().click().catch(() => {});
  await sp.waitForURL(/\/brasileirao\/tabela$/, { timeout: 5000 }).catch(() => {});
  const tab = new URL(sp.url()).pathname;
  await sp.locator('[data-page="dashboard"]:visible').first().click().catch(() => {});
  await sp.waitForTimeout(400);
  const dash = new URL(sp.url()).pathname;
  const slug = await sp.evaluate(() => typeof TEAMS !== "undefined" && TEAMS.length ? teamSlug(TEAMS[0]) : null);
  await sp.goto(`${base}/brasileirao/times/${slug}`, { waitUntil: "load" });
  await sp.waitForFunction(() => typeof state !== "undefined" && state.page === "time", null, { timeout: 8000 }).catch(() => {});
  const team = await sp.evaluate(() => ({ page: typeof state !== "undefined" ? state.page : null, path: location.pathname }));
  check("7) Site em /brasileirao: Tabela em /brasileirao/tabela, Início em /brasileirao, página do time pela URL, 'Modo Técnico' aponta para a raiz:",
    tab === "/brasileirao/tabela" && dash === "/brasileirao" && !!slug && team.page === "time" && team.path === `/brasileirao/times/${slug}` && modo === "/", JSON.stringify({ tab, dash, slug, team, modo }));

  // 8) sw.js.
  const sw = await (await ctx.request.get(base + "/sw.js")).text();
  const swAssets = JSON.parse((sw.match(/const V2_ASSETS = (\[[^\]]*\]);/) || [, "[]"])[1]);
  check("8) sw.js pré-carrega o JS/CSS da v2, não guarda /carreira.html, e as notificações abrem \"/\":",
    swAssets.length >= 2 && swAssets.every((a) => a.startsWith("/carreira/assets/")) && !sw.includes('"/carreira.html"') && sw.includes('data.url || "/"'),
    JSON.stringify({ swAssets }));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
