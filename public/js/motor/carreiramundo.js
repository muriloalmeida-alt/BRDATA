/* ===================================================================
   MOTOR — CARREIRA NUM PAÍS DO MUNDO (MUNDO-001, M6b-3, 24/11/2026)
   -------------------------------------------------------------------
   Cria a carreira num clube da Europa ou da América do Sul a partir do
   índice do mundo (server/frozen-catalog/mundo/mundo.json), reaproveitando
   a montagem de sempre (virada.montarCarreira: elenco, finanças, metas,
   estádio, patrocínio...) e trocando o que é do Brasil:
   - divisões do país (as 2 jogáveis) com simulação completa (PARIDADE-CPU);
   - calendário e rodadas pela agenda do relógio (calendariomundo.js), com o
     ano em cada semana e a janela do país;
   - sem Copa do Brasil e sem Série D (o catálogo de 3ª fica no mundo leve);
   - os outros 9 países no mundo leve (mundoleve.js), pré-simulados até a
     pré-temporada da liga escolhida (MUN-06), em CAREER.mundo.
   Elencos: os do pacote (rota /api/career/mundo/elencos/<liga>), pelo
   construtor de jogador de sempre, com o ajuste de nível da liga (MUN-02).

   A temporada do técnico (fases, mata-matas, virada do país) liga-se na
   M6b-4; até lá, a liga do técnico joga a fase de liga pelas rodadas.
=================================================================== */
import { carreiraAtual, definirCompeticaoAtual, definirLigaAtual, definirTodosTimes, todosTimes, ganchosMundo } from "./estado.js";
import * as estado from "./estado.js";
import { ambiente } from "./semana.js";
import { buildSquad, buildLeagueSquads, montarCarreira, buildFriendlySlots, buildSeasonCalendar } from "./virada.js";
import * as Rel from "./relogio.js";
import * as CM from "./calendariomundo.js";
import * as ML from "./mundoleve.js";
import * as Fo from "./formatos.js";
import * as partida from "./partida.js";

import * as Fa from "./fases.js";
import * as Vp from "./viradapais.js";
import { classificar, opcoesDaLiga, rngDaChave } from "./desempate.js";
import { buildLeagueSquad } from "./virada.js";
const montarElencoCpu = buildLeagueSquad;
import { viradaDoCaixaCpu } from "./semana.js";
import * as temporada from "./temporada.js";
import * as tabela from "./tabela.js";
import * as texto from "./texto.js";
import * as financas from "./financas.js";
import * as mercado from "./mercado.js";
import * as E from "./economia.js";
import * as Copas from "./copasmundo.js";
import * as CopasUefa from "./copasuefa.js";

// Pontos de overall por unidade de nível da liga (gameplayLevel) acima de 1
// (parâmetro de balanceamento; a Premier League, 1,22, ganha ~5,5).
export const OVERALL_POR_NIVEL = 25;

// Índice do mundo em memória (estático: não vai no save) e o mundo leve aberto.
let indiceAtual = null;
let leve = null; // { estado (o objeto em CAREER.mundoLeve), m (runtime) }
export function definirIndiceDoMundo(indice) { indiceAtual = indice; leve = null; }
export function indiceDoMundo() { return indiceAtual; }

// A semana do calendário da carreira (segunda-feira com o ano).
export function semanaDaCarreira(CAREER) {
  const w = CAREER.calendar && CAREER.calendar.weeks[CAREER.calendar.idx];
  if (!w) return null;
  // Save do mundo: o ano vem na semana; Brasil: o ano do calendário.
  const ano = w.a || CAREER.calendar.year;
  return ano ? `${ano}-${w.d}` : null;
}

// Anda o mundo leve até a semana da carreira (as semanas antes dela jogadas).
// Devolve os acontecimentos (viradas dos outros países).
export function avancarMundoLeve(CAREER) {
  const alvo = semanaDaCarreira(CAREER);
  if (!CAREER.mundoLeve || !alvo || !indiceAtual) return [];
  if (!leve || leve.estado !== CAREER.mundoLeve) leve = { estado: CAREER.mundoLeve, m: ML.abrirMundo(CAREER.mundoLeve, indiceAtual) };
  const eventos = [];
  while (leve.m.estado.semana < alvo) eventos.push(...ML.avancarSemana(leve.m));
  // O placar da semana muda o estado: o save leva o estado novo.
  CAREER.mundoLeve = ML.salvarMundo(leve.m);
  leve.estado = CAREER.mundoLeve;
  return eventos;
}
ganchosMundo.semanaDoMundo = (CAREER) => {
  const ev = avancarMundoLeve(CAREER);
  semanaDasFasesGeradas(CAREER);
  // Copas da CONMEBOL (M9b): os jogos da semana, com o mundo já nela.
  const semana = semanaDaCarreira(CAREER);
  // Copas da UEFA (M10b): idem. Um erro nas copas nunca trava a carreira (a
  // semana, a partida e a gravação seguem): a edição com erro é encerrada.
  return ev.concat(semanaDasCopasSegura(CAREER, "conmebol", () => Copas.semanaDasCopas(CAREER, indiceAtual, semana)),
    semanaDasCopasSegura(CAREER, "uefa", () => CopasUefa.semanaDasCopasUefa(CAREER, indiceAtual, semana)));
};
function semanaDasCopasSegura(CAREER, confed, fn) {
  try {
    return fn();
  } catch (e) {
    const C = CAREER.copas && CAREER.copas[confed];
    if (C) {
      const ano = C.edicao && C.edicao.ano;
      C.edicao = null; C.pendente = null;
      C.erros = [...(C.erros || []), { ano: ano ?? null, motivo: String((e && e.message) || e).slice(0, 200) }].slice(-5);
    }
    if (typeof console !== "undefined" && console.warn) console.warn(`mundo: copas ${confed} com erro, edição encerrada:`, e);
    return [{ tipo: "erro", confed, motivo: String((e && e.message) || e) }];
  }
};

// Fim da temporada no Brasil com o mundo anexado (M9b): a classificação da
// Série A (e o campeão da Copa do Brasil) para as copas continentais, antes
// de a virada zerar as tabelas.
export function fimDaTemporadaNoBrasil(CAREER) {
  const P = CAREER.mundoLeve && CAREER.mundoLeve.paises.BR;
  if (!P) return;
  const st = CAREER.competitionId === "brasileirao" ? CAREER.standings : CAREER.otherDivisions && CAREER.otherDivisions.brasileirao && CAREER.otherDivisions.brasileirao.standings;
  if (!st) return;
  const ordem = tabela.sortRows(st).map((r) => r.id);
  const copa = CAREER.cup && CAREER.cup.champion != null ? CAREER.cup.champion : null;
  P.classificacao = ML.classificacaoDaTemporada(CAREER.seasonYear - 1, { campeonato: ordem[0], Copa: copa }, ordem);
}
ganchosMundo.fimDaTemporada = (CAREER) => fimDaTemporadaNoBrasil(CAREER);

// ---------- moeda e porte (M7) ----------
// Decisões do Murilo (24/11): economia única pelo overall (salário, valor e
// orçamento pela regra de hoje); dos pacotes, só o porte relativo entre os
// clubes da mesma liga. A moeda do país é só exibição (texto.fmtBRL).
export function moedaDoPais(indice, cod) {
  const p = indice.paises.find((x) => x.codigo === cod);
  return p ? p.moeda : "BRL";
}
// Porte relativo de um clube na liga pelo número do pacote (receita anual ou
// TV): raiz da razão com a mediana da liga, entre 0,6 e 1,8.
export const PORTE_MIN = 0.6, PORTE_MAX = 1.8;
export function porteDoClube(indice, id, campo = "annualRevenue") {
  const c = indice.clubes.find((x) => String(x.id) === String(id));
  if (!c || !c.financas || !(c.financas[campo] > 0)) return 1;
  const valores = indice.clubes.filter((x) => x.liga === c.liga && x.financas && x.financas[campo] > 0).map((x) => x.financas[campo]).sort((a, b) => a - b);
  const mediana = valores[Math.floor(valores.length / 2)];
  return Math.max(PORTE_MIN, Math.min(PORTE_MAX, Math.sqrt(c.financas[campo] / mediana)));
}
ganchosMundo.moeda = (codigo) => texto.definirMoeda(codigo);

export function paisDaLiga(indice, liga) {
  const p = indice.paises.find((x) => x.ligas.includes(liga));
  if (!p) throw new Error(`mundo: liga fora do índice (${liga})`);
  return p;
}

// Clubes de uma liga no formato do motor (o mesmo dos times do Brasil).
export function timesDaLiga(indice, liga) {
  const comp = indice.competicoes[liga];
  const ajusteNivel = comp.nivel ? Math.round((comp.nivel - 1) * OVERALL_POR_NIVEL * 10) / 10 : 0;
  return indice.clubes.filter((c) => c.liga === liga).map((c) => ({
    id: c.id, name: c.nome, short: c.sigla, logo: c.escudo || c.logoOrigem || null,
    c1: c.c1 || "#0057B8", c2: c.c2 || "#062B5C",
    venue: c.estadio ? { name: c.estadio.nome, city: c.estadio.cidade, capacity: c.estadio.capacidade } : null,
    atk: c.atk, def: c.def, competitionId: liga, ajusteNivel,
  }));
}

