// ECON-001, Entrega 2: antes (regra de sempre) x depois (economia v2) na
// criação da carreira, por perfil: folha, teto, caixa, TV e despesas do mês,
// o maior salário e o maior valor do elenco, e a distribuição de valores dos
// elencos do save (faixas da FIFA). Sob demanda (fora das suítes). Escreve
// docs/economia/03_Mercado_E2.md (o texto fixo das decisões fica no fim).
// Uso: node tests/sim/economia_mercado.js
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "../..");
globalThis.window = globalThis;
const imp = (m) => import(pathToFileURL(path.join(ROOT, "public/js/motor", m)).href);

(async () => {
  require("vm").runInThisContext(fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8"));
  const v2 = await imp("v2.js"), semana = await imp("semana.js"), CMu = await imp("carreiramundo.js"), fin = await imp("financas.js"), E = await imp("economia.js"), estado = await imp("estado.js"), ponteMod = await imp("ponte.js"), temporada = await imp("temporada.js"), texto = await imp("texto.js");
  const indice = JSON.parse(fs.readFileSync(path.join(ROOT, "server/frozen-catalog/mundo/mundo.json"), "utf8"));
  const el = async (l) => JSON.parse(fs.readFileSync(path.join(ROOT, `server/frozen-catalog/snapshot-${l}.json`), "utf8")).playersByTeamId;
  const fetchAntes = globalThis.fetch;
  const criar = async (perfil) => {
    estado.definirCarreira(null); CMu.definirIndiceDoMundo(null);
    if (perfil.brasil) {
      globalThis.fetch = async () => { throw new Error("sem rede"); };
      semana.definirAmbiente({ ...v2.ambienteSemPagina(), indiceDoMundo: async () => indice, armazem: { pedir: async (u, o) => (o && o.body ? { ok: true } : {}) } });
      const P = v2.criarPonte(); ponteMod.ponte.pronta = true;
      const comp = await P.escolherCompeticao("brasileirao");
      await P.criarCarreira(comp.clubes.find((c) => perfil.re.test(c.nome)).id);
      globalThis.fetch = fetchAntes;
      return estado.carreiraAtual();
    }
    semana.definirAmbiente({ ...v2.ambienteSemPagina(), buscarJogadores: async () => [] });
    return CMu.criarCarreiraNoMundo({ indice, liga: perfil.liga, clubId: indice.clubes.find((c) => c.liga === perfil.liga && perfil.re.test(c.nome)).id, elencosDaLiga: el });
  };
  const medir = (C) => {
    const pr = C.squad.filter((p) => p.origin === "principal");
    const todos = Object.values(C.leagueSquads).flat().concat(pr);
    const d = E.distribuicaoDePrecos(todos.map((p) => p.value));
    const tv = C.economia ? C.economia.clube.tvMensal : C.calendar.tvMonthly;
    return { folha: fin.wageBill(C.squad), teto: C.finances.wageCap, caixa: C.finances.cash, tv, desp: C.economia ? C.economia.clube.despesasMensais : 0,
      patrocinio: fin.sponsorshipSeasonTotal(C.sponsorship), maiorSalario: Math.max(...pr.map((p) => p.wage)), maiorValor: Math.max(...pr.map((p) => p.value)), d };
  };
  const perfis = [
    { rotulo: "Arsenal (Premier League)", liga: "premier_league", re: /^Arsenal/ },
    { rotulo: "Southampton (Championship)", liga: "efl_championship", re: /^Southampton/ },
    { rotulo: "Real Madrid (LaLiga)", liga: "la_liga", re: /^Real Madrid/ },
    { rotulo: "River Plate (Argentina)", liga: "arg_liga_profesional", re: /^River/ },
    { rotulo: "Peñarol (Uruguai)", liga: "uru_primera", re: /Peñarol/ },
    { rotulo: "Barcelona SC (Equador)", liga: "ecu_ligapro_a", re: /Barcelona SC/ },
    { rotulo: "Flamengo (Brasil, modo exemplo)", brasil: true, re: /Flamengo/ },
    { rotulo: "Mirassol (Brasil, modo exemplo)", brasil: true, re: /Mirassol/ },
  ];
  const M = (v) => (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const P = (x) => `${Math.round(x * 100)}%`;
  let md = `# ECON-001 · Entrega 2 · Mercado: antes e depois\n\nGerado por \`tests/sim/economia_mercado.js\` (criação da carreira, sem jogar). "Antes" = a regra de sempre (economia v1, carreiras de hoje); "depois" = economia v${E.VERSAO_ECONOMIA} (carreiras novas). R$ milhões; folha, teto, TV e despesas por mês; patrocínio por temporada. No Brasil, o modo exemplo (sem rede) usa elencos fictícios.\n\n`;
  md += `| Perfil | | Folha | Teto | Caixa | TV/mês | Despesas/mês | Patrocínio | Maior salário | Maior valor | Elencos ≤ US$ 1 mi | > US$ 20 mi |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
  for (const p of perfis) {
    for (const [nome, ativa] of [["antes", false], ["depois", true]]) {
      E.ECONOMIA_V2.ativa = ativa;
      const m = medir(await criar(p));
      md += `| ${nome === "antes" ? p.rotulo : ""} | ${nome} | ${M(m.folha)} | ${M(m.teto)} | ${M(m.caixa)} | ${M(m.tv)} | ${M(m.desp)} | ${M(m.patrocinio)} | ${M(m.maiorSalario)} | ${M(m.maiorValor)} | ${P(m.d.ate1mi)} | ${P(m.d.acima20mi)} |\n`;
    }
  }
  E.ECONOMIA_V2.ativa = true;
  texto.definirMoeda(null);
  // Negócios de referência (o valor do motor para um perfil parecido).
  // O valor do motor com a demanda do comprador (a reserva do vendedor parte dele).
  const valor = (C, id, ov, idade, pot, comprador = null) => temporada.computeContractFields(ov, idade, pot, () => 0.5, 2026, E.escalaDe(C, id)).value * (comprador ? E.fatorDeDemanda(C, comprador, id) : 1);
  const ref = [];
  const pl = await criar(perfis[0]);
  const topoPl = Math.max(...Object.values(pl.leagueSquads).flat().map((p) => p.overall));
  const idDe = (liga, re) => String(indice.clubes.find((c) => c.liga === liga && re.test(c.nome)).id);
  ref.push(["Isak (Newcastle → Liverpool)", "£ 125 mi", valor(pl, idDe("premier_league", /Newcastle/), topoPl - 1, 25, topoPl + 2, idDe("premier_league", /Liverpool/)) / 7, "£", `Newcastle, overall ${topoPl - 1}, 25 anos`]);
  ref.push(["Paquetá (West Ham → Flamengo)", "€ 42 mi", valor(pl, idDe("premier_league", /Crystal Palace/), topoPl - 6, 28, topoPl - 5) / 6, "€", `clube de meio da Premier League, overall ${topoPl - 6}, 28 anos`]);
  const riv = await criar(perfis[3]);
  const rivEco = riv.economia;
  // Comprador de fora do save do River: a escala de valor do Real Madrid (a do save da LaLiga).
  const rm = await criar(perfis[2]);
  const escRm = rm.economia.escalas[String(rm.clubId)][1], escRiv = rivEco.escalas[String(riv.clubId)][1];
  const demRm = Math.max(1, Math.min(E.DEMANDA.teto, (escRm / escRiv) ** E.DEMANDA.expoente));
  ref.push(["Mastantuono (River → Real Madrid)", "€ 45 mi (cláusula)", valor(riv, riv.clubId, 74, 18, 86) * demRm / 6, "€", `River, overall 74, 18 anos, potencial 86; demanda do Real Madrid ×${demRm.toFixed(2)}`]);
  const pen = await criar(perfis[4]);
  ref.push(["Leo Fernández (Peñarol, 80%)", "US$ 7 mi", valor(pen, pen.clubId, 74, 25, 77) / 5.5, "US$", "Peñarol, overall 74, 25 anos"]);
  md += `\n## Negócios de referência (plausibilidade)\n\n| Negócio | Valor real | Motor | Perfil usado |\n|---|---:|---:|---|\n`;
  for (const [n, real, v, moeda, perfil] of ref) md += `| ${n} | ${real} | ${moeda} ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi | ${perfil} |\n`;
  const fixo = fs.readFileSync(path.join(__dirname, "economia_mercado_decisoes.md"), "utf8");
  fs.writeFileSync(path.join(ROOT, "docs/economia/03_Mercado_E2.md"), md + "\n" + fixo);
  console.log(md);
})().catch((e) => { console.error(e); process.exit(1); });
