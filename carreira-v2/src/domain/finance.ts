// Finanças (CAP02-T06) — "Cuide do seu clube.": saldo disponível, folha
// salarial × teto em texto (sem barra nem gráfico) e últimas movimentações
// do extrato (decisões de 01/11). Mesmas fontes e regras do legado
// (renderCentral: wageBillOf, finances.wageCap; renderExtratoScreen:
// financeLedger, mais recente primeiro; fmtBRLShort). Só leitura.
import type { Career } from "./types.ts";
import { moneyShort } from "./home.ts";
import { wageBill } from "../../../public/js/motor/financas.js";

export const RECENT_LEDGER = 5;

export interface LedgerRow { round: number; label: string; amount: number; text: string }
export interface FinanceModel {
  cash: number;
  cashText: string;
  negative: boolean;
  wage: { bill: string; cap: string | null; over: boolean };
  ledger: LedgerRow[]; // completo, mais recente primeiro (como o extrato atual)
  // MERCADO-001 (economia v5): espaço de folha, orçamento da temporada e as
  // parcelas mensais das compras (null nas carreiras de antes).
  budget: { wageRoom: string; wageRoomNeg: boolean; transfer: string | null; installments: { label: string; text: string }[]; monthly: string | null } | null;
}

export function buildFinance(career: Career): FinanceModel {
  const cash = career.finances?.cash || 0;
  // Folha: a mesma regra do motor (public/js/motor/financas.js, wageBill) —
  // principal + emprestados (você paga o salário de quem pega emprestado).
  const bill = wageBill(career.squad || []);
  const cap = career.finances?.wageCap;
  return {
    cash,
    cashText: moneyShort(cash),
    negative: cash < 0,
    wage: { bill: moneyShort(bill), cap: cap ? moneyShort(cap) : null, over: !!cap && bill >= cap },
    budget: buildBudget(career, bill, cap),
    ledger: (career.financeLedger || []).map((t) => ({
      round: t.round, label: t.label, amount: t.amount,
      text: `${t.amount >= 0 ? "+" : "−"}${moneyShort(Math.abs(t.amount))}`,
    })),
  };
}

// Orçamento (economia v5): espaço de folha = teto − folha; orçamento de
// transferências da temporada = o da base − o gasto + as vendas; parcelas
// mensais das compras, as mais próximas primeiro (por meses restantes).
export function buildBudget(career: Career, bill: number, cap: number | undefined): FinanceModel["budget"] {
  const e = career.economia;
  if (!e || e.versao < 5) return null;
  const room = (cap || 0) - bill;
  const base = e.clube && e.clube.orcamentoTransferencias;
  const o = e.orcamento && e.orcamento.temporada === career.seasonYear ? e.orcamento : null;
  const transfer = base != null ? base - (o ? (o.gasto || 0) - (o.vendas || 0) : 0) : null;
  const parcelas = (career.parcelasMensais || []).filter((p) => p.meses > 0).slice().sort((a, b) => a.meses - b.meses);
  const monthly = parcelas.reduce((t, p) => t + p.valor, 0);
  return {
    wageRoom: moneyShort(room), wageRoomNeg: room < 0,
    transfer: transfer != null ? moneyShort(Math.max(0, transfer)) : null,
    installments: parcelas.map((p) => ({ label: p.label, text: `${moneyShort(p.valor)}/mês · ${p.meses} ${p.meses === 1 ? "parcela" : "parcelas"}` })),
    monthly: parcelas.length ? `${moneyShort(monthly)}/mês` : null,
  };
}
