// MUNDO-001, M11 (25/11/2026): validação final do mundo — peça comum aos
// testes por região (test_mundo_validacao_europa.js e _america.js). Para cada
// liga: carreira nova no clube mais forte, a temporada inteira pelo relógio
// (mundo leve, copas da CONMEBOL e da UEFA), sem partidas da liga. Confere:
// sem erro nas copas, tempo médio da semana, tamanho do save (JSON e gzip)
// nos limites do servidor (3 MB cru, 768 KB comprimido) com margem, e o
// calendário com as rodadas da liga.
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const zlib = require("zlib");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");

const LIMITES = { semanaMs: 60, jsonKB: 2000, gzKB: 400 };

async function validarRegiao(regiao) {
  globalThis.window = globalThis;
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
  const imp = (m) => import(pathToFileURL(path.join(ROOT, "public/js/motor", m)).href);
  const v2 = await imp("v2.js"), semana = await imp("semana.js"), CMu = await imp("carreiramundo.js"), estado = await imp("estado.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const snap = (l) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${l}.json`), "utf8"));
  semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [], elencosDoMundo: async (l) => snap(l), armazem: { pedir: async () => ({ ok: true }) } });
  let n = 0, failed = 0;
  const linhas = [];
  for (const p of indice.paises.filter((x) => x.regiao === regiao)) {
    for (const liga of p.ligas) {
      n++;
      try {
        const clube = indice.clubes.filter((c) => c.liga === liga).sort((a, b) => b.atk / b.def - a.atk / a.def)[0];
        await CMu.criarCarreiraNoMundo({ indice, liga, clubId: clube.id, elencosDaLiga: async (l) => snap(l).playersByTeamId });
        const C = estado.carreiraAtual();
        assert.deepStrictEqual(C.calendar.weeks.filter((w) => w.r).map((w) => w.r).filter((r, i, a) => a.indexOf(r) === i).length, C.rodadasLiga, "rodadas no calendário");
        let ms = 0, semanas = 0, maxJ = 0, maxG = 0;
        for (let i = 0; i < C.calendar.weeks.length - 1; i++) {
          C.calendar.idx = i;
          const t = Date.now();
          estado.ganchosMundo.semanaDoMundo(C);
          ms += Date.now() - t; semanas++;
          if (i % 8 === 0 || i === C.calendar.weeks.length - 2) {
            const j = JSON.stringify(C);
            if (j.length > maxJ) { maxJ = j.length; maxG = zlib.gzipSync(j).length; }
          }
        }
        const erros = [C.copas && C.copas.conmebol && C.copas.conmebol.erros, C.copas && C.copas.uefa && C.copas.uefa.erros].filter(Boolean);
        assert.strictEqual(erros.length, 0, `erro nas copas: ${JSON.stringify(erros)}`);
        assert.ok(C.copas && C.copas.conmebol && C.copas.uefa, "copas das duas confederações no save");
        const media = ms / semanas;
        const r = { liga, clube: clube.nome, msSemana: Math.round(media * 10) / 10, jsonKB: Math.round(maxJ / 1024), gzKB: Math.round(maxG / 1024) };
        linhas.push(r);
        assert.ok(media < LIMITES.semanaMs, `semana do mundo em ${media.toFixed(1)} ms`);
        assert.ok(r.jsonKB < LIMITES.jsonKB && r.gzKB < LIMITES.gzKB, `save ${r.jsonKB} KB / ${r.gzKB} KB gzip`);
        console.log(`${n}) ${liga}: true   ${JSON.stringify(r)}`);
      } catch (e) {
        failed++;
        console.log(`${n}) ${liga}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`);
      }
    }
  }
  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
}
module.exports = { validarRegiao, LIMITES };
