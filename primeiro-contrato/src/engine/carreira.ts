// Orquestração da carreira (PC-001, PC-002). API pura: cada função recebe o
// save e devolve um save novo (nunca muta a entrada). Determinística por
// semente: a reprodução na tela não muda nenhum resultado.
//
// Loop: contrato → temporada (pré-temporada; avança jogo a jogo até uma
// decisão ou o fim) → balanço → janela (ou "Mais uma temporada?") → próxima
// temporada … → encerrada.
import { confiancaInicial, criarAtleta, evoluir, nivelNaFuncao, NAC, nomeExibicao, type Atleta } from "./atleta.ts";
import { forcaClube, jogosDaTemporada, nivelLiga, type Catalogo } from "./catalogo.ts";
import { classificacao, jogoDoClube, montarCalendario, participantes, type Calendario } from "./calendario.ts";
import { chanceEntrar, chanceTitular, gerarConcorrentes, intervaloMinutos, papelPorParticipacao, participacaoEsperada, principalConcorrente } from "./elenco.ts";
import { SCHEMA_VERSAO, statsVazias, type Campanha, type Carreira, type Compromisso, type Decisao, type Declaracao, type Lesao, type Oferta, type Partida, type Pedido, type Pendente, type Plano, type RegistroTemporada, type Temporada } from "./estado.ts";
import { gerarOfertas, idadeEm, interesseConcreto, projetarPapel } from "./mercado.ts";
import { aplicarNegociacao } from "./negociacao.ts";
import { ajustarIdentificacao, avaliarPlano, compromissoAtivo, criarPlano, declarar, encerrarCompromissos, manchete, planoAtivo, planoCompleto, recepcaoNoReencontro, rodadaDaVaga, torcidaDe } from "./relacoes.ts";
import { classico } from "./rivalidades.ts";
import { faixaSalarial, formatarDinheiro } from "./financas.ts";
export { rodadaDaVaga };
import { metricaPrincipal, POS, RELACIONADAS, type Posicao } from "./posicoes.ts";
import { clamp, rngFrom, type Rng } from "./rng.ts";

export const CONFIG = {
  anoInicial: 2027,
  idadeAposentadoriaVoluntaria: 33, // a partir daqui a janela pergunta "Mais uma temporada?"
  idadeLimite: 40,
  interrupcoesPorTemporada: 2, // eventos novos (entrevista, rumor) por temporada
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

// ───────────────────────── criação e primeiro contrato ─────────────────────────

export type DadosCriacao = { semente: string; apelido?: string | null; nacionalidade: string; numero: number; posicao: Posicao; anoInicial?: number; agora?: string };

export function novaCarreira(cat: Catalogo, d: DadosCriacao): Carreira {
  const anoInicial = d.anoInicial ?? CONFIG.anoInicial;
  return {
    schema: SCHEMA_VERSAO, catalogo: cat.versao, semente: d.semente,
    criadaEm: d.agora ?? new Date(0).toISOString(), anoInicial, ano: anoInicial, fase: "contrato",
    atleta: criarAtleta(d.semente, { apelido: d.apelido, nacionalidade: d.nacionalidade, numero: d.numero, posicao: d.posicao, anoInicio: anoInicial }),
    vinculo: null, emprestimo: null, temporada: null, historico: [], marcos: [], pendente: null,
    decisoes: [], chavesUsadas: [], interesseEmprestimo: false, clubesDeInteresse: [], ultimaConsequencia: null, convocado: false,
    rumor: null, compromissos: [], planos: [], declaracoes: [], torcida: {}, manchetes: [],
  };
}

/** Proposta do primeiro contrato: qualquer clube do snapshot recebe o atleta;
 *  o papel decorre da disputa por minutos (clube forte = promessa). */
export function propostaInicial(cat: Catalogo, c: Carreira, clubeId: string): Oferta {
  const p = projetarPapel(cat, c, clubeId, c.ano);
  const duracao = p.papel === "Promessa" ? 3 : 2;
  return {
    id: `inicial:${clubeId}`, tipo: "transferencia", clubeId, clubeNome: cat.clube(clubeId)?.nome ?? clubeId,
    papel: p.papel, previsao: p.previsao, minutosPrevistos: p.minutosPrevistos, duracao,
    motivo: "Primeiro contrato profissional.", taxa: 0,
    salario: faixaSalarial(cat, clubeId, p.papel, c.atleta.nivel).ref, bonus: null, revisaoRodada: null, validaAte: c.ano,
  };
}

/** Três sugestões com papéis diferentes, priorizando o país da nacionalidade. */
export function sugestoesIniciais(cat: Catalogo, c: Carreira): string[] {
  const nac = NAC[c.atleta.nacionalidade];
  const r = rngFrom(c.semente, "sugestoes");
  const doPais = cat.clubes.filter((cl) => cat.liga(cl.ligaId)?.pais === nac?.nome);
  const base = doPais.length >= 20 ? doPais : cat.clubes;
  const ef = nivelNaFuncao(c.atleta, c.atleta.posicao);
  const alvo = (delta: number, pool: typeof base) => {
    const ord = pool.map((cl) => ({ id: cl.id, d: Math.abs(forcaClube(cat, cl.id) - (ef + delta)) + r.next() * 3 })).sort((a, b) => a.d - b.d);
    return ord[0]?.id;
  };
  // Promessa (clube forte, em qualquer país do catálogo), Rotação (parelho)
  // e Titular (clube abaixo do nível).
  const ids = [alvo(18, cat.clubes), alvo(3, base), alvo(-6, base)].filter(Boolean) as string[];
  return [...new Set(ids)];
}

export function assinarPrimeiroContrato(cat: Catalogo, entrada: Carreira, clubeId: string): Carreira {
  const c = clone(entrada);
  if (c.fase !== "contrato" || !cat.clube(clubeId)) return entrada;
  const of = propostaInicial(cat, c, clubeId);
  c.vinculo = { clubeId, clubeNome: of.clubeNome, inicio: c.ano, fim: c.ano + of.duracao - 1, papel: of.papel, previsao: of.previsao, salario: of.salario ?? null, bonus: null };
  c.marcos.push({ tipo: "estreia", ano: c.ano, texto: `Primeiro contrato com o ${of.clubeNome}`, clubeId });
  iniciarTemporada(cat, c, c.ano);
  return c;
}

// ───────────────────────────────── temporada ─────────────────────────────────

export function clubeAtualId(c: Carreira): string {
  return c.emprestimo?.clubeId ?? c.vinculo?.clubeId ?? "";
}

function iniciarTemporada(cat: Catalogo, c: Carreira, ano: number) {
  const clubeId = clubeAtualId(c);
  const clube = cat.clube(clubeId);
  const liga = clube ? cat.liga(clube.ligaId) : undefined;
  const anterior = c.temporada;
  const mesmoClube = !!anterior && anterior.clubeId === clubeId;
  const funcao: Posicao = mesmoClube ? anterior!.funcao : c.atleta.posicao;
  const conc = gerarConcorrentes(cat, c.semente, clubeId, funcao, ano);
  const { jogos, simplificada } = jogosDaTemporada(liga);
  if (!mesmoClube) {
    // Clube novo: a confiança recomeça pelo papel previsto; compromissos e
    // planos do clube anterior deixam de valer (com o motivo registrado).
    const papelPrev = papelPorParticipacao(participacaoEsperada(nivelNaFuncao({ ...c.atleta, confianca: 0.5 }, funcao), conc));
    c.atleta.confianca = confiancaInicial(papelPrev);
    encerrarCompromissos(c, (x) => x.clubeId !== clubeId, c.emprestimo ? "Empréstimo para outro clube antes da revisão." : "Mudança de clube antes da revisão.");
    for (const pl of c.planos) if (pl.estado === "ativo") { pl.estado = "encerrado"; pl.resultado = { jogos: 0, minutos: 0, valor90: 0, texto: "Encerrado pela mudança de clube." }; }
    torcidaDe(c, clubeId, ano);
  }
  // Reforço na posição: o clube contrata quando o atleta já é titular.
  const rr = rngFrom(c.semente, "reforco", ano, clubeId);
  const ultReg = c.historico[c.historico.length - 1];
  let reforco = false;
  if (mesmoClube && funcao !== "GOL" && (ultReg?.participacao ?? 0) >= 0.6 && rr.chance(0.3)) {
    const nivelRef = Math.round(nivelNaFuncao(c.atleta, funcao)) + 1;
    conc.push({ id: `${clubeId}-${funcao}-${ano}-reforco`, nome: `${["L.", "M.", "R.", "T."][rr.int(0, 3)]} ${["Arantes", "Vergara", "Holt", "Sardi", "Pires"][rr.int(0, 4)]}`, idade: rr.int(22, 29), nivel: nivelRef, simulado: true });
    reforco = true;
  }
  const part = participacaoEsperada(nivelNaFuncao(c.atleta, funcao), conc);
  c.ano = ano;
  c.fase = "temporada";
  if (c.rumor && c.rumor.ano < ano) c.rumor = null;
  c.temporada = {
    ano, clubeId, ligaId: clube?.ligaId ?? "", funcao, jogosTotal: jogos, simplificada, jogoAtual: 0,
    jogos: 0, titularidades: 0, minutos: 0, stats: statsVazias(), notas: 0, minutosPorJogo: [],
    concorrentes: conc, previsao: intervaloMinutos(part), papel: papelPorParticipacao(part),
    nivelInicio: c.atleta.nivel, lesao: null, riscoRecaida: 0, bonusTreino: 0, bonusAvaliacao: 0, lesoes: 0,
    participantes: participantes(cat, liga, clubeId, jogos, c.semente, ano),
    partidas: [], exibidos: 0, interrupcoes: 0, origemParcial: 0,
    ausencia: agendarAusencia(c.semente, ano, clubeId, conc, jogos), reforco,
  };
}

/** Vaga aberta: o principal concorrente fica fora por algumas rodadas
 *  (lesão simulada dele), sorteado no início da temporada. */
function agendarAusencia(semente: string, ano: number, clubeId: string, conc: Temporada["concorrentes"], jogos: number): Temporada["ausencia"] {
  const r = rngFrom(semente, "ausencia", ano, clubeId);
  if (!r.chance(0.45) || jogos < 16) return null;
  const top = principalConcorrente(conc);
  if (!top) return null;
  const de = r.int(5, jogos - 10);
  return { concorrenteId: top.id, nome: top.nome, de, ate: de + r.int(4, 7) };
}

/** Concorrentes disponíveis no jogo `i` (sem o ausente). */
function concorrentesNoJogo(t: Temporada, i: number) {
  const au = t.ausencia;
  return au && i >= au.de && i < au.ate ? t.concorrentes.filter((x) => x.id !== au.concorrenteId) : t.concorrentes;
}

const calCache = new Map<string, Calendario>();

/** Calendário da temporada (regenerado da semente; nunca gravado inteiro). */
export function calendarioDa(cat: Catalogo, semente: string, t: Temporada): Calendario {
  if (!t.participantes || t.participantes.length < 2) {
    t.participantes = participantes(cat, cat.liga(t.ligaId), t.clubeId, t.jogosTotal, semente, t.ano);
  }
  const chave = `${semente}|${t.ano}|${t.ligaId}|${t.jogosTotal}|${t.participantes.join(",")}`;
  let cal = calCache.get(chave);
  if (!cal) {
    cal = montarCalendario(cat, semente, t.ano, t.ligaId, t.participantes, t.jogosTotal);
    if (calCache.size > 64) calCache.clear();
    calCache.set(chave, cal);
  }
  return cal;
}

function poisson(r: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= r.next(); } while (p > L && k < 12);
  return k - 1;
}

