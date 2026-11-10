/* ===================================================================
   MOTOR — ENTRADA, GRAVAÇÃO E OS COMANDOS RESTANTES DA PONTE (plano
   "sem página escondida", etapa G1c2, 10/11)
   -------------------------------------------------------------------
   - a entrada: a conta (/api/auth/me fica com quem hospeda), o convite e
     o retorno da loja pendentes, a carga do save, a liga e os times das
     3 divisões pela API (ou os de exemplo), a migração de save antigo
     (enterAfterAuth, loadLeague, loadOtherCompetitionsTeams,
     migrateCareerDefaults);
   - gravar (persistCareer, ponteGravar);
   - o estado que a ponte mostra à v2 (ponteEstado) e os comandos
     restantes: competições, criar carreira, recompensa diária, loja, nome
     do técnico, demissão, proposta de clube, gravar de novo, ação no
     jogador, comissão, modelo de treino, avisos lidos e som;
   — sem mudar o texto. A rede vai direto à API (fetch, mesma origem).
   A conta, a fonte de dados, a temporada real e a herança do técnico
   moram em motor/estado.js. Desenho, telas, sons e modais da página
   antiga viram o evento "tela".
=================================================================== */
import { carreiraAtual, definirCarreira, ligaAtual, definirLigaAtual, todosTimes, definirTodosTimes, competicaoAtual, definirCompeticaoAtual, partidaAtual, definirPartida, coletivaPendente, definirColetivaPendente } from "./estado.js";
import { emitir } from "./eventos.js";
import { LIVE_MATCH_CHUNK_MINUTES, MAX_SUBS_PER_MATCH, freshTeamStats } from "./aovivo.js";
import { SCOUT_MARKET, applyBoostEffect, markLineupDirty, pushPurchaseHistory } from "./clube.js";
import { FORMATIONS, SECTOR_IDS, SECTOR_INSTRUCTIONS, TACTIC_AXES, freshCareerTotals, myLeaguePosition } from "./fechamento.js";
import { ponteAvisar, ponteFim } from "./jogo.js";
import { BOOST_ITEMS, nextOpponentId, ponte } from "./ponte.js";
import { SUBPOS_LABEL, allMarketPlayers, ambiente, avisar, subPositionOf, syncCalendarToRound, transferWindowStatus } from "./semana.js";
import { abbreviateName, fmtBRL } from "./texto.js";
import { ALL_COMPETITIONS_ORDER, autoLineup, backfillPlayerPotential, buildLeagueSquads, buildSquad, computeBoardGoal, defaultSectorTactics, ensureUniquePlayerIds, evaluateAlwaysCheckableAchievements, initSponsorship, initialStadium, setupCup } from "./virada.js";
import * as financas from "./financas.js";
import * as mercado from "./mercado.js";
import * as treino from "./treino.js";
import * as temporada from "./temporada.js";
import * as partida from "./partida.js";
import * as tabela from "./tabela.js";
import * as registro from "./registro.js";
import * as estado from "./estado.js";
import * as calendario from "./calendario.js";
import * as rodada from "./rodada.js";
import * as semana from "./semana.js";
import * as fechamento from "./fechamento.js";
import * as aovivo from "./aovivo.js";
import * as posjogo from "./posjogo.js";
import * as clube from "./clube.js";
import * as virada from "./virada.js";
import * as texto from "./texto.js";
import * as jogo from "./jogo.js";
import { desenharTudo, desenharPartida, lerTaticaDaTela } from "./jogo.js";

// Desenho, telas, sons e modais da página antiga: o evento "tela", na mesma ordem.
function tela(nome, ...args) { emitir("tela", { nome, args }); }

// Espelho de showGameScreen (como os da G1b): no modo ponte, a lógica do
// desenho e avisar a v2 que a carreira está pronta; fora dele, o desenho.
function mostrarJogo() {
  if (ambiente.modoPonte()) {
    desenharTudo();
    ponte.pronta = true;
    ponteAvisar();
    return;
  }
  tela("showGameScreen");
}

function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null; }
function bumpObjective(category, objectiveId, amount) {
  return registro.bumpObjective(category, objectiveId, amount);
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function computeContractFields(overall, age, potential, rng) {
  return temporada.computeContractFields(overall, age, potential, rng, estado.temporadaReal());
}
function countTitlesThisSeason(award) {
  return temporada.countTitlesThisSeason(award, CAREER.clubId);
}
function defaultTrainingPlan(schemeId) { return treino.defaultTrainingPlan(schemeId); }
function ensureObjectivesFresh() {
  return registro.ensureObjectivesFresh();
}
function freshAchievementsState() {
  return registro.freshAchievementsState();
}
function initialFinances(squad) {
  return financas.initialFinances(squad);
}
function localDateStr(d) { return registro.localDateStr(d); }
function pushNotification(type, text, opts = {}) {
  return registro.pushNotification(type, text, opts);
}
function teamById(id) {
  return estado.timePorId(id);
}
function technicalStaffMonthlyCost() {
  return financas.staffMonthlyCost(CAREER.squad); // 5% da folha (motor/financas.js)
}
function wageBillOf(squad) {
  // "loan" conta pro teto igual "principal" — você paga o salário
  // (reduzido) de quem pega emprestado, ver loanInPlayer. (motor/financas.js)
  return financas.wageBill(squad);
}

export const MAX_BENCH = 11;

export const CAREER_LOCAL_CRESTS = new Set(["fla", "pal", "bot", "for", "int", "sao", "cor", "cap", "cam", "flu", "san", "bra", "juv", "cui", "gre", "cru", "bah", "vas", "vit"]);

export const REPUTATION_DISMISSAL_PENALTY = 25;

export const CLUB_HISTORY_MAX = 15;

export const CAREER_COMPETITIONS = [
  { id: "brasileirao", name: "Brasileirão Série A", sub: "20 clubes — a elite do futebol brasileiro", country: "Brasil", countryCode: "BR", category: "Brasil" },
  { id: "serie_b", name: "Brasileirão Série B", sub: "20 clubes — acesso e disputa direta pela Série A", country: "Brasil", countryCode: "BR", category: "Brasil" },
  { id: "serie_c", name: "Brasileirão Série C", sub: "20 clubes — a base da pirâmide do futebol nacional", country: "Brasil", countryCode: "BR", category: "Brasil" },
];

export const PENDING_INVITE_KEY = "mt_pending_invite_code";

export const LOJA_STATUS_LABELS = {
  approved: { title: "Pagamento aprovado!", detail: "Seus Créditos BR já devem estar disponíveis.", type: "pos" },
  pending: { title: "Pagamento pendente", detail: "Assim que for confirmado (pode levar alguns instantes, principalmente no Pix), os créditos aparecem sozinhos.", type: "warn" },
  in_process: { title: "Pagamento em análise", detail: "Vamos confirmar e creditar automaticamente assim que possível.", type: "warn" },
  rejected: { title: "Pagamento não aprovado", detail: "Você pode tentar de novo na Loja com outro cartão ou pelo Pix.", type: "warn" },
};

export const DAILY_LOGIN_CYCLE = [
  { day: 1, reward: { type: "coins", amount: 500 } },
  { day: 2, reward: { type: "coins", amount: 800 } },
  { day: 3, reward: { type: "boost", amount: 0 } },
  { day: 4, reward: { type: "coins", amount: 1200 } },
  { day: 5, reward: { type: "scout_token", amount: 0 } },
  { day: 6, reward: { type: "coins", amount: 1800 } },
  { day: 7, reward: { type: "premium_pack", amount: 3000 } },
];

export const DAILY_LOGIN_REWARD_ICON = { coins: "🪙", boost: "💪", scout_token: "🔎", premium_pack: "🎁" };

export const COMMISSION_AREAS = [
  { id: "lineup", label: "Escalação", icon: "⚽", fn: suggestLineup },
  { id: "training", label: "Treinos", icon: "🏋️", fn: suggestTraining },
  { id: "tactics", label: "Tática", icon: "🧭", fn: suggestTactics },
  { id: "market", label: "Mercado", icon: "💰", fn: suggestMarket },
];

export async function fetchJSON(url, opts) {
  tela("beginActionLoading");
  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => null);
    if (!res.ok) { const e = new Error(data?.error || `Falha em ${url}`); e.status = res.status; e.code = data?.code; throw e; }
    return data;
  } finally {
    tela("endActionLoading");
  }
}

export function calibrateStrengths(standings) {
  const withGames = standings.filter((r) => r.j > 0);
  if (!withGames.length) return {};
  const leagueAvg = withGames.reduce((s, r) => s + r.gp / r.j, 0) / withGames.length || 1;
  const out = {};
  standings.forEach((r) => {
    const gfpg = r.j ? r.gp / r.j : leagueAvg;
    const gapg = r.j ? r.gc / r.j : leagueAvg;
    out[r.id] = { atk: clamp(gfpg / leagueAvg, 0.5, 2.3), def: clamp(gapg / leagueAvg, 0.4, 2.3) };
  });
  return out;
}

