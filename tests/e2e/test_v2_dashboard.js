// Carreira 2.0 — fatia 1 (Dashboard). Mesmo save, duas interfaces: o
// Dashboard da v2 (public/carreira-v2.html, fonte em frontend-v2/) tem que
// mostrar os MESMOS números que o jogo atual calcula (equivalência das
// funções portadas — frontend-v2/src/domain/dashboard.ts) e não pode gravar
// o save. Também cobre login, estado sem carreira e layout nos 4 tamanhos.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { enterGame } = require("./_startup");
const { playNextMatchRound, closeLeftoverTabela } = require("./_round");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const errors = [];
  page.on("pageerror", (err) => { errors.push(err.message); console.log("PAGE ERROR:", err.message); });
  const base = "http://localhost:8787";
  const email = `v2dash${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
  }, { email });

  // 1) Sem sessão: a v2 mostra o login; login real leva ao estado sem carreira.
  await page.goto(base + "/carreira-v2.html", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("form input[type=email]", { timeout: 15000 });
  check("1) Sem sessão, a v2 abre no login:", await page.isVisible("text=Bem-vindo de volta!"));
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "senha-errada");
  await page.click("button[type=submit]");
  await page.waitForSelector(".form-error", { timeout: 10000 });
  check("2) Senha errada mostra o erro do servidor:", (await page.textContent(".form-error")).includes("incorretos"));
  await page.fill("input[type=password]", "senha123");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=Nenhuma carreira ativa", { timeout: 15000 });
  check("3) Logado sem carreira: estado vazio com caminho pro Modo Carreira:", await page.isVisible('a[href="/carreira.html"]'));

  // Carreira real no jogo atual: 3 rodadas oficiais.
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.click(".m3-club-row");
  await page.click("#btnConfirmClub");
  await enterGame(page);
  for (let i = 0; i < 3; i++) {
    const r = await playNextMatchRound(page);
    if (r.stoppedAt === "playerOfferOverlay") { await page.click("#playerOfferClose"); await closeLeftoverTabela(page); }
  }
  await page.waitForTimeout(1200); // persistência debounced do legado
  const legacy = await page.evaluate(() => {
    const fx = (CAREER.schedule[CAREER.currentRound] || []).find((f) => f.home === CAREER.clubId || f.away === CAREER.clubId);
    const oppId = fx ? (fx.home === CAREER.clubId ? fx.away : fx.home) : null;
    const row = CAREER.standings[CAREER.clubId];
    return { pos: myLeaguePosition(), pts: row.pts, j: row.j, v: row.v, e: row.e, d: row.d, gp: row.gp, gc: row.gc, conf: boardConfidence(), opp: oppId ? teamById(oppId).name : null, club: CAREER.clubName };
  });
  const savedBefore = await page.evaluate(async () => (await (await fetch("/api/career")).json()).career.updatedAt);

  // 4) Dashboard da v2 com o mesmo save.
  await page.goto(base + "/carreira-v2.html", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".dash", { timeout: 15000 });
  const v2 = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".stats > div")].map((d) => ({ b: d.querySelector("b").textContent, small: d.querySelector("small").textContent }));
    return {
      club: document.querySelector(".dash-club h2").textContent,
      hello: document.querySelector(".dash-hello").textContent,
      teams: [...document.querySelectorAll(".next-team span")].map((s) => s.textContent),
      cells, conf: document.querySelector(".conf svg text").textContent, confLabel: document.querySelector(".conf-body b").textContent,
      formCount: document.querySelectorAll(".form-bars li").length,
    };
  });
  check("4) Clube e saudação com o primeiro nome:", v2.club === legacy.club && /^(Bom dia|Boa tarde|Boa noite), Murilo!$/.test(v2.hello), JSON.stringify({ club: v2.club, hello: v2.hello }));
  check("5) Posição e pontos iguais ao jogo atual:", v2.cells[0].b === `${legacy.pos}º` && v2.cells[0].small === `${legacy.pts} pts`, JSON.stringify({ v2: v2.cells[0], legacy: { pos: legacy.pos, pts: legacy.pts } }));
  check("6) Jogos/V/E/D e gols iguais ao jogo atual:",
    v2.cells[1].b === String(legacy.j) && v2.cells[1].small === `V ${legacy.v} · E ${legacy.e} · D ${legacy.d}` && v2.cells[2].b === String(legacy.gp) && v2.cells[3].b === String(legacy.gc),
    JSON.stringify({ v2: v2.cells, legacy }));
  check("7) Próximo adversário igual ao do jogo atual:", v2.teams.includes(legacy.opp) && v2.teams.includes(legacy.club), JSON.stringify({ v2: v2.teams, opp: legacy.opp }));
  check("8) Confiança da diretoria igual (porte de boardConfidence):", v2.conf === `${legacy.conf.value}%` && v2.confLabel === legacy.conf.label, JSON.stringify({ v2: [v2.conf, v2.confLabel], legacy: [legacy.conf.value, legacy.conf.label] }));
  check("9) Desempenho recente mostra os 3 jogos:", v2.formCount === 3, v2.formCount);

  // 10) A v2 não grava o save (somente leitura nesta fatia).
  const savedAfter = await page.evaluate(async () => (await (await fetch("/api/career")).json()).career.updatedAt);
  check("10) Abrir a v2 não altera o save:", savedAfter === savedBefore, { savedBefore, savedAfter });

  // 11) Layout: sem scroll horizontal e nav sem cobrir o fim do conteúdo, nos 4 tamanhos.
  const layout = {};
  for (const [w, h] of [[360, 780], [390, 844], [430, 932], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    layout[`${w}x${h}`] = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
      const last = document.querySelector(".quick").getBoundingClientRect();
      return { overflowX: document.documentElement.scrollWidth - innerWidth, lastBottomAboveNav: Math.round(nav.top - last.bottom) };
    });
  }
  check("11) Sem scroll horizontal e último bloco acima da nav (360/390/430/1280):",
    Object.values(layout).every((l) => l.overflowX <= 0 && l.lastBottomAboveNav >= 0), JSON.stringify(layout));
  check("12) Nenhum erro de JavaScript na v2:", errors.length === 0, JSON.stringify(errors));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
