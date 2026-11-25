// Tipos de public/js/motor/uefa.js (MUNDO-001, M10a).
import type { Confronto, Simulador } from "./fases.js";
export type Id = string | number;
export type CopaUefa = "UCL" | "UEL" | "UECL";
export const COPAS_UEFA: CopaUefa[];
export const PREMIACAO_UEFA: Record<CopaUefa, Record<string, number>>;
export interface JogoUefa { id: string; copa: CopaUefa; fase: string; rodada: number; data: string; casa: Id; fora: Id; gh: number | null; ga: number | null; conf?: string; perna?: number; neutro?: boolean }
export interface PremioUefa { chave: string; copa: CopaUefa; clube: Id; tipo: string; valorEUR: number }
export interface PlanoUefa {
  ano: number; chave: string; jogos: JogoUefa[]; confrontos: (Confronto & { copa: string; posicao?: number })[];
  ligas: Partial<Record<CopaUefa, { potes: Id[][]; ordem: Id[] | null }>>; marcos: Record<string, any>; premios: PremioUefa[];
  resultado: { campeoes: Record<CopaUefa, Id>; vices: Record<CopaUefa, Id> } | null; [k: string]: unknown;
}
export interface LinhaLigaUefa { id: Id; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number; gpFora: number; vFora: number; pts: number; ptsAdv: number; sgAdv: number; gpAdv: number }
export function fluxosDoPacote(acesso: any): Record<string, string>;
export function sortearAdversarios(potes: Id[][], regra: any, associacao: Record<string, string>, rng: () => number): [Id, Id][];
export function distribuirRodadas(jogos: [Id, Id][], nRodadas: number, rng: () => number): number[][];
export function montarEdicao(o: {
  ano: number; chave?: string; regras: any; calendario: any; acesso: any;
  participantes: Partial<Record<CopaUefa, Partial<Record<"liga" | "PO" | "Q3" | "Q2" | "Q1", Id[]>>>>;
  coeficiente: Record<string, number>; associacao: Record<string, string>; premiacao?: Record<CopaUefa, Record<string, number>>;
}): PlanoUefa;
export function jogosPendentes(plano: PlanoUefa, ate?: string | null): JogoUefa[];
export function registrarJogo(plano: PlanoUefa, jogoId: string, placar: { gh: number; ga: number }, sim: Simulador): JogoUefa;
export function concluida(plano: PlanoUefa): boolean;
export function jogarTudo(plano: PlanoUefa, sim: Simulador & { jogar(j: JogoUefa): { gh: number; ga: number } }): NonNullable<PlanoUefa["resultado"]>;
export function tabelaDaLiga(plano: PlanoUefa, copa: CopaUefa): LinhaLigaUefa[];
export function premiosDoClube(plano: PlanoUefa, clube: Id): PremioUefa[];
