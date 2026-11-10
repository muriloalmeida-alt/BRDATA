// Etapa G1a do plano "sem página escondida" (10/11): os comandos de consulta e
// de gestão da ponte (window.BRDATA_PONTE) e o estado dela foram para
// public/js/motor/ponte.js. Este teste roda a página INTEIRA duas vezes, num
// `vm` com a tela falsa, no modo ponte e sem rede (dados de exemplo):
//   ANTES:  carreira.js de hoje com os comandos e as funções de antes por cima
//           (tests/unit/ref_ponte_antes.js, congelados);
//   DEPOIS: carreira.js de hoje (comandos atalhos para o motor).
// Em cada mundo cria uma carreira e chama, em ordem sorteada, os 56 comandos
// movidos (consultas e gestão: elenco, mercado, clube, loja, preferências,
// tática, esquemas, marcação, comissão e treino), com argumentos válidos e
// inválidos. Confere o retorno de cada comando, o save, o estado da ponte,
// os avisos e quantas vezes gravou, tudo igual.
// Uso: node tests/unit/test_motor_ponte.js   (MUNDOS=60 por padrão)
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

// Gravação e tela de mentira: contam o que a página pediu.
const STUBS = String.raw`
var AVISOS = [], GRAVOU = 0;
toast = function (msg, opts) { AVISOS.push([msg, opts || null]); };
persistCareer = async function () { GRAVOU++; return true; };
openFirstEntry = function () {};
Date.now = () => 1794000000000;
ouvirAvisosDoMotor();
`;

const COMANDOS = `renovar coletivaAtual conversar mercado fazerProposta aumentarProposta retirarProposta previaCompra aceitarContraproposta
anunciar retirarAnuncio previaVenda aceitarOfertaVenda recusarOfertaVenda prepararEmprestimo emprestar pegarEmprestado propostaPendente
contratarComissao demitirComissao estadio iniciarObra patrocinios assinarPatrocinio olheiros contratarOlheiro
dispensarOlheiro enviarMissao trazerParaBase indicacao pedirOrcamento orcamento conquistas pontuacaoRanking loja preferencias
assistenteVisto alternarNotificacao tatica comissaoSugestoes comissaoAplicar comissaoDesfazer salvarTatica salvarInstrucoesSetor
esquemas salvarEsquema aplicarEsquema renomearEsquema excluirEsquema escalarAutomaticamente marcacao salvarMarcacao treino
salvarDiaTreino aplicarTreino historicoTreinador`.split(/\s+/);

