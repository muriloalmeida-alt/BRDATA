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

import * as Fa from "./fases.js";
import * as Vp from "./viradapais.js";
import { classificar, opcoesDaLiga, rngDaChave } from "./desempate.js";
import { buildLeagueSquad } from "./virada.js";
import { viradaDoCaixaCpu } from "./semana.js";
import * as temporada from "./temporada.js";
import * as tabela from "./tabela.js";

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

  if (pais.regiao !== "europa") throw new Error("mundo: virada da América do Sul na carreira ainda não ligada (M6b-4b)");
  const ordem = {}, pontos = {};
  for (const l of [l1, l2]) {
    const t = tabelaFinal(indice, l, standingsDe(l), `${chave}:${l}`);
    ordem[l] = t.map((r) => N(r.id));
    pontos[l] = Object.fromEntries(t.map((r) => [N(r.id), r.pts]));
  }
  const catalogo = P.catalogo.map((id) => {
    const extra = P.catalogoExtra[S(id)];
    const c = indice.terceira.find((x) => S(x.id) === S(id));
    return extra ? { id, ...extra } : { id, elegibilidade: c && c.elegibilidade, clubePai: c && c.clubePai, grupo: c && c.grupo };
  });
  const naDivisao = (id) => (ordem[l1].some((x) => S(x) === S(id)) ? 1 : ordem[l2].some((x) => S(x) === S(id)) ? 2 : null);
  const reservasDoMundo = indice.clubes.filter((c) => c.reserva && c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai }))
    .concat(indice.terceira.filter((c) => c.clubePai).map((c) => ({ id: c.id, clubePai: c.clubePai })));
  const ativos = new Set([...ordem[l1], ...ordem[l2]].map(S));
  const temBarrage = !!(indice.competicoes[l2].regras || {}).interDivisionPlayoff;
  const rep = temBarrage ? Vp.sortearRepresentante({ catalogo, divisaoAtual: naDivisao, chave }) : null;
  const plano = Fa.montarPosTemporada({
    pais: cod, comps: [indice.competicoes[l1], indice.competicoes[l2]], ordens: ordem, pontos,
    reservas: reservasDoMundo.filter((r) => ativos.has(S(r.id))).map((r) => r.id), representanteTerceira: rep, chave,
  });
  const res = Fa.jogarTudo(plano, simuladorDoPais(CAREER, `${chave}:pos`));
  const v = Vp.aplicarVirada({
    pais: cod, chave, d1: { id: l1, clubes: ordem[l1] }, d2: { id: l2, clubes: ordem[l2] },
    sobemD2: res.sobem[l2], descemD1: res.descem[l1], descemD2: res.descem[l2], sobemTerceira: res.sobem.terceira,
    quedaD2: ordem[l2].slice().reverse(), catalogo, reservas: reservasDoMundo, humano: N(CAREER.clubId),
  });

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
    mundo: true, pais: cod, campeoes: res.campeao, confrontos: plano.confrontos,
    relegatedA: times(res.descem[l1]), promotedB: times(res.sobem[l2]), relegatedB: times(v.foramParaOCatalogo), promotedC: times(v.entraramDoCatalogo),
    relegatedC: [], promotedD: [], excecoes: v.excecoes,
    divisionChanged: mudou, newCompetitionId: humanoEm, texto,
    humanoNoPlayoff: plano.confrontos.some((c) => S(c.a) === humano || S(c.b) === humano),
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
