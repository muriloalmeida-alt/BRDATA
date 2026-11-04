// Fase 3 (plano de independência) — a semana. Funções puras, só leitura:
// - Semana concluída (CAP04-N01): o resumo que o motor devolve ao avançar a
//   semana (ou ao fim do amistoso), no formato da tela;
// - Pré-jogo de amistoso (CAP04-N02): convites da semana, a partir do save;
// - "Avançar até o próximo jogo": quantas semanas e amistosos ficam pelo
//   caminho (o motor abre mão deles, como na versão anterior);
// - Notícias (CAP06-T06) e Avisos (sino, P8).
// Decisões de 04/11: treino resumido por sessões; condição = média + até 5
// maiores mudanças; prazos só quando aconteceram; convites para escolher;
// notícias sem seta e com a situação do elenco; sino no topo do Início.
import type { Career, Team } from "./types.ts";
import { COMPETITION_NAME, moneyShort } from "./home.ts";
import { buildLineup, shortName } from "./lineup.ts";

// ---------- Semana concluída ----------
export type TrainingFocus = "tecnico" | "fisico" | "tatico" | "descanso";
export interface WeekSummary {
  semanas: number;
  agora: { fase: string; semanaDe: string; temJogo: boolean } | null;
  treino: { semanas: number; sessoes: { foco: TrainingFocus | string; intensidade: string | null }[] } | null;
  condicao: { mediaAntes: number | null; mediaDepois: number | null; jogadores: { id: string; nome: string; antes: number; depois: number }[] };
  janela: { aberta: boolean; texto: string } | null;
  salarios: number; patrocinio: number; parcelasPagas: number; parcelasRecebidas: number;
  caixa: number;
  amistososPerdidos: number;
  amistoso: { adversario: string; gh: number; ga: number; lesoes: number; bilheteria: number } | null;
}

const FOCUS: Record<string, [string, string]> = {
  tecnico: ["técnico", "técnicos"], fisico: ["físico", "físicos"], tatico: ["tático", "táticos"], descanso: ["descanso", "descansos"],
};
const INTENSITY: Record<string, string> = { leve: "Leve", moderada: "Moderada", intensa: "Intensa" };
const FOCUS_ORDER = ["tatico", "tecnico", "fisico", "descanso"];
const focusRank = (f: string) => { const i = FOCUS_ORDER.indexOf(f); return i < 0 ? FOCUS_ORDER.length : i; };

export interface ChangeRow { id: string; name: string; delta: number; text: string }
export interface WeekDoneModel {
  title: string;
  sub: string;
  training: null | { sessions: string; intensity: string | null; perWeek: boolean };
  condition: null | { average: string; players: ChangeRow[] };
  deadlines: { label: string; value: string; tone?: "pos" | "neg" }[];
  cash: string;
  friendly: null | { score: string; note: string };
  skipped: string | null;
}

const pct = (n: number) => `${Math.round(n)}%`;
const signed = (n: number) => (n > 0 ? `+${n}%` : `−${Math.abs(n)}%`);