export function normalizeNameForColor(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function realTeamColor(name) {
  const norm = normalizeNameForColor(name);
  let match = DEMO_TEAMS.find((t) => normalizeNameForColor(t.name) === norm || (t.aliases || []).some((a) => normalizeNameForColor(a) === norm));
  // AJUSTE (pedido do usuário: "alguns clubes estão com as cores de
  // fundo sem relação com o degradê proposto") — o match exato acima só
  // cobre variação de nome já REPORTADA e somada a `aliases` (ver
  // comentário em data.js); qualquer outra variação que o fornecedor de
  // dado real mande (prefixo/sufixo tipo "EC ", "SE ", "Sport Club ")
  // caía direto pro azul genérico do fallback (`crestImg`), sem
  // relação nenhuma com o clube de verdade. Antes de desistir, tenta um
  // 2º match por "contém" nos dois sentidos — seguro aqui porque
  // DEMO_TEAMS só cobre os 20 clubes fixos desta competição (não corre
  // risco de casar com um clube errado de fora da lista).
  if (!match) {
    match = DEMO_TEAMS.find((t) => {
      const candidates = [t.name, ...(t.aliases || [])].map(normalizeNameForColor).filter((c) => c.length > 3);
      return candidates.some((c) => norm.includes(c) || c.includes(norm));
    });
  }
  // BUG CORRIGIDO (pedido do usuário: "Coritiba com fundo diferente da
  // logo") — Coritiba não está em DEMO_TEAMS (Série A) porque essa
  // lista foi curada numa temporada em que ele estava na Série B; o
  // fornecedor de dado real, porém, reflete a temporada ATUAL (2026),
  // com o time já de volta à Série A — subiu/desceu de divisão sem
  // ninguém atualizar essa lista. Em vez de duplicar a cor curada nas
  // 2 listas (ou torcer pra lembrar de mover o clube certo toda vez que
  // acesso/queda mudar o elenco da Série A), busca por último também
  // em DEMO_TEAMS_SERIE_B — mesma técnica de match exato + "contém".
  if (!match) {
    match = DEMO_TEAMS_SERIE_B.find((t) => normalizeNameForColor(t.name) === norm || (t.aliases || []).some((a) => normalizeNameForColor(a) === norm));
  }
  if (!match) {
    match = DEMO_TEAMS_SERIE_B.find((t) => {
      const candidates = [t.name, ...(t.aliases || [])].map(normalizeNameForColor).filter((c) => c.length > 3);
      return candidates.some((c) => norm.includes(c) || c.includes(norm));
    });
  }
  // AJUSTE (pedido do usuário: "acrescentar a Série B, C [ao Modo
  // Carreira] com dados reais") — mesma técnica de novo, agora também
  // em DEMO_TEAMS_SERIE_C, pro caso de um time real da Série C não
  // estar coberto em nenhuma das 2 listas acima.
  if (!match) {
    match = DEMO_TEAMS_SERIE_C.find((t) => normalizeNameForColor(t.name) === norm || (t.aliases || []).some((a) => normalizeNameForColor(a) === norm));
  }
  if (!match) {
    match = DEMO_TEAMS_SERIE_C.find((t) => {
      const candidates = [t.name, ...(t.aliases || [])].map(normalizeNameForColor).filter((c) => c.length > 3);
      return candidates.some((c) => norm.includes(c) || c.includes(norm));
    });
  }
  return match ? { c1: match.c1, c2: match.c2, c3: match.c3 } : null;
}

export async function fetchCompetitionTeams(competitionId, health, opts = {}) {
  if (opts.forceDemo || !health.hasKey) {
    return { teams: (DEMO_DATA_BY_COMPETITION[competitionId] || { teams: DEMO_TEAMS }).teams, liveMode: false };
  }
  try {
    const season = health.season ? Number(health.season) || estado.temporadaReal() : estado.temporadaReal();
    const [teamsData, standingsData] = await Promise.all([
      fetchJSON(`/api/career/teams?season=${season}&competition=${competitionId}`),
      fetchJSON(`/api/career/standings?season=${season}&competition=${competitionId}`),
    ]);
    if (!teamsData.teams || !teamsData.teams.length) throw new Error("resposta vazia");
    const strengths = calibrateStrengths(standingsData.standings || []);
    const teams = teamsData.teams.map((t) => {
      const realColor = realTeamColor(t.name);
      return {
        ...t, atk: strengths[t.id]?.atk ?? 1.3, def: strengths[t.id]?.def ?? 1.05,
        c1: realColor?.c1 || "#0057B8", c2: realColor?.c2 || "#062B5C", c3: realColor?.c3,
      };
    });
    return { teams, liveMode: true };
  } catch {
    // globais vindos de js/data.js — DEMO_DATA_BY_COMPETITION não tem
    // entrada pra "serie_d" (fora de escopo por enquanto, ver
    // renderCompetitionPicker) nem pra competições de mata-mata; cai
    // em DEMO_TEAMS (Série A) só como rede de segurança bem remota.
    return { teams: (DEMO_DATA_BY_COMPETITION[competitionId] || { teams: DEMO_TEAMS }).teams, liveMode: false };
  }
}

export async function loadLeague(competitionId = "brasileirao", opts = {}) {
  definirCompeticaoAtual(competitionId);
  const health = opts.forceDemo ? { hasKey: false } : await fetchJSON("/api/health").catch(() => ({ hasKey: false }));
  if (health.season) estado.definirTemporadaReal(Number(health.season) || estado.temporadaReal());
  const { teams, liveMode } = await fetchCompetitionTeams(competitionId, health, opts);
  definirLigaAtual(teams);
  estado.definirModoReal(liveMode);
  estado.modoRealPorCompeticao()[competitionId] = liveMode;
}

export async function loadOtherCompetitionsTeams(homeCompetitionId, forceDemoMap = {}) {
  const others = ALL_COMPETITIONS_ORDER.filter((c) => c !== homeCompetitionId);
  const health = await fetchJSON("/api/health").catch(() => ({ hasKey: false }));
  const liveModeByCompetition = { [homeCompetitionId]: estado.modoReal() };
  const otherTeams = await Promise.all(others.map(async (compId) => {
    const { teams, liveMode } = await fetchCompetitionTeams(compId, health, { forceDemo: forceDemoMap[compId] });
    liveModeByCompetition[compId] = liveMode;
    estado.modoRealPorCompeticao()[compId] = liveMode;
    return teams.map((t) => ({ ...t, competitionId: compId }));
  }));
  definirTodosTimes([
    ...ligaAtual().map((t) => ({ ...t, competitionId: homeCompetitionId })),
    ...otherTeams.flat(),
  ]);
  return liveModeByCompetition;
}

export function teamLogoSrc(t) {
  if (!t) return null;
  if (t.logo) return t.logo;
  return t.id != null && CAREER_LOCAL_CRESTS.has(String(t.id)) ? `img/teams/${t.id}.svg` : null;
}

export function endCurrentClubStint(reason) {
  const CAREER = carreiraAtual();
  const seasons = (CAREER.seasonHistory || []).length;
  const avgPosition = seasons
    ? Math.round(CAREER.seasonHistory.reduce((s, y) => s + y.position, 0) / seasons)
    : myLeaguePosition();
  const titles = (CAREER.seasonAwards || []).reduce((n, a) => n + countTitlesThisSeason(a), 0);
  const clubHistory = (CAREER.clubHistory || []).slice();
  clubHistory.unshift({ clubId: CAREER.clubId, clubName: CAREER.clubName, seasons, titles, avgPosition, reason });
  if (clubHistory.length > CLUB_HISTORY_MAX) clubHistory.length = CLUB_HISTORY_MAX;
  let reputation = CAREER.reputation == null ? 50 : CAREER.reputation;
  if (reason === "dismissed") reputation = clamp(reputation - REPUTATION_DISMISSAL_PENALTY, 0, 100);
  estado.definirHerancaDoTecnico({ reputation, clubHistory });
}

export async function persistCareer() {
  const CAREER = carreiraAtual();
  if (!CAREER) return false;
  // Etapa B: o módulo grava e devolve o motivo; os avisos ficam aqui.
  const r = await estado.gravarSave(CAREER, fetchJSON);
  if (r.ok) return true;
  const err = { status: r.status, message: r.mensagem };
  // BUG CORRIGIDO: qualquer falha (sessão expirada, save grande
  // demais, rede) caía nessa mesma mensagem genérica de "tente de
  // novo em instantes" — mas sessão expirada NUNCA se resolve
  // tentando de novo, só logando de novo (relato real do usuário:
  // erro ao simular rodada, sem conseguir salvar mais nada depois).
  // Loga o motivo real no console pra dar pra investigar sem precisar
  // acesso ao servidor, e distingue sessão expirada do resto.
  console.error("[carreira] falha ao salvar progresso:", err.status, err.message);
  // Carreira 2.0 (AUD-02): a ponte informa à v2 se foi sessão expirada
  // ou outra falha. No modo ponte esta página é um quadro invisível — a
  // tela de login daqui não seria vista; a v2 mostra o próprio aviso.
  ponte.erroGravacao = r.motivo === "sessao" ? "sessao" : "falha";
  if (r.motivo === "sessao" && ambiente.modoPonte()) {
    // (sem toast/troca de tela: ver acima)
  } else if (r.motivo === "sessao") {
    avisar("Sua sessão expirou — faça login de novo pra continuar salvando.", { type: "warn" });
    tela("show", "screenLoginRequired");
  } else if (r.motivo === "grande") {
    // SAVE-LIMIT-001 — antes disso era literalmente um beco sem saída
    // ("reinicie a carreira"). Agora o servidor já comprime o save
    // (gzip, ~92-95% menor na prática — ver careerStore.js) e ainda
    // poda automaticamente histórico não-essencial antes de recusar
    // salvar (nunca elenco/contratos/tabela/finanças) — chegar aqui
    // significa que MESMO DEPOIS dessas 2 camadas o save continua
    // grande demais, cenário que a medição real (ver
    // tests/e2e/sim_save_growth.js) não encontrou em nenhuma
    // simulação de várias temporadas. Por isso o texto não manda
    // mais reiniciar a carreira — tentar de novo pode resolver (pico
    // temporário), e persistindo é sinal de bug de verdade, não de
    // "carreira grande demais" como intenção normal do jogo.
    avisar("Não deu pra salvar agora — o servidor tentou reduzir o histórico da carreira automaticamente e mesmo assim não coube. Tentando de novo deve resolver; se continuar acontecendo, é um bug — nos avise.", { durationMs: 6000, type: "warn" });
  } else {
    // Código/motivo aparecem no toast de propósito (mesmo sendo mais
    // "técnico" do que o ideal pro usuário final): sem acesso aos
    // logs do servidor daqui, é a forma mais rápida de descobrir a
    // causa real de um erro que não é nem sessão expirada nem save
    // grande demais — quem estiver vendo isso pode repassar o texto.
    const detail = err.status ? `erro ${err.status}${err.message ? " — " + err.message : ""}` : (err.message || "sem conexão com o servidor");
    avisar({ title: "Não deu pra salvar o progresso agora", detail: `${detail} — tente de novo em instantes.` }, { type: "warn" });
  }
  return false;
}

export async function startCareer(clubId) {
  const club = ligaAtual().find((t) => String(t.id) === String(clubId));
  if (!club) return;
  tela("estiloDe", "clubGrid", "opacity", "0.5");
  tela("estiloDe", "clubGrid", "pointerEvents", "none");
  tela("desabilitar", "btnConfirmClub", true);
  try {
    // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das
    // 3 ligas para que transações possam ser feitas entre os 60 times
    // das Séries A, B e C") — carrega os times das OUTRAS 2
    // competições (a da própria carreira já está em ligaAtual()) e
    // monta o elenco dos 59 outros times das 3 séries juntas, não só
    // os 19 da divisão escolhida — ver loadOtherCompetitionsTeams/
    // buildLeagueSquads. liveModeByCompetition grava a fonte de dado
    // (real ou exemplo) de CADA UMA das 3, pro mesmo tipo de trava do
    // bug "Time #xxx" (ver loadLeague) valer aqui também, competição
    // por competição, quando essa carreira for retomada depois.
    const [liveModeByCompetition, squad] = await Promise.all([
      loadOtherCompetitionsTeams(competicaoAtual()),
      buildSquad(club),
    ]);
    // buildLeagueSquads depende de todosTimes() (populada por
    // loadOtherCompetitionsTeams acima) — não dá pra paralelizar com
    // ela, só com buildSquad (que não depende de nada disso).
    const leagueSquads = await buildLeagueSquads(club.id, todosTimes());
    // Etapa F (09/11): a regra da criação (o save novo, o calendário, as
    // divisões, a meta, a Copa e o patrocínio) mora em motor/virada.js
    // (montarCarreira); aqui ficam a carga dos dados e a tela.
    virada.montarCarreira(club, squad, leagueSquads, liveModeByCompetition);
    estado.definirHerancaDoTecnico(null);
    await persistCareer();
    tela("openFirstEntry");
  } finally {
    tela("estiloDe", "clubGrid", "opacity", "");
    tela("estiloDe", "clubGrid", "pointerEvents", "");
  }
}

export function applyTrainingScheme(id) {
  const CAREER = carreiraAtual();
  CAREER.trainingSchemeId = id;
  CAREER.trainingPlan = defaultTrainingPlan(id);
  persistCareer();
}

export async function consumePendingInviteIfAny() {
  let code;
  try { code = sessionStorage.getItem(PENDING_INVITE_KEY); } catch { return; }
  if (!code) return;
  try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { }
  if (!estado.conta() || code === estado.conta().friendCode) return; // convite do próprio código (ex.: o dono testando o link) -- ignora em silêncio
  try {
    const data = await fetchJSON("/api/friends/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    estado.conta().friends = data.friends;
    avisar({ title: "Amigo adicionado!", detail: "Vocês já podem se comparar no Ranking." }, { type: "pos" });
  } catch {
    // Código inválido/expirado -- o técnico só clicou num link, não foi
    // uma ação que ele possa "corrigir" na hora, então fica em
    // silêncio; ainda dá pra adicionar manualmente depois no Ranking.
  }
}

export function captureLojaReturnStatus() {
  try {
    const params = new URLSearchParams(location.search);
    const status = params.get("collection_status") || params.get("status");
    if (!status) return null;
    ["collection_status", "status", "payment_id", "collection_id", "external_reference", "payment_type", "merchant_order_id", "preference_id", "site_id", "processing_mode"].forEach((k) => params.delete(k));
    const clean = location.pathname + (params.toString() ? `?${params}` : "") + location.hash;
    history.replaceState(null, "", clean);
    return status;
  } catch { return null; }
}

export async function handleLojaReturnIfAny() {
  const status = captureLojaReturnStatus();
  if (!status) return;
  const info = LOJA_STATUS_LABELS[status] || { title: "Pagamento em processamento", detail: "Vamos confirmar o status assim que possível.", type: "info" };
  avisar({ title: info.title, detail: info.detail }, { type: info.type });
  if (status !== "approved") return;
  // Webhook costuma já ter rodado a essa altura, mas Pix pode demorar
  // alguns segundos — reconsulta agora e de novo um pouco depois, só
  // pra refletir o saldo novo sem o técnico precisar recarregar a mão.
  const refresh = async () => {
    try { const me = await fetchJSON("/api/auth/me"); if (me.authenticated) estado.conta().creditsBR = me.user.creditsBR; } catch { }
  };
  await refresh();
  ambiente.agendar(refresh, 4000);
}

export function applyDailyLoginReward(reward) {
  const CAREER = carreiraAtual();
  // BUG CORRIGIDO (dia 7, 03/11/2026): o servidor (users.js) manda o
  // "pacote de elite" sem `amount` ({ type: "premium_pack", id: … }) e o
  // caixa virava NaN (gravado como null no save). Sem valor válido vindo
  // do servidor, usa o do ciclo deste mesmo arquivo (DAILY_LOGIN_CYCLE).
  if (!Number.isFinite(reward.amount)) {
    const fromCycle = (DAILY_LOGIN_CYCLE.find((d) => d.reward.type === reward.type) || {}).reward;
    reward = { ...reward, amount: fromCycle && Number.isFinite(fromCycle.amount) ? fromCycle.amount : 0 };
  }
  if (reward.type === "coins") {
    CAREER.finances.cash += reward.amount;
    pushPurchaseHistory(DAILY_LOGIN_REWARD_ICON.coins, "Recompensa diária: moedas do clube", "Login diário", `+${fmtBRL(reward.amount)}`, "credit");
    return { icon: DAILY_LOGIN_REWARD_ICON.coins, detail: `+${fmtBRL(reward.amount)}` };
  }
  if (reward.type === "boost") {
    CAREER.squad.forEach((p) => { p.morale = clamp((p.morale == null ? 70 : p.morale) + 8, 0, 100); });
    pushPurchaseHistory(DAILY_LOGIN_REWARD_ICON.boost, "Boost de moral usado", "Recompensa do login diário", "USADO");
    pushNotification("loja", "Boost de moral do elenco usado (recompensa do login diário).", { gateBy: "loja" });
    return { icon: DAILY_LOGIN_REWARD_ICON.boost, detail: "Moral do elenco em alta" };
  }
  if (reward.type === "scout_token") {
    // Só quem ainda tem potencial NÃO revelado (senão o prêmio seria
    // desperdiçado revelando de novo alguém já revelado).
    const base = CAREER.squad.filter((p) => p.origin === "base" && p.potential != null && !p.scoutRevealed);
    if (base.length) {
      const p = base[Math.floor(Math.random() * base.length)];
      p.scoutRevealed = true;
      pushPurchaseHistory(DAILY_LOGIN_REWARD_ICON.scout_token, "Olheiro extra usado", `Potencial de ${abbreviateName(p.name)} revelado`, "USADO");
      return { icon: DAILY_LOGIN_REWARD_ICON.scout_token, detail: `Potencial de ${abbreviateName(p.name)} revelado` };
    }
    CAREER.finances.cash += 500; // sem ninguém da base pra revelar, cai pra um pequeno bônus em dinheiro
    pushPurchaseHistory(DAILY_LOGIN_REWARD_ICON.scout_token, "Recompensa diária: bônus em dinheiro", "Sem jogador da base pra revelar", "+R$ 500", "credit");
    return { icon: DAILY_LOGIN_REWARD_ICON.scout_token, detail: "+R$ 500 (sem jogador da base pra revelar)" };
  }
  // premium_pack
  CAREER.finances.cash += reward.amount;
  CAREER.squad.forEach((p) => {
    p.morale = clamp((p.morale == null ? 70 : p.morale) + 8, 0, 100);
    p.condition = clamp((p.condition == null ? 100 : p.condition) + 15, 0, 100);
  });
  pushPurchaseHistory(DAILY_LOGIN_REWARD_ICON.premium_pack, "Pacote de elite usado", "Moral e condição recuperadas", `+${fmtBRL(reward.amount)}`, "credit");
  pushNotification("loja", "Pacote de elite usado (recompensa do login diário).", { gateBy: "loja" });
  return { icon: DAILY_LOGIN_REWARD_ICON.premium_pack, detail: `+${fmtBRL(reward.amount)} · moral e condição recuperadas` };
}

export async function handlePlayerAction(id, act) {
  const CAREER = carreiraAtual();
  const p = CAREER.squad.find((x) => x.id === id);
  if (!p) return;
  // FASE 1 (item 1) — abre o sub-modal de renovação POR CIMA do
  // detalhe (mesmo padrão do confirmModal, que também abre em cima de
  // qualquer outra modal já aberta) — não fecha nem mexe em nada aqui,
  // quem decide o que muda é proposeRenewal().
  if (act === "renew") { tela("openRenewModal", id); return; }
  // FASE 4 (item 1) — "conversa individual", mesmo padrão de sub-modal
  // aberto POR CIMA do detalhe (ver openTalkModal/applyTalkOption).
  if (act === "talk") { tela("openTalkModal", id); return; }
  // FASE 3 (item 3) — mesmo padrão do "renew" acima: abre o sub-modal
  // de configuração do empréstimo POR CIMA do detalhe, sem mexer em
  // nada ainda — quem decide o que muda é confirmLoanFromModal().
  if (act === "loanout") { tela("openLoanOutModal", id); return; }
  // Nova feature (Bloco 3, 3/4) — "Colocar à venda", mesmo padrão do
  // "loanout" acima: abre o sheet de anúncio POR CIMA do detalhe, sem
  // mexer em nada ainda — quem decide é confirmListFromModal() (ou,
  // se já tiver anúncio ativo, abre "Minhas vendas" direto).
  if (act === "sell") { tela("openListModal", id); return; }
  // Nova feature — Comparar jogadores (ver openComparePicker).
  if (act === "compare") { tela("openComparePicker", id); return; }
  if (act === "removeStarter") {
    CAREER.lineup.starters = CAREER.lineup.starters.map((x) => (x === id ? null : x));
  } else if (act === "removeBench") {
    CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== id);
  } else if (act === "addBench") {
    if (CAREER.lineup.bench.length < MAX_BENCH) CAREER.lineup.bench.push(id);
  } else if (act === "promote") {
    // FASE 2 (b) — mesmo teto salarial checado em openDetail (que já
    // desabilita o botão) — reforçado aqui pro caso de handlePlayerAction
    // ser chamado de algum outro lugar no futuro sem passar por lá.
    if (wageBillOf(CAREER.squad) + p.wage > CAREER.finances.wageCap) {
      avisar(`Promover esse jogador estouraria o teto salarial (${fmtBRL(CAREER.finances.wageCap)}).`, { type: "warn" });
      return;
    }
    p.origin = "principal";
    // Retenção/Engajamento — "revelar" um jogador da base (objetivo de
    // temporada + conquista permanente "Joia da Base", que NUNCA
    // reseta — 2 contadores separados de propósito, ver
    // freshAchievementsState/OBJECTIVE_TEMPLATES.season).
    ensureObjectivesFresh();
    bumpObjective("season", "obj_reveal_base", 1);
    CAREER.baseRevealedCount = (CAREER.baseRevealedCount || 0) + 1;
    evaluateAlwaysCheckableAchievements();
  } else if (act === "demote") {
    p.origin = "base";
    CAREER.lineup.starters = CAREER.lineup.starters.map((x) => (x === id ? null : x));
    CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== id);
  } else if (act === "release") {
    const principalCount = CAREER.squad.filter((x) => x.origin === "principal").length;
    if (p.origin === "principal" && principalCount <= 14) { avisar("O elenco principal não pode ficar com menos de 14 jogadores.", { type: "warn" }); return; }
    CAREER.squad = CAREER.squad.filter((x) => x.id !== id);
    CAREER.lineup.starters = CAREER.lineup.starters.map((x) => (x === id ? null : x));
    CAREER.lineup.bench = CAREER.lineup.bench.filter((x) => x !== id);
  }
  // Meus esquemas — qualquer uma dessas ações pode mexer na escalação
  // (titular/banco), então desvincula do esquema salvo igual as outras
  // mutações de lineup (ver markLineupDirty).
  markLineupDirty();
  tela("fecharOverlay", "detailOverlay");
  persistCareer();
  tela("renderElenco"); tela("renderEscalacao"); tela("renderCentral"); tela("renderContratos");
}

