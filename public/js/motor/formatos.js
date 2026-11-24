/* ===================================================================
   MOTOR — FORMATOS SUL-AMERICANOS (MUNDO-001, etapa M4, 24/11/2026)
   -------------------------------------------------------------------
   A temporada inteira de cada liga da Argentina, Chile, Colômbia, Equador
   e Uruguai, pelo regulamento do pacote (docs/mundo/pacotes/sul-america/
   01_Regulamentos_e_Calendario.md e as regras em mundo.json).

   Módulo puro e serializável. O "plano" da temporada vai no save:
   - montarTemporada: os jogos das fases de tabela fixa (agenda do relógio:
     pacote na temporada 1, gerada nas seguintes) e os dados da liga;
   - jogosPendentes(plano, ate): os jogos com data até `ate` ainda sem
     placar, inclusive os das fases que dependem de resultado (mata-mata,
     quadrangulares, hexagonais, Intermedio, finais, promoção), criadas
     assim que a fase anterior acaba;
   - registrarJogo: grava o placar e, no jogo que fecha um confronto
     empatado, aplica a resolução (prorrogação e pênaltis pelo simulador);
   - resultado: campeões, quem sobe, quem desce (com o motivo), tabela
     anual e promedio.

   Datas das fases geradas: a partir do dia seguinte ao último jogo da fase
   anterior, um jogo a cada 3 ou 4 dias (quarta e domingo), como nas fases
   reais do pacote. Elas cabem nas pausas entre as fases fixas (teste).

   Desempate geral (anual e fases): saldo, gols pró, fair play e sorteio
   (regras.annual.tieBreak). Empate em pontos (ou de promedio, fração
   exata) que decide queda ou título, onde o regulamento manda jogo extra
   (Argentina e Chile), vira jogo de decisão em campo neutro.
=================================================================== */
import { classificar } from "./desempate.js";
import { generateAllRounds } from "./calendario.js";
import { decidirConfronto, mandanteDaPerna, RESOLUCOES as R } from "./fases.js";

const PERFIL = ["goalDifference", "goalsFor", "fairPlay", "drawLots"];
const DIA = 86400000;

const somaDias = (data, n) => new Date(Date.parse(data + "T00:00:00Z") + n * DIA).toISOString().slice(0, 10);

// n datas depois de `depois`: +3, +4, +3, +4... (meio e fim de semana).
export function datasApos(depois, n) {
  const out = [];
  let d = depois;
  for (let i = 0; i < n; i++) { d = somaDias(d, i % 2 === 0 ? 3 : 4); out.push(d); }
  return out;
}

// ---------- montar ----------

// o = { comp, chave, ano, clubes: [ids], grupos: { A: [ids], B: [ids] },
//       jogosFixos: [{ fase, rodada, data, casa, fora }],
//       historico: { id: [{ ano, pts, j }] } (temporadas anteriores na liga),
//       reservas: [ids] (não sobem) }
export function montarTemporada(o) {
  const plano = {
    liga: o.comp.id, chave: o.chave || `${o.comp.id}:${o.ano}`, ano: o.ano,
    clubes: o.clubes.slice(), grupos: o.grupos || null,
    regras: o.comp.regras, divisao: o.comp.divisao,
    jogos: [], confrontos: [], marcos: {},
    historico: o.historico || {}, reservas: (o.reservas || []).map(String),
    resultado: null,
  };
  for (const j of o.jogosFixos) addJogo(plano, { fase: j.fase, rodada: j.rodada, data: j.data, casa: j.casa, fora: j.fora });
  if (!ROTEIROS[plano.liga]) throw new Error(`formatos: liga sem roteiro (${plano.liga})`);
  avancar(plano);
  return plano;
}

function addJogo(plano, j) {
  const jogo = { id: `${plano.liga}:${plano.jogos.length + 1}`, grupo: null, gh: null, ga: null, ...j };
  plano.jogos.push(jogo);
  return jogo;
}

// ---------- jogar ----------

export function jogosPendentes(plano, ate) {
  return plano.jogos.filter((j) => j.gh == null && (ate == null || j.data <= ate))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0) || a.id.localeCompare(b.id, "en", { numeric: true }));
}

// sim = { prorrogacao({ casa, fora, neutro }) -> { gh, ga }, penaltis({ casa, fora }) -> id }
export function registrarJogo(plano, jogoId, placar, sim) {
  const j = plano.jogos.find((x) => x.id === jogoId);
  if (!j) throw new Error(`formatos: jogo inexistente ${jogoId}`);
  if (j.gh != null) throw new Error(`formatos: jogo já jogado ${jogoId}`);
  j.gh = placar.gh; j.ga = placar.ga;
  if (j.conf) {
    const c = plano.confrontos.find((x) => x.id === j.conf);
    c.placares.push({ casa: j.casa, fora: j.fora, gh: j.gh, ga: j.ga });
    if (c.placares.length === c.pernas) {
      decidirConfronto(c, sim);
      // Prorrogação e pênaltis ficam no próprio jogo, para a tela.
      if (c.extra) j.extra = c.extra;
    }
  }
  // Só o jogo que fecha uma fase ou é de confronto pode mudar o que vem
  // depois: os demais não reavaliam a temporada (custo no celular).
  if (j.conf || faseCompleta(plano, j.fase)) avancar(plano);
  return j;
}

export function concluida(plano) {
  return plano.resultado != null;
}

// Joga a temporada até o fim (testes e pré-simulação).
export function jogarTudo(plano, sim) {
  for (let guarda = 0; guarda < 5000 && !concluida(plano); guarda++) {
    const [j] = jogosPendentes(plano);
    if (!j) throw new Error(`formatos: ${plano.liga} parou sem resultado (marcos: ${Object.keys(plano.marcos).join(",")})`);
    registrarJogo(plano, j.id, sim.jogar(j), sim);
  }
  if (!concluida(plano)) throw new Error(`formatos: ${plano.liga} não termina`);
  return plano.resultado;
}

