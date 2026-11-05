// Carreira 2.0 — fase 2 (acesso), pela UI real, com conta nova e SEM
// passar pela versão anterior:
//  1) Sem sessão: abertura e login da v2 em / (senha errada mostra
//     erro); "Criar conta" leva ao cadastro do portal.
//  2) Sem carreira: Competição com os nomes reais; "Continuar" só depois de
//     escolher.
//  3) Clube: os clubes reais em ordem alfabética, sem pré-seleção; o botão
//     só fica ativo depois de escolher ("Continuar com <clube>").
//  4) Configurar: nome do treinador (gravado na conta) e "Iniciar carreira"
//     cria a carreira (Série B, clube escolhido) → Primeira entrada com
//     objetivo real e próximo jogo sem horário.
//  5) "Ir para o clube": a recompensa diária abre sozinha; "Receber" aplica
//     o prêmio real (R$ 500 no caixa) e mostra "Já recebida hoje"; o Início
//     mostra a linha "Recompensa diária · Recebida hoje"; recarregar não
//     reabre a recompensa.
//  6) Sessão expirada no meio do uso: folha de login sobre a tela; outra
//     conta é recusada; a mesma conta fecha a folha.
//  7) Nenhuma navegação passou por /carreira-old; telas de acesso em 360 px
//     sem rolagem horizontal e com alvos ≥ 44 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { serverCareer } = require("./_v2_match");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const base = "http://localhost:8787";
  // Conta B (para o caso de outra conta), em contexto à parte.
  const emailB = `v2acB${Date.now()}@teste.com`;
  const cb = await browser.newContext(); const pb = await cb.newPage();
  await pb.goto(base + "/privacidade.html");
  await pb.evaluate(async (email) => { await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Outra Conta", email, password: "senha123", phone: "11999999999", plan: "freemium" }) }); }, emailB);
  await cb.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const navs = [];
  v2.on("framenavigated", (f) => { if (f === v2.mainFrame()) navs.push(new URL(f.url()).pathname); });
  const email = `v2acesso${Date.now()}@teste.com`;
  await v2.goto(base + "/privacidade.html");
  await v2.evaluate(async (email) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Murilo Almeida", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/logout", { method: "POST" });
  }, email);
  const small = () => v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll("a, button, input")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && (r.height < 44 || r.width < 44); }).map((el) => el.className || el.tagName) }));
  const sizes = {};

  // 1) Login da v2.
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".ac-form", { timeout: 15000 });
  const signup = await v2.getAttribute(".ac-signup a", "href");
  await v2.fill('input[type="email"]', email);
  await v2.fill('input[type="password"]', "errada");
  await v2.click('.ac-form button[type="submit"]');
  await v2.waitForSelector(".ac-form .inline-error", { timeout: 10000 });
  const wrong = await v2.locator(".ac-form .inline-error").textContent();
  await v2.setViewportSize({ width: 360, height: 780 }); sizes.login = await small(); await v2.setViewportSize({ width: 390, height: 844 });
  await v2.fill('input[type="password"]', "senha123");
  await v2.click('.ac-form button[type="submit"]');
  await v2.waitForURL(/\/nova$/, { timeout: 15000 });
  check("1) Sem sessão, / mostra o login da v2; senha errada mostra erro; 'Criar conta' leva a /brasileirao?signup=1; entrar sem carreira leva a /nova:",
    signup === "/brasileirao?signup=1" && !!wrong && /\/nova$/.test(v2.url()), JSON.stringify({ signup, wrong }));

  // 2) Competição.
  await v2.waitForSelector('.ac-opt[role="radio"]', { timeout: 40000 });
  const comps = await v2.evaluate(() => ({ items: [...document.querySelectorAll(".ac-opt")].map((b) => b.querySelector("b").textContent), checked: document.querySelectorAll('.ac-opt[aria-checked="true"]').length,
    cta: document.querySelector(".ac-foot .cta").textContent, disabled: document.querySelector(".ac-foot .cta").getAttribute("aria-disabled") }));
  await v2.evaluate(() => document.querySelector(".ac-foot .cta").click()); // inativo: não sai
  await v2.waitForTimeout(200);
  const stay = new URL(v2.url()).pathname;
  await v2.setViewportSize({ width: 360, height: 780 }); sizes.comp = await small(); await v2.setViewportSize({ width: 390, height: 844 });
  await v2.locator(".ac-opt", { hasText: "Série B" }).click();
  const after = await v2.locator(".ac-foot .cta").textContent();
  await v2.click(".ac-foot .cta");
  await v2.waitForURL(/\/nova\/clube\?comp=serie_b/, { timeout: 10000 });
  check("2) Competição: Brasileirão Série A/B/C, nada pré-selecionado, 'Continuar' inativo até escolher:",
    comps.items.join("|") === "Brasileirão Série A|Brasileirão Série B|Brasileirão Série C" && comps.checked === 0 && comps.disabled === "true" && stay === "/nova" && after === "Continuar",
    JSON.stringify({ comps, stay, after }));

  // 3) Clube.
  await v2.waitForSelector(".ac-club", { timeout: 40000 });
  const clubs = await v2.evaluate(() => ({ names: [...document.querySelectorAll(".ac-club b")].map((b) => b.textContent), checked: document.querySelectorAll('.ac-club[aria-checked="true"]').length,
    cta: document.querySelector(".ac-foot .cta").textContent, disabled: document.querySelector(".ac-foot .cta").getAttribute("aria-disabled") }));
  const sorted = [...clubs.names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  await v2.setViewportSize({ width: 360, height: 780 }); sizes.club = await small(); await v2.setViewportSize({ width: 390, height: 844 });
  const pick = clubs.names[1];
  await v2.locator(".ac-club", { hasText: pick }).first().click();
  const cta3 = await v2.locator(".ac-foot .cta").textContent();
  check("3) Clube: clubes reais em ordem alfabética, sem pré-seleção; 'Escolha um clube' inativo até escolher, depois 'Continuar com <clube>':",
    clubs.names.length >= 16 && JSON.stringify(sorted) === JSON.stringify(clubs.names) && clubs.checked === 0 && clubs.cta === "Escolha um clube" && clubs.disabled === "true" && cta3.startsWith(`Continuar com ${pick}`),
    JSON.stringify({ n: clubs.names.length, cta: clubs.cta, cta3 }));
  await v2.click(".ac-foot .cta");
  await v2.waitForURL(/\/nova\/treinador/, { timeout: 10000 });

  // 4) Configurar e criar.
  await v2.waitForSelector(".ac-clubline", { timeout: 20000 });
  const setup = await v2.evaluate(() => ({ club: document.querySelector(".ac-clubline b").textContent, name: document.querySelector(".ac-input input").value, cta: document.querySelector(".ac-form .cta").textContent }));
  await v2.click(".ac-clear");
  await v2.click(".ac-form .cta");
  const emptyErr = await v2.locator(".ac-form .inline-error").textContent();
  await v2.fill(".ac-input input", "Técnico Teste");
  await v2.click(".ac-form .cta");
  await v2.waitForURL(/\/nova\/pronto$/, { timeout: 90000 });
  await v2.waitForSelector(".ac-hero", { timeout: 20000 });
  const fe = await v2.evaluate(() => ({ title: document.querySelector("h1").textContent, club: document.querySelector(".ac-hero b").textContent, kicker: document.querySelector(".ac-hero .ac-kicker").textContent,
    objective: document.querySelector(".ac-sec-text")?.textContent || "", next: document.querySelector(".ac-match-line")?.textContent || null, cta: document.querySelector(".ac-foot .cta").textContent }));
  const created = await serverCareer(v2);
  const me = await v2.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user);
  check("4) Configurar: clube escolhido, nome da conta preenchido, vazio dá erro; 'Iniciar carreira' cria a carreira (Série B, clube escolhido) e grava o nome; Primeira entrada com objetivo real e próximo jogo sem horário:",
    setup.club === pick && setup.name === "Murilo Almeida" && /Iniciar carreira/.test(setup.cta) && /Informe o nome/.test(emptyErr)
      && created && created.competitionId === "serie_b" && created.clubName === pick && me.name === "Técnico Teste"
      && /começa agora/i.test(fe.title) && fe.club === pick && /Série B/.test(fe.kicker) && fe.objective.length > 3 && (fe.next === null || !/\d{1,2}:\d{2}/.test(fe.next)) && /Ir para o clube/.test(fe.cta),
    JSON.stringify({ setup, emptyErr, fe, comp: created && created.competitionId }));

  // 5) Recompensa diária.
  const cash0 = created.finances.cash;
  await v2.click(".ac-foot .cta");
  // Desde o item 1 (05/11), antes da recompensa vêm o tutorial (1ª carreira
  // da conta) e o assistente de início (carreira nova): pula os dois aqui
  // (eles têm teste próprio, test_v2_onboarding.js).
  await v2.waitForURL(/\/boas-vindas$/, { timeout: 20000 });
  await v2.click(".ob-skip");
  for (let n = 1; n <= 4; n++) {
    await v2.waitForURL(new RegExp(`assistente=${n}`), { timeout: 30000 });
    // A URL muda antes da barra do passo novo: espera a barra certa.
    await v2.waitForFunction((n) => (document.querySelector(".wz-k")?.textContent || "").includes(`Passo ${n} de 4`), n, { timeout: 30000 });
    await v2.click(".wz-skip");
  }
  await v2.waitForURL(/\/recompensa$/, { timeout: 30000 });
  await v2.waitForSelector(".rw-days", { timeout: 40000 });
  const rw = await v2.evaluate(() => ({ today: document.querySelector(".rw-day.is-today b")?.textContent, days: document.querySelectorAll(".rw-day").length, title: document.querySelector(".rw-title").textContent, state: document.querySelector(".rw-state").textContent }));
  await v2.click(".rw-foot .cta");
  await v2.waitForFunction(() => /Já recebida|Recompensa recebida/.test(document.querySelector(".rw-state")?.textContent || "") && !document.querySelector(".rw-foot .cta"), null, { timeout: 30000 });
  const rw2 = await v2.evaluate(() => document.querySelector(".rw-state").textContent);
  const cash1 = (await serverCareer(v2)).finances.cash;
  await v2.click(".rw-foot .link-back");
  await v2.waitForSelector(".home", { timeout: 15000 });
  const row = await v2.locator('.home a.row[href$="/recompensa"] .row-sub').textContent();
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 15000 });
  await v2.waitForTimeout(800);
  const pathAfterReload = new URL(v2.url()).pathname;
  check("5) Recompensa: abre sozinha (dia 1 de 7, 'R$ 500 no caixa'); 'Receber' põe R$ 500 no caixa e some; Início mostra 'Recebida hoje'; recarregar não reabre:",
    rw.today === "1" && rw.days === 7 && rw.title === "R$ 500 no caixa" && /Receba/.test(rw.state) && /Recompensa recebida/.test(rw2) && cash1 === cash0 + 500 && row === "Recebida hoje" && pathAfterReload === "/",
    JSON.stringify({ rw, rw2, cash: [cash0, cash1], row, pathAfterReload }));

  // 6) Sessão expirada no meio do uso.
  await v2.click('.home a.row[href$="/escalacao"]');
  await v2.waitForSelector(".lu-form-btn");
  await v2.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await v2.click(".lu-form-btn");
  await v2.waitForSelector('[role="dialog"] [role="radio"]');
  await v2.locator('[role="dialog"] [role="radio"]:not([aria-checked="true"])').first().click();
  await v2.waitForSelector("#lg-t", { timeout: 15000 });
  const sheet = await v2.evaluate(() => ({ title: document.querySelector("#lg-t").textContent, path: location.pathname }));
  await v2.fill('[role="dialog"] input[type="email"]', emailB);
  await v2.fill('[role="dialog"] input[type="password"]', "senha123");
  await v2.click('[role="dialog"] button[type="submit"]');
  await v2.waitForSelector('[role="dialog"] .inline-error', { timeout: 10000 });
  const other = await v2.locator('[role="dialog"] .inline-error').last().textContent();
  await v2.fill('[role="dialog"] input[type="email"]', email);
  await v2.fill('[role="dialog"] input[type="password"]', "senha123");
  await v2.click('[role="dialog"] button[type="submit"]');
  await v2.waitForFunction(() => !document.querySelector("#lg-t"), null, { timeout: 15000 });
  check("6) Sessão expirada no meio do uso: folha 'Sua sessão expirou.' sobre a tela; outra conta recusada; a mesma conta fecha a folha:",
    sheet.title === "Sua sessão expirou." && sheet.path === "/escalacao" && /outra conta/.test(other), JSON.stringify({ sheet, other }));

  // 7) Sem /carreira-old e 360 px.
  const old = navs.filter((p) => p.startsWith("/carreira-old"));
  const okSizes = Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0);
  check("7) Nenhuma navegação passou por /carreira-old; login, competição e clube em 360 px sem rolagem horizontal e alvos ≥ 44 px:",
    old.length === 0 && okSizes, JSON.stringify({ old, sizes }));

  await browser.close();
})();
