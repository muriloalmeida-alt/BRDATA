// Reputação do treinador e propostas de clube — lote L4d, sem a tela antiga.
// As regras pelo motor na página da v2 (os mesmos comandos da ponte que a v2
// usa: demitir, criarCarreira, aceitarPropostaClube); o "Reiniciar" pela tela
// Saves da v2. As telas da proposta (linha no Início, Recusar/Aceitar) e do
// perfil/histórico do treinador estão no test_v2_temporada (itens 3 a 5).
//  1) Carreira nova: reputação 50, sem currículo.
//  2) Meta batida sobe a reputação; não batida, desce.
//  3) Títulos somam além da meta sozinha.
//  4) Demissão: o currículo ganha a passagem (motivo "dismissed", 2
//     temporadas, 1 título, posição média 4, nome do clube) e a reputação
//     perde a penalidade (60 → 35).
//  5) A carreira seguinte (outro clube) herda a reputação (35) e o currículo;
//     a herança é consumida.
//  6) "Reiniciar carreira" (Saves da v2) não leva a reputação: a carreira
//     nova nasce com 50 e sem currículo.
//  7) Reputação baixa não gera proposta; alta, com clube mais forte, gera
//     uma (clube e orçamento); não empilha a 2ª.
//  8) Aceitar a proposta: a carreira segue no clube ofertante, com a
//     passagem anterior no currículo (motivo "accepted_proposal") e a
//     reputação mantida.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor, base } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `rep${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  // 1 a 3) Reputação da temporada.
  const r1 = await page.evaluate(() => {
    const T = motorTemporada();
    const me = CAREER.clubId;
    const semTitulo = { seasonYear: 1, brasileirao: { campeao: "outro" }, copaDoBrasil: { disputou: false } };
    const doisTitulos = { seasonYear: 1, brasileirao: { campeao: me }, copaDoBrasil: { disputou: true, campeao: me, vice: "outro" } };
    return {
      rep: CAREER.reputation, hist: (CAREER.clubHistory || []).length,
      batida: T.seasonReputation(50, true, semTitulo, me), naoBatida: T.seasonReputation(50, false, semTitulo, me),
      comTitulos: T.seasonReputation(50, true, doisTitulos, me),
    };
  });
  check("1) Carreira nova: reputação 50, sem currículo:", r1.rep === 50 && r1.hist === 0, JSON.stringify(r1));
  check("2) Meta batida sobe a reputação; não batida, desce:", r1.batida > 50 && r1.naoBatida < 50, JSON.stringify(r1));
  check("3) Dois títulos somam além da meta sozinha:", r1.comTitulos > r1.batida, JSON.stringify(r1));

  // 4) Demissão (ponte.demitir, o mesmo do "O ciclo terminou." da v2).
  const r4 = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const E = await import("/js/motor/estado.js");
    CAREER.reputation = 60;
    CAREER.seasonHistory = [{ year: 1, position: 3 }, { year: 2, position: 5 }];
    CAREER.seasonAwards = [{ seasonYear: 2, brasileirao: { campeao: null }, copaDoBrasil: { disputou: false } }, { seasonYear: 1, brasileirao: { campeao: CAREER.clubId }, copaDoBrasil: { disputou: false } }];
    CAREER.currentRound = 39;
    CAREER.negativeSeasonsStreak = 99;
    const clube = { id: String(CAREER.clubId), nome: CAREER.clubName };
    const d = await P.demitir();
    return { d, clube, heranca: E.herancaDoTecnico(), semCarreira: !CAREER };
  });
  const passagem = r4.heranca && r4.heranca.clubHistory[0];
  check("4) Demissão: currículo com a passagem (dismissed, 2 temporadas, 1 título, posição média 4, nome do clube) e reputação 60 → 35:",
    r4.d.ok && r4.semCarreira && r4.heranca.reputation === 35 && r4.heranca.clubHistory.length === 1 && passagem.reason === "dismissed"
    && passagem.seasons === 2 && passagem.titles === 1 && passagem.avgPosition === 4 && passagem.clubName === r4.clube.nome, JSON.stringify(r4));

  // 5) A carreira seguinte, em outro clube.
  const r5 = await page.evaluate(async (antigo) => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const E = await import("/js/motor/estado.js");
    const c = await P.escolherCompeticao("brasileirao");
    const outro = c.clubes.find((t) => t.id !== antigo).id;
    const r = await P.criarCarreira(outro);
    await P.assistenteVisto(); // como o carreiraV2: a v2 abre direto, sem o assistente
    return { ok: r.ok, outro, clube: String(CAREER.clubId), rep: CAREER.reputation, hist: (CAREER.clubHistory || []).map((h) => h.reason), heranca: E.herancaDoTecnico() };
  }, r4.clube.id);
  check("5) A carreira seguinte (outro clube) herda reputação 35 e o currículo; a herança é consumida:",
    r5.ok && r5.clube === r5.outro && r5.rep === 35 && r5.hist.length === 1 && r5.hist[0] === "dismissed" && r5.heranca === null, JSON.stringify(r5));

  // 6) Reiniciar pela tela Saves da v2.
  await page.evaluate(async () => { CAREER.reputation = 90; await persistCareer(); });
  await page.goto(base + "/saves", { waitUntil: "domcontentloaded" });
  await page.locator("button.pr-row", { hasText: "Reiniciar carreira" }).click();
  await page.waitForSelector("#sv-t");
  await page.fill('[role="alertdialog"] input', "reiniciar");
  await page.click('[role="alertdialog"] .text-btn');
  await page.waitForFunction(() => location.pathname !== "/saves" && !document.querySelector(".home") && document.querySelector("h1"), null, { timeout: 30000 });
  const r6 = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const E = await import("/js/motor/estado.js");
    const c = await P.escolherCompeticao("brasileirao");
    const r = await P.criarCarreira(c.clubes[0].id);
    const C = E.carreiraAtual();
    return { ok: r.ok, rep: C && C.reputation, hist: C && (C.clubHistory || []).length };
  });
  check("6) 'Reiniciar carreira' (Saves da v2) não leva a reputação: nasce com 50 e sem currículo:", r6.ok && r6.rep === 50 && r6.hist === 0, JSON.stringify(r6));

  // 7) Propostas.
  await globaisDoMotor(page);
  const r7 = await page.evaluate(() => {
    CAREER.clubProposals = [];
    CAREER.reputation = 5;
    maybeGenerateClubProposals();
    const semProposta = CAREER.clubProposals.length === 0;
    CAREER.squad.filter((p) => p.origin === "principal").forEach((p) => { p.overall = 30; });
    CAREER.reputation = 99;
    maybeGenerateClubProposals();
    const comProposta = CAREER.clubProposals.length === 1;
    maybeGenerateClubProposals();
    return { semProposta, comProposta, naoEmpilha: CAREER.clubProposals.length === 1, p: CAREER.clubProposals[0] };
  });
  check("7) Reputação baixa não gera proposta; alta (clube mais forte) gera uma, com clube e orçamento; não empilha a 2ª:",
    r7.semProposta && r7.comProposta && r7.naoEmpilha && !!r7.p.clubName && r7.p.budgetOffered > 0, JSON.stringify(r7));

  // 8) Aceitar a proposta (o "Aceitar" da v2).
  const r8 = await page.evaluate(async () => {
    const P = (await import("/js/motor/v2.js")).criarPonte();
    const antes = { clubId: String(CAREER.clubId), clubName: CAREER.clubName, rep: CAREER.reputation, oferta: String(CAREER.clubProposals[0].clubId) };
    const r = await P.aceitarPropostaClube();
    return { ok: r.ok, antes, clube: String(CAREER.clubId), rep: CAREER.reputation, h0: (CAREER.clubHistory || [])[0] };
  });
  check("8) Aceitar a proposta: carreira no clube ofertante, passagem anterior no currículo (accepted_proposal) e reputação mantida:",
    r8.ok && r8.clube === r8.antes.oferta && r8.h0 && r8.h0.reason === "accepted_proposal" && r8.h0.clubName === r8.antes.clubName && r8.rep === r8.antes.rep, JSON.stringify(r8));

  check("9) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
