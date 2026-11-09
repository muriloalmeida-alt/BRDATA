// Sem página escondida, etapa C1 (09/11): notificações, objetivos,
// conquistas e notícias da rodada em public/js/motor/registro.js, o "mundo"
// da carreira em motor/estado.js e os avisos de tela como eventos
// (motor/eventos.js).
// ANTES = cópia congelada (tests/unit/ref_registro_antes.js), tal e qual.
// DEPOIS = as mesmas funções do carreira.js atual (agora chamando o motor),
// extraídas pelo nome, com o CAREER e o "mundo" morando no módulo de estado.
// Os dois rodam o mesmo roteiro sorteado; o teste compara o save, os
// retornos e os avisos de tela (toast), em ordem.
// Uso: node tests/unit/test_motor_registro.js   (sai com 1 se algo falhar)
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
function extract(src, name) {
  const bloco = (i, a, f) => { let d = 0; for (let j = i; j < src.length; j++) { if (src[j] === a) d++; else if (src[j] === f && --d === 0) return j; } throw new Error("bloco"); };
  let m = src.match(new RegExp(`^function ${name}\\(`, "m"));
  if (m) return src.slice(m.index, bloco(src.indexOf("{", src.indexOf(")", m.index)), "{", "}") + 1) + "\n";
  m = src.match(new RegExp(`^const ${name} = .*$`, "m"));
  if (m) return m[0] + "\n";
  throw new Error(`não achei ${name}`);
}
const API = ["pushNotification", "unreadNotificationCount", "localDateStr", "freshObjectiveList", "freshObjectivesState",
  "ensureObjectivesFresh", "trailingWinStreak", "bumpObjective", "applyObjectiveReward", "freshAchievementsState", "achievementProgressFor",
  "setAchievementProgress", "evaluateAlwaysCheckableAchievements", "evaluateSeasonEndAchievements", "rankByPoints", "updateWinlessStreaks",
  "generateRoundNews", "teamById", "squadAvgOverallOf", "averageOverall"];