export function buildWeekDone(r: WeekSummary, clubName: string): WeekDoneModel {
  const multi = r.semanas > 1;
  let training: WeekDoneModel["training"] = null;
  if (r.treino && r.treino.sessoes.length) {
    const count = new Map<string, number>();
    r.treino.sessoes.forEach((s) => count.set(s.foco, (count.get(s.foco) || 0) + 1));
    const sessions = [...count.entries()]
      .sort((a, b) => focusRank(a[0]) - focusRank(b[0]))
      .map(([f, n]) => `${n} ${(FOCUS[f] || [f, f])[n > 1 ? 1 : 0]}`).join(" · ");
    const ints = new Map<string, number>();
    r.treino.sessoes.forEach((s) => { if (s.intensidade) ints.set(s.intensidade, (ints.get(s.intensidade) || 0) + 1); });
    const top = [...ints.entries()].sort((a, b) => b[1] - a[1] || ["moderada", "leve", "intensa"].indexOf(a[0]) - ["moderada", "leve", "intensa"].indexOf(b[0]))[0];
    training = { sessions, intensity: top ? INTENSITY[top[0]] || top[0] : null, perWeek: multi };
  }

  const c = r.condicao;
  const players = c.jogadores
    .map((j) => ({ id: j.id, name: shortName(j.nome), delta: Math.round(j.depois - j.antes), text: "" }))
    .filter((j) => j.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 5)
    .map((j) => ({ ...j, text: signed(j.delta) }));
  const condition = c.mediaAntes == null || c.mediaDepois == null ? null
    : { average: c.mediaAntes === c.mediaDepois ? pct(c.mediaDepois) : `${pct(c.mediaAntes)} → ${pct(c.mediaDepois)}`, players };

  const deadlines: WeekDoneModel["deadlines"] = [];
  if (r.janela) deadlines.push({ label: "Janela de transferências", value: r.janela.texto });
  if (r.salarios) deadlines.push({ label: "Salários pagos", value: `−${moneyShort(r.salarios)}`, tone: "neg" });
  if (r.patrocinio) deadlines.push({ label: "Patrocínio", value: `+${moneyShort(r.patrocinio)}`, tone: "pos" });
  if (r.parcelasPagas) deadlines.push({ label: "Parcelas de contratação", value: `−${moneyShort(r.parcelasPagas)}`, tone: "neg" });
  if (r.parcelasRecebidas) deadlines.push({ label: "Parcelas de venda", value: `+${moneyShort(r.parcelasRecebidas)}`, tone: "pos" });
  if (r.amistoso && r.amistoso.bilheteria) deadlines.push({ label: "Bilheteria do amistoso", value: `+${moneyShort(r.amistoso.bilheteria)}`, tone: "pos" });

  const f = r.amistoso;
  return {
    title: multi ? "As semanas avançaram." : "A semana avançou.",
    sub: multi ? `${r.semanas} semanas até o próximo jogo. Confira o que mudou no clube.` : "Confira o que mudou no clube.",
    training,
    condition,
    deadlines,
    cash: moneyShort(r.caixa),
    friendly: f ? {
      score: `${clubName} ${f.gh} × ${f.ga} ${f.adversario}`,
      note: f.lesoes ? `Não vale pontos · ${f.lesoes === 1 ? "1 lesão confirmada" : `${f.lesoes} lesões confirmadas`}` : "Não vale pontos · nenhuma lesão",
    } : null,
    skipped: r.amistososPerdidos ? (r.amistososPerdidos === 1 ? "1 amistoso ficou sem ser jogado." : `${r.amistososPerdidos} amistosos ficaram sem ser jogados.`) : null,
  };
}

// ---------- Amistoso ----------
export interface FriendlyInvite { team: Team; division: string | null }
export interface FriendlyModel {
  optional: boolean;
  chosen: string | null; // adversário que entra em campo (pré: 1º convite se nada escolhido)
  picked: boolean;       // escolha feita pelo técnico (gravada)
  invites: FriendlyInvite[];
  me: Team;
  formation: string;
  filled: number;
}
const DIVISION_SHORT: Record<string, string> = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };

export function buildFriendly(career: Career, teamById: (id: string | number) => Team): FriendlyModel | null {
  const cal = career.calendar;
  const week = cal?.weeks?.[cal.idx];
  if (!cal || !week || week.r || career.currentRound > 38) return null;
  const fr = (cal.friendlies || []).find((f) => f.wi === cal.idx && !f.played);
  if (!fr || !fr.invites?.length) return null;
  const divOf = (id: string) => {
    for (const [comp, teams] of Object.entries(career.divisionTeams || {})) {
      if (teams.some((t) => String(t.id) === id)) return DIVISION_SHORT[comp] || COMPETITION_NAME[comp] || null;
    }
    return null;
  };
  const invites = fr.invites.map((id) => ({ team: teamById(id), division: divOf(String(id)) }));
  const picked = fr.opp != null && fr.invites.map(String).includes(String(fr.opp));
  const chosen = picked ? String(fr.opp) : fr.optional ? null : String(fr.invites[0]);
  const lineup = buildLineup(career);
  return {
    optional: !!fr.optional, chosen, picked, invites,
    me: teamById(career.clubId), formation: lineup.formation,
    filled: (career.lineup?.starters || []).filter(Boolean).length,
  };
}

