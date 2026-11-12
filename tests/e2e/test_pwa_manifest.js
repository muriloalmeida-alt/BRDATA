// Verifica o manifest e as tags PWA da carreira (a v2, na raiz) sem
// afetar o manifest/instalação do site principal.
const { chromium } = require("playwright-core");
const { check } = require("./_check");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  // 1) A carreira (a v2, na raiz) referencia o manifest PRÓPRIO, não o do
  // site principal, com as tags de ícone e cor. (Antes conferia o
  // carreira.html, que não é mais aberto: lote L2 do plano "testes sem a
  // tela antiga".)
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const headInfo = await page.evaluate(() => ({
    manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute("href") || null,
    appleTouchIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
    themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
  }));
  check("1) A v2 (raiz) referencia /manifest-treinador.json (próprio, não o do site), com apple-touch-icon e theme-color:",
    headInfo.manifestHref === "/manifest-treinador.json" && !!headInfo.appleTouchIcon && !!headInfo.themeColor, JSON.stringify(headInfo));

  // 2) O manifest resolve de verdade (fetch real, o mesmo que o Chrome
  // faz pra montar a modal de instalação) com nome/ícones certos.
  const manifestUrl = new URL(headInfo.manifestHref, base + "/").href;
  const manifestRes = await page.evaluate(async (url) => {
    const res = await fetch(url);
    return { ok: res.ok, contentType: res.headers.get("content-type"), body: await res.json() };
  }, manifestUrl);
  check("2) manifest-treinador.json responde 200:", manifestRes.ok);
  console.log("   name/short_name = 'BR Treinador':", manifestRes.body.name === "BR Treinador" && manifestRes.body.short_name === "BR Treinador");
  // Fase 11: o app instalado abre a v2 (raiz); o id continua o mesmo para
  // quem já instalou não ganhar um 2º ícone.
  check("2b) start_url abre a v2 na raiz e o id continua /carreira.html:", manifestRes.body.start_url === "/?source=pwa" && manifestRes.body.id === "/carreira.html", JSON.stringify({ start_url: manifestRes.body.start_url, id: manifestRes.body.id }));
  console.log("   tem ícone maskable de 512 (brasão em destaque, área de segurança do Android):", manifestRes.body.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"));
  console.log("   tem ícone 'any' de 192 e 512:", manifestRes.body.icons.some((i) => i.purpose === "any" && i.sizes === "192x192") && manifestRes.body.icons.some((i) => i.purpose === "any" && i.sizes === "512x512"));

  // 3) Todos os ícones referenciados no manifest realmente existem
  // (200, não 404) -- um manifest com ícone quebrado não instala.
  const iconChecks = await page.evaluate(async (icons) => {
    const results = [];
    for (const icon of icons) {
      const res = await fetch(icon.src);
      results.push({ src: icon.src, ok: res.ok, status: res.status });
    }
    return results;
  }, manifestRes.body.icons);
  check("3) Todos os ícones do manifest existem (200):", iconChecks.every((r) => r.ok), JSON.stringify(iconChecks.filter((r) => !r.ok)));

  // 4) O manifest do site PRINCIPAL continua intacto (não foi
  // mexido/sobrescrito por engano).
  await page.goto(base + "/brasileirao", { waitUntil: "domcontentloaded" });
  const mainManifestHref = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute("href"));
  const mainManifest = await page.evaluate(async () => (await (await fetch("/manifest.json")).json()));
  check("4) index.html continua referenciando manifest.json (não mudou):", mainManifestHref === "manifest.json");
  console.log("   manifest.json do site principal continua 'BR Data' (intacto):", mainManifest.name === "BR Data — Brasileirão 2026" && mainManifest.short_name === "BR Data");
  check("5) o app do site abre em /brasileirao:", mainManifest.start_url === "/brasileirao?source=pwa", mainManifest.start_url);


  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
