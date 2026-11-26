// Termos financeiros do Primeiro Contrato (PC-003). Estimativas do jogo.
//
// Fallback documentado: o primeiro-contrato não lê o modelo financeiro do
// Modo Técnico. O salário de referência sai do nível da liga (a mesma escala
// de `nivelLiga`, que ordena ligas e divisões do catálogo) e do papel do
// atleta, com faixa de ±20% por função. Valores mensais, na moeda do país do
// clube, convertidos de uma base em euros por câmbio fixo.
import { nivelLiga, type Catalogo } from "./catalogo.ts";
import type { Papel } from "./elenco.ts";
import type { Dinheiro, Moeda } from "./estado.ts";
import { clamp } from "./rng.ts";

const MOEDA_PAIS: Record<string, Moeda> = {
  Brasil: "BRL", Inglaterra: "GBP",
  Alemanha: "EUR", Espanha: "EUR", "França": "EUR", "Itália": "EUR",
  Argentina: "USD", Chile: "USD", "Colômbia": "USD", Equador: "USD", Uruguai: "USD",
};
const CAMBIO_EUR: Record<Moeda, number> = { EUR: 1, BRL: 6.2, GBP: 0.85, USD: 1.08 };
const SIMBOLO: Record<Moeda, string> = { BRL: "R$", EUR: "€", GBP: "£", USD: "US$" };
const FATOR_PAPEL: Record<Papel, number> = { Titular: 1, "Rotação": 0.7, Reserva: 0.5, Promessa: 0.35 };

export function moedaDoClube(cat: Catalogo, clubeId: string): Moeda {
  const c = cat.clube(clubeId);
  const l = c && cat.liga(c.ligaId);
  return (l && MOEDA_PAIS[l.pais]) || "EUR";
}

/** Salário mensal de referência de um titular da liga (€ mil). */
export function referenciaLigaEurMil(nivel: number): number {
  return 1.9 * Math.pow(1.105, nivel - 46);
}

/** Faixa salarial mensal da função no clube (piso, referência, teto). */
export function faixaSalarial(cat: Catalogo, clubeId: string, papel: Papel, nivelAtleta: number) {
  const c = cat.clube(clubeId);
  const nl = nivelLiga(c && cat.liga(c.ligaId));
  const moeda = moedaDoClube(cat, clubeId);
  const qualidade = clamp(Math.pow(1.06, nivelAtleta - nl), 0.55, 2.5);
  const refEur = referenciaLigaEurMil(nl) * FATOR_PAPEL[papel] * qualidade * 1000;
  const conv = (v: number): Dinheiro => ({ valor: arredondar(v * CAMBIO_EUR[moeda]), moeda });
  return { piso: conv(refEur * 0.8), ref: conv(refEur), teto: conv(refEur * 1.2), moeda };
}

/** Arredonda para 2 algarismos significativos (leitura rápida). */
export function arredondar(v: number): number {
  if (v <= 0) return 0;
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1));
  return Math.round(v / p) * p;
}

export function formatarDinheiro(d: Dinheiro | null | undefined, periodo = "/mês"): string {
  if (!d) return "não mapeado";
  const v = d.valor;
  const txt = v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
      : v.toLocaleString("pt-BR");
  return `${SIMBOLO[d.moeda]} ${txt}${periodo}`;
}

/** Valor em euros (para comparar salários entre países). */
export function emEuros(d: Dinheiro | null | undefined): number {
  return d ? d.valor / CAMBIO_EUR[d.moeda] : 0;
}
