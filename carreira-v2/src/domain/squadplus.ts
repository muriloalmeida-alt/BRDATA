// Fase 7 (plano de independência) — elenco avançado. Funções puras, só
// exibição, a partir do save:
// - Filtros e busca do Elenco (CAP02-N01, complemento 28 col. 3);
// - Ficha completa (CAP02-N02, 29 e 30 col. 1), com as regras do jogo para
//   renovar (último ano de contrato) e conversar (insatisfeito, 1x/rodada);
// - Contratos (CAP05-T06, 30 col. 2) e Renovar (CAP05-N01, 30 col. 3);
// - Conversa (CAP06-T03, 31 col. 3 / 32 col. 1);
// - Comparar (CAP02-N03, 32 col. 2) e Elenco de outro clube (CAP02-N04, 32 col. 3).
// Decisões de 04/11: regras do jogo + ações de hoje na ficha; recusa da
// renovação seguida da coletiva; filtros da prancha + busca; outro clube com
// comparar (proposta na fase 8).
import type { Career, Player, PlayerGroup } from "./types.ts";
import { moneyShort, sortedStandings } from "./home.ts";
import { isAvailable, shortName, sortKey } from "./lineup.ts";
import { situationOf, type SquadRow } from "./squad.ts";
import { potentialText } from "./potential.ts";

export const POSITION: Record<PlayerGroup, string> = { G: "Goleiro", D: "Defensor", M: "Meio-campo", F: "Atacante" };
const DIVISION: Record<string, string> = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };
// Mesmas regras de canTalkTo/isContractExpiring/TALK_BENCH_STREAK_THRESHOLD
// (carreira.js), só para mostrar o botão ativo ou o motivo; quem decide é o motor.
const TALK_BENCH = 3, TALK_MORALE = 30;
const morale = (p: Player) => (p.morale == null ? 70 : p.morale);
export function canRenew(career: Career, p: Player): boolean { return p.origin !== "loan" && p.contractUntil === career.seasonYear; }
export function canTalk(career: Career, p: Player): boolean {
  return ((p.benchStreak || 0) >= TALK_BENCH || morale(p) <= TALK_MORALE) && p.lastTalkRound !== career.currentRound;
}
export function listed(career: Career, id: string): boolean { return (career.pendingListings || []).some((l) => String(l.playerId) === String(id)); }

// ---------- Filtros e busca ----------
export type PosFilter = "todas" | PlayerGroup;
export type SitFilter = "todas" | "titular" | "banco" | "lesionado" | "suspenso" | "venda";
export type CatFilter = "todas" | "base" | "profissional";
export type SortBy = "posicao" | "overall" | "idade" | "condicao" | "contrato";
export interface SquadFilters { q: string; pos: PosFilter; sit: SitFilter; cat: CatFilter; sort: SortBy }
export const NO_FILTERS: SquadFilters = { q: "", pos: "todas", sit: "todas", cat: "todas", sort: "posicao" };
export function filtersActive(f: SquadFilters): number {
  return [f.pos !== "todas", f.sit !== "todas", f.cat !== "todas", f.sort !== "posicao"].filter(Boolean).length;
}
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function filterSquad(career: Career, f: SquadFilters): SquadRow[] {
  const starters = career.lineup?.starters || [];
  const bench = career.lineup?.bench || [];
  const q = norm(f.q.trim());
  const sorters: Record<SortBy, (a: Player, b: Player) => number> = {
    posicao: (a, b) => sortKey(a) - sortKey(b),
    overall: (a, b) => b.overall - a.overall,
    idade: (a, b) => (a.age ?? 99) - (b.age ?? 99) || b.overall - a.overall,
    condicao: (a, b) => (b.condition ?? 100) - (a.condition ?? 100),
    contrato: (a, b) => (a.contractUntil ?? 9999) - (b.contractUntil ?? 9999) || sortKey(a) - sortKey(b),
  };
  return (career.squad || [])
    .filter((p) => !q || norm(p.name).includes(q))
    .filter((p) => f.pos === "todas" || p.group === f.pos)
    .filter((p) => f.cat === "todas" || (f.cat === "base" ? p.origin === "base" : p.origin !== "base"))
    .filter((p) => {
      switch (f.sit) {
        case "titular": return starters.includes(p.id);
        case "banco": return bench.includes(p.id);
        case "lesionado": return p.status === "contundido" && !isAvailable(p, career.currentRound);
        case "suspenso": return p.status === "suspenso" && !isAvailable(p, career.currentRound);
        case "venda": return listed(career, p.id);
        default: return true;
      }
    })
    .sort(sorters[f.sort])
    .map((p) => ({ player: p, short: shortName(p.name), situation: situationOf(career, p) }));
}

