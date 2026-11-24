// Tipos de public/js/motor/viradapais.js (MUNDO-001, etapa M5).
export type Id = string | number;
export interface ClubeDoCatalogo { id: Id; elegibilidade?: string | null; clubePai?: Id | null; grupo?: string | null; exJogavel?: boolean; [k: string]: unknown }
export function elegivelDoCatalogo(c: ClubeDoCatalogo, divisaoNova: (id: Id) => 1 | 2 | null): boolean;
export function sortearRepresentante(o: { catalogo: ClubeDoCatalogo[]; divisaoAtual: (id: Id) => 1 | 2 | null; chave: string }): Id | null;
export function aplicarVirada(o: {
  pais: string; chave: string;
  d1: { id: string; clubes: Id[] }; d2: { id: string; clubes: Id[] };
  sobemD2: Id[]; descemD1: Id[]; descemD2: Id[]; sobemTerceira?: Id[];
  quedaD2?: Id[]; catalogo: ClubeDoCatalogo[];
  reservas?: { id: Id; clubePai: Id }[]; humano?: Id | null;
  zonas?: Record<string, Record<string, Id[]>>;
}): {
  [liga: string]: unknown;
  catalogo: ClubeDoCatalogo[]; entraramDoCatalogo: Id[]; foramParaOCatalogo: Id[];
  excecoes: { tipo: string; texto: string; [k: string]: unknown }[];
  zonas?: Record<string, Record<string, Id[]>>;
};
export function zonasSeguintes(zonas: Record<string, Id[]>, clubesNovos: Id[]): Record<string, Id[]>;
export function sortearGrupos(ids: Id[], nomes: string[], chave: string): Record<string, Id[]>;
export function atualizarHistorico(historico: Record<string, { ano: number; pts: number; j: number }[]>, ano: number, porClube: Record<string, { pts: number; j: number }>, janela: number): Record<string, { ano: number; pts: number; j: number }[]>;