export function suggestLineup() {
  const CAREER = carreiraAtual();
  const includeBase = ambiente.incluirBaseNaEscalacao() || false;
  const result = autoLineup(CAREER.squad, CAREER.lineup.formation, includeBase);
  const changedCount = result.starters.filter((id, i) => id !== CAREER.lineup.starters[i]).length;
  if (!changedCount) {
    return { text: "Sua escalação atual já é a melhor disponível pra esse esquema — nenhuma troca a sugerir.", canApply: false };
  }
  return {
    text: `${changedCount} posição${changedCount > 1 ? "ões" : ""} tem um titular disponível melhor pro esquema ${CAREER.lineup.formation}.`,
    canApply: true,
    apply: () => {
      CAREER.lineup.starters = result.starters;
      CAREER.lineup.bench = result.bench;
      markLineupDirty();
      persistCareer();
      tela("renderPitch"); tela("renderBench");
    },
  };
}

export function suggestTraining() {
  const CAREER = carreiraAtual();
  const round = CAREER.currentRound;
  const principal = CAREER.squad.filter((p) => p.origin === "principal" || p.origin === "loan");
  const avgCond = avg(principal.map((p) => p.condition == null ? 100 : p.condition)) ?? 100;
  let schemeId;
  if (round === 1) schemeId = "pretemporada";
  else if (avgCond < 70) schemeId = "recuperacao";
  else schemeId = "equilibrio";
  const scheme = treino.TRAINING_SCHEMES.find((s) => s.id === schemeId);
  if (CAREER.trainingSchemeId === schemeId) {
    return { text: `Já está no esquema recomendado (${scheme.name}) — condição média do elenco: ${Math.round(avgCond)}%.`, canApply: false };
  }
  return {
    text: `Esquema recomendado: ${scheme.name} — condição média do elenco: ${Math.round(avgCond)}%.`,
    canApply: true,
    apply: () => { applyTrainingScheme(schemeId); },
  };
}

