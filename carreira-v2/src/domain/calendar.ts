// Calendário (CAP02-T07) — "Seu próximo compromisso.": lista cronológica
// dos jogos do SEU clube na temporada (decisões de 01/11): Brasileirão,
// Copa do Brasil (só confronto já definido) e amistosos. Mesmas fontes do
// calendário atual (legado: calendarWeekRowHTML, CUP_ROUNDS*, matchLog,
// calendar.friendlies). Só leitura.
import type { Career, CalendarWeek, Team } from "./types.ts";
import { MONTH, roundsOf } from "./home.ts";
import type { CupTie } from "./table.ts";
import { CUP_PHASE_LABEL } from "./table.ts";
import { CONTINENTAL_PHASE_LABEL } from "./match.ts";

// Jogos das copas continentais no save (copasmundo.compactarPlano): campos
// de cada jogo na lista, nesta ordem.
const CONTINENTAL_FIELDS = ["copa", "fase", "rodada", "data", "casa", "fora", "gh", "ga", "conf", "perna", "neutro", "grupo", "extra"];
const CONTINENTAL_NAME: Record<string, string> = { LIB: "Libertadores", SUD: "Sul-Americana", UCL: "Champions League", UEL: "Europa League", UECL: "Conference League" };
const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const CUP_ROUNDS: Record<string, number> = { r16: 6, qf: 14, sf: 22, final: 30 };
const CUP_ROUNDS_EXPANDED: Record<string, { ida: number; volta: number }> = {
  fase1: { ida: 3, volta: 6 }, r32: { ida: 9, volta: 12 }, r16: { ida: 15, volta: 18 },
  qf: { ida: 21, volta: 24 }, sf: { ida: 27, volta: 30 }, final: { ida: 33, volta: 36 },
};

