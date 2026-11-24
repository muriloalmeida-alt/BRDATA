// PARIDADE-CPU · E0 (17/11/2026) — baseline sem navegador, sob demanda.
// NÃO faz parte da suíte padrão (o run_parallel só pega test_*.js): roda à
// mão antes de etapas que mexem em força, decisões da CPU, economia ou save
// (docs/paridade-cpu/04_Plano_de_validacao.md, V10).
//
// Para cada modo (dados reais = catálogo congelado; Modo Exemplo) e cada
// seed, sobe um servidor isolado (modo arquivo, porta 8787), cria a
// carreira pela ponte (_sem_tela.js, como a v2) e joga N temporadas
// inteiras, virando a temporada pela ponte. A cada rodada lê, na memória
// do motor, as tabelas de todas as divisões antes e depois, e reconstrói o
// placar de cada jogo da liga pela diferença de gols de cada clube.
//
// Mede:
//  - gols por jogo, 0x0, desvio padrão dos gols por jogo, por divisão e
//    por tipo de jogo (CPU × CPU da sua divisão, CPU × você, outras
//    divisões), e gols marcados por terço de força do clube;
//  - taxa de zebra: vitórias e empates do mais fraco, por faixa de
//    diferença de força (força = atk/def de jogo do clube, a de
//    estado.forcaDeJogo; diferença = forte/fraco − 1);
//  - tempo de cada rodada (semana + partida + pós-jogo pela ponte) e da
//    virada: p50, p95, máximo;
//  - elencos da CPU no fim de cada temporada (jogadores, reais, overall);
//  - bytes do save no fim de cada temporada (JSON cru, contra o limite de
//    1 MB do corpo do PUT, e comprimido, contra os 768 KB do careerStore)
//    e pico de memória.
//
// Uso (da raiz do repositório; a porta 8787 precisa estar livre):
//   node tests/sim/paridade_baseline.js [--modos=real,exemplo] [--seeds=1,2,3,4,5]
//        [--temporadas=5] [--clube=0] [--saida=arquivo.json]
// Sai com 1 se alguma carreira travar (rodada que não fecha, virada que falha).
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { subirServidor, derrubarServidor, REPO } = require("./_servidor");

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MODOS = arg("modos", "real,exemplo").split(",").filter(Boolean);
const SEEDS = arg("seeds", "1,2,3,4,5").split(",").map(Number);
const TEMPORADAS = Number(arg("temporadas", "5"));
const CLUBE = arg("clube", "0");
const SAIDA = arg("saida", path.join(REPO, "tests", "sim", "_saida", `paridade_baseline_${Date.now()}.json`));

// ---------- leitura na memória do motor ----------
// Tabelas e calendário de cada divisão, força de jogo de cada clube.
const FOTO = `JSON.stringify((() => {
  const E = window.BRDATA_MOTOR.estado, C = E.carreiraAtual();
  const divs = { [E.competicaoAtual()]: { st: C.standings, sched: C.schedule, atual: true } };
  Object.entries(C.otherDivisions || {}).forEach(([k, d]) => { divs[k] = { st: d.standings, sched: d.schedule, atual: false }; });
  const out = {};
  Object.entries(divs).forEach(([k, d]) => {
    const rows = Array.isArray(d.st) ? d.st : Object.values(d.st || {});
    out[k] = { atual: d.atual, tabela: Object.fromEntries(rows.map((r) => [String(r.id), [r.j || 0, r.gp || 0, r.gc || 0]])) };
  });
  return { rodada: C.currentRound, ano: C.seasonYear, clube: String(C.clubId), divs: out };
})())`;
const CALENDARIO = (comp, rodada) => `JSON.stringify((() => {
  const E = window.BRDATA_MOTOR.estado, C = E.carreiraAtual();
  const s = ${JSON.stringify(comp)} === E.competicaoAtual() ? C.schedule : ((C.otherDivisions || {})[${JSON.stringify(comp)}] || {}).schedule;
  return ((s || {})[${rodada}] || []).map((f) => {
    const fh = E.forcaDeJogo(E.timePorId(f.home)), fa = E.forcaDeJogo(E.timePorId(f.away));
    return { h: String(f.home), a: String(f.away), fh: fh.atk / fh.def, fa: fa.atk / fa.def };
  });
})())`;
const SAVE_JSON = "JSON.stringify(window.BRDATA_MOTOR.estado.carreiraAtual())";
// Elencos da CPU no fim da temporada (achado A14: encolhem a cada virada).
const ELENCOS_CPU = `JSON.stringify((() => { const C = window.BRDATA_MOTOR.estado.carreiraAtual(); const t = Object.values(C.leagueSquads).flat();
  const xis = Object.values(C.leagueSquads).map((sq) => sq.slice().sort((a, b) => b.overall - a.overall).slice(0, 11)).flat();
  return { jogadores: t.length, reais: t.filter((p) => p.real).length, overall: t.length ? Math.round(t.reduce((s, p) => s + p.overall, 0) / t.length * 10) / 10 : null,
    overallXI: xis.length ? Math.round(xis.reduce((s, p) => s + p.overall, 0) / xis.length * 10) / 10 : null,
    jovens: t.filter((p) => (p.age || 99) <= 21).length }; })())`;
