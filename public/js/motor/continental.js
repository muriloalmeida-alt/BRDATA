/* ===================================================================
   MOTOR — COPAS CONTINENTAIS DA CONMEBOL (MUNDO-001, M9a, 25/11/2026)
   -------------------------------------------------------------------
   Libertadores e Sul-Americana de uma edição, pelo regulamento do pacote
   continental (config/competicoes.json, calendarios.json, premiacao.json;
   texto em docs/mundo/pacotes/continentais/). As duas copas andam juntas
   porque trocam clubes: os 4 derrotados da fase 3 da Libertadores vão aos
   grupos da Sul-Americana; os 8 terceiros dos grupos, ao playoff dela.

   Módulo puro e serializável (o "plano" da edição vai no save), como os
   formatos sul-americanos (formatos.js):
   - montarEdicao: participantes por vaga (já classificados pelas ligas do
     save, M9b), ranking (coeficiente) e associação de cada clube, ano;
   - jogosPendentes(plano, ate) / registrarJogo(plano, id, placar, sim):
     os jogos com data, fase a fase; as fases seguintes (sorteios,
     transferências, mata-mata) são criadas quando a anterior acaba;
   - premios: os créditos de premiação (USD do pacote), cada um com uma
     chave única (jogo ou fase, clube e tipo): reprocessar não duplica.

   Sorteios com seed (a chave da edição); grupo sem dois clubes da mesma
   associação (na Libertadores, exceto o que vem da fase 3), resolvido por
   busca com volta (a escolha gulosa pode travar as últimas vagas).
=================================================================== */
import { classificar, rngDaChave } from "./desempate.js";
import { decidirConfronto, mandanteDaPerna, RESOLUCOES as R } from "./fases.js";
import * as Rel from "./relogio.js";

const S = (x) => String(x);
const PERFIL_GRUPO = ["headToHeadPoints", "headToHeadGoalDifference", "headToHeadGoalsFor", "goalDifference", "goalsFor", "drawLots"];
const DESEMPATE_DUELO = [R.PONTOS, R.AGREGADO, R.PENALTIS];
const DESEMPATE_FINAL = [R.AGREGADO, R.PRORROGACAO, R.PENALTIS];
const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ---------- calendário ----------
// Data de jogo de uma janela do pacote ([início, fim]) na edição do ano: a
// mesma semana `ano - edicaoDoPacote` anos depois; dentro da semana, o 1º
// dia da janela curta (até 3 dias) ou a quarta-feira da janela de semana.
export function dataNaEdicao(janela, ano, anoDoPacote) {
  const [ini, fim] = janela;
  const dias = Math.round((Date.parse(fim) - Date.parse(ini)) / 86400000);
  const semana = Rel.segundaDe(ini);
  const desloc = Math.round((Date.parse(ini) - Date.parse(semana)) / 86400000);
  const dia = dias <= 3 ? desloc : 2; // quarta
  const nova = Rel.mesmaSemanaAnos(semana, ano - anoDoPacote);
  return new Date(Date.parse(nova) + dia * 86400000).toISOString().slice(0, 10);
}

// ---------- sorteios ----------
function embaralhar(lista, rng) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
  return a;
}

// Grupos: um clube de cada pote em cada grupo; `pode(id, grupo)` diz se o
// clube cabe no grupo (associação). Busca com volta, ordem por sorteio.
export function sortearGrupos(potes, pode, rng, nGrupos = 8) {
  const grupos = Array.from({ length: nGrupos }, () => []);
  const ordem = potes.map((p) => embaralhar(p, rng));
  const fila = ordem.flatMap((p, iPote) => p.map((id) => ({ id, iPote })));
  const ordemGrupos = Array.from({ length: fila.length }, () => embaralhar([...Array(nGrupos).keys()], rng));
  function colocar(k) {
    if (k === fila.length) return true;
    const { id, iPote } = fila[k];
    for (const g of ordemGrupos[k]) {
      if (grupos[g].length !== iPote) continue; // um por pote, na ordem
      if (!pode(id, grupos[g])) continue;
      grupos[g].push(id);
      if (colocar(k + 1)) return true;
      grupos[g].pop();
    }
    return false;
  }
  if (!colocar(0)) throw new Error("continental: sorteio de grupos impossível com as restrições");
  return grupos;
}

