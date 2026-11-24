// Tipos de public/js/motor/carreiramundo.js (MUNDO-001, M6b-3).
export const OVERALL_POR_NIVEL: number;
export function definirIndiceDoMundo(indice: any): void;
export function indiceDoMundo(): any;
export function semanaDaCarreira(career: any): string | null;
export function avancarMundoLeve(career: any): { tipo: string; pais: string; [k: string]: unknown }[];
export function paisDaLiga(indice: any, liga: string): { codigo: string; ligas: string[]; janelas: [string, string][]; [k: string]: unknown };
export function timesDaLiga(indice: any, liga: string): Record<string, unknown>[];
export function instalarElencos(porTime: Record<string, unknown[]>): void;
export function criarCarreiraNoMundo(o: { indice: any; liga: string; clubId: string | number; elencosDaLiga: (liga: string) => Promise<Record<string, unknown[]>> }): Promise<any>;
export function agendaDaLiga(indice: any, liga: string, k: number, clubes?: (string | number)[] | null, zonas?: Record<string, (string | number)[]> | null): Map<string, unknown[]>;
export function aplicarCalendario(career: any, indice: any, k: number): unknown;
