// Plano Postgres (08/11): contas, sessões e carreiras no Postgres
// (server/src/persistencia.js, db.js). Usa os módulos DE VERDADE
// (users.js, sessions.js, careerStore.js) numa cópia isolada do servidor
// (pasta temporária, como o servidor isolado dos E2E) e um Postgres
// temporário (tests/_pg_temporario.js). Cada passo roda num processo novo,
// como uma subida real do servidor.
// Uso: node tests/unit/test_persistencia_postgres.js
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { subirPostgres } = require("../_pg_temporario");

const REPO = path.resolve(__dirname, "../..");
let failed = 0, n = 0;
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${String(e.message).split("\n").slice(0, 8).join("\n   ")}`); }
}

// Cópia isolada do servidor (só o que os módulos precisam).
function novoServidor() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "brdata-persist-"));
  const srv = path.join(raiz, "server");
  fs.mkdirSync(path.join(srv, "data"), { recursive: true });
  fs.cpSync(path.join(REPO, "server", "src"), path.join(srv, "src"), { recursive: true });
  fs.cpSync(path.join(REPO, "server", "scripts"), path.join(srv, "scripts"), { recursive: true });
  fs.symlinkSync(path.join(REPO, "server", "node_modules"), path.join(srv, "node_modules"));
  return srv;
}
// Roda um passo num processo novo; `corpo` é o miolo de uma função async
// que tem users, sessions, careerStore, persistencia, db e flushAllSync à
// mão e devolve um valor (JSON).
function passo(srv, corpo, env = {}) {
  const codigo = `
    const users = require("./src/users"), sessions = require("./src/sessions"), careerStore = require("./src/careerStore");
    const persistencia = require("./src/persistencia"), db = require("./src/db");
    const { flushAllSync } = require("./src/debouncedPersist");
    (async () => { ${corpo} })()
      .then(async (r) => { await db.encerrar(); process.stdout.write("\\n@@" + JSON.stringify(r === undefined ? null : r)); })
      .catch(async (e) => { await db.encerrar().catch(() => {}); process.stdout.write("\\n@@" + JSON.stringify({ erro: e.message })); });`;
  const limpo = { ...process.env }; delete limpo.DATABASE_URL;
  const out = execFileSync(process.execPath, ["-e", codigo], { cwd: srv, env: { ...limpo, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out.slice(out.lastIndexOf("@@") + 2));
}
const hashArquivos = (srv) => Object.fromEntries(["users.json", "sessions.json", "careers.json"].map((a) => {
  const f = path.join(srv, "data", a);
  return [a, fs.existsSync(f) ? crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex") : null];
}));
const lerJSON = (srv, a) => JSON.parse(fs.readFileSync(path.join(srv, "data", a), "utf8"));

// Carreira mínima válida (clubId e squad), com o tamanho que for preciso.
const carreira = (clube, rodada, extra = {}) => ({ clubId: clube, squad: [{ id: "p1", name: "Jogador" }], currentRound: rodada, ...extra });

(async () => {
  const pg = await subirPostgres();
  if (!pg) { console.log("Sem Postgres disponível (nem BRDATA_TEST_PG_URL nem initdb): teste não pode rodar."); process.exit(1); }
  const { Client } = require(path.join(REPO, "server", "node_modules", "pg"));
  const consultar = async (url, sql, params) => { const c = new Client({ connectionString: url }); await c.connect(); try { return (await c.query(sql, params)).rows; } finally { await c.end(); } };
  const novoBanco = async (nome) => { await consultar(pg.url, `CREATE DATABASE ${nome}`); const u = new URL(pg.url); u.pathname = `/${nome}`; return u.toString(); };

  // ---------- Base: dados em arquivo, como hoje ----------
  const srv = novoServidor();
  const base = passo(srv, `
    const a = await users.createUser({ name: "Ana", email: "ana@teste.com", phone: "11999999999", password: "senha123", plan: "freemium" });
    const b = await users.createUser({ name: "Bia", email: "bia@teste.com", phone: "11999999998", password: "senha123", plan: "freemium" });
    const c = await users.createUser({ name: "Caio", email: "caio@teste.com", phone: "11999999997", password: "senha123", plan: "freemium" });
    const t1 = sessions.createSession(a.id), t2 = sessions.createSession(b.id);
    careerStore.saveCareer(a.id, ${JSON.stringify(carreira("fla", 3))});
    careerStore.saveCareer(b.id, ${JSON.stringify(carreira("pal", 7))});
    careerStore.saveCareer(c.id, ${JSON.stringify(carreira("cor", 1))});
    flushAllSync();
    return { a: a.id, b: b.id, c: c.id, t1, t2 };`);
  // Um save no formato antigo (antes dos slots), direto no arquivo.
  const careersArq = lerJSON(srv, "careers.json");
  careersArq.antigo = carreira("bot", 12);
  fs.writeFileSync(path.join(srv, "data", "careers.json"), JSON.stringify(careersArq));

  await check("Sem DATABASE_URL: tudo em arquivo, como sempre (contas, sessões e carreiras gravadas em server/data)", () => {
    assert.ok(base.a && base.t1, JSON.stringify(base));
    assert.strictEqual(Object.keys(lerJSON(srv, "users.json")).length, 3);
    assert.strictEqual(Object.keys(lerJSON(srv, "sessions.json")).length, 2);
    assert.strictEqual(Object.keys(lerJSON(srv, "careers.json")).length, 4);
  });

  // ---------- Subida com banco: cópia conferida ----------
  const url1 = await novoBanco("brdata_persist_1");
  const arquivosAntes = hashArquivos(srv);
  const sub1 = passo(srv, `
    const r = await persistencia.iniciar();
    return { r, carreiraAntiga: careerStore.getCareer("antigo"), carreiraA: careerStore.getCareer(${JSON.stringify(base.a)}),
      sessao: !!sessions.getSession(${JSON.stringify(base.t1)}), conta: users.findById(${JSON.stringify(base.a)}).name };`, { DATABASE_URL: url1 });
  await check("1ª subida com banco: cria as tabelas, copia os arquivos e confere (3 contas, 2 sessões, 4 carreiras), carrega a memória do banco e não toca nos arquivos", async () => {
    assert.ok(!sub1.erro, sub1.erro);
    assert.deepStrictEqual(sub1.r, {
      contas: { carregados: 3, copiadosDoArquivo: 3, aviso: null },
      sessoes: { carregados: 2, copiadosDoArquivo: 2, aviso: null },
      carreiras: { carregados: 4, copiadosDoArquivo: 4, aviso: null },
    });
    assert.strictEqual(sub1.carreiraAntiga.clubId, "bot");
    assert.strictEqual(sub1.carreiraA.currentRound, 3);
    assert.ok(sub1.sessao);
    assert.strictEqual(sub1.conta, "Ana");
    const marcos = await consultar(url1, "SELECT tabela, registros FROM migracoes_arquivo ORDER BY tabela");
    assert.deepStrictEqual(marcos, [{ tabela: "carreiras", registros: 4 }, { tabela: "contas", registros: 3 }, { tabela: "sessoes", registros: 2 }]);
    // Conteúdo do banco = conteúdo dos arquivos, registro a registro.
    for (const [tabela, arq] of [["contas", "users.json"], ["sessoes", "sessions.json"], ["carreiras", "careers.json"]]) {
      const doBanco = Object.fromEntries((await consultar(url1, `SELECT chave, dados FROM ${tabela}`)).map((x) => [x.chave, x.dados]));
      assert.deepStrictEqual(doBanco, lerJSON(srv, arq), `tabela ${tabela}`);
    }
    assert.deepStrictEqual(hashArquivos(srv), arquivosAntes);
  });

  // ---------- Gravação por registro ----------
  const antes = Object.fromEntries((await consultar(url1, "SELECT chave, atualizado_em FROM carreiras")).map((x) => [x.chave, x.atualizado_em.getTime()]));
  await new Promise((r) => setTimeout(r, 30));
  const sub2 = passo(srv, `
    await persistencia.iniciar();
    careerStore.saveCareer(${JSON.stringify(base.a)}, ${JSON.stringify(carreira("fla", 4))});
    sessions.destroySession(${JSON.stringify(base.t2)});
    users.updateUser(${JSON.stringify(base.b)}, { name: "Bia Souza" });
    await persistencia.descarregarTudo();
    return true;`, { DATABASE_URL: url1 });
  await check("Gravação por registro: muda 1 carreira, apaga 1 sessão e altera 1 conta — só esses registros mudam no banco; os arquivos seguem parados", async () => {
    assert.strictEqual(sub2, true, JSON.stringify(sub2));
    const depois = Object.fromEntries((await consultar(url1, "SELECT chave, atualizado_em FROM carreiras")).map((x) => [x.chave, x.atualizado_em.getTime()]));
    const mudaram = Object.keys(depois).filter((k) => depois[k] !== antes[k]);
    // A carreira A mudou; a antiga foi normalizada para slots na carga e também é gravada uma vez.
    assert.deepStrictEqual(mudaram.sort(), [base.a, "antigo"].sort());
    const sess = (await consultar(url1, "SELECT chave FROM sessoes")).map((x) => x.chave);
    assert.deepStrictEqual(sess, [base.t1]);
    const bia = (await consultar(url1, "SELECT dados FROM contas WHERE chave = $1", [base.b]))[0].dados;
    assert.strictEqual(bia.name, "Bia Souza");
    assert.deepStrictEqual(hashArquivos(srv), arquivosAntes);
  });

  // ---------- Nova subida: lê do banco, não do arquivo ----------
  fs.writeFileSync(path.join(srv, "data", "users.json"), JSON.stringify({ intruso: { id: "intruso", name: "Não deveria aparecer" } }));
  const sub3 = passo(srv, `
    const r = await persistencia.iniciar();
    return { r, a: careerStore.getCareer(${JSON.stringify(base.a)}).currentRound, nomeB: users.findById(${JSON.stringify(base.b)}).name, intruso: !!users.findById("intruso"),
      t2: !!sessions.getSession(${JSON.stringify(base.t2)}) };`, { DATABASE_URL: url1 });
  await check("Nova subida: a memória vem do banco (a cópia não se repete, o arquivo mudado é ignorado)", () => {
    assert.ok(!sub3.erro, sub3.erro);
    assert.deepStrictEqual(sub3.r.contas, { carregados: 3, copiadosDoArquivo: null, aviso: null });
    assert.strictEqual(sub3.a, 4);
    assert.strictEqual(sub3.nomeB, "Bia Souza");
    assert.strictEqual(sub3.intruso, false);
    assert.strictEqual(sub3.t2, false);
  });

  // ---------- Falhas na cópia ----------
  // (a) arquivo corrompido; (b) o banco devolve algo diferente do que foi
  // gravado (um gatilho de teste altera a linha) — a conferência acusa.
  const srvRuim = novoServidor();
  fs.writeFileSync(path.join(srvRuim, "data", "users.json"), "{ isto não é json");
  const urlA = await novoBanco("brdata_persist_2a");
  const ruimA = passo(srvRuim, `return await persistencia.iniciar();`, { DATABASE_URL: urlA });
  const srvRuimB = novoServidor();
  fs.writeFileSync(path.join(srvRuimB, "data", "users.json"), JSON.stringify({ u1: { id: "u1", name: "Ana" }, u2: { id: "u2", name: "Bia" } }));
  const arquivosRuinsB = hashArquivos(srvRuimB);
  const urlB = await novoBanco("brdata_persist_2b");
  await consultar(urlB, `CREATE TABLE contas (chave text PRIMARY KEY, dados json NOT NULL, atualizado_em timestamptz NOT NULL DEFAULT now())`);
  await consultar(urlB, `CREATE FUNCTION estraga() RETURNS trigger AS $$ BEGIN IF NEW.chave = 'u2' THEN NEW.dados := '{"id":"u2","name":"Outra"}'::json; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`);
  await consultar(urlB, `CREATE TRIGGER estraga BEFORE INSERT ON contas FOR EACH ROW EXECUTE FUNCTION estraga()`);
  const ruimB = passo(srvRuimB, `return await persistencia.iniciar();`, { DATABASE_URL: urlB });
  await check("Cópia que falha: arquivo corrompido ou banco devolvendo outro conteúdo — a subida falha com aviso claro, nada fica pela metade no banco e o arquivo segue intacto", async () => {
    assert.ok(ruimA && ruimA.erro && /ilegível/.test(ruimA.erro), JSON.stringify(ruimA));
    assert.deepStrictEqual(await consultar(urlA, "SELECT count(*)::int AS n FROM contas"), [{ n: 0 }]);
    assert.ok(ruimB && ruimB.erro && /não conferiu/.test(ruimB.erro) && /u2/.test(ruimB.erro), JSON.stringify(ruimB));
    assert.deepStrictEqual(await consultar(urlB, "SELECT count(*)::int AS n FROM contas"), [{ n: 0 }]);
    assert.deepStrictEqual(await consultar(urlB, "SELECT count(*)::int AS n FROM migracoes_arquivo"), [{ n: 0 }]);
    assert.deepStrictEqual(hashArquivos(srvRuimB), arquivosRuinsB);
  });

  // ---------- Exportar de volta para arquivo ----------
  const destino = path.join(srv, "data", "exportado-teste");
  const exp = passo(srv, `const { exportar } = require("./scripts/exportar-postgres"); return await exportar(${JSON.stringify(destino)});`, { DATABASE_URL: url1 });
  await check("Exportar (voltar atrás): grava os 3 arquivos no formato de server/data, iguais ao banco, numa pasta nova", async () => {
    assert.deepStrictEqual(exp, { "users.json": 3, "sessions.json": 1, "careers.json": 4 }, JSON.stringify(exp));
    for (const [tabela, arq] of [["contas", "users.json"], ["sessoes", "sessions.json"], ["carreiras", "careers.json"]]) {
      const doBanco = Object.fromEntries((await consultar(url1, `SELECT chave, dados FROM ${tabela}`)).map((x) => [x.chave, x.dados]));
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(destino, arq), "utf8")), doBanco, arq);
    }
    const repetido = passo(srv, `const { exportar } = require("./scripts/exportar-postgres"); return await exportar(${JSON.stringify(destino)});`, { DATABASE_URL: url1 });
    assert.ok(repetido.erro && /não está vazia/.test(repetido.erro), "não sobrescreve pasta com conteúdo");
  });

  // ---------- Mesmo roteiro: arquivo × banco ----------
  const roteiro = (ids) => `
    careerStore.saveCareer(${JSON.stringify(ids.a)}, ${JSON.stringify(carreira("fla", 9, { notas: "x".repeat(2000) }))});
    careerStore.saveCareer(${JSON.stringify(ids.b)}, ${JSON.stringify(carreira("pal", 8))});
    careerStore.deleteCareer(${JSON.stringify(ids.c)});
    users.updateUser(${JSON.stringify(ids.a)}, { favoriteClub: "fla" });
    sessions.destroySession(${JSON.stringify(ids.t1)});`;
  const srvArq = novoServidor(), srvDb = novoServidor();
  for (const a of ["users.json", "sessions.json", "careers.json"]) {
    fs.copyFileSync(path.join(srv, "data", a), path.join(srvArq, "data", a));
    fs.copyFileSync(path.join(srv, "data", a), path.join(srvDb, "data", a));
  }
  passo(srvArq, `${roteiro(base)} flushAllSync(); return true;`);
  const url3 = await novoBanco("brdata_persist_3");
  passo(srvDb, `await persistencia.iniciar(); ${roteiro(base)} await persistencia.descarregarTudo(); return true;`, { DATABASE_URL: url3 });
  await check("Mesmo roteiro (salvar, apagar carreira, mudar conta, sair) com arquivo e com banco deixa os mesmos dados (fora os carimbos de hora)", async () => {
    const semHora = (x) => JSON.parse(JSON.stringify(x, (k, v) => (/At$/.test(k) && typeof v === "number" ? 0 : v)));
    for (const [tabela, arq] of [["contas", "users.json"], ["sessoes", "sessions.json"], ["carreiras", "careers.json"]]) {
      const doBanco = Object.fromEntries((await consultar(url3, `SELECT chave, dados FROM ${tabela}`)).map((x) => [x.chave, x.dados]));
      assert.deepStrictEqual(semHora(doBanco), semHora(lerJSON(srvArq, arq)), tabela);
    }
  });

  await pg.parar();
  console.log(`\n${n - failed}/${n} ok`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