// Elencos do mundo para o construtor de jogador: o ambiente.buscarJogadores
// de sempre passa a responder pelos clubes do mundo (com os elencos já
// baixados por liga); os outros clubes seguem pelo caminho de antes.
export function instalarElencos(porTime) {
  const anterior = ambiente.buscarJogadores;
  ambiente.buscarJogadores = async (teamId, comp) => {
    const lista = porTime[String(teamId)];
    if (lista) return lista;
    return anterior ? anterior(teamId, comp) : [];
  };
}

// o = { indice, liga, clubId, elencosDaLiga: async (liga) => playersByTeamId }
export async function criarCarreiraNoMundo(o) {
  const { indice, liga } = o;
  definirIndiceDoMundo(indice);
  const pais = paisDaLiga(indice, liga);
  const [l1, l2] = pais.ligas;
  const outra = liga === l1 ? l2 : l1;
  // Composição: a do pacote (carreira nova) ou a do mundo leve (troca de país,
  // M8b), com a força guardada de quem mudou de divisão.
  const Pleve = o.mundoLeve ? o.mundoLeve.paises[pais.codigo] : null;
  const times = Pleve
    ? Object.fromEntries([l1, l2].map((l) => [l, Pleve.ligas[l].clubes.map((id) => timeDoMundo(indice, Pleve, id, l))]))
    : { [l1]: timesDaLiga(indice, l1), [l2]: timesDaLiga(indice, l2) };
  const club = times[liga].find((t) => String(t.id) === String(o.clubId));
  if (!club) throw new Error(`mundo: clube ${o.clubId} fora da ${liga}`);

  // Elencos das duas divisões do país (simulação completa).
  const porTime = {};
  for (const l of [l1, l2]) Object.assign(porTime, await o.elencosDaLiga(l));
  instalarElencos(porTime);

  // O mundo do motor: liga do técnico, as duas divisões e o nível de gols.
  const comp = indice.competicoes[liga];
  estado.definirTemporadaReal(comp.temporada.anoInicial);
  definirCompeticaoAtual(liga);
  definirLigaAtual(times[liga].map((t) => ({ ...t, competitionId: undefined })));
  definirTodosTimes([...times[l1], ...times[l2]]);
  estado.definirModoReal(true);
  const liveModeByCompetition = {};
  for (const l of [l1, l2]) {
    liveModeByCompetition[l] = true;
    estado.modoRealPorCompeticao()[l] = true;
    const nivel = partida.nivelDeGols(indice.competicoes[l].mediaGolsPorTime);
    if (nivel) estado.niveisDeGolsDaCarga()[l] = nivel;
  }

  const squad = await buildSquad(club);
  const leagueSquads = await buildLeagueSquads(club.id, todosTimes());
  montarCarreira(club, squad, leagueSquads, liveModeByCompetition, {
    divisoes: [l1, l2], pais: pais.codigo, mundo: true,
  });
  const CAREER = carreiraAtual();
  estado.completarNivelGols(CAREER, liveModeByCompetition);

  // Sem Copa do Brasil e sem Série D.
  CAREER.cup = null;
  CAREER.serieDPool = [];
  // Nomes das ligas do país para as telas da v2 (M10c).
  CAREER.nomesDasLigas = { [l1]: indice.competicoes[l1].nome, [l2]: indice.competicoes[l2].nome };

  // Moeda do país (exibição) e porte do clube (M7): o caixa do técnico e o
  // caixa guardado dos clubes da CPU do país pelo porte relativo na liga.
  CAREER.moeda = moedaDoPais(indice, pais.codigo);
  texto.definirMoeda(CAREER.moeda);
  CAREER.finances.cash = Math.round(CAREER.finances.cash * porteDoClube(indice, club.id) / 1000) * 1000;
  CAREER.caixaCpu = CAREER.caixaCpu || {};
  for (const [id, sq] of Object.entries(CAREER.leagueSquads)) {
    const wageCap = Math.round(financas.wageBill(sq) * 1.35 / 1000) * 1000;
    CAREER.caixaCpu[id] = Math.round(mercado.caixaNormal(wageCap) * porteDoClube(indice, id) / 1000) * 1000;
  }
  // ECON-001b: economia v2 na carreira nova (e na troca de país de quem já
  // estava nela): substitui o caixa pelo porte logo acima.
  if (!Pleve || o.economiaV2) ativarEconomiaV2(CAREER, indice);

  if (Pleve) {
    // Troca de país (M8b): o mesmo mundo; o país novo sai do mundo leve.
    CAREER.mundoLeve = { ...o.mundoLeve, ativos: [pais.codigo] };
    CAREER.mundo = { formato: 1, versaoCatalogo: indice.versao, pais: pais.codigo, k: Pleve.k, ano: Pleve.ano };
    aplicarCalendario(CAREER, indice, Pleve.k);
    // A semana da carreira não volta atrás: começa na semana do mundo.
    const idx = CAREER.calendar.weeks.findIndex((w) => `${w.a}-${w.d}` >= CAREER.mundoLeve.semana);
    CAREER.calendar.idx = Math.max(0, idx);
    leve = null;
    return CAREER;
  }

  // Calendário e rodadas pela agenda do relógio.
  aplicarCalendario(CAREER, indice, 0);

  // Os outros países no mundo leve, até a pré-temporada da liga escolhida.
  const m = ML.abrirMundo(ML.criarMundoLeve(indice, { ligaEscolhida: liga, ativos: [pais.codigo], chave: `mundo:${CAREER.clubId}` }), indice);
  ML.prepararInicio(m);
  CAREER.mundoLeve = ML.salvarMundo(m);
  CAREER.mundo = { formato: 1, versaoCatalogo: indice.versao, pais: pais.codigo, k: 0, ano: comp.temporada.anoInicial };
  return CAREER;
}

// Time de uma liga do mundo pela composição do mundo leve: do índice (clube
// jogável ou do catálogo de 3ª), com a força guardada quando mudou de divisão.
export function timeDoMundo(indice, P, id, liga) {
  const S = String(id);
  const c = indice.clubes.find((x) => String(x.id) === S) || indice.terceira.find((x) => String(x.id) === S);
  const comp = indice.competicoes[liga];
  const ajusteNivel = comp && comp.nivel ? Math.round((comp.nivel - 1) * OVERALL_POR_NIVEL * 10) / 10 : 0;
  const f = P && P.forcas && P.forcas[S];
  const fraco = () => { const ts = timesDaLiga(indice, liga); return { atk: Math.min(...ts.map((t) => t.atk)) * 0.97, def: Math.max(...ts.map((t) => t.def)) * 1.03 }; };
  const base = f ? { atk: f[0], def: f[1] } : c && c.atk != null ? { atk: c.atk, def: c.def } : fraco();
  return {
    id: c.id, name: c.nome, short: c.sigla, logo: c.escudo || c.logoOrigem || null, c1: c.c1 || "#5B6B7F", c2: c.c2 || "#1F2933",
    venue: c.estadio ? { name: c.estadio.nome, city: c.estadio.cidade || null, capacity: c.estadio.capacidade } : null,
    ...base, competitionId: liga, ajusteNivel,
  };
}

// Agenda de uma liga do país do técnico na temporada k (0 = a do pacote),
// pelo mesmo caminho do mundo leve (fases fixas e gerador de cada liga).
// zonas: as zonas/grupos da temporada (Argentina, Segunda uruguaia).
export function agendaDaLiga(indice, liga, k, clubes, zonas) {
  const pacote = Rel.agendaDoPacote(indice.partidas[liga]);
  if (!k) return pacote;
  const comp = indice.competicoes[liga];
  const fases = [...new Set(indice.partidas[liga].map((p) => p[0]))];
  const confrontos = comp.regiao === "europa" ? undefined : Fo.geradorDeConfrontos(liga, zonas || indice.grupos[liga] || null);
  return Rel.agendaGerada({ agendaModelo: pacote, anos: k, clubes: clubes || indice.clubes.filter((c) => c.liga === liga).map((c) => c.id), fases, confrontos });
}

// Calendário, rodadas do técnico e jogos da outra divisão da temporada k.
// A outra divisão joga pelas datas: o jogo de uma semana sem rodada do
// técnico vai para a rodada seguinte dele (a última, no fim).
export function aplicarCalendario(CAREER, indice, k) {
  const [l1, l2] = CAREER.divisoes;
  const liga = CAREER.competitionId;
  const outra = liga === l1 ? l2 : l1;
  const clubesDe = (l) => (CAREER.divisionTeams && CAREER.divisionTeams[l] ? CAREER.divisionTeams[l].map((t) => t.id) : null);
  // Zonas/grupos da temporada: na entrada do país no mundo leve (a virada as atualiza).
  const P = CAREER.mundoLeve && CAREER.mundo && CAREER.mundoLeve.paises[CAREER.mundo.pais];
  const zonasDe = (l) => (P && P.zonas && P.zonas[l]) || null;
  const c = CM.montarCalendarioDaCarreira({
    agendaTecnico: agendaDaLiga(indice, liga, k, clubesDe(liga), zonasDe(liga)),
    agendaSeguinte: agendaDaLiga(indice, liga, k + 1, clubesDe(liga), zonasDe(liga)),
    outras: { [outra]: agendaDaLiga(indice, outra, k, clubesDe(outra), zonasDe(outra)) },
    janelas: paisDaLiga(indice, liga).janelas, k,
  });
  CAREER.calendar = c.calendar;
  CAREER.calendar.friendlies = buildFriendlySlots(CAREER.calendar);
  // Cota de TV mensal: a regra do Brasil (pelos custos do clube) vezes o
  // porte do clube na TV da liga (M7).
  CAREER.calendar.tvMonthly = Math.round(buildSeasonCalendar(indice.competicoes[liga].temporada.anoInicial + k).tvMonthly * porteDoClube(indice, CAREER.clubId, "monthlyTV") / 1000) * 1000;
  CAREER.rodadasLiga = c.rodadas;
  CAREER.schedule = Object.fromEntries(Object.entries(c.schedule).map(([r, js]) => [r, js.map((m) => ({ home: m.home, away: m.away }))]));
  CAREER.seasonYear = indice.competicoes[liga].temporada.anoInicial + k;
  const rodadaDaEntrada = (idx) => {
    for (let i = idx; i < c.calendar.weeks.length; i++) if (c.calendar.weeks[i].r) return c.calendar.weeks[i].r;
    return c.rodadas;
  };
  const sched = {};
  for (const [idx, jogos] of Object.entries(c.outras[outra])) {
    const r = rodadaDaEntrada(Number(idx));
    (sched[r] ||= []).push(...jogos.map((m) => ({ home: m.home, away: m.away })));
  }
  if (CAREER.otherDivisions && CAREER.otherDivisions[outra]) CAREER.otherDivisions[outra].schedule = sched;
  return c;
}

