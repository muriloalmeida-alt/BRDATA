// Tabela e resultados da rodada (CAP04-T07). Regras de EXIBIÇÃO espelhadas
// do legado (public/js/carreira.js: renderTabela — ordenação e zonas —,
// divisionStandingsFor, wireTabelaDivisionSwitch, renderCopa). Só leitura.
import type { Career, StandingRow, Team } from "./types.ts";
import { COMPETITION_NAME } from "./home.ts";

export const RELEGATION_N = 4; // legado: RELEGATION_N
export const DIVISIONS = [
  { id: "brasileirao", short: "Série A" },
  { id: "serie_b", short: "Série B" },
  { id: "serie_c", short: "Série C" },
] as const;

export type Zone = "top" | "mid" | "reb" | null;
export interface TableRow { pos: number; team: Team; pts: number; j: number; zone: Zone; mine: boolean }
export interface ResultRow { home: Team; away: Team; gh: number; ga: number; mine: boolean }
export interface TableModel {
  division: string;
  divisionName: string;
  isOwnDivision: boolean;
  ownDivision: string;
  switcher: { id: string; label: string }[] | null; // null = carreira sem sistema de divisões
  lastRound: number; // última rodada disputada (0 = nenhuma)
  rows: TableRow[];
  excerpt: TableRow[]; // 6 linhas ao redor do seu clube (prancha)
  legend: { zone: Exclude<Zone, null>; label: string }[];
  results: ResultRow[];
}

const sortRows = (rows: StandingRow[]) => rows.slice().sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp));

// Mesmas faixas do legado: Série A — 1º–6º Libertadores, 7º–12º
// Pré-Libertadores (Sul-Americana), últimos 4 rebaixamento; Série B/C —
// 4 primeiros acesso, últimos 4 rebaixamento.
export function zoneOf(pos: number, total: number, compId: string): Zone {
  if (compId === "brasileirao") {
    if (pos <= 6) return "top";
    if (pos <= 12) return "mid";
    return pos > total - RELEGATION_N ? "reb" : null;
  }
  if (pos <= RELEGATION_N) return "top";
  return pos > total - RELEGATION_N ? "reb" : null;
}

export function standingsFor(career: Career, compId: string): Record<string, StandingRow> {
  const own = career.competitionId || "brasileirao";
  if (compId === own) return career.standings || {};
  return career.otherDivisions?.[compId]?.standings || {};
}

export function buildTable(career: Career, teamById: (id: string | number) => Team, division?: string | null): TableModel {
  const own = career.competitionId || "brasileirao";
  const compId = career.otherDivisions && division && DIVISIONS.some((d) => d.id === division) ? division : own;
  const me = String(career.clubId);
  const sorted = sortRows(Object.values(standingsFor(career, compId)));
  const rows: TableRow[] = sorted.map((r, i) => ({
    pos: i + 1, team: teamById(r.id), pts: r.pts, j: r.j,
    zone: zoneOf(i + 1, sorted.length, compId), mine: String(r.id) === me,
  }));
  const myIdx = rows.findIndex((r) => r.mine);
  const anchor = myIdx >= 0 ? myIdx : 0;
  const start = Math.max(0, Math.min(anchor - 3, rows.length - 6));
  const lastRound = Math.max(0, Math.min(career.currentRound - 1, 38));
  const results = compId === own && lastRound > 0
    ? (career.resultsByRound?.[lastRound] || []).map((r) => ({
      home: teamById(r.home), away: teamById(r.away), gh: r.gh, ga: r.ga,
      mine: String(r.home) === me || String(r.away) === me,
    })).sort((a, b) => Number(b.mine) - Number(a.mine))
    : [];
  return {
    division: compId,
    divisionName: COMPETITION_NAME[compId] || "Competição",
    isOwnDivision: compId === own,
    ownDivision: own,
    switcher: career.otherDivisions ? DIVISIONS.map((d) => ({ id: d.id, label: d.short })) : null,
    lastRound,
    rows,
    excerpt: rows.slice(start, start + 6),
    legend: compId === "brasileirao"
      ? [{ zone: "top", label: "Libertadores" }, { zone: "mid", label: "Pré-Libertadores" }, { zone: "reb", label: "Rebaixamento" }]
      : [{ zone: "top", label: "Acesso" }, { zone: "reb", label: "Rebaixamento" }],
    results,
  };
}

// ---- Copa do Brasil (legado: renderCopa) ----
const CUP_PHASES = ["r16", "qf", "sf", "final"];
const CUP_PHASES_EXPANDED = ["fase1", "r32", "r16", "qf", "sf", "final"];
const CUP_ROUNDS: Record<string, number> = { r16: 6, qf: 14, sf: 22, final: 30 };
const CUP_ROUNDS_EXPANDED: Record<string, { ida: number; volta: number }> = {
  fase1: { ida: 3, volta: 6 }, r32: { ida: 9, volta: 12 }, r16: { ida: 15, volta: 18 },
  qf: { ida: 21, volta: 24 }, sf: { ida: 27, volta: 30 }, final: { ida: 33, volta: 36 },
};
export const CUP_PHASE_LABEL: Record<string, string> = { fase1: "1ª fase", r32: "2ª fase", r16: "Oitavas de final", qf: "Quartas de final", sf: "Semifinal", final: "Final" };

