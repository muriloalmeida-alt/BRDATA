// Tutorial de boas-vindas, assistente de início e título da temporada
// (item 1 do diagnóstico de 05/11, P8). Regras da versão anterior
// (ONBOARDING_SLIDES, STARTUP_WIZARD_STEPS, showSeasonModal em
// carreira.js), com os textos adaptados à navegação da v2 (decisão de 05/11).
import type { Career } from "./types.ts";
// Caminhos na raiz (BASE "" desde a fase 11); o domínio não importa o router.
const BASE = "";

export interface Slide { icon: "escudo" | "grade" | "play" | "taca"; title: string; text: string }
export const TUTORIAL: Slide[] = [
  { icon: "escudo", title: "Bem-vindo ao Modo Técnico.", text: "Você assume o comando de um clube do futebol brasileiro. Monte o elenco, defina a tática e jogue cada rodada: as decisões são suas, o resultado também." },
  { icon: "grade", title: "Sua central de comando.", text: "O Início traz o próximo jogo e o que precisa da sua atenção. Elenco, Jogos e Mais ficam na barra de baixo; Clube, no Início, reúne diretoria, finanças, mercado e estrutura." },
  { icon: "play", title: "Como funciona uma rodada.", text: "Toque em \"Preparar partida\", confira a escalação e acompanhe o jogo ao vivo. Dá para ajustar a tática e fazer substituições no meio da partida, e o resultado muda de verdade." },
  { icon: "taca", title: "Construa seu legado.", text: "Cumpra os objetivos da diretoria, desbloqueie conquistas e suba no ranking dos técnicos. Boa sorte: o vestiário já está te esperando." },
];

// Assistente: os 4 passos da versão anterior, cada um abrindo a tela da v2
// que já existe (decisão de 05/11: sequência guiada).
export interface WizardStep { n: number; title: string; path: string }
export const WIZARD: WizardStep[] = [
  { n: 1, title: "Monte sua formação favorita", path: `${BASE}/escalacao` },
  { n: 2, title: "Comissão técnica", path: `${BASE}/comissao` },
  { n: 3, title: "Contrate olheiros", path: `${BASE}/olheiros/contratar` },
  { n: 4, title: "Táticas básicas", path: `${BASE}/tatica/instrucoes` },
];
export const wizardUrl = (n: number) => `${WIZARD[n - 1].path}?assistente=${n}`;
export function wizardStepOf(search: string): WizardStep | null {
  const n = Number(new URLSearchParams(search).get("assistente"));
  return Number.isInteger(n) && n >= 1 && n <= WIZARD.length ? WIZARD[n - 1] : null;
}

// Abre em carreira nova (startupWizardSeen === false), só na pré-temporada:
// carreira que já jogou partida oficial não é interrompida (decisão de 05/11).
export function wizardPending(c: Pick<Career, "startupWizardSeen" | "careerTotals" | "matchLog">): boolean {
  if (c.startupWizardSeen !== false) return false;
  return !((c.careerTotals?.j || 0) > 0 || (c.matchLog || []).length > 0);
}

// O que abre sozinho ao entrar, nesta ordem (como na versão anterior):
// tutorial (1ª carreira da conta) → assistente (carreira nova) → recompensa.
export function autoOpen(o: { tutorialSeen: boolean; wizard: boolean; reward: boolean }): string | null {
  if (!o.tutorialSeen) return `${BASE}/boas-vindas`;
  if (o.wizard) return wizardUrl(1);
  if (o.reward) return `${BASE}/recompensa`;
  return null;
}

// Título da temporada encerrada: campeonato (1º lugar, com o nome da série)
// e/ou Copa do Brasil. Com os dois, um botão para cada (decisão de 05/11).
export type TitleKind = "brasileirao" | "serie_b" | "serie_c" | "copa";
export const TITLE_HEAD: Record<TitleKind, string> = {
  brasileirao: "CAMPEÃO BRASILEIRO", serie_b: "CAMPEÃO DA SÉRIE B", serie_c: "CAMPEÃO DA SÉRIE C", copa: "CAMPEÃO DA COPA DO BRASIL",
};
export const TITLE_LABEL: Record<TitleKind, string> = {
  brasileirao: "Campeão brasileiro", serie_b: "Campeão da Série B", serie_c: "Campeão da Série C", copa: "Campeão da Copa do Brasil",
};
export const TITLE_TEXT: Record<TitleKind, string> = {
  brasileirao: "campeão brasileiro", serie_b: "campeão da Série B", serie_c: "campeão da Série C", copa: "campeão da Copa do Brasil",
};
export function seasonTitles(c: Pick<Career, "competitionId" | "cup">, position: number | null): TitleKind[] {
  const out: TitleKind[] = [];
  const comp = c.competitionId || "brasileirao";
  if (position === 1 && (comp === "brasileirao" || comp === "serie_b" || comp === "serie_c")) out.push(comp);
  if (c.cup && c.cup.championIsHuman) out.push("copa");
  return out;
}
