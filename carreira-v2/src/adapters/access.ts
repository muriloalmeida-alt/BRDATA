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

// MUNDO-001 (M10c, MUN-14): países e divisões do mundo (null: mundo desligado).
export interface WorldLeague { id: string; nome: string; divisao: number; clubes: number; nivel: number | null; temporada: number | null }
export interface WorldCountry { codigo: string; nome: string; regiao: string; moeda: string; ligas: WorldLeague[] }
// Competição no seletor, com o país (o Brasil primeiro).
export interface CountryOption { codigo: string; nome: string; competicoes: CompetitionOption[] }

export const AccessGateway = {
  competitions: () => run<CompetitionOption[]>("competicoes"),
  worldCompetitions: () => run<{ paises: WorldCountry[] } | null>("competicoesDoMundo").catch(() => null),
  // Brasil + os países do mundo, cada um com as suas divisões.
  async countries(): Promise<CountryOption[]> {
    const [br, mundo] = await Promise.all([AccessGateway.competitions(), AccessGateway.worldCompetitions()]);
    const out: CountryOption[] = [{ codigo: "BR", nome: "Brasil", competicoes: br }];
    for (const p of mundo?.paises || []) {
      out.push({ codigo: p.codigo, nome: p.nome, competicoes: p.ligas.map((l) => ({ id: l.id, nome: l.nome, sub: `${l.divisao}ª divisão · ${l.clubes} clubes` })) });
    }
    return out;
  },
  async allCompetitions(): Promise<CompetitionOption[]> { return (await AccessGateway.countries()).flatMap((c) => c.competicoes); },
  chooseCompetition: (id: string) => run<Result<{ competicao: string; clubes: ClubOption[] }>>("escolherCompeticao", id),
  createCareer: (clubId: string) => run<Result>("criarCarreira", clubId),
  dailyReward: () => run<DailyRewardState>("recompensa"),
  claimDailyReward: () => run<Result<{ dia: number; tipo: RewardType; detalhe: string }>>("receberRecompensa"),
};
