// Início (CAP01-T07 / CAP02-T01) — tudo que a tela mostra, derivado do
// save real. Funções puras: mesmo save ⇒ mesmo resultado; nada é gravado.
// As regras de ordenação/fase reproduzem as do legado (carreira.js:
// sortedStandings, renderCentral) só para EXIBIR — não decidem jogo.
import type { Career, CalendarWeek, Team } from "./types.ts";

export const COMPETITION_NAME: Record<string, string> = {
  brasileirao: "Brasileirão Série A",
  serie_b: "Brasileirão Série B",
  serie_c: "Brasileirão Série C",
};
const MONTH = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const PHASE: Record<CalendarWeek["p"], string> = { ferias: "Férias", pre: "Pré-temporada", temporada: "Temporada", pausa: "Pausa de julho" };
export const ROUNDS = 38;

export type FormResult = "V" | "E" | "D";
export type CtaAction = "preparar" | "avancar-semana" | "amistoso" | "proxima-temporada";

export interface HomeModel {
  club: { name: string; short: string; crest: Team; season: number };
  competition: string;
  state: "match" | "offweek" | "ended";
  next: null | { home: Team; away: Team; line: string; phase: string | null };
  cta: { label: string; action: CtaAction };
  alerts: { id: "escalacao" | "proposta"; title: string; sub: string }[];
  position: number | null;
  form: FormResult[];
  objective: string | null;
  cash: string | null;
  news: string | null;
}

export function sortedStandings(career: Career) {
  return Object.values(career.standings || {}).slice()
    .sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp));
}

export function moneyShort(v: number): string {
  const abs = Math.abs(v || 0), sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `${sign}R$ ${abs.toLocaleString("pt-BR")}`;
}

// "18 AGO" do domingo da semana da rodada (calendário: semana começa na
// segunda; o jogo da liga é no domingo, +6 dias — mesma regra do legado).
export function matchDay(career: Career, round: number): string | null {
  const cal = career.calendar;
  const w = cal?.weeks?.find((x) => x.r === round);
  if (!cal || !w) return null;
  const [m, d] = w.d.split("-").map(Number);
  const dt = new Date(Date.UTC(cal.year, m - 1, d + 6));
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTH[dt.getUTCMonth()]}`;
}

export function buildHome(career: Career, teamById: (id: string | number) => Team): HomeModel {
  const me = String(career.clubId);
  const crest = teamById(me);
  const club = { name: career.clubName, short: career.clubShort || career.clubName, crest, season: career.seasonYear };
  const competition = COMPETITION_NAME[career.competitionId || "brasileirao"] || "Competição";
  const round = career.currentRound;
  const cal = career.calendar;
  const week = cal ? cal.weeks[cal.idx] : null;

  let state: HomeModel["state"] = "match";
  let next: HomeModel["next"] = null;
  let cta: HomeModel["cta"] = { label: "Preparar partida", action: "preparar" };
  if (round > ROUNDS) {
    state = "ended";
    cta = { label: "Próxima temporada", action: "proxima-temporada" };
  } else {
    const fx = (career.schedule[round] || []).find((m) => String(m.home) === me || String(m.away) === me);
    const offWeek = !!(week && !week.r);
    let phase: string | null = null;
    if (offWeek && week && cal) {
      const month = week.d.slice(0, 2);
      const same = cal.weeks.filter((w) => w.p === week.p && w.d.slice(0, 2) === month);
      phase = `${PHASE[week.p]} · semana ${same.indexOf(week) + 1} de ${same.length}`;
      state = "offweek";
      const fr = (cal.friendlies || []).find((f) => f.wi === cal.idx);
      const friendlyOn = !!(fr && !fr.played && (!fr.optional || fr.opp));
      cta = friendlyOn ? { label: "Ir para o amistoso", action: "amistoso" } : { label: "Avançar semana", action: "avancar-semana" };
    }
    if (fx) {
      const day = matchDay(career, round);
      next = { home: teamById(fx.home), away: teamById(fx.away), line: [day, `RODADA ${round}`].filter(Boolean).join(" · "), phase };
    }
  }

  const alerts: HomeModel["alerts"] = [];
  const filled = (career.lineup?.starters || []).filter(Boolean).length;
  if (state !== "ended" && career.lineup && filled < 11) alerts.push({ id: "escalacao", title: "Escalação incompleta", sub: `${filled}/11 titulares definidos` });
  const prop = (career.clubProposals || [])[0];
  if (prop) alerts.push({ id: "proposta", title: `Proposta do ${prop.clubName}`, sub: "Outro clube quer você no comando" });

  const myRow = career.standings?.[me];
  const position = myRow && myRow.j > 0 ? sortedStandings(career).findIndex((r) => String(r.id) === me) + 1 : null;
  const form = (career.recentForm || []).slice(-5).map((p) => (p === 3 ? "V" : p === 1 ? "E" : "D") as FormResult);
  const feed = career.newsFeed || [];
  const news = (feed.find((n) => n.mine) || feed[0])?.texto || null;

  return {
    club, competition, state, next, cta, alerts, position, form,
    objective: career.boardGoal?.label || null,
    cash: career.finances ? moneyShort(career.finances.cash) : null,
    news,
  };
}
