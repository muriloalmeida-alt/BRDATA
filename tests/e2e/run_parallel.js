#!/usr/bin/env node
// Runner paralelo pra suíte de regressão (pedido do usuário: "estamos
// desenvolvendo em minutos e testando em horas") — os scripts test_*.js
// são processos independentes (cada um cria sua própria conta/carreira,
// seu próprio browser headless); isto roda N em paralelo (pool de
// workers) contra o MESMO servidor.
//
// Fase A do motor de testes (25/10/2026) — mudanças medidas contra um
// baseline de 3 execuções (ver relatório da Fase A em docs/):
//  - concorrência padrão proporcional às CPUs (a suíte é dominada por
//    ESPERA, não por CPU: 55% de CPU média na concorrência 6);
//  - os mais longos entram primeiro (duração da última execução, se
//    houver; senão a classe "long" do suites.json);
//  - timeout por classe (suites.json "long") em vez de subir o global;
//  - testes "exclusive" rodam sozinhos, depois dos demais;
//  - --isolated-server: sobe um servidor próprio com dados VAZIOS (o
//    servidor de dev acumula todas as contas de teste em careers.json,
//    deixando a suíte mais lenta a cada execução);
//  - --suite=fast (subconjunto de smoke, NÃO substitui a completa),
//    --coverage (cobertura JS via _coverage_preload.js), metadados e
//    logs de falha em _artifacts/.
// Nada aqui pula teste, repete teste (sem retry) ou altera resultado: o
// código de saída de cada script é o veredito, como sempre.
//
// Uso:
//   node run_parallel.js [filtro[,filtro2...]] [opções]
// Opções:
//   --concurrency=N     processos simultâneos (padrão: 2,5 × CPUs, entre 2 e 12)
//   --timeout=MS        timeout por script (padrão 90000; a classe "long" usa o do suites.json)
//   --suite=fast        só a rota rápida do suites.json (+ testes unitários)
//   --isolated-server   sobe e derruba um servidor próprio, com dados vazios, na porta 8787
//   --coverage          coleta cobertura JS e grava _coverage_summary.json
//   --order=alpha       ordem alfabética (padrão: mais longos primeiro)
//   --no-unit           não inclui tests/unit/test_*.js
//   --list              só lista o que rodaria, sem rodar
// Exemplos:
//   node run_parallel.js                          # suíte completa (e2e + unit), servidor já de pé
//   node run_parallel.js --isolated-server        # suíte completa reprodutível (npm run test:full)
//   node run_parallel.js --suite=fast --isolated-server   # rota rápida (npm run test:fast)
//   node run_parallel.js test_mercado,test_scout  # direcionada: arquivos que contêm algum filtro
//
// Pré-requisitos: ver README.md desta pasta (playwright-core +
// Chromium via PW_CHROMIUM_PATH; servidor local rodando, exceto com
// --isolated-server).
const { spawn, execSync, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const http = require("http");

const DIR = __dirname;
const REPO = path.resolve(DIR, "..", "..");
const UNIT_DIR = path.join(REPO, "tests", "unit");
const ARTIFACTS = path.join(DIR, "_artifacts");
const PORT = 8787; // os scripts usam http://localhost:8787 fixo

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.split("=")[1] : null; };
const flag = (name) => args.includes(`--${name}`);
const filters = (args.find((a) => !a.startsWith("--")) || "").split(",").map((s) => s.trim()).filter(Boolean);
const cpus = os.cpus().length;
const concurrency = Number(opt("concurrency")) || Math.min(12, Math.max(2, Math.round(cpus * 2.5)));
const timeoutMs = Number(opt("timeout")) || 90000;
const suiteName = opt("suite") || "full";
const orderMode = opt("order") || "longest";
const isolated = flag("isolated-server");
const coverage = flag("coverage");
const includeUnit = !flag("no-unit");

const suites = JSON.parse(fs.readFileSync(path.join(DIR, "suites.json"), "utf8"));
const longSet = new Set(suites.long.tests);
const exclusiveSet = new Set(suites.exclusive.tests);
// Perfis de servidor (suites.json "serverProfiles"): testes que precisam
// de um servidor configurado de outro jeito (variável de ambiente, conta
// criada antes do boot). Com --isolated-server, cada perfil sobe o PRÓPRIO
// servidor isolado (dados vazios) depois dos demais testes; sem ele, esses
// testes rodam contra o servidor que estiver de pé, como sempre rodaram.
const serverProfiles = Object.entries(suites.serverProfiles || {}).filter(([name]) => !name.startsWith("_"));
const profileOf = new Map(serverProfiles.flatMap(([name, prof]) => prof.tests.map((t) => [t, name])));

