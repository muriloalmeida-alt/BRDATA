// A semana (fase 3 do plano de independência): avançar a semana, escolher o
// adversário do amistoso e marcar os avisos como lidos. Tudo passa pelo motor
// (adapters/engine.ts), com as mesmas funções da versão anterior (comandos
// avancarSemana, escolherAmistoso, resumoSemana e marcarAvisosLidos da
// ponte). Se a gravação falha, o motor é recarregado: a memória dele não
// pode ficar com uma semana que o servidor não tem (senão "tentar de novo"
// avançaria duas).
import { engine } from "./engine.ts";
import type { WeekSummary } from "../domain/week.ts";

export type WeekResult = { ok: true; resumo: WeekSummary } | { ok: false; motivo?: string };
type Plain = { ok: boolean; motivo?: string };

async function run<T>(name: string, ...args: unknown[]): Promise<T> {
  const s = await engine.get();
  return await s.run<T | Promise<T>>(name, ...args);
}
async function guarded<T extends Plain>(name: string, ...args: unknown[]): Promise<T> {
  try {
    const r = await run<T>(name, ...args);
    if (!r.ok && r.motivo !== "amistoso" && r.motivo !== "sem-semana" && r.motivo !== "em-andamento") engine.reset();
    return r;
  } catch {
    engine.reset();
    return { ok: false, motivo: "falha" } as T;
  }
}

export const WeekGateway = {
  advance: (untilMatch: boolean) => guarded<WeekResult>("avancarSemana", untilMatch),
  chooseFriendly: (clubId: string) => guarded<Plain>("escolherAmistoso", clubId),
  markNoticesRead: () => guarded<Plain>("marcarAvisosLidos"),
  // Resumo deixado pelo fim do amistoso (o amistoso fecha a semana).
  friendlySummary: async (): Promise<WeekSummary | null> => run<WeekSummary | null>("resumoSemana").catch(() => null),
};

// O resumo vive em memória até a tela "Semana concluída" ser deixada
// (recarregar a página sem ele volta ao Início — a semana já foi gravada).
let lastSummary: WeekSummary | null = null;
export const weekStore = {
  set(r: WeekSummary | null) { lastSummary = r; },
  get(): WeekSummary | null { return lastSummary; },
};
