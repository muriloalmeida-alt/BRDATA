/* ===================================================================
   MOTOR — MUNDO LEVE (MUNDO-001, etapa M6a, 24/11/2026)
   -------------------------------------------------------------------
   As ligas do mundo fora do país do técnico, semana a semana (decisão D1
   do Murilo: simulação híbrida). Junta as peças das etapas M1–M5:
   - relógio (relogio.js): a agenda de cada liga e temporada sai do índice
     do mundo e da composição do save, e NÃO vai no save;
   - placar: a mesma conta de gols do motor (partida.scoreGoals) com a força
     de jogo do clube no nível de gols da liga (partida.forcaComNivel),
     como as divisões que o técnico não joga no Brasil (rodada.js);
   - Europa: tabela com os desempates da liga (desempate.js) e o fim de
     temporada (fases.js); América do Sul: a temporada inteira pelo
     regulamento (formatos.js);
   - virada por país (viradapais.js) quando as duas divisões acabam.

   Save enxuto (CLAUDE.md, seção 9): o estado salvo guarda, por liga, a
   composição e os placares das fases fixas numa string (2 caracteres por
   jogo, na ordem da agenda); as fases geradas, os confrontos, o catálogo
   alterado, as zonas, o histórico do promedio e as forças de quem mudou de
   divisão. A tabela é recalculada dos placares. Elencos ficam para as
   etapas do mercado (M8).

   Uso:
     const m = abrirMundo(salvo ou criarMundoLeve(indice, ...), indice);
     avancarSemana(m)  // joga a semana de todas as ligas leves
     salvarMundo(m)    // o estado compacto para o save
   Cada jogo tem o próprio sorteio (liga, temporada, índice do jogo): o
   resultado não depende da ordem nem de quando o save foi aberto.
=================================================================== */
import * as Rel from "./relogio.js";
import * as Fa from "./fases.js";
import * as Fo from "./formatos.js";
import * as Vp from "./viradapais.js";
import { classificar, opcoesDaLiga, rngDaChave } from "./desempate.js";
import { scoreGoals, nivelDeGols, forcaComNivel } from "./partida.js";
import { generateAllRounds } from "./calendario.js";
import { sortRows } from "./tabela.js";
import { promotionRelegation } from "./temporada.js";
import { CALENDAR_PHASE_BY_MONTH } from "./semana.js";

export const FORMATO_MUNDO = 1;
// Mudança de divisão: a força relativa muda pela razão dos níveis das ligas,
// amortecida (parâmetro de balanceamento; 1 = razão inteira).
export const AMORTECIMENTO_NIVEL = 0.5;
// Nível da 3ª divisão (catálogo) em relação ao da 2ª.
export const NIVEL_TERCEIRA = 0.9;

const S = (x) => String(x);
const N = (x) => (Number.isFinite(Number(x)) ? Number(x) : x);
const DIGITOS = "0123456789abcdefghijklmnopqrstuvwxyz";
const domingo = (semana) => new Date(Date.parse(semana + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);

// ---------- placares compactos ----------
export function codificarPlacares(lista) {
  return lista.map((p) => (p ? DIGITOS[Math.min(p.gh, 35)] + DIGITOS[Math.min(p.ga, 35)] : "..")).join("");
}
export function decodificarPlacares(s, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = s[2 * i], b = s[2 * i + 1];
    out.push(a == null || a === "." ? null : { gh: DIGITOS.indexOf(a), ga: DIGITOS.indexOf(b) });
  }
  return out;
}

// ---------- criação ----------