export function suggestTactics() {
  const CAREER = carreiraAtual();
  const opponentId = nextOpponentId();
  if (!opponentId) return { text: "Sem próximo jogo definido agora — volte quando houver um confronto marcado.", canApply: false };
  const myClub = teamById(CAREER.clubId);
  const opp = teamById(opponentId);
  // GE-BALANCE-003 (issue #30) — ver comentário em simulateCupLeg.
  const lambdaMine = myClub.atk * opp.def;
  const lambdaOpp = opp.atk * myClub.def;
  const ratio = lambdaMine / lambdaOpp;
  let targetLevel, label;
  if (ratio > 1.15) { targetLevel = 4; label = `postura mais OFENSIVA — seu time é favorito contra o ${opp.name}`; }
  else if (ratio < 0.87) { targetLevel = 2; label = `postura mais CAUTELOSA — o ${opp.name} é favorito nesse confronto`; }
  else { targetLevel = 3; label = `manter o padrão equilibrado — times parelhos contra o ${opp.name}`; }
  const axesToSet = ["ritmo", "pressao", "linhaDefensiva"];
  const t = CAREER.lineup.tactics;
  const alreadyThere = axesToSet.every((id) => (t[id] || 3) === targetLevel);
  if (alreadyThere) return { text: `Recomendação: ${label}. Sua tática já está ajustada assim.`, canApply: false };
  return {
    text: `Recomendação pro próximo jogo: ${label}.`,
    canApply: true,
    apply: () => {
      axesToSet.forEach((id) => { CAREER.lineup.tactics[id] = targetLevel; });
      markLineupDirty();
      persistCareer();
    },
  };
}

export function suggestMarket() {
  const CAREER = carreiraAtual();
  if (!transferWindowStatus(CAREER.currentRound).open) {
    return { text: "Janela de contratações fechada agora — sem sugestão de reforço.", canApply: false };
  }
  const starters = CAREER.lineup.starters.map((id) => id && CAREER.squad.find((p) => p.id === id)).filter(Boolean);
  if (!starters.length) return { text: "Defina a escalação titular na aba Tática antes.", canApply: false };
  const weakest = starters.slice().sort((a, b) => a.overall - b.overall)[0];
  const subpos = subPositionOf(weakest);
  const candidates = allMarketPlayers()
    .filter(({ p, mine }) => !mine && subPositionOf(p) === subpos && p.overall > weakest.overall && p.value <= CAREER.finances.cash)
    .sort((a, b) => a.p.value - b.p.value);
  if (!candidates.length) {
    return { text: `Nenhum reforço claramente melhor e dentro do caixa pra ${SUBPOS_LABEL[subpos]} agora (titular mais fraco na posição: ${weakest.name}, overall ${weakest.overall}).`, canApply: false };
  }
  const best = candidates[0];
  return {
    text: `${best.p.name} (${best.club.name}, overall ${best.p.overall}) por ${fmtBRL(best.p.value)} reforçaria ${SUBPOS_LABEL[subpos]} — seu titular mais fraco lá é ${weakest.name} (${weakest.overall}).`,
    canApply: true,
    // Fase 9 (Carreira 2.0) — alvo da sugestão, para a v2 abrir a proposta.
    target: { clubId: String(best.club.id), playerId: best.p.id },
    // AJUSTE (pedido do usuário: "no Mercado deu certo mas precisa
    // funcionar também na Comissão Técnica") — Mercado não compra mais
    // na hora em lugar NENHUM do jogo (ver Bloco 3, openOfferModal/
    // confirmOfferFromModal): "aceitar" esta sugestão abre a MESMA
    // tela de proposta real, já com o jogador/clube certos, em vez de
    // fechar negócio direto (o antigo atalho instantâneo, buyPlayer,
    // foi removido — sem outro chamador depois desta mudança).
    apply: async () => { tela("openOfferModal", best.club.id, best.p.id); },
  };
}

export function migrateScoutsToNational() {
  const CAREER = carreiraAtual();
  (CAREER.scouts || []).forEach((sc) => {
    const cand = SCOUT_MARKET.find((c) => c.id === sc.marketId);
    if (cand) { sc.specialty = cand.specialty; sc.regionScope = cand.regionScope; }
    if (sc.evaluation == null) sc.evaluation = cand ? cand.evaluation : (sc.stars || 3);
    if (sc.network == null) sc.network = cand ? cand.network : (sc.stars || 3);
  });
}

