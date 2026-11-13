// OFFLINE-001 (13/11/2026): a carreira mora no aparelho (IndexedDB), com
// cópia no servidor quando há rede e conta (decisão do Murilo: o save do
// aparelho é o principal). O mesmo módulo do motor (public/js/motor/
// repositorio.js), com a instância da tela. Sem IndexedDB, null: os
// gateways seguem pelo servidor, como antes.
// @ts-expect-error módulo JS do motor (sem tipos)
import { conferirArquivo, criarRepositorio } from "../../../public/js/motor/repositorio.js";

export interface Repo {
  disponivel(): Promise<boolean>;
  conta(): Promise<{ user: Record<string, unknown> & { id: string; name: string }; online: boolean; local: boolean } | null>;
  ler(conta: string): Promise<{ career: unknown; origem: string; rev: number; pendente: boolean; offline?: boolean }>;
  gravar(conta: string, save: unknown, opts?: { revEsperada?: number }): Promise<{ ok: true; rev: number; copia: string } | { ok: false; motivo: string }>;
  apagar(conta: string): Promise<{ ok: true }>;
  copiarParaServidor(conta: string): Promise<string>;
  atualizarCatalogo(): Promise<string>;
  partidaPendente(conta: string): Promise<unknown | null>;
  exportar(conta: string): Promise<{ resumo: { clube: string | null; temporada: number | null; rodada: number | null } } | null>;
  importar(conta: string, save: unknown): Promise<{ ok: boolean; motivo?: string; copia?: string }>;
  copiaDoServidor(): Promise<{ ok: boolean; motivo?: string; career?: { clubName?: string; seasonYear?: number; currentRound?: number; updatedAt?: number } | null }>;
  trazerDoServidor(conta: string): Promise<{ ok: boolean; motivo?: string }>;
  situacaoDaCopia(conta: string): Promise<"em-dia" | "pendente" | "conflito" | "sem-carreira">;
  enviarDoAparelho(conta: string): Promise<{ ok: boolean; motivo?: string }>;
  nomeLocal(nome: string): Promise<(Record<string, unknown> & { id: string; name: string }) | null>;
  versao(conta: string): Promise<number | null>;
  registro(conta: string): Promise<{ save: unknown; rev: number; hash: string; sincronizado: string | null } | null>;
  guardar(conta: string, save: unknown, extra?: { sincronizado?: string | null; rev?: number }): Promise<unknown>;
}

let repo: Promise<Repo | null> | null = null;
export function localRepo(): Promise<Repo | null> {
  if (!repo) {
    const r = criarRepositorio() as Repo;
    repo = r.disponivel().then((ok) => (ok ? r : null), () => null);
  }
  return repo;
}

// Conta atual (a que a tela abriu): a chave do save no aparelho.
let contaAtual: string | null = null;
export function definirContaAtual(id: string | null) { contaAtual = id; }
export function contaAtualId(): string | null { return contaAtual; }

// Uma aba por carreira (OFFLINE-001): com o save no aparelho, duas abas
// abertas gravariam uma por cima da outra (a mais velha desfaria a rodada
// jogada na outra). A aba que abre por último toma a vez (Web Lock da conta,
// com steal); a outra mostra "aberta em outra aba" e pode tomar a vez de
// volta ("Jogar aqui"). A que perdeu a vez para de gravar (o repositório
// recusa: motivo "outra-aba").
// Sem Web Locks (navegador antigo), segue como antes.
type Locks = { request(name: string, opts: object, cb: (lock: unknown) => unknown): Promise<unknown> };
function marcarAba(ativa: boolean) { (globalThis as { __BRDATA_ABA_ATIVA__?: boolean }).__BRDATA_ABA_ATIVA__ = ativa; }
export function travarAba(conta: string, aoPerder: () => void, tomar = true): Promise<boolean> {
  const locks = (typeof navigator !== "undefined" ? (navigator as unknown as { locks?: Locks }).locks : undefined);
  if (!locks) return Promise.resolve(true);
  return new Promise((resolve) => {
    locks.request(`brdata-carreira:${conta}`, tomar ? { steal: true } : { ifAvailable: true }, (lock) => {
      if (!lock) { resolve(false); return; }
      marcarAba(true); resolve(true);
      return new Promise(() => {}); // segura enquanto a aba existir
    }).catch(() => { marcarAba(false); aoPerder(); });
  });
}

// Arquivo lido pelo técnico (importar): confere formato, versão e integridade.
export function conferirArquivoDaCarreira(obj: unknown): { ok: true; save: unknown } | { ok: false; motivo: string } {
  return conferirArquivo(obj) as { ok: true; save: unknown } | { ok: false; motivo: string };
}
// Pede ao navegador para não apagar os dados do jogo sozinho (pouco espaço).
export async function pedirArmazenamentoPersistente(): Promise<boolean | null> {
  try {
    const st = (navigator as unknown as { storage?: { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> } }).storage;
    if (!st || !st.persist) return null;
    if (st.persisted && (await st.persisted())) return true;
    return await st.persist();
  } catch { return null; }
}
