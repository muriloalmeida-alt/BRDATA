// EMPRESTIMO-DISPONIVEL (15/11): quem o clube da CPU põe para empréstimo
// (precisaDeMinutos) e como isso muda a avaliação do pedido de empréstimo
// (public/js/motor/mercado.js).
// Uso: node tests/unit/test_motor_emprestimo_disponivel.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
const J = (id, group, overall, extra = {}) => ({ id, group, overall, age: 25, wage: 10000, value: 1e6, ...extra });
// Meio-campo: 9 jogadores de 80 a 72 (vagas: titulares e rotação do motor).
const elencoMeio = () => Array.from({ length: 9 }, (_, i) => J(`m${i}`, "M", 80 - i));

(async () => {
  const M = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "mercado.js")).href);
  const P = M.MER_PARAMETROS;
  const vagas = (P.vagasTitular.M || 1) + (P.vagasRotacao.M || 1);

  await check("Reserva no clube, com a posição coberta sem ele: disponível", () => {
    const sq = elencoMeio();
    const ultimo = sq[sq.length - 1];
    assert.strictEqual(M.papelNoElenco(ultimo, sq), "reserva");
    assert.strictEqual(M.precisaDeMinutos(ultimo, sq), true);
  });
  await check("Titular ou rotação no clube: não disponível", () => {
    const sq = elencoMeio();
    assert.strictEqual(M.precisaDeMinutos(sq[0], sq), false);
    assert.strictEqual(M.precisaDeMinutos(sq[vagas - 1], sq), false);
  });
  await check("Reserva, mas a posição ficaria descoberta sem ele: não disponível", () => {
    // Um a menos que a cobertura mínima de meias além dele: descoberta.
    const so = [...elencoMeio().slice(0, P.coberturaMinima.M - 1), J("x", "M", 50)];
    assert.strictEqual(M.precisaDeMinutos(so[so.length - 1], so), false);
    // Com o mínimo exato de outros meias (e ele reserva), está coberta.
    const ok = [...elencoMeio(), J("x", "M", 50)];
    assert.strictEqual(M.precisaDeMinutos(ok[ok.length - 1], ok), true);
  });
  await check("Emprestado (onLoanFromClubId) nunca é disponível", () => {
    const sq = elencoMeio();
    const ultimo = { ...sq[sq.length - 1], onLoanFromClubId: "outro" };
    assert.strictEqual(M.precisaDeMinutos(ultimo, sq.slice(0, -1).concat(ultimo)), false);
  });
  await check("Pedido de disponível que vai jogar (titular ou rotação) a 50%: aceita", () => {
    for (const papelNoDestino of ["titular", "rotacao"]) {
      const r = M.avaliacaoEmprestimo(J("x", "M", 60), { duracao: "temporada", pct: 50 }, { papelNaOrigem: "reserva", rosterOrigem: elencoMeio(), papelNoDestino, disponivel: true });
      assert.strictEqual(r.decisao, "aceita", papelNoDestino);
    }
  });
  await check("Pedido de disponível que ficaria reserva no seu time: recusa, com o motivo", () => {
    const r = M.avaliacaoEmprestimo(J("x", "M", 60), { duracao: "temporada", pct: 100 }, { papelNaOrigem: "reserva", rosterOrigem: elencoMeio(), papelNoDestino: "reserva", disponivel: true });
    assert.strictEqual(r.decisao, "recusa");
    assert.match(r.motivo, /precisa de minutos/);
  });
  await check("Sem a marca, a avaliação de antes não muda (mesma resposta com disponivel ausente)", () => {
    const ctx = { papelNaOrigem: "reserva", rosterOrigem: elencoMeio(), papelNoDestino: "reserva" };
    const a = M.avaliacaoEmprestimo(J("x", "M", 60), { duracao: "meia", pct: 50 }, ctx);
    const b = M.avaliacaoEmprestimo(J("x", "M", 60), { duracao: "meia", pct: 50 }, { ...ctx, disponivel: false });
    assert.deepStrictEqual(a, b);
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