export function migrateCareerDefaults() {
  const CAREER = carreiraAtual();
  // AJUSTE (pedido do usuário: "acrescentar a Série B, C [ao Modo
  // Carreira] com dados reais") — carreira criada ANTES do seletor de
  // campeonato existir foi sempre Série A (não tinha outra opção),
  // então "brasileirao" é o default certo aqui, não uma suposição.
  if (!CAREER.competitionId) CAREER.competitionId = "brasileirao";
  if (!CAREER.leagueSquads) CAREER.leagueSquads = {};
  // Nova feature (pedido do usuário: "atributos precisam ser mais
  // reais... evolução menos agressiva") — save de ANTES desta mudança
  // não tinha p.potential pra jogador adulto (só base sempre teve) —
  // ver bloco de comentário grande acima de buildRealPlayer/
  // backfillPlayerPotential. Sem isso, o treino desse jogador cairia
  // no fallback de 99 (sem teto de verdade) até ele ser negociado/
  // renovado — melhor corrigir todo mundo já na migração.
  CAREER.squad.forEach(backfillPlayerPotential);
  Object.values(CAREER.leagueSquads).forEach((squad) => squad.forEach(backfillPlayerPotential));
  // Nova feature — Histórico de confrontos (H2H): carreira criada ANTES
  // desta mudança nunca gravou matchLog — sem migração retroativa (não
  // dá pra reconstruir partidas já jogadas), só passa a acumular daqui
  // pra frente.
  if (!CAREER.matchLog) CAREER.matchLog = [];
  // Nova feature (pedido do usuário: "reinicie o tema do
  // rebaixamento") — decisão do usuário: "só nas carreiras novas, sem
  // migração" — carreira criada ANTES desta mudança NUNCA ganha
  // CAREER.serieDPool/divisionTeams/otherDivisions aqui (ver
  // initDivisionSystem, só chamado por startCareer), então continua
  // pra sempre sem acesso/rebaixamento — todo o resto do sistema
  // (resolveOtherDivisionsRound/applyPromotionRelegation) já checa a
  // ausência desses campos e não faz nada nesse caso.
  // Nova feature — Meus esquemas: carreira criada ANTES desta mudança
  // nunca teve biblioteca de esquemas — sem migração retroativa (não
  // dá pra reconstruir esquemas nunca salvos), só passa a existir vazia
  // daqui pra frente, igual carreira nova.
  if (!CAREER.tacticalSchemes) CAREER.tacticalSchemes = [];
  if (CAREER.activeSchemeId === undefined) CAREER.activeSchemeId = null;
  if (CAREER.manMarking === undefined) CAREER.manMarking = null;
  // Nova feature — Comissão Técnica: carreira criada ANTES desta
  // mudança nunca teve isso — nasce não-contratada (sem custo nenhum
  // até o técnico decidir contratar), igual carreira nova.
  if (!CAREER.technicalStaff) CAREER.technicalStaff = { hired: false };
  // Nova feature (Bloco 3) — negociação de compra: carreira criada
  // ANTES desta mudança nunca teve proposta pendente nem parcela de
  // contratação nenhuma — nasce vazia, igual carreira nova.
  if (!CAREER.pendingOffersOut) CAREER.pendingOffersOut = [];
  if (!CAREER.pendingInstallments) CAREER.pendingInstallments = [];
  // Nova feature (Bloco 3, 3/4) — "colocar à venda": carreira criada
  // ANTES desta mudança nunca teve anúncio nem parcela de venda a
  // receber — nasce vazia, igual carreira nova.
  if (!CAREER.pendingListings) CAREER.pendingListings = [];
  if (!CAREER.pendingReceivables) CAREER.pendingReceivables = [];
  // Nova feature — "Indicações dos olheiros": carreira criada ANTES
  // desta mudança nunca teve indicação nenhuma — nasce vazia, igual
  // carreira nova.
  if (!CAREER.scoutSuggestions) CAREER.scoutSuggestions = [];
  if (CAREER.lastScoutSearchRound === undefined) CAREER.lastScoutSearchRound = null;
  // AJUSTE (Bloco 2 M3, brtreinadorbloco2tatica.html) — tactics tinha 3
  // campos NOMEADOS (mentality/marking/tempo); vira 4 eixos NUMÉRICOS
  // 1-5 (ver TACTIC_AXES). Migra o que dá pra aproximar (tradução nossa
  // documentada, não uma equivalência perfeita — cada campo antigo
  // aponta pro eixo novo mais parecido: tempo→ritmo, mentalidade→
  // pressão E linha defensiva, já que "ofensiva" historicamente também
  // empurrava a linha pra frente); Estilo de passe não tem equivalente
  // antigo nenhum, nasce sempre neutro.
  if (CAREER.lineup && CAREER.lineup.tactics && CAREER.lineup.tactics.mentality !== undefined) {
    const old = CAREER.lineup.tactics;
    const MENT_TO_LEVEL = { defensiva: 2, equilibrada: 3, ofensiva: 4 };
    const TEMPO_TO_LEVEL = { paciente: 2, normal: 3, direto: 4 };
    CAREER.lineup.tactics = {
      ritmo: TEMPO_TO_LEVEL[old.tempo] ?? 3,
      pressao: MENT_TO_LEVEL[old.mentality] ?? 3,
      linhaDefensiva: MENT_TO_LEVEL[old.mentality] ?? 3,
      estiloPasse: 3,
    };
  }
  // Garantia geral — carreira sem tactics nenhum, ou faltando algum dos
  // 4 eixos por qualquer motivo, nasce neutra (nível 3) nesse eixo.
  if (CAREER.lineup && !CAREER.lineup.tactics) CAREER.lineup.tactics = {};
  if (CAREER.lineup) TACTIC_AXES.forEach((ax) => { if (CAREER.lineup.tactics[ax.id] == null) CAREER.lineup.tactics[ax.id] = 3; });
  // Nova feature — Instruções por setor: carreira criada ANTES desta
  // mudança nunca teve isso — nasce toda neutra (nível 3 em cada uma
  // das 15), igual carreira nova. Garante também cada instrução
  // individual (não só o objeto de cada setor) pro caso de um catálogo
  // futuro ganhar mais instruções sem quebrar save antigo.
  if (CAREER.lineup) {
    if (!CAREER.lineup.sectorTactics) CAREER.lineup.sectorTactics = defaultSectorTactics();
    SECTOR_IDS.forEach((sector) => {
      if (!CAREER.lineup.sectorTactics[sector]) CAREER.lineup.sectorTactics[sector] = {};
      SECTOR_INSTRUCTIONS[sector].forEach((instr) => {
        if (CAREER.lineup.sectorTactics[sector][instr.id] == null) CAREER.lineup.sectorTactics[sector][instr.id] = 3;
      });
    });
  }
  // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das 3
  // ligas") — carreira criada ANTES desta mudança nunca teve elenco
  // das outras 2 competições montado — marca explicitamente como
  // "single" (mercado só da própria divisão, do jeito que sempre foi)
  // pra enterAfterAuth/pickRandomOtherClub/etc. saberem que não é pra
  // tentar tratar como "multi" — decisão do usuário: sem migração
  // automática pra carreira já existente, só carreira nova nasce
  // "multi" (ver startCareer).
  if (!CAREER.marketScope) CAREER.marketScope = "single";
  // AJUSTE (pedido do usuário: "vamos evoluir o método de treinos") —
  // carreira criada ANTES desta mudança nunca teve plano de treino
  // (só o extinto CAREER.trainingFocus, um seletor só) — nasce migrada
  // pro esquema padrão "Equilíbrio Semanal", igual uma carreira nova.
  // trainingFocus em si fica órfão no save antigo (não é mais lido em
  // lugar nenhum) — inofensivo, sem precisar apagar explicitamente.
  if (!CAREER.trainingPlan) {
    CAREER.trainingSchemeId = "equilibrio";
    CAREER.trainingPlan = defaultTrainingPlan("equilibrio");
    CAREER.trainingAppliedForRound = null;
  }
  // Jogador criado antes da Fase 2b não tem wage/value/contractUntil
  // nenhum (esses campos só existem desde que buildRealPlayer/
  // buildBasePlayer/buildGeneratedProPlayer passaram a chamar
  // computeContractFields) — sem isso, wageBillOf soma 0 pra ele
  // (`p.wage || 0`) e o orçamento migrado abaixo nasceria zerado.
  const backfillContract = (p) => {
    if (p.wage == null) {
      const rng = ambiente.rngDaChave(`contract-backfill:${p.id}`);
      Object.assign(p, computeContractFields(p.overall, p.age, p.potential || null, rng));
    }
    // FASE 2 (b) — jogador criado antes da moral existir nasce no
    // mesmo neutro (70) de quem é criado hoje.
    if (p.morale == null) p.morale = 70;
    // FASE 4 (item 1) — jogador criado antes do relacionamento
    // jogador-técnico existir nasce nos mesmos valores neutros de quem
    // é criado hoje (sem histórico retroativo de banco pra reconstruir).
    if (p.benchStreak == null) p.benchStreak = 0;
    if (p.moraleReason == null) p.moraleReason = "Neutro no clube";
    if (p.moraleTrend == null) p.moraleTrend = "estavel";
    if (p.wantsTransfer == null) p.wantsTransfer = false;
    if (p.lastTalkRound === undefined) p.lastTalkRound = null;
  };
  CAREER.squad.forEach(backfillContract);
  Object.values(CAREER.leagueSquads).forEach((squad) => squad.forEach(backfillContract));
  if (!CAREER.finances) CAREER.finances = initialFinances(CAREER.squad);
  // Módulo de Estatísticas completo — save de ANTES desta mudança já
  // tinha teamStats (assists/yellow/red, "da temporada"), mas sem os
  // campos novos (clean sheets, mandante/visitante, maior goleada/
  // derrota) — preenche só o que falta, sem zerar o que já existia.
  // careerTotals/leagueChampions/sequências nascem do zero (sem como
  // reconstruir retroativamente temporadas já jogadas, mesmo critério
  // de todo contador novo desta sessão).
  if (!CAREER.teamStats) CAREER.teamStats = freshTeamStats();
  else {
    const fresh = freshTeamStats();
    Object.keys(fresh).forEach((k) => { if (CAREER.teamStats[k] === undefined) CAREER.teamStats[k] = fresh[k]; });
  }
  if (!CAREER.careerTotals) CAREER.careerTotals = freshCareerTotals();
  if (CAREER.currentWinStreak == null) CAREER.currentWinStreak = 0;
  if (CAREER.currentUnbeatenStreak == null) CAREER.currentUnbeatenStreak = 0;
  if (!CAREER.leagueChampions) CAREER.leagueChampions = [];
  if (!CAREER.transferLog) CAREER.transferLog = [];
  if (CAREER.pendingOffer === undefined) CAREER.pendingOffer = null;
  if (CAREER.lastBoardRequestRound === undefined) CAREER.lastBoardRequestRound = null;
  if (CAREER.boardDecision == null) CAREER.boardDecision = "";
  if (!CAREER.recentForm) CAREER.recentForm = [];
  if (!CAREER.seasonYear) CAREER.seasonYear = estado.temporadaReal();
  if (!CAREER.seasonHistory) CAREER.seasonHistory = [];
  // FASE 1 (item 3) — carreira criada antes dessa fase não tem meta
  // nenhuma: calcula uma pro elenco atual (mesma função de sempre) em
  // vez de deixar sem meta pro resto da temporada em andamento.
  if (!CAREER.boardGoal) CAREER.boardGoal = computeBoardGoal();
  if (CAREER.negativeSeasonsStreak == null) CAREER.negativeSeasonsStreak = 0;
  // FASE 2 (a) — carreira criada antes da Copa do Brasil existir: monta
  // um chaveamento novo e fecha por trás (fast-forward, sem prêmio nem
  // log) qualquer fase cujo round já passou nessa temporada em
  // andamento — ver comentário em setupCup.
  if (!CAREER.cup) setupCup(CAREER.currentRound);
  // FASE 4 (item 5) — carreira criada antes do patrocínio existir:
  // assina um contrato inicial de cada tipo, mesma função de sempre
  // (ver initSponsorship) — sem isso o save ficaria pra sempre sem
  // nenhum contrato (advanceSponsorshipSeason só MEXE em contrato que
  // já existe, não cria um do zero fora da virada de temporada).
  if (!CAREER.sponsorship) initSponsorship();
  // FASE 4 (item 3) — carreira criada antes das notícias da rodada:
  // sem histórico de jejum nenhum ainda, começa zerado (não tem como
  // reconstruir retroativamente quantas rodadas cada time já ficou sem
  // vencer).
  if (!CAREER.teamWinlessStreak) CAREER.teamWinlessStreak = {};
  // FASE 4 (item 6) — carreira criada antes das premiações existirem:
  // sem histórico nenhum ainda (não tem como reconstruir temporadas
  // passadas retroativamente).
  if (!CAREER.seasonAwards) CAREER.seasonAwards = [];
  // FASE 4 (item 4) — carreira criada antes da reputação existir nasce
  // no mesmo neutro (50) de quem começa hoje, sem currículo nenhum
  // (não tem como reconstruir passagens por clubes anteriores — essa
  // sempre foi a única carreira, então "sem histórico anterior" é
  // literalmente verdade aqui).
  if (CAREER.reputation == null) CAREER.reputation = 50;
  if (!CAREER.clubHistory) CAREER.clubHistory = [];
  // SAVE-LIMIT-001 — save antigo, de antes do CLUB_HISTORY_MAX existir,
  // pode ter mais entradas que o cap novo; normaliza aqui também (não
  // só na próxima troca de clube), mesmo tratamento de compatibilidade
  // que qualquer outro *_MAX já recebe.
  else if (CAREER.clubHistory.length > CLUB_HISTORY_MAX) CAREER.clubHistory.length = CLUB_HISTORY_MAX;
  if (!CAREER.clubProposals) CAREER.clubProposals = [];
  // AJUSTE — carreira criada antes do feed de notícias existir nasce
  // vazio (não tem como reconstruir manchetes de rodadas já passadas).
  if (!CAREER.newsFeed) CAREER.newsFeed = [];
  // FASE 4 (item 2) — carreira criada antes da coletiva de imprensa
  // existir nasce sem histórico nenhum (não tem como reconstruir
  // coletivas de jogos já passados retroativamente).
  if (!CAREER.pressLog) CAREER.pressLog = [];
  if (CAREER.metaRiskWarnedSeason === undefined) CAREER.metaRiskWarnedSeason = null;
  // Retenção/Engajamento — carreira criada antes deste bloco existir
  // nasce com objetivos/conquistas do zero (ensureObjectivesFresh já
  // cuida de gerar os 3 grupos na hora certa); contadores lifetime/
  // temporada começam em 0, sem reconstrução retroativa (mesmo padrão
  // de sempre nesta função pra dado que não dá pra recuperar do
  // histórico já resumido).
  ensureObjectivesFresh();
  if (!CAREER.achievements) CAREER.achievements = freshAchievementsState();
  if (CAREER.baseRevealedCount == null) CAREER.baseRevealedCount = 0;
  if (CAREER.titlesWonNacional == null) CAREER.titlesWonNacional = 0;
  if (CAREER.titlesWonCopa == null) CAREER.titlesWonCopa = 0;
  if (CAREER.seasonTeamGoals == null) CAREER.seasonTeamGoals = 0;
  if (CAREER.seasonTeamFouls == null) CAREER.seasonTeamFouls = 0;
  // Bloco 4 — carreira criada antes do reskin da tela Clube nasce sem
  // mini-gráfico de caixa, extrato e melhorias de estádio: mesmo motivo
  // de sempre pra não reconstruir retroativo, começam do zero a partir
  // daqui (ver cashHistory/financeLedger/stadium em startCareer).
  if (!CAREER.cashHistory) CAREER.cashHistory = [];
  if (!CAREER.financeLedger) CAREER.financeLedger = [];
  if (!CAREER.stadium) CAREER.stadium = initialStadium();
  // Bloco 6 — carreira criada antes de "Base e Olheiros" existir nasce
  // sem nenhum olheiro contratado e sem promissor nenhum encontrado —
  // mesmo motivo de sempre, sem retroativo pra reconstruir.
  if (!CAREER.scouts) CAREER.scouts = [];
  if (!CAREER.scoutMissionProspects) CAREER.scoutMissionProspects = [];
  // Bloco 8 pendentes — Central de notificações/Configurações: carreira
  // criada antes disso existir nasce sem feed nenhum (mesmo motivo de
  // sempre — não dá pra reconstruir eventos já passados) e com os 3
  // toggles de notificação nos MESMOS defaults do mockup (Lembrete de
  // partida e Alertas de lesão ligados, Ofertas da loja desligado).
  if (!CAREER.notifications) CAREER.notifications = [];
  if (!CAREER.notificationSettings) CAREER.notificationSettings = { partida: true, loja: false, lesao: true };
  // Bloco 7 pendentes — Histórico de compras: mostra USO real de
  // itens/recompensas (ver applyDailyLoginReward), não uma compra de
  // verdade — a Loja ainda não cobra nada (ver aviso grande em
  // renderLoja). Nasce vazio, sem reconstrução retroativa.
  if (!CAREER.purchaseHistory) CAREER.purchaseHistory = [];
  // Assistente de início — carreira criada ANTES desta mudança nasce
  // com o assistente já "visto" (não aparece sozinho no meio de uma
  // temporada em andamento) — só carreira NOVA a partir de agora passa
  // por ele (ver startCareer/maybeOpenStartupWizard).
  if (CAREER.startupWizardSeen === undefined) CAREER.startupWizardSeen = true;
  // P0-IDS-001 — saves de antes desta correção podem ter ids repetidos.
  ensureUniquePlayerIds();
  // GE-SCOUT-001 — olheiros já contratados viram nacionais com Avaliação/Rede.
  migrateScoutsToNational();
  // GE-CALENDAR-001 — sem campo novo pra carreira antiga (ganha o
  // calendário na próxima virada); com calendário, garante coerência.
  syncCalendarToRound();
  evaluateAlwaysCheckableAchievements();
}

