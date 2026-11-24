// MUNDO-001, etapa M4 (24/11/2026): formatos sul-americanos (public/js/motor/formatos.js)
// com os jogos, zonas e promedios reais do índice do mundo. Confere:
//   1) as 10 ligas jogam a temporada 2026 inteira (fases fixas do pacote + fases
//      geradas) e terminam com o número certo de acessos e quedas, sem clube
//      repetido, nenhum clube com dois jogos no mesmo dia, as fases geradas
//      depois da fase anterior e antes da próxima fixa, tudo dentro do ano;
//   2) temporada 2027 gerada (relógio + gerador de confrontos de cada liga):
//      mesmas fases fixas, mesmo número de jogos por clube, e de novo termina;
//   3) Argentina: dois descensos por critérios distintos (anual e promedio),
//      mesmo quando o pior da anual também tem o pior promedio;
//   4) Chile: campeão sobe e a Liguilla (3x8, 4x7, 5x6; o 2º pega o vencedor
//      pior colocado) dá a 2ª vaga;
//   5) Colômbia (B): os 4 cenários de acesso;
//   6) Equador: hexagonais com os pontos da 1ª fase carregados;
//   7) Uruguai: promedio de 2 temporadas (com 2025 do pacote) e caminho do
//      título (semifinal Apertura x Clausura, final contra o líder da anual);
//   8) plano salvo e relido no meio da temporada termina igual.
// Uso: node tests/unit/test_motor_formatos_sa.js
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
  const F = await import(pathToFileURL(path.join(ROOT, "public/js/motor/formatos.js")).href);
  const Rel = await import(pathToFileURL(path.join(ROOT, "public/js/motor/relogio.js")).href);
  const { rngDaChave } = await import(pathToFileURL(path.join(ROOT, "public/js/motor/desempate.js")).href);
  const mundo = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const LIGAS = Object.values(mundo.competicoes).filter((c) => c.regiao === "america_sul");
  const clubesDe = (id) => mundo.clubes.filter((c) => c.liga === id).map((c) => c.id);
  const reservasDe = (id) => mundo.clubes.filter((c) => c.liga === id && c.reserva).map((c) => c.id);
  const FIXAS = ["Fase Regular", "Apertura", "Clausura", "Competencia", "Fase Inicial"];
  const ESPERADO = {
    arg_liga_profesional: [0, 2], arg_primera_nacional: [2, 4], chi_liga_primera: [0, 2], chi_liga_ascenso: [2, 1],
    col_primera_a: [0, 2], col_primera_b: [2, 0], ecu_ligapro_a: [0, 2], ecu_ligapro_b: [2, 2], uru_primera: [0, 3], uru_segunda: [3, 2],
  };
  const sim = (chave) => {
    const rng = rngDaChave(chave);
    const g = () => { const x = rng(); return x < 0.3 ? 0 : x < 0.65 ? 1 : x < 0.88 ? 2 : 3; };
    return { jogar: () => ({ gh: g(), ga: g() }), prorrogacao: () => ({ gh: rng() < 0.3 ? 1 : 0, ga: rng() < 0.3 ? 1 : 0 }), penaltis: (p) => (rng() < 0.5 ? p.casa : p.fora) };
  };
  const jogosFixosDe = (agenda) => [...agenda.values()].flat();
  const montar = (comp, ano, agenda, extra = {}) => F.montarTemporada({
    comp, ano, clubes: clubesDe(comp.id), grupos: mundo.grupos[comp.id] || null, jogosFixos: jogosFixosDe(agenda),
    historico: (mundo.promedioInicial || {})[comp.id] || {}, reservas: reservasDe(comp.id), ...extra,
  });

  function conferir(plano, comp, ano) {
    const r = plano.resultado;
    const [s, d] = ESPERADO[comp.id];
    assert.strictEqual(r.sobem.length, s, `${comp.id}: sobem ${r.sobem.length}`);
    assert.strictEqual(r.descem.length, d, `${comp.id}: descem ${r.descem.length}`);
    const ids = [...r.sobem, ...r.descem].map((x) => x.id);
    assert.strictEqual(new Set(ids).size, ids.length, `${comp.id}: clube repetido em sobe/desce`);
    const clubes = new Set(clubesDe(comp.id));
    assert.ok(ids.every((id) => clubes.has(id)), `${comp.id}: clube de fora`);
    assert.ok(r.sobem.every((x) => !reservasDe(comp.id).includes(x.id)), `${comp.id}: clube vinculado subiu`);
    // Um jogo por dia por clube; tudo no ano civil da temporada.
    const dia = new Set();
    for (const j of plano.jogos) {
      assert.ok(j.gh != null, `${comp.id}: jogo sem placar ${j.id}`);
      assert.ok(j.data.startsWith(String(ano)), `${comp.id}: ${j.fase} em ${j.data}, fora de ${ano}`);
      for (const c of [j.casa, j.fora]) {
        const k = `${c}@${j.data}`;
        assert.ok(!dia.has(k), `${comp.id}: clube ${c} com 2 jogos em ${j.data} (${j.fase})`);
        dia.add(k);
      }
    }
    // Fases geradas: depois da última fixa que as precede e antes da próxima fixa.
    const faixa = {};
    for (const j of plano.jogos) { const f = faixa[j.fase] ||= [j.data, j.data]; if (j.data < f[0]) f[0] = j.data; if (j.data > f[1]) f[1] = j.data; }
    const fixas = Object.entries(faixa).filter(([f]) => FIXAS.includes(f)).sort((a, b) => (a[1][0] < b[1][0] ? -1 : 1));
    for (const [f, [ini, fim]] of Object.entries(faixa)) {
      if (FIXAS.includes(f)) continue;
      const antes = fixas.filter(([, [, fimFixa]]) => fimFixa < ini);
      const depois = fixas.filter(([, [iniFixa]]) => iniFixa > fim);
      const prox = depois[0];
      if (prox) assert.ok(fim < prox[1][0], `${comp.id}: fase ${f} (${ini}..${fim}) invade ${prox[0]} (${prox[1][0]})`);
      assert.ok(antes.length || ini > fixas[0][1][0], `${comp.id}: fase ${f} antes de qualquer fase fixa`);
    }
  }

  const planos2026 = {};
  await check("as 10 ligas jogam 2026 inteira: acessos e quedas certos, calendário coerente", () => {
    for (const comp of LIGAS) {
      const plano = montar(comp, 2026, Rel.agendaDoPacote(mundo.partidas[comp.id]));
      F.jogarTudo(plano, sim(`2026:${comp.id}`));
      conferir(plano, comp, 2026);
      planos2026[comp.id] = plano;
    }
  });

  await check("2027 gerada pelo relógio e pelo gerador de cada liga: mesmas fases fixas e termina", () => {
    for (const comp of LIGAS) {
      const agenda = Rel.agendaDoPacote(mundo.partidas[comp.id]);
      const fases = [...new Set(mundo.partidas[comp.id].map((p) => p[0]))];
      const nova = Rel.agendaGerada({ agendaModelo: agenda, clubes: clubesDe(comp.id), fases, confrontos: F.geradorDeConfrontos(comp.id, mundo.grupos[comp.id]) });
      // Mesmo número de jogos de fase fixa por clube e por fase.
      const conta = (lista) => { const c = {}; for (const j of lista) for (const x of [j.casa, j.fora]) c[`${j.fase}|${x}`] = (c[`${j.fase}|${x}`] || 0) + 1; return c; };
      assert.deepStrictEqual(conta(jogosFixosDe(nova)), conta(jogosFixosDe(agenda)), `${comp.id}: jogos por clube na fase`);
      // Nenhum confronto repetido além do previsto (turno: 1; returno: 2).
      const pares = {};
      for (const j of jogosFixosDe(nova)) { const k = `${j.fase}|${[j.casa, j.fora].sort().join("-")}`; pares[k] = (pares[k] || 0) + 1; }
      const maxPar = Math.max(...Object.values(pares));
      assert.ok(maxPar <= 2, `${comp.id}: par de clubes ${maxPar} vezes na mesma fase`);
      const plano = montar(comp, 2027, nova);
      F.jogarTudo(plano, sim(`2027:${comp.id}`));
      conferir(plano, comp, 2027);
    }
  });

  await check("Argentina: dois descensos por critérios distintos, mesmo com o pior da anual também pior no promedio", () => {
    const comp = mundo.competicoes.arg_liga_profesional;
    const vitima = clubesDe(comp.id)[0];
    const base = sim("arg-vitima");
    const s = { ...base, jogar: (j) => (j.casa === vitima ? { gh: 0, ga: 3 } : j.fora === vitima ? { gh: 3, ga: 0 } : base.jogar(j)) };
    const plano = montar(comp, 2026, Rel.agendaDoPacote(mundo.partidas[comp.id]));
    const r = F.jogarTudo(plano, s);
    const anual = r.descem.find((x) => x.motivo === "anual"), prom = r.descem.find((x) => x.motivo === "promedio");
    assert.strictEqual(anual.id, vitima, "a vítima cai pela anual");
    assert.notStrictEqual(prom.id, vitima, "o promedio leva outro clube");
    // O do promedio é o pior promedio entre os demais (fração exata).
    const p = r.promedio;
    const outros = clubesDe(comp.id).filter((id) => id !== vitima);
    const pior = outros.reduce((a, b) => (p[a].pts * p[b].j <= p[b].pts * p[a].j ? a : b));
    assert.ok(p[prom.id].pts * p[pior].j === p[pior].pts * p[prom.id].j, "não é o pior promedio");
    assert.ok(Object.values(p).some((x) => x.temporadas === 3), "promedio sem as temporadas do pacote");
  });

  await check("Chile: campeão sobe e a Liguilla dá a 2ª vaga (3x8, 4x7, 5x6; o 2º pega o pior vencedor)", () => {
    const plano = planos2026.chi_liga_ascenso;
    const l1 = plano.confrontos.filter((c) => c.etapa === "liguilla-1");
    const ordem = plano.resultado.anual;
    const pos = (id) => ordem.indexOf(id) + 1;
    assert.deepStrictEqual(l1.map((c) => [pos(c.a), pos(c.b)]), [[3, 8], [4, 7], [5, 6]]);
    const semis = plano.confrontos.filter((c) => c.etapa === "liguilla-semis");
    const piorVencedor = l1.map((c) => c.vencedor).sort((a, b) => pos(b) - pos(a))[0];
    assert.ok(semis.some((c) => [c.a, c.b].includes(piorVencedor) && [pos(c.a), pos(c.b)].includes(plano.resultado.campeoes.campeonato === ordem[0] ? 2 : 1)), "o 2º não pegou o pior vencedor");
    const fin = plano.confrontos.find((c) => c.etapa === "liguilla-final");
    assert.deepStrictEqual(plano.resultado.sobem.map((x) => x.motivo), ["campeao", "liguilla"]);
    assert.strictEqual(plano.resultado.sobem[1].id, fin.vencedor);
  });

  await check("Colômbia (B): os 4 cenários de acesso", () => {
    const novo = () => ({ liga: "teste", chave: "col", jogos: [], confrontos: [], marcos: {} });
    const decide = (plano, nome, quem) => { const c = plano.confrontos.find((x) => x.etapa === nome); c.vencedor = quem(c); c.perdedor = c.vencedor === c.a ? c.b : c.a; };
    const recl = ["r1", "r2", "r3", "r4", "r5"];
    // 1) mesmo campeão: ele sobe; r2 x r3 (os 2 melhores elegíveis restantes) no repechaje.
    let p = novo();
    assert.strictEqual(F.acessoColombia(p, "r1", "r1", recl, "2026-11-01"), null);
    let c = p.confrontos[0];
    assert.deepStrictEqual([c.etapa, c.a, c.b], ["acesso-repechaje", "r2", "r3"]);
    decide(p, "acesso-repechaje", (x) => x.b);
    let r = F.acessoColombia(p, "r1", "r1", recl, "2026-11-01");
    assert.deepStrictEqual([r.cenario, r.sobem.map((x) => x.id)], ["mesmo-campeao", ["r1", "r3"]]);
    // 2) campeões distintos, os dois no top 2: sobem direto.
    r = F.acessoColombia(novo(), "r2", "r1", recl, "2026-11-01");
    assert.deepStrictEqual([r.cenario, r.sobem.map((x) => x.id)], ["campeoes-no-top2", ["r2", "r1"]]);
    // 3) só um no top 2: ele sobe; o outro x melhor disponível (r2).
    p = novo();
    assert.strictEqual(F.acessoColombia(p, "r1", "r5", recl, "2026-11-01"), null);
    c = p.confrontos[0];
    assert.deepStrictEqual([c.a, c.b], ["r2", "r5"]);
    decide(p, "acesso-repechaje", (x) => x.b);
    r = F.acessoColombia(p, "r1", "r5", recl, "2026-11-01");
    assert.deepStrictEqual([r.cenario, r.sobem.map((x) => x.id)], ["um-campeao-no-top2", ["r1", "r5"]]);
    // 4) nenhum no top 2: Gran Final; o perdedor x r1 no repechaje.
    p = novo();
    assert.strictEqual(F.acessoColombia(p, "r4", "r5", recl, "2026-11-01"), null);
    assert.deepStrictEqual([p.confrontos[0].etapa, p.confrontos[0].a, p.confrontos[0].b], ["acesso-gran-final", "r4", "r5"]);
    decide(p, "acesso-gran-final", (x) => x.b);
    assert.strictEqual(F.acessoColombia(p, "r4", "r5", recl, "2026-11-01"), null);
    c = p.confrontos.find((x) => x.etapa === "acesso-repechaje");
    assert.deepStrictEqual([c.a, c.b], ["r1", "r4"]);
    decide(p, "acesso-repechaje", (x) => x.a);
    r = F.acessoColombia(p, "r4", "r5", recl, "2026-11-01");
    assert.deepStrictEqual([r.cenario, r.sobem.map((x) => x.id)], ["gran-final", ["r5", "r1"]]);
    // A Gran Final e o repechaje são por pontos, saldo e pênaltis, ida e volta.
    assert.deepStrictEqual([c.pernas, c.resolucao], [2, ["pontos", "agregado", "penaltis"]]);
  });

  await check("Equador: hexagonais com os pontos da 1ª fase carregados", () => {
    for (const id of ["ecu_ligapro_a", "ecu_ligapro_b"]) {
      const plano = planos2026[id];
      const inicial = id === "ecu_ligapro_a" ? "Fase Regular" : "Fase Inicial";
      // Pontos da 1ª fase (todos os jogos do clube) + da 2ª (só dentro do grupo).
      const pts = (comInicial, ids) => {
        const t = Object.fromEntries(ids.map((x) => [x, 0]));
        for (const j of plano.jogos) {
          const conta = (j.fase === inicial && comInicial) || (j.fase === "segunda-fase" && ids.includes(j.casa) && ids.includes(j.fora));
          if (!conta) continue;
          for (const [c, a, b] of [[j.casa, j.gh, j.ga], [j.fora, j.ga, j.gh]]) if (c in t) t[c] += a > b ? 3 : a === b ? 1 : 0;
        }
        return t;
      };
      for (const [g, ordem] of Object.entries(plano.resultado.grupos)) {
        const total = pts(true, ordem);
        const soSegunda = pts(false, ordem);
        for (let i = 1; i < ordem.length; i++) assert.ok(total[ordem[i - 1]] >= total[ordem[i]], `${id}/${g}: ordem não segue os pontos somados`);
        assert.ok(ordem.some((x) => total[x] > soSegunda[x]), `${id}/${g}: sem arrastre`);
      }
    }
  });

  await check("Uruguai: promedio de 2 temporadas e caminho do título", () => {
    const plano = planos2026.uru_primera;
    const r = plano.resultado;
    const comHist = Object.keys(mundo.promedioInicial.uru_primera);
    for (const id of clubesDe("uru_primera")) {
      assert.strictEqual(r.promedio[id].temporadas, comHist.includes(String(id)) ? 2 : 1, `temporadas do promedio de ${id}`);
    }
    const ids = Object.keys(r.promedio);
    const piores = ids.sort((a, b) => r.promedio[a].pts * r.promedio[b].j - r.promedio[b].pts * r.promedio[a].j).slice(0, 3);
    assert.deepStrictEqual(r.descem.map((x) => String(x.id)).sort(), piores.sort());
    const c = r.campeoes;
    if (c.Apertura === c.Clausura) assert.strictEqual(c.uruguaio, c.Apertura);
    else {
      const semi = plano.confrontos.find((x) => x.etapa === "semifinal");
      assert.deepStrictEqual([semi.a, semi.b].sort(), [c.Apertura, c.Clausura].sort());
      const fin = plano.confrontos.find((x) => x.etapa === "final");
      if (semi.vencedor === c.anual) assert.ok(!fin && c.uruguaio === c.anual);
      else assert.ok(fin && fin.a === c.anual && fin.b === semi.vencedor && c.uruguaio === fin.vencedor);
    }
    // Intermedio: grupos pela classificação do Apertura (ímpares e pares).
    const inter = plano.jogos.filter((j) => j.fase === "Intermedio");
    assert.strictEqual(inter.length, 56);
  });

  await check("plano salvo e relido no meio termina igual (Argentina e Colômbia)", () => {
    for (const id of ["arg_liga_profesional", "col_primera_b"]) {
      const comp = mundo.competicoes[id];
      const direto = F.jogarTudo(montar(comp, 2026, Rel.agendaDoPacote(mundo.partidas[id])), sim(`rel:${id}`));
      const s = sim(`rel:${id}`);
      let plano = montar(comp, 2026, Rel.agendaDoPacote(mundo.partidas[id]));
      for (let k = 0; k < 400 && !F.concluida(plano); k++) {
        const [j] = F.jogosPendentes(plano);
        F.registrarJogo(plano, j.id, s.jogar(j), s);
        if (k % 37 === 0) plano = JSON.parse(JSON.stringify(plano));
      }
      assert.deepStrictEqual(F.jogarTudo(plano, s), direto);
    }
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
