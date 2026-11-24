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
import { buildSquad, buildLeagueSquads, montarCarreira, buildFriendlySlots } from "./virada.js";
import * as Rel from "./relogio.js";
import * as CM from "./calendariomundo.js";
import * as ML from "./mundoleve.js";
import * as Fo from "./formatos.js";
import * as partida from "./partida.js";

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
  return w && w.a ? `${w.a}-${w.d}` : null;
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
ganchosMundo.semanaDoMundo = (CAREER) => avancarMundoLeve(CAREER);

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
  const times = { [l1]: timesDaLiga(indice, l1), [l2]: timesDaLiga(indice, l2) };
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

  // Calendário e rodadas pela agenda do relógio.
  aplicarCalendario(CAREER, indice, 0);

  // Os outros países no mundo leve, até a pré-temporada da liga escolhida.
  const m = ML.abrirMundo(ML.criarMundoLeve(indice, { ligaEscolhida: liga, ativos: [pais.codigo], chave: `mundo:${CAREER.clubId}` }), indice);
  ML.prepararInicio(m);
  CAREER.mundoLeve = ML.salvarMundo(m);
  CAREER.mundo = { formato: 1, versaoCatalogo: indice.versao, pais: pais.codigo, k: 0, ano: comp.temporada.anoInicial };
  return CAREER;
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
  const zonasDe = (l) => (CAREER.mundo && CAREER.mundo.zonas && CAREER.mundo.zonas[l]) || null;
  const c = CM.montarCalendarioDaCarreira({
    agendaTecnico: agendaDaLiga(indice, liga, k, clubesDe(liga), zonasDe(liga)),
    agendaSeguinte: agendaDaLiga(indice, liga, k + 1, clubesDe(liga), zonasDe(liga)),
    outras: { [outra]: agendaDaLiga(indice, outra, k, clubesDe(outra), zonasDe(outra)) },
    janelas: paisDaLiga(indice, liga).janelas, k,
  });
  CAREER.calendar = c.calendar;
  CAREER.calendar.friendlies = buildFriendlySlots(CAREER.calendar);
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
