/* ===================================================================
   MOTOR — COPAS DA UEFA NA CARREIRA (MUNDO-001, M10b, 25/11/2026)
   -------------------------------------------------------------------
   Liga a Champions, a Europa League e a Conference (uefa.js) ao save, como
   copasmundo.js faz com as copas da CONMEBOL:
   - classificados: as 5 ligas jogáveis pela classificação da temporada
     anterior (gravada na virada de cada país); o 5º pacote e as outras
     associações (copas.uefa do índice) por uma tabela anual simplificada;
   - vagas: a tabela de jogo do índice (DEP-2 para as 5 ligas; as outras,
     scripts/dados/uefa_acesso.json), com os 2 titulares (campeões da
     Champions e da Europa League) e as 2 vagas extras de desempenho (EPS);
   - coeficiente de jogo: por clube (potes e cabeças de chave) e por
     associação (EPS), dos resultados europeus das últimas 5 temporadas do
     save; na 1ª edição, a força;
   - força entre ligas, relógio, premiação (EUR × câmbio × escala da Copa do
     Brasil), avisos e notícias, e o jogo do técnico ao vivo (M9c), como na
     CONMEBOL.
   Save: CAREER.copas.uefa (a edição em andamento compacta, histórico,
   titulares, coeficientes e as associações com a vaga extra).
=================================================================== */
import * as U from "./uefa.js";
import { dataNaEdicao } from "./continental.js";
import { rngDaChave } from "./desempate.js";
import { scoreGoals, nivelDeGols, forcaComNivel } from "./partida.js";
import { todosTimes } from "./estado.js";
import { moverCaixaCpu, pushLedger } from "./semana.js";
import { pushNotification } from "./registro.js";
import * as texto from "./texto.js";
import { clubeNoIndice, forcaNaLiga, nomeDe, noticia, tabelaAndina, compactarPlano, expandirPlano, ESCALA_PREMIOS } from "./copasmundo.js";