// ---------- tabelas ----------

function jogosDe(plano, fases) {
  const fs = new Set(fases);
  return plano.jogos.filter((j) => fs.has(j.fase));
}
function faseCompleta(plano, fase) {
  const js = jogosDe(plano, [fase]);
  return js.length > 0 && js.every((j) => j.gh != null);
}
function ultimaData(plano, fases) {
  return jogosDe(plano, fases).reduce((m, j) => (j.data > m ? j.data : m), "0000-00-00");
}

// Linhas da tabela dos clubes `ids` com os jogos das fases. soEntre: só os
// jogos entre eles (grupos); senão, todos os jogos de cada um (zonas com
// interzonais). base: linhas iniciais (arrastre de pontos).
function linhas(plano, fases, ids, { soEntre = false, base = null } = {}) {
  const set = new Set(ids.map(String));
  const t = Object.fromEntries(ids.map((id) => {
    const b = base && base[String(id)];
    return [String(id), { id, j: b ? b.j : 0, v: b ? b.v : 0, e: b ? b.e : 0, d: b ? b.d : 0, gp: b ? b.gp : 0, gc: b ? b.gc : 0, pts: b ? b.pts : 0 }];
  }));
  const resultados = [];
  for (const j of jogosDe(plano, fases)) {
    if (j.gh == null || j.conf) continue;
    const h = String(j.casa), a = String(j.fora);
    if (soEntre ? !(set.has(h) && set.has(a)) : !(set.has(h) || set.has(a))) continue;
    resultados.push({ home: j.casa, away: j.fora, gh: j.gh, ga: j.ga });
    for (const [id, gp, gc] of [[h, j.gh, j.ga], [a, j.ga, j.gh]]) {
      const L = t[id];
      if (!L) continue;
      L.j++; L.gp += gp; L.gc += gc;
      if (gp > gc) { L.v++; L.pts += 3; } else if (gp === gc) { L.e++; L.pts++; } else L.d++;
    }
  }
  return { linhas: Object.values(t), resultados };
}

function ordem(plano, fases, ids, opts = {}, rotulo = "") {
  const { linhas: ls, resultados } = linhas(plano, fases, ids, opts);
  const r = classificar(ls, { perfil: PERFIL, resultados, chaveSorteio: `${plano.chave}:${rotulo || fases.join("+")}` });
  return r.ordem;
}
const idsDe = (ls) => ls.map((l) => l.id);

// ---------- fases geradas ----------

function criarTodosContraTodos(plano, fase, grupos, { turnos, depois }) {
  // Todas as rodadas de todos os grupos nas mesmas datas.
  let maxRodadas = 0;
  const porGrupo = {};
  for (const [g, ids] of Object.entries(grupos)) {
    const todas = generateAllRounds(ids);
    const n = Object.keys(todas).length / 2;
    const rodadas = Object.entries(todas).filter(([r]) => turnos === 2 || Number(r) <= n);
    porGrupo[g] = rodadas;
    maxRodadas = Math.max(maxRodadas, rodadas.length);
  }
  const datas = datasApos(depois, maxRodadas);
  for (const [g, rodadas] of Object.entries(porGrupo)) {
    for (const [r, jogos] of rodadas) {
      for (const m of jogos) addJogo(plano, { fase, grupo: g, rodada: Number(r), data: datas[Number(r) - 1], casa: m.home, fora: m.away });
    }
  }
}

// Confrontos de uma etapa de mata-mata. pares: [[a, b]] com `a` o melhor
// (recebe a volta ou o jogo único). o = { pernas, neutro, resolucao,
// sementes, depois }.
function criarMata(plano, etapa, pares, o) {
  const datas = datasApos(o.depois, o.pernas);
  for (const [a, b] of pares) {
    const c = {
      id: `${etapa}:${plano.confrontos.length + 1}`, etapa, a, b, pernas: o.pernas,
      casaIda: o.pernas === 2 ? b : a, neutro: !!o.neutro, resolucao: o.resolucao,
      sementes: { [a]: o.sementes ? o.sementes[a] : 1, [b]: o.sementes ? o.sementes[b] : 2 },
      pontosRegulares: { [a]: 0, [b]: 0 }, semanaRel: 0, placares: [], vencedor: null, perdedor: null, como: null, extra: null,
    };
    plano.confrontos.push(c);
    for (let i = 0; i < o.pernas; i++) {
      const casa = mandanteDaPerna(c, i);
      addJogo(plano, { fase: etapa, rodada: i + 1, data: datas[i], casa, fora: casa === a ? b : a, conf: c.id, perna: i + 1, neutro: !!o.neutro });
    }
  }
}
const confrontosDe = (plano, etapa) => plano.confrontos.filter((c) => c.etapa === etapa);
const etapaPronta = (plano, etapa) => { const cs = confrontosDe(plano, etapa); return cs.length > 0 && cs.every((c) => c.vencedor != null); };
const criada = (plano, etapa) => plano.jogos.some((j) => j.fase === etapa);

// Mata-mata por rodadas: cria a próxima quando a anterior acaba. `chave` =
// lista ordenada de participantes da 1ª rodada já em pares (a, b); as
// rodadas seguintes cruzam vencedores vizinhos (0x1, 2x3...), com o melhor
// semeado como `a`. etapas: [{ nome, pernas, neutro, resolucao }].
function mataMataEmRodadas(plano, base, primeiros, etapas, sementes, depoisDe) {
  for (let i = 0; i < etapas.length; i++) {
    const e = etapas[i];
    const nome = `${base}-${e.nome}`;
    if (criada(plano, nome)) continue;
    let pares;
    if (i === 0) pares = primeiros;
    else {
      const ant = `${base}-${etapas[i - 1].nome}`;
      if (!etapaPronta(plano, ant)) return false;
      const venc = confrontosDe(plano, ant).map((c) => c.vencedor);
      pares = [];
      for (let k = 0; k < venc.length; k += 2) {
        const [x, y] = [venc[k], venc[k + 1]].sort((p, q) => sementes[p] - sementes[q]);
        pares.push([x, y]);
      }
    }
    const depois = i === 0 ? depoisDe : ultimaData(plano, [`${base}-${etapas[i - 1].nome}`]);
    criarMata(plano, nome, pares, { pernas: e.pernas, neutro: e.neutro, resolucao: e.resolucao, sementes, depois });
    return false;
  }
  return etapaPronta(plano, `${base}-${etapas[etapas.length - 1].nome}`);
}

