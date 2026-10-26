// CAREER-PG-001 — teste direto de server/src/careerStore.js no modo
// POSTGRES (sem browser). Só roda com DATABASE_URL no ambiente (ex.:
// Postgres local de dev); sem ela, pula com PASS — o modo arquivo é
// coberto por test_save_limit_001_careerstore.js.
// Cobre: round-trip, null pra conta sem carreira, ordem dos saves
// concorrentes do mesmo usuário (último vence), save acima do teto do
// modo arquivo aceito, 400 pra formato inválido, delete, e a migração
// única do careers.json antigo (importa, renomeia o arquivo, nunca
// sobrescreve save mais novo nem ressuscita carreira apagada).
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { check } = require("./_check");

if (!process.env.DATABASE_URL) {
  console.log("PASS (pulado): DATABASE_URL não definida — modo Postgres não testado nesta execução.");
  process.exit(0);
}

// Mesma técnica de test_save_limit_001_careerstore.js: cópia do módulo
// num diretório temporário (data/ próprio — nunca toca server/data do
// repo), com node_modules do server linkado pra achar o driver "pg".
const SERVER_DIR = path.join(__dirname, "..", "..", "server");
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "brdata-careerpg-"));
fs.mkdirSync(path.join(TMP_ROOT, "src"));
fs.mkdirSync(path.join(TMP_ROOT, "data"));
for (const m of ["careerStore.js", "debouncedPersist.js"]) fs.copyFileSync(path.join(SERVER_DIR, "src", m), path.join(TMP_ROOT, "src", m));
fs.symlinkSync(path.join(SERVER_DIR, "node_modules"), path.join(TMP_ROOT, "node_modules"), "dir");
const DATA_FILE = path.join(TMP_ROOT, "data", "careers.json");
const STORE_PATH = path.join(TMP_ROOT, "src", "careerStore.js");
process.on("exit", () => { try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); } catch (_) { /* tmp */ } });

const P = "pgtest_" + crypto.randomBytes(4).toString("hex") + "_"; // ids únicos — banco pode ser compartilhado
function freshStore() {
  delete require.cache[require.resolve(STORE_PATH)];
  return require(STORE_PATH);
}

(async () => {
  // Save "antigo" no arquivo: 1 cru (pré-compressão) — importado no boot.
  fs.writeFileSync(DATA_FILE, JSON.stringify({ [P + "old"]: { clubId: "fla", squad: [], tag: "arquivo" } }));
  let cs = freshStore();
  check("1) Com DATABASE_URL o backend é Postgres:", cs.storageBackend === "postgres");
  check("2) careers.json antigo importado no boot:", (await cs.getCareer(P + "old"))?.tag === "arquivo");
  check("3) Arquivo antigo renomeado (backup), não apagado:", !fs.existsSync(DATA_FILE) && fs.existsSync(DATA_FILE + ".migrated-to-pg"));
  check("4) Conta sem carreira -> null:", (await cs.getCareer(P + "nada")) === null);

  const normal = { clubId: "cap", squad: [{ id: "p1", name: "Jogador Um" }], newsFeed: [{ headline: "oi" }] };
  await cs.saveCareer(P + "u1", normal);
  check("5) Round-trip idêntico:", JSON.stringify(await cs.getCareer(P + "u1")) === JSON.stringify(normal));

  await Promise.all(Array.from({ length: 30 }, (_, i) => cs.saveCareer(P + "u2", { clubId: "x", squad: [], n: i })));
  check("6) 30 saves concorrentes do mesmo usuário — o último vence:", (await cs.getCareer(P + "u2")).n === 29);

  // ~1MB comprimido (incompressível) — acima dos 768KB do modo arquivo.
  const big = { clubId: "x", squad: [{ id: "p", blob: crypto.randomBytes(1024 * 1024).toString("base64") }] };
  let threw = false;
  try { await cs.saveCareer(P + "u3", big); } catch (_) { threw = true; }
  check("7) Save acima do teto do modo arquivo aceito no Postgres:", !threw && (await cs.getCareer(P + "u3"))?.squad[0].blob === big.squad[0].blob);

  let status = null;
  try { await cs.saveCareer(P + "u4", { foo: "bar" }); } catch (e) { status = e.status; }
  check("8) Formato inválido -> 400:", status === 400);

  check("9) Delete existente -> true:", (await cs.deleteCareer(P + "u1")) === true);
  check("10) Delete inexistente -> false:", (await cs.deleteCareer(P + "u1")) === false);

  // Reboot com o arquivo antigo de volta no disco: não sobrescreve save
  // mais novo e não ressuscita carreira apagada.
  await cs.saveCareer(P + "old", { clubId: "fla", squad: [], tag: "novo" });
  await cs.close();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ [P + "old"]: { clubId: "fla", squad: [], tag: "arquivo" } }));
  cs = freshStore();
  check("11) Reimportação não sobrescreve save mais novo do banco:", (await cs.getCareer(P + "old"))?.tag === "novo");
  check("12) Carreira apagada continua apagada depois do reboot:", (await cs.getCareer(P + "u1")) === null);

  for (const u of ["old", "u2", "u3"]) await cs.deleteCareer(P + u);
  await cs.close();
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
