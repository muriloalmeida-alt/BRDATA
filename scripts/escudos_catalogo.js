#!/usr/bin/env node
// ESCUDOS-001 (13/11/2026) — mapa dos escudos locais das Séries A, B e C.
// Decisão do Murilo (13/11): cópia local dos escudos das 3 divisões (como a
// da Série D), para não depender do site externo do fornecedor e abrir
// offline; o escudo é o original, sobre uma chapinha clara (sem negativo).
//
// Liga cada id de clube — dos dados reais (catálogo congelado do fornecedor,
// server/frozen-catalog) e dos dados de exemplo (public/js/data.js) — ao
// arquivo em public/img/teams. Gera:
//  - carreira-v2/src/domain/crests.ts (LOCAL_CREST_BY_ID, usado pela v2);
//  - o bloco de pré-carregamento do service worker (public/sw.js, entre
//    /*__ESCUDOS_ABC__*/ e /*__FIM_ESCUDOS_ABC__*/).
// Confere: todo clube das 3 divisões (real e exemplo) tem arquivo, e todo
// arquivo citado existe. Uso: node scripts/escudos_catalogo.js [--gravar]
// (--parcial grava mesmo com falta, só para testar durante a cópia)
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const TEAMS_DIR = path.join(ROOT, "public/img/teams");

// Clube → arquivo (em public/img/teams). Os que já existiam no jogo
// (react-brasileirao-logos, Série B de exemplo, Série D) e os copiados da
// Wikipédia nesta demanda (origem em docs/carreira-v2/escudos/escudos_origem.json).
const ARQUIVO = {
  flamengo: "fla.svg", palmeiras: "pal.svg", botafogo: "bot.svg", fortaleza: "for.svg", internacional: "int.svg",
  "sao-paulo": "sao.svg", corinthians: "cor.svg", gremio: "gre.svg", "athletico-pr": "cap.svg", cruzeiro: "cru.svg",
  "atletico-mg": "cam.svg", bahia: "bah.svg", vasco: "vas.svg", fluminense: "flu.svg", santos: "san.svg",
  bragantino: "bra.svg", vitoria: "vit.svg", juventude: "juv.svg", cuiaba: "cui.svg",
  goias: "goi_b.png", avai: "ava_b.png", criciuma: "cri_b.png", "vila-nova": "vno_b.png", "atletico-go": "acg_b.png",
  crb: "crb_b.png", novorizontino: "nvz_b.png", "operario-pr": "ope_b.png", "botafogo-sp": "bsp_b.png", "athletic-club": "atc_b.png",
  csa: "csa-al.png", abc: "abc-rn.png", tombense: "tombense-mg.png", retro: "retro-pe.png",
  mirassol: "mirassol-sp", remo: "remo-pa", coritiba: "coritiba-pr", chapecoense: "chapecoense-sc", "america-mg": "america-mg",
  ceara: "ceara-ce", nautico: "nautico-pe", "sao-bernardo": "sao-bernardo-sp", "ponte-preta": "ponte-preta-sp", londrina: "londrina-pr",
  sport: "sport-pe", ituano: "ituano-sp", ypiranga: "ypiranga-rs", anapolis: "anapolis-go", itabaiana: "itabaiana-se",
  paysandu: "paysandu-pa", amazonas: "amazonas-am", figueirense: "figueirense-sc", brusque: "brusque-sc", floresta: "floresta-ce",
  maringa: "maringa-pr", ferroviaria: "ferroviaria-sp", confianca: "confianca-se", "volta-redonda": "volta-redonda-rj", maranhao: "maranhao-ma",
  "inter-limeira": "inter-limeira-sp", guarani: "guarani-sp", "santa-cruz": "santa-cruz-pe", caxias: "caxias-rs", "botafogo-pb": "botafogo-pb",
  barra: "barra-sc",
};

