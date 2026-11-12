// FASE1-ESC (12/11/2026): regras da escalação confirmada no motor
// (public/js/motor/escalacao.js). Casos do aceite de
// docs/carreira-v2/fase1/01_Requisitos_Escalacao.md: 11 + 11 com goleiro
// reserva; promover jogador de linha; troca entre goleiros; troca que
// exige recomposição; sem goleiro elegível; atleta suspenso; save antigo
// (banco menor); sugestão vencida; toque repetido.
// Uso: node tests/unit/test_motor_escalacao.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}

// Elenco de teste: 3 goleiros, 9 defensores, 8 meias, 6 atacantes (26).
function elenco() {
  const p = [];
  const add = (grp, n, base) => { for (let i = 1; i <= n; i++) p.push({ id: `${grp}${i}`, name: `${grp} ${i}`, group: grp, overall: base - i, status: "ok", outUntilRound: null }); };
  add("G", 3, 80); add("D", 9, 78); add("M", 8, 77); add("F", 6, 79);
  return p;
}
// 4-4-2: G1; D1-D4; M1-M4; F1-F2. Banco: G2, D5-D8, M5-M7, F3-F5 (11, com goleiro).
function escalacao() {
  return { formation: "4-4-2", starters: ["G1", "D1", "D2", "D3", "D4", "M1", "M2", "M3", "M4", "F1", "F2"], bench: ["G2", "D5", "D6", "D7", "D8", "M5", "M6", "M7", "F3", "F4", "F5"] };
}
const tipos = (v) => v.pendencias.map((x) => x.tipo).sort();
const ids = (l) => [...l.starters, ...l.bench];

