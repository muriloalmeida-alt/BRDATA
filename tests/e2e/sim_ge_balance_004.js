// GE-BALANCE-004 (issue #39) — validação Monte Carlo do realismo de
// acesso/rebaixamento, ANTES vs DEPOIS. Código real extraído de
// public/js/carreira.js (reposicionamento com degrau entre divisões) e de
// public/js/data.js (Poisson, RNG, times de exemplo) e rodado num `vm`.
// O que o script MODELA: o campeonato de pontos corridos de cada
// divisão (turno e returno, gols por Poisson com a MESMA fórmula de
// resolveCpuFixture: casa atk*def_adv*1.12, fora atk*def_casa) e a
// cascata 4 sobem/4 descem entre A/B/C, com 4 da Série D sorteados.
// Reprieve de tradição (GE-BALANCE-002) fica de fora — mede só a força.
// Uso: node tests/e2e/sim_ge_balance_004.js [temporadas] [degrau_sd]
// (degrau opcional sobrepõe a constante de produção, pra calibrar)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const SEASONS = Number(process.argv[2]) || 300;
const GAP_OVERRIDE = process.argv[3] != null ? Number(process.argv[3]) : null;
const src = fs.readFileSync(path.resolve(__dirname, "../../public/js/carreira.js"), "utf8");
const dataJs = fs.readFileSync(path.resolve(__dirname, "../../public/js/data.js"), "utf8");
function extract(text, name) {
  const m = text.match(new RegExp(`^(function ${name}\\(|const ${name} = )`, "m"));
  if (!m) throw new Error(`não achou ${name}`);
  const isFn = m[0].startsWith("function");
  const open = isFn ? text.indexOf("{", text.indexOf(")", m.index)) : m.index + m[0].length;
  const [o, c] = text[open] === "{" ? ["{", "}"] : text[open] === "[" ? ["[", "]"] : [null, null];
  if (!o) return text.slice(m.index, text.indexOf("\n", m.index)).replace(/^const /, "var ") + "\n";
  let d = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === o) d++;
    else if (text[j] === c && --d === 0) return text.slice(m.index, isFn ? j + 1 : text.indexOf(";", j) + 1).replace(/^const /, "var ") + "\n";
  }
}
const sb = {};
vm.createContext(sb);
vm.runInContext(
  ["mulberry32", "seededRngFromKey", "poissonSample", "DEMO_TEAMS", "DEMO_TEAMS_SERIE_B", "DEMO_TEAMS_SERIE_C", "DEMO_TEAMS_SERIE_D"].map((n) => extract(dataJs, n)).join("")
  + ["clamp", "STRENGTH_DIVISION_GAP_SD", "divisionStrengthScale", "repositionArrivals"].map((n) => extract(src, n)).join(""), sb);

