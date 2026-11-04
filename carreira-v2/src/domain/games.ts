// Fase 10 (plano de independência) — aba Jogos: Copa do Brasil (CAP04-N07,
// complemento 40 col. 3 e 41 col. 1-2), Estatísticas (CAP04-N08, 41 col. 3 e
// 42), Retrospecto H2H (CAP04-N09, 43 col. 1) e Premiações (CAP07-N04, 45
// col. 2). Só exibição, a partir do save; mesmas fontes e regras de
// renderCopa, renderEstatisticas (statsRecordBucket etc.), renderH2H e
// renderAwardsScreen (carreira.js). Decisões de 04/11: Copa da prancha com
// escolha de fase; estatísticas com dois seletores e tudo do jogo;
// premiações da prancha + tudo do jogo.
import type { Career, SeasonAward, Team } from "./types.ts";
import { sortedStandings } from "./home.ts";
import { shortName } from "./lineup.ts";
import { CUP_PHASES, CUP_PHASES_EXPANDED, CUP_PHASE_LABEL } from "./table.ts";

type TeamById = (id: string | number) => Team;
const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

// ---------- Copa do Brasil ----------
export interface CupSide { id: string; name: string; short: string; mine: boolean }
export interface CupDetail {
  state: "vivo" | "eliminado" | "campeao" | "encerrada" | "fora";
  title: string; sub: string; note: string | null;
  phases: { id: string; label: string }[];
  phase: string | null;
  tie: null | { me: CupSide; opp: CupSide; meHome: boolean; ida: string; volta: string | null; agregado: string | null; penalties: boolean; result: string | null };
  champion: string | null;
}
const side = (t: Team, mine: boolean): CupSide => ({ id: String(t.id), name: t.name, short: t.short || t.name.slice(0, 3).toUpperCase(), mine });
export function buildCupDetail(career: Career, teamById: TeamById, pick: string | null): CupDetail {
  const cup = career.cup;
  const me = String(career.clubId);
  if (!cup || !cup.active) return { state: "fora", title: "Fora desta Copa.", sub: "Copa do Brasil · Não classificado", note: "Seu elenco não se classificou pra Copa do Brasil essa temporada — só os 16 elencos mais fortes da competição disputam.", phases: [], phase: null, tie: null, champion: null };
  const order = cup.expanded ? CUP_PHASES_EXPANDED : CUP_PHASES;
  const myTie = (ph: string) => (cup.ties?.[ph] || []).find((t) => String(t.home) === me || String(t.away) === me);
  const played = order.filter((ph) => myTie(ph));
  const state: CupDetail["state"] = cup.championIsHuman ? "campeao" : !cup.humanAlive ? "eliminado" : cup.phase === "done" ? "encerrada" : "vivo";
  const title = state === "campeao" ? "A Copa é sua." : state === "eliminado" ? "Sua campanha terminou." : state === "encerrada" ? "A Copa terminou." : "A caminho da taça.";
  const sub = `Copa do Brasil · ${state === "campeao" ? "Campeão" : state === "eliminado" ? "Eliminado" : state === "encerrada" ? "Encerrada" : "Em disputa"}`;
  const phase = pick && played.includes(pick) ? pick : played[played.length - 1] || null;
  let note: string | null = null;
  if (state === "eliminado") note = `Eliminado nas ${CUP_PHASE_LABEL[cup.humanEliminatedStage || ""] || cup.humanEliminatedStage}${cup.humanEliminatedAtRound ? ` (rodada ${cup.humanEliminatedAtRound})` : ""}.`;
  if (!played.length && state === "vivo") note = (cup.seeds || []).some((id) => same(id, me)) ? "Cabeça de chave: seu clube entra na 2ª fase." : "Seu primeiro confronto ainda vai ser sorteado.";
  let tie: CupDetail["tie"] = null;
  const t = phase ? myTie(phase) : null;
  if (t) {
    const meHome = String(t.home) === me;
    const mine = (h: number | null | undefined, a: number | null | undefined) => (h == null || a == null ? null : meHome ? `${h} × ${a}` : `${a} × ${h}`);
    const opp = teamById(meHome ? t.away : t.home);
    if (cup.expanded && t.leg1) {
      const done2 = t.leg2 && t.leg2.gh != null;
      const agg = done2 ? (meHome ? `${t.leg1.gh! + t.leg2!.gh!} × ${t.leg1.ga! + t.leg2!.ga!}` : `${t.leg1.ga! + t.leg2!.ga!} × ${t.leg1.gh! + t.leg2!.gh!}`) : null;
      tie = { me: side(teamById(me), true), opp: side(opp, false), meHome, ida: mine(t.leg1.gh, t.leg1.ga) || "— × —", volta: t.leg2 ? mine(t.leg2.gh, t.leg2.ga) || "— × —" : null, agregado: agg, penalties: !!t.penalties,
        result: !done2 ? (t.leg1.gh == null ? "Confronto a disputar." : "Ida disputada, aguardando a volta.") : same(t.winner, me) ? "Classificado" : "Eliminado" };
    } else {
      tie = { me: side(teamById(me), true), opp: side(opp, false), meHome, ida: mine(t.gh, t.ga) || "— × —", volta: null, agregado: null, penalties: !!t.penalties,
        result: t.gh == null ? "Jogo a disputar." : same(t.winner, me) ? "Classificado" : "Eliminado" };
    }
  }
  return { state, title, sub, note, phases: played.map((id) => ({ id, label: CUP_PHASE_LABEL[id] || id })), phase, tie, champion: cup.champion != null && cup.phase === "done" ? teamById(cup.champion).name : null };
}

