import { useCallback, useEffect, useMemo, useState } from "react";
import { CareerGateway, ClubCatalogGateway, HttpError, SessionGateway, type SessionUser } from "./adapters/gateways.ts";
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
import { Board } from "./screens/Board.tsx";
import { buildBoard } from "./domain/board.ts";
import { Finance } from "./screens/Finance.tsx";
import { buildFinance } from "./domain/finance.ts";
import { Match } from "./screens/Match.tsx";
import { BASE, goBackTo, navigate, useLocation, useScreenFocus } from "./ui/router.tsx";
import { engine } from "./adapters/engine.ts";
import { ClubScreen, CompetitionScreen, FirstEntryScreen, LoginScreen, NEW, SetupScreen, Splash } from "./screens/Access.tsx";
import { DailyReward } from "./screens/DailyReward.tsx";
import { LoginSheet } from "./ui/session.tsx";
import { rewardPending } from "./domain/reward.ts";

// Recompensa diária: abre sozinha no máximo uma vez por carregamento da v2.
let rewardShown = false;

type Data = { career: Career; teamById: (id: string | number) => Team; user: SessionUser };
type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "login" } | { kind: "nova"; user: SessionUser } | { kind: "ready"; data: Data };

const SAVE_ERROR = "Não foi possível salvar. Tente de novo.";

