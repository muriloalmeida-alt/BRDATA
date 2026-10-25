const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { skipOnboarding } = require("./_startup");
const { playNextMatchRound } = require("./_round");
const { skipPreseason } = require("./_calendar_skip");

async function newCareer(page, base, email) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ email }) => {
    await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Patrocinio Test", email, password: "senha123", phone: "11999999999", plan: "freemium" }) });
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "senha123" }) });
  }, { email });
  await page.goto(base + "/carreira.html", { waitUntil: "domcontentloaded" });
  await page.click('.mt-competition-card[data-competition="brasileirao"]');
  await page.waitForTimeout(200);
  await page.click(".m3-club-row");
  await page.waitForTimeout(150);
  await page.click("#btnConfirmClub");
  await skipOnboarding(page);
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnWizardSkip", { timeout: 4000 }).catch(() => {});
  await page.click("#btnClaimDailyLogin", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
}
async function getCareer(page) {
  return page.evaluate(async () => (await (await fetch("/api/career")).json()).career);
}
async function putCareer(page, career) {
  await page.evaluate(async (career) => {
    await fetch("/api/career", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(career) });
  }, career);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    headless: true,
    args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("fonts.googleapis") && !m.text().includes("fundingchoices")) console.log("CONSOLE ERROR:", m.text()); });

  const base = "http://localhost:8787";
  await newCareer(page, base, `patro${Date.now()}@teste.com`);

  // 1) Carreira nova já nasce com os 2 contratos de patrocínio.
  let career = await getCareer(page);
  check("1) Nasce com contrato master:", !!career.sponsorship.master, "| material:", !!career.sponsorship.material);
  console.log("   Valores plausíveis:", career.sponsorship.master.valorTemporada > 0, career.sponsorship.material.valorTemporada > 0);

  // 2) Card "Patrocínios" aparece na Central com os 2 contratos.
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);
  const boxText = await page.evaluate(() => document.getElementById("sponsorshipBox").textContent);
  check("2) Card mostra Patrocinador Master e Material Esportivo:", boxText.includes("Patrocinador Master") && boxText.includes("Material Esportivo"));

  // 3) Contrato vence (temporadasRestantes chega a 0) -- vira propostas
  // pendentes e o botão "Ver propostas" aparece.
  career = await getCareer(page);
  career.sponsorship.master.temporadasRestantes = 1;
  career.currentRound = 39; // temporada terminada, pronta pra avançar
  await putCareer(page, career);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(300);
  await page.click("#btnAdvanceSeason");
  await page.waitForTimeout(200);
  await page.click("#confirmOkBtn");
  await page.waitForTimeout(500);
  career = await getCareer(page);
  check("3) Contrato master venceu (null) e virou propostas pendentes:", career.sponsorship.master === null, "| 3 propostas:", (career.sponsorProposals.master || []).length === 3);
  console.log("   Material (tinha mais tempo) continua igual:", !!career.sponsorship.material);

  // Fecha o modal de nova temporada pra poder navegar.
  await page.click("#btnSeasonContinue").catch(() => {});
  await page.waitForTimeout(300);
  // O card de Patrocínios mora na aba Clube desde o reskin M3 (Bloco 1,
  // Início/Clube) — não mais na Central (pré-existente, sem relação
  // com o checklist de UX desta etapa; o teste nunca foi atualizado).
  await page.click(".m3-nav-item[data-panel='clube']");
  await page.waitForTimeout(300);

  // 4) Botão "Ver propostas" aparece só pro master (vencido).
  const hasBtnMaster = await page.evaluate(() => !!document.querySelector('[data-sponsor-choose="master"]'));
  const hasBtnMaterial = await page.evaluate(() => !!document.querySelector('[data-sponsor-choose="material"]'));
  check("4) Botão 'Ver propostas' só aparece pro master:", hasBtnMaster && !hasBtnMaterial);

  // 5) Abre o modal, assina uma proposta, confere que o contrato é
  // atualizado e o caixa cresce nas rodadas seguintes.
  const cashBefore = career.finances.cash;
  await page.click('[data-sponsor-choose="master"]');
  await page.waitForSelector("#sponsorProposalsOverlay.open");
  await page.waitForTimeout(200);
  const proposalRows = await page.evaluate(() => document.querySelectorAll("#sponsorProposalsList .mt-sponsor-proposal-row").length);
  await page.click('[data-sponsor-sign="0"]');
  await page.waitForTimeout(300);
  career = await getCareer(page);
  check("5) Modal mostrou 3 propostas:", proposalRows === 3, "| contrato master assinado (não é mais null):", !!career.sponsorship.master);

  // "Ir para o jogo" mora na aba Início -- volta pra lá antes de continuar.
  await page.click(".m3-nav-item[data-panel='central']");
  await page.waitForTimeout(200);

  // 6) Receita de patrocínio entra no caixa e aparece na linha financeira
  // da rodada, em Notícias (#newsFinanceRow). GE-CALENDAR-001: patrocínio
  // e salários são lançados 1x por mês (virada do mês), e a linha só
  // aparece na rodada em que houve lançamento — joga rodadas (fluxo atual,
  // ver _round.js) até a 1ª com lançamento do mês.
  await skipPreseason(page); // GE-CALENDAR-001: carreira nova começa na pré-temporada
  let financeText = "", rounds = 0;
  for (; rounds < 8 && !financeText; rounds++) {
    const r = await playNextMatchRound(page, {
      onNews: async (p) => { financeText = await p.evaluate(() => document.getElementById("newsFinanceRow").textContent); },
    });
    if (r.stoppedAt === "playerOfferOverlay") await page.click("#btnPlayerOfferDecline");
    else if (r.stoppedAt) throw new Error(`rodada parou numa tela inesperada: ${r.stoppedAt}`);
  }
  check("6) Linha financeira da rodada menciona patrocínio:", financeText.includes("Patrocínio"), { rodadasJogadas: rounds, linha: financeText.replace(/\s+/g, " ").trim() });

  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
