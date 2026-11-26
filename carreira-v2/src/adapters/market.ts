// Mercado (fase 8 do plano de independência): proposta, negociação, venda,
// empréstimos e proposta pendente, pelo motor (comandos da ponte em
// carreira.js), com as regras de sempre.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";
import type { Capacity, MarketInfo } from "../domain/market.ts";
import type { OfferRole } from "../domain/types.ts";

const SAFE = new Set(["janela-fechada", "ja-proposta", "parcelas-invalidas", "indisponivel", "teto", "elenco-grande", "proposta-invalida", "valor-baixo", "contra",
  "jogador-invalido", "ja-anunciado", "nao-principal", "minimo", "anuncio-invalido", "recusa", "sem-interessado", "sem-emprestimo", "opcao-invalida", "sem-proposta", "decisao-invalida", "elenco-cheio", "sem-mundo", "fora-do-mundo",
  // MERCADO-001 (economia v5): recusas da capacidade de compra, com a mensagem.
  "caixa", "parcelas", "fluxo", "orcamento"]);
async function write<T = object>(name: string, ...args: unknown[]): Promise<Res<T>> {
  try {
    const s = await engine.get();
    const r = await s.run<Res<T> | Promise<Res<T>>>(name, ...args);
    if (!r.ok && !SAFE.has(r.motivo || "")) engine.reset();
    return r;
  } catch {
    engine.reset();
    return { ok: false, motivo: "falha" };
  }
}
async function read<T = object>(name: string, ...args: unknown[]): Promise<Res<T>> {
  try { const s = await engine.get(); return await s.run<Res<T>>(name, ...args); } catch { engine.reset(); return { ok: false, motivo: "falha" }; }
}
export interface Preview { valor: number; parcelas: number; porParcela: number; primeira: number; caixaAntes: number; caixaDepois: number; folhaAntes: number; folhaDepois: number; teto?: number }
export interface LoanPrep { clube: { id: string; nome: string }; taxaTemporada: number; taxaMeia: number; valorMercado: number }

// entrada/meses (economia v5): a oferta parcelada por mês (entrada + saldo em até 24 meses).
export interface OfferTerms { salario: number; papel: OfferRole; anos: number; entrada?: number; meses?: number }
export interface OfferPreview extends Preview { salario: number; salarioAtual: number; papelAtual: OfferRole | null; sugerido: Record<OfferRole, number>; capacidade?: Capacity | null }
// FASE1-MER (MER-07): cada confirmação leva um id de operação; repetir o
// mesmo id (toque duplo, reenvio) não aplica de novo no motor.
export const newOpId = () => `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const MarketGateway = {
  info: () => read<MarketInfo>("mercado"),
  propose: (clubId: string, playerId: string, value: number, installments: number, terms?: OfferTerms, opId?: string) => write<{ id: string; valor: number }>("fazerProposta", clubId, playerId, value, installments, terms, opId),
  offerPreview: (clubId: string, playerId: string, value: number, installments: number, wage: number, terms?: { entrada: number; meses: number } | null) => read<OfferPreview>("previaProposta", clubId, playerId, value, installments, wage, terms || undefined),
  acceptWage: (offerId: string, opId?: string) => write<{ comprado: boolean; mensagem: string | null; coletiva: boolean }>("aceitarSalarioPedido", offerId, opId),
  dismiss: (offerId: string) => write("dispensarProposta", offerId),
  raise: (offerId: string, value: number) => write("aumentarProposta", offerId, value),
  withdraw: (offerId: string) => write("retirarProposta", offerId),
  buyPreview: (offerId: string) => read<Preview>("previaCompra", offerId),
  acceptCounter: (offerId: string, opId?: string) => write<{ comprado: boolean; mensagem: string | null; coletiva: boolean; atleta: { decisao: "pede" | "recusa"; salarioPedido: number | null } | null }>("aceitarContraproposta", offerId, opId),
  list: (playerId: string, value: number) => write<{ id: string; valor: number }>("anunciar", playerId, value),
  unlist: (listingId: string) => write("retirarAnuncio", listingId),
  salePreview: (listingId: string, offerId: string) => read<Preview>("previaVenda", listingId, offerId),
  acceptSale: (listingId: string, offerId: string, opId?: string) => write<{ vendido: boolean; mensagem: string | null; coletiva: boolean }>("aceitarOfertaVenda", listingId, offerId, opId),
  rejectSale: (listingId: string, offerId: string | null) => write("recusarOfertaVenda", listingId, offerId),
  prepareLoanOut: (playerId: string) => write<LoanPrep>("prepararEmprestimo", playerId),
  loanOut: (playerId: string, duration: string, clause: string, clauseValue: number, opId?: string) => write("emprestar", playerId, duration, clause, clauseValue, opId),
  loanIn: (clubId: string, playerId: string, duration: string, pct: number, clause: string, clauseValue: number, opId?: string) => write<{ salario: number }>("pegarEmprestado", clubId, playerId, duration, pct, clause, clauseValue, opId),
  answerPending: (d: "aceitar" | "recusar") => write("propostaPendente", d),
  // EMPRESTIMO-DISPONIVEL (15/11): seu jogador disponível e as propostas dele.
  loanAvailable: (playerId: string, on: boolean) => write<{ disponivel: boolean }>("disponivelEmprestimo", playerId, on),
  acceptLoanOffer: (offerId: string, opId?: string) => write<{ taxa: number; clube: string }>("aceitarPropostaEmprestimo", offerId, opId),
  rejectLoanOffer: (offerId: string) => write("recusarPropostaEmprestimo", offerId),
  // PARIDADE-CPU · E3: contratar um agente livre (sem taxa, só o salário).
  signFreeAgent: (playerId: string) => write<{ salario: number }>("contratarAgenteLivre", playerId),
  // MUNDO-001 (M10c-3): clubes de outros países (filtro de país e liga) e
  // trazer um clube ao save (o elenco dele entra no mercado).
  worldClubs: async (filtro: { pais?: string; liga?: string; texto?: string }): Promise<WorldMarket | null> => { const s = await engine.get(); return (await s.run<WorldMarket | null>("clubesDoMundo", filtro)) || null; },
  openWorldClub: (clubId: string) => write<{ jogadores?: number }>("abrirClubeDoMundo", clubId),
};
export interface WorldMarketClub { id: string; nome: string; sigla: string | null; escudo: string | null; pais: string; liga: string; ligaNome: string; noSave: boolean }
export interface WorldMarket { paises: { codigo: string; nome: string; ligas: { id: string; nome: string }[] }[]; clubes: WorldMarketClub[] }
