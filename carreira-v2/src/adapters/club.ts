// Clube (fase 9 do plano de independência): comissão técnica, estádio,
// patrocínios e olheiros pelo motor (comandos da ponte em carreira.js), com
// as regras de sempre.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";

const SAFE = new Set(["ja-contratada", "sem-comissao", "area-invalida", "sem-sugestao", "obra-invalida", "obra-em-andamento", "concluida", "bloqueada", "caixa",
  "tipo-invalido", "com-contrato", "proposta-invalida", "olheiro-invalido", "ja-contratado", "em-missao", "opcao-invalida", "regiao-invalida", "prospecto-invalido", "indicacao-invalida", "decisao-invalida"]);
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
async function read<T = object>(name: string, ...args: unknown[]): Promise<Res<T>> {
  try { const s = await engine.get(); return await s.run<Res<T>>(name, ...args); } catch { engine.reset(); return { ok: false, motivo: "falha" }; }
}
export type Target = { clubId: string; playerId: string };
export interface Staff { contratada: boolean; custoMensal: number; sugestoes: { area: string; nome: string; texto: string; aplicavel: boolean; alvo: Target | null }[] }
export interface Stadium {
  nome: string | null; capacidade: number; caixa: number;
  obra: { id: string; nome: string; rodadasRestantes: number } | null;
  melhorias: { id: string; nome: string; custo: number; rodadas: number; lugares: number; requer: string | null; estado: "disponivel" | "aguardando" | "bloqueada" | "em-obra" | "concluida" }[];
}
export interface SponsorDeal { empresa: string; valorTemporada: number; temporadasRestantes: number }
export interface Sponsors { tipos: { tipo: "master" | "material"; nome: string; contrato: SponsorDeal | null; propostas: { empresa: string; valorTemporada: number; duracao: number }[] | null }[]; totalTemporada: number }
export interface Scouting {
  catalogo: { id: string; nome: string; especialidade: string; avaliacao: number; rede: number; salario: number; regioes: string[] }[];
  regioes: { id: string; nome: string }[]; tipos: { id: string; nome: string }[]; duracoes: { id: string; nome: string; rodadas: number; tentativas: number }[];
  permitidas: Record<string, string[]>; custoMensal: number;
}

export const ClubGateway = {
  staff: () => read<Staff>("comissao"),
  hireStaff: () => write("contratarComissao"),
  fireStaff: () => write("demitirComissao"),
  applySuggestion: (area: string) => write<{ alvo?: Target; texto?: string }>("aplicarSugestao", area),
  stadium: () => read<Stadium>("estadio"),
  startWork: (id: string) => write("iniciarObra", id),
  sponsors: () => write<Sponsors>("patrocinios"),
  sign: (kind: string, idx: number) => write("assinarPatrocinio", kind, idx),
  scouting: () => read<Scouting>("olheiros"),
  hireScout: (id: string) => write("contratarOlheiro", id),
  fireScout: (id: string) => write("dispensarOlheiro", id),
  mission: (scoutId: string, region: string, type: string, group: string | null, duration: string) => write("enviarMissao", scoutId, region, type, group, duration),
  recruit: (prospectId: string) => write("trazerParaBase", prospectId),
  suggestion: (id: string, d: "propor" | "recusar") => write<{ alvo: Target | null }>("indicacao", id, d),
};
