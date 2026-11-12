import { useCallback, useEffect, useMemo, useState } from "react";
import { CareerGateway, ClubCatalogGateway, HttpError, SessionGateway, type SessionUser } from "./adapters/gateways.ts";
import { consumeInvite } from "./adapters/invite.ts";
import { buildHome } from "./domain/home.ts";
import { buildLineup, buildSubstitute, currentLineup, shortName, type LineupChange, type Recomposicao, type SwapTarget } from "./domain/lineup.ts";
// FASE1-ESC: resultado de gravar a escalação (ver save).
export type SaveOutcome = string | null | { recompose: Recomposicao };
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
import { ClubHub, GamesHub, MoreMenu } from "./screens/Hubs.tsx";
import { LoginSheet } from "./ui/session.tsx";
import { rewardPending } from "./domain/reward.ts";
import { autoOpen, wizardPending, wizardStepOf } from "./domain/onboarding.ts";
import { Tutorial, WizardBar } from "./screens/Onboarding.tsx";
import { CommissionTab } from "./screens/Commission.tsx";
import { buildFriendly, buildNews, buildNotices, skipInfo } from "./domain/week.ts";
import { FriendlyPre, News, WeekDone } from "./screens/Week.tsx";
import { WeekGateway } from "./adapters/week.ts";
import { PostMatch } from "./screens/PostMatch.tsx";
import { ClubOffer, CoachProfile, Dismissal, History, NewSeason, SeasonEnd } from "./screens/Season.tsx";
import { buildClubOffer, buildSeasonEnd, dismissalPending, seasonEnded } from "./domain/season.ts";
import { TacticsAxes, TacticsHub, TacticsMarking, TacticsSchemes, TacticsSectors } from "./screens/Tactics.tsx";
import { Evolution, TrainingCondition, TrainingWeek } from "./screens/Training.tsx";
import { PrepGateway } from "./adapters/prep.ts";
import { ClubRoster, Compare, Contracts, Ficha, PressStandalone, Talk } from "./screens/SquadPlus.tsx";
import { AwardsScreen, CupScreen, H2HScreen, StatsScreen } from "./screens/Games.tsx";
import { AchievementsScreen, BudgetScreen, EditProfileScreen, HelpScreen, PurchaseHistoryScreen, RankingScreen, SavesScreen, SettingsScreen, ShopScreen } from "./screens/More.tsx";
import { BaseScreen, HireScoutScreen, LedgerScreen, MissionScreen, ProspectsScreen, ScoutsScreen, SponsorsScreen, StadiumScreen, StaffScreen, SuggestionsScreen } from "./screens/Club.tsx";
import { History as MarketHistory, Loan, Market, MyOffers, MySales, Negotiation, PendingOffer, Propose, SaleOffers, Target } from "./screens/Market.tsx";

// Tutorial, assistente e recompensa diária: a abertura automática roda no
// máximo uma vez por carregamento da v2 (sair pelo "Voltar" não reabre).
let autoDone = false;

type Data = { career: Career; teamById: (id: string | number) => Team; user: SessionUser };
type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "login" } | { kind: "nova"; user: SessionUser } | { kind: "ready"; data: Data };

const SAVE_ERROR = "Não foi possível salvar. Tente de novo.";