// ---------- Ficha completa ----------
export interface FichaModel {
  player: Player; short: string; position: string;
  facts: { label: string; value: string }[];
  attrs: { label: string; value: string }[];
  contract: { label: string; value: string }[];
  season: { label: string; value: string }[];
  clubs: { label: string; value: string }[];
  renew: { ok: boolean; why: string | null };
  talk: { ok: boolean; why: string | null };
  actions: { id: "removeStarter" | "removeBench" | "addBench" | "promote" | "demote" | "release"; label: string; danger?: boolean; confirm?: string }[];
  sale: { listed: boolean; loan: boolean };
}
export function buildFicha(career: Career, id: string): FichaModel | null {
  const p = (career.squad || []).find((x) => x.id === id);
  if (!p) return null;
  const starters = career.lineup?.starters || [];
  const bench = career.lineup?.bench || [];
  const inStarters = starters.includes(p.id), inBench = bench.includes(p.id);
  const clubs = new Map<string, number>();
  (p.seasonHistory || []).forEach((h) => { const c = h.clubName || "—"; clubs.set(c, (clubs.get(c) || 0) + 1); });
  const actions: FichaModel["actions"] = [];
  if (inStarters) actions.push({ id: "removeStarter", label: "Tirar do time titular" });
  if (!inStarters && inBench) actions.push({ id: "removeBench", label: "Tirar do banco" });
  if (!inStarters && !inBench && p.status === "ok" && p.origin !== "base") actions.push({ id: "addBench", label: "Colocar no banco" });
  if (p.origin === "base") actions.push({ id: "promote", label: "Promover ao elenco principal" });
  if (p.origin === "principal") actions.push({ id: "demote", label: "Enviar para a base", confirm: "Ele sai da escalação e passa a treinar com a base." });
  if (p.origin !== "loan") actions.push({ id: "release", label: "Dispensar", danger: true, confirm: "O jogador deixa o clube agora. Não dá para desfazer." });
  return {
    player: p, short: shortName(p.name), position: POSITION[p.group],
    facts: [
      { label: "Idade", value: p.age != null ? `${p.age} anos` : "—" },
      { label: "Overall", value: String(p.overall) },
      // Como o jogo: a faixa estimada pelo olheiro, nunca o potencial real.
      { label: "Potencial", value: potentialText(p) || "Não avaliado" },
      { label: "Moral", value: String(morale(p)) },
      { label: "Condição", value: `${Math.round(p.condition ?? 100)}%` },
    ],
    attrs: [
      { label: "Geral", value: String(p.overall) },
      { label: "Ataque", value: p.atk != null ? String(p.atk) : "—" },
      { label: "Defesa", value: p.def != null ? String(p.def) : "—" },
      { label: "Físico", value: p.phys != null ? String(p.phys) : "—" },
      { label: "Moral", value: String(morale(p)) },
    ],
    contract: p.origin === "loan" ? [{ label: "Contrato", value: "Emprestado ao clube" }] : [
      { label: "Salário mensal", value: p.wage != null ? moneyShort(p.wage) : "—" },
      { label: "Término", value: p.contractUntil != null ? String(p.contractUntil) : "—" },
      { label: "Valor de mercado", value: p.value != null ? moneyShort(p.value) : "—" },
    ],
    season: [
      { label: "Jogos", value: String(p.appsSeason ?? p.apps ?? 0) },
      { label: "Gols", value: String(p.goalsSeason || 0) },
      { label: "Assistências", value: String(p.assistsSeason || 0) },
      { label: "Cartões amarelos", value: String(p.yellowCards || 0) },
    ],
    clubs: [...clubs.entries()].map(([c, n]) => ({ label: c, value: `${n} ${n === 1 ? "temporada" : "temporadas"}` })),
    renew: canRenew(career, p) ? { ok: true, why: null } : { ok: false, why: p.origin === "loan" ? "Jogador emprestado: o contrato é do clube dono." : `A renovação abre no último ano de contrato (${p.contractUntil ?? "—"}).` },
    talk: canTalk(career, p) ? { ok: true, why: null } : { ok: false, why: p.lastTalkRound === career.currentRound ? "Vocês já conversaram nesta rodada." : "Ele está satisfeito: conversa só com jogador insatisfeito (3 jogos no banco ou moral baixa)." },
    actions,
    sale: { listed: listed(career, p.id), loan: p.origin === "principal" },
  };
}