// Jogo de decisão em campo neutro (empate em pontos que decide queda ou
// título). Devolve o vencedor quando jogado; null enquanto pendente.
function decisao(plano, nome, a, b, depois) {
  if (!criada(plano, nome)) {
    criarMata(plano, nome, [[a, b]], { pernas: 1, neutro: true, resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], depois });
    return null;
  }
  const c = confrontosDe(plano, nome)[0];
  return c.vencedor;
}

const sementesDe = (lista) => Object.fromEntries(lista.map((id, i) => [id, i + 1]));
const pontosDe = (ls) => Object.fromEntries(ls.map((l) => [String(l.id), l.pts]));

// ---------- promedio ----------

// Pontos por jogo nas temporadas da janela (a atual + as anteriores na
// liga), fração exata (pts e j somados). Sem histórico, só a atual.
function promedio(plano, atual, janela) {
  const out = {};
  for (const l of atual) {
    const hist = (plano.historico[String(l.id)] || []).filter((h) => h.ano > plano.ano - janela && h.ano < plano.ano);
    const pts = l.pts + hist.reduce((s, h) => s + h.pts, 0);
    const j = l.j + hist.reduce((s, h) => s + h.j, 0);
    out[String(l.id)] = { pts, j, temporadas: hist.length + 1 };
  }
  return out;
}
// Ordena do pior para o melhor promedio (comparação exata: a*d vs c*b).
function piorPromedio(prom, ids) {
  return ids.slice().sort((x, y) => {
    const a = prom[String(x)], b = prom[String(y)];
    return a.pts * b.j - b.pts * a.j || String(x).localeCompare(String(y));
  });
}
const mesmoPromedio = (a, b) => a.pts * b.j === b.pts * a.j;

// ---------- roteiros ----------

const finalizar = (plano, r) => { plano.resultado = r; };
const elegiveis = (plano, ids) => ids.filter((id) => !plano.reservas.includes(String(id)));

