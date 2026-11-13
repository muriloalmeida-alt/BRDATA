// Mercado (fase 8 do plano de independência): proposta, negociação, venda,
// empréstimos e proposta pendente, pelo motor (comandos da ponte em
// carreira.js), com as regras de sempre.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";
import type { MarketInfo } from "../domain/market.ts";
import type { OfferRole } from "../domain/types.ts";

const SAFE = new Set(["janela-fechada", "ja-proposta", "parcelas-invalidas", "indisponivel", "teto", "elenco-grande", "proposta-invalida", "valor-baixo", "contra",
  "jogador-invalido", "ja-anunciado", "nao-principal", "minimo", "anuncio-invalido", "recusa", "sem-interessado", "sem-emprestimo", "opcao-invalida", "sem-proposta", "decisao-invalida"]);
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

export interface OfferTerms { salario: number; papel: OfferRole; anos: number }
export interface OfferPreview extends Preview { salario: number; salarioAtual: number; papelAtual: OfferRole | null; sugerido: Record<OfferRole, number> }
// FASE1-MER (MER-07): cada confirmação leva um id de operação; repetir o
// mesmo id (toque duplo, reenvio) não aplica de novo no motor.
export const newOpId = () => `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const MarketGateway = {
  info: () => read<MarketInfo>("mercado"),
  propose: (clubId: string, playerId: string, value: number, installments: number, terms?: OfferTerms, opId?: string) => write<{ id: string; valor: number }>("fazerProposta", clubId, playerId, value, installments, terms, opId),
  offerPreview: (clubId: string, playerId: string, value: number, installments: number, wage: number) => read<OfferPreview>("previaProposta", clubId, playerId, value, installments, wage),
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
};
