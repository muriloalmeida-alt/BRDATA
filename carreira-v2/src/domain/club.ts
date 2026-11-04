// Fase 9 (plano de independência) — clube. Funções puras, só exibição, a
// partir do save e das leituras da ponte (comissao, estadio, patrocinios,
// olheiros). Quem decide é o motor (carreira.js).
// Pranchas: complemento 38 (Comissão técnica, Estádio, Obras), 39
// (Patrocínios, Extrato, Olheiros e missões) e 40 col. 1-2 (Relatórios e
// prospectos, Categorias de base). Decisões de 04/11: comissão, patrocínios
// e olheiros como o jogo; extrato da prancha + filtros do jogo; obra com
// confirmação; base em abas com a ficha da v2; entradas pelo Clube e pelas
// Finanças.
import type { Career, Player, PlayerGroup } from "./types.ts";
import { moneyShort } from "./home.ts";
import { shortName, sortKey } from "./lineup.ts";

export const POSITION: Record<PlayerGroup, string> = { G: "Goleiro", D: "Defensor", M: "Meio-campo", F: "Atacante" };

// ---------- Extrato (CAP02-N05) ----------
// Mesmos filtros e rótulos de extratoFilters/LEDGER_LABEL (carreira.js).
const LEDGER_LABEL: Record<string, string> = { tv: "Cota de TV", salario: "Salários", patrocinio: "Patrocínio", parcela: "Parcelas", bilheteria: "Bilheteria", transferencia: "Transferências", premiacao: "Premiações", estadio: "Estádio", diretoria: "Diretoria" };
const FIXED_FILTERS: [string, string][] = [["todos", "Tudo"], ["salario", "Salários"], ["transferencia", "Transferências"], ["patrocinio", "Patrocínio"], ["bilheteria", "Bilheteria"]];
export function ledgerFilters(career: Career): { id: string; label: string }[] {
  const present = new Set((career.financeLedger || []).map((t) => t.type));
  const extra = Object.keys(LEDGER_LABEL).filter((t) => present.has(t) && !FIXED_FILTERS.some(([id]) => id === t)).map((t) => [t, LEDGER_LABEL[t]] as [string, string]);
  return FIXED_FILTERS.concat(extra).map(([id, label]) => ({ id, label }));
}
export function buildLedger(career: Career, filter: string) {
  const all = career.financeLedger || [];
  const list = filter === "todos" ? all : all.filter((t) => t.type === filter);
  const groups: { round: number; items: { type: string; label: string; text: string; tone: "pos" | "neg" }[] }[] = [];
  for (const t of list) {
    let g = groups[groups.length - 1];
    if (!g || g.round !== t.round) { g = { round: t.round, items: [] }; groups.push(g); }
    g.items.push({ type: LEDGER_LABEL[t.type] || t.type, label: t.label, text: `${t.amount >= 0 ? "+" : "−"}${moneyShort(Math.abs(t.amount))}`, tone: t.amount >= 0 ? "pos" : "neg" });
  }
  const cash = career.finances?.cash || 0;
  return { cash: moneyShort(cash), negative: cash < 0, groups, empty: !list.length };
}

// ---------- Categorias de base (CAP05-T10) ----------
// baseCategoryOf (carreira.js): até 15 anos Sub-15, até 17 Sub-17, senão Sub-20.
export type BaseCat = "sub15" | "sub17" | "sub20";
export const BASE_CAT_LABEL: Record<BaseCat, string> = { sub15: "Sub-15", sub17: "Sub-17", sub20: "Sub-20" };
export function baseCategoryOf(p: Player): BaseCat { const a = p.age ?? 99; return a <= 15 ? "sub15" : a <= 17 ? "sub17" : "sub20"; }
export function baseList(career: Career, cat: BaseCat) {
  return (career.squad || []).filter((p) => p.origin === "base" && baseCategoryOf(p) === cat).sort((a, b) => sortKey(a) - sortKey(b))
    .map((p) => ({ id: p.id, short: shortName(p.name), position: POSITION[p.group], age: p.age != null ? `${p.age} anos` : "—", overall: p.overall, potential: p.potential ?? null }));
}
export function baseCounts(career: Career): Record<BaseCat, number> {
  const c: Record<BaseCat, number> = { sub15: 0, sub17: 0, sub20: 0 };
  (career.squad || []).filter((p) => p.origin === "base").forEach((p) => { c[baseCategoryOf(p)]++; });
  return c;
}

