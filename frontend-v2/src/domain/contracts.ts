// Contratos do save REAL (GET /api/career → { career }), levantados da
// fixture gerada pelo jogo atual (docs/IMPLEMENTACAO_INVENTARIO_REAL.md).
// Só os campos que a v2 lê; o resto do save existe e é preservado (a v2
// desta fatia é somente leitura — nunca grava a carreira).

export interface StandingRow { id: string; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number; pts: number }
export interface Fixture { home: string; away: string }
export interface Team {
  id: string; name: string; short?: string; uf?: string; c1?: string; c2?: string; logo?: string;
  venue?: { name?: string; city?: string } | null; competitionId?: string;
}
export interface CalendarWeek { d: string; p: string; r: number | null; c?: number }
export interface Player {
  id: string; name: string; overall: number; potential?: number; group?: string; age?: number;
  origin?: string; status?: string; photo?: string | null;
}
export interface MatchLogEntry { seasonYear: number; round: number; opponentId: string; home: boolean; gh: number; ga: number }
export interface NewsItem { type: string; mine?: boolean; texto: string; round?: number; seasonYear?: number }
export interface BoardGoal { type: string; target: number; label: string }
export interface GameObjective { objectiveId: string; title: string; target: number; currentProgress: number; status: string }

export interface Career {
  clubId: string; clubName: string; clubShort?: string; clubLogo?: string | null;
  competitionId: string; seasonYear: number; currentRound: number;
  standings: Record<string, StandingRow>;
  schedule: Record<string, Fixture[]>;
  calendar?: { year: number; idx: number; weeks: CalendarWeek[] } | null;
  divisionTeams?: Record<string, Team[]>;
  squad: Player[];
  matchLog?: MatchLogEntry[];
  recentForm?: number[];
  newsFeed?: NewsItem[];
  boardGoal?: BoardGoal | null;
  objectives?: { daily?: GameObjective[]; weekly?: GameObjective[] } | null;
  reputation?: number | null;
  negativeSeasonsStreak?: number;
  [unknownField: string]: unknown;
}

export interface SessionUser { id: string; name: string; email?: string; plan?: string }
