// MERCADO-001, etapa 2 (25/11/2026): caixa, folha, parcelas, pedidas e a
// avaliação de oferta (economia v5), iguais para o técnico e a CPU
// (handoff em docs/economia/04_Handoff_Mercado.md, seções 2 e 3). Confere:
//   1) aceite "janela de um clube pequeno": R$ 1,2 mi livres para entrada,
//      R$ 70 mil/mês para parcelas e R$ 130 mil/mês de folha; compra de R$ 2,4
//      mi (R$ 900 mil agora, 24 × R$ 62,5 mil, salário R$ 75 mil) e empréstimo
//      sem taxa com 30% de R$ 100 mil -> sobram R$ 300 mil, R$ 7,5 mil e R$ 25 mil;
//   2) restrição financeira: caixa inicial, parcelas, folha, orçamento e
//      déficit futuro bloqueiam, com o valor que falta; a CPU decide pela mesma
//      função (estado dela);
//   3) pedidas (seção 3): jovem 80%–130%; titular com contrato longo
//      130%–180%; titular sem reposição e sem cobertura não é negociado;
//      reserva em fim de contrato abaixo do valor;
//   4) carreira nova: teto pela faixa (60% do custo do elenco, convertido à
//      folha-base) ou a folga de abertura; as despesas fecham o resultado da
//      base com a folha no teto;
//   5) compra parcelada por mês, de ponta a ponta: entrada agora, uma parcela
//      por mês (o vendedor da CPU recebe cada uma), o total pago igual à taxa,
//      e o orçamento da temporada registrado.
// Uso: node tests/unit/test_mercado_etapa2.js
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");
globalThis.window = globalThis;

let n = 0, failed = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
const imp = (m) => import(pathToFileURL(path.join(ROOT, "public/js/motor", m)).href);

