// ECON-001, Entrega 1 (25/11/2026): catálogo e base financeira por liga e clube
// (public/js/motor/economia.js). Confere, sem rede e sem navegador:
//   1) catálogo: perfil para as 23 ligas jogáveis (20 do mundo e as 3 do
//      Brasil); todo número com valor, período, item, tipo (publicado,
//      estimado, imputado), fonte e confiança;
//   2) a liga: determinístico; o total da liga mantido; âncoras exatas
//      (Flamengo, Palmeiras, Bahia, Mirassol, Arsenal); LaLiga com 52% nos 2
//      maiores; receita decrescente na ordem financeira fora as âncoras;
//   3) ordens de grandeza: elite do Brasil ≥ 6x a menor folha; Premier League
//      acima do Brasil; receita anual e caixa inicial são grandezas distintas;
//      nenhum clube com resultado operacional acima de 10% da receita;
//   4) virada: o rebaixado da Premier League recebe a transição (1º ano > 2º
//      > 3º, sem); o promovido entra abaixo do rebaixado; caixa e obrigações
//      seguem com o clube;
//   5) capacidade de compra: o mínimo entre orçamento, caixa para o pagamento
//      imediato (com a reserva) e parcelas futuras, mais o espaço de folha;
//      crédito de venda só no mês em que entra (tarde demais não resolve);
//   6) módulo puro: o índice não muda.
// Uso: node tests/unit/test_economia_base.js
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");

let n = 0, failed = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}

