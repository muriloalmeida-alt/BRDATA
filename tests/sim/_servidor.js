// Servidor isolado para as simulações sob demanda (tests/sim): uma cópia do
// server/ num diretório temporário, em modo arquivo (sem Postgres), na porta
// 8787 que o _sem_tela.js usa. Igual ao --isolated-server do run_parallel,
// sem o banco temporário.
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const REPO = path.resolve(__dirname, "../..");
const PORT = 8787;
const httpOk = () => new Promise((r) => { const q = http.get({ host: "127.0.0.1", port: PORT, path: "/" }, (res) => { res.resume(); r(true); }); q.on("error", () => r(false)); q.setTimeout(1000, () => { q.destroy(); r(false); }); });
async function subirServidor(env) {
  if (await httpOk()) throw new Error(`a porta ${PORT} já está em uso`);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brdata-sim-"));
  const srv = path.join(root, "server");
  fs.mkdirSync(path.join(srv, "data"), { recursive: true });
  fs.copyFileSync(path.join(REPO, "server", "server.js"), path.join(srv, "server.js"));
  fs.copyFileSync(path.join(REPO, "server", "package.json"), path.join(srv, "package.json"));
  fs.cpSync(path.join(REPO, "server", "src"), path.join(srv, "src"), { recursive: true });
  for (const d of ["node_modules", "frozen-catalog", "scripts"]) if (fs.existsSync(path.join(REPO, "server", d))) fs.symlinkSync(path.join(REPO, "server", d), path.join(srv, d));
  fs.symlinkSync(path.join(REPO, "public"), path.join(root, "public"));
  const limpo = { ...process.env }; delete limpo.DATABASE_URL;
  const proc = spawn(process.execPath, ["server.js"], { cwd: srv, env: { ...limpo, ...env, PORT: String(PORT), BRDATA_LEGACY_UI: "1" }, stdio: "ignore" });
  const t0 = Date.now();
  while (!(await httpOk())) {
    if (proc.exitCode != null) throw new Error(`servidor saiu com código ${proc.exitCode}`);
    if (Date.now() - t0 > 30000) { proc.kill("SIGKILL"); throw new Error("servidor não respondeu em 30 s"); }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { proc, root };
}
async function derrubarServidor(s) {
  s.proc.kill("SIGTERM");
  if (s.proc.exitCode == null) await new Promise((r) => { s.proc.once("exit", r); setTimeout(r, 5000); });
  fs.rmSync(s.root, { recursive: true, force: true });
}

module.exports = { subirServidor, derrubarServidor, REPO, PORT };
