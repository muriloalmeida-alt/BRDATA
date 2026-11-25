// ECON-001, Entrega 2 (25/11/2026): preços, salários e a mesma capacidade de
// compra para o técnico e a CPU, ativados nas carreiras novas (economia v2).
// Confere, sem navegador:
//   1) carreira nova no Arsenal: CAREER.economia na versão 2; a folha dos
//      contratos perto da folha-base do clube (±35%); caixa do técnico e da
//      CPU pela base financeira; a mesma qualidade ganha mais no clube mais
//      rico (Arsenal x Championship); TV e despesas do mês pela base, com as
//      despesas fechando a margem do clube com a folha real;
//   2) contratos gerados depois (base, prospecto, reposição) já na escala
//      do clube, e escalar duas vezes não muda nada;
//   3) mesma capacidade de compra: técnico e CPU com o mesmo estado têm a
//      mesma resposta; a demanda entre países (comprador de mercado mais
//      caro paga mais; no doméstico, não); a proposta do técnico sem caixa é recusada com o
//      motivo; a CPU sem caixa não compra;
//   4) plausibilidade dos preços pelos negócios de referência (com margem);
//   5) virada: o clube do técnico rebaixado à Championship recebe a
//      transição e as escalas de quem entra no save são completadas;
//   6) divisões de baixo: o atleta mediano cabe no caixa do clube mediano em
//      todas as divisões, e o clube mais pobre da divisão mais pobre consegue
//      contratar parte relevante dela (relato da Série C, 25/11);
//   7) nivelamento mundial: o Brasil (modo exemplo, overall até 92) abaixo da
//      Premier League no topo e na mediana do valor e no maior salário; no
//      país, o clube mais rico nunca paga menos pela mesma qualidade;
//   8) save sem economia (carreiras de antes): tudo como antes.
// Uso: node tests/unit/test_economia_mercado.js
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
  const temporada = await imp("temporada.js");
  const negociacao = await imp("negociacao.js");
  const virada = await imp("virada.js");
  const texto = await imp("texto.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const elencosDaLiga = async (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8")).playersByTeamId;
  const clube = (liga, re) => indice.clubes.find((c) => c.liga === liga && re.test(c.nome));
  const nova = async (liga, re) => {
    estado.definirCarreira(null);
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], armazem: { pedir: async () => ({ ok: true }) } });
    return CMu.criarCarreiraNoMundo({ indice, liga, clubId: clube(liga, re).id, elencosDaLiga });
  };
  const dentro = (v, lo, hi, msg) => assert.ok(v >= lo && v <= hi, `${msg}: ${(v / 1e6).toFixed(1)} mi fora de ${(lo / 1e6).toFixed(1)}–${(hi / 1e6).toFixed(1)}`);

  await check("carreira nova no Arsenal: economia v2, folha e caixa pela base, salários por clube, mês pela base", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    assert.strictEqual(C.economia.versao, E.VERSAO_ECONOMIA);
    const base = E.economiaDaLiga(indice, "premier_league").get(String(C.clubId));
    const folha = fin.wageBill(C.squad);
    assert.ok(Math.abs(folha - base.folhaBaseMensal) / base.folhaBaseMensal < 0.35, `folha ${folha} x ${base.folhaBaseMensal}`);
    assert.strictEqual(C.finances.cash, base.caixaInicial);
    assert.strictEqual(C.finances.wageCap, Math.round((folha * 1.35) / 1000) * 1000);
    // CPU: o caixa da base de cada clube; a folha dele também na escala.
    const ch = E.economiaDaLiga(indice, "efl_championship");
    const [idCh, bCh] = [...ch.entries()][0];
    assert.strictEqual(C.caixaCpu[idCh], bCh.caixaInicial);
    // Folha dos contratos ÷ folha-base: a mediana de cada divisão perto de 1
    // (o clube a clube varia: a folha real sai da qualidade do elenco).
    for (const l of C.divisoes) {
      const r = [...E.economiaDaLiga(indice, l)].filter(([id]) => C.leagueSquads[id] || id === String(C.clubId)).map(([id, b]) => fin.wageBill(id === String(C.clubId) ? C.squad : C.leagueSquads[id]) / b.folhaBaseMensal).sort((x, y) => x - y);
      const m = r[r.length >> 1];
      assert.ok(m > 0.7 && m < 1.3, `${l}: folha real ÷ base mediana ${m.toFixed(2)}`);
    }
    // A mesma qualidade ganha mais no clube mais rico (Arsenal x o maior da Championship).
    const a = temporada.computeContractFields(75, 25, 80, () => 0.5, 2026, E.escalaDe(C, C.clubId));
    const b = temporada.computeContractFields(75, 25, 80, () => 0.5, 2026, E.escalaDe(C, idCh));
    assert.ok(a.wage > b.wage, `salário ${a.wage} x ${b.wage}`);
    const idMed = [...ch.keys()][Math.floor(ch.size / 2)];
    const m2 = temporada.computeContractFields(75, 25, 80, () => 0.5, 2026, E.escalaDe(C, idMed));
    assert.ok(a.wage > 1.5 * m2.wage, `salário ${a.wage} x mediano da Championship ${m2.wage}`);
    // Todo contrato do save escalado uma vez.
    assert.ok(C.squad.every((p) => p.escalaEco === 1) && Object.values(C.leagueSquads).flat().every((p) => p.escalaEco === 1));
    // O mês: TV e despesas operacionais da base no extrato.
    const caixa = C.finances.cash;
    const m = semana.applyCalendarMonthlyFinances(8);
    const tv = C.financeLedger.find((x) => x.type === "tv"), desp = C.financeLedger.find((x) => x.type === "despesa");
    assert.strictEqual(tv.amount, C.economia.clube.tvMensal);
    assert.strictEqual(desp.amount, -C.economia.clube.despesasMensais);
    assert.ok(m.wagePaid === folha && C.finances.cash !== caixa);
    // Margem do clube com a folha real: receita − folha − despesas = resultado da base.
    const res = base.receitaAnual - folha * 12 - C.economia.clube.despesasMensais * 12;
    assert.ok(Math.abs(res - base.resultadoOperacionalAnual) < base.receitaAnual * 0.01, `resultado ${res} x ${base.resultadoOperacionalAnual}`);
    // Patrocínio na escala comercial: a soma da temporada perto da receita comercial.
    const pat = fin.sponsorshipSeasonTotal(C.sponsorship);
    assert.ok(pat > base.receitas.comercialAnual * 0.6 && pat < base.receitas.comercialAnual * 1.6, `patrocínio ${pat} x ${base.receitas.comercialAnual}`);
  });

  await check("contratos gerados depois na escala do clube; escalar duas vezes não muda", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    const esc = E.escalaDe(C, C.clubId);
    const p = temporada.buildBasePlayer({ id: C.clubId }, 0, () => 0.5, { firstNames: ["A"], lastNames: ["B"], liveSeason: 2026, escala: (id) => E.escalaDe(C, id) });
    const ref = temporada.buildBasePlayer({ id: C.clubId }, 0, () => 0.5, { firstNames: ["A"], lastNames: ["B"], liveSeason: 2026 });
    assert.strictEqual(p.escalaEco, 1);
    assert.strictEqual(p.wage, Math.max(100, Math.round((ref.wage * esc.salario) / 100) * 100));
    const copia = { ...p };
    E.aplicarEscalaNoAtleta(copia, esc);
    assert.strictEqual(copia.wage, p.wage, "escalou de novo");
    // Salário justo e do agente livre pela escala do clube do técnico.
    const jogador = C.squad.find((x) => x.origin === "principal");
    assert.ok(temporada.fairWageFor(jogador, esc) > temporada.fairWageFor(jogador));
  });

  await check("mesma capacidade de compra para o técnico e a CPU, com o motivo", async () => {
    const C = await nova("efl_championship", /^Southampton/);
    const estadoComum = { caixa: 10e6, folha: 20e6, teto: 27e6 };
    const op = { taxa: 9e6, parcelas: 1, salarioMensal: 1e6 };
    const cpu = E.capacidadeNoJogo(C, estadoComum, op);
    const tec = E.capacidadeNoJogo(C, { ...estadoComum, parcelasPorRodada: [] }, op);
    assert.deepStrictEqual(cpu, tec);
    assert.strictEqual(cpu.motivo, "caixa", "9 mi com 10 mi de caixa e 5 mi de reserva (1 mês de folha em rodadas)");
    // Técnico: proposta acima do caixa recusada com o motivo.
    const P = v2.criarPonte();
    const alvoClube = Object.keys(C.leagueSquads).find((id) => id !== String(C.clubId) && C.leagueSquads[id].length > 18);
    const alvo = C.leagueSquads[alvoClube].slice().sort((a, b) => b.value - a.value)[0];
    // Janela aberta: semana da janela do calendário.
    const jan = C.calendar.weeks.findIndex((w) => w.j);
    if (jan >= 0) C.calendar.idx = jan;
    const original = C.finances.cash;
    C.finances.cash = Math.round(alvo.value / 2);
    const r = await P.fazerProposta(alvoClube, alvo.id, alvo.value, 1, null, "op-econ-1");
    assert.strictEqual(r.ok, false);
    assert.ok(["caixa", "parcelas", "janela-fechada"].includes(r.motivo), JSON.stringify(r));
    if (r.motivo !== "janela-fechada") assert.ok(r.mensagem && /caixa/i.test(r.mensagem), r.mensagem);
    // A prévia traz a capacidade.
    const pv = P.previaProposta(alvoClube, alvo.id, alvo.value, 1, alvo.wage);
    assert.ok(pv.capacidade && pv.capacidade.ok === false);
    C.finances.cash = original;
    // Demanda: só entre países (um clube de fora do save); o comprador de
    // mercado mais caro paga parte da diferença; o mais barato não ganha
    // desconto; no mercado doméstico, nada.
    const pl = C.divisionTeams.premier_league.map((t) => String(t.id)).find((id) => C.economia.escalas[id]);
    assert.strictEqual(E.fatorDeDemanda(C, pl, alvoClube), 1, "doméstico");
    C.exterior = { clubes: { [alvoClube]: {} }, saidas: {}, catalogo: {} };
    assert.ok(E.fatorDeDemanda(C, pl, alvoClube) > 1, "Premier League comprando de um clube de fora mais barato");
    assert.strictEqual(E.fatorDeDemanda(C, alvoClube, pl), 1);
    delete C.exterior;
    // CPU sem caixa não compra pela mesma regra.
    const comprador = Object.keys(C.leagueSquads).find((id) => id !== alvoClube && id !== String(C.clubId));
    C.caixaCpu[comprador] = 1000;
    const nCpu = negociacao.negociacaoCpu(alvo, alvoClube, comprador);
    assert.strictEqual(nCpu.ok, false);
  });

  await check("plausibilidade dos preços pelos negócios de referência (com margem)", async () => {
    const usd = (v) => v * texto.CAMBIO.USD, gbp = (v) => v * texto.CAMBIO.GBP, eur = (v) => v * texto.CAMBIO.EUR;
    const valor = (C, id, ov, idade, pot) => temporada.computeContractFields(ov, idade, pot, () => 0.5, 2026, E.escalaDe(C, id)).value;
    // Premier League: o topo do Newcastle (Isak, £125 mi) e o meio (Paquetá, €42 mi pelo Flamengo).
    const P = await nova("premier_league", /^Arsenal/);
    const pl = [...E.economiaDaLiga(indice, "premier_league").values()];
    const newc = pl.find((x) => /Newcastle/.test(x.nome));
    const meio = pl.find((x) => /Crystal Palace/.test(x.nome));
    const topoPl = Math.max(...Object.values(P.leagueSquads).flat().map((p) => p.overall));
    dentro(valor(P, newc.id, topoPl - 1, 25, topoPl + 2), gbp(50e6), gbp(220e6), "topo da Premier League (Isak)");
    dentro(valor(P, meio.id, topoPl - 6, 28, topoPl - 5), eur(10e6), eur(90e6), "titular de meio da Premier League (Paquetá)");
    // Argentina: talento do River vendido à Europa (Mastantuono, €45 mi). No
    // mercado argentino o preço segue a receita local; o comprador europeu
    // paga a demanda (preço mediano da liga dele ÷ o da Argentina)^0,5, até 3×.
    const A = await nova("arg_liga_profesional", /^River/);
    const demanda = Math.max(1, Math.min(E.DEMANDA.teto, (P.economia.ligas.premier_league.v[2] / A.economia.ligas.arg_liga_profesional.v[2]) ** E.DEMANDA.expoente));
    dentro(valor(A, A.clubId, 74, 18, 86) * demanda, usd(4e6), usd(60e6), "talento do River vendido à Premier League");
    // Uruguai: Peñarol (Leo Fernández, US$ 7 mi por 80%).
    const U = await nova("uru_primera", /Peñarol/);
    dentro(valor(U, U.clubId, 74, 25, 77), usd(1e6), usd(12e6), "titular do Peñarol");
    // A cauda: na 2ª divisão a maioria dos elencos fica até US$ 1 mi.
    const seg = U.divisoes[1];
    const vals = Object.entries(U.leagueSquads).filter(([id]) => (U.divisionTeams[seg] || []).some((t) => String(t.id) === id)).flatMap(([, sq]) => sq.map((p) => p.value));
    assert.ok(E.distribuicaoDePrecos(vals).ate1mi > 0.5, JSON.stringify(E.distribuicaoDePrecos(vals)));
  });

  await check("virada: rebaixado à Championship com a transição; quem entra ganha escala", async () => {
    const C = await nova("premier_league", /^Arsenal/);
    const antes = C.economia.clube;
    // O Arsenal vai para a Championship e um clube do catálogo entra na Premier League.
    const pl = C.divisionTeams.premier_league, ch = C.divisionTeams.efl_championship;
    const ars = pl.find((t) => String(t.id) === String(C.clubId));
    const sobe = ch[0];
    C.divisionTeams.premier_league = [...pl.filter((t) => t !== ars), sobe];
    C.divisionTeams.efl_championship = [...ch.filter((t) => t !== sobe), ars];
    const novo = { id: 999001, name: "Clube Novo", atk: 1, def: 1 };
    C.divisionTeams.efl_championship.push(novo);
    C.leagueSquads["999001"] = Object.values(C.leagueSquads)[3].map((p) => { const c = { ...p, id: `n_${p.id}` }; delete c.escalaEco; return c; });
    CMu.economiaDaTemporada(C);
    assert.strictEqual(C.economia.clube.liga, "efl_championship");
    assert.strictEqual(C.economia.clube.anoAposQueda, 1);
    assert.ok(C.economia.clube.tvMensal < antes.tvMensal, "a receita cai");
    const tr = E.PERFIS.efl_championship.transicao[0];
    assert.ok(C.economia.clube.tvMensal * 12 > tr.valor * texto.CAMBIO[tr.moeda], "com a transição");
    assert.ok(C.economia.escalas["999001"], "clube novo com escala");
    assert.ok(C.leagueSquads["999001"].every((p) => p.escalaEco === 1));
    // 2ª temporada na Championship: ano 2 (transição menor).
    const um = C.economia.clube.tvMensal;
    CMu.economiaDaTemporada(C);
    assert.strictEqual(C.economia.clube.anoAposQueda, 2);
    assert.ok(C.economia.clube.tvMensal < um);
  });

  await check("divisões de baixo: o atleta mediano cabe no caixa e o clube mais pobre consegue contratar", async () => {
    // Relato do Murilo (25/11): na Série C o clube não conseguia contratar
    // ninguém (o atleta mediano valia mais que o caixa inteiro do clube).
    const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[v.length >> 1]; };
    for (const [liga, re] of [["premier_league", /^Arsenal/], ["uru_primera", /Peñarol/], ["arg_liga_profesional", /^River/]]) {
      const C = await nova(liga, re);
      for (const l of C.divisoes) {
        const ids = C.divisionTeams[l].map((t) => String(t.id));
        const valores = ids.flatMap((id) => (id === String(C.clubId) ? C.squad.filter((p) => p.origin !== "base") : C.leagueSquads[id] || []).map((p) => p.value));
        const caixas = ids.map((id) => C.economia.escalas[id][2]);
        const r = med(valores) / med(caixas);
        assert.ok(r < 1, `${l}: atleta mediano ${(med(valores) / 1e6).toFixed(2)} mi x caixa mediano ${(med(caixas) / 1e6).toFixed(2)} mi`);
      }
    }
    // O clube mais pobre da Segunda uruguaia (a divisão mais pobre do mundo).
    const U = await nova("uru_primera", /Peñarol/);
    const seg = U.divisoes[1];
    const pobre = U.divisionTeams[seg].map((t) => String(t.id)).sort((a, b) => U.economia.escalas[a][2] - U.economia.escalas[b][2])[0];
    const C = await nova(seg, new RegExp(`^${indice.clubes.find((c) => String(c.id) === pobre).nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    const mesma = C.divisionTeams[seg].map((t) => String(t.id)).filter((id) => id !== String(C.clubId)).flatMap((id) => C.leagueSquads[id] || []);
    const cabe = mesma.filter((p) => { const r = semana.capacidadeDoTecnico(p.value, 4, p.wage); return r && r.ok; }).length;
    assert.ok(cabe / mesma.length > 0.25, `o mais pobre da ${seg} compra ${cabe} de ${mesma.length}`);
  });

  await check("nivelamento mundial: Brasil abaixo da Premier League; no país, o mais rico paga mais pela mesma qualidade", async () => {
    // Relato do Murilo (25/11): os atletas da Série A do Brasil saíam mais caros
    // que os da Premier League (os overalls do Brasil vêm de outra fonte, mais
    // larga, e a curva de sempre é exponencial no overall).
    const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[v.length >> 1]; };
    const da1a = (C) => { const ids = C.divisionTeams[C.divisoes ? C.divisoes[0] : "brasileirao"].map((t) => String(t.id)); return ids.flatMap((id) => (id === String(C.clubId) ? C.squad.filter((p) => p.origin !== "base") : C.leagueSquads[id] || [])); };
    const PL = await nova("premier_league", /^Arsenal/);
    const pl = da1a(PL);
    // Ordem no país: na mesma divisão, o salário de um mesmo atleta não cai
    // com a receita; entre divisões, o clube de baixo não paga mais que um de
    // cima com receita maior (no atleta mediano da divisão de baixo).
    const rec = (id, liga) => E.economiaDaLiga(indice, liga).get(id).receitaAnual;
    for (const liga of ["premier_league", "efl_championship"]) {
      const w = Math.exp(PL.economia.ligas[liga].s[0]);
      const cl = Object.entries(PL.economia.escalas).filter(([, x]) => x[1] === liga).map(([id]) => ({ id, receita: rec(id, liga), pago: E.escalaDe(PL, id).salario(w) })).sort((a, b) => a.receita - b.receita);
      for (let i = 1; i < cl.length; i++) assert.ok(cl[i].pago >= cl[i - 1].pago * 0.999, `${liga}: inversão ${cl[i].id} x ${cl[i - 1].id}`);
    }
    const wCh = Math.exp(PL.economia.ligas.efl_championship.s[0]);
    const daPremier = Object.keys(PL.economia.escalas).filter((u) => PL.economia.escalas[u][1] === "premier_league").sort((a, b) => rec(a, "premier_league") - rec(b, "premier_league"));
    for (const id of Object.keys(PL.economia.escalas).filter((x) => PL.economia.escalas[x][1] === "efl_championship")) {
      const vizinho = daPremier.find((u) => rec(u, "premier_league") >= rec(id, "efl_championship"));
      if (vizinho) assert.ok(E.escalaDe(PL, id).salario(wCh) <= E.escalaDe(PL, vizinho).salario(wCh) * 1.001, `Championship ${id} paga mais que ${vizinho}, da Premier League e mais rico`);
    }
    // E o mais rico da Premier League paga mais que o mais rico da Championship.
    const [ars] = [String(PL.clubId)], maiorCh = [...E.economiaDaLiga(indice, "efl_championship").keys()][0];
    assert.ok(E.escalaDe(PL, ars).salario(wCh) > E.escalaDe(PL, maiorCh).salario(wCh));
    // Brasil no modo exemplo (sem rede; overall até 92, o caso mais largo).
    const ponteMod = await imp("ponte.js");
    const fetchAntes = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("sem rede"); };
    let br;
    try {
      estado.definirCarreira(null); CMu.definirIndiceDoMundo(null);
      semana.definirAmbiente({ ...v2.ambienteSemPagina(), indiceDoMundo: async () => indice, armazem: { pedir: async (u, o) => (o && o.body ? { ok: true } : {}) } });
      const P = v2.criarPonte(); ponteMod.ponte.pronta = true;
      const comp = await P.escolherCompeticao("brasileirao");
      await P.criarCarreira(comp.clubes.find((c) => /Flamengo/.test(c.nome)).id);
      br = estado.carreiraAtual();
    } finally { globalThis.fetch = fetchAntes; }
    const bra = da1a(br);
    const M = (v) => `${(v / 1e6).toFixed(1)} mi`;
    assert.ok(Math.max(...bra.map((p) => p.value)) < Math.max(...pl.map((p) => p.value)), `topo: Brasil ${M(Math.max(...bra.map((p) => p.value)))} x Premier League ${M(Math.max(...pl.map((p) => p.value)))}`);
    assert.ok(med(bra.map((p) => p.value)) < med(pl.map((p) => p.value)) / 2, `mediana: Brasil ${M(med(bra.map((p) => p.value)))} x Premier League ${M(med(pl.map((p) => p.value)))}`);
    assert.ok(Math.max(...br.squad.map((p) => p.wage)) < Math.max(...PL.squad.map((p) => p.wage)), "maior salário do Flamengo abaixo do do Arsenal");
    // A folha real do Flamengo perto da folha-base (R$ 37,5 mi), ±35%.
    assert.ok(Math.abs(fin.wageBill(br.squad) / 37.5e6 - 1) < 0.35, `folha do Flamengo ${M(fin.wageBill(br.squad))}`);
    texto.definirMoeda(null);
  });

  await check("save sem economia (carreiras de antes): tudo como antes", async () => {
    E.ECONOMIA_V2.ativa = false;
    try {
      const C = await nova("premier_league", /^Arsenal/);
      assert.strictEqual(C.economia, undefined);
      assert.strictEqual(E.escalaDe(C, C.clubId), null);
      assert.strictEqual(E.capacidadeNoJogo(C, { caixa: 1, folha: 1, teto: 1 }, { taxa: 1e9 }), null);
      assert.strictEqual(semana.capacidadeDoTecnico(1e12, 1, 0), null);
      semana.applyCalendarMonthlyFinances(8);
      assert.ok(!C.financeLedger.some((x) => x.type === "despesa"));
      assert.ok(C.squad.every((p) => !p.escalaEco));
      CMu.economiaDaTemporada(C); // não faz nada
      assert.strictEqual(C.economia, undefined);
    } finally {
      E.ECONOMIA_V2.ativa = true;
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
