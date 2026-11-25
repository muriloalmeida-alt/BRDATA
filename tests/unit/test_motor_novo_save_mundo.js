// MUNDO-001, M10c (25/11/2026): o novo save no mundo pela ponte da v2 (MUN-14).
// Confere, sem rede e sem navegador:
//   1) sem o mundo (ambiente sem índice): competicoesDoMundo = null e o
//      seletor segue só com o Brasil (competicoes, como sempre);
//   2) com o mundo: os 10 países com as 2 divisões (nome, divisão, clubes);
//      escolher uma liga do mundo devolve os clubes do índice; criar a carreira
//      cria o save no país (divisões, 32 rodadas na Argentina, nomes das
//      ligas, moeda) e grava;
//      (M10c-3) as ligas do mundo leve pela ponte (tabelas) e o mercado do
//      mundo por país e liga, com um clube trazido ao save e gravado;
//   3) depois de escolher uma liga do mundo, escolher uma do Brasil volta ao
//      Brasil (a escolha do mundo não fica presa) e a carreira nasce no Brasil.
// Uso: node tests/unit/test_motor_novo_save_mundo.js
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
  const estado = await imp("estado.js");
  const v2 = await imp("v2.js");
  const semana = await imp("semana.js");
  const CMu = await imp("carreiramundo.js");
  const ponteMod = await imp("ponte.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const lerSnap = (liga) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${liga}.json`), "utf8"));
  const gravados = [];
  const fetchAntes = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("sem rede"); };
  const ambiente = (comMundo) => {
    estado.definirCarreira(null);
    CMu.definirIndiceDoMundo(null);
    semana.definirAmbiente({
      ...v2.ambienteSemPagina(), buscarJogadores: async () => [],
      indiceDoMundo: comMundo ? async () => indice : null, elencosDoMundo: comMundo ? async (l) => lerSnap(l) : null,
      armazem: { pedir: async (u, o) => { if (o && o.body) gravados.push(u); return o && o.body ? { ok: true } : {}; } },
    });
    const P = v2.criarPonte();
    ponteMod.ponte.pronta = true;
    return P;
  };

  try {
    await check("sem o mundo: competicoesDoMundo = null; o Brasil como sempre", async () => {
      const P = ambiente(false);
      assert.strictEqual(await P.competicoesDoMundo(), null);
      assert.deepStrictEqual(P.competicoes().map((c) => c.id), ["brasileirao", "serie_b", "serie_c"]);
      assert.strictEqual((await P.escolherCompeticao("arg_liga_profesional")).motivo, "competicao-invalida");
    });

    await check("com o mundo: 10 países, 2 divisões cada; liga do mundo -> clubes do índice -> carreira no país", async () => {
      const P = ambiente(true);
      const m = await P.competicoesDoMundo();
      assert.strictEqual(m.paises.length, 10);
      assert.ok(m.paises.every((p) => p.ligas.length === 2 && p.ligas[0].divisao === 1 && p.ligas[1].divisao === 2));
      const ar = m.paises.find((p) => p.codigo === "AR");
      assert.deepStrictEqual(ar.ligas.map((l) => [l.id, l.clubes]), [["arg_liga_profesional", 30], ["arg_primera_nacional", 36]]);
      const r = await P.escolherCompeticao("arg_liga_profesional");
      assert.ok(r.ok && r.clubes.length === 30, "clubes da Liga Profesional");
      assert.ok(r.clubes.every((c) => c.id && c.nome));
      const boca = r.clubes.find((c) => /Boca/.test(c.nome)) || r.clubes[0];
      gravados.length = 0;
      const c = await P.criarCarreira(boca.id);
      assert.ok(c.ok, `criar: ${c.motivo}`);
      const C = estado.carreiraAtual();
      assert.strictEqual(C.clubId, boca.id);
      assert.deepStrictEqual(C.divisoes, ["arg_liga_profesional", "arg_primera_nacional"]);
      assert.strictEqual(C.rodadasLiga, 32);
      assert.strictEqual(C.nomesDasLigas.arg_liga_profesional, ar.ligas[0].nome);
      assert.strictEqual(C.moeda, "USD");
      assert.ok(C.mundoLeve && C.mundoLeve.ativos.includes("AR"));
      assert.ok(gravados.length >= 1, "a carreira não foi gravada");
      assert.strictEqual((await P.criarCarreira(boca.id)).motivo, "ja-tem-carreira");
      // M10c-3: as ligas do mundo leve (sem a Argentina, que é do técnico).
      const lv = P.ligasDoMundoNoSave();
      assert.ok(lv.paises.length === 10 && !lv.paises.some((p) => p.codigo === "AR"), "países das ligas do mundo");
      const es = lv.paises.find((p) => p.codigo === "ES");
      assert.ok(es.ligas[0].tabelas[0].linhas.length === 20 && es.ligas[0].tabelas[0].linhas.every((l) => l.nome), "tabela de LaLiga");
      // M10c-3: mercado do mundo por país e liga; abrir o Real Madrid.
      const mk = P.clubesDoMundo({ pais: "ES", liga: "la_liga" });
      assert.ok(mk.paises.some((p) => p.codigo === "ES") && !mk.paises.some((p) => p.codigo === "AR"));
      assert.ok(mk.clubes.length === 20 && mk.clubes.every((c) => c.pais === "ES" && c.liga === "la_liga"));
      const rm = mk.clubes.find((c) => /Real Madrid/.test(c.nome));
      gravados.length = 0;
      const ab = await P.abrirClubeDoMundo(rm.id);
      assert.ok(ab.ok && ab.jogadores >= 16, `abrir: ${JSON.stringify(ab)}`); // 16: limite de clube de fora (M8)
      assert.ok(estado.carreiraAtual().leagueSquads[rm.id].length >= 16);
      assert.ok(gravados.length >= 1, "o clube aberto não foi gravado");
      assert.ok((await P.abrirClubeDoMundo(rm.id)).ja, "abrir de novo não traz de novo");
      assert.ok(P.clubesDoMundo({ texto: "real madrid" }).clubes.find((c) => c.id === rm.id).noSave);
    });

    await check("escolher o mundo e depois o Brasil: a carreira nasce no Brasil", async () => {
      const P = ambiente(true);
      assert.ok((await P.escolherCompeticao("premier_league")).ok);
      const b = await P.escolherCompeticao("brasileirao");
      assert.ok(b.ok && b.clubes.length === 20);
      const c = await P.criarCarreira(b.clubes[0].id);
      assert.ok(c && c.ok !== false, `criar: ${c && c.motivo}`);
      const C = estado.carreiraAtual();
      assert.strictEqual(C.mundo, undefined, "save do Brasil virou save do mundo");
      assert.strictEqual(C.competitionId, "brasileirao");
      assert.ok(C.mundoLeve, "o mundo em paralelo (M6b-5a)");
    });
  } finally {
    globalThis.fetch = fetchAntes;
  }

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
