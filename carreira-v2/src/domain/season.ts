// Fase 5 (plano de independência) — temporada e carreira do treinador.
// Funções puras, só exibição:
// - Encerramento da temporada (CAP04-T08, 02_resultados col. 3);
// - Nova temporada (CAP04-N06, complemento 21 col. 2), a partir do resumo
//   que o motor devolve ao avançar (advanceSeason);
// - Demissão (CAP06-T08, complemento 22 col. 2);
// - Proposta ao treinador (CAP06-T04, complemento 21 col. 3 e 22 col. 1);
// - Perfil do treinador (CAP06-T01, 11_base_treinador col. 3) e Histórico e
//   conquistas (CAP06-T05, complemento 22 col. 3 e 23 col. 1).
// Decisões de 04/11: aviso na tela em vez de diálogo ao avançar; nova
// temporada com os dados reais de hoje; orçamento no lugar do "objetivo
// proposto"; reputação e status no perfil; demissão sem saída; histórico
// como a prancha; sem louros.
import type { Career, Team } from "./types.ts";
import { COMPETITION_NAME, ROUNDS, moneyShort, sortedStandings } from "./home.ts";
import { shortName } from "./lineup.ts";

// Mesma regra da versão anterior (DISMISSAL_STREAK em carreira.js), usada
// só para reconhecer uma demissão já decidida e ainda não confirmada.
export const DISMISSAL_STREAK = 3;
const DIVISION: Record<string, string> = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };

function divisionOf(career: Career, id: string | number): string | null {
  if (String(id) === String(career.clubId)) return DIVISION[career.competitionId || "brasileirao"] || null;
  for (const [comp, teams] of Object.entries(career.divisionTeams || {})) {
    if (teams.some((t) => String(t.id) === String(id))) return DIVISION[comp] || null;
  }
  return null;
}
function myPosition(career: Career): number | null {
  const i = sortedStandings(career).findIndex((r) => String(r.id) === String(career.clubId));
  return i >= 0 ? i + 1 : null;
}

// ---------- Encerramento ----------
export interface SeasonEndModel {
  year: number; nextYear: number; club: Team; position: number | null;
  kicker: string; line: string;
  goal: null | { label: string; met: boolean };
  dismissalPending: boolean;
}
export function seasonEnded(career: Career): boolean { return career.currentRound > ROUNDS; }
export function dismissalPending(career: Career): boolean {
  return seasonEnded(career) && (career.negativeSeasonsStreak || 0) >= DISMISSAL_STREAK;
}
export function buildSeasonEnd(career: Career, teamById: (id: string | number) => Team): SeasonEndModel {
  const comp = COMPETITION_NAME[career.competitionId || "brasileirao"] || "Competição";
  const position = myPosition(career);
  const target = career.boardGoal?.target;
  const met = position != null && target != null && position > 0 && position <= target;
  return {
    year: career.seasonYear, nextYear: career.seasonYear + 1, club: teamById(career.clubId), position,
    kicker: `${comp} ${career.seasonYear}`,
    line: position != null ? `O ${career.clubName} concluiu a temporada de ${career.seasonYear} em ${position}º lugar no ${comp}.` : `Temporada de ${career.seasonYear} concluída.`,
    goal: career.boardGoal ? { label: career.boardGoal.label, met } : null,
    dismissalPending: dismissalPending(career),
  };
}

