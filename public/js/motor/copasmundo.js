/* ===================================================================
   MOTOR — COPAS DO MUNDO NA CARREIRA (MUNDO-001, M9b, 25/11/2026)
   -------------------------------------------------------------------
   Liga a Libertadores e a Sul-Americana (continental.js) ao save:
   - classificados: saem das ligas do save (a classificação da temporada
     anterior de cada país, gravada na virada: mundo leve, país do técnico e
     Brasil). Bolívia, Paraguai, Peru e Venezuela (DEP-1) jogam com os clubes
     andinos do índice (copas.conmebol), com uma tabela anual simplificada;
   - vagas: a tabela de vagas por associação do pacote continental, na ordem
     campeões da temporada e depois a classificação (regra de jogo, ver
     vagasConmebol); os 2 campeões da edição anterior nos grupos;
   - força entre ligas: a força do clube na liga vezes o nível da liga
     (gameplayLevel do pacote; Brasil e andinos pela tabela de níveis do
     índice), no nível de gols das copas;
   - relógio: os jogos da semana do save (o mesmo relógio do mundo leve);
   - premiação: o crédito em USD do pacote, convertido em R$ (texto.CAMBIO),
     no caixa do técnico (com lançamento no ledger) e no caixa da CPU dos
     clubes do país do técnico; cada crédito uma vez só (chave única);
   - notícias e avisos do clube do técnico; campeões no feed.
   As partidas do técnico, nesta etapa, são simuladas como as da CPU (as ao
   vivo ficam para a M9c).

   Save (CAREER.copas.conmebol): a edição em andamento sem as regras do
   pacote (voltam do índice ao abrir), o histórico de campeões e os
   titulares da próxima edição. Ver docs/mundo/02_Plano_de_execucao.md.
=================================================================== */
import * as CT from "./continental.js";
import { rngDaChave } from "./desempate.js";
import { scoreGoals, nivelDeGols, forcaComNivel } from "./partida.js";
import { todosTimes } from "./estado.js";
import { moverCaixaCpu, pushLedger } from "./semana.js";
import { pushNotification, NEWS_FEED_MAX } from "./registro.js";
import * as texto from "./texto.js";

const S = (x) => String(x);
const N = (x) => (Number.isFinite(Number(x)) ? Number(x) : x);

