// Etapa G2a do plano "sem página escondida" (10/11): public/js/motor/v2.js abre
// o jogo SEM a página antiga e devolve a ponte montada do motor. Este teste
// joga a mesma carreira duas vezes, conduzida como a v2, num `vm` com a tela
// falsa, a mesma API de mentira, o mesmo sorteio e o mesmo relógio virtual:
//   PÁGINA:      data.js + motor + carreira.js no modo ponte (boot da página),
//                pela window.BRDATA_PONTE — como a v2 usa hoje;
//   HOSPEDEIRO:  data.js + motor, SEM carreira.js, pela ponte de abrirMotor().
// Roteiro: entrada sem carreira, competições, escolher e criar a carreira,
// recompensa, semana a semana (amistosos e avançar), partidas ao vivo com
// pausa, velocidade, substituição, tática e "pular pro fim", o pós-jogo
// inteiro, comandos de gestão, e reabrir o jogo com o save do servidor.
// Confere o retorno de cada comando, o estado da ponte a cada passo, o save no
// servidor, as chamadas à API, os timers e os avisos do motor, tudo igual.
// Uso: node tests/unit/test_motor_hospedeiro.js   (MUNDOS=40 por padrão)
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

// API de mentira (conta, save, recompensa, loja) e relógio virtual.
const BASE = String.raw`
var CHAMADAS_API = [], SALVO = null, CREDITOS = 100, DIA_RECEBIDO = false;
var FILA = [], SEQ_T = 0, AGORA = 0, TIMERS = [];
Date.now = () => 1794000000000;
setTimeout = function (fn, ms) { const id = ++SEQ_T; FILA.push({ id, t: AGORA + (ms || 0), fn }); TIMERS.push(ms || 0); return id; };
clearTimeout = function (id) { const i = FILA.findIndex((x) => x.id === id); if (i >= 0) FILA.splice(i, 1); };
function proximoTimer() { if (!FILA.length) return false; FILA.sort((a, b) => a.t - b.t || a.id - b.id); const x = FILA.shift(); AGORA = x.t; x.fn(); return true; }
const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
fetch = async function (url, opts) {
  const metodo = (opts && opts.method) || "GET";
  CHAMADAS_API.push([metodo, String(url), opts && opts.body ? String(opts.body).length : 0]);
  if (url === "/api/auth/me") return resp(200, { authenticated: true, user: { id: "u1", name: "Técnico", createdAt: 1700000000000, onboardingSeen: true, dailyLogin: { currentStreakDay: 2, lastClaimDate: "2026-01-01" }, creditsBR: CREDITOS, friendCode: "X1", friends: [] } });
  if (url === "/api/career" && metodo === "GET") return resp(200, { career: SALVO ? JSON.parse(SALVO) : null });
  if (url === "/api/career" && metodo === "PUT") { SALVO = opts.body; return resp(200, { ok: true }); }
  if (url === "/api/daily-login/claim") { if (DIA_RECEBIDO) return resp(409, { error: "Já recebida hoje." }); DIA_RECEBIDO = true; return resp(200, { currentStreakDay: 3, reward: { type: "credits", amount: 20 } }); }
  if (url === "/api/loja/spend-credits") { if (CREDITOS < 30) return resp(402, { error: "Créditos insuficientes." }); CREDITOS -= 30; return resp(200, { creditsBR: CREDITOS }); }
  if (url === "/api/health") return resp(200, { hasKey: false });
  throw new Error("sem rede");
};
var AVISOS_MOTOR = [];
`;