// O resto do jogo de que essas funções dependem, igual nos dois lados.
const STUBS = String.raw`
var AVISOS = [], ME = null;
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function toast(msg, opts) { AVISOS.push([msg, opts || null]); }
function fmtBRL(v) { return "R$ " + v; }
`;
// Mundo sorteado: 3 divisões de times, tabela, elencos, seu clube.
function makeWorld(seed) {
  const rng = seeded(seed);
  const time = (p, i) => ({ id: `${p}${i}`, name: `Clube ${p}${i}`, short: `${p}${i}`.toUpperCase() });
  const liga = Array.from({ length: 20 }, (_, i) => time("a", i)), outros = Array.from({ length: 20 }, (_, i) => time("b", i));
  const meu = liga[Math.floor(rng() * 20)].id;
  const jogador = (id, o) => ({ id, origin: o, overall: 40 + Math.floor(rng() * 45), morale: rng() < 0.2 ? null : Math.floor(rng() * 100), condition: rng() < 0.2 ? null : Math.floor(rng() * 100) });
  const leagueSquads = {};
  [...liga, ...outros].forEach((t) => { if (t.id !== meu) leagueSquads[t.id] = Array.from({ length: 5 + Math.floor(rng() * 10) }, (_, k) => jogador(`${t.id}_${k}`, "principal")); });
  const standings = {};
  liga.forEach((t) => { const v = Math.floor(rng() * 10); standings[t.id] = { id: t.id, j: 10, v, e: 2, d: 8 - v, gp: 10 + Math.floor(rng() * 20), gc: 10 + Math.floor(rng() * 20), pts: v * 3 + 2, sg: 0 }; });
  return {
    liga, todos: [...liga, ...outros], comp: rng() < 0.5 ? "brasileirao" : "serie_b",
    career: {
      clubId: meu, squad: Array.from({ length: 22 }, (_, k) => jogador(`me_${k}`, k < 18 ? "principal" : "base")), leagueSquads, standings,
      finances: { cash: 1000000 }, recentForm: Array.from({ length: Math.floor(rng() * 8) }, () => [0, 1, 3][Math.floor(rng() * 3)]),
      seasonHistory: Array.from({ length: Math.floor(rng() * 12) }, () => ({})), baseRevealedCount: Math.floor(rng() * 7),
      titlesWonNacional: rng() < 0.3 ? 1 : 0, titlesWonCopa: rng() < 0.3 ? 1 : 0,
      teamWinlessStreak: rng() < 0.5 ? Object.fromEntries(liga.map((t) => [t.id, Math.floor(rng() * 8)])) : undefined,
      objectives: rng() < 0.3 ? undefined : { daily: [], weekly: [], season: [], dailyResetDate: rng() < 0.5 ? "2000-01-01" : null, weeklyResetWeekStart: "2000-01-03" },
      notificationSettings: rng() < 0.5 ? undefined : { partida: rng() < 0.5, loja: rng() < 0.5, lesao: rng() < 0.5 },
      notifications: rng() < 0.5 ? undefined : Array.from({ length: Math.floor(rng() * 32) }, (_, k) => ({ id: `n${k}`, read: rng() < 0.5 })),
    },
  };
}
// Roteiro (o mesmo texto roda nos dois lados).
const ROTEIRO = (seed) => `(() => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  out.push(localDateStr(new Date(2026, 10, 9)), localWeekStartStr(new Date(2026, 10, 9)), localWeekStartStr(new Date(2026, 10, 8)));
  // objetivos
  ensureObjectivesFresh();
  for (let k = 0; k < 12; k++) {
    const cat = ["daily", "weekly", "season"][Math.floor(r() * 3)];
    const list = CAREER.objectives[cat];
    const o = list[Math.floor(r() * list.length)];
    if (!o) continue; // lista vazia (save antigo sem objetivos de temporada)
    bumpObjective(cat, r() < 0.1 ? "nao_existe" : o.objectiveId, Math.floor(r() * 3));
  }
  out.push(trailingWinStreak(), freshObjectiveList("weekly"));
  for (const tipo of ["coins", "coins_boost", "premium"]) out.push(applyObjectiveReward({ type: tipo, amount: 100 + Math.floor(r() * 900) }));
  // notificações
  for (let k = 0; k < 40; k++) pushNotification(["proposta", "lesao", "x", "partida", "loja"][Math.floor(r() * 5)], "Aviso " + k, r() < 0.5 ? { gateBy: ["partida", "loja", "lesao", null][Math.floor(r() * 4)] } : undefined);
  out.push(unreadNotificationCount());
  // conquistas
  ME = r() < 0.5 ? null : { createdAt: Date.now() - Math.floor(r() * 2) * 400 * 86400000 };
  evaluateAlwaysCheckableAchievements();
  evaluateSeasonEndAchievements(Math.floor(r() * 140), Math.floor(r() * 50));
  setAchievementProgress("ach_joia_base", Math.floor(r() * 9));
  setAchievementProgress("nao_existe", 3);
  out.push(achievementProgressFor("ach_artilheiro_area"), achievementProgressFor("ach_inexistente"), freshAchievementsState().length);
  // notícias de 6 rodadas
  const ids = LEAGUE_TEAMS.map((t) => t.id);
  for (let rd = 1; rd <= 6; rd++) {
    const antes = JSON.parse(JSON.stringify(CAREER.standings));
    const jogos = [];
    for (let k = 0; k < 10; k++) {
      const h = ids[2 * k], a = ids[2 * k + 1];
      const gh = Math.floor(r() * 5), ga = Math.floor(r() * 4);
      jogos.push({ home: h, away: a, gh, ga });
      const ph = CAREER.standings[h], pa = CAREER.standings[a];
      ph.pts += gh > ga ? 3 : gh === ga ? 1 : 0; pa.pts += ga > gh ? 3 : gh === ga ? 1 : 0;
      if (gh > ga) ph.v++; else if (ga > gh) pa.v++;
    }
    out.push(generateRoundNews(rd, jogos, r() < 0.15 ? null : antes));
  }
  out.push(rankByPoints(CAREER.standings));
  // buscas de time e força
  out.push(teamById(ids[3]), teamById(ALL_TEAMS_FLAT[25].id), teamById("nao-existe"), squadAvgOverallOf(CAREER.clubId), squadAvgOverallOf(ids[5]), squadAvgOverallOf("vazio"), averageOverall([]));
  return out;
})()`;
// Fora da comparação: carimbos de hora (ts, unlockedAt) e a hora/sorteio no id das notificações.
const limpa = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "ts" || k === "unlockedAt") && typeof v === "number" ? 1 : (typeof v === "string" ? v.replace(/^ntf_\d+_\w+$/, "ntf_X") : v)));

