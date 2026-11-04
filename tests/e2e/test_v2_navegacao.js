// Carreira 2.0 — P7 (mapa de navegação): telas de entrada Jogos, Clube e
// Mais, pela UI real.
//  1) As 4 abas da barra são telas da v2 (nenhuma abre /carreira-old).
//  2) Jogos: Calendário e Tabela (v2), Copa do Brasil e Estatísticas (↗,
//     versão anterior, D3).
//  3) Clube: aberta pela linha "Clube" e pelo escudo do Início; seções
//     Gestão / Elenco e mercado / Estrutura; "Voltar ao clube" da Diretoria
//     volta para a tela Clube.
//  4) Mais: os 9 itens da prancha (CAP07-T01), na ordem; "Sair" encerra a
//     sessão e mostra o login da v2.
//  5) Os links diretos novos da versão anterior abrem a tela certa.
//  6) Jogos, Clube e Mais em 360 px: sem rolagem horizontal, alvos ≥ 44 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer } = require("./_v2_match");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const base = "http://localhost:8787";
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2nav${Date.now()}@teste.com`);

  // 5) Links diretos novos (na própria versão anterior).
  const deep = {};
  const targets = {
    contratos: "#contratosOverlay.open", comissao: "#commissionOverlay.open", estadio: "#stadiumOverlay.open", olheiros: "#scoutingOverlay.open",
    extrato: "#extratoOverlay.open", "historico-negociacoes": "#transferHistoryOverlay.open", "perfil-treinador": "#coachProfileOverlay.open",
    premiacoes: "#awardsOverlay.open", configuracoes: "#settingsOverlay.open", ajuda: "#helpCenterOverlay.open",
    estatisticas: "#panel-estatisticas.active", conquistas: "#panel-conquistas.active", ranking: "#panel-ranking.active", loja: "#panel-loja.active", copa: "#panel-jogos.active",
  };
  for (const [key, sel] of Object.entries(targets)) {
    // O link direto roda no boot da versão anterior (e limpa o fragmento):
    // só trocar o # na mesma página não recarrega, então sai antes.
    await page.goto("about:blank");
    await page.goto(`${base}/carreira-old#${key}`, { waitUntil: "domcontentloaded" });
    deep[key] = await page.waitForSelector(sel, { timeout: 20000 }).then(() => true, () => false);
  }
  const deepBad = Object.entries(deep).filter(([, v]) => !v).map(([k]) => k);
  check("5) Links diretos novos da versão anterior abrem a tela certa (contratos, comissão, estádio, olheiros, extrato, histórico, perfil, premiações, configurações, ajuda, estatísticas, conquistas, ranking, loja, copa):",
    deepBad.length === 0, JSON.stringify({ deepBad }));
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const small = () => v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className) }));
  const sizes = {};
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });

  // 1) Abas.
  const tabs = await v2.evaluate(() => [...document.querySelectorAll(".tabbar .tab")].map((a) => [a.textContent.trim(), a.getAttribute("href")]));
  check("1) As 4 abas são telas da v2:", JSON.stringify(tabs) === JSON.stringify([["Início", "/carreira/"], ["Elenco", "/carreira/elenco"], ["Jogos", "/carreira/jogos"], ["Mais", "/carreira/mais"]]), JSON.stringify(tabs));

  // 2) Jogos.
  await v2.locator(".tabbar .tab", { hasText: "Jogos" }).click();
  await v2.waitForURL(/\/carreira\/jogos$/);
  const jogos = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, rows: [...document.querySelectorAll(".hb-row")].map((r) => [r.querySelector(".row-title").textContent, r.getAttribute("href")]),
    current: document.querySelector('.tabbar [aria-current="page"]')?.textContent.trim() }));
  await v2.setViewportSize({ width: 360, height: 780 }); sizes.jogos = await small(); await v2.setViewportSize({ width: 390, height: 844 });
  await v2.locator(".hb-row", { hasText: "Calendário" }).click();
  await v2.waitForURL(/\/carreira\/calendario$/);
  check("2) Jogos: Calendário e Tabela da v2; Copa do Brasil e Estatísticas pela versão anterior (↗); aba Jogos ativa; Calendário abre:",
    jogos.h1 === "Seus jogos." && jogos.current === "Jogos" && JSON.stringify(jogos.rows) === JSON.stringify([["Calendário", "/carreira/calendario"], ["Tabela", "/carreira/tabela"], ["Copa do Brasil", "/carreira-old#copa"], ["Estatísticas", "/carreira-old#estatisticas"]]),
    JSON.stringify(jogos));

  // 3) Clube.
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home");
  await v2.click('.home a.row[href$="/clube"]');
  await v2.waitForURL(/\/carreira\/clube$/);
  const clube = await v2.evaluate(() => ({ h1: document.querySelector("h1").textContent, secs: [...document.querySelectorAll(".hb-k")].map((k) => k.textContent),
    rows: [...document.querySelectorAll(".hb-row .row-title")].map((t) => t.textContent) }));
  await v2.setViewportSize({ width: 360, height: 780 }); sizes.clube = await small(); await v2.setViewportSize({ width: 390, height: 844 });
  await v2.locator(".hb-row", { hasText: "Diretoria" }).click();
  await v2.waitForURL(/\/carreira\/diretoria$/);
  await v2.click(".cal-foot .link-back");
  await v2.waitForURL(/\/carreira\/clube$/);
  await v2.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home");
  await v2.click(".home-head .home-club");
  await v2.waitForURL(/\/carreira\/clube$/);
  check("3) Clube: aberta pela linha e pelo escudo do Início; Gestão / Elenco e mercado / Estrutura; Diretoria → 'Voltar ao clube' volta para a tela Clube:",
    clube.h1 === "Seu clube." && clube.secs.join("|") === "Gestão|Elenco e mercado|Estrutura" && clube.rows.includes("Diretoria") && clube.rows.includes("Finanças") && clube.rows.includes("Mercado") && clube.rows.includes("Estádio"),
    JSON.stringify(clube));

  // 4) Mais.
  await v2.locator(".tabbar .tab", { hasText: "Mais" }).click();
  await v2.waitForURL(/\/carreira\/mais$/);
  const mais = await v2.evaluate(() => [...document.querySelectorAll(".hb-row .row-title")].map((t) => t.textContent));
  await v2.setViewportSize({ width: 360, height: 780 }); sizes.mais = await small(); await v2.setViewportSize({ width: 390, height: 844 });
  await v2.locator(".hb-row", { hasText: "Sair" }).click();
  await v2.waitForSelector(".ac-form", { timeout: 15000 });
  const me = await v2.evaluate(async () => (await (await fetch("/api/auth/me")).json()).authenticated);
  check("4) Mais: os 9 itens da prancha, na ordem; 'Sair' encerra a sessão e mostra o login da v2:",
    mais.join("|") === "Perfil do treinador|Conquistas|Premiações|Ranking|Loja|Configurações|Central de ajuda|Saves|Sair" && me === false && new URL(v2.url()).pathname.startsWith("/carreira"),
    JSON.stringify({ mais, me, url: v2.url() }));

  // 6) 360 px.
  check("6) Jogos, Clube e Mais em 360 px sem rolagem horizontal e alvos ≥ 44 px:", Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0), JSON.stringify(sizes));

  await browser.close();
})();
