// Finanças (CAP02-T06) — "Cuide do seu clube.": saldo disponível, folha
// salarial × teto em texto (sem barra nem gráfico) e últimas movimentações
// do extrato (decisões de 01/11). Mesmas fontes e regras do legado
// (renderCentral: wageBillOf, finances.wageCap; renderExtratoScreen:
// financeLedger, mais recente primeiro; fmtBRLShort). Só leitura.
import type { Career } from "./types.ts";
import { moneyShort } from "./home.ts";

export const RECENT_LEDGER = 5;

export interface LedgerRow { round: number; label: string; amount: number; text: string }
export interface FinanceModel {
  cash: number;
  cashText: string;
  negative: boolean;
  wage: { bill: string; cap: string | null; over: boolean };
  ledger: LedgerRow[]; // completo, mais recente primeiro (como o extrato atual)
}

export function buildFinance(career: Career): FinanceModel {
  const cash = career.finances?.cash || 0;
  // legado: wageBillOf — principal + emprestados (você paga o salário de quem pega emprestado)
  const bill = (career.squad || []).filter((p) => p.origin === "principal" || p.origin === "loan").reduce((s, p) => s + (p.wage || 0), 0);
  const cap = career.finances?.wageCap;
  return {
    cash,
    cashText: moneyShort(cash),
    negative: cash < 0,
    wage: { bill: moneyShort(bill), cap: cap ? moneyShort(cap) : null, over: !!cap && bill >= cap },
    ledger: (career.financeLedger || []).map((t) => ({
      round: t.round, label: t.label, amount: t.amount,
      text: `${t.amount >= 0 ? "+" : "−"}${moneyShort(Math.abs(t.amount))}`,
    })),
  };
}
