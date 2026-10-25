// Fase B do motor de testes — uma rodada inteira pela interface, guiada
// pelo ESTADO da tela (não por esperas fixas).
//
// Vários testes antigos simulavam rodadas com `click("#btnSimulate")` +
// `waitForTimeout` e esperavam o fluxo de quando foram escritos (o botão
// simulava direto e abria o detalhe do jogo). O fluxo atual
// (carreira.js) é:
//   #btnSimulate
//     semana sem jogo (GE-CALENDAR-001) -> avança a semana, ou abre o
//       amistoso ao vivo (#liveMatchOverlay) na pré-temporada/julho
//     semana de jogo -> #preMatchOverlay (confirmação) -> #btnPreMatchGo
//       -> #liveMatchOverlay (ao vivo) -> skipLiveMatch()
//       -> #matchDetailOverlay ("Seu jogo") -> #btnMatchDetailContinue
//       -> #pressOverlay (coletiva, só quando a situação bate)
//       -> #newsOverlay (Notícias) -> #btnNewsContinue
//       -> #roundResultsOverlay (Resultados) -> #btnRoundResultsContinue
//       -> #playerOfferOverlay (proposta) ou #tabelaModalOverlay (Tabela)
// Esses testes não verificam a confirmação pré-jogo nem a partida ao vivo
// (outros testes cobrem), só o que vem antes/depois — então aqui cada
// tela é atravessada como um usuário faria, e o teste pode olhar cada
// uma pelos ganchos.
//
// playRound(page, ganchos) clica #btnSimulate e atravessa as telas até
// voltar à tela do jogo. Ganchos (todos opcionais, async, recebem page):
//   onMatchDetail, onPress, onNews, onRoundResults, onPlayerOffer, onTabela
// Se um gancho devolver "stop", playRound para ali (tela aberta) — pro
// teste interagir com ela. Uma tela que este helper não conhece também
// faz parar (devolve { stoppedAt: id }), nunca é fechada às cegas.
// Devolve { screens, stoppedAt, friendly, matchWeek }.
const STEP_LIMIT_MS = 60000;
const KNOWN = [
  "goalHighlightOverlay", "liveMatchOverlay", "preMatchOverlay", "matchDetailOverlay",
  "pressOverlay", "newsOverlay", "roundResultsOverlay", "playerOfferOverlay", "tabelaModalOverlay",
];

async function readState(page) {
  return page.evaluate(() => ({
    open: [...document.querySelectorAll(".ct-modal-overlay.open")].map((e) => e.id).filter(Boolean),
    round: CAREER.currentRound,
    week: typeof calendarOn === "function" && calendarOn() ? CAREER.calendar.idx : null,
    live: !!(typeof LIVE_MATCH !== "undefined" && LIVE_MATCH && !LIVE_MATCH.finished),
    busy: document.getElementById("btnSimulate").disabled,
  }));
}

async function playRound(page, hooks = {}) {
  const start = await readState(page);
  const screens = [];
  let friendly = false, matchWeek = false;
  const note = (id) => { if (screens[screens.length - 1] !== id) screens.push(id); };
  const hook = async (name) => (hooks[name] ? hooks[name](page) : undefined);
  // Aciona o botão sem passar pelo teste de "ponteiro livre" do
  // Playwright: depois de cada semana um toast fica ~3,6 s POR CIMA do
  // botão (bug de produto registrado em docs/MOTOR_TESTES_FASE_B.md,
  // verificado por test_toast_rodape.js) e o clique esperaria ele sumir.
  // Estes testes não verificam o toque no botão — só o que vem depois.
  await page.waitForFunction(() => !document.getElementById("btnSimulate").disabled, null, { timeout: 15000 });
  await page.evaluate(() => document.getElementById("btnSimulate").click());
  const t0 = Date.now();
  while (Date.now() - t0 < STEP_LIMIT_MS) {
    const st = await readState(page);
    const unknown = st.open.filter((id) => !KNOWN.includes(id) && id !== "actionLoadingOverlay");
    const has = (id) => st.open.includes(id);
    if (has("liveMatchOverlay") || has("goalHighlightOverlay")) {
      note("liveMatchOverlay");
      if (!matchWeek) friendly = await page.evaluate(() => !!(LIVE_MATCH && LIVE_MATCH.friendlyContext));
      await page.evaluate(() => skipLiveMatch());
    } else if (has("preMatchOverlay")) {
      note("preMatchOverlay"); matchWeek = true;
      await page.click("#btnPreMatchGo");
    } else if (has("matchDetailOverlay")) {
      note("matchDetailOverlay");
      if ((await hook("onMatchDetail")) === "stop") return { screens, stoppedAt: "matchDetailOverlay", friendly, matchWeek };
      await page.click("#btnMatchDetailContinue");
    } else if (has("pressOverlay")) {
      note("pressOverlay");
      if ((await hook("onPress")) === "stop") return { screens, stoppedAt: "pressOverlay", friendly, matchWeek };
      await page.click("#pressOptions [data-press]");
    } else if (has("newsOverlay")) {
      note("newsOverlay");
      if ((await hook("onNews")) === "stop") return { screens, stoppedAt: "newsOverlay", friendly, matchWeek };
      await page.click("#btnNewsContinue");
    } else if (has("roundResultsOverlay")) {
      note("roundResultsOverlay");
      if ((await hook("onRoundResults")) === "stop") return { screens, stoppedAt: "roundResultsOverlay", friendly, matchWeek };
      await page.click("#btnRoundResultsContinue");
    } else if (has("playerOfferOverlay")) {
      note("playerOfferOverlay");
      if ((await hook("onPlayerOffer")) === "stop") return { screens, stoppedAt: "playerOfferOverlay", friendly, matchWeek };
      return { screens, stoppedAt: "playerOfferOverlay", friendly, matchWeek }; // decisão do teste: aceitar/recusar
    } else if (has("tabelaModalOverlay")) {
      note("tabelaModalOverlay");
      if ((await hook("onTabela")) === "stop") return { screens, stoppedAt: "tabelaModalOverlay", friendly, matchWeek };
      await page.click("#btnTabelaModalCloseFooter");
    } else if (unknown.length) {
      return { screens, stoppedAt: unknown[unknown.length - 1], friendly, matchWeek };
    } else if (!st.live && !st.busy && (st.round !== start.round || st.week !== start.week)) {
      return { screens, stoppedAt: null, friendly, matchWeek };
    }
    await page.waitForTimeout(50);
  }
  const st = await readState(page);
  throw new Error(`playRound: a rodada não terminou em ${STEP_LIMIT_MS / 1000}s (telas: ${screens.join(" > ") || "nenhuma"}; abertas agora: ${st.open.join(", ") || "nenhuma"})`);
}

// Avança até a próxima semana com jogo oficial do Brasileirão
// (atravessando amistosos/semanas vazias pela interface) e joga ela.
async function playNextMatchRound(page, hooks = {}) {
  for (let i = 0; i < 30; i++) {
    const r = await playRound(page, hooks);
    if (r.matchWeek || r.stoppedAt) return r;
  }
  throw new Error("playNextMatchRound: nenhuma semana de jogo oficial em 30 semanas");
}

module.exports = { playRound, playNextMatchRound };