// id → clube: catálogo congelado (ids do fornecedor) e dados de exemplo.
const ID_CLUBE = {
  // Série A (fornecedor)
  11126: "mirassol", 3440: "vitoria", 11550: "remo", 3371: "cruzeiro", 2696: "internacional", 6285: "coritiba", 3432: "athletico-pr",
  692: "bahia", 3496: "sao-paulo", 303: "corinthians", 2864: "botafogo", 1024: "flamengo", 696: "vasco", 3684: "santos", 7808: "bragantino",
  2925: "gremio", 3427: "atletico-mg", 1095: "fluminense", 710: "chapecoense", 3422: "palmeiras",
  // Série B (fornecedor)
  6188: "crb", 6325: "america-mg", 12220: "ceara", 11941: "vila-nova", 6036: "criciuma", 12157: "nautico", 6370: "novorizontino",
  8331: "atletico-go", 14710: "operario-pr", 3621: "fortaleza", 104: "botafogo-sp", 6276: "sao-bernardo", 5463: "cuiaba", 3931: "ponte-preta",
  9181: "londrina", 234948: "athletic-club", 48: "juventude", 9323: "goias", 6468: "avai", 2352: "sport",
  // Série C (fornecedor)
  13292: "ituano", 6013: "ypiranga", 3579: "anapolis", 7583: "itabaiana", 3478: "paysandu", 238918: "amazonas", 9804: "figueirense",
  6304: "brusque", 30193: "floresta", 12230: "maringa", 2505: "ferroviaria", 12180: "confianca", 11642: "volta-redonda", 10386: "maranhao",
  5663: "inter-limeira", 3672: "guarani", 31215: "santa-cruz", 10080: "caxias", 7740: "botafogo-pb", 26906: "barra",
  // Exemplo (public/js/data.js)
  fla: "flamengo", pal: "palmeiras", bot: "botafogo", for: "fortaleza", int: "internacional", sao: "sao-paulo", cor: "corinthians",
  gre: "gremio", cap: "athletico-pr", cru: "cruzeiro", cam: "atletico-mg", bah: "bahia", vas: "vasco", flu: "fluminense", san: "santos",
  bra: "bragantino", vit: "vitoria", juv: "juventude", mir: "mirassol", cui: "cuiaba", atp: "athletico-pr", cta: "coritiba",
  cha: "chapecoense", rem: "remo", goi: "goias", ava: "avai", cri: "criciuma", vno: "vila-nova", cub: "cuiaba", acg: "atletico-go",
  ame: "america-mg", crb: "crb", nvz: "novorizontino", ope: "operario-pr", amz: "amazonas", pay: "paysandu", bsp: "botafogo-sp",
  atc: "athletic-club", vre: "volta-redonda", frv: "ferroviaria", nau: "nautico", csa: "csa", pon: "ponte-preta", gua: "guarani",
  fig: "figueirense", abc: "abc", itu: "ituano", bru: "brusque", tbe: "tombense", con: "confianca", cax: "caxias", lon: "londrina",
  bpb: "botafogo-pb", flo: "floresta", sbc: "sao-bernardo", ypi: "ypiranga", ana: "anapolis", ret: "retro", ita: "itabaiana", mga: "maringa",
};

function arquivoDe(clube) {
  const a = ARQUIVO[clube];
  if (!a) return null;
  if (/\.(svg|png)$/.test(a)) return fs.existsSync(path.join(TEAMS_DIR, a)) ? a : null;
  for (const ext of ["svg", "png"]) if (fs.existsSync(path.join(TEAMS_DIR, `${a}.${ext}`))) return `${a}.${ext}`;
  return null;
}

const erros = [];
// Todo clube das 3 divisões (real e exemplo) precisa estar mapeado.
const congelado = ["brasileirao", "serie_b", "serie_c"].flatMap((c) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${c}.json`), "utf8")).teams);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8").replace(/^(const|let) /gm, "var "), ctx);
const exemplo = [...ctx.DEMO_TEAMS, ...ctx.DEMO_TEAMS_SERIE_B, ...ctx.DEMO_TEAMS_SERIE_C];
for (const t of [...congelado, ...exemplo]) if (!ID_CLUBE[String(t.id)]) erros.push(`sem clube para o id ${t.id} (${t.name})`);

const mapa = {};
for (const [id, clube] of Object.entries(ID_CLUBE)) {
  const a = arquivoDe(clube);
  if (!a) { erros.push(`sem arquivo para ${clube} (id ${id})`); continue; }
  mapa[id] = `/img/teams/${a}`;
}
const arquivos = [...new Set(Object.values(mapa))].sort();
console.log(`${Object.keys(mapa).length} ids → ${arquivos.length} arquivos`);
if (erros.length) { console.error("Problemas:\n- " + erros.join("\n- ")); if (process.argv.includes("--gravar") && !process.argv.includes("--parcial")) process.exit(1); }

if (process.argv.includes("--gravar")) {
  const ts = `// GERADO por scripts/escudos_catalogo.js — não editar à mão.
// ESCUDOS-001 (13/11/2026): id do clube (dados reais do fornecedor e de
// exemplo) → escudo local em /img/teams (cópia local, sem site externo).
export const LOCAL_CREST_BY_ID: Record<string, string> = ${JSON.stringify(mapa, null, 2)};
`;
  fs.writeFileSync(path.join(ROOT, "carreira-v2/src/domain/crests.ts"), ts);
  const sw = path.join(ROOT, "public/sw.js");
  let s = fs.readFileSync(sw, "utf8");
  const ini = "/*__ESCUDOS_ABC__*/", fim = "/*__FIM_ESCUDOS_ABC__*/";
  const a = s.indexOf(ini), b = s.indexOf(fim);
  if (a < 0 || b < 0) { console.error("public/sw.js sem os marcadores do bloco de escudos"); process.exit(1); }
  s = s.slice(0, a + ini.length) + "\n" + arquivos.map((f) => `  "${f}",`).join("\n") + "\n  " + s.slice(b);
  fs.writeFileSync(sw, s);
  console.log("gravado: carreira-v2/src/domain/crests.ts e o bloco do public/sw.js");
}
