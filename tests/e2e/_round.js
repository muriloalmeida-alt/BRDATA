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

async function readState(page) {
  return page.evaluate(() => ({
    open: [...document.querySelectorAll(".ct-modal-overlay.open")].map((e) => e.id).filter(Boolean),
    round: CAREER.currentRound,
    week: typeof calendarOn === "function" && calendarOn() ? CAREER.calendar.idx : null,
    live: !!(typeof LIVE_MATCH !== "undefined" && LIVE_MATCH && !LIVE_MATCH.finished),
    busy: document.getElementById("btnSimulate").disabled,
  }));
}

// A Tabela é a última tela da rodada e também reabre quando o teste
// fecha/recusa a proposta em destaque (closePlayerOfferModal segue o fluxo
// pra ela). Fecha se tiver sobrado aberta — usado antes de cada rodada e
// pelos testes depois de tratar a proposta da última rodada.
async function closeLeftoverTabela(page) {
  await page.waitForTimeout(150); // a Tabela abre logo depois de a proposta fechar
  for (let i = 0; i < 10 && await page.locator("#tabelaModalOverlay.open").count(); i++) {
    await page.click("#btnTabelaModalCloseFooter", { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(100);
  }
}

async function playRound(page, hooks = {}) {
  const start = await readState(page);
  const screens = [];
  let friendly = false, matchWeek = false;
  const note = (id) => { if (screens[screens.length - 1] !== id) screens.push(id); };
  // Cada gancho roda 1x por rodada (a mesma tela pode ser lida de novo
  // no laço se o clique de seguir não passar de primeira, ver tap).
  const hooked = new Map();
  const hook = async (name) => {
    if (!hooks[name]) return undefined;
    if (!hooked.has(name)) hooked.set(name, await hooks[name](page));
    return hooked.get(name);
  };
  // Clique curto: se algo cobrir o botão (toast por cima, a próxima tela
  // abrindo um instante depois), em vez de ficar 30 s preso no mesmo
  // clique, volta pro laço, relê o estado e trata a tela que estiver em
  // cima. O limite total da rodada (STEP_LIMIT_MS) continua valendo.
  const tap = (selector) => page.click(selector, { timeout: 2500 }).then(() => true, () => false);
  // Aciona o botão sem passar pelo teste de "ponteiro livre" do
  // Playwright: depois de cada semana um toast fica ~3,6 s POR CIMA do
  // botão (bug de produto registrado em docs/MOTOR_TESTES_FASE_B.md,
  // verificado por test_toast_rodape.js) e o clique esperaria ele sumir.
  // Estes testes não verificam o toque no botão — só o que vem depois.
  // Começa só com a tela do jogo limpa (nenhuma tela por cima) — o
  // clique abaixo não passa pelo teste de ponteiro, então não pode
  // acontecer com alguma tela ainda aberta.
  await closeLeftoverTabela(page);
  const clean = await page.waitForFunction(() => !document.getElementById("btnSimulate").disabled
    && ![...document.querySelectorAll(".ct-modal-overlay.open")].some((e) => e.id !== "actionLoadingOverlay"), null, { timeout: 15000 }).then(() => true, () => false);
  if (!clean) {
    const st = await readState(page);
    throw new Error(`playRound: tela do jogo não ficou limpa pra começar a rodada (abertas: ${st.open.join(", ") || "nenhuma"}; botão ocupado: ${st.busy})`);
  }
  await page.evaluate(() => document.getElementById("btnSimulate").click());
  const t0 = Date.now();
  let settledPolls = 0;
  while (Date.now() - t0 < STEP_LIMIT_MS) {
    const st = await readState(page);
    const open = st.open.filter((id) => id !== "actionLoadingOverlay");
    // Tela de CIMA = a última aberta na ordem do HTML (mesma convenção
    // de empilhamento do app, ver toastBottomOffset em carreira.js); a
    // partida ao vivo vem antes de tudo (é ela que gera as próximas).
    const top = open.includes("liveMatchOverlay") || open.includes("goalHighlightOverlay") ? "liveMatchOverlay" : open[open.length - 1];
    if (top) settledPolls = 0;
    if (top === "liveMatchOverlay") {
      note("liveMatchOverlay");
      if (!matchWeek) friendly = await page.evaluate(() => !!(LIVE_MATCH && LIVE_MATCH.friendlyContext));
      await page.evaluate(() => skipLiveMatch());
    } else if (top === "preMatchOverlay") {
      note("preMatchOverlay"); matchWeek = true;
      await tap("#btnPreMatchGo");
    } else if (top === "matchDetailOverlay") {
      note("matchDetailOverlay");
      if ((await hook("onMatchDetail")) === "stop") return { screens, stoppedAt: "matchDetailOverlay", friendly, matchWeek };
      await tap("#btnMatchDetailContinue");
    } else if (top === "pressOverlay") {
      note("pressOverlay");
      if ((await hook("onPress")) === "stop") return { screens, stoppedAt: "pressOverlay", friendly, matchWeek };
      await tap("#pressOptions [data-press]");
    } else if (top === "newsOverlay") {
      note("newsOverlay");
      if ((await hook("onNews")) === "stop") return { screens, stoppedAt: "newsOverlay", friendly, matchWeek };
      await tap("#btnNewsContinue");
    } else if (top === "roundResultsOverlay") {
      note("roundResultsOverlay");
      if ((await hook("onRoundResults")) === "stop") return { screens, stoppedAt: "roundResultsOverlay", friendly, matchWeek };
      await tap("#btnRoundResultsContinue");
    } else if (top === "playerOfferOverlay") {
      note("playerOfferOverlay");
      if ((await hook("onPlayerOffer")) === "stop") return { screens, stoppedAt: "playerOfferOverlay", friendly, matchWeek };
      return { screens, stoppedAt: "playerOfferOverlay", friendly, matchWeek }; // decisão do teste: aceitar/recusar
    } else if (top === "tabelaModalOverlay") {
      note("tabelaModalOverlay");
      if ((await hook("onTabela")) === "stop") return { screens, stoppedAt: "tabelaModalOverlay", friendly, matchWeek };
      await tap("#btnTabelaModalCloseFooter");
    } else if (top) {
      return { screens, stoppedAt: top, friendly, matchWeek }; // tela que este helper não conhece: o teste decide
    } else if (!st.live && !st.busy && (st.round !== start.round || st.week !== start.week)
      // Semana de jogo oficial só termina depois do detalhe "Seu jogo": entre
      // o pré-jogo fechar e a partida ao vivo abrir há um instante sem
      // tela nenhuma, que não pode ser lido como "rodada encerrada".
      && (!matchWeek || screens.includes("matchDetailOverlay"))) {
      // Rodada encerrada só com a tela limpa em 2 leituras seguidas (a
      // próxima tela da sequência pode abrir um instante depois de a
      // anterior fechar).
      if (++settledPolls >= 2) return { screens, stoppedAt: null, friendly, matchWeek };
      await page.waitForTimeout(150);
      continue;
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

module.exports = { playRound, playNextMatchRound, closeLeftoverTabela };