const S = (x) => String(x);
const N = (x) => (Number.isFinite(Number(x)) ? Number(x) : x);
const domingo = (semana) => new Date(Date.parse(semana + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);

// Parâmetros de balanceamento.
export const ALCANCE_NIVEL_UEFA = 1;
// Média de gols por time nas copas europeias (as ligas do pacote ficam entre 1,3 e 1,7).
export const MEDIA_GOLS_UEFA = 1.45;
// Coeficiente de jogo por edição: 2 por vitória, 1 por empate, bônus por fase.
export const PONTOS_COEF = { vitoria: 2, empate: 1, liga: { UCL: 4, UEL: 2, UECL: 1 }, fase: 1 };
export const TEMPORADAS_COEF = 5;
export const NOME_COPA_UEFA = { UCL: "Champions League", UEL: "Europa League", UECL: "Conference League" };
export const ETAPA_UEFA = { Q3: "3ª pré-eliminatória", PO: "playoff de qualificação", liga: "fase de liga", playoff_mata_mata: "playoff", oitavas: "oitavas de final", quartas: "quartas de final", semifinal: "semifinal", final: "final" };
const NOME_PREMIO = { participacao: "participação na fase de liga", vitoria: "vitória na fase de liga", empate: "empate na fase de liga", playoff_mata_mata: "playoff", oitavas: "oitavas de final", quartas: "quartas de final", semifinal: "semifinal", final: "final", campeao: "título" };

function tabelas(indice) {
  const c = indice.continentais;
  return { regras: { UCL: c.competicoes.UCL, UEL: c.competicoes.UEL, UECL: c.competicoes.UECL }, calendario: { UCL: c.calendarios.UCL, UEL: c.calendarios.UEL, UECL: c.calendarios.UECL }, acesso: c.acesso };
}
const ativa = (indice) => !!(indice && indice.copas && indice.copas.uefa && indice.continentais && indice.continentais.competicoes.UCL);

// ---------- associações, nível e força ----------
export function associacaoUefa(indice, id) {
  const info = clubeNoIndice(indice).get(S(id));
  if (!info) return null;
  if (info.assoc) return info.assoc;
  const a = Object.entries(indice.copas.uefa.associacoes).find(([, x]) => x.pais && x.pais === info.pais);
  return a ? a[0] : null;
}
export function nivelUefa(indice, assoc) {
  const a = indice.copas.uefa.associacoes[assoc];
  if (a && a.nivel) return a.nivel;
  const p = a && a.pais && indice.paises.find((x) => x.codigo === a.pais);
  return (p && indice.competicoes[p.ligas[0]].nivel) || 1;
}
export function forcaNaCopaUefa(CAREER, indice, plano, id) {
  const f = forcaNaLiga(CAREER, indice, id);
  const n = Math.pow(nivelUefa(indice, plano.associacao[S(id)] || associacaoUefa(indice, id)), ALCANCE_NIVEL_UEFA);
  return forcaComNivel({ atk: f.atk * n, def: f.def / n }, nivelDeGols(MEDIA_GOLS_UEFA));
}
function simulador(CAREER, indice, plano) {
  const f = (id) => forcaNaCopaUefa(CAREER, indice, plano, id);
  return {
    jogar: (j) => scoreGoals(f(j.casa), f(j.fora), 1, rngDaChave(`${plano.chave}:${j.id}`)),
    prorrogacao: (p) => scoreGoals(f(p.casa), f(p.fora), 1 / 3, rngDaChave(`${plano.chave}:${p.casa}:${p.fora}:prorrogacao`)),
    penaltis: (p) => (rngDaChave(`${plano.chave}:${p.casa}:${p.fora}:penaltis`)() < 0.5 ? p.casa : p.fora),
  };
}
const nota = (CAREER, indice, id) => { const f = forcaNaCopaUefa(CAREER, indice, { associacao: {} }, id); return f.atk / f.def; };

// ---------- classificação ----------
// Ordem de cada associação para a edição `ano` (temporada ano-1): as 5 ligas
// pela classificação gravada no mundo; sem ela (1ª edição), a força. As
// outras pela tabela anual simplificada (força com variação por ano).
export function ordensUefa(CAREER, indice, ano, chave) {
  const ordens = {};
  const u = indice.copas.uefa;
  for (const [assoc, a] of Object.entries(u.associacoes)) {
    if (a.pais) {
      const P = CAREER.mundoLeve && CAREER.mundoLeve.paises[a.pais];
      if (!P) continue;
      const cl = P.classificacao;
      if (cl && cl.ano === ano - 1) { ordens[assoc] = cl.ordem.map(N); continue; }
      const l1 = indice.paises.find((p) => p.codigo === a.pais).ligas[0];
      ordens[assoc] = (P.ligas[l1] ? P.ligas[l1].clubes : []).map((id) => ({ id, s: nota(CAREER, indice, id) }))
        .sort((x, y) => y.s - x.s || S(x.id).localeCompare(S(y.id))).map((x) => N(x.id));
      continue;
    }
    ordens[assoc] = tabelaAndina(u.clubes.filter((c) => c.assoc === assoc), `${chave}:${assoc}:${ano - 1}`);
  }
  return ordens;
}

// Vagas: a tabela de jogo do índice. A associação com a vaga extra (EPS)
// ganha uma vaga na fase de liga da Champions logo depois das que já tem; o
// titular que também se classificou pela liga passa a vaga ao próximo.
export function vagasUefa({ associacoes, ordens, titulares = [], eps = [] }) {
  const P = { UCL: { liga: [], PO: [], Q3: [] }, UEL: { liga: [], PO: [] }, UECL: { liga: [], PO: [] } };
  const associacao = {};
  const usados = new Set();
  for (const id of titulares) if (id != null) { usados.add(S(id)); P.UCL.liga.push(N(id)); }
  for (const [assoc, a] of Object.entries(associacoes)) {
    const vagas = a.vagas.slice();
    if (eps.includes(assoc)) {
      const ult = vagas.lastIndexOf("UCL:liga");
      vagas.splice(ult + 1, 0, "UCL:liga");
    }
    const fila = (ordens[assoc] || []).filter((id) => !usados.has(S(id)));
    if (fila.length < vagas.length) throw new Error(`copas UEFA: ${assoc} sem clubes para as vagas (${fila.length} de ${vagas.length})`);
    vagas.forEach((v, i) => {
      const [copa, fase] = v.split(":");
      const id = N(fila[i]);
      usados.add(S(id)); associacao[S(id)] = assoc;
      P[copa][fase].push(id);
    });
  }
  return { participantes: P, associacao };
}

// ---------- coeficiente de jogo ----------
// Pontos de uma edição por clube: vitórias, empates, fase de liga e cada fase
// do mata-mata a que chegou.
export function pontosDaEdicao(plano) {
  const pts = {};
  const soma = (id, x) => { pts[S(id)] = (pts[S(id)] || 0) + x; };
  for (const j of plano.jogos) {
    if (j.gh == null) continue;
    if (j.gh === j.ga) { soma(j.casa, PONTOS_COEF.empate); soma(j.fora, PONTOS_COEF.empate); }
    else soma(j.gh > j.ga ? j.casa : j.fora, PONTOS_COEF.vitoria);
  }
  for (const [copa, L] of Object.entries(plano.ligas || {})) for (const id of L.potes.flat()) soma(id, PONTOS_COEF.liga[copa]);
  for (const c of plano.confrontos) if (["oitavas", "quartas", "semifinal", "final"].includes(c.etapa)) { soma(c.a, PONTOS_COEF.fase); soma(c.b, PONTOS_COEF.fase); }
  return pts;
}
function atualizarCoeficientes(C, plano, elegiveisEps) {
  const pts = pontosDaEdicao(plano);
  const coef = C.coef ||= { clubes: {}, assoc: {} };
  for (const [id, x] of Object.entries(pts)) coef.clubes[id] = [...(coef.clubes[id] || []), [plano.ano, x]].filter(([a]) => a > plano.ano - TEMPORADAS_COEF);
  for (const id of Object.keys(coef.clubes)) {
    coef.clubes[id] = coef.clubes[id].filter(([a]) => a > plano.ano - TEMPORADAS_COEF);
    if (!coef.clubes[id].length) delete coef.clubes[id];
  }
  // Associação: média dos seus clubes na edição.
  const porAssoc = {};
  for (const [id, x] of Object.entries(pts)) { const a = plano.associacao[id]; if (!a) continue; (porAssoc[a] ||= []).push(x); }
  const daEdicao = Object.fromEntries(Object.entries(porAssoc).map(([a, l]) => [a, Math.round((l.reduce((s, x) => s + x, 0) / l.length) * 1000) / 1000]));
  for (const [a, x] of Object.entries(daEdicao)) coef.assoc[a] = [...(coef.assoc[a] || []), [plano.ano, x]].filter(([y]) => y > plano.ano - TEMPORADAS_COEF);
  // Vagas extras da próxima edição: as 2 melhores das 5 ligas jogáveis nesta (DEP-2).
  C.eps = Object.entries(daEdicao).filter(([a]) => elegiveisEps.has(a)).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 2).map(([a]) => a);
}
// Coeficiente de seleção (potes e cabeças de chave): pontos das últimas 5
// edições e, para desempatar e na 1ª edição, a força.
function coeficientes(CAREER, indice, ids) {
  const C = CAREER.copas.uefa;
  const hist = (C.coef && C.coef.clubes) || {};
  return Object.fromEntries(ids.map((id) => [S(id), (hist[S(id)] || []).reduce((s, [, x]) => s + x, 0) + nota(CAREER, indice, id)]));
}

