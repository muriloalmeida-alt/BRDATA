// Orquestração da carreira (PC-001). API pura: cada função recebe o save e
// devolve um save novo (nunca muta a entrada). Determinística por semente.
//
// Loop: contrato → temporada (avança jogo a jogo até uma decisão ou o fim)
// → balanço → janela (ou "Mais uma temporada?") → próxima temporada …
// → encerrada.
import { criarAtleta, evoluir, nivelNaFuncao, NAC, nomeExibicao, type Atleta } from "./atleta.ts";
import { forcaClube, jogosDaTemporada, nivelLiga, type Catalogo } from "./catalogo.ts";
import { chanceEntrar, chanceTitular, gerarConcorrentes, intervaloMinutos, papelPorParticipacao, participacaoEsperada, principalConcorrente } from "./elenco.ts";
import { SCHEMA_VERSAO, statsVazias, type Carreira, type Decisao, type Lesao, type Oferta, type Pendente, type RegistroTemporada, type Temporada } from "./estado.ts";
import { gerarOfertas, idadeEm, projetarPapel } from "./mercado.ts";
import { metricaPrincipal, POS, RELACIONADAS, type Posicao } from "./posicoes.ts";
import { clamp, rngFrom, type Rng } from "./rng.ts";

export const CONFIG = {
  anoInicial: 2027,
  idadeAposentadoriaVoluntaria: 33, // a partir daqui a janela pergunta "Mais uma temporada?"
  idadeLimite: 40,
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
  // Titular (clube abaixo do nível), Rotação (parelho), Promessa (clube forte,
  // em qualquer país do catálogo).
  const ids = [alvo(18, cat.clubes), alvo(3, base), alvo(-6, base)].filter(Boolean) as string[];
  return [...new Set(ids)];
}

export function assinarPrimeiroContrato(cat: Catalogo, entrada: Carreira, clubeId: string): Carreira {
  const c = clone(entrada);
  if (c.fase !== "contrato" || !cat.clube(clubeId)) return entrada;
  const of = propostaInicial(cat, c, clubeId);
  c.vinculo = { clubeId, clubeNome: of.clubeNome, inicio: c.ano, fim: c.ano + of.duracao - 1, papel: of.papel, previsao: of.previsao };
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
  const funcao: Posicao = anterior && anterior.clubeId === clubeId ? anterior.funcao : c.atleta.posicao;
  const conc = gerarConcorrentes(cat, c.semente, clubeId, funcao, ano);
  const part = participacaoEsperada(nivelNaFuncao(c.atleta, funcao), conc);
  const { jogos, simplificada } = jogosDaTemporada(liga);
  c.ano = ano;
  c.fase = "temporada";
  c.temporada = {
    ano, clubeId, ligaId: clube?.ligaId ?? "", funcao, jogosTotal: jogos, simplificada, jogoAtual: 0,
    jogos: 0, titularidades: 0, minutos: 0, stats: statsVazias(), notas: 0, minutosPorJogo: [],
    concorrentes: conc, previsao: intervaloMinutos(part), papel: papelPorParticipacao(part),
    nivelInicio: c.atleta.nivel, lesao: null, riscoRecaida: 0, bonusTreino: 0, bonusAvaliacao: 0, lesoes: 0,
  };
}

function poisson(r: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= r.next(); } while (p > L && k < 12);
  return k - 1;
}

const TAXAS: Record<Posicao, { g: number; a: number; pd: number; d: number; i: number }> = {
  CA: { g: 0.42, a: 0.12, pd: 0.8, d: 0.3, i: 0.1 },
  PE: { g: 0.26, a: 0.2, pd: 1.3, d: 0.6, i: 0.2 },
  PD: { g: 0.26, a: 0.2, pd: 1.3, d: 0.6, i: 0.2 },
  MEI: { g: 0.15, a: 0.26, pd: 1.8, d: 0.9, i: 0.4 },
  VOLE: { g: 0.05, a: 0.08, pd: 0.8, d: 2.4, i: 1.3 },
  VOLD: { g: 0.05, a: 0.08, pd: 0.8, d: 2.4, i: 1.3 },
  LE: { g: 0.04, a: 0.1, pd: 0.7, d: 1.7, i: 1.1 },
  LD: { g: 0.04, a: 0.1, pd: 0.7, d: 1.7, i: 1.1 },
  ZAGE: { g: 0.05, a: 0.03, pd: 0.2, d: 2.1, i: 1.8 },
  ZAGD: { g: 0.05, a: 0.03, pd: 0.2, d: 2.1, i: 1.8 },
  GOL: { g: 0, a: 0, pd: 0, d: 0, i: 0 },
};