const ROTEIROS = {
  // Argentina, 1ª: Apertura e Clausura por zonas (com interzonais) e mata-mata
  // de jogo único dos 8 melhores de cada zona; anual = as duas fases de zonas;
  // queda: 1 pelo promedio (3 temporadas) e 1 pela anual, clubes distintos.
  arg_liga_profesional(plano) {
    const M = plano.marcos;
    for (const t of ["Apertura", "Clausura"]) {
      if (!faseCompleta(plano, t)) return;
      const za = ordem(plano, [t], plano.grupos.A, {}, `${t}-A`), zb = ordem(plano, [t], plano.grupos.B, {}, `${t}-B`);
      const A = idsDe(za), B = idsDe(zb);
      // Chave: A1 e B1 só se cruzam na final.
      const prim = [[A[0], B[7]], [A[3], B[4]], [A[1], B[6]], [A[2], B[5]], [B[0], A[7]], [B[3], A[4]], [B[1], A[6]], [B[2], A[5]]];
      const sem = {};
      A.slice(0, 8).forEach((id, i) => { sem[id] = 2 * i + 1 + (za[i].pts < zb[i].pts ? 1 : 0); });
      B.slice(0, 8).forEach((id, i) => { sem[id] = 2 * i + 1 + (zb[i].pts <= za[i].pts ? 1 : 0); });
      const cedo = [R.AGREGADO, R.PENALTIS], tarde = [R.AGREGADO, R.PRORROGACAO, R.PENALTIS];
      const ok = mataMataEmRodadas(plano, t, prim, [
        { nome: "oitavas", pernas: 1, resolucao: cedo }, { nome: "quartas", pernas: 1, resolucao: cedo },
        { nome: "semis", pernas: 1, resolucao: tarde }, { nome: "final", pernas: 1, neutro: true, resolucao: tarde },
      ], sem, ultimaData(plano, [t]));
      if (!ok) return;
      M[`campeao${t}`] = confrontosDe(plano, `${t}-final`)[0].vencedor;
    }
    const anual = ordem(plano, ["Apertura", "Clausura"], plano.clubes, {}, "anual");
    const fim = ultimaData(plano, plano.jogos.map((j) => j.fase));
    // Queda pela anual: o último; empate em pontos no último lugar = decisão.
    let quedaAnual = anual[anual.length - 1].id;
    const penultimo = anual[anual.length - 2];
    if (penultimo.pts === anual[anual.length - 1].pts) {
      const v = decisao(plano, "decisao-anual", penultimo.id, quedaAnual, fim);
      if (v == null) return;
      quedaAnual = v === penultimo.id ? anual[anual.length - 1].id : penultimo.id;
    }
    const prom = promedio(plano, anual, plano.regras.relegation.seasonWindow);
    const candidatos = piorPromedio(prom, plano.clubes.filter((id) => String(id) !== String(quedaAnual)));
    let quedaProm = candidatos[0];
    if (mesmoPromedio(prom[String(candidatos[0])], prom[String(candidatos[1])])) {
      const v = decisao(plano, "decisao-promedio", candidatos[1], candidatos[0], ultimaData(plano, plano.jogos.map((j) => j.fase)));
      if (v == null) return;
      quedaProm = v === candidatos[0] ? candidatos[1] : candidatos[0];
    }
    finalizar(plano, {
      campeoes: { Apertura: M.campeaoApertura, Clausura: M.campeaoClausura, anual: anual[0].id },
      sobem: [], descem: [{ id: quedaAnual, motivo: "anual" }, { id: quedaProm, motivo: "promedio" }],
      anual: idsDe(anual), promedio: prom,
    });
  },

  // Argentina, 2ª: zonas de 18 (36 rodadas com interzonais). 1º acesso: final
  // dos líderes em campo neutro. 2º: Reducido (2º–8º de cada zona; o perdedor
  // da final entra na 2ª fase). Caem os 2 últimos de cada zona.
  arg_primera_nacional(plano) {
    const F = "Fase Regular";
    if (!faseCompleta(plano, F)) return;
    const za = ordem(plano, [F], plano.grupos.A, {}, "zona-A"), zb = ordem(plano, [F], plano.grupos.B, {}, "zona-B");
    const A = idsDe(za), B = idsDe(zb);
    const fimRegular = ultimaData(plano, [F]);
    // Semente geral: posição na zona e, entre iguais, mais pontos.
    const todos = [...za.map((l, i) => ({ id: l.id, pos: i + 1, pts: l.pts })), ...zb.map((l, i) => ({ id: l.id, pos: i + 1, pts: l.pts }))]
      .sort((x, y) => x.pos - y.pos || y.pts - x.pts || String(x.id).localeCompare(String(y.id)));
    const sem = sementesDe(todos.map((x) => x.id));
    const tarde = [R.AGREGADO, R.PRORROGACAO, R.PENALTIS];
    if (!criada(plano, "final-acesso")) {
      criarMata(plano, "final-acesso", [[A[0], B[0]].sort((p, q) => sem[p] - sem[q])], { pernas: 1, neutro: true, resolucao: tarde, sementes: sem, depois: fimRegular });
      // Reducido, 1ª fase: A2-B8, B2-A8, A3-B7, B3-A7, A4-B6, B4-A6, A5-B5 (vantagem do melhor colocado).
      const pares = (plano.regras.promotion.qualifierPairs || []).map((p) => p.split("-").map((x) => (x[0] === "A" ? A : B)[Number(x.slice(1)) - 1]));
      criarMata(plano, "reducido-1", pares, { pernas: 1, resolucao: [R.AGREGADO, R.CAMPANHA], sementes: sem, depois: fimRegular });
      return;
    }
    if (!etapaPronta(plano, "final-acesso") || !etapaPronta(plano, "reducido-1")) return;
    const fin = confrontosDe(plano, "final-acesso")[0];
    if (!criada(plano, "reducido-2")) {
      // 8 clubes: o perdedor da final é o 1º semeado; depois os vencedores.
      const sem2 = { ...sem, [fin.perdedor]: 0 };
      const oito = [fin.perdedor, ...confrontosDe(plano, "reducido-1").map((c) => c.vencedor)].sort((p, q) => sem2[p] - sem2[q]);
      const pares = [[oito[0], oito[7]], [oito[3], oito[4]], [oito[1], oito[6]], [oito[2], oito[5]]];
      plano.marcos.sem2 = sem2;
      criarMata(plano, "reducido-2", pares, { pernas: 1, resolucao: [R.AGREGADO, R.CAMPANHA], sementes: sem2, depois: ultimaData(plano, ["final-acesso", "reducido-1"]) });
      return;
    }
    const ok = mataMataEmRodadas(plano, "reducido", null, [
      { nome: "2", pernas: 1 }, { nome: "semis", pernas: 2, resolucao: [R.AGREGADO, R.CAMPANHA] },
      { nome: "final", pernas: 2, resolucao: tarde },
    ], plano.marcos.sem2, null);
    if (!ok) return;
    finalizar(plano, {
      campeoes: { campeonato: fin.vencedor },
      sobem: [{ id: fin.vencedor, motivo: "final" }, { id: confrontosDe(plano, "reducido-final")[0].vencedor, motivo: "reducido" }],
      descem: [A[16], A[17], B[16], B[17]].map((id) => ({ id, motivo: "zona" })),
      zonas: { A, B },
    });
  },

  // Chile, 1ª: turno e returno; caem 15º e 16º (empate em pontos na
  // fronteira = jogo de decisão). Título com empate em pontos = decisão.
  chi_liga_primera(plano) {
    const F = "Fase Regular";
    if (!faseCompleta(plano, F)) return;
    const t = ordem(plano, [F], plano.clubes);
    const fim = ultimaData(plano, [F]);
    let campeao = t[0].id;
    if (t[0].pts === t[1].pts) { const v = decisao(plano, "decisao-titulo", t[0].id, t[1].id, fim); if (v == null) return; campeao = v; }
    let ordemFinal = idsDe(t);
    if (t[13].pts === t[14].pts) {
      const v = decisao(plano, "decisao-queda", t[13].id, t[14].id, fim);
      if (v == null) return;
      if (v === t[14].id) ordemFinal = [...ordemFinal.slice(0, 13), t[14].id, t[13].id, ...ordemFinal.slice(15)];
    }
    finalizar(plano, { campeoes: { campeonato: campeao }, sobem: [], descem: ordemFinal.slice(14).map((id) => ({ id, motivo: "tabela" })), anual: ordemFinal });
  },

  // Chile, 2ª: o campeão sobe; Liguilla (3x8, 4x7, 5x6; o 2º nas semis) dá a
  // 2ª vaga; o último cai (empate em pontos = decisão).
  chi_liga_ascenso(plano) {
    const F = "Fase Regular";
    if (!faseCompleta(plano, F)) return;
    const t = ordem(plano, [F], plano.clubes);
    const ids = idsDe(t);
    const sem = sementesDe(ids);
    const fim = ultimaData(plano, [F]);
    let campeao = ids[0];
    if (t[0].pts === t[1].pts) { const v = decisao(plano, "decisao-titulo", ids[0], ids[1], fim); if (v == null) return; campeao = v; }
    const vice = campeao === ids[0] ? ids[1] : ids[0];
    if (!criada(plano, "liguilla-1")) {
      criarMata(plano, "liguilla-1", [[ids[2], ids[7]], [ids[3], ids[6]], [ids[4], ids[5]]], { pernas: 2, resolucao: [R.AGREGADO, R.CAMPANHA], sementes: sem, depois: fim });
      return;
    }
    if (!etapaPronta(plano, "liguilla-1")) return;
    if (!criada(plano, "liguilla-semis")) {
      const v = confrontosDe(plano, "liguilla-1").map((c) => c.vencedor).sort((p, q) => sem[p] - sem[q]);
      // O 2º pega o vencedor pior colocado.
      criarMata(plano, "liguilla-semis", [[vice, v[2]], [v[0], v[1]]], { pernas: 2, resolucao: [R.AGREGADO, R.CAMPANHA], sementes: sem, depois: ultimaData(plano, ["liguilla-1"]) });
      return;
    }
    if (!etapaPronta(plano, "liguilla-semis")) return;
    if (!criada(plano, "liguilla-final")) {
      const [x, y] = confrontosDe(plano, "liguilla-semis").map((c) => c.vencedor).sort((p, q) => sem[p] - sem[q]);
      criarMata(plano, "liguilla-final", [[x, y]], { pernas: 2, resolucao: [R.AGREGADO, R.PENALTIS], sementes: sem, depois: ultimaData(plano, ["liguilla-semis"]) });
      return;
    }
    if (!etapaPronta(plano, "liguilla-final")) return;
    let ultimo = ids[15];
    if (t[14].pts === t[15].pts) {
      const v = decisao(plano, "decisao-queda", ids[14], ids[15], ultimaData(plano, ["liguilla-final"]));
      if (v == null) return;
      ultimo = v === ids[14] ? ids[15] : ids[14];
    }
    finalizar(plano, {
      campeoes: { campeonato: campeao },
      sobem: [{ id: campeao, motivo: "campeao" }, { id: confrontosDe(plano, "liguilla-final")[0].vencedor, motivo: "liguilla" }],
      descem: [{ id: ultimo, motivo: "tabela" }], anual: ids,
    });
  },

  // Colômbia, 1ª: Apertura (mata-mata dos 8) e Clausura (2 quadrangulares
  // dos 8, cabeças 1º e 2º, final dos líderes); caem 2 pelo promedio (3
  // temporadas, só as fases de todos contra todos).
  col_primera_a(plano) {
    const M = plano.marcos;
    if (!faseCompleta(plano, "Apertura")) return;
    const ap = idsDe(ordem(plano, ["Apertura"], plano.clubes, {}, "Apertura"));
    const semAp = sementesDe(ap);
    const ok = mataMataEmRodadas(plano, "Apertura", [[ap[0], ap[7]], [ap[3], ap[4]], [ap[1], ap[6]], [ap[2], ap[5]]], [
      { nome: "quartas", pernas: 2, resolucao: [R.AGREGADO, R.PENALTIS] }, { nome: "semis", pernas: 2, resolucao: [R.AGREGADO, R.PENALTIS] },
      { nome: "final", pernas: 2, resolucao: [R.AGREGADO, R.PENALTIS] },
    ], semAp, ultimaData(plano, ["Apertura"]));
    if (!ok) return;
    M.campeaoApertura = confrontosDe(plano, "Apertura-final")[0].vencedor;
    if (!faseCompleta(plano, "Clausura")) return;
    const cl = ordem(plano, ["Clausura"], plano.clubes, {}, "Clausura");
    const campeaoCl = quadrangulares(plano, "Clausura", idsDe(cl));
    if (campeaoCl == null) return;
    const atual = linhas(plano, ["Apertura", "Clausura"], plano.clubes).linhas;
    const prom = promedio(plano, atual, plano.regras.relegation.seasonWindow);
    const piores = piorPromedio(prom, plano.clubes);
    finalizar(plano, {
      campeoes: { Apertura: M.campeaoApertura, Clausura: campeaoCl },
      sobem: [], descem: piores.slice(0, 2).map((id) => ({ id, motivo: "promedio" })), promedio: prom,
      anual: idsDe(ordem(plano, ["Apertura", "Clausura"], plano.clubes, {}, "anual")),
    });
  },

  // Colômbia, 2ª: Apertura e Clausura com quadrangulares e final; 2 acessos
  // pelos 4 cenários do regulamento (campeões e reclassificação).
  col_primera_b(plano) {
    const M = plano.marcos;
    for (const t of ["Apertura", "Clausura"]) {
      if (!faseCompleta(plano, t)) return;
      const tab = idsDe(ordem(plano, [t], plano.clubes, {}, t));
      const c = quadrangulares(plano, t, tab);
      if (c == null) return;
      M[`campeao${t}`] = c;
    }
    const todasFases = [...new Set(plano.jogos.map((j) => j.fase))].filter((f) => !f.startsWith("acesso"));
    const recl = ordem(plano, todasFases, plano.clubes, {}, "reclassificacao");
    const r = acessoColombia(plano, M.campeaoApertura, M.campeaoClausura, elegiveis(plano, idsDe(recl)), ultimaData(plano, todasFases));
    if (r == null) return;
    finalizar(plano, { campeoes: { Apertura: M.campeaoApertura, Clausura: M.campeaoClausura }, sobem: r.sobem, descem: [], cenario: r.cenario, reclassificacao: idsDe(recl) });
  },

  // Equador, 1ª: 30 rodadas; hexagonal do título (1–6), grupo da
  // Sul-Americana (7–10) e hexagonal de permanência (11–16), com os pontos da
  // 1ª fase carregados; caem os 2 últimos da permanência.
  ecu_ligapro_a(plano) {
    const F = "Fase Regular";
    if (!faseCompleta(plano, F)) return;
    const reg = ordem(plano, [F], plano.clubes);
    const ids = idsDe(reg);
    const grupos = { titulo: ids.slice(0, 6), sulamericana: ids.slice(6, 10), permanencia: ids.slice(10) };
    const fasesG = segundaFaseComArrastre(plano, grupos, F);
    if (!fasesG) return;
    finalizar(plano, {
      campeoes: { campeonato: fasesG.titulo[0] }, sobem: [],
      descem: fasesG.permanencia.slice(-2).map((id) => ({ id, motivo: "hexagonal" })), grupos: fasesG, anual: ids,
    });
  },

  // Equador, 2ª: 22 rodadas; hexagonais de acesso (1–6) e de descenso
  // (7–12), com arrastre; sobem os 2 primeiros elegíveis do acesso (clube
  // vinculado é pulado); caem os 2 últimos do descenso.
  ecu_ligapro_b(plano) {
    const F = "Fase Inicial";
    if (!faseCompleta(plano, F)) return;
    const ids = idsDe(ordem(plano, [F], plano.clubes));
    const fasesG = segundaFaseComArrastre(plano, { acesso: ids.slice(0, 6), descenso: ids.slice(6) }, F);
    if (!fasesG) return;
    finalizar(plano, {
      campeoes: { campeonato: fasesG.acesso[0] },
      sobem: elegiveis(plano, fasesG.acesso).slice(0, 2).map((id) => ({ id, motivo: "hexagonal" })),
      descem: fasesG.descenso.slice(-2).map((id) => ({ id, motivo: "hexagonal" })), grupos: fasesG,
    });
  },

  // Uruguai, 1ª: Apertura; Intermedio (2 grupos pela classificação do
  // Apertura: ímpares e pares) com final; Clausura; anual = as três fases de
  // grupos. Campeão: semifinal Apertura x Clausura e final contra o líder da
  // anual (se for outro). Caem 3 pelo promedio (2 temporadas).
  uru_primera(plano) {
    const M = plano.marcos;
    if (!faseCompleta(plano, "Apertura")) return;
    const fimAp = ultimaData(plano, ["Apertura"]);
    const ap = ordem(plano, ["Apertura"], plano.clubes, {}, "Apertura");
    if (M.campeaoApertura == null) {
      if (ap[0].pts === ap[1].pts) { const v = decisao(plano, "Apertura-decisao", ap[0].id, ap[1].id, fimAp); if (v == null) return; M.campeaoApertura = v; }
      else M.campeaoApertura = ap[0].id;
    }
    if (!criada(plano, "Intermedio")) {
      const ids = idsDe(ap);
      criarTodosContraTodos(plano, "Intermedio", { A: ids.filter((_, i) => i % 2 === 0), B: ids.filter((_, i) => i % 2 === 1) }, { turnos: 1, depois: ultimaData(plano, ["Apertura", "Apertura-decisao"]) });
      return;
    }
    if (!faseCompleta(plano, "Intermedio")) return;
    if (!criada(plano, "Intermedio-final")) {
      const gA = plano.jogos.filter((j) => j.fase === "Intermedio" && j.grupo === "A").flatMap((j) => [j.casa, j.fora]);
      const gB = plano.jogos.filter((j) => j.fase === "Intermedio" && j.grupo === "B").flatMap((j) => [j.casa, j.fora]);
      const a = ordem(plano, ["Intermedio"], [...new Set(gA)], { soEntre: true }, "Intermedio-A")[0].id;
      const b = ordem(plano, ["Intermedio"], [...new Set(gB)], { soEntre: true }, "Intermedio-B")[0].id;
      criarMata(plano, "Intermedio-final", [[a, b]], { pernas: 1, neutro: true, resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], depois: ultimaData(plano, ["Intermedio"]) });
      return;
    }
    if (!etapaPronta(plano, "Intermedio-final") || !faseCompleta(plano, "Clausura")) return;
    const cl = ordem(plano, ["Clausura"], plano.clubes, {}, "Clausura");
    if (M.campeaoClausura == null) {
      if (cl[0].pts === cl[1].pts) { const v = decisao(plano, "Clausura-decisao", cl[0].id, cl[1].id, ultimaData(plano, ["Clausura"])); if (v == null) return; M.campeaoClausura = v; }
      else M.campeaoClausura = cl[0].id;
    }
    const anual = ordem(plano, ["Apertura", "Intermedio", "Clausura"], plano.clubes, {}, "anual");
    const lider = anual[0].id;
    const fimCl = ultimaData(plano, ["Clausura", "Clausura-decisao", "Intermedio-final"]);
    let campeao;
    if (M.campeaoApertura === M.campeaoClausura) campeao = M.campeaoApertura;
    else {
      if (!criada(plano, "semifinal")) {
        criarMata(plano, "semifinal", [[M.campeaoApertura, M.campeaoClausura]], { pernas: 1, neutro: true, resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], depois: fimCl });
        return;
      }
      if (!etapaPronta(plano, "semifinal")) return;
      const w = confrontosDe(plano, "semifinal")[0].vencedor;
      if (w === lider) campeao = w;
      else {
        if (!criada(plano, "final")) {
          criarMata(plano, "final", [[lider, w]], { pernas: 2, resolucao: [R.PONTOS, R.AGREGADO, R.PENALTIS], depois: ultimaData(plano, ["semifinal"]) });
          return;
        }
        if (!etapaPronta(plano, "final")) return;
        campeao = confrontosDe(plano, "final")[0].vencedor;
      }
    }
    const atual = linhas(plano, ["Apertura", "Intermedio", "Clausura"], plano.clubes).linhas;
    const prom = promedio(plano, atual, plano.regras.relegation.seasonWindow);
    finalizar(plano, {
      campeoes: { Apertura: M.campeaoApertura, Intermedio: confrontosDe(plano, "Intermedio-final")[0].vencedor, Clausura: M.campeaoClausura, anual: lider, uruguaio: campeao },
      sobem: [], descem: piorPromedio(prom, plano.clubes).slice(0, 3).map((id) => ({ id, motivo: "promedio" })), promedio: prom, anual: idsDe(anual),
    });
  },

  // Uruguai, 2ª: Competencia (2 grupos de 7 e final) e fase regular de 26;
  // anual = os jogos de grupo das duas; sobem 1º e 2º da anual e o vencedor do
  // playoff 3º–6º (ida e volta); caem 2 pelo promedio (2 temporadas).
  uru_segunda(plano) {
    if (!faseCompleta(plano, "Competencia")) return;
    if (!criada(plano, "Competencia-final")) {
      const a = ordem(plano, ["Competencia"], plano.grupos.A, { soEntre: true }, "Competencia-A")[0].id;
      const b = ordem(plano, ["Competencia"], plano.grupos.B, { soEntre: true }, "Competencia-B")[0].id;
      criarMata(plano, "Competencia-final", [[a, b]], { pernas: 1, neutro: true, resolucao: [R.AGREGADO, R.PRORROGACAO, R.PENALTIS], depois: ultimaData(plano, ["Competencia"]) });
      return;
    }
    if (!etapaPronta(plano, "Competencia-final") || !faseCompleta(plano, "Fase Regular")) return;
    const anual = ordem(plano, ["Competencia", "Fase Regular"], plano.clubes, {}, "anual");
    const ids = elegiveis(plano, idsDe(anual));
    const sem = sementesDe(ids);
    const ok = mataMataEmRodadas(plano, "playoff", [[ids[2], ids[5]], [ids[3], ids[4]]], [
      { nome: "semis", pernas: 2, resolucao: [R.AGREGADO, R.CAMPANHA] }, { nome: "final", pernas: 2, resolucao: [R.AGREGADO, R.PENALTIS] },
    ], sem, ultimaData(plano, ["Fase Regular"]));
    if (!ok) return;
    const atual = linhas(plano, ["Competencia", "Fase Regular"], plano.clubes).linhas;
    const prom = promedio(plano, atual, plano.regras.relegation.seasonWindow);
    finalizar(plano, {
      campeoes: { Competencia: confrontosDe(plano, "Competencia-final")[0].vencedor, campeonato: anual[0].id },
      sobem: [{ id: ids[0], motivo: "anual" }, { id: ids[1], motivo: "anual" }, { id: confrontosDe(plano, "playoff-final")[0].vencedor, motivo: "playoff" }],
      descem: piorPromedio(prom, plano.clubes).slice(0, 2).map((id) => ({ id, motivo: "promedio" })), promedio: prom, anual: idsDe(anual),
    });
  },
};

