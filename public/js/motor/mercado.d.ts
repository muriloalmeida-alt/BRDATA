// Tipos de public/js/motor/mercado.js (Fase 12, etapa 5).
import type { Rng } from "./partida.js";
export interface MarketPlayer { id: string; group: "G" | "D" | "M" | "F"; overall: number; potential?: number | null; age: number; wage: number; value: number; contractUntil?: number; origin?: string }
export interface MarketClub { id: string; squad: MarketPlayer[]; minSize: number; maxSize: number; avgOverall: number; ambition: number; starters: string[] | null; roster: MarketPlayer[] }
export interface ValuationContext { seasonYear?: number; baseValue?: number; competitorCount?: number; sellerAsking?: number }
export interface Decision { action: "accept" | "reject" | "counter" | "raise" | "walk"; value: number | null }
export interface Deal { outcome: "accepted" | "rejected" | "walked"; finalValue: number | null; lastOffer?: number; initialOffer: number; reservation: number; rounds: number }
export function clamp(v: number, min: number, max: number): number;
export const TRANSFER_WINDOWS: [number, number][];
export function windowByRound(round: number): { open: true; closesAtRound: number } | { open: false; opensAtRound: number | null };
export function windowByCalendar(weeks: { p: string }[], idx: number, windowPhases: Set<string>): { open: true; lastIdx: number } | { open: false; nextIdx: number };
export function urgencyMultiplier(necessidade: number, round: number): number;
export const SQUAD_GROUP_PROPORTION: Record<"G" | "D" | "M" | "F", number>;
export function idealCountForGroup(squad: MarketPlayer[], grp: "G" | "D" | "M" | "F"): number;
export function groupDeficitScore(candidate: MarketPlayer, squad: MarketPlayer[]): number;
export function qualityDeficitScore(candidate: MarketPlayer, squad: MarketPlayer[]): number;
export function squadSizeNeedFactor(squad: MarketPlayer[], club: MarketClub | null): number;
export function necessidadeScore(candidate: MarketPlayer, squad: MarketPlayer[], club: MarketClub | null): number;
export function overallFitCurve(diff: number): number;
export function adequacaoScore(candidate: MarketPlayer, squad: MarketPlayer[], club: MarketClub): number;
export function clubBudget(club: MarketClub): { cash: number; wageCap: number };
export function affordabilityRatio(ratio: number): number;
export function financeiroScore(candidate: MarketPlayer, squad: MarketPlayer[], club: MarketClub): number;
export function tablePositionFactor(idx: number, size: number): number;
export function strengthAmbition(avgOverall: number, peersAvg: number[]): number;
export function contextoScore(candidate: MarketPlayer, squad: MarketPlayer[], club: MarketClub): number;
export function transferScore(candidate: MarketPlayer, club: MarketClub): number;
export function pickWeightedByScore<T>(scoredList: { item: T; score: number }[], rng: Rng): T | null;
export function offerProbabilityFromScore(score: number): number;
export function transferValuation(player: MarketPlayer, buyer: MarketClub, seller: MarketClub, context?: ValuationContext): number;
export function calculateSellerReservationValue(player: MarketPlayer, seller: MarketClub, context?: ValuationContext): number;
export const MAX_NEGOTIATION_ROUNDS: number;
export function calculateCounterOffer(offerValue: number, reservationValue: number): number;
export function sellerNegotiationDecision(offerValue: number, reservationValue: number, rng: Rng): Decision;
export function buyerHardCap(player: MarketPlayer, buyer: MarketClub, context?: ValuationContext): number;
export function buyerNegotiationDecision(counterValue: number, initialOfferValue: number, player: MarketPlayer, buyer: MarketClub, context?: ValuationContext): Decision;
export function negotiateOffer(player: MarketPlayer, buyer: MarketClub, seller: MarketClub, context: ValuationContext, rng: Rng): Deal;
export function offerEffectiveValue(offerValue: number, installments: number): number;