// ---------- edição ----------
export function inicioDaEdicaoUefa(indice, ano) {
  const t = tabelas(indice);
  const anoDoPacote = Number(String(t.regras.UCL.edicao).slice(0, 4)) || 2026;
  const primeiras = [];
  for (const copa of U.COPAS_UEFA) for (const f of ["Q3", "PO", "liga"]) if (t.calendario[copa][f]) primeiras.push(dataNaEdicao(t.calendario[copa][f][0], ano, anoDoPacote));
  return primeiras.sort()[0];
}

export function montarEdicaoUefa(CAREER, indice, ano) {
  const t = tabelas(indice);
  const C = CAREER.copas.uefa;
  const u = indice.copas.uefa;
  const chave = `${CAREER.mundoLeve.chave}:uefa:${ano}`;
  const ordens = ordensUefa(CAREER, indice, ano, chave);
  let titulares = (C.titulares || []).filter((x) => x != null);
  if (titulares.length < u.titulares.length) {
    // 1ª edição: os 2 clubes mais fortes das 5 ligas (associações diferentes).
    const cand = Object.entries(u.associacoes).filter(([, a]) => a.pais).flatMap(([assoc]) => (ordens[assoc] || []).map((id) => ({ id, assoc, s: nota(CAREER, indice, id) })))
      .sort((x, y) => y.s - x.s || S(x.id).localeCompare(S(y.id)));
    titulares = [];
    const vistas = new Set();
    for (const x of cand) { if (titulares.length >= u.titulares.length) break; if (vistas.has(x.assoc)) continue; vistas.add(x.assoc); titulares.push(x.id); }
  }
  const eps = C.eps && C.eps.length ? C.eps : u.eps.inicial;
  const { participantes, associacao } = vagasUefa({ associacoes: u.associacoes, ordens, titulares, eps });
  for (const id of titulares) if (!associacao[S(id)]) associacao[S(id)] = associacaoUefa(indice, id);
  const todos = Object.keys(associacao);
  return U.montarEdicao({ ano, chave, regras: t.regras, calendario: t.calendario, acesso: t.acesso, participantes, coeficiente: coeficientes(CAREER, indice, todos), associacao });
}

