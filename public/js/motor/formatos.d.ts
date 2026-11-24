// Tipos de public/js/motor/formatos.js (MUNDO-001, etapa M4).
import type { Confronto, Simulador } from "./fases.js";
export type Id = string | number;
export interface Jogo {
  id: string; fase: string; grupo: string | null; rodada: number; data: string; casa: Id; fora: Id;
  gh: number | null; ga: number | null; conf?: string; perna?: number; neutro?: boolean;
  extra?: { prorrogacao?: { gh: number; ga: number }; penaltis?: Id };
}
export interface Movimento { id: Id; motivo: string }
export interface ResultadoDaTemporada {
  campeoes: Record<string, Id>;
  sobem: Movimento[];
  descem: Movimento[];
  anual?: Id[];
  promedio?: Record<string, { pts: number; j: number; temporadas: number }>;
  [k: string]: unknown;
}
export interface PlanoDaTemporada {
  liga: string; chave: string; ano: number; clubes: Id[]; grupos: Record<string, Id[]> | null;
  jogos: Jogo[]; confrontos: Confronto[]; marcos: Record<string, unknown>;
  historico: Record<string, { ano: number; pts: number; j: number }[]>; reservas: string[];
  resultado: ResultadoDaTemporada | null;
  [k: string]: unknown;
}
export function datasApos(depois: string, n: number): string[];
export function montarTemporada(o: {
  comp: { id: string; divisao: number; regras: Record<string, any> };
  ano: number; chave?: string; clubes: Id[]; grupos?: Record<string, Id[]> | null;
  jogosFixos: { fase: string; rodada: number; data: string; casa: Id; fora: Id }[];
  historico?: Record<string, { ano: number; pts: number; j: number }[]>; reservas?: Id[];
}): PlanoDaTemporada;
export function jogosPendentes(plano: PlanoDaTemporada, ate?: string | null): Jogo[];
export function registrarJogo(plano: PlanoDaTemporada, jogoId: string, placar: { gh: number; ga: number }, sim: Simulador): Jogo;
export function concluida(plano: PlanoDaTemporada): boolean;
export function jogarTudo(plano: PlanoDaTemporada, sim: Required<Simulador>): ResultadoDaTemporada;
export function acessoColombia(plano: PlanoDaTemporada | Record<string, any>, campA: Id, campC: Id, recl: Id[], depois: string): { sobem: Movimento[]; cenario: string } | null;
export function geradorDeConfrontos(ligaId: string, grupos?: Record<string, Id[]> | null): (fase: string, ids: Id[]) => Record<string, { home: Id; away: Id }[]>;
export const LIGAS_COM_ROTEIRO: string[];
