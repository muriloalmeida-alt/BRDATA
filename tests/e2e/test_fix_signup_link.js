// "Criar conta" do login da carreira leva ao CADASTRO do portal (não à home
// comum), o cadastro funciona dali e o parâmetro ?signup=1 não fica
// pendurado na URL.
// Lote L2 do plano "testes sem a tela antiga": o login de partida é o da
// v2 (antes, o da tela antiga, que não é mais aberta).
const { chromium } = require("playwright-core");
const { check } = require("./_check");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("fonts.googleapis") && !m.text().includes("fundingchoices")) console.log("CONSOLE ERROR:", m.text()); });
  const base = "http://localhost:8787";

  // 1) Sem sessão, a carreira (/) mostra o login da v2, com "Criar conta".
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ac-form", { timeout: 15000 });
  const link = await page.locator(".ac-signup a").getAttribute("href");
  check("1) Login da carreira sem sessão, com o link 'Criar conta':", !!link, link);

  // 2) Clica em "Criar conta" -> navega e abre a view de CADASTRO do gate
  // do portal (não a home "pura").
  await page.click(".ac-signup a");
  await page.waitForLoadState("load");
  await page.waitForFunction(() => document.getElementById("authGate") && document.getElementById("authGate").style.display === "flex", null, { timeout: 10000 }).catch(() => {});
  const urlAfter = page.url();
  const view = await page.evaluate(() => ({ gate: document.getElementById("authGate").style.display, signup: document.getElementById("gateSignupView").style.display, login: document.getElementById("gateLoginView").style.display }));
  check("2) Abre direto a tela de CADASTRO do portal:", view.gate === "flex" && view.signup === "block", JSON.stringify({ urlAfter, view }));

  // 3) O cadastro em si funciona dali.
  await page.waitForSelector("#gatePlansGrid .plan-card", { timeout: 5000 });
  await page.click("#gatePlansGrid .plan-card");
  await page.fill("#gateName", "Teste Link Cadastro");
  await page.fill("#gatePhone", "11988887777");
  await page.fill("#gateEmail", `linkfix${Date.now()}@teste.com`);
  await page.fill("#gatePassword", "senha1234");
  await page.click("#gateSignupSubmit");
  await page.waitForFunction(() => (document.getElementById("gateLoginNotice")?.textContent || "").includes("Conta criada"), null, { timeout: 10000 }).catch(() => {});
  const successMsg = await page.evaluate(() => document.getElementById("gateLoginNotice")?.textContent || "");
  check("3) Cadastro concluído com sucesso a partir desse fluxo:", successMsg.includes("Conta criada"), successMsg);

  // 4) URL com ?signup=1 não fica "grudada" (limpa depois de processar).
  check("4) URL final sem o parâmetro signup pendurado:", page.url().indexOf("signup=1") === -1, page.url());
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
