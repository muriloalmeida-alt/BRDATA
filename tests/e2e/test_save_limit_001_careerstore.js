// SAVE-LIMIT-001 (issue #29) — teste unitário direto de
// server/src/careerStore.js (sem browser — é lógica 100% de servidor).
// Cobre: compressão gzip transparente (round-trip idêntico), migração
// de save antigo (pré-compressão) carregado do disco, e a poda
// automática de histórico não-essencial como última linha de defesa
// antes de um 413 — nunca tocando elenco/contrato/escalação.
const fs = require("fs");
const { check } = require("./_check");
const path = require("path");
const crypto = require("crypto");

const os = require("os");

// Fase B do motor de testes: o teste usava o server/data/careers.json DO
// REPOSITÓRIO (e terminava gravando "{}" nele), apagando as carreiras do
// servidor de dev a cada execução da suíte. careerStore.js grava em
// <__dirname>/../data, então uma CÓPIA de server/src/careerStore.js (+ o
// único módulo local que ele usa) num diretório temporário testa o MESMO
// código com um data/ próprio, descartado no fim.
const SRC_DIR = path.join(__dirname, "..", "..", "server", "src");
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "brdata-careerstore-"));
fs.mkdirSync(path.join(TMP_ROOT, "src"));
for (const m of ["careerStore.js", "debouncedPersist.js"]) fs.copyFileSync(path.join(SRC_DIR, m), path.join(TMP_ROOT, "src", m));
const DATA_FILE = path.join(TMP_ROOT, "data", "careers.json");
const STORE_PATH = path.join(TMP_ROOT, "src", "careerStore.js");
process.on("exit", () => { try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); } catch (_) { /* tmp: o SO limpa */ } });

function freshStore(initialDiskContent) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, initialDiskContent != null ? JSON.stringify(initialDiskContent) : "{}");
  delete require.cache[require.resolve(STORE_PATH)];
  return require(STORE_PATH);
}

function randomIncompressible(bytes) {
  return crypto.randomBytes(bytes).toString("hex"); // gzip não compacta dado aleatório de verdade
}

(async () => {
  // 1) Save normal: round-trip idêntico (comprime ao salvar, descomprime ao ler).
  let careerStore = freshStore();
  const normal = { clubId: "cap", squad: [{ id: "p1", name: "Jogador Um" }], newsFeed: [{ headline: "oi" }] };
  const saved1 = careerStore.saveCareer("u1", normal);
  const reread1 = careerStore.getCareer("u1");
  check("1) Save normal: round-trip idêntico (comprimido no armazenamento, transparente na leitura):",
    JSON.stringify(saved1) === JSON.stringify(normal) && JSON.stringify(reread1) === JSON.stringify(normal));

  // 2) Arquivo em disco realmente guarda o envelope comprimido (__gz),
  // não o objeto cru — persist() é debounced (800ms, ver
  // debouncedPersist.js), espera a janela passar antes de checar.
  // Espera o arquivo ficar legível com o save (estado), até 10 s — antes
  // 900 ms fixos: sob carga a leitura pegava o arquivo ainda sendo escrito
  // ("Unexpected end of JSON input").
  let onDisk = null;
  for (const t0 = Date.now(); Date.now() - t0 < 10000;) {
    await new Promise((r) => setTimeout(r, 100));
    try { onDisk = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); if (onDisk.u1) break; } catch (_) { /* ainda escrevendo */ }
  }
  onDisk = onDisk || {};
  check("2) Arquivo em disco guarda { __gz } comprimido, não o JSON cru:", !!onDisk.u1 && !!onDisk.u1.__gz && typeof onDisk.u1.__gz === "string");

  // 3) Migração transparente: save ANTIGO (pré-compressão, objeto cru
  // no arquivo) é migrado ao carregar, sem perder dado nem exigir
  // nenhuma ação do cliente.
  const legacy = { clubId: "gre", squad: [{ id: "p2", name: "Jogador Dois" }], seasonYear: 2026 };
  careerStore = freshStore({ u_legacy: legacy });
  const migrated = careerStore.getCareer("u_legacy");
  check("3) Save antigo (pré-compressão) migra transparente ao carregar:", JSON.stringify(migrated) === JSON.stringify(legacy));

  // 4) newsFeed gigante e incompressível estoura o limite comprimido —
  // poda automática resolve sozinha (sem lançar 413), sem tocar
  // squad/clubId (estado de jogo ativo).
  careerStore = freshStore();
  const bigNews = { clubId: "cap", squad: [{ id: "p1", name: "Jogador Um" }], newsFeed: Array.from({ length: 200 }, () => ({ headline: randomIncompressible(6000) })) };
  let threw4 = false, saved4 = null;
  try { saved4 = careerStore.saveCareer("u4", bigNews); } catch (e) { threw4 = true; }
  check("4) Histórico gigante incompressível -> poda automática resolve sozinha (nunca toca squad/clubId):",
    !threw4 && saved4 && saved4.newsFeed.length <= 20 && saved4.clubId === "cap" && saved4.squad.length === 1,
    saved4 ? `newsFeed: ${saved4.newsFeed.length} entradas` : null);

  // 5) Estado de jogo ativo (squad) gigante e incompressível -- a poda
  // NUNCA mexe nisso -- lança 413 (não fica preso num beco silencioso,
  // recusa de forma explícita e não deixa meio-salvo).
  careerStore = freshStore();
  const bigSquad = { clubId: "cap", squad: Array.from({ length: 300 }, (_, i) => ({ id: "p" + i, name: randomIncompressible(6000) })) };
  let threw5 = false, status5 = null;
  try { careerStore.saveCareer("u5", bigSquad); } catch (e) { threw5 = true; status5 = e.status; }
  const afterFailedSave = careerStore.getCareer("u5");
  check("5) Estado ativo (squad) gigante -- poda não mexe nisso, lança 413 explícito, nada fica meio-salvo:",
    threw5 && status5 === 413 && afterFailedSave === null);

  // 6) Formato inválido continua rejeitado com 400 (regra antiga preservada).
  careerStore = freshStore();
  let threw6 = false, status6 = null;
  try { careerStore.saveCareer("u6", { foo: "bar" }); } catch (e) { threw6 = true; status6 = e.status; }
  check("6) Formato de save inválido continua rejeitado com 400 (regra preservada):", threw6 && status6 === 400);

  // 7) Disco gravado pelo redesign (PRs #47-#52, revertidos) no formato
  // de slots { active, slots: { sN: { __gz } }, meta } — cru OU já
  // recomprimido como { __gz } pelo load() antigo. getCareer precisa
  // devolver a carreira do slot ativo, não o registro de slots.
  const zlib = require("zlib");
  const gz = (o) => ({ __gz: zlib.gzipSync(Buffer.from(JSON.stringify(o), "utf8")).toString("base64") });
  const activeCareer = { clubId: "ativo", squad: [{ id: "p1" }] };
  const slotRec = { active: "s2", slots: { s1: gz({ clubId: "velho", squad: [] }), s2: gz(activeCareer) }, meta: {} };
  careerStore = freshStore({ u7a: slotRec, u7b: gz(slotRec), u7c: { active: "s1", slots: {}, meta: {} } });
  const g7a = careerStore.getCareer("u7a"), g7b = careerStore.getCareer("u7b");
  check("7) Registro de slots do redesign (cru e recomprimido) -> devolve a carreira do slot ativo:",
    JSON.stringify(g7a) === JSON.stringify(activeCareer) && JSON.stringify(g7b) === JSON.stringify(activeCareer)
      && careerStore.getCareer("u7c") === null);

})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