// ---------- seleção ----------
let e2eFiles = fs.readdirSync(DIR).filter((f) => f.startsWith("test_") && f.endsWith(".js"));
let unitFiles = includeUnit && fs.existsSync(UNIT_DIR) ? fs.readdirSync(UNIT_DIR).filter((f) => f.startsWith("test_") && f.endsWith(".js")) : [];
if (suiteName === "fast") {
  const fast = new Set(suites.fast.tests);
  const missing = suites.fast.tests.filter((f) => !e2eFiles.includes(f));
  if (missing.length) { console.error(`suites.json "fast" cita arquivos inexistentes: ${missing.join(", ")}`); process.exit(2); }
  e2eFiles = e2eFiles.filter((f) => fast.has(f));
  if (!suites.fast.includeUnit) unitFiles = [];
} else if (suiteName !== "full") {
  console.error(`--suite desconhecida: ${suiteName} (use full ou fast)`); process.exit(2);
}
if (filters.length) {
  const hit = (f) => filters.some((flt) => f.includes(flt));
  e2eFiles = e2eFiles.filter(hit);
  unitFiles = unitFiles.filter(hit);
}
const jobs = [
  ...e2eFiles.map((f) => ({ file: f, kind: "e2e", path: path.join(DIR, f), cwd: DIR })),
  ...unitFiles.map((f) => ({ file: `unit/${f}`, kind: "unit", path: path.join(UNIT_DIR, f), cwd: UNIT_DIR })),
];
if (!jobs.length) {
  console.error("Nenhum teste selecionado" + (filters.length ? ` pelos filtros "${filters.join(",")}"` : "") + ".");
  process.exit(1);
}

// ---------- ordem: mais longos primeiro (reduz a cauda) ----------
let history = {};
try {
  const last = JSON.parse(fs.readFileSync(path.join(DIR, "_last_parallel_run.json"), "utf8"));
  (last.results || []).forEach((r) => { history[r.file] = r.ms; });
} catch (_) { history = {}; }
const estimate = (j) => history[j.file] != null ? history[j.file] : (longSet.has(j.file) ? 60000 : 10000);
if (orderMode === "alpha") jobs.sort((a, b) => a.file.localeCompare(b.file));
else jobs.sort((a, b) => (estimate(b) - estimate(a)) || a.file.localeCompare(b.file));
const usesProfile = (j) => isolated && profileOf.has(j.file);
const parallelJobs = jobs.filter((j) => !exclusiveSet.has(j.file) && !usesProfile(j));
const exclusiveJobs = jobs.filter((j) => exclusiveSet.has(j.file) && !usesProfile(j));
const profileJobs = serverProfiles.map(([name, prof]) => [name, prof, jobs.filter((j) => usesProfile(j) && profileOf.get(j.file) === name)]).filter(([, , list]) => list.length);
const jobTimeout = (j) => (longSet.has(j.file) ? Math.max(timeoutMs, suites.long.timeoutMs) : timeoutMs);

if (flag("list")) {
  jobs.forEach((j) => console.log(`${j.file}${exclusiveSet.has(j.file) ? "  [exclusivo]" : ""}${longSet.has(j.file) ? `  [longo: ${jobTimeout(j)}ms]` : ""}${profileOf.has(j.file) ? `  [perfil de servidor: ${profileOf.get(j.file)}${isolated ? "" : " — só aplicado com --isolated-server"}]` : ""}`));
  console.log(`\n${jobs.length} teste(s) — suíte ${suiteName}${filters.length ? `, filtros ${filters.join(",")}` : ""}.`);
  process.exit(0);
}

