// Tipos de public/js/motor/rodada.js (Fase 12, etapa 2).
import type { Side, Rng } from "./partida.js";
import type { Standings, Result } from "./tabela.js";
export function playSimpleRound(fixtures: { home: string | number; away: string | number }[] | null | undefined, teamsById: Map<string, Side>, standings: Standings, rng: Rng): Result[];
