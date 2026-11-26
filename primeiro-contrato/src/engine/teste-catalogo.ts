// Catálogo de teste: o snapshot publicado (lido do disco, só nos testes).
import { readFileSync } from "node:fs";
import { indexarCatalogo, type Catalogo, type Snapshot } from "./catalogo.ts";

let cache: Catalogo | null = null;
export function catalogoDeTeste(): Catalogo {
  if (cache) return cache;
  const ativo = JSON.parse(readFileSync(new URL("../../public/catalogo/ativo.json", import.meta.url), "utf8"));
  const snap = JSON.parse(readFileSync(new URL(`../../public/catalogo/${ativo.arquivo}`, import.meta.url), "utf8")) as Snapshot;
  cache = indexarCatalogo(snap);
  return cache;
}