// ---------- América do Sul no país do técnico (M6b-4b) ----------
// O plano da temporada (formatos.js) de cada liga do país. Os jogos das
// fases de tabela fixa são os que o motor joga por rodada (a liga do técnico
// e a outra divisão): o placar chega pelo gancho resultadoDoMundo. As fases
// geradas (mata-matas, quadrangulares, hexagonais, Intermedio, finais e
// acesso) são jogadas pela semana, com a mesma conta de gols, inclusive as
// do técnico (a partida ao vivo nessas fases fica para uma etapa seguinte).
// O save guarda o plano compacto em CAREER.mundo.planos (placares das fases
// fixas numa string; o resto como está).
const FASES_FIXAS = new Set(["Fase Regular", "Apertura", "Clausura", "Competencia", "Fase Inicial"]);
let planos = null; // { career, k, porLiga: { liga: { plano, n, porPar } } }

function paisDoTecnicoNaAmericaDoSul(CAREER) {
  if (!CAREER || !CAREER.mundo || !CAREER.mundoLeve || !indiceAtual) return false;
  const p = indiceAtual.paises.find((x) => x.codigo === CAREER.mundo.pais);
  return !!p && p.regiao === "america_sul";
}

export function abrirPlanos(CAREER) {
  if (planos && planos.career === CAREER && planos.k === CAREER.mundo.k) return planos;
  const indice = indiceAtual;
  const P = CAREER.mundoLeve.paises[CAREER.mundo.pais];
  const S = (x) => String(x);
  const porLiga = {};
  for (const liga of CAREER.divisoes) {
    const comp = indice.competicoes[liga];
    const clubes = CAREER.divisionTeams[liga].map((t) => t.id);
    const zonas = (P.zonas || {})[liga] || null;
    const fixos = [...agendaDaLiga(indice, liga, CAREER.mundo.k, clubes, zonas).values()].flat();
    const set = new Set(clubes.map(S));
    const reservas = indice.clubes.filter((c) => c.reserva && set.has(S(c.id))).map((c) => c.id)
      .concat(indice.terceira.filter((c) => c.clubePai && set.has(S(c.id))).map((c) => c.id));
    const plano = Fo.montarTemporada({
      comp, ano: CAREER.mundo.ano, clubes, grupos: zonas, jogosFixos: fixos,
      historico: (P.historico || {})[liga] || {}, reservas, chave: `${CAREER.mundoLeve.chave}:${liga}:${CAREER.mundo.ano}`,
    });
    const salvo = (CAREER.mundo.planos || {})[liga];
    if (salvo) {
      ML.decodificarPlacares(salvo.placares || "", fixos.length).forEach((x, i) => { if (x) { plano.jogos[i].gh = x.gh; plano.jogos[i].ga = x.ga; } });
      plano.jogos = [...plano.jogos.slice(0, fixos.length), ...(salvo.gerados || [])];
      plano.confrontos = salvo.confrontos || []; plano.marcos = salvo.marcos || {}; plano.resultado = salvo.resultado || null;
    }
    const porPar = new Map();
    fixos.forEach((j, i) => { const k = `${S(j.casa)}|${S(j.fora)}`; if (!porPar.has(k)) porPar.set(k, []); porPar.get(k).push(i); });
    porLiga[liga] = { plano, n: fixos.length, porPar };
  }
  planos = { career: CAREER, k: CAREER.mundo.k, porLiga };
  return planos;
}

function guardarPlanos(CAREER) {
  const pl = abrirPlanos(CAREER);
  CAREER.mundo.planos = Object.fromEntries(Object.entries(pl.porLiga).map(([liga, x]) => [liga, {
    placares: ML.codificarPlacares(x.plano.jogos.slice(0, x.n).map((j) => (j.gh == null ? null : { gh: j.gh, ga: j.ga }))),
    gerados: x.plano.jogos.slice(x.n), confrontos: x.plano.confrontos, marcos: x.plano.marcos, resultado: x.plano.resultado,
  }]));
}

// Placar de um jogo de fase fixa jogado pelo motor (liga do técnico ou a outra
// divisão): o 1º jogo ainda sem placar com o mesmo mandante e visitante.
export function registrarResultadoDoMundo(compId, r) {
  const CAREER = carreiraAtual();
  if (!paisDoTecnicoNaAmericaDoSul(CAREER)) return;
  const x = abrirPlanos(CAREER).porLiga[compId];
  if (!x) return;
  const i = (x.porPar.get(`${String(r.home)}|${String(r.away)}`) || []).find((k) => x.plano.jogos[k].gh == null);
  if (i == null) return;
  const j = x.plano.jogos[i];
  Fo.registrarJogo(x.plano, j.id, { gh: r.gh, ga: r.ga }, simuladorDoPais(CAREER, `${CAREER.mundoLeve.chave}:${j.id}`));
  guardarPlanos(CAREER);
}

