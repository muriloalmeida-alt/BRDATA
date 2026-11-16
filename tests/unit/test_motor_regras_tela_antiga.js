// Lote L6b (testes sem a tela antiga, 16/11): regras de jogo que só eram
// verificadas por testes da tela antiga (removidos neste lote) e que não
// tinham teste no motor. Pelas funções do motor (public/js/motor/).
//  1) Volta de lesão: a condição fica no teto da gravidade (leve 75, média
//     60, grave 45), sem subir quem já estava abaixo; suspensão não mexe
//     (antes: test_condicao_ajuda item 4).
//  2) Escalação automática: com "incluir base" a base completa o time; sem,
//     a base não entra (antes: test_escalacao_ui2 itens 3 a 5).
//  3) Lesão na partida guarda a fadiga do momento no histórico do jogador
//     (antes: test_bloco5_treino item 7).
//  4) Renomear esquema: nome repetido (sem diferença de maiúsculas), vazio
//     ou com mais de 30 letras é recusado; o válido é aplicado (antes:
//     test_redesign_caps_1_7 item 10).
// Uso: node tests/unit/test_motor_regras_tela_antiga.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
const J = (id, group, overall, extra = {}) => ({ id, name: `Jogador ${id}`, group, overall, origin: "principal", status: "ok", condition: 100, ...extra });

(async () => {
  const imp = (m) => import(pathToFileURL(path.join(__dirname, "..", "..", "public", "js", "motor", `${m}.js`)).href);
  const estado = await imp("estado"), semana = await imp("semana"), virada = await imp("virada"), fechamento = await imp("fechamento"), ponte = await imp("ponte");
  const carreira = (extra = {}) => estado.definirCarreira({ clubId: "eu", currentRound: 10, squad: [], lineup: { formation: "4-4-2", starters: [], bench: [], tactics: {} }, tacticalSchemes: [], ...extra });

  await check("Volta de lesão: condição no teto da gravidade (leve 75, média 60, grave 45); quem já estava abaixo não sobe; suspensão não mexe", () => {
    const sq = [
      J("l", "M", 70, { status: "contundido", injurySeverity: "leve", outUntilRound: 9, condition: 100 }),
      J("m", "M", 70, { status: "contundido", injurySeverity: "media", outUntilRound: 9, condition: 100 }),
      J("g", "M", 70, { status: "contundido", injurySeverity: "grave", outUntilRound: 9, condition: 100 }),
      J("b", "M", 70, { status: "contundido", injurySeverity: "grave", outUntilRound: 9, condition: 30 }),
      J("s", "M", 70, { status: "suspenso", outUntilRound: 9, condition: 100 }),
      J("f", "M", 70, { status: "contundido", injurySeverity: "grave", outUntilRound: 12, condition: 100 }),
    ];
    carreira({ squad: sq });
    semana.refreshAvailability(10);
    const c = Object.fromEntries(sq.map((p) => [p.id, [p.status, p.condition]]));
    assert.deepStrictEqual(c, { l: ["ok", 75], m: ["ok", 60], g: ["ok", 45], b: ["ok", 30], s: ["ok", 100], f: ["contundido", 100] });
    assert.deepStrictEqual(semana.INJURY_RETURN_CONDITION, { leve: 75, media: 60, grave: 45 });
  });

  await check("Escalação automática: com a base incluída ela completa o time; sem, a base não entra", () => {
    const base = Array.from({ length: 11 }, (_, i) => J(`b${i}`, ["G", "D", "D", "D", "D", "M", "M", "M", "M", "F", "F"][i], 60, { origin: "base" }));
    carreira({ squad: base });
    const com = virada.autoLineup(base, "4-4-2", true);
    const sem = virada.autoLineup(base, "4-4-2", false);
    assert.strictEqual(com.starters.filter(Boolean).length, 11);
    assert.strictEqual(sem.starters.filter(Boolean).length, 0);
    // Elenco misto: sem a base, nenhum titular é da base.
    const misto = [...base, ...Array.from({ length: 11 }, (_, i) => J(`p${i}`, ["G", "D", "D", "D", "D", "M", "M", "M", "M", "F", "F"][i], 50))];
    const m = virada.autoLineup(misto, "4-4-2", false);
    assert.ok(m.starters.every((id) => id && id.startsWith("p")));
  });

  await check("Lesão na partida guarda no histórico a fadiga do momento (100 − condição antes do jogo)", () => {
    const p = J("x", "M", 70, { condition: 70 });
    carreira({ squad: [p] });
    const orig = Math.random;
    const seq = [0.99, 0, 0, 0]; // sem cartão; lesão; gravidade; duração
    Math.random = () => (seq.length ? seq.shift() : 0.5);
    try { fechamento.applyMatchWearChunk([p], 10, 1, new Set()); } finally { Math.random = orig; }
    assert.strictEqual(p.status, "contundido");
    const h = p.injuryHistory[p.injuryHistory.length - 1];
    assert.strictEqual(h.round, 10);
    assert.strictEqual(h.fadigaAtInjury, 30);
  });

  await check("Renomear esquema: repetido (sem diferença de maiúsculas), vazio ou longo demais é recusado; o válido é aplicado", () => {
    carreira({ tacticalSchemes: [{ id: "a", name: "Ofensivo" }, { id: "b", name: "Retranca" }] });
    assert.strictEqual(ponte.renameTacticalScheme("b", "ofensivo").ok, false);
    assert.strictEqual(ponte.renameTacticalScheme("b", "   ").ok, false);
    assert.strictEqual(ponte.renameTacticalScheme("b", "x".repeat(31)).ok, false);
    const r = ponte.renameTacticalScheme("b", "  Contra  ataque ");
    assert.ok(r.ok);
    assert.strictEqual(estado.carreiraAtual().tacticalSchemes[1].name, "Contra ataque");
  });

  console.log(failed ? `\n${failed} de ${n} falharam` : `\n${n}/${n} ok`);
  process.exit(failed ? 1 : 0);
})();