// Estado inicial (compacto) de um mundo novo. ativos: países fora do modo
// leve (o do técnico; a etapa M6b liga a carreira). A semana inicial é a da
// pré-temporada da liga escolhida (MUN-06); a pré-simulação até ela é feita
// por prepararInicio().
// inicio (opcional): a semana em que o jogo começa, quando a liga do técnico
// não está no índice (carreira no Brasil, M6b-5).
export function criarMundoLeve(indice, { ligaEscolhida, ativos = [], chave = "mundo", inicio = null } = {}) {
  const paises = {};
  for (const p of indice.paises) {
    const [l1, l2] = p.ligas;
    const zonas = {};
    for (const l of [l1, l2]) if (indice.grupos[l]) zonas[l] = indice.grupos[l];
    paises[p.codigo] = {
      k: 0, ano: indice.competicoes[l1].temporada.anoInicial,
      ligas: Object.fromEntries([l1, l2].map((l) => [l, { clubes: indice.clubes.filter((c) => c.liga === l).map((c) => c.id), placares: "" }])),
      pos: null, catalogo: indice.terceira.filter((c) => c.pais === p.codigo).map((c) => c.id), catalogoExtra: {},
      zonas, historico: JSON.parse(JSON.stringify(Object.fromEntries([l1, l2].filter((l) => indice.promedioInicial[l]).map((l) => [l, indice.promedioInicial[l]])))),
      forcas: {}, viradas: [], campeoes: [],
    };
  }
  // Brasil (M6b-5b): Séries A, B e C e o catálogo da Série D, como na carreira.
  if (indice.brasil) {
    const B = indice.brasil;
    paises.BR = {
      k: 0, ano: Number(String(inicio || "2026").slice(0, 4)),
      ligas: Object.fromEntries(DIVISOES_BR.map((l) => [l, { clubes: B.ligas[l].clubes.map((c) => c.id), placares: "" }])),
      pos: null, catalogo: B.serieD.map((c) => c.id), catalogoExtra: {}, zonas: {}, historico: {},
      forcas: {}, viradas: [], campeoes: [],
    };
  }
  const agendaEscolhida = ligaEscolhida ? Rel.agendaDoPacote(indice.partidas[ligaEscolhida]) : null;
  const inicioJogo = inicio || (agendaEscolhida ? Rel.inicioDoMundo(agendaEscolhida) : null);
  const primeira = Object.keys(indice.competicoes).map((l) => Rel.primeiraSemana(Rel.agendaDoPacote(indice.partidas[l]))).sort()[0];
  return {
    formato: FORMATO_MUNDO, versaoCatalogo: indice.versao, chave, ativos: ativos.slice(),
    semana: inicioJogo && inicioJogo < primeira ? inicioJogo : primeira, inicioJogo: inicioJogo || primeira,
    paises,
  };
}

// ---------- runtime ----------

// Abre o estado salvo: o runtime tem as agendas e os planos expandidos.
export function abrirMundo(estado, indice) {
  if (!estado || estado.formato !== FORMATO_MUNDO) throw new Error("mundo: estado sem formato conhecido");
  const m = { estado: JSON.parse(JSON.stringify(estado)), indice, cache: {} };
  for (const cod of Object.keys(m.estado.paises)) prepararPais(m, cod);
  return m;
}

export function salvarMundo(m) {
  const e = m.estado;
  for (const [cod, P] of Object.entries(e.paises)) {
    const rt = m.cache[cod];
    if (!rt) continue;
    for (const [liga, L] of Object.entries(P.ligas)) {
      const r = rt.ligas[liga];
      if (r.plano) {
        // América do Sul: placares das fases fixas na string; o resto do plano como está.
        const n = r.fixos.length;
        L.placares = codificarPlacares(r.plano.jogos.slice(0, n).map((j) => (j.gh == null ? null : { gh: j.gh, ga: j.ga })));
        L.plano = { gerados: r.plano.jogos.slice(n), confrontos: r.plano.confrontos, marcos: r.plano.marcos, resultado: r.plano.resultado };
      } else {
        L.placares = codificarPlacares(r.placares);
      }
    }
  }
  return JSON.parse(JSON.stringify(e));
}

const DIVISOES_BR = ["brasileirao", "serie_b", "serie_c"];
const ligasDe = (m, cod) => (cod === "BR" ? DIVISOES_BR : m.indice.paises.find((p) => p.codigo === cod).ligas);

