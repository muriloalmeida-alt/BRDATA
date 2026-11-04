// Elenco avançado (fase 7 do plano de independência): renovar, conversar,
// ações do jogador (banco, base, dispensa) e a coletiva avulsa da renovação
// recusada. Tudo pelo motor (comandos renovar, conversar, acaoJogador,
// coletivaAtual e responderColetiva da ponte), com as regras de sempre.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";

const SAFE = new Set(["jogador-invalido", "fora-do-prazo", "duracao-invalida", "teto", "sem-conversa", "opcao-invalida", "acao-invalida", "banco-cheio", "minimo", "sem-coletiva"]);
async function write<T = object>(name: string, ...args: unknown[]): Promise<Res<T>> {
  try {
    const s = await engine.get();
    const r = await s.run<Res<T> | Promise<Res<T>>>(name, ...args);
    if (!r.ok && !SAFE.has(r.motivo || "")) engine.reset();
    return r;
  } catch {
    engine.reset();
    return { ok: false, motivo: "falha" };
  }
}
export type RenewResult = { aceita: true; salario: number; anos: number; ate: number } | { aceita: false; motivo: string; salario: number; anos: number; coletiva: boolean };
export type PlayerAction = "removeStarter" | "removeBench" | "addBench" | "promote" | "demote" | "release";

export const SquadGateway = {
  renew: (id: string, wage: number, years: number) => write<RenewResult>("renovar", id, wage, years),
  talk: (id: string, option: "apoiar" | "prometer" | "cobrar") => write<{ efeito: number; texto: string; moral: number }>("conversar", id, option),
  action: (id: string, act: PlayerAction) => write("acaoJogador", id, act),
  // A coletiva avulsa vive na memória do motor (como na versão anterior).
  press: async (): Promise<Res<{ pergunta: string; respostas: { letra: string; texto: string }[] }>> => {
    const s = engine.current();
    if (!s) return { ok: false, motivo: "sem-coletiva" };
    try { return await s.run("coletivaAtual"); } catch { return { ok: false, motivo: "falha" }; }
  },
  answerPress: (letra: string | null) => write<{ reputacao: number | null; moral: number | null }>("responderColetiva", letra),
};