// País do mundo -> associação da CONMEBOL.
export const ASSOC_DO_PAIS = { BR: "BRA", AR: "ARG", CL: "CHI", CO: "COL", EC: "ECU", UY: "URU" };
export const ANDINAS = ["BOL", "PAR", "PER", "VEN"];
// Parâmetros de balanceamento:
// - peso do nível da liga na força entre ligas (1 = a razão inteira);
export const ALCANCE_NIVEL_COPA = 1;
// - média de gols por time nas copas (pacote: sem média; a das ligas sul-americanas fica em 1,0–1,4);
export const MEDIA_GOLS_CONMEBOL = 1.25;
// - variação da tabela anual simplificada dos andinos (desvio do log da força);
export const RUIDO_ANDINO = 0.18;
// - na 1ª edição do save não há campeões anteriores: as 2 vagas de titulares
//   ficam com as associações dos 2 últimos campeões reais (Brasil e Argentina).
export const TITULARES_SEM_HISTORICO = ["BRA", "ARG"];
const VAGAS = ["LIB_grupos", "LIB_fase_2", "LIB_fase_1", "SUD_grupos", "SUD_primeira_fase"];
const domingo = (semana) => new Date(Date.parse(semana + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);

// ---------- regras do pacote no índice ----------
// O índice traz as regras continentais em indice.continentais (fonte do
// pacote) ou o caller passa as 4 tabelas.
function regrasDoIndice(indice) {
  const c = indice.continentais;
  if (!c) return null;
  return { regras: c.competicoes, calendario: c.calendarios, premiacao: c.premiacao, acesso: c.acesso };
}

// ---------- vagas (puro) ----------
// ordens: { [assoc]: [ids na ordem de prioridade] }; titulares: [campeão da
// Libertadores, campeão da Sul-Americana] da edição anterior (ou null).
// Regra de jogo (o pacote não traz as regras nacionais de acesso): cada
// associação preenche as vagas na ordem da tabela do pacote (grupos da
// Libertadores, fase 2, fase 1, grupos da Sul-Americana, 1ª fase), pela sua
// ordem; o titular que também se classificou pela liga passa a vaga ao
// próximo; sem titular (1ª edição), a vaga dele vai para a associação de
// TITULARES_SEM_HISTORICO.
export function vagasConmebol({ acesso, ordens, titulares = [null, null] }) {
  const tab = acesso.CONMEBOL;
  const usados = new Set();
  const associacao = {};
  const P = { LIB: { grupos: [], fase2: [], fase1: [] }, SUD: { grupos: [], primeiraFase: {} } };
  const extra = {};
  titulares.forEach((id, i) => {
    if (id != null) { usados.add(S(id)); P.LIB.grupos.push(N(id)); }
    else extra[TITULARES_SEM_HISTORICO[i]] = (extra[TITULARES_SEM_HISTORICO[i]] || 0) + 1;
  });
  for (const [assoc, vagas] of Object.entries(tab.por_associacao)) {
    const q = Object.fromEntries(tab.colunas.map((c, i) => [c, vagas[i]]));
    q.LIB_grupos += extra[assoc] || 0;
    const fila = (ordens[assoc] || []).filter((id) => !usados.has(S(id)));
    let k = 0;
    const tira = (n) => {
      const out = fila.slice(k, k + n);
      if (out.length < n) throw new Error(`copas: ${assoc} sem clubes para as vagas (${fila.length})`);
      k += n;
      out.forEach((id) => { usados.add(S(id)); associacao[S(id)] = assoc; });
      return out.map(N);
    };
    P.LIB.grupos.push(...tira(q.LIB_grupos));
    P.LIB.fase2.push(...tira(q.LIB_fase_2));
    P.LIB.fase1.push(...tira(q.LIB_fase_1));
    P.SUD.grupos.push(...tira(q.SUD_grupos));
    if (q.SUD_primeira_fase) P.SUD.primeiraFase[assoc] = tira(q.SUD_primeira_fase);
  }
  return { participantes: P, associacao };
}

// Ordem de prioridade de uma associação: os campeões da temporada (na ordem
// dada) e depois a classificação, sem repetir.
export function ordemDeAcesso(campeoes, classificacao) {
  const out = [], visto = new Set();
  for (const id of [...(campeoes || []), ...(classificacao || [])]) {
    if (id == null || visto.has(S(id))) continue;
    visto.add(S(id)); out.push(N(id));
  }
  return out;
}

// Tabela anual simplificada dos andinos: a força relativa com uma variação
// sorteada por ano (log-normal), determinística pela chave.
export function tabelaAndina(clubes, chave) {
  const rng = rngDaChave(chave);
  const gauss = () => { const u = Math.max(rng(), 1e-9), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return clubes.map((c) => ({ id: c.id, s: Math.log(c.atk / c.def) + RUIDO_ANDINO * gauss() }))
    .sort((a, b) => b.s - a.s || a.id - b.id).map((x) => x.id);
}

// ---------- força entre ligas ----------
// Por clube: { atk, def, nivel } (força na liga e nível da liga).
function clubeNoIndice(indice) {
  if (indice.__copasMapa) return indice.__copasMapa;
  const mapa = new Map();
  for (const c of indice.clubes) mapa.set(S(c.id), { c, pais: c.pais, liga: c.liga });
  for (const c of indice.terceira) if (!mapa.has(S(c.id))) mapa.set(S(c.id), { c, pais: c.pais, liga: null });
  if (indice.brasil) for (const [l, L] of Object.entries(indice.brasil.ligas)) for (const c of L.clubes) mapa.set(S(c.id), { c, pais: "BR", liga: l });
  // Série D: o campeão da Copa do Brasil pode vir de lá.
  if (indice.brasil && indice.brasil.serieD) for (const c of indice.brasil.serieD) if (!mapa.has(S(c.id))) mapa.set(S(c.id), { c, pais: "BR", liga: null });
  const cop = indice.copas && indice.copas.conmebol;
  if (cop) for (const c of cop.clubes) mapa.set(S(c.id), { c, assoc: c.assoc, liga: c.liga });
  Object.defineProperty(indice, "__copasMapa", { value: mapa, enumerable: false });
  return mapa;
}

export function nivelDaAssociacao(indice, assoc) {
  const cop = indice.copas && indice.copas.conmebol;
  if (cop && cop.niveis[assoc]) return cop.niveis[assoc];
  const cod = Object.keys(ASSOC_DO_PAIS).find((k) => ASSOC_DO_PAIS[k] === assoc);
  const p = indice.paises.find((x) => x.codigo === cod);
  return (p && indice.competicoes[p.ligas[0]].nivel) || 1;
}

// A força do clube na liga agora: o time do país do técnico (o motor tem a
// força do momento), a guardada no mundo leve (quem mudou de divisão) ou a
// do índice.
function forcaNaLiga(CAREER, indice, id) {
  const t = todosTimes().find((x) => S(x.id) === S(id));
  if (t && t.atk != null) return { atk: t.atk, def: t.def };
  const info = clubeNoIndice(indice).get(S(id));
  const pais = info && (info.pais || null);
  const P = pais && CAREER.mundoLeve && CAREER.mundoLeve.paises[pais];
  if (P && P.forcas && P.forcas[S(id)]) return { atk: P.forcas[S(id)][0], def: P.forcas[S(id)][1] };
  if (info && info.c.atk != null) return { atk: info.c.atk, def: info.c.def };
  return { atk: 0.8, def: 1.15 };
}

export function forcaNaCopa(CAREER, indice, plano, id) {
  const f = forcaNaLiga(CAREER, indice, id);
  const n = Math.pow(nivelDaAssociacao(indice, plano.associacao[S(id)]), ALCANCE_NIVEL_COPA);
  return forcaComNivel({ atk: f.atk * n, def: f.def / n }, nivelDeGols(MEDIA_GOLS_CONMEBOL));
}

function simulador(CAREER, indice, plano) {
  const f = (id) => forcaNaCopa(CAREER, indice, plano, id);
  return {
    jogar: (j) => scoreGoals(f(j.casa), f(j.fora), 1, rngDaChave(`${plano.chave}:${j.id}`)),
    prorrogacao: (p) => scoreGoals(f(p.casa), f(p.fora), 1 / 3, rngDaChave(`${plano.chave}:${p.casa}:${p.fora}:prorrogacao`)),
    penaltis: (p) => (rngDaChave(`${plano.chave}:${p.casa}:${p.fora}:penaltis`)() < 0.5 ? p.casa : p.fora),
  };
}

// ---------- classificação das ligas ----------
// A ordem de acesso de cada associação para a edição `ano` (temporada ano-1).
// Sem a temporada anterior no save (1ª edição): os clubes da 1ª divisão pela
// força (proxy da tabela).
export function ordensDaEdicao(CAREER, indice, ano, chave) {
  const ordens = {};
  const ML = CAREER.mundoLeve;
  for (const [cod, assoc] of Object.entries(ASSOC_DO_PAIS)) {
    const P = ML && ML.paises[cod];
    if (!P) continue;
    const cl = P.classificacao;
    if (cl && cl.ano === ano - 1) { ordens[assoc] = ordemDeAcesso(cl.campeoes, cl.ordem); continue; }
    const l1 = cod === "BR" ? "brasileirao" : indice.paises.find((p) => p.codigo === cod).ligas[0];
    const ids = (P.ligas[l1] && P.ligas[l1].clubes) || [];
    ordens[assoc] = ids.map((id) => ({ id, f: forcaNaLiga(CAREER, indice, id) })).sort((a, b) => b.f.atk / b.f.def - a.f.atk / a.f.def || S(a.id).localeCompare(S(b.id))).map((x) => N(x.id));
  }
  const cop = indice.copas.conmebol;
  for (const assoc of ANDINAS) ordens[assoc] = tabelaAndina(cop.clubes.filter((c) => c.assoc === assoc), `${chave}:${assoc}:${ano - 1}`);
  return ordens;
}

// Ranking CONMEBOL da edição (potes e mandos): a força nas copas (regra de
// jogo; o pacote não traz o ranking de clubes).
function rankingDaEdicao(CAREER, indice, associacao) {
  const plano = { associacao };
  const ids = Object.keys(associacao);
  const nota = (id) => { const f = forcaNaCopa(CAREER, indice, plano, id); return f.atk / f.def; };
  const ord = ids.map((id) => ({ id, s: nota(id) })).sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
  return Object.fromEntries(ord.map((x, i) => [x.id, i + 1]));
}

// ---------- edição no save ----------
// O plano sem as tabelas do pacote (voltam do índice ao abrir), com os jogos
// em listas (campos na ordem de CAMPOS_JOGO) e os confrontos sem o que se
// refaz: placares (dos jogos), sementes (do ranking), pontos regulares (0 nas
// copas) e semana relativa (0). Prêmios: só os do técnico (os da CPU já
// foram pagos na semana).
const CAMPOS_JOGO = ["copa", "fase", "rodada", "data", "casa", "fora", "gh", "ga", "conf", "perna", "neutro", "grupo", "extra"];
export function compactar(plano, humano) {
  const { regras, calendario, premiacao, jogos, confrontos, ...resto } = plano;
  resto.premios = plano.premios.filter((p) => S(p.clube) === S(humano));
  resto.jogos = jogos.map((j) => {
    const t = CAMPOS_JOGO.map((k) => (j[k] === undefined ? null : j[k]));
    while (t.length > 8 && t[t.length - 1] == null) t.pop();
    return t;
  });
  resto.confrontos = confrontos.map(({ sementes, pontosRegulares, semanaRel, placares, ...c }) => c);
  return JSON.parse(JSON.stringify(resto));
}
export function expandir(salvo, R) {
  const p = JSON.parse(JSON.stringify(salvo));
  p.jogos = p.jogos.map((t, i) => {
    const j = { id: `${t[0]}:${i + 1}` };
    CAMPOS_JOGO.forEach((k, x) => { const v = t[x]; if (v != null || k === "gh" || k === "ga") j[k] = v ?? null; });
    return j;
  });
  p.confrontos = p.confrontos.map((c) => ({
    ...c,
    sementes: { [c.a]: p.ranking[S(c.a)] ?? 999, [c.b]: p.ranking[S(c.b)] ?? 999 }, pontosRegulares: { [c.a]: 0, [c.b]: 0 }, semanaRel: 0,
    placares: p.jogos.filter((j) => j.conf === c.id && j.gh != null).map((j) => ({ casa: j.casa, fora: j.fora, gh: j.gh, ga: j.ga })),
  }));
  return {
    ...p,
    regras: { LIB: R.regras.LIB, SUD: R.regras.SUD }, calendario: { LIB: R.calendario.LIB, SUD: R.calendario.SUD }, premiacao: R.premiacao,
  };
}

export function montarEdicaoDoSave(CAREER, indice, ano) {
  const R = regrasDoIndice(indice);
  const C = CAREER.copas.conmebol;
  const chave = `${CAREER.mundoLeve.chave}:conmebol:${ano}`;
  const ordens = ordensDaEdicao(CAREER, indice, ano, chave);
  const { participantes, associacao } = vagasConmebol({ acesso: R.acesso, ordens, titulares: C.titulares || [null, null] });
  // Associação dos titulares (podem vir de qualquer país).
  for (const id of participantes.LIB.grupos) if (!associacao[S(id)]) associacao[S(id)] = associacaoDoClube(indice, CAREER, id);
  const ranking = rankingDaEdicao(CAREER, indice, associacao);
  return CT.montarEdicao({ ano, chave, regras: R.regras, calendario: R.calendario, premiacao: R.premiacao, participantes, ranking, associacao });
}

function associacaoDoClube(indice, CAREER, id) {
  const info = clubeNoIndice(indice).get(S(id));
  if (info && info.assoc) return info.assoc;
  if (info && info.pais) return ASSOC_DO_PAIS[info.pais] || null;
  return null;
}

// Primeira data da edição (fase 1 da Libertadores).
export function inicioDaEdicao(indice, ano) {
  const R = regrasDoIndice(indice);
  return CT.dataNaEdicao(R.calendario.LIB.fase_1[0], ano, Number(R.regras.LIB.edicao) || 2026);
}

// ---------- a semana ----------
// Chamado depois que o mundo leve chegou à semana do save. Monta a edição do
// ano (se ainda dá tempo: antes da fase 1), joga os jogos até o domingo,
// credita os prêmios e fecha a edição. Devolve os acontecimentos.
export function semanaDasCopas(CAREER, indice, semana) {
  if (!indice || !indice.copas || !indice.continentais || !CAREER.mundoLeve || !semana) return [];
  const C = (CAREER.copas ||= {}).conmebol ||= { historico: [], titulares: null, edicao: null, ultimoAno: null };
  const R = regrasDoIndice(indice);
  const eventos = [];
  const fim = domingo(semana);
  const ano = Number(fim.slice(0, 4));
  if (!C.edicao && (C.ultimoAno == null || C.ultimoAno < ano)) {
    C.ultimoAno = ano;
    if (semana <= inicioDaEdicao(indice, ano)) {
      const plano = montarEdicaoDoSave(CAREER, indice, ano);
      C.edicao = compactar(plano, CAREER.clubId);
      C.pagos = [];
      eventos.push({ tipo: "edicao", ano });
      avisarClassificacao(CAREER, plano);
    }
  }
  if (!C.edicao) return eventos;
  const plano = expandir(C.edicao, R);
  const sim = simulador(CAREER, indice, plano);
  const humano = S(CAREER.clubId);
  const antes = situacaoDoHumano(plano, humano);
  // O jogo do técnico nesta semana fica para ele jogar ao vivo (M9c:
  // jogoDoHumanoPendente / registrarJogoDoHumano); o de semana passada que
  // ficou sem jogar é simulado, como os da CPU.
  const adiado = (j) => (S(j.casa) === humano || S(j.fora) === humano) && j.data >= semana;
  for (let g = 0; g < 400 && !CT.concluida(plano); g++) {
    const j = CT.jogosPendentes(plano, fim).find((x) => !adiado(x));
    if (!j) break;
    CT.registrarJogo(plano, j.id, sim.jogar(j), sim);
    if (S(j.casa) === humano || S(j.fora) === humano) eventos.push({ tipo: "jogo", jogo: { ...j } });
  }
  eventos.push(...fecharRodada(CAREER, indice, plano, antes));
  atualizarPendente(CAREER, indice, semana);
  return eventos;
}

// O jogo do técnico na semana, guardado no save para as telas (Início):
// copa, fase, perna, data, adversário (nome e escudo) e a ida (meus x deles).
export function atualizarPendente(CAREER, indice, semana) {
  const C = CAREER.copas && CAREER.copas.conmebol;
  if (!C) return null;
  const j = jogoDoHumanoPendente(CAREER, indice, semana);
  if (!j) { C.pendente = null; return null; }
  const info = clubeNoIndice(indice).get(S(j.adversario));
  const t = todosTimes().find((x) => S(x.id) === S(j.adversario));
  const ida = j.ida ? (S(j.ida.casa) === S(CAREER.clubId) ? { meus: j.ida.gh, deles: j.ida.ga } : { meus: j.ida.ga, deles: j.ida.gh }) : null;
  C.pendente = {
    id: j.id, copa: j.copa, nomeCopa: NOME_COPA[j.copa], fase: j.fase, nomeFase: ETAPA[j.fase] || j.fase, grupo: j.grupo || null,
    perna: j.perna || null, pernas: j.pernas, data: j.data, casa: j.casa, fora: j.fora, souMandante: j.souMandante, neutro: !!j.neutro,
    adversario: { id: S(j.adversario), nome: t ? t.name : info ? info.c.nome : S(j.adversario), escudo: t ? t.logo || null : info ? info.c.escudo || info.c.logoOrigem || null : null },
    ida,
  };
  return C.pendente;
}

// Depois de jogos registrados: prêmios, avisos do técnico e, se a edição
// acabou, o histórico; grava a edição compacta.
function fecharRodada(CAREER, indice, plano, antes) {
  const C = CAREER.copas.conmebol;
  const humano = S(CAREER.clubId);
  pagarPremios(CAREER, plano);
  avisarHumano(CAREER, plano, antes, situacaoDoHumano(plano, humano));
  if (CT.concluida(plano)) {
    const r = plano.resultado;
    const finais = (copa) => plano.confrontos.find((c) => c.copa === copa && c.etapa === "final");
    const resumo = { ano: plano.ano, LIB: { campeao: r.campeoes.LIB, vice: finais("LIB").perdedor }, SUD: { campeao: r.campeoes.SUD, vice: finais("SUD").perdedor } };
    C.historico = [...(C.historico || []), resumo].slice(-20);
    C.titulares = [r.campeoes.LIB, r.campeoes.SUD];
    C.edicao = null;
    noticiaDosCampeoes(CAREER, indice, resumo);
    return [{ tipo: "fim", ...resumo }];
  }
  C.edicao = compactar(plano, CAREER.clubId);
  return [];
}

// ---------- o jogo do técnico (M9c) ----------
// O jogo dele nas copas que está para ser jogado na semana do save (ou null).
export function jogoDoHumanoPendente(CAREER, indice, semana) {
  const plano = edicaoAtual(CAREER, indice);
  if (!plano || !semana) return null;
  const humano = S(CAREER.clubId);
  const j = CT.jogosPendentes(plano, domingo(semana)).find((x) => S(x.casa) === humano || S(x.fora) === humano);
  if (!j) return null;
  const c = j.conf ? plano.confrontos.find((x) => x.id === j.conf) : null;
  const ida = c && j.perna === 2 && c.placares[0] ? c.placares[0] : null;
  return { ...j, adversario: S(j.casa) === humano ? j.fora : j.casa, souMandante: S(j.casa) === humano, ida, pernas: c ? c.pernas : 1, plano };
}

// Registra o placar do jogo do técnico (jogado ao vivo). Prorrogação e
// pênaltis, quando o confronto pede, pelo simulador. Devolve o jogo, o
// confronto (com vencedor, se decidido) e a situação do técnico.
export function registrarJogoDoHumano(CAREER, indice, jogoId, placar, semana = null) {
  const plano = edicaoAtual(CAREER, indice);
  if (!plano) throw new Error("copas: sem edição em andamento");
  const humano = S(CAREER.clubId);
  const antes = situacaoDoHumano(plano, humano);
  const j = CT.registrarJogo(plano, jogoId, placar, simulador(CAREER, indice, plano));
  const c = j.conf ? plano.confrontos.find((x) => x.id === j.conf) : null;
  const sit = situacaoDoHumano(plano, humano);
  const eventos = fecharRodada(CAREER, indice, plano, antes);
  if (semana) atualizarPendente(CAREER, indice, semana);
  else if (CAREER.copas.conmebol) CAREER.copas.conmebol.pendente = null;
  return { jogo: { ...j }, confronto: c ? { ...c } : null, situacao: sit, eventos };
}

// ---------- prêmios ----------
// Escala da premiação: a economia do jogo é a da carreira (pelo overall), e
// a Copa do Brasil do jogo paga cerca de 1/5 da premiação real (campeão
// R$ 10 mi; fechamento.CUP_PRIZE). A premiação do pacote (USD reais) entra
// na mesma escala, para a Libertadores pesar no caixa como pesa a Copa do
// Brasil, e não 5 vezes mais (anti-exploit, CLAUDE.md seção 29).
export const ESCALA_PREMIOS = 0.2;
export function emReais(usd) { return Math.round((usd * texto.CAMBIO.USD * ESCALA_PREMIOS) / 1000) * 1000; }
const NOME_COPA = { LIB: "Libertadores", SUD: "Sul-Americana" };
const NOME_PREMIO = { mando: "cota de mando", visita: "cota de visitante", vitoria: "vitória na fase de grupos", campeao: "título", vice: "vice-campeonato" };

function pagarPremios(CAREER, plano) {
  const C = CAREER.copas.conmebol;
  const humano = S(CAREER.clubId);
  const pagos = new Set(C.pagos || []);
  for (const p of plano.premios) {
    if (pagos.has(p.chave)) continue;
    pagos.add(p.chave);
    const valor = emReais(p.valorUSD);
    if (S(p.clube) === humano) {
      CAREER.finances.cash += valor;
      pushLedger("premiacao", `${NOME_COPA[p.copa]}: ${NOME_PREMIO[p.tipo] || p.tipo}`, valor, CAREER.currentRound);
    } else if (CAREER.leagueSquads && CAREER.leagueSquads[S(p.clube)]) {
      moverCaixaCpu(p.clube, valor);
    }
  }
  // O save guarda só os prêmios do técnico (compactar): as chaves pagas são
  // as dele, e zeram quando a edição acaba.
  C.pagos = CT.concluida(plano) ? [] : plano.premios.filter((p) => S(p.clube) === humano).map((p) => p.chave);
}

// ---------- avisos e notícias ----------
function nomeDe(CAREER, indice, id) {
  const t = todosTimes().find((x) => S(x.id) === S(id));
  if (t) return t.name;
  const info = clubeNoIndice(indice).get(S(id));
  return info ? info.c.nome : String(id);
}

const ETAPA = { fase_1: "fase 1", fase_2: "fase 2", fase_3: "fase 3", primeira_fase: "1ª fase", grupos: "fase de grupos", playoff: "playoff", oitavas: "oitavas de final", quartas: "quartas de final", semifinal: "semifinal", final: "final" };

// Em que copa e etapa o clube do técnico está (ou null).
export function situacaoDoHumano(plano, humano) {
  const vivos = plano.jogos.filter((j) => S(j.casa) === humano || S(j.fora) === humano);
  if (!vivos.length) return null;
  const ult = vivos[vivos.length - 1];
  const c = ult.conf && plano.confrontos.find((x) => x.id === ult.conf);
  const fora = c && c.perdedor != null && S(c.perdedor) === humano;
  const campeao = plano.resultado && S(plano.resultado.campeoes[ult.copa]) === humano;
  return { copa: ult.copa, fase: ult.fase, eliminado: !!fora, campeao: !!campeao };
}

function avisarClassificacao(CAREER, plano) {
  const humano = S(CAREER.clubId);
  const P = plano.participantes;
  const onde = P.LIB.grupos.some((x) => S(x) === humano) ? ["LIB", "fase de grupos"]
    : P.LIB.fase2.some((x) => S(x) === humano) ? ["LIB", "fase 2"]
      : P.LIB.fase1.some((x) => S(x) === humano) ? ["LIB", "fase 1"]
        : P.SUD.grupos.some((x) => S(x) === humano) ? ["SUD", "fase de grupos"]
          : Object.values(P.SUD.primeiraFase).flat().some((x) => S(x) === humano) ? ["SUD", "1ª fase"] : null;
  if (!onde) return;
  const txt = `Seu clube está na ${NOME_COPA[onde[0]]} ${plano.ano} (${onde[1]}).`;
  pushNotification("posicao", txt);
  noticia(CAREER, txt, true);
}

function avisarHumano(CAREER, plano, antes, agora) {
  if (!agora) return;
  const copa = NOME_COPA[agora.copa];
  if (agora.campeao && !(antes && antes.campeao)) {
    const txt = `Campeão da ${copa} ${plano.ano}!`;
    pushNotification("posicao", txt);
    noticia(CAREER, txt, true);
    CAREER.titulosContinentais = [...(CAREER.titulosContinentais || []), { copa: agora.copa, ano: plano.ano }];
    return;
  }
  // Mudou de copa (fase 3 da Libertadores ou 3º do grupo -> Sul-Americana).
  if (antes && antes.copa !== agora.copa) {
    const txt = `Seu clube segue na ${copa} (${ETAPA[agora.fase] || agora.fase}).`;
    pushNotification("posicao", txt);
    noticia(CAREER, txt, true);
    return;
  }
  if (agora.eliminado && !(antes && antes.eliminado && antes.fase === agora.fase)) {
    const terceiroNaLib = agora.copa === "LIB" && agora.fase === "grupos";
    if (terceiroNaLib) return;
    const txt = `Eliminado da ${copa} (${ETAPA[agora.fase] || agora.fase}).`;
    pushNotification("posicao", txt);
    noticia(CAREER, txt, true);
  }
}

function noticiaDosCampeoes(CAREER, indice, r) {
  noticia(CAREER, `${nomeDe(CAREER, indice, r.LIB.campeao)} é campeão da Libertadores ${r.ano}`, S(r.LIB.campeao) === S(CAREER.clubId));
  noticia(CAREER, `${nomeDe(CAREER, indice, r.SUD.campeao)} é campeão da Sul-Americana ${r.ano}`, S(r.SUD.campeao) === S(CAREER.clubId));
}

function noticia(CAREER, txt, mine) {
  CAREER.newsFeed = [{ type: "continental", mine: !!mine, texto: txt, round: CAREER.currentRound, seasonYear: CAREER.seasonYear }, ...(CAREER.newsFeed || [])];
  if (CAREER.newsFeed.length > NEWS_FEED_MAX) CAREER.newsFeed.length = NEWS_FEED_MAX;
}

// A edição em andamento como o motor a usa (telas da v2, M10).
export function edicaoAtual(CAREER, indice) {
  const C = CAREER.copas && CAREER.copas.conmebol;
  if (!C || !C.edicao || !indice || !indice.continentais) return null;
  return expandir(C.edicao, regrasDoIndice(indice));
}