// ---------- Nova temporada ----------
export interface NewSeasonSummary {
  ano: number; anoAnterior: number; posicao: number; metaAnterior: string | null; metaBatida: boolean;
  envelhecidos: number; saidas: string[]; novosBase: number; contratacoes: number;
  divisao: null | { texto: string; subiu: boolean };
  meta: string | null; teto: number; caixa: number; propostas: number;
}
export interface NewSeasonModel {
  title: string;
  turn: { label: string; value: string; tone?: "pos" | "neg" }[];
  leaving: string | null;
  last: { label: string; value: string; tone?: "pos" | "neg" }[];
  squad: { label: string; value: string }[];
  money: { label: string; value: string }[];
  goal: string | null;
  hasOffer: boolean;
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export function buildNewSeason(r: NewSeasonSummary): NewSeasonModel {
  const turn: NewSeasonModel["turn"] = [
    { label: "Elenco envelhecido", value: plural(r.envelhecidos, "jogador", "jogadores") },
    { label: "Contratos encerrados", value: r.saidas.length ? plural(r.saidas.length, "jogador", "jogadores") : "Nenhum" },
  ];
  if (r.divisao) turn.push({ label: r.divisao.subiu ? "Acesso" : "Rebaixamento", value: r.divisao.texto.replace(/^(Acesso! |Rebaixado\(a\): )/, ""), tone: r.divisao.subiu ? "pos" : "neg" });
  return {
    title: `Temporada ${r.ano}.`,
    turn,
    leaving: r.saidas.length ? `Saíram por fim de contrato: ${r.saidas.map(shortName).join(", ")}.` : null,
    last: [
      { label: "Posição final", value: `${r.posicao}º lugar` },
      ...(r.metaAnterior ? [{ label: r.metaAnterior, value: r.metaBatida ? "Meta cumprida" : "Meta não cumprida", tone: (r.metaBatida ? "pos" : "neg") as "pos" | "neg" }] : []),
    ],
    squad: [
      { label: "Jovens novos na base", value: String(r.novosBase) },
      ...(r.contratacoes ? [{ label: "Contratações no principal", value: String(r.contratacoes) }] : []),
    ],
    money: [{ label: "Teto salarial", value: moneyShort(r.teto) }, { label: "Caixa", value: moneyShort(r.caixa) }],
    goal: r.meta,
    hasOffer: r.propostas > 0,
  };
}

// ---------- Demissão ----------
export interface DismissalModel { reason: string; rows: { label: string; value: string }[] }
export function buildDismissal(career: Career): DismissalModel {
  const last = (career.seasonHistory || [])[0];
  const streak = career.negativeSeasonsStreak || DISMISSAL_STREAK;
  const titles = (career.seasonAwards || []).reduce((n, a) =>
    n + (a.brasileirao?.campeao != null && String(a.brasileirao.campeao) === String(career.clubId) ? 1 : 0)
      + (a.copaDoBrasil?.disputou && String(a.copaDoBrasil.campeao) === String(career.clubId) ? 1 : 0), 0);
  const t = career.careerTotals || {};
  return {
    reason: last
      ? `${streak} temporadas seguidas sem cumprir a meta. Em ${last.year}: ${last.goalLabel}, e o time terminou em ${last.position}º lugar.`
      : `${streak} temporadas seguidas sem cumprir a meta.`,
    rows: [
      { label: "Jogos", value: String(t.j || 0) },
      { label: "Vitórias", value: String(t.v || 0) },
      { label: "Títulos", value: String(titles) },
    ],
  };
}

// ---------- Proposta ao treinador ----------
export interface ClubOfferModel {
  club: Team; clubName: string; division: string | null; budget: string | null;
  current: { name: string; division: string | null; position: string };
  reputation: string | null;
}
export function buildClubOffer(career: Career, teamById: (id: string | number) => Team): ClubOfferModel | null {
  const p = (career.clubProposals || [])[0];
  if (!p || !p.clubId) return null;
  const pos = myPosition(career);
  const played = (career.standings?.[String(career.clubId)]?.j || 0) > 0;
  return {
    club: teamById(p.clubId), clubName: p.clubName, division: divisionOf(career, p.clubId),
    budget: p.budgetOffered != null ? moneyShort(p.budgetOffered) : null,
    current: { name: career.clubName, division: divisionOf(career, career.clubId), position: played && pos ? `${pos}º lugar` : "Temporada no início" },
    reputation: career.reputation != null ? String(career.reputation) : null,
  };
}

// ---------- Perfil e histórico do treinador ----------
export interface CoachHistory {
  nome: string | null; reputacao: number; status: string; conquistasTotal: number;
  atual: { nome: string; temporadas: number; melhorPosicao: number | null; titulos: number };
  anteriores: { nome: string; temporadas: number; titulos: number; posicaoMedia: number; saida: string }[];
  titulos: { ano: number; competicao: "brasileirao" | "copa" }[];
  conquistas: { id: string; titulo: string; data: number }[];
}
export interface CoachModel { initial: string; name: string; role: string; season: string; reputation: string }
export function buildCoach(h: CoachHistory, fallbackName: string, career: Career): CoachModel {
  const name = (h.nome || fallbackName || "Treinador").trim();
  return {
    initial: name.charAt(0).toUpperCase() || "?",
    name,
    role: `Treinador do ${career.clubName}`,
    season: `Temporada ${career.seasonYear}`,
    reputation: `${h.reputacao} · ${h.status}`,
  };
}
const SEASONS = (n: number) => plural(n, "temporada", "temporadas");
const EXIT: Record<string, string> = { dismissed: "Saiu por demissão", accepted_proposal: "Saiu por proposta de outro clube" };
export interface HistoryModel {
  empty: boolean;
  clubs: { key: string; name: string; value: string; sub: string }[];
  titles: { key: string; name: string; value: string }[];
  achievements: { key: string; name: string; value: string }[];
}
export function buildHistory(h: CoachHistory): HistoryModel {
  const a = h.atual;
  const clubs = [
    { key: "atual", name: a.nome, value: a.temporadas ? SEASONS(a.temporadas) : "Primeira temporada", sub: [a.melhorPosicao ? `Melhor posição: ${a.melhorPosicao}º` : null, `${plural(a.titulos, "título", "títulos")}`, "Clube atual"].filter(Boolean).join(" · ") },
    ...h.anteriores.map((c, i) => ({ key: `c${i}`, name: c.nome, value: SEASONS(c.temporadas), sub: [`Posição média: ${c.posicaoMedia}º`, plural(c.titulos, "título", "títulos"), EXIT[c.saida] || null].filter(Boolean).join(" · ") })),
  ];
  const titles = h.titulos.map((t, i) => ({ key: `t${i}`, name: t.competicao === "copa" ? "Copa do Brasil" : "Brasileirão", value: String(t.ano) }));
  const achievements = h.conquistas.map((c) => ({ key: c.id, name: c.titulo, value: new Date(c.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) }));
  return { empty: !achievements.length, clubs, titles, achievements };
}