export function ponteJogador(id) {
  const CAREER = carreiraAtual();
  const p = id ? CAREER.squad.find((x) => x.id === id) : null;
  return p ? { id: p.id, nome: p.name, grupo: p.group, overall: p.overall, status: p.status || "ok", voltaRodada: p.outUntilRound ?? null, condicao: p.condition ?? null } : null;
}

export function ponteEstado() {
  const CAREER = carreiraAtual();
  const lm = partidaAtual() || ponte.ultimo;
  if (!ponte.pronta) return { fase: "carregando" };
  if (!CAREER) return { fase: "sem-carreira" };
  // Pós-jogo (depois de "Continuar" na v2): a sequência de sempre roda nesta
  // página; termina quando não há mais modal aberto nem partida ao vivo
  // (a perna da Copa, se houver, também é jogada aqui, como hoje).
  if (ponte.posJogo) {
    const aberto = !!partidaAtual() || ambiente.algumModalAberto();
    return { fase: "pos-jogo", posJogo: aberto ? "em-andamento" : "concluido" };
  }
  if (!lm) return { fase: "sem-partida" };
  const n = LIVE_MATCH_CHUNK_MINUTES.length;
  const minuto = lm.chunkIndex === 0 ? 0 : LIVE_MATCH_CHUNK_MINUTES[Math.min(lm.chunkIndex, n) - 1];
  const encerrada = lm.finished || lm !== partidaAtual();
  return {
    fase: encerrada ? "encerrada" : lm.halftime ? "intervalo" : lm.paused ? "pausada" : "jogando",
    gravada: encerrada ? (ponte.fim ? ponte.fim.salvo : null) : null,
    // AUD-02: motivo da falha ("sessao" | "outra-conta" | "falha") e se uma
    // nova tentativa está em curso.
    erroGravacao: encerrada && ponte.fim && !ponte.fim.salvo ? ponte.fim.erro : null,
    salvando: !!ponte.salvando,
    resultadoPronto: encerrada && !!ponte.resumo,
    // Fase 3: amistoso encerrado → resumo da semana pronto (resumoSemana()).
    semanaPronta: encerrada && !!ponte.semana,
    minuto, segundoTempo: minuto > 45,
    contexto: lm.cupContext ? "copa" : lm.friendlyContext ? "amistoso" : "liga",
    rodada: lm.round,
    copa: lm.cupContext ? ponteCopa(lm) : null,
    mandante: { id: String(lm.home.id), nome: lm.home.name }, visitante: { id: String(lm.away.id), nome: lm.away.name },
    souMandante: !!lm.isHome, gh: lm.gh, ga: lm.ga, velocidade: lm.speed === 2 ? 2 : 1,
    substituicoes: { usadas: lm.subsUsed, total: MAX_SUBS_PER_MATCH + lm.subsBonus },
    // Escalação AO VIVO (pode diferir do save: substituições e troca de
    // esquema feitas durante o jogo só são gravadas no fim).
    escalacao: {
      formacao: CAREER.lineup.formation,
      titulares: CAREER.lineup.starters.map(ponteJogador),
      banco: CAREER.lineup.bench.map(ponteJogador).filter(Boolean),
    },
    tatica: {
      formacao: CAREER.lineup.formation,
      eixos: TACTIC_AXES.map((ax) => ({ id: ax.id, nome: ax.label, baixo: ax.lowLabel, alto: ax.highLabel, nivel: (CAREER.lineup.tactics || {})[ax.id] || 3 })),
      formacoes: Object.keys(FORMATIONS),
      penalidadeBlocos: lm.formationPenaltyChunksLeft || 0,
    },
    eventos: lm.events.map((e) => ({
      minuto: e.minute, tipo: e.type, meu: e.mine === true,
      jogador: e.player || null, assistencia: e.assistPlayer || null, entra: e.entra || null, sai: e.saiu || null, penalti: !!e.penalty,
    })),
  };
}