// ---------- Estatísticas ----------
export interface MatchBucket { j: number; v: number; e: number; d: number; gp: number; gc: number }
export interface StatsBucket { assists?: number; yellow?: number; red?: number; cleanSheets?: number; home?: MatchBucket; away?: MatchBucket; biggestWin?: BigMatch | null; biggestLoss?: BigMatch | null }
export interface BigMatch { gf: number; ga: number; home: boolean; opponentName: string; seasonYear: number }
export interface CareerTotals extends StatsBucket, Partial<MatchBucket> {
  longestWinStreak?: number; longestUnbeatenStreak?: number;
  copaEditions?: number; copaV?: number; copaE?: number; copaD?: number; copaGp?: number; copaGc?: number; copaSemisReached?: number; copaFinalsReached?: number;
}
export type StatsScope = "time" | "campeonato";
export type StatsPeriod = "temporada" | "historico";
type Row = { label: string; value: string };
export interface StatsSection { id: string; title: string; rows?: Row[]; table?: { head: string[]; rows: { cells: string[]; mine?: boolean }[] }; empty?: string }
const zero = (): MatchBucket => ({ j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 });
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
export function buildStats(career: Career, teamById: TeamById, scope: StatsScope, period: StatsPeriod): StatsSection[] {
  const hist = period === "historico";
  const tot = career.careerTotals || {};
  if (scope === "time") {
    const st = (career.standings || {})[career.clubId] || zero();
    const b: MatchBucket = hist ? { j: tot.j || 0, v: tot.v || 0, e: tot.e || 0, d: tot.d || 0, gp: tot.gp || 0, gc: tot.gc || 0 } : { j: st.j || 0, v: st.v || 0, e: st.e || 0, d: st.d || 0, gp: st.gp || 0, gc: st.gc || 0 };
    const src: StatsBucket = hist ? tot : career.teamStats || {};
    const aprov = b.j ? Math.round(((b.v * 3 + b.e) / (b.j * 3)) * 100) : 0;
    const ha = (x?: MatchBucket) => { const m = x || zero(); return `${m.v}V ${m.e}E ${m.d}D · ${m.gp}–${m.gc}`; };
    const big = (m: BigMatch | null | undefined) => (m ? `${m.gf}×${m.ga} ${m.home ? "contra" : "fora, contra"} ${m.opponentName} (${m.seasonYear})` : "—");
    const streaks: Row[] = [{ label: "Sequência de vitórias", value: String(career.currentWinStreak || 0) }, { label: "Jogos sem perder", value: String(career.currentUnbeatenStreak || 0) }];
    if (hist) streaks.push({ label: "Recorde de vitórias seguidas", value: String(tot.longestWinStreak || 0) }, { label: "Recorde de invencibilidade", value: String(tot.longestUnbeatenStreak || 0) });
    const cup = career.cup;
    const cupRows: Row[] = hist
      ? [{ label: "Edições disputadas", value: String(tot.copaEditions || 0) }, { label: "Títulos", value: String(career.titlesWonCopa || 0) }, { label: "Semifinais", value: String(tot.copaSemisReached || 0) }, { label: "Finais", value: String(tot.copaFinalsReached || 0) },
        { label: "Retrospecto (V-E-D)", value: `${tot.copaV || 0}-${tot.copaE || 0}-${tot.copaD || 0}` }, { label: "Gols (pró/contra)", value: `${tot.copaGp || 0} / ${tot.copaGc || 0}` }]
      : [{ label: "Situação", value: !cup || !cup.active ? "Não classificado" : cup.championIsHuman ? "Campeão" : cup.phase === "done" ? "Vice-campeão" : !cup.humanAlive ? `Eliminado (${CUP_PHASE_LABEL[cup.humanEliminatedStage || ""] || "—"})` : `Vivo · ${CUP_PHASE_LABEL[cup.phase || ""] || cup.phase}` }];
    const gk = hist ? "goalsCareer" : "goalsSeason", ak = hist ? "assistsCareer" : "assistsSeason";
    const top = (career.squad || []).filter((p) => (p[gk] || 0) > 0 || (p[ak] || 0) > 0)
      .sort((a, b2) => ((b2[gk] || 0) - (a[gk] || 0)) || ((b2[ak] || 0) - (a[ak] || 0))).slice(0, 10);
    return [
      { id: "retro", title: "Retrospecto", rows: [{ label: "Jogos", value: String(b.j) }, { label: "Vitórias", value: String(b.v) }, { label: "Empates", value: String(b.e) }, { label: "Derrotas", value: String(b.d) }, { label: "Aproveitamento", value: `${aprov}%` }] },
      { id: "gols", title: "Gols", rows: [{ label: "Marcados", value: String(b.gp) }, { label: "Sofridos", value: String(b.gc) }, { label: "Saldo", value: signed(b.gp - b.gc) }, { label: "Média por jogo", value: (b.j ? b.gp / b.j : 0).toFixed(2).replace(".", ",") }] },
      { id: "disc", title: "Disciplina e defesa", rows: [{ label: "Jogos sem sofrer gol", value: String(src.cleanSheets || 0) }, { label: "Assistências", value: String(src.assists || 0) }, { label: "Cartões amarelos", value: String(src.yellow || 0) }, { label: "Cartões vermelhos", value: String(src.red || 0) }] },
      { id: "casa", title: "Mandante × visitante", rows: [{ label: "Mandante", value: ha(src.home) }, { label: "Visitante", value: ha(src.away) }] },
      { id: "seq", title: "Sequências e recordes", rows: [...streaks, { label: "Maior goleada", value: big(src.biggestWin) }, { label: "Maior derrota", value: big(src.biggestLoss) }] },
      { id: "copa", title: "Copa do Brasil", rows: cupRows },
      { id: "art", title: hist ? "Artilheiros e garçons do clube" : "Artilheiros e garçons da temporada", table: { head: ["Jogador", "Gols", "Assist."], rows: top.map((p) => ({ cells: [shortName(p.name), String(p[gk] || 0), String(p[ak] || 0)] })) }, empty: "Ninguém marcou gol ou deu assistência ainda." },
    ];
  }
  // Campeonato.
  const gk = hist ? "goalsCareer" : "goalsSeason", ak = hist ? "assistsCareer" : "assistsSeason";
  const inLeague = (id: string) => Object.prototype.hasOwnProperty.call(career.standings || {}, id);
  const all = [...(career.squad || []).map((p) => ({ p, team: String(career.clubId) })),
    ...Object.entries(career.leagueSquads || {}).filter(([id]) => inLeague(id)).flatMap(([id, sq]) => sq.map((p) => ({ p, team: id })))];
  const scorers = all.filter(({ p }) => (p[gk] || 0) > 0 || (p[ak] || 0) > 0)
    .sort((a, b) => ((b.p[gk] || 0) - (a.p[gk] || 0)) || ((b.p[ak] || 0) - (a.p[ak] || 0))).slice(0, 15);
  const scorerSec: StatsSection = { id: "art", title: hist ? "Artilheiros históricos da competição" : "Artilheiros da temporada",
    table: { head: ["Jogador", "Clube", "Gols", "Assist."], rows: scorers.map(({ p, team }) => ({ cells: [shortName(p.name), teamById(team).short || teamById(team).name, String(p[gk] || 0), String(p[ak] || 0)], mine: same(team, career.clubId) })) }, empty: "Ninguém marcou gol ou deu assistência ainda." };
  if (!hist) {
    const rows = Object.values(career.standings || {});
    const withGames = rows.filter((r) => r.j > 0);
    const goals = rows.reduce((s, r) => s + r.gp, 0), games = withGames.reduce((s, r) => s + r.j, 0) / 2;
    const atk = rows.slice().sort((a, b) => b.gp - a.gp)[0], def = withGames.slice().sort((a, b) => a.gc - b.gc)[0];
    const nm = (id: string | number) => teamById(id).short || teamById(id).name;
    return [
      { id: "liga", title: "A competição", rows: [{ label: "Gols na competição", value: String(goals) }, { label: "Média de gols por jogo", value: (games ? goals / games : 0).toFixed(2).replace(".", ",") },
        { label: "Melhor ataque", value: atk ? `${nm(atk.id)} (${atk.gp})` : "—" }, { label: "Melhor defesa", value: def ? `${nm(def.id)} (${def.gc})` : "—" }] },
      { id: "times", title: "Times da competição", table: { head: ["Clube", "J", "GP", "GC", "SG", "%"], rows: sortedStandings(career).map((r) => ({ cells: [nm(r.id), String(r.j), String(r.gp), String(r.gc), signed(r.sg), `${r.j ? Math.round((r.pts / (r.j * 3)) * 100) : 0}%`], mine: same(r.id, career.clubId) })) } },
      scorerSec,
    ];
  }
  const champs = career.leagueChampions || [];
  const tally = new Map<string, number>();
  champs.forEach((c) => tally.set(String(c.championId), (tally.get(String(c.championId)) || 0) + 1));
  return [
    { id: "campeoes", title: "Campeões", table: { head: ["Ano", "Campeão", "Vice", "Você"], rows: champs.map((c) => ({ cells: [String(c.year), c.championName, c.viceName || "—", c.myPosition ? `${c.myPosition}º` : "—"], mine: same(c.championId, career.clubId) })) }, empty: "Os campeões aparecem a partir da primeira temporada encerrada." },
    { id: "titulos", title: "Títulos por clube", table: { head: ["Clube", "Títulos"], rows: [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ cells: [teamById(id).name, `${n}×`], mine: same(id, career.clubId) })) }, empty: "Nenhuma temporada encerrada ainda." },
    scorerSec,
  ];
}

