// Escalação (CAP03-T01) e Escolher substituto (CAP03-T02) — regras de
// EXIBIÇÃO e de TROCA espelhadas do legado (public/js/carreira.js:
// FORMATIONS, renderPitch, renderBench, refreshAvailability, locateInLineup,
// placeAt, pickerChoose, markLineupDirty). Nada de regra nova: mesmas
// vagas, mesma ordem, mesma troca simples, mesmo teto de banco. Funções
// puras — quem grava é o gateway (ver CareerGateway.updateLineup).
import type { Career, Lineup, Player, PlayerGroup } from "./types.ts";
// FASE1-ESC (12/11): a troca e a validação da escalação confirmada são do
// motor (public/js/motor/escalacao.js), a mesma operação que a comissão
// técnica usa na orientação.
import { RESERVAS, trocarComRecomposicao, validarEscalacao, type Recomposicao } from "../../../public/js/motor/escalacao.js";

// Espelho EXATO de FORMATIONS do legado (grupo real + rótulo da vaga).
// Paridade verificada em lineup.test.ts lendo o próprio carreira.js.
export const FORMATIONS: Record<string, [PlayerGroup, string][]> = {
  "4-4-2": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "MEI D"], ["M", "VOL"], ["M", "VOL"], ["M", "MEI E"], ["F", "ATA"], ["F", "ATA"]],
  "4-3-3": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "VOL"], ["M", "MEI"], ["M", "MEI"], ["F", "PONTA D"], ["F", "CENTROAV."], ["F", "PONTA E"]],
  "4-2-3-1": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "VOL"], ["M", "VOL"], ["M", "MEIA D"], ["M", "MEIA C"], ["M", "MEIA E"], ["F", "CENTROAV."]],
  "3-5-2": [["G", "GOL"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ZAG"], ["M", "ALA D"], ["M", "VOL"], ["M", "MEI"], ["M", "VOL"], ["M", "ALA E"], ["F", "ATA"], ["F", "ATA"]],
  "4-5-1": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "MEI D"], ["M", "VOL"], ["M", "MEI"], ["M", "VOL"], ["M", "MEI E"], ["F", "CENTROAV."]],
  "5-3-2": [["G", "GOL"], ["D", "ALA D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ALA E"], ["M", "VOL"], ["M", "MEI"], ["M", "VOL"], ["F", "ATA"], ["F", "ATA"]],
  "4-1-4-1": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "VOL"], ["M", "MEI D"], ["M", "MEI"], ["M", "MEI"], ["M", "MEI E"], ["F", "CENTROAV."]],
  "4-4-1-1": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "MEI D"], ["M", "VOL"], ["M", "VOL"], ["M", "MEI E"], ["F", "SEGUNDO ATA"], ["F", "CENTROAV."]],
  "3-4-3": [["G", "GOL"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ZAG"], ["M", "ALA D"], ["M", "VOL"], ["M", "VOL"], ["M", "ALA E"], ["F", "PONTA D"], ["F", "CENTROAV."], ["F", "PONTA E"]],
  "4-1-3-2": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "VOL"], ["M", "MEIA D"], ["M", "MEIA C"], ["M", "MEIA E"], ["F", "ATA"], ["F", "ATA"]],
  "3-4-2-1": [["G", "GOL"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ZAG"], ["M", "ALA D"], ["M", "VOL"], ["M", "VOL"], ["M", "ALA E"], ["F", "MEIA D"], ["F", "MEIA E"], ["F", "CENTROAV."]],
  "4-3-1-2": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "VOL"], ["M", "MEI D"], ["M", "MEI E"], ["M", "ENGANCHE"], ["F", "ATA"], ["F", "ATA"]],
  "4-2-2-2": [["G", "GOL"], ["D", "LAT D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "LAT E"], ["M", "VOL"], ["M", "VOL"], ["M", "MEIA D"], ["M", "MEIA E"], ["F", "ATA"], ["F", "ATA"]],
  "5-4-1": [["G", "GOL"], ["D", "ALA D"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ZAG"], ["D", "ALA E"], ["M", "MEI D"], ["M", "VOL"], ["M", "VOL"], ["M", "MEI E"], ["F", "CENTROAV."]],
};
export const FORMATION_IDS = Object.keys(FORMATIONS);
export const MAX_BENCH = 11; // legado: MAX_BENCH
const DEFAULT_FORMATION = "4-4-2";

export const GROUP_WORD: Record<PlayerGroup, string> = { G: "Goleiro", D: "Defesa", M: "Meio-campo", F: "Ataque" };
const GROUP_ORDER: Record<PlayerGroup, number> = { G: 0, D: 1, M: 2, F: 3 };

// "Kevin Viveiros" → "K. Viveiros" (legado: abbreviateName).
export function shortName(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name || "?";
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`;
}

// Legado: squadSortKey — posição (GOL→ATA) e, dentro dela, maior overall.
export function sortKey(p: Player): number { return (GROUP_ORDER[p.group] ?? 1) * 1000 - (p.overall || 0); }

// Legado: refreshAvailability libera quem já cumpriu a ausência ao abrir a
// escalação. Aqui só se DERIVA (sem mexer no save): o legado aplica o
// mesmo antes de qualquer jogo.
export function isAvailable(p: Player, round: number): boolean {
  if (!p.status || p.status === "ok") return true;
  return p.outUntilRound != null && round > p.outUntilRound;
}
export function unavailableReason(p: Player, round: number): "Lesionado" | "Suspenso" | null {
  if (isAvailable(p, round)) return null;
  return p.status === "suspenso" ? "Suspenso" : "Lesionado";
}

export interface PitchSlot { index: number; group: PlayerGroup; label: string; player: Player | null; out: "Lesionado" | "Suspenso" | null }
export interface LineupModel {
  clubName: string;
  formation: string;
  rows: PitchSlot[][]; // ataque em cima, goleiro embaixo (legado: renderPitch)
  bench: { player: Player; out: "Lesionado" | "Suspenso" | null }[];
  // FASE1-ESC: vagas vazias no banco (save antigo com banco menor) e as
  // pendências da escalação (lista vazia = escalação válida).
  emptyBench: number;
  issues: string[];
}

export function currentLineup(career: Career): Required<Pick<Lineup, "formation" | "starters" | "bench">> {
  const l = career.lineup || { starters: [] };
  const formation = l.formation && FORMATIONS[l.formation] ? l.formation : DEFAULT_FORMATION;
  return { formation, starters: l.starters || [], bench: l.bench || [] };
}

export function buildLineup(career: Career): LineupModel {
  const { formation, starters, bench } = currentLineup(career);
  const squad = career.squad || [];
  const byId = new Map(squad.map((p) => [p.id, p]));
  const round = career.currentRound;
  const slots: PitchSlot[] = FORMATIONS[formation].map(([group, label], index) => {
    const id = starters[index];
    const player = (id && byId.get(id)) || null;
    return { index, group, label, player, out: player ? unavailableReason(player, round) : null };
  });
  const rows = (["F", "M", "D", "G"] as PlayerGroup[]).map((g) => slots.filter((s) => s.group === g)).filter((r) => r.length);
  const benchPlayers = bench.map((id) => byId.get(id)).filter((p): p is Player => !!p).sort((a, b) => sortKey(a) - sortKey(b));
  const v = validarEscalacao({ formation, starters, bench }, career.squad || [], round);
  return {
    clubName: career.clubName, formation, rows, bench: benchPlayers.map((player) => ({ player, out: unavailableReason(player, round) })),
    emptyBench: Math.max(0, RESERVAS - bench.length), issues: v.pendencias.map((x) => x.mensagem),
  };
}

// Alvo da troca: vaga de titular (índice) ou reserva (id de quem está lá).
export type SwapTarget = { kind: "starter"; index: number } | { kind: "bench"; playerId: string } | { kind: "bench-empty" };

export interface SubstituteModel {
  target: SwapTarget;
  outgoing: Player | null; // null = vaga vazia
  slotLabel: string | null;
  options: { player: Player; where: "titular" | "banco" | null }[];
}

// Lista do "Quem entra?" — mesmo universo do seletor do legado
// (renderPickerList): todo o elenco disponível; quem já está escalado
// aparece marcado e a escolha faz a troca. Ordem: primeiro a mesma
// posição de quem sai (como na referência), depois a ordem do legado
// (posição, maior overall).
export function buildSubstitute(career: Career, target: SwapTarget): SubstituteModel | null {
  const { formation, starters, bench } = currentLineup(career);
  const squad = career.squad || [];
  const byId = new Map(squad.map((p) => [p.id, p]));
  let outgoingId: string | null;
  let slotLabel: string | null = null;
  if (target.kind === "starter") {
    if (target.index < 0 || target.index >= FORMATIONS[formation].length) return null;
    outgoingId = starters[target.index] || null;
    slotLabel = FORMATIONS[formation][target.index][1];
  } else if (target.kind === "bench") {
    if (!bench.includes(target.playerId)) return null;
    outgoingId = target.playerId;
  } else {
    // Vaga vazia no banco: só jogador de fora da escalação.
    if (bench.length >= MAX_BENCH) return null;
    outgoingId = null;
    slotLabel = "Reserva";
  }
  const outgoing = (outgoingId && byId.get(outgoingId)) || null;
  const outGroup = outgoing?.group || (target.kind === "starter" ? FORMATIONS[formation][target.index][0] : null);
  const options = squad
    .filter((p) => p.id !== outgoingId && isAvailable(p, career.currentRound))
    .filter((p) => target.kind !== "bench-empty" || (!starters.includes(p.id) && !bench.includes(p.id)))
    .sort((a, b) => {
      const g = outGroup ? Number(b.group === outGroup) - Number(a.group === outGroup) : 0;
      return g || sortKey(a) - sortKey(b);
    })
    .map((player) => ({ player, where: starters.includes(player.id) ? "titular" as const : bench.includes(player.id) ? "banco" as const : null }));
  return { target, outgoing, slotLabel, options };
}

export type LineupChange =
  | { kind: "swap"; target: SwapTarget; expectOutgoing: string | null; playerId: string; recompose?: Recomposicao }
  | { kind: "formation"; formation: string };
export type { Recomposicao };
// Resultado de aplicar: a carreira nova; um conflito (nada gravado); a troca
// pede recompor o banco com um goleiro (confirmação conjunta, ESC-03); ou a
// troca está bloqueada (sem goleiro para o banco).
export type LineupChangeResult = Career | { conflict: string } | { recompose: Recomposicao } | { blocked: string };

// Aplica a mudança numa CÓPIA da carreira recém-lida do servidor.
// Devolve a carreira nova, ou um motivo quando o save mudou desde que a
// tela foi aberta (outra aba/versão mexeu na escalação) — nesse caso nada
// é gravado.
export function applyLineupChange(career: Career, change: LineupChange): LineupChangeResult {
  const cur = currentLineup(career);
  const l = { formation: cur.formation, starters: [...cur.starters], bench: [...cur.bench] };
  if (change.kind === "formation") {
    if (!FORMATIONS[change.formation]) return { conflict: "Formação inválida." };
    l.formation = change.formation; // legado: só troca o esquema; titulares ficam nas mesmas vagas
  } else {
    // A mesma troca da comissão técnica (motor/escalacao.js).
    const t = change.target;
    const alvo = t.kind === "starter" ? { tipo: "titular" as const, vaga: t.index } : t.kind === "bench" ? { tipo: "reserva" as const, id: t.playerId } : { tipo: "banco-vazio" as const };
    const r = trocarComRecomposicao(l, career.squad || [], career.currentRound, { alvo, saiEsperado: change.expectOutgoing, entraId: change.playerId, recomposicao: change.recompose });
    if ("conflito" in r && r.conflito) return { conflict: r.conflito };
    if ("bloqueio" in r && r.bloqueio) return { blocked: r.mensagem };
    if ("precisaRecompor" in r && r.precisaRecompor) return { recompose: r.proposta };
    if (!("lineup" in r) || !r.lineup) return { conflict: "A escalação mudou. Revise e tente de novo." };
    l.starters = r.lineup.starters; l.bench = r.lineup.bench;
  }
  const next: Career = { ...career, lineup: { ...(career.lineup || { starters: [] }), ...l } };
  // legado: markLineupDirty — edição manual desvincula do esquema salvo.
  if (next.activeSchemeId != null) next.activeSchemeId = null;
  return next;
}