// Agenda do Brasil num ano: a mesma regra do calendário da carreira
// (virada.buildSeasonCalendar): segundas do ano, rodadas 1–38 nas semanas de
// "temporada", em ordem; turno e returno de calendario.generateAllRounds.
// O jogo é no domingo da semana.
export function agendaBrasil(ano, clubes) {
  const jan1 = Date.UTC(ano, 0, 1);
  const primeira = jan1 + ((8 - new Date(jan1).getUTCDay()) % 7) * 86400000;
  const rodadas = generateAllRounds(clubes);
  const agenda = new Map();
  let r = 1;
  for (let d = primeira; new Date(d).getUTCFullYear() === ano && r <= 38; d += 7 * 86400000) {
    if (CALENDAR_PHASE_BY_MONTH[new Date(d).getUTCMonth()] !== "temporada") continue;
    const semana = new Date(d).toISOString().slice(0, 10);
    const data = new Date(d + 6 * 86400000).toISOString().slice(0, 10);
    agenda.set(semana, (rodadas[r] || []).map((x) => ({ fase: "Fase Regular", rodada: r, data, casa: x.home, fora: x.away })));
    r++;
  }
  return agenda;
}

function agendaDaLiga(m, cod, liga) {
  const P = m.estado.paises[cod];
  if (cod === "BR") return agendaBrasil(P.ano, P.ligas[liga].clubes);
  const comp = m.indice.competicoes[liga];
  const pacote = Rel.agendaDoPacote(m.indice.partidas[liga]);
  if (P.k === 0) return pacote;
  const fases = [...new Set(m.indice.partidas[liga].map((p) => p[0]))];
  const confrontos = comp.regiao === "europa" ? undefined : Fo.geradorDeConfrontos(liga, P.zonas[liga] || null);
  return Rel.agendaGerada({ agendaModelo: pacote, anos: P.k, clubes: P.ligas[liga].clubes, fases, confrontos });
}

// Monta o runtime de um país: agenda da temporada, placares expandidos e,
// na América do Sul, o plano (formatos.js).
function prepararPais(m, cod) {
  const P = m.estado.paises[cod];
  const rt = { ligas: {} };
  for (const liga of ligasDe(m, cod)) {
    const comp = m.indice.competicoes[liga] || { regiao: "brasil" };
    const agenda = agendaDaLiga(m, cod, liga);
    const fixos = [...agenda.values()].flat();
    const L = P.ligas[liga];
    const placares = decodificarPlacares(L.placares || "", fixos.length);
    const r = { agenda, fixos, placares, posicao: new Map(fixos.map((j, i) => [j, i])) };
    if (comp.regiao === "america_sul") {
      const plano = Fo.montarTemporada({
        comp, ano: P.ano, clubes: L.clubes, grupos: P.zonas[liga] || null, jogosFixos: fixos,
        historico: (P.historico || {})[liga] || {}, reservas: reservasAtivas(m, L.clubes), chave: `${m.estado.chave}:${liga}:${P.ano}`,
      });
      // Placares e fases geradas do save (sem reavaliar a cada jogo).
      placares.forEach((p, i) => { if (p) { plano.jogos[i].gh = p.gh; plano.jogos[i].ga = p.ga; } });
      if (L.plano) {
        plano.jogos = [...plano.jogos.slice(0, fixos.length), ...L.plano.gerados];
        plano.confrontos = L.plano.confrontos; plano.marcos = L.plano.marcos; plano.resultado = L.plano.resultado;
      }
      r.plano = plano;
    }
    rt.ligas[liga] = r;
  }
  m.cache[cod] = rt;
}

function reservasAtivas(m, clubes) {
  const set = new Set(clubes.map(S));
  return m.indice.clubes.filter((c) => c.reserva && set.has(S(c.id))).map((c) => c.id)
    .concat(m.indice.terceira.filter((c) => c.clubePai && set.has(S(c.id))).map((c) => c.id));
}

// ---------- força e placar ----------

function clubeDoIndice(m, id) {
  if (!m.cache.porId) {
    const br = m.indice.brasil ? [...Object.values(m.indice.brasil.ligas).flatMap((l) => l.clubes), ...m.indice.brasil.serieD] : [];
    m.cache.porId = new Map([...m.indice.clubes, ...m.indice.terceira, ...br].map((c) => [S(c.id), c]));
  }
  return m.cache.porId.get(S(id)) || null;
}

