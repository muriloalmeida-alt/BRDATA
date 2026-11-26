// MERCADO-001, etapa 3 (26/11/2026): compra definitiva, agente livre,
// empréstimos e percentual de revenda (economia v6), com persistência e
// idempotência (handoff em docs/economia/04_Handoff_Mercado.md, seções 3 e 4).
// Confere, sem navegador:
//   1) catálogo salarial por divisão e papel (jovem, reserva, titular,
//      destaque) na criação; a oferta sugerida sai no nível da faixa do
//      destino; o atleta pode recusar condições mesmo com o clube vendedor de
//      acordo;
//   2) agente livre: taxa zero ao clube anterior, salário pela faixa (o
//      veterano aceita menos), luvas e comissão pagas e lançadas no extrato,
//      e bloqueio pela mesma avaliação quando não cabem;
//   3) empréstimos: desenvolvimento (20%–50%, jovem que vai jogar, sem taxa;
//      recusado para quem passa da idade ou seria reserva) e fora dos planos
//      (taxa que cai com a parte do salário, paga ao clube de origem);
//      obrigação de compra registrada como compromisso na assinatura e baixada
//      uma vez na conclusão; opção revalidada na execução;
//   4) percentual de revenda: com ele, o vendedor aceita uma taxa menor; o
//      percentual fica com o atleta e é pago uma vez, na próxima venda, sobre
//      cada recebimento;
//   5) persistência e idempotência: o save (JSON) leva parcelas, compromissos
//      e revenda; repetir a mesma operação (opId) não duplica o empréstimo nem
//      os lançamentos.
// Uso: node tests/unit/test_mercado_etapa3.js
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
  const mercado = await imp("mercado.js");
  const clube = await imp("clube.js");
  const fechamento = await imp("fechamento.js");
  const negociacao = await imp("negociacao.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
  const nova = async (liga, re) => {
    estado.definirCarreira(null);
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], armazem: { pedir: async () => ({ ok: true }) } });
    const C = await CMu.criarCarreiraNoMundo({ indice, liga, clubId: indice.clubes.find((c) => c.liga === liga && re.test(c.nome)).id, elencosDaLiga });
    // Janela aberta (semana de janela do calendário).
    const j = C.calendar.weeks.findIndex((w) => w.j);
    if (j >= 0) C.calendar.idx = j;
    return C;
  };
  const daDivisao = (C, liga) => C.divisionTeams[liga].map((t) => String(t.id)).filter((id) => id !== String(C.clubId));

  await check("catálogo salarial por divisão e papel; o atleta pesa a faixa do destino e pode recusar", async () => {
    const C = await nova("efl_championship", /^Southampton/);
    assert.strictEqual(C.economia.versao, E.VERSAO_ECONOMIA);
    for (const l of C.divisoes) {
      const f = C.economia.salarios[l];
      for (const papel of ["reserva", "titular"]) assert.ok(f[papel] && f[papel][0] > 0 && f[papel][0] <= f[papel][1], `${l}: ${papel} ${JSON.stringify(f[papel])}`);
    }
    assert.ok(C.economia.salarios.premier_league.titular[0] > C.economia.salarios.efl_championship.titular[0], "Premier League paga mais ao titular");
    // Um atleta da Championship indo para um clube da Premier League pede mais que o salário atual.
    const pl = daDivisao(C, "premier_league")[0], ch = daDivisao(C, "efl_championship")[0];
    const p = C.leagueSquads[ch].slice().sort((a, b) => b.overall - a.overall)[0];
    const ref = negociacao.salarioDeReferenciaNoDestino(p, pl);
    assert.ok(ref > p.wage, `referência ${ref} x atual ${p.wage}`);
    // A oferta sugerida já sai no nível do destino (não abaixo da referência).
    assert.ok(mercado.salarioSugerido(p, "titular", { salarioReferencia: ref, papelAtual: "titular", divisaoAtual: 1, divisaoComprador: 1 }) >= ref);
    // O atleta pode recusar condições mesmo com o clube vendedor de acordo:
    // perder a titularidade e cair de divisão com o salário atual.
    const a = mercado.avaliacaoAtleta(p, { salario: p.wage, papel: "reserva", anos: 3 }, { papelAtual: "titular", divisaoAtual: 0, divisaoComprador: 1, forcaAtual: 75, forcaComprador: 65 });
    assert.strictEqual(a.decisao, "recusa");
  });

  await check("agente livre: taxa zero, salário pela faixa (veterano aceita menos), luvas e comissão no extrato; bloqueio pela avaliação", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    const mk = (id, age) => ({ id, name: `Livre ${id}`, group: "M", overall: 70, age, potential: 70, wage: 300000, value: 5e6, origin: "principal", ultimoClube: daDivisao(C, "efl_championship")[0], livreDesde: { temporada: C.seasonYear } });
    C.agentesLivres = [mk("l1", 26), mk("l2", 33)];
    const s26 = clube.salarioDoAgenteLivre(C.agentesLivres[0]), s33 = clube.salarioDoAgenteLivre(C.agentesLivres[1]);
    assert.ok(s33 < s26, `veterano ${s33} x ${s26}`);
    const caixa = C.finances.cash, ledger = (C.financeLedger || []).length;
    const r = clube.contratarAgenteLivre("l1");
    assert.ok(r.ok, JSON.stringify(r));
    const custos = E.custosDoLivre(r.salario);
    assert.strictEqual(r.luvas, custos.luvas); assert.strictEqual(r.comissao, custos.comissao);
    assert.strictEqual(caixa - C.finances.cash, custos.luvas + custos.comissao, "taxa zero: só luvas e comissão");
    assert.ok(C.financeLedger.length >= ledger + 2 && C.financeLedger.some((x) => /Luvas/.test(x.label)) && C.financeLedger.some((x) => /Comissão do agente/.test(x.label)));
    // Sem caixa para luvas e comissão: bloqueia com o motivo.
    C.finances.cash = 1000;
    const b = clube.contratarAgenteLivre("l2");
    assert.strictEqual(b.ok, false); assert.ok(["caixa", "fluxo"].includes(b.motivo), JSON.stringify(b));
  });

  await check("empréstimos: desenvolvimento sem taxa (jovem que vai jogar), fora dos planos com taxa ao clube de origem, obrigação como compromisso, opção revalidada", async () => {
    // Um clube menor (Southampton, Championship) pegando emprestado reservas da
    // Premier League que jogariam no elenco dele (o clube de origem quer minutos).
    const C = await nova("efl_championship", /^Southampton/);
    const P = v2.criarPonte();
    C.finances.wageCap = C.finances.wageCap * 3; // espaço de folha para os empréstimos do teste
    C.finances.cash = C.finances.cash * 20; C.economia.clube.orcamentoTransferencias = 1e12; // caixa e orçamento folgados
    const ch = daDivisao(C, "premier_league").map(String).filter((id) => C.leagueSquads[id]);
    const vaiJogar = (q) => mercado.papelNoElenco(q, C.squad) !== "reserva";
    // Desenvolvimento (30%) para quem passa da idade: recusado.
    const velho = ch.flatMap((id) => C.leagueSquads[id].map((p) => ({ id, p }))).find((x) => x.p.age >= 26 && vaiJogar(x.p));
    const r1 = await P.pegarEmprestado(velho.id, velho.p.id, "temporada", 30, "nenhuma", 0, "op-dev-velho");
    assert.strictEqual(r1.ok, false); assert.ok(/jovem/.test(r1.mensagem), r1.mensagem);
    // Fora dos planos com 50%: taxa de 10% do valor ao clube de origem.
    const alvo = ch.flatMap((id) => C.leagueSquads[id].filter((p) => mercado.papelNoElenco(p, C.leagueSquads[id]) === "reserva" && p.age >= 24 && vaiJogar(p)).map((p) => ({ id, p })))[0];
    const caixa = C.finances.cash, cpu = semana.caixaDaCpu(alvo.id);
    const taxa = E.taxaDeEmprestimo(alvo.p, 50);
    const r2 = await P.pegarEmprestado(alvo.id, alvo.p.id, "temporada", 50, "obrigatoria", alvo.p.value, "op-emp-1");
    if (!r2.ok) throw new Error(`empréstimo não fechou: ${JSON.stringify(r2)}`);
    assert.strictEqual(r2.taxa, taxa); assert.strictEqual(r2.modalidade, "fora-dos-planos");
    assert.strictEqual(caixa - C.finances.cash, taxa);
    assert.strictEqual(semana.caixaDaCpu(alvo.id) - cpu, taxa);
    // Obrigação registrada uma vez; repetir a operação (mesmo opId) não duplica.
    assert.strictEqual(C.compromissos.filter((c) => c.playerId === alvo.p.id).length, 1);
    const r3 = await P.pegarEmprestado(alvo.id, alvo.p.id, "temporada", 50, "obrigatoria", alvo.p.value, "op-emp-1");
    const { repetida, ...semMarca } = r3;
    assert.ok(repetida, "a repetição é reconhecida"); assert.deepStrictEqual(semMarca, r2);
    assert.strictEqual(C.compromissos.filter((c) => c.playerId === alvo.p.id).length, 1);
    assert.strictEqual(C.squad.filter((p) => p.id === alvo.p.id).length, 1);
    // A obrigação entra na projeção do caixa.
    assert.ok(semana.estadoFinanceiroDoTecnico(C).compromissos.some((c) => c.valor === alvo.p.value));
    // Conclusão: compra obrigatória executada, compromisso baixado.
    const p = C.squad.find((x) => x.id === alvo.p.id);
    fechamento.settleLoanIn(p);
    assert.strictEqual(p.origin, "principal");
    assert.strictEqual((C.compromissos || []).filter((c) => c.playerId === alvo.p.id).length, 0);
    // Opção sem caixa: não compra (revalidada), o atleta volta ao clube de origem.
    const outro = ch.flatMap((id) => C.leagueSquads[id].filter((q) => mercado.papelNoElenco(q, C.leagueSquads[id]) === "reserva" && q.age >= 24 && q.id !== alvo.p.id && vaiJogar(q)).map((q) => ({ id, p: q })))[3];
    const r4 = await P.pegarEmprestado(outro.id, outro.p.id, "temporada", 100, "opcional", outro.p.value, "op-emp-2");
    if (!r4.ok) throw new Error(`empréstimo 2 não fechou: ${JSON.stringify(r4)}`);
    assert.strictEqual(r4.taxa, 0, "com 100% do salário, sem taxa");
    C.finances.cash = Math.round(outro.p.value * 0.5);
    fechamento.settleLoanIn(C.squad.find((x) => x.id === outro.p.id));
    assert.ok(!C.squad.some((x) => x.id === outro.p.id), "voltou ao clube de origem");
  });

  await check("percentual de revenda: taxa menor na compra; pago uma vez na próxima venda, sobre cada recebimento", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    // O vendedor abate metade do percentual na taxa.
    assert.strictEqual(E.fatorDaRevenda(20), 0.9);
    assert.strictEqual(E.fatorDaRevenda(5), 1, "fora da faixa, nada");
    const vendedor = daDivisao(C, "premier_league")[0];
    const p = C.leagueSquads[vendedor].slice().sort((a, b) => a.value - b.value)[5];
    const r = semana.finalizeIncomingPurchase({ id: "op_rev", playerId: p.id, playerName: p.name, clubId: vendedor, clubName: "Vendedor", offerValue: p.value, installments: 1, revendaPct: 20 });
    assert.ok(r.ok, JSON.stringify(r));
    assert.deepStrictEqual(p.revenda, { clubId: vendedor, pct: 20 });
    // Venda à vista: 20% do recebido ao clube anterior, uma vez.
    const comprador = daDivisao(C, "premier_league")[1];
    const caixa = C.finances.cash, cpu = semana.caixaDaCpu(vendedor);
    C.pendingOffer = { playerId: p.id, playerName: p.name, clubId: comprador, clubName: "Comprador", fee: 10e6 };
    clube.acceptOffer();
    assert.strictEqual(semana.caixaDaCpu(vendedor) - cpu, 2e6);
    assert.strictEqual(C.finances.cash - caixa, 10e6 - 2e6);
    assert.strictEqual(p.revenda, undefined, "liquidado uma vez");
    assert.ok(C.financeLedger.some((x) => /Percentual de revenda \(20%\)/.test(x.label)));
    // Venda parcelada (anúncio): a parte sai da 1ª e de cada parcela.
    const q = C.squad.find((x) => x.origin === "principal" && x.id !== p.id);
    q.revenda = { clubId: vendedor, pct: 10 };
    const cpu2 = semana.caixaDaCpu(vendedor);
    C.pendingListings = [{ id: "l1", playerId: q.id, playerName: q.name, askingValue: 9e6, offers: [{ id: "o1", clubId: comprador, clubName: "Comprador", value: 9e6, installments: 3 }] }];
    const v = clube.acceptListingOffer("l1", "o1");
    assert.ok(v.ok !== false, JSON.stringify(v));
    assert.strictEqual(semana.caixaDaCpu(vendedor) - cpu2, 300000, "10% da 1ª parcela");
    semana.processPendingReceivables(); semana.processPendingReceivables();
    assert.strictEqual(semana.caixaDaCpu(vendedor) - cpu2, 900000, "10% de cada recebimento: 10% da venda");
  });

  await check("persistência: o save (JSON) leva parcelas, compromissos e revenda; reaberto, a carreira segue", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    C.parcelasMensais = [{ valor: 100000, meses: 3, label: "Parcela de X", clubId: daDivisao(C, "premier_league")[0] }];
    C.compromissos = [{ tipo: "obrigacao", playerId: "x", valor: 5e6, mes: 4 }];
    C.squad[0].revenda = { clubId: daDivisao(C, "premier_league")[1], pct: 15 };
    const reaberto = JSON.parse(JSON.stringify(C));
    estado.definirCarreira(reaberto);
    assert.deepStrictEqual(reaberto.parcelasMensais, C.parcelasMensais);
    assert.deepStrictEqual(reaberto.compromissos, C.compromissos);
    assert.deepStrictEqual(reaberto.squad[0].revenda, C.squad[0].revenda);
    const e = semana.estadoFinanceiroDoTecnico(reaberto);
    assert.ok(e.parcelasMensais.some((x) => x.valor === 100000) && e.compromissos.some((x) => x.valor === 5e6));
    // Um mês pago uma vez: a parcela cai de 3 para 2.
    semana.pagarParcelasMensais(reaberto, "agosto");
    assert.strictEqual(reaberto.parcelasMensais[0].meses, 2);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