/** Participação nos gols do time (por gol com o atleta em campo) e ações
 *  defensivas por 90 minutos. */
const TAXAS: Record<Posicao, { g: number; a: number; pd: number; d: number; i: number }> = {
  CA: { g: 0.3, a: 0.09, pd: 0.8, d: 0.3, i: 0.1 },
  PE: { g: 0.17, a: 0.15, pd: 1.3, d: 0.6, i: 0.2 },
  PD: { g: 0.17, a: 0.15, pd: 1.3, d: 0.6, i: 0.2 },
  MEI: { g: 0.11, a: 0.2, pd: 1.8, d: 0.9, i: 0.4 },
  VOLE: { g: 0.04, a: 0.07, pd: 0.8, d: 2.4, i: 1.3 },
  VOLD: { g: 0.04, a: 0.07, pd: 0.8, d: 2.4, i: 1.3 },
  LE: { g: 0.03, a: 0.08, pd: 0.7, d: 1.7, i: 1.1 },
  LD: { g: 0.03, a: 0.08, pd: 0.7, d: 1.7, i: 1.1 },
  ZAGE: { g: 0.04, a: 0.02, pd: 0.2, d: 2.1, i: 1.8 },
  ZAGD: { g: 0.04, a: 0.02, pd: 0.2, d: 2.1, i: 1.8 },
  GOL: { g: 0, a: 0, pd: 0, d: 0, i: 0 },
};

function jaJogouNaCarreira(c: Carreira, t: Temporada): boolean {
  return t.jogos > 0 || c.historico.some((h) => h.jogos > 0);
}

/** Simula a rodada `t.jogoAtual` e grava a partida do atleta. */
function simularJogo(cat: Catalogo, c: Carreira, t: Temporada) {
  const i = t.jogoAtual;
  const r = rngFrom(c.semente, "jogo", t.ano, i);
  const a = c.atleta;
  const cal = calendarioDa(cat, c.semente, t);
  const jogo = jogoDoClube(cat, c.semente, cal, i, t.clubeId);
  const vinhaDeLesao = !!t.lesao;
  if (t.lesao && i >= t.lesao.retorno) t.lesao = null;
  const f = forcaClube(cat, t.clubeId);
  const golsPro = jogo?.golsPro ?? 0, golsContra = jogo?.golsContra ?? 0;
  let minutos = 0;
  let situacao: Partida["situacao"] = "indisponivel";
  const p: Partida = {
    chave: `${t.ano}:${i + 1}`, rodada: i + 1, adversarioId: jogo?.adversarioId ?? "", adversarioNome: cat.clube(jogo?.adversarioId ?? "")?.nome ?? "",
    mandante: jogo?.mandante ?? true, golsPro, golsContra, situacao, minutos, nota: null,
    gols: 0, assistencias: 0, desarmes: 0, defesas: 0, semSofrer: false, marcos: [],
  };
  if (!t.lesao) {
    const plano = planoAtivo(c);
    const bonusPlano = plano && plano.tipo === "missaoTitular" && plano.clubeId === t.clubeId ? 3 : 0;
    const ef = nivelNaFuncao(a, t.funcao) + t.bonusAvaliacao + bonusPlano;
    const concJogo = concorrentesNoJogo(t, i);
    if (r.chance(chanceTitular(ef, concJogo))) {
      minutos = r.chance(0.25) ? r.int(62, 85) : 90;
      situacao = "titular";
      t.titularidades++;
    } else if (r.chance(chanceEntrar(ef, concJogo))) {
      minutos = r.int(10, 32);
      situacao = "entrou";
    } else {
      situacao = "banco";
    }
    p.situacao = situacao;
    if (minutos > 0) {
      const q = clamp(1 + (ef - f) / 30, 0.6, 1.5);
      const tx = TAXAS[t.funcao];
      const emCampo = minutos / 90;
      // Cada gol do time: o atleta em campo pode marcar ou dar a assistência.
      let g = 0, as = 0;
      for (let k = 0; k < golsPro; k++) {
        if (!r.chance(emCampo)) continue;
        const x = r.next();
        if (x < tx.g * q) g++;
        else if (x < (tx.g + tx.a) * q) as++;
      }
      const s = t.stats;
      s.gols += g; s.assistencias += as;
      const pd = poisson(r, tx.pd * emCampo * q);
      s.passesDecisivos += pd;
      const des = poisson(r, tx.d * emCampo * q);
      s.desarmes += des;
      const inter = poisson(r, tx.i * emCampo * q);
      s.interceptacoes += inter;
      p.gols = g; p.assistencias = as; p.desarmes = des; p.passes = pd; p.intercept = inter;
      let bonusNota = 0.6 * g + 0.35 * as;
      const saldo = golsPro - golsContra;
      bonusNota += (saldo > 0 ? 0.3 : saldo < 0 ? -0.3 : 0) * emCampo;
      if (t.funcao === "GOL") {
        const def = poisson(r, 2.6 * emCampo * (1 + golsContra * 0.15));
        s.defesas += def;
        p.defesas = def;
        if (situacao === "titular" && minutos === 90 && golsContra === 0) { s.semSofrer++; p.semSofrer = true; bonusNota += 0.5; }
        bonusNota -= golsContra * 0.15;
      }
      const nota = Math.round(clamp(6.3 + (ef - f) / 12 + bonusNota + r.normal(0, 0.6), 4, 10) * 10) / 10;
      p.nota = nota;
      p.minutos = minutos;
      if (!jaJogouNaCarreira(c, t)) p.marcos.push("estreia");
      if (vinhaDeLesao || t.partidas[t.partidas.length - 1]?.situacao === "indisponivel") p.marcos.push("retorno");
      if (g > 0 && saldo >= 0 && saldo <= 1) p.marcos.push("golDecisivo");
      if (nota >= 7.8) p.marcos.push("atuacao");
      if (g > 0 && classico(t.clubeId, p.adversarioId)) p.marcos.push("classico");
      // Torcida: regularidade, atuação e jogos marcantes.
      ajustarIdentificacao(c, t.clubeId, t.ano, 0.6 * emCampo + (nota - 6.3) * 0.6 + (p.marcos.includes("golDecisivo") ? 3 : 0) + (p.marcos.includes("classico") ? 5 : 0));
      const tc = torcidaDe(c, t.clubeId, t.ano);
      tc.jogos++;
      if (p.marcos.some((m) => m === "golDecisivo" || m === "classico" || m === "atuacao")) tc.marcantes++;
      t.notas += nota;
      t.jogos++;
      t.minutos += minutos;
      a.forma = clamp(a.forma * 0.8 + (nota - 6.5) * 0.25, -1, 1);
      a.confianca = clamp((a.confianca ?? 0.5) + (nota - 6.5) * 0.02, 0.05, 0.95);
      a.familiaridade[t.funcao] = clamp((a.familiaridade[t.funcao] ?? 0) + emCampo * 0.015, 0, 1);
      // Lesão: risco base e risco residual depois de voltar antes da hora.
      const risco = 0.011 + (t.riscoRecaida > 0 ? 0.07 : 0);
      if (t.riscoRecaida > 0) t.riscoRecaida--;
      if (r.chance(risco)) {
        const recaida = risco > 0.05;
        let dur = r.chance(0.32) ? r.int(4, 12) : r.int(1, 3);
        if (recaida) dur = Math.ceil(dur * 1.5) + 1;
        t.lesao = { inicio: i + 1, retorno: i + 1 + dur, liberacao: dur >= 4 ? i + 1 + Math.ceil(dur * 0.6) : null, recaida } satisfies Lesao;
        t.lesoes++;
        t.riscoRecaida = 0;
      }
    } else {
      a.forma = clamp(a.forma * 0.9, -1, 1);
      a.confianca = clamp((a.confianca ?? 0.5) - 0.004, 0.05, 0.95);
    }
  }
  // Reencontro: jogo no estádio do ex-clube (o calendário confirma o mando).
  const ex = c.torcida[p.adversarioId];
  if (!p.mandante && ex && ex.saida && p.adversarioId !== c.vinculo?.clubeId) {
    p.recepcao = recepcaoNoReencontro(ex);
    const txt = p.recepcao === "aplausos" ? "aplaudido" : p.recepcao === "vaias" ? "vaiado" : "recebido entre aplausos e vaias";
    manchete(c, t.ano, i + 1, t.clubeId, `${nomeExibicao(a)} é ${txt} na volta ao estádio do ${p.adversarioNome}.`, p.recepcao === "vaias" ? -1 : p.recepcao === "aplausos" ? 1 : 0);
  }
  t.minutosPorJogo.push(minutos);
  t.partidas.push(p);
  t.jogoAtual++;
}

/** Situação mostrada em "Sua temporada" (derivada, nunca gravada). */
export function situacao(c: Carreira, ate?: number): string {
  const t = c.temporada;
  if (!t) return "";
  const n = ate ?? t.minutosPorJogo.length;
  const ultimaPartida = t.partidas[Math.min(n, t.partidas.length) - 1];
  if (ate !== undefined ? ultimaPartida?.situacao === "indisponivel" : (t.lesao && t.jogoAtual < t.lesao.retorno)) return "Em recuperação";
  if (n === 0) return c.emprestimo ? "Emprestado" : t.papel === "Titular" ? "Titular previsto" : "Pré-temporada";
  const ult = t.minutosPorJogo.slice(0, n).slice(-8);
  const part = ult.reduce((s, m) => s + m, 0) / (Math.max(1, ult.length) * 90);
  if (part >= 0.75) return "Titular absoluto";
  if (part >= 0.5) return "Ganhando espaço";
  if (part >= 0.2) return "Disputando vaga";
  return "Sem espaço";
}

