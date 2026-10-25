// GE-BALANCE-005 (issue #38) — validação por simulação Monte Carlo da
// evolução de jogadores, ANTES vs DEPOIS. Mesmo padrão de
// sim_ge_balance_002.js: o CÓDIGO de produção (treino semanal,
// maturação natural, renovação de elenco humano/CPU, geração de base)
// é extraído de public/js/carreira.js e roda num `vm`, sem reescrever
// fórmula nenhuma à mão. "Antes" = carreira.js de uma revisão git
// (padrão: origin/main), "depois" = o arquivo do checkout atual.
//
// O que o script MODELA (não reaproveita), por não existir uma função
// isolável pra isso no jogo:
//   - o treinador "sem mercado": renova o contrato de todo profissional
//     que quer manter, promove da base quem completa 19 anos, aposenta
//     quem passa de 35, escala os 11 de maior overall toda rodada e usa
//     o esquema de treino padrão ("Equilíbrio") a temporada inteira;
//   - os elencos CPU jogam 38 rodadas com o XI de pickCpuXI (real).
//
// Uso: node tests/e2e/sim_ge_balance_005.js [revisão-antes] [carreiras] [real|gerado]
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const BEFORE_REV = process.argv[2] || "origin/main";
const CAREERS = Number(process.argv[3]) || 200;
const SEASONS = 10;
const SCENARIO = process.argv[4] || "real"; // "real" | "gerado"

const dataJs = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
const afterSrc = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
const beforeSrc = execSync(`git show ${BEFORE_REV}:public/js/carreira.js`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });

// Extrai `function NOME(...) {...}` ou `const NOME = ...;` pelo
// casamento de chaves/colchetes — nomes que não existem numa das
// versões (helpers novos desta demanda) são simplesmente pulados.
function extract(src, name) {
  const fnRe = new RegExp(`^function ${name}\\(`, "m");
  const constRe = new RegExp(`^const ${name} = `, "m");
  let m = src.match(fnRe);
  if (m) {
    let i = src.indexOf("{", src.indexOf(")", m.index));
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}" && --depth === 0) return src.slice(m.index, j + 1) + "\n";
    }
  }
  m = src.match(constRe);
  if (m) {
    const start = m.index + m[0].length;
    const open = src[start];
    if (open === "[" || open === "{") {
      const close = open === "[" ? "]" : "}";
      let depth = 0;
      for (let j = start; j < src.length; j++) {
        if (src[j] === open) depth++;
        else if (src[j] === close && --depth === 0) return "var " + src.slice(m.index + 6, j + 1) + ";\n";
      }
    }
    return "var " + src.slice(m.index + 6, src.indexOf("\n", start)) + "\n"; // constante de 1 linha
  }
  return "";
}
const NAMES = [
  "clamp", "avg",
  // GE-BALANCE-005 (só existem no "depois")
  "SEASON_GAIN_CAP_BY_AGE", "seasonGainBaseCap", "playTimeGainFactor", "seasonGainCap", "seasonGainRoom",
  "recordSeasonGain", "highBandGainFactor", "potentialDeclineFor", "youthPotentialRoll", "applyCpuAnnualEvolution",
  // motor de evolução/elenco já existente
  "computeContractFields", "derivePotentialForAdult", "mapPositionGroup", "buildRealPlayer", "attributeTrainingGain", "BASE_COMPOSITION", "buildBasePlayer",
  "FILLER_COMPOSITION", "buildGeneratedProPlayer", "MIN_PRINCIPAL", "MIN_LEAGUE_SQUAD", "MIN_LEAGUE_SQUAD_OTHER_DIVISION",
  "applyNaturalAgingEvolution", "TRAINING_GAME_DAY", "TRAINING_PRE_GAME_DAY", "TRAINING_POST_GAME_DAY",
  "isProtectedTrainingDay", "TRAINING_INTENSITY_MULT", "TRAINING_DURATION_DEFAULT", "FATIGUE_HISTORY_MAX",
  "TRAINING_SCHEMES", "defaultTrainingPlan", "trainingTargets", "applyWeeklyTraining",
  "renewLeagueSquad", "renewHumanSquad", "CPU_XI_MIX", "pickCpuXI",
];
const SEEDED = dataJs.match(/function mulberry32\(seed\) \{[\s\S]*?\n\}\n/)[0] + dataJs.match(/function seededRngFromKey\(key\) \{[\s\S]*?\n\}\n/)[0];

