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
// Mesmo formatador de dinheiro do site principal. Aceita negativo (caixa
// pode ficar no vermelho).
export function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
