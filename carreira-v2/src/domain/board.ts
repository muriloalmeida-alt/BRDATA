// Diretoria (CAP02-T05) — "O que o clube espera.": meta da temporada,
// situação atual (posição + "Dentro da meta", sem barra nem percentual),
// outros objetivos e temporadas anteriores (decisões de 01/11). Mesmos
// dados e critérios do legado (renderBoardGoalsScreen, boardGoalMet,
// CAREER.objectives.season, CAREER.seasonHistory). Só leitura.
import type { Career } from "./types.ts";
import { sortedStandings } from "./home.ts";

export interface BoardModel {
  season: number;
  goal: string | null;
  position: number | null; // null = nenhuma rodada disputada
  onTrack: boolean;
  objectives: { title: string; status: string; done: boolean }[];
  history: { year: number; goal: string; position: number; met: boolean }[];
}

export function buildBoard(career: Career): BoardModel {
  const me = String(career.clubId);
  const rows = sortedStandings(career);
  const mine = rows.find((r) => String(r.id) === me);
  const position = mine && mine.j > 0 ? rows.indexOf(mine) + 1 : null;
  const target = career.boardGoal?.target;
  const objectives = (career.objectives?.season || []).map((o) => {
    const done = o.status === "completed" || o.status === "claimed";
    const progress = (o.target || 0) > 1 ? ` · ${Math.min(o.currentProgress || 0, o.target!)}/${o.target}` : "";
    return { title: o.title, done, status: `${done ? "Cumprido" : "Em andamento"}${progress}` };
  });
  return {
    season: career.seasonYear,
    goal: career.boardGoal?.label || null,
    position,
    // legado: boardGoalMet(position, goal) — position > 0 && position <= goal.target
    onTrack: position != null && target != null && position <= target,
    objectives,
    history: (career.seasonHistory || []).map((h) => ({ year: h.year, goal: h.goalLabel, position: h.position, met: !!h.goalWasMet })),
  };
}
