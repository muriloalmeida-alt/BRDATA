// Tipos de public/js/motor/continental.js (MUNDO-001, M9a).
import type { Confronto, Simulador } from "./fases.js";
export type Id = string | number;
export interface JogoContinental { id: string; copa: "LIB" | "SUD"; fase: string; grupo?: string; rodada: number; data: string; casa: Id; fora: Id; gh: number | null; ga: number | null; conf?: string; perna?: number; neutro?: boolean }
export interface Premio { chave: string; copa: "LIB" | "SUD"; clube: Id; tipo: string; valorUSD: number }
export interface PlanoContinental {
  ano: number; chave: string; jogos: JogoContinental[]; confrontos: (Confronto & { copa: string })[];
  grupos: Record<string, Record<string, Id[]>>; marcos: Record<string, any>; premios: Premio[];
  resultado: { campeoes: { LIB: Id; SUD: Id }; vices: { LIB: Id; SUD: Id } } | null; [k: string]: unknown;
}
export function dataNaEdicao(janela: [string, string], ano: number, anoDoPacote: number): string;
export function sortearGrupos(potes: Id[][], pode: (id: Id, grupo: Id[]) => boolean, rng: () => number, nGrupos?: number): Id[][];
export function montarEdicao(o: {
  ano: number; chave?: string; regras: any; calendario: any; premiacao: any;
  participantes: { LIB: { grupos: Id[]; fase2: Id[]; fase1: Id[] }; SUD: { grupos: Id[]; primeiraFase: Record<string, Id[]> } };
  ranking: Record<string, number>; associacao: Record<string, string>;
}): PlanoContinental;
export function jogosPendentes(plano: PlanoContinental, ate?: string | null): JogoContinental[];
export function registrarJogo(plano: PlanoContinental, jogoId: string, placar: { gh: number; ga: number }, sim: Simulador): JogoContinental;
export function concluida(plano: PlanoContinental): boolean;
export function jogarTudo(plano: PlanoContinental, sim: Required<Simulador>): NonNullable<PlanoContinental["resultado"]>;
export function premiosDoClube(plano: PlanoContinental, clube: Id): Premio[];
