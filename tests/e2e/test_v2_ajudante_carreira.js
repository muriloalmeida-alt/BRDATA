// Ajudante de testes da carreira oficial (_v2_carreira.js): cria conta e
// carreira só pela v2, sem a tela antiga (descontinuada em 09/11), e chega
// ao Início. É o caminho para testes novos de tela.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { novaCarreiraV2, saveNoServidor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  page.on("dialog", (d) => d.dismiss());
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));

  const save = await novaCarreiraV2(page, `v2ajudante${Date.now()}@teste.com`, { clube: 1 });
  const home = await page.evaluate(() => ({ home: !!document.querySelector(".home"), path: location.pathname }));
  check("1) Cria conta e carreira só pela v2 e chega ao Início, com o save no servidor:",
    home.home && save && save.clubId && Array.isArray(save.squad) && save.squad.length > 0, JSON.stringify({ ...home, clube: save && save.clubId }));
  check("2) Sem abrir a tela antiga (nenhum acesso a /carreira.html ou /carreira-old):",
    !urls.some((u) => /\/carreira\.html|\/carreira-old/.test(u)), urls.filter((u) => /carreira\.html|carreira-old/.test(u)).slice(0, 3).join(" "));
  const depois = await saveNoServidor(page);
  check("3) O save segue o mesmo depois de chegar ao Início (nada se perde no caminho):", depois && depois.clubId === save.clubId);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
