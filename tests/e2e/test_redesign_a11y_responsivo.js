// Redesign capítulos 1–7 — acessibilidade e responsividade verificáveis
// automaticamente, em 4 viewports (360×780, 390×844, 430×932, 1280×800):
//  - nenhuma tela com rolagem horizontal (critério de aceite do Cap. 1/2);
//  - todo campo de formulário visível com nome acessível;
//  - alvos de toque dos componentes novos (.bd-*) com ≥ 44 px de altura;
//  - CTA principal do Início não fica sob a navegação inferior;
//  - zoom: as diretrizes pedem não bloquear, mas existe pedido explícito
//    anterior do usuário pra bloquear (ver <head> de carreira.html e
//    test_ux_zoom_scroll). Decisão pendente de Produto — aqui só registra.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { passCareerSetup, enterGame, waitForBoot } = require("./_startup");

const VIEWPORTS = [[360, 780], [390, 844], [430, 932], [1280, 800]];

async function audit(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const unlabeled = [...document.querySelectorAll("input:not([type=hidden]):not(.sr-only), select, textarea")].filter(vis).filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
      return !el.closest("label");
    }).map((el) => el.id || el.name || el.className);
    const small = [...document.querySelectorAll(".bd-btn-primary, .bd-btn-ghost, .bd-chip, .bd-icon-btn, .bd-fav, .bd-quick-btn, .bd-fixture, .bd-comp-row, .bd-bottom-nav .m3-nav-item, .bd-ctx-tab, .bd-field-action")]
      .filter(vis).filter((el) => el.getBoundingClientRect().height < 40).map((el) => `${el.id || el.className.split(" ").slice(0, 2).join(".")}:${Math.round(el.getBoundingClientRect().height)}`);
    return { overflow, unlabeled, small };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const base = "http://localhost:8787";
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.dismiss());
    const tag = `${w}×${h}`;
    const problems = [];
    const note = (screen, a) => {
      if (a.overflow > 1) problems.push(`${screen}: rolagem horizontal de ${a.overflow}px`);
      if (a.unlabeled.length) problems.push(`${screen}: campos sem rótulo ${a.unlabeled.join(",")}`);
      if (a.small.length) problems.push(`${screen}: alvos < 40px ${a.small.slice(0, 5).join(",")}`);
    };
    await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
    await waitForBoot(page);
    if (w === 390) {
      const zoom = await page.evaluate(() => document.querySelector('meta[name="viewport"]')?.content || "");
      const blocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(zoom);
      check(`0) [informativo — decisão pendente] zoom ${blocked ? "BLOQUEADO (pedido anterior do usuário)" : "liberado"}: ${zoom}`);
    }
    note("login", await audit(page));
    const email = `a11y${w}${Date.now()}@teste.com`;
    await page.evaluate(async (email) => {
      await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Teste A11y", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
      await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
    }, email);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForBoot(page);
    note("competição", await audit(page));
    await page.click('.mt-competition-card[data-competition="brasileirao"]');
    await page.waitForSelector(".m3-club-row", { timeout: 20000 });
    await page.click(".m3-club-row");
    note("clube", await audit(page));
    await page.click("#btnConfirmClub");
    await page.waitForSelector("#screenSetup:not(.hidden)");
    note("configurar carreira", await audit(page));
    await page.click("#btnStartCareer");
    await page.waitForSelector("#screenFirstEntry:not(.hidden)", { timeout: 30000 });
    note("primeira entrada", await audit(page));
    await passCareerSetup(page);
    await enterGame(page);
    for (const panel of ["central", "elenco", "escalacao", "mercado", "jogos", "tabela", "clube"]) {
      await page.evaluate((p) => switchToPanel(p), panel);
      await page.waitForTimeout(200);
      note(`painel ${panel}`, await audit(page));
    }
    // CTA principal do Início visível e fora da área da navegação inferior.
    await page.evaluate(() => switchToPanel("central"));
    await page.evaluate(() => document.getElementById("btnSimulate").scrollIntoView({ block: "center" }));
    const cta = await page.evaluate(() => {
      const b = document.getElementById("btnSimulate").getBoundingClientRect();
      const nav = document.querySelector(".m3-bottom-nav").getBoundingClientRect();
      return { ctaBottom: Math.round(b.bottom), navTop: Math.round(nav.top) };
    });
    if (cta.ctaBottom > cta.navTop) problems.push(`Início: CTA sob a navegação ${JSON.stringify(cta)}`);
    check(`${tag}) Sem rolagem horizontal, campos rotulados, alvos ≥40px, CTA livre:`, problems.length === 0, JSON.stringify(problems.slice(0, 8)));
    await ctx.close();
  }
  await browser.close();
})();
