// Fase 12, etapa 5 (05/11): equivalência do núcleo do mercado extraído
// (public/js/motor/mercado.js) com o código anterior de carreira.js.
// ANTES = cópia congelada (tests/unit/ref_mercado_antes.js), tal e qual.
// DEPOIS = as mesmas funções do carreira.js atual (agora chamando o
// motor), extraídas pelo nome. Os dois rodam num vm com o mesmo mundo
// sorteado (clubes, elencos, tabela, seu clube) e o mesmo Math.random
// com semente; cada chamada tem de devolver exatamente o mesmo valor.
// Uso: node tests/unit/test_motor_mercado.js   (sai com 1 se algo falhar)
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "../..");
let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clone = (x) => JSON.parse(JSON.stringify(x));

// Extrai `function NOME(...) {...}` ou `const NOME = ...` (1 linha) de um fonte.
function extract(src, name) {
  let m = src.match(new RegExp(`^function ${name}\\(`, "m"));
  if (m) {
    const i = src.indexOf("{", src.indexOf(")", m.index));
    let d = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === "{") d++;
      else if (src[j] === "}" && --d === 0) return src.slice(m.index, j + 1) + "\n";
    }
  }
  m = src.match(new RegExp(`^const ${name} = .*$`, "m"));
  if (m) return m[0] + "\n";
  throw new Error(`não achei ${name}`);
}
const PUBLIC_API = [
  "transferWindowStatus", "urgencyMultiplier", "idealCountForGroup", "groupDeficitScore", "qualityDeficitScore",
  "squadSizeNeedFactor", "necessidadeScore", "overallFitCurve", "adequacaoScore", "clubBudgetProxy", "affordabilityRatio",
  "financeiroScore", "clubPositionFactor", "clubAmbitionFactor", "contextoScore", "transferScore", "pickWeightedByScore",
  "offerProbabilityFromScore", "transferValuation", "squadForClub", "calculateSellerReservationValue", "calculateCounterOffer",
  "sellerNegotiationDecision", "buyerHardCap", "buyerNegotiationDecision", "negotiateOffer", "findInterestedBuyer", "offerEffectiveValue",
];

// O resto do jogo de que essas funções dependem, igual nos dois lados.
const STUBS = String.raw`
var CAREER = null, ALL_TEAMS_FLAT = [], LEAGUE_TEAMS = [];
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function averageOverall(list) { if (!list.length) return 0; return list.reduce((s, p) => s + p.overall, 0) / list.length; }
function leagueSquadFor(clubId) { return (CAREER.leagueSquads && CAREER.leagueSquads[String(clubId)]) || []; }
function squadAvgOverallOf(clubId) {
  if (String(clubId) === String(CAREER.clubId)) return averageOverall(CAREER.squad.filter((p) => p.origin === "principal"));
  return averageOverall(CAREER.leagueSquads[String(clubId)] || []);
}
function isOwnDivisionTeam(teamId) { return Object.prototype.hasOwnProperty.call(CAREER.standings, teamId); }
const MAX_LEAGUE_SQUAD = 26, MIN_LEAGUE_SQUAD = 16, MAX_LEAGUE_SQUAD_OTHER_DIVISION = 16, MIN_LEAGUE_SQUAD_OTHER_DIVISION = 12;
function maxSquadSizeFor(teamId) { return isOwnDivisionTeam(teamId) ? MAX_LEAGUE_SQUAD : MAX_LEAGUE_SQUAD_OTHER_DIVISION; }
function minSquadSizeFor(teamId) { return isOwnDivisionTeam(teamId) ? MIN_LEAGUE_SQUAD : MIN_LEAGUE_SQUAD_OTHER_DIVISION; }
function sortedStandings() {
  return Object.entries(CAREER.standings).map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => b.pts - a.pts || String(a.id).localeCompare(String(b.id)));
}
function teamById(id) { return ALL_TEAMS_FLAT.find((t) => String(t.id) === String(id)); }
function wageBillOf(squad) { return HOST.wageBill(squad); }
function marketTeamsPool() {
  const pool = CAREER.marketScope === "multi" ? ALL_TEAMS_FLAT : LEAGUE_TEAMS;
  return pool.filter((t) => t.competitionId !== "serie_d");
}
function calendarOn() { return !!CAREER.calendar; }
const CALENDAR_WINDOW_PHASES = new Set(["ferias", "pre", "pausa"]);
const MONTH_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function calendarWeekMonth(w) { return w.m; }
`;

