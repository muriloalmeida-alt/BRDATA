// Etapa G1b do plano "sem página escondida" (10/11): os comandos de partida,
// pós-jogo, semana e temporada da ponte e a condução da partida (relógio,
// destaques de gol, fim da partida, da perna da Copa e do amistoso) foram para
// public/js/motor/jogo.js. Este teste roda a página INTEIRA duas vezes, num
// `vm` com a tela falsa, no modo ponte, sem rede e com um RELÓGIO VIRTUAL (os
// timers ficam numa fila e o teste os dispara um a um, na mesma ordem):
//   ANTES:  carreira.js de hoje com os comandos e as funções de antes por cima
//           (tests/unit/ref_jogo_antes.js, congelados);
//   DEPOIS: carreira.js de hoje (comandos atalhos para o motor).
// Em cada mundo cria uma carreira e joga várias rodadas como a v2: semana,
// amistoso, partida ao vivo com pausa, intervalo, velocidade, substituições,
// tática e "pular pro fim" sorteados entre os blocos, e o pós-jogo inteiro
// (coletiva, notícias, resultados, perna da Copa ao vivo, proposta). No fim,
// a virada de temporada e a recusa de proposta de clube.
// Confere o retorno de cada comando, o save, o estado da ponte, os avisos à
// v2, os timers (quando e quanto), as chamadas de desenho e de som da página
// e as gravações, tudo igual.
// Uso: node tests/unit/test_motor_jogo.js   (MUNDOS=30 por padrão)
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

// Relógio virtual: setTimeout/clearTimeout da página guardam numa fila.
const RELOGIO = String.raw`
var FILA = [], SEQ_T = 0, AGORA = 0, TIMERS = [];
setTimeout = function (fn, ms) { const id = ++SEQ_T; FILA.push({ id, t: AGORA + (ms || 0), fn }); TIMERS.push(["agendar", ms || 0]); return id; };
clearTimeout = function (id) { const i = FILA.findIndex((x) => x.id === id); if (i >= 0) { FILA.splice(i, 1); TIMERS.push(["cancelar"]); } };
function proximoTimer() {
  if (!FILA.length) return false;
  FILA.sort((a, b) => a.t - b.t || a.id - b.id);
  const x = FILA.shift(); AGORA = x.t; x.fn(); return true;
}
`;
// Gravação e tela de mentira; registro das chamadas de desenho e som.
const STUBS = String.raw`
var AVISOS = [], GRAVOU = 0, CHAMADAS = [], AVISOS_V2 = 0;
toast = function (msg, opts) { AVISOS.push([msg, opts || null]); };
persistCareer = async function () { GRAVOU++; return true; };
openFirstEntry = function () {};
Date.now = () => 1794000000000;
ouvirAvisosDoMotor();
// Desenho e som que a página faz nos dois lados (no modo ponte, renderAll,
// renderLiveMatch e commitLineupTactics só fazem lógica: comparados pelo
// estado da ponte e pelos avisos à v2).
for (const nome of ["renderGoalHighlight", "playWhistle", "playGoal", "startCrowdAmbience", "stopCrowdAmbience", "showMatchDetailModal",
  "openPlayerOfferModal", "openTabelaModal", "closePreMatchConfirm", "closeAdjustLineupModal"]) {
  const f = window[nome];
  window[nome] = function (...a) { CHAMADAS.push([nome, JSON.parse(JSON.stringify(a))]); return f.apply(this, a); };
}
`;

