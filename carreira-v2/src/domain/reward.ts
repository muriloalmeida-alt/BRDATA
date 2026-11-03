// Recompensa diária (CAP01-N01) — textos do prêmio a partir do tipo real do
// jogo (DAILY_LOGIN_CYCLE / applyDailyLoginReward da versão anterior).
import type { RewardType } from "../adapters/access.ts";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

export function rewardTitle(tipo: RewardType, valor: number | null): string {
  if (tipo === "coins") return valor != null ? `${brl(valor)} no caixa` : "Dinheiro no caixa";
  if (tipo === "boost") return "Moral do elenco";
  if (tipo === "scout_token") return "Olheiro extra";
  return "Pacote de elite";
}

export function rewardSub(tipo: RewardType, valor: number | null): string {
  if (tipo === "coins") return "Entra direto no caixa do clube.";
  if (tipo === "boost") return "A moral de todo o elenco sobe.";
  if (tipo === "scout_token") return "Revela o potencial de um jogador da base.";
  return `${valor != null ? `${brl(valor)} no caixa, ` : ""}moral e condição do elenco em alta.`;
}

// Precisa mostrar a recompensa ao entrar? (não coletada hoje, data local)
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function rewardPending(dl: { lastClaimDate: string | null } | undefined, today = localDate()): boolean {
  return !dl || dl.lastClaimDate !== today;
}
