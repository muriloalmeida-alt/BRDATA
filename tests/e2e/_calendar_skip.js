// GE-CALENDAR-001 — carreira nova começa na pré-temporada (semanas sem
// jogo, janela de transferências aberta). Testes escritos antes do
// calendário assumem a rodada 1 jogável logo após criar a carreira:
// chamam isto antes do primeiro "Ir para o jogo" (o que precisa da
// janela aberta — compra/empréstimo — deve acontecer ANTES desta
// chamada, ainda na pré-temporada).
async function skipPreseason(page) {
  await page.evaluate(() => {
    if (typeof calendarOn !== "function" || !calendarOn()) return;
    let guard = 0;
    while (!calendarWeek().r && CAREER.currentRound <= 38 && guard++ < 60) runCalendarOffWeek();
    renderAll();
  });
  await page.waitForTimeout(150);
}
module.exports = { skipPreseason };
