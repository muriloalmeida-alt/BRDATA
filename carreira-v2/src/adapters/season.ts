// Temporada e carreira do treinador (fase 5 do plano de independência):
// avançar a temporada, confirmar a demissão, aceitar ou recusar a proposta
// de outro clube e ler o histórico do treinador. Tudo pelo motor
// (adapters/engine.ts), com as funções da versão anterior (comandos
// proximaTemporada, demitir, aceitarPropostaClube, recusarPropostaClube e
// historicoTreinador da ponte). Falha ao gravar recarrega o motor.
import { engine } from "./engine.ts";
import type { CoachHistory, NewSeasonSummary } from "../domain/season.ts";

type R<T = object> = ({ ok: true } & T) | { ok: false; motivo?: string };
const SAFE = new Set(["temporada-em-andamento", "em-andamento", "sem-proposta", "sem-demissao", "sem-carreira", "clube-invalido"]);

async function run<T>(name: string, ...args: unknown[]): Promise<T> {
  const s = await engine.get();
  return await s.run<T | Promise<T>>(name, ...args);
}
async function guarded<T extends { ok: boolean; motivo?: string }>(name: string): Promise<T> {
  try {
    const r = await run<T>(name);
    if (!r.ok && !SAFE.has(r.motivo || "")) engine.reset();
    return r;
  } catch {
    engine.reset();
    return { ok: false, motivo: "falha" } as T;
  }
}

export type NextSeasonResult = R<({ demitido: false } & NewSeasonSummary) | { demitido: true }>;
export const SeasonGateway = {
  next: () => guarded<NextSeasonResult>("proximaTemporada"),
  // Demissão: o save do clube é apagado; a criação da nova carreira usa o
  // MESMO motor (que guarda a reputação e as passagens do treinador).
  dismiss: () => guarded<R>("demitir"),
  acceptOffer: () => guarded<R>("aceitarPropostaClube"),
  declineOffer: () => guarded<R>("recusarPropostaClube"),
  history: () => run<R<CoachHistory>>("historicoTreinador").catch(() => ({ ok: false }) as R<CoachHistory>),
};

// Resumo da virada (vive em memória até sair da tela Nova temporada).
let lastNewSeason: NewSeasonSummary | null = null;
export const newSeasonStore = { set(r: NewSeasonSummary | null) { lastNewSeason = r; }, get() { return lastNewSeason; } };
