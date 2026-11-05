/* ===================================================================
   MOTOR — RODADA (Fase 12, etapa 2, 05/11)
   -------------------------------------------------------------------
   Rodada "simples" (só placar, sem elenco nem eventos de jogador): a das
   divisões que o técnico não joga (resolveOtherDivisionsRound em
   carreira.js). Mesmo cálculo de gols da partida (motor/partida.js) e
   mesma tabela (motor/tabela.js). As rodadas com elenco (CPU × CPU da
   própria divisão e a partida do técnico) aplicam desgaste, cartões e
   lesões no jogador e continuam no carreira.js até a etapa do elenco.
=================================================================== */
import { scoreGoals } from "./partida.js";
import { applyResult } from "./tabela.js";

// fixtures: [{home, away}]; teamsById: Map(id → {atk, def}); standings:
// tabela da divisão (alterada no lugar). Clube sem força: jogo pulado.
// Devolve os resultados na ordem dos jogos.
export function playSimpleRound(fixtures, teamsById, standings, rng) {
  const results = [];
  (fixtures || []).forEach((fx) => {
    const home = teamsById.get(String(fx.home)), away = teamsById.get(String(fx.away));
    if (!home || !away) return;
    const { gh, ga } = scoreGoals(home, away, 1, rng);
    const r = { home: fx.home, away: fx.away, gh, ga };
    applyResult(standings, r);
    results.push(r);
  });
  return results;
}
