// Comissão técnica — sugestões rápidas para o próximo jogo (05/11). Os
// comandos da ponte (carreira.js: comissaoSugestoes, comissaoAplicar,
// comissaoDesfazer) calculam com as regras do motor e gravam pela mesma
// persistência das outras telas.
import { engine } from "./engine.ts";
import type { Res } from "./prep.ts";

export type Categoria = "escalacao" | "formacao" | "postura";
export interface Sugestao {
  categoria: Categoria;
  estado: "mudanca" | "manter" | "sem-dados";
  resumo?: string; motivo?: string; nota?: string; chave: string;
  detalhe?: {
    slot?: number; sai?: { id: string; nome: string } | null; entra?: { id: string; nome: string };
    de?: string; para?: string; entram?: string[]; saem?: string[];
    nivel?: number; nome?: string;
  };
}
export interface Sugestoes { contratada: boolean; jogo: null | { adversario: string; casa: boolean; rodada: number }; itens: Sugestao[] }
export type Desfazer = { categoria: Categoria; resumo: string; [k: string]: unknown };

const SAFE = new Set(["desatualizada", "sem-sugestao", "mudou", "partida"]);
async function run<T>(name: string, ...args: unknown[]): Promise<Res<T>> {
  try {
    const s = await engine.get();
    const r = await s.run<Res<T> | Promise<Res<T>>>(name, ...args);
    if (!r.ok && !SAFE.has(r.motivo || "")) engine.reset();
    return r;
  } catch {
    engine.reset();
    return { ok: false, motivo: "falha" };
  }
}
export const ComissaoGateway = {
  sugestoes: () => run<Sugestoes>("comissaoSugestoes"),
  aplicar: (cat: Categoria, chave: string) => run<Sugestoes & { desfazer: Desfazer }>("comissaoAplicar", cat, chave),
  desfazer: (d: Desfazer) => run<Sugestoes>("comissaoDesfazer", d),
};
