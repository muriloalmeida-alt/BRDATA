// TETO-CAIXA (15/11): prévia do "Ajustar teto salarial". A regra é do motor
// (financas.wageCapTrade): cada R$ 1 a mais no teto (por mês) custa R$ 12 do
// caixa; devolve-se só o reservado na temporada, sem o teto ficar abaixo da
// folha; o caixa guarda 1 mês de folha. Aqui só se mostra o efeito antes de
// confirmar e o motivo quando não pode.
import { moneyShort } from "./home.ts";

export interface WageCapInfo {
  teto: number; folha: number; caixa: number; reservado: number; caixaMinimo: number;
  multiplicador: number; passo: number; maxUp: number; maxDown: number;
}
export type WageCapMode = "up" | "down";
export interface WageCapPreview { ok: boolean; delta: number; novoTeto: number; movimento: number; caixaDepois: number; why: string | null }

// `mil`: o valor digitado, em milhares de reais por mês.
export function wageCapPreview(i: WageCapInfo, mode: WageCapMode, mil: number): WageCapPreview {
  const valor = Math.round((Number(mil) || 0) * 1000);
  const delta = mode === "up" ? valor : -valor;
  const movimento = -delta * i.multiplicador;
  const out = { delta, novoTeto: i.teto + delta, movimento, caixaDepois: i.caixa + movimento };
  let why: string | null = null;
  if (!(valor > 0) || valor % i.passo !== 0) why = "Informe um valor em mil reais por mês.";
  else if (mode === "up" && valor > i.maxUp) why = i.maxUp > 0 ? `Dá para aumentar até ${moneyShort(i.maxUp)} por mês: o caixa precisa guardar 1 mês de folha.` : "Sem caixa para isso agora: o caixa precisa guardar 1 mês de folha.";
  else if (mode === "down" && valor > i.maxDown) why = i.maxDown > 0 ? `Dá para devolver até ${moneyShort(i.maxDown)} por mês.` : i.reservado > 0 ? "O teto não pode ficar abaixo da folha atual." : "Você não reservou nada do caixa nesta temporada.";
  return { ok: !why, ...out, why };
}