// ---------- Retrospecto H2H ----------
export function buildH2H(career: Career, teamById: TeamById, oppId: string) {
  const me = teamById(career.clubId), opp = teamById(oppId);
  const meetings = (career.matchLog || []).filter((m) => same(m.opponentId, oppId));
  let v = 0, e = 0, d = 0;
  meetings.forEach((m) => { const g = m.home ? m.gh : m.ga, o = m.home ? m.ga : m.gh; if (g > o) v++; else if (g === o) e++; else d++; });
  return {
    me: side(me, true), opp: side(opp, false), total: meetings.length, v, e, d,
    form: meetings.slice(0, 5).map((m) => { const g = m.home ? m.gh : m.ga, o = m.home ? m.ga : m.gh; return g > o ? "V" : g === o ? "E" : "D"; }),
    games: meetings.slice(0, 10).map((m) => ({ when: `Temp. ${m.seasonYear} · rodada ${m.round}`, left: side(m.home ? me : opp, m.home), right: side(m.home ? opp : me, !m.home), score: `${m.gh} × ${m.ga}` })),
  };
}

// ---------- Premiações ----------
export function buildAwards(career: Career, teamById: TeamById, year: number | null) {
  const list: SeasonAward[] = career.seasonAwards || [];
  const mine = (id: unknown) => same(id, career.clubId);
  const titles = list.reduce((acc, a) => { if (mine(a.brasileirao?.campeao)) acc.br++; if (a.copaDoBrasil?.disputou && mine(a.copaDoBrasil.campeao)) acc.copa++; return acc; }, { br: 0, copa: 0 });
  const a = list.find((x) => x.seasonYear === year) || list[0] || null;
  const club = (id: unknown) => (id == null ? "—" : teamById(id as string).name);
  const player = (e?: { nome: string; clubeId: string | number; clubeName: string; valor: number } | null, unit = "") => (e ? { name: shortName(e.nome), club: e.clubeName, value: `${e.valor}${unit}`, mine: mine(e.clubeId) } : null);
  return {
    years: list.map((x) => x.seasonYear), year: a ? a.seasonYear : null,
    titles: { total: titles.br + titles.copa, text: [titles.br ? `${titles.br}× Brasileirão` : "", titles.copa ? `${titles.copa}× Copa do Brasil` : ""].filter(Boolean).join(" · ") },
    season: a && {
      champion: { name: club(a.brasileirao?.campeao), mine: mine(a.brasileirao?.campeao) }, vice: { name: club(a.brasileirao?.vice), mine: mine(a.brasileirao?.vice) },
      scorer: player(a.brasileirao?.artilheiro, " gols"), assists: player(a.brasileirao?.assistencias, " assist."), best: player(a.brasileirao?.melhorJogador, " de overall"),
      cup: a.copaDoBrasil?.disputou ? { champion: { name: club(a.copaDoBrasil.campeao), mine: mine(a.copaDoBrasil.campeao) }, vice: { name: club(a.copaDoBrasil.vice), mine: mine(a.copaDoBrasil.vice) } } : null,
    },
  };
}
