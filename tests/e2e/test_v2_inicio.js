// Carreira 2.0 — Entrega 01 (Início, /carreira-v2/). Pela UI real:
// redirecionamentos sem sessão/carreira, dados do save (pré-temporada e
// semana de jogo), escudo oficial, NENHUMA escrita no save pela v2, links
// diretos para a versão atual (/carreira#acao), acessibilidade/360 px e
// estado de erro com "Tentar novamente".
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { passCareerSetup, enterGame, waitForBoot } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  // 1) Sem sessão: a v2 manda pra versão atual (que tem o login).
  await page.goto(base + "/carreira-v2/", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/carreira$/, { timeout: 10000 }).catch(() => {});
  check("1) Sem sessão, /carreira-v2/ redireciona para /carreira:", /\/carreira$/.test(page.url()), page.url());

  const email = `v2inicio${Date.now()}@teste.com`;
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });

  // 2) Com sessão e sem carreira: idem (criação ainda é da versão atual).
  await page.goto(base + "/carreira-v2/", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/carreira$/, { timeout: 10000 }).catch(() => {});
  check("2) Sem carreira, /carreira-v2/ redireciona para /carreira:", /\/carreira$/.test(page.url()), page.url());

  await waitForBoot(page);
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await page.evaluate(() => persistCareer());
  const legacy = await page.evaluate(() => ({ cash: fmtBRLShort(CAREER.finances.cash), goal: CAREER.boardGoal.label }));

  // 3) Pré-temporada: composição da referência com dados reais.
  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(`${r.method()} ${r.url()}`); });
  await v2.goto(base + "/carreira-v2/", { waitUntil: "domcontentloaded" });
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
  check("3c) CTA real da semana sem jogo (Avançar semana → /carreira#avancar-semana) e sem posição/forma inventadas:",
    pre.cta === "Avançar semana" && pre.ctaHref === "/carreira#avancar-semana" && !pre.stats, JSON.stringify(pre));
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
    match.cta === "Preparar partida" && match.href === "/carreira-v2/pre-jogo" && /^\d{2} [A-Z]{3} · RODADA 1$/.test(match.line) && !match.phase, JSON.stringify(match));
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

  // 7) Link direto na versão atual: #escalacao abre a aba Tática e limpa o fragmento.
  // Vindo da v2 é sempre um carregamento completo da página (não uma troca
  // de fragmento no mesmo documento) — reproduz isso saindo da página antes.
  await page.goto("about:blank");
  await page.goto(base + "/carreira#escalacao", { waitUntil: "domcontentloaded" });
  await waitForBoot(page);
  await page.waitForFunction(() => document.getElementById("panel-escalacao").classList.contains("active"), null, { timeout: 10000 }).catch(() => {});
  const deep = await page.evaluate(() => ({ active: document.getElementById("panel-escalacao").classList.contains("active"), hash: location.hash }));
  check("7) /carreira#escalacao abre a escalação e limpa o fragmento:", deep.active && deep.hash === "", JSON.stringify(deep));

  // 8) Erro de rede ao carregar a carreira: estado de erro com retry
  // funcional. Contexto sem service worker (o SW da raiz, registrado pela
  // versão atual, responde /api/career do cache quando a rede falha —
  // comportamento offline legítimo, mas impede simular a falha aqui).
  const errCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", storageState: await ctx.storageState() });
  const ep = await errCtx.newPage();
  let failNext = true;
  await ep.route((u) => new URL(u).pathname === "/api/career", (r) => (failNext ? r.abort() : r.continue()));
  await ep.goto(base + "/carreira-v2/", { waitUntil: "domcontentloaded" });
  await ep.waitForSelector('[role="alert"] .state-btn', { timeout: 15000 }).catch(() => {});
  const err = await ep.evaluate(() => document.querySelector('[role="alert"]')?.textContent || "");
  failNext = false;
  await ep.click(".state-btn").catch(() => {});
  const recovered = await ep.waitForSelector(".home", { timeout: 15000 }).then(() => true, () => false);
  check("8) Falha ao carregar mostra erro com 'Tentar novamente', e tentar de novo recupera:", err.includes("Não foi possível carregar.") && recovered, err);
  await errCtx.close();

  await browser.close();
})();
