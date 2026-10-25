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

module.exports = { skipOnboarding, skipStartupWizard };
