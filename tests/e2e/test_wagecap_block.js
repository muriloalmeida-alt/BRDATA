// Teto salarial: promover um jogador da base que estoura o teto é bloqueado.
// Lote L3c (12/11/2026, plano "testes sem a tela antiga"): antes pelo
// detalhe da tela antiga (botão [data-act="promote"] desativado), sem
// verificação (só imprimia). Agora pela ficha da v2: "Promover ao elenco
// principal" com o teto em 1 mostra o motivo e o jogador continua na base.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `wagecap${Date.now()}@teste.com`);

  // Teto salarial artificialmente baixo (impossível promover qualquer um).
  const baseId = await noMotor(page, async ({ CAREER, persistir }) => {
    CAREER.finances.wageCap = 1;
    await persistir();
    return CAREER.squad.find((p) => p.origin === "base").id;
  });
  await page.goto(base + `/elenco/ficha?id=${encodeURIComponent(baseId)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".cal-foot .cta", { timeout: 20000 });
  await page.locator("button.pr-row", { hasText: "Promover ao elenco principal" }).click();
  await page.waitForSelector(".cal-foot .inline-error", { timeout: 20000 });
  const motivo = await page.textContent(".cal-foot .inline-error");
  const s = await saveNoServidor(page);
  const p = s.squad.find((x) => x.id === baseId);
  check("1) Promover da base estourando o teto salarial é bloqueado, com o motivo, e o jogador continua na base:",
    /teto salarial/.test(motivo) && !!p && p.origin === "base", JSON.stringify({ motivo, origin: p && p.origin }));

  check("2) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