// ─────────────────────────────── eventos tipados ───────────────────────────────

type Ctx = { cat: Catalogo; c: Carreira; t: Temporada };
type Momento = "pre" | "checkpoint" | "posJogo" | "sempre";

type DefEvento = {
  id: Pendente["tipo"];
  prioridade: number;
  momento: Momento;
  novo?: boolean; // conta no limite de interrupções novas da temporada
  chave: (x: Ctx) => string;
  condicao: (x: Ctx) => boolean;
  criar: (x: Ctx) => Omit<Pendente, "tipo" | "chave" | "ano">;
  aplicar: (x: Ctx, opcao: string, p: Pendente) => string; // devolve o texto da consequência
};

const participacaoRecente = (t: Temporada, n = 8) => {
  const ult = t.minutosPorJogo.slice(-n);
  return ult.reduce((s, m) => s + m, 0) / (Math.max(1, ult.length) * 90);
};

/** Função relacionada onde o clube tem necessidade e o atleta adaptado
 *  disputaria a vaga. */
function funcaoComNecessidade({ cat, c, t }: Ctx): Posicao | null {
  for (const rel of RELACIONADAS[t.funcao]) {
    if (rel === t.funcao) continue;
    const conc = gerarConcorrentes(cat, c.semente, t.clubeId, rel, t.ano);
    const top = principalConcorrente(conc);
    const famFutura = Math.max(c.atleta.familiaridade[rel] ?? 0, 0.35);
    const efAdaptado = c.atleta.nivel - (1 - famFutura) * 9 + c.atleta.forma * 3;
    if (top && efAdaptado >= top.nivel - 2) return rel;
  }
  return null;
}

function exigenciaSelecao(c: Carreira): number {
  const nac = NAC[c.atleta.nacionalidade];
  return 79 - 9 * (1 - (nac?.tradicao ?? 0.5));
}

const OPCOES_ADAPTACAO = [
  { id: "aceitar", rotulo: "Aceitar a adaptação", detalhe: "Mais chances de jogar" },
  { id: "manter", rotulo: "Manter minha posição", detalhe: "Evolução na função atual" },
];

function aplicarAdaptacao({ cat, c, t }: Ctx, opcao: string, p: Pendente): string {
  const rel = p.contexto.funcao as Posicao;
  if (opcao === "aceitar") {
    c.atleta.familiaridade[rel] = Math.max(c.atleta.familiaridade[rel] ?? 0, 0.35);
    t.funcao = rel;
    t.concorrentes = gerarConcorrentes(cat, c.semente, t.clubeId, rel, t.ano);
    c.atleta.confianca = clamp((c.atleta.confianca ?? 0.5) - 0.05, 0.05, 0.95);
    const part = participacaoEsperada(nivelNaFuncao(c.atleta, rel), t.concorrentes);
    t.previsao = intervaloMinutos(part);
    t.papel = papelPorParticipacao(part);
    const pl = criarPlano(c, t, "adaptacao", rel, p.chave);
    return `Você passa a disputar a vaga de ${POS[rel].nome.toLowerCase()} (previsão de ${t.previsao[0]}–${t.previsao[1]}% dos minutos). Plano: ${pl.partidas} jogos com meta de ${pl.criterio.rotulo}. A familiaridade com a função cresce com os minutos.`;
  }
  t.bonusTreino += 0.06;
  return `Você segue como ${POS[t.funcao].nome.toLowerCase()}, com o treino concentrado na sua função.`;
}

const ultimaPartida = (t: Temporada) => t.partidas[t.partidas.length - 1];

function clubeNomeAtual(c: Carreira): string {
  return c.emprestimo?.clubeNome ?? c.vinculo?.clubeNome ?? "clube";
}

/** Revisão de papel: ajusta previsão e papel com o bônus de avaliação. */
function revisarPapel(c: Carreira, t: Temporada, delta: number) {
  t.bonusAvaliacao += delta;
  const part = participacaoEsperada(nivelNaFuncao(c.atleta, t.funcao) + t.bonusAvaliacao, t.concorrentes);
  t.previsao = intervaloMinutos(part);
  t.papel = papelPorParticipacao(part);
}

const OPCOES_REVISAO = [
  { id: "conversar", rotulo: "Conversar sobre o resultado", detalhe: "O técnico explica a decisão de papel" },
  { id: "seguir", rotulo: "Seguir o plano revisado", detalhe: "Nova janela de 4 jogos" },
];

/** Evidência do compromisso: os jogos desde o início da temporada. */
function evidenciaCompromisso(t: Temporada) {
  const js = t.partidas;
  const minutos = js.reduce((s, p) => s + p.minutos, 0);
  const jogados = js.filter((p) => p.minutos > 0);
  const media = jogados.length ? jogados.reduce((s, p) => s + (p.nota ?? 0), 0) / jogados.length : 0;
  const fora = js.filter((p) => p.situacao === "indisponivel").length;
  return { rodadas: js.length, jogos: jogados.length, minutos, part: js.length ? minutos / (90 * js.length) : 0, media, fora };
}

/** Eventos do PC-003: técnico (plano, oportunidade, devolutiva), diretoria
 *  (revisão prometida) e imprensa/torcida (clássico, arquibancada). Pendências
 *  contratuais e esportivas têm prioridade sobre repercussões de imprensa. */
