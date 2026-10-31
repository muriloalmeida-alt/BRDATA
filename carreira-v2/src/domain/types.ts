// Recorte TIPADO do estado CAREER que a v2 lê (contrato real mapeado em
// docs/IMPLEMENTACAO_INVENTARIO_REAL.md §4). Só leitura: a v2 nunca
// grava o save nesta entrega. Campos ausentes em saves antigos são
// opcionais aqui de propósito.

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
  lineup?: { starters: (string | null)[] };
  recentForm?: number[];
  boardGoal?: { label: string; target?: number };
  finances?: { cash: number };
  newsFeed?: NewsItem[];
  clubProposals?: { clubName: string }[];
  calendar?: { year: number; idx: number; weeks: CalendarWeek[]; friendlies?: Friendly[] };
  divisionTeams?: Record<string, Team[]>;
}