// ---------- Contratos ----------
export function buildContracts(career: Career, onlyExpiring: boolean) {
  return (career.squad || []).filter((p) => p.origin !== "loan" && (!onlyExpiring || canRenew(career, p)))
    .sort((a, b) => (a.contractUntil ?? 9999) - (b.contractUntil ?? 9999) || sortKey(a) - sortKey(b))
    .map((p) => ({ id: p.id, short: shortName(p.name), position: POSITION[p.group], wage: p.wage != null ? moneyShort(p.wage) : "—", until: p.contractUntil != null ? String(p.contractUntil) : "—", canRenew: canRenew(career, p) }));
}
// Mesma fórmula de suggestedRenewalWage (carreira.js), só para a sugestão.
export function suggestedWage(p: Player): number {
  const bonus = Math.min(0.15, Math.max(-0.05, (morale(p) - 70) / 100));
  return Math.round(((p.wage || 0) * (1.05 + bonus)) / 100) * 100;
}

// ---------- Comparar ----------
export interface CmpPlayer { id: string; name: string; group: PlayerGroup; overall: number; atk?: number; def?: number; phys?: number; age?: number; wage?: number; value?: number }
export function comparePool(career: Career, base: CmpPlayer): Player[] {
  return (career.squad || []).filter((p) => p.id !== base.id && p.group === base.group).sort((a, b) => b.overall - a.overall);
}
export function buildCompare(a: CmpPlayer, b: CmpPlayer) {
  const fmt = (v: number | undefined, money = false) => (v == null ? "—" : money ? moneyShort(v) : String(v));
  const rows = [
    { label: "Ataque", a: fmt(a.atk), b: fmt(b.atk) },
    { label: "Defesa", a: fmt(a.def), b: fmt(b.def) },
    { label: "Físico", a: fmt(a.phys), b: fmt(b.phys) },
    { label: "Salário mensal", a: fmt(a.wage, true), b: fmt(b.wage, true) },
    { label: "Valor de mercado", a: fmt(a.value, true), b: fmt(b.value, true) },
  ];
  // Mesmo veredito da versão anterior: salário por ponto de overall.
  let verdict: string | null = null;
  if (a.wage && b.wage && a.overall && b.overall) {
    const ca = a.wage / a.overall, cb = b.wage / b.overall;
    verdict = Math.abs(ca - cb) < 1 ? `Custo-benefício empatado: os dois custam cerca de ${moneyShort(Math.round(ca))}/mês por ponto de overall.`
      : `Melhor custo-benefício: ${shortName((ca < cb ? a : b).name)}, ${moneyShort(Math.round(Math.min(ca, cb)))}/mês por ponto de overall (contra ${moneyShort(Math.round(Math.max(ca, cb)))}).`;
  }
  const side = (p: CmpPlayer) => ({ name: shortName(p.name), overall: `Overall ${p.overall}`, age: p.age != null ? `Idade ${p.age}` : "Idade —", position: POSITION[p.group] });
  return { a: side(a), b: side(b), rows, verdict };
}

// ---------- Elenco de outro clube ----------
export function buildClubRoster(career: Career, clubId: string, clubName: string) {
  const squad = (career.leagueSquads || {})[clubId] || [];
  let division: string | null = null;
  for (const [comp, teams] of Object.entries(career.divisionTeams || {})) if (teams.some((t) => String(t.id) === clubId)) division = DIVISION[comp] || null;
  const rows = sortedStandings(career);
  const pos = rows.findIndex((r) => String(r.id) === clubId);
  const inMyLeague = pos >= 0;
  const other = !inMyLeague ? Object.entries(career.otherDivisions || {}).map(([, d]) => Object.values(d.standings || {}).sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp))).find((r) => r.some((x) => String(x.id) === clubId)) : null;
  const position = inMyLeague ? pos + 1 : other ? other.findIndex((x) => String(x.id) === clubId) + 1 : null;
  return {
    name: clubName, division,
    position: position ? `${position}º lugar` : "—",
    players: squad.slice().sort((a, b) => sortKey(a) - sortKey(b)).map((p) => ({ id: p.id, short: shortName(p.name), position: POSITION[p.group], overall: p.overall, age: p.age ?? null })),
  };
}
