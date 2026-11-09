// Sem página escondida, etapa C2 (09/11): a semana sem jogo (calendário,
// treino, recuperação, obras, olheiros, mercado da CPU, propostas, anúncios
// e parcelas) em public/js/motor/semana.js, e a formatação dos textos em
// motor/texto.js. Avisos de tela e a coletiva viram eventos.
// ANTES = cópia congelada (tests/unit/ref_semana_antes.js), tal e qual.
// DEPOIS = os atalhos do carreira.js atual, que chamam o motor.
// Cada lado roda num vm com o seu próprio motor (tests/e2e/_motor_vm.js) e o
// CAREER morando no módulo de estado, como na página. Os dois rodam o mesmo
// roteiro sorteado, com o mesmo Math.random; o teste compara retornos, save,
// avisos de tela e coletivas, em ordem.
// Uso: node tests/unit/test_motor_semana.js   (sai com 1 se algo falhar)
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

// O que saiu do carreira.js (atalhos agora) — a mesma lista do extrator.
const MOVIDAS = `calendarOn calendarWeek calendarWeekMonth calendarTurnKey calendarWeekIndexOfRound syncCalendarToRound
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
// O resto do jogo que elas usam e que não mudou (igual nos dois lados).
const COMUNS = ["motorModulo", "motorTabela", "motorFinancas", "motorTreino", "motorMercado", "motorTemporada", "motorEstado",
  "motorRegistro", "motorEventos", "clamp", "avg", "teamById", "squadAvgOverallOf", "sortedStandings", "wageBillOf",
  "computeContractFields", "youthPotentialRoll", "pushNotification", "ensureObjectivesFresh", "bumpObjective"];

// Tela de mentira: guarda os toasts e a coletiva, em ordem.
const STUBS = String.raw`
var AVISOS = [], COLETIVAS = [], LIVE_SEASON = 2026;
function toast(msg, opts) { AVISOS.push([msg, opts || null]); }
function firePressConference(id, rodada, chain) { COLETIVAS.push(["coletiva", id, rodada, chain]); }
function openPressConferenceModal() { COLETIVAS.push(["abrir"]); }
`;
// O CAREER e o "mundo" moram no módulo de estado (como na página).
const ACESSOS = [["CAREER", "carreiraAtual", "definirCarreira"], ["LEAGUE_TEAMS", "ligaAtual", "definirLigaAtual"],
  ["ALL_TEAMS_FLAT", "todosTimes", "definirTodosTimes"], ["CURRENT_COMPETITION_ID", "competicaoAtual", "definirCompeticaoAtual"]]
  .map(([v, g, s]) => `Object.defineProperty(globalThis, "${v}", { configurable: true, get() { return window.BRDATA_MOTOR.estado.${g}(); }, set(x) { window.BRDATA_MOTOR.estado.${s}(x); } });`).join("\n");
// Ouvinte de avisos ANTES da C2 (só título e detalhe; a coletiva não era evento).
const OUVIR_ANTES = `function ouvirAvisosDoMotor() {
  motorEventos().ouvir("aviso", (a) => toast({ title: a.titulo, detail: a.detalhe }, a.tipo ? { type: a.tipo } : undefined));
}\n`;

// ---------- Mundo sorteado ----------
const UFS = ["SP", "RJ", "MG", "RS", "PR", "BA", "PE", "CE", "GO", "AM", "PA", "SC", "DF"];
const GROUPS = ["G", "D", "D", "D", "M", "M", "M", "F", "F"];
const PHASE_BY_MONTH = ["ferias", "pre", "temporada", "temporada", "temporada", "temporada", "pausa", "temporada", "temporada", "temporada", "temporada", "temporada"];
function makeWorld(seed) {
  const rng = seeded(seed);
  const pick = (l) => l[Math.floor(rng() * l.length)];
  let pid = 0;
  const jogador = (prefix, origin, ovrBase = 45) => {
    const overall = ovrBase + Math.floor(rng() * 42);
    const status = rng() < 0.15 ? "contundido" : rng() < 0.05 ? "suspenso" : "ok";
    return {
      id: `${prefix}_${pid++}`, name: `${pick(["Ana", "Bruno", "Caio", "Davi", "Enzo"])} ${pick(["Silva", "Souza", "Lima", "Rocha"])} ${pid}`,
      group: pick(GROUPS), age: 16 + Math.floor(rng() * 20), overall, potential: rng() < 0.1 ? null : overall + Math.floor(rng() * 15),
      atk: 30 + Math.floor(rng() * 60), def: 30 + Math.floor(rng() * 60), phys: 30 + Math.floor(rng() * 60),
      wage: Math.round((5 + overall * overall * (0.02 + rng() * 0.06)) * 1000), value: Math.round(overall * overall * (300 + rng() * 900) / 1000) * 1000,
      contractUntil: 2026 + Math.floor(rng() * 4), origin, status, outUntilRound: status === "ok" ? null : 1 + Math.floor(rng() * 8),
      injurySeverity: status === "contundido" ? pick(["leve", "media", "grave", undefined]) : null,
      condition: rng() < 0.1 ? null : 40 + Math.floor(rng() * 61), morale: 30 + Math.floor(rng() * 70),
    };
  };
  const time = (p, i, comp) => ({ id: `${p}${i}`, name: `Clube ${p}${i}`, short: `${p}${i}`.toUpperCase(), uf: rng() < 0.1 ? undefined : pick(UFS), competitionId: comp });
  const liga = Array.from({ length: 20 }, (_, i) => time("a", i, "brasileirao"));
  const outros = Array.from({ length: 20 }, (_, i) => time("b", i, i < 17 ? "serie_b" : "serie_d"));
  const meu = liga[Math.floor(rng() * 20)].id;
  const leagueSquads = {};
  [...liga, ...outros].forEach((t) => {
    if (t.id === meu) return;
    const own = t.competitionId === "brasileirao";
    const size = own ? 15 + Math.floor(rng() * 13) : 11 + Math.floor(rng() * 7);
    leagueSquads[t.id] = Array.from({ length: size }, () => jogador(t.id, "principal", rng() < 0.15 ? 70 : 45));
  });
  const standings = {};
  liga.forEach((t) => { const v = Math.floor(rng() * 10); standings[t.id] = { id: t.id, j: 10, v, e: 2, d: 8 - v, gp: 10 + Math.floor(rng() * 20), gc: 10 + Math.floor(rng() * 20), pts: v * 3 + 2, sg: 0 }; });
  const squad = Array.from({ length: 18 + Math.floor(rng() * 14) }, (_, k) => jogador("me", k < 22 ? "principal" : "base"));
  const principal = squad.filter((p) => p.origin === "principal");
  // Calendário do ano (semanas de segunda-feira), como buildSeasonCalendar.
  let calendar = null;
  if (rng() < 0.85) {
    const weeks = [];
    for (let d = new Date(Date.UTC(2026, 0, 5)); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 7 * 86400000)) {
      weeks.push({ d: `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`, p: PHASE_BY_MONTH[d.getUTCMonth()], r: null });
    }
    let round = 1;
    weeks.forEach((w) => { if (w.p === "temporada" && round <= 38) { w.r = round; if (round % 3 === 0) w.c = 1; round++; } });
    calendar = { year: 2026, idx: Math.floor(rng() * 40), weeks, tvMonthly: rng() < 0.2 ? 0 : 500000 + Math.floor(rng() * 9) * 100000 };
  }
  const roundOfIdx = (cal) => { if (!cal) return 1 + Math.floor(rng() * 37); const nx = cal.weeks.slice(cal.idx).find((w) => w.r); return nx ? nx.r : 39; };
  const alvos = Object.entries(leagueSquads).flatMap(([clubId, sq]) => sq.map((p) => ({ p, clubId })));
  const ofertaMinha = (i) => {
    const { p, clubId } = pick(alvos);
    const status = rng() < 0.2 ? "countered" : "pending";
    return {
      playerId: p.id, playerName: p.name, clubId, clubName: `Clube ${clubId}`, offerValue: Math.round(p.value * (0.5 + rng() * 0.9)),
      installments: pick([1, 1, 2, 3]), marketValue: p.value, roundsLeft: 1 + Math.floor(rng() * 2), status,
      counterValue: status === "countered" ? p.value : undefined, counterRounds: Math.floor(rng() * 4),
      rivalOffer: rng() < 0.15 ? { clubId: "a1", clubName: "Clube a1", offerValue: p.value, installments: 1 } : undefined,
    };
  };
  const scout = (i) => ({
    id: `sc${i}`, name: `Olheiro ${i}`, regionScope: rng() < 0.4 ? "any" : [pick(["sul", "sudeste", "nordeste", "norte", "centro-oeste"])],
    evaluation: rng() < 0.2 ? undefined : 1 + Math.floor(rng() * 5), network: rng() < 0.2 ? undefined : 1 + Math.floor(rng() * 5), stars: 1 + Math.floor(rng() * 5),
    monthlyCost: 5000 + Math.floor(rng() * 5) * 1000,
    mission: rng() < 0.3 ? null : { regionUf: pick(["sul", "sudeste", "nordeste"]), roundsLeft: 1 + Math.floor(rng() * 3), roundsTotal: 4, type: pick(["sub17", "sub20", "pro", "pro", undefined]), group: rng() < 0.5 ? null : pick(["G", "D", "M", "F"]), duration: pick(["curta", "media", "longa"]) },
  });
  const parcelas = () => Array.from({ length: Math.floor(rng() * 3) }, (_, k) => ({ roundsLeft: 1 + Math.floor(rng() * 3), perRoundAmount: 100000 * (1 + k), label: `Parcela ${k}` }));
  const career = {
    clubId: meu, clubName: `Clube ${meu}`, seasonYear: 2026, currentRound: roundOfIdx(calendar), standings, leagueSquads, squad, calendar,
    lineup: { starters: principal.slice(0, 11).map((p) => p.id) },
    finances: { cash: rng() < 0.15 ? 50000 : 20000000 + Math.floor(rng() * 80) * 1000000, wageCap: rng() < 0.15 ? 1 : 900000000 },
    sponsorship: rng() < 0.2 ? undefined : { master: { empresa: "M", valorTemporada: 12000000, temporadasRestantes: 2 }, material: { empresa: "N", valorTemporada: 6000000, temporadasRestantes: 1 } },
    technicalStaff: { hired: rng() < 0.5 }, scouts: Array.from({ length: Math.floor(rng() * 4) }, (_, i) => scout(i)),
    stadium: rng() < 0.3 ? undefined : { capacityBonus: 0, completed: [], pendingUpgrade: rng() < 0.6 ? { id: "u1", name: "Arquibancada", capacityGain: 3000, roundsLeft: 1 + Math.floor(rng() * 3) } : null },
    pendingOffersOut: Array.from({ length: Math.floor(rng() * 5) }, (_, i) => ofertaMinha(i)),
    pendingOffer: null,
    pendingListings: principal.slice(11, 11 + Math.floor(rng() * 3)).map((p) => ({ playerId: p.id, askingValue: Math.round(p.value * (0.8 + rng() * 1.5)), offers: [] })),
    pendingInstallments: parcelas(), pendingReceivables: parcelas(),
    recentDeclines: rng() < 0.5 ? undefined : [{ playerId: principal[0].id, clubId: "a2", round: 1 }],
    scoutSuggestions: rng() < 0.5 ? undefined : [], scoutMissionProspects: rng() < 0.5 ? undefined : [],
    marketScope: rng() < 0.5 ? "multi" : "single", trainingAppliedForRound: null,
    notificationSettings: rng() < 0.5 ? undefined : { partida: true, loja: false, lesao: rng() < 0.5 },
  };
  return { liga, todos: [...liga, ...outros], career, plano: pick(["equilibrio", "pre_jogo"]) };
}

// Roteiro (o mesmo texto roda nos dois lados). Semana sem jogo: a função da
// semana. Semana de jogo: as mesmas peças que a rodada usa (a rodada vai na C3).
const ROTEIRO = (seed) => `(() => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  const mapa = (m) => (m ? [...m.entries()] : m);
  CAREER.trainingPlan = motorTreino().defaultTrainingPlan(__m.plano);
  const ids = ALL_TEAMS_FLAT.map((t) => t.id);
  out.push(calendarOn(), calendarTurnKey(), calendarWeek(), syncCalendarToRound());
  for (const rd of [1, 2, 3, 4, 19, 20, 22, 23, 30, 38, 40]) out.push(transferWindowStatus(rd), calendarWeekIndexOfRound(rd));
  out.push(allMarketPlayers().length, marketTeamsPool().map((t) => t.id), pendingOfferOutFor((CAREER.pendingOffersOut[0] || {}).playerId));
  for (let k = 0; k < 6; k++) {
    const c = ids[Math.floor(r() * ids.length)];
    const mc = marketClub(c);
    out.push([c, isOwnDivisionTeam(c), maxSquadSizeFor(c), minSquadSizeFor(c), mc.avgOverall, mc.ambition, mc.roster.length, mc.minSize, mc.maxSize, clubPositionFactor(c), clubAmbitionFactor(c), squadForClub(c).length]);
    const p = CAREER.squad[Math.floor(r() * CAREER.squad.length)];
    out.push([subPositionOf(p), fmtBRL(p.value), fmtBRL(-p.wage), fmtBRL(0), abbreviateName(p.name), abbreviateName(""), abbreviateName("Pelé")]);
    out.push(scoutPotentialRange(p.potential || p.overall, p.overall, 1 + Math.floor(r() * 5), () => r()));
    out.push(scoutReport(p, { lo: p.overall, hi: p.overall + Math.floor(r() * 20) }, r() < 0.5 ? "pro" : "base", r() < 0.5 ? null : 70));
  }
  out.push(generateScoutProspect({ id: "x", name: "X", stars: 4, evaluation: 3 }, "sul", "k1", 0, { ages: [15, 17], group: "F" }));
  out.push(generateScoutProspect({ id: "y", name: "Y", stars: 2 }, "norte", 7, 1));
  for (let k = 0; k < 26; k++) {
    // de vez em quando, coisa nova para a semana resolver
    if (CAREER.pendingOffer) { out.push({ recebida: CAREER.pendingOffer }); if (r() < 0.6) CAREER.pendingOffer = null; }
    if (r() < 0.2 && CAREER.squad.length) CAREER.squad[Math.floor(r() * CAREER.squad.length)].status = "contundido";
    if (r() < 0.15) (CAREER.scouts || []).forEach((sc) => { if (!sc.mission) sc.mission = { regionUf: "sudeste", roundsLeft: 1, roundsTotal: 2, type: r() < 0.5 ? "pro" : "sub20", group: null, duration: "curta" }; });
    if (r() < 0.1) { const rd = CAREER.currentRound; out.push(wasRecentlyDeclined(CAREER.squad[0].id, "a2", rd), pruneRecentDeclines(rd).length); }
    if (calendarOn()) {
      const w = calendarWeek();
      if (!w) break;
      if (!w.r) { out.push(runCalendarOffWeek()); continue; }
    }
    // semana (ou rodada) de jogo: o que a rodada chama de cada peça
    const rd = CAREER.currentRound;
    out.push(mapa(applyWeeklyTraining()));
    refreshAvailability(rd);
    if (transferWindowStatus(rd).open) { simulateAiTransfers(rd); maybeGenerateOffer(rd); }
    // proposta recebida é rara (18% x interesse x negociação): tenta mais vezes
    for (let t = 0; t < 4 && !CAREER.pendingOffer; t++) maybeGenerateOffer(rd);
    resolvePendingOffersOutRound(rd);
    resolvePendingListingsRound();
    tickStadiumUpgrade();
    tickScoutMissions(rd);
    out.push(processPendingInstallments(), processPendingReceivables());
    pushLedger("teste", "Lançamento " + k, Math.floor(r() * 1000), rd);
    applyFinanceEntries([{ type: "x", label: "y", amount: 10 }], rd);
    CAREER.currentRound = rd + 1;
    refreshAvailability();
    if (calendarOn()) { syncCalendarToRound(); out.push(advanceCalendarWeek(), applyCalendarMonthlyFinances(Math.floor(r() * 12))); }
    if (CAREER.currentRound > 38) break;
  }
  // propostas resolvidas na hora (contratação direta)
  for (const o of (CAREER.pendingOffersOut || []).slice(0, 2)) out.push(finalizeIncomingPurchase(Object.assign({}, o, { offerValue: 1000, installments: r() < 0.5 ? 1 : 3 })));
  out.push(offerEffectiveValue(1000000, 3), pickRandomOtherClub(CAREER.clubId) ? 1 : 0, calendarWeekMonth({ d: "07-14" }));
  return out;
})()`;
// Fora da comparação: carimbos de hora e os ids com hora/sorteio.
const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "ts" && typeof v === "number" ? 1
  : typeof v === "string" ? v.replace(/^ntf_\d+_\w+$/, "ntf_X").replace(/^listingoffer_\d+_\d+$/, "listingoffer_X") : v)));

(async () => {
  // A página como antes da etapa F (a virada, a Copa e a criação de volta a ela):
  // o resto do jogo que este teste usa de igual nos dois lados.
  const nowSrc = require("../e2e/_motor_vm").paginaComoAntes(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"), undefined, ["virada"]);
  const refSrc = fs.readFileSync(path.join(__dirname, "ref_semana_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const comuns = COMUNS.map((nm) => extract(nowSrc, nm)).join("");
  const lado = (codigo) => {
    const sb = { Math: Object.create(Math), console };
    vm.createContext(sb);
    vm.runInContext("var window = globalThis; window.BRDATA_MOTOR = {};\n" + motorCode() + dataSrc + STUBS + ACESSOS + "\n" + comuns + codigo + "\nouvirAvisosDoMotor();", sb);
    return sb;
  };
  // ANTES: as funções congeladas. DEPOIS: os atalhos de hoje, que chamam o motor.
  const A = lado(OUVIR_ANTES + refSrc);
  const B = lado(["motorTexto", "motorSemana", "ouvirAvisosDoMotor", ...MOVIDAS].map((nm) => extract(nowSrc, nm)).join(""));

  const rodar = (sb, mundo, seed) => {
    sb.__m = clone(mundo);
    vm.runInContext("AVISOS = []; COLETIVAS = []; CAREER = __m.career; LEAGUE_TEAMS = __m.liga; ALL_TEAMS_FLAT = __m.todos;", sb);
    sb.Math.random = seeded(seed);
    const out = vm.runInContext(ROTEIRO(seed), sb);
    return limpa({ out, career: vm.runInContext("CAREER", sb), avisos: vm.runInContext("AVISOS", sb), coletivas: vm.runInContext("COLETIVAS", sb) });
  };
  const MUNDOS = 150;
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) { const w = makeWorld(9000 + k); runs.push([rodar(A, w, 300 + k), rodar(B, w, 300 + k)]); }

  await check(`Mesmo roteiro, mesmos retornos e o mesmo save em ${MUNDOS} mundos (semanas sem jogo, calendário e janela, treino, lesões, obras, olheiros, mercado da CPU, propostas, anúncios, parcelas e extrato)`, () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.out, a.out, `retornos, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelas regras (semanas, contratações, contrapropostas, propostas recebidas, indicações e jovens dos olheiros, obras e CPU x CPU)", () => {
    const soma = (f) => runs.reduce((s, [a]) => s + f(a), 0);
    const log = (a, rx) => (a.career.transferLog || []).filter((e) => rx.test(e.text)).length;
    const conta = {
      semanas: soma((a) => a.out.filter((x) => x && typeof x === "object" && "phase" in x).length),
      contratacoes: soma((a) => log(a, /^Você contratou/)),
      recusas: soma((a) => log(a, /recusou sua proposta/)),
      cpu: soma((a) => log(a, / contratou .* do /)),
      obras: soma((a) => log(a, /^Obra concluída/)),
      olheiros: soma((a) => log(a, /voltou da missão/)),
      contrapropostas: soma((a) => (a.career.pendingOffersOut || []).filter((o) => o.status === "countered").length),
      recebidas: soma((a) => a.out.filter((x) => x && typeof x === "object" && "recebida" in x).length),
      anuncios: soma((a) => (a.career.pendingListings || []).reduce((s, l) => s + l.offers.length, 0)),
      jovens: soma((a) => (a.career.scoutMissionProspects || []).length),
      indicacoes: soma((a) => (a.career.scoutSuggestions || []).length),
    };
    for (const [k, v] of Object.entries(conta)) assert.ok(v > 3, `pouco de ${k}: ${JSON.stringify(conta)}`);
    console.log("   cobertura:", JSON.stringify(conta));
  });
  await check("Avisos de tela iguais e na mesma ordem (agora saem como evento e viram o mesmo toast, com texto solto ou título e detalhe)", () => {
    let total = 0;
    runs.forEach(([a, b], k) => { assert.deepStrictEqual(b.avisos, a.avisos, `mundo ${k}`); total += a.avisos.length; });
    assert.ok(total > 100, `poucos avisos (${total})`);
  });
  await check("Coletiva depois de contratação grande (overall 82+): mesma pergunta, na mesma rodada e na mesma ordem, agora pelo evento \"coletiva\"", () => {
    let total = 0;
    runs.forEach(([a, b], k) => { assert.deepStrictEqual(b.coletivas, a.coletivas, `mundo ${k}`); total += a.coletivas.length; });
    assert.ok(total >= 4, `poucas coletivas (${total})`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
