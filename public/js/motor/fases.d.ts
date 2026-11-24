// Tipos de public/js/motor/fases.js (MUNDO-001, etapa M3).
export type Id = string | number;
export interface Confronto {
  id: string; etapa: string; divisao: string; a: Id; b: Id; pernas: 1 | 2; casaIda: Id; neutro: boolean;
  resolucao: string[]; sementes: Record<string, number>; pontosRegulares: Record<string, number>; semanaRel: number;
  placares: { casa: Id; fora: Id; gh: number; ga: number }[];
  vencedor: Id | null; perdedor: Id | null; como: string | null;
  extra: { prorrogacao?: { gh: number; ga: number }; penaltis?: Id } | null;
}
export interface Plano { pais: string; chave: string; d1: string; d2: string; confrontos: Confronto[]; [k: string]: unknown }
export interface Perna { confronto: string; etapa: string; perna: number; pernas: number; casa: Id; fora: Id; neutro: boolean; semanaRel: number }
export interface Simulador {
  jogar?(p: Perna): { gh: number; ga: number };
  prorrogacao(p: { casa: Id; fora: Id; neutro: boolean }): { gh: number; ga: number };
  penaltis(p: { casa: Id; fora: Id }): Id;
}
export interface ResultadoDoPais { campeao: Record<string, Id>; sobem: Record<string, Id[]>; descem: Record<string, Id[]> }
export function montarPosTemporada(o: {
  pais: string;
  comps: [{ id: string; regras?: Record<string, any> }, { id: string; regras?: Record<string, any> }];
  ordens: Record<string, Id[]>;
  pontos: Record<string, Record<string, number>>;
  reservas?: Id[];
  representanteTerceira?: Id | null;
  chave?: string;
}): Plano;
export function pernasPendentes(plano: Plano): Perna[];
export function registrarPerna(plano: Plano, confrontoId: string, placar: { gh: number; ga: number }, sim: Simulador): Confronto;
export function concluido(plano: Plano): boolean;
export function jogarTudo(plano: Plano, sim: Required<Simulador>): ResultadoDoPais;
export function resultado(plano: Plano): ResultadoDoPais;
export const RESOLUCOES: Record<string, string>;