// Quadrangulares da Colômbia: os 8 primeiros; cabeças 1º (grupo A) e 2º
// (grupo B); 3º a 8º sorteados 3 por grupo (sorteio pela chave). Ida e
// volta (6 rodadas); empate em pontos no grupo = vantagem do melhor
// colocado na fase. Final de ida e volta entre os líderes (volta na casa
// do melhor colocado), pênaltis no empate. Devolve o campeão ou null.
function quadrangulares(plano, t, tabela) {
  const nome = `${t}-quadrangular`;
  const sem = sementesDe(tabela);
  if (!criada(plano, nome)) {
    const resto = tabela.slice(2, 8);
    // Sorteio determinístico (Fisher-Yates com a chave da fase).
    let h = 2166136261;
    for (const ch of `${plano.chave}:${nome}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    for (let i = resto.length - 1; i > 0; i--) { h = Math.imul(h ^ i, 16777619); const k = (h >>> 0) % (i + 1); [resto[i], resto[k]] = [resto[k], resto[i]]; }
    criarTodosContraTodos(plano, nome, { A: [tabela[0], ...resto.slice(0, 3)], B: [tabela[1], ...resto.slice(3)] }, { turnos: 2, depois: ultimaData(plano, [t]) });
    return null;
  }
  if (!faseCompleta(plano, nome)) return null;
  const lider = (g) => {
    const ids = [...new Set(plano.jogos.filter((j) => j.fase === nome && j.grupo === g).flatMap((j) => [j.casa, j.fora]))];
    const { linhas: ls } = linhas(plano, [nome], ids, { soEntre: true });
    return ls.sort((a, b) => b.pts - a.pts || sem[a.id] - sem[b.id])[0].id;
  };
  const fin = `${t}-final`;
  if (!criada(plano, fin)) {
    const [x, y] = [lider("A"), lider("B")].sort((p, q) => sem[p] - sem[q]);
    criarMata(plano, fin, [[x, y]], { pernas: 2, resolucao: [R.AGREGADO, R.PENALTIS], sementes: sem, depois: ultimaData(plano, [nome]) });
    return null;
  }
  if (!etapaPronta(plano, fin)) return null;
  return confrontosDe(plano, fin)[0].vencedor;
}

// Os 4 cenários de acesso da Primera B (DIMAYOR, arts. 19–25). recl =
// elegíveis em ordem de reclassificação. Gran Final e repechaje: ida e
// volta por pontos, saldo e pênaltis, volta na casa do melhor da
// reclassificação. Devolve { sobem, cenario } ou null enquanto pendente.
export function acessoColombia(plano, campA, campC, recl, depois) {
  const pos = (id) => { const i = recl.indexOf(id); return i < 0 ? 999 : i; };
  const res = [R.PONTOS, R.AGREGADO, R.PENALTIS];
  const sem = Object.fromEntries(recl.map((id, i) => [id, i + 1]));
  const top2 = recl.slice(0, 2);
  const melhorDisponivel = (excluir) => recl.find((id) => !excluir.includes(id));
  const confronto = (nome, a, b, apos) => {
    if (!criada(plano, nome)) {
      const [x, y] = [a, b].sort((p, q) => pos(p) - pos(q));
      criarMata(plano, nome, [[x, y]], { pernas: 2, resolucao: res, sementes: sem, depois: apos });
      return null;
    }
    return etapaPronta(plano, nome) ? confrontosDe(plano, nome)[0] : null;
  };
  if (campA === campC) {
    const [x, y] = recl.filter((id) => id !== campA).slice(0, 2);
    const c = confronto("acesso-repechaje", x, y, depois);
    return c && { cenario: "mesmo-campeao", sobem: [{ id: campA, motivo: "bicampeao" }, { id: c.vencedor, motivo: "repechaje" }] };
  }
  const dentro = [campA, campC].filter((id) => top2.includes(id));
  if (dentro.length === 2) return { cenario: "campeoes-no-top2", sobem: [campA, campC].map((id) => ({ id, motivo: "campeao" })) };
  if (dentro.length === 1) {
    const fora = dentro[0] === campA ? campC : campA;
    const c = confronto("acesso-repechaje", fora, melhorDisponivel([campA, campC]), depois);
    return c && { cenario: "um-campeao-no-top2", sobem: [{ id: dentro[0], motivo: "campeao" }, { id: c.vencedor, motivo: "repechaje" }] };
  }
  const gf = confronto("acesso-gran-final", campA, campC, depois);
  if (!gf) return null;
  const rp = confronto("acesso-repechaje", gf.perdedor, melhorDisponivel([campA, campC]), ultimaData(plano, ["acesso-gran-final"]));
  return rp && { cenario: "gran-final", sobem: [{ id: gf.vencedor, motivo: "gran-final" }, { id: rp.vencedor, motivo: "repechaje" }] };
}

// Segunda fase em grupos com os pontos da 1ª carregados (Equador): cada
// grupo joga ida e volta entre si; a ordem do grupo usa a 1ª fase + a 2ª.
// Devolve { grupo: [ids em ordem] } ou null enquanto pendente.
function segundaFaseComArrastre(plano, grupos, faseInicial) {
  const nome = "segunda-fase";
  if (!criada(plano, nome)) {
    criarTodosContraTodos(plano, nome, grupos, { turnos: 2, depois: ultimaData(plano, [faseInicial]) });
    return null;
  }
  if (!faseCompleta(plano, nome)) return null;
  const out = {};
  for (const [g, ids] of Object.entries(grupos)) {
    const base = Object.fromEntries(linhas(plano, [faseInicial], ids).linhas.map((l) => [String(l.id), l]));
    out[g] = idsDe(ordem(plano, [nome], ids, { soEntre: true, base }, `${nome}-${g}`));
  }
  return out;
}

function avancar(plano) {
  if (plano.resultado) return;
  ROTEIROS[plano.liga](plano);
}

// ---------- confrontos das fases fixas nas temporadas seguintes ----------

// Gerador de confrontos para relogio.agendaGerada (fases fixas) de cada
// liga sul-americana. grupos: as zonas/grupos da temporada (Argentina,
// Segunda uruguaia).
export function geradorDeConfrontos(ligaId, grupos) {
  const turnoUnico = (ids, inverter) => {
    const todas = generateAllRounds(ids);
    const n = Object.keys(todas).length / 2;
    return Object.fromEntries(Object.entries(todas).filter(([r]) => Number(r) <= n)
      .map(([r, js]) => [r, inverter ? js.map((m) => ({ home: m.away, away: m.home })) : js]));
  };
  const duploTurno = (ids) => generateAllRounds(ids);
  // Zonas ímpares com interzonal: em cada rodada, o clube de folga de uma zona
  // joga com o de folga da outra; rodadas extras = clássicos (A[i] x B[i+k]).
  const zonasComInterzonal = (inverter, turnos, extras) => {
    const A = grupos.A, B = grupos.B;
    const ra = turnos === 2 ? generateAllRounds(A) : turnoUnico(A, false);
    const rb = turnos === 2 ? generateAllRounds(B) : turnoUnico(B, false);
    const out = {};
    const n = Object.keys(ra).length;
    for (let r = 1; r <= n; r++) {
      const js = [...ra[r], ...rb[r]];
      const livreA = A.filter((id) => !ra[r].some((m) => m.home === id || m.away === id));
      const livreB = B.filter((id) => !rb[r].some((m) => m.home === id || m.away === id));
      livreA.forEach((a, i) => js.push(r % 2 ? { home: a, away: livreB[i] } : { home: livreB[i], away: a }));
      out[r] = inverter ? js.map((m) => ({ home: m.away, away: m.home })) : js;
    }
    extras.forEach((desloc, k) => {
      const js = A.map((a, i) => (k % 2 === 0 ? { home: a, away: B[(i + desloc) % B.length] } : { home: B[(i + desloc) % B.length], away: a }));
      out[n + k + 1] = inverter ? js.map((m) => ({ home: m.away, away: m.home })) : js;
    });
    return out;
  };
  switch (ligaId) {
    case "arg_liga_profesional":
      // 15 rodadas de zona (folgas viram interzonal) + 1 de clássicos = 16.
      return (fase) => zonasComInterzonal(fase === "Clausura", 1, [3]);
    case "arg_primera_nacional":
      // 34 rodadas de zona (turno e returno) + 2 interzonais (ida e volta) = 36.
      return () => zonasComInterzonal(false, 2, [5, 5]);
    case "col_primera_a":
    case "col_primera_b":
    case "uru_primera":
      return (fase, ids) => turnoUnico(ids, fase === "Clausura");
    case "uru_segunda":
      return (fase, ids) => {
        if (fase !== "Competencia") return duploTurno(ids);
        const a = turnoUnico(grupos.A, false), b = turnoUnico(grupos.B, false);
        return Object.fromEntries(Object.keys(a).map((r) => [r, [...a[r], ...b[r]]]));
      };
    default:
      return (fase, ids) => duploTurno(ids);
  }
}

export const LIGAS_COM_ROTEIRO = Object.keys(ROTEIROS);
