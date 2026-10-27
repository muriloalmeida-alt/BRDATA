// Derivações puras do save pro Dashboard. Funções marcadas "porte de"
// reproduzem EXATAMENTE a regra do jogo atual (public/js/carreira.js) e têm
// teste de equivalência contra o legado no mesmo save
// (tests/e2e/test_v2_dashboard.js) — passo 1 da extração do motor pra
// módulo compartilhado (doc 01). Nada aqui altera o save.
import type { Career, StandingRow, Team, Player, MatchLogEntry, NewsItem } from "./contracts";

// Porte de sortedStandings() — pts, vitórias, saldo, gols pró.
export function sortedStandings(standings: Record<string, StandingRow>): StandingRow[] {
  return Object.values(standings).slice().sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp));
}
// Porte de myLeaguePosition() — 0 quando o clube não está na tabela.
export function leaguePosition(c: Career): number {
  return sortedStandings(c.standings).findIndex((r) => String(r.id) === String(c.clubId)) + 1;
}

export interface Confidence { value: number; label: string; tone: "good" | "mid" | "bad"; parts: { label: string; delta: number }[] }
// Porte de boardConfidence() — mesma fórmula, mesmos rótulos.
export function boardConfidence(c: Career): Confidence {
  const parts: { label: string; delta: number }[] = [];
  let v = 50;
  const pos = leaguePosition(c);
  const goal = c.boardGoal;
  if (goal && pos > 0 && c.currentRound > 1) {
    const d = pos <= goal.target ? 20 : -Math.min(30, (pos - goal.target) * 4);
    parts.push({ label: pos <= goal.target ? `Dentro da meta (${pos}º, meta até ${goal.target}º)` : `Fora da meta (${pos}º, meta até ${goal.target}º)`, delta: d });
    v += d;
  }
  const form = (c.recentForm || []).slice(-5);
  if (form.length) {
    const avg = form.reduce((a, b) => a + b, 0) / form.length;
    const d = Math.round((avg - 1.3) * 12);
    parts.push({ label: `Forma recente (${avg.toFixed(1).replace(".", ",")} pts/jogo nos últimos ${form.length})`, delta: d });
    v += d;
  }
  const streak = c.negativeSeasonsStreak || 0;
  if (streak) { parts.push({ label: `${streak} temporada(s) seguida(s) sem bater a meta`, delta: -15 * streak }); v -= 15 * streak; }
  const rep = c.reputation == null ? 50 : c.reputation;
  const repD = Math.round((rep - 50) * 0.2);
  if (repD) { parts.push({ label: `Reputação do treinador (${rep})`, delta: repD }); v += repD; }
  const value = Math.min(100, Math.max(0, Math.round(v)));
  const label = value >= 80 ? "Muito alta" : value >= 60 ? "Alta" : value >= 40 ? "Estável" : value >= 20 ? "Baixa" : "Crítica";
  const tone = value >= 60 ? "good" : value >= 40 ? "mid" : "bad";
  return { value, label, tone, parts };
}

export function teamsOf(c: Career): Team[] { return c.divisionTeams?.[c.competitionId] ?? []; }
export function teamById(c: Career, id: string): Team | undefined { return teamsOf(c).find((t) => String(t.id) === String(id)); }

