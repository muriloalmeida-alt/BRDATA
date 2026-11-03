// Acesso (fase 2 do plano de independência): criar carreira e recompensa
// diária pela v2. Tudo passa pelo motor (adapters/engine.ts), com as mesmas
// funções da versão anterior (comandos competicoes, escolherCompeticao,
// criarCarreira, recompensa, receberRecompensa da ponte).
import { engine } from "./engine.ts";

export interface CompetitionOption { id: string; nome: string; sub: string }
export interface ClubOption { id: string; nome: string; sigla: string | null; escudo: string | null; cidade: string | null }
export type RewardType = "coins" | "boost" | "scout_token" | "premium_pack";
export interface DailyRewardState { dia: number; recebidaHoje: boolean; ciclo: { dia: number; tipo: RewardType; valor: number | null }[] }
export type Result<T = object> = ({ ok: true } & T) | { ok: false; motivo?: string; mensagem?: string | null };

async function run<T>(name: string, ...args: unknown[]): Promise<T> {
  const s = await engine.get();
  return await s.run<T | Promise<T>>(name, ...args);
}

export const AccessGateway = {
  competitions: () => run<CompetitionOption[]>("competicoes"),
  chooseCompetition: (id: string) => run<Result<{ competicao: string; clubes: ClubOption[] }>>("escolherCompeticao", id),
  createCareer: (clubId: string) => run<Result>("criarCarreira", clubId),
  dailyReward: () => run<DailyRewardState>("recompensa"),
  claimDailyReward: () => run<Result<{ dia: number; tipo: RewardType; detalhe: string }>>("receberRecompensa"),
};