function compactar(plano, humano) { return compactarPlano(plano, humano, ["regras", "calendario", "premiacao", "fluxos"]); }
function expandir(salvo, indice) {
  const t = tabelas(indice);
  return expandirPlano(salvo, { regras: t.regras, calendario: t.calendario, premiacao: U.PREMIACAO_UEFA, fluxos: U.fluxosDoPacote(t.acesso) }, (p, id, c) => (S(id) === S(c.a) ? 1 : 2));
}
export function edicaoUefaAtual(CAREER, indice) {
  const C = CAREER.copas && CAREER.copas.uefa;
  if (!C || !C.edicao || !ativa(indice)) return null;
  return expandir(C.edicao, indice);
}

// ---------- a semana ----------
// A edição da temporada europeia `ano` (julho a junho) é montada na 1ª semana
// de julho, se o save ainda está antes da 1ª fase; os jogos de cada semana
// andam com o mundo; o do técnico fica para ele jogar (M9c).
export function semanaDasCopasUefa(CAREER, indice, semana) {
  if (!ativa(indice) || !CAREER.mundoLeve || !semana) return [];
  const C = (CAREER.copas ||= {}).uefa ||= { historico: [], titulares: null, edicao: null, ultimoAno: null, coef: { clubes: {}, assoc: {} }, eps: null };
  const eventos = [];
  const fim = domingo(semana);
  const ano = Number(fim.slice(0, 4));
  // Primeiro a edição em andamento (a final de junho pode ser jogada na 1ª
  // semana da temporada seguinte); depois, a nova.
  if (C.edicao) eventos.push(...jogarSemana(CAREER, indice, semana, fim));
  if (!C.edicao && fim.slice(5) >= "07-01" && (C.ultimoAno == null || C.ultimoAno < ano)) {
    C.ultimoAno = ano;
    if (semana <= inicioDaEdicaoUefa(indice, ano)) {
      const plano = montarEdicaoUefa(CAREER, indice, ano);
      C.edicao = compactar(plano, CAREER.clubId);
      C.pagos = [];
      eventos.push({ tipo: "edicao", confed: "UEFA", ano });
      avisarClassificacao(CAREER, plano);
      eventos.push(...jogarSemana(CAREER, indice, semana, fim));
    }
  }
  if (!C.edicao) C.pendente = null;
  else atualizarPendente(CAREER, indice, semana);
  return eventos;
}

function jogarSemana(CAREER, indice, semana, fim) {
  const eventos = [];
  const plano = expandir(CAREER.copas.uefa.edicao, indice);
  const sim = simulador(CAREER, indice, plano);
  const humano = S(CAREER.clubId);
  const antes = situacao(plano, humano);
  const adiado = (j) => (S(j.casa) === humano || S(j.fora) === humano) && j.data >= semana;
  for (let g = 0; g < 1000 && !U.concluida(plano); g++) {
    const j = U.jogosPendentes(plano, fim).find((x) => !adiado(x));
    if (!j) break;
    U.registrarJogo(plano, j.id, sim.jogar(j), sim);
    if (S(j.casa) === humano || S(j.fora) === humano) eventos.push({ tipo: "jogo", confed: "UEFA", jogo: { ...j } });
  }
  eventos.push(...fecharRodada(CAREER, indice, plano, antes));
  return eventos;
}

