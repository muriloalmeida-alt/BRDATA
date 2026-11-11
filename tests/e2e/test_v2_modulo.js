// Plano "sem página escondida", etapas G2b–G2d: a v2 com o motor como módulo,
// sem o quadro escondido em /carreira/motor (desde a G2d, o único caminho).
// Pela UI real da v2, sem a tela antiga:
//   conta e carreira novas pela v2, semanas até o jogo, partida ao vivo até o
//   fim, o pós-jogo até o Início e a rodada gravada no servidor; nenhum quadro
//   /carreira/motor aberto e nenhuma requisição para ele; sem erro na página.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { novaCarreiraV2, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  const quadros = [];
  page.on("frameattached", (f) => quadros.push(f.url()));

  const save0 = await novaCarreiraV2(page, `v2modulo${Date.now()}@teste.com`);
  check("1) Conta e carreira criadas pela v2 com o motor como módulo, até o Início:", !!(save0 && save0.clubId) && (await page.locator(".home").count()) > 0, JSON.stringify({ clube: save0 && save0.clubId, rodada: save0 && save0.currentRound }));

  // Semanas até o jogo, a partida inteira e o pós-jogo, só pela UI.
  const clicar = (sel) => page.click(sel, { timeout: 2000 }).then(() => true, () => false);
  const passos = [];
  let jogou = false;
  for (let k = 0; k < 300; k++) {
    const tela = await page.evaluate(() => {
      const h1 = (document.querySelector("h1") || {}).textContent || "";
      if (document.querySelector(".mt-skip")) return "partida";
      if (document.querySelector('.pz-foot .cta[data-save="saved"]:not([aria-disabled])')) return "resultado";
      if (document.querySelector(".pj-answer")) return document.querySelector(".pj-effect") ? "coletiva-ok" : "coletiva";
      if (document.querySelector(".pm-cta")) return "prejogo";
      if (document.querySelector(".home")) return "inicio";
      if (h1) return "outra:" + h1;
      return "carregando";
    }).catch(() => "carregando");
    if (passos[passos.length - 1] !== tela) passos.push(tela);
    // Para quando a rodada avançou no servidor (amistoso não conta).
    if (tela === "inicio" && jogou && ((await saveNoServidor(page)) || {}).currentRound > save0.currentRound) break;
    if (tela === "partida") { await clicar(".mt-skip"); jogou = true; }
    else if (tela === "resultado") await clicar('.pz-foot .cta[data-save="saved"]');
    else if (tela === "coletiva") await clicar(".pj-answer");
    else if (tela === "coletiva-ok") await clicar(".pj .cal-foot .cta");
    else if (tela === "prejogo") await clicar(".pm-cta");
    else if (tela === "inicio") await clicar(".home-main .cta");
    else if (tela.startsWith("outra:")) {
      // Semana concluída, notícias, resultados, proposta, amistoso: o botão principal.
      if (!(await clicar(".cal-foot .cta")) && !(await clicar(".pz-foot .cta"))) await clicar("main .cta");
    }
    await page.waitForTimeout(300);
  }
  const save1 = await saveNoServidor(page);
  const jogos = (s) => (s && s.matchLog ? s.matchLog.length : 0);
  check("2) Partida jogada ao vivo e pós-jogo até o Início, pela UI da v2:", jogou && (await page.locator(".home").count()) > 0, passos.join(" → "));
  check("3) A rodada foi gravada no servidor (a partida está no histórico e a rodada avançou):",
    jogos(save1) === jogos(save0) + 1 && save1.currentRound === save0.currentRound + 1, JSON.stringify({ antes: [save0.currentRound, jogos(save0)], depois: [save1.currentRound, jogos(save1)] }));
  check("4) Sem quadro escondido: nenhum /carreira/motor aberto nem pedido:",
    !quadros.some((u) => u.includes("/carreira/motor")) && !urls.some((u) => u.includes("/carreira/motor")) && !(await page.locator('iframe[src*="/carreira/motor"]').count()),
    JSON.stringify({ quadros: quadros.filter((u) => u && u !== "about:blank").slice(0, 3) }));
  check("5) O motor veio como módulo (data.js e motor/v2.js carregados pela v2):",
    urls.some((u) => u.endsWith("/js/data.js")) && urls.some((u) => u.endsWith("/js/motor/v2.js")));
  check("6) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
