// Etapa F do plano "sem página escondida" (09/11): a virada de temporada, a
// montagem da Copa e a criação de carreira foram para
// public/js/motor/virada.js. Este teste roda a página INTEIRA duas vezes, num
// `vm` com a tela falsa e sem rede (dados de exemplo):
//   ANTES:  carreira.js de hoje com as funções de antes por cima
//           (tests/unit/ref_virada_antes.js, congeladas, com o startCareer
//           inteiro);
//   DEPOIS: carreira.js de hoje (atalhos para o motor).
// Em cada mundo cria uma carreira (divisão, clube e herança do técnico
// sorteados) e vira várias temporadas, com tabela, Copa, premiações e
// sequências sorteadas. Confere retornos, save, o "mundo" (divisão, liga e
// os 60 times), avisos e o que a página grava e abre, tudo igual. Também
// monta a Copa no meio da temporada (save antigo), nos 2 formatos.
// Uso: node tests/unit/test_motor_virada.js   (MUNDOS=100 por padrão)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "../..");
const { criarJanela } = require("../e2e/_tela_falsa");
const { motorCode } = require("../e2e/_motor_vm");

let n = 0, failed = 0;
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
const SEMEAR = (seed) => `(() => { let a = ${seed} >>> 0; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

// Rede de mentira: a gravação (PUT /api/career) responde ok e é contada;
// o resto é "sem rede" (dados de exemplo).
const REDE = String.raw`
var GRAVOU = 0;
fetch = async function (url, opts) {
  if (url === "/api/career" && opts && opts.method === "PUT") { GRAVOU++; return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
  throw new Error("sem rede");
};
`;
// Tela e gravação de mentira: guardam o que a página pediu, em ordem.
const STUBS = String.raw`
var AVISOS = [], TELA = [];
toast = function (msg, opts) { AVISOS.push([msg, opts || null]); };
openFirstEntry = function () { TELA.push(["primeiraEntrada"]); };
Date.now = () => 1794000000000;
ouvirAvisosDoMotor();
`;

// Roteiro (o mesmo texto roda nos dois lados).
const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (l) => l[Math.floor(r() * l.length)];
  const out = [], fotos = [];
  const mundo = () => ({ comp: CURRENT_COMPETITION_ID, liga: LEAGUE_TEAMS.map((t) => t.id), todos: (ALL_TEAMS_FLAT || []).map((t) => t.id + ":" + t.competitionId + ":" + t.atk + ":" + t.def) });
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  CURRENT_COMPETITION_ID = comp;
  LEAGUE_TEAMS = DEMO_DATA_BY_COMPETITION[comp].teams;
  LIVE_MODE = false;
  TECHNICIAN_CARRY = r() < 0.4 ? { reputation: 20 + Math.floor(r() * 70), clubHistory: [{ clubId: "x", clubName: "Antigo", from: 2024, to: 2025 }] } : null;
  out.push(await startCareer(pick(LEAGUE_TEAMS).id));
  out.push(TECHNICIAN_CARRY);
  fotos.push({ career: JSON.parse(JSON.stringify(CAREER)), mundo: mundo() });

  // Copa montada no meio da temporada (migração de save antigo), nos 2 formatos.
  const guarda = JSON.stringify(CAREER.cup);
  if (r() < 0.4) { const d = CAREER.serieDPool; delete CAREER.serieDPool; setupCup(1 + Math.floor(r() * 30)); CAREER.serieDPool = d; }
  else setupCup(1 + Math.floor(r() * 30));
  out.push(JSON.parse(JSON.stringify(CAREER.cup)));
  CAREER.cup = JSON.parse(guarda);

  // Várias viradas de temporada, com tabela, Copa e números sorteados.
  for (let temp = 0; temp < 4; temp++) {
    const ids = Object.keys(CAREER.standings);
    const sorteiaTabela = (st) => Object.keys(st).forEach((id) => { const v = Math.floor(r() * 25), e = Math.floor(r() * (38 - v)); Object.assign(st[id], { j: 38, v, e, d: 38 - v - e, gp: 20 + Math.floor(r() * 50), gc: 20 + Math.floor(r() * 50), pts: v * 3 + e }); st[id].sg = st[id].gp - st[id].gc; });
    sorteiaTabela(CAREER.standings);
    Object.values(CAREER.otherDivisions || {}).forEach((d) => sorteiaTabela(d.standings));
    if (r() < 0.25) { const my = CAREER.standings[CAREER.clubId]; my.pts = 200; }
    if (r() < 0.35) { CAREER.negativeSeasonsStreak = 1 + Math.floor(r() * 2); if (r() < 0.5) CAREER.standings[CAREER.clubId].pts = 0; }
    if (CAREER.cup) CAREER.cup.championIsHuman = r() < 0.2;
    CAREER.squad.forEach((p) => { p.goalsSeason = Math.floor(r() * 12); p.assistsSeason = Math.floor(r() * 8); p.apps = Math.floor(r() * 38); p.ratingSum = p.apps * (5 + r() * 4); });
    CAREER.seasonTeamGoals = Math.floor(r() * 90); CAREER.seasonTeamFouls = Math.floor(r() * 600);
    if (r() < 0.3 && CAREER.squad.length > 25) { const p = pick(CAREER.squad.filter((x) => x.origin === "principal")); p.loanOut = { clubId: pick(ids), returnRound: 38 }; }
    CAREER.currentRound = 39;
    const ret = await advanceSeason();
    out.push(ret);
    fotos.push({ career: JSON.parse(JSON.stringify(CAREER)), mundo: mundo() });
    if (!ret || ret.dismissed) break;
  }
  return { out, fotos };
})()`;

(async () => {
  const pagina = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  const ref = fs.readFileSync(path.join(__dirname, "ref_virada_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const lado = async (antes, seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente");
    rodar(REDE, "rede");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor");
    rodar(dataSrc, "data.js");
    rodar(pagina, "carreira.js");
    if (antes) rodar(ref, "ref_virada_antes.js");
    rodar(STUBS, "stubs");
    const r = await rodar(ROTEIRO(seed), "roteiro");
    return JSON.parse(JSON.stringify({ ...r, avisos: rodar("AVISOS", "x"), tela: rodar("TELA", "x") }));
  };
  const MUNDOS = Number(process.env.MUNDOS || 100);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) runs.push([await lado(true, 900 + k), await lado(false, 900 + k)]);

  await check(`Mesma criação de carreira e mesmas viradas em ${MUNDOS} mundos (retornos, save e o mundo: divisão, liga e os 60 times)`, () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.out, a.out, `retornos, mundo ${k}`);
      a.fotos.forEach((f, i) => {
        assert.deepStrictEqual(b.fotos[i].mundo, f.mundo, `mundo, mundo ${k}, foto ${i}`);
        assert.deepStrictEqual(b.fotos[i].career, f.career, `save, mundo ${k}, foto ${i}`);
      });
      assert.strictEqual(b.fotos.length, a.fotos.length, `fotos, mundo ${k}`);
    });
  });
  await check("Mesmos avisos e o mesmo pedido de tela (gravar e abrir a primeira entrada)", () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos, mundo ${k}`);
      assert.deepStrictEqual(b.tela, a.tela, `tela, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelas regras (viradas, demissões, acesso e rebaixamento, herança do técnico, Copa nos 2 formatos)", () => {
    const soma = (f) => runs.reduce((s, [a]) => s + f(a), 0);
    const viradas = (a) => a.out.slice(3).filter((x) => x && !x.dismissed);
    const conta = {
      viradas: soma((a) => viradas(a).length),
      demissoes: soma((a) => a.out.slice(3).filter((x) => x && x.dismissed).length),
      trocaDeDivisao: soma((a) => viradas(a).filter((x) => x.promotionRelegation && x.promotionRelegation.divisionChanged).length),
      heranca: soma((a) => (a.fotos[0].career.clubHistory.length ? 1 : 0)),
      copaAntiga: soma((a) => (a.out[2] && a.out[2].expanded === false ? 1 : 0)),
      copaNova: soma((a) => (a.out[2] && a.out[2].expanded === true ? 1 : 0)),
      avisos: soma((a) => a.avisos.length),
    };
    console.log("   cobertura:", JSON.stringify(conta));
    for (const [k, v] of Object.entries(conta)) assert.ok(v >= Math.min(3, MUNDOS / 10), `pouco de ${k}: ${JSON.stringify(conta)}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
