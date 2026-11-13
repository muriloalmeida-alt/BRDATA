// Tipos de public/js/motor/estado.js (sem página escondida, etapa B).
export type Save = Record<string, unknown> & { schemaVersion?: number; updatedAt?: number };
export type Pedir = (url: string, opts?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<unknown>;
export function carreiraAtual(): Save | null;
export function definirCarreira(c: Save | null | undefined): Save | null;
export const SCHEMA_VERSION: number;
export const MIGRACOES: Record<number, (save: Save) => void>;
export function versaoDoSave(save: Save | null | undefined): number;
export function migrarSave(save: Save | null | undefined): number[];
export function carregarSave(pedir: Pedir): Promise<Save | null>;
export function gravarSave(save: Save | null | undefined, pedir: Pedir, agora?: () => number): Promise<
  | { ok: true }
  | { ok: false; motivo: "sem-carreira" | "sessao" | "grande" | "falha"; status?: number | null; mensagem?: string | null }
>;
// Mundo da carreira (etapa C1).
export interface Time { id: string | number; name: string; short?: string; competitionId?: string; [k: string]: unknown }
export function ligaAtual(): Time[];
export function definirLigaAtual(lista: Time[]): Time[];
export function todosTimes(): Time[];
export function definirTodosTimes(lista: Time[]): Time[];
export function competicaoAtual(): string;
export function definirCompeticaoAtual(id: string): string;
export function timePorId(id: string | number): Time;
export function mediaOverall(lista: { overall: number }[]): number;
export function forcaMediaDoElenco(clubId: string | number): number;
// Etapa D1: a partida ao vivo em andamento (LIVE_MATCH), nunca gravada.
export function partidaAtual(): any;
export function definirPartida<T>(p: T): T | null;
// Etapa D2: a coletiva pendente e se ela faz parte do pós-jogo, nunca gravadas.
export function coletivaPendente(): { entry: any; roundPlayed: number } | null;
export function definirColetivaPendente<T>(c: T): T | null;
export function coletivaEncadeada(): boolean;
export function definirColetivaEncadeada(v: unknown): boolean;
export function resumoDaRodada(): any;
export function definirResumoDaRodada(r: any): any;
export function conta(): any;
export function definirConta(v: any): any;
export function modoReal(): boolean;
export function definirModoReal(v: boolean): boolean;
export function modoRealPorCompeticao(): Record<string, boolean>;
export function definirModoRealPorCompeticao(v: Record<string, boolean>): Record<string, boolean>;
export function temporadaReal(): number;
export function definirTemporadaReal(v: number): number;
export function herancaDoTecnico(): { reputation: number; clubHistory: any[] } | null;
export function definirHerancaDoTecnico(v: { reputation: number; clubHistory: any[] } | null): any;
// SERIED-001: ganchos de módulos carregados depois (elenco gerado da Série D).
export const ganchosMundo: { elencoGerado: ((club: any) => any[]) | null };