function forcaBase(m, cod, liga, id) {
  const P = m.estado.paises[cod];
  if (P.forcas[S(id)]) return { atk: P.forcas[S(id)][0], def: P.forcas[S(id)][1] };
  const c = clubeDoIndice(m, id);
  if (c && c.atk != null && c.def != null) return { atk: c.atk, def: c.def };
  // Clube do catálogo sem força no pacote: um pouco abaixo do mais fraco da liga.
  const da = m.indice.brasil && m.indice.brasil.ligas[liga] ? m.indice.brasil.ligas[liga].clubes : m.indice.clubes.filter((x) => x.liga === liga);
  return { atk: Math.min(...da.map((x) => x.atk)) * 0.97, def: Math.max(...da.map((x) => x.def)) * 1.03 };
}

function forcaDeJogo(m, cod, liga, id) {
  const comp = m.indice.competicoes[liga] || m.indice.brasil.ligas[liga];
  return forcaComNivel(forcaBase(m, cod, liga, id), nivelDeGols(comp.mediaGolsPorTime));
}

function placar(m, cod, liga, ano, chaveJogo, casa, fora) {
  const rng = rngDaChave(`${m.estado.chave}:${liga}:${ano}:${chaveJogo}`);
  return scoreGoals(forcaDeJogo(m, cod, liga, casa), forcaDeJogo(m, cod, liga, fora), 1, rng);
}

function simuladorDeDecisao(m, cod, liga, ano, chave) {
  const rng = rngDaChave(`${m.estado.chave}:${liga}:${ano}:${chave}:decisao`);
  return {
    prorrogacao: (p) => scoreGoals(forcaDeJogo(m, cod, liga, p.casa), forcaDeJogo(m, cod, liga, p.fora), 1 / 3, rng),
    penaltis: (p) => (rng() < 0.5 ? p.casa : p.fora),
  };
}

// ---------- tabela europeia ----------

function tabelaEuropeia(m, cod, liga) {
  const r = m.cache[cod].ligas[liga];
  const P = m.estado.paises[cod];
  const comp = m.indice.competicoes[liga];
  const linhas = Object.fromEntries(P.ligas[liga].clubes.map((id) => [S(id), { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }]));
  const resultados = [];
  r.fixos.forEach((j, i) => {
    const p = r.placares[i];
    if (!p) return;
    resultados.push({ home: j.casa, away: j.fora, gh: p.gh, ga: p.ga });
    for (const [id, a, b] of [[j.casa, p.gh, p.ga], [j.fora, p.ga, p.gh]]) {
      const L = linhas[S(id)];
      L.j++; L.gp += a; L.gc += b;
      if (a > b) { L.v++; L.pts += 3; } else if (a === b) { L.e++; L.pts++; } else L.d++;
    }
  });
  return classificar(Object.values(linhas), opcoesDaLiga(comp, m.indice.perfisDesempate, resultados, `${m.estado.chave}:${liga}:${P.ano}`));
}

export function tabelaDaLiga(m, liga) {
  const cod = m.indice.competicoes[liga].pais;
  const r = m.cache[cod].ligas[liga];
  if (r.plano) {
    // América do Sul: a fase de tabela em andamento (a última fixa com jogo).
    const jogados = r.plano.jogos.filter((j) => j.gh != null && !j.conf);
    return { fase: jogados.length ? jogados[jogados.length - 1].fase : null, plano: r.plano };
  }
  return tabelaEuropeia(m, cod, liga);
}

// ---------- semana ----------

// Joga a semana atual de todas as ligas leves e avança o relógio. Devolve os
// acontecimentos da semana ({ tipo: "virada", pais, ... }).
export function avancarSemana(m) {
  const e = m.estado;
  const semana = e.semana;
  const eventos = [];
  for (const cod of Object.keys(e.paises)) {
    if (e.ativos.includes(cod)) continue;
    if (cod === "BR") { semanaBrasil(m, semana, eventos); continue; }
    const regiao = m.indice.paises.find((p) => p.codigo === cod).regiao;
    if (regiao === "europa") semanaEuropa(m, cod, semana, eventos);
    else semanaAmericaDoSul(m, cod, semana, eventos);
  }
  e.semana = Rel.proximaSemana(semana);
  return eventos;
}

