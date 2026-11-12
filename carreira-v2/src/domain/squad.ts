// Elenco (CAP02-T02) e Perfil do jogador (CAP02-T03). Exibição espelhada do
// legado (public/js/carreira.js: renderElenco, playerRow, openDetail,
// isContractExpiring, squadSortKey): elenco principal + emprestados
// agrupados por posição; base numa seção própria; situação no lugar da
// posição específica (decisões de 01/11). Só leitura.
import type { Career, Player, PlayerGroup } from "./types.ts";
import { isAvailable, shortName, sortKey } from "./lineup.ts";
import { potentialText } from "./potential.ts";

export const SECTION_TITLE: Record<PlayerGroup, string> = { G: "Goleiros", D: "Defesa", M: "Meio-campo", F: "Ataque" };
// Posição por extenso como na prancha do Perfil ("Ataque").
export const POSITION_WORD: Record<PlayerGroup, string> = { G: "Goleiro", D: "Defesa", M: "Meio-campo", F: "Ataque" };

export type Tone = "danger" | "note" | null;
export interface Situation { text: string; tone: Tone }

// Prioridade: lesão/suspensão → pede transferência → fim de contrato →
// emprestado → lugar na escalação (Titular / Reserva / Fora da lista).
export function situationOf(career: Career, p: Player): Situation {
  const round = career.currentRound;
  if (!isAvailable(p, round)) {
    const back = p.outUntilRound != null ? ` · volta na rodada ${p.outUntilRound}` : "";
    return { text: `${p.status === "suspenso" ? "Suspenso" : "Lesionado"}${back}`, tone: "danger" };
  }
  if (p.wantsTransfer) return { text: "Pede transferência", tone: "note" };
  if (p.origin !== "loan" && p.contractUntil === career.seasonYear) return { text: "Fim de contrato", tone: "note" };
  if (p.origin === "loan") return { text: "Emprestado", tone: null };
  if (p.origin === "base") return { text: "Categoria de base", tone: null };
  const starters = career.lineup?.starters || [];
  const bench = career.lineup?.bench || [];
  if (starters.includes(p.id)) return { text: "Titular", tone: null };
  if (bench.includes(p.id)) return { text: "Reserva", tone: null };
  return { text: "Fora da lista", tone: null };
}

// pot: faixa do olheiro na linha dos jovens da base (decisão do Murilo,
// 12/11/2026, como a lista antiga); null para os demais.
export interface SquadRow { player: Player; short: string; situation: Situation; pot: string | null }
export const potOf = (p: Player): string | null => (p.origin === "base" ? potentialText(p) : null);
export interface SquadModel {
  groups: { group: PlayerGroup; title: string; rows: SquadRow[] }[];
  base: SquadRow[];
  total: number;
}

export function buildSquad(career: Career): SquadModel {
  const squad = career.squad || [];
  const row = (p: Player): SquadRow => ({ player: p, short: shortName(p.name), situation: situationOf(career, p), pot: potOf(p) });
  // legado: principal = origin "principal" ou "loan" (emprestado entra no elenco principal)
  const main = squad.filter((p) => p.origin !== "base").sort((a, b) => sortKey(a) - sortKey(b));
  const base = squad.filter((p) => p.origin === "base").sort((a, b) => sortKey(a) - sortKey(b));
  const groups = (["G", "D", "M", "F"] as PlayerGroup[])
    .map((g) => ({ group: g, title: SECTION_TITLE[g], rows: main.filter((p) => p.group === g).map(row) }))
    .filter((g) => g.rows.length);
  return { groups, base: base.map(row), total: squad.length };
}

export interface ProfileModel {
  player: Player;
  short: string;
  position: string;
  clubName: string;
  facts: { label: string; value: string; tone?: Tone }[];
}

export function buildProfile(career: Career, id: string): ProfileModel | null {
  const p = (career.squad || []).find((x) => x.id === id);
  if (!p) return null;
  const sit = situationOf(career, p);
  const n = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));
  return {
    player: p,
    short: shortName(p.name),
    position: POSITION_WORD[p.group],
    clubName: career.clubName,
    facts: [
      { label: "Posição", value: POSITION_WORD[p.group] },
      { label: "Situação", value: sit.text, tone: sit.tone },
      { label: "Overall", value: n(p.overall) },
      { label: "Ataque", value: n(p.atk) },
      { label: "Defesa", value: n(p.def) },
      { label: "Físico", value: n(p.phys) },
      { label: "Condição", value: `${Math.round(p.condition == null ? 100 : p.condition)}%` }, // legado: sem dado = 100
      { label: "Moral", value: String(p.morale == null ? 70 : p.morale) }, // legado: sem dado = 70
      { label: "Jogos", value: String(p.apps || 0) },
      { label: "Gols na temporada", value: String(p.goalsSeason || 0) },
      { label: "Gols na carreira", value: String(p.goalsCareer || 0) },
    ],
  };
}