// Pares entre dois potes (o do pote 1 é o "a"), sem a mesma associação
// quando `evitar` (busca com volta).
function sortearPares(pote1, pote2, assoc, evitar, rng) {
  const a = embaralhar(pote1, rng), b = embaralhar(pote2, rng);
  const usado = new Set();
  const pares = [];
  function par(i) {
    if (i === a.length) return true;
    for (const y of b) {
      if (usado.has(y)) continue;
      if (evitar && assoc[S(a[i])] && assoc[S(a[i])] === assoc[S(y)]) continue;
      usado.add(y); pares.push([a[i], y]);
      if (par(i + 1)) return true;
      usado.delete(y); pares.pop();
    }
    return false;
  }
  if (!par(0)) { // sem solução com a restrição: sem ela
    usado.clear(); pares.length = 0;
    a.forEach((x, i) => pares.push([x, b[i]]));
  }
  return pares;
}

// ---------- plano ----------
// o = { ano, chave, regras: competicoes.json (LIB, SUD), calendario:
//   calendarios.json, premiacao: premiacao.json, participantes: {
//   LIB: { grupos: [ids], fase2: [ids], fase1: [ids] },
//   SUD: { grupos: [ids], primeiraFase: { [assoc]: [4 ids] } } },
//   ranking: { id: posição (1 = melhor) }, associacao: { id: código } }
export function montarEdicao(o) {
  const plano = {
    ano: o.ano, chave: o.chave || `conmebol:${o.ano}`, anoDoPacote: Number(o.regras.LIB.edicao) || 2026,
    regras: { LIB: o.regras.LIB, SUD: o.regras.SUD }, calendario: { LIB: o.calendario.LIB, SUD: o.calendario.SUD },
    premiacao: o.premiacao, participantes: o.participantes, ranking: o.ranking, associacao: o.associacao,
    jogos: [], confrontos: [], grupos: {}, marcos: {}, premios: [], resultado: null,
  };
  // Libertadores, fase 1: pote 1 = os 3 de melhor ranking (decidem em casa).
  const f1 = ordenarPorRanking(plano, o.participantes.LIB.fase1);
  const pares1 = sortearPares(f1.slice(0, 3), f1.slice(3), plano.associacao, false, rngDaChave(`${plano.chave}:LIB:f1`));
  criarDuelos(plano, "LIB", "fase_1", pares1.map(([x, y]) => [x, y]), plano.calendario.LIB.fase_1);
  // Sul-Americana, 1ª fase: dois duelos nacionais por associação, jogo único.
  const pf = [];
  for (const [cod, ids] of Object.entries(o.participantes.SUD.primeiraFase || {})) {
    const em = embaralhar(ids, rngDaChave(`${plano.chave}:SUD:pf:${cod}`));
    for (let i = 0; i + 1 < em.length; i += 2) pf.push([em[i], em[i + 1]]);
  }
  criarJogoUnico(plano, "SUD", "primeira_fase", pf, plano.calendario.SUD.primeira_fase[0], [R.AGREGADO, R.PENALTIS]);
  return plano;
}

function ordenarPorRanking(plano, ids) {
  return ids.slice().sort((a, b) => (plano.ranking[S(a)] ?? 999) - (plano.ranking[S(b)] ?? 999) || S(a).localeCompare(S(b)));
}

function addJogo(plano, j) {
  const jogo = { id: `${j.copa}:${plano.jogos.length + 1}`, gh: null, ga: null, ...j };
  plano.jogos.push(jogo);
  return jogo;
}

