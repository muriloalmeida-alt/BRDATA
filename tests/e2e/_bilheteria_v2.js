// Ajudante dos testes de bilheteria (lote L2 do plano "testes sem a tela
// antiga"): joga até 8 rodadas pela ponte do motor da v2 e para no
// primeiro jogo em casa, devolvendo o lançamento de bilheteria da rodada.
const { noMotor, jogarRodadaV2 } = require("./_v2_carreira");

async function primeiraBilheteria(page, maxRodadas = 8) {
  for (let i = 0; i < maxRodadas; i++) {
    const rodada = await noMotor(page, ({ CAREER }) => {
      const r = CAREER.currentRound;
      const fx = (CAREER.schedule[r] || []).find((m) => String(m.home) === String(CAREER.clubId) || String(m.away) === String(CAREER.clubId));
      return { r, emCasa: !!fx && String(fx.home) === String(CAREER.clubId) };
    });
    const j = await jogarRodadaV2(page);
    if (!j.ok) throw new Error(`rodada ${rodada.r} parou: ${j.passos.join(" ")}`);
    const lanc = await noMotor(page, ({ CAREER }, r) => (CAREER.financeLedger || []).filter((t) => t.type === "bilheteria" && t.round === r), rodada.r);
    if (rodada.emCasa) return { ...rodada, lancamentos: lanc, jogadas: i + 1 };
    if (lanc.length) return { ...rodada, lancamentos: lanc, jogadas: i + 1, foraComBilheteria: true };
  }
  return null;
}
module.exports = { primeiraBilheteria };
