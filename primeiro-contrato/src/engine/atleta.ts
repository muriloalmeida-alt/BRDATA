// Atleta fictício: criação por semente estável e evolução por idade e
// minutos (PC-001, PROJETO.md regras 1 e 6).
import { POS, type Posicao } from "./posicoes.ts";
import { clamp, rngFrom } from "./rng.ts";

export type Nacionalidade = {
  id: string;
  nome: string;
  selecao: string; // "Seleção Brasileira"
  confederacao: string;
  tradicao: number; // 0..1: quanto mais forte a seleção, maior a exigência
  idioma: "pt" | "es" | "en" | "de" | "fr" | "it";
  locales: string[];
};

export const NACIONALIDADES: readonly Nacionalidade[] = [
  { id: "BR", nome: "Brasil", selecao: "Seleção Brasileira", confederacao: "CONMEBOL", tradicao: 1, idioma: "pt", locales: ["pt-BR"] },
  { id: "AR", nome: "Argentina", selecao: "Seleção Argentina", confederacao: "CONMEBOL", tradicao: 1, idioma: "es", locales: ["es-AR"] },
  { id: "UY", nome: "Uruguai", selecao: "Seleção Uruguaia", confederacao: "CONMEBOL", tradicao: 0.75, idioma: "es", locales: ["es-UY"] },
  { id: "CO", nome: "Colômbia", selecao: "Seleção Colombiana", confederacao: "CONMEBOL", tradicao: 0.7, idioma: "es", locales: ["es-CO"] },
  { id: "CL", nome: "Chile", selecao: "Seleção Chilena", confederacao: "CONMEBOL", tradicao: 0.6, idioma: "es", locales: ["es-CL"] },
  { id: "EC", nome: "Equador", selecao: "Seleção Equatoriana", confederacao: "CONMEBOL", tradicao: 0.6, idioma: "es", locales: ["es-EC"] },
  { id: "PY", nome: "Paraguai", selecao: "Seleção Paraguaia", confederacao: "CONMEBOL", tradicao: 0.55, idioma: "es", locales: ["es-PY"] },
  { id: "PE", nome: "Peru", selecao: "Seleção Peruana", confederacao: "CONMEBOL", tradicao: 0.5, idioma: "es", locales: ["es-PE"] },
  { id: "VE", nome: "Venezuela", selecao: "Seleção Venezuelana", confederacao: "CONMEBOL", tradicao: 0.45, idioma: "es", locales: ["es-VE"] },
  { id: "BO", nome: "Bolívia", selecao: "Seleção Boliviana", confederacao: "CONMEBOL", tradicao: 0.35, idioma: "es", locales: ["es-BO"] },
  { id: "PT", nome: "Portugal", selecao: "Seleção Portuguesa", confederacao: "UEFA", tradicao: 0.9, idioma: "pt", locales: ["pt-PT"] },
  { id: "ES", nome: "Espanha", selecao: "Seleção Espanhola", confederacao: "UEFA", tradicao: 1, idioma: "es", locales: ["es-ES", "es"] },
  { id: "FR", nome: "França", selecao: "Seleção Francesa", confederacao: "UEFA", tradicao: 1, idioma: "fr", locales: ["fr-FR", "fr"] },
  { id: "DE", nome: "Alemanha", selecao: "Seleção Alemã", confederacao: "UEFA", tradicao: 1, idioma: "de", locales: ["de-DE", "de"] },
  { id: "IT", nome: "Itália", selecao: "Seleção Italiana", confederacao: "UEFA", tradicao: 0.95, idioma: "it", locales: ["it-IT", "it"] },
  { id: "GB-ENG", nome: "Inglaterra", selecao: "Seleção Inglesa", confederacao: "UEFA", tradicao: 0.95, idioma: "en", locales: ["en-GB"] },
  { id: "NL", nome: "Países Baixos", selecao: "Seleção Neerlandesa", confederacao: "UEFA", tradicao: 0.85, idioma: "en", locales: ["nl-NL", "nl"] },
  { id: "BE", nome: "Bélgica", selecao: "Seleção Belga", confederacao: "UEFA", tradicao: 0.8, idioma: "fr", locales: ["nl-BE", "fr-BE"] },
  { id: "HR", nome: "Croácia", selecao: "Seleção Croata", confederacao: "UEFA", tradicao: 0.75, idioma: "en", locales: ["hr-HR", "hr"] },
  { id: "US", nome: "Estados Unidos", selecao: "Seleção dos Estados Unidos", confederacao: "CONCACAF", tradicao: 0.55, idioma: "en", locales: ["en-US"] },
  { id: "MX", nome: "México", selecao: "Seleção Mexicana", confederacao: "CONCACAF", tradicao: 0.6, idioma: "es", locales: ["es-MX"] },
  { id: "MA", nome: "Marrocos", selecao: "Seleção Marroquina", confederacao: "CAF", tradicao: 0.65, idioma: "fr", locales: ["ar-MA", "fr-MA"] },
  { id: "SN", nome: "Senegal", selecao: "Seleção Senegalesa", confederacao: "CAF", tradicao: 0.6, idioma: "fr", locales: ["fr-SN"] },
  { id: "NG", nome: "Nigéria", selecao: "Seleção Nigeriana", confederacao: "CAF", tradicao: 0.55, idioma: "en", locales: ["en-NG"] },
  { id: "AO", nome: "Angola", selecao: "Seleção Angolana", confederacao: "CAF", tradicao: 0.35, idioma: "pt", locales: ["pt-AO"] },
  { id: "JP", nome: "Japão", selecao: "Seleção Japonesa", confederacao: "AFC", tradicao: 0.6, idioma: "en", locales: ["ja-JP", "ja"] },
  { id: "KR", nome: "Coreia do Sul", selecao: "Seleção Sul-Coreana", confederacao: "AFC", tradicao: 0.55, idioma: "en", locales: ["ko-KR", "ko"] },
  { id: "AU", nome: "Austrália", selecao: "Seleção Australiana", confederacao: "AFC", tradicao: 0.45, idioma: "en", locales: ["en-AU"] },
];

