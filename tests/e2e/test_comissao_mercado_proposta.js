// Sugestão de Mercado da Comissão Técnica: aceitar abre a MESMA proposta
// real do Mercado, em vez de comprar na hora.
// Lote L3c (12/11/2026, plano "testes sem a tela antiga"): antes pelo menu e
// pelos diálogos da tela antiga (#btnOpenCommission, ícone "Mercado:",
// #btnOfferConfirm). Agora pela tela "Fortaleça a comissão." da v2
// (/comissao): contratar, a sugestão de Mercado com "Fazer proposta", que
// leva a "Faça sua oferta." (a proposta real), e enviar.
// O diálogo intermediário da tela antiga (item 1b) não existe na v2: o
// próprio botão da sugestão diz "Fazer proposta".
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { carreiraV2, signup, ensureDailyClaimed, noMotor, saveNoServidor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  // Pré-temporada: a janela de transferências está aberta.
  await carreiraV2(page, `comissaomercado${Date.now()}@teste.com`, { clube: "fla", criarConta: signup, preTemporada: true });
  await ensureDailyClaimed(page);
  const h1 = (t) => page.waitForFunction((t) => (document.querySelector("h1") || {}).textContent === t, t, { timeout: 20000 });

  // Contrata a comissão técnica pela tela da v2.
  await page.goto(base + "/comissao", { waitUntil: "domcontentloaded" });
  await h1("Fortaleça a comissão.");
  await page.locator(".cal-foot .cta, .wk-foot .cta, button.cta", { hasText: "Contratar comissão técnica" }).click();
  await page.locator('[role="alertdialog"] button, [role="dialog"] button', { hasText: "Contratar" }).first().click();
  await page.waitForSelector("#cm-g", { timeout: 20000 });

  // Se não houver sugestão de mercado agora (depende do elenco sorteado),
  // um titular fraco garante uma — sem inventar mecânica, só o cenário.
  await noMotor(page, async ({ CAREER, carga, persistir }) => {
    const s = carga.COMMISSION_AREAS.find((a) => a.id === "market").fn();
    if (!s.canApply) {
      const starter = CAREER.squad.find((p) => CAREER.lineup.starters.includes(p.id));
      if (starter) starter.overall = 40;
      await persistir();
    }
  });
  await page.goto(base + "/comissao", { waitUntil: "domcontentloaded" });
  await h1("Fortaleça a comissão.");
  await page.waitForSelector("#cm-g", { timeout: 20000 });
  const sug = await page.evaluate(() => {
    const box = [...document.querySelectorAll(".cl-sug")].find((b) => (b.querySelector(".cl-sug-t") || {}).textContent === "Mercado");
    const btn = box && box.querySelector("button");
    return box ? { texto: box.textContent, botao: btn ? btn.textContent : null, desativado: btn ? btn.disabled : null } : null;
  });
  check("1) A sugestão de Mercado da comissão está disponível, com o botão \"Fazer proposta\":", !!sug && sug.botao === "Fazer proposta" && sug.desativado === false, JSON.stringify(sug));

  // 2) Tocar NÃO compra na hora: abre a proposta real, com caixa e elenco intactos.
  const antes = await saveNoServidor(page);
  await page.locator(".cl-sug", { hasText: "Mercado" }).locator("button", { hasText: "Fazer proposta" }).click();
  await h1("Faça sua oferta.");
  const depois = await saveNoServidor(page);
  const tela2 = await page.evaluate(() => ({ url: location.pathname + location.search, ok: (document.querySelector(".pr-ok") || {}).textContent || "" }));
  check("2) \"Fazer proposta\" abre a proposta real (não compra na hora: caixa e elenco intactos):",
    tela2.url.startsWith("/mercado/proposta?") && depois.finances.cash === antes.finances.cash && depois.squad.length === antes.squad.length && (depois.pendingOffersOut || []).length === 0,
    JSON.stringify({ tela2, caixa: [antes.finances.cash, depois.finances.cash] }));
  check("2b) Sem aviso de \"sugestão aplicada\" precoce (a confirmação é a própria proposta):", !/aplicada/i.test(tela2.ok), tela2.ok);

  // 3) Enviar cria a proposta de verdade.
  await page.waitForFunction(() => Number((document.getElementById("pp-v") || {}).value) > 0, null, { timeout: 20000 });
  await page.click(".pr .cal-foot .cta");
  await h1("Proposta enviada.");
  const s3 = await saveNoServidor(page);
  check("3) Enviar cria a proposta de verdade (pendingOffersOut) e mostra \"Proposta enviada.\":", (s3.pendingOffersOut || []).length === 1, JSON.stringify(s3.pendingOffersOut));

  check("4) Sem erro na página:", erros.length === 0, erros.slice(0, 3).join(" | "));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