function semanaEuropa(m, cod, semana, eventos) {
  const P = m.estado.paises[cod];
  const [l1, l2] = ligasDe(m, cod);
  for (const liga of [l1, l2]) {
    const r = m.cache[cod].ligas[liga];
    // Esta semana e qualquer semana anterior que tenha ficado sem jogar
    // (temporada nova que começou antes do fim da virada da anterior).
    for (const [s, jogos] of r.agenda) {
      if (s > semana) break;
      for (const j of jogos) {
        const i = r.posicao.get(j);
        if (!r.placares[i]) r.placares[i] = placar(m, cod, liga, P.ano, i, j.casa, j.fora);
      }
    }
  }
  const fimRegular = [l1, l2].map((l) => Rel.ultimaSemana(m.cache[cod].ligas[l].agenda)).sort().pop();
  if (semana < fimRegular) return;
  const completo = [l1, l2].every((l) => m.cache[cod].ligas[l].placares.every(Boolean));
  if (!completo) return;
  if (!P.pos) {
    const tab = {};
    for (const l of [l1, l2]) {
      const t = tabelaEuropeia(m, cod, l).ordem;
      tab[l] = { ordem: t.map((x) => x.id), pontos: Object.fromEntries(t.map((x) => [x.id, x.pts])) };
    }
    const divAtual = (id) => (P.ligas[l1].clubes.some((x) => S(x) === S(id)) ? 1 : P.ligas[l2].clubes.some((x) => S(x) === S(id)) ? 2 : null);
    const temBarrage = !!(m.indice.competicoes[l2].regras || {}).interDivisionPlayoff;
    const rep = temBarrage ? Vp.sortearRepresentante({ catalogo: catalogoDoPais(m, cod), divisaoAtual: divAtual, chave: `${m.estado.chave}:${cod}:${P.ano}` }) : null;
    P.pos = Fa.montarPosTemporada({
      pais: cod, comps: [m.indice.competicoes[l1], m.indice.competicoes[l2]], ordens: { [l1]: tab[l1].ordem, [l2]: tab[l2].ordem },
      pontos: { [l1]: tab[l1].pontos, [l2]: tab[l2].pontos }, reservas: reservasAtivas(m, [...P.ligas[l1].clubes, ...P.ligas[l2].clubes]),
      representanteTerceira: rep, chave: `${m.estado.chave}:${cod}:${P.ano}`,
    });
    P.pos.quedaD2 = tab[l2].ordem.slice().reverse();
    P.pos.ordemD1 = tab[l1].ordem.slice();
    P.pos.fimRegular = fimRegular;
  }
  // Pernas desta semana (semanaRel 1 = a semana depois do fim da fase regular).
  const rel = Rel.semanasEntre(P.pos.fimRegular, semana);
  for (let guarda = 0; guarda < 50; guarda++) {
    const [p] = Fa.pernasPendentes(P.pos).filter((x) => x.semanaRel <= rel);
    if (!p) break;
    const liga = P.pos.confrontos.find((c) => c.id === p.confronto).divisao;
    const sim = simuladorDeDecisao(m, cod, liga, P.ano, `${p.confronto}:${p.perna}`);
    Fa.registrarPerna(P.pos, p.confronto, placar(m, cod, liga, P.ano, `${p.confronto}:${p.perna}`, p.casa, p.fora), sim);
  }
  if (!Fa.concluido(P.pos)) return;
  const res = Fa.resultado(P.pos);
  virada(m, cod, {
    sobemD2: res.sobem[l2], descemD1: res.descem[l1], descemD2: res.descem[l2], sobemTerceira: res.sobem.terceira,
    quedaD2: P.pos.quedaD2, campeoes: res.campeao, ordemD1: P.pos.ordemD1,
  }, semana, eventos);
}

