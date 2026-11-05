// Tipos de public/js/motor/financas.js (Fase 12, etapa 3).
import type { Rng } from "./partida.js";
export interface PayingPlayer { origin?: string; wage?: number }
export interface Entry { type: string; label: string; amount: number }
export interface Sponsorship { master?: { valorTemporada: number } | null; material?: { valorTemporada: number } | null }
export interface Installment { perRoundAmount: number; roundsLeft: number; [k: string]: unknown }
export interface LedgerEntry { round: number; type: string; label: string; amount: number }
export function clamp(v: number, min: number, max: number): number;
export function wageBill(squad: PayingPlayer[] | null | undefined): number;
export function initialFinances(squad: PayingPlayer[]): { cash: number; wageCap: number };
export const STAFF_WAGE_PCT: number;
export function staffMonthlyCost(squad: PayingPlayer[]): number;
export function scoutsMonthlyCost(scouts: { monthlyCost: number }[] | null | undefined): number;
export const SPONSOR_MASTER_NAMES: string[];
export const SPONSOR_MATERIAL_NAMES: string[];
export const SPONSOR_BASE_VALUE: { master: number; material: number };
export function sponsorshipTier(lastSeason: { position: number } | null | undefined, cupChampion: boolean): number;
export function sponsorProposals(kind: "master" | "material", tier: number, rng: Rng): { empresa: string; valorTemporada: number; duracao: number }[];
export function sponsorshipSeasonTotal(sponsorship: Sponsorship | null | undefined): number;
export function stadiumCapacity(club: { atk?: number }, rng: Rng, upgradeBonus?: number): number;
export function avgTicketPrice(club: { atk?: number }): number;
export function attendancePct(recentForm: number[] | null | undefined): number;
export function ticketRevenue(club: { atk?: number }, rng: Rng, upgradeBonus: number, recentForm: number[] | null | undefined): { capacity: number; attendance: number; pct: number; price: number; revenue: number };
export function monthEntries(o: { squad: PayingPlayer[]; staffHired: boolean; scouts?: { monthlyCost: number }[]; sponsorship?: Sponsorship | null; tvMonthly?: number; month: string }): { entries: Entry[]; wagePaid: number; income: number };
export function roundEntries(o: { squad: PayingPlayer[]; staffHired: boolean; scouts?: { monthlyCost: number }[]; sponsorship?: Sponsorship | null }): { entries: Entry[]; wagePaid: number; sponsorIncome: number };
export function settleInstallments<I extends Installment>(list: I[] | null | undefined): { total: number; remaining: I[] };
export const LEDGER_MAX: number;
export function addLedgerEntry(ledger: LedgerEntry[] | null | undefined, entry: LedgerEntry, max?: number): LedgerEntry[];
