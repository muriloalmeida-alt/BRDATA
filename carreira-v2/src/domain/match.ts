// Partida ao vivo (CAP04-T02 / referencias_anteriores/partida.png) — o que
// a tela mostra a partir do estado da ponte (adapters/match.ts). Rótulos
// fixos por tipo de evento ("Gol · B. Santos"), como a prancha — não o
// texto sorteado do feed atual. Só exibição: nenhuma regra de jogo aqui.
import type { MatchEvent, MatchSnapshot } from "../adapters/match.ts";
import { COMPETITION_NAME } from "./home.ts";
import { CUP_PHASE_LABEL } from "./table.ts";
import { buildLineup, shortName, type LineupModel } from "./lineup.ts";
import type { Career } from "./types.ts";

export interface TimelineItem { key: string; minute: number; title: string; sub: string; kind: "gol-meu" | "gol" | "neutro" | "inicio" }
export interface MatchModel {
  phase: MatchSnapshot["fase"];
  saved: boolean | null;
  kicker: string;
  home: { id: string; name: string }; away: { id: string; name: string };
  gh: number; ga: number;
  minute: string; period: string;
  last: null | { minute: number; title: string; sub: string; goal: boolean; mine: boolean };
  timeline: TimelineItem[];
  speed: 1 | 2;
  subs: { used: number; total: number };
  // Fase 4 (P6/P5): linha do agregado na volta da Copa e, decidida, quem passou.
  cup: null | { aggregate: string | null; outcome: string | null };
}

// Lances que contam como "último evento", por importância: no mesmo
// minuto (o motor resolve 15' de cada vez), o gol vem antes do cartão.
const KEY_RANK: Record<string, number> = { gol: 6, vermelho: 5, penalty_missed: 4, lesao: 3, amarelo: 2, substituicao: 1 };
const rank = (t: string) => KEY_RANK[t] || 0;
const nm = (s: string | null) => (s ? shortName(s) : "");

function describe(e: MatchEvent, team: string): { title: string; sub: string } {
  switch (e.tipo) {
    case "gol": return { title: `${e.penalti ? "Gol de pênalti" : "Gol"} · ${nm(e.jogador)}`, sub: e.assistencia ? `${team} · assistência de ${nm(e.assistencia)}` : team };
    case "amarelo": return { title: `Cartão amarelo · ${nm(e.jogador)}`, sub: team };
    case "vermelho": return { title: `Cartão vermelho · ${nm(e.jogador)}`, sub: team };
    case "lesao": return { title: `Lesão · ${nm(e.jogador)}`, sub: team };
    case "substituicao": return { title: "Substituição", sub: `${team} · entra ${nm(e.entra)}, sai ${nm(e.sai)}` };
    case "chance_perdida": return { title: `Chance perdida · ${nm(e.jogador)}`, sub: team };
    case "defesa": return { title: `Finalização defendida · ${nm(e.jogador)}`, sub: team };
    case "penalty_awarded": return { title: "Pênalti marcado", sub: team };
    case "penalty_missed": return { title: `Pênalti perdido · ${nm(e.jogador)}`, sub: team };
    case "var_check": return { title: "Revisão do VAR", sub: team };
    default: return { title: "Lance", sub: team };
  }
}

export function buildMatch(s: MatchSnapshot, competitionId?: string): MatchModel | null {
  if (!s.mandante || !s.visitante) return null;
  const mine = s.souMandante ? s.mandante : s.visitante;
  const opp = s.souMandante ? s.visitante : s.mandante;
  const kicker = s.contexto === "copa" && s.copa
    ? `Copa do Brasil · ${CUP_PHASE_LABEL[s.copa.fase] || s.copa.fase} · ${s.copa.perna === 2 ? "Volta" : "Ida"}`
    : s.contexto === "amistoso" ? "Amistoso"
    : `${COMPETITION_NAME[competitionId || "brasileirao"] || "Competição"} · Rodada ${s.rodada}`;
  const events = s.eventos || [];
  const teamOf = (e: MatchEvent) => (e.meu ? mine.nome : opp.nome);
  // Mais recente primeiro; no mesmo minuto, o mais importante primeiro.
  const ordered = events.map((e, i) => ({ e, i })).sort((a, b) => (b.e.minuto - a.e.minuto) || (rank(b.e.tipo) - rank(a.e.tipo)) || (b.i - a.i));
  const timeline: TimelineItem[] = ordered.map(({ e, i }) => {
    const d = describe(e, teamOf(e));
    const kind: TimelineItem["kind"] = e.tipo === "gol" ? (e.meu ? "gol-meu" : "gol") : "neutro";
    return { key: `e${i}`, minute: e.minuto, ...d, kind };
  });
  timeline.push({ key: "inicio", minute: 0, title: "Início da partida", sub: `${s.mandante.nome} × ${s.visitante.nome}`, kind: "inicio" });
  const lastKey = ordered.find(({ e }) => rank(e.tipo) > 0)?.e;
  const last = lastKey ? (() => {
    const team = teamOf(lastKey);
    const d = describe(lastKey, team);
    const goal = lastKey.tipo === "gol";
    return {
      minute: lastKey.minuto, goal, mine: lastKey.meu,
      title: goal ? `Gol do ${team}` : d.title.split(" · ")[0],
      sub: goal ? nm(lastKey.jogador) + (lastKey.penalti ? " (pênalti)" : "") : lastKey.tipo === "substituicao" ? `Entra ${nm(lastKey.entra)}, sai ${nm(lastKey.sai)}` : `${nm(lastKey.jogador)} · ${team}`,
    };
  })() : null;
  const phase = s.fase;
  return {
    phase, saved: s.gravada ?? null, kicker,
    home: { id: s.mandante.id, name: s.mandante.nome }, away: { id: s.visitante.id, name: s.visitante.nome },
    gh: s.gh || 0, ga: s.ga || 0,
    minute: `${s.minuto || 0}’`,
    period: phase === "encerrada" ? "Encerrado" : phase === "intervalo" ? "Intervalo" : s.segundoTempo ? "2º tempo" : "1º tempo",
    last, timeline,
    speed: s.velocidade === 2 ? 2 : 1,
    subs: { used: s.substituicoes?.usadas || 0, total: s.substituicoes?.total || 5 },
    cup: s.contexto === "copa" && s.copa ? cupLine(s.copa, mine.nome, opp.nome, s.souMandante ? s.gh || 0 : s.ga || 0, s.souMandante ? s.ga || 0 : s.gh || 0) : null,
  };
}