(async () => {
  const imp = (m) => import(pathToFileURL(path.join(ROOT, `public/js/motor/${m}.js`)).href);
  const tabela = await imp("tabela"), estado = await imp("estado"), eventos = await imp("eventos"), registro = await imp("registro");
  // A página como antes da etapa F (a virada, a Copa e a criação de volta a ela):
  // o resto do jogo que este teste usa de igual nos dois lados.
  const nowSrc = require("../e2e/_motor_vm").paginaComoAntes(fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8"), undefined, ["virada"]);
  const refSrc = fs.readFileSync(path.join(__dirname, "ref_registro_antes.js"), "utf8");

  // ANTES: as funções congeladas com o CAREER e o mundo como variáveis soltas.
  const A = { Math: Object.create(Math), console, window: { BRDATA_MOTOR: { tabela } } };
  vm.createContext(A);
  vm.runInContext(STUBS + `var CAREER = null, LEAGUE_TEAMS = [], ALL_TEAMS_FLAT = [], CURRENT_COMPETITION_ID = "brasileirao";
    function motorModulo(nome) { return window.BRDATA_MOTOR[nome]; }
    const motorTabela = () => motorModulo("tabela");\n` + refSrc, A);

  // DEPOIS: as funções do carreira.js atual; CAREER e o mundo moram no módulo.
  const B = { Math: Object.create(Math), console, window: { BRDATA_MOTOR: { tabela, estado, eventos, registro } } };
  vm.createContext(B);
  const acessos = [["CAREER", "carreiraAtual", "definirCarreira"], ["LEAGUE_TEAMS", "ligaAtual", "definirLigaAtual"],
    ["ALL_TEAMS_FLAT", "todosTimes", "definirTodosTimes"], ["CURRENT_COMPETITION_ID", "competicaoAtual", "definirCompeticaoAtual"]]
    .map(([v, g, s]) => `Object.defineProperty(globalThis, "${v}", { configurable: true, get() { return window.BRDATA_MOTOR.estado.${g}(); }, set(x) { window.BRDATA_MOTOR.estado.${s}(x); } });`).join("\n");
  vm.runInContext(STUBS + acessos + "\n" + ["motorModulo", "motorEstado", "motorTabela", "motorRegistro", "motorEventos", "ouvirAvisosDoMotor", ...API].map((nm) => extract(nowSrc, nm)).join("") + "\n// localWeekStartStr saiu do carreira.js (só o motor a usa agora).\nfunction localWeekStartStr(d) { return motorRegistro().localWeekStartStr(d); }\nouvirAvisosDoMotor();", B);

  const rodar = (sb, mundo, seed) => {
    sb.__m = clone(mundo);
    vm.runInContext("AVISOS = []; ME = null; CAREER = __m.career; LEAGUE_TEAMS = __m.liga; ALL_TEAMS_FLAT = __m.todos; CURRENT_COMPETITION_ID = __m.comp;", sb);
    sb.Math.random = seeded(seed);
    const out = vm.runInContext(ROTEIRO(seed), sb);
    return limpa({ out, career: vm.runInContext("CAREER", sb), avisos: vm.runInContext("AVISOS", sb) });
  };

  await check("Mesmo roteiro, mesmos resultados (objetivos, recompensas, notificações com filtro e limite, conquistas, notícias de 6 rodadas, buscas de time e força) em 150 mundos", () => {
    for (let k = 0; k < 150; k++) {
      const w = makeWorld(5000 + k);
      const a = rodar(A, w, 70 + k), b = rodar(B, w, 70 + k);
      assert.deepStrictEqual(b.out, a.out, `retornos, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
    }
  });
  await check("Avisos de tela iguais e na mesma ordem: \"Objetivo concluído!\" e \"Conquista desbloqueada!\" agora saem como evento e viram o mesmo toast", () => {
    let total = 0;
    for (let k = 0; k < 150; k++) {
      const w = makeWorld(5000 + k);
      const a = rodar(A, w, 70 + k), b = rodar(B, w, 70 + k);
      assert.deepStrictEqual(b.avisos, a.avisos, `mundo ${k}`);
      total += a.avisos.length;
    }
    assert.ok(total > 50, `poucos avisos no roteiro (${total})`);
  });
  await check("Eventos: quem ouve recebe, parar de ouvir funciona e um ouvinte com erro não derruba os outros", () => {
    const recebidos = [];
    const parar = eventos.ouvir("teste", (d) => recebidos.push(d));
    eventos.ouvir("teste", () => { throw new Error("ouvinte quebrado"); });
    const erro = console.error; console.error = () => {};
    eventos.emitir("teste", 1);
    parar();
    eventos.emitir("teste", 2);
    console.error = erro;
    eventos.emitir("ninguem-ouve", 3);
    assert.deepStrictEqual(recebidos, [1]);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
