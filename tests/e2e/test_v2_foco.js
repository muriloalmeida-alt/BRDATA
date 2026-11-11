// Carreira 2.0 — AUD-04 (diálogos com foco completo), AUD-05 (foco ao
// navegar) e AUD-06 (prazo da ponte independente do load). Pela UI real:
//  1) Início → Elenco → Perfil → voltar e Início → Escalação → troca →
//     voltar: o foco vai para o título (h1) da tela de destino.
//  2) Folha "Formação": foco na opção marcada, fundo inerte, Tab e Shift+Tab
//     presos, setas movem o foco sem gravar, Escape e toque no fundo fecham e
//     devolvem o foco ao botão; Enter escolhe (1 gravação).
//  3) Partida: foco no título; o minuto correndo não tira o foco do botão;
//     "Sair da partida?" com foco em ficar, Tab preso, Escape devolve o foco.
//  4) Motor que nunca termina de abrir (desde a G2c, módulo na página: a
//     carga do save não responde): erro recuperável no prazo, sem quadro;
//     "Tentar novamente" abre uma sessão limpa.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, serverCareer } = require("./_v2_match");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2foco${Date.now()}@teste.com`);
  await page.close();

  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  let puts = 0;
  v2.on("request", (r) => { if (r.method() === "PUT" && new URL(r.url()).pathname === "/api/career") puts++; });
  const focused = () => v2.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, text: (a?.textContent || "").trim().slice(0, 40), role: a?.getAttribute("role"), checked: a?.getAttribute("aria-checked"), cls: a?.className || "" }; });
  const atTitle = async () => { const f = await focused(); const h1 = await v2.evaluate(() => (document.querySelector("#root h1")?.textContent || "").trim().slice(0, 40)); return f.tag === "H1" && f.text === h1 ? h1 : null; };

  // 1) Foco ao navegar.
  await v2.goto("http://localhost:8787/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  const nav = {};
  await v2.locator(".tab", { hasText: "Elenco" }).click(); await v2.waitForSelector(".sq-row");
  nav.elenco = await atTitle();
  await v2.locator(".sq-row").first().click(); await v2.waitForURL(/elenco\/jogador/);
  await v2.waitForTimeout(100); nav.perfil = await atTitle();
  await v2.goBack(); await v2.waitForSelector(".sq-row"); await v2.waitForTimeout(100);
  nav.voltaElenco = await atTitle();
  await v2.goBack(); await v2.waitForSelector(".home"); await v2.waitForTimeout(100);
  nav.voltaInicio = await atTitle();
  await v2.locator(`.home a.row[href$="/escalacao"]`).first().click(); await v2.waitForSelector(".lu-form-btn");
  nav.escalacao = await atTitle();
  await v2.locator("a.lu-slot").first().click(); await v2.waitForURL(/escalacao\/trocar/);
  await v2.waitForTimeout(100); nav.troca = await atTitle();
  await v2.goBack(); await v2.waitForSelector(".lu-form-btn"); await v2.waitForTimeout(100);
  nav.voltaEscalacao = await atTitle();
  check("1) Foco no título da tela de destino: Elenco, Perfil, voltar ao Elenco, Escalação, troca e voltar à Escalação:",
    Object.values(nav).every(Boolean) && Object.keys(nav).length === 7, JSON.stringify(nav));

  // 2) Folha de formação.
  const putsA = puts;
  await v2.click(".lu-form-btn");
  await v2.waitForSelector('[role="dialog"] [role="radiogroup"]');
  const open1 = await v2.evaluate(() => ({ inert: document.getElementById("root").hasAttribute("inert"), modal: document.querySelector('[role="dialog"]').getAttribute("aria-modal") }));
  const f0 = await focused();
  await v2.keyboard.press("ArrowDown");
  const f1 = await focused();
  await v2.keyboard.press("Tab");
  const f2 = await focused();
  await v2.keyboard.press("Tab");
  const f3 = await focused();
  await v2.keyboard.press("Shift+Tab");
  const f4 = await focused();
  await v2.keyboard.press("Escape");
  await v2.waitForTimeout(100);
  const closed1 = await v2.evaluate(() => ({ open: !!document.querySelector('[role="dialog"]'), inert: document.getElementById("root").hasAttribute("inert"), btn: document.activeElement?.classList.contains("lu-form-btn") }));
  check("2a) Formação: foco na opção marcada, fundo inerte, ↓ move o foco sem marcar nem gravar, Tab/Shift+Tab presos (opção ⇄ Cancelar), Escape fecha e devolve o foco ao botão:",
    open1.inert && open1.modal === "true" && f0.role === "radio" && f0.checked === "true" && f1.role === "radio" && f1.checked === "false" && f1.text !== f0.text
      && f2.text === "Cancelar" && f3.role === "radio" && f3.text === f1.text && f4.text === "Cancelar" && !closed1.open && !closed1.inert && closed1.btn && puts === putsA,
    JSON.stringify({ open1, f0, f1, f2, f3, f4, closed1, puts: puts - putsA }));
  await v2.click(".lu-form-btn");
  await v2.waitForSelector('[role="dialog"]');
  await v2.mouse.click(195, 40); // fundo, acima da folha
  await v2.waitForTimeout(100);
  const closed2 = await v2.evaluate(() => ({ open: !!document.querySelector('[role="dialog"]'), btn: document.activeElement?.classList.contains("lu-form-btn") }));
  await v2.click(".lu-form-btn");
  await v2.waitForSelector('[role="dialog"]');
  const formBefore = (await serverCareer(v2)).lineup.formation;
  await v2.keyboard.press("ArrowDown");
  const chosen = (await focused()).text;
  await v2.keyboard.press("Enter");
  await v2.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 10000 });
  await v2.waitForTimeout(150);
  const formAfter = (await serverCareer(v2)).lineup.formation;
  const btnFocus = await v2.evaluate(() => document.activeElement?.classList.contains("lu-form-btn"));
  check("2b) Toque no fundo fecha e devolve o foco; ↓ + Enter escolhe a formação (1 gravação) e o foco volta ao botão:",
    !closed2.open && closed2.btn && chosen !== formBefore && formAfter === chosen && puts === putsA + 1 && btnFocus,
    JSON.stringify({ closed2, formBefore, chosen, formAfter, puts: puts - putsA, btnFocus }));

  // 3) Partida.
  await v2.goto("http://localhost:8787/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home");
  await v2.click(".home-main .cta");
  await v2.waitForSelector(".pm-cta");
  await v2.click(".pm-cta");
  await v2.waitForSelector(".mt-score", { timeout: 40000 });
  await v2.waitForTimeout(300);
  const fm = await focused();
  await v2.focus(".mt-speed-btn:not(.is-on)");
  const m1 = await v2.locator(".mt-min").textContent();
  await v2.waitForFunction((m) => document.querySelector(".mt-min")?.textContent !== m, m1, { timeout: 20000 });
  const keep = await focused();
  // O voltar do sistema não tem acionador na página: a folha abre com o foco
  // onde ele estiver (aqui, o botão 2×) e, ao fechar, devolve a ele.
  await v2.goBack();
  await v2.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const g0 = await focused();
  await v2.keyboard.press("Tab");
  const g1 = await focused();
  await v2.keyboard.press("Tab");
  const g2 = await focused();
  await v2.keyboard.press("Escape");
  await v2.waitForTimeout(150);
  const g3 = await focused();
  check("3) Partida: foco no título ao abrir; o minuto corre sem tirar o foco do botão; 'Sair da partida?' abre com foco em ficar, Tab preso, Escape fecha e devolve o foco ao botão:",
    fm.tag === "H1" && /Partida ao vivo/.test(fm.text) && /×/.test(keep.text) && keep.cls.includes("mt-speed-btn") && g0.text === "Continuar jogando"
      && g1.text === "Sair e simular o resto" && g2.text === "Continuar jogando" && !(await v2.locator('[role="alertdialog"]').count()) && g3.cls.includes("mt-speed-btn"),
    JSON.stringify({ fm, keep, g0, g1, g2, g3 }));
  await v2.click(".mt-skip");
  await v2.waitForSelector(".rs-title", { timeout: 30000 });
  await v2.close();

  // 4) Motor que nunca termina de abrir: a carga do save que o motor faz ao
  // abrir (GET /api/career depois de a v2 pedir o /js/motor/v2.js; o GET de
  // antes é o da própria v2) não responde.
  // Contexto sem service worker (ele buscaria por fora da interceptação),
  // com a mesma sessão.
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", storageState: await ctx.storageState() });
  const v3 = await ctx3.newPage();
  let hang = true, motorPedido = false;
  v3.on("request", (r) => { if (new URL(r.url()).pathname === "/js/motor/v2.js") motorPedido = true; });
  await v3.route((u) => new URL(u).pathname === "/api/career", async (route) => {
    if (hang && motorPedido && route.request().method() === "GET") return; // nunca responde
    return route.continue();
  });
  const t0 = Date.now();
  await v3.goto("http://localhost:8787/partida", { waitUntil: "domcontentloaded" });
  await v3.waitForSelector('[role="alert"] .state-btn', { timeout: 45000 });
  const took = Date.now() - t0;
  const err = await v3.evaluate(() => ({ text: document.querySelector('[role="alert"]').textContent, frames: document.querySelectorAll("iframe").length }));
  hang = false;
  await v3.click('[role="alert"] .state-btn');
  await v3.waitForFunction(() => /Nenhuma partida em andamento/.test(document.body.textContent), null, { timeout: 40000 });
  const frames = await v3.evaluate(() => document.querySelectorAll("iframe").length);
  check("4) Motor que nunca termina de abrir: erro recuperável no prazo (~30 s), sem quadro; 'Tentar novamente' abre uma sessão limpa:",
    /Não foi possível preparar a partida/.test(err.text) && err.frames === 0 && took >= 29000 && took < 45000 && frames === 0,
    JSON.stringify({ took, err, frames }));

  await browser.close();
})();
