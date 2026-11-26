// Migração e validação do save (PC-001). Versões antigas continuam legíveis:
// cada migração é explícita (v0 → v1 → …) e nunca depende de campo solto.
import { SCHEMA_VERSAO, type Carreira } from "./estado.ts";

type Migracao = (s: Record<string, unknown>) => Record<string, unknown>;

/** MIGRACOES[n] leva um save da versão n para n + 1. */
const MIGRACOES: Record<number, Migracao> = {
  // v0: protótipo sem `schema` nem `chavesUsadas`.
  0: (s) => ({ ...s, schema: 1, chavesUsadas: Array.isArray(s.chavesUsadas) ? s.chavesUsadas : [], clubesDeInteresse: s.clubesDeInteresse ?? [], ultimaConsequencia: null }),
  // v1 → v2 (PC-002): confiança, reputação e cobertura no atleta; registro
  // por partida na temporada. Temporadas antigas ficam com origem "resumo";
  // a temporada em andamento guarda quantos jogos vieram sem registro.
  1: (s) => {
    const hist = Array.isArray(s.historico) ? (s.historico as Array<Record<string, unknown>>) : [];
    const atleta = (s.atleta ?? {}) as Record<string, unknown>;
    const repHist = hist.reduce((acc, h) => acc * 0.96 + (Number(h.participacao) || 0) * 3 + ((Number(h.stats && (h.stats as Record<string, number>).gols) || 0) * 0.12), 5);
    const t = s.temporada as Record<string, unknown> | null;
    return {
      ...s, schema: 2, rumor: null,
      atleta: { ...atleta, confianca: typeof atleta.confianca === "number" ? atleta.confianca : 0.5, reputacao: typeof atleta.reputacao === "number" ? atleta.reputacao : Math.round(repHist * 10) / 10, cobertura: atleta.cobertura ?? 0, expectativa: atleta.expectativa ?? 0 },
      historico: hist.map((h) => ({ ...h, origem: h.origem ?? "resumo" })),
      temporada: t ? {
        ...t, participantes: Array.isArray(t.participantes) ? t.participantes : [], partidas: Array.isArray(t.partidas) ? t.partidas : [],
        exibidos: typeof t.exibidos === "number" ? t.exibidos : 0, interrupcoes: t.interrupcoes ?? 0,
        origemParcial: typeof t.origemParcial === "number" ? t.origemParcial : Number(t.jogoAtual) || 0,
      } : null,
    };
  },
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
