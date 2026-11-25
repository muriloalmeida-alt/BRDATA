// MUNDO-001 (M10c, MUN-15): copas continentais (Libertadores, Sul-Americana,
// Champions, Europa League, Conference) na v2. Tipos da visão do motor
// (public/js/motor/copasvista.js) e as escolhas de exibição. Só leitura.
import type { ContinentalPending } from "./types.ts";

export interface CClub { id: string; nome: string; sigla: string | null; escudo: string | null; meu: boolean }
export interface CRow extends CClub { pos: number; j: number; v: number; e: number; d: number; sg: number; gp: number; pts: number; faixa?: "oitavas" | "playoff" | "fora" }
export interface CDuel { id: string; a: CClub; b: CClub; pernas: number; neutro: boolean; placares: { casa: string; fora: string; gh: number; ga: number }[]; agregado: { a: number; b: number } | null; vencedor: string | null; como: string | null }
export type CPhase =
  | { id: string; nome: string; tipo: "grupos"; grupos: { grupo: string; linhas: CRow[] }[] }
  | { id: string; nome: string; tipo: "liga"; rodadas: number; linhas: CRow[] }
  | { id: string; nome: string; tipo: "mata"; duelos: CDuel[] };
export interface CCup { id: string; nome: string; fases: CPhase[]; campeao: CClub | null; souParticipante: boolean }
export interface CConfed {
  confed: "CONMEBOL" | "UEFA"; ano: number | null; rotuloAno: string | null; copas: CCup[];
  historico: { ano: string; campeoes: { copa: string; nome: string; campeao: CClub; vice: CClub }[] }[];
  pendente: ContinentalPending | null;
}
export interface ContinentalView { confederacoes: CConfed[] }

// Copa inicial: a do clube do técnico (se ele joga alguma), senão a principal.
export function defaultCup(v: ContinentalView): string | null {
  const todas = v.confederacoes.flatMap((c) => c.copas);
  return (todas.find((c) => c.souParticipante) || todas[0])?.id || null;
}
// Fase inicial: a última criada que tem o clube do técnico, senão a última criada.
export function defaultPhase(cup: CCup): string | null {
  const tem = (f: CPhase) => f.tipo === "mata" ? f.duelos.some((d) => d.a.meu || d.b.meu) : f.tipo === "grupos" ? f.grupos.some((g) => g.linhas.some((l) => l.meu)) : f.linhas.some((l) => l.meu);
  const minhas = cup.fases.filter(tem);
  return (minhas[minhas.length - 1] || cup.fases[cup.fases.length - 1])?.id || null;
}
// Placar de um confronto do ponto de vista de "a": "2 × 1" (ida e volta somadas).
export function duelScore(d: CDuel): string {
  if (!d.agregado) return "— × —";
  return `${d.agregado.a} × ${d.agregado.b}`;
}
// Linha curta da decisão ("Pênaltis: X", "Prorrogação: X", "Agregado: X").
export function duelOutcome(d: CDuel): string | null {
  if (!d.vencedor) return null;
  const v = d.vencedor === d.a.id ? d.a.nome : d.b.nome;
  return d.como === "penaltis" ? `${v} nos pênaltis` : d.como === "prorrogacao" ? `${v} na prorrogação` : `Passa: ${v}`;
}
// A copa com o seu clube no resumo da aba Jogos.
export function continentalSummary(career: { copas?: { conmebol?: { pendente?: ContinentalPending | null; edicao?: unknown; historico?: unknown[] }; uefa?: { pendente?: ContinentalPending | null; edicao?: unknown; historico?: unknown[] } } }): string | null {
  const c = career.copas;
  if (!c) return null;
  const tem = (x?: { edicao?: unknown; historico?: unknown[] }) => !!(x && (x.edicao || (x.historico || []).length));
  if (!tem(c.conmebol) && !tem(c.uefa)) return null;
  const p = c.conmebol?.pendente || c.uefa?.pendente;
  if (p) return `${p.nomeCopa}: jogo nesta semana contra ${p.adversario.nome}`;
  return "Grupos, chaves e campeões";
}
