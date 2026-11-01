// Recorte TIPADO do estado CAREER que a v2 lê (contrato real mapeado em
// docs/IMPLEMENTACAO_INVENTARIO_REAL.md §4). A única escrita da v2 é a
// escalação (formation/starters/bench/activeSchemeId — ver
// adapters/gateways.ts, CareerGateway.updateLineup); o resto do save é
// devolvido intacto. Campos ausentes em saves antigos são opcionais.

export interface Team {
  id: string | number;
  name: string;
  short?: string;
  logo?: string | null;
  c1?: string;
  c2?: string;
}

export interface Fixture { home: string | number; away: string | number }
export interface StandingRow { id: string | number; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number; pts: number }

export interface CalendarWeek { d: string; p: "ferias" | "pre" | "temporada" | "pausa"; r: number | null; c?: number }
export interface Friendly { wi: number; optional?: boolean; opp?: string | number | null; played?: boolean }

export interface NewsItem { type?: string; mine?: boolean; texto: string; round?: number; seasonYear?: number }

export type PlayerGroup = "G" | "D" | "M" | "F";
export interface Player {
  id: string;
  name: string;
  group: PlayerGroup;
  overall: number;
  status?: "ok" | "contundido" | "suspenso" | string;
  outUntilRound?: number | null;
  condition?: number | null;
}
export interface Lineup {
  formation?: string;
  starters: (string | null)[];
  bench?: string[];
  tactics?: Record<string, number>;
}

export interface Career {
  clubId: string;
  clubName: string;
  clubShort?: string;
  clubLogo?: string | null;
  competitionId?: string;
  seasonYear: number;
  currentRound: number;
  schedule: Record<string, Fixture[]>;
  standings: Record<string, StandingRow>;
  lineup?: Lineup;
  squad?: Player[];
  activeSchemeId?: string | null;
  updatedAt?: number;
  otherDivisions?: Record<string, { standings?: Record<string, StandingRow> }>;
  resultsByRound?: Record<string, { home: string | number; away: string | number; gh: number; ga: number }[]>;
  cup?: import("./table.ts").Cup;
  recentForm?: number[];
  boardGoal?: { label: string; target?: number };
  finances?: { cash: number };
  newsFeed?: NewsItem[];
  clubProposals?: { clubName: string }[];
  calendar?: { year: number; idx: number; weeks: CalendarWeek[]; friendlies?: Friendly[] };
  divisionTeams?: Record<string, Team[]>;
}
