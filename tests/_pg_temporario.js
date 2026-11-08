// Postgres temporário para os testes (plano docs/ops/PLANO_POSTGRES.md).
// Duas formas, nesta ordem:
//   1) BRDATA_TEST_PG_URL (ex.: o serviço Postgres do CI): cria um banco
//      novo e vazio nesse servidor e apaga no fim;
//   2) Postgres instalado (initdb/pg_ctl): sobe um servidor próprio numa
//      pasta temporária, numa porta livre, e derruba no fim. Como root, roda
//      com o usuário `postgres` (o initdb não aceita root).
// Sem nenhum dos dois, devolve null (o teste decide se pula ou falha).
// Uso: const pg = await subirPostgres(); ... pg.url ... await pg.parar();
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const { execFileSync, spawnSync } = require("child_process");

function acharBinarios() {
  const candidatos = [];
  try { fs.readdirSync("/usr/lib/postgresql").sort().reverse().forEach((v) => candidatos.push(path.join("/usr/lib/postgresql", v, "bin"))); } catch (_) { /* sem pasta */ }
  for (const dir of candidatos) if (fs.existsSync(path.join(dir, "initdb")) && fs.existsSync(path.join(dir, "pg_ctl"))) return dir;
  const r = spawnSync("sh", ["-c", "command -v initdb"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() ? path.dirname(r.stdout.trim()) : null;
}
function portaLivre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}

async function viaServidorExterno(base) {
  const { Client } = require(path.join(__dirname, "..", "server", "node_modules", "pg"));
  const nome = `brdata_teste_${process.pid}_${Date.now()}`;
  const admin = new Client({ connectionString: base });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${nome}`);
  await admin.end();
  const u = new URL(base); u.pathname = `/${nome}`;
  return {
    url: u.toString(),
    async parar() {
      const c = new Client({ connectionString: base });
      await c.connect();
      await c.query(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`).catch(() => {});
      await c.end();
    },
  };
}

async function viaServidorProprio(bin) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "brdata-pg-"));
  const dados = path.join(raiz, "dados");
  const comoRoot = process.getuid && process.getuid() === 0;
  const rodar = (exe, args) => {
    const cmd = path.join(bin, exe);
    return comoRoot ? execFileSync("runuser", ["-u", "postgres", "--", cmd, ...args], { stdio: "pipe" }) : execFileSync(cmd, args, { stdio: "pipe" });
  };
  fs.chmodSync(raiz, 0o777);
  rodar("initdb", ["-D", dados, "-A", "trust", "-U", "postgres", "--no-sync", "-E", "UTF8"]);
  const porta = await portaLivre();
  rodar("pg_ctl", ["-D", dados, "-o", `-p ${porta} -k ${raiz} -h 127.0.0.1 -c fsync=off`, "-l", path.join(raiz, "log"), "-w", "start"]);
  return {
    url: `postgres://postgres@127.0.0.1:${porta}/postgres`,
    async parar() {
      try { rodar("pg_ctl", ["-D", dados, "-m", "immediate", "-w", "stop"]); } catch (_) { /* já parou */ }
      fs.rmSync(raiz, { recursive: true, force: true });
    },
  };
}

async function subirPostgres() {
  if (process.env.BRDATA_TEST_PG_URL) return viaServidorExterno(process.env.BRDATA_TEST_PG_URL);
  const bin = acharBinarios();
  return bin ? viaServidorProprio(bin) : null;
}

module.exports = { subirPostgres };