// Fases geradas da semana (até o domingo da semana da carreira).
function semanaDasFasesGeradas(CAREER) {
  if (!paisDoTecnicoNaAmericaDoSul(CAREER)) return;
  const semana = semanaDaCarreira(CAREER);
  if (!semana) return;
  const ate = new Date(Date.parse(semana + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);
  const pl = abrirPlanos(CAREER);
  let mudou = false;
  for (const x of Object.values(pl.porLiga)) {
    for (let g = 0; g < 500 && !Fo.concluida(x.plano); g++) {
      const j = Fo.jogosPendentes(x.plano, ate).find((y) => y.conf || !FASES_FIXAS.has(y.fase));
      if (!j) break;
      const sim = simuladorDoPais(CAREER, `${CAREER.mundoLeve.chave}:${j.id}`);
      Fo.registrarJogo(x.plano, j.id, sim.jogar(j), sim);
      mudou = true;
    }
  }
  if (mudou) guardarPlanos(CAREER);
}
ganchosMundo.resultadoDoMundo = (compId, r) => registrarResultadoDoMundo(compId, r);

// ---------- virada do país do técnico (M6b-4) ----------
// Fim de temporada do país do técnico no save do mundo, no lugar da cascata
// do Brasil (virada.applyPromotionRelegation). Europa: o plano de fim de
// temporada (fases.js) a partir das tabelas finais das duas divisões, jogado
// na hora pela mesma conta de gols (os jogos do técnico nesse plano também:
// a partida ao vivo de playoff fica para uma etapa seguinte). Depois a
// virada do país (viradapais.js), com o catálogo, as zonas e as forças que
// moram no mundo leve (a entrada do país do técnico, que o mundo leve não
// joga). Clube que sobe do catálogo ganha elenco gerado (como a Série D);
// quem cai para o catálogo sai do save. Devolve o resumo no formato de
// applyPromotionRelegation (para a tela) e `mundo: true`.

function tabelaFinal(indice, liga, standings, chave) {
  const linhas = Object.values(standings).map((r) => ({ ...r }));
  return classificar(linhas, opcoesDaLiga(indice.competicoes[liga], indice.perfisDesempate, [], chave)).ordem;
}

function simuladorDoPais(CAREER, chave) {
  const rng = rngDaChave(chave);
  const forca = (id) => estado.forcaDeJogo(estado.timePorId(id));
  return {
    jogar: (p) => partida.scoreGoals(forca(p.casa), forca(p.fora), 1, rng),
    prorrogacao: (p) => partida.scoreGoals(forca(p.casa), forca(p.fora), 1 / 3, rng),
    penaltis: (p) => (rng() < 0.5 ? p.casa : p.fora),
  };
}

export async function viradaDoPaisAtivo(CAREER) {
  const indice = indiceAtual;
  if (!indice) throw new Error("mundo: índice não carregado");
  const cod = CAREER.mundo.pais;
  const pais = paisDaLiga(indice, CAREER.divisoes[0]);
  const [l1, l2] = pais.ligas;
  const P = CAREER.mundoLeve.paises[cod];
  const chave = `${CAREER.mundoLeve.chave}:${cod}:${CAREER.mundo.ano}`;
  const standingsDe = (l) => (l === CAREER.competitionId ? CAREER.standings : CAREER.otherDivisions[l].standings);
  const S = (x) => String(x);
  const N = (x) => (Number.isFinite(Number(x)) ? Number(x) : x);

  const catalogo = P.catalogo.map((id) => {
    const extra = P.catalogoExtra[S(id)];
    const c = indice.terceira.find((x) => S(x.id) === S(id));
    return extra ? { id, ...extra } : { id, elegibilidade: c && c.elegibilidade, clubePai: c && c.clubePai, grupo: c && c.grupo };
  });
  const reservasDoMundo = indice.clubes.filter((c) => c.reserva && c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai }))
    .concat(indice.terceira.filter((c) => c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai })));
  const sim = simuladorDoPais(CAREER, `${chave}:pos`);
  const ordem = {};
  let mov, confrontos = [];
  if (pais.regiao === "europa") {
    const pontos = {};
    for (const l of [l1, l2]) {
      const t = tabelaFinal(indice, l, standingsDe(l), `${chave}:${l}`);
      ordem[l] = t.map((r) => N(r.id));
      pontos[l] = Object.fromEntries(t.map((r) => [N(r.id), r.pts]));
    }
    const naDivisao = (id) => (ordem[l1].some((x) => S(x) === S(id)) ? 1 : ordem[l2].some((x) => S(x) === S(id)) ? 2 : null);
    const ativos = new Set([...ordem[l1], ...ordem[l2]].map(S));
    const temBarrage = !!(indice.competicoes[l2].regras || {}).interDivisionPlayoff;
    const rep = temBarrage ? Vp.sortearRepresentante({ catalogo, divisaoAtual: naDivisao, chave }) : null;
    const plano = Fa.montarPosTemporada({
      pais: cod, comps: [indice.competicoes[l1], indice.competicoes[l2]], ordens: ordem, pontos,
      reservas: reservasDoMundo.filter((r) => ativos.has(S(r.id))).map((r) => r.id), representanteTerceira: rep, chave,
    });
    const res = Fa.jogarTudo(plano, sim);
    confrontos = plano.confrontos;
    mov = { sobemD2: res.sobem[l2], descemD1: res.descem[l1], descemD2: res.descem[l2], sobemTerceira: res.sobem.terceira, quedaD2: ordem[l2].slice().reverse(), campeoes: res.campeao };
  } else {
    // América do Sul: termina os planos da temporada (o que faltar das fases
    // geradas) e usa o resultado do regulamento (formatos.js).
    const pl = abrirPlanos(CAREER);
    const r = {};
    for (const l of [l1, l2]) {
      const plano = pl.porLiga[l].plano;
      for (let g = 0; g < 5000 && !Fo.concluida(plano); g++) {
        const [j] = Fo.jogosPendentes(plano);
        if (!j) break;
        Fo.registrarJogo(plano, j.id, sim.jogar(j), sim);
      }
      if (!Fo.concluida(plano)) throw new Error(`mundo: temporada de ${l} não terminou`);
      r[l] = plano.resultado;
      ordem[l] = CAREER.divisionTeams[l].map((t) => N(t.id));
      confrontos = confrontos.concat(plano.confrontos);
      if (r[l].promedio) {
        const janela = indice.competicoes[l].regras.relegation.seasonWindow;
        const porClube = Object.fromEntries(Object.entries(r[l].promedio).map(([id, x]) => [id, { pts: x.ptsTemporada, j: x.jTemporada }]));
        P.historico[l] = Vp.atualizarHistorico(P.historico[l] || {}, CAREER.mundo.ano, porClube, janela);
      }
    }
    const r2 = r[l2];
    const quedaD2 = r2.promedio
      ? Object.keys(r2.promedio).map(N).sort((a, b) => r2.promedio[a].pts * r2.promedio[b].j - r2.promedio[b].pts * r2.promedio[a].j)
      : (r2.anual || r2.reclassificacao || [...(r2.zonas ? [...r2.zonas.A, ...r2.zonas.B] : []), ...(r2.grupos ? Object.values(r2.grupos).flat() : [])]).slice().reverse();
    mov = { sobemD2: r2.sobem.map((x) => x.id), descemD1: r[l1].descem.map((x) => x.id), descemD2: r2.descem.map((x) => x.id), sobemTerceira: [], quedaD2, campeoes: { [l1]: r[l1].campeoes, [l2]: r2.campeoes }, anualD1: r[l1].anual || r[l1].reclassificacao || null };
  }
  const res = { campeao: mov.campeoes, sobem: { [l2]: mov.sobemD2 }, descem: { [l1]: mov.descemD1 } };
  const zonasArg = Object.fromEntries(Object.entries(P.zonas || {}).filter(([l]) => l.startsWith("arg_")));
  const v = Vp.aplicarVirada({
    pais: cod, chave, d1: { id: l1, clubes: ordem[l1] }, d2: { id: l2, clubes: ordem[l2] },
    sobemD2: mov.sobemD2, descemD1: mov.descemD1, descemD2: mov.descemD2, sobemTerceira: mov.sobemTerceira,
    quedaD2: mov.quedaD2, catalogo, reservas: reservasDoMundo, humano: N(CAREER.clubId),
    zonas: Object.keys(zonasArg).length ? zonasArg : undefined,
  });
  if (v.zonas) Object.assign(P.zonas, v.zonas);
  if (cod === "UY") P.zonas.uru_segunda = Vp.sortearGrupos(v[l2], ["A", "B"], `${CAREER.mundoLeve.chave}:UY:${P.ano + 1}`);
  if (CAREER.mundo.planos) CAREER.mundo.planos = {};
  planos = null;

  // Times das divisões novas (os que ficam, com a força de agora; os que
  // chegam do catálogo, do índice com a força guardada no mundo leve).
  const timeDe = (id) => {
    const atual = estado.todosTimes().find((t) => S(t.id) === S(id)) || (S(id) === S(CAREER.clubId) ? estado.ligaAtual().find((t) => S(t.id) === S(id)) : null);
    if (atual) return { ...atual };
    const c = indice.terceira.find((x) => S(x.id) === S(id)) || indice.clubes.find((x) => S(x.id) === S(id));
    const f = P.forcas[S(id)];
    const fraco = (l) => { const ts = timesDaLiga(indice, l); return { atk: Math.min(...ts.map((t) => t.atk)) * 0.97, def: Math.max(...ts.map((t) => t.def)) * 1.03 }; };
    const base = f ? { atk: f[0], def: f[1] } : c && c.atk != null ? { atk: c.atk, def: c.def } : fraco(l2);
    return { id: c.id, name: c.nome, short: c.sigla, logo: c.escudo || c.logoOrigem || null, c1: c.c1 || "#5B6B7F", c2: c.c2 || "#1F2933", ...base };
  };
  const ajuste = (l) => { const n = indice.competicoes[l].nivel; return n ? Math.round((n - 1) * OVERALL_POR_NIVEL * 10) / 10 : 0; };
  const novos = { [l1]: v[l1].map((id) => ({ ...timeDe(id), competitionId: l1, ajusteNivel: ajuste(l1) })), [l2]: v[l2].map((id) => ({ ...timeDe(id), competitionId: l2, ajusteNivel: ajuste(l2) })) };

  // Elencos: quem saiu para o catálogo some do save; quem chegou ganha elenco.
  for (const id of v.foramParaOCatalogo) delete CAREER.leagueSquads[S(id)];
  for (const id of v.entraramDoCatalogo) {
    const t = [...novos[l1], ...novos[l2]].find((x) => S(x.id) === S(id));
    CAREER.leagueSquads[S(id)] = await buildLeagueSquad(t);
    if (temporada.RENOVACAO_CPU.ativa) {
      const desloca = CAREER.seasonYear - ambiente.temporadaReal();
      CAREER.leagueSquads[S(id)].forEach((p) => { if (desloca > 0) p.contractUntil += desloca; });
    }
  }
  viradaDoCaixaCpu();

  // Catálogo e mundo do país (na entrada dele no mundo leve).
  P.catalogo = v.catalogo.map((c) => c.id);
  P.catalogoExtra = {};
  for (const c of v.catalogo) {
    const doIndice = indice.terceira.find((x) => S(x.id) === S(c.id));
    if (!doIndice || c.exJogavel) P.catalogoExtra[S(c.id)] = { elegibilidade: c.elegibilidade, clubePai: c.clubePai ?? null, grupo: c.grupo ?? null };
  }
  P.ligas[l1] = { clubes: v[l1], placares: "" };
  P.ligas[l2] = { clubes: v[l2], placares: "" };
  P.campeoes = [...P.campeoes, { ano: CAREER.mundo.ano, [l1]: res.campeao[l1], [l2]: res.campeao[l2] }].slice(-20);
  // Classificação da 1ª divisão para as copas continentais (M9b).
  const ordemD1 = pais.regiao === "europa" ? ordem[l1] : (mov.anualD1 || ordem[l1]);
  P.classificacao = ML.classificacaoDaTemporada(CAREER.mundo.ano, res.campeao[l1], ordemD1);
  P.viradas = [...P.viradas, { ano: CAREER.mundo.ano, sobem: res.sobem[l2], descem: res.descem[l1], entraram: v.entraramDoCatalogo, sairam: v.foramParaOCatalogo, excecoes: v.excecoes }].slice(-3);
  P.k += 1; P.ano += 1;
  CAREER.mundo.k += 1; CAREER.mundo.ano += 1;
  // O mundo leve aberto em memória tem a cópia de antes: reabre na próxima semana.
  leve = null;

  // Divisões do motor e a do técnico.
  const humanoEm = v[l1].some((x) => S(x) === S(CAREER.clubId)) ? l1 : l2;
  const mudou = humanoEm !== CAREER.competitionId;
  CAREER.divisionTeams = { [l1]: novos[l1], [l2]: novos[l2] };
  estado.definirCompeticaoAtual(humanoEm);
  CAREER.competitionId = humanoEm;
  estado.definirLigaAtual(novos[humanoEm].map((t) => ({ ...t, competitionId: undefined })));
  estado.definirTodosTimes([...novos[l1], ...novos[l2]]);
  const outra = humanoEm === l1 ? l2 : l1;
  CAREER.otherDivisions = { [outra]: { schedule: {}, standings: tabela.emptyStandings(novos[outra].map((t) => t.id)) } };

  const nomeDe = (l) => indice.competicoes[l].nome;
  const times = (ids) => ids.map((id) => [...novos[l1], ...novos[l2]].find((t) => S(t.id) === S(id)) || { id, name: (indice.terceira.find((c) => S(c.id) === S(id)) || {}).nome || String(id) });
  const humano = S(CAREER.clubId);
  let texto = null;
  if (mudou) texto = humanoEm === l1 ? `Acesso! ${nomeDe(l2)} → ${nomeDe(l1)}.` : `Rebaixado(a): ${nomeDe(l1)} → ${nomeDe(l2)}.`;
  return {
    mundo: true, pais: cod, campeoes: res.campeao, confrontos,
    relegatedA: times(res.descem[l1]), promotedB: times(res.sobem[l2]), relegatedB: times(v.foramParaOCatalogo), promotedC: times(v.entraramDoCatalogo),
    relegatedC: [], promotedD: [], excecoes: v.excecoes,
    divisionChanged: mudou, newCompetitionId: humanoEm, texto,
    humanoNoPlayoff: confrontos.some((c) => S(c.a) === humano || S(c.b) === humano),
  };
}