// ---------- servidor isolado ----------
function portInUse(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
  });
}
function httpOk(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}
// Cópia de server/ num diretório temporário: careerStore & cia. gravam em
// <__dirname>/../data, então copiar server.js + src/ dá um diretório de
// dados próprio e vazio; o resto (public/, node_modules/, catálogo
// congelado) entra por link, só leitura. Nenhum arquivo do produto muda.
// {valor} nos campos de um perfil: gerados uma vez por servidor (ex.: um
// e-mail único pra conta criada antes do boot).
function expandProfile(prof) {
  const vars = { email: `perfil${Date.now()}${Math.floor(Math.random() * 1000)}@teste.com` };
  const sub = (v) => String(v).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const mapObj = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, sub(v)]));
  return {
    env: mapObj(prof.env),
    testEnv: mapObj(prof.testEnv),
    preBoot: prof.preBoot ? { script: prof.preBoot.script, args: (prof.preBoot.args || []).map(sub) } : null,
  };
}
async function startIsolatedServer(profile = null) {
  if (await portInUse(PORT)) {
    throw new Error(`--isolated-server: a porta ${PORT} já está em uso (pare o servidor de dev antes; os scripts usam essa porta fixa).`);
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brdata-e2e-"));
  const srv = path.join(root, "server");
  fs.mkdirSync(path.join(srv, "data"), { recursive: true });
  fs.copyFileSync(path.join(REPO, "server", "server.js"), path.join(srv, "server.js"));
  fs.copyFileSync(path.join(REPO, "server", "package.json"), path.join(srv, "package.json"));
  fs.cpSync(path.join(REPO, "server", "src"), path.join(srv, "src"), { recursive: true });
  if (fs.existsSync(path.join(REPO, "server", ".env"))) fs.copyFileSync(path.join(REPO, "server", ".env"), path.join(srv, ".env"));
  for (const d of ["node_modules", "frozen-catalog", "scripts"]) {
    if (fs.existsSync(path.join(REPO, "server", d))) fs.symlinkSync(path.join(REPO, "server", d), path.join(srv, d));
  }
  fs.symlinkSync(path.join(REPO, "public"), path.join(root, "public"));
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  // Preparação do perfil ANTES do boot (o servidor lê data/ uma vez ao
  // subir), sempre no data/ da cópia isolada (SERVER_DIR).
  if (profile && profile.preBoot) {
    execFileSync(process.execPath, [path.join(DIR, profile.preBoot.script), ...profile.preBoot.args], { cwd: DIR, env: { ...process.env, SERVER_DIR: srv }, stdio: ["ignore", "pipe", "inherit"] });
  }
  const log = fs.openSync(path.join(ARTIFACTS, profile ? `server-${profile.name}.log` : "server.log"), "w");
  const t0 = Date.now();
  const proc = spawn(process.execPath, ["server.js"], { cwd: srv, env: { ...process.env, ...(profile ? profile.env : {}), PORT: String(PORT) }, stdio: ["ignore", log, log] });
  while (!(await httpOk(PORT))) {
    if (proc.exitCode != null) throw new Error(`servidor isolado saiu com código ${proc.exitCode} — ver _artifacts/server.log`);
    if (Date.now() - t0 > 30000) { proc.kill("SIGKILL"); throw new Error("servidor isolado não respondeu em 30s — ver _artifacts/server.log"); }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { proc, root, bootMs: Date.now() - t0 };
}
async function stopIsolatedServer(s) {
  if (!s) return;
  try { s.proc.kill("SIGTERM"); } catch (_) { /* já saiu */ }
  // Espera o processo sair de fato (libera a porta pro próximo perfil).
  if (s.proc.exitCode == null) await new Promise((r) => { s.proc.once("exit", r); setTimeout(r, 5000); });
  try { fs.rmSync(s.root, { recursive: true, force: true }); } catch (_) { /* tmp: o SO limpa */ }
}

// ---------- execução ----------
const preload = path.join(DIR, "_coverage_preload.js");
function runOne(job, extraEnv) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const nodeArgs = coverage && job.kind === "e2e" ? ["-r", preload, job.path] : [job.path];
    const child = spawn(process.execPath, nodeArgs, { cwd: job.cwd, env: { ...process.env, ...(extraEnv || {}) } });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const limit = jobTimeout(job);
    let timedOut = false;
    const killer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, limit);
    child.on("close", (code) => {
      clearTimeout(killer);
      resolve({ file: job.file, kind: job.kind, code, timedOut, timeoutMs: limit, out, ms: Date.now() - startedAt });
    });
  });
}
function report(r, done, total) {
  const tag = r.code === 0 ? "PASS" : r.timedOut ? "TIMEOUT" : `FAIL(${r.code})`;
  process.stdout.write(`[${done}/${total}] ${tag.padEnd(9)} ${r.file}  (${(r.ms / 1000).toFixed(1)}s)\n`);
}
async function runPool(list, conc, results, counter, extraEnv) {
  const queue = [...list];
  await new Promise((resolveAll) => {
    let running = 0;
    function pump() {
      if (!queue.length && running === 0) return resolveAll();
      while (running < conc && queue.length) {
        const job = queue.shift();
        running++;
        runOne(job, extraEnv).then((r) => {
          running--;
          counter.done++;
          results.push(r);
          report(r, counter.done, counter.total);
          pump();
        });
      }
    }
    pump();
  });
}
function gitInfo() {
  try {
    return {
      commit: execSync("git rev-parse HEAD", { cwd: REPO }).toString().trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: REPO }).toString().trim(),
      dirtyFiles: execSync("git status --porcelain", { cwd: REPO }).toString().split("\n").filter(Boolean).length,
    };
  } catch (_) { return { commit: null, branch: null, dirtyFiles: null }; }
}

