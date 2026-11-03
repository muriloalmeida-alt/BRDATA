// MatchGateway — porta da v2 para o motor do jogo (plano do bloco da
// partida, opção A; plano de independência, fase 1). Atrás dela, a "ponte":
// a página da versão anterior aberta num quadro invisível em /carreira/motor,
// com o motor e a gravação de sempre (API window.BRDATA_PONTE em
// public/js/carreira.js). Quem abre e reaproveita a sessão é adapters/engine.ts.
// Se um dia o motor virar módulo comum (opção B), só esta porta muda.

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
  posJogo?: "em-andamento" | "concluido";
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
// Motivo da falha ao gravar o resultado (AUD-02): sessão expirada, outra
// conta logada neste navegador, ou qualquer outra falha (rede, servidor).
export type SaveError = "sessao" | "outra-conta" | "falha";
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
  continuarPosJogo(): CommandResult;
  conta(): string | null;
  salvarDeNovo(): Promise<CommandResult>;
  versaoSave(): number | null;
  descartar(): CommandResult;
  executar(nome: string, ...args: unknown[]): unknown;
}

export interface MatchSession {
  snapshot(): MatchSnapshot;
  subscribe(cb: (s: MatchSnapshot) => void): () => void;
  start(): { ok: boolean; motivo?: string };
  pause(): void; resume(): void; continueHalftime(): void;
  speed(v: 1 | 2): void; skip(): void;
  substitute(outId: string, inId: string): CommandResult;
  applyTactics(formation: string, axes: Record<string, number>): CommandResult;
  // Pós-jogo (decisão D2): mostra a sessão da versão atual em tela cheia e
  // segue a sequência de sempre; reveal(false) esconde de novo.
  continuePostMatch(): CommandResult;
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
  reveal(on: boolean): void;
  destroy(): void;
}

const READY_TIMEOUT_MS = 30000;
const POLL_MS = 150;
const HIDDEN = "position:fixed;width:1px;height:1px;left:-9999px;top:0;border:0;opacity:0;pointer-events:none;";

export interface OpenOptions {
  timeoutMs?: number; src?: string; signal?: AbortSignal;
  // Chamado quando a página escondida da ponte puxa o foco e não há mais o
  // elemento que o tinha (a tela recoloca o foco no título).
  onFocusEscaped?: () => void;
}

// Abre a ponte e espera o motor ficar pronto (carreira carregada). AUD-06:
// - o prazo conta desde a abertura, inclusive o carregamento do documento
//   (um documento que nunca termina de carregar também estoura o prazo);
// - a verificação começa já, sem esperar o evento load;
// - resolve ou rejeita uma única vez, e em todos os caminhos limpa timers,
//   listener e (se não resolveu) o quadro;
// - `signal` cancela a abertura (tela desmontada): remove o quadro na hora,
//   e eventos que cheguem depois são ignorados.
export function openMatchSession(opts: OpenOptions = {}): Promise<MatchSession> {
  const timeoutMs = opts.timeoutMs ?? READY_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) { reject(new DOMException("cancelada", "AbortError")); return; }
    const frame = document.createElement("iframe");
    frame.src = opts.src ?? "/carreira/motor";
    frame.title = "Motor da partida";
    frame.setAttribute("aria-hidden", "true");
    // inert: escondida, a página da ponte não pode receber foco (ela foca os
    // próprios elementos ao montar telas e roubaria o foco da v2 — AUD-05).
    frame.setAttribute("inert", "");
    frame.tabIndex = -1;
    frame.style.cssText = HIDDEN;
    let settled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      clearTimeout(watchdog);
      if (pollTimer) clearTimeout(pollTimer);
      frame.removeEventListener("load", onLoad);
      opts.signal?.removeEventListener("abort", onAbort);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true; cleanup(); unguardRef(); frame.remove(); reject(err);
    };
    // (o guarda de foco é criado mais abaixo; até lá, nada a desfazer)
    let unguardRef: () => void = () => {};
    const onAbort = () => fail(new DOMException("cancelada", "AbortError"));
    const watchdog = setTimeout(() => fail(new Error("timeout")), timeoutMs);
    const api = (): PonteApi | null => {
      try { return ((frame.contentWindow as unknown as { BRDATA_PONTE?: PonteApi })?.BRDATA_PONTE) || null; } catch { return null; }
    };
    // AUD-05: a página da ponte foca os próprios elementos ao montar telas, e
    // isso tira o foco da v2 mesmo com o quadro inerte. Enquanto ela está
    // escondida, devolve o foco a quem o tinha (ou à tela, via callback).
    let lastFocus: Element | null = document.activeElement;
    const onFocusIn = (e: Event) => { if (e.target !== frame) lastFocus = e.target as Element; };
    const onBlur = () => setTimeout(() => {
      if (document.activeElement !== frame || frame.getAttribute("aria-hidden") !== "true") return;
      if (lastFocus instanceof HTMLElement && lastFocus.isConnected && lastFocus !== document.body) lastFocus.focus();
      else opts.onFocusEscaped?.();
    }, 0);
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("blur", onBlur);
    const unguard = () => { document.removeEventListener("focusin", onFocusIn); window.removeEventListener("blur", onBlur); };
    unguardRef = unguard;
    const destroy = () => { unguard(); frame.remove(); };
    const poll = () => {
      pollTimer = null;
      if (settled) return;
      const p = api();
      let ready = false;
      try { ready = !!p && p.estado().fase !== "carregando"; } catch { ready = false; }
      if (ready && p) {
        settled = true; cleanup();
        resolve({
          snapshot: () => p.estado(),
          subscribe: (cb) => p.aoMudar(() => cb(p.estado())),
          start: () => p.iniciar(),
          pause: () => p.pausar(), resume: () => p.retomar(), continueHalftime: () => p.continuarIntervalo(),
          speed: (v) => p.velocidade(v), skip: () => p.pularParaFim(),
          substitute: (o, i) => p.substituir(o, i),
          applyTactics: (f, a) => p.aplicarTatica({ formacao: f, eixos: a }),
          continuePostMatch: () => p.continuarPosJogo(),
          retrySave: () => p.salvarDeNovo(),
          account: () => p.conta(),
          saveVersion: () => p.versaoSave(),
          discard: () => p.descartar(),
          run: <T,>(name: string, ...args: unknown[]) => p.executar(name, ...args) as T,
          reveal: (on) => {
            frame.style.cssText = on
              ? "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100;background:#080e18;"
              : HIDDEN;
            if (on) { frame.removeAttribute("aria-hidden"); frame.removeAttribute("inert"); frame.tabIndex = 0; frame.focus(); }
            else { frame.setAttribute("aria-hidden", "true"); frame.setAttribute("inert", ""); frame.tabIndex = -1; }
          },
          destroy,
        });
        return;
      }
      pollTimer = setTimeout(poll, POLL_MS);
    };
    // O load só adianta a próxima verificação; o prazo não depende dele.
    const onLoad = () => { if (!settled) { if (pollTimer) clearTimeout(pollTimer); poll(); } };
    frame.addEventListener("load", onLoad);
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    document.body.appendChild(frame);
    pollTimer = setTimeout(poll, POLL_MS);
  });
}
