// APP-VERSION-001 — toast de "versão nova" do Modo Técnico. Cobre: a
// versão carregada vem embutida no HTML (marcador substituído pelo
// servidor nas 2 rotas, /carreira e /carreira.html) e bate com GET
// /api/version; sem mudança de versão nenhum aviso aparece; com o
// servidor anunciando outra versão (rota simulada) o aviso aparece,
// fica na tela (não some sozinho), volta depois de outro toast tomar o
// lugar, some durante partida ao vivo e, ao toque, recarrega a página.
const { chromium } = require("playwright-core");
const { check } = require("./_check");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";

  const api = await (await fetch(base + "/api/version")).json();
  check("1) GET /api/version responde uma versão:", typeof api.version === "string" && api.version.length > 0, JSON.stringify(api));
  for (const route of ["/carreira", "/carreira.html"]) {
    const html = await (await fetch(base + route)).text();
    const m = html.match(/<meta name="brdata-version" content="([^"]*)">/);
    check(`2) ${route} embute a versão servida (marcador substituído):`, !!m && m[1] === api.version, m && m[1]);
  }

  let fakeVersion = null; // null = repassa pro servidor de verdade
  await page.route("**/api/version", (route) => fakeVersion
    ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ version: fakeVersion, commit: fakeVersion }) })
    : route.continue());

  await page.goto(base + "/carreira.html", { waitUntil: "load" });
  await page.waitForFunction(() => typeof LOADED_APP_VERSION !== "undefined" && LOADED_APP_VERSION !== null, null, { timeout: 15000 });
  await page.evaluate(() => checkAppVersion());
  const state = () => page.evaluate(() => {
    const el = document.getElementById("toast");
    return { visible: el.style.display === "flex", kind: el.dataset.kind, title: el.querySelector(".ct-toast-title")?.textContent || "", flag: appUpdateAvailable };
  });
  let s = await state();
  check("3) Mesma versão no servidor -> nenhum aviso:", !s.flag && s.kind !== "update", JSON.stringify(s));

  fakeVersion = "deadbeef0000";
  await page.evaluate(() => checkAppVersion());
  s = await state();
  check("4) Versão diferente no servidor -> aviso de versão nova:", s.flag && s.visible && s.kind === "update" && /nova versão/i.test(s.title), JSON.stringify(s));

  await page.waitForTimeout(4000); // > 3600ms do toast comum
  s = await state();
  check("5) Aviso não some sozinho (fica até o toque):", s.visible && s.kind === "update");

  await page.evaluate(() => toast("Treino aplicado", { durationMs: 400 }));
  s = await state();
  check("6) Outro toast toma o lugar temporariamente:", s.visible && s.kind === "" && s.title === "Treino aplicado");
  await page.waitForTimeout(700);
  s = await state();
  check("7) ...e o aviso de versão volta quando ele sai:", s.visible && s.kind === "update");

  await page.evaluate(() => { LIVE_MATCH = { fake: true }; checkAppVersion(); });
  s = await state();
  check("8) Partida ao vivo em andamento -> aviso escondido (toque não pode recarregar no meio do jogo):", !s.visible);
  await page.evaluate(() => { LIVE_MATCH = null; checkAppVersion(); });
  s = await state();
  check("9) Partida acabou -> aviso volta no próximo ciclo:", s.visible && s.kind === "update");

  await page.evaluate(() => { window.__antesDoReload = true; });
  await Promise.all([page.waitForEvent("load", { timeout: 15000 }), page.click("#toast")]);
  const reloaded = await page.evaluate(() => window.__antesDoReload !== true);
  check("10) Toque no aviso recarrega a página:", reloaded);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
