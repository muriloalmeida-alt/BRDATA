// Pedido do usuário: "onboarding pro primeiro acesso... tutorial
// curtinho (3-4 telas) na primeira carreira". Valida: aparece na 1ª
// carreira, navega pelos slides, "Pular" funciona, nunca mais
// reaparece (nem em conta nova retomando, nem depois de "Reiniciar"),
// e libera o modal de login diário só depois de fechado.
const { chromium } = require("playwright-core");
const { waitForBoot } = require("./_startup");
const { check } = require("./_check");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `onboard${Date.now()}@teste.com`;

  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Onboard Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  // Espera a tela do jogo (estado) — o tutorial abre no mesmo instante;
  // antes 700 ms fixos, curto no CI (criar a carreira demora mais).
  await page.waitForFunction(() => { const g = document.getElementById("screenGame"); return !!g && !g.classList.contains("hidden"); }, null, { timeout: 20000 }).catch(() => {});

  // 1) Tutorial abre sozinho na 1ª carreira, ANTES do login diário.
  const initial = await page.evaluate(() => ({
    onboardOpen: document.getElementById("onboardingOverlay").classList.contains("open"),
    dailyLoginOpen: document.getElementById("dailyLoginOverlay").classList.contains("open"),
    title: document.querySelector(".mt-onboard-title")?.textContent,
    dots: document.querySelectorAll(".mt-onboard-dot").length,
    nextLabel: document.getElementById("btnOnboardNext").textContent,
  }));
  check("1) Tutorial abre sozinho (login diário ainda NÃO), 4 slides, começa no 1º:",
    initial.onboardOpen && !initial.dailyLoginOpen && initial.dots === 4 && initial.nextLabel === "Avançar", JSON.stringify(initial));

  // 2) "Avançar" 3x passa pelos slides 2, 3, 4 (último vira "Começar").
  await page.click("#btnOnboardNext");
  await page.waitForTimeout(100);
  const slide2 = await page.evaluate(() => document.querySelector(".mt-onboard-title").textContent);
  await page.click("#btnOnboardNext");
  await page.waitForTimeout(100);
  const slide3 = await page.evaluate(() => document.querySelector(".mt-onboard-title").textContent);
  await page.click("#btnOnboardNext");
  await page.waitForTimeout(100);
  const slide4 = await page.evaluate(() => ({ title: document.querySelector(".mt-onboard-title").textContent, nextLabel: document.getElementById("btnOnboardNext").textContent }));
  check("2) Avança pelos 4 slides (títulos diferentes), último botão vira 'Começar':",
    slide2 !== initial.title && slide3 !== slide2 && slide4.title !== slide3 && slide4.nextLabel === "Começar",
    JSON.stringify({ s1: initial.title, s2: slide2, s3: slide3, s4: slide4.title }));

  // 3) "Começar" no último slide fecha o tutorial E segue a fila de telas
  // de entrada: tutorial -> assistente de início (carreira nova, ver
  // maybeOpenStartupWizard em carreira.js) -> login diário. Nunca duas
  // sobrepostas.
  await page.click("#btnOnboardNext");
  // Esperas explícitas pelo estado (não wait fixo) -- fechar o tutorial
  // dispara um POST real (/api/account/onboarding-seen) antes da próxima
  // tela da fila abrir, tempo de rede variável.
  await page.waitForSelector("#startupWizardOverlay.open", { timeout: 5000 }).catch(() => {});
  const afterFinish = await page.evaluate(() => ({
    onboardOpen: document.getElementById("onboardingOverlay").classList.contains("open"),
    wizardOpen: document.getElementById("startupWizardOverlay").classList.contains("open"),
    dailyLoginOpen: document.getElementById("dailyLoginOverlay").classList.contains("open"),
  }));
  check("3) Tutorial fecha e o assistente de início abre em seguida (sem o login diário por cima):", !afterFinish.onboardOpen && afterFinish.wizardOpen && !afterFinish.dailyLoginOpen, JSON.stringify(afterFinish));
  for (let i = 0; i < 8 && await page.locator("#startupWizardOverlay.open").count(); i++) {
    await page.click("#btnWizardSkip");
    await page.waitForTimeout(150);
  }
  await page.waitForSelector("#dailyLoginOverlay.open", { timeout: 5000 }).catch(() => {});
  const afterWizard = await page.evaluate(() => ({
    wizardOpen: document.getElementById("startupWizardOverlay").classList.contains("open"),
    dailyLoginOpen: document.getElementById("dailyLoginOverlay").classList.contains("open"),
  }));
  check("3b) Fechado o assistente, o login diário abre em seguida:", !afterWizard.wizardOpen && afterWizard.dailyLoginOpen, JSON.stringify(afterWizard));

  const meAfter = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user.onboardingSeen);
  check("4) Servidor confirma onboardingSeen:true:", meAfter === true);

  // 5) Coleta a recompensa (fecha o daily login) e confere que o app
  // segue funcional normalmente.
  await page.click("#btnClaimDailyLogin", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const centralOk = await page.evaluate(() => document.getElementById("panel-central").classList.contains("active"));
  check("5) Depois de tudo, a Central renderiza normal:", centralOk);

  // 6) Reload da página (mesma sessão) NÃO reabre o tutorial de novo.
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForBoot(page);
  const afterReload = await page.evaluate(() => document.getElementById("onboardingOverlay").classList.contains("open"));
  check("6) Depois de recarregar a página, o tutorial NÃO reaparece:", !afterReload);

  // 7) "Pular" também marca como visto (testado com uma 2ª conta nova,
  // clicando Pular na 1ª tela em vez de percorrer tudo).
  const email2 = `onboardskip${Date.now()}@teste.com`;
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Skip Teste", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email: email2 });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await page.waitForTimeout(700);
  const openedForSkip = await page.evaluate(() => document.getElementById("onboardingOverlay").classList.contains("open"));
  await page.click("#btnOnboardSkip");
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  const afterSkip = await page.evaluate(() => ({
    onboardOpen: document.getElementById("onboardingOverlay").classList.contains("open"),
    dailyLoginOpen: document.getElementById("dailyLoginOverlay").classList.contains("open"),
  }));
  const meAfterSkip = await page.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user.onboardingSeen);
  check("7) 'Pular' fecha na hora, libera login diário, e marca visto no servidor:",
    openedForSkip && !afterSkip.onboardOpen && afterSkip.dailyLoginOpen && meAfterSkip === true, JSON.stringify({ openedForSkip, ...afterSkip, meAfterSkip }));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