function playSeason(teams, rng) {
  const rows = new Map(teams.map((t) => [t.id, { id: t.id, j: 0, v: 0, gp: 0, gc: 0, sg: 0, pts: 0 }]));
  for (const h of teams) for (const a of teams) {
    if (h === a) continue;
    const gh = sb.poissonSample(sb.clamp(h.atk * a.def * 1.12, 0.05, 6), rng);
    const ga = sb.poissonSample(sb.clamp(a.atk * h.def, 0.05, 6), rng);
    const rh = rows.get(h.id), ra = rows.get(a.id);
    rh.j++; ra.j++; rh.gp += gh; rh.gc += ga; ra.gp += ga; ra.gc += gh;
    if (gh > ga) { rh.v++; rh.pts += 3; } else if (gh < ga) { ra.v++; ra.pts += 3; } else { rh.pts++; ra.pts++; }
  }
  rows.forEach((r) => { r.sg = r.gp - r.gc; });
  return [...rows.values()].sort((a, b) => (b.pts - a.pts) || (b.v - a.v) || (b.sg - a.sg) || (b.gp - a.gp));
}
// "ao vivo": cada liga normalizada pra média 1 (o que calibrateStrengths faz)
function normalizeLeague(teams) {
  const ma = teams.reduce((s, t) => s + t.atk, 0) / teams.length, md = teams.reduce((s, t) => s + t.def, 0) / teams.length;
  teams.forEach((t) => { t.atk /= ma; t.def /= md; });
}
function run(withFix, liveLike, seed) {
  const rng = sb.mulberry32(seed);
  const clone = (list) => list.map((t) => ({ id: t.id, atk: t.atk, def: t.def }));
  let A = clone(sb.DEMO_TEAMS), B = clone(sb.DEMO_TEAMS_SERIE_B), C = clone(sb.DEMO_TEAMS_SERIE_C), D = clone(sb.DEMO_TEAMS_SERIE_D);
  if (liveLike) [A, B, C, D].forEach(normalizeLeague);
  const tags = new Map(); // id -> { kind, div } da temporada corrente
  const out = { upToA: [], downToB: [], upToB: [], downToC: [] };
  for (let s = 0; s < SEASONS + 3; s++) {
    const rA = playSeason(A, rng), rB = playSeason(B, rng), rC = playSeason(C, rng);
    if (s >= 3) {
      const posOf = (rows, id) => rows.findIndex((r) => r.id === id) + 1;
      tags.forEach((tag, id) => {
        const rows = tag.div === "A" ? rA : tag.div === "B" ? rB : rC;
        const pos = posOf(rows, id);
        if (pos) out[tag.kind].push(pos);
      });
    }
    tags.clear();
    const ids = (rows) => rows.map((r) => r.id);
    const upB = ids(rB).slice(0, 4), downA = ids(rA).slice(-4), upC = ids(rC).slice(0, 4), downB = ids(rB).slice(-4), downC = ids(rC).slice(-4);
    const dIdx = []; while (dIdx.length < 4) { const i = Math.floor(rng() * D.length); if (!dIdx.includes(i)) dIdx.push(i); }
    const upD = dIdx.map((i) => D[i]);
    const by = (list, idList) => idList.map((id) => list.find((t) => t.id === id));
    const stayA = A.filter((t) => !downA.includes(t.id)), stayB = B.filter((t) => !upB.includes(t.id) && !downB.includes(t.id)), stayC = C.filter((t) => !upC.includes(t.id) && !downC.includes(t.id));
    if (withFix) {
      // a régua de origem é tirada ANTES de qualquer reposicionamento
      // (o mesmo clube não pode distorcer a régua da divisão de onde sai)
      const oA = sb.divisionStrengthScale(A), oB = sb.divisionStrengthScale(B), oC = sb.divisionStrengthScale(C), oD = sb.divisionStrengthScale(D);
      sb.repositionArrivals(by(B, upB), stayA, "promoted", oB);
      sb.repositionArrivals(by(A, downA), stayB, "relegated", oA);
      sb.repositionArrivals(by(C, upC), stayB, "promoted", oC);
      sb.repositionArrivals(by(B, downB), stayC, "relegated", oB);
      sb.repositionArrivals(upD, stayC, "promoted", oD);
    }
    const nA = [...stayA, ...by(B, upB)], nB = [...stayB, ...by(A, downA), ...by(C, upC)], nC = [...stayC, ...by(B, downB), ...upD];
    D = [...D.filter((_, i) => !dIdx.includes(i)), ...by(C, downC)];
    upB.forEach((id) => tags.set(id, { kind: "upToA", div: "A" }));
    downA.forEach((id) => tags.set(id, { kind: "downToB", div: "B" }));
    upC.forEach((id) => tags.set(id, { kind: "upToB", div: "B" }));
    downB.forEach((id) => tags.set(id, { kind: "downToC", div: "C" }));
    A = nA; B = nB; C = nC;
  }
  return out;
}
if (GAP_OVERRIDE != null) sb.STRENGTH_DIVISION_GAP_SD = GAP_OVERRIDE;
console.log(`Degrau entre divisões: ${sb.STRENGTH_DIVISION_GAP_SD} sd`);
const pct = (arr, f) => (arr.filter(f).length / arr.length * 100).toFixed(1) + "%";
const mean = (arr) => (arr.reduce((a, v) => a + v, 0) / arr.length).toFixed(1);
function report(label, o) {
  console.log(`\n=== ${label} ===`);
  console.log(`Promovidos à A (n=${o.upToA.length}): posição média ${mean(o.upToA)} | G4 ${pct(o.upToA, (p) => p <= 4)} | caem de novo ${pct(o.upToA, (p) => p > 16)}`);
  console.log(`Rebaixados à B (n=${o.downToB.length}): posição média ${mean(o.downToB)} | voltam à A ${pct(o.downToB, (p) => p <= 4)} | caem pra C ${pct(o.downToB, (p) => p > 16)}`);
  console.log(`Promovidos à B (n=${o.upToB.length}): posição média ${mean(o.upToB)} | G4 ${pct(o.upToB, (p) => p <= 4)} | caem de novo ${pct(o.upToB, (p) => p > 16)}`);
  console.log(`Rebaixados à C (n=${o.downToC.length}): posição média ${mean(o.downToC)} | voltam à B ${pct(o.downToC, (p) => p <= 4)} | caem pra D ${pct(o.downToC, (p) => p > 16)}`);
}
for (const liveLike of [false, true]) {
  const scen = liveLike ? "força estilo ao vivo (normalizada por liga)" : "Modo Exemplo (data.js)";
  // 3 trajetórias independentes (sementes) somadas — o equilíbrio de
  // longo prazo de UMA trajetória varia bastante de semente pra semente.
  const merge = (withFix) => [1234, 99, 2026].map((seed) => run(withFix, liveLike, seed))
    .reduce((acc, o) => { Object.keys(o).forEach((k) => { acc[k] = (acc[k] || []).concat(o[k]); }); return acc; }, {});
  report(`ANTES — ${scen}`, merge(false));
  report(`DEPOIS — ${scen}`, merge(true));
}