(async () => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
  const v2 = await imp("v2.js");
  const estado = await imp("estado.js");
  const semana = await imp("semana.js");
  const CMu = await imp("carreiramundo.js");
  const E = await imp("economia.js");
  const fin = await imp("financas.js");
  const mercado = await imp("mercado.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
  const nova = async (liga, re) => {
    estado.definirCarreira(null);
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], armazem: { pedir: async () => ({ ok: true }) } });
    return CMu.criarCarreiraNoMundo({ indice, liga, clubId: indice.clubes.find((c) => c.liga === liga && re.test(c.nome)).id, elencosDaLiga });
  };
  // Clube pequeno do aceite: caixa R$ 2,0 mi com reserva de R$ 800 mil (folha
  // R$ 300 mil + despesas R$ 500 mil) -> R$ 1,2 mi livres; resultado no teto
  // R$ 70 mil; teto R$ 430 mil -> R$ 130 mil de folha.
  const pequeno = { caixa: 2.0e6, folha: 300e3, despesasMensais: 500e3, teto: 430e3, receitaMensal: 1.0e6, parcelasMensais: [], orcamentoRestante: 5e6, mesesNaTemporada: 6 };

  await check("aceite: janela de um clube pequeno (compra parcelada e empréstimo sem taxa)", () => {
    const env = E.envelopes(pequeno);
    assert.deepStrictEqual([env.entrada, env.parcelas, env.folha], [1.2e6, 70e3, 130e3]);
    const compra = E.avaliarOperacao(pequeno, { taxa: 2.4e6, entrada: 0.9e6, meses: 24, salario: 75e3 });
    assert.ok(compra.ok, JSON.stringify(compra));
    assert.deepStrictEqual(compra.paga, { agora: 900e3, porMes: 62500, meses: 24, total: 2.4e6, salario: 75e3 });
    // Depois da compra: a parcela nova e o salário novo no estado.
    const depois = { ...pequeno, caixa: pequeno.caixa - 900e3, folha: pequeno.folha + 75e3, parcelasMensais: [{ valor: 62500, meses: 24 }],
      despesasMensais: pequeno.despesasMensais };
    // (a reserva cresce com a folha nova: o caixa livre fica R$ 300 mil − R$ 75 mil;
    // o handoff mede o espaço de entrada antes da folha nova entrar na reserva)
    const emp = E.avaliarOperacao(depois, { taxa: 0, meses: 0, salario: 30e3 });
    assert.ok(emp.ok, JSON.stringify(emp));
    assert.strictEqual(compra.depois.entrada, 300e3);
    assert.strictEqual(compra.depois.parcelas, 7500);
    assert.strictEqual(emp.depois.folha, 25e3);
    assert.strictEqual(emp.depois.parcelas, 7500);
  });

  await check("restrição financeira: caixa, parcelas, folha, orçamento e déficit futuro, com o que falta; a CPU pela mesma função", async () => {
    const r1 = E.avaliarOperacao(pequeno, { taxa: 3e6, entrada: 1.5e6, meses: 24, salario: 0 });
    assert.strictEqual(r1.motivo, "caixa"); assert.strictEqual(r1.faltam, 300e3);
    const r2 = E.avaliarOperacao(pequeno, { taxa: 2.4e6, entrada: 0.3e6, meses: 24, salario: 0 });
    assert.strictEqual(r2.motivo, "parcelas"); assert.strictEqual(r2.faltam, 87500 - 70000);
    const r3 = E.avaliarOperacao(pequeno, { taxa: 0, salario: 150e3 });
    assert.strictEqual(r3.motivo, "folha"); assert.strictEqual(r3.faltam, 20e3);
    const r4 = E.avaliarOperacao({ ...pequeno, orcamentoRestante: 500e3 }, { taxa: 2.4e6, entrada: 0.9e6, meses: 24, salario: 0 });
    assert.strictEqual(r4.motivo, "orcamento");
    // Déficit futuro: receita que mal paga as contas (o caixa se esgota no compromisso).
    const apertado = { ...pequeno, receitaMensal: 0.82e6, teto: 300e3 + 130e3 };
    const r5 = E.avaliarOperacao({ ...apertado, despesasMensais: 520e3 }, { taxa: 1.2e6, entrada: 0.4e6, meses: 12, salario: 60e3 });
    assert.ok(["fluxo", "parcelas"].includes(r5.motivo), JSON.stringify(r5));
    // A CPU: o estado dela (caixa, folha, teto pela faixa, receita do clube) e a mesma decisão.
    const C = await nova("premier_league", /^Arsenal/);
    const id = C.divisionTeams.premier_league.map((t) => String(t.id)).find((x) => x !== String(C.clubId));
    const ec = semana.estadoFinanceiroDaCpu(id);
    assert.ok(ec.receitaMensal > 0 && ec.teto >= ec.folha && ec.despesasMensais > 0, JSON.stringify(ec));
    const livre = E.envelopes(ec).entrada;
    assert.strictEqual(semana.cpuPodePagar(id, Math.round(livre * 0.9), 1, 0), E.avaliarOperacao(ec, { taxa: Math.round(livre * 0.9) }).ok);
    assert.strictEqual(semana.cpuPodePagar(id, Math.round(livre * 1.2), 1, 0), false);
  });

  await check("pedidas: jovem 80%–130%, titular de contrato longo 130%–180%, recusa sem reposição e sem cobertura", () => {
    const P = mercado.MER_PARAMETROS;
    const mk = (id, group, overall, extra = {}) => ({ id, group, overall, age: 27, potential: overall, contractUntil: 2029, value: 10e6, ...extra });
    const zaga = [mk("a", "D", 80), mk("b", "D", 76), mk("c", "D", 75), mk("d", "D", 74), mk("e", "D", 70), mk("f", "D", 69), mk("g", "D", 68)];
    const ctx = { pedidaV5: true, seasonYear: 2026 };
    // Titular com contrato longo e reposição: 130%.
    const t = mercado.reservaParaProposta(zaga[1], { roster: zaga }, ctx, P);
    assert.strictEqual(t.papel, "titular"); assert.ok(t.fator >= 1.3 && t.fator <= 1.8, JSON.stringify(t)); assert.ok(!t.recusa);
    // Titular sem reposição e sem cobertura: recusa.
    const curta = [mk("x", "D", 82), mk("y", "D", 70), mk("z", "D", 69)];
    const r = mercado.reservaParaProposta(curta[0], { roster: curta }, ctx, P);
    assert.ok(r.recusa && r.fator === 1.8, JSON.stringify(r));
    assert.ok(/não negocia/.test(mercado.motivoDoVendedor(r, "Clube")));
    // Jovem com mercado: 80% (reserva) a 130% (titular).
    const jovemReserva = mercado.reservaParaProposta(mk("j", "D", 60, { age: 20, potential: 80 }), { roster: zaga }, ctx, P);
    assert.strictEqual(jovemReserva.fator, 0.8);
    const jovemTitular = mercado.reservaParaProposta(mk("k", "D", 79, { age: 21, potential: 86 }), { roster: zaga }, ctx, P);
    assert.strictEqual(jovemTitular.fator, 1.3);
    // Reserva em fim de contrato: abaixo do valor.
    const fim = mercado.reservaParaProposta(mk("r", "D", 60, { contractUntil: 2025 }), { roster: zaga }, ctx, P);
    assert.ok(fim.fator < 0.9, JSON.stringify(fim));
    // Sem v5: a regra de antes.
    const antes = mercado.reservaParaProposta(zaga[1], { roster: zaga }, {}, P);
    assert.strictEqual(antes.recusa, undefined);
  });

  await check("carreira nova: teto pela faixa (custo do elenco → folha-base) ou a folga de abertura; resultado da base no teto", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    assert.strictEqual(C.economia.versao, E.VERSAO_ECONOMIA);
    const b = E.economiaDaLiga(indice, "premier_league").get(String(C.clubId));
    const folha = fin.wageBill(C.squad);
    const faixa = Math.round((0.6 * E.PERFIS.premier_league.razaoFolhaBase.valor * b.receitaAnual) / 12 / 1000) * 1000;
    assert.strictEqual(C.finances.wageCap, Math.max(faixa, Math.round((folha * 1.1) / 1000) * 1000));
    const res = b.receitaAnual - C.finances.wageCap * 12 - C.economia.clube.despesasMensais * 12;
    assert.ok(Math.abs(res - b.resultadoOperacionalAnual) < b.receitaAnual * 0.01, `resultado ${res}`);
    // Clube que nasce acima da faixa (Championship): ganha a folga de abertura.
    const S = await nova("efl_championship", /^Southampton/);
    assert.ok(S.finances.wageCap >= Math.round((fin.wageBill(S.squad) * 1.1) / 1000) * 1000 - 1000);
    assert.ok(E.custoDoElenco(fin.wageBill(S.squad), "efl_championship") > fin.wageBill(S.squad));
  });

  await check("compra parcelada por mês: entrada agora, uma parcela por mês ao vendedor, total = taxa, orçamento registrado", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    const vendedor = C.divisionTeams.premier_league.map((t) => String(t.id)).find((x) => x !== String(C.clubId));
    const p = C.leagueSquads[vendedor].slice().sort((a, b) => a.value - b.value)[5];
    const taxa = p.value, entrada = Math.round(taxa * 0.3 / 1000) * 1000, meses = 6;
    const caixa0 = C.finances.cash, cpu0 = semana.caixaDaCpu(vendedor);
    const o = { id: "op_teste", playerId: p.id, playerName: p.name, clubId: vendedor, clubName: "Vendedor", offerValue: taxa, installments: 1, entrada, meses };
    const r = semana.finalizeIncomingPurchase(o);
    assert.ok(r.ok, JSON.stringify(r));
    assert.strictEqual(caixa0 - C.finances.cash, entrada);
    assert.strictEqual(semana.caixaDaCpu(vendedor) - cpu0, entrada);
    assert.strictEqual(C.parcelasMensais.length, 1);
    const porMes = C.parcelasMensais[0].valor;
    assert.strictEqual(porMes, Math.round((taxa - entrada) / meses));
    assert.ok(C.economia.orcamento && C.economia.orcamento.gasto >= entrada);
    let pago = 0;
    for (let m = 0; m < meses + 2; m++) { const antes = C.finances.cash; semana.pagarParcelasMensais(C, `mês ${m}`); pago += antes - C.finances.cash; }
    assert.strictEqual(C.parcelasMensais.length, 0);
    assert.strictEqual(entrada + pago, entrada + porMes * meses);
    assert.ok(Math.abs(entrada + pago - taxa) <= meses, "o total pago é a taxa (arredondamento por parcela)");
    assert.strictEqual(semana.caixaDaCpu(vendedor) - cpu0, entrada + pago);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
