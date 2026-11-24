// Tipos de public/js/motor/desempate.js (MUNDO-001, etapa M3).
export interface Linha { id: string | number; j?: number; v?: number; e?: number; d?: number; gp: number; gc: number; pts?: number; disc?: number; vd?: number }
export interface Resultado { home: string | number; away: string | number; gh: number; ga: number }
export interface Opcoes {
  perfil?: string[];
  perfilMulti?: string[] | null;
  resultados?: Resultado[];
  posicoesDecisivas?: number[];
  h2hSoComTurnoCompleto?: boolean;
  chaveSorteio?: string;
}
export function classificar<L extends Linha>(linhas: L[], opts?: Opcoes): { ordem: L[]; sorteios: { ids: (string | number)[]; posicoes: [number, number] }[] };
export function posicoesDecisivasDe(regras: Record<string, unknown>, clubes: number): number[];
export function opcoesDaLiga(comp: { clubes: number; regras?: Record<string, unknown> }, perfisDesempate: Record<string, string[]>, resultados: Resultado[], chaveSorteio: string): Opcoes;
export function rngDaChave(chave: string): () => number;