// Agregado = ida + o placar atual da volta (do seu ponto de vista).
// P5: o jogo não guarda o placar da disputa de pênaltis, só quem passou.
function cupLine(c: NonNullable<MatchSnapshot["copa"]>, me: string, opp: string, my: number, their: number) {
  const aggregate = c.perna === 2 && c.ida ? `Agregado: ${me} ${c.ida.meus + my} × ${c.ida.deles + their} ${opp}` : null;
  const outcome = c.classificado ? `${c.penaltis ? "Decidido nos pênaltis · " : ""}Classificado: ${c.classificado}` : null;
  return aggregate || outcome ? { aggregate, outcome } : null;
}

// "Revisar time" (Pausa): a escalação AO VIVO vinda da ponte, desenhada
// pelo mesmo campo da Escalação (buildLineup) — só leitura.

export function buildLiveLineup(s: MatchSnapshot): LineupModel | null {
  const esc = s.escalacao;
  if (!esc || s.rodada == null) return null;
  const players = [...esc.titulares, ...esc.banco].filter((p): p is NonNullable<typeof p> => !!p);
  const career: Career = {
    clubId: "", clubName: "", seasonYear: 0, currentRound: s.rodada, schedule: {}, standings: {},
    squad: players.map((p) => ({ id: p.id, name: p.nome, group: p.grupo, overall: p.overall, status: p.status, outUntilRound: p.voltaRodada, condition: p.condicao })),
    lineup: { formation: esc.formacao, starters: esc.titulares.map((p) => (p ? p.id : null)), bench: esc.banco.map((p) => p.id) },
  };
  return buildLineup(career);
}

// Substituição ao vivo — mesmos universos da tela atual (openLiveSubModal):
// sai = qualquer titular em campo; entra = reserva com status "ok".
export interface SubPlayer { id: string; name: string; short: string; group: "G" | "D" | "M" | "F"; overall: number; condition: number | null; status: string }
export interface SubModel { used: number; total: number; left: number; starters: SubPlayer[]; bench: SubPlayer[] }
export function buildSubs(s: MatchSnapshot): SubModel | null {
  const esc = s.escalacao;
  if (!esc) return null;
  const map = (p: NonNullable<typeof esc.titulares[number]>): SubPlayer => ({ id: p.id, name: p.nome, short: shortName(p.nome), group: p.grupo, overall: p.overall, condition: p.condicao, status: p.status });
  const used = s.substituicoes?.usadas || 0, total = s.substituicoes?.total || 5;
  return {
    used, total, left: Math.max(0, total - used),
    starters: esc.titulares.filter((p): p is NonNullable<typeof p> => !!p).map(map),
    bench: esc.banco.filter((p) => p.status === "ok").map(map),
  };
}

// Resultado final (CAP04-T06, pranchas/02_resultados.png col. 1). Título e
// frase a partir do placar (sem avaliação de desempenho inventada); gols
// da partida em ordem de minuto.
export interface ResultModel {
  title: string; line: string;
  goals: { minute: number; scorer: string; team: string; mine: boolean; penalty: boolean }[];
}
export function buildResult(s: MatchSnapshot, competitionName: string): ResultModel | null {
  if (!s.mandante || !s.visitante) return null;
  const mine = s.souMandante ? s.mandante : s.visitante;
  const opp = s.souMandante ? s.visitante : s.mandante;
  const my = s.souMandante ? s.gh || 0 : s.ga || 0;
  const their = s.souMandante ? s.ga || 0 : s.gh || 0;
  const pts = s.contexto === "liga";
  const title = my > their ? `Vitória do ${mine.nome}.` : my < their ? `Derrota do ${mine.nome}.` : "Empate.";
  const line = my > their ? (pts ? `O ${mine.nome} venceu o ${opp.nome} e somou três pontos no ${competitionName}.` : `O ${mine.nome} venceu o ${opp.nome}.`)
    : my < their ? (pts ? `O ${mine.nome} perdeu para o ${opp.nome} e não pontuou nesta rodada.` : `O ${mine.nome} perdeu para o ${opp.nome}.`)
    : (pts ? `${mine.nome} e ${opp.nome} empataram: um ponto para cada lado.` : `${mine.nome} e ${opp.nome} empataram.`);
  const goals = (s.eventos || []).filter((e) => e.tipo === "gol")
    .map((e) => ({ minute: e.minuto, scorer: e.jogador ? shortName(e.jogador) : "", team: e.meu ? mine.nome : opp.nome, mine: e.meu, penalty: e.penalti }))
    .sort((a, b) => a.minute - b.minute);
  return { title, line, goals };
}