export async function ponteGravar() {
  const salvo = await persistCareer();
  if (salvo) desenharTudo();
  return salvo ? { ok: true } : { ok: false, motivo: ponte.erroGravacao || "falha" };
}

export function ponteCopa(lm) {
  const CAREER = carreiraAtual();
  const { tie, phase, leg } = lm.cupContext;
  const meHome = String(tie.home) === String(CAREER.clubId);
  const l1 = tie.leg1 || {};
  const ida = leg === 2 && l1.gh != null ? { meus: meHome ? l1.gh : l1.ga, deles: meHome ? l1.ga : l1.gh } : null;
  const decidida = !!lm.finished && leg === 2 && tie.winner != null;
  return {
    fase: phase, perna: leg, ida,
    penaltis: decidida ? !!tie.penalties : false,
    classificado: decidida ? (teamById(tie.winner) || {}).name || null : null,
    classificadoSouEu: decidida ? String(tie.winner) === String(CAREER.clubId) : null,
  };
}

export async function enterAfterAuth() {
  let CAREER = carreiraAtual();
  tela("show", "screenLoading");
  tela("telaDeCarga", "Carregando o Modo Técnico...");
  tela("setBootProgress", 1, 5);
  // Item 5 da lista de melhorias — estado.conta() já está garantidamente setado
  // aqui (tanto vindo de boot() quanto de submitCtLogin()), então é o
  // ponto único certo pra consumir um convite por link pendente (ver
  // capturePendingInviteFromUrl/consumePendingInviteIfAny).
  await consumePendingInviteIfAny();
  // Item 7 da lista de melhorias — mesmo raciocínio, pro retorno do
  // Checkout Pro do Mercado Pago (ver handleLojaReturnIfAny).
  await handleLojaReturnIfAny();
  const saved = { career: await estado.carregarSave(fetchJSON) };
  tela("setBootProgress", 2, 5, "Carregando sua carreira...");
  if (saved && saved.career) {
    // forceDemo só quando a carreira JÁ GRAVOU explicitamente que nasceu
    // em Modo Exemplo (liveMode === false) -- carreira bem antiga, de
    // antes desse campo existir (liveMode undefined), mantém o
    // comportamento de sempre (tenta dado real, cai pro exemplo se
    // faltar chave), sem mudança de risco pra quem nunca teve esse bug.
    const homeCompetitionId = saved.career.competitionId || "brasileirao";
    await loadLeague(homeCompetitionId, { forceDemo: saved.career.liveMode === false });
    tela("setBootProgress", 3, 5, "Carregando a competição...");
    // AJUSTE (pedido do usuário: "o mercado deve trazer jogadores das
    // 3 ligas") — carreira "multi" (ver startCareer) também recarrega
    // os times das outras 2 competições ao retomar, mesma trava de
    // forceDemo de cima, agora por competição (ver
    // liveModeByCompetition/loadOtherCompetitionsTeams): uma que já
    // gravou uma das outras 2 como Modo Exemplo nunca tenta dado real
    // sozinha pra ela. Carreira "single" (de antes desta mudança, sem
    // marketScope) não entra aqui — continua só com o mercado da
    // própria divisão, por decisão do usuário (sem migração automática).
    if (saved.career.marketScope === "multi") {
      const lm = saved.career.liveModeByCompetition || {};
      const forceDemoMap = {};
      ALL_COMPETITIONS_ORDER.forEach((c) => { if (lm[c] === false) forceDemoMap[c] = true; });
      await loadOtherCompetitionsTeams(homeCompetitionId, forceDemoMap);
    }
    tela("setBootProgress", 4, 5, "Preparando o clube...");
    CAREER = definirCarreira(saved.career);
    migrateCareerDefaults();
    // Etapa B: depois da normalização de sempre, as migrações numeradas
    // do save (schemaVersion, motor/estado.js).
    estado.migrarSave(CAREER);
    // Nova feature (pedido do usuário: "reinicie o tema do
    // rebaixamento") — CAREER.divisionTeams (quando existe) é a fonte
    // de verdade de "quem está em qual divisão agora" (ver comentário
    // grande em initDivisionSystem) — sobrescreve o que loadLeague/
    // loadOtherCompetitionsTeams acabaram de carregar do catálogo/API
    // (que não sabe nada sobre time que já subiu/desceu nesta
    // carreira) — sem efeito em carreira sem o sistema ativado.
    if (CAREER.divisionTeams) {
      definirLigaAtual(CAREER.divisionTeams[competicaoAtual()]);
      definirTodosTimes(ALL_COMPETITIONS_ORDER.flatMap((id) => CAREER.divisionTeams[id]));
    }
    // Modo ponte (motor escondido da v2): NÃO grava ao abrir. O motor pode
    // ficar aberto enquanto a v2 grava a escalação; uma gravação de abertura
    // atrasada sobrescreveria essa mudança com o save antigo. A migração em
    // memória acima é idempotente e volta a rodar na próxima abertura; o
    // save migrado é gravado no primeiro comando que grava (fim de partida).
    if (!ambiente.modoPonte()) persistCareer(); // grava os campos novos pra não migrar de novo (e de novo) a cada load
    tela("setBootProgress", 5, 5);
    mostrarJogo();
  } else {
    tela("setBootProgress", 5, 5);
    tela("renderCompetitionPicker");
    tela("show", "screenCompetitionPicker");
    // Fase 2 (Carreira 2.0): sem carreira, o motor também fica pronto — a
    // v2 cria a carreira pelos comandos escolherCompeticao/criarCarreira.
    if (ambiente.modoPonte()) { ponte.pronta = true; ponteAvisar(); }
  }
}

