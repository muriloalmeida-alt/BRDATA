// Sem página escondida, etapa E (09/11): as ações de mercado e de clube em
// public/js/motor/clube.js. Avisos viram o evento "aviso" e o que a página
// fazia depois de cada ação (gravar, redesenhar, abrir a coletiva, fechar um
// painel) vira o evento "tela", que ela atende na mesma ordem.
// ANTES = cópia congelada (tests/unit/ref_clube_antes.js), tal e qual.
// DEPOIS = os atalhos do carreira.js atual, que chamam o motor.
// Os dois lados comparam também a sequência de tela (gravar, redesenhar, abrir, fechar).
// Cada lado roda num vm com o seu próprio motor (tests/e2e/_motor_vm.js) e o
// CAREER morando no módulo de estado, como na página. Os dois rodam o mesmo
// roteiro sorteado, com o mesmo Math.random; o teste compara retornos, save,
// avisos de tela e coletivas, em ordem.
// Uso: node tests/unit/test_motor_clube.js   (sai com 1 se algo falhar)
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
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); if (e.actual !== undefined) console.log("   1ª diferença:", primeiraDiferenca(e.actual, e.expected)); }
}
function primeiraDiferenca(a, b, p = "") {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = primeiraDiferenca(a[k], b[k], `${p}.${k}`); if (d) return d; }
  }
  return `${p}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`.slice(0, 400);
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
  if (m && /[[{(]$/.test(m[0].replace(/\s*\/\/.*$/, "").trimEnd())) {
    const linha = m[0].replace(/\s*\/\/.*$/, "").trimEnd();
    const a = linha[linha.length - 1], f = { "[": "]", "{": "}", "(": ")" }[a];
    const fim = bloco(m.index + linha.length - 1, a, f);
    return src.slice(m.index, src.indexOf("\n", fim)) + "\n";
  }
  if (m) return m[0] + "\n";
  throw new Error(`não achei ${name}`);
}

// O que saiu do carreira.js na etapa E (atalhos agora).
const MOVIDAS = `submitOfferOut increaseOffer withdrawOffer acceptCounterOffer createListing cancelListing acceptListingOffer rejectListingOffer
findInterestedBuyer finalizeLoanOut finalizeLoanIn acceptOffer declineOffer renewalVerdict suggestedRenewalWage applyTalkEffect canTalkTo
isContractExpiring isLoanOutRefused recordDecline listingFor hireTechnicalStaff fireTechnicalStaff startStadiumUpgrade signSponsorProposal
hireScout releaseScout startScoutMission recruitProspectToBase scoutAllowedRegions scoutingAvailableRegions boardRequest applyBoostEffect
pushPurchaseHistory computeLeaderboardScore markLineupDirty evaluateBoardRequest fmtBRLShort`.split(/\s+/);
// Da C2 em diante (iguais nos dois lados): os atalhos para o motor.
const PAGINA = `calendarOn calendarWeek calendarWeekMonth calendarTurnKey transferWindowStatus pushLedger applyFinanceEntries pushTransferLog
leagueSquadFor marketTeamsPool pickRandomOtherClub isOwnDivisionTeam maxSquadSizeFor minSquadSizeFor marketClub squadForClub clubPositionFactor
clubAmbitionFactor financeiroScore transferScore necessidadeScore pickWeightedByScore offerProbabilityFromScore urgencyMultiplier negotiateOffer
calculateSellerReservationValue sellerNegotiationDecision offerEffectiveValue wasRecentlyDeclined pruneRecentDeclines allMarketPlayers
pendingOfferOutFor finalizeIncomingPurchase subPositionOf fmtBRL abbreviateName playerComplaintFactor myLeaguePosition positionInStandings
technicalStaffMonthlyCost scoutsMonthlyCost firePressConference pressLibraryEntry motorAoVivo motorPosJogo motorFechamento ouvirAvisosDoMotor
fecharOverlay`.split(/\s+/);
// O resto do jogo que elas usam e que não mudou (igual nos dois lados).
const COMUNS = [...PAGINA, "motorModulo", "motorTabela", "motorFinancas", "motorTreino", "motorMercado", "motorTemporada", "motorEstado",
  "motorRegistro", "motorEventos", "motorSemana", "motorTexto", "motorPartida", "clamp", "avg", "teamById", "squadAvgOverallOf", "sortedStandings", "wageBillOf",
  "computeContractFields", "youthPotentialRoll", "pushNotification", "ensureObjectivesFresh", "bumpObjective"];

// Tela de mentira: guarda os toasts e a coletiva, em ordem.
const STUBS = String.raw`
var AVISOS = [], COLETIVAS = [], TELA = [], LIVE_SEASON = 2026, ME = null;
function toast(msg, opts) { AVISOS.push([msg, opts || null]); }
// Telas da página: só registram (gravar, redesenhar, abrir, fechar).
var document = { getElementById: (id) => ({ classList: { add() {}, remove(c) { TELA.push(["fechar", id, c]); }, contains() { return false; } } }) };
function persistCareer() { TELA.push(["gravar"]); }
function closeProspectSheet() { TELA.push(["fecharProspecto"]); }
for (const nome of ["renderMyOffersScreen", "renderMercado", "renderElenco", "renderCentral", "renderMySalesScreen", "renderEscalacao", "renderStadiumScreen", "renderScoutMarketScreen", "renderScoutingScreen"]) globalThis[nome] = () => TELA.push([nome]);
function firePressConference(id, rodada, chain) { COLETIVAS.push(["coletiva", id, rodada, chain]); }
function openPressConferenceModal() { COLETIVAS.push(["abrir"]); TELA.push(["coletiva"]); }
`;
// O CAREER e o "mundo" moram no módulo de estado (como na página).
const ACESSOS = [["CAREER", "carreiraAtual", "definirCarreira"], ["LEAGUE_TEAMS", "ligaAtual", "definirLigaAtual"],
  ["ALL_TEAMS_FLAT", "todosTimes", "definirTodosTimes"], ["CURRENT_COMPETITION_ID", "competicaoAtual", "definirCompeticaoAtual"]]
  .map(([v, g, s]) => `Object.defineProperty(globalThis, "${v}", { configurable: true, get() { return window.BRDATA_MOTOR.estado.${g}(); }, set(x) { window.BRDATA_MOTOR.estado.${s}(x); } });`).join("\n");
// Ouvinte de avisos ANTES da C2 (só título e detalhe; a coletiva não era evento).
const OUVIR_ANTES = "";

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
    lineup: { starters: principal.slice(0, 11).map((p) => p.id), bench: principal.slice(11, 18).map((p) => p.id) },
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

// Roteiro (o mesmo texto roda nos dois lados): todas as ações de mercado e
// de clube, com escolhas sorteadas (válidas e inválidas).
const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  const pick = (l) => l[Math.floor(r() * l.length)];
  const pickOu = (l, d) => (l && l.length ? pick(l) : d);
  CAREER.sponsorProposals = { master: [{ empresa: "A", valorTemporada: 9000000, duracao: 2 }, { empresa: "B", valorTemporada: 7000000, duracao: 3 }], material: null };
  CAREER.stadium = { capacityBonus: 0, pendingUpgrade: null, completed: r() < 0.3 ? ["setor_norte"] : [] };
  CAREER.sponsorship = CAREER.sponsorship || { master: null, material: null };
  CAREER.finances.wageCap = CAREER.finances.wageCap || 900000000;
  CAREER.reputation = 40 + Math.floor(r() * 50);
  CAREER.boardGoal = { position: 1 + Math.floor(r() * 18) };
  const alvos = Object.entries(CAREER.leagueSquads).flatMap(([c, sq]) => sq.map((p) => [c, p]));
  for (let k = 0; k < 14; k++) {
    const [c, p] = pick(alvos);
    out.push(submitOfferOut(c, p.id, r() < 0.2 ? "abc" : Math.round(p.value * (0.4 + r())), pick([1, 2, 3, 4, 9])));
    const o = pickOu(CAREER.pendingOffersOut, { id: "x" });
    if (r() < 0.3) out.push(increaseOffer(o.id, Math.round((o.offerValue || 0) * 1.2)));
    if (r() < 0.2) out.push(withdrawOffer(o.id));
    if (r() < 0.3) { o.status = "countered"; o.counterValue = o.offerValue; out.push(acceptCounterOffer(o.id)); }
    const meu = pick(CAREER.squad);
    out.push(isContractExpiring(meu), canTalkTo(meu), isLoanOutRefused(meu), suggestedRenewalWage(meu), renewalVerdict(meu, Math.round(meu.wage * (0.8 + r())), 1 + Math.floor(r() * 5)));
    if (r() < 0.4) out.push(applyTalkEffect(meu, pick(["apoiar", "prometer", "cobrar"])));
    if (r() < 0.5) { const l = createListing(meu, Math.round(meu.value * (0.5 + r()))); out.push(l, listingFor(meu.id)); }
    const l = pickOu(CAREER.pendingListings, { id: "y", offers: [] });
    if (l.offers && !l.offers.length && r() < 0.6) l.offers.push({ id: "of" + k, clubId: c, clubName: "Clube " + c, value: Math.round((meu.value || 1000000) * (0.5 + r())), installments: pick([1, 2, 3]), round: CAREER.currentRound });
    if (l.offers && l.offers.length) { if (r() < 0.5) out.push(acceptListingOffer(l.id, l.offers[0].id)); else out.push(rejectListingOffer(l.id, l.offers[0].id)); }
    if (r() < 0.15) out.push(cancelListing(l.id));
    const buyer = findInterestedBuyer(CAREER.clubId, meu);
    out.push(buyer && buyer.id);
    if (r() < 0.3) out.push(await finalizeLoanOut(meu.id, { returnRound: r() < 0.5 ? 38 : 20, buyOption: r() < 0.5 ? null : { value: 5000000, mandatory: r() < 0.5 }, buyer: buyer || undefined }));
    if (r() < 0.3) out.push(await finalizeLoanIn(c, p.id, { returnRound: 38, buyOption: null, wagePct: pick([50, 75, 100]) }));
    if (r() < 0.3) { CAREER.pendingOffer = { playerId: meu.id, playerName: meu.name, clubId: c, clubName: "Clube " + c, fee: 3000000, round: CAREER.currentRound }; out.push(r() < 0.5 ? acceptOffer() : declineOffer()); }
    recordDecline(meu.id, c, CAREER.currentRound);
  }
  out.push(hireTechnicalStaff(), fireTechnicalStaff(), hireTechnicalStaff());
  for (const id of [pick(["setor_norte", "iluminacao", "camarotes"]), "camarotes", "x"]) out.push(startStadiumUpgrade(id));
  out.push(signSponsorProposal("master", Math.floor(r() * 2)), signSponsorProposal("material", 0));
  for (const m of SCOUT_MARKET.slice(0, 4)) out.push(hireScout(m.id));
  const sc = (CAREER.scouts || [])[0];
  if (sc) { out.push(scoutAllowedRegions(sc), startScoutMission(sc.id, scoutAllowedRegions(sc)[0] || "sul", { type: pick(["sub17", "sub20", "pro"]), duration: pick(["curta", "media"]) })); out.push(releaseScout(sc.id)); }
  out.push(scoutingAvailableRegions());
  CAREER.scoutMissionProspects = [{ id: "pr1", name: "Joia", group: "F", age: 16, overall: 40, atk: 50, def: 30, phys: 50, potential: 80, wage: 1000, value: 100000, contractUntil: 2028 }];
  out.push(recruitProspectToBase("pr1"), recruitProspectToBase("nao"));
  CAREER.lastBoardRequestRound = r() < 0.5 ? null : CAREER.currentRound;
  out.push(boardRequest(), boardRequest());
  for (const it of BOOST_ITEMS) out.push(applyBoostEffect(it));
  for (let i = 0; i < 35; i++) pushPurchaseHistory("i" + i, "Item", "Efeito", "-10", "debit");
  out.push(computeLeaderboardScore(), fmtBRLShort(123456789), fmtBRLShort(-5400));
  markLineupDirty();
  return out;
})()`;
// Fora da comparação: carimbos de hora e os ids com hora/sorteio.
const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "ts" && typeof v === "number" ? 1
  : typeof v === "string" ? v.replace(/^ntf_\d+_\w+$/, "ntf_X").replace(/^listingoffer_\d+_\d+$/, "listingoffer_X").replace(/^([a-z]+)_\d{13}_(\d+)$/, "$1_X_$2") : v)));

(async () => {
  const nowSrc = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  const refSrc = fs.readFileSync(path.join(__dirname, "ref_clube_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const comuns = [...new Set(COMUNS)].map((nm) => extract(nowSrc, nm)).join("") + ["BOOST_ITEMS", "CREDIT_PACKAGES", "SECTOR_LABEL"].map((nm) => extract(nowSrc, nm)).join("");
  const lado = (codigo) => {
    const sb = { Math: Object.create(Math), console };
    vm.createContext(sb);
    const consts = [["semana", "MAX_PRINCIPAL SUBPOS_LABEL REGION_LABEL UF_TO_REGION SCOUT_MISSION_TYPES SCOUT_MISSION_DURATIONS SCOUT_PROSPECTS_MAX SCOUT_MAX_SUGGESTIONS"],
      ["aovivo", "TALK_BENCH_STREAK_THRESHOLD WANTS_TRANSFER_BENCH_STREAK WANTS_TRANSFER_MORALE_MAX PRESS_LIBRARY"],
      ["clube", codigo.includes("motorClube") ? "OFFER_WAIT_ROUNDS LOAN_REFUSAL_EFFECTIVE_THRESHOLD STADIUM_UPGRADES SCOUT_MARKET SCOUT_GROUP_LABEL BOARD_REQUEST_COOLDOWN PURCHASE_HISTORY_MAX" : ""]]
      .flatMap(([m, l]) => l.split(" ").filter(Boolean).map((n) => `Object.defineProperty(globalThis, "${n}", { configurable: true, get() { return window.BRDATA_MOTOR.${m}.${n}; } });`)).join("\n") + "\n";
    vm.runInContext("var window = globalThis; window.BRDATA_MOTOR = {};\n" + motorCode() + dataSrc + STUBS + ACESSOS + "\n" + consts + comuns + codigo + "\nouvirAvisosDoMotor();", sb);
    return sb;
  };
  // ANTES: as funções congeladas. DEPOIS: os atalhos de hoje, que chamam o motor.
  const A = lado(OUVIR_ANTES + refSrc);
  const B = lado(["motorClube", ...MOVIDAS].map((nm) => extract(nowSrc, nm)).join(""));

  const rodar = async (sb, mundo, seed) => {
    sb.__m = clone(mundo);
    vm.runInContext("Date.now = () => 1794000000000; AVISOS = []; COLETIVAS = []; TELA = []; CAREER = __m.career; LEAGUE_TEAMS = __m.liga; ALL_TEAMS_FLAT = __m.todos;", sb);
    sb.Math.random = seeded(seed);
    const out = await vm.runInContext(ROTEIRO(seed), sb);
    return limpa({ out, career: vm.runInContext("CAREER", sb), avisos: vm.runInContext("AVISOS", sb), coletivas: vm.runInContext("COLETIVAS", sb), tela: vm.runInContext("TELA", sb) });
  };
  const MUNDOS = Number(process.env.MUNDOS || 150);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) { const w = makeWorld(6000 + k); runs.push([await rodar(A, w, 200 + k), await rodar(B, w, 200 + k)]); }

  await check(`Mesmo roteiro, mesmos retornos e o mesmo save em ${MUNDOS} mundos (propostas, contraproposta, anúncios, empréstimos, proposta recebida, renovação, conversa, comissão, estádio, patrocínio, olheiros, base, orçamento, loja e ranking)`, () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.out, a.out, `retornos, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
    });
  });
  await check("Tela na mesma ordem (gravar, redesenhar, abrir a coletiva, fechar painel) e os mesmos avisos e coletivas", () => {
    let total = 0;
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.tela, a.tela, `tela, mundo ${k}`);
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos, mundo ${k}`);
      assert.deepStrictEqual(b.coletivas, a.coletivas, `coletivas, mundo ${k}`);
      total += a.tela.length;
    });
    assert.ok(total > MUNDOS * 50, `pouca tela (${total})`);
  });
  await check("O roteiro passa de verdade pelas regras (compras, vendas, empréstimos, contratações de olheiro, obras, patrocínio e pedidos de orçamento)", () => {
    const soma = (f) => runs.reduce((s, [a]) => s + f(a), 0);
    const log = (a, rx) => (a.career.transferLog || []).filter((e) => rx.test(e.text)).length;
    const conta = {
      propostas: soma((a) => a.out.filter((x) => x && x.ok === true && x.offer).length),
      vendas: soma((a) => log(a, /vendeu|vendido|venda/i)),
      emprestimos: soma((a) => log(a, /empr[eé]st/i)),
      olheiros: soma((a) => (a.career.scouts || []).length),
      obras: soma((a) => (a.career.stadium && a.career.stadium.pendingUpgrade ? 1 : 0)),
      avisosComDuracao: soma((a) => a.avisos.filter((x) => x[1] && x[1].durationMs).length),
      avisos: soma((a) => a.avisos.length),
    };
    for (const [k, v] of Object.entries(conta)) assert.ok(v > 3, `pouco de ${k}: ${JSON.stringify(conta)}`);
    console.log("   cobertura:", JSON.stringify(conta));
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
