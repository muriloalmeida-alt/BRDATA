// Tipos de public/js/motor/copasmundo.js (MUNDO-001, M9b).
import type { Id, PlanoContinental } from "./continental.js";
export const ASSOC_DO_PAIS: Record<string, string>;
export const ANDINAS: string[];
export const ALCANCE_NIVEL_COPA: number;
export const MEDIA_GOLS_CONMEBOL: number;
export const RUIDO_ANDINO: number;
export const TITULARES_SEM_HISTORICO: string[];
export const ESCALA_PREMIOS: number;
export function vagasConmebol(o: { acesso: any; ordens: Record<string, Id[]>; titulares?: (Id | null)[] }): {
  participantes: { LIB: { grupos: Id[]; fase2: Id[]; fase1: Id[] }; SUD: { grupos: Id[]; primeiraFase: Record<string, Id[]> } };
  associacao: Record<string, string>;
};
export function ordemDeAcesso(campeoes: Id[] | null, classificacao: Id[] | null): Id[];
export function tabelaAndina(clubes: { id: number; atk: number; def: number }[], chave: string): number[];
export function nivelDaAssociacao(indice: any, assoc: string): number;
export function forcaNaCopa(CAREER: any, indice: any, plano: { associacao: Record<string, string> }, id: Id): { atk: number; def: number };
export function ordensDaEdicao(CAREER: any, indice: any, ano: number, chave: string): Record<string, Id[]>;
export function compactar(plano: PlanoContinental, humano: Id): any;
export function expandir(salvo: any, R: { regras: any; calendario: any; premiacao: any }): PlanoContinental;
export function montarEdicaoDoSave(CAREER: any, indice: any, ano: number): PlanoContinental;
export function inicioDaEdicao(indice: any, ano: number): string;
export function semanaDasCopas(CAREER: any, indice: any, semana: string | null): { tipo: string; [k: string]: any }[];
export function emReais(usd: number): number;
export function situacaoDoHumano(plano: PlanoContinental, humano: string): { copa: string; fase: string; eliminado: boolean; campeao: boolean } | null;
export function edicaoAtual(CAREER: any, indice: any): PlanoContinental | null;