const N_RODADAS = "Object.keys(window.BRDATA_MOTOR.estado.carreiraAtual().schedule || {}).length";

// ---------- estatística ----------
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]; };
const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const dp = (a) => { const m = media(a); return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : null; };
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const FAIXAS = [[0, 0.05, "<5%"], [0.05, 0.15, "5–15%"], [0.15, 0.30, "15–30%"], [0.30, Infinity, ">30%"]];
const faixa = (d) => FAIXAS.find(([lo, hi]) => d >= lo && d < hi)[2];

function resumoJogos(jogos) {
  const gols = jogos.map((j) => j.gh + j.ga);
  const out = { jogos: jogos.length, golsPorJogo: r3(media(gols)), dpGols: r3(dp(gols)), zeroAZero: r3(jogos.filter((j) => j.gh + j.ga === 0).length / (jogos.length || 1)), mandante: r3(jogos.filter((j) => j.gh > j.ga).length / (jogos.length || 1)), empate: r3(jogos.filter((j) => j.gh === j.ga).length / (jogos.length || 1)) };
  // Zebra: o mais fraco (pela força de jogo) vence ou empata.
  const z = {};
  jogos.forEach((j) => {
    const forteCasa = j.fh >= j.fa;
    const d = Math.max(j.fh, j.fa) / Math.min(j.fh, j.fa) - 1;
    const k = faixa(d);
    const gF = forteCasa ? j.gh : j.ga, gf = forteCasa ? j.ga : j.gh;
    const b = (z[k] = z[k] || { jogos: 0, forteVence: 0, empate: 0, fracoVence: 0 });
    b.jogos++; if (gF > gf) b.forteVence++; else if (gF === gf) b.empate++; else b.fracoVence++;
  });
  out.zebra = Object.fromEntries(FAIXAS.map(([, , k]) => [k, z[k] ? { jogos: z[k].jogos, forteVence: r3(z[k].forteVence / z[k].jogos), empate: r3(z[k].empate / z[k].jogos), fracoVence: r3(z[k].fracoVence / z[k].jogos), zebra: r3((z[k].empate + z[k].fracoVence) / z[k].jogos) } : null]));
  return out;
}
// Gols marcados por jogo por terço de força (forte, médio, fraco) da divisão.
function porTerco(jogos) {
  const forca = new Map();
  jogos.forEach((j) => { forca.set(j.h, j.fh); forca.set(j.a, j.fa); });
  const ord = [...forca.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const terco = (id) => { const i = ord.indexOf(id); return i < ord.length / 3 ? "forte" : i < (2 * ord.length) / 3 ? "medio" : "fraco"; };
  const acc = { forte: [], medio: [], fraco: [] };
  jogos.forEach((j) => { acc[terco(j.h)].push(j.gh); acc[terco(j.a)].push(j.ga); });
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { golsMarcados: r3(media(v)), jogos: v.length }]));
}

