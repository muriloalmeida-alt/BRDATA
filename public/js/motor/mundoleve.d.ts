// Tipos de public/js/motor/mundoleve.js (MUNDO-001, etapa M6a).
export const FORMATO_MUNDO: number;
export const AMORTECIMENTO_NIVEL: number;
export const NIVEL_TERCEIRA: number;
export interface EstadoDoMundo {
  formato: number; versaoCatalogo: string; chave: string; ativos: string[]; semana: string; inicioJogo: string;
  paises: Record<string, {
    k: number; ano: number;
    ligas: Record<string, { clubes: (string | number)[]; placares: string; plano?: Record<string, unknown> }>;
    pos: Record<string, unknown> | null; catalogo: (string | number)[]; catalogoExtra: Record<string, unknown>;
    zonas: Record<string, Record<string, (string | number)[]>>; historico: Record<string, unknown>;
    forcas: Record<string, [number, number]>; viradas: Record<string, unknown>[]; campeoes: Record<string, unknown>[];
  }>;
}
export interface Mundo { estado: EstadoDoMundo; indice: any; cache: Record<string, any> }
export function codificarPlacares(lista: ({ gh: number; ga: number } | null)[]): string;
export function decodificarPlacares(s: string, n: number): ({ gh: number; ga: number } | null)[];
export function criarMundoLeve(indice: any, o?: { ligaEscolhida?: string; ativos?: string[]; chave?: string }): EstadoDoMundo;
export function abrirMundo(estado: EstadoDoMundo, indice: any): Mundo;
export function salvarMundo(m: Mundo): EstadoDoMundo;
export function tabelaDaLiga(m: Mundo, liga: string): unknown;
export function avancarSemana(m: Mundo): { tipo: string; pais: string; [k: string]: unknown }[];
export function prepararInicio(m: Mundo): { tipo: string; pais: string; [k: string]: unknown }[];
