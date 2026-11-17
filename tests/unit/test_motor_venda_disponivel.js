// VENDA-DISPONIVEL (17/11): a CPU põe à venda pelos sinais do jogador
// (poucos jogos, insatisfação, fim de contrato, excedente, salário alto); à
// venda, o clube aceita a partir de 90% do valor e o atleta aceita o salário
// atual sendo titular ou rotação no seu time (public/js/motor/mercado.js).
// Uso: node tests/unit/test_motor_venda_disponivel.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
// Elenco de meio-campistas: 4 titulares (85..82), 3 rotação (80..78), reservas.
const P = (id, overall, extra = {}) => ({ id, group: "M", overall, age: 26, wage: 100000, value: 5000000, contractUntil: 2029, appsSeason: 10, ...extra });
function elenco(extra = []) {
  return [P("t1", 85), P("t2", 84), P("t3", 83), P("t4", 82), P("r1", 80), P("r2", 79), P("r3", 78), ...extra];
}
const ctx = { rodadas: 10, contaJogos: true, temporada: 2026, salarioJusto: 100000 };

(async () => {
  const M = await import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", "mercado.js")).href);

  await check("Titular, posição descoberta sem ele e emprestado nunca estão à venda", () => {
    const sq = elenco([P("x", 70, { age: 30 })]);
    assert.deepStrictEqual(M.motivosAVenda(sq[0], sq, { ...ctx, salarioJusto: 1 }), []);
    const curto = [P("a", 85), P("b", 84), P("c", 70, { age: 30 })]; // M precisa de 5: sem cobertura
    assert.deepStrictEqual(M.motivosAVenda(curto[2], curto, ctx), []);
    assert.deepStrictEqual(M.motivosAVenda(P("e", 70, { age: 30, onLoanFromClubId: "fla" }), sq, ctx), []);
  });
  await check("Excedente: reserva com 24 anos ou mais; o mais novo sem outro motivo não está à venda (fica no empréstimo)", () => {
    const velho = P("v", 70, { age: 24 }), novo = P("n", 70, { age: 22 });
    assert.deepStrictEqual(M.motivosAVenda(velho, elenco([velho]), ctx), ["excedente"]);
    assert.deepStrictEqual(M.motivosAVenda(novo, elenco([novo]), ctx), []);
  });
  await check("Poucos jogos (menos de 30% depois de 5 rodadas, só onde os jogos são contados); bom o bastante para jogar = insatisfeito", () => {
    const bom = P("b", 80, { age: 22, appsSeason: 2 });     // rotação, a 2 do pior titular (82)
    const fraco = P("f", 70, { age: 22, appsSeason: 2 });   // reserva, longe dos titulares
    assert.deepStrictEqual(M.motivosAVenda(bom, elenco([bom]).filter((p) => p.id !== "r1"), ctx), ["insatisfeito", "poucos-jogos"]);
    assert.deepStrictEqual(M.motivosAVenda(fraco, elenco([fraco]), ctx), ["poucos-jogos"]);
    assert.deepStrictEqual(M.motivosAVenda(fraco, elenco([fraco]), { ...ctx, rodadas: 4 }), [], "antes de 5 rodadas");
    assert.deepStrictEqual(M.motivosAVenda(fraco, elenco([fraco]), { ...ctx, contaJogos: false }), [], "divisão sem contagem de jogos");
    assert.deepStrictEqual(M.motivosAVenda({ ...fraco, appsSeason: 3 }, elenco([fraco]), ctx), [], "30% não é pouco");
  });
  await check("Fim de contrato (último ano) e salário alto (mais de 1,4× o justo)", () => {
    const fim = P("f", 70, { age: 22, contractUntil: 2026 });
    const caro = P("c", 70, { age: 22, wage: 150000 });
    assert.deepStrictEqual(M.motivosAVenda(fim, elenco([fim]), ctx), ["fim-de-contrato"]);
    assert.deepStrictEqual(M.motivosAVenda(caro, elenco([caro]), ctx), ["salario-alto"]);
    assert.deepStrictEqual(M.motivosAVenda({ ...caro, wage: 140000 }, elenco([caro]), ctx), [], "1,4× exato não é alto");
    assert.strictEqual(M.MOTIVO_A_VENDA["fim-de-contrato"], "Fim de contrato");
  });
  await check("Clube vendedor: à venda, a reserva é 90% do valor, sem prêmio (de rotação, falta na posição ou fim de janela)", () => {
    const p = P("r1", 80);
    const seller = { roster: elenco() };
    const aVenda = M.reservaParaProposta(p, seller, { baseValue: 5000000, fimDeJanela: true, aVenda: true });
    assert.strictEqual(aVenda.reserva, 4500000);
    assert.strictEqual(aVenda.aVenda, true);
    // Mesmo sem cobertura na posição (o prêmio de falta não entra).
    assert.strictEqual(M.reservaParaProposta(p, { roster: [p] }, { baseValue: 5000000, aVenda: true }).reserva, 4500000);
  });
  await check("Atleta: à venda, aceita o salário atual sendo titular ou rotação no seu time; como reserva, a regra de sempre", () => {
    const p = P("r1", 80, { wage: 100000 });
    const ruim = { papelAtual: "rotacao", divisaoAtual: 0, divisaoComprador: 2, forcaAtual: 80, forcaComprador: 60, reputacao: 20 };
    const oferta = (papel) => ({ salario: 100000, papel, anos: 3 });
    assert.notStrictEqual(M.avaliacaoAtleta(p, oferta("rotacao"), ruim).decisao, "aceita", "sem a marca, descer duas divisões pesa");
    assert.strictEqual(M.avaliacaoAtleta(p, oferta("rotacao"), { ...ruim, aVenda: true }).decisao, "aceita");
    assert.strictEqual(M.avaliacaoAtleta(p, oferta("titular"), { ...ruim, aVenda: true }).decisao, "aceita");
    assert.notStrictEqual(M.avaliacaoAtleta(p, oferta("reserva"), { ...ruim, aVenda: true }).decisao, "aceita");
    assert.notStrictEqual(M.avaliacaoAtleta(p, { ...oferta("titular"), salario: 90000 }, { ...ruim, aVenda: true }).aVenda, true, "salário abaixo do atual: a regra de sempre");
    assert.strictEqual(M.salarioSugerido(p, "rotacao", { ...ruim, aVenda: true }), 100000);
  });

  await check("Trava de revenda: quem chegou só pode ser anunciado a partir da próxima janela (rodadas, calendário e temporada nova)", () => {
    // Rodadas: janelas 1–3 e 20–22.
    const r = (rodada) => ({ temporada: 2026, rodada });
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, rodada: 2 }, r(3)), false, "ainda na mesma janela");
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, rodada: 2 }, r(15)), false, "fora da janela, antes da próxima");
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, rodada: 2 }, r(20)), true, "próxima janela aberta");
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, rodada: 2 }, r(30)), true, "depois dela, segue liberado");
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, rodada: 21 }, r(36)), false);
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, rodada: 21 }, { temporada: 2027, rodada: 1 }), true, "temporada nova");
    assert.strictEqual(M.revendaLiberada(null, r(2)), true, "jogador sem a marca (save antigo, base)");
    // Calendário: fases por semana.
    const weeks = ["pre", "pre", "liga", "liga", "pausa", "liga"].map((p) => ({ p }));
    const fases = new Set(["ferias", "pre", "pausa"]);
    const c = (idx) => ({ temporada: 2026, idx, weeks, fases });
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, idx: 0 }, c(1)), false);
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, idx: 0 }, c(3)), false);
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, idx: 0 }, c(4)), true);
    assert.strictEqual(M.revendaLiberada({ temporada: 2026, idx: 0 }, c(5)), true);
  });

  await check("Regra desligada (só os testes de equivalência): ninguém à venda", () => {
    M.A_VENDA.ativa = false;
    try {
      const velho = P("v", 70, { age: 30 });
      assert.deepStrictEqual(M.motivosAVenda(velho, elenco([velho]), ctx), []);
    } finally { M.A_VENDA.ativa = true; }
  });

  console.log(failed ? `\n${failed}/${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
