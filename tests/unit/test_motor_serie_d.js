// SERIED-001 (13/11/2026): a Série D do catálogo de 2026 na carreira e na
// Copa do Brasil, sem página (data.js + motor, pela ponte de abrirMotor(),
// como a v2). Decisões do Murilo (13/11):
//   - ABC, Retrô, CSA e Tombense continuam na Série C (a D ativa tem 36);
//   - a Copa com a D tem uma fase preliminar em jogo único na rodada 1;
//   - só carreiras novas recebem o catálogo (as de antes seguem com a D delas).
// Confere:
//   1) carreira nova: a D é o catálogo (ids estáveis), sem duplicar quem já está na C;
//   2) Copa com 96 clubes: cada clube uma vez; 64 na preliminar (D, C e os
//      mais fracos da B), 32 direto na 1ª fase (A e o resto da B); sem cabeças de chave;
//   3) a temporada inteira da Copa, com as partidas do técnico como na tela
//      (perna ao vivo): a preliminar decide em jogo único, a Copa segue até a
//      final mesmo com o técnico eliminado, e o adversário da D ganha elenco
//      no save só quando cruza com o técnico;
//   4) histórico por edição (campeão, vice, campanha do técnico);
//   5) virada: acesso C <-> D com a mesma identidade; elencos da D da Copa
//      somem; a nova Copa tem de novo a preliminar; semana da rodada 1 com 2 jogos;
//   6) carreira de antes (D de exemplo, sem o catálogo) continua e a Copa dela
//      também ganha a preliminar com o tamanho que tiver;
//   7) 10 temporadas seguidas, salvando e reabrindo o save a cada uma, com
//      acesso, descenso, eliminação cedo e as medidas (tempo, memória, save).
// Uso: node tests/unit/test_motor_serie_d.js   (TEMPORADAS=10 por padrão)
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
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
const SEMEAR = (seed) => `(() => { let a = ${seed} >>> 0; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
const BASE = String.raw`
var SALVO = null;
Date.now = () => 1794000000000;
const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
fetch = async function (url, opts) {
  const metodo = (opts && opts.method) || "GET";
  if (url === "/api/auth/me") return resp(200, { authenticated: true, user: { id: "u1", name: "Técnico", createdAt: 1700000000000, onboardingSeen: true, dailyLogin: {}, creditsBR: 0, friendCode: "X1", friends: [] } });
  if (url === "/api/career" && metodo === "GET") return resp(200, { career: SALVO ? JSON.parse(SALVO) : null });
  if (url === "/api/career" && metodo === "PUT") { SALVO = opts.body; return resp(200, { ok: true }); }
  throw new Error("sem rede");
};`;

// Uma temporada da Copa: as rodadas de Copa em ordem; a perna do técnico é
// jogada como na tela (iniciarPernaCopa + placar + encerrarPernaCopa).
const JOGAR_COPA = String.raw`
async function jogarCopa(M, C, r, obs) {
  const rodadas = [M.fechamento.CUP_PRELIM_ROUND, ...Object.values(M.fechamento.CUP_ROUNDS_EXPANDED).flatMap((x) => [x.ida, x.volta])];
  for (const rd of rodadas) {
    const cup = C().cup;
    if (!cup || cup.phase === "done") break;
    M.fechamento.resolveCupPhase(rd);
    const leg = C().cup.pendingLiveLeg;
    if (leg) {
      const tie = C().cup.ties[leg.phase].find((t) => String(t.home) === String(C().clubId) || String(t.away) === String(C().clubId));
      const opp = String(String(tie.home) === String(C().clubId) ? tie.away : tie.home);
      const ehD = (C().serieDPool || []).some((t) => String(t.id) === opp);
      if (ehD) obs.contraD.push({ fase: leg.phase, opp, elenco: M.semana.leagueSquadFor(opp).length, noSave: !!(C().elencosSerieD || {})[opp] });
      M.posjogo.iniciarPernaCopa(tie, leg.phase, leg.leg, leg.round);
      const lm = M.estado.partidaAtual();
      lm.gh = Math.floor(r() * 3); lm.ga = Math.floor(r() * 3);
      M.posjogo.encerrarPernaCopa();
      M.estado.definirPartida(null);
      obs.pernas.push(leg.phase);
    }
  }
}`;

const ROTEIRO = (seed, temporadas) => String.raw`(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = window.BRDATA_MOTOR;
  const P = (await M.v2.abrirMotor()).ponte;
  const e = await P.escolherCompeticao(${JSON.stringify(seed % 3 === 0 ? "serie_c" : seed % 3 === 1 ? "serie_b" : "brasileirao")});
  await P.criarCarreira(e.clubes[${seed} % e.clubes.length].id);
  const C = () => M.estado.carreiraAtual();
  const out = { catalogo: CATALOGO_SERIE_D.map((t) => ({ id: t.id, noJogo: t.noJogo || null })) };
  out.d = C().serieDPool.map((t) => String(t.id));
  out.c = (C().divisionTeams.serie_c || []).map((t) => String(t.id));
  out.divisoes = Object.fromEntries(Object.entries(C().divisionTeams).map(([k, v]) => [k, v.map((t) => String(t.id))]));
  out.forcas = Object.fromEntries([...Object.values(C().divisionTeams).flat(), ...C().serieDPool].map((t) => [String(t.id), M.estado.forcaMediaDoElenco(t.id)]));
  const cup = C().cup;
  out.copa = { participantes: cup.participantes, fase: cup.phase, seeds: cup.seeds, direct: cup.prelim && cup.prelim.direct, prelim: cup.ties.prelim.map((t) => [String(t.home), String(t.away)]) };
  out.semana1 = C().calendar.weeks.find((w) => w.r === 1);
  out.timePorIdD = M.estado.timePorId(out.d[0]);
  const temporadasOut = [];
  for (let k = 0; k < ${temporadas}; k++) {
    const t0 = __relogio();
    const obs = { pernas: [], contraD: [] };
    const antesC = (C().divisionTeams.serie_c || []).map((t) => String(t.id)), antesD = C().serieDPool.map((t) => String(t.id));
    const nomes = Object.fromEntries([...Object.values(C().divisionTeams).flat(), ...C().serieDPool].map((t) => [String(t.id), t.name]));
    const copaAntes = { participantes: C().cup.participantes, prelim: C().cup.ties.prelim ? C().cup.ties.prelim.length : 0, direct: C().cup.prelim ? C().cup.prelim.direct.length : 0 };
    await jogarCopa(M, C, r, obs);
    const fim = { campeao: C().cup.champion, fase: C().cup.phase, eliminado: C().cup.humanEliminatedStage, vivo: C().cup.humanAlive, historico: (C().copaHistorico || []).length, ultimo: (C().copaHistorico || []).slice(-1)[0] || null };
    // Virada: rodada 39 e a próxima temporada, como a ponte faz. A meta da
    // diretoria fica fora do teste (sem demissão por temporadas ruins).
    C().currentRound = 39; C().negativeSeasonsStreak = 0;
    const v = await P.proximaTemporada();
    const depoisC = (C().divisionTeams.serie_c || []).map((t) => String(t.id)), depoisD = C().serieDPool.map((t) => String(t.id));
    const nomesDepois = Object.fromEntries([...Object.values(C().divisionTeams).flat(), ...C().serieDPool].map((t) => [String(t.id), t.name]));
    // Salva e reabre (o save que vai ao servidor).
    const save = JSON.stringify(C());
    M.estado.definirCarreira(JSON.parse(save));
    temporadasOut.push({
      ok: !!(v && v.ok), copaAntes, obs, fim,
      sobemDaD: depoisC.filter((id) => antesD.includes(id)), caemDaC: depoisD.filter((id) => antesC.includes(id)),
      tamD: depoisD.length, tamC: depoisC.length, nomesIguais: Object.keys(nomesDepois).every((id) => !nomes[id] || nomes[id] === nomesDepois[id]),
      elencoDeQuemSobe: depoisC.filter((id) => antesD.includes(id)).map((id) => (C().leagueSquads[id] || []).length),
      elencosDaCopa: Object.keys(C().elencosSerieD || {}),
      adversarioNaNovaCopa: (() => { const t = (C().cup.ties[C().cup.phase] || []).find((x) => String(x.home) === String(C().clubId) || String(x.away) === String(C().clubId)); return t ? String(String(t.home) === String(C().clubId) ? t.away : t.home) : null; })(),
      novaCopa: { participantes: C().cup.participantes, fase: C().cup.phase, prelim: (C().cup.ties.prelim || []).length },
      semana1: (C().calendar.weeks.find((w) => w.r === 1) || {}).c || 0,
      saveBytes: save.length, ms: __relogio() - t0, heap: process.memoryUsage ? process.memoryUsage().heapUsed : null,
      unicos: (() => { const ids = [...Object.values(C().divisionTeams).flat(), ...C().serieDPool].map((t) => String(t.id)); return ids.length === new Set(ids).size; })(),
    });
  }
  out.temporadas = temporadasOut;
  return JSON.stringify(out);
})()`;

// Carreira de antes do catálogo: D de exemplo (ids antigos) no save.
const ANTIGA = String.raw`(async () => {
  const M = window.BRDATA_MOTOR;
  const P = (await M.v2.abrirMotor()).ponte;
  const e = await P.escolherCompeticao("serie_c");
  await P.criarCarreira(e.clubes[3].id);
  const C = () => M.estado.carreiraAtual();
  const antiga = ["mna", "joi", "gam", "apr", "mad", "rbr", "bsl", "rbs", "srr", "pds", "cbr", "jac", "ala", "sgp", "ctr", "ptl", "tze", "trm", "gen", "brz"]
    .map((id, i) => ({ id, name: "Antigo " + id, short: id.toUpperCase(), c1: "#111", c2: "#fff", atk: 1 + i / 100, def: 1.2, competitionId: "serie_d" }));
  C().serieDPool = antiga;
  C().currentRound = 39;
  const v = await P.proximaTemporada();
  return JSON.stringify({ ok: !!(v && v.ok), d: C().serieDPool.map((t) => String(t.id)), participantes: C().cup.participantes, prelim: (C().cup.ties.prelim || []).length, fase: C().cup.phase });
})()`;

(async () => {
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const abrir = (seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    win.process = { memoryUsage: () => process.memoryUsage() };
    win.__relogio = () => Number(process.hrtime.bigint() / 1000000n);
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente"); rodar(BASE, "base");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor"); rodar(dataSrc, "data.js"); rodar(JOGAR_COPA, "copa");
    return rodar;
  };
  const TEMPORADAS = Number(process.env.TEMPORADAS || 10);
  const t0 = Date.now();
  const mundos = [];
  for (const seed of [6100, 6101, 6102]) mundos.push(JSON.parse(await abrir(seed)(ROTEIRO(seed, seed === 6100 ? TEMPORADAS : 2), "roteiro")));
  const totalMs = Date.now() - t0;
  const antiga = JSON.parse(await abrir(6200)(ANTIGA, "antiga"));
  const w = mundos[0];

  await check("Carreira nova: a Série D é o catálogo de 2026 (36 ativos, ids estáveis) e ABC, Retrô, CSA e Tombense ficam só na Série C", () => {
    const ativos = w.catalogo.filter((c) => !c.noJogo).map((c) => c.id);
    assert.deepStrictEqual([...w.d].sort(), [...ativos].sort());
    assert.strictEqual(w.d.length, 36);
    w.catalogo.filter((c) => c.noJogo).forEach((c) => {
      assert.ok(!w.d.includes(c.id), `${c.id} duplicado na D`);
      assert.ok(Object.values(w.divisoes).flat().includes(c.noJogo), `${c.noJogo} fora das divisões`);
    });
    assert.ok(w.timePorIdD && w.timePorIdD.name && !/^Time #/.test(w.timePorIdD.name), JSON.stringify(w.timePorIdD));
  });
  await check("Copa com 96 clubes: cada um uma vez; 64 na preliminar (36 da D, 20 da C, 8 mais fracos da B) e 32 direto (A e os 12 mais fortes da B); sem cabeças de chave; rodada 1 com 2 jogos", () => {
    mundos.forEach((m, k) => {
      const prelim = m.copa.prelim.flat(), todos = [...prelim, ...m.copa.direct];
      assert.strictEqual(m.copa.participantes, 96, `mundo ${k}`);
      assert.strictEqual(prelim.length, 64); assert.strictEqual(m.copa.direct.length, 32);
      assert.strictEqual(new Set(todos).size, 96, `repetido, mundo ${k}`);
      assert.deepStrictEqual(m.copa.seeds, []);
      m.d.forEach((id) => assert.ok(prelim.includes(id), `D ${id} fora da preliminar`));
      m.divisoes.serie_c.forEach((id) => assert.ok(prelim.includes(id), `C ${id} fora da preliminar`));
      m.divisoes.brasileirao.forEach((id) => assert.ok(m.copa.direct.includes(id), `A ${id} fora do direto`));
      const bPre = m.divisoes.serie_b.filter((id) => prelim.includes(id)), bDir = m.divisoes.serie_b.filter((id) => m.copa.direct.includes(id));
      assert.strictEqual(bPre.length, 8);
      assert.ok(Math.max(...bPre.map((id) => m.forcas[id])) <= Math.min(...bDir.map((id) => m.forcas[id])), "B mais forte na preliminar");
      assert.strictEqual(m.semana1.c, 1, `semana da rodada 1, mundo ${k}`);
    });
  });
  await check("A Copa vai até a final em toda temporada (mesmo com o técnico eliminado), com a preliminar em jogo único, e o histórico guarda cada edição", () => {
    w.temporadas.forEach((t, k) => {
      assert.strictEqual(t.fim.fase, "done", `temporada ${k}`);
      assert.ok(t.fim.campeao != null, `sem campeão, temporada ${k}`);
      assert.strictEqual(t.fim.historico, Math.min(k + 1, 15), `histórico, temporada ${k}`);
      assert.ok(t.fim.ultimo.campeao && t.fim.ultimo.vice && t.fim.ultimo.campeao !== t.fim.ultimo.vice, JSON.stringify(t.fim.ultimo));
      if (t.fim.ultimo.jogos.some((j) => j.fase === "prelim")) assert.ok(t.fim.ultimo.jogos.filter((j) => j.fase === "prelim").every((j) => j.volta === null), "preliminar com volta");
    });
    const elimCedo = w.temporadas.filter((t) => ["prelim", "fase1", "r32"].includes(t.fim.eliminado)).length;
    console.log("   campanhas do técnico:", w.temporadas.map((t) => t.fim.ultimo.fase).join(", "));
    assert.ok(elimCedo > 0, "nenhuma eliminação cedo");
  });
  await check("Adversário da Série D ganha elenco no save só quando cruza com o técnico (e some na virada)", () => {
    const cruzou = mundos.flatMap((m) => m.temporadas.flatMap((t) => t.obs.contraD));
    console.log("   jogos do técnico contra clube da D:", cruzou.length);
    assert.ok(cruzou.length > 0, "o técnico nunca enfrentou um clube da D");
    cruzou.forEach((x) => assert.ok(x.elenco >= 11 && x.noSave, JSON.stringify(x)));
    // Depois da virada só pode haver o elenco do adversário da D na Copa nova.
    mundos.forEach((m) => m.temporadas.forEach((t) => assert.ok(t.elencosDaCopa.every((id) => id === t.adversarioNaNovaCopa), JSON.stringify([t.elencosDaCopa, t.adversarioNaNovaCopa]))));
  });
  await check("Virada: 4 sobem da D e 4 caem da C, com a mesma identidade; quem sobe ganha elenco; a nova Copa tem de novo a preliminar", () => {
    mundos.forEach((m, k) => m.temporadas.forEach((t, j) => {
      assert.ok(t.ok, `virada ${k}/${j}`);
      assert.strictEqual(t.sobemDaD.length, 4, `sobem ${k}/${j}`); assert.strictEqual(t.caemDaC.length, 4, `caem ${k}/${j}`);
      assert.strictEqual(t.tamD, 36); assert.strictEqual(t.tamC, 20);
      assert.ok(t.nomesIguais, `nome trocado ${k}/${j}`); assert.ok(t.unicos, `id repetido ${k}/${j}`);
      t.elencoDeQuemSobe.forEach((nEl) => assert.ok(nEl >= 11, `elenco de quem sobe: ${nEl}`));
      assert.deepStrictEqual(t.novaCopa, { participantes: 96, fase: "prelim", prelim: 32 });
      assert.strictEqual(t.semana1, 1);
    }));
  });
  await check("Carreira de antes do catálogo: segue com a D dela (sem migrar) e a Copa dela ganha a preliminar com o tamanho que tiver", () => {
    assert.ok(antiga.ok, JSON.stringify(antiga));
    assert.ok(antiga.d.every((id) => !/-/.test(id)) || antiga.d.some((id) => ["mna", "joi"].includes(id)), JSON.stringify(antiga.d));
    assert.strictEqual(antiga.participantes, 80);
    assert.strictEqual(antiga.prelim, 16);
    assert.strictEqual(antiga.fase, "prelim");
  });
  await check(`${TEMPORADAS} temporadas, salvando e reabrindo a cada uma: save abaixo de 768 KB, tempo e memória medidos`, () => {
    const t = w.temporadas;
    const kb = t.map((x) => Math.round(x.saveBytes / 1024));
    const ms = t.map((x) => x.ms);
    const mb = t.map((x) => (x.heap ? Math.round(x.heap / 1048576) : null));
    console.log(`   save (KB) por temporada: ${kb.join(" ")}`);
    console.log(`   tempo da Copa + virada (ms): ${ms.join(" ")} | total do teste: ${totalMs} ms`);
    console.log(`   memória (heap, MB): ${mb.join(" ")}`);
    assert.strictEqual(t.length, TEMPORADAS);
    assert.ok(Math.max(...kb) < 768, `save grande demais: ${Math.max(...kb)} KB`);
    assert.ok(kb[kb.length - 1] - kb[0] < 120, `save crescendo demais: ${kb[0]} -> ${kb[kb.length - 1]} KB`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