function semanaAmericaDoSul(m, cod, semana, eventos) {
  const P = m.estado.paises[cod];
  const [l1, l2] = ligasDe(m, cod);
  const ate = domingo(semana);
  for (const liga of [l1, l2]) {
    const plano = m.cache[cod].ligas[liga].plano;
    for (let guarda = 0; guarda < 500 && !Fo.concluida(plano); guarda++) {
      const [j] = Fo.jogosPendentes(plano, ate);
      if (!j) break;
      Fo.registrarJogo(plano, j.id, placar(m, cod, liga, P.ano, j.id, j.casa, j.fora), simuladorDeDecisao(m, cod, liga, P.ano, j.id));
    }
  }
  const p1 = m.cache[cod].ligas[l1].plano, p2 = m.cache[cod].ligas[l2].plano;
  if (!Fo.concluida(p1) || !Fo.concluida(p2)) return;
  const r1 = p1.resultado, r2 = p2.resultado;
  // Histórico do promedio (a temporada que acabou entra).
  for (const [liga, r] of [[l1, r1], [l2, r2]]) {
    if (!r.promedio) continue;
    const janela = m.indice.competicoes[liga].regras.relegation.seasonWindow;
    const porClube = Object.fromEntries(Object.entries(r.promedio).map(([id, x]) => [id, { pts: x.ptsTemporada, j: x.jTemporada }]));
    P.historico[liga] = Vp.atualizarHistorico(P.historico[liga] || {}, P.ano, porClube, janela);
  }
  const quedaD2 = r2.promedio
    ? Object.keys(r2.promedio).map(N).sort((a, b) => r2.promedio[a].pts * r2.promedio[b].j - r2.promedio[b].pts * r2.promedio[a].j)
    : (r2.anual || r2.reclassificacao || [...(r2.zonas ? [...r2.zonas.A, ...r2.zonas.B] : []), ...(r2.grupos ? Object.values(r2.grupos).flat() : [])]).slice().reverse();
  virada(m, cod, {
    sobemD2: r2.sobem.map((x) => x.id), descemD1: r1.descem.map((x) => x.id), descemD2: r2.descem.map((x) => x.id), sobemTerceira: [],
    quedaD2, campeoes: { [l1]: r1.campeoes, [l2]: r2.campeoes }, ordemD1: r1.anual || r1.reclassificacao || null,
  }, semana, eventos);
}

function catalogoDoPais(m, cod) {
  const P = m.estado.paises[cod];
  return P.catalogo.map((id) => {
    const extra = P.catalogoExtra[S(id)];
    if (extra) return { id, ...extra };
    const c = clubeDoIndice(m, id);
    return { id, elegibilidade: c && c.elegibilidade, clubePai: c && c.clubePai, grupo: c && c.grupo };
  });
}

