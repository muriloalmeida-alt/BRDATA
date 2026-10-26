// Verifica os 2 pedidos:
// 1) Botão "Simular rodada" da Central virou "Ir para o jogo", com o
//    mesmo estilo (.mt-btn-primary-gold) dos demais botões "Ir para o
//    jogo" já existentes.
// 2) Info de salários pagos/patrocínio/caixa saiu de "Resultados da
//    rodada" e passou a aparecer no cartão-resumo da tela de Notícias.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { enterGame } = require("./_startup");
const { playNextMatchRound, closeLeftoverTabela } = require("./_round");
const { skipPreseason } = require("./_calendar_skip");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `irprojogo${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ir Pro Jogo", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(200);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await enterGame(page);
  await page.evaluate(() => {
    Object.keys(PRESS_CHANCE_BY_ID).forEach((k) => { PRESS_CHANCE_BY_ID[k] = 1e-12; }); // não 0: `|| 0.3` em determineMatchPressTrigger faria 0 virar 30%
    PRESS_ALWAYS_IDS.clear();
  });

  // 1) Botão da Central (numa semana de jogo — GE-CALENDAR-001: a
  // carreira nova começa na pré-temporada, onde o botão é outro).
  await skipPreseason(page);
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(200);
  const btn1 = await page.evaluate(() => {
    const b = document.getElementById("btnSimulate");
    const gold = document.getElementById("btnPreMatchGo"); // referência de estilo já existente
    return {
      text: b.textContent.trim(),
      hasGoldClass: b.classList.contains("mt-btn-primary-gold"),
      hasGreenClass: b.classList.contains("mt-btn-primary"),
      sameClassAsReference: b.className === gold.className,
    };
  });
  check("1) Botão da Central agora diz 'Ir para o jogo':", btn1.text === "Ir para o jogo");
  console.log("   Tem a classe .mt-btn-primary-gold (mesmo estilo dos outros 'Ir para o jogo'), sem a verde antiga:", btn1.hasGoldClass && !btn1.hasGreenClass);

  // 2) Fluxo completo até Notícias — confere a linha financeira lá.
  // GE-CALENDAR-001: salários são pagos 1x por mês (na virada do mês), e a
  // linha financeira só aparece na rodada em que houve pagamento — então
  // joga rodadas (fluxo atual, ver _round.js) até a 1ª com salário pago.
  let newsFinance = "", roundResultsState = null, rounds = 0;
  for (; rounds < 8 && !newsFinance.includes("Salários pagos"); rounds++) {
    const r = await playNextMatchRound(page, {
      onNews: async (p) => { newsFinance = await p.evaluate(() => document.getElementById("newsFinanceRow").textContent); },
      onRoundResults: async (p) => {
        roundResultsState = await p.evaluate(() => ({
          hasFinanceEl: !!document.getElementById("roundResultsFinance"),
          bodyText: document.querySelector("#roundResultsOverlay .ct-modal-body").textContent,
        }));
      },
    });
    if (r.stoppedAt === "playerOfferOverlay") { await page.click("#btnPlayerOfferDecline"); await closeLeftoverTabela(page); }
    else if (r.stoppedAt) throw new Error(`rodada parou numa tela inesperada: ${r.stoppedAt}`);
  }
  check("2) Notícias mostra a linha financeira (salários pagos):", newsFinance.includes("Salários pagos"), { rodadasJogadas: rounds });
  console.log("   ...e a caixa restante:", newsFinance.includes("Caixa"));

  check("3) Resultados da rodada NÃO tem mais a info financeira (elemento removido):", !!roundResultsState && !roundResultsState.hasFinanceEl);
  console.log("   ...e o texto 'Salários pagos' não aparece mais lá:", !!roundResultsState && !roundResultsState.bodyText.includes("Salários pagos"));

  // 4) Abrindo Notícias pelo menu (consulta, fora do pós-jogo) a linha
  // financeira fica vazia (não é dado que faz sentido fora do momento
  // exato da rodada que acabou de rolar).
  await page.click("#btnBottomMenu");
  await page.waitForTimeout(150);
  await page.click("#topbarMenu .mt-topbar-menu-item.group[data-submenu='imprensa']");
  await page.click("#btnOpenNews");
  await page.waitForSelector("#newsOverlay.open");
  await page.waitForTimeout(150);
  const financeOutsideFlow = await page.evaluate(() => document.getElementById("newsFinanceRow").innerHTML.trim());
  check("4) Notícias aberta pelo menu (consulta) não mostra linha financeira de rodada nenhuma (vazia):", financeOutsideFlow === "");

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
