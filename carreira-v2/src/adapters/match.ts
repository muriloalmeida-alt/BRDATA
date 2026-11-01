// MatchGateway — porta da v2 para a partida ao vivo (plano do bloco da
// partida, opção A). Atrás dela, a "ponte": a versão atual aberta num
// quadro invisível em /carreira?ponte=partida, com o motor e a gravação
// de sempre (API window.BRDATA_PONTE em public/js/carreira.js). Se um dia
// o motor virar módulo comum (opção B), só esta porta muda.

export type MatchPhase = "carregando" | "sem-partida" | "jogando" | "pausada" | "intervalo" | "encerrada";
export interface MatchEvent {
  minuto: number; tipo: string; meu: boolean;
  jogador: string | null; assistencia: string | null; entra: string | null; sai: string | null; penalti: boolean;
}
export interface MatchSnapshot {
  fase: MatchPhase;
  gravada?: boolean | null;
  minuto?: number; segundoTempo?: boolean;
  contexto?: "liga" | "copa" | "amistoso";
  rodada?: number; copa?: { fase: string; perna: number } | null;
  mandante?: { id: string; nome: string }; visitante?: { id: string; nome: string };
  souMandante?: boolean; gh?: number; ga?: number; velocidade?: 1 | 2;
  substituicoes?: { usadas: number; total: number };
  eventos?: MatchEvent[];
  escalacao?: { formacao: string; titulares: (LivePlayer | null)[]; banco: LivePlayer[] };
  tatica?: { formacao: string; eixos: TacticAxis[]; formacoes: string[]; penalidadeBlocos: number };
}
export interface TacticAxis { id: string; nome: string; baixo: string; alto: string; nivel: number }
export type CommandResult = { ok: boolean; motivo?: string };
export interface LivePlayer { id: string; nome: string; grupo: "G" | "D" | "M" | "F"; overall: number; status: string; voltaRodada: number | null; condicao: number | null }
interface PonteApi {
  estado(): MatchSnapshot;
  aoMudar(cb: () => void): () => void;
  iniciar(): { ok: boolean; aoVivo?: boolean; motivo?: string };
  pausar(): void; retomar(): void; continuarIntervalo(): void;
  velocidade(v: 1 | 2): void; pularParaFim(): void;
  substituir(saiId: string, entraId: string): CommandResult;
  aplicarTatica(t: { formacao: string; eixos: Record<string, number> }): CommandResult;
}

export interface MatchSession {
  snapshot(): MatchSnapshot;
  subscribe(cb: (s: MatchSnapshot) => void): () => void;
  start(): { ok: boolean; motivo?: string };
  pause(): void; resume(): void; continueHalftime(): void;
  speed(v: 1 | 2): void; skip(): void;
  substitute(outId: string, inId: string): CommandResult;
  applyTactics(formation: string, axes: Record<string, number>): CommandResult;
  destroy(): void;
}

const READY_TIMEOUT_MS = 30000;

// Abre a ponte e espera o motor ficar pronto (carreira carregada).
export function openMatchSession(): Promise<MatchSession> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.src = "/carreira?ponte=partida";
    frame.title = "Motor da partida";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;top:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(frame);
    const started = Date.now();
    const api = (): PonteApi | null => {
      try { return ((frame.contentWindow as unknown as { BRDATA_PONTE?: PonteApi })?.BRDATA_PONTE) || null; } catch { return null; }
    };
    const destroy = () => frame.remove();
    const poll = () => {
      const p = api();
      if (p && p.estado().fase !== "carregando") {
        resolve({
          snapshot: () => p.estado(),
          subscribe: (cb) => p.aoMudar(() => cb(p.estado())),
          start: () => p.iniciar(),
          pause: () => p.pausar(), resume: () => p.retomar(), continueHalftime: () => p.continuarIntervalo(),
          speed: (v) => p.velocidade(v), skip: () => p.pularParaFim(),
          substitute: (o, i) => p.substituir(o, i),
          applyTactics: (f, a) => p.aplicarTatica({ formacao: f, eixos: a }),
          destroy,
        });
        return;
      }
      if (Date.now() - started > READY_TIMEOUT_MS) { destroy(); reject(new Error("timeout")); return; }
      setTimeout(poll, 150);
    };
    frame.addEventListener("load", poll, { once: true });
  });
}