export const NAC = Object.fromEntries(NACIONALIDADES.map((n) => [n.id, n])) as Record<string, Nacionalidade>;

/** Nacionalidade sugerida pelo idioma do aparelho (o jogador pode trocar). */
export function sugerirNacionalidade(idiomas: readonly string[]): string {
  for (const lang of idiomas) {
    const n = NACIONALIDADES.find((x) => x.locales.some((l) => l.toLowerCase() === lang.toLowerCase()));
    if (n) return n.id;
  }
  for (const lang of idiomas) {
    const base = lang.slice(0, 2).toLowerCase();
    const n = NACIONALIDADES.find((x) => x.locales.some((l) => l.slice(0, 2).toLowerCase() === base));
    if (n) return n.id;
  }
  return "BR";
}

const SOBRENOMES: Record<Nacionalidade["idioma"], string[]> = {
  pt: ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Lima", "Araújo", "Ferreira", "Carvalho", "Gomes", "Ribeiro", "Martins"],
  es: ["García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Romero", "Díaz", "Álvarez", "Torres", "Suárez", "Herrera"],
  en: ["Smith", "Johnson", "Walker", "Taylor", "Brown", "Wilson", "Clarke", "Hughes", "Wright", "Turner", "Baker", "Hill"],
  de: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Becker", "Wagner", "Hoffmann", "Koch", "Richter"],
  fr: ["Martin", "Bernard", "Dubois", "Durand", "Lefebvre", "Moreau", "Laurent", "Simon", "Michel", "Garnier"],
  it: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco"],
};
const INICIAIS = "ABCDEFGHIJLMNPRSTV";

export type Atleta = {
  apelido: string | null;
  nomeGerado: string; // "R. Silva", usado quando não há apelido
  nacionalidade: string;
  numero: number;
  posicao: Posicao; // posição de origem
  anoNascimento: number;
  nivel: number; // 0–100 (simulado)
  potencial: number; // teto (simulado)
  forma: number; // -1..1
  familiaridade: Partial<Record<Posicao, number>>; // 0..1
  // PC-002
  confianca: number; // 0..1, avaliação esportiva no clube atual
  reputacao: number; // 0..100, efeito lento de feitos, competição e cobertura
  cobertura: number; // entrevistas e repercussão acumuladas
  expectativa: number; // expectativa pública (0..3)
};

