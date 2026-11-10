// Sem página escondida, etapa C3 (09/11): o fechamento da rodada (jogos da
// CPU, tabela das outras divisões, fase da Copa, empréstimos que voltam,
// ajuste da escalação, finanças, mercado, notícias e a virada da semana) e a
// força do seu time em public/js/motor/fechamento.js. Avisos viram eventos.
// ANTES = cópia congelada (tests/unit/ref_fechamento_antes.js), tal e qual.
// DEPOIS = os atalhos do carreira.js atual, que chamam o motor.
// Cada lado roda num vm com o seu próprio motor (tests/e2e/_motor_vm.js) e o
// CAREER morando no módulo de estado, como na página. Os dois rodam o mesmo
// roteiro sorteado, com o mesmo Math.random; o teste compara retornos, save,
// avisos de tela e coletivas, em ordem.
// Uso: node tests/unit/test_motor_fechamento.js   (sai com 1 se algo falhar)
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

// Roteiro (o mesmo texto roda nos dois lados): monta escalação, tática,
// calendário de jogos, Copa (e as outras divisões) e joga rodadas. O jogo do
// seu time entra com placar sorteado: a partida ao vivo é da etapa D.
const ROTEIRO = (seed) => `(() => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  const F = window.BRDATA_MOTOR.fechamento;
  const forms = Object.keys(F.FORMATIONS);
  CURRENT_COMPETITION_ID = __m.comp;
  CAREER.lineup.formation = forms[Math.floor(r() * forms.length)];
  const disp = CAREER.squad.filter((p) => p.origin !== "base");
  CAREER.lineup.starters = disp.slice(0, 11).map((p) => (r() < 0.05 ? null : p.id));
  CAREER.lineup.bench = disp.slice(11, 18).map((p) => p.id);
  CAREER.lineup.tactics = Object.fromEntries(F.TACTIC_AXES.map((a) => [a.id, r() < 0.2 ? undefined : 1 + Math.floor(r() * 5)]));
  if (r() < 0.6) CAREER.lineup.sectorTactics = Object.fromEntries(F.SECTOR_IDS.map((sc) => [sc, Object.fromEntries(F.SECTOR_INSTRUCTIONS[sc].map((i) => [i.id, 1 + Math.floor(r() * 5)]))]));
  CAREER.schedule = motorModulo("calendario").generateAllRounds(LEAGUE_TEAMS.map((t) => t.id));
  CAREER.standings = motorTabela().emptyStandings(LEAGUE_TEAMS.map((t) => String(t.id)));
  CAREER.resultsByRound = {};
  if (__m.multi) initDivisionSystem();
  // Avanço rápido da Copa (save antigo no meio da temporada) só na Copa
  // expandida: na antiga, com o seu clube fora dos 16, o avanço não termina
  // (defeito anterior, registrado no relatório da C3).
  setupCup(__m.ff && __m.multi ? CAREER.currentRound : undefined);
  out.push(JSON.parse(JSON.stringify(CAREER.cup)));
  const me = teamById(CAREER.clubId);
  for (let k = 0; k < 6; k++) {
    out.push(computeHumanStrength(me), combinedTacticMod(), combinedSectorTacticMod(), tacticAxisMod("pressao", 1 + Math.floor(r() * 5)));
    const sq = leagueSquadFor(LEAGUE_TEAMS[Math.floor(r() * 20)].id);
    const xi = pickCpuXI(sq);
    out.push(xi.map((p) => p.id), injuryChanceFor(xi[0] || CAREER.squad[0]), rollInjurySeverity(), injurySeverityLabel(["leve", "media", "grave", "x"][k % 4]), shuffleWithRng([1, 2, 3, 4, 5], () => r()));
    out.push(shouldExerciseBuyOption(k % 2 ? { mandatory: true, value: 1 } : { mandatory: false, value: 10 }, { human: k % 3 === 0 }), shouldExerciseBuyOption(null, { human: false }));
  }
  out.push(simulateCupTie(LEAGUE_TEAMS[0].id, LEAGUE_TEAMS[1].id, 9), freshCareerTotals(), freshMatchBucket());
  for (let k = 0; k < 18; k++) {
    const rd = CAREER.currentRound;
    if (rd > 38) break;
    const fixtures = CAREER.schedule[rd] || [];
    const before = cloneStandings(CAREER.standings);
    const humanFx = fixtures.find((fx) => String(fx.home) === String(CAREER.clubId) || String(fx.away) === String(CAREER.clubId));
    if (!humanFx || r() < 0.15) {
      out.push(resolveRoundInstant(rd, fixtures.filter((fx) => fx !== humanFx), before));
    } else {
      const all = fixtures.filter((fx) => fx !== humanFx).map((fx) => resolveCpuFixture(fx, rd));
      const res = { home: humanFx.home, away: humanFx.away, gh: Math.floor(r() * 4), ga: Math.floor(r() * 3) };
      applyResultToStandings(res);
      all.push(res);
      out.push(finishRoundTail(rd, all, { result: res, ticketRevenue: r() < 0.5 ? { revenue: 100000 + Math.floor(r() * 9) * 50000 } : null }, before));
    }
    // perna da Copa do seu time (ao vivo na página): placar simulado, como o fim da partida faz
    const cup = CAREER.cup;
    if (cup && cup.pendingLiveLeg) {
      const { phase, leg, round } = cup.pendingLiveLeg;
      const tie = cup.ties[phase].find((t) => String(t.home) === String(CAREER.clubId) || String(t.away) === String(CAREER.clubId));
      const host = leg === 1 ? tie.home : tie.away, guest = leg === 1 ? tie.away : tie.home;
      const rr = simulateCupLeg(host, guest, round);
      const ls = leg === 1 ? tie.leg1 : tie.leg2;
      if (leg === 1) { ls.gh = rr.gh; ls.ga = rr.ga; } else { ls.gh = rr.ga; ls.ga = rr.gh; }
      cup.pendingLiveLeg = null;
      if (leg === 2) out.push(finalizeCupPhaseExpanded(phase, round, false));
    }
    out.push(myLeaguePosition());
  }
  out.push(simulatePlayerEvents(CAREER.squad.slice(0, 11), 3, CAREER.currentRound), applyMatchWearChunk(CAREER.squad.slice(0, 11), CAREER.currentRound, 0.5, new Set()));
  return out;
})()`;
// Fora da comparação: carimbos de hora e os ids com hora/sorteio.
const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "ts" && typeof v === "number" ? 1
  : typeof v === "string" ? v.replace(/^ntf_\d+_\w+$/, "ntf_X").replace(/^listingoffer_\d+_\d+$/, "listingoffer_X") : v)));