(async () => {
  const E = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "escalacao.js")).href);
  const R = 5; // rodada

  await check("ESC-01: 11 titulares + 11 reservas distintos com goleiro no banco é válida", () => {
    const v = E.validarEscalacao(escalacao(), elenco(), R);
    assert.deepStrictEqual(v, { valida: true, pendencias: [] });
  });

  await check("Aceite 1: promover jogador de linha do banco troca as vagas (antigo titular vai para a vaga aberta no banco), ids únicos e 11 + 11", () => {
    const r = E.trocar(escalacao(), elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F3" });
    assert.ok(r.lineup, JSON.stringify(r));
    assert.strictEqual(r.lineup.starters[9], "F3");
    assert.strictEqual(r.lineup.bench[8], "F1"); // a vaga do F3 no banco
    assert.strictEqual(new Set(ids(r.lineup)).size, 22);
    assert.strictEqual(r.lineup.starters.length, 11); assert.strictEqual(r.lineup.bench.length, 11);
    assert.strictEqual(r.lineup.formation, "4-4-2");
    assert.ok(E.validarEscalacao(r.lineup, elenco(), R).valida);
  });

  await check("A troca não muda a escalação recebida (devolve cópia)", () => {
    const l = escalacao(); const antes = JSON.stringify(l);
    E.trocar(l, elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F3" });
    assert.strictEqual(JSON.stringify(l), antes);
  });

  await check("Aceite 2: troca entre goleiros (reserva G2 vira titular, G1 vai para o banco) continua válida", () => {
    const r = E.trocarComRecomposicao(escalacao(), elenco(), R, { alvo: { tipo: "titular", vaga: 0 }, saiEsperado: "G1", entraId: "G2" });
    assert.ok(r.lineup && r.valida, JSON.stringify(r));
    assert.strictEqual(r.lineup.starters[0], "G2"); assert.strictEqual(r.lineup.bench[0], "G1");
  });

  await check("Aceite 2: troca que tira o único goleiro do banco pede recomposição (proposta com G3, de fora da escalação) e não aplica sozinha", () => {
    // G2 (banco) entra no lugar do atacante F1: o banco fica sem goleiro.
    const r = E.trocarComRecomposicao(escalacao(), elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "G2" });
    assert.ok(r.precisaRecompor, JSON.stringify(r));
    assert.strictEqual(r.proposta.entra, "G3");
    assert.ok(r.proposta.sai && r.proposta.sai !== "G2");
  });

  await check("Aceite 2: confirmação conjunta (troca + recomposição) deixa 11 + 11 válido, com G3 no banco", () => {
    const prop = E.trocarComRecomposicao(escalacao(), elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "G2" }).proposta;
    const r = E.trocarComRecomposicao(escalacao(), elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "G2", recomposicao: prop });
    assert.ok(r.lineup && r.valida, JSON.stringify(r));
    assert.ok(r.lineup.bench.includes("G3")); assert.strictEqual(r.lineup.bench.length, 11);
    assert.strictEqual(new Set(ids(r.lineup)).size, 22);
  });

  await check("Aceite 2: sem goleiro elegível fora da escalação, a troca é bloqueada com explicação (nunca inventa atleta)", () => {
    const el = elenco().map((p) => (p.id === "G3" ? { ...p, status: "contundido", outUntilRound: R + 2 } : p));
    const r = E.trocarComRecomposicao(escalacao(), el, R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "G2" });
    assert.strictEqual(r.bloqueio, "sem-goleiro", JSON.stringify(r));
    assert.ok(/goleiro/i.test(r.mensagem));
  });

  await check("ESC-03: com a escalação já inválida (goleiro titular lesionado), a troca que a melhora passa mesmo sem goleiro para o banco, com a pendência visível", () => {
    const el = elenco().map((p) => (p.id === "G1" ? { ...p, status: "contundido", outUntilRound: R + 3 } : p.id === "G3" ? { ...p, status: "contundido", outUntilRound: R + 3 } : p));
    const r = E.trocarComRecomposicao(escalacao(), el, R, { alvo: { tipo: "titular", vaga: 0 }, saiEsperado: "G1", entraId: "G2" });
    assert.ok(r.lineup && r.valida === false, JSON.stringify(r));
    assert.strictEqual(r.lineup.starters[0], "G2");
    assert.deepStrictEqual(tipos(E.validarEscalacao(r.lineup, el, R)), ["banco-sem-goleiro", "reserva-indisponivel"]);
  });

  await check("Aceite 2: atleta suspenso não entra (conflito) e, se já escalado, aparece como pendência", () => {
    const el = elenco().map((p) => (p.id === "F3" ? { ...p, status: "suspenso", outUntilRound: R } : p));
    const r = E.trocar(escalacao(), el, R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F3" });
    assert.ok(r.conflito && /suspenso/.test(r.conflito), JSON.stringify(r));
    assert.deepStrictEqual(tipos(E.validarEscalacao(escalacao(), el, R)), ["reserva-indisponivel"]);
    // Na rodada seguinte à suspensão, ele volta a ficar disponível.
    assert.ok(E.disponivel(el.find((p) => p.id === "F3"), R + 1));
  });

  await check("Aceite 2 / ESC-04: save antigo com banco menor (7) abre com pendência e sem goleiro reserva; a recomposição só acrescenta", () => {
    const l = escalacao(); l.bench = ["D5", "D6", "M5", "M6", "F3", "F4", "F5"];
    const v = E.validarEscalacao(l, elenco(), R);
    assert.deepStrictEqual(tipos(v), ["banco-incompleto", "banco-sem-goleiro"]);
    assert.strictEqual(v.pendencias.find((x) => x.tipo === "banco-incompleto").faltam, 4);
    const prop = E.recomposicaoGoleiro(l, elenco(), R);
    assert.strictEqual(prop.entra, "G2"); assert.strictEqual(prop.sai, null);
    const r = E.aplicarRecomposicao(l, elenco(), R, prop);
    assert.strictEqual(r.lineup.bench.length, 8);
    // Em revisão, uma troca não é bloqueada pelo banco sem goleiro que já estava assim.
    const t = E.trocarComRecomposicao(l, elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F3" });
    assert.ok(t.lineup && t.valida === false, JSON.stringify(t));
  });

  await check("Aceite 2: sugestão vencida (a vaga mudou depois de montada) dá conflito e não mexe em nada", () => {
    const l = escalacao();
    const editada = E.trocar(l, elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F3" }).lineup;
    const r = E.trocar(editada, elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F4" });
    assert.ok(r.conflito, JSON.stringify(r));
    const prop = E.trocarComRecomposicao(l, elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "G2" }).proposta;
    const g3NoBanco = { ...l, bench: [...l.bench.slice(0, 10), "G3"] };
    assert.ok(E.aplicarRecomposicao(g3NoBanco, elenco(), R, prop).conflito);
  });

  await check("Aceite 3: toque repetido (o mesmo pedido de novo, sobre a escalação já trocada) não duplica nem perde vaga", () => {
    const pedido = { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F3" };
    const uma = E.trocar(escalacao(), elenco(), R, pedido).lineup;
    const duas = E.trocar(uma, elenco(), R, pedido);
    assert.ok(duas.conflito, "o 2º toque não aplica de novo");
    assert.strictEqual(new Set(ids(uma)).size, 22);
  });

  await check("Jogador de fora da escalação no lugar de um titular: quem sai deixa a escalação; banco intacto", () => {
    const r = E.trocar(escalacao(), elenco(), R, { alvo: { tipo: "titular", vaga: 9 }, saiEsperado: "F1", entraId: "F6" });
    assert.strictEqual(r.lineup.starters[9], "F6");
    assert.ok(!ids(r.lineup).includes("F1"));
    assert.deepStrictEqual(r.lineup.bench, escalacao().bench);
  });

  await check("ESC-04: vaga vazia no banco (save antigo) só aceita jogador de fora da escalação; completa até 11", () => {
    const l = escalacao(); l.bench = l.bench.slice(0, 10); // 10 reservas
    const r = E.trocar(l, elenco(), R, { alvo: { tipo: "banco-vazio" }, saiEsperado: null, entraId: "M8" });
    assert.ok(r.lineup && r.lineup.bench.length === 11 && r.lineup.bench[10] === "M8", JSON.stringify(r));
    assert.ok(E.trocar(l, elenco(), R, { alvo: { tipo: "banco-vazio" }, saiEsperado: null, entraId: "F1" }).conflito, "titular não vai para a vaga vazia");
    assert.ok(E.trocar(r.lineup, elenco(), R, { alvo: { tipo: "banco-vazio" }, saiEsperado: null, entraId: "D9" }).conflito, "banco completo");
  });

  process.exit(failed ? 1 : 0);
})();
