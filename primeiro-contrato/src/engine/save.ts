// Migração e validação do save (PC-001). Versões antigas continuam legíveis:
// cada migração é explícita (v0 → v1 → …) e nunca depende de campo solto.
import { SCHEMA_VERSAO, type Carreira } from "./estado.ts";

type Migracao = (s: Record<string, unknown>) => Record<string, unknown>;

/** MIGRACOES[n] leva um save da versão n para n + 1. */
const MIGRACOES: Record<number, Migracao> = {
  // v0: protótipo sem `schema` nem `chavesUsadas`.
  0: (s) => ({ ...s, schema: 1, chavesUsadas: Array.isArray(s.chavesUsadas) ? s.chavesUsadas : [], clubesDeInteresse: s.clubesDeInteresse ?? [], ultimaConsequencia: null }),
};

export function migrarSave(bruto: unknown): Carreira | null {
  if (!bruto || typeof bruto !== "object") return null;
  let s = bruto as Record<string, unknown>;
  let v = typeof s.schema === "number" ? s.schema : 0;
  if (v > SCHEMA_VERSAO) return null; // save de uma versão mais nova do app
  while (v < SCHEMA_VERSAO) {
    const m = MIGRACOES[v];
    if (!m) return null;
    s = m(s);
    v = s.schema as number;
  }
  const c = s as unknown as Carreira;
  if (typeof c.semente !== "string" || !c.atleta || typeof c.ano !== "number" || !Array.isArray(c.historico)) return null;
  return c;
}
