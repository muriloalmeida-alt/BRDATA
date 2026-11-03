// Acessibilidade das modais (P1 da auditoria S4-B5-QA-001, ver
// initModalA11y em carreira.js): toda .ct-modal-overlay vira diálogo
// (role/aria-modal/título ligado), o foco entra ao abrir, o Tab fica
// preso na modal e o foco volta pra quem abriu ao fechar.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { enterGame } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `a11ymodais${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "A11y Modais", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.click(".m3-club-row");
  await page.click("#btnConfirmClub");
  await enterGame(page);

  // 1) Toda modal fixa é diálogo; as que têm título ficam ligadas a ele.
  const roles = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".ct-modal-overlay")].map((o) => ({ id: o.id, card: o.querySelector(".ct-modal") })).filter((x) => x.card);
    const noRole = cards.filter((x) => x.card.getAttribute("role") !== "dialog" || x.card.getAttribute("aria-modal") !== "true").map((x) => x.id);
    const withTitle = cards.filter((x) => x.card.querySelector("h3, h2, .ct-modal-title"));
    // Título redesenhado depois do boot (ex.: onboarding) é religado ao
    // abrir — aqui vale ter o vínculo OU um aria-label fixo.
    const badLabel = cards.filter((x) => { const id = x.card.getAttribute("aria-labelledby"); return !x.card.getAttribute("aria-label") && !(id && document.getElementById(id) && x.card.contains(document.getElementById(id))) && x.id !== "onboardingOverlay"; }).map((x) => x.id);
    return { total: cards.length, noRole, withTitle: withTitle.length, badLabel, semTitulo: cards.filter((x) => !x.card.querySelector("h3, h2, .ct-modal-title")).map((x) => x.id) };
  });
  check("1) Todas as modais fixas têm role=dialog + aria-modal e nome (título ligado ou aria-label):",
    roles.total >= 60 && roles.noRole.length === 0 && roles.badLabel.length === 0, JSON.stringify(roles));

  // 2) Abrindo por um botão de verdade: foco vai pra dentro da modal.
  await page.evaluate(() => switchToPanel("mercado"));
  await page.focus("#btnOpenMyOffers");
  await page.click("#btnOpenMyOffers");
  await page.waitForSelector("#myOffersOverlay.open", { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector("#myOffersOverlay .ct-modal").contains(document.activeElement), null, { timeout: 3000 }).catch(() => {});
  const focusIn = await page.evaluate(() => document.querySelector("#myOffersOverlay .ct-modal").contains(document.activeElement));
  check("2) Ao abrir, o foco entra na modal:", focusIn);

  // 3) Tab (e Shift+Tab) não sai da modal.
  let escaped = 0;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 3 === 2 ? "Shift+Tab" : "Tab");
    if (!(await page.evaluate(() => document.querySelector("#myOffersOverlay .ct-modal").contains(document.activeElement)))) escaped++;
  }
  check("3) Tab/Shift+Tab ficam presos na modal (12 toques):", escaped === 0, { escaped });

  // 4) Fechar devolve o foco a quem abriu.
  await page.click("#myOffersClose");
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === "btnOpenMyOffers", null, { timeout: 3000 }).catch(() => {});
  const back = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check("4) Ao fechar, o foco volta pro botão que abriu:", back === "btnOpenMyOffers", back);

  // 5) Onboarding (título redesenhado a cada passo): aberto, tem nome.
  await page.evaluate(() => openOnboardingOverlay());
  await page.waitForSelector("#onboardingOverlay.open", { timeout: 5000 });
  await page.waitForTimeout(100);
  const onb = await page.evaluate(() => {
    const card = document.querySelector("#onboardingOverlay .ct-modal");
    const el = document.getElementById(card.getAttribute("aria-labelledby") || "");
    return { linked: !!el && card.contains(el), text: el ? el.textContent.trim() : null };
  });
  check("5) Onboarding aberto tem nome (título do passo ligado):", onb.linked && !!onb.text, JSON.stringify(onb));

  console.log("Modais sem título (só role/aria-modal):", JSON.stringify(roles.semTitulo));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
