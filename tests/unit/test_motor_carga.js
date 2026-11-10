// Etapa G1c do plano "sem página escondida" (10/11): a entrada (conta, carga do
// save, liga e times, migração), a gravação, o estado da ponte e os comandos
// restantes foram para public/js/motor/carga.js. Este teste roda a página
// INTEIRA duas vezes, num `vm` com a tela falsa, no modo ponte e com uma API
// de mentira (determinística, guardada na memória do teste):
//   ANTES:  carreira.js de hoje com as funções e os comandos de antes por cima
//           (tests/unit/ref_carga_antes.js, congelados);
//   DEPOIS: carreira.js de hoje (atalhos para o motor).
// Em cada mundo: a entrada sem carreira (boot), competições, escolher a
// competição e criar a carreira, a recompensa diária, a loja, o nome do
// técnico, ações no jogador, comissão, modelo de treino, avisos, som, gravar
// de novo, recarregar a carreira salva (entrada com save) e, no fim, demissão
// ou proposta de clube aceita. Confere o retorno de cada comando, o save, o
// estado da ponte, a conta, as chamadas à API (método, endereço e corpo) e os
// avisos, tudo igual.
// Uso: node tests/unit/test_motor_carga.js   (MUNDOS=30 por padrão)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const crypto = require("crypto");
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

// API de mentira, no contexto da página: conta, save, recompensa, loja e nome.
// Registra cada chamada (método, endereço e um resumo do corpo).
const API = String.raw`
var CHAMADAS_API = [], SALVO = null, CREDITOS = 100, DIA_RECEBIDO = false;
const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
fetch = async function (url, opts) {
  const metodo = (opts && opts.method) || "GET";
  CHAMADAS_API.push([metodo, String(url), opts && opts.body ? String(opts.body).length : 0]);
  if (url === "/api/auth/me") return resp(200, { authenticated: true, user: { id: "u1", name: "Técnico", createdAt: 1700000000000, onboardingSeen: true, dailyLogin: { currentStreakDay: 2, lastClaimDate: "2026-01-01" }, creditsBR: CREDITOS, friendCode: "X1", friends: [] } });
  if (url === "/api/career" && metodo === "GET") return resp(200, { career: SALVO ? JSON.parse(SALVO) : null });
  if (url === "/api/career" && metodo === "PUT") { SALVO = opts.body; return resp(200, { ok: true }); }
  if (url === "/api/career" && metodo === "DELETE") { SALVO = null; return resp(200, { ok: true }); }
  if (url === "/api/daily-login/claim") { if (DIA_RECEBIDO) return resp(409, { error: "Já recebida hoje." }); DIA_RECEBIDO = true; return resp(200, { currentStreakDay: 3, reward: { type: "credits", amount: 20 } }); }
  if (url === "/api/loja/spend-credits") { const item = JSON.parse(opts.body).itemId; if (CREDITOS < 30) return resp(402, { error: "Créditos insuficientes." }); CREDITOS -= 30; return resp(200, { creditsBR: CREDITOS, itemId: item }); }
  if (url === "/api/account/name") { const nome = JSON.parse(opts.body).name; if (nome.length > 20) return resp(400, { error: "Nome muito longo." }); return resp(200, { user: { name: nome } }); }
  if (url === "/api/health") return resp(200, { hasKey: false });
  throw new Error("sem rede");
};
`;
const STUBS = String.raw`
var AVISOS = [];
toast = function (msg, opts) { AVISOS.push([msg, opts || null]); };
openFirstEntry = function () {};
Date.now = () => 1794000000000;
`;