const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (l) => (l && l.length ? l[Math.floor(r() * l.length)] : undefined);
  const espera = async () => { for (let k = 0; k < 8; k++) await null; };
  const P = window.BRDATA_PONTE;
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  CURRENT_COMPETITION_ID = comp; LEAGUE_TEAMS = DEMO_DATA_BY_COMPETITION[comp].teams; LIVE_MODE = false;
  await startCareer(pick(LEAGUE_TEAMS).id);
  ME = { name: "Técnico", createdAt: 1700000000000 };
  PONTE.pronta = true;
  P.aoMudar(() => { AVISOS_V2++; });
  const out = [];
  const reg = (nome, ret) => out.push([nome, ret === undefined ? null : JSON.parse(JSON.stringify(ret))]);
  const foto = () => { const lm = LIVE_MATCH; return lm ? { m: lm.minute, gh: lm.gh, ga: lm.ga, p: !!lm.paused, h: !!lm.halftime, f: !!lm.finished, sp: lm.speed, b: lm.chunkIndex } : null; };
  // Partida ao vivo: entre os blocos, ações sorteadas como a v2.
  const jogar = async () => {
    for (let passo = 0; passo < 500; passo++) {
      const lm = LIVE_MATCH;
      if (lm && !lm.finished && r() < 0.35) {
        const a = r();
        if (a < 0.1) reg("pausar", P.pausar());
        else if (a < 0.2) reg("retomar", P.retomar());
        else if (a < 0.3) reg("continuarIntervalo", P.continuarIntervalo());
        else if (a < 0.4) reg("velocidade", P.velocidade(pick([1, 2])));
        else if (a < 0.6) reg("substituir", P.substituir(pick(CAREER.lineup.starters) || "x", pick(CAREER.lineup.bench) || "y"));
        else if (a < 0.7) reg("aplicarTatica", P.aplicarTatica({ formacao: pick(["4-3-3", "4-4-2", "3-5-2", "x"]), eixos: { ritmo: 1 + Math.floor(r() * 5), pressao: 3 } }));
        else if (a < 0.74) reg("pularParaFim", P.pularParaFim());
        out.push(["lm", foto()]);
        continue;
      }
      if (lm && lm.halftime && r() < 0.7) { reg("continuarIntervalo", P.continuarIntervalo()); continue; }
      if (lm && lm.paused && !lm.halftime) { reg("retomar", P.retomar()); continue; }
      if (!proximoTimer()) { await espera(); if (!FILA.length) break; }
      await espera();
      out.push(["lm", foto()]);
    }
    await espera();
  };
  const posJogo = async () => {
    // Proposta por um jogador seu (o jogo sorteia, raro em 7 rodadas): às vezes injetada.
    if (!CAREER.pendingOffer && r() < 0.3) { const p = pick(CAREER.squad.filter((x) => x.origin === "principal")); CAREER.pendingOffer = { playerId: p.id, playerName: p.name, clubId: pick(Object.keys(CAREER.leagueSquads)), clubName: "Rival", fee: 4e6, round: CAREER.currentRound }; }
    reg("iniciarPosJogo", P.iniciarPosJogo());
    for (let k = 0; k < 20; k++) {
      const e = P.posJogo(); reg("posJogo", e);
      if (e.etapa === "coletiva") reg("responderColetiva", await P.responderColetiva(pick(["A", "B", "C", "Z"])));
      else if (e.etapa === "noticias" || e.etapa === "resultados") reg("concluirEtapa", P.concluirEtapa(r() < 0.1 ? "x" : e.etapa));
      else if (e.etapa === "copa") { reg("iniciarPernaCopa", P.iniciarPernaCopa()); await jogar(); }
      else if (e.etapa === "proposta") reg("responderProposta", await P.responderProposta(pick(["aceitar", "recusar", "depois", "x"])));
      else break;
      await espera();
    }
    reg("encerrarPosJogo", P.encerrarPosJogo());
    reg("descartar", P.descartar());
  };
  // Da pré-temporada em diante, semana a semana como a v2: semana sem jogo
  // (amistoso ou avançar) ou rodada (partida ao vivo e pós-jogo).
  let rodadas = 0;
  for (let semana = 0; semana < 40 && rodadas < 7; semana++) {
    const w = calendarWeek();
    if (w && !w.r) {
      const slot = friendlySlotThisWeek();
      if (slot && r() < 0.8) {
        if (slot.invites && slot.invites.length && !slot.opp) reg("escolherAmistoso", await P.escolherAmistoso(r() < 0.1 ? "x" : pick(slot.invites)));
        reg("iniciarAmistoso", P.iniciarAmistoso());
        if (LIVE_MATCH) { await jogar(); reg("resumoSemana", P.resumoSemana()); continue; }
      }
      reg("avancarSemana", await P.avancarSemana(r() < 0.5));
      reg("resumoSemana", P.resumoSemana());
      continue;
    }
    rodadas++;
    reg("iniciar", P.iniciar());
    await jogar();
    await posJogo();
  }
  // Fim de temporada: virada e proposta de clube.
  reg("proximaTemporada", await P.proximaTemporada());
  CAREER.currentRound = 39;
  reg("proximaTemporada", await P.proximaTemporada());
  if (r() < 0.5) CAREER.clubProposals = [{ clubId: "x", clubName: "Outro" }];
  reg("recusarPropostaClube", await P.recusarPropostaClube());
  await espera();
  const ponte = {}; Object.keys(PONTE).forEach((k) => { if (k !== "ouvintes") ponte[k] = PONTE[k] instanceof Set ? [...PONTE[k]] : PONTE[k]; });
  return { out, career: JSON.parse(JSON.stringify(CAREER)), ponte: JSON.parse(JSON.stringify(ponte, (k, v) => (v instanceof Set ? [...v] : v))) };
})()`;

(async () => {
  const pagina = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  const ref = fs.readFileSync(path.join(__dirname, "ref_jogo_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const lado = async (antes, seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.fetch = () => Promise.reject(new Error("sem rede"));
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente");
    rodar(RELOGIO, "relogio");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor");
    rodar(dataSrc, "data.js");
    rodar(pagina, "carreira.js");
    if (antes) rodar(ref, "ref_jogo_antes.js");
    rodar(STUBS, "stubs");
    const r = await rodar(ROTEIRO(seed), "roteiro");
    return JSON.parse(JSON.stringify({ ...r, avisos: rodar("AVISOS", "x"), gravou: rodar("GRAVOU", "x"), chamadas: rodar("CHAMADAS", "x"), timers: rodar("TIMERS", "x"), avisosV2: rodar("AVISOS_V2", "x") }));
  };
  const MUNDOS = Number(process.env.MUNDOS || 30);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) runs.push([await lado(true, 500 + k), await lado(false, 500 + k)]);

  await check(`Mesmo retorno de cada comando, a mesma partida bloco a bloco, o mesmo save e o mesmo estado da ponte em ${MUNDOS} mundos (7 rodadas e a virada em cada)`, () => {
    runs.forEach(([a, b], k) => {
      a.out.forEach((x, i) => assert.deepStrictEqual(b.out[i], x, `mundo ${k}, passo ${i} (${x[0]})`));
      assert.strictEqual(b.out.length, a.out.length, `passos, mundo ${k}`);
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
      assert.deepStrictEqual(b.ponte, a.ponte, `ponte, mundo ${k}`);
    });
  });
  await check("Mesmos timers (quando e quanto), as mesmas chamadas de desenho e som, os mesmos avisos (à tela e à v2) e as mesmas gravações", () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.timers, a.timers, `timers, mundo ${k}`);
      assert.deepStrictEqual(b.chamadas, a.chamadas, `chamadas, mundo ${k}`);
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos, mundo ${k}`);
      assert.strictEqual(b.avisosV2, a.avisosV2, `avisos à v2, mundo ${k}`);
      assert.strictEqual(b.gravou, a.gravou, `gravações, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelo jogo (partidas, amistosos, pernas da Copa, intervalos, gols, pós-jogo, coletivas, propostas e a virada)", () => {
    const conta = {};
    const soma = (k, v = 1) => { conta[k] = (conta[k] || 0) + v; };
    runs.forEach(([a]) => {
      a.out.forEach(([c, ret]) => { if (c !== "lm" && !(ret && ret.ok === false)) soma(c); });
      soma("gols", a.chamadas.filter((x) => x[0] === "playGoal").length);
      soma("timers", a.timers.length);
    });
    console.log("   cobertura:", JSON.stringify(conta));
    for (const k of ["iniciar", "iniciarAmistoso", "iniciarPernaCopa", "continuarIntervalo", "substituir", "aplicarTatica", "pularParaFim", "responderColetiva", "concluirEtapa", "responderProposta", "proximaTemporada", "recusarPropostaClube", "gols"]) assert.ok((conta[k] || 0) >= 2, `pouco de ${k}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
