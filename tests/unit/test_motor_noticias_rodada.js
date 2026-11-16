// NOTICIAS-RODADA (16/11): toda rodada gera notícias — a do seu jogo
// (primeiro) e o resumo da rodada (por último), além das manchetes de sempre
// (public/js/motor/registro.js, generateRoundNews).
// Uso: node tests/unit/test_motor_noticias_rodada.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}

(async () => {
  const imp = (m) => import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", `${m}.js`)).href);
  const estado = await imp("estado"), registro = await imp("registro");
  const times = ["aaa", "bbb", "ccc", "ddd"].map((id, i) => ({ id, name: `Time ${id.toUpperCase()}`, short: id }));
  const linha = (pts) => ({ j: 1, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts });
  // As linhas da tabela levam o id do time (como no jogo).
  const tabela = (o) => Object.fromEntries(Object.entries(o).map(([id, r]) => [id, { ...r, id }]));
  const montar = (standings) => {
    estado.definirLigaAtual?.(times);
    estado.definirTodosTimes?.(times);
    estado.definirCarreira({ clubId: "aaa", clubName: "Time AAA", seasonYear: 2026, currentRound: 2, standings: tabela(standings), squad: [], leagueSquads: {}, teamWinlessStreak: {} });
  };
  const antes = tabela({ aaa: linha(3), bbb: linha(3), ccc: linha(0), ddd: linha(0) });

  await check("Rodada sem fato marcante: notícia do seu jogo (vitória, placar, em casa) e o resumo; sem o antigo 'sem surpresas'", () => {
    montar({ aaa: linha(6), bbb: linha(3), ccc: linha(1), ddd: linha(1) });
    const out = registro.generateRoundNews(2, [{ home: "aaa", away: "bbb", gh: 2, ga: 1 }, { home: "ccc", away: "ddd", gh: 0, ga: 0 }], antes);
    assert.strictEqual(out[0].type, "seu_jogo");
    assert.strictEqual(out[0].mine, true);
    assert.match(out[0].texto, /Time AAA vence Time BBB por 2 x 1 em casa/);
    const ult = out[out.length - 1];
    assert.strictEqual(ult.type, "resumo");
    assert.match(ult.texto, /^Rodada 2: 3 gols em 2 jogos; maior vitória: Time AAA 2 x 1 Time BBB; Time AAA lidera com 6 pontos\.$/);
    assert.ok(!out.some((x) => x.type === "generico"));
  });
  await check("Derrota fora e empate: o texto do seu jogo segue o placar do seu ponto de vista", () => {
    montar({ aaa: linha(3), bbb: linha(6), ccc: linha(0), ddd: linha(0) });
    const d = registro.generateRoundNews(2, [{ home: "bbb", away: "aaa", gh: 3, ga: 0 }], antes);
    assert.match(d[0].texto, /Time AAA perde para Time BBB por 0 x 3 fora/);
    const e = registro.generateRoundNews(2, [{ home: "ccc", away: "aaa", gh: 1, ga: 1 }], antes);
    assert.match(e[0].texto, /Time AAA empata com Time CCC em 1 x 1 fora/);
  });
  await check("Rodada sem o seu jogo: só o resumo (e as manchetes de sempre); 1 gol no singular", () => {
    montar({ aaa: linha(3), bbb: linha(3), ccc: linha(3), ddd: linha(0) });
    const out = registro.generateRoundNews(2, [{ home: "ccc", away: "ddd", gh: 1, ga: 0 }], antes);
    assert.ok(!out.some((x) => x.type === "seu_jogo"));
    assert.match(out[out.length - 1].texto, /^Rodada 2: 1 gol em 1 jogo;/);
  });
  await check("Rodada só de empates: o resumo não cita maior vitória", () => {
    montar({ aaa: linha(4), bbb: linha(4), ccc: linha(1), ddd: linha(1) });
    const out = registro.generateRoundNews(2, [{ home: "aaa", away: "bbb", gh: 1, ga: 1 }, { home: "ccc", away: "ddd", gh: 0, ga: 0 }], antes);
    assert.ok(!/maior vitória/.test(out[out.length - 1].texto));
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
