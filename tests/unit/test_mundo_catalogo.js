// MUNDO-001, etapa M1 (24/11/2026): o catálogo do mundo gravado pelo
// scripts/mundo_catalogo.js está íntegro. Confere, sem rede e sem navegador:
//   1) 10 países, 20 ligas, e cada liga com o número de clubes do regulamento;
//   2) IDs de clube únicos no mundo (ligas e 3ª divisão) e sem colisão com o Brasil;
//   3) snapshot de cada liga = clubes do índice, todos com escudo local existente;
//   4) todo clube com pelo menos 22 jogadores (11 titulares + 11 reservas) e 2
//      goleiros; atleta sem repetição no mundo pelo id de origem (MUN-03);
//   5) jogos de fase fixa: só clubes da liga, data válida, e cada clube com o
//      mesmo número de jogos por fase (o do regulamento nas europeias);
//   6) clube B aponta para um clube pai existente;
//   7) o índice guarda a versão do próprio conteúdo;
//   8) o servidor (server/src/mundo.js) serve índice e elencos e respeita a chave.
// Uso: node tests/unit/test_mundo_catalogo.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ROOT = path.resolve(__dirname, "../..");
const SNAP = path.join(ROOT, "server/frozen-catalog");
const mundo = JSON.parse(fs.readFileSync(path.join(SNAP, "mundo/mundo.json"), "utf8"));

