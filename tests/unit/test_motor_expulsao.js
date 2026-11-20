// EXPULSAO (17/11): expulso não é reposto; jogar com menos pesa nos gols
// (os dois lados, também nos jogos diretos); o 3º amarelo acumulado só
// suspende para o próximo jogo (motor/partida.js, aovivo.js, fechamento.js,
// semana.js).
// Uso: node tests/unit/test_motor_expulsao.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..", "..");
let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
const perto = (a, b, tol, rotulo) => assert.ok(Math.abs(a - b) <= tol, `${rotulo}: ${a} (esperado ${b} ± ${tol})`);
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Math.random com a sequência dada (depois dela, 0,99: nada acontece).
function comSorteios(seq, fn) {
  const orig = Math.random; let i = 0;
  Math.random = () => (i < seq.length ? seq[i++] : 0.99);
  try { return fn(); } finally { Math.random = orig; }
}
const jogador = (id, extra = {}) => ({ id, name: `Jogador ${id}`, origin: "principal", status: "ok", atk: 70, def: 70, condition: 100, group: "M", ...extra });

(async () => {
  const motor = (m) => import(pathToFileURL(path.join(ROOT, "public", "js", "motor", `${m}.js`)).href);
  const P = await motor("partida");
  const E = await motor("estado");
  const F = await motor("fechamento");
  const A = await motor("aovivo");
  const S = await motor("semana");

  await check("Regra ligada no jogo; cada expulso: −25% nos gols do time e +35% nos do adversário (2 expulsos: o dobro, composto)", () => {
    assert.strictEqual(P.EXPULSAO.ativa, true);
    const lado = { atk: 1.2, def: 0.9, starters: [] };
    const um = P.comExpulsoes(lado, 1), dois = P.comExpulsoes(lado, 2);
    perto(um.atk, 0.9, 1e-12, "atk 1"); perto(um.def, 1.215, 1e-12, "def 1");
    perto(dois.atk, 1.2 * 0.75 ** 2, 1e-12, "atk 2"); perto(dois.def, 0.9 * 1.35 ** 2, 1e-12, "def 2");
    assert.strictEqual(P.comExpulsoes(lado, 0), lado);
    // Gols esperados de quem joga com 1 a menos, contra um rival igual: 0,75× a favor, 1,35× contra.
    const l0 = P.goalLambdas({ atk: 1, def: 1 }, { atk: 1, def: 1 }), l1 = P.goalLambdas(P.comExpulsoes({ atk: 1, def: 1 }, 1), { atk: 1, def: 1 });
    perto(l1.home / l0.home, 0.75, 1e-12, "a favor"); perto(l1.away / l0.away, 1.35, 1e-12, "contra");
  });
  await check("Partida ao vivo: o efeito vale para os dois lados pelo número de expulsos de cada um", () => {
    const lm = { expulsos: ["a"], expulsosCpu: 2 };
    const meu = { atk: 1, def: 1 }, cpu = { atk: 1, def: 1 };
    A.aplicarExpulsoes(lm, meu, cpu);
    perto(meu.atk, 0.75, 1e-12, "meu atk"); perto(meu.def, 1.35, 1e-12, "meu def");
    perto(cpu.atk, 0.75 ** 2, 1e-12, "cpu atk"); perto(cpu.def, 1.35 ** 2, 1e-12, "cpu def");
  });
  await check("Partida ao vivo: o seu expulso fica marcado (vaga vazia); o do adversário sai do time dele e conta", () => {
    const lm = { cpuXI: [{ id: "c1" }, { id: "c2" }, { id: "c3" }] };
    A.registrarExpulsoes(lm, ["m1"], ["c2"]);
    A.registrarExpulsoes(lm, [], ["c3"]);
    assert.deepStrictEqual(lm.expulsos, ["m1"]);
    assert.deepStrictEqual(lm.cpuXI.map((p) => p.id), ["c1"]);
    assert.strictEqual(lm.expulsosCpu, 2);
  });
  await check("Expulso não pode ser substituído (e não há substituição extra); outro titular pode", () => {
    const sq = Array.from({ length: 13 }, (_, i) => jogador(`p${i}`));
    sq[3].status = "suspenso";
    E.definirCarreira({ squad: sq, lineup: { formation: "4-4-2", starters: sq.slice(0, 11).map((p) => p.id), bench: ["p11", "p12"], tactics: {} } });
    const lm = { chunkIndex: 1, subsUsed: 0, subsBonus: 0, events: [], expulsos: ["p3"] };
    assert.strictEqual(A.applyLiveSub(lm, "p3", "p11"), "expulso");
    assert.strictEqual(E.carreiraAtual().lineup.starters[3], "p3");
    assert.strictEqual(A.applyLiveSub(lm, "p4", "p11"), null);
    assert.strictEqual(lm.subsUsed, 1); assert.strictEqual(lm.subsBonus, 0);
    E.definirCarreira(null);
  });
  await check("Força do seu time: o expulso conta na vaga (sem o desconto de time incompleto em dobro); o peso vem só da regra", () => {
    const sq = Array.from({ length: 11 }, (_, i) => jogador(`p${i}`));
    const clube = { id: "x", atk: 1.3, def: 0.8 };
    E.definirCarreira({ squad: sq, lineup: { formation: "4-4-2", starters: sq.map((p) => p.id), bench: [], tactics: {} } });
    const cheio = F.computeHumanStrength(clube);
    sq[5].status = "suspenso";
    E.definirPartida({ finished: false, expulsos: ["p5"] });
    const comExpulso = F.computeHumanStrength(clube);
    perto(comExpulso.atk, cheio.atk, 1e-12, "atk"); perto(comExpulso.def, cheio.def, 1e-12, "def");
    assert.strictEqual(comExpulso.starters.length, 10, "o expulso não marca nem leva cartão");
    E.definirPartida(null);
    E.definirCarreira(null);
  });
  await check("Jogo direto: sem expulso, o placar não muda e nada é sorteado; com expulso, a média segue a regra (mandante com 1 a menos)", () => {
    let chamadas = 0;
    const contador = () => { chamadas++; return 0.5; };
    assert.deepStrictEqual(P.golsComExpulsoes(2, 1, { home: 1.5, away: 1.2 }, 0, 0, contador), { gh: 2, ga: 1 });
    assert.strictEqual(chamadas, 0);
    // Média: mandante fica com 1 − 0,25 × E[1 − f] = 87,5% dos gols; visitante ganha 1,2 × 0,35 × 0,5 = 0,21.
    const rng = seeded(17), N = 200000;
    let sh = 0, sa = 0;
    for (let i = 0; i < N; i++) {
      const gh = P.poissonSample(1.5, rng), ga = P.poissonSample(1.2, rng);
      const r = P.golsComExpulsoes(gh, ga, { home: 1.5, away: 1.2 }, 1, 0, rng);
      sh += r.gh; sa += r.ga;
    }
    perto(sh / N, 1.5 * 0.875, 0.02, "gols do mandante");
    perto(sa / N, 1.2 + 0.21, 0.02, "gols do visitante");
  });
  await check("3º amarelo acumulado: o seu jogador segue em campo (não é expulsão) e fica suspenso só depois do jogo", () => {
    const p = jogador("y", { yellowCards: 2 });
    E.definirCarreira({ squad: [p], currentRound: 10 });
    const r = comSorteios([0.05], () => F.applyMatchWearChunk([p], 10, 1, new Set()));
    assert.deepStrictEqual(r.redCardIds, []);
    assert.strictEqual(p.status, "ok"); assert.strictEqual(p.suspensaoPendente, 11); assert.strictEqual(p.yellowCards, 0);
    assert.ok(r.events.some((e) => e.type === "amarelo") && !r.events.some((e) => e.type === "vermelho"));
    S.refreshAvailability(11); // fim da rodada 10 (fechamento): vale a suspensão
    assert.strictEqual(p.status, "suspenso"); assert.strictEqual(p.outUntilRound, 11); assert.strictEqual(p.suspensaoPendente, undefined);
    S.refreshAvailability(12); // perdeu a rodada 11, volta na 12
    assert.strictEqual(p.status, "ok");
    E.definirCarreira(null);
  });
  await check("3º amarelo na CPU: segue em campo e fica suspenso só depois do jogo, como o seu (PARIDADE-CPU E1a); vermelho direto continua expulsando", () => {
    const cpu = jogador("c", { yellowCards: 2 }), outro = jogador("v");
    E.definirCarreira({ squad: [], leagueSquads: { x: [cpu] } });
    const r1 = comSorteios([0.05], () => F.applyMatchWearChunk([cpu], 4, 1, new Set()));
    assert.deepStrictEqual(r1.redCardIds, []); assert.strictEqual(cpu.status, "ok"); assert.strictEqual(cpu.suspensaoPendente, 5);
    S.refreshAvailability(5);
    assert.strictEqual(cpu.status, "suspenso"); assert.strictEqual(cpu.outUntilRound, 5);
    S.refreshAvailability(6);
    assert.strictEqual(cpu.status, "ok");
    // Sem a regra da paridade (equivalência): suspenso na hora, como antes.
    E.PARIDADE_CPU.forca = false;
    try {
      const velho = jogador("w", { yellowCards: 2 });
      comSorteios([0.05], () => F.applyMatchWearChunk([velho], 4, 1, new Set()));
      assert.strictEqual(velho.status, "suspenso");
    } finally { E.PARIDADE_CPU.forca = true; }
    const r2 = comSorteios([0.001], () => F.applyMatchWearChunk([outro], 4, 1, new Set()));
    assert.deepStrictEqual(r2.redCardIds, ["v"]); assert.ok(r2.events.some((e) => e.type === "vermelho"));
    E.definirCarreira(null);
  });
  await check("Regra desligada (só os testes de equivalência): volta a substituição extra e o 3º amarelo tirando de campo", () => {
    P.EXPULSAO.ativa = false;
    try {
      const p = jogador("y", { yellowCards: 2 });
      E.definirCarreira({ squad: [p] });
      const r = comSorteios([0.05], () => F.applyMatchWearChunk([p], 3, 1, new Set()));
      assert.deepStrictEqual(r.redCardIds, ["y"]); assert.strictEqual(p.status, "suspenso");
      const lm = { expulsos: ["a"], expulsosCpu: 1 }, meu = { atk: 1, def: 1 }, cpu = { atk: 1, def: 1 };
      A.aplicarExpulsoes(lm, meu, cpu);
      assert.deepStrictEqual([meu, cpu], [{ atk: 1, def: 1 }, { atk: 1, def: 1 }]);
    } finally { P.EXPULSAO.ativa = true; E.definirCarreira(null); }
  });

  console.log(failed ? `\n${failed}/${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