// ---------- Avançar até o próximo jogo ----------
export interface SkipInfo { weeks: number; friendlies: number }
// Mesma conta da versão anterior (advanceCalendarFromUI(true)): semanas sem
// jogo a partir da atual, até a semana do próximo jogo. Amistosos perdidos =
// os que aconteceriam (pré-temporada, ou de julho com convite aceito).
export function skipInfo(career: Career): SkipInfo | null {
  const cal = career.calendar;
  if (!cal || career.currentRound > 38) return null;
  const w0 = cal.weeks[cal.idx];
  if (!w0 || w0.r) return null;
  let weeks = 0, friendlies = 0;
  for (let i = cal.idx; i < cal.weeks.length - 1 && !cal.weeks[i].r && weeks < 60; i++) {
    const fr = (cal.friendlies || []).find((f) => f.wi === i && !f.played);
    if (fr && (!fr.optional || fr.opp)) friendlies++;
    weeks++;
  }
  return weeks > 1 || friendlies ? { weeks, friendlies } : null;
}

// ---------- Notícias ----------
const NEWS_TAG: Record<string, string> = { lider: "Liderança", zebra: "Zebra", goleada: "Goleada", jejum_quebrado: "Fim de jejum", lanterna_reage: "Reação", empate_defendido: "Defesa do resultado", generico: "Rodada" };
export interface NewsModel {
  sub: string;
  squad: { id: string; text: string }[];
  items: { key: string; title: string; meta: string; mine: boolean }[];
}
export function buildNews(career: Career): NewsModel {
  const squad = (career.squad || [])
    .filter((p) => p.status === "contundido" || p.status === "suspenso")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "contundido" ? -1 : 1) || a.name.localeCompare(b.name, "pt-BR"))
    .map((p) => ({ id: p.id, text: `${shortName(p.name)} · ${p.status === "contundido" ? "lesionado" : "suspenso"}${p.outUntilRound != null ? ` · volta na rodada ${p.outUntilRound}` : ""}` }));
  const items = (career.newsFeed || []).map((n, i) => ({
    key: `n${i}`, title: n.texto, mine: !!n.mine,
    meta: [NEWS_TAG[n.type || "generico"] || "Rodada", n.round != null ? `Rodada ${n.round}` : null, n.seasonYear != null ? `Temporada ${n.seasonYear}` : null].filter(Boolean).join(" · "),
  }));
  const ended = career.currentRound > 38;
  return { sub: `${career.seasonYear} · ${career.clubName} · ${ended ? "Temporada encerrada" : "Temporada em andamento"}`, squad, items };
}

// ---------- Avisos (sino) ----------
export type NoticeKind = "calendario" | "lesao" | "proposta" | "posicao" | "olheiro" | "loja" | "partida" | string;
export interface Notice { id?: string; type: NoticeKind; text: string; ts: number; read?: boolean }
export interface NoticesModel { unread: number; items: { key: string; kind: string; text: string; when: string; unread: boolean }[] }
export function timeAgo(ts: number, now: number): string {
  const min = Math.max(0, Math.round((now - ts) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
export function buildNotices(career: Career, now: number): NoticesModel {
  const list = career.notifications || [];
  return {
    unread: list.filter((n) => !n.read).length,
    items: list.map((n, i) => ({ key: n.id || `a${i}`, kind: String(n.type || "geral"), text: n.text, when: timeAgo(n.ts, now), unread: !n.read })),
  };
}
