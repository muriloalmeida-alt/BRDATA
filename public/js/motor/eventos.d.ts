// Tipos de public/js/motor/eventos.js (etapa C1).
export interface Aviso { titulo: string; detalhe?: string; tipo?: "pos" | "warn" | null }
export function ouvir(tipo: "aviso", fn: (dados: Aviso) => void): () => void;
export function ouvir(tipo: string, fn: (dados: unknown) => void): () => void;
export function emitir(tipo: string, dados?: unknown): void;
