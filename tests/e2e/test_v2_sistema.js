// Carreira 2.0 — "Ajustes de sistema" (decisões P1 e P3 de 03/11).
//  1) P3: margem lateral de 24 px em 390 e 430 px e de 20 px em 360 px,
//     medida no título de cada tela; sem rolagem horizontal.
//  2) P1: "Voltar ao …" é ação em texto (sem fundo lima), com alvo ≥ 44 px,
//     em Tabela, Diretoria, Finanças e Perfil do jogador.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, noMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await newCareer(page, `v2sis${Date.now()}@teste.com`);
  const playerId = await noMotor(page, (M) => M.CAREER.lineup.starters[0]);
  await page.close();
  const v2 = await ctx.newPage();
  v2.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  const screens = [
    ["Início", "/", "h1"],
    ["Escalação", "/escalacao", "h1"],
    ["Tabela", "/tabela", "h1"],
    ["Calendário", "/calendario", "h1"],
    ["Elenco", "/elenco", "h1"],
    ["Diretoria", "/diretoria", "h1"],
    ["Finanças", "/financas", "h1"],
    // No Perfil o título fica ao lado da camisa: mede o botão do rodapé.
    ["Perfil", `/elenco/jogador?id=${encodeURIComponent(playerId)}`, ".pf-foot .cta"],
  ];
  const margins = {};
  for (const [w, expected] of [[390, 24], [360, 20], [430, 24]]) {
    await v2.setViewportSize({ width: w, height: 844 });
    for (const [name, url, sel] of screens) {
      await v2.goto("http://localhost:8787" + url, { waitUntil: "domcontentloaded" });
      await v2.waitForSelector(sel, { timeout: 15000 });
      const m = await v2.evaluate((s) => ({ left: Math.round(document.querySelector(s).getBoundingClientRect().left), overflow: document.documentElement.scrollWidth - innerWidth }), sel);
      margins[`${name}@${w}`] = m;
      m.ok = m.left === expected && m.overflow <= 0;
    }
  }
  const bad = Object.entries(margins).filter(([, m]) => !m.ok);
  check("1) Margem lateral 24 px (390 e 430) e 20 px (360) em todas as telas, sem rolagem horizontal:", bad.length === 0, JSON.stringify(bad.length ? bad : "ok"));

  await v2.setViewportSize({ width: 390, height: 844 });
  const backs = {};
  for (const [name, url] of [["Tabela", "/tabela"], ["Diretoria", "/diretoria"], ["Finanças", "/financas"], ["Perfil", `/elenco/jogador?id=${encodeURIComponent(playerId)}`]]) {
    await v2.goto("http://localhost:8787" + url, { waitUntil: "domcontentloaded" });
    await v2.waitForSelector(".link-back", { timeout: 15000 });
    backs[name] = await v2.evaluate(() => {
      const b = document.querySelector(".link-back"); const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
      return { text: b.textContent.trim(), bg: cs.backgroundColor, color: cs.color, h: Math.round(r.height), limeCtaWithVoltar: [...document.querySelectorAll(".cta")].some((c) => /Voltar/.test(c.textContent)) };
    });
  }
  const okBack = Object.values(backs).every((b) => /^Voltar ao/.test(b.text) && (b.bg === "rgba(0, 0, 0, 0)" || b.bg === "transparent") && b.color === "rgb(245, 247, 250)" && b.h >= 44 && !b.limeCtaWithVoltar);
  check("2) 'Voltar ao …' em texto (sem fundo, cor do texto, alvo ≥ 44 px) e nenhum botão lima de voltar em Tabela, Diretoria, Finanças e Perfil:", okBack, JSON.stringify(backs));

  await browser.close();
})();
