// Mercado (fase 8 do plano de independência): proposta, negociação, venda,
// empréstimos e proposta pendente, pelo motor (comandos da ponte em
// carreira.js), com as regras de sempre.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";
import type { MarketInfo } from "../domain/market.ts";

const SAFE = new Set(["janela-fechada", "ja-proposta", "parcelas-invalidas", "indisponivel", "teto", "elenco-grande", "proposta-invalida", "valor-baixo",
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

export const MarketGateway = {
  info: () => read<MarketInfo>("mercado"),
  propose: (clubId: string, playerId: string, value: number, installments: number) => write<{ id: string; valor: number }>("fazerProposta", clubId, playerId, value, installments),
  raise: (offerId: string, value: number) => write("aumentarProposta", offerId, value),
  withdraw: (offerId: string) => write("retirarProposta", offerId),
  buyPreview: (offerId: string) => read<Preview>("previaCompra", offerId),
  acceptCounter: (offerId: string) => write<{ comprado: boolean; mensagem: string | null; coletiva: boolean }>("aceitarContraproposta", offerId),
  list: (playerId: string, value: number) => write<{ id: string; valor: number }>("anunciar", playerId, value),
  unlist: (listingId: string) => write("retirarAnuncio", listingId),
  salePreview: (listingId: string, offerId: string) => read<Preview>("previaVenda", listingId, offerId),
  acceptSale: (listingId: string, offerId: string) => write<{ vendido: boolean; mensagem: string | null; coletiva: boolean }>("aceitarOfertaVenda", listingId, offerId),
  rejectSale: (listingId: string, offerId: string | null) => write("recusarOfertaVenda", listingId, offerId),
  prepareLoanOut: (playerId: string) => write<LoanPrep>("prepararEmprestimo", playerId),
  loanOut: (playerId: string, duration: string, clause: string, clauseValue: number) => write("emprestar", playerId, duration, clause, clauseValue),
  loanIn: (clubId: string, playerId: string, duration: string, pct: number, clause: string, clauseValue: number) => write<{ salario: number }>("pegarEmprestado", clubId, playerId, duration, pct, clause, clauseValue),
  answerPending: (d: "aceitar" | "recusar") => write("propostaPendente", d),
};