// Calendário e rodadas da temporada nova no save do mundo (no fim da virada).
export function novaTemporadaDoMundo(CAREER) {
  const indice = indiceAtual;
  aplicarCalendario(CAREER, indice, CAREER.mundo.k);
  CAREER.standings = tabela.emptyStandings(estado.ligaAtual().map((t) => t.id));
  CAREER.cup = null;
}

ganchosMundo.viradaDoPais = (CAREER) => viradaDoPaisAtivo(CAREER);
ganchosMundo.novaTemporada = (CAREER) => novaTemporadaDoMundo(CAREER);

// Reabre um save do mundo (carga.enterAfterAuth): o índice do mundo (rota
// /api/career/mundo, ou o que o ambiente já tem) e o mundo do motor a partir
// das divisões gravadas no save. Os elencos estão no save.
export async function abrirSaveDoMundo(career, buscar) {
  let indice = indiceAtual;
  if (!indice || indice.versao !== career.mundo.versaoCatalogo) {
    indice = ambiente.indiceDoMundo ? await ambiente.indiceDoMundo() : await buscar("/api/career/mundo");
    if (!indice || !indice.competicoes) throw new Error("mundo: índice do mundo indisponível para abrir a carreira");
  }
  definirIndiceDoMundo(indice);
  texto.definirMoeda(career.moeda || moedaDoPais(indice, career.mundo.pais));
  const liga = career.competitionId;
  const comp = indice.competicoes[liga];
  estado.definirTemporadaReal(comp.temporada.anoInicial);
  estado.definirModoReal(true);
  for (const l of career.divisoes) estado.modoRealPorCompeticao()[l] = true;
  definirCompeticaoAtual(liga);
  definirLigaAtual((career.divisionTeams[liga] || []).map((t) => ({ ...t, competitionId: undefined })));
  definirTodosTimes(career.divisoes.flatMap((l) => career.divisionTeams[l] || []));
}
ganchosMundo.abrirSave = (career, buscar) => abrirSaveDoMundo(career, buscar);

// ---------- Brasil com o mundo em paralelo (M6b-5a) ----------
// Carreira nova no Brasil (carga.startCareer) com o mundo ligado (o
// hospedeiro fornece o índice): os 10 países do índice entram no mundo leve, pré-simulados até a
// semana em que a carreira começa, e andam junto com o calendário do Brasil.
// Sem o mundo (rota desligada, sem rede), a carreira nasce como sempre.
// buscar: só quando o save já tem o mundo (reabrir). Na criação, o índice vem
// do hospedeiro (ambiente.indiceDoMundo, que a v2 fornece com o mundo ligado):
// sem ele, nenhum pedido novo ao servidor.
async function obterIndice(buscar) {
  if (indiceAtual) return indiceAtual;
  try {
    const indice = ambiente.indiceDoMundo ? await ambiente.indiceDoMundo() : buscar ? await buscar("/api/career/mundo") : null;
    return indice && indice.competicoes ? indice : null;
  } catch (_) { return null; }
}
export async function anexarMundoAoBrasil(CAREER) {
  if (!CAREER || CAREER.mundo || CAREER.mundoLeve || !ambiente.indiceDoMundo) return false;
  const indice = await obterIndice(null);
  if (!indice) return false;
  definirIndiceDoMundo(indice);
  const inicio = semanaDaCarreira(CAREER);
  if (!inicio) return false;
  // O Brasil é o país do técnico: fora do mundo leve.
  const m = ML.abrirMundo(ML.criarMundoLeve(indice, { ativos: ["BR"], chave: `mundo:${CAREER.clubId}`, inicio }), indice);
  ML.prepararInicio(m);
  CAREER.mundoLeve = ML.salvarMundo(m);
  return true;
}
// Reabrir um save do Brasil com o mundo: só o índice (as divisões são as do
// Brasil). Sem o índice, o mundo leve fica parado até ele voltar.
export async function abrirIndiceDoSave(career, buscar) {
  if (!career || !career.mundoLeve) return false;
  const indice = await obterIndice(buscar);
  if (indice) definirIndiceDoMundo(indice);
  return !!indice;
}
// ---------- novo save no mundo (M10c, MUN-14) ----------
// Os países e as divisões para o seletor do novo save (sem o índice, null:
// o seletor mostra só o Brasil, como sempre).
export async function ligasDoMundo() {
  const indice = await obterIndice(null);
  if (!indice) return null;
  if (indiceAtual !== indice) definirIndiceDoMundo(indice);
  return {
    paises: indice.paises.map((p) => ({
      codigo: p.codigo, nome: p.nome, regiao: p.regiao, moeda: p.moeda,
      ligas: p.ligas.map((l, i) => {
        const c = indice.competicoes[l];
        return { id: l, nome: c.nome, divisao: i + 1, clubes: c.clubes, nivel: c.nivel || null, temporada: c.temporada ? c.temporada.anoInicial : null };
      }),
    })),
  };
}
// Os clubes de uma liga do mundo para o seletor (null: liga fora do mundo).
export async function clubesDaLigaDoMundo(liga) {
  const indice = indiceAtual || (await obterIndice(null));
  if (indice && indiceAtual !== indice) definirIndiceDoMundo(indice);
  if (!indice || !indice.competicoes[liga]) return null;
  return indice.clubes.filter((c) => c.liga === liga).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((c) => ({
    id: String(c.id), nome: c.nome, sigla: c.sigla || null, escudo: c.escudo || c.logoOrigem || null,
    cidade: c.estadio && c.estadio.cidade ? c.estadio.cidade : null,
  }));
}
// Cria a carreira na liga do mundo escolhida, com os elencos pela rota do
// servidor (ou ambiente.elencosDoMundo, nos testes e offline).
export async function novaCarreiraNoMundo(liga, clubId, buscar) {
  const indice = indiceAtual || (await obterIndice(null));
  if (!indice || !indice.competicoes[liga]) return { ok: false, motivo: "liga-invalida" };
  if (!indice.clubes.some((c) => c.liga === liga && String(c.id) === String(clubId))) return { ok: false, motivo: "clube-invalido" };
  const elencosDaLiga = (l) => elencosDaLigaDoMundo(l, buscar);
  await criarCarreiraNoMundo({ indice, liga, clubId, elencosDaLiga });
  return { ok: true };
}
// Mercado do mundo nas telas (M10c-3): os clubes dos outros países com os
// filtros de país e liga, e trazer um clube ao save (o elenco dele entra no
// mercado, M8a).
export function mercadoDoMundo(CAREER, filtro = {}) {
  const indice = indiceAtual;
  if (!indice || !CAREER || !CAREER.mundoLeve) return null;
  const ativos = new Set(CAREER.mundoLeve.ativos || []);
  const nomeLiga = (l) => (indice.competicoes[l] && indice.competicoes[l].nome) || (indice.brasil && indice.brasil.ligas[l] && indice.brasil.ligas[l].nome) || l;
  const paises = Object.entries(CAREER.mundoLeve.paises).filter(([cod]) => !ativos.has(cod)).map(([cod, P]) => {
    const meta = indice.paises.find((p) => p.codigo === cod);
    return { codigo: cod, nome: meta ? meta.nome : cod === "BR" ? "Brasil" : cod, ligas: Object.keys(P.ligas).map((l) => ({ id: l, nome: nomeLiga(l) })) };
  });
  return { paises, clubes: clubesDoMundo(CAREER, filtro) };
}
ganchosMundo.mercadoMundo = {
  clubes: (CAREER, filtro) => mercadoDoMundo(CAREER, filtro),
  abrir: (CAREER, id, buscar) => abrirClubeDoMundo(CAREER, id, buscar),
};

