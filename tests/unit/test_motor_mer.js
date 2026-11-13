// FASE1-MER (13/11/2026): regras novas da negociação do técnico
// (public/js/motor/mercado.js): clube vendedor com importância, cobertura e
// reposição; atleta que avalia salário, papel, divisão, força e reputação;
// empréstimo avaliado pelo clube de origem e pelo jogador; determinismo.
// Casos da matriz de aceite de docs/carreira-v2/fase1/02_Requisitos_Mercado.md.
// Uso: node tests/unit/test_motor_mer.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}

// Elenco de teste: n jogadores por grupo, overall decrescente a partir de `top`.
function elenco(prefixo, top, por = { G: 3, D: 8, M: 8, F: 5 }) {
  const l = [];
  for (const [g, q] of Object.entries(por)) for (let i = 0; i < q; i++) l.push({ id: `${prefixo}_${g}${i}`, group: g, overall: top - i * 2, age: 26, wage: 20000 + (top - i * 2) * 500, value: (top - i * 2) * 100000, contractUntil: 2028 });
  return l;
}
const clube = (id, roster, avg) => ({ id, squad: roster, roster, minSize: 22, maxSize: 30, avgOverall: avg, ambition: 1, starters: null });

(async () => {
  const M = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "mercado.js")).href);

  // Série A forte (titulares ~80) e Série C fraca (~64).
  const rosterA = elenco("a", 82), rosterC = elenco("c", 66);
  const vendedorA = clube("timeA", rosterA, 76), vendedorC = clube("timeC", rosterC, 60);
  const titularA = rosterA.find((p) => p.id === "a_M0"); // melhor meia do time A
  const reservaC = rosterC.find((p) => p.id === "c_M7"); // meia pouco usado do time C (8º de 8)

  await check("Papel no elenco pelo overall dentro do grupo (titular, rotação, reserva)", () => {
    assert.strictEqual(M.papelNoElenco(titularA, rosterA), "titular");
    assert.strictEqual(M.papelNoElenco(rosterA.find((p) => p.id === "a_M5"), rosterA), "rotacao");
    assert.strictEqual(M.papelNoElenco(reservaC, rosterC), "reserva");
  });

  await check("Clube vendedor: titular sem reposição custa mais que o mesmo jogador reserva; falta de cobertura também pesa", () => {
    const rTit = M.reservaParaProposta(titularA, vendedorA, { baseValue: titularA.value });
    const rRes = M.reservaParaProposta(reservaC, vendedorC, { baseValue: reservaC.value });
    assert.ok(rTit.papel === "titular" && rTit.reserva >= titularA.value * 1.2, JSON.stringify(rTit));
    assert.ok(rRes.papel === "reserva" && rRes.reserva <= reservaC.value * 1.16, JSON.stringify(rRes));
    const curto = clube("curto", rosterA.filter((p) => p.group !== "G" || p.id === "a_G0"), 76);
    const gk = rosterA.find((p) => p.id === "a_G0");
    const rGk = M.reservaParaProposta(gk, curto, { baseValue: gk.value });
    assert.ok(rGk.faltam >= 1 && rGk.reserva > M.reservaParaProposta(gk, vendedorA, { baseValue: gk.value }).reserva, JSON.stringify(rGk));
  });

  await check("Matriz 1: clube pequeno (Série C) tenta titular consolidado da Série A com proposta comum → o clube não aceita e o atleta recusa com motivo", () => {
    const r = M.reservaParaProposta(titularA, vendedorA, { baseValue: titularA.value });
    const dec = M.sellerNegotiationDecision(titularA.value, r.reserva, () => 0.5);
    assert.ok(dec.action !== "accept", JSON.stringify(dec));
    if (dec.action === "counter") assert.ok(dec.value >= titularA.value * 1.1, "contraproposta difícil");
    const a = M.avaliacaoAtleta(titularA, { salario: titularA.wage, papel: "titular", anos: 3 },
      { papelAtual: "titular", divisaoAtual: 0, divisaoComprador: 2, forcaAtual: 76, forcaComprador: 60, reputacao: 50 });
    assert.strictEqual(a.decisao, "recusa", JSON.stringify(a));
    assert.ok(/divisão/.test(a.motivo), a.motivo);
  });

  await check("Matriz 2: o mesmo comprador, atleta disponível com salário e papel compatíveis → negociação viável", () => {
    const r = M.reservaParaProposta(reservaC, vendedorC, { baseValue: reservaC.value });
    const dec = M.sellerNegotiationDecision(r.reserva, r.reserva, () => 0.5);
    assert.strictEqual(dec.action, "accept");
    const a = M.avaliacaoAtleta(reservaC, { salario: Math.round(reservaC.wage * 1.1), papel: "titular", anos: 3 },
      { papelAtual: "reserva", divisaoAtual: 2, divisaoComprador: 2, forcaAtual: 60, forcaComprador: 60, reputacao: 50 });
    assert.strictEqual(a.decisao, "aceita", JSON.stringify(a));
  });

  await check("Oferta alta melhora, mas orçamento sozinho não garante: o salário alto vira o atleta da Série A? (só com muito); a taxa não entra na decisão dele", () => {
    const ctx = { papelAtual: "titular", divisaoAtual: 0, divisaoComprador: 2, forcaAtual: 76, forcaComprador: 60, reputacao: 50 };
    const comum = M.avaliacaoAtleta(titularA, { salario: titularA.wage, papel: "titular", anos: 3 }, ctx);
    const dobro = M.avaliacaoAtleta(titularA, { salario: titularA.wage * 2, papel: "titular", anos: 3 }, ctx);
    assert.ok(dobro.utilidade > comum.utilidade);
    const pede = M.avaliacaoAtleta(reservaC, { salario: Math.round(reservaC.wage * 0.9), papel: "reserva", anos: 3 }, { papelAtual: "reserva", divisaoAtual: 2, divisaoComprador: 2, forcaAtual: 60, forcaComprador: 60, reputacao: 50 });
    assert.ok(pede.decisao === "pede" && pede.salarioPedido > reservaC.wage * 0.9, JSON.stringify(pede));
    const aceitaPedido = M.avaliacaoAtleta(reservaC, { salario: pede.salarioPedido, papel: "reserva", anos: 3 }, { papelAtual: "reserva", divisaoAtual: 2, divisaoComprador: 2, forcaAtual: 60, forcaComprador: 60, reputacao: 50 });
    assert.strictEqual(aceitaPedido.decisao, "aceita", "o salário pedido fecha");
  });

  await check("Matriz 3: empréstimo de titular sem reposição → resistência alta (recusa mesmo pagando 100% do salário)", () => {
    const curto = rosterA.filter((p) => p.group !== "M" || ["a_M0", "a_M1", "a_M2"].includes(p.id));
    for (const pct of [50, 75, 100]) {
      const r = M.avaliacaoEmprestimo(titularA, { duracao: "temporada", pct }, { papelNaOrigem: "titular", rosterOrigem: curto, papelNoDestino: "titular" });
      assert.strictEqual(r.decisao, "recusa", JSON.stringify(r));
    }
  });

  await check("Matriz 4: empréstimo de jovem pouco usado com minutos previstos → possível com salário e duração aceitáveis", () => {
    const jovem = { ...reservaC, age: 20 };
    const r = M.avaliacaoEmprestimo(jovem, { duracao: "temporada", pct: 50 }, { papelNaOrigem: "reserva", rosterOrigem: rosterC, papelNoDestino: "titular" });
    assert.strictEqual(r.decisao, "aceita", JSON.stringify(r));
    const semMinutos = M.avaliacaoEmprestimo({ ...reservaC, age: 27 }, { duracao: "temporada", pct: 50 }, { papelNaOrigem: "rotacao", rosterOrigem: rosterC, papelNoDestino: "reserva" });
    assert.ok(semMinutos.decisao !== "aceita", JSON.stringify(semMinutos));
  });

  await check("Empréstimo no meio-termo: o clube contrapõe com um percentual de salário maior", () => {
    const r = M.avaliacaoEmprestimo({ ...reservaC, age: 25 }, { duracao: "temporada", pct: 50 }, { papelNaOrigem: "rotacao", rosterOrigem: rosterC, papelNoDestino: "titular" });
    assert.strictEqual(r.decisao, "contra", JSON.stringify(r));
    assert.ok([75, 100].includes(r.pctPedido));
    const r2 = M.avaliacaoEmprestimo({ ...reservaC, age: 25 }, { duracao: "temporada", pct: r.pctPedido }, { papelNaOrigem: "rotacao", rosterOrigem: rosterC, papelNoDestino: "titular" });
    assert.strictEqual(r2.decisao, "aceita", "o percentual pedido fecha");
  });

  await check("Jogador titular não aceita ir emprestado para ser reserva", () => {
    const r = M.avaliacaoEmprestimo(titularA, { duracao: "temporada", pct: 100 }, { papelNaOrigem: "titular", rosterOrigem: rosterA, papelNoDestino: "reserva" });
    assert.ok(r.decisao === "recusa" && r.lado === "jogador", JSON.stringify(r));
  });

  await check("Matriz 5 (regra): a mesma oferta no mesmo estado dá a mesma resposta; o jeito do atleta é fixo pelo id", () => {
    const ctx = { papelAtual: "rotacao", divisaoAtual: 1, divisaoComprador: 1, forcaAtual: 68, forcaComprador: 70, reputacao: 60 };
    const o = { salario: 30000, papel: "rotacao", anos: 2 };
    assert.deepStrictEqual(M.avaliacaoAtleta(reservaC, o, ctx), M.avaliacaoAtleta(reservaC, o, ctx));
    assert.deepStrictEqual(M.reservaParaProposta(titularA, vendedorA, { baseValue: titularA.value }), M.reservaParaProposta(titularA, vendedorA, { baseValue: titularA.value }));
    assert.strictEqual(M.jeitoDoAtleta("x1"), M.jeitoDoAtleta("x1"));
    const js = Array.from({ length: 200 }, (_, i) => M.jeitoDoAtleta(`p${i}`));
    assert.ok(js.every((j) => j >= -1 && j <= 1) && Math.min(...js) < -0.5 && Math.max(...js) > 0.5, "jeitos variados");
  });

  await check("Salário sugerido: o que o atleta aceita com o papel dado (nunca abaixo do atual)", () => {
    const ctx = { papelAtual: "reserva", divisaoAtual: 2, divisaoComprador: 2, forcaAtual: 60, forcaComprador: 60, reputacao: 50 };
    const s = M.salarioSugerido(reservaC, "reserva", ctx);
    assert.ok(s >= reservaC.wage);
    assert.strictEqual(M.avaliacaoAtleta(reservaC, { salario: s, papel: "reserva", anos: 3 }, ctx).decisao, "aceita");
  });

  process.exit(failed ? 1 : 0);
})();
