// Pré-jogo (CAP04-T01) — o que a confirmação atual mostra antes do jogo
// (legado: renderPreMatchConfirm), com a composição da prancha. Só
// leitura: "Iniciar partida" roda o jogo na versão atual (goToMatch).
import type { Career, Team } from "./types.ts";
import { COMPETITION_NAME, buildHome, matchDay } from "./home.ts";
import { buildLineup, currentLineup, shortName, type LineupModel } from "./lineup.ts";
import { bloqueioInicio } from "../../../public/js/motor/escalacao.js";

export interface PreMatchAlert { id: "incompleta" | "indisponivel" | "rodizio"; title: string; sub: string }
export interface PreMatchModel {
  available: boolean; // false = não é semana de jogo da liga (a rota volta ao Início)
  subtitle: string;
  next: null | { home: Team; away: Team; date: string | null };
  formation: string;
  rows: LineupModel["rows"];
  alerts: PreMatchAlert[];
  // Decisão do Murilo (12/11/2026): com pendência na escalação (11 + 11,
  // todos disponíveis, goleiro titular e no banco) a partida não começa.
  // Textos das pendências; vazio = pode começar.
  blocked: string[];
}

export function buildPreMatch(career: Career, teamById: (id: string | number) => Team): PreMatchModel {
  const home = buildHome(career, teamById);
  const round = career.currentRound;
  const lineup = buildLineup(career);
  const comp = COMPETITION_NAME[career.competitionId || "brasileirao"] || "Competição";
  const me = String(career.clubId);
  const fx = (career.schedule[round] || []).find((m) => String(m.home) === me || String(m.away) === me);
  const alerts: PreMatchAlert[] = [];

  // Mesmos avisos da confirmação atual, mesmos critérios.
  const { starters } = currentLineup(career);
  const filled = starters.filter(Boolean).length;
  if (filled < 11) alerts.push({ id: "incompleta", title: "Escalação incompleta", sub: `${filled}/11 titulares definidos — complete para jogar.` });
  const out = lineup.rows.flat().filter((s) => s.player && s.out).map((s) => `${shortName(s.player!.name)} (${s.out!.toLowerCase()})`);
  if (out.length) alerts.push({ id: "indisponivel", title: out.length > 1 ? "Titulares indisponíveis" : "Titular indisponível", sub: out.join(", ") });
  const week = career.calendar?.weeks?.[career.calendar.idx];
  // SERIED-001: na semana da preliminar da Copa, só joga 2 vezes quem está nela.
  const cup = career.cup;
  const foraDaPreliminar = !!cup?.prelim && week?.r === (cup.prelim.round || 1) && !(cup.ties?.prelim || []).some((t) => String(t.home) === me || String(t.away) === me);
  if (week && week.c && !foraDaPreliminar) {
    const squad = career.squad || [];
    const tired = starters.map((id) => (id ? squad.find((p) => p.id === id) : undefined)).filter((p): p is NonNullable<typeof p> => !!p && (p.condition == null ? 100 : p.condition) < 75);
    alerts.push({
      id: "rodizio", title: "Semana de 2 jogos",
      sub: tired.length ? `Copa do Brasil na quarta. Titulares cansados: ${tired.map((p) => `${shortName(p.name)} (${Math.round(p.condition!)}%)`).join(", ")} — considere rodar o elenco.` : "Copa do Brasil na quarta. Titulares em boa condição.",
    });
  }

  return {
    available: home.state === "match",
    subtitle: `${comp} · Rodada ${round}`,
    next: fx ? { home: teamById(fx.home), away: teamById(fx.away), date: matchDay(career, round) } : null,
    formation: lineup.formation,
    rows: lineup.rows,
    alerts,
    blocked: (bloqueioInicio(currentLineup(career), career.squad || [], round)?.pendencias || []).map((p) => p.mensagem),
  };
}
