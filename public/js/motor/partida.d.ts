// Tipos do núcleo da partida (public/js/motor/partida.js), para a v2
// importar no build. Fase 12, etapa 1.
export type Rng = () => number;
export interface Side { atk: number; def: number }
export interface MatchPlayer { id: string; name: string; group?: "G" | "D" | "M" | "F" | string; morale?: number | null }
export interface GoalPick<P extends MatchPlayer = MatchPlayer> { scorer: P; assister: P | null; penalty: boolean }
export interface MatchEvent { type: string; player?: string; playerId?: string; assistPlayer?: string | null; assistPlayerId?: string | null; penalty?: boolean; mine?: boolean }
export interface ChunkStats { possWeightHome: number; chunkShareSum?: number; shots: { home: number; away: number }; shotsOnTarget: { home: number; away: number }; fouls: { home: number; away: number } }

export const HOME_ADVANTAGE: number;
export const LAMBDA_MIN: number;
export const LAMBDA_MAX: number;
export function clamp(v: number, min: number, max: number): number;
export function poissonSample(lambda: number, rng: Rng): number;
export function weightedPick<T>(items: T[], weights: number[], rng: Rng): T;
export function goalLambdas(home: Side, away: Side, share?: number): { home: number; away: number };
export function scoreGoals(home: Side, away: Side, share: number, rng: Rng): { gh: number; ga: number };
export function withFormationPenalty<S extends Side>(side: S): S;
export function withMotivation<S extends Side>(side: S, mod: number): S;
export function moraleFactor(p: { morale?: number | null }): number;
export function pickGoalAuthors<P extends MatchPlayer>(starters: P[], goals: number, rng: Rng, suppress?: { playerId: string; factor: number } | null): GoalPick<P>[];
export function goalEvents(picks: GoalPick[]): MatchEvent[];
export function chanceEvents(starters: MatchPlayer[], atk: number, def: number, share: number, rng: Rng): MatchEvent[];
export function penaltyMissEvents(starters: MatchPlayer[], share: number, rng: Rng): MatchEvent[];
export function varCheckEvents(goals: { mine?: boolean }[], rng: Rng): MatchEvent[];
export function addChunkStats<S extends ChunkStats>(stats: S, home: Side, away: Side, share: number, chancesHome: MatchEvent[], chancesAway: MatchEvent[], gh: number, ga: number, rng: Rng): S;
export function cupPenaltyHomeWins(avgHome: number, avgAway: number, rng: Rng): boolean;