const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (l) => (l && l.length ? l[Math.floor(r() * l.length)] : undefined);
  const espera = async () => { for (let k = 0; k < 12; k++) await null; };
  const out = [];
  let P = await ABRIR();
  window.BRDATA_MOTOR.eventos.ouvir("aviso", (a) => AVISOS_MOTOR.push(a));
  let avisosV2 = 0; P.aoMudar(() => { avisosV2++; });
  const reg = (nome, ret) => out.push([nome, ret === undefined ? null : JSON.parse(JSON.stringify(ret))]);
  const foto = () => reg("estado", P.estado());
  foto();
  reg("competicoes", P.competicoes());
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  const e = await P.escolherCompeticao(comp); reg("escolherCompeticao", e);
  reg("criarCarreira", await P.criarCarreira(pick(e.clubes).id));
  foto(); reg("conta", P.conta()); reg("versaoSave", P.versaoSave());
  reg("recompensa", P.recompensa()); reg("receberRecompensa", await P.receberRecompensa());
  const C = () => window.BRDATA_MOTOR.estado.carreiraAtual();
  const jogar = async () => {
    for (let passo = 0; passo < 400; passo++) {
      const lm = window.BRDATA_MOTOR.estado.partidaAtual();
      if (lm && !lm.finished && r() < 0.3) {
        const a = r();
        if (a < 0.15) reg("pausar", P.pausar());
        else if (a < 0.3) reg("retomar", P.retomar());
        else if (a < 0.45) reg("velocidade", P.velocidade(pick([1, 2])));
        else if (a < 0.65) reg("substituir", P.substituir(pick(C().lineup.starters) || "x", pick(C().lineup.bench) || "y"));
        else if (a < 0.75) reg("aplicarTatica", P.aplicarTatica({ formacao: pick(["4-3-3", "4-4-2"]), eixos: { ritmo: 1 + Math.floor(r() * 5) } }));
        else if (a < 0.8) reg("pularParaFim", P.pularParaFim());
        foto(); continue;
      }
      if (lm && lm.halftime) { reg("continuarIntervalo", P.continuarIntervalo()); continue; }
      if (lm && lm.paused) { reg("retomar", P.retomar()); continue; }
      if (!proximoTimer()) { await espera(); if (!FILA.length) break; }
      await espera(); foto();
    }
    await espera();
  };
  const posJogo = async () => {
    reg("iniciarPosJogo", P.iniciarPosJogo());
    for (let k = 0; k < 20; k++) {
      const et = P.posJogo(); reg("posJogo", et);
      if (et.etapa === "coletiva") reg("responderColetiva", await P.responderColetiva(pick(["A", "B", "C"])));
      else if (et.etapa === "noticias" || et.etapa === "resultados") reg("concluirEtapa", P.concluirEtapa(et.etapa));
      else if (et.etapa === "copa") { reg("iniciarPernaCopa", P.iniciarPernaCopa()); await jogar(); }
      else if (et.etapa === "proposta") reg("responderProposta", await P.responderProposta(pick(["aceitar", "recusar", "depois"])));
      else break;
      await espera();
    }
    reg("encerrarPosJogo", P.encerrarPosJogo()); reg("descartar", P.descartar()); foto();
  };
  let rodadas = 0;
  for (let semana = 0; semana < 30 && rodadas < 4; semana++) {
    const w = window.BRDATA_MOTOR.semana.calendarWeek();
    if (w && !w.r) {
      const slot = window.BRDATA_MOTOR.jogo.friendlySlotThisWeek();
      if (slot && r() < 0.7) {
        if (slot.invites && slot.invites.length && !slot.opp) reg("escolherAmistoso", await P.escolherAmistoso(pick(slot.invites)));
        reg("iniciarAmistoso", P.iniciarAmistoso());
        if (window.BRDATA_MOTOR.estado.partidaAtual()) { await jogar(); reg("resumoSemana", P.resumoSemana()); continue; }
      }
      reg("avancarSemana", await P.avancarSemana(r() < 0.5)); reg("resumoSemana", P.resumoSemana());
      continue;
    }
    rodadas++;
    reg("iniciar", P.iniciar()); await jogar(); await posJogo();
    // Gestão entre as rodadas (pela porta genérica, como a v2).
    reg("mercado", P.executar("mercado"));
    reg("salvarTatica", await P.executar("salvarTatica", { ritmo: 1 + Math.floor(r() * 5), pressao: 3 }));
    reg("escalarAutomaticamente", await P.executar("escalarAutomaticamente", r() < 0.5));
    reg("treino", P.executar("treino")); reg("tatica", P.executar("tatica")); reg("orcamento", P.executar("orcamento"));
    reg("desconhecido", P.executar("naoExiste")); reg("executarRecursivo", P.executar("executar", "mercado"));
    reg("preferencias", P.executar("preferencias")); reg("somAtivo", P.somAtivo(r() < 0.5)); reg("preferencias", P.executar("preferencias"));
    reg("historicoTreinador", P.executar("historicoTreinador"));
    // G2c: comandos de clube com custos e totais (achados pela v2 sem o quadro).
    reg("comissao", P.executar("comissao")); reg("olheiros", P.executar("olheiros"));
    reg("patrocinios", await P.executar("patrocinios"));
  }
  // Reabrir o jogo com o save do servidor.
  window.BRDATA_MOTOR.estado.definirCarreira(null);
  P = await REABRIR();
  foto(); reg("versaoSave", P.versaoSave());
  return { out, avisosV2 };
})()`;

(async () => {
  const pagina = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const lado = async (comPagina, seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente");
    rodar(BASE, "base");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor");
    rodar(dataSrc, "data.js");
    if (comPagina) {
      rodar(pagina, "carreira.js");
      // Só tela, com timers próprios (esconder o aviso, atraso do "carregando"):
      // fora, para o relógio virtual contar só os timers do jogo.
      rodar("toast = function () {}; beginActionLoading = function () {}; endActionLoading = function () {};", "so-tela");
      rodar(`var ABRIR = async () => { await boot(); for (let k = 0; k < 12; k++) await null; return window.BRDATA_PONTE; };
             var REABRIR = async () => { PONTE.pronta = false; ME = (await fetchJSON("/api/auth/me")).user; await enterAfterAuth(); for (let k = 0; k < 12; k++) await null; return window.BRDATA_PONTE; };`, "abrir");
    } else {
      rodar(`var ABRIR = async () => (await window.BRDATA_MOTOR.v2.abrirMotor()).ponte;
             var REABRIR = async () => { window.BRDATA_MOTOR.ponte.ponte.pronta = false; return (await window.BRDATA_MOTOR.v2.abrirMotor()).ponte; };`, "abrir");
    }
    const r = await rodar(ROTEIRO(seed), "roteiro");
    const salvo = rodar("SALVO", "x");
    return JSON.parse(JSON.stringify({ ...r, api: rodar("CHAMADAS_API", "x"), timers: rodar("TIMERS", "x"), avisos: rodar("AVISOS_MOTOR", "x"),
      salvo: salvo ? crypto.createHash("sha1").update(salvo).digest("hex") : null, temPagina: rodar("typeof boot", "x") }));
  };
  const MUNDOS = Number(process.env.MUNDOS || 40);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) runs.push([await lado(true, 100 + k), await lado(false, 100 + k)]);

  await check("O hospedeiro roda SEM a página (nenhum carreira.js carregado)", () => {
    runs.forEach(([a, b]) => { assert.strictEqual(a.temPagina, "function"); assert.strictEqual(b.temPagina, "undefined"); });
  });
  await check(`Mesmo retorno de cada comando e o mesmo estado da ponte a cada passo em ${MUNDOS} mundos (criar, semanas, 4 partidas ao vivo com pós-jogo, gestão, reabrir)`, () => {
    runs.forEach(([a, b], k) => {
      a.out.forEach((x, i) => assert.deepStrictEqual(b.out[i], x, `mundo ${k}, passo ${i} (${x[0]})`));
      assert.strictEqual(b.out.length, a.out.length, `passos, mundo ${k}`);
    });
  });
  await check("O mesmo save no servidor, as mesmas chamadas à API, os mesmos timers, os mesmos avisos do motor e os mesmos avisos à v2", () => {
    runs.forEach(([a, b], k) => {
      assert.strictEqual(b.salvo, a.salvo, `save, mundo ${k}`);
      assert.deepStrictEqual(b.api, a.api, `API, mundo ${k}`);
      assert.deepStrictEqual(b.timers, a.timers, `timers, mundo ${k}`);
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos do motor, mundo ${k}`);
      assert.strictEqual(b.avisosV2, a.avisosV2, `avisos à v2, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelo jogo (partidas, pós-jogo, amistosos, gestão e reabertura)", () => {
    const conta = {};
    runs.forEach(([a]) => a.out.forEach(([c, ret]) => { if (c !== "estado" && !(ret && ret.ok === false)) conta[c] = (conta[c] || 0) + 1; }));
    console.log("   cobertura:", JSON.stringify(conta));
    for (const c of ["criarCarreira", "iniciar", "iniciarPosJogo", "concluirEtapa", "avancarSemana", "salvarTatica", "versaoSave"]) assert.ok((conta[c] || 0) >= 3, `pouco de ${c}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
