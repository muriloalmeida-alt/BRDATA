// Sem página escondida, etapa B (08/11): estado e save em
// public/js/motor/estado.js — a carreira atual, a versão do save
// (schemaVersion) com as migrações numeradas, a carga e a gravação.
// Uso: node tests/unit/test_motor_estado.js   (sai com 1 se algo falhar)
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 6).join("\n   ")}`); }
}
// API de mentira no formato do fetchJSON do jogo: devolve o JSON ou lança
// um erro com `status`.
function api({ status = 200, corpo = {}, rede = false } = {}) {
  const chamadas = [];
  const pedir = async (url, opts) => {
    chamadas.push({ url, opts });
    if (rede) throw new Error("Failed to fetch");
    if (status >= 400) { const e = new Error(`Falha em ${url}`); e.status = status; throw e; }
    return corpo;
  };
  return { pedir, chamadas };
}

(async () => {
  const E = await import(pathToFileURL(path.resolve(__dirname, "../../public/js/motor/estado.js")).href);

  await check("Carreira atual: começa vazia, guarda a que for definida e volta a vazia com null/undefined", () => {
    assert.strictEqual(E.carreiraAtual(), null);
    const c = { clubId: "fla" };
    assert.strictEqual(E.definirCarreira(c), c);
    assert.strictEqual(E.carreiraAtual(), c);
    E.definirCarreira(undefined);
    assert.strictEqual(E.carreiraAtual(), null);
  });

  await check("Versão do save: sem o campo (ou inválido) é 0; a atual é 1", () => {
    assert.strictEqual(E.SCHEMA_VERSION, 1);
    assert.deepStrictEqual([{}, { schemaVersion: "x" }, { schemaVersion: -1 }, { schemaVersion: 1.5 }, null].map(E.versaoDoSave), [0, 0, 0, 0, 0]);
    assert.strictEqual(E.versaoDoSave({ schemaVersion: 1 }), 1);
  });

  await check("Migrações numeradas: save antigo (v0) sobe para a 1 uma vez; save na versão atual não muda; save de versão futura não é tocado", () => {
    const antigo = { clubId: "fla", squad: [{ id: "a" }] };
    const copia = JSON.parse(JSON.stringify(antigo));
    assert.deepStrictEqual(E.migrarSave(antigo), [1]);
    assert.deepStrictEqual(antigo, { ...copia, schemaVersion: 1 });
    assert.deepStrictEqual(E.migrarSave(antigo), []); // de novo: nada a fazer
    const futuro = { clubId: "fla", schemaVersion: 7 };
    assert.deepStrictEqual(E.migrarSave(futuro), []);
    assert.strictEqual(futuro.schemaVersion, 7);
    assert.deepStrictEqual(E.migrarSave(null), []);
  });

  await check("Migrações rodam em ordem, cada uma uma vez (com uma migração 2 de teste)", () => {
    const ordem = [];
    const m1 = E.MIGRACOES[1];
    E.MIGRACOES[1] = (s) => { ordem.push(1); s.a = 1; };
    E.MIGRACOES[2] = (s) => { ordem.push(2); s.b = s.a + 1; };
    // SCHEMA_VERSION é 1: a 2 não roda.
    const s = {};
    E.migrarSave(s);
    assert.deepStrictEqual(ordem, [1]);
    assert.deepStrictEqual(s, { a: 1, schemaVersion: 1 });
    E.MIGRACOES[1] = m1; delete E.MIGRACOES[2];
  });

  await check("Carga: devolve o save da conta; sem save ou com erro, null (cai na escolha de competição, como sempre)", async () => {
    const save = { clubId: "fla" };
    assert.strictEqual(await E.carregarSave(api({ corpo: { career: save } }).pedir), save);
    assert.strictEqual(await E.carregarSave(api({ corpo: { career: null } }).pedir), null);
    assert.strictEqual(await E.carregarSave(api({ status: 500 }).pedir), null);
    assert.strictEqual(await E.carregarSave(api({ rede: true }).pedir), null);
  });

  await check("Gravação: marca updatedAt e faz o PUT do save inteiro; ok", async () => {
    const save = { clubId: "fla", currentRound: 3 };
    const a = api();
    const r = await E.gravarSave(save, a.pedir, () => 1234);
    assert.deepStrictEqual(r, { ok: true });
    assert.strictEqual(save.updatedAt, 1234);
    assert.strictEqual(a.chamadas.length, 1);
    assert.strictEqual(a.chamadas[0].url, "/api/career");
    assert.strictEqual(a.chamadas[0].opts.method, "PUT");
    assert.deepStrictEqual(JSON.parse(a.chamadas[0].opts.body), { clubId: "fla", currentRound: 3, updatedAt: 1234 });
  });

  await check("Gravação com falha: devolve o motivo (sessão 401, grande 413, falha nos outros e sem rede) e mantém updatedAt marcado, como antes", async () => {
    const casos = [
      [{ status: 401 }, "sessao", 401], [{ status: 413 }, "grande", 413], [{ status: 400 }, "falha", 400],
      [{ status: 500 }, "falha", 500], [{ rede: true }, "falha", null],
    ];
    for (const [cfg, motivo, status] of casos) {
      const save = { clubId: "fla" };
      const r = await E.gravarSave(save, api(cfg).pedir, () => 99);
      assert.strictEqual(r.ok, false);
      assert.strictEqual(r.motivo, motivo);
      assert.strictEqual(r.status, status);
      assert.ok(r.mensagem);
      assert.strictEqual(save.updatedAt, 99);
    }
    assert.deepStrictEqual(await E.gravarSave(null, api().pedir), { ok: false, motivo: "sem-carreira" });
  });

  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
