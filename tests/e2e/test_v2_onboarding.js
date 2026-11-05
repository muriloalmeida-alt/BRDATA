// Carreira 2.0 — item 1 do diagnóstico (05/11): tutorial de boas-vindas,
// assistente de início e "Compartilhar título", pela UI real.
//  1) Conta nova cria a carreira pela v2: "Ir para o clube" abre o tutorial
//     (4 telas, textos da v2); "Começar" marca a conta (onboardingSeen).
//  2) Em seguida o assistente: passo 1 na Escalação com a barra "Passo 1 de
//     4"; "Continuar" e "Pular esta etapa" levam às telas da v2 (Comissão,
//     Contratar olheiro, Instruções táticas); a barra de baixo some.
//  3) Passo 4: "Começar a temporada" grava as instruções mexidas e marca o
//     save (startupWizardSeen); depois vem a recompensa diária.
//  4) Recarregar não reabre tutorial nem assistente; carreira já em
//     andamento com o assistente "não visto" não é interrompida.
//  5) Encerramento: campeão da série e da Copa no mesmo ano mostra um
//     "Compartilhar título" para cada; o cartão baixa campeao-<ano>.png.
//  6) Tutorial e barra do assistente em 360 px: sem rolagem horizontal,
//     alvos ≥ 44 px.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { base, signup, serverCareer } = require("./_v2_match");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const v2 = await ctx.newPage();
  v2.on("dialog", (d) => d.dismiss());
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const sizes = {};
  const small = () => v2.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll(".ob a, .ob button, .wz a, .wz button")].filter((el) => { const r = el.getBoundingClientRect(); return r.height && r.height < 44; }).map((el) => el.className) }));
  const at360 = async (k) => { await v2.setViewportSize({ width: 360, height: 780 }); await v2.waitForTimeout(150); sizes[k] = await small(); await v2.setViewportSize({ width: 390, height: 844 }); };

  // Conta nova + carreira criada pela v2 (Série A, 1º clube da lista).
  await signup(v2, `v2onb${Date.now()}@teste.com`);
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
  const created = await serverCareer(v2);

  // 1) Tutorial.
  await v2.click(".ac-foot .cta");
  await v2.waitForURL(/\/boas-vindas$/, { timeout: 20000 });
  await v2.waitForSelector(".ob-title", { timeout: 10000 });
  const slides = [];
  for (let i = 0; i < 4; i++) {
    slides.push(await v2.evaluate(() => ({ t: document.querySelector(".ob-title").textContent, x: document.querySelector(".ob-text").textContent, cta: document.querySelector(".ac-foot .cta").textContent, on: [...document.querySelectorAll(".ob-dots li")].findIndex((d) => d.classList.contains("is-on")) })));
    if (i === 0) await at360("tutorial");
    if (i < 3) await v2.click(".ac-foot .cta");
  }
  const meBefore = await v2.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user.onboardingSeen);
  await v2.click(".ac-foot .cta");
  await v2.waitForURL(/assistente=1/, { timeout: 20000 });
  const meAfter = await v2.evaluate(async () => (await (await fetch("/api/auth/me")).json()).user.onboardingSeen);
  check("1) Tutorial: abre depois da criação, 4 telas com os textos da v2 ('Preparar partida'; Elenco, Jogos e Mais), 'Avançar' e 'Começar'; marca a conta:",
    created && created.startupWizardSeen === false && slides.length === 4 && slides[0].t === "Bem-vindo ao Modo Técnico." && slides.map((s) => s.on).join() === "0,1,2,3"
      && slides.slice(0, 3).every((s) => s.cta === "Avançar") && slides[3].cta === "Começar" && slides.some((s) => s.x.includes("Preparar partida")) && slides.some((s) => s.x.includes("Elenco, Jogos e Mais"))
      && meBefore === false && meAfter === true,
    JSON.stringify({ slides: slides.map((s) => s.t), meBefore, meAfter, wiz: created && created.startupWizardSeen }));

  // 2) Assistente: passos 1 a 3.
  // A URL muda antes da barra do passo novo: espera a barra certa.
  const barOf = (n) => v2.waitForFunction((n) => (document.querySelector(".wz-k")?.textContent || "").includes(`Passo ${n} de 4`), n, { timeout: 30000 });
  const bar = () => v2.evaluate(() => ({ path: location.pathname, k: document.querySelector(".wz-k")?.textContent, t: document.querySelector(".wz-t")?.textContent, next: document.querySelector(".wz-next")?.textContent, tabbar: !!document.querySelector(".tabbar") && getComputedStyle(document.querySelector(".tabbar")).display !== "none", h1: document.querySelector("h1")?.textContent }));
  await v2.waitForSelector(".wz", { timeout: 20000 });
  await v2.waitForFunction(() => !document.querySelector(".state"), null, { timeout: 20000 }).catch(() => {});
  const p1 = await bar();
  await at360("assistente");
  await v2.click(".wz-next");
  await v2.waitForURL(/\/comissao\?assistente=2/, { timeout: 20000 });
  await barOf(2);
  const p2 = await bar();
  await v2.click(".wz-skip");
  await v2.waitForURL(/\/olheiros\/contratar\?assistente=3/, { timeout: 20000 });
  await barOf(3);
  const p3 = await bar();
  await v2.click(".wz-next");
  await v2.waitForURL(/\/tatica\/instrucoes\?assistente=4/, { timeout: 20000 });
  await barOf(4);
  check("2) Assistente: Escalação, Comissão, Contratar olheiro e Instruções táticas, com 'Passo N de 4'; 'Continuar' e 'Pular esta etapa' avançam; sem barra de baixo:",
    p1.path === "/escalacao" && p1.k === "Assistente de início · Passo 1 de 4" && p1.t === "Monte sua formação favorita" && p1.next === "Continuar" && !p1.tabbar
      && p2.path === "/comissao" && /Passo 2 de 4/.test(p2.k) && p3.path === "/olheiros/contratar" && /Passo 3 de 4/.test(p3.k),
    JSON.stringify({ p1, p2, p3 }));

  // 3) Passo 4: mexe numa instrução e "Começar a temporada" grava tudo.
  await v2.waitForSelector(".wz-next", { timeout: 20000 });
  await v2.waitForFunction(() => !document.querySelector(".state"), null, { timeout: 30000 }).catch(() => {});
  const before = (await serverCareer(v2)).lineup.tactics;
  const p4 = await bar();
  // Primeiro eixo: escolhe um nível diferente do atual.
  const changed = await v2.evaluate(() => {
    const scale = document.querySelector(".pr-pad [role='radiogroup']");
    const opts = [...scale.querySelectorAll("[role='radio']")];
    const cur = opts.findIndex((o) => o.getAttribute("aria-checked") === "true");
    const pick = cur === 4 ? 0 : 4;
    opts[pick].click();
    return pick + 1;
  });
  await v2.click(".wz-next");
  await v2.waitForURL((u) => !/assistente=/.test(u.toString()), { timeout: 30000 });
  const after = await serverCareer(v2);
  const axis0 = Object.keys(before)[0];
  const landed = new URL(v2.url()).pathname;
  check("3) Passo 4 'Começar a temporada' grava a instrução mexida e marca o save; depois abre a recompensa diária:",
    p4.next === "Começar a temporada" && after.startupWizardSeen === true && Object.values(after.lineup.tactics).includes(changed) && JSON.stringify(after.lineup.tactics) !== JSON.stringify(before) && landed === "/recompensa",
    JSON.stringify({ next: p4.next, seen: after.startupWizardSeen, before, after: after.lineup.tactics, changed, axis0, landed }));

  // 4) Recarregar não reabre; carreira em andamento não é interrompida.
  await v2.click(".rw-foot .cta").catch(() => {});
  await v2.waitForFunction(() => !document.querySelector(".rw-foot .cta"), null, { timeout: 30000 }).catch(() => {});
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 20000 });
  await v2.waitForTimeout(1500);
  const r1 = new URL(v2.url()).pathname;
  const patch = (src) => v2.evaluate(async (src) => {
    const c = (await (await fetch("/api/career", { cache: "no-store" })).json()).career;
    new Function("c", src)(c);
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
  }, src);
  await patch("c.startupWizardSeen = false; c.careerTotals = Object.assign({}, c.careerTotals, { j: 5 });");
  await v2.goto(base + "/", { waitUntil: "domcontentloaded" });
  await v2.waitForSelector(".home", { timeout: 20000 });
  await v2.waitForTimeout(1500);
  const r2 = new URL(v2.url()).pathname + new URL(v2.url()).search;
  check("4) Recarregar não reabre tutorial nem assistente; carreira já em andamento ('não visto') não é interrompida:", r1 === "/" && r2 === "/", JSON.stringify({ r1, r2 }));

  // 5) Compartilhar título: 1º lugar no Brasileirão e Copa no mesmo ano.
  await patch(`
    Object.keys(c.standings).forEach((id, i) => { const s = c.standings[id];
      if (String(id) === String(c.clubId)) { s.pts = 999; s.v = 38; s.j = 38; s.sg = 100; s.gp = 100; } else { s.pts = i; s.j = 38; } });
    c.currentRound = 39;
    c.cup = Object.assign({}, c.cup || {}, { active: true, phase: "done", championIsHuman: true, champion: c.clubId, humanAlive: true });`);
  await v2.goto(base + "/temporada", { waitUntil: "domcontentloaded" });
  await v2.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Temporada encerrada.", null, { timeout: 30000 });
  const titles = await v2.evaluate(() => [...document.querySelectorAll(".se-share .row-kicker")].map((k) => k.textContent));
  const [dl] = await Promise.all([v2.waitForEvent("download", { timeout: 20000 }).catch(() => null), v2.locator(".se-share").first().click()]);
  const file = dl ? dl.suggestedFilename() : null;
  const msg = await v2.locator(".se-share-msg").textContent({ timeout: 5000 }).catch(() => "");
  check("5) Encerramento campeão da Série A e da Copa: um 'Compartilhar título' para cada, com o nome certo; o cartão baixa campeao-<ano>.png:",
    JSON.stringify(titles) === JSON.stringify(["Campeão brasileiro", "Campeão da Copa do Brasil"]) && file === `campeao-${created.seasonYear}.png` && /Imagem baixada/.test(msg),
    JSON.stringify({ titles, file, msg }));
  await patch("c.competitionId = 'serie_b'; c.cup = Object.assign({}, c.cup, { championIsHuman: false });");
  await v2.reload({ waitUntil: "domcontentloaded" });
  await v2.waitForFunction(() => (document.querySelector("h1") || {}).textContent === "Temporada encerrada.", null, { timeout: 30000 });
  const titlesB = await v2.evaluate(() => [...document.querySelectorAll(".se-share .row-kicker")].map((k) => k.textContent));
  check("5b) Campeão da Série B: o botão diz 'Campeão da Série B' (sem Copa):", JSON.stringify(titlesB) === JSON.stringify(["Campeão da Série B"]), JSON.stringify(titlesB));

  // 6) 360 px.
  check("6) Tutorial e barra do assistente em 360 px: sem rolagem horizontal e alvos ≥ 44 px:",
    Object.values(sizes).length === 2 && Object.values(sizes).every((s) => s.overflow <= 0 && s.small.length === 0), JSON.stringify(sizes));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