// Comandos restantes da ponte: entrada, conta, recompensa, loja, gravação e os que tocavam a tela (mesmo texto de window.BRDATA_PONTE).
export const comandosCarga = {
    aoMudar(cb) { ponte.ouvintes.add(cb); return () => ponte.ouvintes.delete(cb); },
    conta() { return estado.conta() && estado.conta().id != null ? String(estado.conta().id) : null; },
    versaoSave() { const CAREER = carreiraAtual(); return CAREER && CAREER.updatedAt != null ? CAREER.updatedAt : null; },
    competicoes() {
      return CAREER_COMPETITIONS.map((c) => ({ id: c.id, nome: c.name, sub: c.sub }));
    },
    async escolherCompeticao(id) {
      const CAREER = carreiraAtual();
      if (CAREER) return { ok: false, motivo: "ja-tem-carreira" };
      if (!CAREER_COMPETITIONS.some((c) => c.id === id)) return { ok: false, motivo: "competicao-invalida" };
      await loadLeague(id);
      const clubes = ligaAtual().slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((t) => ({
        id: String(t.id), nome: t.name, sigla: t.short || null, escudo: teamLogoSrc(t) || null,
        cidade: t.venue && t.venue.city ? `${t.venue.city}${t.uf ? ", " + t.uf : ""}` : null,
      }));
      return { ok: true, competicao: id, clubes };
    },
    async criarCarreira(clubId) {
      let CAREER = carreiraAtual();
      if (CAREER) return { ok: false, motivo: "ja-tem-carreira" };
      if (!ligaAtual().some((t) => String(t.id) === String(clubId))) return { ok: false, motivo: "clube-invalido" };
      if (ponte.criando) return { ok: false, motivo: "em-andamento" };
      ponte.criando = true;
      try {
        await startCareer(clubId); CAREER = carreiraAtual();
        if (!CAREER) return { ok: false, motivo: "falha" };
        const salvo = await persistCareer();
        return salvo ? { ok: true } : { ok: false, motivo: ponte.erroGravacao || "falha" };
      } finally {
        ponte.criando = false;
      }
    },
    recompensa() {
      const today = localDateStr();
      const dl = (estado.conta() && estado.conta().dailyLogin) || {};
      const recebidaHoje = dl.lastClaimDate === today;
      const dia = recebidaHoje ? (dl.currentStreakDay || 1) : (((dl.currentStreakDay || 0) % 7) + 1);
      return { dia, recebidaHoje, ciclo: DAILY_LOGIN_CYCLE.map((d) => ({ dia: d.day, tipo: d.reward.type, valor: d.reward.amount == null ? null : d.reward.amount })) };
    },
    async receberRecompensa() {
      const CAREER = carreiraAtual();
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      if (ponte.recebendo) return { ok: false, motivo: "em-andamento" };
      ponte.recebendo = true;
      try {
        const result = await fetchJSON("/api/daily-login/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ localDate: localDateStr() }) });
        estado.conta().dailyLogin = { currentStreakDay: result.currentStreakDay, lastClaimDate: localDateStr() };
        const { detail } = applyDailyLoginReward(result.reward);
        const salvo = await persistCareer();
        return { ok: salvo, motivo: salvo ? undefined : (ponte.erroGravacao || "falha"), dia: result.currentStreakDay, tipo: result.reward.type, detalhe: detail };
      } catch (err) {
        return { ok: false, motivo: err.status === 409 ? "ja-recebida" : err.status === 401 ? "sessao" : "falha", mensagem: err.message || null };
      } finally {
        ponte.recebendo = false;
      }
    },
    async comprarItem(itemId) {
      const CAREER = carreiraAtual();
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const item = BOOST_ITEMS.find((b) => b.id === itemId);
      if (!item) return { ok: false, motivo: "item-invalido" };
      let data;
      try {
        data = await fetchJSON("/api/loja/spend-credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id }) });
      } catch (err) {
        return { ok: false, motivo: "compra-recusada", mensagem: err.message || "Não deu pra concluir a compra agora." };
      }
      estado.conta().creditsBR = data.creditsBR;
      const effectLabel = applyBoostEffect(item);
      pushPurchaseHistory(item.icon, item.name, effectLabel || item.desc, `-${item.priceCredits}`, "debit");
      const g = await ponteGravar();
      return g.ok ? { ok: true, creditos: data.creditsBR, efeito: effectLabel || item.desc } : g;
    },
    async salvarNome(nome) {
      const name = String(nome || "").trim();
      if (!name) return { ok: false, motivo: "nome-vazio", mensagem: "O nome não pode ficar vazio." };
      try {
        const result = await fetchJSON("/api/account/name", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        estado.conta().name = result.user.name;
        desenharTudo();
        return { ok: true, nome: estado.conta().name };
      } catch (err) {
        return { ok: false, motivo: "nome-recusado", mensagem: err.message || "Não deu pra salvar o nome agora." };
      }
    },
    async demitir() {
      let CAREER = carreiraAtual();
      if (!CAREER || CAREER.currentRound <= 38) return { ok: false, motivo: "sem-demissao" };
      if ((CAREER.negativeSeasonsStreak || 0) < temporada.DISMISSAL_STREAK) return { ok: false, motivo: "sem-demissao" };
      endCurrentClubStint("dismissed");
      try { await fetchJSON("/api/career", { method: "DELETE" }); } catch (err) { return { ok: false, motivo: err.status === 401 ? "sessao" : "falha" }; }
      CAREER = definirCarreira(null);
      return { ok: true };
    },
    async aceitarPropostaClube() {
      let CAREER = carreiraAtual();
      const p = CAREER && (CAREER.clubProposals || [])[0];
      if (!p) return { ok: false, motivo: "sem-proposta" };
      if (!ligaAtual().some((t) => String(t.id) === String(p.clubId))) return { ok: false, motivo: "clube-invalido" };
      if (ponte.criando) return { ok: false, motivo: "em-andamento" };
      ponte.criando = true;
      try {
        endCurrentClubStint("accepted_proposal");
        await startCareer(p.clubId); CAREER = carreiraAtual();
        if (!CAREER || String(CAREER.clubId) !== String(p.clubId)) return { ok: false, motivo: "falha" };
        const salvo = await persistCareer();
        return salvo ? { ok: true } : { ok: false, motivo: ponte.erroGravacao || "falha" };
      } finally {
        ponte.criando = false;
      }
    },
    async salvarDeNovo() {
      if (!ponte.fim) return { ok: false, motivo: "sem-partida" };
      if (ponte.fim.salvo) return { ok: true };
      if (ponte.salvando) return { ok: false, motivo: "em-andamento" };
      ponte.salvando = true; ponte.erroGravacao = null; ponteAvisar();
      let ok = false;
      try {
        let me = null;
        try { me = await fetchJSON("/api/auth/me"); } catch (err) { ponte.erroGravacao = err.status === 401 ? "sessao" : "falha"; }
        if (me && !me.authenticated) ponte.erroGravacao = "sessao";
        else if (me && String(me.user.id) !== String(estado.conta() && estado.conta().id)) ponte.erroGravacao = "outra-conta";
        else if (me) ok = await persistCareer();
      } finally {
        ponte.salvando = false;
        ponteFim(ok);
      }
      if (ok) desenharTudo();
      return ok ? { ok: true } : { ok: false, motivo: ponte.fim.erro };
    },
    async acaoJogador(id, acao) {
      const CAREER = carreiraAtual();
      const p = CAREER && CAREER.squad.find((x) => x.id === id);
      if (!p) return { ok: false, motivo: "jogador-invalido" };
      if (!["removeStarter", "removeBench", "addBench", "promote", "demote", "release"].includes(acao)) return { ok: false, motivo: "acao-invalida" };
      if (acao === "addBench" && CAREER.lineup.bench.length >= MAX_BENCH) return { ok: false, motivo: "banco-cheio", mensagem: `O banco já tem ${MAX_BENCH} jogadores.` };
      if (acao === "promote" && wageBillOf(CAREER.squad) + p.wage > CAREER.finances.wageCap) return { ok: false, motivo: "teto", mensagem: `Promover esse jogador estouraria o teto salarial (${fmtBRL(CAREER.finances.wageCap)}).` };
      if (acao === "release" && p.origin === "principal" && CAREER.squad.filter((x) => x.origin === "principal").length <= 14) return { ok: false, motivo: "minimo", mensagem: "O elenco principal não pode ficar com menos de 14 jogadores." };
      await handlePlayerAction(id, acao);
      return ponteGravar();
    },
    comissao() {
      const CAREER = carreiraAtual();
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const hired = !!(CAREER.technicalStaff && CAREER.technicalStaff.hired);
      const sugestoes = hired ? COMMISSION_AREAS.map((a) => { const s = a.fn(); return { area: a.id, nome: a.label, texto: s.text, aplicavel: !!s.canApply, alvo: s.target || null }; }) : [];
      return { ok: true, contratada: hired, custoMensal: technicalStaffMonthlyCost(), sugestoes };
    },
    async aplicarSugestao(area) {
      const CAREER = carreiraAtual();
      if (!CAREER || !(CAREER.technicalStaff && CAREER.technicalStaff.hired)) return { ok: false, motivo: "sem-comissao" };
      const a = COMMISSION_AREAS.find((x) => x.id === area);
      if (!a) return { ok: false, motivo: "area-invalida" };
      const s = a.fn();
      if (!s.canApply) return { ok: false, motivo: "sem-sugestao", mensagem: s.text };
      if (area === "market") return { ok: true, alvo: s.target };
      await s.apply();
      const g = await ponteGravar();
      return g.ok ? { ok: true, texto: s.text } : g;
    },
    async aplicarModeloTreino(id) {
      const CAREER = carreiraAtual();
      if (!CAREER || !treino.TRAINING_SCHEMES.some((m) => m.id === id)) return { ok: false, motivo: "modelo-invalido" };
      applyTrainingScheme(id);
      return ponteGravar();
    },
    async marcarAvisosLidos() {
      const CAREER = carreiraAtual();
      if (!CAREER) return { ok: false, motivo: "sem-carreira" };
      const pend = (CAREER.notifications || []).filter((n) => !n.read);
      if (!pend.length) return { ok: true };
      pend.forEach((n) => { n.read = true; });
      const salvo = await persistCareer();
      if (salvo) tela("updateNotificationBadge");
      return salvo ? { ok: true } : { ok: false, motivo: ponte.erroGravacao || "falha" };
    },
    somAtivo(ligado) {
      tela("setSfxEnabled", !!ligado);
      return { ok: true, som: !!ambiente.somLigado() };
    },
};
