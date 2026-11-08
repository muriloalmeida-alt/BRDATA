// Ajudantes para testes NOVOS da carreira oficial (/carreira, a v2).
// Não usam a tela antiga (carreira.html, /carreira-old), que está
// descontinuada e congelada (09/11, ver CLAUDE.md e tests/e2e/README.md):
// a conta é criada pela API e a carreira pelas telas da própria v2.
// Para regra do jogo sem navegador, ver _sem_tela.js.
const base = "http://localhost:8787";

// Conta nova já logada nesta página.
async function contaNova(page, email) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    const corpo = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    await fetch("/api/auth/signup", corpo({ name: "Teste V2", email, password: "senha123", phone: "11999999999", plan: "freemium" }));
    await fetch("/api/auth/login", corpo({ email, password: "senha123" }));
  }, { email });
}

// O save da conta no servidor.
async function saveNoServidor(page) {
  return page.evaluate(async () => (await (await fetch("/api/career", { cache: "no-store" })).json()).career);
}

// Conta nova + carreira criada pela v2 (Série A, o clube da posição
// `clube` na lista, 0 = o primeiro) e o caminho de primeira entrada
// (tutorial, assistente de início e recompensa) até o Início.
// Devolve o save do servidor.
async function novaCarreiraV2(page, email, { clube = 0 } = {}) {
  await contaNova(page, email);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  await page.locator(".ac-opt").first().click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-club", { timeout: 40000 });
  await page.locator(".ac-club").nth(clube).click();
  await page.click(".ac-foot .cta");
  await page.waitForSelector(".ac-clubline", { timeout: 20000 });
  await page.click(".ac-form .cta");
  await page.waitForURL(/\/nova\/pronto$/, { timeout: 90000 });
  // Primeira entrada: tutorial (Continuar), assistente (Pular esta etapa /
  // Continuar) e recompensa, até o Início.
  for (let k = 0; k < 40; k++) {
    if (await page.locator(".home").count()) break;
    if (await page.locator(".wz-skip").count()) await page.click(".wz-skip");
    else if (await page.locator(".wz-next").count()) await page.click(".wz-next");
    else if (await page.locator(".rw-foot .cta").count()) await page.click(".rw-foot .cta");
    else if (await page.locator(".ac-foot .cta").count()) await page.click(".ac-foot .cta");
    await page.waitForTimeout(250);
  }
  if (!(await page.locator(".home").count())) {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".home", { timeout: 20000 });
  }
  return saveNoServidor(page);
}

module.exports = { base, contaNova, saveNoServidor, novaCarreiraV2 };