// Duelo de ida e volta: [melhor, pior]; a volta na casa do melhor (`a`).
function criarDuelos(plano, copa, fase, pares, janelas, resolucao = DESEMPATE_DUELO) {
  for (const [a, b] of pares) {
    const c = {
      id: `${copa}:${fase}:${plano.confrontos.length + 1}`, copa, etapa: fase, a, b, pernas: 2, casaIda: b, neutro: false,
      resolucao, sementes: { [a]: plano.ranking[S(a)] ?? 999, [b]: plano.ranking[S(b)] ?? 999 }, pontosRegulares: { [a]: 0, [b]: 0 },
      semanaRel: 0, placares: [], vencedor: null, perdedor: null, como: null, extra: null,
    };
    plano.confrontos.push(c);
    for (let i = 0; i < 2; i++) {
      const casa = mandanteDaPerna(c, i);
      addJogo(plano, { copa, fase, rodada: i + 1, data: dataNaEdicao(janelas[i], plano.ano, plano.anoDoPacote), casa, fora: casa === a ? b : a, conf: c.id, perna: i + 1 });
    }
  }
}
function criarJogoUnico(plano, copa, fase, pares, janela, resolucao, neutro = false) {
  for (const [a, b] of pares) {
    const c = {
      id: `${copa}:${fase}:${plano.confrontos.length + 1}`, copa, etapa: fase, a, b, pernas: 1, casaIda: a, neutro,
      resolucao, sementes: { [a]: plano.ranking[S(a)] ?? 999, [b]: plano.ranking[S(b)] ?? 999 }, pontosRegulares: { [a]: 0, [b]: 0 },
      semanaRel: 0, placares: [], vencedor: null, perdedor: null, como: null, extra: null,
    };
    plano.confrontos.push(c);
    addJogo(plano, { copa, fase, rodada: 1, data: dataNaEdicao(janela, plano.ano, plano.anoDoPacote), casa: a, fora: b, conf: c.id, perna: 1, neutro });
  }
}

const duelos = (plano, copa, fase) => plano.confrontos.filter((c) => c.copa === copa && c.etapa === fase);
const prontos = (plano, copa, fase) => { const d = duelos(plano, copa, fase); return d.length > 0 && d.every((c) => c.vencedor != null); };
const criada = (plano, copa, fase) => plano.jogos.some((j) => j.copa === copa && j.fase === fase);

// ---------- jogar ----------
// Mesma ordem de localeCompare numérico em "<copa>:<n>" (copa e depois o
// número), sem o custo dele (a suíte estourava o tempo no CI).
function ordemDoId(x, y) {
  const i = x.indexOf(":"), k = y.indexOf(":");
  const cx = x.slice(0, i), cy = y.slice(0, k);
  if (cx !== cy) return cx < cy ? -1 : 1;
  return Number(x.slice(i + 1)) - Number(y.slice(k + 1));
}
export function jogosPendentes(plano, ate) {
  return plano.jogos.filter((j) => j.gh == null && (ate == null || j.data <= ate))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0) || ordemDoId(a.id, b.id));
}

// sim = { prorrogacao({ casa, fora, neutro }) -> { gh, ga }, penaltis({ casa, fora }) -> id }
export function registrarJogo(plano, jogoId, placar, sim) {
  const j = plano.jogos.find((x) => x.id === jogoId);
  if (!j) throw new Error(`continental: jogo inexistente ${jogoId}`);
  if (j.gh != null) throw new Error(`continental: jogo já jogado ${jogoId}`);
  j.gh = placar.gh; j.ga = placar.ga;
  premiarJogo(plano, j);
  if (j.conf) {
    const c = plano.confrontos.find((x) => x.id === j.conf);
    c.placares.push({ casa: j.casa, fora: j.fora, gh: j.gh, ga: j.ga });
    if (c.placares.length === c.pernas) { decidirConfronto(c, sim); if (c.extra) j.extra = c.extra; }
  }
  avancar(plano);
  return j;
}

export function concluida(plano) { return plano.resultado != null; }

export function jogarTudo(plano, sim) {
  for (let g = 0; g < 2000 && !concluida(plano); g++) {
    const [j] = jogosPendentes(plano);
    if (!j) throw new Error(`continental: parou (marcos ${Object.keys(plano.marcos).join(",")})`);
    registrarJogo(plano, j.id, sim.jogar(j), sim);
  }
  if (!concluida(plano)) throw new Error("continental: não termina");
  return plano.resultado;
}