const EVENTOS_PC003: DefEvento[] = [
  {
    id: "revisaoCompromisso", prioridade: 95, momento: "sempre",
    chave: ({ c, t }) => `revisaoCompromisso:${compromissoAtivo(c, t.clubeId, t.ano)?.id ?? "-"}`,
    condicao: ({ c, t }) => {
      const cp = compromissoAtivo(c, t.clubeId, t.ano);
      return !!cp && cp.rodadaRevisao !== null && t.jogoAtual + 1 >= cp.rodadaRevisao;
    },
    criar: ({ c, t }) => {
      const cp = compromissoAtivo(c, t.clubeId, t.ano)!;
      const ev = evidenciaCompromisso(t);
      const meta = (t.previsao[0] + t.previsao[1]) / 200;
      const estado = ev.fora * 2 >= ev.rodadas ? "encerrado" : ev.part >= meta || ev.media >= 6.8 ? "cumprido" : "naoCumprido";
      const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      const evidencia = `Até a rodada ${ev.rodadas}: ${ev.jogos} jogos, ${ev.minutos} min (${Math.round(ev.part * 100)}% dos minutos) e nota média ${ev.jogos ? fmt(ev.media) : "—"}${ev.fora ? `; ${ev.fora} jogos fora por lesão` : ""}.`;
      return { opcoes: OPCOES_REVISAO, contexto: { compromisso: cp.id, termos: cp.termos, evidencia, estado, meta: Math.round(meta * 100), revisao: true } };
    },
    aplicar: ({ c, t }, opcao, p) => {
      const cp = c.compromissos.find((x) => x.id === p.contexto.compromisso);
      if (!cp) return "";
      const estado = String(p.contexto.estado) as Compromisso["estado"];
      cp.estado = estado; cp.evidencia = String(p.contexto.evidencia);
      let txt: string;
      if (estado === "encerrado") { cp.motivo = "Lesão durante o período: amostra insuficiente."; txt = `${p.contexto.evidencia} A revisão fica sem efeito por causa da lesão, sem penalização.`; }
      else if (estado === "cumprido") { revisarPapel(c, t, 2); c.atleta.confianca = clamp(c.atleta.confianca + 0.08, 0.05, 0.95); txt = `${p.contexto.evidencia} Compromisso cumprido: a diretoria revê seu papel para ${t.papel.toLowerCase()} (previsão de ${t.previsao[0]}–${t.previsao[1]}%). A escalação segue com o técnico.`; }
      else { txt = `${p.contexto.evidencia} A meta era ${p.contexto.meta}% dos minutos ou nota 6,8; o papel continua como ${t.papel.toLowerCase()}.`; }
      if (opcao === "seguir" && estado !== "cumprido" && !c.planos.some((x) => x.ano === t.ano && x.tipo === "revisado")) { const pl = criarPlano(c, t, "revisado", t.funcao, p.chave); txt += ` Novo plano: ${pl.partidas} jogos com meta de ${pl.criterio.rotulo}.`; }
      if (opcao === "conversar") c.atleta.forma = clamp(c.atleta.forma + 0.1, -1, 1);
      return txt;
    },
  },
  {
    id: "reforco", prioridade: 85, momento: "pre",
    chave: ({ t }) => `reforco:${t.ano}:${t.clubeId}`,
    condicao: ({ t }) => !!t.reforco && t.jogoAtual === 0,
    criar: ({ t }) => {
      const r = t.concorrentes.find((x) => x.id.endsWith("-reforco"));
      return {
        opcoes: [
          { id: "disputar", rotulo: "Disputar espaço", detalhe: "Plano de 4 jogos contra o reforço" },
          { id: "segunda", rotulo: "Treinar segunda função", detalhe: "Familiaridade em função compatível" },
          { id: "emprestimo", rotulo: "Conversar sobre empréstimo", detalhe: "Interesse registrado para a janela" },
        ],
        contexto: { reforco: r?.nome ?? "um reforço", nivel: r?.nivel ?? 0, pergunta: `O clube contratou ${r?.nome ?? "um reforço"} (nível ${r?.nivel}) para a sua posição.` },
      };
    },
    aplicar: ({ c, t }, opcao, p) => {
      if (opcao === "disputar") { const pl = criarPlano(c, t, "reforco", t.funcao, p.chave); return `Você vai disputar a posição com ${p.contexto.reforco}. O técnico reavalia depois de ${pl.partidas} jogos elegíveis (meta: ${pl.criterio.rotulo}).`; }
      if (opcao === "segunda") {
        const rel = RELACIONADAS[t.funcao][0];
        if (rel) c.atleta.familiaridade[rel] = clamp((c.atleta.familiaridade[rel] ?? 0) + 0.15, 0, 1);
        t.bonusTreino += 0.04;
        return rel ? `Você treina também como ${POS[rel].nome.toLowerCase()}: a familiaridade com a função sobe e abre outra opção de escalação.` : "Você reforça o treino na sua função.";
      }
      c.interesseEmprestimo = true;
      return "Seu interesse em um empréstimo foi registrado para a janela. Oferta depende de vaga, orçamento e vínculo.";
    },
  },
  {
    id: "revisaoPlano", prioridade: 80, momento: "sempre",
    chave: ({ c }) => `revisaoPlano:${planoAtivo(c)?.id ?? "-"}`,
    condicao: ({ c, t }) => { const pl = planoAtivo(c); return !!pl && planoCompleto(t, pl); },
    criar: ({ c, t }) => {
      const pl = planoAtivo(c)!;
      const r = avaliarPlano(t, pl);
      const podeRevisar = !c.planos.some((x) => x.ano === t.ano && x.clubeId === t.clubeId && x.tipo === "revisado");
      const opcoes = r.estado === "amostraInsuficiente"
        ? [{ id: "encerrar", rotulo: "Encerrar o plano", detalhe: "Sem penalização" }, ...(podeRevisar ? [{ id: "seguir", rotulo: "Revisar o plano", detalhe: "Nova janela de 4 jogos" }] : [{ id: "conversar", rotulo: "Conversar sobre o resultado", detalhe: "O técnico explica a decisão" }])]
        : podeRevisar || r.estado === "atingido" ? OPCOES_REVISAO : [OPCOES_REVISAO[0], { id: "encerrar", rotulo: "Encerrar o plano", detalhe: "Volta à disputa normal" }];
      return { opcoes, contexto: { plano: pl.id, estado: r.estado, texto: r.texto, jogos: r.jogos, minutos: r.minutos, valor90: r.valor90, alvo: pl.criterio.alvo90, criterio: pl.criterio.rotulo, revisao: true } };
    },
    aplicar: ({ c, t }, opcao, p) => {
      const pl = c.planos.find((x) => x.id === p.contexto.plano);
      if (!pl) return "";
      const estado = String(p.contexto.estado) as Plano["estado"];
      pl.estado = estado;
      pl.resultado = { jogos: Number(p.contexto.jogos), minutos: Number(p.contexto.minutos), valor90: Number(p.contexto.valor90), texto: String(p.contexto.texto) };
      let txt = String(p.contexto.texto);
      const top = principalConcorrente(concorrentesNoJogo(t, t.jogoAtual));
      if (estado === "atingido") { revisarPapel(c, t, 2); c.atleta.confianca = clamp(c.atleta.confianca + 0.06, 0.05, 0.95); txt += ` Meta atingida: o técnico amplia seu papel para ${t.papel.toLowerCase()} (previsão de ${t.previsao[0]}–${t.previsao[1]}%).`; }
      else if (estado === "naoAtingido") { c.atleta.confianca = clamp(c.atleta.confianca - 0.02, 0.05, 0.95); txt += ` Meta não atingida: o papel continua como ${t.papel.toLowerCase()}${top ? `; ${top.nome} (concorrente simulado, nível ${top.nivel}) segue à frente` : ""}.`; }
      // (amostra insuficiente: o texto da devolutiva já diz "sem penalização")
      if (opcao === "seguir" && estado !== "atingido") { const novo = criarPlano(c, t, "revisado", pl.funcao, p.chave); txt += ` Novo plano: mais ${novo.partidas} jogos.`; }
      if (opcao === "conversar") c.atleta.forma = clamp(c.atleta.forma + 0.1, -1, 1);
      if (opcao === "encerrar") txt += " Plano encerrado.";
      return txt;
    },
  },
  {
    id: "vagaAberta", prioridade: 70, momento: "sempre",
    chave: ({ t }) => `vagaAberta:${t.ano}:${t.clubeId}`,
    condicao: ({ c, t }) => {
      const au = t.ausencia;
      if (!au || t.jogoAtual !== au.de || t.lesao) return false;
      const ausente = t.concorrentes.find((x) => x.id === au.concorrenteId);
      return !!ausente && nivelNaFuncao(c.atleta, t.funcao) < ausente.nivel;
    },
    criar: ({ t }) => {
      const au = t.ausencia!;
      const rel = RELACIONADAS[t.funcao][0];
      return {
        opcoes: [
          { id: "disputar", rotulo: "Disputar a posição de origem", detalhe: "Plano de 4 jogos na sua posição" },
          rel ? { id: "cobrir", rotulo: "Cobrir função compatível", detalhe: `Jogar ${POS[rel].funcao}` } : { id: "seguir", rotulo: "Seguir a rotina", detalhe: "Sem mudança de plano" },
        ],
        contexto: { ausente: au.nome, ate: au.ate, funcao: rel ?? null, pergunta: `${au.nome} está fora até a rodada ${au.ate}. A vaga está aberta.` },
      };
    },
    aplicar: ({ cat, c, t }, opcao, p) => {
      if (opcao === "disputar") {
        if (t.funcao !== c.atleta.posicao) { t.funcao = c.atleta.posicao; t.concorrentes = gerarConcorrentes(cat, c.semente, t.clubeId, t.funcao, t.ano); }
        const pl = criarPlano(c, t, "vagaAberta", t.funcao, p.chave);
        return `Você disputa a posição de ${POS[t.funcao].nome.toLowerCase()} enquanto ${p.contexto.ausente} está fora. Plano: ${pl.partidas} jogos, meta de ${pl.criterio.rotulo}. A escalação depende de disponibilidade.`;
      }
      if (opcao === "cobrir" && p.contexto.funcao) {
        const rel = p.contexto.funcao as Posicao;
        c.atleta.familiaridade[rel] = Math.max(c.atleta.familiaridade[rel] ?? 0, 0.35);
        t.funcao = rel; t.concorrentes = gerarConcorrentes(cat, c.semente, t.clubeId, rel, t.ano);
        const pl = criarPlano(c, t, "ajusteFuncao", rel, p.chave);
        return `Você passa a cobrir a função de ${POS[rel].nome.toLowerCase()}. Plano: ${pl.partidas} jogos, meta de ${pl.criterio.rotulo}.`;
      }
      return "Você segue a rotina de treino; o técnico decide a escalação jogo a jogo.";
    },
  },
  {
    id: "boasEntradas", prioridade: 60, momento: "posJogo",
    chave: ({ t }) => `boasEntradas:${t.ano}`,
    condicao: ({ c, t }) => {
      if (planoAtivo(c)) return false;
      const jog = t.partidas.filter((p) => p.minutos > 0).slice(-3);
      return jog.length === 3 && jog[2] === ultimaPartida(t) && jog.every((p) => p.situacao === "entrou" && (p.nota ?? 0) >= 6.7);
    },
    criar: ({ t }) => {
      const jog = t.partidas.filter((p) => p.minutos > 0).slice(-3);
      return {
        opcoes: [
          { id: "missao", rotulo: "Aceitar a missão da primeira titularidade", detalhe: "Depende de disponibilidade e escalação" },
          { id: "ajuste", rotulo: "Pedir ajuste de função", detalhe: "Função compatível com menos concorrência" },
        ],
        contexto: { pergunta: `Três boas entradas seguidas (notas ${jog.map((p) => String(p.nota).replace(".", ",")).join(", ")}). O técnico quer conversar.` },
      };
    },
    aplicar: ({ cat, c, t }, opcao, p) => {
      if (opcao === "missao") {
        const pl = criarPlano(c, t, "missaoTitular", t.funcao, p.chave);
        return `O técnico define a expectativa: nos próximos ${pl.partidas} jogos elegíveis, ${pl.criterio.rotulo} acima de ${pl.criterio.alvo90.toLocaleString("pt-BR")}. A titularidade depende de disponibilidade e escalação.`;
      }
      const rels = RELACIONADAS[t.funcao];
      let melhor: Posicao | null = null, menor = Infinity;
      for (const rel of rels) { const top = principalConcorrente(gerarConcorrentes(cat, c.semente, t.clubeId, rel, t.ano)); if (top && top.nivel < menor) { menor = top.nivel; melhor = rel; } }
      if (!melhor) return "Sem função compatível com menos concorrência; você segue na sua posição.";
      c.atleta.familiaridade[melhor] = Math.max(c.atleta.familiaridade[melhor] ?? 0, 0.35);
      t.funcao = melhor; t.concorrentes = gerarConcorrentes(cat, c.semente, t.clubeId, melhor, t.ano);
      const pl = criarPlano(c, t, "ajusteFuncao", melhor, p.chave);
      return `Ajuste aceito: você passa a disputar ${POS[melhor].nome.toLowerCase()} (titular simulado nível ${menor}). Plano: ${pl.partidas} jogos, meta de ${pl.criterio.rotulo}.`;
    },
  },
  {
    // Primeiro gol em clássico (rivalidade cadastrada e gol confirmado).
    id: "classico", prioridade: 27, momento: "posJogo", novo: true,
    chave: ({ t }) => { const p = ultimaPartida(t); return `classico:${t.clubeId}:${p?.adversarioId ?? "-"}`; },
    condicao: ({ t }) => !!ultimaPartida(t)?.marcos.includes("classico"),
    criar: ({ t }) => {
      const p = ultimaPartida(t)!;
      const nomeClassico = classico(t.clubeId, p.adversarioId) ?? "clássico";
      return {
        opcoes: [
          { id: "grupo", rotulo: "Valorizar o grupo", detalhe: "A torcida abraça o coletivo" },
          { id: "disputa", rotulo: "Falar da disputa por espaço", detalhe: "Mostra que quer a vaga" },
          { id: "ambicao", rotulo: "Assumir a ambição", detalhe: "Mais holofote, mais cobrança" },
        ],
        contexto: { partida: p.chave, rodada: p.rodada, adversario: p.adversarioNome, classico: nomeClassico, decisivo: p.marcos.includes("golDecisivo"),
          fato: `Seu primeiro gol no ${nomeClassico}: ${p.golsPro} × ${p.golsContra} contra o ${p.adversarioNome}, rodada ${p.rodada}.` },
      };
    },
    aplicar: ({ c, t }, opcao, p) => {
      const nome = nomeExibicao(c.atleta);
      const rod = Number(p.contexto.rodada);
      const frases: Record<string, [string, Declaracao["tipo"], number, number]> = {
        grupo: ["Gol do grupo inteiro. Clássico se ganha junto.", "grupo", 4, 1],
        disputa: ["Estou aqui para brigar por espaço todo jogo.", "disputa", 2, 1],
        ambicao: ["Nasci para jogos grandes.", "ambicao", 1, 3],
      };
      const [frase, tipo, ident, rep] = frases[opcao];
      ajustarIdentificacao(c, t.clubeId, t.ano, ident);
      c.atleta.reputacao = clamp(c.atleta.reputacao + rep, 0, 100); c.atleta.cobertura += 2;
      if (opcao === "ambicao") c.atleta.expectativa = clamp(c.atleta.expectativa + 1, 0, 3);
      declarar(c, { ano: t.ano, rodada: rod, clubeId: t.clubeId, tipo, texto: frase, origem: p.chave });
      manchete(c, t.ano, rod, t.clubeId, `${p.contexto.classico}: ${nome} marca e diz "${frase}"`, 1);
      return `Manchete: ${p.contexto.classico}: ${nome} marca e diz "${frase}" Identificação com a torcida +${ident}; reputação +${rep}.`;
    },
  },
  {
    // Sequência ruim e reação da arquibancada (amostra recente suficiente).
    id: "arquibancada", prioridade: 22, momento: "posJogo", novo: true,
    chave: ({ t }) => `arquibancada:${t.ano}:${t.clubeId}`,
    condicao: ({ t }) => {
      const jog = t.partidas.filter((p) => p.minutos > 0).slice(-5);
      if (jog.length < 5 || jog[4] !== ultimaPartida(t)) return false;
      const media = jog.reduce((s, p) => s + (p.nota ?? 0), 0) / 5;
      return media < 5.5 && jog.filter((p) => p.situacao === "titular").length >= 4;
    },
    criar: ({ t }) => {
      const jog = t.partidas.filter((p) => p.minutos > 0).slice(-5);
      const media = jog.reduce((s, p) => s + (p.nota ?? 0), 0) / 5;
      return {
        opcoes: [
          { id: "falar", rotulo: "Falar com a torcida", detalhe: "Assume a cobrança de frente" },
          { id: "reconhecer", rotulo: "Reconhecer a fase", detalhe: "Admite e promete trabalho" },
          { id: "vestiario", rotulo: "Seguir ao vestiário", detalhe: "Sem resposta à arquibancada" },
        ],
        contexto: { media: Math.round(media * 10) / 10, rodada: ultimaPartida(t)!.rodada, fato: `Média ${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} nos últimos 5 jogos. A arquibancada cobrou no fim da partida.` },
      };
    },
    aplicar: ({ c, t }, opcao, p) => {
      const nome = nomeExibicao(c.atleta);
      const rod = Number(p.contexto.rodada);
      if (opcao === "falar") { ajustarIdentificacao(c, t.clubeId, t.ano, 2); manchete(c, t.ano, rod, t.clubeId, `${nome} vai até a arquibancada e ouve a cobrança.`, 0); return "Você encarou a cobrança: identificação +2. Uma boa sequência pode recuperar a torcida."; }
      if (opcao === "reconhecer") { ajustarIdentificacao(c, t.clubeId, t.ano, 3); c.atleta.confianca = clamp(c.atleta.confianca + 0.03, 0.05, 0.95); declarar(c, { ano: t.ano, rodada: rod, clubeId: t.clubeId, tipo: "fase", texto: "Não estou bem, mas vou virar.", origem: p.chave }); manchete(c, t.ano, rod, t.clubeId, `${nome}: "Não estou bem, mas vou virar."`, 1); return "A torcida aceitou o reconhecimento: identificação +3."; }
      ajustarIdentificacao(c, t.clubeId, t.ano, -4); manchete(c, t.ano, rod, t.clubeId, `${nome} deixa o campo sem responder à torcida.`, -1);
      return "A saída sem resposta pegou mal: identificação −4.";
    },
  },
];

