// Carreira 2.0 — Entrega 04 (Tabela, /carreira/tabela). Pela UI real,
// depois de 2 rodadas jogadas: Início → Tabela; trecho de 6 linhas ao redor
// do seu clube e tabela completa iguais à classificação da versão atual;
// zonas; resultados da última rodada; outras divisões; Copa do Brasil sem
// texto quebrado; toque no clube abre o elenco na versão atual; voltar ao
// clube; nada gravado; 360 px e acessibilidade.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { passCareerSetup, enterGame, waitForBoot } = require("./_startup");
const { skipPreseason } = require("./_calendar_skip");
const { playRound, closeLeftoverTabela } = require("./_round");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const email = `v2tab${Date.now()}@teste.com`;
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
  await skipPreseason(page);
  // Proposta aleatória de outro clube por um jogador pode abrir entre as
  // rodadas (evento do jogo) — recusa, como o técnico faria.
  const declineOffer = () => page.evaluate(() => { const o = document.getElementById("playerOfferOverlay"); if (o && o.classList.contains("open")) document.getElementById("btnPlayerOfferDecline").click(); });
  for (let i = 0; i < 2; i++) { await closeLeftoverTabela(page); await declineOffer(); await page.waitForTimeout(150); await playRound(page); }
  await declineOffer();
  await closeLeftoverTabela(page);
  await page.evaluate(() => persistCareer());
  await page.waitForTimeout(400);
  const legacy = await page.evaluate(() => {
    const rows = Object.values(CAREER.standings).sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp))
      .map((r) => ({ name: teamById(r.id).name, pts: r.pts, j: r.j, id: String(r.id) }));
    const last = CAREER.currentRound - 1;
    const other = CAREER.otherDivisions ? Object.keys(CAREER.otherDivisions)[0] : null;
    return { rows, myPos: rows.findIndex((r) => r.id === String(CAREER.clubId)) + 1, last, results: (CAREER.resultsByRound[last] || []).length,
      other, otherCount: other ? Object.keys(CAREER.otherDivisions[other].standings || {}).length : 0, otherName: other ? { serie_b: "Série B", serie_c: "Série C", brasileirao: "Série A" }[other] : null };
  });

  // 1) Início → toque na posição → Tabela, trecho de 6 com seu clube destacado.
  const v2 = await ctx.newPage();
  const writes = [];
  v2.on("request", (r) => { if (r.url().includes("/api/career") && r.method() !== "GET") writes.push(r.method()); });
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.click('a.home-pos[href="/carreira/tabela"]');
  await v2.waitForSelector(".tb-table", { timeout: 10000 });
  const read = () => v2.evaluate(() => [...document.querySelectorAll(".tb-row")].map((r) => ({
    pos: Number(r.querySelector(".tb-pos").textContent), name: r.querySelector(".tb-name").textContent,
    pts: Number(r.querySelectorAll(".tb-num")[0].textContent), j: Number(r.querySelectorAll(".tb-num")[1].textContent),
    me: r.classList.contains("is-me"), zone: (r.querySelector(".tb-pos").className.match(/tb-zone--(\w+)/) || [])[1] || null, href: r.getAttribute("href"),
  })));
  const ex = await read();
  const head = await v2.evaluate(() => ({ title: document.querySelector(".screen-title").textContent, round: document.querySelector(".tb-round").textContent, comp: document.querySelector(".tb-comp").textContent }));
  const meRow = ex.find((r) => r.me);
  check("1) Início → Tabela: trecho de 6 linhas com seu clube destacado na posição real, rodada da última disputada:",
    new URL(v2.url()).pathname === "/carreira/tabela" && head.title === "A disputa continua." && head.round === `Rodada ${legacy.last}` && head.comp === "Brasileirão Série A"
      && ex.length === 6 && meRow && meRow.pos === legacy.myPos && ex.every((r) => { const l = legacy.rows[r.pos - 1]; return l.name === r.name && l.pts === r.pts && l.j === r.j; }), JSON.stringify({ head, ex, myPos: legacy.myPos }));

  // 2) Tabela completa igual à da versão atual; zonas da Série A.
  await v2.click(".tb-more");
  const all = await read();
  const zones = all.map((r) => r.zone);
  check("2) 'Ver tabela completa': 20 clubes na mesma ordem e pontos da versão atual; zonas 1–6 / 7–12 / 17–20:",
    all.length === 20 && all.every((r, i) => r.name === legacy.rows[i].name && r.pts === legacy.rows[i].pts)
      && zones.slice(0, 6).every((z) => z === "top") && zones.slice(6, 12).every((z) => z === "mid") && zones.slice(12, 16).every((z) => z === null) && zones.slice(16).every((z) => z === "reb")
      && (await v2.locator(".tb-more").getAttribute("aria-expanded")) === "true", JSON.stringify(zones));

  // 3) Resultados da última rodada e Copa sem texto quebrado.
  const res = await v2.evaluate(() => ({ n: document.querySelectorAll(".tb-res").length, cup: document.querySelector(".tb-cup-status").textContent }));
  check("3) Resultados da última rodada (todos os jogos) e status da Copa sem 'undefined':",
    res.n === legacy.results && res.n > 0 && !/undefined|\?\./.test(res.cup) && res.cup.length > 10, JSON.stringify(res));

  // 4) Outra divisão pelo seletor (carreira com sistema de divisões).
  if (legacy.other) {
    await v2.click(`.tb-seg:has-text("${legacy.otherName}")`);
    await v2.waitForFunction((n) => document.querySelector(".tb-comp").textContent.endsWith(n), legacy.otherName, { timeout: 5000 });
    await v2.click(".tb-more");
    const ob = await v2.evaluate(() => ({ rows: document.querySelectorAll(".tb-row").length, me: document.querySelectorAll(".tb-row.is-me").length, results: document.querySelectorAll(".tb-res").length, sel: document.querySelector('.tb-seg[aria-selected="true"]').textContent, url: location.search }));
    check("4) Seletor de divisão: outra divisão com a classificação dela, sem seu clube e sem resultados da sua rodada:",
      ob.rows === legacy.otherCount && ob.me === 0 && ob.results === 0 && ob.sel === legacy.otherName && ob.url === `?divisao=${legacy.other}`, JSON.stringify(ob));
    await v2.click('.tb-seg:has-text("Série A")');
    await v2.waitForFunction(() => location.search === "", null, { timeout: 5000 });
  } else {
    check("4) (carreira sem sistema de divisões — seletor oculto):", (await v2.locator(".tb-switch").count()) === 0, "");
  }

  // 5) 360 px: sem rolagem horizontal, alvos ≥ 44 px.
  await v2.setViewportSize({ width: 360, height: 780 });
  await v2.click(".tb-more");
  const a = await v2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className),
    roles: !!document.querySelector('[role="table"] [role="columnheader"]'),
  }));
  check("5) 360 px sem rolagem horizontal, alvos ≥ 44 px, tabela com papéis acessíveis:", a.overflow <= 0 && a.small.length === 0 && a.roles, JSON.stringify(a));
  check("6) A Tabela não grava nada no save:", writes.length === 0, JSON.stringify(writes));

  // 7) Voltar ao clube → Início.
  await v2.click(".tb-foot .cta");
  await v2.waitForSelector(".home", { timeout: 10000 });
  check("7) 'Voltar ao clube' leva ao Início:", new URL(v2.url()).pathname === "/carreira/", v2.url());

  // 8) Toque num clube adversário → elenco dele na versão atual.
  await v2.goto(base + "/carreira/tabela", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".tb-row", { timeout: 15000 });
  const other = v2.locator(".tb-row:not(.is-me)").first();
  const otherName = await other.locator(".tb-name").textContent();
  await other.click();
  await v2.waitForURL(/\/carreira-old(#.*)?$/, { timeout: 10000 });
  await waitForBoot(v2);
  await v2.waitForFunction(() => document.getElementById("clubRosterOverlay").classList.contains("open"), null, { timeout: 15000 }).catch(() => {});
  const roster = await v2.evaluate(() => ({ open: document.getElementById("clubRosterOverlay").classList.contains("open"), name: document.getElementById("clubRosterName").textContent, hash: location.hash }));
  check("8) Toque no clube abre o elenco dele na versão atual (#clube:id) e limpa o fragmento:", roster.open && roster.name === otherName && roster.hash === "", JSON.stringify({ roster, otherName }));

  await browser.close();
})();