function virada(m, cod, mov, semana, eventos) {
  const P = m.estado.paises[cod];
  const [l1, l2] = ligasDe(m, cod);
  const reservas = m.indice.clubes.filter((c) => c.reserva && c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai }))
    .concat(m.indice.terceira.filter((c) => c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai })));
  const zonasArg = Object.fromEntries(Object.entries(P.zonas).filter(([l]) => l.startsWith("arg_")));
  const v = Vp.aplicarVirada({
    pais: cod, chave: `${m.estado.chave}:${cod}:${P.ano}`, d1: { id: l1, clubes: P.ligas[l1].clubes }, d2: { id: l2, clubes: P.ligas[l2].clubes },
    sobemD2: mov.sobemD2, descemD1: mov.descemD1, descemD2: mov.descemD2, sobemTerceira: mov.sobemTerceira, quedaD2: mov.quedaD2,
    catalogo: catalogoDoPais(m, cod), reservas, humano: null,
    zonas: Object.keys(zonasArg).length ? zonasArg : undefined,
  });
  // Força de quem mudou de divisão: pela razão dos níveis das ligas.
  const nivel = (l) => m.indice.competicoes[l].nivel || 1;
  const nivelDe = (id) => (P.ligas[l1].clubes.some((x) => S(x) === S(id)) ? nivel(l1) : P.ligas[l2].clubes.some((x) => S(x) === S(id)) ? nivel(l2) : nivel(l2) * NIVEL_TERCEIRA);
  const nivelNovo = (id) => (v[l1].some((x) => S(x) === S(id)) ? nivel(l1) : v[l2].some((x) => S(x) === S(id)) ? nivel(l2) : nivel(l2) * NIVEL_TERCEIRA);
  const mudaram = [...mov.sobemD2, ...mov.descemD1, ...v.entraramDoCatalogo, ...v.foramParaOCatalogo];
  for (const id of mudaram) {
    const ligaAntes = P.ligas[l1].clubes.some((x) => S(x) === S(id)) ? l1 : l2;
    const f = forcaBase(m, cod, ligaAntes, id);
    const fator = Math.pow(nivelDe(id) / nivelNovo(id), AMORTECIMENTO_NIVEL);
    P.forcas[S(id)] = [Math.round(f.atk * fator * 1000) / 1000, Math.round(f.def / fator * 1000) / 1000];
  }
  const resumo = {
    ano: P.ano, semana, campeoes: mov.campeoes,
    sobem: mov.sobemD2, descem: mov.descemD1, entraram: v.entraramDoCatalogo, sairam: v.foramParaOCatalogo, excecoes: v.excecoes,
  };
  P.viradas = [...P.viradas, resumo].slice(-3);
  P.campeoes = [...P.campeoes, { ano: P.ano, [l1]: mov.campeoes[l1], [l2]: mov.campeoes[l2] }].slice(-20);
  // Classificação da 1ª divisão para as copas continentais (M9b).
  if (mov.ordemD1) P.classificacao = classificacaoDaTemporada(P.ano, mov.campeoes[l1], mov.ordemD1);
  // Composição e catálogo novos.
  P.ligas[l1] = { clubes: v[l1], placares: "" };
  P.ligas[l2] = { clubes: v[l2], placares: "" };
  const extras = {};
  for (const c of v.catalogo) {
    const doIndice = clubeDoIndice(m, c.id);
    if (!doIndice || doIndice.liga || c.exJogavel) extras[S(c.id)] = { elegibilidade: c.elegibilidade, clubePai: c.clubePai ?? null, grupo: c.grupo ?? null };
  }
  P.catalogo = v.catalogo.map((c) => c.id);
  P.catalogoExtra = extras;
  if (v.zonas) Object.assign(P.zonas, v.zonas);
  if (cod === "UY") P.zonas.uru_segunda = Vp.sortearGrupos(v[l2], ["A", "B"], `${m.estado.chave}:UY:${P.ano + 1}`);
  P.pos = null;
  P.k += 1;
  P.ano += 1;
  prepararPais(m, cod);
  eventos.push({ tipo: "virada", pais: cod, ...resumo });
}

// Classificação final da 1ª divisão de um país (M9b, copas continentais):
// { ano, campeoes: [ids na ordem dos títulos], ordem: [ids] }. Os campeões
// vêm do formato de cada liga (número, ou objeto por título).
const PRIORIDADE_TITULO = ["campeonato", "uruguaio", "Apertura", "Clausura", "Intermedio", "anual"];
export function classificacaoDaTemporada(ano, campeoes, ordem) {
  let lista = [];
  if (campeoes != null && typeof campeoes === "object") {
    const chaves = Object.keys(campeoes).sort((a, b) => (PRIORIDADE_TITULO.indexOf(a) + 1 || 99) - (PRIORIDADE_TITULO.indexOf(b) + 1 || 99));
    lista = chaves.map((k) => campeoes[k]);
  } else if (campeoes != null) lista = [campeoes];
  const vistos = new Set();
  const camp = lista.filter((id) => id != null && !vistos.has(S(id)) && vistos.add(S(id))).map(N);
  return { ano, campeoes: camp, ordem: (ordem || []).map(N) };
}

// Pré-simulação do início do save: joga todas as semanas até a do início.
export function prepararInicio(m) {
  const eventos = [];
  while (m.estado.semana < m.estado.inicioJogo) eventos.push(...avancarSemana(m));
  return eventos;
}

