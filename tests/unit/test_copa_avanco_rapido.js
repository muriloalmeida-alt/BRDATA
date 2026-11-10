// Copa no formato antigo: avanço rápido de save antigo (defeito achado na
// etapa C3, corrigido em 09/11). Uma carreira de antes da Copa, carregada
// depois da rodada 6, com o seu clube fora dos 16 classificados, travava a
// página: a Copa inativa nunca é resolvida e o laço de avanço não terminava.
// ANTES = o carreira.js de hoje com a linha antiga do laço (prova o travamento
// com um limite de tempo). DEPOIS = o carreira.js de hoje.
// DEPOIS = os atalhos do carreira.js atual, que chamam o motor.
// Cada lado roda num vm com o seu próprio motor (tests/e2e/_motor_vm.js) e o
// CAREER morando no módulo de estado, como na página. Os dois rodam o mesmo
// roteiro sorteado, com o mesmo Math.random; o teste compara retornos, save,
// avisos de tela e coletivas, em ordem.
// Uso: node tests/unit/test_copa_avanco_rapido.js   (sai com 1 se algo falhar)
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
  let m = src.match(new RegExp(`^function ${name}\\(`, "m"));
  if (m) return src.slice(m.index, bloco(src.indexOf("{", src.indexOf(")", m.index)), "{", "}") + 1) + "\n";
  m = src.match(new RegExp(`^const ${name} = .*$`, "m"));
  if (m) return m[0] + "\n";
  throw new Error(`não achei ${name}`);
}


// O que saiu do carreira.js na C3 (atalhos agora).
const MOVIDAS = `finishRoundTail resolveRoundInstant autoFixLineup checkMidSeasonLoanReturns pushCashSnapshot resolveOtherDivisionsRound
resolveCupPhase myLeaguePosition resolveCpuFixture settleLoanOut settleLoanIn resolveCupPhaseExpanded resolveCupPhaseLegacy pickCpuXI
simulatePlayerEvents applyConditionRecovery shouldExerciseBuyOption simulateCupLeg finalizeCupPhaseExpanded simulateCupTie settleCupTieOutcome
applyMatchWearChunk attributeGoals computeHumanStrength shuffleWithRng freshCupTie freshCareerTotals injuryChanceFor rollInjurySeverity
injurySeverityLabel combinedTacticMod freshMatchBucket tacticAxisMod combinedSectorTacticMod`.split(/\s+/);
// O resto do jogo que elas usam (igual nos dois lados): os atalhos da semana
// (C2), a criação da Copa e das outras divisões, a tabela e o registro.
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
  ...SEMANA];

