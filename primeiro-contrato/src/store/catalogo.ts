// Carregamento do catálogo publicado (PC-001). O ponteiro `ativo.json` indica a
// versão vigente; versões antigas continuam publicadas para saves antigos.
import { indexarCatalogo, type Catalogo, type Snapshot } from "../engine/catalogo.ts";

const BASE = `${import.meta.env.BASE_URL}catalogo/`;
const cache = new Map<string, Promise<Catalogo>>();

async function baixar(arquivo: string): Promise<Catalogo> {
  const r = await fetch(BASE + arquivo, { cache: "force-cache" });
  if (!r.ok) throw new Error(`catálogo ${arquivo}: HTTP ${r.status}`);
  return indexarCatalogo((await r.json()) as Snapshot);
}

export async function catalogoAtivo(): Promise<Catalogo> {
  const r = await fetch(BASE + "ativo.json", { cache: "no-cache" });
  if (!r.ok) throw new Error(`ponteiro do catálogo: HTTP ${r.status}`);
  const { arquivo } = (await r.json()) as { versao: string; arquivo: string };
  if (!cache.has(arquivo)) cache.set(arquivo, baixar(arquivo).catch((e) => { cache.delete(arquivo); throw e; }));
  return cache.get(arquivo)!;
}

/** Catálogo da versão do save; se não existir mais, o ativo (o save guarda
 *  cópias dos nomes e continua legível). */
export async function catalogoDoSave(versao: string): Promise<Catalogo> {
  const arquivo = `${versao}.json`;
  if (!cache.has(arquivo)) cache.set(arquivo, baixar(arquivo).catch((e) => { cache.delete(arquivo); throw e; }));
  try { return await cache.get(arquivo)!; } catch { return catalogoAtivo(); }
}