async function main() {
  const meta = {
    ...gitInfo(), startedAt: new Date().toISOString(), node: process.version, cpus,
    command: `node run_parallel.js ${args.join(" ")}`.trim(), suite: suiteName, filters,
    concurrency, timeoutMs, longTimeoutMs: suites.long.timeoutMs, order: orderMode, isolatedServer: isolated,
    coverage, retries: 0, selected: jobs.length, exclusive: exclusiveJobs.map((j) => j.file),
    serverProfiles: profileJobs.map(([name, , list]) => ({ name, tests: list.map((j) => j.file) })),
  };
  console.log(`Rodando ${jobs.length} script(s) [suíte ${suiteName}${filters.length ? `, filtros ${filters.join(",")}` : ""}] com concorrência ${concurrency} (timeout ${timeoutMs}ms; classe longa ${suites.long.timeoutMs}ms; exclusivos no fim: ${exclusiveJobs.length})${isolated ? " — servidor isolado" : ""}${coverage ? " — com cobertura" : ""}...\n`);
  if (coverage) fs.rmSync(path.join(DIR, "_coverage"), { recursive: true, force: true });
  fs.rmSync(ARTIFACTS, { recursive: true, force: true });
  let server = null;
  const stop = async () => { await stopIsolatedServer(server); process.exit(130); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  if (isolated) {
    server = await startIsolatedServer();
    meta.serverBootMs = server.bootMs;
    console.log(`Servidor isolado de pé em ${server.bootMs}ms (dados vazios).\n`);
  }
  const t0 = Date.now();
  const results = [];
  const counter = { done: 0, total: jobs.length };
  try {
    await runPool(parallelJobs, concurrency, results, counter);
    await runPool(exclusiveJobs, 1, results, counter);
    // Perfis de servidor (só com --isolated-server): um servidor isolado
    // novo por perfil, depois de todos os outros testes.
    for (const [name, prof, list] of profileJobs) {
      await stopIsolatedServer(server);
      server = null;
      const expanded = { name, ...expandProfile(prof) };
      server = await startIsolatedServer(expanded);
      console.log(`\nServidor isolado do perfil "${name}" de pé em ${server.bootMs}ms (${list.length} teste(s)).`);
      await runPool(list, 1, results, counter, expanded.testEnv);
    }
  } finally {
    await stopIsolatedServer(server);
  }
  const totalMs = Date.now() - t0;
  const fails = results.filter((r) => r.code !== 0).sort((a, b) => a.file.localeCompare(b.file));
  const passCount = results.length - fails.length;
  meta.totalMs = totalMs;
  meta.passed = passCount;
  meta.failed = fails.length;
  meta.timedOut = results.filter((r) => r.timedOut).map((r) => r.file);
  meta.notRun = jobs.length - results.length;

  console.log("\n" + "=".repeat(60));
  console.log(`Concluído em ${(totalMs / 1000).toFixed(1)}s (soma serial teria sido ~${(results.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(1)}s)`);
  console.log(`${passCount}/${results.length} passaram, ${fails.length} falharam${meta.timedOut.length ? ` (${meta.timedOut.length} por timeout)` : ""}; não executados: ${meta.notRun}; retries: 0.`);
  if (fails.length) {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    console.log(`\nFalhas (log completo de cada uma em ${path.relative(REPO, ARTIFACTS)}/):`);
    fails.forEach((r) => {
      fs.writeFileSync(path.join(ARTIFACTS, `${r.file.replace(/\//g, "__")}.log`), r.out);
      console.log(`\n=== ${r.timedOut ? `TIMEOUT(${r.timeoutMs}ms)` : `FAIL(${r.code})`}: ${r.file} (${(r.ms / 1000).toFixed(1)}s) ===`);
      console.log(r.out.trim().split("\n").slice(-8).join("\n"));
    });
  }
  fs.writeFileSync(path.join(DIR, "_last_parallel_run.json"), JSON.stringify({ meta, totalMs, results }, null, 2));
  if (coverage) {
    const rep = spawn(process.execPath, [path.join(DIR, "_coverage_report.js")], { stdio: "inherit" });
    await new Promise((r) => rep.on("close", r));
  }
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error("Erro do runner:", e.message); process.exit(2); });
