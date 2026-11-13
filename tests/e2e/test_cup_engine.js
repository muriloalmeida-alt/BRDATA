// Copa no formato antigo (16 clubes, jogo único; saves antigos) — fechamento
// de fase (lote L4b, sem a tela antiga). O teste antigo trocava
// simulateCupTie por um placar fixo e só imprimia os 4 casos. No motor a
// função não pode ser trocada de fora (módulo); aqui o sorteio é fixado com
// uma semente e a semente é escolhida até o confronto cair no resultado de
// cada caso. Pelo motor na página da v2 (resolveCupPhase, CUP_PRIZE):
//  1) Vence as oitavas: avança às quartas (com o clube no chaveamento) e
//     recebe o prêmio das quartas.
//  2) Perde a semi: eliminado na semi, na rodada da semi, sem prêmio.
//  3) Vence a final: campeão, fase "done", prêmio de campeão.
//  4) Perde a final: vice, prêmio de vice.
const { chromium } = require("playwright-core");
const { check } = require("./_check");
const { newCareer, globaisDoMotor } = require("./_v2_carreira");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, headless: true, args: ["--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("dialog", (d) => d.dismiss());
  const erros = [];
  page.on("pageerror", (err) => erros.push(err.message));
  await newCareer(page, `cupengine${Date.now()}@teste.com`);
  await globaisDoMotor(page);

  const r = await page.evaluate(() => {
    const seeded = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const me = String(CAREER.clubId);
    const other = String(LEAGUE_TEAMS.find((t) => String(t.id) !== me).id);
    const cupNaFase = (phase) => ({
      active: true, phase, humanAlive: true, humanEliminatedAtRound: null, humanEliminatedStage: null, champion: null, championIsHuman: false,
      ties: { r16: [], qf: [], sf: [], final: [], [phase]: [{ home: me, away: other, gh: null, ga: null, winner: null, penalties: false }] },
    });
    // Roda a fase com sementes até o vencedor ser `quer` (me ou other).
    const caso = (phase, round, quer) => {
      const salvo = JSON.stringify(CAREER);
      const rnd = Math.random;
      try {
        for (let s = 1; s < 400; s++) {
          const volta = JSON.parse(salvo);
          Object.keys(CAREER).forEach((k) => delete CAREER[k]); Object.assign(CAREER, volta);
          CAREER.cup = cupNaFase(phase);
          const caixa = CAREER.finances.cash;
          Math.random = seeded(s);
          const res = resolveCupPhase(round);
          Math.random = rnd;
          const tie = res && res.results[0];
          if (tie && String(tie.winner) === (quer === "me" ? me : other)) {
            return { semente: s, delta: CAREER.finances.cash - caixa, cup: JSON.parse(JSON.stringify(CAREER.cup)), phase: res.phase };
          }
        }
        return null;
      } finally { Math.random = rnd; }
    };
    const out = {
      venceu: caso("r16", CUP_ROUNDS.r16, "me"),
      perdeu: caso("sf", CUP_ROUNDS.sf, "other"),
      campeao: caso("final", CUP_ROUNDS.final, "me"),
      vice: caso("final", CUP_ROUNDS.final, "other"),
      premio: CUP_PRIZE, rodadas: CUP_ROUNDS, me,
    };
    return out;
  });
  const { venceu, perdeu, campeao, vice, premio, rodadas, me } = r;
  check("1) Vence as oitavas: avança às quartas, com o clube no chaveamento, e recebe o prêmio das quartas:",
    venceu && venceu.cup.phase === "qf" && venceu.cup.humanAlive && venceu.cup.ties.qf.some((t) => String(t.home) === me || String(t.away) === me) && venceu.delta === premio.qf && premio.qf > 0,
    JSON.stringify({ venceu: venceu && { delta: venceu.delta, fase: venceu.cup.phase }, premioQf: premio.qf }));
  check("2) Perde a semi: eliminado na semi, na rodada da semi, sem prêmio:",
    perdeu && perdeu.cup.humanAlive === false && perdeu.cup.humanEliminatedStage === "sf" && perdeu.cup.humanEliminatedAtRound === rodadas.sf && perdeu.delta === 0,
    JSON.stringify(perdeu && { delta: perdeu.delta, stage: perdeu.cup.humanEliminatedStage, round: perdeu.cup.humanEliminatedAtRound }));
  check("3) Vence a final: campeão, fase 'done' e o prêmio de campeão:",
    campeao && campeao.cup.phase === "done" && campeao.cup.championIsHuman === true && String(campeao.cup.champion) === me && campeao.delta === premio.champion,
    JSON.stringify(campeao && { delta: campeao.delta, fase: campeao.cup.phase, premio: premio.champion }));
  check("4) Perde a final: vice (não campeão, eliminado na final) e o prêmio de vice:",
    vice && vice.cup.phase === "done" && vice.cup.championIsHuman === false && vice.cup.humanAlive === false && vice.cup.humanEliminatedStage === "final" && vice.delta === premio.runnerUp && premio.runnerUp > 0,
    JSON.stringify(vice && { delta: vice.delta, premio: premio.runnerUp }));
  check("5) Sem erro na página:", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