// ---------- Olheiros (CAP05-T08/T09) ----------
export const REGION_LABEL: Record<string, string> = { norte: "Norte", nordeste: "Nordeste", "centro-oeste": "Centro-Oeste", sudeste: "Sudeste", sul: "Sul" };
const MISSION_TYPE: Record<string, string> = { sub17: "Sub-17", sub20: "Sub-20", pro: "Profissional (Mercado)" };
export function scoutStatus(s: Scout): { free: boolean; text: string } {
  if (!s.mission) return { free: true, text: `Livre · ${s.specialty}` };
  const n = s.mission.roundsLeft;
  return { free: false, text: `Missão ${s.mission.type ? `${MISSION_TYPE[s.mission.type] || s.mission.type} ` : ""}em ${REGION_LABEL[s.mission.regionUf] || s.mission.regionUf} · volta em ${n} ${n === 1 ? "rodada" : "rodadas"}` };
}
export const potText = (lo?: number | null, hi?: number | null) => (lo == null ? "—" : lo === hi || hi == null ? String(lo) : `${lo}–${hi}`);
export function buildProspects(career: Career) {
  return (career.scoutMissionProspects || []).map((p) => ({
    id: p.id, short: shortName(p.name), name: p.name, position: POSITION[p.group as PlayerGroup] || "", age: `${p.age} anos`,
    overall: String(p.overall), potential: potText(p.potRange?.lo ?? p.potential, p.potRange?.hi ?? p.potential),
    region: REGION_LABEL[p.foundRegion] || p.foundRegion, scout: p.scoutName, note: p.scoutNote,
    report: p.report ? `${p.report.recommendation}: forte em ${p.report.strength}, precisa evoluir em ${p.report.weakness}.` : null,
    // Leituras de atk/phys/def, como a ficha do prospecto do jogo.
    attrs: [{ label: "Técnica", value: String(p.atk) }, { label: "Físico", value: String(p.phys) }, { label: "Visão de jogo", value: String(p.def) }],
  }));
}
export function buildSuggestions(career: Career) {
  return (career.scoutSuggestions || []).map((s) => ({
    id: s.id, short: shortName(s.playerName), clubId: String(s.clubId), playerId: s.playerId, club: s.clubName,
    meta: `${s.subpos || ""}${s.subpos ? " · " : ""}overall ${s.overall}${s.age ? ` · ${s.age} anos` : ""}`,
    potential: s.potLo != null ? potText(s.potLo, s.potHi) : null, value: s.value != null ? moneyShort(s.value) : "—",
    report: s.report ? `${s.report.recommendation} · forte em ${s.report.strength}, precisa evoluir em ${s.report.weakness}${s.scoutName ? ` · ${s.scoutName}` : ""}` : null,
  }));
}

// Recortes do save (carreira.js: CAREER.scouts, scoutMissionProspects, scoutSuggestions).
export interface Scout { id: string; marketId: string; name: string; specialty: string; evaluation?: number; network?: number; stars?: number; monthlyCost: number; mission: null | { regionUf: string; roundsLeft: number; roundsTotal?: number; type?: string; group?: string | null; duration?: string } }
export interface Prospect { id: string; name: string; group: string; age: number; overall: number; atk: number; def: number; phys: number; potential?: number; potRange?: { lo: number; hi: number }; foundRegion: string; scoutName: string; scoutNote: string; report?: { recommendation: string; strength: string; weakness: string } }
export interface ScoutSuggestion { id: string; playerId: string; playerName: string; clubId: string; clubName: string; subpos?: string; overall: number; age?: number; value?: number; potLo?: number; potHi?: number; scoutName?: string; report?: { recommendation: string; strength: string; weakness: string } }
