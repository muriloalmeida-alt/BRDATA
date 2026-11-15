// Convite de amigo por link (item 5 da lista de melhorias), na carreira
// oficial (v2): "Convidar amigo" no Ranking (Web Share API, com cópia para a
// área de transferência quando o navegador não tem share), captura do
// /?convite=CÓDIGO antes do login, amizade criada sozinha depois de entrar.
// L6a (sem a tela antiga): mesmas checagens do teste anterior, pela v2. O
// item 6 antigo (login pelo formulário deixava a global ME vazia) era um bug
// da tela antiga; aqui ele vira: entrar pelo formulário da v2 com carreira
// salva abre o Início.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, carreiraV2 } = require("./_v2_carreira");

const amigos = (page) => page.evaluate(async () => (await (await fetch("/api/friends", { cache: "no-store" })).json()));
async function cadastrar(page, email, nome) {
  await page.evaluate(async ({ email, nome }) => {
    const corpo = (b) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    await fetch("/api/auth/signup", corpo({ name: nome, email, password: "senha123", phone: "11999999999", plan: "freemium" }));
  }, { email, nome });
}
async function entrarPeloFormulario(page, email) {
  await page.waitForSelector(".lg-field", { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "senha123");
  await page.click(".ac-form .cta");
  await page.waitForFunction(() => !document.querySelector(".lg-field"), null, { timeout: 30000 });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });

  // ---------- Conta A: dona do link ----------
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const pageA = await ctxA.newPage();
  pageA.on("pageerror", (err) => console.log("PAGE ERROR (A):", err.message));
  await carreiraV2(pageA, `convitea${Date.now()}@teste.com`);
  const codeA = (await amigos(pageA)).friendCode;
  await pageA.goto(base + "/ranking", { waitUntil: "domcontentloaded" });
  await pageA.waitForFunction((c) => document.body.innerText.includes(c), codeA, { timeout: 30000 }).catch(() => {});
  const naTela = await pageA.evaluate((c) => document.body.innerText.includes(c), codeA);
  check("0) A conta A tem código de amigo (6 caracteres) e ele aparece no Ranking:", !!codeA && codeA.length === 6 && naTela, codeA);

  // 1) Convidar amigo: sem navigator.share no Chromium headless, copia o link.
  await pageA.evaluate(() => { try { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); } catch (_) { /* já ausente */ } });
  await pageA.locator("button.cta", { hasText: "Convidar amigo" }).click();
  await pageA.waitForSelector(".pr-ok", { timeout: 10000 }).catch(() => {});
  const clip = await pageA.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  const aviso = await pageA.evaluate(() => ((document.querySelector(".pr-ok") || {}).textContent || ""));
  check("1) 'Convidar amigo' copia um link com o código para a área de transferência:",
    !!clip && clip === `${base}/?convite=${codeA}` && /Link de convite copiado/.test(aviso), JSON.stringify({ clip, aviso }));

  // 2) O próprio link não adiciona a si mesma; a URL fica limpa.
  await pageA.goto(`${base}/?convite=${codeA}`, { waitUntil: "domcontentloaded" });
  await pageA.waitForSelector(".home", { timeout: 30000 });
  await pageA.waitForTimeout(1200);
  const t2 = { amigos: ((await amigos(pageA)).friends || []).length, url: await pageA.evaluate(() => location.pathname + location.search) };
  check("2) Abrir o PRÓPRIO link não adiciona a si mesma, e a URL fica limpa:", t2.amigos === 0 && t2.url === "/", JSON.stringify(t2));

  // ---------- Conta B: abre o link de A sem sessão ----------
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const pageB = await ctxB.newPage();
  pageB.on("pageerror", (err) => console.log("PAGE ERROR (B):", err.message));
  await pageB.goto(`${base}/?convite=${codeA}`, { waitUntil: "domcontentloaded" });
  await pageB.waitForSelector(".lg-field", { timeout: 30000 });
  const t3 = await pageB.evaluate(() => ({ url: location.pathname + location.search, guardado: sessionStorage.getItem("mt_pending_invite_code") }));
  check("3) Visitante sem sessão vê o login da v2, o convite fica guardado na aba e a URL já está limpa:", t3.url === "/" && t3.guardado === codeA, JSON.stringify(t3));

  // 4) Cadastra e entra pelo formulário: o convite vira amizade sozinho.
  const emailB = `conviteb${Date.now()}@teste.com`;
  await cadastrar(pageB, emailB, "Convite B");
  await entrarPeloFormulario(pageB, emailB);
  let fB = [];
  for (let i = 0; i < 20 && fB.length === 0; i++) { fB = (await amigos(pageB)).friends || []; if (!fB.length) await pageB.waitForTimeout(300); }
  const sobrou = await pageB.evaluate(() => sessionStorage.getItem("mt_pending_invite_code"));
  check("4) Depois de entrar, o convite guardado vira amizade de verdade, uma vez só:", fB.length === 1 && !sobrou, JSON.stringify({ fB, sobrou }));

  // 5) Bidirecional.
  const fA = (await amigos(pageA)).friends || [];
  check("5) A amizade é bidirecional: A também vê B na lista:", fA.length === 1 && fA[0].name === "Convite B", JSON.stringify(fA));

  // 6) B com carreira salva: sair e entrar pelo formulário abre o Início.
  await pageB.close();
  const pageB2 = await ctxB.newPage();
  await carreiraV2(pageB2, emailB, { criarConta: async () => {} });
  await pageB2.evaluate(async () => { await fetch("/api/auth/logout", { method: "POST" }); });
  await pageB2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await entrarPeloFormulario(pageB2, emailB);
  await pageB2.waitForSelector(".home", { timeout: 30000 }).catch(() => {});
  const t6 = await pageB2.evaluate(() => ({ path: location.pathname, home: !!document.querySelector(".home") }));
  check("6) Com carreira salva, entrar pelo formulário da v2 abre o Início:", t6.home && t6.path === "/", JSON.stringify(t6));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
