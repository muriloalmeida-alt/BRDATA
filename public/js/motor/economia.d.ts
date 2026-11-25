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
export function economiaDosClubes(liga: string, clubes: { id: string | number; nome: string }[]): Map<string, EconomiaDoClube> | null;
export const ECONOMIA_V2: { ativa: boolean };
export const ESCALA_LIMITES: { min: number; max: number };
export const EXPOENTE_VALOR: number;
export const PORTE_SALARIAL: number;
export interface Escala { salario: number; valor: number }
export interface EconomiaDoSave { versao: number; escalas: Record<string, [number, number, number?]>; ligas: Record<string, number>; clube: FluxosDoClube | null; patrocinio?: number; bilheteria?: number }
export interface FluxosDoClube { id: string; liga: string; status: string; receitaAnual: number; tvMensal: number; comercialAnual: number; jogoAnual: number; despesasMensais: number; folhaBaseMensal: number; orcamentoTransferencias: number; anoAposQueda?: number }
export function economiaV2(CAREER: unknown): boolean;
export function escalaDe(CAREER: unknown, clubId: string | number): Escala | null;
export function escalaDeValor(doClube: number, daLiga: number): number;
export function escalasDaDivisao(liga: string, clubes: { id: string | number; nome: string; folhaLegada: number }[]): { escalas: Record<string, [number, number]>; salario: number; valor: number; economia: Map<string, EconomiaDoClube> } | null;
export function aplicarEscalaNoAtleta<T extends { wage?: number; value?: number }>(p: T, escala: Escala | null): T;
export function contratoNaEscala<T extends { wage: number; value: number }>(c: T, escala: Escala | null): T & { escalaEco?: 1 };
export function fluxosDoClube(base: EconomiaDoClube, folhaReal?: number | null): FluxosDoClube;
export function distribuicaoDePrecos(precos: number[]): { n: number; ate500mil: number; ate1mi: number; acima20mi: number };
export function capacidadeNoJogo(CAREER: unknown, s: { caixa: number; folha: number; teto: number; parcelasPorRodada?: { mes: number; valor: number }[]; fluxos?: FluxosDoClube | null }, op: { taxa: number; parcelas?: number; salarioMensal?: number }): ReturnType<typeof capacidadeDeCompra> | null;
export function quadro(indice: unknown, pedidos: { liga: string; nome: RegExp | string; rotulo?: string; status?: "promovido" | "rebaixado"; para?: string }[]): (EconomiaDoClube & { rotulo: string })[];
