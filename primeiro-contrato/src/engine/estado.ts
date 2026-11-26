// Contrato do save (PC-001). Tudo o que a carreira precisa para retomar fica
// aqui: semente, atleta, vínculo, empréstimo, temporada corrente, histórico,
// marcos, decisão pendente e decisões já gravadas.
import type { Atleta } from "./atleta.ts";
import type { Concorrente, Papel } from "./elenco.ts";
import type { ChaveMetrica, Posicao } from "./posicoes.ts";

export const SCHEMA_VERSAO = 3;

export type Estatisticas = {
  gols: number;
  assistencias: number;
  passesDecisivos: number;
  desarmes: number;
  interceptacoes: number;
  defesas: number;
  semSofrer: number;
};

export const statsVazias = (): Estatisticas => ({ gols: 0, assistencias: 0, passesDecisivos: 0, desarmes: 0, interceptacoes: 0, defesas: 0, semSofrer: 0 });

// ── PC-003: termos financeiros (estimativas do jogo) ──
export type Moeda = "BRL" | "EUR" | "GBP" | "USD";
/** Salário mensal na moeda do país do clube. */
export type Dinheiro = { valor: number; moeda: Moeda };
/** Bônus único por condição cumprida (jogos na temporada). */
export type Bonus = { jogos: number; valor: number; moeda: Moeda; ano: number; pago: boolean };

export type Vinculo = {
  clubeId: string;
  clubeNome: string; // cópia para o save continuar legível se o catálogo mudar
  inicio: number; // primeira temporada
  fim: number; // última temporada coberta
  papel: Papel;
  previsao: [number, number]; // % dos minutos (estimativa)
  salario?: Dinheiro | null; // PC-003 (ausente em vínculos de saves antigos: não mapeado)
  bonus?: Bonus | null;
};

export type Emprestimo = {
  clubeId: string;
  clubeNome: string;
  origemId: string;
  origemNome: string;
  inicio: number;
  fim: number;
  salarioDestino: number; // fração do salário paga pelo destino
  retorno: true;
  papel: Papel;
  previsao: [number, number];
};

export type Situacao = "titular" | "entrou" | "banco" | "indisponivel";

/** Uma partida do clube na temporada, do ponto de vista do atleta (PC-002).
 *  Chave estável `ano:rodada`. Gols e assistências saem dos gols do time. */
export type Partida = {
  chave: string;
  rodada: number; // 1..
  adversarioId: string;
  adversarioNome: string;
  mandante: boolean;
  golsPro: number;
  golsContra: number;
  situacao: Situacao;
  minutos: number;
  nota: number | null;
  gols: number;
  assistencias: number;
  desarmes: number;
  defesas: number;
  semSofrer: boolean;
  marcos: Array<"estreia" | "retorno" | "golDecisivo" | "atuacao" | "classico">;
  // PC-003 (ausentes em partidas antigas: contam como 0)
  passes?: number; // passes decisivos
  intercept?: number;
  recepcao?: "aplausos" | "vaias" | "dividida"; // jogo no estádio do ex-clube
};

export type Campanha = { v: number; e: number; d: number; gp: number; gc: number; pts: number };

export type Rumor = { clubeId: string; clubeNome: string; ano: number; resposta: "ficar" | "aberta" | "evitar" | null };

export type Lesao = {
  inicio: number; // índice do jogo
  retorno: number; // jogo em que volta sem risco
  liberacao: number | null; // jogo com liberação médica e risco residual
  recaida: boolean;
};