// Roteiro (o mesmo texto roda nos dois lados).
const ROTEIRO = (seed) => `(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (l) => (l && l.length ? l[Math.floor(r() * l.length)] : undefined);
  const P = window.BRDATA_PONTE;
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  CURRENT_COMPETITION_ID = comp; LEAGUE_TEAMS = DEMO_DATA_BY_COMPETITION[comp].teams; LIVE_MODE = false;
  await startCareer(pick(LEAGUE_TEAMS).id);
  ME = { name: "Técnico", createdAt: 1700000000000, creditsBR: 100 };
  // Mexe no save para os comandos terem o que fazer.
  CAREER.finances.cash += Math.floor(r() * 3e7);
  CAREER.squad.forEach((p) => { if (r() < 0.2) p.contractUntil = CAREER.seasonYear; if (r() < 0.2) { p.benchStreak = 6; p.morale = 20; } p.condition = 50 + Math.floor(r() * 51); });
  // Elenco principal no limite (15) em parte dos mundos: o mínimo de 14 entra em jogo.
  if (r() < 0.4) CAREER.squad.filter((p) => p.origin === "principal").slice(15).forEach((p) => { p.origin = "base"; });
  if (r() < 0.5) { const w = CAREER.calendar.weeks.findIndex((x) => x.p === "temporada"); if (w > 0) CAREER.calendar.idx = w + Math.floor(r() * 10); }
  CAREER.scoutSuggestions = [{ id: "sg1", clubId: pick(Object.keys(CAREER.leagueSquads)), playerId: "x" }];
  CAREER.scoutMissionProspects = [{ id: "pr1", name: "Joia", group: "F", age: 16, overall: 40, atk: 50, def: 30, phys: 50, potential: 80, wage: 1000, value: 100000, contractUntil: 2030 }];
  const alvos = () => Object.entries(CAREER.leagueSquads).flatMap(([c, sq]) => sq.map((p) => [c, p]));
  const meu = () => pick(CAREER.squad) || { id: "nada" };
  let desfazer = null;
  const args = {
    renovar: () => { const p = meu(); return [r() < 0.1 ? "x" : p.id, Math.round((p.wage || 1000) * (0.7 + r())), pick([0, 1, 3, 5, 6])]; },
    conversar: () => [meu().id, pick(["apoiar", "prometer", "cobrar", "gritar"])],
    fazerProposta: () => { const [c, p] = pick(alvos()); return [c, p.id, Math.round(p.value * (0.4 + r())), pick([1, 2, 3, 4, 7])]; },
    aumentarProposta: () => { const o = pick(CAREER.pendingOffersOut) || { id: "x", offerValue: 0 }; return [o.id, Math.round(o.offerValue * (0.9 + r() * 0.5))]; },
    retirarProposta: () => [(pick(CAREER.pendingOffersOut) || { id: "x" }).id],
    previaCompra: () => { const o = pick(CAREER.pendingOffersOut); if (o && r() < 0.6) o.counterValue = o.offerValue; return [(o || { id: "x" }).id]; },
    aceitarContraproposta: () => { const o = pick(CAREER.pendingOffersOut); if (o && r() < 0.7) { o.counterValue = o.offerValue; o.status = "countered"; } return [(o || { id: "x" }).id]; },
    anunciar: () => { const p = meu(); return [p.id, Math.round((p.value || 1e6) * (0.5 + r()))]; },
    retirarAnuncio: () => [(pick(CAREER.pendingListings) || { id: "x" }).id],
    previaVenda: () => { const l = pick(CAREER.pendingListings); if (l && !l.offers.length) l.offers.push({ id: "of" + Math.floor(r() * 1e6), clubId: pick(Object.keys(CAREER.leagueSquads)), clubName: "C", value: 5e6, installments: pick([1, 2, 3]), round: CAREER.currentRound }); return [(l || { id: "x" }).id, ((l && l.offers[0]) || { id: "y" }).id]; },
    aceitarOfertaVenda: () => { const l = pick(CAREER.pendingListings); return [(l || { id: "x" }).id, ((l && l.offers[0]) || { id: "y" }).id]; },
    recusarOfertaVenda: () => { const l = pick(CAREER.pendingListings); return [(l || { id: "x" }).id, r() < 0.5 ? null : ((l && l.offers[0]) || { id: "y" }).id]; },
    prepararEmprestimo: () => [meu().id],
    emprestar: () => [(PONTE.emprestimo && r() < 0.8 ? PONTE.emprestimo.playerId : meu().id), pick(["temporada", "meia", "x"]), pick(["nenhuma", "opcional", "obrigatoria"]), 3e6],
    pegarEmprestado: () => { const [c, p] = pick(alvos()); return [c, p.id, pick(["temporada", "meia"]), pick([50, 75, 100, 30]), pick(["nenhuma", "opcional"]), 2e6]; },
    propostaPendente: () => { if (r() < 0.6) { const p = meu(); CAREER.pendingOffer = { playerId: p.id, playerName: p.name, clubId: pick(Object.keys(CAREER.leagueSquads)), clubName: "C", fee: 3e6, round: CAREER.currentRound }; } return [pick(["aceitar", "recusar", "talvez"])]; },
    iniciarObra: () => [pick(["setor_norte", "iluminacao", "camarotes", "x"])],
    assinarPatrocinio: () => { const k = pick(["master", "material", "x"]); if (CAREER.sponsorship[k] && r() < 0.5) { CAREER.sponsorship[k] = null; P.patrocinios(); } return [k, pick([0, 0, 1, 5])]; },
    contratarOlheiro: () => [pick(CAREER_SCOUT_IDS())],
    dispensarOlheiro: () => [(pick(CAREER.scouts) || { id: "x" }).id],
    enviarMissao: () => { const sc = pick(CAREER.scouts) || { id: "x" }; return [sc.id, pick(["sul", "sudeste", "nordeste", "norte", "centro-oeste"]), pick(["sub17", "sub20", "pro", "x"]), pick([null, "G", "F"]), pick(["curta", "media", "longa"])]; },
    trazerParaBase: () => [pick(["pr1", "x"])],
    indicacao: () => [pick(["sg1", "x"]), pick(["propor", "recusar", "x"])],
    alternarNotificacao: () => [pick(["partida", "loja", "lesao", "x"])],
    comissaoAplicar: () => { const s = P.comissaoSugestoes(); const it = pick((s.itens || []).filter((i) => i.estado === "mudanca")); return it ? [it.categoria, r() < 0.8 ? it.chave : "velha"] : ["escalacao", "x"]; },
    comissaoDesfazer: () => [desfazer],
    salvarTatica: () => [{ ritmo: 1 + Math.floor(r() * 6), pressao: 1 + Math.floor(r() * 5), linhaDefensiva: 3, estiloPasse: pick([1, 5, 9]) }],
    salvarInstrucoesSetor: () => [pick(["defesa", "meio", "ataque", "x"]), Object.fromEntries(((SECTOR_INSTRUCTIONS[pick(["defesa", "meio", "ataque"])]) || []).map((i) => [i.id, 1 + Math.floor(r() * 5)]))],
    salvarEsquema: () => [pick(["A", "B", "a", "", "Esquema muito bom"])],
    aplicarEsquema: () => [(pick(CAREER.tacticalSchemes) || { id: "x" }).id],
    renomearEsquema: () => [(pick(CAREER.tacticalSchemes) || { id: "x" }).id, pick(["Novo", "", "A"])],
    excluirEsquema: () => [(pick(CAREER.tacticalSchemes) || { id: "x" }).id],
    escalarAutomaticamente: () => [r() < 0.5],
    salvarMarcacao: () => { const m = P.marcacao(); if (r() < 0.2) return [null, null]; return [(pick(m.meus) || { id: "x" }).id, (pick(m.rivais) || { id: "y" }).id]; },
    salvarDiaTreino: () => [Math.floor(r() * 8), { foco: pick(["tecnico", "fisico", "tatico", "descanso", "x"]), intensidade: pick(["leve", "moderada", "forte"]), duracao: pick([15, 60, 200]), grupos: pick([null, { G: "tecnico" }]) }],
  };
  const out = [];
  for (let k = 0; k < 140; k++) {
    const c = pick(${JSON.stringify(COMANDOS)});
    const a = args[c] ? args[c]() : [];
    let ret;
    try { ret = await P[c](...a); } catch (e) { ret = { erro: String(e && e.message) }; }
    if (c === "comissaoAplicar" && ret && ret.desfazer) desfazer = ret.desfazer;
    out.push([c, JSON.parse(JSON.stringify(ret === undefined ? null : ret))]);
  }
  const ponte = {}; Object.keys(PONTE).forEach((k) => { if (k !== "ouvintes") ponte[k] = PONTE[k]; });
  return { out, career: JSON.parse(JSON.stringify(CAREER)), ponte: JSON.parse(JSON.stringify(ponte)) };
})()`;

