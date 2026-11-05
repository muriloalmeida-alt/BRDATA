// Tipos de public/js/motor/treino.js (Fase 12, etapa 4).
import type { Rng } from "./partida.js";
export type Foco = "tecnico" | "fisico" | "tatico" | "descanso" | "jogo";
export type Intensidade = "leve" | "moderada" | "intensa";
export interface PlanDay { foco?: Foco; intensidade?: Intensidade; grupo?: "principal" | "misto" | "individual"; duracao?: number; individualPlayerId?: string }
export interface Scheme { id: string; name: string; desc: string; days: PlanDay[] }
type Attr = "overall" | "atk" | "def" | "phys";
export interface TrainingPlayer {
  id: string; origin?: string; group?: string; age: number; appsSeason?: number; potential?: number | null;
  condition?: number; overall: number; atk: number; def: number; phys: number; morale?: number; moraleReason?: string;
  seasonGain?: Partial<Record<Attr, number>>; attrTrend?: Record<Attr, number>; fatigueHistory?: { round: number; fadiga: number }[];
}
export type Patch = Partial<Pick<TrainingPlayer, "condition" | Attr | "morale" | "moraleReason" | "seasonGain" | "attrTrend" | "fatigueHistory">>;
export function clamp(v: number, min: number, max: number): number;
export const TRAINING_DAY_NAMES: string[];
export const TRAINING_GAME_DAY: number;
export const TRAINING_PRE_GAME_DAY: number;
export const TRAINING_POST_GAME_DAY: number;
export function isProtectedTrainingDay(i: number): boolean;
export const TRAINING_INTENSITY_MULT: Record<Intensidade, number>;
export const TRAINING_DURATION_DEFAULT: Record<Intensidade, number>;
export const FATIGUE_HISTORY_MAX: number;
export const TRAINING_SCHEMES: Scheme[];
export function defaultTrainingPlan(schemeId: string): PlanDay[];
export function trainingTargets<P extends { id: string; origin?: string }>(entry: PlanDay, squad: P[]): P[];
export const SEASON_GAIN_CAP_BY_AGE: [number, number][];
export function seasonGainBaseCap(age: number): number;
export function playTimeGainFactor(appsSeason: number | undefined, roundsSoFar: number): number;
export function seasonGainCap(p: { age: number; appsSeason?: number }, roundsSoFar: number): number;
export function seasonGainRoom(p: { age: number; appsSeason?: number; seasonGain?: Partial<Record<Attr, number>> }, attr: Attr, roundsSoFar: number): number;
export function highBandGainFactor(value: number): number;
export function attributeTrainingGain(currentValue: number, ceiling: number, baseGain: number, rng: Rng): number;
export function trainingWeek(o: { plan: PlanDay[]; squad: TrainingPlayer[]; roundsSoFar: number; preseason: boolean; round: number }, rng: Rng): { patches: Map<string, Patch>; gains: Map<string, number> };
export function agingWeek(o: { squad: TrainingPlayer[]; playedIds: string[]; roundsSoFar: number }, rng: Rng): Map<string, Patch>;