// ---------- grupos ----------
function criarGrupos(plano, copa, grupos) {
  const reg = plano.regras[copa].grupos;
  const janelas = plano.calendario[copa].grupos;
  plano.grupos[copa] = Object.fromEntries(grupos.map((ids, g) => [LETRAS[g], ids]));
  grupos.forEach((ids, g) => {
    reg.rodadas_por_posicao.forEach((jogosDaRodada, r) => {
      for (const [pc, pf] of jogosDaRodada) {
        addJogo(plano, { copa, fase: "grupos", grupo: LETRAS[g], rodada: r + 1, data: dataNaEdicao(janelas[r], plano.ano, plano.anoDoPacote), casa: ids[pc - 1], fora: ids[pf - 1] });
      }
    });
  });
}

function tabelaDoGrupo(plano, copa, letra) {
  const ids = plano.grupos[copa][letra];
  const linhas = Object.fromEntries(ids.map((id) => [S(id), { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }]));
  const resultados = [];
  for (const j of plano.jogos) {
    if (j.copa !== copa || j.fase !== "grupos" || j.grupo !== letra || j.gh == null) continue;
    resultados.push({ home: j.casa, away: j.fora, gh: j.gh, ga: j.ga });
    for (const [id, a, b] of [[j.casa, j.gh, j.ga], [j.fora, j.ga, j.gh]]) {
      const L = linhas[S(id)];
      L.j++; L.gp += a; L.gc += b;
      if (a > b) { L.v++; L.pts += 3; } else if (a === b) { L.e++; L.pts++; } else L.d++;
    }
  }
  return classificar(Object.values(linhas), { perfil: PERFIL_GRUPO, resultados, chaveSorteio: `${plano.chave}:${copa}:${letra}` }).ordem;
}

// Ordem de performance de uma posição entre os grupos (pontos, saldo, gols, sorteio).
function ordemDePerformance(plano, linhas, rotulo) {
  return classificar(linhas.map((l) => ({ ...l })), { perfil: ["goalDifference", "goalsFor", "drawLots"], chaveSorteio: `${plano.chave}:${rotulo}` }).ordem.map((l) => l.id);
}

