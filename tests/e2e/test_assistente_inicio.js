// Assistente de início da carreira oficial (v2): 4 passos (Formação,
// Comissão, Olheiros, Táticas), cada um na tela da v2 que já existe,
// todos puláveis; aparece em TODA carreira nova (não só na 1ª da conta),
// depois do tutorial e antes da recompensa diária.
// L6a (sem a tela antiga): a sequência dos passos, "Continuar"/"Pular esta
// etapa" e a gravação das instruções do passo 4 estão em test_v2_onboarding
// (itens 2 e 3); contratar comissão e olheiro nas próprias telas, em
// test_v2_comissao e test_v2_clube. Aqui ficam os casos que só o teste
// anterior tinha:
//  1) Trocar a formação no passo 1 grava de verdade (lineup.formation) e o
//     assistente continua no passo 1.
//  2) Pulando os passos 2 a 4, nada é contratado (comissão e olheiros) e o
//     save fica marcado (startupWizardSeen); a recompensa vem em seguida.
//  3) A Escalação fora do assistente mostra a formação escolhida, sem a
//     barra do assistente.
//  4) 2ª carreira (Reiniciar): o assistente aparece de novo, no passo 1.
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
const passo = (v2, n) => v2.waitForFunction((n) => (document.querySelector(".wz-k")?.textContent || "").includes(`Passo ${n} de 4`), n, { timeout: 30000 });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const v2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  v2.on("dialog", (d) => d.dismiss());
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await signup(v2, `assist${Date.now()}@teste.com`);
  await criarPelaTela(v2);
  await v2.waitForURL(/\/boas-vindas$/, { timeout: 20000 });
  await v2.click(".ob-skip");
  await v2.waitForURL(/assistente=1/, { timeout: 20000 });
  await passo(v2, 1);

  // 1) Passo 1: troca a formação pelo seletor.
  await v2.waitForSelector(".lu-form-btn", { timeout: 20000 });
  const antes = (await serverCareer(v2)).lineup.formation;
  const nova = antes === "4-4-2" ? "4-3-3" : "4-4-2";
  await v2.click(".lu-form-btn");
  await v2.waitForSelector(".sheet", { timeout: 5000 });
  await v2.click(`.sheet-opt:has-text("${nova}")`);
  await v2.waitForSelector(".sheet", { state: "detached", timeout: 10000 });
  await v2.waitForFunction((f) => (document.querySelector("#lu-form-val") || {}).textContent === f, nova, { timeout: 10000 });
  let gravada = null;
  for (let i = 0; i < 30 && gravada !== nova; i++) { gravada = (await serverCareer(v2)).lineup.formation; if (gravada !== nova) await v2.waitForTimeout(300); }
  const k1 = await v2.evaluate(() => ({ path: location.pathname + location.search, k: document.querySelector(".wz-k")?.textContent }));
  check("1) Trocar a formação no passo 1 grava de verdade e o assistente continua no passo 1:",
    gravada === nova && k1.path === "/escalacao?assistente=1" && /Passo 1 de 4/.test(k1.k), JSON.stringify({ antes, nova, gravada, ...k1 }));

  // 2) Continua no 1 e pula os passos 2 a 4.
  await v2.click(".wz-next");
  for (let n = 2; n <= 4; n++) { await passo(v2, n); await v2.click(".wz-skip"); }
  await v2.waitForURL(/\/recompensa$/, { timeout: 30000 });
  const s2 = await serverCareer(v2);
  check("2) Pulando os passos 2 a 4 nada é contratado, o save fica marcado e a recompensa vem em seguida:",
    s2.startupWizardSeen === true && !(s2.technicalStaff && s2.technicalStaff.hired) && (s2.scouts || []).length === 0 && s2.lineup.formation === nova,
    JSON.stringify({ seen: s2.startupWizardSeen, staff: s2.technicalStaff, scouts: (s2.scouts || []).length, formation: s2.lineup.formation }));

  // 3) Escalação fora do assistente (recebida a recompensa, que abre sozinha).
  const receber = v2.locator("button.cta", { hasText: "Receber" });
  await receber.waitFor({ timeout: 20000 });
  await receber.click();
  await v2.waitForFunction(() => ![...document.querySelectorAll("button.cta")].some((b) => /Receb/.test(b.textContent)), null, { timeout: 20000 });
  await v2.goto(base + "/escalacao", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector("#lu-form-val", { timeout: 30000 });
  await v2.waitForTimeout(500);
  const t3 = await v2.evaluate(() => ({ path: location.pathname, f: document.querySelector("#lu-form-val").textContent, wz: !!document.querySelector(".wz") }));
  check("3) A Escalação fora do assistente mostra a formação escolhida, sem a barra do assistente:", t3.path === "/escalacao" && t3.f === nova && !t3.wz, JSON.stringify(t3));

  // 4) 2ª carreira: o assistente volta.
  await v2.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await v2.locator("button.pr-row", { hasText: "Reiniciar carreira" }).click();
  await v2.waitForSelector("#sv-t");
  await v2.fill('[role="alertdialog"] input', "reiniciar");
  await v2.click('[role="alertdialog"] .text-btn');
  await v2.waitForFunction(() => location.pathname !== "/saves" && !document.querySelector(".home") && document.querySelector("h1"), null, { timeout: 30000 });
  await criarPelaTela(v2);
  await v2.waitForURL(/assistente=1/, { timeout: 30000 });
  await passo(v2, 1);
  const s4 = await serverCareer(v2);
  const k4 = await v2.evaluate(() => ({ path: location.pathname, t: document.querySelector(".wz-t")?.textContent }));
  check("4) 2ª carreira (Reiniciar): o assistente aparece de novo, no passo 1, com o save novo não marcado:",
    k4.path === "/escalacao" && k4.t === "Monte sua formação favorita" && s4.startupWizardSeen === false, JSON.stringify({ ...k4, seen: s4.startupWizardSeen }));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
