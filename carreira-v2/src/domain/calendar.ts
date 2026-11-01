// Calendário (CAP02-T07) — "Seu próximo compromisso.": lista cronológica
// dos jogos do SEU clube na temporada (decisões de 01/11): Brasileirão,
// Copa do Brasil (só confronto já definido) e amistosos. Mesmas fontes do
// calendário atual (legado: calendarWeekRowHTML, CUP_ROUNDS*, matchLog,
// calendar.friendlies). Só leitura.
import type { Career, CalendarWeek, Team } from "./types.ts";
import { MONTH } from "./home.ts";
import type { CupTie } from "./table.ts";
import { CUP_PHASE_LABEL } from "./table.ts";

const CUP_ROUNDS: Record<string, number> = { r16: 6, qf: 14, sf: 22, final: 30 };
const CUP_ROUNDS_EXPANDED: Record<string, { ida: number; volta: number }> = {
  fase1: { ida: 3, volta: 6 }, r32: { ida: 9, volta: 12 }, r16: { ida: 15, volta: 18 },
  qf: { ida: 21, volta: 24 }, sf: { ida: 27, volta: 30 }, final: { ida: 33, volta: 36 },
};

export type Competition = "liga" | "copa" | "amistoso";
export interface CalendarItem {
  key: string;
  sort: number; // ordem cronológica (semana × 10 + dia)
  date: string; // "18 AGO" (ou "R12" sem calendário)
  day: string; // "DOM" | "QUA" | "" (amistoso: dia não definido; sem calendário)
  where: "Casa" | "Fora";
  home: Team;
  away: Team;
  competition: Competition;
  label: string; // "Brasileirão · Rodada 12" | "Copa do Brasil · Oitavas de final · Ida" | "Amistoso"
  score: { gh: number; ga: number } | null; // disputado (placar mandante × visitante)
  played: boolean;
}
export interface CalendarModel { upcoming: CalendarItem[]; past: CalendarItem[] }

function dateOf(year: number, w: CalendarWeek, plus: number): string {
  const [m, d] = w.d.split("-").map(Number);
  const dt = new Date(Date.UTC(year, m - 1, d + plus));
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTH[dt.getUTCMonth()]}`;
}

export function buildCalendar(career: Career, teamById: (id: string | number) => Team, competitionName: string): CalendarModel {
  const me = String(career.clubId);
  const cal = career.calendar;
  const weeks = cal?.weeks || [];
  const weekOfRound = (r: number) => weeks.findIndex((w) => w.r === r);
  const items: CalendarItem[] = [];

  // Brasileirão: domingo da semana da rodada (legado: "Dom" = semana + 6).
  const log = (career.matchLog || []).filter((m) => m.seasonYear === career.seasonYear);
  for (let r = 1; r <= 38; r++) {
    const fx = (career.schedule[r] || []).find((m) => String(m.home) === me || String(m.away) === me);
    if (!fx) continue;
    const wi = weekOfRound(r);
    const isHome = String(fx.home) === me;
    const played = r < career.currentRound;
    const res = log.find((m) => m.round === r);
    items.push({
      key: `liga-${r}`, sort: (wi >= 0 ? wi : r) * 10 + 6,
      date: wi >= 0 && cal ? dateOf(cal.year, weeks[wi], 6) : `R${r}`, day: wi >= 0 ? "DOM" : "",
      where: isHome ? "Casa" : "Fora", home: teamById(fx.home), away: teamById(fx.away),
      competition: "liga", label: `${competitionName} · Rodada ${r}`,
      score: played && res ? { gh: res.gh, ga: res.ga } : null, played,
    });
  }

  // Copa do Brasil: quarta da semana da rodada (legado: semana + 2), só
  // quando o seu confronto da fase já existe. Na volta o mando inverte e
  // o placar guardado é relativo ao confronto (legado: resolveCupPhase).
  const cup = career.cup;
  if (cup && cup.active && cup.ties) {
    const legs: { phase: string; round: number; leg: 1 | 2 | 0 }[] = cup.expanded
      ? Object.entries(CUP_ROUNDS_EXPANDED).flatMap(([phase, r]) => [{ phase, round: r.ida, leg: 1 as const }, { phase, round: r.volta, leg: 2 as const }])
      : Object.entries(CUP_ROUNDS).map(([phase, round]) => ({ phase, round, leg: 0 as const }));
    for (const { phase, round, leg } of legs) {
      const tie: CupTie | undefined = (cup.ties[phase] || []).find((t) => String(t.home) === me || String(t.away) === me);
      if (!tie) continue;
      const host = leg === 2 ? tie.away : tie.home;
      const guest = leg === 2 ? tie.home : tie.away;
      let score: { gh: number; ga: number } | null = null;
      if (leg === 0 && tie.gh != null && tie.ga != null) score = { gh: tie.gh, ga: tie.ga };
      if (leg === 1 && tie.leg1 && tie.leg1.gh != null && tie.leg1.ga != null) score = { gh: tie.leg1.gh, ga: tie.leg1.ga };
      if (leg === 2 && tie.leg2 && tie.leg2.gh != null && tie.leg2.ga != null) score = { gh: tie.leg2.ga, ga: tie.leg2.gh };
      const wi = weekOfRound(round);
      items.push({
        key: `copa-${phase}-${leg}`, sort: (wi >= 0 ? wi : round) * 10 + 2,
        date: wi >= 0 && cal ? dateOf(cal.year, weeks[wi], 2) : `R${round}`, day: wi >= 0 ? "QUA" : "",
        where: String(host) === me ? "Casa" : "Fora", home: teamById(host), away: teamById(guest),
        competition: "copa", label: `Copa do Brasil · ${CUP_PHASE_LABEL[phase]}${leg === 1 ? " · Ida" : leg === 2 ? " · Volta" : ""}`,
        score, played: score != null,
      });
    }
  }

  // Amistosos: data = início da semana do convite (o legado não define o
  // dia); sempre em casa (legado: startFriendlyLive). Semana já passada
  // sem jogo (pulada) não entra.
  for (const fr of cal?.friendlies || []) {
    if (!fr.result && (fr.played || (cal && fr.wi < cal.idx))) continue;
    const w = weeks[fr.wi];
    if (!w || !cal) continue;
    items.push({
      key: `amistoso-${fr.wi}`, sort: fr.wi * 10 + 1,
      date: dateOf(cal.year, w, 0), day: "", where: "Casa",
      home: teamById(me), away: fr.opp ? teamById(fr.opp) : { id: "?", name: "A definir" },
      competition: "amistoso", label: `Amistoso${fr.optional ? " (opcional)" : ""} · na semana`,
      score: fr.result ? { gh: fr.result.gh, ga: fr.result.ga } : null, played: !!fr.result,
    });
  }

  items.sort((a, b) => a.sort - b.sort);
  return { upcoming: items.filter((i) => !i.played), past: items.filter((i) => i.played).reverse() };
}