export const EVENTOS: readonly DefEvento[] = [
  {
    id: "recuperacao", prioridade: 100, momento: "sempre",
    chave: ({ t }) => `recuperacao:${t.ano}:${t.lesao?.inicio ?? -1}`,
    condicao: ({ t }) => !!t.lesao && t.lesao.liberacao === t.jogoAtual && t.jogoAtual < t.lesao.retorno && t.jogoAtual < t.jogosTotal,
    criar: ({ cat, c, t }) => {
      const cal = calendarioDa(cat, c.semente, t);
      const prox = jogoDoClube(cat, c.semente, cal, t.jogoAtual, t.clubeId);
      const rival = prox ? cat.clube(prox.adversarioId)?.nome ?? "o adversário" : "o adversário";
      return {
        opcoes: [
          { id: "esperar", rotulo: "Esperar a recuperação", detalhe: "Menos risco de recaída" },
          { id: "jogar", rotulo: "Tentar jogar o próximo jogo", detalhe: "Chance de jogar · risco maior" },
        ],
        contexto: { rival, rivalId: prox?.adversarioId ?? null, rodada: t.jogoAtual + 1, faltam: (t.lesao?.retorno ?? 0) - t.jogoAtual },
      };
    },
    aplicar: ({ t }, opcao, p) => {
      if (!t.lesao) return "";
      if (opcao === "jogar") {
        t.lesao = null;
        t.riscoRecaida = 5;
        return `Você foi liberado com risco residual. Nos próximos jogos a chance de recaída é maior.`;
      }
      return `Você segue em recuperação por mais ${p.contexto.faltam} jogos e volta sem risco extra.`;
    },
  },
  {
    // Plano do treinador: conversa de pré-temporada quando o clube tem
    // necessidade numa função compatível.
    id: "planoTreinador", prioridade: 90, momento: "pre",
    chave: ({ t }) => `planoTreinador:${t.ano}`,
    condicao: (x) => x.t.funcao !== "GOL" && x.t.jogoAtual === 0 && funcaoComNecessidade(x) !== null,
    criar: (x) => {
      const rel = funcaoComNecessidade(x)!;
      return { opcoes: OPCOES_ADAPTACAO, contexto: { funcao: rel, pergunta: `Aceita jogar ${POS[rel].funcao}?`, plano: true } };
    },
    aplicar: aplicarAdaptacao,
  },
  {
    // Disputa por vaga: participação recente abaixo do papel previsto.
    id: "perdaEspaco", prioridade: 30, momento: "checkpoint",
    chave: ({ t }) => `perdaEspaco:${t.ano}`,
    condicao: ({ t }) => t.jogoAtual >= 8 && !t.lesao && participacaoRecente(t) < Math.min(0.5, t.previsao[0] / 100 - 0.05),
    criar: ({ t }) => ({
      opcoes: [
        { id: "conversar", rotulo: "Pedir uma conversa" },
        { id: "treinar", rotulo: "Focar no treino" },
        { id: "emprestimo", rotulo: "Buscar um empréstimo" },
      ],
      contexto: { recente: Math.round(participacaoRecente(t) * 100), previsto: `${t.previsao[0]}–${t.previsao[1]}` },
    }),
    aplicar: ({ c, t }, opcao, pend) => {
      const top = principalConcorrente(t.concorrentes);
      if (opcao === "conversar") {
        c.atleta.forma = clamp(c.atleta.forma + 0.2, -1, 1);
        const ef = Math.round(nivelNaFuncao(c.atleta, t.funcao));
        const fam = c.atleta.familiaridade[t.funcao] ?? 0;
        if (fam < 0.7) return `O treinador explicou: você ainda está se adaptando à função de ${POS[t.funcao].nome.toLowerCase()}. A conversa deu confiança.`;
        return top ? `O treinador explicou: ${top.nome} (concorrente simulado, nível ${top.nivel}) está à frente; seu nível hoje é ${ef}. A conversa deu confiança.` : "O treinador pediu paciência.";
      }
      if (opcao === "treinar") {
        t.bonusAvaliacao += 2;
        t.bonusTreino += 0.12;
        const pl = criarPlano(c, t, "treino", t.funcao, pend.chave);
        return `Você intensificou os treinos. O técnico reavalia a disputa depois de ${pl.partidas} jogos elegíveis, pela meta de ${pl.criterio.rotulo} (${pl.criterio.alvo90.toLocaleString("pt-BR")}).`;
      }
      c.interesseEmprestimo = true;
      return "Seu interesse em sair por empréstimo foi registrado. Propostas só chegam na janela, se algum clube tiver vaga e orçamento.";
    },
  },
  {
    id: "adaptacao", prioridade: 20, momento: "checkpoint",
    chave: ({ t }) => `adaptacao:${t.ano}`,
    condicao: (x) => x.t.funcao !== "GOL" && x.t.jogoAtual >= 6 && !x.c.chavesUsadas.includes(`planoTreinador:${x.t.ano}`)
      && participacaoRecente(x.t) < 0.5 && !x.t.lesao && funcaoComNecessidade(x) !== null,
    criar: (x) => {
      const rel = funcaoComNecessidade(x)!;
      return { opcoes: OPCOES_ADAPTACAO, contexto: { funcao: rel, pergunta: `Aceita jogar ${POS[rel].funcao}?` } };
    },
    aplicar: aplicarAdaptacao,
  },
  {
    // Entrevista pós-jogo: atuação marcante confirmada no registro da partida.
    id: "entrevista", prioridade: 25, momento: "posJogo", novo: true,
    chave: ({ t }) => `entrevista:${t.ano}`,
    condicao: ({ t }) => {
      const p = ultimaPartida(t);
      return !!p && (p.marcos.includes("golDecisivo") || (p.nota ?? 0) >= 8);
    },
    criar: ({ t }) => {
      const p = ultimaPartida(t)!;
      const decisivo = p.marcos.includes("golDecisivo");
      const resultado = p.golsPro > p.golsContra ? "vitória" : p.golsPro < p.golsContra ? "derrota" : "empate";
      return {
        opcoes: [
          { id: "valorizar", rotulo: "Valorizar o time", detalhe: "O grupo em primeiro lugar" },
          { id: "ambicao", rotulo: "Assumir a ambição", detalhe: "Mais holofote, mais cobrança" },
          { id: "evitar", rotulo: "Evitar a questão", detalhe: "Sem repercussão" },
        ],
        contexto: {
          partida: p.chave, rodada: p.rodada, adversario: p.adversarioNome, adversarioId: p.adversarioId, golsPro: p.golsPro, golsContra: p.golsContra,
          decisivo, nota: p.nota, gols: p.gols,
          fato: decisivo ? `Seu gol garantiu ${resultado === "vitória" ? "a vitória" : "o empate"} por ${p.golsPro} × ${p.golsContra} contra o ${p.adversarioNome}.` : `Nota ${String(p.nota).replace(".", ",")} na ${resultado} por ${p.golsPro} × ${p.golsContra} contra o ${p.adversarioNome}.`,
        },
      };
    },
    aplicar: ({ c, t }, opcao, pend) => {
      const a = c.atleta;
      const nome = nomeExibicao(a);
      const rod = Number(pend.contexto.rodada) || null;
      if (opcao === "valorizar") {
        a.reputacao = clamp(a.reputacao + 1, 0, 100); a.cobertura += 1;
        a.confianca = clamp(a.confianca + 0.05, 0.05, 0.95);
        declarar(c, { ano: t.ano, rodada: rod, clubeId: t.clubeId, tipo: "grupo", texto: "O mérito é do grupo.", origem: pend.chave });
        manchete(c, t.ano, rod, t.clubeId, `${nome}: "O mérito é do grupo."`, 1);
        return "A fala repercutiu bem no vestiário: mais confiança do treinador e +1 de reputação.";
      }
      if (opcao === "ambicao") {
        a.reputacao = clamp(a.reputacao + 3, 0, 100); a.cobertura += 2; a.expectativa = clamp(a.expectativa + 1, 0, 3);
        declarar(c, { ano: t.ano, rodada: rod, clubeId: t.clubeId, tipo: "ambicao", texto: "Quero ser titular e brigar por mais.", origem: pend.chave });
        manchete(c, t.ano, rod, t.clubeId, `${nome} assume a ambição: "Quero ser titular e brigar por mais."`, 0);
        return "A frase virou manchete: +3 de reputação e mais cobrança. Uma temporada abaixo da previsão vai pesar no balanço.";
      }
      return "Você saiu sem polêmica. A atuação fica registrada, sem repercussão extra.";
    },
  },
  {
    // Rumor de saída: interesse concreto de outro clube, que vira proposta na
    // janela se ainda couber no orçamento dele.
    id: "rumor", prioridade: 15, momento: "checkpoint", novo: true,
    chave: ({ t }) => `rumor:${t.ano}`,
    condicao: ({ cat, c, t }) => t.jogoAtual >= Math.floor(t.jogosTotal * 0.6) && !c.emprestimo && interesseConcreto(cat, c) !== null,
    criar: ({ cat, c }) => {
      const id = interesseConcreto(cat, c)!;
      return {
        opcoes: [
          { id: "ficar", rotulo: "Declarar que quer ficar", detalhe: "Compromisso com o clube" },
          { id: "aberta", rotulo: "Manter a porta aberta", detalhe: "Sinal para o mercado" },
          { id: "evitar", rotulo: "Evitar o assunto", detalhe: "Sem compromisso" },
        ],
        contexto: { clubeId: id, clube: cat.clube(id)?.nome ?? id },
      };
    },
    aplicar: ({ c, t }, opcao, p) => {
      c.rumor = { clubeId: String(p.contexto.clubeId), clubeNome: String(p.contexto.clube), ano: t.ano, resposta: opcao as "ficar" | "aberta" | "evitar" };
      const nome = nomeExibicao(c.atleta);
      const tipo = opcao === "ficar" ? "permanencia" : opcao === "aberta" ? "portaAberta" : "evitar";
      const texto = opcao === "ficar" ? `Quero ficar no ${clubeNomeAtual(c)}.` : opcao === "aberta" ? "Nunca se sabe o dia de amanhã." : "Não falo sobre mercado.";
      declarar(c, { ano: t.ano, rodada: t.jogoAtual, clubeId: t.clubeId, tipo, texto, origem: p.chave });
      manchete(c, t.ano, t.jogoAtual, t.clubeId, `Sobre o interesse do ${p.contexto.clube}, ${nome}: "${texto}"`, 0);
      if (opcao === "ficar") return `Você disse que quer ficar. A reação depende do que acontecer na janela, se o ${p.contexto.clube} fizer proposta.`;
      if (opcao === "aberta") return `Você deixou a porta aberta. O ${p.contexto.clube} segue atento; a reação do clube depende da janela.`;
      return "Você evitou o assunto. O interesse continua, sem compromisso.";
    },
  },
  ...EVENTOS_PC003,
  {
    id: "convocacao", prioridade: 10, momento: "checkpoint",
    chave: () => "convocacao",
    condicao: ({ cat, c, t }) => {
      if (c.convocado || idadeEm(c.atleta, t.ano) < 18) return false;
      const part = t.jogoAtual >= 8 ? t.minutos / (90 * t.jogoAtual) : (c.historico[c.historico.length - 1]?.participacao ?? 0);
      return c.atleta.nivel + (c.atleta.reputacao ?? 0) / 25 >= exigenciaSelecao(c) && part >= 0.5 && nivelLiga(cat.liga(t.ligaId)) >= 60;
    },
    criar: ({ c, t }) => {
      const nac = NAC[c.atleta.nacionalidade];
      return {
        opcoes: [{ id: "ok", rotulo: "Continuar" }],
        contexto: { selecao: nac?.selecao ?? "Seleção", ano: t.ano, nivel: c.atleta.nivel, exigencia: Math.round(exigenciaSelecao(c)), reputacao: Math.round(c.atleta.reputacao ?? 0) },
      };
    },
    aplicar: ({ c, t }, _o, p) => {
      c.convocado = true;
      c.atleta.reputacao = clamp((c.atleta.reputacao ?? 0) + 5, 0, 100);
      c.marcos.push({ tipo: "convocacao", ano: t.ano, texto: `Primeira convocação · ${p.contexto.selecao}` });
      return "Convocação registrada na sua trajetória (+5 de reputação).";
    },
  },
];