(async () => {
  const pagina = fs.readFileSync(path.join(ROOT, "public/js/carreira.js"), "utf8");
  const ref = fs.readFileSync(path.join(__dirname, "ref_ponte_antes.js"), "utf8");
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const lado = async (antes, seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.fetch = () => Promise.reject(new Error("sem rede"));
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor");
    rodar(dataSrc, "data.js");
    rodar(pagina, "carreira.js");
    if (antes) rodar(ref, "ref_ponte_antes.js");
    rodar(STUBS + "\nvar CAREER_SCOUT_IDS = () => SCOUT_MARKET.map((c) => c.id).concat(['x']);", "stubs");
    const r = await rodar(ROTEIRO(seed), "roteiro");
    return JSON.parse(JSON.stringify({ ...r, avisos: rodar("AVISOS", "x"), gravou: rodar("GRAVOU", "x") }));
  };
  const MUNDOS = Number(process.env.MUNDOS || 60);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) runs.push([await lado(true, 700 + k), await lado(false, 700 + k)]);

  await check(`Mesmo retorno de cada comando, o mesmo save e o mesmo estado da ponte em ${MUNDOS} mundos (140 comandos sorteados em cada)`, () => {
    runs.forEach(([a, b], k) => {
      a.out.forEach((x, i) => assert.deepStrictEqual(b.out[i], x, `mundo ${k}, comando ${i} (${x[0]})`));
      assert.deepStrictEqual(b.career, a.career, `save, mundo ${k}`);
      assert.deepStrictEqual(b.ponte, a.ponte, `ponte, mundo ${k}`);
    });
  });
  await check("Mesmos avisos e o mesmo número de gravações", () => {
    runs.forEach(([a, b], k) => {
      assert.deepStrictEqual(b.avisos, a.avisos, `avisos, mundo ${k}`);
      assert.strictEqual(b.gravou, a.gravou, `gravações, mundo ${k}`);
    });
  });
  await check("O roteiro passa de verdade pelos comandos (todos chamados, com sucesso e com recusa)", () => {
    const ok = {}, nao = {}, erros = [];
    runs.forEach(([a]) => a.out.forEach(([c, ret]) => {
      if (ret && ret.erro) erros.push(`${c}: ${ret.erro}`);
      if (ret && ret.ok === false) nao[c] = (nao[c] || 0) + 1; else ok[c] = (ok[c] || 0) + 1;
    }));
    const semSucesso = COMANDOS.filter((c) => !ok[c]);
    console.log("   comandos com sucesso:", COMANDOS.length - semSucesso.length, "/", COMANDOS.length, "| com recusa:", Object.keys(nao).length, "| gravações:", runs.reduce((s, [a]) => s + a.gravou, 0));
    if (semSucesso.length) console.log("   sem nenhum sucesso:", semSucesso.join(" "));
    assert.deepStrictEqual(erros.slice(0, 3), [], "comando quebrou");
    assert.ok(semSucesso.length === 0, `poucos comandos com sucesso: ${semSucesso.join(" ")}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