(async () => {
  const E = await import(pathToFileURL(path.join(ROOT, "public/js/motor/economia.js")).href);
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const copia = JSON.stringify(indice);
  const ligas = [...Object.keys(indice.competicoes), "brasileirao", "serie_b", "serie_c"];
  const porNome = (liga, re) => [...E.economiaDaLiga(indice, liga).values()].find((x) => re.test(x.nome));

  await check("catálogo: perfil para as 23 ligas, todo número com fonte, período, tipo e confiança", () => {
    for (const l of ligas) assert.ok(E.PERFIS[l], `sem perfil: ${l}`);
    const numeros = [];
    const coletar = (o) => { for (const v of Object.values(o)) { if (v && typeof v === "object" && "tipo" in v && "fonte" in v) numeros.push(v); else if (v && typeof v === "object" && !(v instanceof RegExp)) coletar(v); } };
    coletar(E.PERFIS); coletar(E.REFERENCIAS);
    assert.ok(numeros.length > 60);
    for (const x of numeros) {
      assert.ok(["publicado", "estimado", "imputado"].includes(x.tipo), `tipo ${x.tipo}`);
      assert.ok(["alta", "media", "baixa"].includes(x.confianca), `confiança ${x.confianca}`);
      assert.ok(x.periodo && x.item && x.valor != null, JSON.stringify(x));
      if (x.tipo !== "imputado") assert.ok(x.fonte, `fonte vazia em ${x.item}`);
    }
  });

  await check("liga: determinística, total mantido, âncoras exatas, LaLiga com 52% nos 2 maiores", () => {
    for (const l of ligas) {
      const a = E.economiaDaLiga(indice, l), b = E.economiaDaLiga(indice, l);
      assert.deepStrictEqual([...a.entries()], [...b.entries()], `${l} não determinística`);
      const v = [...a.values()];
      const p = E.PERFIS[l];
      const total = p.receitaTotal.valor * (p.receitaTotal.moeda === "BRL" ? 1 : { GBP: 7, EUR: 6, USD: 5.5 }[p.receitaTotal.moeda]) * (v.length / p.clubes);
      const soma = v.reduce((s, x) => s + x.receitaAnual - x.receitas.transicaoAnual, 0);
      assert.ok(Math.abs(soma - total) / total < 0.02, `${l}: soma ${soma} x total ${total}`);
      for (let i = 1; i < v.length; i++) if (!v[i].ancorado && !v[i - 1].ancorado) assert.ok(v[i].receitaAnual <= v[i - 1].receitaAnual, `${l}: ordem ${i}`);
    }
    assert.strictEqual(porNome("brasileirao", /^Flamengo/).receitaAnual, 2090e6);
    assert.strictEqual(porNome("brasileirao", /^Flamengo/).folhaBaseMensal, 37.5e6);
    assert.strictEqual(porNome("brasileirao", /^Palmeiras/).folhaBaseMensal, 30e6);
    assert.strictEqual(porNome("brasileirao", /^Bahia/).folhaBaseMensal, 14e6);
    assert.strictEqual(porNome("brasileirao", /^Mirassol/).receitaAnual, 180e6);
    assert.strictEqual(porNome("premier_league", /^Arsenal/).folhaBaseAnual, Math.round(189.3e6 * 7 / 1000) * 1000);
    const la = [...E.economiaDaLiga(indice, "la_liga").values()];
    const fatia = (la[0].receitaAnual + la[1].receitaAnual) / la.reduce((s, x) => s + x.receitaAnual, 0);
    assert.ok(Math.abs(fatia - 0.52) < 0.01, `LaLiga top 2: ${fatia}`);
    assert.deepStrictEqual([la[0].nome, la[1].nome].sort(), ["FC Barcelona", "Real Madrid"].sort().map((x, i) => [la[0].nome, la[1].nome].sort()[i]));
  });

  await check("ordens de grandeza: elite x menor folha, Premier League x Brasil, receita x caixa, sem superávit irreal", () => {
    const fla = porNome("brasileirao", /^Flamengo/), mir = porNome("brasileirao", /^Mirassol/), ars = porNome("premier_league", /^Arsenal/);
    assert.ok(fla.folhaBaseMensal >= 6 * mir.folhaBaseMensal);
    assert.ok(ars.folhaBaseMensal > 2 * fla.folhaBaseMensal && ars.receitaAnual > 2 * fla.receitaAnual);
    for (const l of ligas) for (const x of E.economiaDaLiga(indice, l).values()) {
      assert.ok(x.caixaInicial < x.receitaAnual * 0.2, `${x.nome}: caixa ${x.caixaInicial} x receita ${x.receitaAnual}`);
      assert.ok(x.resultadoOperacionalAnual <= x.receitaAnual * 0.1, `${x.nome}: resultado ${x.resultadoOperacionalAnual}`);
      assert.ok(x.despesasOperacionaisAnual >= x.receitaAnual * 0.12 - 1000, `${x.nome}: despesas`);
      assert.ok(x.folhaBaseMensal > 0 && x.orcamentoTransferencias > 0);
    }
  });

  await check("virada: transição do rebaixado (1º > 2º > sem), promovido abaixo, caixa e obrigações seguem", () => {
    const base = { ...porNome("premier_league", /^Brentford/), obrigacoes: [{ mes: 3, valor: 1e6 }] };
    const a1 = E.economiaNaVirada(indice, base, { para: "efl_championship", status: "rebaixado", anoAposQueda: 1 });
    const a2 = E.economiaNaVirada(indice, base, { para: "efl_championship", status: "rebaixado", anoAposQueda: 2 });
    const a3 = E.economiaNaVirada(indice, base, { para: "efl_championship", status: "rebaixado", anoAposQueda: 3 });
    assert.ok(a1.receitas.transicaoAnual > a2.receitas.transicaoAnual && a2.receitas.transicaoAnual > 0 && a3.receitas.transicaoAnual === 0);
    assert.ok(a1.receitaAnual > a3.receitaAnual && a1.receitaAnual < base.receitaAnual);
    assert.strictEqual(a1.caixaInicial, base.caixaInicial);
    assert.deepStrictEqual(a1.obrigacoes, base.obrigacoes);
    const prom = E.economiaNaVirada(indice, porNome("efl_championship", /./), { para: "premier_league", status: "promovido" });
    const reb = E.economiaNaVirada(indice, porNome("premier_league", /./), { para: "efl_championship", status: "rebaixado" });
    assert.ok(prom.receitaAnual > reb.receitaAnual, "o promovido à Premier League ganha mais que o rebaixado à Championship");
    const bra = E.economiaNaVirada(indice, porNome("serie_b", /./), { para: "brasileirao", status: "promovido" });
    assert.ok(bra.receitaAnual < porNome("brasileirao", /^Flamengo/).receitaAnual && bra.liga === "brasileirao");
  });

  await check("capacidade de compra: orçamento, caixa imediato, folha, parcelas e recebíveis no mês certo", () => {
    const est = { caixa: 10e6, folhaMensal: 2e6, tetoMensal: 2.5e6, orcamento: 8e6, receitaMensal: 3e6, despesaMensal: 1e6, parcelasAPagar: [], recebiveis: [] };
    assert.deepStrictEqual(E.capacidadeDeCompra(est, { taxa: 6e6, parcelas: 1, salarioMensal: 0.3e6 }).ok, true);
    assert.strictEqual(E.capacidadeDeCompra(est, { taxa: 9e6, parcelas: 1, salarioMensal: 0 }).motivo, "orcamento");
    assert.strictEqual(E.capacidadeDeCompra({ ...est, orcamento: 50e6 }, { taxa: 9e6, parcelas: 1, salarioMensal: 0 }).motivo, "caixa");
    assert.strictEqual(E.capacidadeDeCompra(est, { taxa: 1e6, parcelas: 1, salarioMensal: 0.6e6 }).motivo, "folha");
    // Parcelas: 5 de 6 mi com o caixa queimando 0,5 mi/mês → negativo no caminho.
    const apertado = { ...est, orcamento: 60e6, receitaMensal: 2.5e6, despesaMensal: 1e6, tetoMensal: 9e6 };
    const r = E.capacidadeDeCompra(apertado, { taxa: 30e6, parcelas: 5, salarioMensal: 0 });
    assert.strictEqual(r.motivo, "parcelas");
    assert.strictEqual(r.primeiraParcela, 6e6);
    // O crédito de uma venda no mês 1 resolve; no mês 9 (depois das parcelas), não.
    assert.strictEqual(E.capacidadeDeCompra({ ...apertado, recebiveis: [{ mes: 1, valor: 30e6 }] }, { taxa: 30e6, parcelas: 5, salarioMensal: 0 }).ok, true);
    assert.strictEqual(E.capacidadeDeCompra({ ...apertado, recebiveis: [{ mes: 9, valor: 30e6 }] }, { taxa: 30e6, parcelas: 5, salarioMensal: 0 }).motivo, "parcelas");
    // Parcelas já assumidas contam.
    assert.strictEqual(E.capacidadeDeCompra({ ...est, orcamento: 60e6, parcelasAPagar: [{ mes: 1, valor: 10.5e6 }] }, { taxa: 1e6, parcelas: 1, salarioMensal: 0 }).motivo, "parcelas");
  });

  await check("módulo puro: o índice não muda", () => {
    for (const l of ligas) E.economiaDaLiga(indice, l);
    assert.strictEqual(JSON.stringify(indice), copia);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
