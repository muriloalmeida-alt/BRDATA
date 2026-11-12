// Mercado: paginação ("Mostrando 40 de N" e "Carregar mais"), filtros
// (posição, clube, faixa de overall), busca por nome e o caminho para propor.
// Lote L3d (12/11/2026, plano "testes sem a tela antiga"): antes pela lista
// da tela antiga (#marketList, selects de filtro). Agora pelo Mercado da v2
// ("Busque seu reforço.") e a folha "Refine sua busca."; a regra dos filtros
// também tem teste no domínio da v2 (carreira-v2/src/domain/market.test.ts).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `mercfiltros${Date.now()}@teste.com`);
  await page.goto(base + "/mercado", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mk-list li", { timeout: 20000 });
  const lista = () => page.evaluate(() => ({
    rows: document.querySelectorAll(".mk-list li").length,
    count: (document.querySelector(".sq-count") || {}).textContent || "",
    subs: [...document.querySelectorAll(".mk-list .row-sub")].map((s) => s.textContent),
    clubs: [...document.querySelectorAll(".mk-list .wk-item dt")].map((d) => d.textContent),
    hrefs: [...document.querySelectorAll(".mk-list a.sp-player")].map((a) => a.getAttribute("href")),
  }));
  const filtros = async (fn) => {
    await page.click(".sq-filter");
    await page.waitForSelector("#mf-t", { timeout: 10000 });
    await fn();
    await page.locator('[role="dialog"] .cta', { hasText: "Aplicar filtros" }).click();
    await page.waitForFunction(() => !document.getElementById("mf-t"), null, { timeout: 10000 });
    await page.waitForTimeout(150);
  };

  // 1) Lista inicial: 40 jogadores, com o total no contador.
  const l1 = await lista();
  check("1) Lista inicial com 40 jogadores (\"Mostrando 40 de N\"):", l1.rows === 40 && /^Mostrando 40 de \d+/.test(l1.count), JSON.stringify({ rows: l1.rows, count: l1.count }));

  // 2) "Carregar mais" faz a lista crescer.
  await page.click(".mk-more");
  await page.waitForTimeout(150);
  const l2 = await lista();
  check("2) Depois de \"Carregar mais\", a lista cresce:", l2.rows > l1.rows, JSON.stringify({ rows: l2.rows, count: l2.count }));

  // 3) Trocar o filtro de posição volta para a 1ª página (<= 40).
  await filtros(() => page.locator('[aria-labelledby="mf-pos"] [role="radio"]', { hasText: "Goleiro" }).click());
  const l3 = await lista();
  check("3) Trocar o filtro de posição reinicia a paginação (<= 40 resultados) e só mostra goleiros:",
    l3.rows > 0 && l3.rows <= 40 && l3.subs.every((s) => s.startsWith("Goleiro")), JSON.stringify({ rows: l3.rows, count: l3.count }));

  // 4) Filtro de clube: só jogadores desse clube.
  let clube = "";
  await filtros(async () => {
    await page.locator('[aria-labelledby="mf-pos"] [role="radio"]', { hasText: "Todas" }).click().catch(() => {});
    const opt = await page.evaluate(() => { const o = document.querySelectorAll("#mf-club option")[1]; return { v: o.value, t: o.textContent }; });
    clube = opt.t;
    await page.selectOption("#mf-club", opt.v);
  });
  const l4 = await lista();
  check(`4) Filtro de clube ("${clube}") mostra só jogadores desse clube:`, l4.rows > 0 && l4.clubs.every((c) => c.startsWith(clube)), JSON.stringify({ rows: l4.rows, amostra: l4.clubs.slice(0, 3) }));

  // 5) Faixa de overall a partir de 80: todos >= 80.
  await filtros(async () => {
    await page.selectOption("#mf-club", "");
    await page.fill('[aria-label="Faixa de overall: de"]', "80");
  });
  const l5 = await lista();
  const ovr = l5.subs.map((s) => Number((/overall (\d+)/.exec(s) || [])[1]));
  check("5) Faixa de overall a partir de 80: todos os jogadores têm overall >= 80:", l5.rows > 0 && ovr.every((o) => o >= 80), JSON.stringify({ rows: l5.rows, ovr: ovr.slice(0, 5) }));

  // 6) Busca por nome (com os filtros limpos).
  await page.click(".sq-filter");
  await page.waitForSelector("#mf-t", { timeout: 10000 });
  await page.locator('[role="dialog"] .text-btn', { hasText: "Limpar filtros" }).click();
  await page.waitForFunction(() => !document.getElementById("mf-t"), null, { timeout: 10000 });
  const nome = (await lista()).hrefs.length ? await page.evaluate(() => document.querySelector(".mk-list .row-title").textContent.split(" ").pop()) : "";
  await page.fill("#mk-q", nome);
  await page.waitForTimeout(300);
  const l6 = await lista();
  check("6) Busca por nome tem resultado:", !!nome && l6.rows > 0, JSON.stringify({ nome, rows: l6.rows }));

  // 7) Cada jogador leva ao perfil do alvo, com "Fazer proposta".
  await page.click(".mk-list a.sp-player >> nth=0");
  await page.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Conheça seu reforço.", null, { timeout: 20000 });
  const cta = await page.textContent(".pr .cal-foot .cta");
  check("7) O jogador da lista leva ao perfil do alvo com \"Fazer proposta\":", /Fazer proposta|Ver negociação/.test(cta), cta);

  check("8) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