/** Simula o jogo `t.jogoAtual`. */
function simularJogo(cat: Catalogo, c: Carreira, t: Temporada) {
  const i = t.jogoAtual;
  const r = rngFrom(c.semente, "jogo", t.ano, i);
  const a = c.atleta;
  if (t.lesao && i >= t.lesao.retorno) t.lesao = null;
  let minutos = 0;
  if (!t.lesao) {
    const ef = nivelNaFuncao(a, t.funcao) + t.bonusAvaliacao;
    if (r.chance(chanceTitular(ef, t.concorrentes))) {
      minutos = r.chance(0.25) ? r.int(62, 85) : 90;
      t.titularidades++;
    } else if (r.chance(chanceEntrar(ef, t.concorrentes))) {
      minutos = r.int(10, 32);
    }
    if (minutos > 0) {
      const f = forcaClube(cat, t.clubeId);
      const q = clamp(1 + (ef - f) / 30, 0.6, 1.5);
      const k = (minutos / 90) * q;
      const tx = TAXAS[t.funcao];
      const s = t.stats;
      const g = poisson(r, tx.g * k), as = poisson(r, tx.a * k);
      s.gols += g; s.assistencias += as;
      s.passesDecisivos += poisson(r, tx.pd * k);
      s.desarmes += poisson(r, tx.d * k);
      s.interceptacoes += poisson(r, tx.i * k);
      let bonusNota = 0.6 * g + 0.35 * as;
      if (t.funcao === "GOL") {
        s.defesas += poisson(r, 2.6 * (minutos / 90));
        const liga = cat.liga(t.ligaId);
        if (minutos >= 90 && r.chance(clamp(0.3 + (f - nivelLiga(liga)) / 40, 0.12, 0.5))) { s.semSofrer++; bonusNota += 0.5; }
      }
      const nota = clamp(6.3 + (ef - f) / 12 + bonusNota + r.normal(0, 0.6), 4, 10);
      t.notas += nota;
      t.jogos++;
      t.minutos += minutos;
      a.forma = clamp(a.forma * 0.8 + (nota - 6.5) * 0.25, -1, 1);
      a.familiaridade[t.funcao] = clamp((a.familiaridade[t.funcao] ?? 0) + (minutos / 90) * 0.015, 0, 1);
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
    }
  }
  t.minutosPorJogo.push(minutos);
  t.jogoAtual++;
}

/** Situação mostrada em "Sua temporada" (derivada, nunca gravada). */
export function situacao(c: Carreira): string {
  const t = c.temporada;
  if (!t) return "";
  if (t.lesao && t.jogoAtual < t.lesao.retorno) return "Em recuperação";
  if (t.jogoAtual === 0) return c.emprestimo ? "Emprestado" : t.papel === "Titular" ? "Titular previsto" : "Pré-temporada";
  const ult = t.minutosPorJogo.slice(-8);
  const part = ult.reduce((s, m) => s + m, 0) / (Math.max(1, ult.length) * 90);
  if (part >= 0.75) return "Titular absoluto";
  if (part >= 0.5) return "Ganhando espaço";
  if (part >= 0.2) return "Disputando vaga";
  return "Sem espaço";
}

// ─────────────────────────────── eventos tipados ───────────────────────────────

type Ctx = { cat: Catalogo; c: Carreira; t: Temporada };

