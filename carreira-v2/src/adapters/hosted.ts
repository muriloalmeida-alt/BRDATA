// Plano "sem página escondida", etapa G2b: a sessão do motor SEM o quadro
// escondido. Carrega o /js/data.js (dados de exemplo, nomes e o sorteio por
// chave) e importa o hospedeiro do motor (/js/motor/v2.js, etapa G2a), que
// devolve a mesma ponte de comandos da página antiga. Por enquanto atrás de
// uma chave (ver usarModulo); o padrão continua sendo o quadro (match.ts).
import type { MatchSession, MatchSnapshot, OpenOptions } from "./match.ts";

// Chave: ?motor=modulo na URL (fica guardada) ou localStorage "brdata_motor".
export function usarModulo(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("motor");
    if (q === "modulo" || q === "quadro") localStorage.setItem("brdata_motor", q);
    return localStorage.getItem("brdata_motor") === "modulo";
  } catch {
    return false;
  }
}

type Ponte = {
  estado(): MatchSnapshot;
  aoMudar(cb: () => void): () => void;
  iniciar(): { ok: boolean; aoVivo?: boolean; motivo?: string };
  pausar(): void; retomar(): void; continuarIntervalo(): void;
  velocidade(v: 1 | 2): void; pularParaFim(): void;
  substituir(saiId: string, entraId: string): { ok: boolean; motivo?: string };
  aplicarTatica(t: { formacao: string; eixos: Record<string, number> }): { ok: boolean; motivo?: string };
  continuarPosJogo(): { ok: boolean; motivo?: string };
  conta(): string | null;
  salvarDeNovo(): Promise<{ ok: boolean; motivo?: string }>;
  versaoSave(): number | null;
  descartar(): { ok: boolean; motivo?: string };
  executar(nome: string, ...args: unknown[]): unknown;
};
type Hospedeiro = { abrirMotor(): Promise<{ ponte: Ponte } | { semConta: true }> };

let dados: Promise<void> | null = null;
function carregarDados(src: string): Promise<void> {
  if (!dados) {
    dados = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => { dados = null; reject(new Error("dados")); };
      document.head.appendChild(s);
    });
  }
  return dados;
}

export interface HostedOptions extends OpenOptions {
  dadosSrc?: string;
  motorSrc?: string;
  // Testes: troca o import do hospedeiro.
  importar?: (src: string) => Promise<Hospedeiro>;
}

// Abre a sessão pelo hospedeiro. Mesmo contrato de openMatchSession: resolve
// com a ponte pronta (carreira carregada ou escolha de competição), ou
// rejeita (prazo, sem conta, cancelada).
export async function openHostedSession(opts: HostedOptions = {}): Promise<MatchSession> {
  const timeoutMs = opts.timeoutMs ?? 30000;
  const abortar = () => new DOMException("cancelada", "AbortError");
  if (opts.signal?.aborted) throw abortar();
  const abrir = async (): Promise<Ponte> => {
    await carregarDados(opts.dadosSrc ?? "/js/data.js");
    const src = opts.motorSrc ?? "/js/motor/v2.js";
    const mod = opts.importar ? await opts.importar(src) : ((await import(/* @vite-ignore */ src)) as Hospedeiro);
    const r = await mod.abrirMotor();
    if ("semConta" in r) throw new Error("sessao");
    return r.ponte;
  };
  const p = await new Promise<Ponte>((resolve, reject) => {
    const watchdog = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    const onAbort = () => { clearTimeout(watchdog); reject(abortar()); };
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    abrir().then(
      (ponte) => { clearTimeout(watchdog); opts.signal?.removeEventListener("abort", onAbort); resolve(ponte); },
      (e) => { clearTimeout(watchdog); opts.signal?.removeEventListener("abort", onAbort); reject(e); },
    );
  });
  return {
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
    // Sem quadro: não há página para mostrar nem esconder.
    reveal: () => {},
    destroy: () => {},
  };
}
