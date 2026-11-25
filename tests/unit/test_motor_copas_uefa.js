// MUNDO-001, M10b (25/11/2026): as copas da UEFA no save (public/js/motor/copasuefa.js).
// Confere, sem rede e sem navegador:
//   1) vagas: a tabela de jogo do índice fecha as fases (29 diretos na fase de liga
//      da Champions com titulares e vagas extras, 8 no playoff, 12 na 3ª
//      pré-eliminatória; 21/10 na Europa League; 18/20 na Conference); o titular já
//      classificado passa a vaga; a vaga extra (EPS) entra depois das de liga da
//      Champions e empurra as outras;
//   2) save no Arsenal, uma temporada pelo relógio: a edição 2026/27 é montada
//      antes da 1ª fase (força na 1ª edição), jogada até as 3 finais; histórico,
//      titulares (campeões da Champions e da Europa League), coeficientes e as 2
//      vagas extras das 5 ligas; o Arsenal na Champions com prêmios no caixa e no
//      ledger (EUR × câmbio × escala), sem crédito em dobro; save compacto;
//   3) a edição de 2027/28 sai das classificações de 2026/27 do mundo leve
//      (campeões das ligas na fase de liga da Champions; titulares nela);
//   4) elencos fictícios das outras associações na escala dos reais (média de
//      overall de um clube fictício perto da de um real de nível igual);
//   5) o jogo do técnico na Champions ao vivo pela ponte da v2.
// Uso: node tests/unit/test_motor_copas_uefa.js
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
  const CU = await imp("copasuefa.js");
  const estado = await imp("estado.js");
  const v2 = await imp("v2.js");
  const semana = await imp("semana.js");
  const CMu = await imp("carreiramundo.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const lerSnap = (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8"));
  semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], indiceDoMundo: null, elencosDoMundo: async (liga) => lerSnap(liga), armazem: { pedir: async () => ({ ok: true }) } });
  const elencosDaLiga = async (liga) => lerSnap(liga).playersByTeamId;
  const u = indice.copas.uefa;
  const contar = (P) => Object.fromEntries(Object.entries(P).flatMap(([c, fs2]) => Object.entries(fs2).map(([f, ids]) => [`${c}:${f}`, ids.length])));

  await check("vagas: a tabela fecha as fases; titular passa a vaga; a vaga extra empurra as outras", () => {
    const ordens = Object.fromEntries(Object.keys(u.associacoes).map((a) => [a, Array.from({ length: 12 }, (_, i) => `${a}${i + 1}`)]));
    const r = CU.vagasUefa({ associacoes: u.associacoes, ordens, titulares: ["ENG1", "ITA9"], eps: ["ENG", "FRA"] });
    assert.deepStrictEqual(contar(r.participantes), { "UCL:liga": 29, "UCL:PO": 8, "UCL:Q3": 12, "UEL:liga": 21, "UEL:PO": 10, "UECL:liga": 18, "UECL:PO": 20 });
    const de = (a) => [...r.participantes.UCL.liga, ...r.participantes.UCL.Q3, ...r.participantes.UEL.liga, ...r.participantes.UECL.PO].filter((x) => x.startsWith(a));
    // Inglaterra: titular ENG1 + ENG2–ENG6 (4 de liga + a vaga extra), ENG7–8 na Europa League, ENG9 na Conference.
    assert.deepStrictEqual(r.participantes.UCL.liga.filter((x) => /^ENG/.test(x)), ["ENG1", "ENG2", "ENG3", "ENG4", "ENG5", "ENG6"]);
    assert.deepStrictEqual(r.participantes.UEL.liga.filter((x) => /^ENG/.test(x)), ["ENG7", "ENG8"]);
    assert.deepStrictEqual(r.participantes.UECL.PO.filter((x) => /^ENG/.test(x)), ["ENG9"]);
    // França com a vaga extra: 4 na fase de liga, o 5º na 3ª pré-eliminatória.
    assert.deepStrictEqual(r.participantes.UCL.liga.filter((x) => /^FRA/.test(x)), ["FRA1", "FRA2", "FRA3", "FRA4"]);
    assert.deepStrictEqual(r.participantes.UCL.Q3.filter((x) => /^FRA/.test(x)), ["FRA5"]);
    void de;
    assert.throws(() => CU.vagasUefa({ associacoes: u.associacoes, ordens: { ...ordens, KAZ: [] } }), /KAZ sem clubes/);
  });

  // Uma temporada do Arsenal pelo relógio (o mundo e as copas, sem as partidas da liga).
  const andar = (C, de, ate) => { const ev = []; for (let i = de; i < ate; i++) { C.calendar.idx = i; ev.push(...(estado.ganchosMundo.semanaDoMundo(C) || [])); } return ev; };
  const ars = indice.clubes.find((c) => c.liga === "premier_league" && /Arsenal/.test(c.nome));
  let C;
  await check("Arsenal: edição 2026/27 inteira (montada antes da 1ª fase), histórico, titulares, coeficientes, vagas extras, prêmios", async () => {
    CMu.definirIndiceDoMundo(indice);
    await CMu.criarCarreiraNoMundo({ indice, liga: "premier_league", clubId: ars.id, elencosDaLiga });
    C = estado.carreiraAtual();
    C.mundoLeve.chave = "teste-uefa";
    const cash0 = C.finances.cash;
    let maxKB = 0;
    const ev = [];
    const total = C.calendar.weeks.length - 1;
    for (let i = 0; i < total; i++) {
      ev.push(...andar(C, i, i + 1));
      const cc = C.copas && C.copas.uefa;
      if (cc && cc.edicao) { assert.strictEqual(cc.edicao.regras, undefined); maxKB = Math.max(maxKB, JSON.stringify(C.copas.uefa).length / 1024); }
    }
    const cu = C.copas.uefa;
    assert.ok(ev.some((e) => e.confed === "UEFA" && e.tipo === "edicao" && e.ano === 2026), "edição 2026/27 não montada");
    const h = cu.historico.find((x) => x.ano === 2026);
    assert.ok(h && h.UCL.campeao && h.UEL.campeao && h.UECL.campeao, "edição 2026/27 não terminou");
    assert.deepStrictEqual(cu.titulares, [h.UCL.campeao, h.UEL.campeao]);
    assert.strictEqual(cu.eps.length, 2);
    assert.ok(cu.eps.every((a) => u.associacoes[a].pais), "vaga extra fora das 5 ligas");
    assert.ok(Object.keys(cu.coef.clubes).length > 100 && Object.keys(cu.coef.assoc).length > 20);
    const meus = ev.filter((e) => e.confed === "UEFA" && e.tipo === "jogo");
    assert.ok(meus.length >= 8 && meus.every((e) => e.jogo.copa === "UCL"), `Arsenal com ${meus.length} jogos na Champions`);
    const pr = C.financeLedger.filter((l) => l.type === "premiacao" && /Champions League/.test(l.label));
    assert.ok(pr.some((l) => /participação/.test(l.label) && l.amount === CU.emReaisEUR(18600000)), "participação na fase de liga");
    assert.ok(C.finances.cash > cash0);
    const antes = C.financeLedger.length;
    andar(C, total - 1, total);
    assert.strictEqual(C.financeLedger.length, antes, "prêmio pago de novo");
    assert.ok(C.newsFeed.some((x) => x.type === "continental" && /campeão da Champions League 2026\/27/.test(x.texto)));
    console.log(`   ${meus.length} jogos do Arsenal; campeões ${h.UCL.campeao}/${h.UEL.campeao}/${h.UECL.campeao}; vagas extras ${cu.eps.join(",")}; copas no save até ${maxKB.toFixed(0)} KB`);
    assert.ok(maxKB < 150, `copas da UEFA no save com ${maxKB.toFixed(0)} KB`);
  });

  await check("2027/28: campeões das 5 ligas na fase de liga da Champions e os titulares nela", () => {
    const plano = CU.edicaoUefaAtual(C, indice);
    assert.ok(plano && plano.ano === 2027, "edição 2027/28 não montada no fim do calendário");
    for (const [assoc, a] of Object.entries(u.associacoes)) {
      // A Inglaterra é o país do técnico: a classificação dela é gravada na
      // virada da temporada (proximaTemporada), que esta caminhada não faz.
      if (!a.pais || a.pais === "GB-ENG") continue;
      const cl = C.mundoLeve.paises[a.pais].classificacao;
      assert.ok(cl && cl.ano === 2026, `${assoc} sem a classificação de 2026/27`);
      assert.ok(plano.participantes.UCL.liga.some((x) => String(x) === String(cl.ordem[0])) || C.copas.uefa.titulares.some((x) => String(x) === String(cl.ordem[0])), `campeão de ${assoc} fora da Champions`);
    }
    for (const t of C.copas.uefa.titulares) assert.ok(plano.participantes.UCL.liga.some((x) => String(x) === String(t)), "titular fora da fase de liga");
  });

  await check("elencos fictícios na escala dos reais (outra associação x 5º pacote de nível igual)", async () => {
    const med = (id) => { const sq = C.leagueSquads[String(id)]; return sq.reduce((s, p) => s + p.overall, 0) / sq.length; };
    const por = (nome) => u.clubes.find((c) => c.nome === nome);
    for (const nome of ["Celtic", "Slavia Praha", "Olympiacos"]) assert.ok((await CMu.abrirClubeDoMundo(C, por(nome).id, async () => { throw new Error("rede"); })).ok, nome);
    const real = med(por("Celtic").id), fict = (med(por("Slavia Praha").id) + med(por("Olympiacos").id)) / 2;
    console.log(`   Celtic (real) ${real.toFixed(1)}; Slavia e Olympiacos (fictícios) ${fict.toFixed(1)}`);
    assert.ok(Math.abs(real - fict) < 4, `fictícios fora da escala: ${fict.toFixed(1)} x ${real.toFixed(1)}`);
    assert.ok(C.leagueSquads[String(por("Slavia Praha").id)].every((p) => !p.real));
  });

  await check("o jogo do Arsenal na Champions ao vivo pela ponte da v2", async () => {
    const ponteMod = await imp("ponte.js");
    CMu.definirIndiceDoMundo(indice);
    await CMu.criarCarreiraNoMundo({ indice, liga: "premier_league", clubId: ars.id, elencosDaLiga });
    const C2 = estado.carreiraAtual();
    C2.mundoLeve.chave = "teste-uefa-ao-vivo";
    const P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
    // Anda o relógio até a 1ª rodada da fase de liga.
    for (let i = 0; i < C2.calendar.weeks.length - 1 && !P.jogoContinental(); i++) andar(C2, i, i + 1);
    const pend = P.jogoContinental();
    assert.ok(pend && pend.copa === "UCL" && pend.confed === "UEFA", "sem jogo da Champions pendente");
    let r = await P.iniciarJogoContinental();
    if (r.motivo === "escalacao") { await P.escalarAutomaticamente(true); r = await P.iniciarJogoContinental(); }
    assert.ok(r.ok && r.aoVivo, `não começou (${r.motivo})`);
    const e0 = P.estado();
    assert.strictEqual(e0.contexto, "continental");
    assert.strictEqual(e0.continental.nomeCopa, "Champions League");
    P.pularParaFim();
    const e = await ate(() => { const x = P.estado(); return x.fase === "encerrada" && x.gravada != null ? x : null; }, 30000);
    assert.ok(e && e.gravada);
    const j = CU.edicaoUefaAtual(C2, indice).jogos.find((x) => x.id === pend.id);
    assert.deepStrictEqual([j.gh, j.ga], [e.gh, e.ga]);
    console.log(`   ${pend.nomeCopa} ${pend.nomeFase}${pend.rodada ? ` (rodada ${pend.rodada})` : ""}: ${e.mandante.nome} ${e.gh}x${e.ga} ${e.visitante.nome}`);
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
