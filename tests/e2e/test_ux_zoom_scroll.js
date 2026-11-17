// Zoom bloqueado no celular (pedido antigo do Murilo, mantido para a v2 em
// 16/11, lote L6b: "Bloquear zoom"). A tela antiga já bloqueava; a v2 passa
// a bloquear igual.
//  1) A página da v2 (/) bloqueia zoom: maximum-scale=1 e user-scalable=no.
//  1b) touch-action: manipulation no body (sem zoom de toque duplo).
//  1c) O histórico de atualizações (historico.html) também bloqueia.
// O reset de rolagem ao trocar de tela da tela antiga (item 2 antigo) é da
// navegação da v2: test_v2_navegacao.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#root", { timeout: 20000 });
  const t = await page.evaluate(async () => ({
    vp: document.querySelector('meta[name="viewport"]').content,
    v2: !!document.querySelector("#root"),
    touch: getComputedStyle(document.body).touchAction,
    hist: await (await fetch("/historico.html")).text(),
  }));
  check("1) A página da v2 bloqueia zoom (maximum-scale=1, user-scalable=no):", t.v2 && t.vp.includes("maximum-scale=1.0") && t.vp.includes("user-scalable=no"), t.vp);
  check("1b) touch-action: manipulation no body:", t.touch === "manipulation", t.touch);
  check("1c) historico.html também bloqueia zoom:", /maximum-scale=1\.0/.test(t.hist) && /user-scalable=no/.test(t.hist));
  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