function makeEngine(src) {
  const code = SEEDED + NAMES.map((n) => extract(src, n)).join("") + `
    var LIVE_SEASON = 2026;
    var DEMO_FIRST_NAMES = ["A", "B", "C", "D"], DEMO_LAST_NAMES = ["Silva", "Souza", "Lima"];
    var CAREER = null, CLUB = { id: "sim", atk: 1.55, def: 0.9 };
    function teamById() { return CLUB; }
    function snapshotPlayerSeasonHistory() {}
    function applySeasonMoraleReset() {}
    function ensureObjectivesFresh() {}
    function bumpObjective() {}
    function minSquadSizeFor() { return MIN_LEAGUE_SQUAD; }
  `;
  const sb = { Math, console };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb;
}

const top11 = (squad) => squad.filter((p) => p.origin === "principal").map((p) => p.overall).sort((a, b) => b - a).slice(0, 11);
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

function runCareer(E, k) {
  const rng = E.seededRngFromKey(`sim005:${k}`);
  // Cenário "real" = caminho normal do jogo (buildRealPlayer com dado de
  // fornecedor plausível); "gerado" = elenco de preenchimento.
  const initialPro = SCENARIO === "real"
    ? Array.from({ length: 24 }, (_, i) => E.buildRealPlayer({ id: `${k}_${i}`, name: "R", position: ["Goalkeeper", "Defender", "Midfielder", "Attacker"][i % 4], rating: 6.4 + rng() * 1.2, games: 30, goals: Math.floor(rng() * 8), assists: Math.floor(rng() * 6), age: 18 + Math.floor(rng() * 17) }, E.CLUB, rng))
    : Array.from({ length: 24 }, (_, i) => E.buildGeneratedProPlayer(E.CLUB, i, rng));
  const squad = [
    ...initialPro,
    ...Array.from({ length: 16 }, (_, i) => E.buildBasePlayer(E.CLUB, i, rng)),
  ].map((p, i) => ({ ...p, id: `${p.id}_${i}`, _uid: true }));
  E.CAREER = { squad, lineup: { starters: [], bench: [] }, seasonYear: 2026, currentRound: 1, trainingPlan: E.defaultTrainingPlan("equilibrio"), clubId: `sim${k}`, clubName: "Sim", finances: {} };
  const out = { start: mean(top11(squad)), start90: squad.filter((p) => p.overall >= 90).length, top11: [], n90: 0, all85: false, vetDelta: [], base80Years: [] };
  const base80 = new Map(); // id -> temporada em que entrou com teto 80+
  for (let s = 0; s < SEASONS; s++) {
    const vetStart = new Map(E.CAREER.squad.filter((p) => p.age >= 33).map((p) => [p.id, p.overall]));
    E.CAREER.squad.filter((p) => p.origin === "base" && p.potential >= 80 && !base80.has(p.id)).forEach((p) => base80.set(p.id, s));
    for (let r = 1; r <= 38; r++) {
      E.CAREER.currentRound = r;
      E.CAREER.trainingAppliedForRound = null;
      E.applyWeeklyTraining();
      E.CAREER.squad.forEach((p) => { p.condition = 100; });
      const xi = E.CAREER.squad.filter((p) => p.origin === "principal").sort((a, b) => b.overall - a.overall).slice(0, 11);
      xi.forEach((p) => { p.appsSeason = (p.appsSeason || 0) + 1; });
      E.applyNaturalAgingEvolution(xi);
    }
    E.CAREER.squad.forEach((p) => { if (vetStart.has(p.id)) out.vetDelta.push(p.overall - vetStart.get(p.id)); });
    E.CAREER.squad.forEach((p) => { if (base80.has(p.id) && p.overall >= p.potential && !p._reached) { p._reached = true; out.base80Years.push(s + 1 - base80.get(p.id)); } });
    // treinador sem mercado: aposenta 35+, renova o resto, promove 19+
    E.CAREER.squad = E.CAREER.squad.filter((p) => p.age < 35);
    E.CAREER.squad.forEach((p) => { p.contractUntil = E.CAREER.seasonYear + 2; if (p.origin === "base" && p.age >= 19) p.origin = "principal"; });
    E.CAREER.seasonYear += 1;
    E.renewHumanSquad();
    // a reposição reusa ids `base_<clube>_<n>` (achado registrado no
    // handoff) — aqui só pra a métrica não confundir 2 jovens.
    E.CAREER.squad.forEach((p) => { if (!p._uid) { p._uid = true; p.id = `${p.id}_s${s}`; } });
    out.top11.push(mean(top11(E.CAREER.squad)));
  }
  // quem tinha teto 80+ e não chegou conta com o tempo observado (limite
  // inferior) — sem isso a média só enxerga quem chegou rápido.
  E.CAREER.squad.forEach((p) => { if (base80.has(p.id) && !p._reached) out.base80Years.push(SEASONS - base80.get(p.id)); });
  const pro = E.CAREER.squad.filter((p) => p.origin === "principal");
  out.n90 = pro.filter((p) => p.overall >= 90).length;
  out.all85 = top11(E.CAREER.squad).every((v) => v >= 85);
  return out;
}