// Mundo sorteado: 14 clubes (10 na sua divisão, com tabela; 4 em outra),
// elencos dentro dos limites e o seu clube com titulares.
const GROUPS = ["G", "D", "D", "D", "M", "M", "M", "F", "F"];
function makePlayer(rng, id, origin) {
  const overall = 45 + Math.floor(rng() * 40);
  return {
    id, origin, group: GROUPS[Math.floor(rng() * GROUPS.length)], overall,
    potential: rng() < 0.15 ? null : overall + Math.floor(rng() * 16),
    age: 17 + Math.floor(rng() * 20),
    wage: Math.round((5 + overall * overall * (0.02 + rng() * 0.06)) * 1000),
    value: Math.round(overall * overall * (300 + rng() * 900) / 1000) * 1000,
    contractUntil: rng() < 0.1 ? undefined : 2026 + Math.floor(rng() * 5),
  };
}
function makeWorld(seed) {
  const rng = seeded(seed);
  const teams = [], leagueSquads = {}, standings = {};
  for (let c = 1; c <= 14; c++) {
    const own = c <= 10, id = `c${c}`;
    teams.push({ id, name: `Clube ${c}`, competitionId: own ? "serie_a" : (c <= 13 ? "serie_b" : "serie_d") });
    if (own) standings[id] = { pts: Math.floor(rng() * 60) };
    if (c === 1) continue; // o seu clube usa CAREER.squad
    const size = own ? 14 + Math.floor(rng() * 14) : 10 + Math.floor(rng() * 8);
    leagueSquads[id] = Array.from({ length: size }, (_, i) => makePlayer(rng, `${id}_${i}`, "principal"));
  }
  const squad = Array.from({ length: 24 }, (_, i) => makePlayer(rng, `me_${i}`, i < 20 ? "principal" : "base"));
  const starters = squad.filter((p) => p.origin === "principal").slice(0, 11).map((p) => p.id);
  const phases = ["ferias", "pre", "liga", "liga", "pausa", "liga", "liga", "ferias"];
  const calendar = rng() < 0.5 ? null : {
    idx: Math.floor(rng() * 20),
    weeks: Array.from({ length: 20 }, (_, i) => ({ p: phases[Math.floor(rng() * phases.length)], m: i % 12 })),
  };
  return {
    teams,
    career: {
      clubId: "c1", seasonYear: 2026, currentRound: 1 + Math.floor(rng() * 38), standings, leagueSquads, squad,
      lineup: { starters }, marketScope: rng() < 0.5 ? "multi" : "single", calendar,
    },
  };
}

function makeSide(code, financas, mercado) {
  const sb = { Math: Object.create(Math), console, HOST: { wageBill: financas.wageBill }, window: { BRDATA_MOTOR: { financas, mercado } } };
  vm.createContext(sb);
  vm.runInContext(STUBS + code, sb);
  return sb;
}
function loadWorld(sb, world, rngSeed) {
  vm.runInContext("void 0", sb);
  sb.__w = clone(world);
  vm.runInContext("CAREER = __w.career; ALL_TEAMS_FLAT = __w.teams; LEAGUE_TEAMS = __w.teams.filter((t) => t.competitionId === 'serie_a');", sb);
  sb.Math.random = seeded(rngSeed);
}
const call = (sb, expr) => vm.runInContext(expr, sb);

