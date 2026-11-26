// Disputa por minutos (PC-001, PROJETO.md regra 2). Sem elenco importado, o
// motor gera concorrentes fictícios, calibrados pela força do clube,
// persistidos no save e identificados como simulados.
import { forcaClube, type Catalogo } from "./catalogo.ts";
import { POS, type Posicao } from "./posicoes.ts";
import { clamp, rngFrom } from "./rng.ts";

export type Concorrente = {
  id: string;
  nome: string;
  idade: number;
  nivel: number;
  simulado: true;
};

export type Papel = "Titular" | "Rotação" | "Reserva" | "Promessa";

const PRENOMES = ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "J.", "L.", "M.", "N.", "P.", "R.", "S.", "T.", "V."];
const SOBRENOMES = ["Moraes", "Vidal", "Quintero", "Navarro", "Becker", "Rocha", "Duarte", "Ortiz", "Mendes", "Paredes", "Keller", "Bianco", "Lopes", "Ramos", "Fontaine", "Barros", "Cabral", "Medina"];

/** Dois concorrentes por função: o dono da vaga e o reserva imediato. */
export function gerarConcorrentes(cat: Catalogo, semente: string, clubeId: string, funcao: Posicao, ano: number): Concorrente[] {
  const r = rngFrom(semente, "concorrentes", clubeId, funcao, ano);
  const f = forcaClube(cat, clubeId);
  const goleiro = POS[funcao].setor === "GOL";
  const mk = (i: number, base: number): Concorrente => ({
    id: `${clubeId}-${funcao}-${ano}-${i}`,
    nome: `${r.pick(PRENOMES)} ${r.pick(SOBRENOMES)}`,
    idade: r.int(goleiro ? 21 : 19, goleiro ? 35 : 32),
    nivel: Math.round(clamp(r.normal(base, 2.5), 35, 95)),
    simulado: true,
  });
  return [mk(0, f), mk(1, f - 7)];
}

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** Chance de ser titular num jogo, dado o nível efetivo e os concorrentes. */
export function chanceTitular(efetivo: number, conc: readonly Concorrente[]): number {
  const [c1, c2] = [...conc].sort((a, b) => b.nivel - a.nivel);
  let p = 0.04 + 0.9 * sig((efetivo - (c1?.nivel ?? 0)) / 4.5);
  if (c2 && efetivo < c2.nivel) p *= 0.6;
  return clamp(p, 0.02, 0.96);
}

/** Chance de entrar no segundo tempo quando não é titular. */
export function chanceEntrar(efetivo: number, conc: readonly Concorrente[]): number {
  const c2 = [...conc].sort((a, b) => b.nivel - a.nivel)[1];
  return c2 && efetivo < c2.nivel ? 0.18 : 0.45;
}

/** Fração esperada dos minutos disputados (mesmo modelo da simulação). */
export function participacaoEsperada(efetivo: number, conc: readonly Concorrente[]): number {
  const t = chanceTitular(efetivo, conc);
  return t * 0.93 + (1 - t) * chanceEntrar(efetivo, conc) * 0.24;
}

/** Previsão em intervalo, arredondada a 5 pontos percentuais. */
export function intervaloMinutos(part: number): [number, number] {
  const arred = (x: number) => Math.round(clamp(x, 0, 1) * 20) * 5;
  const lo = arred(part - 0.1), hi = arred(part + 0.1);
  return [Math.min(lo, 90), Math.max(hi, lo + 10)];
}

export function papelPorParticipacao(part: number): Papel {
  if (part >= 0.62) return "Titular";
  if (part >= 0.38) return "Rotação";
  if (part >= 0.16) return "Reserva";
  return "Promessa";
}

/** Concorrente que mais disputa a vaga (para o motivo da conversa). */
export function principalConcorrente(conc: readonly Concorrente[]): Concorrente | undefined {
  return [...conc].sort((a, b) => b.nivel - a.nivel)[0];
}