function fecharRodada(CAREER, indice, plano, antes) {
  const C = CAREER.copas.uefa;
  pagarPremios(CAREER, plano);
  avisarHumano(CAREER, plano, antes, situacao(plano, S(CAREER.clubId)));
  if (U.concluida(plano)) {
    const r = plano.resultado;
    const resumo = { ano: plano.ano, ...Object.fromEntries(U.COPAS_UEFA.map((c) => [c, { campeao: r.campeoes[c], vice: r.vices[c] }])) };
    C.historico = [...(C.historico || []), resumo].slice(-20);
    C.titulares = [r.campeoes.UCL, r.campeoes.UEL];
    atualizarCoeficientes(C, plano, new Set(Object.entries(indice.copas.uefa.associacoes).filter(([, a]) => a.pais).map(([k]) => k)));
    C.edicao = null;
    for (const c of U.COPAS_UEFA) noticia(CAREER, `${nomeDe(CAREER, indice, r.campeoes[c])} é campeão da ${NOME_COPA_UEFA[c]} ${plano.ano}/${String(plano.ano + 1).slice(2)}`, S(r.campeoes[c]) === S(CAREER.clubId));
    return [{ tipo: "fim", confed: "UEFA", ...resumo }];
  }
  C.edicao = compactar(plano, CAREER.clubId);
  return [];
}

// ---------- o jogo do técnico ----------
export function jogoDoHumanoPendenteUefa(CAREER, indice, semana) {
  const plano = edicaoUefaAtual(CAREER, indice);
  if (!plano || !semana) return null;
  const humano = S(CAREER.clubId);
  const j = U.jogosPendentes(plano, domingo(semana)).find((x) => S(x.casa) === humano || S(x.fora) === humano);
  if (!j) return null;
  const c = j.conf ? plano.confrontos.find((x) => x.id === j.conf) : null;
  const ida = c && j.perna === 2 && c.placares[0] ? c.placares[0] : null;
  return { ...j, adversario: S(j.casa) === humano ? j.fora : j.casa, souMandante: S(j.casa) === humano, ida, pernas: c ? c.pernas : 1, plano };
}
export function atualizarPendente(CAREER, indice, semana) {
  const C = CAREER.copas && CAREER.copas.uefa;
  if (!C) return null;
  const j = jogoDoHumanoPendenteUefa(CAREER, indice, semana);
  if (!j) { C.pendente = null; return null; }
  const info = clubeNoIndice(indice).get(S(j.adversario));
  const t = todosTimes().find((x) => S(x.id) === S(j.adversario));
  const ida = j.ida ? (S(j.ida.casa) === S(CAREER.clubId) ? { meus: j.ida.gh, deles: j.ida.ga } : { meus: j.ida.ga, deles: j.ida.gh }) : null;
  C.pendente = {
    id: j.id, confed: "UEFA", copa: j.copa, nomeCopa: NOME_COPA_UEFA[j.copa], fase: j.fase, nomeFase: ETAPA_UEFA[j.fase] || j.fase, grupo: null,
    perna: j.perna || null, pernas: j.pernas, data: j.data, casa: j.casa, fora: j.fora, souMandante: j.souMandante, neutro: !!j.neutro,
    rodada: j.fase === "liga" ? j.rodada : null,
    adversario: { id: S(j.adversario), nome: t ? t.name : info ? info.c.nome : S(j.adversario), escudo: t ? t.logo || null : info ? info.c.escudo || info.c.logoOrigem || null : null },
    ida,
  };
  return C.pendente;
}
export function registrarJogoDoHumanoUefa(CAREER, indice, jogoId, placar, semana = null) {
  const plano = edicaoUefaAtual(CAREER, indice);
  if (!plano) throw new Error("copas UEFA: sem edição em andamento");
  const humano = S(CAREER.clubId);
  const antes = situacao(plano, humano);
  const j = U.registrarJogo(plano, jogoId, placar, simulador(CAREER, indice, plano));
  const c = j.conf ? plano.confrontos.find((x) => x.id === j.conf) : null;
  const sit = situacao(plano, humano);
  const eventos = fecharRodada(CAREER, indice, plano, antes);
  if (semana) atualizarPendente(CAREER, indice, semana); else CAREER.copas.uefa.pendente = null;
  return { jogo: { ...j }, confronto: c ? { ...c } : null, situacao: sit, eventos };
}