(async () => {
  const financas = await import(pathToFileURL(path.join(ROOT, "public/js/motor/financas.js")).href);
  const mercado = await import(pathToFileURL(path.join(ROOT, "public/js/motor/mercado.js")).href);
  const beforeSrc = fs.readFileSync(path.join(__dirname, "ref_mercado_antes.js"), "utf8");
  const nowSrc = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  // Etapas C2 e E (09/11): parte destas funções (e o marketClub) passou para
  // o motor (semana.js e clube.js) sem mudar o texto; paginaComoAntes
  // remonta o carreira.js no formato da página para rodar no mesmo vm.
  const pagina = require("../e2e/_motor_vm").paginaComoAntes(nowSrc);
  const fromNow = (nm) => extract(pagina, nm);
  const afterSrc = ["motorModulo", "motorMercado", "marketClub", ...PUBLIC_API].map(fromNow).join("");
  const A = makeSide(beforeSrc, financas, mercado);
  const B = makeSide(afterSrc, financas, mercado);
  const WORLDS = 120;

  // Roda a mesma expressão nos dois lados, no mesmo mundo e semente.
  function same(world, seed, expr) {
    loadWorld(A, world, seed); loadWorld(B, world, seed);
    const a = JSON.stringify(call(A, expr)), b = JSON.stringify(call(B, expr));
    assert.strictEqual(b, a, `diferente em: ${expr}`);
    // e o mundo continua igual (nenhuma das regras altera o save)
    assert.strictEqual(JSON.stringify(call(B, "CAREER")), JSON.stringify(call(A, "CAREER")), `save mudou em: ${expr}`);
  }
  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  const players = (w) => [...Object.values(w.career.leagueSquads).flat(), ...w.career.squad];

  await check("Janela de transferências igual (por rodada 1–40 e pelo calendário, aberta e fechada, com os textos)", () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(1000 + k);
      for (let r = 1; r <= 40; r += 3) same(w, k, `transferWindowStatus(${r})`);
      for (let r = 1; r <= 25; r += 2) same(w, k, `urgencyMultiplier(${(r % 7) / 6}, ${r})`);
    }
  });

  await check("TransferScore igual (necessidade com e sem clube, adequação, financeiro, contexto, orçamento, ambição pela tabela e pela força)", () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(2000 + k), rng = seeded(k);
      const ids = w.teams.map((t) => t.id);
      for (let i = 0; i < 25; i++) {
        const p = pick(rng, players(w)), c = pick(rng, ids);
        const P = JSON.stringify(p);
        same(w, k, `[transferScore(${P}, "${c}"), necessidadeScore(${P}, leagueSquadFor("${c}"), "${c}"), necessidadeScore(${P}, leagueSquadFor("${c}")),
          adequacaoScore(${P}, leagueSquadFor("${c}"), "${c}"), financeiroScore(${P}, leagueSquadFor("${c}"), "${c}"),
          contextoScore(${P}, leagueSquadFor("${c}"), "${c}"), clubBudgetProxy("${c}"), clubAmbitionFactor("${c}"), clubPositionFactor("${c}"),
          squadSizeNeedFactor(leagueSquadFor("${c}"), "${c}"), offerProbabilityFromScore(transferScore(${P}, "${c}"))]`);
      }
    }
  });

  await check("Avaliação, reserva, contraproposta, teto e decisão do comprador iguais (vendendo você ou um CPU, com âncora, concorrência e pedido)", () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(3000 + k), rng = seeded(100 + k);
      const ids = w.teams.map((t) => t.id);
      for (let i = 0; i < 20; i++) {
        const sellerIsMe = rng() < 0.5;
        const seller = sellerIsMe ? "c1" : pick(rng, ids.filter((id) => id !== "c1"));
        const p = sellerIsMe ? pick(rng, w.career.squad) : pick(rng, w.career.leagueSquads[seller]);
        const buyer = pick(rng, ids.filter((id) => id !== seller && id !== "c1"));
        const ctx = JSON.stringify(pick(rng, [{}, { baseValue: Math.round(p.value * (0.8 + rng() * 0.5)) }, { competitorCount: Math.floor(rng() * 5) }, { sellerAsking: p.value * 1.1 + 333 }]));
        const P = JSON.stringify(p), offer = Math.round(p.value * (0.5 + rng())), counter = Math.round(p.value * (0.8 + rng() * 0.8));
        same(w, k, `[transferValuation(${P}, "${buyer}", "${seller}", ${ctx}), calculateSellerReservationValue(${P}, "${seller}", ${ctx}),
          calculateCounterOffer(${offer}, calculateSellerReservationValue(${P}, "${seller}", ${ctx})), buyerHardCap(${P}, "${buyer}", ${ctx}),
          buyerNegotiationDecision(${counter}, ${offer}, ${P}, "${buyer}", ${ctx}), offerEffectiveValue(${offer}, ${1 + (i % 4)})]`);
      }
    }
  });

  await check("Negociação completa e sorteios iguais (decisão do vendedor, negotiateOffer, escolha ponderada e comprador interessado), com o mesmo Math.random", () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(4000 + k), rng = seeded(200 + k);
      const ids = w.teams.map((t) => t.id);
      for (let i = 0; i < 15; i++) {
        const sellerIsMe = rng() < 0.5;
        const seller = sellerIsMe ? "c1" : pick(rng, ids.filter((id) => id !== "c1"));
        const p = sellerIsMe ? pick(rng, w.career.squad) : pick(rng, w.career.leagueSquads[seller]);
        const buyer = pick(rng, ids.filter((id) => id !== seller && id !== "c1"));
        const P = JSON.stringify(p);
        const ctx = JSON.stringify(rng() < 0.5 ? {} : { baseValue: Math.round(p.value * (0.9 + rng() * 0.3)), competitorCount: 1 });
        const ratio = 0.7 + rng() * 0.45;
        same(w, 500 + k * 31 + i, `[negotiateOffer(${P}, "${buyer}", "${seller}", ${ctx}), negotiateOffer(${P}, "${buyer}", "${seller}", ${ctx}),
          sellerNegotiationDecision(Math.round(${p.value} * ${ratio}), ${p.value}), sellerNegotiationDecision(${p.value}, ${p.value}),
          (findInterestedBuyer("${seller}", ${P}) || {}).id || null, (findInterestedBuyer("${seller}") || {}).id || null,
          pickWeightedByScore(marketTeamsPool().map((t) => ({ item: t.id, score: transferScore(${P}, t.id) }))),
          Math.random()]`);
      }
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
