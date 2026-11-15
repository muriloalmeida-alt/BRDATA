// Tela de login (S4-B2-002, issue #13), na carreira oficial (v2, em / sem
// sessão). O teste anterior travava os tokens e os 4 estados da tela de
// login da versão antiga; a v2 tem a própria tela ("Volte para o jogo.").
// L6a (sem a tela antiga): os mesmos 4 estados, pela v2.
//  1) Padrão: e-mail, senha, "Entrar" e "Criar conta"; cores pelos tokens
//     do design system (--bd-*).
//  2) Erro com campos vazios: mensagem com o token de erro, sem ir ao servidor.
//  3) Erro com senha errada: mensagem do servidor e botão liberado de novo.
//  4) Carregando: botão desabilitado com "Entrando…" durante o login.
//  5) Sucesso: o login some e a conta sem carreira vai para a criação (/nova).
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, signup } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const email = `login${Date.now()}@teste.com`;
  const pre = await browser.newPage();
  await signup(pre, email);
  await pre.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ac-form", { timeout: 30000 });
  const token = (name) => page.evaluate((n) => {
    const el = document.createElement("span"); el.style.color = `var(${n})`; document.body.appendChild(el);
    const c = getComputedStyle(el).color; el.remove(); return c;
  }, name);

  // 1) Padrão.
  const t1 = await page.evaluate(() => ({
    h1: document.querySelector("h1").textContent,
    campos: [...document.querySelectorAll(".lg-field span")].map((s) => s.textContent),
    cta: document.querySelector(".ac-form .cta").textContent, ctaOff: document.querySelector(".ac-form .cta").disabled,
    criar: document.querySelector(".ac-signup a")?.getAttribute("href"),
    tokens: getComputedStyle(document.documentElement).getPropertyValue("--bd-danger").trim().length > 0,
  }));
  check("1) Padrão: login da v2 com e-mail, senha, 'Entrar' e 'Criar conta'; tokens do design system definidos:",
    t1.h1 === "Volte para o jogo." && t1.campos.join() === "E-mail,Senha" && t1.cta === "Entrar" && !t1.ctaOff && t1.criar === "/brasileirao?signup=1" && t1.tokens, JSON.stringify(t1));

  // 2) Campos vazios: erro local, sem chamar o servidor.
  let chamadas = 0;
  page.on("request", (r) => { if (r.url().includes("/api/auth/login")) chamadas++; });
  await page.click(".ac-form .cta");
  await page.waitForSelector(".inline-error", { timeout: 5000 });
  const erroCor = await token("--bd-danger");
  const t2 = await page.evaluate(() => ({ texto: document.querySelector(".inline-error").textContent, role: document.querySelector(".inline-error").getAttribute("role"), cor: getComputedStyle(document.querySelector(".inline-error")).color }));
  check("2) Campos vazios: mensagem de erro com o token --bd-danger, sem ir ao servidor:",
    t2.texto === "Informe e-mail e senha." && t2.role === "alert" && t2.cor === erroCor && chamadas === 0, JSON.stringify({ ...t2, erroCor, chamadas }));

  // 3) Senha errada.
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "senhaErrada");
  await page.click(".ac-form .cta");
  await page.waitForFunction(() => { const e = document.querySelector(".inline-error"); return e && e.textContent !== "Informe e-mail e senha."; }, null, { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector(".ac-form .cta").disabled, null, { timeout: 15000 });
  const t3 = await page.evaluate(() => ({ texto: document.querySelector(".inline-error").textContent, cta: document.querySelector(".ac-form .cta").textContent, path: location.pathname }));
  check("3) Senha errada: mensagem do servidor e o botão liberado para tentar de novo:", t3.texto.length > 0 && t3.cta === "Entrar" && chamadas === 1 && !!(await page.$(".ac-form")), JSON.stringify({ ...t3, chamadas }));

  // 4) Carregando: segura a resposta do login para ver o estado.
  let soltar;
  const segura = new Promise((r) => { soltar = r; });
  await page.route("**/api/auth/login", async (route) => { await segura; await route.continue(); });
  await page.fill('input[type="password"]', "senha123");
  await page.click(".ac-form .cta");
  await page.waitForFunction(() => document.querySelector(".ac-form .cta").disabled, null, { timeout: 5000 });
  const t4 = await page.evaluate(() => ({ cta: document.querySelector(".ac-form .cta").textContent, off: document.querySelector(".ac-form .cta").disabled, erro: !!document.querySelector(".inline-error") }));
  check("4) Carregando: botão desabilitado com 'Entrando…' e sem a mensagem de erro anterior:", t4.cta === "Entrando…" && t4.off && !t4.erro, JSON.stringify(t4));

  // 5) Sucesso.
  soltar();
  await page.waitForFunction(() => !document.querySelector(".lg-field"), null, { timeout: 30000 });
  await page.waitForFunction(() => location.pathname.startsWith("/nova"), null, { timeout: 30000 }).catch(() => {});
  const t5 = await page.evaluate(() => ({ path: location.pathname, login: !!document.querySelector(".lg-field") }));
  check("5) Sucesso: o login some e a conta sem carreira vai para a criação:", !t5.login && t5.path.startsWith("/nova"), JSON.stringify(t5));

  await browser.close();
  console.log("OK");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
