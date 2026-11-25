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
// M9c: o jogo do técnico ao vivo.
export interface PendenteContinental {
  id: string; copa: "LIB" | "SUD"; nomeCopa: string; fase: string; nomeFase: string; grupo: string | null; perna: number | null; pernas: number;
  data: string; casa: Id; fora: Id; souMandante: boolean; neutro: boolean; adversario: { id: string; nome: string; escudo: string | null }; ida: { meus: number; deles: number } | null;
}
export function atualizarPendente(CAREER: any, indice: any, semana: string): PendenteContinental | null;
export function jogoDoHumanoPendente(CAREER: any, indice: any, semana: string | null): any;
export function registrarJogoDoHumano(CAREER: any, indice: any, jogoId: string, placar: { gh: number; ga: number }, semana?: string | null): { jogo: any; confronto: any; situacao: ReturnType<typeof situacaoDoHumano>; eventos: any[] };
// M10b: peças comuns com as copas da UEFA.
export function clubeNoIndice(indice: any): Map<string, { c: any; pais?: string; assoc?: string; liga: string | null; ficticio?: boolean }>;
export function forcaNaLiga(CAREER: any, indice: any, id: Id): { atk: number; def: number };
export function nomeDe(CAREER: any, indice: any, id: Id): string;
export function noticia(CAREER: any, txt: string, mine: boolean): void;
export function compactarPlano(plano: any, humano: Id, fora: string[]): any;
export function expandirPlano(salvo: any, tabelas: Record<string, unknown>, semente: (plano: any, id: Id, c: any) => number): any;
