// Fase 6 (plano de independência) — tática e treino. Tipos das leituras do
// motor e funções puras de exibição:
// - Instruções táticas (CAP03-T03) e por setor (CAP03-N01, escala de 5 — P4);
// - Esquemas salvos (CAP03-T04);
// - Marcação individual (CAP03-N02);
// - Treinamento semanal, dia e condição (CAP03-T05);
// - Evolução e condição física (CAP03-T06), lida do save.
// Decisões de 04/11: tática pela Escalação e treino pelo Início/Elenco; o
// treino com tudo o que o jogo tem (jogo no sábado, folgas protegidas,
// duração, individual, modelos); overall por temporada passa a ser guardado;
// escalação automática na Escalação.
import type { Player } from "./types.ts";
import { shortName } from "./lineup.ts";

export interface Axis { id: string; nome: string; baixo: string; alto: string; nivel: number }
export interface TacticsData { formacao: string; eixos: Axis[]; setores: { id: string; nome: string; instrucoes: Axis[] }[] }
export interface SchemeItem { id: string; nome: string; formacao: string; titulares: number; eixos: { id: string; nome: string; nivel: number }[]; criadoRodada: number; usadoRodada: number | null }
export interface SchemesData { max: number; ativo: string | null; lista: SchemeItem[] }
export interface MarkingPlayer { id: string; nome: string; posicao: string | null; overall?: number }
export type MarkingData = { adversario: null } | { adversario: { id: string; nome: string; sigla: string | null }; meus: MarkingPlayer[]; rivais: MarkingPlayer[]; atual: { meu: string; rival: string } | null };
export type Focus = "tecnico" | "fisico" | "tatico" | "descanso" | "jogo";
export interface TrainingDay { dia: number; nome: string; jogo: boolean; protegido: boolean; foco: Focus | string; intensidade: string | null; grupo: string | null; duracao: number | null; jogador: string | null }
export interface TrainingData {
  dias: TrainingDay[]; modelo: string | null; modelos: { id: string; nome: string; descricao: string }[]; aplicado: boolean;
  duracao: { min: number; max: number; passo: number; padrao: Record<string, number> };
  resumo: { fadigaMedia: number; moral: number; folgas: number };
  elenco: { id: string; nome: string; posicao: string | null; condicao: number; fadigaProjetada: number }[];
}
export interface TrainingDayInput { foco: string; intensidade?: string; grupo?: string; duracao?: number; jogador?: string | null }

export const FOCUS_LABEL: Record<string, string> = { tecnico: "Técnico", fisico: "Físico", tatico: "Tático", descanso: "Descanso", jogo: "Jogo" };
export const INTENSITY_LABEL: Record<string, string> = { leve: "Leve", moderada: "Moderada", intensa: "Intensa" };
export const GROUP_LABEL: Record<string, string> = { principal: "Elenco", misto: "Misto com Sub-20", individual: "Individual" };
// Mesmo limiar do aviso da versão anterior (renderTreinos): fadiga ≥ 80% na
// semana projetada.
export const RISK_FATIGUE = 80;

// "Ritmo 3 · Pressão 4 / Linha 2 · Passe 3" do esquema salvo.
const SHORT: Record<string, string> = { ritmo: "Ritmo", pressao: "Pressão", linhaDefensiva: "Linha", estiloPasse: "Passe" };
export function schemeAxes(s: SchemeItem): [string, string] {
  const parts = s.eixos.map((e) => `${SHORT[e.id] || e.nome} ${e.nivel}`);
  return [parts.slice(0, 2).join(" · "), parts.slice(2).join(" · ")];
}
export function schemeMeta(s: SchemeItem): string {
  return [`Salvo na rodada ${s.criadoRodada}`, `${s.titulares}/11 titulares`, s.usadoRodada != null ? `usado na rodada ${s.usadoRodada}` : null].filter(Boolean).join(" · ");
}

// Linha do dia no Treinamento semanal.
export function dayLine(d: TrainingDay, players: { id: string; nome: string }[] = []): { value: string; editable: boolean; warn: boolean } {
  if (d.jogo) return { value: "Dia de jogo", editable: false, warn: false };
  const rest = d.foco === "descanso";
  if (rest) return { value: d.protegido ? "Folga protegida" : "Descanso", editable: true, warn: false };
  const who = d.grupo === "individual" ? (players.find((p) => p.id === d.jogador)?.nome ? shortName(players.find((p) => p.id === d.jogador)!.nome) : "Individual") : null;
  const parts = [FOCUS_LABEL[d.foco] || d.foco, d.intensidade ? INTENSITY_LABEL[d.intensidade] : null, d.duracao ? `${d.duracao} min` : null, who];
  return { value: parts.filter(Boolean).join(" · "), editable: true, warn: d.protegido };
}

// ---------- Evolução e condição ----------
export interface EvolutionModel {
  name: string; position: string; condition: string;
  fatigue: { label: string; value: string }[];
  seasons: { label: string; value: string }[];
  potential: string;
  injuries: { label: string; value: string }[];
  empty: boolean;
}
const POSITION: Record<string, string> = { G: "Goleiro", D: "Defensor", M: "Meio-campo", F: "Atacante" };
const SEVERITY: Record<string, string> = { leve: "leve", moderada: "moderada", grave: "grave" };
export function buildEvolution(p: Player): EvolutionModel {
  // O motor guarda 1 registro por semana; na pré-temporada (e em semanas sem
  // jogo) várias semanas têm a mesma rodada: numera as semanas dessa rodada.
  const recent = (p.fatigueHistory || []).slice(-8);
  const per = new Map<number, number>();
  recent.forEach((f) => per.set(f.round, (per.get(f.round) || 0) + 1));
  const seen = new Map<number, number>();
  const fatigue = recent.map((f) => {
    const n = (seen.get(f.round) || 0) + 1;
    seen.set(f.round, n);
    return { label: (per.get(f.round) || 0) > 1 ? `Rodada ${f.round} · semana ${n}` : `Rodada ${f.round}`, value: `${f.fadiga}% de fadiga` };
  }).reverse();
  const seasons = (p.seasonHistory || []).filter((h) => h.overall != null).map((h) => ({ label: `Temporada ${h.year}`, value: `Overall ${h.overall}` }));
  const injuries = (p.injuryHistory || []).slice(-5).reverse().map((i) => ({
    label: `Lesão ${SEVERITY[String(i.severity)] || ""}`.trim(),
    value: `Rodada ${i.round} · ${i.durationRounds} ${i.durationRounds === 1 ? "rodada" : "rodadas"}`,
  }));
  return {
    name: shortName(p.name), position: POSITION[p.group] || "",
    condition: `${Math.round(p.condition == null ? 100 : p.condition)}%`,
    fatigue, seasons, injuries,
    potential: p.potential != null ? `${p.overall} · teto ${p.potential}` : String(p.overall),
    empty: !fatigue.length && !seasons.length && !injuries.length,
  };
}
