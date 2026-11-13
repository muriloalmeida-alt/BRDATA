// SERIED-001 (13/11/2026): gera o bloco CATALOGO_SERIE_D de public/js/data.js a
// partir do catálogo oficial (docs/carreira-v2/serie-d/serie_d_40_clubes.json),
// sem alterar o catálogo. Acrescenta o que o catálogo não traz e o jogo
// precisa, marcado como tal:
//   - sigla e cores ("a validar": o catálogo deixa nome oficial e cores pendentes);
//   - força (atk/def) e orçamento: PARÂMETROS DE JOGO, não dado real;
//   - escudo: URL externa quando houver (decisão do Murilo, 13/11: "Carregue
//     imagens de site externo"); sem URL, o jogo mostra o monograma provisório;
//   - os clubes que já jogam a nossa Série C ficam mapeados (`noJogo`), sem
//     duplicar (decisão do Murilo, 13/11).
// Uso: node scripts/serie_d_catalogo.js            (confere e mostra o bloco)
//      node scripts/serie_d_catalogo.js --gravar   (reescreve o bloco no data.js)
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/carreira-v2/serie-d/serie_d_40_clubes.json"), "utf8"));

// Clubes do catálogo que já existem no jogo (mesma identidade e UF).
const NO_JOGO = { "abc-rn": "abc", "retro-pe": "ret", "csa-al": "csa", "tombense-mg": "tbe" };
// Sigla, cores e força. Os 8 que já estavam na D de exemplo mantêm cores e força.
// Força: atk maior = ataca melhor; def menor = defende melhor (GE-BALANCE-003).
const EXTRA = {
  "manaus-am": ["MNA", "#0057B8", "#FFFFFF", 1.18, 1.06],
  "monte-roraima-rr": ["MRR", "#0B6E33", "#FFFFFF", 0.96, 1.36],
  "sao-raimundo-rr": ["SRR", "#DC2626", "#FFFFFF", 1.05, 1.23],
  "nacional-am": ["NAC", "#003DA5", "#FFFFFF", 1.06, 1.22],
  "porto-velho-ro": ["PVE", "#1E3A8A", "#FFFFFF", 0.99, 1.31],
  "independencia-ac": ["IND", "#DC2626", "#FFFFFF", 0.97, 1.34],
  "araguaina-to": ["ARA", "#DC2626", "#FFFFFF", 0.98, 1.33],
  "aparecidense-go": ["APR", "#003DA5", "#FFFFFF", 1.11, 1.13],
  "brasiliense-df": ["BSL", "#FFC93C", "#1A1A1A", 1.07, 1.19],
  "gama-df": ["GAM", "#1A1A1A", "#FFFFFF", 1.13, 1.11],
  "luverdense-mt": ["LUV", "#1E7A3D", "#FFFFFF", 1.04, 1.25],
  "ceilandia-df": ["CEI", "#DC2626", "#1A1A1A", 1.01, 1.29],
  "mixto-mt": ["MIX", "#1A1A1A", "#FFFFFF", 0.98, 1.32],
  "aguia-maraba-pa": ["AGU", "#003DA5", "#FFFFFF", 1.03, 1.26],
  "tocantinopolis-to": ["TOC", "#1E3A8A", "#FFFFFF", 0.95, 1.38],
  "imperatriz-ma": ["IMP", "#1E3A8A", "#FFFFFF", 1.00, 1.30],
  "sampaio-correa-ma": ["SAM", "#FFC93C", "#1E7A3D", 1.12, 1.14],
  "moto-club-ma": ["MOT", "#DC2626", "#1A1A1A", 1.02, 1.27],
  "parnahyba-pi": ["PAR", "#0057B8", "#FFFFFF", 0.97, 1.35],
  "ferroviario-ce": ["FER", "#DC2626", "#1A1A1A", 1.10, 1.16],
  "abc-rn": ["ABC", "#1A1A1A", "#FFFFFF", 1.10, 1.15],
  "america-rn": ["AME", "#DC2626", "#FFFFFF", 1.08, 1.18],
  "sousa-pb": ["SOU", "#FFC93C", "#1E7A3D", 0.99, 1.31],
  "treze-pb": ["TRZ", "#1A1A1A", "#FFFFFF", 0.96, 1.39],
  "retro-pe": ["RET", "#1E3A8A", "#FFC93C", 1.05, 1.22],
  "sergipe-se": ["SGP", "#0057B8", "#FFFFFF", 1.00, 1.33],
  "asa-al": ["ASA", "#1A1A1A", "#FFFFFF", 1.03, 1.26],
  "csa-al": ["CSA", "#003DA5", "#FFFFFF", 1.09, 1.17],
  "juazeirense-ba": ["JUA", "#DC2626", "#FFFFFF", 1.01, 1.28],
  "operario-ms": ["OPE", "#1A1A1A", "#FFFFFF", 0.98, 1.32],
  "uberlandia-mg": ["UBE", "#1E7A3D", "#FFFFFF", 1.02, 1.27],
  "tombense-mg": ["TOM", "#DC2626", "#FFFFFF", 1.06, 1.21],
  "vitoria-es": ["VES", "#003DA5", "#FFFFFF", 0.99, 1.30],
  "portuguesa-sp": ["POR", "#DC2626", "#1E7A3D", 1.11, 1.15],
  "xv-piracicaba-sp": ["XVP", "#1A1A1A", "#FFFFFF", 1.04, 1.24],
  "nova-iguacu-rj": ["NIG", "#F97316", "#FFFFFF", 1.05, 1.23],
  "cascavel-pr": ["CAS", "#FFC93C", "#1A1A1A", 1.03, 1.25],
  "cianorte-pr": ["CIA", "#003DA5", "#FFFFFF", 1.00, 1.29],
  "joinville-sc": ["JOI", "#DC2626", "#1A1A1A", 1.15, 1.09],
  "brasil-pelotas-rs": ["BRP", "#DC2626", "#1A1A1A", 1.07, 1.20],
};
// Escudos: cópia local em public/img/teams/<id>.svg|png (decisão do Murilo,
// 13/11: "Faça uma cópia local das logos obtidas na Wikipédia. Para que o
// jogo funcione offline"). Origem de cada arquivo em
// docs/carreira-v2/serie-d/escudos_origem.json. Sem arquivo, monograma.
const ESCUDO = Object.fromEntries(cat.clubes.map((c) => {
  const ext = ["svg", "png"].find((e) => fs.existsSync(path.join(ROOT, `public/img/teams/${c.id}.${e}`)));
  return [c.id, ext ? `img/teams/${c.id}.${ext}` : null];
}).filter(([, v]) => v));