// ---------- uma carreira ----------
async function carreira(modo, seed) {
  const { abrirPagina, jogarRodada } = require("../e2e/_sem_tela");
  const pg = await abrirPagina({ semente: seed });
  if (!pg.pronta) throw new Error("ponte não ficou pronta");
  const P = pg.P;
  const ler = (codigo) => JSON.parse(pg.rodar(codigo, "sim"));
  const comp = await P.escolherCompeticao("brasileirao");
  const clube = comp.clubes.find((c) => String(c.id) === CLUBE) || comp.clubes[Number(CLUBE)] || comp.clubes[0];
  await P.criarCarreira(clube.id);
  const jogos = [], tempos = [], viradas = [], bytes = [], elencos = [], problemas = [];
  let picoHeap = 0, picoJson = 0;
  for (let t = 0; t < TEMPORADAS; t++) {
    const nRodadas = Number(pg.rodar(N_RODADAS, "sim"));
    for (let guarda = 0; guarda < nRodadas + 5; guarda++) {
      const antes = ler(FOTO);
      if (antes.rodada > nRodadas) break;
      const cal = {};
      Object.keys(antes.divs).forEach((k) => { cal[k] = ler(CALENDARIO(k, antes.rodada)); });
      const t0 = process.hrtime.bigint();
      const r = await jogarRodada(P);
      tempos.push(Number(process.hrtime.bigint() - t0) / 1e6);
      picoHeap = Math.max(picoHeap, process.memoryUsage().heapUsed);
      picoJson = Math.max(picoJson, Number(pg.rodar(SAVE_JSON + ".length", "sim")));
      if (!r.ok) { problemas.push(`temporada ${t + 1}, rodada ${antes.rodada}: ${r.passos.join(" ")}`); break; }
      const depois = ler(FOTO);
      Object.entries(cal).forEach(([k, fixtures]) => {
        const A = antes.divs[k] && antes.divs[k].tabela, D = depois.divs[k] && depois.divs[k].tabela;
        if (!A || !D) return;
        fixtures.forEach((f) => {
          const dh = D[f.h], ah = A[f.h], da = D[f.a], aa = A[f.a];
          if (!dh || !ah || !da || !aa || dh[0] !== ah[0] + 1 || da[0] !== aa[0] + 1) return;
          const gh = dh[1] - ah[1], ga = da[1] - aa[1];
          const tipo = !antes.divs[k].atual ? "outras" : (f.h === antes.clube || f.a === antes.clube) ? "cpuXvoce" : "cpuXcpu";
          jogos.push({ modo, seed, temporada: t + 1, comp: k, tipo, h: f.h, a: f.a, fh: f.fh, fa: f.fa, gh, ga });
        });
      });
    }
    { const j = pg.rodar(SAVE_JSON, "sim"); bytes.push({ temporada: t + 1, fim: Buffer.byteLength(j, "utf8"), gzip: zlib.gzipSync(j, { level: 6 }).length }); }
    elencos.push({ temporada: t + 1, ...ler(ELENCOS_CPU) });
    if (t === TEMPORADAS - 1) break;
    const t0 = process.hrtime.bigint();
    const v = await P.proximaTemporada();
    viradas.push(Number(process.hrtime.bigint() - t0) / 1e6);
    if (!v || !v.ok) { problemas.push(`virada da temporada ${t + 1}: ${JSON.stringify(v && { motivo: v.motivo, demitido: v.demitido })}`); break; }
    if (v.demitido) { problemas.push(`demitido na virada da temporada ${t + 1}`); break; }
  }
  const salvo = (await pg.api("/api/career")).career;
  return { modo, seed, clube: clube.nome, jogos, tempos, viradas, bytes, elencos, bytesServidor: salvo ? JSON.stringify(salvo).length : null, picoHeap, picoJson, problemas };
}

