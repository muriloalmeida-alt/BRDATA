// Tipos de public/js/motor/eventos.js (etapa C1).
export interface Aviso { texto?: string; titulo?: string; detalhe?: string; tipo?: "pos" | "warn" | "info" | null; duracaoMs?: number }
// Etapa E: pedido de tela das ações de mercado e de clube (gravar, redesenhar, fechar painel).
export interface PedidoDeTela { nome: string; args: unknown[] }
export function ouvir(tipo: "tela", fn: (dados: PedidoDeTela) => void): () => void;
export function ouvir(tipo: "aviso", fn: (dados: Aviso) => void): () => void;
export function ouvir(tipo: string, fn: (dados: unknown) => void): () => void;
export function emitir(tipo: string, dados?: unknown): void;
