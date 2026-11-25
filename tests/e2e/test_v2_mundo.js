// MUNDO-001, M10d (25/11/2026) — liberação do mundo, só pela v2 (navegador).
//  1) Novo save: com o mundo ligado no servidor (padrão desde a M10d), a tela de
//     competição mostra os países (Brasil primeiro) e as divisões do país escolhido;
//  2) Argentina → Liga Profesional → clube → treinador: a carreira nasce no país
//     (divisões da Argentina, 32 rodadas) e o Início mostra o nome da liga;
//  3) o índice do mundo fica guardado no aparelho (IndexedDB) com a versão do
//     servidor, e os elencos das ligas do país também;
//  4) sem rede, a carreira do mundo abre a frio no Início (o índice vem do
//     aparelho);
//  5) aba Jogos: "Ligas do mundo" e a tela abre com uma tabela;
//  6) sem erro na página; 360 px sem rolagem horizontal na escolha do país.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, contaNova, ateOInicio, saveNoServidor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));

  await contaNova(page, `v2mundo${Date.now()}@teste.com`);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ac-countries .ac-chip", { timeout: 60000 });
  const paises = await page.locator(".ac-countries .ac-chip").allTextContents();
  const ov360 = await (async () => {
    await page.setViewportSize({ width: 360, height: 780 });
    const v = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.setViewportSize({ width: 390, height: 844 });
    return v;
  })();
  check("1) A escolha do novo save mostra os países (Brasil primeiro) e as divisões do país:", paises.length === 11 && paises[0] === "Brasil" && paises.includes("Argentina"), JSON.stringify(paises));

  await page.locator(".ac-countries .ac-chip", { hasText: "Argentina" }).click();
  const divisoes = await page.locator(".ac-opt b").allTextContents();
  await page.locator(".ac-opt").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-club", { timeout: 60000 });
  await page.locator(".ac-club").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-clubline", { timeout: 30000 });
  await page.click(".ac-form .cta");
  await page.waitForURL(/\/nova\/pronto$/, { timeout: 120000 });
  await ateOInicio(page);
  const save = await saveNoServidor(page);
  const sub = await page.locator(".home-sub").textContent().catch(() => "");
  check("2) A carreira nasce na Argentina (divisões do país, 32 rodadas) e o Início mostra a liga:",
    divisoes.length === 2 && save && !!save.mundo && save.divisoes && save.divisoes[0] === "arg_liga_profesional" && save.rodadasLiga === 32 && /Liga Profesional/i.test(sub || ""),
    JSON.stringify({ divisoes, divs: save && save.divisoes, rod: save && save.rodadasLiga, sub }));

  const idb = await page.evaluate(async () => {
    const abrir = () => new Promise((ok, falha) => { const r = indexedDB.open("brdata-carreira"); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); });
    const db = await abrir().catch(() => null);
    if (!db) return { semBanco: true, nomes: (await indexedDB.databases()).map((d) => d.name) };
    const lojas = [...db.objectStoreNames];
    const ler = (loja, chave) => new Promise((ok) => { const t = db.transaction(loja, "readonly").objectStore(loja).get(chave); t.onsuccess = () => ok(t.result); t.onerror = () => ok(null); });
    const loja = lojas.find((l) => /perfil/i.test(l)) || lojas[0];
    const ind = await ler(loja, "mundo:indice");
    const el = await ler(loja, "mundo:elencos:arg_liga_profesional");
    return { lojas, versao: ind && ind.dados && ind.dados.versao, paises: ind && ind.dados && ind.dados.paises && ind.dados.paises.length, elencos: el && el.dados && Object.keys(el.dados.playersByTeamId || {}).length };
  });
  const servidor = await page.evaluate(async () => (await (await fetch("/api/career/mundo")).json()).versao);
  check("3) O índice do mundo fica no aparelho (versão do servidor) e os elencos da liga do país também:", idb.versao && idb.versao === servidor && idb.paises === 10 && idb.elencos === 30, JSON.stringify({ ...idb, servidor }));

  await ctx.setOffline(true);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" }).catch(() => {});
  const abriu = await page.waitForSelector(".home", { timeout: 60000 }).then(() => true).catch(() => false);
  const subOff = abriu ? await page.locator(".home-sub").textContent().catch(() => "") : "";
  check("4) Sem rede, a carreira do mundo abre a frio no Início (índice do aparelho):", abriu && /Liga Profesional/i.test(subOff || ""), JSON.stringify({ abriu, subOff }));
  await ctx.setOffline(false);

  await page.goto(base + "/jogos", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hb", { timeout: 60000 });
  const temLigas = await page.locator(".row-title", { hasText: "Ligas do mundo" }).count();
  await page.goto(base + "/mundo", { waitUntil: "domcontentloaded" });
  const tabela = await page.waitForSelector(".gm-table tbody tr", { timeout: 60000 }).then(() => true).catch(() => false);
  check("5) Aba Jogos com 'Ligas do mundo' e a tela abre com uma tabela:", temLigas === 1 && tabela, JSON.stringify({ temLigas, tabela }));

  check("6) Sem erro na página e 360 px sem rolagem horizontal na escolha do país:", erros.length === 0 && ov360 <= 0, JSON.stringify({ erros: erros.slice(0, 3), ov360 }));
  await browser.close();
})();
