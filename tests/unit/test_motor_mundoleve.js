// MUNDO-001, etapa M6a (24/11/2026): o mundo leve (public/js/motor/mundoleve.js),
// as 20 ligas da Europa e da América do Sul semana a semana com o índice real.
// Confere:
//   1) início na Premier League: a pré-simulação leva a América do Sul até
//      20/07/2026 e nenhum jogo europeu acontece antes;
//   2) 3 anos de mundo (os 10 países e o Brasil, M6b-5b): 3 viradas por país,
//      divisões com o tamanho certo e
//      disjuntas, catálogo conservado, cada temporada jogada inteira;
//   3) Brasil: a cascata da carreira (4 sobem e 4 descem por fronteira, 4 da
//      Série D, força de quem muda de divisão);
//   3b) salvar e reabrir a cada 5 semanas dá o mesmo mundo de jogar direto;
//   4) placares codificados (ida e volta) e gols por jogo de cada liga perto da
//      referência do pacote (o nível de gols da liga);
//   5) desempenho e save: média e pior semana (relatados), save do mundo em
//      JSON e gzip (limites do critério de aceite 7, com folga para a carreira).
// Uso: node tests/unit/test_motor_mundoleve.js
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");

let n = 0, failed = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}

(async () => {
  const ML = await import(pathToFileURL(path.join(ROOT, "public/js/motor/mundoleve.js")).href);
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const totalPais = (P) => Object.values(P.ligas).reduce((s, L) => s + L.clubes.length, 0) + P.catalogo.length;

  let mundo;
  await check("início na Premier League: América do Sul pré-simulada até 20/07/2026, Europa parada", () => {
    mundo = ML.abrirMundo(ML.criarMundoLeve(indice, { ligaEscolhida: "premier_league", chave: "teste" }), indice);
    assert.strictEqual(mundo.estado.inicioJogo, "2026-07-20");
    ML.prepararInicio(mundo);
    assert.strictEqual(mundo.estado.semana, "2026-07-20");
    const salvo = ML.salvarMundo(mundo);
    for (const p of indice.paises) for (const l of p.ligas) {
      const jogados = (salvo.paises[p.codigo].ligas[l].placares.match(/[^.]{2}/g) || []).filter((x) => x !== "..").length;
      if (p.regiao === "europa") assert.strictEqual(jogados, 0, `${l} jogou antes do início`);
      else assert.ok(jogados > 50, `${l} não pré-simulou (${jogados})`);
    }
  });

  const totais = {};
  let tempos = [], maior = { json: 0, gz: 0 };
  await check("3 anos de mundo: 3 viradas por país, divisões certas, catálogo conservado", () => {
    for (const cod of Object.keys(mundo.estado.paises)) totais[cod] = totalPais(mundo.estado.paises[cod]);
    const viradas = {};
    for (let w = 0; w < 156; w++) {
      const t = process.hrtime.bigint();
      const ev = ML.avancarSemana(mundo);
      tempos.push(Number(process.hrtime.bigint() - t) / 1e6);
      for (const e of ev) {
        viradas[e.pais] = (viradas[e.pais] || 0) + 1;
        const P = mundo.estado.paises[e.pais];
        const pais = indice.paises.find((x) => x.codigo === e.pais) || { codigo: "BR", ligas: ["brasileirao", "serie_b", "serie_c"] };
        for (const l of pais.ligas) assert.strictEqual(P.ligas[l].clubes.length, indice.competicoes[l] ? indice.competicoes[l].clubes : 20, `${l} ${e.ano}: tamanho`);
        const todos = [...pais.ligas.flatMap((l) => P.ligas[l].clubes), ...P.catalogo].map(String);
        assert.strictEqual(new Set(todos).size, todos.length, `${e.pais}: clube repetido`);
        assert.strictEqual(totalPais(P), totais[e.pais], `${e.pais}: catálogo não conservado`);
        assert.strictEqual(e.sobem.length, e.descem.length, `${e.pais}: sobe x desce`);
      }
      if (w % 13 === 0) {
        const s = JSON.stringify(ML.salvarMundo(mundo));
        maior.json = Math.max(maior.json, s.length);
        maior.gz = Math.max(maior.gz, zlib.gzipSync(s).length);
      }
    }
    for (const cod of Object.keys(mundo.estado.paises)) assert.strictEqual(viradas[cod], 3, `${cod}: ${viradas[cod]} viradas`);
    assert.ok(mundo.estado.paises.BR, "o Brasil não está no mundo leve");
  });

  await check("Brasil no mundo leve: a cascata de sempre (4 sobem e 4 descem em cada fronteira, 4 da Série D)", () => {
    const BR = mundo.estado.paises.BR;
    assert.strictEqual(BR.viradas.length, 3);
    for (const v of BR.viradas) {
      assert.strictEqual(v.sobem.length, 8, "B->A e C->B");
      assert.strictEqual(v.descem.length, 8, "A->B e B->C");
      assert.strictEqual(v.entraram.length, 4, "D->C");
      assert.strictEqual(v.sairam.length, 4, "C->D");
      assert.ok(v.campeoes.brasileirao != null);
    }
    assert.strictEqual(BR.catalogo.length, indice.brasil.serieD.length, "Série D não conservada");
    assert.ok(Object.keys(BR.forcas).length > 0, "força de quem mudou de divisão");
  });

  await check("salvar e reabrir a cada 5 semanas = jogar direto", () => {
    const criar = () => { const m = ML.abrirMundo(ML.criarMundoLeve(indice, { ligaEscolhida: "arg_liga_profesional", chave: "rel" }), indice); ML.prepararInicio(m); return m; };
    const direto = criar();
    let reaberto = criar();
    for (let w = 0; w < 60; w++) {
      ML.avancarSemana(direto);
      ML.avancarSemana(reaberto);
      if (w % 5 === 4) reaberto = ML.abrirMundo(JSON.parse(JSON.stringify(ML.salvarMundo(reaberto))), indice);
    }
    assert.strictEqual(JSON.stringify(ML.salvarMundo(reaberto)), JSON.stringify(ML.salvarMundo(direto)));
  });

  await check("placares codificados (ida e volta) e gols por jogo perto da referência de cada liga", () => {
    const lista = [{ gh: 0, ga: 0 }, null, { gh: 3, ga: 11 }, { gh: 9, ga: 1 }];
    assert.deepStrictEqual(ML.decodificarPlacares(ML.codificarPlacares(lista), 4), lista);
    const salvo = ML.salvarMundo(mundo);
    for (const p of indice.paises) for (const l of p.ligas) {
      const pares = (salvo.paises[p.codigo].ligas[l].placares.match(/.{2}/g) || []).filter((x) => x !== "..");
      if (pares.length < 100) continue;
      const media = pares.reduce((s, x) => s + parseInt(x[0], 36) + parseInt(x[1], 36), 0) / pares.length;
      const ref = 2 * indice.competicoes[l].mediaGolsPorTime;
      assert.ok(Math.abs(media - ref) / ref < 0.25, `${l}: ${media.toFixed(2)} gols por jogo (referência ${ref.toFixed(2)})`);
    }
  });

  await check("desempenho e save do mundo leve", () => {
    tempos.sort((a, b) => a - b);
    const media = tempos.reduce((s, x) => s + x, 0) / tempos.length;
    const p95 = tempos[Math.floor(tempos.length * 0.95)];
    console.log(`   semana: média ${media.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, pior ${tempos[tempos.length - 1].toFixed(1)} ms; save do mundo: ${(maior.json / 1024).toFixed(1)} KB JSON, ${(maior.gz / 1024).toFixed(1)} KB gzip`);
    // Tempo só relatado: a suíte roda em paralelo e a máquina carregada
    // multiplica o tempo (medido: p95 de 10 ms sozinho e 73 ms na rota rápida).
    // O limite fica largo, só para pegar um salto de ordem de grandeza.
    assert.ok(p95 < 1000, "p95 da semana acima de 1 s");
    assert.ok(maior.json < 200 * 1024, "mundo leve acima de 200 KB de JSON");
    assert.ok(maior.gz < 48 * 1024, "mundo leve acima de 48 KB comprimido");
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
