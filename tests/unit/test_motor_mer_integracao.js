// FASE1-MER (13/11/2026): a negociação do técnico no motor, de ponta a ponta,
// sem página (data.js + motor, pela ponte de abrirMotor(), como a v2).
// Cobre o que saiu da comparação com a cópia congelada em
// test_motor_semana.js e test_motor_ponte.js:
//   - a proposta leva salário, papel prometido e duração (MER-03/04);
//   - o clube vendedor e o atleta decidem, com motivo (MER-04);
//   - mesma oferta no mesmo estado, mesma resposta, qualquer que seja o
//     Math.random (MER-06);
//   - repetir a operação (mesmo opId) não duplica proposta, jogador,
//     caixa nem parcela (MER-07);
//   - empréstimo de entrada: aceite, contraproposta de percentual ou
//     recusa com motivo (MER-05); de saída: o interessado sai de sorteio
//     com chave;
//   - a promessa de papel cobra a moral na temporada da contratação.
// Uso: node tests/unit/test_motor_mer_integracao.js   (MUNDOS=12 por padrão)
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
var SALVO = null, GRAVOU = 0;
Date.now = () => 1794000000000;
const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
fetch = async function (url, opts) {
  const metodo = (opts && opts.method) || "GET";
  if (url === "/api/auth/me") return resp(200, { authenticated: true, user: { id: "u1", name: "Técnico", createdAt: 1700000000000, onboardingSeen: true, dailyLogin: { currentStreakDay: 2, lastClaimDate: "2026-01-01" }, creditsBR: 100, friendCode: "X1", friends: [] } });
  if (url === "/api/career" && metodo === "GET") return resp(200, { career: SALVO ? JSON.parse(SALVO) : null });
  if (url === "/api/career" && metodo === "PUT") { SALVO = opts.body; GRAVOU++; return resp(200, { ok: true }); }
  if (url === "/api/daily-login/claim") return resp(409, { error: "Já recebida hoje." });
  if (url === "/api/health") return resp(200, { hasKey: false });
  throw new Error("sem rede");
};
var AVISOS = [];
`;

// Roteiro de um mundo. Devolve o que os checks conferem.
const ROTEIRO = (seed) => String.raw`(async () => {
  let s = ${seed} >>> 0; const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (l) => (l && l.length ? l[Math.floor(r() * l.length)] : undefined);
  const M = window.BRDATA_MOTOR;
  const P = (await M.v2.abrirMotor()).ponte;
  M.eventos.ouvir("aviso", (a) => AVISOS.push(a));
  const comp = pick(["brasileirao", "serie_b", "serie_c"]);
  const e = await P.escolherCompeticao(comp);
  await P.criarCarreira(pick(e.clubes).id);
  const C = () => M.estado.carreiraAtual();
  C().finances.cash = 900000000; C().finances.wageCap = 900000000;
  const out = { janela: M.semana.transferWindowStatus(C().currentRound).open };
  const alvos = () => Object.entries(C().leagueSquads).flatMap(([c, sq]) => sq.map((p) => [c, p]));
  const papel = (c, p) => M.mercado.papelNoElenco(p, M.semana.leagueSquadFor(c));
  const foto = () => JSON.stringify(C());
  const voltar = (f) => M.estado.definirCarreira(JSON.parse(f));
  const resumo = () => ({
    ofertas: (C().pendingOffersOut || []).map((o) => [o.playerId, o.status, o.motivo || null, o.counterValue || null, o.salarioPedido || null, o.recusadoPor || null]),
    elenco: C().squad.map((p) => p.id).sort(), caixa: C().finances.cash, parcelas: (C().pendingInstallments || []).length,
  });

  // 1) Propostas com termos sorteados; todas resolvem nesta rodada.
  const termos = [];
  for (let k = 0; k < 10; k++) {
    const [c, p] = pick(alvos());
    if ((C().pendingOffersOut || []).some((o) => o.playerId === p.id)) continue;
    const t = { salario: Math.round(p.wage * (0.8 + r() * 1.6)), papel: pick(["titular", "rotacao", "reserva"]), anos: pick([1, 2, 3, 4, 5]) };
    const ret = await P.fazerProposta(c, p.id, Math.round(p.value * (0.7 + r() * 0.8)), pick([1, 2, 3]), t, "op-prop-" + k);
    if (ret.ok) termos.push({ id: ret.id, playerId: p.id, clubId: c, papelOrigem: papel(c, p), ...t });
  }
  out.termos = termos;
  out.gravadas = (C().pendingOffersOut || []).map((o) => ({ salario: o.salario, papel: o.papel, anos: o.anos }));
  // 2) Repetir a mesma operação não cria outra proposta.
  const antesRep = (C().pendingOffersOut || []).length;
  if (termos.length) {
    const t0 = termos[0];
    out.repetida = await P.fazerProposta(t0.clubId, t0.playerId, 1, 1, { salario: t0.salario, papel: t0.papel, anos: t0.anos }, "op-prop-0");
  }
  out.ofertasRep = [antesRep, (C().pendingOffersOut || []).length];
  // Termos inválidos são recusados.
  const [ci, pi] = pick(alvos());
  out.invalida = await P.fazerProposta(ci, pi.id, pi.value, 1, { salario: pi.wage, papel: "craque", anos: 9 });

  // 3) Resolver na rodada, duas vezes a partir do mesmo estado, com
  //    Math.random diferente: a mesma resposta (MER-06).
  (C().pendingOffersOut || []).forEach((o) => { o.roundsLeft = 1; o.rivalOffer = undefined; });
  const f0 = foto();
  const round = C().currentRound;
  const resolver = (semente) => { const salva = Math.random; let a = semente; Math.random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; try { M.semana.resolvePendingOffersOutRound(round); } finally { Math.random = salva; } return resumo(); };
  out.resA = resolver(11); voltar(f0);
  out.resB = resolver(98765); // fica este estado
  out.aceitos = termos.filter((t) => C().squad.some((p) => p.id === t.playerId)).map((t) => {
    const p = C().squad.find((x) => x.id === t.playerId);
    return { t, wage: p.wage, contractUntil: p.contractUntil, promessa: p.promessa, ano: C().seasonYear };
  });

  // 4) Pedido de salário: aceitar o pedido fecha, e repetir a operação não compra duas vezes.
  const pede = (C().pendingOffersOut || []).find((o) => o.status === "pede-salario");
  if (pede) {
    const caixa0 = C().finances.cash, n0 = C().squad.length;
    const a1 = await P.aceitarSalarioPedido(pede.id, "op-sal");
    const a2 = await P.aceitarSalarioPedido(pede.id, "op-sal");
    const p = C().squad.find((x) => x.id === pede.playerId);
    out.pede = { a1, a2, entrou: C().squad.length - n0, gastou: caixa0 - C().finances.cash, wage: p && p.wage, pedido: pede.salario };
  }
  // 5) Contraproposta do clube: aceitar e repetir; o atleta decide.
  const contra = (C().pendingOffersOut || []).find((o) => o.status === "countered");
  if (contra) {
    const n0 = C().squad.length, caixa0 = C().finances.cash;
    const a1 = await P.aceitarContraproposta(contra.id, "op-contra");
    const a2 = await P.aceitarContraproposta(contra.id, "op-contra");
    out.contra = { a1, a2, entrou: C().squad.length - n0, gastou: caixa0 - C().finances.cash };
  }
  // 6) Recusada: uma nova proposta substitui; dispensar tira da lista.
  const rec = (C().pendingOffersOut || []).find((o) => o.status === "recusada");
  if (rec) {
    const p = M.semana.leagueSquadFor(rec.clubId).find((x) => x.id === rec.playerId);
    const nova = p ? await P.fazerProposta(rec.clubId, rec.playerId, Math.round(p.value * 1.5), 1, { salario: p.wage * 2, papel: "titular", anos: 3 }, "op-nova") : null;
    const lista = (C().pendingOffersOut || []).filter((o) => o.playerId === rec.playerId);
    const outra = (C().pendingOffersOut || []).find((o) => o.status === "recusada");
    const disp = outra ? await P.dispensarProposta(outra.id) : null;
    out.recusada = { nova, mesmas: lista.length, status: lista.map((o) => o.status), disp, sumiu: outra ? !(C().pendingOffersOut || []).some((o) => o.id === outra.id) : null };
  }

  // 7) Empréstimo de entrada: titular do clube de origem e reserva jovem.
  const emp = [];
  const lista = alvos().filter(([c]) => C().leagueSquads[c].length >= 16);
  for (let k = 0; k < 8; k++) {
    const [c, p] = pick(lista);
    if (C().squad.some((x) => x.id === p.id)) continue;
    const pct = pick([50, 75, 100]);
    const f = foto();
    const a1 = await P.pegarEmprestado(c, p.id, pick(["temporada", "meia"]), pct, "nenhuma", 0, "op-emp-" + k);
    const n1 = C().squad.length;
    const a2 = await P.pegarEmprestado(c, p.id, "temporada", pct, "nenhuma", 0, "op-emp-" + k);
    emp.push({ papel: papel(c, p) || null, idade: p.age, pct, a1, a2, igual: C().squad.length === n1 });
    if (!a1.ok) voltar(f);
  }
  out.emp = emp;
  // 8) Empréstimo de saída: o mesmo jogador na mesma semana dá o mesmo interessado.
  const meus = C().squad.filter((p) => p.origin === "principal");
  const alvo = pick(meus);
  const s1 = await P.prepararEmprestimo(alvo.id);
  Math.random(); Math.random();
  const s2 = await P.prepararEmprestimo(alvo.id);
  out.saida = [s1, s2];

  // 9) Promessa: prometido titular e fora do time perde mais moral que o banco comum.
  const novo = C().squad.find((p) => p.promessa && p.promessa.papel === "titular") || C().squad.find((p) => p.origin === "principal" && !C().lineup.starters.includes(p.id));
  const comum = C().squad.find((p) => p !== novo && p.origin === "principal" && C().lineup.bench.includes(p.id) && !p.promessa);
  if (novo && comum) {
    novo.promessa = { papel: "titular", temporada: C().seasonYear };
    C().lineup.starters = C().lineup.starters.map((id) => (id === novo.id ? null : id));
    if (!C().lineup.bench.includes(novo.id)) C().lineup.bench = [...C().lineup.bench.filter((id) => id !== comum.id).slice(0, 10), novo.id];
    if (!C().lineup.bench.includes(comum.id)) C().lineup.bench.push(comum.id);
    [novo, comum].forEach((p) => { p.morale = 60; p.benchStreak = 0; });
    const hist = [];
    for (let k = 0; k < 4; k++) { M.aovivo.applyMoraleAfterMatch(1, 1); hist.push([novo.morale, comum.morale, !!novo.wantsTransfer]); }
    // Promessa de outra temporada não cobra.
    // Promessa de outra temporada não cobra: igual a não ter promessa.
    novo.promessa.temporada = C().seasonYear - 1; novo.morale = 60; novo.wantsTransfer = false;
    const f = foto();
    M.aovivo.applyMoraleAfterMatch(1, 1);
    const vencida = C().squad.find((p) => p.id === novo.id).morale;
    voltar(f);
    const sem = C().squad.find((p) => p.id === novo.id); delete sem.promessa;
    M.aovivo.applyMoraleAfterMatch(1, 1);
    out.promessa = { hist, vencida: [vencida, C().squad.find((p) => p.id === novo.id).morale] };
  }
  out.avisos = AVISOS.length;
  return JSON.stringify(out);
})()`;

(async () => {
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const mundo = async (seed) => {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(seed), "semente");
    rodar(BASE, "base");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor");
    rodar(dataSrc, "data.js");
    return JSON.parse(await rodar(ROTEIRO(seed), "roteiro"));
  };
  const MUNDOS = Number(process.env.MUNDOS || 12);
  const runs = [];
  for (let k = 0; k < MUNDOS; k++) runs.push(await mundo(4100 + k));
  const todos = (f) => runs.flatMap(f);

  await check("A janela está aberta na pré-temporada e a proposta grava salário, papel e duração", () => {
    runs.forEach((w, k) => {
      assert.ok(w.janela, `janela fechada, mundo ${k}`);
      assert.ok(w.termos.length >= 5, `poucas propostas, mundo ${k}: ${w.termos.length}`);
      w.gravadas.forEach((g) => assert.ok(g.salario > 0 && ["titular", "rotacao", "reserva"].includes(g.papel) && g.anos >= 1 && g.anos <= 5, JSON.stringify(g)));
      assert.strictEqual(w.invalida.motivo, "opcao-invalida", `termos inválidos, mundo ${k}`);
    });
  });
  await check("Repetir a mesma proposta (mesmo opId) devolve a mesma resposta e não cria outra (MER-07)", () => {
    runs.forEach((w, k) => {
      assert.ok(w.repetida && w.repetida.ok && w.repetida.repetida === true && w.repetida.id === w.termos[0].id, `mundo ${k}: ${JSON.stringify(w.repetida)}`);
      assert.strictEqual(w.ofertasRep[1], w.ofertasRep[0], `mundo ${k}`);
    });
  });
  await check("Mesma oferta no mesmo estado: a mesma resposta com qualquer Math.random (MER-06)", () => {
    runs.forEach((w, k) => assert.deepStrictEqual(w.resB, w.resA, `mundo ${k}`));
  });
  await check("Clube e atleta decidem com motivo: há compras, contrapropostas, pedidos de salário e recusas (dos dois lados)", () => {
    const of = todos((w) => w.resB.ofertas);
    const conta = {
      compras: todos((w) => w.aceitos).length,
      contrapropostas: of.filter((o) => o[1] === "countered").length,
      pedidos: of.filter((o) => o[1] === "pede-salario").length,
      recusaClube: of.filter((o) => o[1] === "recusada" && o[5] === "clube").length,
      recusaAtleta: of.filter((o) => o[1] === "recusada" && o[5] === "atleta").length,
    };
    console.log("   decisões:", JSON.stringify(conta));
    Object.entries(conta).forEach(([k, v]) => assert.ok(v > 0, `nenhum caso de ${k}`));
    of.filter((o) => o[1] !== "pending").forEach((o) => assert.ok(typeof o[2] === "string" && o[2].length > 10, `sem motivo: ${JSON.stringify(o)}`));
    of.filter((o) => o[1] === "pede-salario").forEach((o) => assert.ok(o[4] > 0, `pedido sem salário: ${JSON.stringify(o)}`));
  });
  await check("Quem aceitou entra com o salário, a duração e a promessa da proposta", () => {
    todos((w) => w.aceitos).forEach(({ t, wage, contractUntil, promessa, ano }) => {
      assert.strictEqual(wage, t.salario, JSON.stringify(t));
      assert.strictEqual(contractUntil, ano + t.anos - 1, JSON.stringify({ t, contractUntil, ano }));
      assert.deepStrictEqual(promessa, { papel: t.papel, temporada: ano });
    });
  });
  await check("Aceitar o salário pedido ou a contraproposta, repetido, compra uma vez só (jogador, caixa e parcelas)", () => {
    const pedidos = runs.filter((w) => w.pede), contras = runs.filter((w) => w.contra);
    assert.ok(pedidos.length > 0 && contras.length > 0, `poucos casos: pedidos ${pedidos.length}, contras ${contras.length}`);
    pedidos.forEach((w) => {
      assert.ok(w.pede.a1.ok && w.pede.a2.repetida === true, JSON.stringify(w.pede));
      assert.deepStrictEqual(w.pede.a2.comprado, w.pede.a1.comprado);
      assert.ok(w.pede.entrou === (w.pede.a1.comprado ? 1 : 0), JSON.stringify(w.pede));
      if (w.pede.a1.comprado) assert.ok(w.pede.gastou > 0, JSON.stringify(w.pede));
    });
    contras.forEach((w) => {
      assert.ok(w.contra.a1.ok && w.contra.a2.repetida === true, JSON.stringify(w.contra));
      assert.ok(w.contra.entrou === (w.contra.a1.comprado ? 1 : 0), JSON.stringify(w.contra));
      if (!w.contra.a1.comprado) assert.ok(w.contra.a1.atleta && w.contra.a1.mensagem, `sem motivo do atleta: ${JSON.stringify(w.contra)}`);
    });
  });
  await check("Recusada: nova proposta pelo mesmo jogador substitui a recusada; dispensar tira da lista", () => {
    const casos = runs.filter((w) => w.recusada);
    assert.ok(casos.length > 0, "nenhuma recusa");
    casos.forEach((w) => {
      if (w.recusada.nova) { assert.ok(w.recusada.nova.ok, JSON.stringify(w.recusada)); assert.strictEqual(w.recusada.mesmas, 1, JSON.stringify(w.recusada)); assert.deepStrictEqual(w.recusada.status, ["pending"]); }
      if (w.recusada.disp) assert.ok(w.recusada.disp.ok && w.recusada.sumiu, JSON.stringify(w.recusada));
    });
  });
  await check("Empréstimo de entrada: titular da origem é recusado com motivo, há contraproposta de percentual e aceite; repetir não duplica", () => {
    const e = todos((w) => w.emp);
    const conta = { aceite: e.filter((x) => x.a1.ok).length, contra: e.filter((x) => x.a1.motivo === "contra").length, recusa: e.filter((x) => x.a1.motivo === "recusa").length };
    console.log("   empréstimos:", JSON.stringify(conta));
    Object.entries(conta).forEach(([k, v]) => assert.ok(v > 0, `nenhum caso de ${k}`));
    e.forEach((x) => {
      assert.ok(x.igual, `repetir duplicou: ${JSON.stringify(x)}`);
      if (x.a1.ok) assert.ok(x.a2.repetida === true, JSON.stringify(x));
      if (x.papel === "titular") assert.ok(!x.a1.ok && x.a1.motivo === "recusa" && /recusou/.test(x.a1.mensagem), `titular emprestado: ${JSON.stringify(x)}`);
      if (x.a1.motivo === "contra") assert.ok(x.a1.pctPedido > x.pct && x.a1.mensagem, JSON.stringify(x));
    });
  });
  await check("Empréstimo de saída: o mesmo jogador na mesma semana dá o mesmo interessado (sorteio com chave)", () => {
    runs.forEach((w, k) => assert.deepStrictEqual(w.saida[1], w.saida[0], `mundo ${k}`));
  });
  await check("Promessa: prometido titular no banco perde mais moral que o banco comum, pede para sair, e a promessa vencida não cobra", () => {
    const casos = runs.filter((w) => w.promessa);
    assert.ok(casos.length >= MUNDOS / 2, `poucos casos (${casos.length})`);
    casos.forEach((w) => {
      const h = w.promessa.hist;
      assert.ok(h[0][0] < h[0][1], `cai mais: ${JSON.stringify(h)}`);
      assert.ok(h[h.length - 1][2] === true, `pede para sair: ${JSON.stringify(h)}`);
      assert.strictEqual(w.promessa.vencida[0], w.promessa.vencida[1], `vencida: ${JSON.stringify(w.promessa)}`);
    });
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
