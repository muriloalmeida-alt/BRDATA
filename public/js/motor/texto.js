/* ===================================================================
   MOTOR — TEXTO (plano "sem página escondida", etapa C2, 09/11)
   -------------------------------------------------------------------
   Formatação usada nos textos que o motor escreve (histórico de
   transferências, notificações, avisos), extraída de carreira.js sem
   mudança (decisão de 09/11: a formatação vai para o motor).
=================================================================== */
// Nome curto ("G. Barbosa") pros avisos e listas.
export function abbreviateName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name || "?";
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`;
}
// MUNDO-001 (M7, decisão do Murilo 24/11): o motor guarda todo dinheiro em
// R$; a tela mostra a moeda do país do clube do técnico por um câmbio fixo
// (R$ por unidade). Só exibição: mudar a tabela não mexe em save nenhum.
export const CAMBIO = Object.freeze({ BRL: 1, GBP: 7.0, EUR: 6.0, USD: 5.5 });
// Moeda de exibição (null = R$), chamado ao criar e abrir a carreira. Fica
// em globalThis.BRDATA_MOEDA ({ codigo, taxa }) para o formatador não
// depender de estado do módulo.
export function definirMoeda(codigo) {
  globalThis.BRDATA_MOEDA = codigo && codigo !== "BRL" && CAMBIO[codigo] ? { codigo, taxa: CAMBIO[codigo] } : null;
  return codigo && CAMBIO[codigo] ? codigo : "BRL";
}
export function moedaDeExibicao() { return (globalThis.BRDATA_MOEDA && globalThis.BRDATA_MOEDA.codigo) || "BRL"; }
// Mesmo formatador de dinheiro do site principal. Aceita negativo (caixa
// pode ficar no vermelho). Fora do Brasil, convertido para a moeda do país.
export function fmtBRL(v) {
  const m = typeof globalThis !== "undefined" ? globalThis.BRDATA_MOEDA : null;
  if (!m) return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return Math.round((v || 0) / m.taxa).toLocaleString("pt-BR", { style: "currency", currency: m.codigo, maximumFractionDigits: 0 });
}
