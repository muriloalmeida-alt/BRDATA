/* Fase 2 (acesso) — capturas reais das telas para o comparativo com as
   pranchas 03_acesso, 04_inicio_carreira e 20/21 (pacote complementar).
   Uso: node tools/capture/capture-v2-acesso.js <baseUrl> <saída> [w×h] */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "../../tests/e2e/node_modules/playwright-core"));

const base = process.argv[2] || "http://localhost:8787";
const out = process.argv[3] || "/tmp/v2acesso";
const [W, H] = (process.argv[4] || "390x844").split("x").map(Number);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const shot = async (name) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, `${name}.png`) }); console.log("ok", name); };
  const email = `cap_acesso_${Date.now()}@teste.com`;
  await p.goto(base + "/privacidade.html");
  await p.evaluate(async (email) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/logout", { method: "POST" });
  }, email);
  // Abertura: segura o /api/auth/me para fotografar a tela de carga.
  let hold = true;
  await p.route("**/api/auth/me", async (r) => { while (hold) await new Promise((res) => setTimeout(res, 100)); r.continue(); });
  await p.goto(base + "/carreira/", { waitUntil: "domcontentloaded" });
  await p.waitForSelector(".ac-splash"); await shot("01-abertura");
  hold = false; await p.unroute("**/api/auth/me");
  await p.waitForSelector(".ac-form"); await shot("02-login");
  await p.fill('input[type="email"]', email); await p.fill('input[type="password"]', "senha123");
  await p.click('.ac-form button[type="submit"]');
  await p.waitForSelector(".ac-opt", { timeout: 40000 });
  await p.locator(".ac-opt").first().click(); await shot("03-competicao");
  await p.click(".ac-foot .cta");
  await p.waitForSelector(".ac-club", { timeout: 40000 });
  await p.locator(".ac-club").first().click(); await p.evaluate(() => window.scrollTo(0, 0)); await shot("04-clube");
  await p.click(".ac-foot .cta");
  await p.waitForSelector(".ac-clubline", { timeout: 20000 }); await shot("05-configurar");
  await p.click(".ac-form .cta");
  await p.waitForSelector(".ac-hero", { timeout: 90000 }); await shot("06-primeira-entrada");
  await p.click(".ac-foot .cta");
  await p.waitForSelector(".rw-days", { timeout: 40000 }); await shot("07-recompensa");
  await p.click(".rw-foot .cta");
  await p.waitForFunction(() => !document.querySelector(".rw-foot .cta"), null, { timeout: 30000 }); await shot("08-recompensa-recebida");
  await p.click(".rw-foot .link-back"); await p.waitForSelector(".home"); await shot("09-inicio-linha-recompensa");
  await p.click('.home a.row[href$="/escalacao"]'); await p.waitForSelector(".lu-form-btn");
  await p.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await p.click(".lu-form-btn"); await p.waitForSelector('[role="dialog"] [role="radio"]');
  await p.locator('[role="dialog"] [role="radio"]:not([aria-checked="true"])').first().click();
  await p.waitForSelector("#lg-t", { timeout: 15000 }); await shot("10-sessao-expirada");
  await p.fill('[role="dialog"] input[type="email"]', "outra@teste.com"); await p.fill('[role="dialog"] input[type="password"]', "x");
  await browser.close();
})();
