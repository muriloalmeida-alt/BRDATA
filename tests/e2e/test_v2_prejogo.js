// Carreira 2.0 — Entrega 03 (Pré-jogo, /carreira/pre-jogo). Pela UI real:
// Início → Preparar partida → Pré-jogo com confronto, rodada e titulares do
// save; avisos da confirmação atual como linhas; Revisar escalação e volta;
// fora da semana de jogo volta ao Início; nada gravado ao abrir; "Iniciar
// partida" abre a Partida da v2 (A4; antes, #iniciar na versão atual).
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

  const email = `v2pre${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira-old", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForSelector(".m3-club-row", { timeout: 20000 });
  await page.click('.m3-club-row[data-id="fla"]');
  await page.click("#btnConfirmClub");
  await passCareerSetup(page);
  await enterGame(page);
  await ensureDailyClaimed(page);

  // 1) Fora da semana de jogo (pré-temporada): /pre-jogo volta ao Início.
  await page.evaluate(() => persistCareer());
  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  await v2.goto(base + "/carreira/pre-jogo", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  check("1) Pré-temporada: /carreira/pre-jogo volta ao Início:", new URL(v2.url()).pathname === "/carreira/", v2.url());

  await skipPreseason(page);
  await page.evaluate(() => persistCareer());
  const legacy = await page.evaluate(() => {
    const fx = CAREER.schedule[CAREER.currentRound].find((m) => String(m.home) === String(CAREER.clubId) || String(m.away) === String(CAREER.clubId));
    return { round: CAREER.currentRound, home: teamById(fx.home).name, away: teamById(fx.away).name, formation: CAREER.lineup.formation, gk: CAREER.squad.find((p) => p.id === CAREER.lineup.starters[0]).overall };
  });

  // 2) Início → Preparar partida → Pré-jogo com dados reais.
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".pm-pitch", { timeout: 10000 });
  const pm = await v2.evaluate(() => ({
    path: location.pathname,
    title: document.querySelector(".screen-title").textContent,
    sub: document.querySelector(".screen-sub").textContent,
    teams: [...document.querySelectorAll(".pm-match .home-team b")].map((b) => b.textContent),
    date: document.querySelector(".pm-match .home-date").textContent,
    formation: document.querySelector(".pm-formation").getAttribute("aria-label"),
    slots: document.querySelectorAll(".pm-pitch .lu-slot").length,
    links: document.querySelectorAll(".pm-pitch a").length,
    gk: [...document.querySelectorAll(".pm-pitch .lu-slot")].pop().querySelector("text").textContent,
    alerts: document.querySelectorAll(".pm-foot nav .row").length,
    cta: document.querySelector(".pm-cta").getAttribute("href"),
    ctx: document.querySelector(".sub-head-ctx").textContent,
  }));
  check("2) Início → Pré-jogo: confronto, competição + rodada, data sem horário, 11 titulares só leitura com overall real:",
    pm.path === "/carreira/pre-jogo" && pm.title === "É hora de jogar." && pm.sub === `Brasileirão Série A · Rodada ${legacy.round}` && pm.teams[0] === legacy.home && pm.teams[1] === legacy.away
      && /^\d{2} [A-Z]{3}$/.test(pm.date) && pm.formation === `Formação ${legacy.formation}` && pm.slots === 11 && pm.links === 0 && pm.gk === String(legacy.gk)
      && pm.alerts === 1 && pm.cta === "/carreira/partida?iniciar=1" && pm.ctx === "Pré-jogo", JSON.stringify({ pm, legacy }));

  // 3) Revisar escalação → Escalação v2; voltar retorna ao Pré-jogo.
  await v2.click('.pm-foot a.row[href="/carreira/escalacao"]');
  await v2.waitForSelector(".lu-bench", { timeout: 10000 });
  await v2.click(".back-btn");
  await v2.waitForSelector(".pm-pitch", { timeout: 10000 });
  check("3) Revisar escalação abre a Escalação da v2 e o voltar retorna ao Pré-jogo:", new URL(v2.url()).pathname === "/carreira/pre-jogo", v2.url());

  // 4) Avisos da confirmação atual: titular lesionado e escalação incompleta.
  const c = await page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
  const hurt = c.squad.find((p) => p.id === c.lineup.starters[1]);
  hurt.status = "contundido"; hurt.outUntilRound = c.currentRound + 2;
  c.lineup.starters[10] = null;
  await page.evaluate(async (c) => fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }), c);
  writes.length = 0;
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".pm-pitch", { timeout: 15000 });
  const al = await v2.evaluate(() => [...document.querySelectorAll(".pm-foot nav .row")].map((r) => r.textContent));
  check("4) Avisos como linhas no estilo do Início (incompleta 10/11, titular lesionado):",
    al.length === 3 && /Escalação incompleta10\/11 titulares/.test(al[0]) && al[1].startsWith("Titular indisponível") && al[1].includes("(lesionado)"), JSON.stringify(al));
  check("5) Abrir o Pré-jogo não grava nada no save:", writes.length === 0, JSON.stringify(writes));

  // 6) 360 px: sem rolagem horizontal, alvos ≥ 44 px.
  await v2.setViewportSize({ width: 360, height: 780 });
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
  }));
  check("6) 360 px sem rolagem horizontal e alvos ≥ 44 px:", a.overflow <= 0 && a.small.length === 0, JSON.stringify(a));

  // 7) Iniciar partida (A4): abre a Partida da v2 e o jogo começa pela ponte.
  await page.goto("about:blank");
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  const live = await v2.evaluate(() => ({ path: location.pathname, search: location.search, kicker: document.querySelector(".mt-kicker").textContent }));
  check("7) Iniciar partida abre a Partida da v2 (endereço limpo) com a rodada atual:", live.path === "/carreira/partida" && live.search === "" && /Rodada/.test(live.kicker), JSON.stringify(live));

  await browser.close();
})();