// Porte de teamLogoSrc(): logo do catálogo > SVG oficial do repositório
// (img/teams/<id>.svg) > null (UI mostra a sigla).
const LOCAL_CRESTS = new Set(["fla", "pal", "bot", "for", "int", "sao", "cor", "cap", "cam", "flu", "san", "bra", "juv", "cui", "gre", "cru", "bah", "vas", "vit"]);
export function crestSrc(t: Pick<Team, "id" | "logo"> | undefined | null): string | null {
  if (!t) return null;
  const src = t.logo || (t.id != null && LOCAL_CRESTS.has(String(t.id)) ? `img/teams/${t.id}.svg` : null);
  return src ? "/" + src.replace(/^\//, "") : null;
}

const COMPETITION_LABEL: Record<string, string> = { brasileirao: "Brasileirão Série A", serie_b: "Brasileirão Série B", serie_c: "Brasileirão Série C" };
export function competitionLabel(id: string): string { return COMPETITION_LABEL[id] ?? id; }

export interface NextMatch { round: number; home: Team; away: Team; isHome: boolean; opponent: Team; date: Date | null; venue: string | null; competition: string }
// Próximo jogo oficial: confronto do clube na rodada atual do schedule;
// data da semana do calendário com essa rodada. null = temporada sem jogo
// pendente (fim de temporada) — a UI tem estado próprio pra isso.
export function nextMatch(c: Career): NextMatch | null {
  const fixtures = c.schedule?.[String(c.currentRound)] ?? [];
  const fx = fixtures.find((f) => String(f.home) === String(c.clubId) || String(f.away) === String(c.clubId));
  if (!fx) return null;
  const home = teamById(c, fx.home), away = teamById(c, fx.away);
  if (!home || !away) return null;
  const isHome = String(fx.home) === String(c.clubId);
  const week = c.calendar?.weeks?.find((w) => w.r === c.currentRound);
  let date: Date | null = null;
  if (week && c.calendar) {
    const [mm, dd] = week.d.split("-").map(Number);
    date = new Date(c.calendar.year, mm - 1, dd);
  }
  const venue = home.venue?.name ?? null;
  return { round: c.currentRound, home, away, isHome, opponent: isHome ? away : home, date, venue, competition: competitionLabel(c.competitionId) };
}

export interface Record3 { j: number; v: number; e: number; d: number; gp: number; gc: number; pts: number }
export function clubRecord(c: Career): Record3 {
  const r = c.standings?.[c.clubId];
  return r ? { j: r.j, v: r.v, e: r.e, d: r.d, gp: r.gp, gc: r.gc, pts: r.pts } : { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
}

export type ResultLetter = "V" | "E" | "D";
export interface RecentResult { round: number; opponentId: string; opponentShort: string; my: number; their: number; result: ResultLetter }
// Últimos jogos oficiais da temporada atual, do mais antigo pro mais novo
// (o save guarda matchLog do MAIS NOVO pro mais antigo; gh/ga = gols do
// mandante/visitante; home = o clube jogou em casa).
export function recentResults(c: Career, n = 5): RecentResult[] {
  return (c.matchLog ?? [])
    .filter((m: MatchLogEntry) => m.seasonYear === c.seasonYear)
    .slice().sort((a, b) => a.round - b.round)
    .slice(-n)
    .map((m) => {
      const my = m.home ? m.gh : m.ga, their = m.home ? m.ga : m.gh;
      const opp = teamById(c, m.opponentId);
      return { round: m.round, opponentId: m.opponentId, opponentShort: opp?.short ?? m.opponentId.toUpperCase(), my, their, result: my > their ? "V" : my === their ? "E" : "D" };
    });
}

export function squadHighlights(c: Career, n = 4): Player[] {
  return c.squad.filter((p) => p.origin === "principal").slice().sort((a, b) => b.overall - a.overall).slice(0, n);
}

// Notícias do próprio clube primeiro (mais recentes); sem nenhuma, as gerais.
export function clubNews(c: Career, n = 3): NewsItem[] {
  const feed = (c.newsFeed ?? []).filter((x) => x.seasonYear == null || x.seasonYear === c.seasonYear);
  const mine = feed.filter((x) => x.mine);
  const pick = (mine.length ? mine : feed).slice().sort((a, b) => (b.round ?? 0) - (a.round ?? 0));
  return pick.slice(0, n);
}

export function greeting(now: Date): string {
  const h = now.getHours();
  return h >= 5 && h < 12 ? "Bom dia" : h >= 12 && h < 18 ? "Boa tarde" : "Boa noite";
}
export function firstName(full: string | undefined | null): string {
  return (full || "").trim().split(/\s+/)[0] || "Treinador";
}
export function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
// Grupo de posição do save (G/D/M/F — atacante é "F") → rótulo curto.
export function groupLabel(g?: string): string { return ({ G: "GOL", D: "DEF", M: "MEI", F: "ATA", A: "ATA" } as Record<string, string>)[g ?? ""] ?? "—"; }
// "seg, 10 de abr" → "Seg, 10 abr" (só a 1ª letra maiúscula).
export function shortDate(d: Date): string {
  const s = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "").replace(" de ", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