export function nomeExibicao(a: Atleta): string {
  return (a.apelido && a.apelido.trim()) || a.nomeGerado;
}

export const IDADE_INICIAL = 16;

/** Perfis próprios de goleiro e de linha (nível inicial e potencial). */
export function criarAtleta(semente: string, p: { apelido?: string | null; nacionalidade: string; numero: number; posicao: Posicao; anoInicio: number }): Atleta {
  const r = rngFrom(semente, "atleta");
  const goleiro = POS[p.posicao].setor === "GOL";
  const nivel = Math.round(goleiro ? r.range(42, 52) : r.range(45, 56));
  const potencial = Math.round(clamp(goleiro ? r.normal(80, 6) : r.normal(80, 7), 66, 94));
  const nac = NAC[p.nacionalidade] ?? NAC.BR;
  const sobrenomes = SOBRENOMES[nac.idioma];
  const nomeGerado = `${INICIAIS[r.int(0, INICIAIS.length - 1)]}. ${r.pick(sobrenomes)}`;
  const apelido = p.apelido && p.apelido.trim() ? p.apelido.trim().slice(0, 24) : null;
  return {
    apelido, nomeGerado, nacionalidade: nac.id,
    numero: clamp(Math.round(p.numero), 1, 99), posicao: p.posicao,
    anoNascimento: p.anoInicio - IDADE_INICIAL,
    nivel, potencial, forma: 0,
    familiaridade: { [p.posicao]: 1 },
    confianca: 0.5, reputacao: 5, cobertura: 0, expectativa: 0,
  };
}

/** Pico e declínio por posição: goleiro amadurece e cai mais tarde. */
export function fasesIdade(pos: Posicao): { pico: number; declinio: number } {
  return POS[pos].setor === "GOL" ? { pico: 30, declinio: 33 } : { pico: 27, declinio: 30 };
}

/**
 * Evolução de uma temporada. Quanto mais perto do potencial, menor o ganho
 * marginal; minutos e treino aceleram; depois do pico, declínio gradual.
 * Devolve o delta inteiro aplicado ao nível.
 */
export function evoluir(a: Atleta, idade: number, participacao: number, bonusTreino: number, semente: string, ano: number): number {
  const r = rngFrom(semente, "evolucao", ano);
  const { pico, declinio } = fasesIdade(a.posicao);
  let delta: number;
  if (idade < pico) {
    const ritmo = idade <= 19 ? 0.24 : idade <= 22 ? 0.18 : idade <= 24 ? 0.12 : 0.07;
    const espaco = Math.max(0, a.potencial - a.nivel);
    delta = espaco * ritmo * (0.45 + 0.85 * participacao) * (1 + bonusTreino) + r.normal(0, 0.8);
  } else if (idade < declinio) {
    delta = r.normal(0.2, 0.7) + (participacao - 0.5);
  } else {
    delta = -(1 + (idade - declinio) * 0.7) + r.normal(0, 0.7) + participacao * 0.6;
  }
  const novo = clamp(Math.round(a.nivel + delta), 30, Math.max(a.potencial, a.nivel));
  const d = novo - a.nivel;
  a.nivel = novo;
  return d;
}

/** Nível efetivo numa função: penalidade pela falta de familiaridade. */
export function nivelNaFuncao(a: Atleta, funcao: Posicao): number {
  const fam = a.familiaridade[funcao] ?? 0;
  return a.nivel - (1 - fam) * 9 + a.forma * 3 + ((a.confianca ?? 0.5) - 0.5) * 6;
}

/** Confiança de partida num clube novo, pelo papel previsto. */
export function confiancaInicial(papel: string): number {
  return papel === "Titular" ? 0.6 : papel === "Rotação" ? 0.5 : papel === "Reserva" ? 0.42 : 0.38;
}
