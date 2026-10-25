// GE-SCOUT-001 — mede, com o código real de produção (extraído de
// public/js/carreira.js e rodado num `vm`, mesmo padrão dos sim_*.js),
// o critério "olheiro melhor → faixa de potencial mais estreita e mais
// achados por missão" para cada olheiro do catálogo nacional.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const src = fs.readFileSync(path.resolve(__dirname, "../../public/js/carreira.js"), "utf8");
const dataJs = fs.readFileSync(path.resolve(__dirname, "../../public/js/data.js"), "utf8");
function extract(name) {
  const m = src.match(new RegExp(`^(function ${name}\\(|const ${name} = )`, "m"));
  if (!m) throw new Error(`não achou ${name}`);
  const isFn = m[0].startsWith("function");
  const i = m.index;
  const open = isFn ? src.indexOf("{", src.indexOf(")", i)) : i + m[0].length;
  const [o, c] = src[open] === "{" ? ["{", "}"] : ["[", "]"];
  let d = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === o) d++;
    else if (src[j] === c && --d === 0) {
      const end = isFn ? j + 1 : src.indexOf(";", j) + 1;
      return src.slice(i, end).replace(/^const /, "var ") + "\n";
    }
  }
}
const sb = {};
vm.createContext(sb);
vm.runInContext(dataJs.match(/function mulberry32\(seed\) \{[\s\S]*?\n\}\n/)[0] + dataJs.match(/function seededRngFromKey\(key\) \{[\s\S]*?\n\}\n/)[0]
  + ["clamp", "SCOUT_MARKET", "SCOUT_MISSION_DURATIONS", "scoutPotentialRange"].map(extract).join(""), sb);
const N = 20000;
console.log("Olheiro                         Aval Rede  Largura média da faixa  Achados/missão (curta|média|longa, especialidade)");
sb.SCOUT_MARKET.forEach((c) => {
  const rng = sb.seededRngFromKey(`simscout:${c.id}`);
  let width = 0;
  for (let i = 0; i < N; i++) { const r = sb.scoutPotentialRange(70, 50, c.evaluation, rng); width += r.hi - r.lo; }
  // mesma fórmula de chance de tickScoutMissions (região da especialidade)
  const chance = sb.clamp(0.35 + c.network * 0.08 + (c.regionScope !== "any" ? 0.15 : 0), 0.2, 0.9);
  const finds = Object.values(sb.SCOUT_MISSION_DURATIONS).map((d) => (d.rolls * chance).toFixed(2)).join(" | ");
  console.log(`${c.name.padEnd(14)} ${c.specialty.padEnd(28).slice(0, 28)} ${c.evaluation}    ${c.network}     ${(width / N).toFixed(1).padStart(5)}                  ${finds}`);
});