// ---------- Brasil (M6b-5b) ----------
// A semana do Brasil e a virada pela cascata de sempre (temporada.
// promotionRelegation): 4 descem e 4 sobem entre A, B e C (com o perdão da
// tradição), 4 sobem do catálogo da Série D por sorteio; a força de quem muda
// de divisão pela regra da carreira (arrivalStrength).
function semanaBrasil(m, semana, eventos) {
  const P = m.estado.paises.BR;
  for (const liga of DIVISOES_BR) {
    const r = m.cache.BR.ligas[liga];
    for (const [s, jogos] of r.agenda) {
      if (s > semana) break;
      for (const j of jogos) {
        const i = r.posicao.get(j);
        if (!r.placares[i]) r.placares[i] = placar(m, "BR", liga, P.ano, i, j.casa, j.fora);
      }
    }
  }
  if (!DIVISOES_BR.every((l) => m.cache.BR.ligas[l].placares.length && m.cache.BR.ligas[l].placares.every(Boolean))) return;
  // Tabelas finais (critérios do Brasileirão, tabela.sortRows).
  const tabela = (liga) => {
    const r = m.cache.BR.ligas[liga];
    const linhas = Object.fromEntries(P.ligas[liga].clubes.map((id) => [S(id), { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }]));
    r.fixos.forEach((j, i) => {
      const p = r.placares[i];
      for (const [id, a, b] of [[j.casa, p.gh, p.ga], [j.fora, p.ga, p.gh]]) {
        const L = linhas[S(id)];
        L.j++; L.gp += a; L.gc += b; L.sg = L.gp - L.gc;
        if (a > b) { L.v++; L.pts += 3; } else if (a === b) { L.e++; L.pts++; } else L.d++;
      }
    });
    return sortRows(linhas);
  };
  const rows = { A: tabela("brasileirao"), B: tabela("serie_b"), C: tabela("serie_c") };
  const time = (id) => { const f = forcaBase(m, "BR", null, id); const c = clubeDoIndice(m, id) || {}; return { id, name: c.nome, atk: f.atk, def: f.def }; };
  const teams = { A: P.ligas.brasileirao.clubes.map(time), B: P.ligas.serie_b.clubes.map(time), C: P.ligas.serie_c.clubes.map(time) };
  const dPool = P.catalogo.map(time);
  const ch = `${m.estado.chave}:BR:${P.ano}`;
  const plano = promotionRelegation({ rows, teams, dPool, protectedC: null, reprieveRng: { A: rngDaChave(`${ch}:A`), B: rngDaChave(`${ch}:B`), C: rngDaChave(`${ch}:C`) }, rng: rngDaChave(`${ch}:D`) });
  plano.strength.forEach(({ team, atk, def }) => { P.forcas[S(team.id)] = [Math.round(atk * 1000) / 1000, Math.round(def * 1000) / 1000]; });
  const novo = plano.compose();
  const ids = (l) => l.map((t) => t.id);
  const resumo = {
    ano: P.ano, semana, campeoes: { brasileirao: rows.A[0].id, serie_b: rows.B[0].id, serie_c: rows.C[0].id },
    sobem: [...plano.promotedB, ...plano.promotedC], descem: [...plano.relegatedA, ...plano.relegatedB],
    entraram: ids(novo.promotedD), sairam: plano.relegatedC, excecoes: [],
  };
  P.viradas = [...P.viradas, resumo].slice(-3);
  P.campeoes = [...P.campeoes, { ano: P.ano, ...resumo.campeoes }].slice(-20);
  P.classificacao = classificacaoDaTemporada(P.ano, rows.A[0].id, ids(rows.A));
  P.ligas.brasileirao = { clubes: ids(novo.newA), placares: "" };
  P.ligas.serie_b = { clubes: ids(novo.newB), placares: "" };
  P.ligas.serie_c = { clubes: ids(novo.newC), placares: "" };
  P.catalogo = ids(novo.newDPool);
  P.k += 1; P.ano += 1;
  prepararPais(m, "BR");
  eventos.push({ tipo: "virada", pais: "BR", ...resumo });
}
