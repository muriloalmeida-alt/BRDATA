// Contrato do save (PC-001). Tudo o que a carreira precisa para retomar fica
// aqui: semente, atleta, vínculo, empréstimo, temporada corrente, histórico,
// marcos, decisão pendente e decisões já gravadas.
import type { Atleta } from "./atleta.ts";
import type { Concorrente, Papel } from "./elenco.ts";
import type { ChaveMetrica, Posicao } from "./posicoes.ts";

export const SCHEMA_VERSAO = 1;

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

export type Vinculo = {
  clubeId: string;
  clubeNome: string; // cópia para o save continuar legível se o catálogo mudar
  inicio: number; // primeira temporada
  fim: number; // última temporada coberta
  papel: Papel;
  previsao: [number, number]; // % dos minutos (estimativa)
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
};

export type Opcao = { id: string; rotulo: string; detalhe?: string };

export type TipoEvento = "adaptacao" | "recuperacao" | "perdaEspaco" | "convocacao" | "janela" | "aposentadoria";

export type Pendente = {
  tipo: TipoEvento;
  chave: string; // chave de repetição: a mesma decisão nunca é criada duas vezes
  ano: number;
  opcoes: Opcao[];
  contexto: Record<string, string | number | boolean | null>;
  ofertas?: Oferta[];
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
};

export type Resumo = { jogos: number; minutos: number; metrica: number; chave: ChaveMetrica };