ganchosMundo.novoSave = { ligas: () => ligasDoMundo(), clubes: (liga) => clubesDaLigaDoMundo(liga), criar: (liga, clubId, buscar) => novaCarreiraNoMundo(liga, clubId, buscar) };

ganchosMundo.anexarMundo = (CAREER) => anexarMundoAoBrasil(CAREER);
ganchosMundo.abrirIndice = (career, buscar) => abrirIndiceDoSave(career, buscar);

// ---------- mercado do mundo (M8a) ----------
// Um clube de outro país entra no save quando o técnico o abre no mercado:
// o time (CAREER.exterior.clubes) e o elenco (CAREER.leagueSquads), montado
// do pacote pelo construtor de sempre (virada.buildLeagueSquad, com o ajuste
// de nível da liga em que o clube está agora). A partir daí, proposta,
// negociação, venda, empréstimo e a CPU do país usam as regras de hoje. Na
// virada, quem só foi olhado sai do save (podarExterior); os atletas que
// saíram dele ficam anotados para não reaparecerem quando ele voltar.

// Onde o clube joga agora no mundo leve: { pais, liga } (null no catálogo de
// 3ª divisão, no país do técnico ou fora do mundo).
export function ligaNoMundo(CAREER, clubId) {
  const S = String(clubId);
  for (const [cod, P] of Object.entries((CAREER.mundoLeve && CAREER.mundoLeve.paises) || {})) {
    if ((CAREER.mundoLeve.ativos || []).includes(cod)) continue;
    for (const [liga, L] of Object.entries(P.ligas)) if (L.clubes.some((x) => String(x) === S)) return { pais: cod, liga };
  }
  return null;
}

function clubeDoIndiceMundo(indice, id) {
  const S = String(id);
  return indice.clubes.find((c) => String(c.id) === S)
    || (indice.brasil ? Object.values(indice.brasil.ligas).flatMap((l) => l.clubes).find((c) => String(c.id) === S) : null);
}

function nomeDaLiga(indice, liga) {
  return (indice.competicoes[liga] && indice.competicoes[liga].nome) || (indice.brasil && indice.brasil.ligas[liga] && indice.brasil.ligas[liga].nome) || liga;
}

// Clubes de outros países para o mercado (sem os do país do técnico e sem o
// catálogo de 3ª). filtro = { pais, liga, texto }.
export function clubesDoMundo(CAREER, filtro = {}) {
  const indice = indiceAtual;
  if (!indice || !CAREER.mundoLeve) return [];
  const out = [];
  for (const [cod, P] of Object.entries(CAREER.mundoLeve.paises)) {
    if ((CAREER.mundoLeve.ativos || []).includes(cod)) continue;
    if (filtro.pais && filtro.pais !== cod) continue;
    for (const [liga, L] of Object.entries(P.ligas)) {
      if (filtro.liga && filtro.liga !== liga) continue;
      for (const id of L.clubes) {
        const c = clubeDoIndiceMundo(indice, id);
        if (!c) continue;
        if (filtro.texto && !String(c.nome).toLowerCase().includes(String(filtro.texto).toLowerCase())) continue;
        out.push({ id: String(id), nome: c.nome, sigla: c.sigla, escudo: c.escudo || c.logoOrigem || null, pais: cod, liga, ligaNome: nomeDaLiga(indice, liga), noSave: !!(CAREER.exterior && CAREER.exterior.clubes[String(id)]) });
      }
    }
  }
  return out;
}

// Elencos de uma liga do mundo (rota do servidor, com cache na memória).
const elencosEmCache = new Map();
async function elencosDaLigaDoMundo(liga, buscar) {
  if (elencosEmCache.has(liga)) return elencosEmCache.get(liga);
  const r = ambiente.elencosDoMundo ? await ambiente.elencosDoMundo(liga) : await buscar(`/api/career/mundo/elencos/${liga}`);
  const porTime = (r && r.playersByTeamId) || r || {};
  elencosEmCache.set(liga, porTime);
  return porTime;
}

// Overall a mais nos elencos fictícios das copas da UEFA, para ficarem na
// mesma escala dos elencos reais dos pacotes (medido em test_motor_copas_uefa).
export const AJUSTE_FICTICIO = 14;
export async function abrirClubeDoMundo(CAREER, clubId, buscar) {
  const indice = indiceAtual;
  const id = String(clubId);
  if (!indice || !CAREER || !CAREER.mundoLeve) return { ok: false, motivo: "sem-mundo" };
  if (CAREER.exterior && CAREER.exterior.clubes[id]) return { ok: true, ja: true };
  let onde = ligaNoMundo(CAREER, id);
  let c = clubeDoIndiceMundo(indice, id);
  // Clube andino (só nas copas da CONMEBOL, M9c): elenco do snapshot das copas.
  const andino = !onde && indice.copas && indice.copas.conmebol && indice.copas.conmebol.clubes.find((x) => String(x.id) === id);
  if (andino) { onde = { pais: andino.assoc, liga: "conmebol_andinos" }; c = andino; }
  // Clube das copas da UEFA (M10b): 5º pacote (elenco real) ou outra
  // associação (elenco fictício, gerado como o da Série D).
  const daUefa = !onde && !andino && indice.copas && indice.copas.uefa && indice.copas.uefa.clubes.find((x) => String(x.id) === id);
  if (daUefa) { onde = { pais: daUefa.assoc, liga: daUefa.elencoFicticio ? null : "uefa_extra", ficticio: !!daUefa.elencoFicticio }; c = daUefa; }
  if (!onde || !c) return { ok: false, motivo: "fora-do-mundo" };
  const P = CAREER.mundoLeve.paises[onde.pais];
  const f = P && P.forcas[id];
  const comp = indice.competicoes[onde.liga];
  const nivel = andino ? indice.copas.conmebol.niveis[andino.assoc] : daUefa ? CopasUefa.nivelUefa(indice, daUefa.assoc) : comp && comp.nivel;
  const ajusteNivel = nivel ? Math.round((nivel - 1) * OVERALL_POR_NIVEL * 10) / 10 : 0;
  const time = {
    id: c.id, name: c.nome, short: c.sigla, logo: c.escudo || c.logoOrigem || null, c1: c.c1 || "#5B6B7F", c2: c.c2 || "#1F2933",
    venue: c.estadio ? { name: c.estadio.nome, city: c.estadio.cidade, capacity: c.estadio.capacidade } : null,
    atk: f ? f[0] : c.atk, def: f ? f[1] : c.def, competitionId: onde.liga, ajusteNivel, exterior: true, pais: onde.pais,
  };
  if (onde.ficticio) {
    // Elenco fictício (nome real do clube): o gerador da Série D, na força do
    // clube com o nível da associação, e o ajuste de overall pelo nível.
    const gerado = estado.ganchosMundo.elencoGerado({ ...time, atk: time.atk * Math.pow(nivel || 1, 1), def: time.def / Math.pow(nivel || 1, 1) })
      .map((p) => ({ ...p, overall: Math.round(Math.max(40, Math.min(90, p.overall + AJUSTE_FICTICIO + ajusteNivel))) }));
    CAREER.exterior = CAREER.exterior || { clubes: {}, saidas: {}, catalogo: {} };
    CAREER.exterior.clubes[id] = time;
    CAREER.exterior.catalogo[id] = [];
    CAREER.leagueSquads[id] = gerado;
    escalaDoClubeDeFora(CAREER, indice, id, null);
    return { ok: true, clube: { id, nome: time.name, liga: null, pais: onde.pais }, jogadores: gerado.length };
  }
  const porTime = await elencosDaLigaDoMundo(onde.liga, buscar);
  CAREER.exterior = CAREER.exterior || { clubes: {}, saidas: {}, catalogo: {} };
  const saiu = new Set((CAREER.exterior.saidas[id] || []).map(String));
  const raw = (porTime[id] || []).filter((p) => !saiu.has(String(p.id)));
  instalarElencos({ [id]: raw });
  const elenco = await montarElencoCpu(time);
  // Idade: os anos que se passaram no save desde a temporada do pacote.
  const anos = Math.max(0, (CAREER.seasonYear || 0) - ambiente.temporadaReal());
  if (anos) elenco.forEach((p) => { p.age += anos; });
  CAREER.exterior.clubes[id] = time;
  CAREER.exterior.catalogo[id] = raw.map((p) => String(p.id));
  CAREER.leagueSquads[id] = elenco;
  escalaDoClubeDeFora(CAREER, indice, id, onde.liga);
  return { ok: true, clube: { id, nome: time.name, liga: onde.liga, pais: onde.pais }, jogadores: elenco.length };
}