type DefEvento = {
  id: Pendente["tipo"];
  prioridade: number;
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

export const EVENTOS: readonly DefEvento[] = [
  {
    id: "recuperacao", prioridade: 100,
    chave: ({ t }) => `recuperacao:${t.ano}:${t.lesao?.inicio ?? -1}`,
    condicao: ({ t }) => !!t.lesao && t.lesao.liberacao === t.jogoAtual && t.jogoAtual < t.lesao.retorno && t.jogoAtual < t.jogosTotal,
    criar: ({ cat, t }) => {
      const adv = cat.clubesDaLiga(t.ligaId).filter((x) => x.id !== t.clubeId);
      const r = rngFrom("adversario", t.ano, t.jogoAtual, t.clubeId);
      const rival = adv.length ? r.pick(adv).nome : "o adversário";
      return {
        opcoes: [
          { id: "esperar", rotulo: "Esperar a recuperação", detalhe: "Menos risco de recaída" },
          { id: "jogar", rotulo: "Tentar jogar o próximo jogo", detalhe: "Chance de jogar · risco maior" },
        ],
        contexto: { rival, faltam: (t.lesao?.retorno ?? 0) - t.jogoAtual },
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
    id: "perdaEspaco", prioridade: 30,
    chave: ({ t }) => `perdaEspaco:${t.ano}`,
    condicao: ({ t }) => t.jogoAtual >= 8 && !t.lesao && participacaoRecente(t) < Math.min(0.3, t.previsao[0] / 100 - 0.05),
    criar: () => ({
      opcoes: [
        { id: "conversar", rotulo: "Pedir uma conversa" },
        { id: "treinar", rotulo: "Focar no treino" },
        { id: "emprestimo", rotulo: "Buscar um empréstimo" },
      ],
      contexto: {},
    }),
    aplicar: ({ c, t }, opcao) => {
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
        return "Você intensificou os treinos. O treinador vai reavaliar a disputa nos próximos jogos.";
      }
      c.interesseEmprestimo = true;
      return "Seu interesse em sair por empréstimo foi registrado. Propostas só chegam na janela, se algum clube tiver vaga e orçamento.";
    },
  },
  {
    id: "adaptacao", prioridade: 20,
    chave: ({ t }) => `adaptacao:${t.ano}`,
    condicao: (x) => x.t.funcao !== "GOL" && x.t.jogoAtual >= 6 && participacaoRecente(x.t) < 0.5 && !x.t.lesao && funcaoComNecessidade(x) !== null,
    criar: (x) => {
      const rel = funcaoComNecessidade(x)!;
      return {
        opcoes: [
          { id: "aceitar", rotulo: "Aceitar a adaptação", detalhe: "Mais chances de jogar" },
          { id: "manter", rotulo: "Manter minha posição", detalhe: "Evolução na função atual" },
        ],
        contexto: { funcao: rel, pergunta: `Aceita jogar ${POS[rel].funcao}?` },
      };
    },
    aplicar: ({ cat, c, t }, opcao, p) => {
      const rel = p.contexto.funcao as Posicao;
      if (opcao === "aceitar") {
        c.atleta.familiaridade[rel] = Math.max(c.atleta.familiaridade[rel] ?? 0, 0.35);
        t.funcao = rel;
        t.concorrentes = gerarConcorrentes(cat, c.semente, t.clubeId, rel, t.ano);
        return `Você passa a disputar a vaga de ${POS[rel].nome.toLowerCase()}. A familiaridade com a função cresce com os minutos.`;
      }
      t.bonusTreino += 0.06;
      return `Você segue como ${POS[t.funcao].nome.toLowerCase()}, com o treino concentrado na sua função.`;
    },
  },
  {
    id: "convocacao", prioridade: 10,
    chave: () => "convocacao",
    condicao: ({ cat, c, t }) => {
      if (c.convocado || idadeEm(c.atleta, t.ano) < 18) return false;
      const part = t.jogoAtual >= 8 ? t.minutos / (90 * t.jogoAtual) : (c.historico[c.historico.length - 1]?.participacao ?? 0);
      return c.atleta.nivel >= exigenciaSelecao(c) && part >= 0.5 && nivelLiga(cat.liga(t.ligaId)) >= 60;
    },
    criar: ({ c, t }) => {
      const nac = NAC[c.atleta.nacionalidade];
      return {
        opcoes: [{ id: "ok", rotulo: "Continuar" }],
        contexto: { selecao: nac?.selecao ?? "Seleção", ano: t.ano, nivel: c.atleta.nivel, exigencia: Math.round(exigenciaSelecao(c)) },
      };
    },
    aplicar: ({ c, t }, _o, p) => {
      c.convocado = true;
      c.marcos.push({ tipo: "convocacao", ano: t.ano, texto: `Primeira convocação · ${p.contexto.selecao}` });
      return "Convocação registrada na sua trajetória.";
    },
  },
];

const EVENTO = Object.fromEntries(EVENTOS.map((e) => [e.id, e])) as Record<Pendente["tipo"], DefEvento>;

function avaliarEventos(cat: Catalogo, c: Carreira, emCheckpoint: boolean): boolean {
  const t = c.temporada!;
  const x: Ctx = { cat, c, t };
  const cand = [...EVENTOS].sort((a, b) => b.prioridade - a.prioridade);
  for (const ev of cand) {
    if (ev.id !== "recuperacao" && !emCheckpoint) continue;
    const chave = ev.chave(x);
    if (c.chavesUsadas.includes(chave)) continue;
    if (!ev.condicao(x)) continue;
    c.pendente = { tipo: ev.id, chave, ano: t.ano, ...ev.criar(x) };
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
    const cp = checkpoints(t).includes(t.jogoAtual);
    if (avaliarEventos(cat, c, cp)) return c;
    simularJogo(cat, c, t);
  }
  encerrarTemporada(cat, c);
  return c;
}

// ─────────────────────────────── fim de temporada ───────────────────────────────

function encerrarTemporada(cat: Catalogo, c: Carreira) {
  const t = c.temporada!;
  const a = c.atleta;
  const clube = cat.clube(t.clubeId);
  const liga = cat.liga(t.ligaId);
  const idade = idadeEm(a, t.ano);
  const part = t.minutos / (90 * t.jogosTotal);
  const delta = evoluir(a, idade, part, t.bonusTreino, c.semente, t.ano);
  let posicaoLiga: number | null = null;
  if (!t.simplificada && liga) {
    const r = rngFrom(c.semente, "classificacao", t.ano, t.ligaId);
    const tabela = cat.clubesDaLiga(liga.id).map((x) => ({ id: x.id, v: forcaClube(cat, x.id) + r.normal(0, 4) })).sort((p, q) => q.v - p.v);
    posicaoLiga = tabela.findIndex((x) => x.id === t.clubeId) + 1 || null;
  }
  const titulo = posicaoLiga === 1;
  const anterior = c.historico[c.historico.length - 1];
  const top = principalConcorrente(t.concorrentes);
  let resultado: RegistroTemporada["resultado"];
  if (t.lesoes > 0 && t.jogos < t.jogosTotal * 0.4 && t.minutosPorJogo.filter((m) => m === 0).length > t.jogosTotal * 0.3 && part < t.previsao[0] / 100) resultado = "lesao";
  else if (part * 100 >= t.previsao[1] || (anterior && part - anterior.participacao >= 0.15)) resultado = "ganhou";
  else if (part * 100 < t.previsao[0] - 5) resultado = "perdeu";
  else resultado = "manteve";
  const media = t.jogos ? Math.round((t.notas / t.jogos) * 10) / 10 : 0;
  const fato = resultado === "ganhou"
    ? (top ? `Você superou ${top.nome} (concorrente simulado, nível ${top.nivel}) e jogou ${Math.round(part * 100)}% dos minutos; a previsão era ${t.previsao[0]}–${t.previsao[1]}%.` : `Você jogou ${Math.round(part * 100)}% dos minutos.`)
    : resultado === "perdeu"
      ? `${top ? `${top.nome} (concorrente simulado, nível ${top.nivel}) ficou com a vaga` : "A concorrência ficou com a vaga"}: você jogou ${Math.round(part * 100)}% dos minutos, abaixo da previsão de ${t.previsao[0]}–${t.previsao[1]}%.`
      : resultado === "lesao"
        ? `As lesões tiraram você de ${t.minutosPorJogo.filter((m) => m === 0).length} jogos.`
        : `Média ${media.toLocaleString("pt-BR")} em ${t.jogos} jogos, dentro da previsão de ${t.previsao[0]}–${t.previsao[1]}% dos minutos.`;
  const reg: RegistroTemporada = {
    ano: t.ano, idade, clubeId: t.clubeId, clubeNome: clube?.nome ?? c.emprestimo?.clubeNome ?? c.vinculo?.clubeNome ?? "",
    ligaId: t.ligaId, ligaNome: liga?.nome ?? "", pais: liga?.pais ?? "",
    emprestimo: !!c.emprestimo, origemNome: c.emprestimo?.origemNome ?? null, funcao: t.funcao,
    papel: papelPorParticipacao(part), previsao: t.previsao, jogos: t.jogos, jogosTotal: t.jogosTotal, minutos: t.minutos,
    participacao: Math.round(part * 1000) / 1000, stats: t.stats, media, nivelInicio: t.nivelInicio, nivelFim: a.nivel,
    posicaoLiga, titulo, simplificada: t.simplificada, lesoes: t.lesoes, fato, resultado,
  };
  void delta;
  c.historico.push(reg);
  if (titulo) c.marcos.push({ tipo: "titulo", ano: t.ano, texto: `Campeão · ${liga?.nome ?? ""}`, clubeId: t.clubeId });
  // Empréstimo termina: o atleta volta ao clube de origem.
  if (c.emprestimo && c.emprestimo.fim <= t.ano) {
    c.marcos.push({ tipo: "retorno", ano: t.ano, texto: `Fim do empréstimo · volta ao ${c.emprestimo.origemNome}`, clubeId: c.emprestimo.origemId });
    c.emprestimo = null;
  }
  c.interesseEmprestimo = c.interesseEmprestimo && part < 0.5;
  c.fase = "balanco";
  // A primeira convocação também pode sair no fechamento da temporada.
  avaliarConvocacaoFinal(cat, c);
}

function avaliarConvocacaoFinal(cat: Catalogo, c: Carreira) {
  const t = c.temporada!;
  const x: Ctx = { cat, c, t };
  const ev = EVENTO.convocacao;
  const chave = ev.chave(x);
  if (!c.chavesUsadas.includes(chave) && ev.condicao(x)) c.pendente = { tipo: "convocacao", chave, ano: t.ano, ...ev.criar(x) };
}

export function resumoTemporada(c: Carreira) {
  const t = c.temporada;
  if (!t) return null;
  const m = metricaPrincipal(t.funcao === "GOL" ? "GOL" : c.atleta.posicao);
  return { jogos: t.jogos, minutos: t.minutos, metrica: t.stats[m.chave], rotulo: m.rotulo };
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

function aceitarOferta(cat: Catalogo, c: Carreira, o: Oferta) {
  const anoNovo = c.ano + 1;
  if (o.tipo === "renovacao" && c.vinculo) {
    c.vinculo = { ...c.vinculo, fim: c.ano + o.duracao, papel: o.papel, previsao: o.previsao };
    return `Renovação assinada até ${c.vinculo.fim}.`;
  }
  if (o.tipo === "emprestimo" && c.vinculo) {
    c.emprestimo = {
      clubeId: o.clubeId, clubeNome: o.clubeNome, origemId: c.vinculo.clubeId, origemNome: c.vinculo.clubeNome,
      inicio: anoNovo, fim: anoNovo, salarioDestino: o.salarioDestino ?? 1, retorno: true, papel: o.papel, previsao: o.previsao,
    };
    c.marcos.push({ tipo: "emprestimo", ano: anoNovo, texto: `Emprestado ao ${o.clubeNome}`, clubeId: o.clubeId });
    return `Empréstimo ao ${o.clubeNome} por uma temporada. Seu vínculo com o ${c.vinculo.clubeNome} continua.`;
  }
  c.vinculo = { clubeId: o.clubeId, clubeNome: o.clubeNome, inicio: anoNovo, fim: c.ano + o.duracao, papel: o.papel, previsao: o.previsao };
  c.emprestimo = null;
  c.interesseEmprestimo = false;
  c.marcos.push({ tipo: "transferencia", ano: anoNovo, texto: `${o.tipo === "compra" ? "Comprado pelo" : "Transferência para o"} ${o.clubeNome}`, clubeId: o.clubeId });
  void cat;
  return `Contrato com o ${o.clubeNome} até ${c.vinculo.fim}.`;
}

// ─────────────────────────────────── decisões ───────────────────────────────────

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
    const o = pend.ofertas?.find((x) => x.id === opcao);
    consequencia = o ? aceitarOferta(cat, c, o) : (pend.contexto.voltaDeEmprestimo ? `Você volta ao ${c.vinculo?.clubeNome}.` : `Você segue no ${c.vinculo?.clubeNome}.`);
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
