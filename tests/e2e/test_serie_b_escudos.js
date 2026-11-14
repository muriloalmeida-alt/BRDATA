// Escudos da Série B (dados de exemplo, servidor sem API) — lote L4d, sem a
// tela antiga. Antes: na escolha de clube da tela antiga, 11 clubes com escudo
// real e 9 no monograma. Desde a ESCUDOS-001 (PR #115) os 20 clubes de
// exemplo da Série B têm escudo local (/img/teams). Com dados reais, os
// escudos das 3 divisões estão no test_v2_dados_reais.
//  1) Escolha de clube da v2 (Série B): os 20 clubes, todos com o escudo
//     local carregado (sem imagem quebrada), sobre a chapinha clara.
//  2) Carreira no 1º clube da lista: o Início mostra os escudos (o do clube e o do
//     adversário do próximo jogo) do próprio jogo, carregados.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { contaNova, carreiraV2, ateOInicio, pularPreTemporada, base } = require("./_v2_carreira");

const escudos = (page, sel) => page.evaluate(async (sel) => {
  const imgs = [...document.querySelectorAll(`${sel} img`)];
  await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  return imgs.map((i) => ({ src: i.getAttribute("src"), ok: i.naturalWidth > 0, chapinha: !!i.closest(".crest-plate") }));
}, sel);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));

  // 1) Escolha de clube.
  await contaNova(page, `serieb-escudos${Date.now()}@teste.com`);
  await page.goto(base + "/nova/clube?comp=serie_b", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ac-club", { timeout: 40000 });
  const clubes = await page.evaluate(() => [...document.querySelectorAll(".ac-club")].map((c) => c.querySelector("b").textContent));
  const e1 = await escudos(page, ".ac-club");
  check("1) Escolha de clube (Série B): 20 clubes, todos com o escudo local carregado, sobre a chapinha:",
    clubes.length === 20 && e1.length === 20 && e1.every((e) => /^\/img\/teams\//.test(e.src) && e.ok && e.chapinha),
    JSON.stringify(e1.filter((e) => !/^\/img\/teams\//.test(e.src) || !e.ok || !e.chapinha)));

  // 2) Carreira no 1º clube da lista (o mesmo escudo da escolha).
  await page.context().clearCookies();
  await carreiraV2(page, `serieb-escudos2${Date.now()}@teste.com`, { competicao: "serie_b" } /* o 1º da lista, como na escolha */);
  await pularPreTemporada(page);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await ateOInicio(page);
  const e2 = await escudos(page, ".home");
  check("2) Carreira no 1º clube da lista: o Início mostra o escudo do clube (o mesmo da escolha) e o do adversário, do próprio jogo, carregados:",
    e2.length >= 2 && e2.every((e) => /^\/img\/teams\//.test(e.src) && e.ok) && e2.some((e) => e.src === e1[0].src) && new Set(e2.map((e) => e.src)).size >= 2, JSON.stringify(e2));

  check("3) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