export type Competition = "liga" | "copa" | "amistoso" | "continental";
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
  for (let r = 1; r <= roundsOf(career); r++) {
    const fx = (career.schedule[r] || []).find((m) => String(m.home) === me || String(m.away) === me);
    if (!fx) continue;
    const wi = weekOfRound(r);
    const isHome = String(fx.home) === me;
    const played = r < career.currentRound;
    const res = log.find((m) => m.round === r);
    items.push({
      key: `liga-${r}`, sort: (wi >= 0 ? wi : r) * 10 + 6,
      date: wi >= 0 && cal ? dateOf(weeks[wi].a || cal.year, weeks[wi], 6) : `R${r}`, day: wi >= 0 ? "DOM" : "",
      where: isHome ? "Casa" : "Fora", home: teamById(fx.home), away: teamById(fx.away),
      competition: "liga", label: `${competitionName} · Rodada ${r}`,
      score: played && res ? { gh: res.gh, ga: res.ga } : null, played,
    });
  }

  // Copa do Brasil: a quarta depois do domingo da rodada (semana + 9), só
  // quando o seu confronto da fase já existe. Na volta o mando inverte e
  // o placar guardado é relativo ao confronto (legado: resolveCupPhase).
  const cup = career.cup;
  if (cup && cup.active && cup.ties) {
    const legs: { phase: string; round: number; leg: 1 | 2 | 0 }[] = cup.expanded
      ? [...(cup.prelim ? [{ phase: "prelim", round: cup.prelim.round || 1, leg: 0 as const }] : []), ...Object.entries(CUP_ROUNDS_EXPANDED).flatMap(([phase, r]) => [{ phase, round: r.ida, leg: 1 as const }, { phase, round: r.volta, leg: 2 as const }])]
      : Object.entries(CUP_ROUNDS).map(([phase, round]) => ({ phase, round, leg: 0 as const }));
    for (const { phase, round, leg } of legs) {
      const tie: CupTie | undefined = (cup.ties[phase] || []).find((t) => String(t.home) === me || String(t.away) === me);
      if (!tie) continue;
      const host = leg === 2 ? tie.away : tie.home;
      const guest = leg === 2 ? tie.home : tie.away;
      let score: { gh: number; ga: number } | null = null;
      if (leg === 0 && tie.gh != null && tie.ga != null) score = { gh: tie.gh, ga: tie.ga };
      // Preliminar (jogo único): o placar fica em leg1.
      if (leg === 0 && phase === "prelim" && tie.leg1 && tie.leg1.gh != null && tie.leg1.ga != null) score = { gh: tie.leg1.gh, ga: tie.leg1.ga };
      if (leg === 1 && tie.leg1 && tie.leg1.gh != null && tie.leg1.ga != null) score = { gh: tie.leg1.gh, ga: tie.leg1.ga };
      if (leg === 2 && tie.leg2 && tie.leg2.gh != null && tie.leg2.ga != null) score = { gh: tie.leg2.ga, ga: tie.leg2.gh };
      const wi = weekOfRound(round);
      items.push({
        // A perna da Copa é jogada depois da rodada (no pós-jogo dela): a
        // quarta-feira seguinte ao domingo da rodada, depois dela na lista.
        key: `copa-${phase}-${leg}`, sort: (wi >= 0 ? wi : round) * 10 + 8,
        date: wi >= 0 && cal ? dateOf(weeks[wi].a || cal.year, weeks[wi], 9) : `R${round}`, day: wi >= 0 ? "QUA" : "",
        where: String(host) === me ? "Casa" : "Fora", home: teamById(host), away: teamById(guest),
        competition: "copa", label: `Copa do Brasil · ${CUP_PHASE_LABEL[phase]}${leg === 1 ? " · Ida" : leg === 2 ? " · Volta" : phase === "prelim" ? " · Jogo único" : ""}`,
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
      date: dateOf(w.a || cal.year, w, 0), day: "", where: "Casa",
      home: teamById(me), away: fr.opp ? teamById(fr.opp) : { id: "?", name: "A definir" },
      competition: "amistoso", label: `Amistoso${fr.optional ? " (opcional)" : ""} · na semana`,
      score: fr.result ? { gh: fr.result.gh, ga: fr.result.ga } : null, played: !!fr.result,
    });
  }

  // MUNDO-001 (M10c-3): os jogos do seu clube nas copas continentais (mais de
  // um compromisso na semana), com a data do jogo. Lidos da edição no save
  // (jogos em lista, na ordem de CONTINENTAL_FIELDS).
  if (cal) {
    const seg = (w: CalendarWeek) => Date.UTC(w.a || cal.year, Number(w.d.slice(0, 2)) - 1, Number(w.d.slice(3, 5)));
    for (const ed of [career.copas?.conmebol?.edicao, career.copas?.uefa?.edicao] as ({ jogos?: unknown[][] } | undefined)[]) {
      for (const t of ed?.jogos || []) {
        const j = Object.fromEntries(CONTINENTAL_FIELDS.map((k, i) => [k, t[i] ?? null])) as { copa: string; fase: string; rodada: number; data: string; casa: string | number; fora: string | number; gh: number | null; ga: number | null; perna: number | null; grupo: string | null };
        if (String(j.casa) !== me && String(j.fora) !== me) continue;
        const dia = Date.parse(j.data + "T00:00:00Z");
        const wi = weeks.findIndex((w) => dia >= seg(w) && dia < seg(w) + 7 * 86400000);
        if (wi < 0) continue;
        const off = Math.round((dia - seg(weeks[wi])) / 86400000);
        const dt = new Date(dia);
        const extra = j.fase === "grupos" && j.grupo ? ` · Grupo ${j.grupo}` : j.fase === "liga" ? ` · Rodada ${j.rodada}` : j.perna ? (j.perna === 2 ? " · Volta" : " · Ida") : "";
        items.push({
          key: `cont-${j.copa}-${j.fase}-${j.rodada}-${j.data}`, sort: wi * 10 + off,
          date: `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTH[dt.getUTCMonth()]}`, day: DIAS[dt.getUTCDay()],
          where: String(j.casa) === me ? "Casa" : "Fora", home: teamById(j.casa), away: teamById(j.fora),
          competition: "continental", label: `${CONTINENTAL_NAME[j.copa] || j.copa} · ${CONTINENTAL_PHASE_LABEL[j.fase] || j.fase}${extra}`,
          score: j.gh != null && j.ga != null ? { gh: j.gh, ga: j.ga } : null, played: j.gh != null,
        });
      }
    }
  }

  items.sort((a, b) => a.sort - b.sort);
  return { upcoming: items.filter((i) => !i.played), past: items.filter((i) => i.played).reverse() };
}
