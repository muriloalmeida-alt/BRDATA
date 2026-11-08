// Tipos de public/js/motor/registro.js (etapa C1).
type Categoria = "daily" | "weekly" | "season";
export interface Objetivo { objectiveId: string; title: string; icon: string; progressType: string; target: number; reward: { type: "coins" | "coins_boost" | "premium"; amount: number }; currentProgress?: number; status?: "in_progress" | "completed" | "claimed" }
export interface Conquista { achievementId: string; title: string; description: string; category: string; tier: string; target: number; icon: string }
export interface Manchete { type: string; mine: boolean; texto: string }
export interface Resultado { home: string | number; away: string | number; gh: number; ga: number }
export function localDateStr(d?: Date): string;
export function localWeekStartStr(d?: Date): string;
export const NOTIFICATION_MAX: number;
export const NOTIFICATION_ICON: Record<string, string>;
export function pushNotification(type: string, text: string, opts?: { gateBy?: "partida" | "loja" | "lesao" | null }): void;
export function unreadNotificationCount(): number;
export const OBJECTIVE_TEMPLATES: Record<Categoria, Objetivo[]>;
export function freshObjectiveList(category: Categoria): Objetivo[];
export function freshObjectivesState(): Record<Categoria, Objetivo[]> & { dailyResetDate: string; weeklyResetWeekStart: string };
export function ensureObjectivesFresh(): void;
export function trailingWinStreak(): number;
export function bumpObjective(category: Categoria, objectiveId: string, amount?: number): void;
export function applyObjectiveReward(reward: Objetivo["reward"]): { moral: boolean; condicao: boolean };
export const ACHIEVEMENT_CATALOG: Conquista[];
export function freshAchievementsState(): { achievementId: string; currentProgress: number; unlockedAt: number | null }[];
export function achievementProgressFor(id: string): { achievementId: string; currentProgress: number; unlockedAt: number | null };
export function setAchievementProgress(id: string, progress: number): void;
export function evaluateAlwaysCheckableAchievements(contaCriadaEm?: number | null): void;
export function evaluateSeasonEndAchievements(finishedTeamGoals: number, finishedTeamFouls: number): void;
export const NEWS_PRIORITY: Record<string, number>;
export const WINLESS_STREAK_THRESHOLD: number;
export const NEWS_FEED_MAX: number;
export const ZEBRA_OVR_GAP: number;
export function rankByPoints(standings: Record<string, unknown>): Record<string, number>;
export function updateWinlessStreaks(allResults: Resultado[]): void;
export function generateRoundNews(round: number, allResults: Resultado[], standingsBefore: Record<string, unknown> | null): Manchete[];
