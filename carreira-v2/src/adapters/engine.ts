// Motor da v2 (plano de independência, fase 1): UMA sessão do motor por uso
// da v2, aberta sob demanda (ou pré-carregada depois do Início) e
// reaproveitada entre telas — antes, cada partida abria e destruía a sua.
//
// Save atualizado: o motor guarda a carreira em memória. Se a v2 gravar algo
// por fora (ex.: a escalação), o motor fica com o save antigo e, no próximo
// comando que grava, sobrescreveria a mudança. Por isso `get()` compara a
// versão do save do motor (updatedAt) com a do servidor e, se diferem,
// recarrega o motor antes de devolver a sessão.
import { openMatchSession, type MatchSession, type OpenOptions } from "./match.ts";
import { openHostedSession, usarModulo } from "./hosted.ts";

export interface EngineDeps {
  open: (opts: OpenOptions) => Promise<MatchSession>;
  // updatedAt do save no servidor (null = sem carreira / desconhecido).
  serverVersion: () => Promise<number | null>;
}

const defaultDeps: EngineDeps = {
  // Etapas G2b/G2c: o motor abre como módulo, sem o quadro escondido
  // (adapters/hosted.ts); com a chave ?motor=quadro, o quadro de antes (até a G2d).
  open: (opts) => (usarModulo() ? openHostedSession(opts) : openMatchSession(opts)),
  serverVersion: async () => {
    const res = await fetch("/api/career", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    return body && body.career && body.career.updatedAt != null ? Number(body.career.updatedAt) : null;
  },
};

const abortError = () => new DOMException("cancelada", "AbortError");

// Espera `p`, mas devolve AbortError a ESTE chamador se `signal` disparar
// (a abertura compartilhada continua para os outros).
function withSignal<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    p.then((v) => { signal.removeEventListener("abort", onAbort); resolve(v); },
      (e) => { signal.removeEventListener("abort", onAbort); reject(e); });
  });
}

export function createEngine(deps: EngineDeps = defaultDeps) {
  let session: MatchSession | null = null;
  let opening: Promise<MatchSession> | null = null;
  let openCount = 0;

  function open(): Promise<MatchSession> {
    if (session) return Promise.resolve(session);
    if (!opening) {
      openCount++;
      opening = deps.open({ onFocusEscaped: refocus }).then(
        (s) => { session = s; opening = null; return s; },
        (e) => { opening = null; throw e; },
      );
    }
    return opening;
  }

  let refocus: (() => void) | undefined;

  return {
    // Sessão pronta e com o save do servidor. `signal` só cancela a espera
    // deste chamador (sair da tela), não a sessão compartilhada.
    async get(signal?: AbortSignal): Promise<MatchSession> {
      let s = await withSignal(open(), signal);
      const server = await withSignal(deps.serverVersion().catch(() => null), signal);
      const mine = s.saveVersion();
      if (server != null && mine != null && server !== mine) {
        // Save mudou por fora: recarrega o motor (descarta a memória antiga).
        this.reset();
        s = await withSignal(open(), signal);
      }
      return s;
    },
    // Pré-carga em segundo plano (depois do Início): erros ficam para quem
    // pedir a sessão de verdade.
    preload() { open().catch(() => {}); },
    // Fecha a sessão (erro, troca de save). A próxima `get()` abre outra.
    reset() {
      if (session) { session.destroy(); session = null; }
    },
    current(): MatchSession | null { return session; },
    // Diagnóstico/testes: quantas aberturas aconteceram.
    opens(): number { return openCount; },
    // Recoloca o foco na tela quando o motor escondido o puxa (AUD-05).
    setFocusHandler(fn: () => void) { refocus = fn; },
  };
}

export type Engine = ReturnType<typeof createEngine>;

// Instância única da v2.
export const engine = createEngine();
