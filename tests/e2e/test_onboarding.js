// Tutorial de boas-vindas da carreira oficial (v2): só na 1ª carreira da
// conta; "Pular" vale o mesmo que "Começar"; nunca reaparece (nem ao
// recarregar, nem depois de "Reiniciar carreira"); o assistente de início e
// a recompensa diária vêm depois dele, nunca por cima.
// L6a (sem a tela antiga): os 4 slides, "Avançar"/"Começar" e a marca na
// conta estão em test_v2_onboarding (item 1). Aqui ficam os casos que só o
// teste anterior tinha:
//  1) "Pular" no 1º slide fecha o tutorial, marca a conta (onboardingSeen)
//     e abre o assistente (sem a recompensa por cima).
//  2) Terminado o assistente, a recompensa diária abre em seguida; o Início
//     renderiza normal.
//  3) Recarregar não reabre o tutorial.
//  4) Depois de "Reiniciar carreira", a 2ª carreira não mostra o tutorial:
//     "Ir para o clube" vai direto ao assistente.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, signup, serverCareer } = require("./_v2_carreira");

async function criarPelaTela(v2) {
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await v2.locator(".ac-opt").first().click();
  await v2.click(".ac-foot .cta");
  await v2.waitForSelector(".ac-club", { timeout: 40000 });
  await v2.locator(".ac-club").first().click();
  await v2.click(".ac-foot .cta");
  await v2.waitForSelector(".ac-clubline", { timeout: 20000 });
  await v2.click(".ac-form .cta");
  await v2.waitForURL(/\/nova\/pronto$/, { timeout: 90000 });
  await v2.click(".ac-foot .cta"); // "Ir para o clube"
}
const conta = (v2) => v2.evaluate(async () => (await (await fetch("/api/auth/me", { cache: "no-store" })).json()).user);
async function pularAssistente(v2) {
  for (let n = 1; n <= 4; n++) {
    await v2.waitForFunction((n) => (document.querySelector(".wz-k")?.textContent || "").includes(`Passo ${n} de 4`), n, { timeout: 30000 });
    await v2.click(".wz-skip");
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const v2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  v2.on("dialog", (d) => d.dismiss());
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await signup(v2, `onboard${Date.now()}@teste.com`);
  await criarPelaTela(v2);

  // 1) Pular no 1º slide.
  await v2.waitForURL(/\/boas-vindas$/, { timeout: 20000 });
  await v2.waitForSelector(".ob-title", { timeout: 10000 });
  const antes = (await conta(v2)).onboardingSeen;
  const slide = await v2.evaluate(() => document.querySelector(".ob-dots").getAttribute("aria-label"));
  await v2.click(".ob-skip");
  await v2.waitForURL(/assistente=1/, { timeout: 20000 });
  await v2.waitForSelector(".wz", { timeout: 20000 });
  const depois = (await conta(v2)).onboardingSeen;
  const t1 = await v2.evaluate(() => ({ path: location.pathname, tutorial: !!document.querySelector(".ob"), recompensa: location.pathname === "/recompensa" }));
  check("1) 'Pular' no 1º slide fecha o tutorial, marca a conta e abre o assistente (sem a recompensa por cima):",
    slide === "Tela 1 de 4" && antes === false && depois === true && t1.path === "/escalacao" && !t1.tutorial, JSON.stringify({ slide, antes, depois, ...t1 }));

  // 2) Assistente terminado: recompensa diária em seguida; Início normal.
  await pularAssistente(v2);
  await v2.waitForURL(/\/recompensa$/, { timeout: 30000 });
  const receber = v2.locator("button.cta", { hasText: "Receber" });
  await receber.waitFor({ timeout: 20000 });
  await receber.click();
  await v2.waitForFunction(() => ![...document.querySelectorAll("button.cta")].some((b) => /Receb/.test(b.textContent)), null, { timeout: 20000 });
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 30000 });
  const s2 = await serverCareer(v2);
  check("2) Depois do assistente vem a recompensa diária; o Início renderiza normal:", s2.startupWizardSeen === true && !!(await v2.$(".home h1, .home")), JSON.stringify({ seen: s2.startupWizardSeen }));

  // 3) Recarregar não reabre o tutorial.
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 30000 });
  await v2.waitForTimeout(800);
  const t3 = await v2.evaluate(() => ({ path: location.pathname, tutorial: !!document.querySelector(".ob") }));
  check("3) Recarregar não reabre o tutorial:", t3.path === "/" && !t3.tutorial, JSON.stringify(t3));

  // 4) Reiniciar carreira → 2ª carreira sem tutorial, direto ao assistente.
  await v2.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await v2.locator("button.pr-row", { hasText: "Reiniciar carreira" }).click();
  await v2.waitForSelector("#sv-t");
  await v2.fill('[role="alertdialog"] input', "reiniciar");
  await v2.click('[role="alertdialog"] .text-btn');
  await v2.waitForFunction(() => location.pathname !== "/saves" && !document.querySelector(".home") && document.querySelector("h1"), null, { timeout: 30000 });
  const visitas = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) visitas.push(new URL(f.url()).pathname); });
  await criarPelaTela(v2);
  await v2.waitForURL(/assistente=1/, { timeout: 30000 });
  await v2.waitForSelector(".wz", { timeout: 20000 });
  const t4 = await v2.evaluate(() => ({ path: location.pathname, tutorial: !!document.querySelector(".ob") }));
  check("4) Depois de 'Reiniciar carreira', a 2ª carreira não mostra o tutorial: 'Ir para o clube' vai direto ao assistente:",
    t4.path === "/escalacao" && !t4.tutorial && !visitas.includes("/boas-vindas"), JSON.stringify({ ...t4, visitas }));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