const EVENTO = Object.fromEntries(EVENTOS.map((e) => [e.id, e])) as Record<Pendente["tipo"], DefEvento>;

function avaliarEventos(cat: Catalogo, c: Carreira, momentos: Momento[]): boolean {
  const t = c.temporada!;
  const pl = planoAtivo(c);
  if (pl && pl.tipo === "revisado" && planoCompleto(t, pl)) {
    const r = avaliarPlano(t, pl);
    if (r.estado === "amostraInsuficiente") { pl.estado = r.estado; pl.resultado = { jogos: r.jogos, minutos: r.minutos, valor90: r.valor90, texto: r.texto }; }
  }
  const x: Ctx = { cat, c, t };
  const cand = [...EVENTOS].sort((a, b) => b.prioridade - a.prioridade);
  for (const ev of cand) {
    if (!momentos.includes(ev.momento)) continue;
    if (ev.novo && t.interrupcoes >= CONFIG.interrupcoesPorTemporada) continue;
    const chave = ev.chave(x);
    if (c.chavesUsadas.includes(chave)) continue;
    if (!ev.condicao(x)) continue;
    c.pendente = { tipo: ev.id, chave, ano: t.ano, ...ev.criar(x) };
    if (ev.novo) t.interrupcoes++;
    return true;
  }
  return false;
}

const checkpoints = (t: Temporada) => [Math.floor(t.jogosTotal * 0.35), Math.floor(t.jogosTotal * 0.7)];

/** Avança até a próxima decisão ou até o balanço. Idempotente com pendência. */
export function avancar(cat: Catalogo, entrada: Carreira): Carreira {
  if (entrada.pendente || entrada.fase !== "temporada" || !entrada.temporada) return entrada;
  const c = clone(entrada);
  c.ultimaConsequencia = null;
  const t = c.temporada!;
  while (t.jogoAtual < t.jogosTotal) {
    const momentos: Momento[] = ["sempre"];
    if (t.jogoAtual === 0) momentos.push("pre");
    if (checkpoints(t).includes(t.jogoAtual)) momentos.push("checkpoint");
    if (avaliarEventos(cat, c, momentos)) return c;
    simularJogo(cat, c, t);
    if (avaliarEventos(cat, c, ["posJogo"])) return c;
  }
  encerrarTemporada(cat, c);
  return c;
}

/** Ponteiro da reprodução (a tela persiste até onde já mostrou). */
export function marcarExibidos(entrada: Carreira, n: number): Carreira {
  const t = entrada.temporada;
  if (!t) return entrada;
  const alvo = clamp(Math.round(n), t.exibidos, t.partidas.length);
  if (alvo === t.exibidos) return entrada;
  return { ...entrada, temporada: { ...t, exibidos: alvo } };
}

export function reproducaoPendente(c: Carreira): boolean {
  const t = c.temporada;
  return !!t && t.exibidos < t.partidas.length;
}

// ─────────────────────────────── fim de temporada ───────────────────────────────