// Tela de mentira: guarda os toasts e a coletiva, em ordem.
const STUBS = String.raw`
var AVISOS = [], COLETIVAS = [], LIVE_SEASON = 2026, ME = null;
function toast(msg, opts) { AVISOS.push([msg, opts || null]); }
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

// Roteiro: copa antiga (sem as outras divisões), avanço rápido a partir de
// uma rodada sorteada; o clube pode estar entre os 16 ou fora.
const ROTEIRO = (seed, rodada) => `(() => {
  CURRENT_COMPETITION_ID = __m.comp;
  CAREER.schedule = motorModulo("calendario").generateAllRounds(LEAGUE_TEAMS.map((t) => t.id));
  CAREER.standings = motorTabela().emptyStandings(LEAGUE_TEAMS.map((t) => String(t.id)));
  CAREER.resultsByRound = {};
  CAREER.currentRound = ${rodada};
  setupCup(CAREER.currentRound);
  return JSON.parse(JSON.stringify(CAREER.cup));
})()`;
// Fora da comparação: carimbos de hora e os ids com hora/sorteio.
const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "ts" && typeof v === "number" ? 1
  : typeof v === "string" ? v.replace(/^ntf_\d+_\w+$/, "ntf_X").replace(/^listingoffer_\d+_\d+$/, "listingoffer_X") : v)));

(async () => {
  // A página como antes da etapa F (a virada, a Copa, a criação e a ponte de volta a ela):
  // o resto do jogo que este teste usa de igual nos dois lados.
  const nowSrc = require("../e2e/_motor_vm").paginaComoAntes(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"), undefined, ["virada", "ponte", "jogo"]);
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const NOVA = "while (CAREER.cup.active && CAREER.cup.phase !== \"done\" && CUP_ROUNDS[CAREER.cup.phase] < fastForwardFromRound) {";
  const VELHA = "while (CAREER.cup.phase !== \"done\" && CUP_ROUNDS[CAREER.cup.phase] < fastForwardFromRound) {";
  assert.ok(nowSrc.includes(NOVA), "a correção não está no carreira.js");
  const antesSrc = nowSrc.replace(NOVA, VELHA);
  const lado = (src) => {
    const comuns = [...COMUNS, ...MOVIDAS].map((nm) => extract(src, nm)).join("");
    const sb = { Math: Object.create(Math), console };
    vm.createContext(sb);
    vm.runInContext("var window = globalThis; window.BRDATA_MOTOR = {};\n" + motorCode() + dataSrc + STUBS + ACESSOS + "\n"
      + acessoMotor("semana", CONSTS_C2) + acessoMotor("fechamento", CONSTS_C3) + comuns + extract(src, "motorFechamento") + "\nouvirAvisosDoMotor();", sb);
    return sb;
  };
  const A = lado(antesSrc), B = lado(nowSrc);
  const rodar = (sb, mundo, seed, rodada, timeout) => {
    sb.__m = clone(mundo);
    vm.runInContext("AVISOS = []; CAREER = __m.career; LEAGUE_TEAMS = __m.liga; ALL_TEAMS_FLAT = __m.todos;", sb);
    sb.Math.random = seeded(seed);
    return vm.runInContext(ROTEIRO(seed, rodada), sb, { timeout });
  };
  // Mundos com o seu clube dentro e fora dos 16 mais fortes da divisão.
  const casos = [];
  for (let k = 0; k < 80 && casos.length < 60; k++) {
    const w = makeWorld(4000 + k);
    w.multi = false;
    for (const rodada of [3, 7, 15, 23, 31]) casos.push([w, k, rodada]);
  }
  const dentro = (cup) => cup.active;

  await check("Antes da correção: com o clube fora dos 16 e o save depois da rodada 6, o avanço rápido trava (passa do limite de tempo)", () => {
    let travou = 0, fora = 0;
    for (const [w, k, rodada] of casos) {
      const cup = rodar(B, w, 600 + k, rodada, 5000);
      if (dentro(cup) || rodada <= 6) continue;
      fora++;
      try { rodar(A, w, 600 + k, rodada, 300); } catch (e) { if (/timed out/i.test(e.message)) travou++; else throw e; }
    }
    assert.ok(fora >= 5, `poucos casos com o clube fora (${fora})`);
    assert.strictEqual(travou, fora, `travou em ${travou} de ${fora}`);
    console.log(`   travou em ${travou} de ${fora} casos (clube fora, rodada > 6)`);
  });
  await check("Depois da correção: termina sempre; com o clube fora, a Copa fica inativa e na fase inicial (nada é resolvido, como na temporada)", () => {
    let fora = 0;
    for (const [w, k, rodada] of casos) {
      const cup = rodar(B, w, 600 + k, rodada, 5000);
      if (dentro(cup)) continue;
      fora++;
      assert.strictEqual(cup.phase, "r16");
      assert.ok(cup.ties.r16.every((t) => t.winner == null) && cup.ties.qf.length === 0);
    }
    assert.ok(fora >= 5, `poucos casos com o clube fora (${fora})`);
  });
  await check("Com o clube entre os 16, nada muda: o avanço rápido fecha as mesmas fases, igual ao código de antes", () => {
    let iguais = 0;
    for (const [w, k, rodada] of casos) {
      const b = rodar(B, w, 600 + k, rodada, 5000);
      if (!dentro(b)) continue;
      const a = rodar(A, w, 600 + k, rodada, 5000);
      // Cada lado roda no seu vm: compara pelo conteúdo (JSON), não pelos protótipos.
      assert.deepStrictEqual(clone(b), clone(a), `mundo ${k}, rodada ${rodada}`);
      iguais++;
    }
    assert.ok(iguais >= 5, `poucos casos com o clube dentro (${iguais})`);
    console.log(`   ${iguais} casos com o clube dentro, iguais`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
