// OFFLINE-001 (13/11/2026): a carreira mora no aparelho (IndexedDB), com
// cópia no servidor quando há rede e conta (decisão do Murilo: o save do
// aparelho é o principal). O mesmo módulo do motor (public/js/motor/
// repositorio.js), com a instância da tela. Sem IndexedDB, null: os
// gateways seguem pelo servidor, como antes.
// @ts-expect-error módulo JS do motor (sem tipos)
import { criarRepositorio } from "../../../public/js/motor/repositorio.js";

export interface Repo {
  disponivel(): Promise<boolean>;
  conta(): Promise<{ user: Record<string, unknown> & { id: string; name: string }; online: boolean; local: boolean } | null>;
  ler(conta: string): Promise<{ career: unknown; origem: string; rev: number; pendente: boolean; offline?: boolean }>;
  gravar(conta: string, save: unknown, opts?: { revEsperada?: number }): Promise<{ ok: true; rev: number; copia: string } | { ok: false; motivo: string }>;
  apagar(conta: string): Promise<{ ok: true }>;
  copiarParaServidor(conta: string): Promise<string>;
  atualizarCatalogo(): Promise<string>;
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