(async () => {
  const resultados = [];
  for (const modo of MODOS) {
    const env = modo === "real" ? { DATA_PROVIDER: "frozen" } : {};
    for (const seed of SEEDS) {
      const s = await subirServidor(env);
      const t0 = Date.now();
      try { resultados.push(await carreira(modo, seed)); }
      catch (e) { resultados.push({ modo, seed, jogos: [], tempos: [], viradas: [], bytes: [], problemas: [`erro: ${e.message}`] }); }
      finally { await derrubarServidor(s); }
      const r = resultados[resultados.length - 1];
      console.log(`[${modo} seed ${seed}] ${r.jogos.length} jogos, ${r.tempos.length} rodadas, ${((Date.now() - t0) / 1000).toFixed(0)} s${r.problemas.length ? ` — ${r.problemas.join("; ")}` : ""}`);
    }
  }

  // ---------- relatório ----------
  const rel = { meta: { data: new Date().toISOString(), commit: require("child_process").execSync("git rev-parse --short HEAD", { cwd: REPO }).toString().trim(), node: process.version, cpus: os.cpus().length, modos: MODOS, seeds: SEEDS, temporadas: TEMPORADAS, clube: CLUBE }, porModo: {} };
  for (const modo of MODOS) {
    const rs = resultados.filter((r) => r.modo === modo);
    const js = rs.flatMap((r) => r.jogos);
    const comps = [...new Set(js.map((j) => j.comp))];
    const tempos = rs.flatMap((r) => r.tempos), viradas = rs.flatMap((r) => r.viradas);
    rel.porModo[modo] = {
      porDivisao: Object.fromEntries(comps.map((c) => {
        const jc = js.filter((j) => j.comp === c);
        const tipos = [...new Set(jc.map((j) => j.tipo))];
        return [c, { geral: resumoJogos(jc), porTipo: Object.fromEntries(tipos.map((t) => [t, resumoJogos(jc.filter((j) => j.tipo === t))])), porTerco: porTerco(jc) }];
      })),
      zebraGeral: { cpuXcpu: resumoJogos(js.filter((j) => j.tipo !== "cpuXvoce")).zebra, cpuXvoce: resumoJogos(js.filter((j) => j.tipo === "cpuXvoce")).zebra },
      tempoRodadaMs: { n: tempos.length, p50: r3(pct(tempos, 50)), p95: r3(pct(tempos, 95)), max: r3(Math.max(...tempos)) },
      tempoViradaMs: { n: viradas.length, p50: r3(pct(viradas, 50)), p95: r3(pct(viradas, 95)), max: viradas.length ? r3(Math.max(...viradas)) : null },
      // Dois limites do servidor: o corpo do PUT /api/career (JSON cru,
      // server.js readBody: 1 MB) e o save guardado (comprimido,
      // careerStore.js MAX_BYTES: 768 KB).
      bytesSave: Object.fromEntries([...new Set(rs.flatMap((r) => r.bytes.map((b) => b.temporada)))].map((t) => { const b = rs.map((r) => r.bytes.find((x) => x.temporada === t)).filter(Boolean); const v = b.map((x) => x.fim), g = b.map((x) => x.gzip); return [`temporada${t}`, { json: { media: Math.round(media(v)), max: Math.max(...v) }, gzip: { media: Math.round(media(g)), max: Math.max(...g) } }]; })),
      elencosCpu: Object.fromEntries([...new Set(rs.flatMap((r) => (r.elencos || []).map((e) => e.temporada)))].map((t) => { const e = rs.map((r) => (r.elencos || []).find((x) => x.temporada === t)).filter(Boolean); return [`temporada${t}`, { jogadores: Math.round(media(e.map((x) => x.jogadores))), reais: Math.round(media(e.map((x) => x.reais))), overall: r3(media(e.map((x) => x.overall))), overallXI: r3(media(e.map((x) => x.overallXI || 0))), jovens: Math.round(media(e.map((x) => x.jovens || 0))) }]; })),
      picoJsonEmQualquerRodada: Math.max(...rs.map((r) => r.picoJson || 0)),
      limites: { corpoPutJson: 1024 * 1024, saveGzip: 768 * 1024 },
      picoHeapMB: r3(Math.max(...rs.map((r) => r.picoHeap || 0)) / 1048576),
      problemas: rs.flatMap((r) => r.problemas.map((p) => `seed ${r.seed}: ${p}`)),
    };
  }
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify({ ...rel, jogos: resultados.flatMap((r) => r.jogos) }));
  fs.writeFileSync(SAIDA.replace(/\.json$/, ".resumo.json"), JSON.stringify(rel, null, 1));
  console.log(JSON.stringify(rel, null, 1));
  console.log(`\nResumo em ${SAIDA.replace(/\.json$/, ".resumo.json")}; jogos um a um em ${SAIDA}.`);
  process.exit(resultados.some((r) => r.problemas.length) ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