// Sessão → carreira ativa → tela da rota. Fase 2 (plano de independência):
// sem sessão, o login é da própria v2; sem carreira, a criação também
// (/carreira/nova…). Sessão que expira durante o uso abre a folha de login
// sobre a tela atual. Nada mais manda para a versão anterior.
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
      consumeInvite(); // convite de amigo guardado (fase 11): usa assim que a conta é conhecida
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
  // mensagem de erro para a tela, null se gravou, ou a recomposição do banco
  // a confirmar junto (FASE1-ESC).
  const save = useCallback(async (change: LineupChange): Promise<SaveOutcome> => {
    try {
      const r = await CareerGateway.updateLineup(change);
      if ("recompose" in r) return { recompose: r.recompose };
      if ("blocked" in r) return r.blocked;
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

  // O que abre sozinho ao entrar, uma vez por carregamento e fora da
  // criação de carreira e da partida, nesta ordem (como na versão
  // anterior): tutorial de boas-vindas (1ª carreira da conta) → assistente
  // de início (carreira nova, na pré-temporada) → recompensa diária (se
  // ainda não recebida hoje). Ao fechar um, segue para o próximo.
  const readyData = state.kind === "ready" ? state.data : null;
  const nextAuto = useCallback((d: { user: SessionUser; career: Career }) => autoOpen({
    tutorialSeen: d.user.onboardingSeen !== false,
    wizard: wizardPending(d.career),
    reward: rewardPending(d.user.dailyLogin),
  }), []);
  useEffect(() => {
    if (!readyData || autoDone) return;
    if (loc.path.startsWith(NEW) || loc.path === `${BASE}/partida` || loc.path === `${BASE}/recompensa` || loc.path === `${BASE}/boas-vindas` || wizardStepOf(loc.search)) return;
    autoDone = true;
    const to = nextAuto(readyData);
    if (to) navigate(to);
  }, [readyData, loc.path, loc.search, nextAuto]);
  // Ao fechar o tutorial ou concluir o assistente: segue a fila (ou volta ao Início).
  const continueAuto = useCallback((patch: { user?: Partial<SessionUser>; career?: Partial<Career> }) => {
    setState((s) => {
      if (s.kind !== "ready") return s;
      const d = { ...s.data, user: { ...s.data.user, ...patch.user }, career: { ...s.data.career, ...patch.career } };
      const to = nextAuto(d);
      queueMicrotask(() => navigate(to || `${BASE}/`, { replace: true }));
      return { kind: "ready", data: d };
    });
  }, [nextAuto]);

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
  if (loc.path === `${BASE}/boas-vindas`) return <Tutorial onDone={() => continueAuto({ user: { onboardingSeen: true } })} />;
  // P7 — telas de entrada.
  if (loc.path === `${BASE}/jogos`) return <GamesHub home={home} cup={buildCup(data.career, data.teamById)} />;
  if (loc.path === `${BASE}/clube`) return <ClubHub home={home} board={buildBoard(data.career)} finance={buildFinance(data.career)} />;
  if (loc.path === `${BASE}/mais`) return <MoreMenu onLogout={async () => { await SessionGateway.logout(); engine.reset(); navigate(`${BASE}/`, { replace: true }); load(); }} />;
  // Assistente de início: a tela do passo + a barra "Passo N de 4".
  const wzStep = wizardStepOf(loc.search);
  const wizard = wzStep && loc.path === wzStep.path && data.career.startupWizardSeen === false && (
    <WizardBar key={wzStep.n} step={wzStep} onFinished={() => continueAuto({ career: { startupWizardSeen: true } })} />
  );
  // Comissão técnica (05/11): aba lateral no Início, Escalação e Pré-jogo,
  // com carreira carregada e fora do assistente e da sessão expirada.
  const commission = !wzStep && !expired && [`${BASE}/`, `${BASE}/escalacao`, `${BASE}/pre-jogo`].includes(loc.path) && <CommissionTab onChanged={reloadCareer} />;
  return <>{route()}{wizard}{commission}{sessionSheet}</>;

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
    const ini = q.get("iniciar");
    const start = ini === "1" ? "jogo" : ini === "amistoso" ? "amistoso" : ini === "copa" ? "copa" : null;
    return <Match start={start} sub={sub} outId={q.get("sai")} competitionId={data.career.competitionId} competitionName={home.competition}
      teamById={data.teamById} onFinished={reloadCareer}
      renderTable={(ctx) => <Table m={buildTable(data.career, data.teamById, q.get("divisao"))} cup={buildCup(data.career, data.teamById)} match={ctx} />} />;
  }
  // Fase 10 — abas Jogos e Mais.
  {
    const q = new URLSearchParams(loc.search);
    const c = data.career, tb = data.teamById;
    if (loc.path === `${BASE}/copa`) return <CupScreen career={c} teamById={tb} phase={q.get("fase")} />;
    if (loc.path === `${BASE}/estatisticas`) return <StatsScreen career={c} teamById={tb} scope={q.get("escopo") === "campeonato" ? "campeonato" : "time"} period={q.get("periodo") === "historico" ? "historico" : "temporada"} />;
    if (loc.path === `${BASE}/retrospecto`) return <H2HScreen key={q.get("id") || ""} career={c} teamById={tb} oppId={q.get("id") || ""} back={q.get("volta") || `${BASE}/pre-jogo`} />;
    if (loc.path === `${BASE}/premiacoes`) return <AwardsScreen career={c} teamById={tb} year={q.get("ano") ? Number(q.get("ano")) : null} />;
    if (loc.path === `${BASE}/conquistas`) return <AchievementsScreen />;
    if (loc.path === `${BASE}/ranking`) return <RankingScreen key={loc.search} tab={q.get("aba") === "amigos" ? "friends" : "all"} />;
    if (loc.path === `${BASE}/loja`) return <ShopScreen onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/loja/historico`) return <PurchaseHistoryScreen />;
    if (loc.path === `${BASE}/configuracoes`) return <SettingsScreen career={c} />;
    if (loc.path === `${BASE}/configuracoes/perfil`) return <EditProfileScreen />;
    if (loc.path === `${BASE}/ajuda`) return <HelpScreen />;
    if (loc.path === `${BASE}/saves`) return <SavesScreen career={c} />;
    if (loc.path === `${BASE}/diretoria/orcamento`) return <BudgetScreen onChanged={reloadCareer} />;
  }
  // Fase 9 — clube.
  {
    const q = new URLSearchParams(loc.search);
    if (loc.path === `${BASE}/comissao`) return <StaffScreen onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/estadio` || loc.path === `${BASE}/estadio/obra`) return <StadiumScreen key={loc.path + loc.search} work={loc.path.endsWith("/obra") ? q.get("id") : null} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/patrocinios`) return <SponsorsScreen onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/extrato`) return <LedgerScreen career={data.career} />;
    if (loc.path === `${BASE}/olheiros`) return <ScoutsScreen career={data.career} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/olheiros/contratar`) return <HireScoutScreen career={data.career} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/olheiros/missao`) return <MissionScreen key={loc.search} career={data.career} type={q.get("tipo")} scoutId={q.get("olheiro")} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/olheiros/indicacoes`) return <SuggestionsScreen career={data.career} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/olheiros/relatorios` || loc.path === `${BASE}/olheiros/prospecto`) return <ProspectsScreen key={loc.path + loc.search} career={data.career} id={loc.path.endsWith("/prospecto") ? q.get("id") : null} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/base`) return <BaseScreen career={data.career} />;
  }
  // Fase 8 — mercado.
  if (loc.path === `${BASE}/mercado` || loc.path.startsWith(`${BASE}/mercado/`)) {
    const q = new URLSearchParams(loc.search);
    const sub = loc.path.slice(`${BASE}/mercado`.length);
    const id = q.get("id") || "", cl = q.get("clube") || "";
    if (sub === "") return <Market career={data.career} />;
    if (sub === "/alvo") return <Target key={cl + id} career={data.career} clubId={cl} id={id} />;
    if (sub === "/proposta") return <Propose key={cl + id} career={data.career} clubId={cl} id={id} onChanged={reloadCareer} />;
    if (sub === "/propostas") return <MyOffers career={data.career} />;
    if (sub === "/negociacao") return <Negotiation key={id} career={data.career} id={id} onChanged={reloadCareer} />;
    if (sub === "/vendas") return <MySales career={data.career} onChanged={reloadCareer} />;
    if (sub === "/vendas/propostas") return <SaleOffers key={id} career={data.career} id={id} onChanged={reloadCareer} />;
    if (sub === "/emprestimo") return <Loan key={cl + id} career={data.career} clubId={cl || null} id={id} onChanged={reloadCareer} />;
    if (sub === "/historico") return <MarketHistory career={data.career} />;
    if (sub === "/oferta") return <PendingOffer career={data.career} onChanged={reloadCareer} />;
  }
  // Fase 7 — elenco avançado.
  {
    const q = new URLSearchParams(loc.search);
    if (loc.path === `${BASE}/elenco/ficha`) return <Ficha key={q.get("id") || ""} career={data.career} id={q.get("id") || ""} tela={q.get("tela")} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/elenco/conversa`) return <Talk key={q.get("id") || ""} career={data.career} id={q.get("id") || ""} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/elenco/comparar`) return <Compare career={data.career} a={q.get("a")} b={q.get("b")} ext={q.get("ext")} />;
    if (loc.path === `${BASE}/contratos`) return <Contracts career={data.career} onChanged={reloadCareer} />;
    if (loc.path === `${BASE}/coletiva`) return <PressStandalone back={q.get("volta") || `${BASE}/`} />;
    if (loc.path === `${BASE}/clube-elenco` || loc.path === `${BASE}/clube-elenco/jogador`) {
      const cid = q.get("id") || "";
      return <ClubRoster key={cid + loc.path} career={data.career} clubId={cid} clubName={data.teamById(cid).name} player={loc.path.endsWith("/jogador") ? q.get("jogador") : null} />;
    }
  }
  // Fase 6 — tática (pela Escalação) e treino (pelo Início e pelo Elenco).
  if (loc.path === `${BASE}/tatica`) {
    const mm = data.career.manMarking;
    const squad = data.career.squad || [];
    const mk = mm ? squad.find((p) => p.id === mm.myPlayerId) : null;
    return <TacticsHub formation={currentLineup(data.career).formation} schemes={(data.career.tacticalSchemes || []).length}
      marking={mk ? `${shortName(mk.name)} marca um adversário no próximo jogo` : null} />;
  }
  if (loc.path === `${BASE}/tatica/instrucoes`) return <TacticsAxes onSaved={reloadCareer} />;
  if (loc.path === `${BASE}/tatica/setor`) return <TacticsSectors onSaved={reloadCareer} />;
  if (loc.path === `${BASE}/tatica/esquemas`) return <TacticsSchemes onSaved={reloadCareer} />;
  if (loc.path === `${BASE}/tatica/marcacao`) return <TacticsMarking onSaved={reloadCareer} />;
  if (loc.path === `${BASE}/treino`) return <TrainingWeek onChanged={reloadCareer} />;
  if (loc.path === `${BASE}/treino/condicao`) return <TrainingCondition onChanged={reloadCareer} />;
  if (loc.path === `${BASE}/treino/evolucao`) {
    const pl = (data.career.squad || []).find((p) => p.id === new URLSearchParams(loc.search).get("id"));
    if (!pl) { queueMicrotask(() => navigate(`${BASE}/treino/condicao`, { replace: true })); return null; }
    return <Evolution key={pl.id} player={pl} />;
  }
  // Fase 5 — temporada e carreira do treinador.
  if (loc.path === `${BASE}/temporada` || loc.path === `${BASE}/demissao`) {
    // Demissão decidida e ainda não confirmada: a tela de demissão, sem
    // avançar a temporada de novo.
    if (dismissalPending(data.career)) {
      if (loc.path !== `${BASE}/demissao`) { queueMicrotask(() => navigate(`${BASE}/demissao`, { replace: true })); return null; }
      return <Dismissal career={data.career} onConfirmed={load} onExpired={() => setExpired(true)} />;
    }
    if (!seasonEnded(data.career)) { queueMicrotask(() => navigate(`${BASE}/`, { replace: true })); return null; }
    return <SeasonEnd m={buildSeasonEnd(data.career, data.teamById)} onAdvanced={reloadCareer} onExpired={() => setExpired(true)} />;
  }
  if (loc.path === `${BASE}/temporada/nova`) return <NewSeason />;
  if (loc.path === `${BASE}/proposta-clube`) {
    const om = buildClubOffer(data.career, data.teamById);
    if (!om) { queueMicrotask(() => navigate(`${BASE}/`, { replace: true })); return null; }
    return <ClubOffer m={om} onExpired={() => setExpired(true)} onDone={async (accepted) => {
      if (accepted) { await load(); navigate(`${NEW}/pronto`, { replace: true }); }
      else { await reloadCareer(); navigate(`${BASE}/`, { replace: true }); }
    }} />;
  }
  if (loc.path === `${BASE}/perfil`) return <CoachProfile career={data.career} userName={data.user.name || ""} />;
  if (loc.path === `${BASE}/historico`) return <History />;
  // Fase 4 — pós-jogo pela v2 (etapas; ?tela=tabela = "Ver tabela").
  if (loc.path === `${BASE}/pos-jogo`) {
    const q = new URLSearchParams(loc.search);
    return <PostMatch myId={String(data.career.clubId)} teamById={data.teamById} tela={q.get("tela")} onChanged={reloadCareer} onExpired={() => setExpired(true)}
      renderTable={(ctx) => <Table m={buildTable(data.career, data.teamById, q.get("divisao"))} cup={buildCup(data.career, data.teamById)} match={ctx} />} />;
  }
  // Fase 3 — a semana.
  if (loc.path === `${BASE}/semana`) {
    const a = new URLSearchParams(loc.search).get("avancar");
    return <WeekDone clubName={data.career.clubName} mode={a === "semana" || a === "jogo" ? a : null} onAdvanced={reloadCareer} onExpired={() => setExpired(true)} />;
  }
  if (loc.path === `${BASE}/amistoso`) {
    const fm = buildFriendly(data.career, data.teamById);
    if (!fm) { queueMicrotask(() => navigate(`${BASE}/`, { replace: true })); return null; }
    return <FriendlyPre m={fm} onChanged={reloadCareer} onExpired={() => setExpired(true)} />;
  }
  if (loc.path === `${BASE}/noticias`) {
    return <News m={buildNews(data.career)} />;
  }
  if (loc.path === `${BASE}/financas`) {
    return <Finance m={buildFinance(data.career)} />;
  }
  if (loc.path === `${BASE}/diretoria`) {
    return <Board m={buildBoard(data.career)} />;
  }
  if (loc.path === `${BASE}/elenco`) {
    return <Squad m={buildSquad(data.career)} career={data.career} />;
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
    return <PreMatch m={pm} myId={String(data.career.clubId)} />;
  }
  if (loc.path === `${BASE}/escalacao`) {
    return <Lineup m={buildLineup(data.career)} cta={home.cta} onFormation={async (formation) => { const o = await save({ kind: "formation", formation }); return typeof o === "string" || o === null ? o : null; }}
      onAutoLineup={async (includeBase) => {
        const r = await PrepGateway.autoLineup(includeBase);
        if (!r.ok) { if (r.motivo === "sessao") setExpired(true); return "Não foi possível escalar. Tente de novo."; }
        await reloadCareer();
        return null;
      }} />;
  }
  if (loc.path === `${BASE}/escalacao/trocar`) {
    const q = new URLSearchParams(loc.search);
    const target: SwapTarget | null = q.has("vaga") ? { kind: "starter", index: Number(q.get("vaga")) }
      : q.get("reserva") === "vazia" ? { kind: "bench-empty" }
      : q.get("reserva") ? { kind: "bench", playerId: String(q.get("reserva")) } : null;
    const m = target && Number.isInteger(target.kind === "starter" ? target.index : 0) ? buildSubstitute(data.career, target) : null;
    if (!m) {
      // Vaga/reserva que não existe mais (ex.: link antigo): volta à escalação.
      queueMicrotask(() => goBackTo(`${BASE}/escalacao`));
      return null;
    }
    const { starters, bench } = currentLineup(data.career);
    const t = m.target;
    const expectOutgoing = t.kind === "starter" ? starters[t.index] || null : t.kind === "bench" && bench.includes(t.playerId) ? t.playerId : null;
    return (
      <Substitute key={loc.search} m={m} names={Object.fromEntries((data.career.squad || []).map((p) => [p.id, p.name]))} onConfirm={async (playerId, recompose) => {
        const out = await save({ kind: "swap", target: m.target, expectOutgoing, playerId, recompose });
        if (out === null) goBackTo(`${BASE}/escalacao`);
        return out;
      }} />
    );
  }
  return <Home m={home} reward={{ pending: rewardPending(data.user.dailyLogin) }} skip={skipInfo(data.career)}
    notices={buildNotices(data.career, Date.now())}
    onNoticesOpened={() => { WeekGateway.markNoticesRead().then((r) => { if (r.ok) reloadCareer(); }); }} />;
  }
}