export type Temporada = {
  ano: number;
  clubeId: string; // onde joga (destino, se emprestado)
  ligaId: string;
  funcao: Posicao;
  jogosTotal: number;
  simplificada: boolean;
  jogoAtual: number; // próximos jogo a simular (0..jogosTotal)
  jogos: number; // jogos em que entrou
  titularidades: number;
  minutos: number;
  stats: Estatisticas;
  notas: number; // soma das notas (média = notas / jogos)
  minutosPorJogo: number[]; // participação jogo a jogo (perda de espaço)
  concorrentes: Concorrente[];
  previsao: [number, number];
  papel: Papel;
  nivelInicio: number;
  lesao: Lesao | null;
  riscoRecaida: number; // jogos restantes com risco elevado
  bonusTreino: number;
  bonusAvaliacao: number; // efeito do "focar no treino" na próxima avaliação
  lesoes: number;
  // PC-002
  participantes: string[]; // clubes do calendário (grupo simulado na temporada simplificada)
  partidas: Partida[];
  exibidos: number; // ponteiro da reprodução na tela (persistido)
  interrupcoes: number; // eventos novos (entrevista, rumor) nesta temporada
  origemParcial: number; // jogos anteriores à migração (sem registro por partida)
  // PC-003
  ausencia?: { concorrenteId: string; nome: string; de: number; ate: number } | null; // vaga aberta (índices de jogo)
  reforco?: boolean; // o clube contratou um reforço na posição nesta temporada
};

export type RegistroTemporada = {
  ano: number;
  idade: number;
  clubeId: string;
  clubeNome: string;
  ligaId: string;
  ligaNome: string;
  pais: string;
  emprestimo: boolean;
  origemNome: string | null;
  funcao: Posicao;
  papel: Papel;
  previsao: [number, number];
  jogos: number;
  jogosTotal: number;
  minutos: number;
  participacao: number;
  stats: Estatisticas;
  media: number;
  nivelInicio: number;
  nivelFim: number;
  posicaoLiga: number | null; // só com formato verificado
  titulo: boolean;
  simplificada: boolean;
  lesoes: number;
  fato: string;
  resultado: "ganhou" | "manteve" | "perdeu" | "lesao";
  // PC-002 (ausentes em temporadas de saves antigos: origem "resumo")
  origem?: "jogo-a-jogo" | "resumo";
  titularidades?: number;
  partidas?: Partida[];
  campanha?: Campanha | null;
  participantesTotal?: number;
  reputacaoDelta?: number;
  // PC-003
  salario?: Dinheiro | null;
  bonusPago?: Dinheiro | null;
  identificacao?: number; // identificação da torcida no fim da temporada
  manchetes?: string[];
};

export type Marco = { tipo: "estreia" | "convocacao" | "titulo" | "transferencia" | "emprestimo" | "retorno" | "aposentadoria"; ano: number; texto: string; clubeId?: string };

export type TipoOferta = "renovacao" | "transferencia" | "emprestimo" | "compra";

export type Oferta = {
  id: string;
  tipo: TipoOferta;
  clubeId: string;
  clubeNome: string;
  papel: Papel;
  previsao: [number, number];
  minutosPrevistos: [number, number]; // minutos na temporada (estimativa)
  duracao: number; // temporadas (empréstimo: 1)
  motivo: string;
  taxa: number; // € mi (simulado; 0 em renovação/livre)
  salarioDestino?: number;
  // PC-003
  salario?: Dinheiro | null;
  bonus?: { jogos: number; valor: number; moeda: Moeda } | null;
  revisaoRodada?: number | null; // compromisso de revisão de papel
  emprestimoAutorizado?: boolean;
  validaAte?: number; // ano da janela em que a proposta vale
  vaga?: string; // qual vaga existe no clube
  manterVinculo?: boolean; // "ficar" negociado: mantém o contrato vigente
};

export type Pedido = "espaco" | "curto" | "condicoes" | "emprestimo";

/** Uma única rodada de negociação por proposta (PC-003). */
export type Negociacao = {
  chave: string; // `${ano}:${caminhoId}`
  caminhoId: string;
  pedido: Pedido;
  resposta: "aceita" | "alternativa" | "recusa" | "retirada";
  razao: string;
  termos: Oferta | null; // termos atualizados (aceita/alternativa)
};