export interface CupTie {
  home: string | number; away: string | number;
  gh?: number | null; ga?: number | null; winner?: string | number | null; penalties?: boolean;
  leg1?: { gh: number | null; ga: number | null }; leg2?: { gh: number | null; ga: number | null };
}
export interface Cup {
  active?: boolean; expanded?: boolean; phase?: string; ties?: Record<string, CupTie[]>;
  championIsHuman?: boolean; humanAlive?: boolean; humanEliminatedStage?: string; humanEliminatedAtRound?: number | null;
  champion?: string | number;
  seeds?: (string | number)[];
}
export interface CupModel {
  status: string;
  outcome: "campeao" | "eliminado" | "vivo" | "encerrada" | "fora";
  history: { phase: string; opp: Team; score: string; note: string; won: boolean | null }[];
}

export function buildCup(career: Career, teamById: (id: string | number) => Team): CupModel {
  const cup = career.cup;
  const me = String(career.clubId);
  if (!cup || !cup.active) {
    return { outcome: "fora", status: "Seu elenco não se classificou pra Copa do Brasil essa temporada — só os 16 elencos mais fortes da competição disputam.", history: [] };
  }
  const phases = cup.expanded ? CUP_PHASES_EXPANDED : CUP_PHASES;
  const myTie = (phase: string) => (cup.ties?.[phase] || []).find((t) => String(t.home) === me || String(t.away) === me);
  let status: string;
  let outcome: CupModel["outcome"];
  if (cup.championIsHuman) {
    outcome = "campeao"; status = `Campeão da Copa do Brasil ${career.seasonYear}!`;
  } else if (!cup.humanAlive) {
    outcome = "eliminado";
    const st = cup.humanEliminatedStage || "";
    status = `Eliminado da Copa do Brasil nas ${CUP_PHASE_LABEL[st] || st}${cup.humanEliminatedAtRound ? ` (rodada ${cup.humanEliminatedAtRound})` : ""}.`;
  } else if (cup.phase === "done") {
    outcome = "encerrada"; status = `Copa do Brasil ${career.seasonYear} encerrada. Campeão: ${teamById(cup.champion ?? "").name}.`;
  } else {
    outcome = "vivo";
    const phase = cup.phase || "";
    const tie = myTie(phase);
    const oppName = tie ? teamById(String(tie.home) === me ? tie.away : tie.home).name : "?";
    if (cup.expanded && !tie && phase === "fase1" && (cup.seeds || []).some((id) => String(id) === me)) {
      // Cabeça de chave só entra na 2ª fase (legado: sorteio da r32 junta
      // vencedores da 1ª fase + cup.seeds). A versão atual mostra aqui
      // "rodada undefined contra ?" — a v2 descreve o dado real.
      status = `Fase atual: ${CUP_PHASE_LABEL.fase1}. Seu clube é cabeça de chave e entra na ${CUP_PHASE_LABEL.r32} (rodada ${CUP_ROUNDS_EXPANDED.r32.ida}).`;
    } else if (cup.expanded && tie) {
      const r = CUP_ROUNDS_EXPANDED[phase];
      const isIda = tie.leg1?.gh == null;
      status = `Fase atual: ${CUP_PHASE_LABEL[phase]} (${isIda ? "ida" : "volta"}). Próximo confronto: rodada ${isIda ? r.ida : r.volta} contra ${oppName}.`;
    } else {
      status = `Fase atual: ${CUP_PHASE_LABEL[phase]}. Próximo confronto: rodada ${CUP_ROUNDS[phase]} contra ${oppName}.`;
    }
  }
  const history: CupModel["history"] = [];
  for (const phase of phases) {
    const tie = myTie(phase);
    if (!tie) continue;
    const isHomeMe = String(tie.home) === me;
    const opp = teamById(isHomeMe ? tie.away : tie.home);
    if (cup.expanded) {
      if (!tie.leg1 || tie.leg1.gh == null) continue;
      const lbl = (l: { gh: number | null; ga: number | null }) => (isHomeMe ? `${l.gh} x ${l.ga}` : `${l.ga} x ${l.gh}`);
      const leg2Done = tie.leg2?.gh != null;
      const aggMine = isHomeMe ? (tie.leg1.gh ?? 0) + (tie.leg2?.gh ?? 0) : (tie.leg1.ga ?? 0) + (tie.leg2?.ga ?? 0);
      const aggOpp = isHomeMe ? (tie.leg1.ga ?? 0) + (tie.leg2?.ga ?? 0) : (tie.leg1.gh ?? 0) + (tie.leg2?.gh ?? 0);
      const won = leg2Done ? String(tie.winner) === me : null;
      history.push({
        phase: CUP_PHASE_LABEL[phase], opp,
        score: `${lbl(tie.leg1)}${leg2Done ? ` / ${lbl(tie.leg2!)}` : ""}`,
        note: leg2Done ? `Agregado ${aggMine} x ${aggOpp}${tie.penalties ? " (pên.)" : ""} — ${won ? "Classificado" : "Eliminado"}` : "Ida disputada, aguardando a volta",
        won,
      });
    } else {
      if (tie.gh == null) continue;
      const won = String(tie.winner) === me;
      history.push({
        phase: CUP_PHASE_LABEL[phase], opp,
        score: `${isHomeMe ? tie.gh : tie.ga} x ${isHomeMe ? tie.ga : tie.gh}${tie.penalties ? " (pên.)" : ""}`,
        note: won ? "Classificado" : "Eliminado", won,
      });
    }
  }
  return { status, outcome, history };
}