let n = 0, failed = 0;
function check(name, fn) {
  n++;
  try { fn(); console.log(`${n}) ${name}: true`); }
  catch (e) { failed++; console.log(`${n}) ${name}: false\n   ${e.message.split("\n").slice(0, 8).join("\n   ")}`); }
}
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg}: esperado ${b}, veio ${a}`); }

const ligas = Object.values(mundo.competicoes);
const snaps = Object.fromEntries(ligas.map((l) => [l.id, JSON.parse(fs.readFileSync(path.join(SNAP, `snapshot-${l.id}.json`), "utf8"))]));
const clubesDaLiga = (id) => mundo.clubes.filter((c) => c.liga === id);

check("10 países, 20 ligas, clubes por liga = regulamento", () => {
  eq(mundo.paises.length, 10, "países");
  eq(ligas.length, 20, "ligas");
  for (const p of mundo.paises) eq(p.ligas.length, 2, `ligas de ${p.codigo}`);
  for (const l of ligas) eq(clubesDaLiga(l.id).length, l.clubes, `clubes de ${l.id}`);
  eq(mundo.clubes.length, 390, "clubes jogáveis");
});

check("IDs únicos no mundo e sem colisão com o Brasil", () => {
  const todos = [...mundo.clubes, ...mundo.terceira].map((c) => c.id);
  eq(new Set(todos).size, todos.length, "ids repetidos");
  const brasil = new Set();
  for (const id of ["brasileirao", "serie_b", "serie_c"]) {
    JSON.parse(fs.readFileSync(path.join(SNAP, `snapshot-${id}.json`), "utf8")).teams.forEach((t) => brasil.add(Number(t.id)));
  }
  const colisao = todos.filter((id) => brasil.has(id));
  eq(colisao.length, 0, `colisão com o Brasil (${colisao.join(",")})`);
  for (const id of todos) if (!(id >= 800000000 && id < 870000000)) throw new Error(`id fora da faixa do mundo: ${id}`);
});

check("snapshot de cada liga = clubes do índice, com escudo local existente", () => {
  for (const l of ligas) {
    const s = snaps[l.id];
    const a = s.teams.map((t) => t.id).sort().join(",");
    const b = clubesDaLiga(l.id).map((c) => c.id).sort().join(",");
    eq(a, b, `times do snapshot ${l.id}`);
    for (const t of s.teams) {
      if (!t.localLogo) throw new Error(`${t.name} sem escudo local`);
      if (!fs.existsSync(path.join(ROOT, "public", t.localLogo))) throw new Error(`escudo ausente: ${t.localLogo}`);
    }
  }
  for (const c of mundo.terceira) {
    if (c.escudo && !fs.existsSync(path.join(ROOT, "public", c.escudo))) throw new Error(`escudo ausente: ${c.escudo}`);
  }
});

check("cada clube com 22+ jogadores e 2+ goleiros; atleta sem repetição pelo id de origem", () => {
  const origem = new Map();
  for (const l of ligas) {
    for (const t of snaps[l.id].teams) {
      const ps = snaps[l.id].playersByTeamId[String(t.id)] || [];
      if (ps.length < 22) throw new Error(`${t.name} (${l.id}) com ${ps.length} jogadores`);
      const gk = ps.filter((p) => /goal/i.test(p.position || "")).length;
      if (gk < 2) throw new Error(`${t.name} (${l.id}) com ${gk} goleiros`);
      for (const p of ps) {
        // O id é "<origem>" ou "<origem>_<sufixo do clube>" (vínculo duplicado).
        const m = String(p.id).match(/^([a-z]+_[^_]+)(?:_[0-9a-f]{8})?$/);
        const chave = m ? m[1] : String(p.id);
        if (origem.has(chave)) throw new Error(`atleta ${p.name} (${chave}) em ${origem.get(chave)} e ${t.name}`);
        origem.set(chave, t.name);
      }
    }
  }
});

check("jogos de fase fixa: clubes da liga, data válida, mesmo número de jogos por fase", () => {
  for (const l of ligas) {
    const jogos = mundo.partidas[l.id] || [];
    if (!jogos.length) throw new Error(`${l.id} sem jogos`);
    const ids = new Set(clubesDaLiga(l.id).map((c) => c.id));
    const porFase = {};
    for (const [fase, rodada, data, casa, fora] of jogos) {
      if (!ids.has(casa) || !ids.has(fora)) throw new Error(`${l.id}: jogo com clube de fora (${casa} x ${fora})`);
      if (casa === fora) throw new Error(`${l.id}: clube contra ele mesmo`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(Date.parse(data))) throw new Error(`${l.id}: data inválida ${data}`);
      if (!Number.isInteger(rodada)) throw new Error(`${l.id}: rodada inválida ${rodada}`);
      const f = (porFase[fase] ||= {});
      f[casa] = (f[casa] || 0) + 1;
      f[fora] = (f[fora] || 0) + 1;
    }
    for (const [fase, cont] of Object.entries(porFase)) {
      const valores = new Set(Object.values(cont));
      if (Object.keys(cont).length !== ids.size) throw new Error(`${l.id}/${fase}: ${Object.keys(cont).length} de ${ids.size} clubes jogam`);
      if (valores.size !== 1) throw new Error(`${l.id}/${fase}: jogos por clube diferentes (${[...valores].join(",")})`);
    }
    if (l.regiao === "europa") {
      eq(Object.values(porFase["Fase Regular"])[0], l.rodadas, `jogos por clube em ${l.id}`);
      eq(l.rodadas, 2 * (l.clubes - 1), `rodadas de ${l.id}`);
    }
  }
});

check("clube B aponta para um clube pai existente", () => {
  const todos = new Set([...mundo.clubes, ...mundo.terceira].map((c) => c.id));
  const comPai = [...mundo.clubes, ...mundo.terceira].filter((c) => c.clubePaiCatalogo);
  if (comPai.length < 4) throw new Error(`esperava clubes B (Espanha, Equador), veio ${comPai.length}`);
  for (const c of comPai) if (!todos.has(c.clubePai)) throw new Error(`${c.nome}: pai ${c.clubePaiCatalogo} fora do catálogo`);
  for (const c of mundo.clubes.filter((x) => x.clubePaiCatalogo)) if (!c.reserva) throw new Error(`${c.nome}: clube B sem marca de reserva`);
});

check("copas da CONMEBOL: 60 clubes andinos (16+12+18+14), ids próprios, força estimada e elenco de 22+ com 2 goleiros", () => {
  const c = mundo.copas.conmebol;
  const por = {};
  for (const x of c.clubes) por[x.assoc] = (por[x.assoc] || 0) + 1;
  eq(JSON.stringify(por), JSON.stringify({ BOL: 16, PAR: 12, PER: 18, VEN: 14 }), "clubes por associação");
  const todos = new Set([...mundo.clubes, ...mundo.terceira].map((x) => x.id));
  for (const x of c.clubes) {
    if (!(x.id > 870000000 && x.id < 880000000) || todos.has(x.id)) throw new Error(`id andino inválido: ${x.id}`);
    if (!(x.atk > 0 && x.def > 0) || !x.forcaEstimada) throw new Error(`${x.nome} sem força estimada`);
  }
  eq(new Set(c.clubes.map((x) => x.id)).size, 60, "ids repetidos");
  const s = JSON.parse(fs.readFileSync(path.join(SNAP, "snapshot-conmebol_andinos.json"), "utf8"));
  for (const x of c.clubes) {
    const ps = s.playersByTeamId[String(x.id)] || [];
    if (ps.length < 22 || ps.filter((p) => /goal/i.test(p.position)).length < 2) throw new Error(`${x.nome}: elenco incompleto`);
  }
  for (const k of ["BRA", "PAR", "PER", "BOL", "VEN"]) if (!(c.niveis[k] > 0)) throw new Error(`sem nível para ${k}`);
});

check("o índice guarda a versão do próprio conteúdo", () => {
  const { versao, ...resto } = mundo;
  eq(crypto.createHash("sha256").update(JSON.stringify(resto)).digest("hex").slice(0, 16), versao, "versão");
});

check("servidor: índice com versão, elencos por liga, liga desconhecida e chave desligada", () => {
  const { criarMundo, mundoAtivo } = require(path.join(ROOT, "server/src/mundo.js"));
  const srv = criarMundo();
  eq(srv.indice().versao, mundo.versao, "versão do índice");
  eq(JSON.stringify(srv.indice(mundo.versao)), JSON.stringify({ versao: mundo.versao, atual: true }), "cliente já atualizado");
  const e = srv.elencos("arg_liga_profesional");
  eq(Object.keys(e.playersByTeamId).length, 30, "elencos da Liga Profesional");
  eq(Object.keys(srv.elencos("brasileirao").playersByTeamId).length, 20, "elencos do Brasil (mercado do mundo, M8)");
  eq(Object.keys(srv.elencos("conmebol_andinos").playersByTeamId).length, 60, "elencos andinos (copas, M9b)");
  eq(srv.elencos("serie_d"), null, "liga fora do mundo");
  eq(srv.elencos("__proto__"), null, "nome reservado");
  eq(mundoAtivo({}), false, "sem a variável");
  eq(mundoAtivo({ MUNDO_ATIVO: "true" }), true, "com a variável");
});

console.log(`\n${n - failed}/${n} ok`);
if (failed) process.exit(1);