(async () => {
  // A página como antes da etapa F (a virada, a Copa, a criação e a ponte de volta a ela):
  // o resto do jogo que este teste usa de igual nos dois lados.
  const nowSrc = require("../e2e/_motor_vm").paginaComoAntes(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"), undefined, ["virada", "ponte", "jogo"]);
  const refSrc = fs.readFileSync(path.join(__dirname, "ref_fechamento_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const comuns = COMUNS.map((nm) => extract(nowSrc, nm)).join("");
  const lado = (codigo, consts) => {
    const sb = { Math: Object.create(Math), console };
    vm.createContext(sb);
    vm.runInContext("var window = globalThis; window.BRDATA_MOTOR = {};\n" + motorCode() + dataSrc + STUBS + ACESSOS + "\n" + consts + comuns + codigo + "\nouvirAvisosDoMotor();", sb);
    return sb;
  };
  // ANTES: as funções congeladas. DEPOIS: os atalhos de hoje, que chamam o motor.
  const A = lado(refSrc, acessoMotor("semana", CONSTS_C2));
  const B = lado(["motorFechamento", ...MOVIDAS].map((nm) => extract(nowSrc, nm)).join(""), acessoMotor("semana", CONSTS_C2) + acessoMotor("fechamento", CONSTS_C3));

  const rodar = (sb, mundo, seed) => {
    sb.__m = clone(mundo);
    vm.runInContext("AVISOS = []; COLETIVAS = []; CAREER = __m.career; LEAGUE_TEAMS = __m.liga; ALL_TEAMS_FLAT = __m.todos;", sb);
    sb.Math.random = seeded(seed);
    const out = vm.runInContext(ROTEIRO(seed), sb);
    return limpa({ out, career: vm.runInContext("CAREER", sb), avisos: vm.runInContext("AVISOS", sb), coletivas: vm.runInContext("COLETIVAS", sb) });
  };
  const MUNDOS = Number(process.env.MUNDOS || 120);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) { const w = makeWorld(7000 + k); runs.push([rodar(A, w, 500 + k), rodar(B, w, 500 + k)]); }

  await check(`Mesmo roteiro, mesmos retornos e o mesmo save em ${MUNDOS} mundos (rodadas com jogos da CPU, outras divisões, Copa nos dois formatos, empréstimos, escalação, força do time, finanças, mercado, notícias)`, () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.out, a.out, `retornos, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelas regras (rodadas, Copa expandida e antiga, fases decididas, outras divisões, empréstimos que voltam, trocas na escalação, lesões)", () => {
    const soma = (f) => runs.reduce((s, [a]) => s + f(a), 0);
    const log = (a, rx) => (a.career.transferLog || []).filter((e) => rx.test(e.text)).length;
    const resumos = (a) => a.out.filter((x) => x && typeof x === "object" && "allResults" in x);
    const conta = {
      rodadas: soma((a) => resumos(a).length),
      copaExpandida: soma((a) => (a.career.cup && a.career.cup.expanded ? 1 : 0)),
      copaAntiga: soma((a) => (a.career.cup && a.career.cup.expanded === false ? 1 : 0)),
      fasesDaCopa: soma((a) => resumos(a).filter((x) => x.cup).length),
      outrasDivisoes: soma((a) => (a.career.otherDivisions ? 1 : 0)),
      emprestimos: soma((a) => log(a, /empréstimo|cláusula/)),
      trocasNaEscalacao: soma((a) => resumos(a).reduce((s, x) => s + x.lineupChanges.length, 0)),
      lesoes: soma((a) => resumos(a).reduce((s, x) => s + x.allResults.reduce((t, g) => t + (g.events || []).filter((e) => e.type === "lesao").length, 0), 0)),
      noticias: soma((a) => (a.career.newsFeed || []).length),
    };
    for (const [k, v] of Object.entries(conta)) assert.ok(v > 3, `pouco de ${k}: ${JSON.stringify(conta)}`);
    console.log("   cobertura:", JSON.stringify(conta));
  });
  await check("Avisos de tela iguais e na mesma ordem (empréstimos e o resto da rodada agora saem como evento e viram o mesmo toast)", () => {
    let total = 0;
    runs.forEach(([a, b], k) => { assert.deepStrictEqual(b.avisos, a.avisos, `mundo ${k}`); total += a.avisos.length; });
    assert.ok(total > 20, `poucos avisos (${total})`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