// Na virada: sai do save o clube de fora que não tem vínculo com o técnico
// (atleta que veio do save, proposta, parcela ou empréstimo). Os atletas do
// pacote que saíram dele ficam em `saidas`.
export function podarExterior(CAREER) {
  if (!CAREER || !CAREER.exterior) return 0;
  const S = String;
  const ligados = new Set();
  for (const o of CAREER.pendingOffersOut || []) ligados.add(S(o.clubId));
  for (const x of [...(CAREER.pendingInstallments || []), ...(CAREER.pendingReceivables || [])]) if (x.clubId != null) ligados.add(S(x.clubId));
  for (const p of CAREER.squad || []) if (p.loanFromClubId != null) ligados.add(S(p.loanFromClubId));
  let podados = 0;
  for (const id of Object.keys(CAREER.exterior.clubes)) {
    const sq = CAREER.leagueSquads[id] || [];
    const doCatalogo = new Set((CAREER.exterior.catalogo[id] || []).map((x) => `real_${x}`));
    // Gerados pelo próprio clube (elenco de reposição, base da CPU) não contam.
    const veioDoSave = sq.some((p) => !doCatalogo.has(S(p.id)) && !/^(gen_|base_|basecpu_)/.test(S(p.id)));
    if (veioDoSave || ligados.has(id)) continue;
    const presentes = new Set(sq.map((p) => S(p.id)));
    const sairam = (CAREER.exterior.catalogo[id] || []).filter((x) => !presentes.has(`real_${x}`));
    if (sairam.length) CAREER.exterior.saidas[id] = [...new Set([...(CAREER.exterior.saidas[id] || []), ...sairam])];
    delete CAREER.exterior.clubes[id];
    delete CAREER.exterior.catalogo[id];
    delete CAREER.leagueSquads[id];
    podados++;
  }
  return podados;
}
ganchosMundo.podarExterior = (CAREER) => podarExterior(CAREER);

// ---------- propostas de emprego de outros países (M8b) ----------
// No início da temporada, um clube de outro país do mundo pode chamar o
// técnico, pela reputação dele e pelo nível da liga do clube. Só países com o
// mesmo tipo de calendário (Europa com Europa; América do Sul com América do
// Sul), para a troca cair entre temporadas dos dois lados. O Brasil (caminho
// próprio da carreira) não entra como destino nesta etapa.
const anoCivilDoPais = (indice, cod) => {
  if (cod === "BR") return true;
  const p = indice.paises.find((x) => x.codigo === cod);
  return !!(p && indice.competicoes[p.ligas[0]].temporada.anoCivil);
};
// A temporada do país no mundo leve ainda não teve jogo (a troca cai entre
// temporadas: o técnico começa a temporada nova desde a 1ª rodada).
export function temporadaNaoComecou(P) {
  return Object.values(P.ligas).every((L) => !String(L.placares || "").replace(/\./g, "") && !(L.plano && (L.plano.gerados || []).length));
}

export function propostaDeFora(CAREER) {
  const indice = indiceAtual;
  if (!indice || !CAREER || !CAREER.mundoLeve) return null;
  if ((CAREER.clubProposals || []).length) return null;
  const meuPais = CAREER.mundo ? CAREER.mundo.pais : "BR";
  const minhaLiga = indice.competicoes[CAREER.competitionId];
  const meuNivel = minhaLiga && minhaLiga.nivel ? minhaLiga.nivel : 1.1;
  const reputacao = CAREER.reputation == null ? 50 : CAREER.reputation;
  const civil = anoCivilDoPais(indice, meuPais);
  const candidatos = [];
  for (const [cod, P] of Object.entries(CAREER.mundoLeve.paises)) {
    if (cod === meuPais || cod === "BR" || (CAREER.mundoLeve.ativos || []).includes(cod)) continue;
    if (anoCivilDoPais(indice, cod) !== civil) continue;
    if (!temporadaNaoComecou(P)) continue;
    for (const [liga, L] of Object.entries(P.ligas)) {
      const comp = indice.competicoes[liga];
      if (!comp || !comp.nivel) continue;
      for (const id of L.clubes) {
        const t = timeDoMundo(indice, P, id, liga);
        // Prestígio: o nível da liga e a força do clube nela (atk alto e def baixo).
        const forca = (t.atk || 1) / (t.def || 1);
        const exigida = Math.max(40, Math.min(95, Math.round(50 + (comp.nivel - meuNivel) * 120 + (forca - 1) * 25)));
        if (reputacao >= exigida && comp.nivel >= meuNivel - 0.05) candidatos.push({ id, nome: t.name, cod, liga, exigida, comp });
      }
    }
  }
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => b.exigida - a.exigida || String(a.id).localeCompare(String(b.id)));
  const rng = rngDaChave(`proposta-fora:${CAREER.clubId}:${CAREER.seasonYear}`);
  // Entre os mais exigentes que ele alcança, um por sorteio (sem repetir sempre o mesmo).
  const topo = candidatos.slice(0, 5);
  const c = topo[Math.floor(rng() * topo.length)];
  const proposta = {
    clubId: String(c.id), clubName: c.nome, reputationRequired: c.exigida, budgetOffered: null, seasonYear: CAREER.seasonYear,
    mundo: { pais: c.cod, liga: c.liga, ligaNome: c.comp.nome },
  };
  CAREER.clubProposals = [...(CAREER.clubProposals || []), proposta];
  return proposta;
}
ganchosMundo.propostaDeFora = (CAREER) => { avancarMundoLeve(CAREER); return propostaDeFora(CAREER); };

// Aceitar a proposta de outro país: a carreira continua no clube novo, no
// mesmo mundo. O país antigo vai para o mundo leve (a composição e o catálogo
// dele já estão lá, atualizados pela virada); o novo sai do mundo leve com a
// composição de agora. Reputação e histórico do técnico seguem (herança,
// como na demissão ou na troca de clube de sempre).
export async function trocarDePais(CAREER, proposta, buscar) {
  const indice = indiceAtual;
  if (!indice || !proposta || !proposta.mundo) return { ok: false, motivo: "proposta-invalida" };
  const P = CAREER.mundoLeve.paises[proposta.mundo.pais];
  if (!P || !P.ligas[proposta.mundo.liga] || !P.ligas[proposta.mundo.liga].clubes.some((x) => String(x) === String(proposta.clubId))) return { ok: false, motivo: "clube-invalido" };
  if (!temporadaNaoComecou(P)) return { ok: false, motivo: "temporada-em-andamento", mensagem: "A temporada desse país já começou: a proposta vale na próxima." };
  const mundoLeve = { ...JSON.parse(JSON.stringify(CAREER.mundoLeve)) };
  // Saindo do Brasil: a entrada do Brasil no mundo leve passa a ter a
  // composição e a temporada da carreira (a que vale), para seguir sem ele.
  if (!CAREER.mundo && mundoLeve.paises.BR && CAREER.divisionTeams) {
    const BR = mundoLeve.paises.BR;
    for (const l of ["brasileirao", "serie_b", "serie_c"]) if (CAREER.divisionTeams[l]) BR.ligas[l] = { clubes: CAREER.divisionTeams[l].map((t) => t.id), placares: "" };
    BR.catalogo = (CAREER.serieDPool || []).map((t) => t.id);
    for (const t of [...Object.values(CAREER.divisionTeams).flat(), ...(CAREER.serieDPool || [])]) if (t.atk != null) BR.forcas[String(t.id)] = [t.atk, t.def];
    BR.k += CAREER.seasonYear - BR.ano; BR.ano = CAREER.seasonYear;
  }
  const elencosDaLiga = (l) => elencosDaLigaDoMundo(l, buscar);
  await criarCarreiraNoMundo({ indice, liga: proposta.mundo.liga, clubId: proposta.clubId, elencosDaLiga, mundoLeve, economiaV2: E.economiaV2(CAREER) });
  return { ok: true };
}
ganchosMundo.trocarDePais = (CAREER, proposta, buscar) => trocarDePais(CAREER, proposta, buscar);

// ---------- o jogo do técnico nas copas, ao vivo (M9c) ----------
// O jogo pendente na semana do save, com o nome do adversário e da fase.
export function jogoContinentalPendente(CAREER) {
  const sem = semanaDaCarreira(CAREER);
  const j = Copas.jogoDoHumanoPendente(CAREER, indiceAtual, sem) || CopasUefa.jogoDoHumanoPendenteUefa(CAREER, indiceAtual, sem);
  if (!j) return null;
  const { plano, ...jogo } = j;
  const grupo = jogo.grupo && plano.grupos ? (plano.grupos[jogo.copa] || {})[jogo.grupo] : null;
  return { ...jogo, grupo: jogo.grupo || null, grupoClubes: grupo || null };
}
// Prepara o jogo: o adversário de fora entra no save com o elenco (como no
// mercado do mundo, M8), para a escalação da CPU e a partida ao vivo.
export async function prepararJogoContinental(CAREER, buscar) {
  const j = jogoContinentalPendente(CAREER);
  if (!j) return { ok: false, motivo: "sem-jogo" };
  const S = String(j.adversario);
  const temElenco = CAREER.leagueSquads && CAREER.leagueSquads[S] && CAREER.leagueSquads[S].length;
  if (!temElenco) {
    const r = await abrirClubeDoMundo(CAREER, S, buscar);
    if (!r.ok) return { ok: false, motivo: r.motivo };
  }
  return { ok: true, jogo: j };
}
export function registrarJogoContinental(CAREER, jogoId, placar) {
  const uefa = /^(UCL|UEL|UECL):/.test(jogoId);
  return (uefa ? CopasUefa.registrarJogoDoHumanoUefa : Copas.registrarJogoDoHumano)(CAREER, indiceAtual, jogoId, placar, semanaDaCarreira(CAREER));
}
ganchosMundo.continental = {
  pendente: (CAREER) => jogoContinentalPendente(CAREER),
  preparar: (CAREER, buscar) => prepararJogoContinental(CAREER, buscar),
  registrar: (CAREER, jogoId, placar) => registrarJogoContinental(CAREER, jogoId, placar),
};

