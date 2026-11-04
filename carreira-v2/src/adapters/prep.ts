// Tática e treino (fase 6 do plano de independência): leituras e comandos
// do motor (adapters/engine.ts) com as funções da versão anterior — comandos
// tatica, salvarTatica, salvarInstrucoesSetor, esquemas, salvarEsquema,
// aplicarEsquema, renomearEsquema, excluirEsquema, escalarAutomaticamente,
// marcacao, salvarMarcacao, treino, salvarDiaTreino, aplicarModeloTreino e
// aplicarTreino da ponte. Falha ao gravar recarrega o motor (a memória dele
// não pode ficar com o que o servidor não tem).
import { engine } from "./engine.ts";
import type { MarkingData, SchemesData, TacticsData, TrainingData, TrainingDayInput } from "../domain/prep.ts";

export type Res<T = object> = ({ ok: true } & T) | { ok: false; motivo?: string; mensagem?: string };
const SAFE = new Set(["setor-invalido", "esquema-invalido", "nome-repetido", "invalido", "sem-jogo", "jogador-invalido", "dia-invalido", "foco-invalido", "modelo-invalido", "ja-aplicado", "sem-carreira"]);

async function read<T>(name: string): Promise<Res<T>> {
  try {
    const s = await engine.get();
    return await s.run<Res<T> | Promise<Res<T>>>(name);
  } catch {
    return { ok: false, motivo: "falha" };
  }
}
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

export const PrepGateway = {
  tactics: () => read<TacticsData>("tatica"),
  saveTactics: (axes: Record<string, number>) => write("salvarTatica", axes),
  saveSector: (sector: string, values: Record<string, number>) => write("salvarInstrucoesSetor", sector, values),
  schemes: () => read<SchemesData>("esquemas"),
  saveScheme: (name: string) => write("salvarEsquema", name),
  applyScheme: (id: string) => write("aplicarEsquema", id),
  renameScheme: (id: string, name: string) => write("renomearEsquema", id, name),
  deleteScheme: (id: string) => write("excluirEsquema", id),
  autoLineup: (includeBase: boolean) => write("escalarAutomaticamente", includeBase),
  marking: () => read<MarkingData>("marcacao"),
  saveMarking: (mine: string | null, rival: string | null) => write("salvarMarcacao", mine, rival),
  training: () => read<TrainingData>("treino"),
  saveDay: (day: number, entry: TrainingDayInput) => write("salvarDiaTreino", day, entry),
  applyModel: (id: string) => write("aplicarModeloTreino", id),
  applyTraining: () => write<{ evoluiram: number }>("aplicarTreino"),
};