function conferir() {
  const erros = [];
  const ids = cat.clubes.map((c) => c.id);
  if (ids.length !== 40) erros.push(`esperava 40 clubes, veio ${ids.length}`);
  if (new Set(ids).size !== ids.length) erros.push("ids repetidos no catálogo");
  ids.forEach((id) => { if (!EXTRA[id]) erros.push(`sem sigla/cores/força: ${id}`); });
  Object.keys(EXTRA).forEach((id) => { if (!ids.includes(id)) erros.push(`extra de clube fora do catálogo: ${id}`); });
  const siglas = Object.values(EXTRA).map((e) => e[0]);
  if (new Set(siglas).size !== siglas.length) erros.push("siglas repetidas");
  Object.entries(ESCUDO).forEach(([id, arq]) => { if (/^https?:/.test(arq)) erros.push(`escudo de ${id} precisa ser local (offline)`); });
  return erros;
}

function bloco() {
  const linhas = cat.clubes.map((c) => {
    const [short, c1, c2, atk, def] = EXTRA[c.id];
    const o = {
      id: c.id, name: c.nome_exibicao, short, uf: c.uf, cidade: c.cidade_clube, c1, c2, atk, def,
      venue: { name: c.estadio_mando, city: c.cidade_mando },
      logo: ESCUDO[c.id] || null, escudo: ESCUDO[c.id] ? "local" : "provisorio",
      ...(NO_JOGO[c.id] ? { noJogo: NO_JOGO[c.id] } : {}),
    };
    return "  " + JSON.stringify(o).replace(/"(\w+)":/g, "$1: ") + ",";
  });
  return [
    "/* SERIED-001 (13/11/2026) — catálogo da Série D (40 participantes da edição",
    "   2026), gerado por scripts/serie_d_catalogo.js a partir de",
    "   docs/carreira-v2/serie-d/serie_d_40_clubes.json (fonte: CBF, em cada",
    "   registro do JSON). Elencos fictícios. Sigla e cores \"a validar\";",
    "   atk/def são PARÂMETROS DE JOGO (não dado real). `noJogo`: o clube já está",
    "   no jogo com outro id (Série C) e não entra de novo pela D. Escudo: cópia",
    "   local (`logo`, public/img/teams/; origem em escudos_origem.json); sem ela,",
    "   monograma provisório. */",
    "const CATALOGO_SERIE_D = [",
    ...linhas,
    "];",
    "// A D ativa de uma carreira nova: o catálogo sem quem já está no jogo.",
    "const DEMO_TEAMS_SERIE_D = CATALOGO_SERIE_D.filter((t) => !t.noJogo);",
  ].join("\n");
}

const erros = conferir();
if (erros.length) { console.error(erros.join("\n")); process.exit(1); }
const novo = bloco();
if (process.argv.includes("--gravar")) {
  const p = path.join(ROOT, "public/js/data.js");
  const src = fs.readFileSync(p, "utf8");
  const ini = src.search(/^(\/\* SERIED-001[^]*?\*\/\n)?const CATALOGO_SERIE_D = \[|^const DEMO_TEAMS_SERIE_D = \[/m);
  if (ini < 0) { console.error("bloco da Série D não encontrado em data.js"); process.exit(1); }
  const fimRx = /^const DEMO_TEAMS_SERIE_D = (CATALOGO_SERIE_D\.filter\(.*\);|\[[^]*?^\];)$/m;
  const m = fimRx.exec(src.slice(ini));
  const fim = ini + m.index + m[0].length;
  fs.writeFileSync(p, src.slice(0, ini) + novo + src.slice(fim));
  // Service worker: os escudos locais entram no pré-carregamento (offline).
  const swp = path.join(ROOT, "public/sw.js");
  const sw = fs.readFileSync(swp, "utf8");
  const a = "/*__ESCUDOS_SERIE_D__*/", b = "/*__FIM_ESCUDOS_SERIE_D__*/";
  const lista = Object.values(ESCUDO).sort().map((arq) => `  "/${arq}",`).join("\n");
  fs.writeFileSync(swp, sw.slice(0, sw.indexOf(a) + a.length) + "\n" + lista + "\n  " + sw.slice(sw.indexOf(b)));
  console.log("data.js atualizado:", cat.clubes.length, "clubes no catálogo,", cat.clubes.filter((c) => !NO_JOGO[c.id]).length, "na D ativa.");
} else console.log(novo.split("\n").slice(0, 12).join("\n"), "\n…\nok: catálogo conferido");
module.exports = { conferir, NO_JOGO, EXTRA };