/* ---------- economia v2 (ECON-001b) ----------
   Só em carreira nova (CAREER.economia gravado na criação; save sem o campo
   segue a regra de antes). Na criação: a escala de salário de cada clube e a
   de valor de cada divisão do país (economia.escalasDaDivisao), os contratos
   de todos os elencos escalados uma vez, e as finanças do técnico e dos
   clubes da CPU pela base financeira (caixa inicial; teto 35% acima da
   folha, a regra de sempre). Receitas e despesas do clube do técnico pela
   base: TV e despesas por mês (semana.applyCalendarMonthlyFinances),
   patrocínio e bilheteria pela escala comercial e de dia de jogo. */
const LEGADO_PATROCINIO = (5e6 + 2e6) * (0.6 + 0.4 * 1.2); // nível 40, a média das propostas de antes
const JOGOS_EM_CASA = 19;
function elencoDoClube(CAREER, id) {
  return String(id) === String(CAREER.clubId) ? CAREER.squad : (CAREER.leagueSquads && CAREER.leagueSquads[String(id)]) || [];
}
// Clubes de uma divisão do save na ordem financeira: porte do pacote quando
// há (receita anual); sem ele (Brasil, quem subiu do catálogo), a força.
export function clubesParaEconomia(CAREER, indice, liga) {
  const times = (CAREER.divisionTeams && CAREER.divisionTeams[liga]) || (liga === CAREER.competitionId ? estado.ligaAtual() : []);
  const S = String;
  return times.map((t) => {
    const c = indice && indice.clubes.find((x) => S(x.id) === S(t.id));
    const receita = c && c.financas && c.financas.annualRevenue;
    const sq = elencoDoClube(CAREER, t.id);
    return { id: S(t.id), nome: t.name, receita: receita || 0, forca: (t.atk || 1) / (t.def || 1), folhaLegada: financas.wageBill(sq), valores: sq.filter((p) => p.origin !== "base").map((p) => p.value || 0) };
  }).sort((a, b) => b.receita - a.receita || b.forca - a.forca || a.id.localeCompare(b.id));
}
export function ativarEconomiaV2(CAREER, indice) {
  if (!CAREER || CAREER.economia || !E.ECONOMIA_V2.ativa) return false;
  const escalas = {}, ligas = {};
  let base = null;
  const caixas = {};
  for (const liga of estado.divisoesDoPais(CAREER)) {
    const r = E.escalasDaDivisao(liga, clubesParaEconomia(CAREER, indice, liga));
    if (!r) continue;
    Object.assign(escalas, r.escalas);
    ligas[liga] = r.valor;
    for (const [id, b] of r.economia) caixas[id] = b.caixaInicial;
    if (r.economia.has(String(CAREER.clubId))) base = r.economia.get(String(CAREER.clubId));
  }
  if (!base) return false;
  // Caixa de referência dos clubes da CPU (a volta ao normal na virada).
  for (const id of Object.keys(escalas)) escalas[id] = [...escalas[id], caixas[id] || 0];
  CAREER.economia = { versao: E.VERSAO_ECONOMIA, escalas, ligas, clube: null };
  // Contratos: todos os elencos do save, uma vez.
  for (const id of Object.keys(escalas)) {
    const e = E.escalaDe(CAREER, id);
    elencoDoClube(CAREER, id).forEach((p) => E.aplicarEscalaNoAtleta(p, e));
    ((CAREER.basesCpu && CAREER.basesCpu[id]) || []).forEach((p) => E.aplicarEscalaNoAtleta(p, e));
  }
  const daLiga = ligas[CAREER.competitionId] || 1;
  (CAREER.agentesLivres || []).forEach((p) => E.aplicarEscalaNoAtleta(p, { salario: daLiga, valor: daLiga }));
  // Finanças do técnico e da CPU.
  const folha = financas.wageBill(CAREER.squad);
  CAREER.finances.wageCap = Math.round((folha * 1.35) / 1000) * 1000;
  CAREER.finances.cash = base.caixaInicial;
  CAREER.caixaCpu = {};
  for (const id of Object.keys(escalas)) if (id !== String(CAREER.clubId) && caixas[id]) CAREER.caixaCpu[id] = caixas[id];
  // Fluxos, patrocínio e bilheteria na escala do clube.
  fluxosDoTecnico(CAREER, indice, base, 0);
  for (const k of ["master", "material"]) {
    const c = CAREER.sponsorship && CAREER.sponsorship[k];
    if (c && c.valorTemporada) c.valorTemporada = Math.round((c.valorTemporada * CAREER.economia.patrocinio) / 50000) * 50000;
    if (CAREER.sponsorProposals && CAREER.sponsorProposals[k]) CAREER.sponsorProposals[k].forEach((x) => { x.valorTemporada = Math.round((x.valorTemporada * CAREER.economia.patrocinio) / 50000) * 50000; });
  }
  return true;
}
// Clube que entra no save depois da criação (aberto no mercado do mundo):
// a escala dele pela liga (salário e valor iguais; sem perfil, a da liga do técnico).
export function escalaDoClubeDeFora(CAREER, indice, id, liga) {
  if (!E.economiaV2(CAREER) || CAREER.economia.escalas[String(id)]) return;
  const sq = elencoDoClube(CAREER, id);
  let s = CAREER.economia.ligas[CAREER.competitionId] || 1;
  const eco = liga && E.PERFIS[liga] ? E.economiaDaLiga(indice, liga) : null;
  const b = eco && eco.get(String(id));
  const legado = financas.wageBill(sq);
  if (b && legado > 0) s = Math.max(E.ESCALA_LIMITES.min, Math.min(E.ESCALA_LIMITES.max, b.folhaBaseMensal / legado));
  s = Math.round(s * 1000) / 1000;
  CAREER.economia.escalas[String(id)] = [s, s, b ? b.caixaInicial : 0];
  sq.forEach((p) => E.aplicarEscalaNoAtleta(p, { salario: s, valor: s }));
}
// Fluxos do clube do técnico (TV, despesas, escala de patrocínio e de
// bilheteria) pela base dele; `ano` = temporadas desde a queda (transição).
function fluxosDoTecnico(CAREER, indice, b, ano = 0) {
  const transicao = ano >= 1 && ano <= 3 && E.PERFIS[b.liga] && E.PERFIS[b.liga].transicao;
  const base = transicao ? E.economiaNaVirada(indice, b, { para: b.liga, status: "rebaixado", anoAposQueda: ano }) : b;
  CAREER.economia.clube = { ...E.fluxosDoClube(base, financas.wageBill(CAREER.squad)), anoAposQueda: transicao ? ano : 0 };
  CAREER.economia.patrocinio = Math.round((base.receitas.comercialAnual / LEGADO_PATROCINIO) * 1000) / 1000;
  const clube = estado.timePorId(CAREER.clubId) || { id: CAREER.clubId };
  const jogo = financas.ticketRevenue(clube, ambiente.rngDaChave(`stadium:${clube.id}`), 0, []).revenue * JOGOS_EM_CASA;
  CAREER.economia.bilheteria = jogo > 0 ? Math.round((base.receitas.jogoAnual / jogo) * 1000) / 1000 : 1;
}
// Na virada (e na troca de clube): quem entrou nas divisões do país sem
// escala (subiu do catálogo, da Série D) ganha a dele, e os fluxos do clube
// do técnico seguem a divisão e a posição financeira da temporada nova
// (caixa e contratos ficam). troca = o técnico mudou de clube (sem queda).
export function economiaDaTemporada(CAREER, { troca = false } = {}) {
  if (!E.economiaV2(CAREER)) return;
  const indice = indiceAtual;
  const divs = estado.divisoesDoPais(CAREER);
  for (const liga of divs) {
    const clubes = clubesParaEconomia(CAREER, indice, liga);
    if (!clubes.length || !E.PERFIS[liga]) continue;
    // A folha "de antes" de quem já está escalado: a folha ÷ a escala dele.
    const comLegado = clubes.map((c) => { const e = CAREER.economia.escalas[c.id]; return e ? { ...c, folhaLegada: c.folhaLegada / e[0], valores: c.valores.map((v) => v / e[1]) } : c; });
    const r = E.escalasDaDivisao(liga, comLegado);
    if (!r) continue;
    for (const c of clubes) {
      if (CAREER.economia.escalas[c.id]) continue;
      const [sal, val] = r.escalas[c.id];
      const b = r.economia.get(c.id);
      CAREER.economia.escalas[c.id] = [sal, val, b ? b.caixaInicial : 0];
      elencoDoClube(CAREER, c.id).forEach((p) => E.aplicarEscalaNoAtleta(p, { salario: sal, valor: val }));
    }
    const b = r.economia.get(String(CAREER.clubId));
    if (!b) continue;
    const antes = CAREER.economia.clube;
    const caiu = !troca && antes && antes.liga !== liga && divs.indexOf(antes.liga) >= 0 && divs.indexOf(antes.liga) < divs.indexOf(liga);
    const ano = caiu ? 1 : !troca && antes && antes.liga === liga && antes.anoAposQueda ? antes.anoAposQueda + 1 : 0;
    fluxosDoTecnico(CAREER, indice, b, ano);
  }
}
ganchosMundo.economiaDaTemporada = (CAREER, o) => economiaDaTemporada(CAREER, o);
ganchosMundo.economiaNova = (CAREER) => ativarEconomiaV2(CAREER, indiceAtual);
