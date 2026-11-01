import { useCallback, useEffect, useMemo, useState } from "react";
import { CareerGateway, ClubCatalogGateway, HttpError, SessionGateway } from "./adapters/gateways.ts";
import { buildHome } from "./domain/home.ts";
import { buildLineup, buildSubstitute, currentLineup, type LineupChange, type SwapTarget } from "./domain/lineup.ts";
import type { Career, Team } from "./domain/types.ts";
import { Home } from "./screens/Home.tsx";
import { Lineup } from "./screens/Lineup.tsx";
import { Substitute } from "./screens/Substitute.tsx";
import { PreMatch } from "./screens/PreMatch.tsx";
import { buildPreMatch } from "./domain/prematch.ts";
import { Table } from "./screens/Table.tsx";
import { buildCup, buildTable } from "./domain/table.ts";
import { Calendar } from "./screens/Calendar.tsx";
import { buildCalendar } from "./domain/calendar.ts";
import { Squad } from "./screens/Squad.tsx";
import { Profile } from "./screens/Profile.tsx";
import { buildProfile, buildSquad } from "./domain/squad.ts";
import { BASE, goBackTo, navigate, useLocation } from "./ui/router.tsx";

type Data = { career: Career; teamById: (id: string | number) => Team };
type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: Data };

const SAVE_ERROR = "Não foi possível salvar. Tente de novo.";

// Sessão → carreira ativa → tela da rota. Sem sessão ou sem carreira, a v2
// ainda não tem login/criação próprios: volta para a versão atual, que
// trata os dois casos.
export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const loc = useLocation();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const user = await SessionGateway.current();
      if (!user) { location.replace("/carreira"); return; }
      const career = await CareerGateway.loadActive();
      if (!career) { location.replace("/carreira"); return; }
      const teamById = await ClubCatalogGateway.forCareer(career);
      setState({ kind: "ready", data: { career, teamById } });
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { location.replace("/carreira"); return; }
      setState({ kind: "error", message: "Não foi possível carregar." });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Grava uma mudança de escalação (relê → aplica → PUT). Devolve a
  // mensagem de erro para a tela, ou null se gravou.
  const save = useCallback(async (change: LineupChange): Promise<string | null> => {
    try {
      const r = await CareerGateway.updateLineup(change);
      if ("conflict" in r) {
        const fresh = await CareerGateway.loadActive().catch(() => null);
        if (fresh) setState((s) => s.kind === "ready" ? { kind: "ready", data: { ...s.data, career: fresh } } : s);
        return r.conflict;
      }
      setState((s) => s.kind === "ready" ? { kind: "ready", data: { ...s.data, career: r.career } } : s);
      return null;
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { location.replace("/carreira"); return null; }
      return SAVE_ERROR;
    }
  }, []);

  const data = state.kind === "ready" ? state.data : null;
  const home = useMemo(() => data && buildHome(data.career, data.teamById), [data]);

  if (state.kind === "loading") {
    return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando…</div>;
  }
  if (state.kind === "error" || !data || !home) {
    return <div className="state" role="alert">{state.kind === "error" ? state.message : "Não foi possível carregar."}<button className="state-btn" onClick={load}>Tentar novamente</button></div>;
  }

  if (loc.path === `${BASE}/elenco`) {
    return <Squad m={buildSquad(data.career)} />;
  }
  if (loc.path === `${BASE}/elenco/jogador`) {
    const pr = buildProfile(data.career, new URLSearchParams(loc.search).get("id") || "");
    if (!pr) {
      // Jogador que não está mais no elenco (vendido, link antigo): Elenco.
      queueMicrotask(() => navigate(`${BASE}/elenco`, { replace: true }));
      return null;
    }
    return <Profile key={pr.player.id} m={pr} />;
  }
  if (loc.path === `${BASE}/calendario`) {
    return <Calendar m={buildCalendar(data.career, data.teamById, home.competition)} cta={home.cta} />;
  }
  if (loc.path === `${BASE}/tabela`) {
    const division = new URLSearchParams(loc.search).get("divisao");
    return <Table key={division || "own"} m={buildTable(data.career, data.teamById, division)} cup={buildCup(data.career, data.teamById)} />;
  }
  if (loc.path === `${BASE}/pre-jogo`) {
    const pm = buildPreMatch(data.career, data.teamById);
    if (!pm.available) {
      // Fora da semana de jogo (link antigo, semana já avançada): Início.
      queueMicrotask(() => navigate(`${BASE}/`, { replace: true }));
      return null;
    }
    return <PreMatch m={pm} />;
  }
  if (loc.path === `${BASE}/escalacao`) {
    return <Lineup m={buildLineup(data.career)} cta={home.cta} onFormation={(formation) => save({ kind: "formation", formation })} />;
  }
  if (loc.path === `${BASE}/escalacao/trocar`) {
    const q = new URLSearchParams(loc.search);
    const target: SwapTarget | null = q.has("vaga") ? { kind: "starter", index: Number(q.get("vaga")) }
      : q.get("reserva") ? { kind: "bench", playerId: String(q.get("reserva")) } : null;
    const m = target && Number.isInteger(target.kind === "starter" ? target.index : 0) ? buildSubstitute(data.career, target) : null;
    if (!m) {
      // Vaga/reserva que não existe mais (ex.: link antigo): volta à escalação.
      queueMicrotask(() => goBackTo(`${BASE}/escalacao`));
      return null;
    }
    const { starters, bench } = currentLineup(data.career);
    const expectOutgoing = m.target.kind === "starter" ? starters[m.target.index] || null : bench.includes(m.target.playerId) ? m.target.playerId : null;
    return (
      <Substitute key={loc.search} m={m} onConfirm={async (playerId) => {
        const err = await save({ kind: "swap", target: m.target, expectOutgoing, playerId });
        if (!err) goBackTo(`${BASE}/escalacao`);
        return err;
      }} />
    );
  }
  return <Home m={home} />;
}