/** Compromisso assumido pela diretoria (PC-003). */
export type Compromisso = {
  id: string;
  clubeId: string;
  clubeNome: string;
  origem: string; // chave da decisão que o criou
  tipo: "revisaoPapel" | "bonus" | "emprestimoAutorizado";
  termos: string;
  ano: number; // temporada em que vale
  rodadaRevisao: number | null; // rodada (1..) da revisão
  estado: "ativo" | "cumprido" | "naoCumprido" | "encerrado";
  evidencia: string | null;
  motivo: string | null;
};

export type ChaveCriterio = "defesas" | "defensivas" | "criacao" | "participacao" | "golsAssist";

/** Plano do técnico com janela de avaliação (PC-003). */
export type Plano = {
  id: string;
  clubeId: string;
  ano: number;
  origem: string; // chave do evento que o criou
  tipo: "vagaAberta" | "missaoTitular" | "ajusteFuncao" | "reforco" | "treino" | "adaptacao" | "revisado";
  funcao: Posicao;
  criterio: { chave: ChaveCriterio; alvo90: number; rotulo: string };
  inicio: number; // índice do primeiro jogo da janela
  partidas: number; // partidas elegíveis na janela
  estado: "ativo" | "atingido" | "naoAtingido" | "amostraInsuficiente" | "encerrado";
  resultado: { jogos: number; minutos: number; valor90: number; texto: string } | null;
};

export type Declaracao = {
  id: string;
  ano: number;
  rodada: number | null;
  clubeId: string;
  tipo: "permanencia" | "portaAberta" | "ambicao" | "grupo" | "disputa" | "fase" | "evitar";
  texto: string;
  origem: string; // chave da decisão
  reapareceu: boolean;
};

export type TorcidaClube = { identificacao: number; jogos: number; marcantes: number; temporadas: number; saida: "boa" | "neutra" | "ruim" | null; ultimoAno: number };

export type Manchete = { ano: number; rodada: number | null; clubeId: string; texto: string; tom: -1 | 0 | 1 };

export type Opcao = { id: string; rotulo: string; detalhe?: string };

export type TipoEvento = "planoTreinador" | "adaptacao" | "recuperacao" | "perdaEspaco" | "entrevista" | "rumor" | "convocacao" | "janela" | "aposentadoria"
  | "vagaAberta" | "boasEntradas" | "reforco" | "revisaoPlano" | "revisaoCompromisso" | "classico" | "arquibancada";

export type Pendente = {
  tipo: TipoEvento;
  chave: string; // chave de repetição: a mesma decisão nunca é criada duas vezes
  ano: number;
  opcoes: Opcao[];
  contexto: Record<string, string | number | boolean | null>;
  ofertas?: Oferta[];
  negociacoes?: Record<string, Negociacao>; // PC-003: por caminho da janela
};

export type Decisao = { chave: string; tipo: TipoEvento; opcao: string; ano: number; consequencia: string };

export type Fase = "contrato" | "temporada" | "balanco" | "janela" | "aposentadoria" | "encerrada";

export type Carreira = {
  schema: number;
  catalogo: string; // versão do catálogo usada na criação
  semente: string;
  criadaEm: string;
  anoInicial: number;
  ano: number;
  fase: Fase;
  atleta: Atleta;
  vinculo: Vinculo | null;
  emprestimo: Emprestimo | null;
  temporada: Temporada | null;
  historico: RegistroTemporada[];
  marcos: Marco[];
  pendente: Pendente | null;
  decisoes: Decisao[];
  chavesUsadas: string[];
  interesseEmprestimo: boolean;
  clubesDeInteresse: string[];
  ultimaConsequencia: string | null;
  convocado: boolean;
  rumor: Rumor | null; // PC-002
  // PC-003
  compromissos: Compromisso[];
  planos: Plano[];
  declaracoes: Declaracao[];
  torcida: Record<string, TorcidaClube>;
  manchetes: Manchete[];
};

export type Resumo = { jogos: number; minutos: number; metrica: number; chave: ChaveMetrica };
