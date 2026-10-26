// Fase B do motor de testes — telas que abrem sozinhas ao entrar no jogo.
// Os testes pulavam o tutorial com `page.click("#btnOnboardSkip",
// { timeout: 2000 }).catch(() => {})`: uma janela FIXA de 2 s contada a
// partir do clique que leva ao jogo. Sob carga (concorrência alta,
// cobertura ligada), a tela do jogo às vezes aparece depois disso, o
// tutorial fica aberto e bloqueia o resto do teste por 30 s (falhas
// observadas em test_loja e test_loan_advanced — ver
// docs/MOTOR_TESTES_FASE_A.md).
//
// Aqui a espera é pelo ESTADO: showGameScreen() (carreira.js) mostra
// #screenGame e, no mesmo tick, abre #onboardingOverlay se a conta ainda
// não viu o tutorial. Então: espera a tela do jogo; se o tutorial estiver
// aberto, pula. Mesmo efeito do código antigo quando dava tempo; quando a
// conta já viu o tutorial, não gasta mais os 2 s do timeout.
const GAME_SCREEN_TIMEOUT = 20000;

async function skipOnboarding(page) {
  const inGame = await page.waitForFunction(() => {
    const g = document.getElementById("screenGame");
    return !!g && !g.classList.contains("hidden");
  }, null, { timeout: GAME_SCREEN_TIMEOUT }).then(() => true, () => false);
  // Sem tela do jogo no prazo: segue como o código antigo seguia (o
  // próximo passo do teste é que acusa o problema, com o erro dele).
  if (!inGame) return false;
  if (await page.locator("#onboardingOverlay.open").count() === 0) return false;
  await page.click("#btnOnboardSkip");
  return true;
}

// Assistente de início (carreira nova, ver maybeOpenStartupWizard): pula
// etapa por etapa ENQUANTO ele estiver aberto (o nº de etapas não fica
// fixo no teste). Devolve quantas etapas pulou.
async function skipStartupWizard(page) {
  let skipped = 0;
  for (; skipped < 10 && await page.locator("#startupWizardOverlay.open").count(); skipped++) {
    await page.click("#btnWizardSkip");
    await page.waitForTimeout(100);
  }
  return skipped;
}

// Entrada completa numa carreira nova, pelo ESTADO da tela — a mesma
// sequência que ~140 testes faziam com cliques "opcionais" de janela
// fixa (tutorial 2 s, 4x assistente 4 s, login diário 3 s) + esperas
// fixas de 500-1500 ms depois: tutorial -> assistente de início (abre
// depois do POST do tutorial) -> login diário (coleta, se
// claimDailyLogin) — e só devolve com a tela do jogo limpa.
async function enterGame(page, { claimDailyLogin = true } = {}) {
  await skipOnboarding(page);
  await page.waitForSelector("#startupWizardOverlay.open", { timeout: 4000 }).catch(() => {});
  await skipStartupWizard(page);
  if (claimDailyLogin) {
    const opened = await page.waitForSelector("#dailyLoginOverlay.open", { timeout: 3000 }).then(() => true, () => false);
    if (opened) {
      await page.click("#btnClaimDailyLogin");
      await page.waitForFunction(() => !document.getElementById("dailyLoginOverlay").classList.contains("open"), null, { timeout: 5000 });
    }
  }
  await page.waitForFunction(() => ![...document.querySelectorAll(".ct-modal-overlay.open")].some((e) => e.id !== "actionLoadingOverlay" && (e.id !== "dailyLoginOverlay")), null, { timeout: 5000 }).catch(() => {});
}

// Depois de page.reload(): espera o boot do app terminar (tela de
// carregamento escondida e alguma tela de destino visível — jogo, escolha
// de competição/clube ou login) e, na tela do jogo, a carreira carregada.
// Substitui o `waitForTimeout(800)` (e afins) fixo depois do reload, que
// sob carga às vezes não bastava (CAREER ainda null). Limite 15 s; se não
// chegar, segue — o passo seguinte do teste é que acusa, com o erro dele.
async function waitForBoot(page) {
  await page.waitForFunction(() => {
    const loading = document.getElementById("screenLoading");
    if (loading && !loading.classList.contains("hidden")) return false;
    const visible = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains("hidden"); };
    if (visible("screenGame")) return typeof CAREER !== "undefined" && !!CAREER;
    return ["screenCompetitionPicker", "screenPicker", "screenLoginRequired"].some(visible);
  }, null, { timeout: 15000 }).catch(() => {});
}

module.exports = { skipOnboarding, skipStartupWizard, enterGame, waitForBoot };