function runLeague(E) {
  E.CAREER = { squad: [], seasonYear: 2026 };
  const clubs = Array.from({ length: 59 }, (_, i) => ({ id: `c${i}`, atk: 1.05 + (i % 20) * 0.04, def: 1.2 - (i % 20) * 0.02 }));
  const squads = clubs.map((c) => { const rng = E.seededRngFromKey(`league005:${c.id}`); return Array.from({ length: 26 }, (_, i) => E.buildGeneratedProPlayer(c, i, rng)); });
  const snap = () => { const all = squads.flat().map((p) => p.overall); return { mean: mean(all), p99: pct(all, 0.99) }; };
  const series = [snap()];
  for (let s = 0; s < SEASONS; s++) {
    squads.forEach((sq) => { E.pickCpuXI(sq).forEach((p) => { p.appsSeason = 38; }); });
    E.CAREER.seasonYear += 1;
    clubs.forEach((c, i) => { E.CLUB = c; squads[i] = E.renewLeagueSquad(c, squads[i]); });
    series.push(snap());
  }
  return series;
}

function report(label, src) {
  const E = makeEngine(src);
  const res = Array.from({ length: CAREERS }, (_, k) => runCareer(E, k));
  E.CLUB = { id: "sim", atk: 1.55, def: 0.9 };
  const curve = Array.from({ length: SEASONS }, (_, s) => mean(res.map((r) => r.top11[s])).toFixed(1));
  const vet = res.flatMap((r) => r.vetDelta);
  const yrs = res.flatMap((r) => r.base80Years);
  const league = runLeague(E);
  console.log(`\n=== ${label} — elenco ${SCENARIO} ===`);
  const start = mean(res.map((r) => r.start));
  console.log(`Top-11 médio — início ${start.toFixed(1)}; fim das temporadas 1..${SEASONS}: ${curve.join(" | ")}`);
  console.log(`Variação do top-11 (início→T${SEASONS}): ${(curve[SEASONS - 1] - start).toFixed(1)}`);
  console.log(`Jogadores 90+ por elenco: início ${mean(res.map((r) => r.start90)).toFixed(2)} → fim ${mean(res.map((r) => r.n90)).toFixed(2)}`);
  console.log(`Carreiras com ≤2 jogadores 90+ no fim: ${(res.filter((r) => r.n90 <= 2).length / CAREERS * 100).toFixed(1)}% | top-11 inteiro ≥85: ${(res.filter((r) => r.all85).length / CAREERS * 100).toFixed(1)}%`);
  console.log(`Jogadores 33+: variação média de overall na temporada: ${mean(vet).toFixed(2)} (n=${vet.length})`);
  console.log(`Base com teto 80+: temporadas até o teto (≥, conta quem não chegou): ${yrs.length ? mean(yrs).toFixed(1) : "—"} (n=${yrs.length})`);
  console.log(`Liga CPU (59 clubes): média ${league[0].mean.toFixed(1)} → ${league[SEASONS].mean.toFixed(1)} | p99 ${league[0].p99} → ${league[SEASONS].p99}`);
}

report(`ANTES (${BEFORE_REV})`, beforeSrc);
report("DEPOIS (checkout atual)", afterSrc);
