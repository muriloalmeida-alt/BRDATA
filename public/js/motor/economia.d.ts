// Tipos de public/js/motor/economia.js (ECON-001, Entrega 1).
export type TipoDoNumero = "publicado" | "estimado" | "imputado";
export interface Numero<T = number> {
  item: string; valor: T; moeda?: "BRL" | "GBP" | "EUR" | "USD"; periodo: string;
  unidade?: string; tipo: TipoDoNumero; confianca: "alta" | "media" | "baixa";
  fonte?: string; transformacao?: string;
}
export const VERSAO_ECONOMIA: number;
export const PERIODO_REFERENCIA: string;
export const COMPOSICAO: Record<string, { tv: number; comercial: number; jogo: number }>;
export const REGRAS: {
  margem: Record<string, number>; despesasMinimas: number; caixaInicial: number; orcamentoMinimo: number;
  sobraParaOrcamento: number; caixaParaOrcamento: number; reservaDeCaixaMeses: number;
};
export const PERFIS: Record<string, { regiao: string; clubes: number; receitaTotal: Numero; [k: string]: unknown }>;
export const REFERENCIAS: Record<string, unknown>;
export interface EconomiaDoClube {
  id: string; nome: string; liga: string; posicaoFinanceira: number; clubesNaLiga: number; ancorado: boolean;
  status: "normal" | "promovido" | "rebaixado";
  receitaAnual: number;
  receitas: { tvAnual: number; comercialAnual: number; jogoAnual: number; transicaoAnual: number };
  folhaBaseAnual: number; folhaBaseMensal: number;
  despesasOperacionaisAnual: number; resultadoOperacionalAnual: number;
  caixaInicial: number; orcamentoTransferencias: number;
  obrigacoes: { mes: number; valor: number }[];
}
export function expoenteDaLiga(perfil: unknown, n: number): number;
export function razaoFolhaDaLiga(perfil: unknown): number;
export function ordemFinanceira(indice: unknown, liga: string, ids?: (string | number)[] | null): { id: string | number; nome: string; nota: number }[];
export function economiaDaLiga(indice: unknown, liga: string, opts?: { ids?: (string | number)[] }): Map<string, EconomiaDoClube> | null;
export function economiaNaVirada(indice: unknown, base: EconomiaDoClube, o: { para: string; status: "promovido" | "rebaixado" | "normal"; anoAposQueda?: number }): EconomiaDoClube | null;
export interface EstadoFinanceiro {
  caixa: number; folhaMensal: number; tetoMensal?: number; orcamento?: number; receitaMensal?: number; despesaMensal?: number;
  parcelasAPagar?: { mes: number; valor: number }[]; recebiveis?: { mes: number; valor: number }[];
}
export function capacidadeDeCompra(estado: EstadoFinanceiro, op: { taxa: number; parcelas?: number; salarioMensal?: number }): {
  ok: boolean; motivo: null | "orcamento" | "caixa" | "folha" | "parcelas"; primeiraParcela: number;
  limites: { orcamento: number; pagamentoImediato: number; folha: number; parcelas: number };
};
export function quadro(indice: unknown, pedidos: { liga: string; nome: RegExp | string; rotulo?: string; status?: "promovido" | "rebaixado"; para?: string }[]): (EconomiaDoClube & { rotulo: string })[];
