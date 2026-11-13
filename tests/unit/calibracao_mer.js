// FASE1-MER (MER-06, CLAUDE.md seção 30): calibração da negociação.
// Cria carreiras de verdade (data.js + motor, sem página, como a v2) em
// várias divisões e clubes, e passa as decisões do motor por todos os
// jogadores de outros clubes, numa grade de ofertas:
//   - clube vendedor: valor oferecido / valor de mercado;
//   - atleta: salário oferecido / atual x papel prometido;
//   - empréstimo de entrada: papel na origem x percentual do salário.
// Mostra as distribuições (proporções, média, mediana e extremos) e confere
// os limites que o desenho promete (ex.: oferta alta não compra o aceite
// sozinha; titular não sai emprestado; mais salário nunca piora a resposta).
// Uso: node tests/unit/calibracao_mer.js [--md arquivo.md]
//   (sai com 1 se um limite falhar; --md grava as tabelas em Markdown)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "../..");
const { criarJanela } = require("../e2e/_tela_falsa");
const { motorCode } = require("../e2e/_motor_vm");

const SEMEAR = (seed) => `(() => { let a = ${seed} >>> 0; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
const BASE = String.raw`
Date.now = () => 1794000000000;
const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
fetch = async function (url, opts) {
  const metodo = (opts && opts.method) || "GET";
  if (url === "/api/auth/me") return resp(200, { authenticated: true, user: { id: "u1", name: "Técnico", createdAt: 1700000000000, onboardingSeen: true, dailyLogin: {}, creditsBR: 0, friendCode: "X1", friends: [] } });
  if (url === "/api/career" && metodo === "GET") return resp(200, { career: null });
  if (url === "/api/career" && metodo === "PUT") return resp(200, { ok: true });
  throw new Error("sem rede");
};`;

const RAZOES = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5];
const SALARIOS = [0.8, 1.0, 1.2, 1.5, 2.0];
const PAPEIS = ["titular", "rotacao", "reserva"];
const PCTS = [50, 75, 100];

const ROTEIRO = (comp, k) => String.raw`(async () => {
  const M = window.BRDATA_MOTOR;
  const P = (await M.v2.abrirMotor()).ponte;
  const e = await P.escolherCompeticao(${JSON.stringify(comp)});
  await P.criarCarreira(e.clubes[${k} % e.clubes.length].id);
  const C = M.estado.carreiraAtual();
  const N = M.negociacao, Mm = M.mercado, S = M.semana;
  const out = { clube: [], atleta: [], emprestimo: [], monotono: 0, casos: 0 };
  for (const [cid, sq] of Object.entries(C.leagueSquads)) {
    const seller = S.marketClub(cid);
    for (const p of sq) {
      if (p.onLoanFromClubId != null) continue;
      const r = Mm.reservaParaProposta(p, seller, { baseValue: p.value, fimDeJanela: false });
      const rng = S.ambiente.rngDaChave("calib:" + p.id);
      for (const z of ${JSON.stringify(RAZOES)}) out.clube.push([z, r.papel, Mm.sellerNegotiationDecision(Math.round(p.value * z), r.reserva, rng).action, r.reserva / p.value]);
      const ctx = N.contextoDoAtleta(p, cid);
      for (const papel of ${JSON.stringify(PAPEIS)}) {
        let ant = null;
        for (const s of ${JSON.stringify(SALARIOS)}) {
          const a = Mm.avaliacaoAtleta(p, { salario: Math.round(p.wage * s), papel, anos: 3 }, ctx);
          out.atleta.push([s, papel, a.decisao, ctx.divisaoAtual === ctx.divisaoComprador ? "mesma" : ctx.divisaoAtual > ctx.divisaoComprador ? "sobe" : "desce", a.salarioPedido ? a.salarioPedido / p.wage : null]);
          const nota = { recusa: 0, pede: 1, aceita: 2 }[a.decisao];
          out.casos++; if (ant != null && nota < ant) out.monotono++;
          ant = nota;
        }
      }
      for (const pct of ${JSON.stringify(PCTS)}) {
        const a = N.avaliarPedidoDeEmprestimo(cid, p, "temporada", pct);
        out.emprestimo.push([pct, Mm.papelNoElenco(p, S.leagueSquadFor(cid)), a.decisao, p.age]);
      }
    }
  }
  return JSON.stringify(out);
})()`;

(async () => {
  const dataSrc = fs.readFileSync(path.join(ROOT, "public/js/data.js"), "utf8");
  const motor = motorCode();
  const tudo = { clube: [], atleta: [], emprestimo: [], monotono: 0, casos: 0 };
  const carreiras = [["brasileirao", 0], ["brasileirao", 7], ["brasileirao", 15], ["serie_b", 3], ["serie_b", 12], ["serie_c", 5]];
  for (const [i, [comp, k]] of carreiras.entries()) {
    const { win } = criarJanela({ base: "http://127.0.0.1:9" });
    win.console = { log() {}, warn() {}, error() {}, info() {} };
    const ctx = vm.createContext(win);
    const rodar = (c, f) => vm.runInContext(c, ctx, { filename: f });
    rodar(SEMEAR(5100 + i), "semente"); rodar(BASE, "base");
    rodar("window.BRDATA_MOTOR = {};\n" + motor, "motor"); rodar(dataSrc, "data.js");
    const r = JSON.parse(await rodar(ROTEIRO(comp, k), "roteiro"));
    for (const key of ["clube", "atleta", "emprestimo"]) tudo[key].push(...r[key]);
    tudo.monotono += r.monotono; tudo.casos += r.casos;
  }

  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "—");
  const md = [];
  const tabela = (titulo, cab, linhas) => { md.push(`### ${titulo}`, "", `| ${cab.join(" | ")} |`, `|${cab.map(() => "---").join("|")}|`, ...linhas.map((l) => `| ${l.join(" | ")} |`), ""); };
  const dist = (lista, chave, val, cats) => {
    const grupos = new Map();
    lista.forEach((x) => { const k = chave(x); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(val(x)); });
    return [...grupos.entries()].map(([k, vs]) => [k, vs.length, ...cats.map((c) => pct(vs.filter((v) => v === c).length, vs.length))]);
  };
  const stats = (vs) => { const s = [...vs].sort((a, b) => a - b); const m = s.reduce((a, b) => a + b, 0) / s.length; return { media: m.toFixed(2), mediana: s[Math.floor(s.length / 2)].toFixed(2), min: s[0].toFixed(2), max: s[s.length - 1].toFixed(2) }; };

  md.push(`Base: ${carreiras.length} carreiras (Séries A, B e C, clubes diferentes), ${tudo.clube.length / RAZOES.length} jogadores de outros clubes no total.`, "");
  tabela("Clube vendedor: resposta por valor oferecido / valor de mercado", ["Oferta / valor", "Casos", "Aceita", "Contrapõe", "Recusa"],
    dist(tudo.clube, (x) => x[0].toFixed(1), (x) => x[2], ["accept", "counter", "reject"]).sort((a, b) => a[0] - b[0]));
  tabela("Clube vendedor: resposta por papel do jogador no elenco dele (todas as ofertas)", ["Papel", "Casos", "Aceita", "Contrapõe", "Recusa"],
    dist(tudo.clube, (x) => x[1], (x) => x[2], ["accept", "counter", "reject"]));
  const res = {}; PAPEIS.forEach((p) => { const vs = tudo.clube.filter((x) => x[1] === p && x[0] === 1).map((x) => x[3]); if (vs.length) res[p] = stats(vs); });
  tabela("Reserva do vendedor / valor de mercado", ["Papel", "Média", "Mediana", "Mín.", "Máx."], Object.entries(res).map(([k, s]) => [k, s.media, s.mediana, s.min, s.max]));
  tabela("Atleta: resposta por salário oferecido / atual e papel prometido", ["Salário / atual", "Papel", "Casos", "Aceita", "Pede mais", "Recusa"],
    dist(tudo.atleta, (x) => `${x[0].toFixed(1)} | ${x[1]}`, (x) => x[2], ["aceita", "pede", "recusa"]).map(([k, ...r]) => [...k.split(" | "), ...r]));
  tabela("Atleta: resposta por mudança de divisão (todas as ofertas)", ["Divisão", "Casos", "Aceita", "Pede mais", "Recusa"],
    dist(tudo.atleta, (x) => x[3], (x) => x[2], ["aceita", "pede", "recusa"]));
  const pedidos = tudo.atleta.filter((x) => x[4]).map((x) => x[4]);
  if (pedidos.length) { const s = stats(pedidos); tabela("Salário pedido / atual (quando ele pede mais)", ["Casos", "Média", "Mediana", "Mín.", "Máx."], [[pedidos.length, s.media, s.mediana, s.min, s.max]]); }
  tabela("Empréstimo de entrada: resposta por papel na origem e percentual do salário", ["Papel na origem", "% do salário", "Casos", "Aceita", "Contrapõe", "Recusa"],
    dist(tudo.emprestimo, (x) => `${x[1]} | ${x[0]}`, (x) => x[2], ["aceita", "contra", "recusa"]).map(([k, ...r]) => [...k.split(" | "), ...r]));

  // Limites prometidos pelo desenho.
  const falhas = [];
  const fr = (lista, f, d) => lista.filter(f).length / Math.max(1, lista.filter(d).length);
  const altaRecusada = fr(tudo.atleta, (x) => x[0] === 0.8 && x[1] === "reserva" && x[2] === "aceita", (x) => x[0] === 0.8 && x[1] === "reserva");
  if (altaRecusada > 0.5) falhas.push(`salário 20% menor como reserva é aceito em ${pct(altaRecusada * 100, 100)} dos casos (esperado: minoria)`);
  const abaixo = tudo.atleta.filter((x) => x[4] != null && x[4] <= x[0]).length;
  if (abaixo) falhas.push(`${abaixo} pedidos de salário iguais ou abaixo do oferecido`);
  if (tudo.monotono) falhas.push(`${tudo.monotono} casos em que mais salário piorou a resposta do atleta`);
  const titularEmp = tudo.emprestimo.filter((x) => x[1] === "titular" && x[2] !== "recusa").length;
  if (titularEmp) falhas.push(`${titularEmp} empréstimos de titular da origem não recusados`);
  const baixa = fr(tudo.clube, (x) => x[0] === 0.6 && x[2] === "reject", (x) => x[0] === 0.6);
  if (baixa < 0.95) falhas.push(`oferta de 60% do valor recusada só em ${pct(baixa * 100, 100)} dos casos`);
  const alta = fr(tudo.clube, (x) => x[0] === 1.5 && x[2] === "accept", (x) => x[0] === 1.5);
  if (alta < 0.95) falhas.push(`oferta de 150% do valor aceita só em ${pct(alta * 100, 100)} dos casos`);
  const generosa = fr(tudo.atleta, (x) => x[0] === 2 && x[1] === "titular" && x[2] === "aceita", (x) => x[0] === 2 && x[1] === "titular");
  if (generosa < 0.9) falhas.push(`dobro do salário como titular aceito só em ${pct(generosa * 100, 100)} dos casos`);
  md.push("### Limites conferidos", "", ...(falhas.length ? falhas.map((f) => `- FALHOU: ${f}`) : ["- Oferta de 60% do valor: o clube recusa (≥ 95%).", "- Oferta de 150% do valor: o clube aceita (≥ 95%).", "- Dobro do salário como titular: o atleta aceita (≥ 90%).", "- Salário 20% menor como reserva: a maioria não aceita de cara.", `- Mais salário nunca piora a resposta do atleta (${tudo.casos} sequências).`, "- O salário pedido fica sempre acima do oferecido.", "- Titular do clube de origem nunca sai emprestado."]), "");

  const texto = md.join("\n");
  console.log(texto);
  const i = process.argv.indexOf("--md");
  if (i > 0) fs.writeFileSync(process.argv[i + 1], texto + "\n");
  process.exit(falhas.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
