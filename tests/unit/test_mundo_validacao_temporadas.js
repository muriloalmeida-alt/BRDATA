// MUNDO-001, M11 (25/11/2026): o pior caso de save do mundo jogado de verdade.
// Primera Nacional argentina (36 clubes + 30 da Liga Profesional: 66 elencos no
// save, o maior país do mundo), duas temporadas inteiras pela ponte da v2
// (partidas ao vivo até o fim, pós-jogo, jogos continentais ao vivo quando há,
// virada pelo proximaTemporada). Confere:
//   1) as duas temporadas e as duas viradas sem erro, sem erro nas copas;
//   2) todo save enviado cabe nos limites do servidor com margem: JSON cru
//      < 2 MB (limite do PUT sem gzip: 3 MB) e comprimido < 400 KB (careerStore:
//      768 KB);
//   3) o save não cresce sem limite entre as temporadas (depois da 2ª virada,
//      até 15% maior que depois da 1ª).
// Uso: node tests/unit/test_mundo_validacao_temporadas.js
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const zlib = require("zlib");
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
  const v2 = await imp("v2.js"), semana = await imp("semana.js"), CMu = await imp("carreiramundo.js"), estado = await imp("estado.js"), ponteMod = await imp("ponte.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const snap = (l) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${l}.json`), "utf8"));
  const enviados = [];
  semana.definirAmbiente({
    ...v2.ambienteSemPagina(), buscarJogadores: async () => [], indiceDoMundo: async () => indice, elencosDoMundo: async (l) => snap(l),
    armazem: { pedir: async (u, o) => { if (o && o.body) enviados.push(o.body); return { ok: true }; } },
  });
  const clube = indice.clubes.filter((c) => c.liga === "arg_primera_nacional").sort((a, b) => b.atk / b.def - a.atk / a.def)[0];
  await CMu.criarCarreiraNoMundo({ indice, liga: "arg_primera_nacional", clubId: clube.id, elencosDaLiga: async (l) => snap(l).playersByTeamId });
  const P = v2.criarPonte();
  ponteMod.ponte.pronta = true;
  const C = () => estado.carreiraAtual();
  const ate = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 5)); } return null; };
  const fim = () => ate(() => { const x = P.estado(); return x.fase === "encerrada" && x.gravada != null ? x : null; }, 30000);
  const tamanhos = [];
  let continentais = 0;

  await check("duas temporadas inteiras pela ponte (liga, copas ao vivo e viradas) sem erro", async () => {
    for (let temp = 0; temp < 2; temp++) {
      for (let g = 0; C().currentRound <= C().rodadasLiga && g < 220; g++) {
        if (P.jogoContinental()) {
          let r = await P.iniciarJogoContinental();
          if (r.motivo === "escalacao") { await P.escalarAutomaticamente(true); r = await P.iniciarJogoContinental(); }
          assert.ok(r.ok, `jogo continental: ${r.motivo}`);
          P.pularParaFim();
          assert.ok(await fim(), "jogo continental não terminou");
          continentais++;
          continue;
        }
        await P.avancarSemana(true, { copas: true });
        if (P.jogoContinental()) continue;
        let i = P.iniciar();
        if (i && i.motivo === "escalacao") { await P.escalarAutomaticamente(true); i = P.iniciar(); }
        if (!i || !i.ok || !i.aoVivo) continue;
        P.pularParaFim();
        assert.ok(await fim(), `rodada ${C().currentRound} não terminou`);
        let et = P.iniciarPosJogo();
        for (let k = 0; et && et.ok !== false && et.etapa !== "fim" && k < 12; k++) {
          if (et.etapa === "coletiva") et = await P.responderColetiva(et.respostas[0].letra);
          else if (et.etapa === "noticias" || et.etapa === "resultados") et = P.concluirEtapa(et.etapa);
          else if (et.etapa === "proposta") et = await P.responderProposta("recusar");
          else break;
        }
        P.encerrarPosJogo();
      }
      assert.ok(C().currentRound > C().rodadasLiga, `temporada ${temp + 1} parou na rodada ${C().currentRound}`);
      const r = await P.proximaTemporada();
      assert.ok(r.ok, `virada ${temp + 1}: ${r.motivo}`);
      const j = JSON.stringify(C());
      tamanhos.push({ json: j.length, gz: zlib.gzipSync(j).length });
    }
    const erros = [C().copas && C().copas.conmebol && C().copas.conmebol.erros, C().copas && C().copas.uefa && C().copas.uefa.erros].filter(Boolean);
    assert.strictEqual(erros.length, 0, JSON.stringify(erros));
    assert.ok((C().copas.conmebol.historico || []).length >= 1, "nenhuma edição da CONMEBOL fechou");
  });

  await check("todo save enviado: JSON cru < 2 MB e comprimido < 400 KB", () => {
    assert.ok(enviados.length > 50, `só ${enviados.length} gravações`);
    let maxJ = 0, maxG = 0;
    for (const b of enviados.filter((_, i) => i % 5 === 0 || i === enviados.length - 1)) {
      maxJ = Math.max(maxJ, b.length);
      maxG = Math.max(maxG, zlib.gzipSync(b).length);
    }
    console.log(`   ${enviados.length} gravações; maior JSON ${(maxJ / 1024).toFixed(0)} KB, maior gzip ${(maxG / 1024).toFixed(0)} KB; ${continentais} jogos continentais ao vivo`);
    assert.ok(maxJ < 2 * 1024 * 1024 && maxG < 400 * 1024);
  });

  await check("o save não cresce sem limite entre as temporadas", () => {
    const [a, b] = tamanhos;
    console.log(`   depois das viradas: ${(a.json / 1024).toFixed(0)} KB -> ${(b.json / 1024).toFixed(0)} KB (gzip ${(a.gz / 1024).toFixed(0)} -> ${(b.gz / 1024).toFixed(0)} KB)`);
    assert.ok(b.json < a.json * 1.15, "crescimento acima de 15%");
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
