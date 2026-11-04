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
export interface Friendly { wi: number; invites?: (string | number)[]; optional?: boolean; opp?: string | number | null; played?: boolean; result?: { gh: number; ga: number } | null }

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
  origin?: "principal" | "loan" | "base" | string;
  atk?: number; def?: number; phys?: number;
  morale?: number | null;
  apps?: number; goalsSeason?: number; goalsCareer?: number;
  wantsTransfer?: boolean;
  contractUntil?: number;
  wage?: number;
  potential?: number;
  // Fase 7 (ficha completa, conversa, contratos)
  age?: number; value?: number; benchStreak?: number; lastTalkRound?: number; moraleReason?: string;
  yellowCards?: number; assistsSeason?: number; appsSeason?: number;
  // Fase 6 (Evolução e condição): históricos do motor.
  fatigueHistory?: { round: number; fadiga: number }[];
  injuryHistory?: { round: number; severity?: string; durationRounds: number; fadigaAtInjury?: number }[];
  seasonHistory?: { year: number; clubName?: string; apps?: number; goals?: number; assists?: number; overall?: number }[];
  // Fase 8 (mercado): empréstimos.
  onLoanFromClubId?: string | number; loanFromClubId?: string | number; loanReturnRound?: number | null;
  loanBuyOption?: { mandatory: boolean; value: number } | null; loanOriginalWage?: number;
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
  matchLog?: { seasonYear: number; round: number; opponentId: string | number; home: boolean; gh: number; ga: number }[];
  otherDivisions?: Record<string, { standings?: Record<string, StandingRow> }>;
  resultsByRound?: Record<string, { home: string | number; away: string | number; gh: number; ga: number }[]>;
  cup?: import("./table.ts").Cup;
  recentForm?: number[];
  boardGoal?: { label: string; target?: number };
  objectives?: { season?: { title: string; status?: string; target?: number; currentProgress?: number }[] };
  seasonHistory?: { year: number; position: number; points?: number; goalLabel: string; goalWasMet: boolean }[];
  finances?: { cash: number; wageCap?: number };
  financeLedger?: { round: number; type: string; label: string; amount: number }[];
  newsFeed?: NewsItem[];
  clubProposals?: { clubId?: string; clubName: string; reputationRequired?: number; budgetOffered?: number; seasonYear?: number }[];
  reputation?: number;
  leagueSquads?: Record<string, Player[]>;
  pendingListings?: Listing[];
  // Fase 8 (mercado)
  pendingOffersOut?: OfferOut[];
  pendingOffer?: { playerId: string; playerName: string; clubId: string; clubName: string; fee: number; round?: number } | null;
  transferLog?: { round: number; text: string }[];
  nextSigningDiscountPct?: number | null;
  marketScope?: "multi" | "single" | string;
  manMarking?: { opponentId: string | number; myPlayerId: string; rivalPlayerId: string } | null;
  tacticalSchemes?: { id: string; name: string }[];
  negativeSeasonsStreak?: number;
  careerTotals?: { j?: number; v?: number };
  seasonAwards?: { seasonYear: number; brasileirao?: { campeao?: string | number | null }; copaDoBrasil?: { disputou?: boolean; campeao?: string | number | null } }[];
  calendar?: { year: number; idx: number; weeks: CalendarWeek[]; friendlies?: Friendly[] };
  divisionTeams?: Record<string, Team[]>;
  notifications?: import("./week.ts").Notice[];
}

// Fase 8 (mercado): propostas enviadas e anúncios de venda (carreira.js,
// pendingOffersOut / pendingListings).
export interface OfferOut {
  id: string; playerId: string; playerName: string; clubId: string; clubName: string;
  marketValue: number; offerValue: number; installments: number; roundsLeft: number;
  status: "pending" | "countered" | string; counterValue: number | null; submittedRound?: number; counterRounds?: number;
  rivalOffer?: { clubId: string; clubName: string; offerValue: number; installments: number } | null;
}
export interface Listing {
  id?: string; playerId: string | number; playerName?: string; askingValue?: number; marketValue?: number; listedRound?: number;
  offers?: { id: string; clubId: string; clubName: string; value: number; installments: number; round?: number }[];
}
