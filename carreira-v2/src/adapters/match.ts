// MatchGateway — os tipos da porta da v2 para o motor do jogo (a sessão e o
// estado da partida). Desde a etapa G2d do plano "sem página escondida", a
// sessão é aberta só pelo motor como módulo (adapters/hosted.ts, com
// /js/motor/v2.js); o quadro escondido em /carreira/motor saiu. Quem abre e
// reaproveita a sessão é adapters/engine.ts.

export type MatchPhase = "carregando" | "sem-partida" | "jogando" | "pausada" | "intervalo" | "encerrada" | "pos-jogo";
export interface MatchEvent {
  minuto: number; tipo: string; meu: boolean;
  jogador: string | null; assistencia: string | null; entra: string | null; sai: string | null; penalti: boolean;
}
export interface MatchSnapshot {
  fase: MatchPhase;
  gravada?: boolean | null;
  erroGravacao?: SaveError | null;
  salvando?: boolean;
  resultadoPronto?: boolean;
  semanaPronta?: boolean; // fase 3: amistoso encerrado, resumo da semana pronto
  posJogo?: "em-andamento" | "concluido";
  minuto?: number; segundoTempo?: boolean;
  contexto?: "liga" | "copa" | "amistoso";
  rodada?: number; copa?: CupLegInfo | null;
  mandante?: { id: string; nome: string }; visitante?: { id: string; nome: string };
  souMandante?: boolean; gh?: number; ga?: number; velocidade?: 1 | 2;
  substituicoes?: { usadas: number; total: number };
  eventos?: MatchEvent[];
  escalacao?: { formacao: string; titulares: (LivePlayer | null)[]; banco: LivePlayer[] };
  tatica?: { formacao: string; eixos: TacticAxis[]; formacoes: string[]; penalidadeBlocos: number };
}
// Fase 4 (P5/P6): perna de Copa — placar da ida do seu ponto de vista (só na
// volta) e, decidida a volta, pênaltis e quem passou.
export interface CupLegInfo { fase: string; perna: number; ida?: { meus: number; deles: number } | null; penaltis?: boolean; classificado?: string | null; classificadoSouEu?: boolean | null }
// Motivo da falha ao gravar o resultado (AUD-02): sessão expirada, outra
// conta logada neste navegador, ou qualquer outra falha (rede, servidor).
export type SaveError = "sessao" | "outra-conta" | "falha";
export interface TacticAxis { id: string; nome: string; baixo: string; alto: string; nivel: number }
export type CommandResult = { ok: boolean; motivo?: string };
export interface LivePlayer { id: string; nome: string; grupo: "G" | "D" | "M" | "F"; overall: number; status: string; voltaRodada: number | null; condicao: number | null }
export interface MatchSession {
  snapshot(): MatchSnapshot;
  subscribe(cb: (s: MatchSnapshot) => void): () => void;
  start(): { ok: boolean; motivo?: string };
  pause(): void; resume(): void; continueHalftime(): void;
  speed(v: 1 | 2): void; skip(): void;
  substitute(outId: string, inId: string): CommandResult;
  applyTactics(formation: string, axes: Record<string, number>): CommandResult;
  // AUD-02: repete só a gravação do resultado já calculado (sem simular).
  retrySave(): Promise<CommandResult>;
  // Conta dona do save em memória (para conferir um novo login).
  account(): string | null;
  // Fase 1 — versão (updatedAt) do save em memória no motor.
  saveVersion(): number | null;
  // Fase 1 — esquece a partida já encerrada (motor reaproveitado).
  discard(): CommandResult;
  // Fase 1 — porta genérica: run("nomeDoComando", ...args).
  run<T = unknown>(name: string, ...args: unknown[]): T;
  destroy(): void;
}

export interface OpenOptions { timeoutMs?: number; signal?: AbortSignal }
