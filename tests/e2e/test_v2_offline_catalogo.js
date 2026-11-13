// OFFLINE-001 (13/11/2026) — carreira criada SEM REDE nasce com os clubes e
// elencos do servidor (decisão 3 do Murilo: cópia gerada no deploy e
// versionada). Perfil de servidor "frozen" (catálogo real congelado, como
// em produção com dados reais). Pela v2, sem a tela antiga:
//  1) /api/career/catalogo-offline: versão estável; com a mesma versão, só
//     { atual: true }; sem sessão, 401.
//  2) Ao entrar (com rede), o catálogo fica guardado no aparelho.
//  3) Sem rede, a escolha de clube lista os clubes reais do catálogo.
//  4) Sem rede, a carreira é criada com dados reais (modo real) e o elenco
//     do clube é o do catálogo; nada vai ao servidor até a rede voltar.
//  5) Com a rede de volta, a cópia vai ao servidor.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, contaNova, saveNoServidor, saveNoAparelho } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));

  // 1) Rota do catálogo.
  const semSessao = await page.request.get(base + "/api/career/catalogo-offline");
  await contaNova(page, `v2offcat${Date.now()}@teste.com`);
  const rota = await page.evaluate(async () => {
    const a = await (await fetch("/api/career/catalogo-offline", { cache: "no-store" })).json();
    const b = await (await fetch(`/api/career/catalogo-offline?versao=${a.versao}`, { cache: "no-store" })).json();
    const comp = a.competicoes && a.competicoes.brasileirao;
    return { versao: a.versao, hasKey: a.hasKey, times: comp ? comp.teams.length : 0, tabela: comp ? comp.standings.length : 0, jogadores: Object.keys(a.jogadores || {}).length, atual: b.atual === true && !b.competicoes };
  });
  check("1) /api/career/catalogo-offline: dados reais (20 clubes, tabela e elencos), com a mesma versão só { atual: true }, sem sessão 401:",
    semSessao.status() === 401 && rota.hasKey && rota.times === 20 && rota.tabela === 20 && rota.jogadores === 20 && /^[0-9a-f]{16}$/.test(rota.versao) && rota.atual, JSON.stringify(rota));

  // 2) Entra (com rede): o catálogo fica no aparelho; service worker no controle.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  const lerCatalogo = () => page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open("brdata-carreira"); q.onsuccess = () => r(q.result); });
    const c = await new Promise((r) => { const q = db.transaction("perfil").objectStore("perfil").get("catalogo"); q.onsuccess = () => r(q.result); });
    db.close();
    return c ? c.dados : null;
  });
  let cat = null;
  for (let i = 0; i < 40 && !(cat = await lerCatalogo()); i++) await page.waitForTimeout(250);
  check("2) Com rede, o catálogo (mesma versão da rota) fica guardado no aparelho:", !!cat && cat.versao === rota.versao, JSON.stringify({ versao: cat && cat.versao }));

  // 3) Sem rede: a escolha de clube lista os clubes reais do catálogo.
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await page.locator(".ac-opt").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-club", { timeout: 40000 });
  const clubes = await page.evaluate(() => [...document.querySelectorAll(".ac-club")].map((c) => c.textContent));
  const nomesCat = cat.competicoes.brasileirao.teams.map((t) => t.name);
  const todosDoCatalogo = clubes.length === 20 && nomesCat.every((n) => clubes.some((c) => c.includes(n)));
  check("3) Sem rede, a escolha de clube lista os 20 clubes reais do catálogo:", todosDoCatalogo, JSON.stringify({ n: clubes.length, faltam: nomesCat.filter((n) => !clubes.some((c) => c.includes(n))) }));

  // 4) Sem rede: cria a carreira com o 1º clube.
  await page.locator(".ac-club").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-clubline", { timeout: 20000 });
  await page.click(".ac-form .cta");
  const criou = await page.waitForURL(/\/nova\/pronto$/, { timeout: 90000 }).then(() => true, () => false);
  const ap = await saveNoAparelho(page);
  const save = ap && ap.save;
  const elencoCat = save ? (cat.jogadores[`brasileirao:${save.clubId}`] || []).map((p) => p.name) : [];
  const nomesElenco = save ? save.squad.map((p) => p.name) : [];
  const doCatalogo = elencoCat.length > 0 && elencoCat.filter((n) => nomesElenco.includes(n)).length >= Math.min(11, elencoCat.length);
  check("4) Sem rede, a carreira nasce com os dados reais (modo real) e o elenco do clube vem do catálogo:",
    criou && !!save && save.liveMode === true && nomesCat.includes(save.clubName) && doCatalogo,
    JSON.stringify({ criou, clube: save && save.clubName, liveMode: save && save.liveMode, elencoCat: elencoCat.slice(0, 5), elenco: nomesElenco.slice(0, 5) }));

  // 5) Rede de volta: a cópia vai ao servidor.
  await ctx.setOffline(false);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.querySelector(".home, .ob-skip, .wz-skip, .rw-foot, .ac-foot"), null, { timeout: 40000 });
  await page.waitForTimeout(1000);
  const sv = await saveNoServidor(page);
  check("5) Com a rede de volta, a carreira criada offline chega ao servidor:", !!sv && sv.clubId === save.clubId && sv.liveMode === true, JSON.stringify({ servidor: sv && sv.clubName }));

  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
