// Nova feature (pedido do usuário: "criar um card no início com o
// título comissão técnica e com os botões com as sugestões dadas por
// eles de maneira resumida") — versão condensada das 4 sugestões da
// Comissão Técnica direto no Início.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { skipOnboarding } = require("./_startup");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  const base = "http://localhost:8787";
  const email = `comissaoresumo${Date.now()}@teste.com`;
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Resumo Comissao", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(300);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await skipOnboarding(page);
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.click("#btnClaimDailyLogin").catch(() => {});
  await page.waitForTimeout(200);

  // 1) Sem comissão contratada, o card não aparece na Início.
  const check1 = await page.evaluate(() => document.getElementById("commissionSummaryCard").style.display === "none");
  check("1) Sem comissão contratada, card não aparece no Início:", check1);

  // 0) Pedido do usuário: "Comissão Técnica na página inicial deve
  // substituir o card de elenco em destaque" — o carrossel antigo saiu
  // de vez (nem existe mais no DOM) e a Comissão ocupa o lugar dele,
  // antes do card "Resultado da última rodada".
  const check0 = await page.evaluate(() => {
    const destaqueGone = !document.getElementById("destaqueTitle") && !document.getElementById("destaquePlayers");
    const commissionEl = document.getElementById("commissionSummaryCard");
    const lastResultEl = document.getElementById("lastResultCard");
    const commissionBeforeLastResult = !!(commissionEl.compareDocumentPosition(lastResultEl) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { destaqueGone, commissionBeforeLastResult };
  });
  check("0) Carrossel 'Elenco em destaque' removido e Comissão Técnica ocupa o lugar dele (antes do Resultado da última rodada):",
    check0.destaqueGone && check0.commissionBeforeLastResult, JSON.stringify(check0));

  // 2) Contratar (via Menu > Equipe & Treinos) faz o card aparecer com
  // os 4 botões (mesmas áreas da tela cheia).
  await page.click("#btnBottomMenu");
  await page.waitForTimeout(150);
  await page.click("#topbarMenu .mt-topbar-menu-item.group[data-submenu='equipe']");
  await page.click("#btnOpenCommission");
  await page.waitForTimeout(200);
  await page.click("#btnHireCommission");
  await page.waitForTimeout(150);
  await page.click("#confirmOkBtn");
  await page.waitForTimeout(200);
  await page.click("#commissionClose");
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(200);
  const check2 = await page.evaluate(() => {
    const card = document.getElementById("commissionSummaryCard");
    const row = document.getElementById("commissionSummaryList");
    const btns = [...row.querySelectorAll(".m3-commission-icon-btn")];
    return {
      visible: card.style.display !== "none",
      count: btns.length,
      titles: btns.map((b) => b.title),
      oneRow: getComputedStyle(row).display === "flex",
      onlyIcon: btns.every((b) => b.children.length === 0), // sem <b>/<span> filho -- só o emoji como texto solto
    };
  });
  check("2) Com a comissão contratada, card aparece com os 4 botões só de ícone, numa linha só (Escalação/Treinos/Tática/Mercado):",
    check2.visible && check2.count === 4 && check2.oneRow && check2.onlyIcon
    && check2.titles.some((t) => t.includes("Escalação")) && check2.titles.some((t) => t.includes("Treinos"))
    && check2.titles.some((t) => t.includes("Tática")) && check2.titles.some((t) => t.includes("Mercado")),
    JSON.stringify(check2));

  // 3) Rodada 1 -> sugestão de Treinos é aplicável (Pré-Temporada
  // Física, mesma regra real de suggestTraining) — clicável (tem a
  // classe has-suggestion) e o title carrega o resumo; clicar aplica
  // de verdade (CAREER.trainingSchemeId muda), sem precisar abrir a
  // tela cheia.
  const trainingBtnInfo = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("#commissionSummaryList .m3-commission-icon-btn")].find((b) => b.title.includes("Treinos"));
    return { disabled: btn.disabled, hasSuggestion: btn.classList.contains("has-suggestion"), title: btn.title };
  });
  check("3) Botão de Treinos clicável (has-suggestion) com o title certo (rodada 1 -> Pré-Temporada Física):",
    !trainingBtnInfo.disabled && trainingBtnInfo.hasSuggestion && trainingBtnInfo.title.includes("Pré-Temporada Física"), JSON.stringify(trainingBtnInfo));
  const trainingIdx = await page.evaluate(() => [...document.querySelectorAll("#commissionSummaryList .m3-commission-icon-btn")].findIndex((b) => b.title.includes("Treinos")));
  // UX-COMISSAO-001 — clicar no ícone só ABRE a sugestão num diálogo;
  // nada é aplicado antes de "Aplicar". "Agora não" fecha sem aplicar.
  const schemeBefore = await page.evaluate(() => CAREER.trainingSchemeId);
  await page.click(`#commissionSummaryList .m3-commission-icon-btn:nth-child(${trainingIdx + 1})`);
  await page.waitForTimeout(300);
  const dialogInfo = await page.evaluate(() => ({
    text: document.querySelector(".m3-dialog-overlay .m3-dialog-body")?.textContent || "",
    scheme: CAREER.trainingSchemeId,
  }));
  check("3a) Clicar no ícone abre diálogo com a sugestão completa e NÃO aplica nada ainda:",
    dialogInfo.text.includes("Pré-Temporada Física") && dialogInfo.scheme === schemeBefore, JSON.stringify(dialogInfo));
  await page.click('.m3-dialog-overlay [data-commission-act="later"]');
  await page.waitForTimeout(200);
  const afterLater = await page.evaluate(() => ({ open: !!document.querySelector(".m3-dialog-overlay"), scheme: CAREER.trainingSchemeId }));
  console.log("3a2) 'Agora não' fecha o diálogo sem aplicar:", !afterLater.open && afterLater.scheme === schemeBefore, JSON.stringify(afterLater));
  await page.click(`#commissionSummaryList .m3-commission-icon-btn:nth-child(${trainingIdx + 1})`);
  await page.waitForTimeout(300);
  await page.click('.m3-dialog-overlay [data-commission-act="apply"]');
  await page.waitForTimeout(300);
  const afterApply = await page.evaluate(() => CAREER.trainingSchemeId);
  check("3b) Confirmar \"Aplicar\" no diálogo aplica de verdade (trainingSchemeId vira 'pretemporada'):", afterApply === "pretemporada", afterApply);

  // 3c) Pedido do usuário: "ao clicar na caixa de mensagem deve
  // informar qual foi a sugestão aceita" — o toast mostra o texto real
  // da sugestão aceita (não só o nome da área).
  const toastInfo = await page.evaluate(() => ({
    title: document.querySelector("#toast .ct-toast-title")?.textContent || "",
    detail: document.querySelector("#toast .ct-toast-detail")?.textContent || "",
  }));
  check("3c) Toast informa a sugestão de verdade que foi aceita (Pré-Temporada Física), não só 'Treinos':",
    toastInfo.title.includes("Treinos") && toastInfo.detail.includes("Pré-Temporada Física"), JSON.stringify(toastInfo));

  // 4) Depois de aplicar (aceito), o botão de Treinos re-renderiza sem
  // has-suggestion e desabilitado -- mesma lógica de suggestTraining,
  // só que resumida num ícone.
  const afterApplyBtnInfo = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("#commissionSummaryList .m3-commission-icon-btn")].find((b) => b.title.includes("Treinos"));
    return { disabled: btn.disabled, hasSuggestion: btn.classList.contains("has-suggestion"), title: btn.title };
  });
  check("4) Depois de aceitar, botão de Treinos vira desabilitado e sem o pontinho (já no esquema recomendado):",
    afterApplyBtnInfo.disabled && !afterApplyBtnInfo.hasSuggestion && afterApplyBtnInfo.title.includes("Já está no esquema recomendado"), JSON.stringify(afterApplyBtnInfo));

  await page.screenshot({ path: "screens/comissao_resumo_inicio.png" });

  // 5) Demitir a comissão esconde o card de novo.
  await page.click("#btnBottomMenu");
  await page.waitForTimeout(150);
  await page.click("#topbarMenu .mt-topbar-menu-item.group[data-submenu='equipe']");
  await page.click("#btnOpenCommission");
  await page.waitForTimeout(200);
  await page.click("#btnFireCommission");
  await page.waitForTimeout(150);
  await page.click("#confirmOkBtn");
  await page.waitForTimeout(200);
  await page.click("#commissionClose");
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(200);
  const check5 = await page.evaluate(() => document.getElementById("commissionSummaryCard").style.display === "none");
  check("5) Demitir a comissão esconde o card de novo no Início:", check5);

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