// ---------- prêmios ----------
export function emReaisEUR(eur) { return Math.round((eur * texto.CAMBIO.EUR * ESCALA_PREMIOS) / 1000) * 1000; }
function pagarPremios(CAREER, plano) {
  const C = CAREER.copas.uefa;
  const humano = S(CAREER.clubId);
  const pagos = new Set(C.pagos || []);
  for (const p of plano.premios) {
    if (pagos.has(p.chave)) continue;
    pagos.add(p.chave);
    const valor = emReaisEUR(p.valorEUR);
    if (S(p.clube) === humano) {
      CAREER.finances.cash += valor;
      pushLedger("premiacao", `${NOME_COPA_UEFA[p.copa]}: ${NOME_PREMIO[p.tipo] || p.tipo}`, valor, CAREER.currentRound);
    } else if (CAREER.leagueSquads && CAREER.leagueSquads[S(p.clube)]) {
      moverCaixaCpu(p.clube, valor);
    }
  }
  C.pagos = U.concluida(plano) ? [] : plano.premios.filter((p) => S(p.clube) === humano).map((p) => p.chave);
}

// ---------- avisos ----------
function situacao(plano, humano) {
  const meus = plano.jogos.filter((j) => S(j.casa) === humano || S(j.fora) === humano);
  if (!meus.length) return null;
  const ult = meus[meus.length - 1];
  const c = ult.conf && plano.confrontos.find((x) => x.id === ult.conf);
  const eliminadoNaLiga = ult.fase === "liga" && plano.ligas[ult.copa] && plano.ligas[ult.copa].ordem && plano.ligas[ult.copa].ordem.findIndex((x) => S(x) === humano) >= 24;
  return {
    copa: ult.copa, fase: ult.fase,
    eliminado: !!((c && c.perdedor != null && S(c.perdedor) === humano) || eliminadoNaLiga),
    campeao: !!(plano.resultado && S(plano.resultado.campeoes[ult.copa]) === humano),
  };
}
function avisarClassificacao(CAREER, plano) {
  const humano = S(CAREER.clubId);
  for (const copa of U.COPAS_UEFA) for (const [fase, ids] of Object.entries(plano.participantes[copa])) {
    if (!ids.some((x) => S(x) === humano)) continue;
    const txt = `Seu clube está na ${NOME_COPA_UEFA[copa]} ${plano.ano}/${String(plano.ano + 1).slice(2)} (${ETAPA_UEFA[fase] || fase}).`;
    pushNotification("posicao", txt);
    noticia(CAREER, txt, true);
    return;
  }
}
function avisarHumano(CAREER, plano, antes, agora) {
  if (!agora) return;
  const copa = NOME_COPA_UEFA[agora.copa];
  if (agora.campeao && !(antes && antes.campeao)) {
    const txt = `Campeão da ${copa}!`;
    pushNotification("posicao", txt); noticia(CAREER, txt, true);
    CAREER.titulosContinentais = [...(CAREER.titulosContinentais || []), { copa: agora.copa, ano: plano.ano }];
    return;
  }
  if (antes && antes.copa !== agora.copa) {
    const txt = `Seu clube segue na ${copa} (${ETAPA_UEFA[agora.fase] || agora.fase}).`;
    pushNotification("posicao", txt); noticia(CAREER, txt, true);
    return;
  }
  if (agora.eliminado && !(antes && antes.eliminado && antes.fase === agora.fase)) {
    // Derrota na qualificação que desce de copa não é eliminação.
    if (["Q3", "PO"].includes(agora.fase) && plano.fluxos[`${agora.copa}:${agora.fase}`]) return;
    const txt = `Eliminado da ${copa} (${ETAPA_UEFA[agora.fase] || agora.fase}).`;
    pushNotification("posicao", txt); noticia(CAREER, txt, true);
  }
}
