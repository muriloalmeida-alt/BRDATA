// Decisões do Murilo (12/11/2026), trazendo para a v2 dois recursos da tela
// antiga:
// 1) nos lances da partida encerrada, o nome do jogador (gol, cartão,
//    lesão) é link: o seu abre a ficha; o do adversário, o perfil no Mercado
//    — pela confirmação de saída do Resultado ("Sair e ver …");
// 2) no Elenco, a linha de cada jovem da base mostra a faixa de potencial do
//    olheiro ("pot. …").
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, playV2MatchToEnd, continueToHome, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `nomeslances${Date.now()}@teste.com`);

  // 2) Elenco: a linha do jovem da base traz "pot." com a faixa.
  await page.goto(base + "/elenco", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sq-base", { timeout: 20000 });
  const linhasBase = await page.evaluate(() => [...document.getElementById("sq-base").closest("section").querySelectorAll(".sq-row")].map((a) => ({ texto: a.textContent, aria: a.getAttribute("aria-label") })));
  const comPot = linhasBase.filter((l) => /pot\. \d+(–\d+)?$/.test(l.texto));
  const totalComPot = await page.evaluate(() => [...document.querySelectorAll(".sq-row")].filter((a) => /pot\./.test(a.textContent)).length);
  const principal = totalComPot !== comPot.length; // alguma linha fora da base com "pot."
  check("2) Elenco: a linha do jovem da base mostra a faixa do olheiro (\"pot.\"), também no texto lido pelo leitor de tela; o elenco principal não:",
    comPot.length > 0 && comPot.every((l) => /potencial estimado/.test(l.aria)) && !principal, JSON.stringify({ base: linhasBase.length, comPot: comPot.length, totalComPot, exemplo: comPot[0] }));

  // 1) Lances: joga até haver um lance com nome (gol, cartão ou lesão).
  let link = null;
  for (let tentativa = 0; tentativa < 3 && !link; tentativa++) {
    await playV2MatchToEnd(page);
    await page.click(".rs-links a[href$='tela=lances']");
    await page.waitForSelector(".ev-list", { timeout: 10000 });
    link = await page.evaluate(() => {
      const b = document.querySelector(".ev-list .ev-player");
      return b ? { nome: b.textContent, aria: b.getAttribute("aria-label") } : null;
    });
    if (!link) { await page.click(".pz-foot .link-back"); await page.waitForSelector(".rs-title", { timeout: 10000 }); await continueToHome(page); }
  }
  if (!link) throw new Error("nenhum lance com jogador em 3 partidas");
  const meu = /ver ficha/.test(link.aria);
  await page.click(".ev-list .ev-player >> nth=0");
  await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const sheet = await page.evaluate(() => ({ titulo: document.querySelector("#lv-t").textContent, sair: document.querySelector('[role="alertdialog"] .text-btn').textContent }));
  await page.click('[role="alertdialog"] .text-btn');
  await page.waitForURL(meu ? /\/elenco\/ficha\?id=/ : /\/mercado\/alvo\?clube=/, { timeout: 20000 });
  await page.waitForSelector(".cal-foot .cta", { timeout: 20000 });
  const destino = await page.evaluate(() => ({ url: location.pathname + location.search, h1: (document.querySelector("h1") || {}).textContent }));
  check("1) No lance da partida encerrada, o nome do jogador é link: pede confirmação (\"Sair e ver …\") e abre a ficha (seu) ou o perfil no Mercado (adversário):",
    sheet.titulo === "Sair do resultado?" && sheet.sair === `Sair e ver ${link.nome}` && (meu ? destino.url.startsWith("/elenco/ficha?id=") : destino.url.startsWith("/mercado/alvo?clube=") && destino.h1 === "Conheça seu reforço."),
    JSON.stringify({ link, sheet, destino }));

  check("3) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