// ---------- avanço (cria as fases seguintes) ----------
function avancar(plano) {
  if (plano.resultado) return;
  const M = plano.marcos;
  const assoc = plano.associacao;

  // Libertadores: fase 2 (13 diretos + 3 da fase 1), pote 1 = 8 de melhor ranking.
  if (prontos(plano, "LIB", "fase_1") && !criada(plano, "LIB", "fase_2")) {
    const venc = duelos(plano, "LIB", "fase_1").map((c) => c.vencedor);
    const diretos = ordenarPorRanking(plano, plano.participantes.LIB.fase2);
    const pote1 = diretos.slice(0, 8), pote2 = [...diretos.slice(8), ...venc];
    const pares = sortearPares(pote1, pote2, assoc, true, rngDaChave(`${plano.chave}:LIB:f2`));
    criarDuelos(plano, "LIB", "fase_2", pares, plano.calendario.LIB.fase_2);
  }
  // Fase 3: os 8 vencedores pelo ranking, C1 x C8 ... (volta na casa do melhor).
  if (prontos(plano, "LIB", "fase_2") && !criada(plano, "LIB", "fase_3")) {
    const c = ordenarPorRanking(plano, duelos(plano, "LIB", "fase_2").map((x) => x.vencedor));
    criarDuelos(plano, "LIB", "fase_3", plano.regras.LIB.fase_3.cruzamentos.map(([x, y]) => [c[Number(x.slice(1)) - 1], c[Number(y.slice(1)) - 1]]), plano.calendario.LIB.fase_3);
  }
  // Grupos das duas copas (precisam da fase 3 da Libertadores e da 1ª fase da Sul-Americana).
  if (prontos(plano, "LIB", "fase_3") && prontos(plano, "SUD", "primeira_fase") && !criada(plano, "LIB", "grupos")) {
    const f3 = duelos(plano, "LIB", "fase_3");
    const vemDaF3 = new Set(f3.map((c) => S(c.vencedor)));
    const lib = ordenarPorRanking(plano, [...plano.participantes.LIB.grupos, ...f3.map((c) => c.vencedor)]);
    const potesLib = [0, 1, 2, 3].map((p) => lib.slice(p * 8, p * 8 + 8));
    const podeLib = (id, grupo) => vemDaF3.has(S(id)) || grupo.every((x) => vemDaF3.has(S(x)) || assoc[S(x)] !== assoc[S(id)]);
    criarGrupos(plano, "LIB", sortearGrupos(potesLib, podeLib, rngDaChave(`${plano.chave}:LIB:grupos`)));
    const sud = ordenarPorRanking(plano, [...plano.participantes.SUD.grupos, ...duelos(plano, "SUD", "primeira_fase").map((c) => c.vencedor), ...f3.map((c) => c.perdedor)]);
    const potesSud = [0, 1, 2, 3].map((p) => sud.slice(p * 8, p * 8 + 8));
    const podeSud = (id, grupo) => grupo.every((x) => assoc[S(x)] !== assoc[S(id)]);
    criarGrupos(plano, "SUD", sortearGrupos(potesSud, podeSud, rngDaChave(`${plano.chave}:SUD:grupos`)));
    M.transferidosF3 = f3.map((c) => c.perdedor);
  }
  const gruposAcabaram = (copa) => criada(plano, copa, "grupos") && plano.jogos.filter((j) => j.copa === copa && j.fase === "grupos").every((j) => j.gh != null);
  // Fim dos grupos: classificados, ordem de performance e transferências.
  for (const copa of ["LIB", "SUD"]) {
    if (!gruposAcabaram(copa) || M[`fimGrupos${copa}`]) continue;
    const tabelas = Object.keys(plano.grupos[copa]).map((g) => ({ g, t: tabelaDoGrupo(plano, copa, g) }));
    const pos = (k) => ordemDePerformance(plano, tabelas.map((x) => x.t[k]), `${copa}:pos${k + 1}`);
    M[`fimGrupos${copa}`] = { primeiros: pos(0), segundos: pos(1), terceiros: pos(2), porGrupo: Object.fromEntries(tabelas.map((x) => [x.g, x.t.map((l) => l.id)])) };
  }
  // Sul-Americana, playoff: 2º SUD (9–16) x 3º LIB (17–24), ida na casa do 3º LIB.
  if (M.fimGruposLIB && M.fimGruposSUD && !criada(plano, "SUD", "playoff")) {
    const ordem = [...M.fimGruposSUD.segundos, ...M.fimGruposLIB.terceiros]; // posições 9..24
    const pares = plano.regras.SUD.playoff.cruzamentos.map(([x, y]) => [ordem[x - 9], ordem[y - 9]]);
    criarDuelos(plano, "SUD", "playoff", pares, plano.calendario.SUD.playoff);
  }
  // Oitavas: pote 1 = líderes (LIB: 1ºs; SUD: 1ºs), pote 2 = LIB 2ºs / vencedores do playoff.
  for (const copa of ["LIB", "SUD"]) {
    if (criada(plano, copa, "oitavas")) continue;
    const fim = M[`fimGrupos${copa}`];
    if (!fim) continue;
    let pote2;
    if (copa === "LIB") pote2 = fim.segundos;
    else { if (!prontos(plano, "SUD", "playoff")) continue; pote2 = duelos(plano, "SUD", "playoff").map((c) => c.vencedor); }
    // Ordem de performance original para os mandos (1 = melhor): líderes 1–8, os outros 9–16.
    const perf = {};
    fim.primeiros.forEach((id, i) => { perf[S(id)] = i + 1; });
    const ordem2 = copa === "LIB" ? fim.segundos : [...M.fimGruposSUD.segundos, ...M.fimGruposLIB.terceiros].filter((id) => pote2.some((x) => S(x) === S(id)));
    ordem2.forEach((id, i) => { perf[S(id)] = 9 + i; });
    M[`perf${copa}`] = perf;
    const pares = sortearPares(fim.primeiros, pote2, assoc, false, rngDaChave(`${plano.chave}:${copa}:oitavas`));
    // As oitavas ficam rotuladas A..H na ordem do sorteio (chave das quartas).
    criarDuelos(plano, copa, "oitavas", pares, plano.calendario[copa].oitavas);
  }
  // Quartas, semis e final pela chave do regulamento.
  for (const copa of ["LIB", "SUD"]) {
    const perf = M[`perf${copa}`];
    if (!perf) continue;
    const melhorPrimeiro = (x, y) => ((perf[S(x)] ?? 99) <= (perf[S(y)] ?? 99) ? [x, y] : [y, x]);
    const chave = plano.regras[copa].mata_mata.chave;
    if (prontos(plano, copa, "oitavas") && !criada(plano, copa, "quartas")) {
      const oit = duelos(plano, copa, "oitavas");
      const porLetra = Object.fromEntries(oit.map((c, i) => [LETRAS[i], c.vencedor]));
      const pares = Object.values(chave.QF).map(([x, y]) => melhorPrimeiro(porLetra[x], porLetra[y]));
      criarDuelos(plano, copa, "quartas", pares, plano.calendario[copa].quartas);
    }
    if (prontos(plano, copa, "quartas") && !criada(plano, copa, "semifinal")) {
      const q = duelos(plano, copa, "quartas");
      const porS = Object.fromEntries(Object.keys(chave.QF).map((s, i) => [s, q[i].vencedor]));
      const pares = chave.SF.map(([x, y]) => melhorPrimeiro(porS[x], porS[y]));
      criarDuelos(plano, copa, "semifinal", pares, plano.calendario[copa].semifinal);
    }
    if (prontos(plano, copa, "semifinal") && !criada(plano, copa, "final")) {
      const [x, y] = melhorPrimeiro(...duelos(plano, copa, "semifinal").map((c) => c.vencedor));
      criarJogoUnico(plano, copa, "final", [[x, y]], plano.calendario[copa].final[0], DESEMPATE_FINAL, true);
    }
    if (prontos(plano, copa, "final") && !M[`campeao${copa}`]) {
      const f = duelos(plano, copa, "final")[0];
      M[`campeao${copa}`] = f.vencedor;
      const p = plano.premiacao[copa].final;
      creditar(plano, copa, f.vencedor, "campeao", p.campeao, `${copa}:final`);
      creditar(plano, copa, f.perdedor, "vice", p.vice, `${copa}:final`);
    }
  }
  if (M.campeaoLIB && M.campeaoSUD) {
    plano.resultado = {
      campeoes: { LIB: M.campeaoLIB, SUD: M.campeaoSUD },
      vices: { LIB: duelos(plano, "LIB", "final")[0].perdedor, SUD: duelos(plano, "SUD", "final")[0].perdedor },
    };
  }
}