function encerrarTemporada(cat: Catalogo, c: Carreira) {
  const t = c.temporada!;
  const a = c.atleta;
  const clube = cat.clube(t.clubeId);
  const liga = cat.liga(t.ligaId);
  const idade = idadeEm(a, t.ano);
  const part = t.minutos / (90 * t.jogosTotal);
  const media = t.jogos ? Math.round((t.notas / t.jogos) * 10) / 10 : 0;
  const qualidade = t.jogos ? clamp((media - 5.8) / 1.2, 0.6, 1.3) : 1;
  // PC-003: nível muda com idade, potencial, treino e qualidade da
  // participação; a liga calibra a exigência, sem ganho por prestígio (saiu o
  // "ambiente de treino" da PC-002).
  evoluir(a, idade, clamp(part * qualidade, 0, 1), t.bonusTreino, c.semente, t.ano);
  // Classificação e campanha da mesma fonte dos placares.
  const cal = calendarioDa(cat, c.semente, t);
  const tabela = classificacao(cat, c.semente, cal, t.jogosTotal);
  const linha = tabela.find((l) => l.clubeId === t.clubeId);
  const campanha: Campanha | null = linha ? { v: linha.v, e: linha.e, d: linha.d, gp: linha.gp, gc: linha.gc, pts: linha.pts } : null;
  const posicaoLiga = !t.simplificada && linha ? tabela.indexOf(linha) + 1 : null;
  const titulo = posicaoLiga === 1;
  const anterior = c.historico[c.historico.length - 1];
  const top = principalConcorrente(t.concorrentes);
  let resultado: RegistroTemporada["resultado"];
  if (t.lesoes > 0 && t.jogos < t.jogosTotal * 0.4 && t.minutosPorJogo.filter((m) => m === 0).length > t.jogosTotal * 0.3 && part < t.previsao[0] / 100) resultado = "lesao";
  else if (part * 100 >= t.previsao[1] || (anterior && part - anterior.participacao >= 0.15)) resultado = "ganhou";
  else if (part * 100 < t.previsao[0] - 5) resultado = "perdeu";
  else resultado = "manteve";
  const pct = Math.round(part * 100);
  const vagaG = rodadaDaVaga(t.partidas, "ganhou");
  const vagaP = rodadaDaVaga(t.partidas, "perdeu");
  const primeiraLesao = t.partidas.find((p) => p.situacao === "indisponivel");
  const fora = t.partidas.filter((p) => p.situacao === "indisponivel").length;
  const fato = resultado === "ganhou"
    ? (vagaG ? `Você ganhou a vaga na rodada ${vagaG} e terminou com ${pct}% dos minutos (previsão: ${t.previsao[0]}–${t.previsao[1]}%).`
      : top ? `Você superou ${top.nome} (concorrente simulado, nível ${top.nivel}) e jogou ${pct}% dos minutos; a previsão era ${t.previsao[0]}–${t.previsao[1]}%.` : `Você jogou ${pct}% dos minutos.`)
    : resultado === "perdeu"
      ? (vagaP ? `Você perdeu a vaga na rodada ${vagaP} e terminou com ${pct}% dos minutos, abaixo da previsão de ${t.previsao[0]}–${t.previsao[1]}%.`
        : `${top ? `${top.nome} (concorrente simulado, nível ${top.nivel}) ficou com a vaga` : "A concorrência ficou com a vaga"}: você jogou ${pct}% dos minutos, abaixo da previsão de ${t.previsao[0]}–${t.previsao[1]}%.`)
      : resultado === "lesao"
        ? (primeiraLesao ? `Uma lesão na rodada ${primeiraLesao.rodada} tirou você de ${fora} jogos.` : `As lesões tiraram você de ${t.minutosPorJogo.filter((m) => m === 0).length} jogos.`)
        : `Média ${media.toLocaleString("pt-BR")} em ${t.jogos} jogos, dentro da previsão de ${t.previsao[0]}–${t.previsao[1]}% dos minutos.`;
  // Reputação: efeito lento dos feitos, da competição e da cobertura.
  const m = metricaPrincipal(a.posicao);
  const repAntes = a.reputacao ?? 0;
  // Reputação: feitos sustentados, contexto competitivo e exposição (jogar
  // numa liga mais vista dá visibilidade, mesmo com poucos minutos).
  const exposicao = t.jogos > 0 ? (nivelLiga(liga) / 70) * 0.8 : 0;
  let rep = repAntes * 0.96 + part * 3 * (nivelLiga(liga) / 70) + (t.jogos ? (media - 6.5) * 2 * part : 0)
    + t.stats.gols * 0.12 + t.stats.assistencias * 0.08 + (titulo ? 4 : 0) + exposicao + Math.min(a.cobertura ?? 0, 6) * 0.1;
  if ((a.expectativa ?? 0) > 0 && resultado === "perdeu") rep -= a.expectativa * 1.5;
  a.reputacao = clamp(Math.round(rep * 10) / 10, 0, 100);
  a.expectativa = 0;
  const reg: RegistroTemporada = {
    ano: t.ano, idade, clubeId: t.clubeId, clubeNome: clube?.nome ?? c.emprestimo?.clubeNome ?? c.vinculo?.clubeNome ?? "",
    ligaId: t.ligaId, ligaNome: liga?.nome ?? "", pais: liga?.pais ?? "",
    emprestimo: !!c.emprestimo, origemNome: c.emprestimo?.origemNome ?? null, funcao: t.funcao,
    papel: papelPorParticipacao(part), previsao: t.previsao, jogos: t.jogos, jogosTotal: t.jogosTotal, minutos: t.minutos,
    participacao: Math.round(part * 1000) / 1000, stats: t.stats, media, nivelInicio: t.nivelInicio, nivelFim: a.nivel,
    posicaoLiga, titulo, simplificada: t.simplificada, lesoes: t.lesoes, fato, resultado,
    origem: t.origemParcial > 0 ? "resumo" : "jogo-a-jogo", titularidades: t.titularidades, partidas: t.partidas,
    campanha, participantesTotal: t.participantes.length, reputacaoDelta: Math.round((a.reputacao - repAntes) * 10) / 10,
  };
  void m;
  // Bônus por jogos: pagamento único quando a condição é cumprida.
  const bonus = c.vinculo?.bonus;
  if (bonus && bonus.ano === t.ano && !bonus.pago && !c.emprestimo && c.vinculo?.clubeId === t.clubeId) {
    const ok = t.jogos >= bonus.jogos;
    bonus.pago = ok;
    reg.bonusPago = ok ? { valor: bonus.valor, moeda: bonus.moeda } : null;
    const cp = c.compromissos.find((x) => x.tipo === "bonus" && x.ano === t.ano && x.clubeId === t.clubeId && x.estado === "ativo");
    if (cp) { cp.estado = ok ? "cumprido" : "naoCumprido"; cp.evidencia = `${t.jogos} jogos de ${bonus.jogos} exigidos.`; }
  }
  // Compromissos e planos que a temporada encerrou sem revisão.
  encerrarCompromissos(c, (x) => x.ano === t.ano && x.tipo === "revisaoPapel", "A temporada terminou antes da rodada de revisão.");
  for (const pl of c.planos) if (pl.estado === "ativo" && pl.ano === t.ano) { pl.estado = "encerrado"; pl.resultado = { jogos: 0, minutos: 0, valor90: 0, texto: "A temporada terminou antes do fim da janela." }; }
  // Torcida: tempo de casa.
  const tc = torcidaDe(c, t.clubeId, t.ano);
  tc.temporadas++;
  ajustarIdentificacao(c, t.clubeId, t.ano, 2 + 3 * part);
  reg.identificacao = c.torcida[t.clubeId].identificacao;
  reg.salario = c.emprestimo ? null : c.vinculo?.salario ?? null;
  reg.manchetes = c.manchetes.filter((x) => x.ano === t.ano).map((x) => x.texto).slice(-3);
  c.historico.push(reg);
  if (titulo) c.marcos.push({ tipo: "titulo", ano: t.ano, texto: `Campeão · ${liga?.nome ?? ""}`, clubeId: t.clubeId });
  // Empréstimo termina: o atleta volta ao clube de origem.
  if (c.emprestimo && c.emprestimo.fim <= t.ano) {
    registrarSaida(c, c.emprestimo.clubeId);
    c.marcos.push({ tipo: "retorno", ano: t.ano, texto: `Fim do empréstimo · volta ao ${c.emprestimo.origemNome}`, clubeId: c.emprestimo.origemId });
    c.emprestimo = null;
  }
  c.interesseEmprestimo = c.interesseEmprestimo && part < 0.5;
  c.fase = "balanco";
  avaliarConvocacaoFinal(cat, c);
}

function avaliarConvocacaoFinal(cat: Catalogo, c: Carreira) {
  const t = c.temporada!;
  const x: Ctx = { cat, c, t };
  const ev = EVENTO.convocacao;
  const chave = ev.chave(x);
  if (!c.chavesUsadas.includes(chave) && ev.condicao(x)) c.pendente = { tipo: "convocacao", chave, ano: t.ano, ...ev.criar(x) };
}

/** Totais das partidas já mostradas (ou de todas). */
export function resumoTemporada(c: Carreira, ate?: number) {
  const t = c.temporada;
  if (!t) return null;
  const m = metricaPrincipal(c.atleta.posicao);
  const total = { jogos: t.jogos, minutos: t.minutos, metrica: t.stats[m.chave], rotulo: m.rotulo };
  if (ate === undefined || ate >= t.partidas.length) return total;
  // Totais até a partida `ate`: o total menos as partidas ainda não mostradas.
  const val = (p: Partida) => (m.chave === "gols" ? p.gols : m.chave === "assistencias" ? p.assistencias : m.chave === "desarmes" ? p.desarmes : p.semSofrer ? 1 : 0);
  const resto = t.partidas.slice(Math.max(0, ate));
  return {
    jogos: total.jogos - resto.filter((p) => p.minutos > 0).length,
    minutos: total.minutos - resto.reduce((s, p) => s + p.minutos, 0),
    metrica: total.metrica - resto.reduce((s, p) => s + val(p), 0), rotulo: m.rotulo,
  };
}

/** Tabela da temporada corrente até a rodada `ate` (mesma fonte). */
export function tabelaDaTemporada(cat: Catalogo, c: Carreira, ate?: number) {
  const t = c.temporada;
  if (!t) return [];
  return classificacao(cat, c.semente, calendarioDa(cat, c.semente, t), ate ?? t.jogoAtual);
}

// ─────────────────────────── janela e aposentadoria ───────────────────────────

/** Depois do balanço: abre a janela ou pergunta "Mais uma temporada?". */
export function abrirJanela(cat: Catalogo, entrada: Carreira): Carreira {
  if (entrada.fase !== "balanco" || entrada.pendente) return entrada;
  const c = clone(entrada);
  const ofertas = gerarOfertas(cat, c);
  const idade = idadeEm(c.atleta, c.ano);
  const restante = c.vinculo ? c.vinculo.fim - c.ano : 0;
  if (idade >= CONFIG.idadeAposentadoriaVoluntaria) {
    const caminho = idade < CONFIG.idadeLimite && (restante >= 1 || ofertas.length > 0);
    c.fase = "aposentadoria";
    c.pendente = {
      tipo: "aposentadoria", chave: `aposentadoria:${c.ano}`, ano: c.ano,
      opcoes: [
        ...(caminho ? [{ id: "continuar", rotulo: "Jogar mais um ano" }] : []),
        { id: "encerrar", rotulo: "Encerrar carreira" },
      ],
      contexto: { contratoTermina: restante <= 0, idade },
      ofertas,
    };
    return c;
  }
  criarJanela(c, ofertas);
  return c;
}

function criarJanela(c: Carreira, ofertas: Oferta[]) {
  const restante = c.vinculo ? c.vinculo.fim - c.ano : 0;
  const ult = c.historico[c.historico.length - 1];
  const voltaDeEmprestimo = !!ult?.emprestimo;
  c.fase = "janela";
  c.pendente = {
    tipo: "janela", chave: `janela:${c.ano}`, ano: c.ano,
    opcoes: [
      ...ofertas.map((o) => ({ id: o.id, rotulo: o.clubeNome })),
      ...(restante >= 1 ? [{ id: "ficar", rotulo: voltaDeEmprestimo ? `Voltar ao ${c.vinculo!.clubeNome}` : "Ficar no clube" }] : []),
    ],
    contexto: { restante, voltaDeEmprestimo, origem: c.vinculo?.clubeNome ?? null },
    ofertas,
  };
}

/** Compromissos que nascem dos termos aceitos (revisão de papel, bônus,
 *  empréstimo autorizado), ligados à decisão que os originou. */
