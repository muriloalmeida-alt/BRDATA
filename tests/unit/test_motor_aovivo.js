// Sem página escondida, etapa D1 (09/11): a partida ao vivo (início, blocos,
// substituição, tática, fim do jogo e a rodada) em public/js/motor/aovivo.js,
// com o LIVE_MATCH em motor/estado.js. O relógio, o apito e as telas ficam na
// página; avisos viram eventos.
// ANTES = cópia congelada (tests/unit/ref_aovivo_antes.js), tal e qual.
// DEPOIS = os atalhos do carreira.js atual, que chamam o motor.
// Cada lado roda num vm com o seu próprio motor (tests/e2e/_motor_vm.js) e o
// CAREER morando no módulo de estado, como na página. Os dois rodam o mesmo
// roteiro sorteado, com o mesmo Math.random; o teste compara retornos, save,
// avisos de tela e coletivas, em ordem.
// Uso: node tests/unit/test_motor_aovivo.js   (sai com 1 se algo falhar)
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { motorCode } = require("../e2e/_motor_vm");

const ROOT = path.resolve(__dirname, "../..");
let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
function extract(src, name) {
  const bloco = (i, a, f) => { let d = 0; for (let j = i; j < src.length; j++) { if (src[j] === a) d++; else if (src[j] === f && --d === 0) return j; } throw new Error("bloco"); };
  let m = src.match(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  if (m) return src.slice(m.index, bloco(src.indexOf("{", src.indexOf(")", m.index)), "{", "}") + 1) + "\n";
  m = src.match(new RegExp(`^const ${name} = .*$`, "m"));
  if (m) return m[0] + "\n";
  throw new Error(`não achei ${name}`);
}


// O que mudou no carreira.js na D1: atalhos para o motor e as funções da
// página que passaram a chamá-lo.
const MOVIDAS = `opponentMotivationMod activeManMarkingSuppression tallyTeamStats tallyMatchOutcomeStats pushRecentForm applyMoraleAfterMatch
applyNaturalAgingEvolution determineMatchPressTrigger updateLiveStats applyLiveSub applyLiveTactics freshTeamStats bumpMatchBucket
playerComplaintFactor isBigClub pressLibraryEntry attributeChances attributePenaltyMisses computeTicketRevenue stadiumUpgradeBonusFor
startLiveMatch resolveLiveChunk finishLiveMatch skipLiveMatch simulateRound`.split(/\s+/);
const FECHAMENTO = `finishRoundTail resolveRoundInstant autoFixLineup checkMidSeasonLoanReturns pushCashSnapshot resolveOtherDivisionsRound
resolveCupPhase myLeaguePosition resolveCpuFixture settleLoanOut settleLoanIn resolveCupPhaseExpanded resolveCupPhaseLegacy pickCpuXI
simulatePlayerEvents applyConditionRecovery shouldExerciseBuyOption simulateCupLeg finalizeCupPhaseExpanded simulateCupTie settleCupTieOutcome
applyMatchWearChunk attributeGoals computeHumanStrength shuffleWithRng freshCupTie freshCareerTotals injuryChanceFor rollInjurySeverity
injurySeverityLabel combinedTacticMod freshMatchBucket tacticAxisMod combinedSectorTacticMod`.split(/\s+/);
const SEMANA = `calendarOn calendarWeek calendarWeekMonth calendarTurnKey calendarWeekIndexOfRound syncCalendarToRound
applyCalendarMonthlyFinances advanceCalendarWeek runCalendarOffWeek transferWindowStatus
pushLedger applyFinanceEntries pushTransferLog processPendingInstallments processPendingReceivables
applyWeeklyTraining refreshAvailability tickStadiumUpgrade
tickScoutMissions generateScoutProspect pushScoutProspects scoutMarketFinds scoutPotentialRange scoutReport
leagueSquadFor marketTeamsPool pickRandomOtherClub isOwnDivisionTeam maxSquadSizeFor minSquadSizeFor marketClub squadForClub
clubPositionFactor clubAmbitionFactor financeiroScore transferScore necessidadeScore pickWeightedByScore
offerProbabilityFromScore urgencyMultiplier negotiateOffer calculateSellerReservationValue sellerNegotiationDecision
offerEffectiveValue wasRecentlyDeclined pruneRecentDeclines allMarketPlayers pendingOfferOutFor
simulateAiTransfers maybeGenerateOffer resolvePendingOffersOutRound maybeSpawnRivalOffer finalizeIncomingPurchase
resolvePendingListingsRound maybeSpawnListingOffer subPositionOf fmtBRL abbreviateName`.split(/\s+/);
const COMUNS = ["motorModulo", "motorPartida", "motorTabela", "motorFinancas", "motorTreino", "motorMercado", "motorTemporada", "motorEstado",
  "motorRegistro", "motorEventos", "motorTexto", "motorSemana", "ouvirAvisosDoMotor", "clamp", "avg", "teamById", "squadAvgOverallOf",
  "sortedStandings", "wageBillOf", "computeContractFields", "youthPotentialRoll", "pushNotification", "ensureObjectivesFresh", "bumpObjective",
  "positionInStandings", "applyResultToStandings", "cloneStandings", "generateRoundNews", "evaluateAlwaysCheckableAchievements",
  "setupCup", "setupCupLegacy", "setupCupExpanded", "initDivisionSystem", "freshDivisionRound", "CUP_SEED_COUNT", "ALL_COMPETITIONS_ORDER",
  "motorFechamento", "trailingWinStreak", "rankByPoints", "scheduleNextChunk", ...SEMANA, ...FECHAMENTO];

// Tela de mentira: guarda os toasts e a coletiva, em ordem.
const STUBS = String.raw`
var AVISOS = [], COLETIVAS = [], TELA = [], LIVE_SEASON = 2026, ME = null;
function toast(msg, opts) { AVISOS.push([msg, opts || null]); }
// Tela, sons e relógio da partida (ficam na página): só registram.
var V2_PONTE = false, PONTE = {};
const elemento = () => ({ classList: { add() {}, remove() {}, contains() { return false; } }, set disabled(v) {} });
var document = { getElementById: () => elemento() };
function renderLiveMatch() { TELA.push(["render", LIVE_MATCH && LIVE_MATCH.chunkIndex]); }
function playWhistle(n) { TELA.push(["apito", n]); }
function startCrowdAmbience() { TELA.push(["torcida"]); }
function stopCrowdAmbience() { TELA.push(["silencio"]); }
function queueGoalHighlights(goals) { TELA.push(["destaque", goals.length]); }
function setTimeout(fn, ms) { TELA.push(["timer", ms]); return 1; }
function clearTimeout() {}
async function persistCareer() { return true; }
function ponteFim() {}
function ponteAvisar() {}
function renderAll() {}
function showMatchDetailModal(s) { TELA.push(["detalhe", s.round]); }
function firePressConference(id, rodada, chain) { COLETIVAS.push(["coletiva", id, rodada, chain]); }
function openPressConferenceModal() { COLETIVAS.push(["abrir"]); }
`;
const ACESSOS = [["CAREER", "carreiraAtual", "definirCarreira"], ["LEAGUE_TEAMS", "ligaAtual", "definirLigaAtual"],
  ["ALL_TEAMS_FLAT", "todosTimes", "definirTodosTimes"], ["CURRENT_COMPETITION_ID", "competicaoAtual", "definirCompeticaoAtual"]]
  .map(([v, g, s]) => `Object.defineProperty(globalThis, "${v}", { configurable: true, get() { return window.BRDATA_MOTOR.estado.${g}(); }, set(x) { window.BRDATA_MOTOR.estado.${s}(x); } });`).join("\n");
// As constantes que viraram atalhos (C2 e C3) leem do motor nos dois lados,
// menos as da C3 no lado ANTES, que vêm da cópia congelada.
const CONSTS_C2 = `CALENDAR_PHASE_BY_MONTH CALENDAR_PHASE_LABEL CALENDAR_WINDOW_PHASES MONTH_LONG TRANSFER_LOG_MAX INJURY_RETURN_CONDITION UF_TO_REGION
REGION_LABEL SCOUT_MISSION_TYPES SCOUT_MISSION_DURATIONS SCOUT_PROSPECTS_MAX SCOUT_NOTE_POOL SCOUT_MAX_SUGGESTIONS MAX_LEAGUE_SQUAD MIN_LEAGUE_SQUAD
MAX_LEAGUE_SQUAD_OTHER_DIVISION MIN_LEAGUE_SQUAD_OTHER_DIVISION DECLINE_COOLDOWN_ROUNDS OFFER_CHANCE_PER_ROUND RIVAL_OFFER_CHANCE_PER_ROUND
LISTING_MAX_OFFERS LISTING_OFFER_CHANCE_PER_ROUND LISTING_BUYER_ANCHOR_CAP MAX_PRINCIPAL SUBPOS_LABEL`.split(/\s+/);
const CONSTS_D1 = `OPPONENT_MOTIVATION_STREAK_STEPS MAN_MARKING_SUPPRESS_FACTOR RECENT_FORM_MAX TALK_BENCH_STREAK_THRESHOLD WANTS_TRANSFER_BENCH_STREAK
WANTS_TRANSFER_MORALE_MAX PRESS_META_RISK_GAP PRESS_PRIORITY PRESS_ALWAYS_IDS PRESS_CHANCE_BY_ID LIVE_MATCH_CHUNK_MINUTES
LIVE_TACTICS_FAMILIARITY_PENALTY_CHUNKS MAX_SUBS_PER_MATCH MAX_MATCH_LOG PRIME_AGE_MIN BIG_CLUB_NAME_FRAGMENTS PRESS_LIBRARY`.split(/\s+/);
const CONSTS_C3 = `CASH_HISTORY_MAX CUP_ROUNDS_EXPANDED CUP_ROUNDS CUP_PHASES CPU_XI_MIX CUP_PHASES_EXPANDED CUP_PRIZE INJURY_HISTORY_MAX
INJURY_SEVERITY FORMATIONS FORMATION_MOD TACTIC_AXES TACTIC_AXIS_DELTA SECTOR_IDS SECTOR_INSTRUCTIONS`.split(/\s+/);
const acessoMotor = (mod, nomes) => nomes.map((n) => `Object.defineProperty(globalThis, "${n}", { configurable: true, get() { return window.BRDATA_MOTOR.${mod}.${n}; } });`).join("\n") + "\n";

// ---------- Mundo sorteado ----------
const GROUPS = ["G", "D", "D", "D", "M", "M", "M", "F", "F"];
function makeWorld(seed) {
  const rng = seeded(seed);
  const pick = (l) => l[Math.floor(rng() * l.length)];
  let pid = 0;
  const jogador = (prefix, origin, ovrBase = 45) => {
    const overall = ovrBase + Math.floor(rng() * 42);
    const status = rng() < 0.12 ? "contundido" : rng() < 0.05 ? "suspenso" : "ok";
    return {
      id: `${prefix}_${pid++}`, name: `${pick(["Ana", "Bruno", "Caio", "Davi", "Enzo"])} ${pick(["Silva", "Souza", "Lima", "Rocha"])} ${pid}`,
      group: pick(GROUPS), age: 16 + Math.floor(rng() * 20), overall, potential: overall + Math.floor(rng() * 15),
      atk: 30 + Math.floor(rng() * 60), def: 30 + Math.floor(rng() * 60), phys: 30 + Math.floor(rng() * 60),
      wage: Math.round((5 + overall * overall * (0.02 + rng() * 0.06)) * 1000), value: Math.round(overall * overall * (300 + rng() * 900) / 1000) * 1000,
      contractUntil: 2026 + Math.floor(rng() * 4), origin, status, outUntilRound: status === "ok" ? null : 1 + Math.floor(rng() * 8),
      injurySeverity: status === "contundido" ? pick(["leve", "media", "grave"]) : null,
      condition: rng() < 0.1 ? null : 40 + Math.floor(rng() * 61), morale: 30 + Math.floor(rng() * 70),
      yellowCards: Math.floor(rng() * 3),
    };
  };
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  const ordem = ["brasileirao", "serie_b", "serie_c"];
  const time = (c, i) => ({ id: `${c.slice(0, 3)}${i}`, name: `Clube ${c}${i}`, short: `${c}${i}`.toUpperCase(), uf: pick(["SP", "RJ", "MG", "RS", "BA"]), competitionId: c,
    atk: 0.8 + rng() * 0.9, def: 0.8 + rng() * 0.6 });
  const porComp = Object.fromEntries(ordem.map((c) => [c, Array.from({ length: 20 }, (_, i) => time(c, i))]));
  const liga = porComp[comp];
  const todos = ordem.flatMap((c) => porComp[c]);
  const meu = liga[Math.floor(rng() * 20)].id;
  const leagueSquads = {};
  todos.forEach((t) => {
    if (t.id === meu) return;
    const own = t.competitionId === comp;
    leagueSquads[t.id] = Array.from({ length: own ? 16 + Math.floor(rng() * 10) : 12 + Math.floor(rng() * 5) }, () => jogador(t.id, "principal", rng() < 0.15 ? 70 : 45));
  });
  const squad = Array.from({ length: 22 + Math.floor(rng() * 8) }, (_, k) => jogador("me", k < 24 ? "principal" : "base"));
  // empréstimos: seus jogadores emprestados a outros clubes e jogadores que você pegou
  const outros = todos.filter((t) => t.id !== meu);
  for (let k = 0; k < Math.floor(rng() * 3); k++) {
    const c = pick(outros), p = jogador("emp", "principal");
    Object.assign(p, { onLoanFromClubId: meu, loanReturnRound: 1 + Math.floor(rng() * 30), loanBuyOption: rng() < 0.5 ? null : { mandatory: rng() < 0.5, value: 1000000 + Math.floor(rng() * 9) * 1000000 } });
    leagueSquads[c.id].push(p);
  }
  for (let k = 0; k < Math.floor(rng() * 3); k++) {
    const c = pick(outros), p = jogador("peg", "loan");
    Object.assign(p, { loanFromClubId: c.id, loanOriginalWage: p.wage * 2, loanReturnRound: 1 + Math.floor(rng() * 30), loanBuyOption: rng() < 0.5 ? null : { mandatory: rng() < 0.5, value: 1000000 + Math.floor(rng() * 20) * 1000000 } });
    squad.push(p);
  }
  return {
    liga, todos, comp, multi: rng() < 0.6, ff: rng() < 0.25, plano: rng(),
    career: {
      clubId: meu, clubName: `Clube ${meu}`, seasonYear: 2026, currentRound: 1 + Math.floor(rng() * 20), leagueSquads, squad, calendar: null,
      lineup: { starters: [], bench: [] }, finances: { cash: rng() < 0.15 ? 50000 : 30000000 + Math.floor(rng() * 50) * 1000000, wageCap: rng() < 0.2 ? 1 : 900000000 },
      sponsorship: { master: { empresa: "M", valorTemporada: 12000000, temporadasRestantes: 2 }, material: { empresa: "N", valorTemporada: 6000000, temporadasRestantes: 1 } },
      technicalStaff: { hired: rng() < 0.5 }, scouts: [], stadium: { capacityBonus: 0, completed: [], pendingUpgrade: null },
      pendingOffersOut: [], pendingOffer: null, pendingListings: [], pendingInstallments: [], pendingReceivables: [],
      marketScope: rng() < 0.5 ? "multi" : "single", trainingAppliedForRound: null, newsFeed: [],
      notificationSettings: { partida: rng() < 0.7, loja: false, lesao: true },
      teamStats: undefined, careerTotals: rng() < 0.5 ? undefined : null,
    },
  };
}

// Roteiro (o mesmo texto roda nos dois lados): monta escalação, tática e
// calendário e joga rodadas pela função da rodada. Partida ao vivo: alguns
// blocos um a um (com o intervalo), substituição e tática no meio, e o resto
// com "pular pro fim", como a ponte da v2 faz.
const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  const foto = (lm) => (lm ? JSON.parse(JSON.stringify(lm, (k, v) => (v instanceof Set ? [...v] : v))) : lm);
  const F = window.BRDATA_MOTOR.fechamento;
  const forms = Object.keys(F.FORMATIONS);
  CURRENT_COMPETITION_ID = __m.comp;
  CAREER.lineup.formation = forms[Math.floor(r() * forms.length)];
  const disp = CAREER.squad.filter((p) => p.origin !== "base");
  CAREER.lineup.starters = disp.slice(0, 11).map((p) => p.id);
  CAREER.lineup.bench = disp.slice(11, 18).map((p) => p.id);
  CAREER.lineup.tactics = Object.fromEntries(F.TACTIC_AXES.map((a) => [a.id, 1 + Math.floor(r() * 5)]));
  CAREER.schedule = motorModulo("calendario").generateAllRounds(LEAGUE_TEAMS.map((t) => t.id));
  CAREER.standings = motorTabela().emptyStandings(LEAGUE_TEAMS.map((t) => String(t.id)));
  CAREER.resultsByRound = {};
  CAREER.currentUnbeatenStreak = Math.floor(r() * 12);
  CAREER.recentForm = Array.from({ length: Math.floor(r() * 6) }, () => [0, 1, 3][Math.floor(r() * 3)]);
  if (__m.multi) initDivisionSystem();
  setupCup();
  if (r() < 0.3) CAREER.manMarking = { opponentId: "x", rivalPlayerId: "y" };
  for (let k = 0; k < 4; k++) {
    if (CAREER.currentRound > 38) break;
    const ret = simulateRound();
    out.push(ret === "live" ? "live" : ret);
    const lm = LIVE_MATCH;
    if (!lm) continue;
    out.push(foto(lm));
    const passos = 1 + Math.floor(r() * 4);
    for (let b = 0; b < passos && !lm.finished; b++) {
      resolveLiveChunk();
      out.push([lm.chunkIndex, lm.gh, lm.ga, lm.halftime || false, lm.paused]);
      if (r() < 0.5) {
        const sai = CAREER.lineup.starters[Math.floor(r() * 11)];
        const entra = CAREER.lineup.bench[Math.floor(r() * CAREER.lineup.bench.length)];
        out.push(applyLiveSub(lm, sai, entra), applyLiveSub(lm, "ninguem", entra));
      }
      if (r() < 0.4) applyLiveTactics(lm, r() < 0.5 ? CAREER.lineup.formation : forms[Math.floor(r() * forms.length)], { pressao: 1 + Math.floor(r() * 5), ritmo: 1 + Math.floor(r() * 5) });
    }
    lm.halftime = false; lm.paused = false;
    skipLiveMatch();
    await new Promise((ok) => setImmediate(ok));
    out.push(foto(lm), LIVE_MATCH);
  }
  out.push(opponentMotivationMod(), computeTicketRevenue(teamById(CAREER.clubId)), stadiumUpgradeBonusFor(teamById(CAREER.clubId)), isBigClub(LEAGUE_TEAMS[0]), pressLibraryEntry("15"), freshTeamStats());
  return out;
})()`;
// Fora da comparação: carimbos de hora e os ids com hora/sorteio.
const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "ts" && typeof v === "number" ? 1
  : typeof v === "string" ? v.replace(/^ntf_\d+_\w+$/, "ntf_X").replace(/^listingoffer_\d+_\d+$/, "listingoffer_X") : v)));

(async () => {
  // A página como antes da etapa F (a virada, a Copa, a criação e a ponte de volta a ela):
  // o resto do jogo que este teste usa de igual nos dois lados.
  const nowSrc = require("../e2e/_motor_vm").paginaComoAntes(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"), undefined, ["virada", "ponte", "jogo", "carga"]);
  const refSrc = fs.readFileSync(path.join(__dirname, "ref_aovivo_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const comuns = COMUNS.map((nm) => extract(nowSrc, nm)).join("");
  const lado = (codigo, consts) => {
    const sb = { Math: Object.create(Math), console, setImmediate };
    vm.createContext(sb);
    vm.runInContext("var window = globalThis; window.BRDATA_MOTOR = {};\n" + motorCode() + dataSrc + STUBS + ACESSOS + "\n" + consts + comuns + codigo + "\nouvirAvisosDoMotor();", sb);
    return sb;
  };
  // ANTES: as funções congeladas. DEPOIS: os atalhos de hoje, que chamam o motor.
  const A = lado(refSrc, acessoMotor("semana", CONSTS_C2) + acessoMotor("fechamento", CONSTS_C3));
  const B = lado(["motorAoVivo", ...MOVIDAS].map((nm) => extract(nowSrc, nm)).join("")
    + 'Object.defineProperty(globalThis, "LIVE_MATCH", { configurable: true, get() { return window.BRDATA_MOTOR.estado.partidaAtual(); }, set(v) { window.BRDATA_MOTOR.estado.definirPartida(v); } });\n',
    acessoMotor("semana", CONSTS_C2) + acessoMotor("fechamento", CONSTS_C3) + acessoMotor("aovivo", CONSTS_D1));

  const rodar = async (sb, mundo, seed) => {
    sb.__m = clone(mundo);
    vm.runInContext("AVISOS = []; COLETIVAS = []; TELA = []; LIVE_MATCH = null; CAREER = __m.career; LEAGUE_TEAMS = __m.liga; ALL_TEAMS_FLAT = __m.todos;", sb);
    sb.Math.random = seeded(seed);
    const out = await vm.runInContext(ROTEIRO(seed), sb);
    return limpa({ out, career: vm.runInContext("CAREER", sb), avisos: vm.runInContext("AVISOS", sb), coletivas: vm.runInContext("COLETIVAS", sb), tela: vm.runInContext("TELA", sb) });
  };
  const MUNDOS = Number(process.env.MUNDOS || 120);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) { const w = makeWorld(8000 + k); runs.push([await rodar(A, w, 900 + k), await rodar(B, w, 900 + k)]); }

  await check(`Mesmo roteiro, mesmos retornos, a mesma partida e o mesmo save em ${MUNDOS} mundos (rodadas com partida ao vivo: blocos, intervalo, substituição, tática, pular pro fim, fim do jogo, coletiva e fechamento)`, () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.out, a.out, `retornos e partida, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelas regras (partidas, intervalo, gols, substituições, troca de esquema, coletivas, renda em casa)", () => {
    const soma = (f) => runs.reduce((s, [a]) => s + f(a), 0);
    const conta = {
      partidas: soma((a) => a.out.filter((x) => x === "live").length),
      intervalos: soma((a) => a.out.filter((x) => Array.isArray(x) && x[3] === true).length),
      gols: soma((a) => a.tela.filter((t) => t[0] === "destaque").length),
      substituicoes: soma((a) => (a.career.matchLog || []).length ? a.out.filter((x) => x === null).length : 0),
      coletivas: soma((a) => a.coletivas.length),
      detalhes: soma((a) => a.tela.filter((t) => t[0] === "detalhe").length),
      historico: soma((a) => (a.career.matchLog || []).length),
    };
    for (const [k, v] of Object.entries(conta)) assert.ok(v > 3, `pouco de ${k}: ${JSON.stringify(conta)}`);
    console.log("   cobertura:", JSON.stringify(conta));
  });
  await check("Tela, sons e relógio na mesma ordem (desenho, apito, torcida, destaque de gol, timers, detalhe do jogo) e os mesmos avisos e coletivas", () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.tela, a.tela, `tela, mundo ${k}`);
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos, mundo ${k}`);
      assert.deepStrictEqual(b.coletivas, a.coletivas, `coletivas, mundo ${k}`);
    });
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