// ---------- premiação (USD do pacote) ----------
// Chave única por crédito: reprocessar um jogo não duplica (MUN-12).
function creditar(plano, copa, clube, tipo, valor, ref) {
  if (!(valor > 0)) return;
  const chave = `${copa}|${ref}|${S(clube)}|${tipo}`;
  if (plano.premios.some((p) => p.chave === chave)) return;
  plano.premios.push({ chave, copa, clube, tipo, valorUSD: valor });
}
function premiarJogo(plano, j) {
  const pr = plano.premiacao[j.copa];
  if (!pr) return;
  if (j.copa === "SUD" && j.fase === "primeira_fase") {
    creditar(plano, "SUD", j.casa, "mando", pr.primeira_fase.mandante, j.id);
    creditar(plano, "SUD", j.fora, "visita", pr.primeira_fase.visitante, j.id);
    return;
  }
  const chaveMando = j.fase === "fase_1" || j.fase === "fase_2" || j.fase === "fase_3" || j.fase === "grupos" || j.fase === "oitavas" || j.fase === "quartas" || j.fase === "semifinal" || j.fase === "playoff" ? j.fase : null;
  if (chaveMando && pr.por_mando && pr.por_mando[chaveMando] && !j.neutro) creditar(plano, j.copa, j.casa, "mando", pr.por_mando[chaveMando], j.id);
  if (j.fase === "grupos" && pr.por_vitoria_grupos && j.gh !== j.ga) creditar(plano, j.copa, j.gh > j.ga ? j.casa : j.fora, "vitoria", pr.por_vitoria_grupos, j.id);
}

// Créditos de premiação de um clube (para o extrato).
export function premiosDoClube(plano, clube) {
  return plano.premios.filter((p) => S(p.clube) === S(clube));
}
