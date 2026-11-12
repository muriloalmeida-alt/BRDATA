// Tipos de public/js/motor/escalacao.js (FASE1-ESC, 12/11/2026).
export interface LineupLike { formation?: string; starters: (string | null)[]; bench: string[] }
export interface PlayerLike { id: string; group: string; overall?: number; origin?: string; status?: string | null; outUntilRound?: number | null }
export type Pendencia = { tipo: "titulares-incompletos" | "repetido" | "fora-do-elenco" | "titular-indisponivel" | "reserva-indisponivel" | "banco-incompleto" | "banco-sem-goleiro" | "sem-goleiro-titular"; ids: string[]; faltam?: number; mensagem: string };
export type Alvo = { tipo: "titular"; vaga: number } | { tipo: "reserva"; id: string } | { tipo: "banco-vazio" };
export interface Recomposicao { entra: string; sai: string | null }
export interface PedidoTroca { alvo: Alvo; saiEsperado: string | null; entraId: string; recomposicao?: Recomposicao }
export const TITULARES: number;
export const RESERVAS: number;
export function disponivel(p: PlayerLike | null | undefined, rodada: number): boolean;
export function validarEscalacao(lineup: LineupLike, elenco: PlayerLike[], rodada: number): { valida: boolean; pendencias: Pendencia[] };
export function trocar<L extends LineupLike>(lineup: L, elenco: PlayerLike[], rodada: number, pedido: PedidoTroca): { lineup: L; conflito?: undefined } | { conflito: string; lineup?: undefined };
export function recomposicaoGoleiro(lineup: LineupLike, elenco: PlayerLike[], rodada: number): null | Recomposicao | { bloqueio: string; mensagem: string };
export function aplicarRecomposicao<L extends LineupLike>(lineup: L, elenco: PlayerLike[], rodada: number, r: Recomposicao): { lineup: L } | { conflito: string };
export function trocarComRecomposicao<L extends LineupLike>(lineup: L, elenco: PlayerLike[], rodada: number, pedido: PedidoTroca):
  | { lineup: L; valida: boolean }
  | { precisaRecompor: true; proposta: Recomposicao }
  | { bloqueio: string; mensagem: string }
  | { conflito: string };
export function bloqueioInicio(lineup: LineupLike, elenco: PlayerLike[], rodada: number): null | { motivo: "escalacao"; pendencias: Pendencia[] };
export function completarEscalacao<L extends LineupLike>(lineup: L, elenco: PlayerLike[], rodada: number, grupos?: string[]): { lineup: L; mudou: boolean; valida: boolean; pendencias: Pendencia[] };