const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (l) => (l && l.length ? l[Math.floor(r() * l.length)] : undefined);
  const espera = async () => { for (let k = 0; k < 10; k++) await null; };
  const P = window.BRDATA_PONTE;
  const out = [];
  const reg = (nome, ret) => out.push([nome, ret === undefined ? null : JSON.parse(JSON.stringify(ret))]);
  let avisosV2 = 0;
  // Entrada sem carreira (boot no modo ponte).
  await boot(); await espera();
  P.aoMudar(() => { avisosV2++; });
  reg("estado", P.estado()); reg("conta", P.conta()); reg("versaoSave", P.versaoSave());
  reg("competicoes", P.competicoes());
  if (r() < 0.2) reg("escolherCompeticao", await P.escolherCompeticao("x"));
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  const e = await P.escolherCompeticao(comp); reg("escolherCompeticao", e);
  if (r() < 0.2) reg("criarCarreira", await P.criarCarreira("x"));
  reg("criarCarreira", await P.criarCarreira(pick(e.clubes).id));
  reg("criarCarreira", await P.criarCarreira(pick(e.clubes).id)); // já tem carreira
  reg("estado", P.estado()); reg("versaoSave", P.versaoSave());
  // Recompensa, loja e nome.
  reg("recompensa", P.recompensa());
  reg("receberRecompensa", await P.receberRecompensa());
  reg("receberRecompensa", await P.receberRecompensa());
  for (let k = 0; k < 5; k++) reg("comprarItem", await P.comprarItem(pick(BOOST_ITEMS.map((b) => b.id).concat(["x"]))));
  reg("salvarNome", await P.salvarNome(pick(["", "Novo Nome", "Um nome que passa do limite de vinte"])));
  // Elenco, comissão, treino, avisos e som.
  for (let k = 0; k < 12; k++) {
    const p = pick(CAREER.squad);
    reg("acaoJogador", await P.acaoJogador(r() < 0.1 ? "x" : p.id, pick(["removeStarter", "removeBench", "addBench", "promote", "demote", "release", "voar"])));
  }
  reg("comissao", P.comissao());
  if (r() < 0.7) reg("contratarComissao", await P.contratarComissao());
  reg("comissao", P.comissao());
  for (const area of ["lineup", "training", "tactics", "market", "x"]) reg("aplicarSugestao", await P.aplicarSugestao(area));
  reg("aplicarModeloTreino", await P.aplicarModeloTreino(pick(["equilibrio", "pre_jogo", "pretemporada", "recuperacao", "base_sub20", "x"])));
  CAREER.notifications = (CAREER.notifications || []).concat([{ id: "n1", lida: false, texto: "t" }]);
  reg("marcarAvisosLidos", await P.marcarAvisosLidos());
  reg("somAtivo", P.somAtivo(r() < 0.5));
  // Gravar de novo (resultado de partida que não gravou).
  if (r() < 0.5) PONTE.fim = { salvo: false, erro: "falha" };
  reg("salvarDeNovo", await P.salvarDeNovo());
  // Recarregar a carreira salva (entrada com save).
  CAREER = null; PONTE.pronta = false;
  await enterAfterAuth(); await espera();
  reg("estado", P.estado()); reg("versaoSave", P.versaoSave());
  // Fim de temporada: demissão ou proposta de clube.
  CAREER.currentRound = 39;
  if (r() < 0.5) { CAREER.negativeSeasonsStreak = 3; reg("demitir", await P.demitir()); }
  else {
    const outro = pick(LEAGUE_TEAMS.filter((t) => String(t.id) !== String(CAREER.clubId)));
    CAREER.clubProposals = [{ clubId: String(outro.id), clubName: outro.name }];
    reg("aceitarPropostaClube", await P.aceitarPropostaClube());
    reg("demitir", await P.demitir());
  }
  await espera();
  const ponte = {}; Object.keys(PONTE).forEach((k) => { if (k !== "ouvintes") ponte[k] = PONTE[k]; });
  return { out, avisosV2, career: CAREER ? JSON.parse(JSON.stringify(CAREER)) : null, ponte: JSON.parse(JSON.stringify(ponte, (k, v) => (v instanceof Set ? [...v] : v))),
    conta: JSON.parse(JSON.stringify(ME)), mundo: { comp: CURRENT_COMPETITION_ID, liga: (LEAGUE_TEAMS || []).map((t) => t.id), todos: (ALL_TEAMS_FLAT || []).length, live: LIVE_MODE, porComp: LIVE_MODE_BY_COMPETITION, carry: TECHNICIAN_CARRY } };
})()`;

(async () => {
  const pagina = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  const ref = fs.readFileSync(path.join(__dirname, "ref_carga_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const lado = async (antes, seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente");
    rodar(API, "api");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor");
    rodar(dataSrc, "data.js");
    rodar(pagina, "carreira.js");
    if (antes) rodar(ref, "ref_carga_antes.js");
    rodar(STUBS, "stubs");
    const r = await rodar(ROTEIRO(seed), "roteiro");
    const api = rodar("CHAMADAS_API", "x");
    const salvo = rodar("SALVO", "x");
    return JSON.parse(JSON.stringify({ ...r, avisos: rodar("AVISOS", "x"), api, salvo: salvo ? crypto.createHash("sha1").update(salvo).digest("hex") : null }));
  };
  const MUNDOS = Number(process.env.MUNDOS || 30);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) runs.push([await lado(true, 300 + k), await lado(false, 300 + k)]);

  await check(`Mesmo retorno de cada comando, o mesmo save (na memória e no servidor), a mesma conta, o mesmo mundo e o mesmo estado da ponte em ${MUNDOS} mundos`, () => {
    runs.forEach(([a, b], k) => {
      a.out.forEach((x, i) => assert.deepStrictEqual(b.out[i], x, `mundo ${k}, passo ${i} (${x[0]})`));
      assert.strictEqual(b.out.length, a.out.length, `passos, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
      assert.strictEqual(b.salvo, a.salvo, `save no servidor, mundo ${k}`);
      assert.deepStrictEqual(b.conta, a.conta, `conta, mundo ${k}`);
      assert.deepStrictEqual(b.mundo, a.mundo, `mundo, mundo ${k}`);
      assert.deepStrictEqual(b.ponte, a.ponte, `ponte, mundo ${k}`);
    });
  });
  await check("As mesmas chamadas à API (método, endereço e tamanho do corpo), na mesma ordem, e os mesmos avisos (à tela e à v2)", () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.api, a.api, `API, mundo ${k}`);
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos, mundo ${k}`);
      assert.strictEqual(b.avisosV2, a.avisosV2, `avisos à v2, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pela entrada e pelos comandos (com sucesso e com recusa)", () => {
    const ok = {}, nao = {};
    runs.forEach(([a]) => a.out.forEach(([c, ret]) => { if (ret && ret.ok === false) nao[c] = (nao[c] || 0) + 1; else ok[c] = (ok[c] || 0) + 1; }));
    console.log("   com sucesso:", JSON.stringify(ok));
    console.log("   recusados:", JSON.stringify(nao));
    for (const c of ["escolherCompeticao", "criarCarreira", "receberRecompensa", "comprarItem", "salvarNome", "acaoJogador", "aplicarSugestao", "aplicarModeloTreino", "marcarAvisosLidos", "salvarDeNovo", "demitir", "aceitarPropostaClube"]) assert.ok(ok[c] >= 2, `pouco sucesso em ${c}`);
    for (const c of ["criarCarreira", "receberRecompensa", "comprarItem", "salvarNome", "acaoJogador"]) assert.ok(nao[c] >= 2, `pouca recusa em ${c}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