// Sessão → carreira ativa → tela da rota. Fase 2 (plano de independência):
// sem sessão, o login é da própria v2; sem carreira, a criação também
// (/carreira/nova…). Sessão que expira durante o uso abre a folha de login
// sobre a tela atual. Nada mais manda para /carreira-old.
export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const loc = useLocation();
  // AUD-05: foco no título a cada troca de tela. Trocar só a divisão da
  // Tabela não é troca de tela: o foco fica na aba escolhida.
  useScreenFocus(loc.path + loc.search.replace(/[?&]divisao=[^&]*/, ""));

  const [expired, setExpired] = useState(false);
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const user = await SessionGateway.current();
      if (!user) { setState({ kind: "login" }); return; }
      const career = await CareerGateway.loadActive();
      if (!career) { setState({ kind: "nova", user }); return; }
      const teamById = await ClubCatalogGateway.forCareer(career);
      setState({ kind: "ready", data: { career, teamById, user } });
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { setState({ kind: "login" }); return; }
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
      // Sessão expirada: a folha de login da v2 abre sobre a tela; a tela
      // fecha a própria folha (null) para não empilhar duas. Nada foi gravado.
      if (e instanceof HttpError && e.status === 401) { setExpired(true); return null; }
      return SAVE_ERROR;
    }
  }, []);

  // Depois da partida (gravada pela ponte), relê o save sem trocar de tela.
  const reloadCareer = useCallback(async () => {
    const fresh = await CareerGateway.loadActive().catch(() => null);
    if (fresh) setState((s) => s.kind === "ready" ? { kind: "ready", data: { ...s.data, career: fresh } } : s);
  }, []);

  // Recompensa recebida: relê a sessão (dia da sequência) e o save.
  const refreshAfterReward = useCallback(async () => {
    const user = await SessionGateway.current().catch(() => null);
    const fresh = await CareerGateway.loadActive().catch(() => null);
    setState((s) => s.kind === "ready" ? { kind: "ready", data: { ...s.data, career: fresh || s.data.career, user: user || s.data.user } } : s);
  }, []);

  // Recompensa diária (decisão de 03/11): abre sozinha ao entrar, uma vez
  // por carregamento, se ainda não foi recebida hoje — fora da criação de
  // carreira e da partida.
  const readyUser = state.kind === "ready" ? state.data.user : null;
  useEffect(() => {
    if (!readyUser || rewardShown) return;
    if (loc.path.startsWith(NEW) || loc.path === `${BASE}/partida` || loc.path === `${BASE}/recompensa`) return;
    if (!rewardPending(readyUser.dailyLogin)) return;
    rewardShown = true;
    navigate(`${BASE}/recompensa`);
  }, [readyUser, loc.path]);

  // Fase 1: com a carreira carregada, o motor começa a abrir em segundo
  // plano (a 1ª partida não espera a carga da página do motor). Uma vez só.
  // Fase 2: também na criação de carreira (o motor cria a carreira).
  const ready = state.kind === "ready" || state.kind === "nova";
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => engine.preload(), 1500);
    return () => clearTimeout(t);
  }, [ready]);

  const data = state.kind === "ready" ? state.data : null;
  const home = useMemo(() => data && buildHome(data.career, data.teamById), [data]);

  if (state.kind === "loading") return <Splash />;
  if (state.kind === "login") return <LoginScreen onLoggedIn={load} />;
  if (state.kind === "nova") {
    // Sem carreira: criação pela v2 (CAP01-T03 a T05).
    const q = new URLSearchParams(loc.search);
    if (loc.path === `${NEW}/clube` && q.get("comp")) return <ClubScreen key={q.get("comp")!} competitionId={q.get("comp")!} />;
    if (loc.path === `${NEW}/treinador` && q.get("comp") && q.get("clube")) {
      return <SetupScreen competitionId={q.get("comp")!} clubId={q.get("clube")!} coachName={state.user.name || ""} onCreated={load} />;
    }
    if (loc.path !== NEW) { queueMicrotask(() => navigate(NEW, { replace: true })); return null; }
    return <CompetitionScreen />;
  }
  if (state.kind === "error" || !data || !home) {
    return <div className="state" role="alert">{state.kind === "error" ? state.message : "Não foi possível carregar."}<button className="state-btn" onClick={load}>Tentar novamente</button></div>;
  }

  const sessionSheet = expired && (
    <LoginSheet account={data.user.id} onLoggedIn={() => { setExpired(false); reloadCareer(); }} />
  );
  if (loc.path === `${NEW}/pronto`) return <FirstEntryScreen home={home} />;
  if (loc.path.startsWith(NEW)) { queueMicrotask(() => navigate(`${BASE}/`, { replace: true })); return null; }
  if (loc.path === `${BASE}/recompensa`) return <DailyReward onClaimed={refreshAfterReward} />;
  return <>{route()}{sessionSheet}</>;

  // Telas com carreira (a folha de sessão expirada fica por cima de qualquer uma).
  function route(): JSX.Element | null {
  if (!data || !home) return null;
  if (loc.path === `${BASE}/partida`) {
    const q = new URLSearchParams(loc.search);
    const tela = q.get("tela");
    const SUBS = ["pausa", "time", "sai", "entra", "tatica", "lances", "tabela"] as const;
    const sub = (SUBS as readonly string[]).includes(tela || "") ? (tela as (typeof SUBS)[number]) : null;
    // AUD-03: a Tabela aberta pelo Resultado fica na rota da partida
    // (?tela=tabela&divisao=…), para a sessão da ponte — que guarda o
    // pós-jogo — continuar montada ao trocar de divisão.
    return <Match startNow={q.get("iniciar") === "1"} sub={sub} outId={q.get("sai")} competitionId={data.career.competitionId} competitionName={home.competition}
      teamById={data.teamById} onFinished={reloadCareer}
      renderTable={(ctx) => <Table m={buildTable(data.career, data.teamById, q.get("divisao"))} cup={buildCup(data.career, data.teamById)} match={ctx} />} />;
  }
  if (loc.path === `${BASE}/financas`) {
    return <Finance m={buildFinance(data.career)} />;
  }
  if (loc.path === `${BASE}/diretoria`) {
    return <Board m={buildBoard(data.career)} />;
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
    return <Table m={buildTable(data.career, data.teamById, division)} cup={buildCup(data.career, data.teamById)} />;
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
  return <Home m={home} reward={{ pending: rewardPending(data.user.dailyLogin) }} />;
  }
}
