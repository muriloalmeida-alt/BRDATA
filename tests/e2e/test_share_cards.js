// Compartilhar como imagem (item 4 da lista de melhorias), na carreira
// oficial (v2): o cartão é desenhado num canvas e vai pelo Web Share API,
// ou é baixado como PNG quando o navegador não compartilha arquivo (caso do
// Chromium headless).
// L6a (sem a tela antiga):
//  2) Conquista desbloqueada: o detalhe tem "Compartilhar" e gera um PNG.
//     Conquista bloqueada não tem o botão.
// O "Compartilhar título" (item 3 antigo) está em test_v2_onboarding (item
// 5). O "Compartilhar" do resultado da rodada (item 1 antigo) não existe na
// v2: ver ENTREGA_TESTES_L6.md (lacuna em aberto).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, noMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await carreiraV2(page, `share${Date.now()}@teste.com`);

  // Bloqueada: sem botão.
  await page.goto(base + "/conquistas", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-badge", { timeout: 30000 });
  await page.locator(".mo-badge", { hasText: "Joia da Base" }).click();
  await page.waitForSelector("#ac-t");
  const bloqueada = await page.evaluate(() => !!document.querySelector('[role="dialog"] .sp-sheet-cta'));
  await page.click('[role="dialog"] .text-btn');

  // Desbloqueia pela regra do motor (5 revelados da base).
  await noMotor(page, async (M) => {
    M.CAREER.finances.wageCap = Math.max(M.CAREER.finances.wageCap, 1e9);
    for (const p of M.CAREER.squad.filter((x) => x.origin === "base").slice(0, 5)) await M.ponte.acaoJogador(p.id, "promote");
    return M.persistir();
  });
  await page.goto(base + "/conquistas", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mo-badge", { timeout: 30000 });
  await page.evaluate(() => { try { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); } catch (_) { /* já ausente */ } });
  await page.locator(".mo-badge", { hasText: "Joia da Base" }).click();
  await page.waitForSelector("#ac-t");
  const dl = page.waitForEvent("download", { timeout: 15000 });
  await page.click('[role="dialog"] .sp-sheet-cta');
  const d = await dl;
  const arq = await d.path();
  const head = arq ? require("fs").readFileSync(arq).subarray(0, 8).toString("hex") : null;
  await page.waitForSelector(".pr-ok", { timeout: 10000 }).catch(() => {});
  const aviso = await page.evaluate(() => ((document.querySelector(".pr-ok") || {}).textContent || ""));
  check("2) Conquista desbloqueada mostra 'Compartilhar' e gera um PNG de verdade (bloqueada não mostra o botão):",
    !bloqueada && d.suggestedFilename() === "conquista-ach_joia_base.png" && head === "89504e470d0a1a0a" && /Imagem baixada/.test(aviso),
    JSON.stringify({ bloqueada, arquivo: d.suggestedFilename(), head, aviso }));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
