// Tipos de public/js/motor/temporada.js (Fase 12, etapa 6).
import type { Rng } from "./partida.js";
type Group = "G" | "D" | "M" | "F";
export interface SeasonPlayer {
  id: string; name: string; origin: string; group: Group; age: number; overall: number; atk: number; def: number; phys: number;
  potential?: number | null; morale?: number | null; wage: number; value: number; contractUntil: number;
  appsSeason?: number; goalsSeason?: number; assistsSeason?: number; apps?: number;
  seasonHistory?: { year: number; clubName: string; apps: number; goals: number; assists: number; overall?: number }[];
  [k: string]: unknown;
}
export interface BuildEnv { firstNames: string[]; lastNames: string[]; liveSeason: number }
export interface ClubRef { id: string | number; atk: number; def: number; name?: string; competitionId?: string }
export interface BoardGoal { type: "posicao_tabela"; target: number; label: string }
export interface AwardEntry { jogadorId: string; nome: string; clubeId: string | number; clubeName: string; valor: number }
export interface SeasonAward {
  seasonYear: number;
  brasileirao: { campeao: string | number | null; vice: string | number | null; artilheiro: AwardEntry | null; assistencias: AwardEntry | null; melhorJogador: AwardEntry | null };
  copaDoBrasil: { disputou: boolean; campeao: string | number | null; vice: string | number | null };
}
export interface Row { id: string | number; [k: string]: unknown }
export function clamp(v: number, min: number, max: number): number;
export function computeContractFields(overall: number, age: number, potential: number | null, rng: Rng, liveSeason: number): { wage: number; value: number; contractUntil: number };
export function fairWageFor(p: { overall: number; age: number; potential?: number | null }): number;
export function seasonMorale(p: SeasonPlayer): number;
export function derivePotentialForAdult(overall: number, age: number, rng: Rng): number;
export function potentialDeclineFor(age: number, group: Group): number;
export function youthPotentialRoll(rng: Rng, bonus: number): number;
export function cpuAnnualDelta(p: SeasonPlayer, rng: Rng): number;
export function applyCpuAnnualEvolution(p: SeasonPlayer, rng: Rng): void;
export const BASE_COMPOSITION: Group[];
export function buildBasePlayer(club: ClubRef, idx: number, rng: Rng, env: BuildEnv): SeasonPlayer;
export const FILLER_COMPOSITION: Group[];
export function buildGeneratedProPlayer(club: ClubRef, idx: number, rng: Rng, env: BuildEnv): SeasonPlayer;
export const MIN_PRINCIPAL: number;
export const MAX_PLAYER_SEASON_HISTORY: number;
export function snapshotSeason(p: SeasonPlayer, year: number, clubName: string): void;
export function renewLeagueSquad(o: { club: ClubRef; squad: SeasonPlayer[]; seasonYear: number; minSize: number; evoRng: Rng; rng: Rng; env: BuildEnv }): SeasonPlayer[];
export function renewHumanSquad(o: { club: ClubRef; clubName: string; squad: SeasonPlayer[]; lineup: { starters: (string | null)[]; bench: string[] }; seasonYear: number; rng: Rng; env: BuildEnv }): {
  squad: SeasonPlayer[]; starters: (string | null)[]; bench: string[];
  summary: { leavingNames: string[]; newBaseCount: number; newPrincipalCount: number };
};
export function computeBoardGoal(myPrincipal: { overall: number }[], ownDivisionPlayers: { overall: number }[]): BoardGoal;
export function boardGoalMet(position: number, goal: BoardGoal | null | undefined): boolean;
export const DISMISSAL_STREAK: number;
export const REPUTATION_META_WEIGHT: number;
export const REPUTATION_TITLE_WEIGHT: number;
export const REPUTATION_META_POINTS: { met: number; missed: number };
export const REPUTATION_TITLE_POINTS: number;
export function countTitlesThisSeason(award: SeasonAward, clubId: string | number): number;
export function seasonReputation(current: number | null | undefined, goalWasMet: boolean, award: SeasonAward, clubId: string | number): number;
export function reputationLabel(rep: number): string;
export function seasonAwards(o: { rows: Row[]; humanClubId: string | number; humanSquad: SeasonPlayer[]; leagueSquads: Record<string, SeasonPlayer[]>; teamName: (id: string | number) => string; cup: unknown; seasonYear: number }): SeasonAward;
export const AWARD_MORALE_BOOST: number;
export function awardedPlayerIds(award: SeasonAward, clubId: string | number): string[];
export const RELEGATION_N: number;
export const CLUB_TRADITION_IDS: Set<string>;
export const TRADITION_REPRIEVE_CHANCE: number;
export function applyTraditionReprieve(zone: string[], sortedRows: Row[], rng: Rng): string[];
export const STRENGTH_DIVISION_GAP_SD: number;
export function divisionStrengthScale(teams: { atk: number; def: number }[]): { meanAtk: number; meanDef: number; sdAtk: number; sdDef: number };
export function arrivalStrength(arrivals: ClubRef[], stayers: ClubRef[], direction: "promoted" | "relegated", originScale: ReturnType<typeof divisionStrengthScale>): { atk: number; def: number }[];
export function promotionRelegation<T extends ClubRef>(o: { rows: { A: Row[]; B: Row[]; C: Row[] }; teams: { A: T[]; B: T[]; C: T[] }; dPool: T[]; protectedC: string | number | null; reprieveRng: { A: Rng; B: Rng; C: Rng }; rng: Rng }): {
  relegatedA: string[]; promotedB: string[]; relegatedB: string[]; promotedC: string[]; relegatedC: string[]; promotedDIdx: number[];
  strength: { team: T; atk: number; def: number }[];
  compose(): { newA: T[]; newB: T[]; newC: T[]; newDPool: T[]; teamsFor: (ids: string[]) => T[]; promotedD: T[] };
};
