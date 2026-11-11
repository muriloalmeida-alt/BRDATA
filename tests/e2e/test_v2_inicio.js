// Carreira 2.0 — Entrega 01 (Início, /). Pela UI real:
// redirecionamentos sem sessão/carreira, dados do save (pré-temporada e
// semana de jogo), escudo oficial, NENHUMA escrita no save pela v2, sem
// links diretos na versão anterior (fase 11), acessibilidade/360 px e
// estado de erro com "Tentar novamente".
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { ensureDailyClaimed } = require("./_v2_match");
const { passCareerSetup, enterGame, waitForBoot } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  // 1) Sem sessão: login da própria v2 (fase 2), sem sair de /carreira.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ac-form", { timeout: 10000 }).catch(() => {});
  const l1 = await page.evaluate(() => ({ path: location.pathname, title: document.querySelector("h1")?.textContent || "" }));
  check("1) Sem sessão, / mostra o login da v2 (sem ir para /carreira-old):", l1.path === "/" && l1.title === "Volte para o jogo.", JSON.stringify(l1));

  const email = `v2inicio${Date.now()}@teste.com`;
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });

  // 2) Com sessão e sem carreira: criação de carreira da própria v2 (fase 2).
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/nova$/, { timeout: 10000 }).catch(() => {});
  check("2) Sem carreira, / abre a criação de carreira da v2 (/nova):", /\/nova$/.test(page.url()), page.url());
  // O resto deste teste cria a carreira pela versão anterior, como antes.
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });

  await waitForBoot(page);
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await ensureDailyClaimed(page);
  await page.evaluate(() => persistCareer());
  const legacy = await page.evaluate(() => ({ cash: fmtBRLShort(CAREER.finances.cash), goal: CAREER.boardGoal.label }));

  // 3) Pré-temporada: composição da referência com dados reais.
  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(`${r.method()} ${r.url()}`); });
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  const pre = await v2.evaluate(() => ({
    title: document.querySelector(".home-title").textContent,
    comp: document.querySelector(".home-sub").textContent,
    club: document.querySelector(".home-club-txt b").textContent,
    crest: document.querySelector(".home-team img")?.getAttribute("src"),
    teams: [...document.querySelectorAll(".home-team b")].map((b) => b.textContent),
    line: document.querySelector(".home-date").textContent,
    phase: document.querySelector(".home-phase")?.textContent || "",
    cta: document.querySelector(".cta").textContent.trim(), ctaHref: document.querySelector(".cta").getAttribute("href"),
    stats: !!document.querySelector(".home-stats"),
    rows: [...document.querySelectorAll(".home-list .row-title")].map((x) => x.textContent),
    value: document.querySelector(".row-value")?.textContent,
    tabs: [...document.querySelectorAll(".tab")].map((t) => t.textContent),
  }));
  check("3a) Topo, título e competição reais:", pre.title === "Vamos para o jogo." && pre.comp === "Brasileirão Série A" && pre.club === "FLAMENGO", JSON.stringify(pre));
  check("3b) Confronto real com escudo oficial, data + rodada e fase da pré-temporada:",
    pre.teams.includes("Flamengo") && pre.crest && pre.crest.startsWith("/img/teams/") && /RODADA 1$/.test(pre.line) && /^Pré-temporada · semana \d+ de \d+$/.test(pre.phase), JSON.stringify(pre));
  check("3c) CTA real da semana sem jogo (Avançar semana → Semana concluída da v2, fase 3) e sem posição/forma inventadas:",
    pre.cta === "Avançar semana" && pre.ctaHref === "/semana?avancar=semana" && !pre.stats, JSON.stringify(pre));
  check("3d) Objetivo e finanças iguais aos da versão atual; navegação Início/Elenco/Jogos/Mais:",
    pre.rows.includes(legacy.goal) && pre.value === legacy.cash && JSON.stringify(pre.tabs) === JSON.stringify(["Início", "Elenco", "Jogos", "Mais"]), JSON.stringify({ pre, legacy }));

  // 4) Semana de jogo: CTA Preparar partida.
  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(300);
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  const match = await v2.evaluate(() => ({ cta: document.querySelector(".cta").textContent.trim(), href: document.querySelector(".cta").getAttribute("href"), line: document.querySelector(".home-date").textContent, phase: !!document.querySelector(".home-phase") }));
  check("4) Semana de jogo: Preparar partida → Pré-jogo da v2, data + RODADA 1, sem linha de fase:",
    match.cta === "Preparar partida" && match.href === "/pre-jogo" && /^\d{2} [A-Z]{3} · RODADA 1$/.test(match.line) && !match.phase, JSON.stringify(match));
  check("5) A v2 não gravou nada no save (só leitura):", writes.length === 0, JSON.stringify(writes));

  // 6) Acessibilidade e 360 px: zoom liberado, sem rolagem horizontal, alvos ≥ 44 px.
  await v2.setViewportSize({ width: 360, height: 780 });
  await v2.waitForTimeout(200);
  const a11y = await v2.evaluate(() => ({
    viewport: document.querySelector('meta[name="viewport"]').content,
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && r.height < 44; }).map((el) => el.className),
    lang: document.documentElement.lang,
  }));
  check("6) Zoom liberado, sem rolagem horizontal em 360 px, alvos ≥ 44 px, lang pt-BR:",
    !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(a11y.viewport) && a11y.overflow <= 0 && a11y.small.length === 0 && a11y.lang === "pt-BR", JSON.stringify(a11y));

  // 7) Fase 11: a versão anterior não trata mais os links que vinham da v2
  // (V2_DEEP_LINKS): o fragmento fica onde está e a aba não muda.
  await page.goto("about:blank");
  await page.goto(base + "/carreira-old#escalacao", { waitUntil: "domcontentloaded" });
  await waitForBoot(page);
  await page.waitForTimeout(1500);
  const deep = await page.evaluate(() => ({ active: document.getElementById("panel-escalacao").classList.contains("active"), hash: location.hash, fn: typeof window.applyV2DeepLink }));
  check("7) A versão anterior não trata mais links vindos da v2 (#escalacao não muda a aba):", !deep.active && deep.hash === "#escalacao" && deep.fn === "undefined", JSON.stringify(deep));

  // 8) Erro de rede ao carregar a carreira: estado de erro com retry
  // funcional. Contexto sem service worker (o SW da raiz, registrado pela
  // versão atual, responde /api/career do cache quando a rede falha —
  // comportamento offline legítimo, mas impede simular a falha aqui).
  const errCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", storageState: await ctx.storageState() });
  const ep = await errCtx.newPage();
  let failNext = true;
  await ep.route((u) => new URL(u).pathname === "/api/career", (r) => (failNext ? r.abort() : r.continue()));
  await ep.goto(base + "/", { waitUntil: "domcontentloaded" });
  await ep.waitForSelector('[role="alert"] .state-btn', { timeout: 15000 }).catch(() => {});
  const err = await ep.evaluate(() => document.querySelector('[role="alert"]')?.textContent || "");
  failNext = false;
  await ep.click(".state-btn").catch(() => {});
  const recovered = await ep.waitForSelector(".home", { timeout: 15000 }).then(() => true, () => false);
  check("8) Falha ao carregar mostra erro com 'Tentar novamente', e tentar de novo recupera:", err.includes("Não foi possível carregar.") && recovered, err);
  await errCtx.close();

  // 9) Rotas (fase 11): a v2 é a raiz; /carreira/… e /carreira-v2/… levam
  // ao mesmo caminho na raiz; desde a G2d, /carreira/motor também (a página
  // escondida saiu).
  const r9 = await page.evaluate(async () => {
    const v2 = await (await fetch("/")).text();
    const red = await fetch("/carreira/tabela?divisao=b", { redirect: "manual" });
    const fol = await fetch("/carreira/tabela?divisao=b");
    const fol2 = await fetch("/carreira-v2/tabela?divisao=b");
    const motor = await (await fetch("/carreira/motor")).text();
    // Bundle (AUD-01): tipos certos e, para arquivo inexistente, 404 — nunca
    // o HTML do portal no lugar de um JS.
    const js = v2.match(/\/carreira\/assets\/[^"]+\.js/)[0], css = v2.match(/\/carreira\/assets\/[^"]+\.css/)[0];
    const type = async (u) => { const r = await fetch(u, { cache: "no-store" }); return `${r.status} ${(r.headers.get("content-type") || "").split(";")[0]}`; };
    const types = { js: await type(js), css: await type(css), webp: await type("/carreira/assets-scene/cen-02-estadio-header.webp"), missing: await type("/carreira/assets/nao-existe-123.js") };
    const path = (r) => new URL(r.url).pathname + new URL(r.url).search;
    return { v2: v2.includes('id="root"') && v2.includes("/carreira/assets/") && v2.includes("noindex"), motor: !motor.includes("btnConfirmClub") && motor.includes('id="root"'), red: red.type === "opaqueredirect" || red.status === 301, fol: path(fol), fol2: path(fol2), types };
  });
  check("9) / serve a v2; /carreira/… e /carreira-v2/… redirecionam para a raiz (inclusive /carreira/motor, sem a página escondida); JS/CSS/webp com o tipo certo e arquivo inexistente do bundle = 404:",
    r9.v2 && r9.motor && r9.red && r9.fol === "/tabela?divisao=b" && r9.fol2 === "/tabela?divisao=b" && r9.types.js === "200 application/javascript" && r9.types.css === "200 text/css"
      && r9.types.webp === "200 image/webp" && r9.types.missing === "404 text/plain", JSON.stringify(r9));

  await browser.close();
})();