function registrarCompromissos(c: Carreira, o: Oferta, origem: string): string {
  const anoNovo = c.ano + 1;
  const extras: string[] = [];
  if (o.revisaoRodada) {
    c.compromissos.push({ id: `${origem}:revisao`, clubeId: o.clubeId, clubeNome: o.clubeNome, origem, tipo: "revisaoPapel",
      termos: `Plano de rotação com revisão do papel na rodada ${o.revisaoRodada} de ${anoNovo}.`, ano: anoNovo, rodadaRevisao: o.revisaoRodada, estado: "ativo", evidencia: null, motivo: null });
    extras.push(`Revisão do papel na rodada ${o.revisaoRodada}.`);
  }
  if (o.bonus) {
    c.compromissos.push({ id: `${origem}:bonus`, clubeId: o.clubeId, clubeNome: o.clubeNome, origem, tipo: "bonus",
      termos: `Bônus único de ${formatarDinheiro(o.bonus, "")} com ${o.bonus.jogos} jogos em ${anoNovo}.`, ano: anoNovo, rodadaRevisao: null, estado: "ativo", evidencia: null, motivo: null });
    extras.push(`Bônus de ${formatarDinheiro(o.bonus, "")} com ${o.bonus.jogos} jogos.`);
  }
  if (o.emprestimoAutorizado) {
    c.interesseEmprestimo = true;
    c.compromissos.push({ id: `${origem}:emprestimo`, clubeId: o.clubeId, clubeNome: o.clubeNome, origem, tipo: "emprestimoAutorizado",
      termos: "Procura de empréstimo autorizada pela diretoria.", ano: anoNovo, rodadaRevisao: null, estado: "ativo", evidencia: null, motivo: null });
    extras.push("Procura de empréstimo autorizada.");
  }
  return extras.length ? ` ${extras.join(" ")}` : "";
}

/** Saída definitiva de um clube: a torcida lembra da passagem e da forma de
 *  sair (declarações da mesma janela pesam). */
function registrarSaida(c: Carreira, clubeId: string) {
  const tc = c.torcida[clubeId];
  if (!tc) return;
  const quebrou = c.declaracoes.some((d) => d.clubeId === clubeId && d.ano === c.ano && d.tipo === "permanencia");
  tc.saida = quebrou ? "ruim" : tc.identificacao >= 50 && tc.temporadas >= 2 ? "boa" : "neutra";
}

function aceitarOferta(c: Carreira, o: Oferta, origem: string) {
  const anoNovo = c.ano + 1;
  const bonusVinculo = o.bonus ? { ...o.bonus, ano: anoNovo, pago: false } : null;
  if ((o as { manterVinculo?: boolean }).manterVinculo && c.vinculo) {
    c.vinculo = { ...c.vinculo, salario: o.salario ?? c.vinculo.salario ?? null, bonus: bonusVinculo ?? c.vinculo.bonus ?? null };
    return `Você segue no ${c.vinculo.clubeNome}, com os termos negociados.${registrarCompromissos(c, o, origem)}`;
  }
  if (o.tipo === "renovacao" && c.vinculo) {
    c.vinculo = { ...c.vinculo, fim: c.ano + o.duracao, papel: o.papel, previsao: o.previsao, salario: o.salario ?? c.vinculo.salario ?? null, bonus: bonusVinculo };
    return `Renovação assinada até ${c.vinculo.fim}.${registrarCompromissos(c, o, origem)}`;
  }
  if (o.tipo === "emprestimo" && c.vinculo) {
    c.emprestimo = {
      clubeId: o.clubeId, clubeNome: o.clubeNome, origemId: c.vinculo.clubeId, origemNome: c.vinculo.clubeNome,
      inicio: anoNovo, fim: anoNovo, salarioDestino: o.salarioDestino ?? 1, retorno: true, papel: o.papel, previsao: o.previsao,
    };
    c.marcos.push({ tipo: "emprestimo", ano: anoNovo, texto: `Emprestado ao ${o.clubeNome}`, clubeId: o.clubeId });
    encerrarCompromissos(c, (x) => x.tipo === "emprestimoAutorizado", "Empréstimo fechado.");
    return `Empréstimo ao ${o.clubeNome} por uma temporada. Seu vínculo com o ${c.vinculo.clubeNome} continua.${registrarCompromissos(c, { ...o, emprestimoAutorizado: false }, origem)}`;
  }
  if (c.vinculo) registrarSaida(c, c.vinculo.clubeId);
  c.vinculo = { clubeId: o.clubeId, clubeNome: o.clubeNome, inicio: anoNovo, fim: c.ano + o.duracao, papel: o.papel, previsao: o.previsao, salario: o.salario ?? null, bonus: bonusVinculo };
  c.emprestimo = null;
  c.interesseEmprestimo = false;
  c.marcos.push({ tipo: "transferencia", ano: anoNovo, texto: `${o.tipo === "compra" ? "Comprado pelo" : "Transferência para o"} ${o.clubeNome}`, clubeId: o.clubeId });
  return `Contrato com o ${o.clubeNome} até ${c.vinculo.fim}.${registrarCompromissos(c, o, origem)}`;
}

/** Reação ao rumor conforme o desfecho real da janela. */
function reacaoAoRumor(c: Carreira, foiPara: string | null): string {
  const r = c.rumor;
  c.rumor = null;
  if (!r || r.ano !== c.ano || !r.resposta) return "";
  const a = c.atleta;
  const foiParaRumor = foiPara === r.clubeId;
  if (r.resposta === "ficar") {
    if (foiParaRumor) { a.reputacao = clamp(a.reputacao - 2, 0, 100); return ` Você tinha dito que queria ficar; a ida ao ${r.clubeNome} repercutiu mal (−2 de reputação).`; }
    if (foiPara !== null) { a.reputacao = clamp(a.reputacao - 1, 0, 100); return ` Você tinha dito que queria ficar; a saída para outro clube repercutiu mal (−1 de reputação).`; }
    if (foiPara === null) { a.confianca = clamp(a.confianca + 0.1, 0.05, 0.95); return " O clube valorizou sua palavra: mais confiança do treinador."; }
    return "";
  }
  if (r.resposta === "aberta") {
    if (foiParaRumor) { a.reputacao = clamp(a.reputacao + 1, 0, 100); return ` A saída para o ${r.clubeNome} foi coerente com o que você disse (+1 de reputação).`; }
    if (foiPara === null) { a.confianca = clamp(a.confianca - 0.05, 0.05, 0.95); return " Ficar depois de deixar a porta aberta esfriou a relação com o treinador."; }
  }
  return "";
}

// ─────────────────────────────────── decisões ───────────────────────────────────

/** Negocia um caminho da janela (uma vez por proposta). A resposta fica na
 *  pendência; o vínculo só muda quando o jogador confirma uma proposta. */
export function negociar(cat: Catalogo, entrada: Carreira, caminhoId: string, pedido: Pedido): Carreira {
  if (entrada.pendente?.tipo !== "janela" || entrada.pendente.negociacoes?.[caminhoId]) return entrada;
  const c = clone(entrada);
  return aplicarNegociacao(cat, c, caminhoId, pedido) ? c : entrada;
}

/** Grava a resposta da decisão pendente e seus efeitos uma única vez. */
export function decidir(cat: Catalogo, entrada: Carreira, opcao: string): Carreira {
  const p = entrada.pendente;
  if (!p || !p.opcoes.some((o) => o.id === opcao)) return entrada;
  const c = clone(entrada);
  const pend = c.pendente!;
  c.pendente = null;
  if (!c.chavesUsadas.includes(pend.chave)) c.chavesUsadas.push(pend.chave);
  let consequencia = "";
  if (pend.tipo === "janela") {
    // Termos negociados (`#neg`) ou proposta original; "ficar" mantém o vínculo.
    const o = opcao.endsWith("#neg") ? pend.negociacoes?.[opcao.slice(0, -4)]?.termos ?? undefined : pend.ofertas?.find((x) => x.id === opcao);
    const clubeAntes = c.vinculo?.clubeId ?? null;
    consequencia = o ? aceitarOferta(c, o, pend.chave) : (pend.contexto.voltaDeEmprestimo ? `Você volta ao ${c.vinculo?.clubeNome}.` : `Você segue no ${c.vinculo?.clubeNome}.`);
    const ficou = !o || o.tipo === "renovacao" || !!(o as { manterVinculo?: boolean }).manterVinculo || o.clubeId === clubeAntes;
    const destino = ficou || o!.tipo === "emprestimo" ? null : o!.clubeId;
    consequencia += reacaoAoRumor(c, o && o.tipo === "emprestimo" ? null : destino);
    // Declaração de permanência reaparece no desfecho da mesma janela.
    if (destino) {
      const d = c.declaracoes.find((x) => x.tipo === "permanencia" && x.ano === c.ano && !x.reapareceu);
      if (d) {
        d.reapareceu = true;
        manchete(c, c.ano, null, destino, `Em ${d.ano}, ${nomeExibicao(c.atleta)} disse: "${d.texto}" Agora assina com o ${o!.clubeNome}.`, -1);
        consequencia += ` A imprensa lembrou sua frase: "${d.texto}"`;
      }
    }
    iniciarTemporada(cat, c, c.ano + 1);
  } else if (pend.tipo === "aposentadoria") {
    if (opcao === "encerrar") {
      c.fase = "encerrada";
      c.marcos.push({ tipo: "aposentadoria", ano: c.ano, texto: `Fim da carreira aos ${idadeEm(c.atleta, c.ano)} anos` });
      consequencia = "Carreira encerrada.";
    } else {
      criarJanela(c, pend.ofertas ?? []);
      consequencia = "Mais uma temporada pela frente.";
    }
  } else {
    const t = c.temporada!;
    consequencia = EVENTO[pend.tipo].aplicar({ cat, c, t }, opcao, pend);
  }
  const d: Decisao = { chave: pend.chave, tipo: pend.tipo, opcao, ano: pend.ano, consequencia };
  c.decisoes.push(d);
  c.ultimaConsequencia = consequencia;
  return c;
}

// ─────────────────────────────────── consultas ───────────────────────────────────

export function idadeAtual(c: Carreira): number {
  return idadeEm(c.atleta, c.ano);
}

export function totais(c: Carreira) {
  const m = metricaPrincipal(c.atleta.posicao);
  const regs = c.historico;
  return {
    jogos: regs.reduce((s, r) => s + r.jogos, 0),
    minutos: regs.reduce((s, r) => s + r.minutos, 0),
    metrica: regs.reduce((s, r) => s + r.stats[m.chave], 0),
    rotulo: m.rotulo,
    gols: regs.reduce((s, r) => s + r.stats.gols, 0),
    titulos: regs.filter((r) => r.titulo).length,
    temporadas: regs.length,
  };
}

/** Passagens por clube (temporadas consecutivas no mesmo clube). */
export function passagens(c: Carreira) {
  const out: Array<{ clubeId: string; clubeNome: string; inicio: number; fim: number; emprestimo: boolean; temporadas: RegistroTemporada[] }> = [];
  for (const r of c.historico) {
    const ult = out[out.length - 1];
    if (ult && ult.clubeId === r.clubeId && ult.emprestimo === r.emprestimo) { ult.fim = r.ano; ult.temporadas.push(r); }
    else out.push({ clubeId: r.clubeId, clubeNome: r.clubeNome, inicio: r.ano, fim: r.ano, emprestimo: r.emprestimo, temporadas: [r] });
  }
  return out;
}

export { nomeExibicao, type Atleta };
