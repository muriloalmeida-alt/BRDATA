// Fase 12, etapa 6 (06/11): equivalência das regras da virada de temporada
// extraídas (public/js/motor/temporada.js) com o código anterior de
// carreira.js.
// ANTES = cópia congelada (tests/unit/ref_temporada_antes.js), tal e qual.
// DEPOIS = as mesmas funções do carreira.js atual (agora chamando o
// motor), extraídas pelo nome. Os dois rodam num vm com o mesmo mundo
// sorteado e o mesmo Math.random com semente; cada chamada tem de
// devolver o mesmo valor e deixar o save (CAREER e as listas de clubes)
// exatamente igual.
// Uso: node tests/unit/test_motor_temporada.js   (sai com 1 se algo falhar)
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

// Extrai `[async] function NOME(...) {...}` ou `const NOME = ...` (1 linha).
function extract(src, name) {
  let m = src.match(new RegExp(`^(async )?function ${name}\\(`, "m"));
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
const FUNCS = [
  "computeContractFields", "fairWageFor", "applySeasonMoraleReset", "derivePotentialForAdult", "recordSeasonGain",
  "potentialDeclineFor", "youthPotentialRoll", "applyCpuAnnualEvolution", "buildBasePlayer", "buildGeneratedProPlayer",
  "computeBoardGoal", "boardGoalMet", "countTitlesThisSeason", "applySeasonReputationDelta", "reputationLabel",
  "snapshotPlayerSeasonHistory", "renewLeagueSquad", "renewHumanSquad", "computeSeasonAwards", "applySeasonAwardMoraleBoost",
  "freshDivisionRound", "sortedDivisionRows", "divisionStandingsFor", "relegationZoneIds", "accessZoneIds",
  "applyTraditionReprieve", "divisionStrengthScale", "repositionArrivals", "applyPromotionRelegation",
];

// O resto do jogo de que essas funções dependem, igual nos dois lados.
const STUBS = String.raw`
var CAREER = null, LEAGUE_TEAMS = [], ALL_TEAMS_FLAT = [], CURRENT_COMPETITION_ID = "brasileirao", NOTES = [];
var LIVE_SEASON = 2026;
var DEMO_FIRST_NAMES = ["Gabriel", "Lucas", "Matheus", "Rafael", "Bruno", "Diego"], DEMO_LAST_NAMES = ["Souza", "Silva", "Oliveira", "Santos", "Costa"];
const ALL_COMPETITIONS_ORDER = ["brasileirao", "serie_b", "serie_c"];
const COMPETITION_SHORT = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };
const MIN_LEAGUE_SQUAD = 16, MIN_LEAGUE_SQUAD_OTHER_DIVISION = 12;
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function averageOverall(list) { if (!list.length) return 0; return list.reduce((s, p) => s + p.overall, 0) / list.length; }
function teamById(id) { return ALL_TEAMS_FLAT.find((t) => String(t.id) === String(id)) || { id, name: "Clube " + id, atk: 1, def: 1 }; }
function minSquadSizeFor(teamId) { return Object.prototype.hasOwnProperty.call(CAREER.standings, teamId) ? MIN_LEAGUE_SQUAD : MIN_LEAGUE_SQUAD_OTHER_DIVISION; }
function pushNotification(kind, text) { NOTES.push([kind, text]); }
async function buildLeagueSquad(t) {
  const rng = seededRngFromKey("ls:" + t.id);
  return Array.from({ length: 12 }, (_, i) => buildGeneratedProPlayer(t, i, rng));
}
`;

// Mundo sorteado: as 3 divisões (com clubes de tradição), a Série D, as
// tabelas, o seu clube (elenco, escalação, meta, reputação) e a Copa.
const TRAD = ["fla", "cor", "pal", "sao", "san", "vas", "flu", "bot", "gre", "int", "cru", "cam"];
const GROUPS = ["G", "D", "D", "D", "M", "M", "M", "F", "F"];
function makePlayer(rng, id, origin, year) {
  const overall = 40 + Math.floor(rng() * 45);
  const p = {
    id, name: `J ${id}`, origin, group: GROUPS[Math.floor(rng() * GROUPS.length)], overall,
    atk: overall + Math.floor(rng() * 10 - 5), def: overall + Math.floor(rng() * 10 - 5), phys: 50 + Math.floor(rng() * 40),
    potential: rng() < 0.1 ? null : overall + Math.floor(rng() * 16),
    age: 16 + Math.floor(rng() * 22), morale: rng() < 0.1 ? null : Math.floor(rng() * 100),
    wage: Math.round((3 + overall * overall * (0.01 + rng() * 0.06)) * 100) * 10,
    value: Math.round(overall * overall * (300 + rng() * 900) / 1000) * 1000,
    contractUntil: year - 1 + Math.floor(rng() * 4),
    appsSeason: Math.floor(rng() * 38), goalsSeason: Math.floor(rng() * 4) * Math.floor(rng() * 5), assistsSeason: Math.floor(rng() * 8),
    apps: Math.floor(rng() * 200), status: rng() < 0.1 ? "lesionado" : "ok", outUntilRound: rng() < 0.1 ? 40 : null, yellowCards: Math.floor(rng() * 3),
  };
  if (rng() < 0.5) p.seasonGain = { overall: Math.floor(rng() * 4) };
  if (rng() < 0.4) p.seasonHistory = Array.from({ length: Math.floor(rng() * 16) }, (_, k) => ({ year: 2010 + k, clubName: "X", apps: 1, goals: 0, assists: 0 }));
  return p;
}
function standingsOf(rng, ids) {
  const s = {};
  ids.forEach((id) => { const v = Math.floor(rng() * 25), e = Math.floor(rng() * 10); s[id] = { id, j: 38, v, e, d: 38 - v - e, gp: 40 + Math.floor(rng() * 30), gc: 40 + Math.floor(rng() * 30), pts: v * 3 + e }; });
  Object.values(s).forEach((r) => { r.sg = r.gp - r.gc; });
  return s;
}
function makeWorld(seed) {
  const rng = seeded(seed);
  const year = 2026 + Math.floor(rng() * 40); // varia a semente da tradição e da renovação
  const teamsOf = (prefix, comp, k) => Array.from({ length: 20 }, (_, i) => ({
    id: i < k ? TRAD.pop() : `${prefix}${i}`, name: `${prefix.toUpperCase()} ${i}`, competitionId: comp,
    atk: Math.round((0.6 + rng() * 1.2) * 1000) / 1000, def: Math.round((0.6 + rng() * 0.9) * 1000) / 1000,
  }));
  TRAD.length = 0; TRAD.push("fla", "cor", "pal", "sao", "san", "vas", "flu", "bot", "gre", "int", "cru", "cam");
  for (let i = TRAD.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [TRAD[i], TRAD[j]] = [TRAD[j], TRAD[i]]; }
  const A = teamsOf("a", "brasileirao", 6), B = teamsOf("b", "serie_b", 4), C = teamsOf("c", "serie_c", 2);
  const D = Array.from({ length: 20 }, (_, i) => ({ id: `d${i}`, name: `D ${i}`, competitionId: "serie_d", atk: 0.5 + rng() * 0.6, def: 0.9 + rng() * 0.7 }));
  const comp = ["brasileirao", "serie_b", "serie_c"][Math.floor(rng() * 3)];
  const mine = comp === "brasileirao" ? A : comp === "serie_b" ? B : C;
  const human = mine[Math.floor(rng() * 20)];
  const all = [...A, ...B, ...C];
  const leagueSquads = {};
  all.forEach((t) => { if (t.id !== human.id) leagueSquads[t.id] = Array.from({ length: 12 + Math.floor(rng() * 14) }, (_, i) => makePlayer(rng, `${t.id}_${i}`, "principal", year)); });
  const squad = [
    ...Array.from({ length: 14 + Math.floor(rng() * 10) }, (_, i) => makePlayer(rng, `me_${i}`, "principal", year)),
    ...Array.from({ length: Math.floor(rng() * 18) }, (_, i) => makePlayer(rng, `mb_${i}`, "base", year)),
    ...Array.from({ length: Math.floor(rng() * 3) }, (_, i) => makePlayer(rng, `ml_${i}`, "loan", year)),
  ];
  const principal = squad.filter((p) => p.origin === "principal");
  const starters = Array.from({ length: 11 }, (_, i) => (principal[i] && rng() < 0.95 ? principal[i].id : null));
  const bench = principal.slice(11, 18).map((p) => p.id);
  const others = ["brasileirao", "serie_b", "serie_c"].filter((c) => c !== comp);
  const byComp = { brasileirao: A, serie_b: B, serie_c: C };
  const cupFinal = rng() < 0.5;
  const cupHome = all[Math.floor(rng() * all.length)].id, cupAway = rng() < 0.5 ? human.id : all[Math.floor(rng() * all.length)].id;
  return {
    comp, A, B, C,
    career: {
      clubId: human.id, clubName: human.name, seasonYear: year, reputation: rng() < 0.2 ? null : Math.floor(rng() * 100),
      standings: standingsOf(rng, mine.map((t) => t.id)),
      otherDivisions: Object.fromEntries(others.map((c) => [c, { standings: standingsOf(rng, byComp[c].map((t) => t.id)) }])),
      divisionTeams: { brasileirao: A, serie_b: B, serie_c: C }, serieDPool: D,
      leagueSquads, squad, lineup: { starters, bench },
      cup: cupFinal ? { active: true, phase: "done", champion: rng() < 0.5 ? cupHome : cupAway, ties: { final: [{ home: cupHome, away: cupAway }] } } : { active: rng() < 0.5, phase: "oitavas", ties: { final: [] } },
    },
  };
}

function makeSide(code, motor) {
  const sb = { Math: Object.create(Math), console, window: { BRDATA_MOTOR: motor } };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb;
}
function loadWorld(sb, world, rngSeed) {
  sb.__w = clone(world);
  vm.runInContext(`CAREER = __w.career; CURRENT_COMPETITION_ID = __w.comp; NOTES = [];
    LEAGUE_TEAMS = CAREER.divisionTeams[CURRENT_COMPETITION_ID];
    ALL_TEAMS_FLAT = ALL_COMPETITIONS_ORDER.flatMap((id) => CAREER.divisionTeams[id]);`, sb);
  sb.Math.random = seeded(rngSeed);
}
const STATE = "({ CAREER, LEAGUE_TEAMS, ALL_TEAMS_FLAT, CURRENT_COMPETITION_ID, NOTES })";

(async () => {
  const imp = (m) => import(pathToFileURL(path.join(ROOT, `public/js/motor/${m}.js`)).href);
  const motor = {};
  for (const m of ["partida", "tabela", "calendario", "rodada", "financas", "treino", "mercado", "temporada"]) motor[m] = await imp(m);
  const dataJs = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const SEEDED = dataJs.match(/function mulberry32\(seed\) \{[\s\S]*?\n\}\n/)[0] + dataJs.match(/function seededRngFromKey\(key\) \{[\s\S]*?\n\}\n/)[0];
  // A página como antes da etapa F (a virada, a Copa, a criação e a ponte de volta a ela):
  // o resto do jogo que este teste usa de igual nos dois lados.
  const nowSrc = require("../e2e/_motor_vm").paginaComoAntes(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"), undefined, ["virada", "ponte"]);
  // Acessores do motor e o treino (etapa 4), iguais nos dois lados.
  const SHARED = ["motorModulo", "motorTabela", "motorTreino", "seasonGainBaseCap", "playTimeGainFactor", "highBandGainFactor"].map((nm) => extract(nowSrc, nm)).join("");
  const beforeSrc = fs.readFileSync(path.join(__dirname, "ref_temporada_antes.js"), "utf8");
  const afterSrc = ["motorTemporada", "playerBuildEnv", ...FUNCS].map((nm) => extract(nowSrc, nm)).join("");
  const A = makeSide(STUBS + SEEDED + SHARED + beforeSrc, motor);
  const B = makeSide(STUBS + SEEDED + SHARED + afterSrc, motor);
  const WORLDS = 60;

  async function same(world, seed, expr) {
    loadWorld(A, world, seed); loadWorld(B, world, seed);
    const a = JSON.stringify(await vm.runInContext(expr, A)), b = JSON.stringify(await vm.runInContext(expr, B));
    assert.strictEqual(b, a, `diferente em: ${expr.slice(0, 160)}`);
    assert.strictEqual(JSON.stringify(vm.runInContext(STATE, B)), JSON.stringify(vm.runInContext(STATE, A)), `save diferente depois de: ${expr.slice(0, 160)}`);
  }

  await check("Regras de jogador iguais (contrato e salário, salário justo, potencial de adulto e de jovem, queda pela idade, evolução anual CPU, moral da virada, geradores de base e profissional)", async () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(1000 + k);
      await same(w, k, `(() => {
        const r = Math.random, out = [];
        for (let i = 0; i < 40; i++) {
          const ov = 30 + Math.floor(r() * 65), age = 15 + Math.floor(r() * 24), pot = r() < 0.2 ? null : ov + Math.floor(r() * 20);
          out.push(computeContractFields(ov, age, pot, Math.random), derivePotentialForAdult(ov, age, Math.random), youthPotentialRoll(Math.random, r() * 4 - 1), potentialDeclineFor(age, r() < 0.2 ? "G" : "D"));
        }
        const club = { id: "x" + Math.floor(r() * 9), atk: 0.7 + r(), def: 0.7 + r() * 0.8 };
        for (let i = 0; i < 20; i++) out.push(buildBasePlayer(club, i, Math.random), buildGeneratedProPlayer(club, i, Math.random));
        CAREER.squad.forEach((p) => { out.push(fairWageFor(p)); applyCpuAnnualEvolution(p, Math.random); });
        applySeasonMoraleReset(CAREER.squad);
        return out;
      })()`);
    }
  });

  await check("Diretoria, reputação e premiações iguais (meta pela força, meta batida, reputação, rótulos, títulos, prêmios do Brasileirão e da Copa e moral dos premiados)", async () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(2000 + k);
      await same(w, k, `(() => {
        const goal = computeBoardGoal(), award = computeSeasonAwards();
        const met = [0, 1, 6, 7, 10, 11, 16, 17, 20].map((pos) => boardGoalMet(pos, goal));
        applySeasonReputationDelta(met[3], award);
        applySeasonAwardMoraleBoost(award);
        return [goal, award, met, countTitlesThisSeason(award), [0, 29, 30, 49, 50, 69, 70, 84, 85, 100].map(reputationLabel), boardGoalMet(3, null)];
      })()`);
    }
  });

  await check("Renovação dos elencos igual (seu clube: histórico, idade, potencial, saídas, escalação, moral e reposição; CPUs: evolução, idade, saídas e reposição)", async () => {
    for (let k = 0; k < WORLDS; k++) {
      const w = makeWorld(3000 + k);
      await same(w, k, `(() => {
        const human = renewHumanSquad();
        Object.keys(CAREER.leagueSquads).forEach((clubId) => { CAREER.leagueSquads[clubId] = renewLeagueSquad(teamById(clubId), CAREER.leagueSquads[clubId]); });
        return human;
      })()`);
    }
  });

  await check("Acesso e rebaixamento iguais (zonas, perdão da tradição, seu clube protegido na C, sorteio da Série D, força de quem troca de divisão, divisões novas e aviso de divisão)", async () => {
    for (let k = 0; k < WORLDS * 2; k++) {
      const w = makeWorld(4000 + k);
      await same(w, 77 + k, `applyPromotionRelegation()`);
      await same(w, 91 + k, `(() => {
        const rows = sortedDivisionRows("brasileirao"), zone = relegationZoneIds(rows, 4);
        const scale = divisionStrengthScale(CAREER.divisionTeams.serie_b), arrivals = CAREER.divisionTeams.serie_b.slice(0, 4);
        repositionArrivals(arrivals, CAREER.divisionTeams.brasileirao.slice(4), "promoted", scale);
        return [applyTraditionReprieve(zone, rows, "tradition:x:" + CAREER.seasonYear), scale, arrivals];
      })()`);
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
