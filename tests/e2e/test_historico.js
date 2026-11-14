// Página estática do histórico de atualizações (public/historico.html) —
// lote L4d, sem a tela antiga. HISTORICO-LINK (decisão do Murilo, 14/11): a
// página abre pelo Mais da v2 ("Histórico de atualizações", item 0) e o
// "Voltar" leva ao Início da v2 (item 5).
//  0) Mais da v2 → "Histórico de atualizações" abre a página.
//  1) Carrega com as 22 versões, a mais recente primeiro (v2.11).
//  2) Clicar numa versão abre a modal com a versão, o título e os itens.
//  3) "Fechar" fecha a modal.
//  4) A v1.0 mostra os 11 itens dela.
//  5) "Voltar" leva ao Início da v2 ("/").
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // 0) Pelo Mais da v2.
  await newCareer(page, `historico${Date.now()}@teste.com`);
  await page.goto(base + "/mais", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hb-row", { timeout: 30000 });
  await page.locator("a.hb-row", { hasText: "Histórico de atualizações" }).click();
  await page.waitForSelector(".version-card", { timeout: 30000 });
  check("0) Mais da v2 → 'Histórico de atualizações' abre a página:", new URL(page.url()).pathname === "/historico.html", page.url().replace(base, ""));

  // 1) Lista de versões.
  const cards = await page.evaluate(() => [...document.querySelectorAll(".version-card .version-tag")].map((el) => el.textContent));
  check("1) 22 versões listadas, mais recente primeiro (v2.11):", cards.length === 22 && cards[0] === "v2.11", JSON.stringify(cards));

  // 2) Modal da 1ª versão.
  await page.click(".version-card:nth-child(1)");
  await page.waitForFunction(() => document.getElementById("versionOverlay").classList.contains("open"), null, { timeout: 5000 }).catch(() => {});
  const modal = await page.evaluate(() => ({
    aberta: document.getElementById("versionOverlay").classList.contains("open"),
    tag: document.getElementById("modalVersionTag").textContent,
    titulo: document.getElementById("modalTitle").textContent,
    itens: document.querySelectorAll("#modalItems li").length,
  }));
  check("2) A modal abre com a versão, o título e os itens certos:", modal.aberta && modal.tag === "v2.11" && !!modal.titulo && modal.itens === 5, JSON.stringify(modal));

  // 3) Fechar.
  await page.click("#modalCloseFooter");
  await page.waitForFunction(() => !document.getElementById("versionOverlay").classList.contains("open"), null, { timeout: 5000 }).catch(() => {});
  const fechou = await page.evaluate(() => !document.getElementById("versionOverlay").classList.contains("open"));
  check("3) A modal fecha ao clicar em 'Fechar':", fechou);

  // 4) v1.0.
  await page.click(".version-card:nth-child(22)");
  await page.waitForFunction(() => document.getElementById("modalVersionTag").textContent === "v1.0", null, { timeout: 5000 }).catch(() => {});
  const v10 = await page.evaluate(() => ({ tag: document.getElementById("modalVersionTag").textContent, itens: document.querySelectorAll("#modalItems li").length }));
  check("4) A v1.0 mostra os 11 itens dela:", v10.tag === "v1.0" && v10.itens === 11, JSON.stringify(v10));

  // 5) Voltar.
  await page.click("#modalClose");
  await page.click("#btnBack");
  const noInicio = await page.waitForSelector(".home", { timeout: 30000 }).then(() => true).catch(() => false);
  check("5) 'Voltar' leva ao Início da v2:", noInicio && new URL(page.url()).pathname === "/", page.url().replace(base, ""));

  check("6) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
