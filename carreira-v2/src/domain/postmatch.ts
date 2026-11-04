// Fase 4 (plano de independência) — pós-jogo pela v2. A ponte devolve a
// etapa pendente (coletiva → notícias da rodada → resultados da rodada →
// perna da Copa → proposta → fim, a ordem da versão anterior); aqui ela
// vira o que cada tela mostra. Só exibição, funções puras.
// Decisões de 04/11: efeito da coletiva só depois de responder; notícias da
// rodada no padrão "Nos bastidores."; Tabela só por "Ver tabela" dos
// resultados; proposta com Aceitar, Recusar e "Decidir depois".
import { moneyShort } from "./home.ts";
import { shortName } from "./lineup.ts";
import { CUP_PHASE_LABEL } from "./table.ts";

type TeamRef = { id: string; nome: string };
export type PostMatchStep =
  | { etapa: "nenhuma" | "fim" }
  | { etapa: "coletiva"; pergunta: string; respostas: { letra: string; texto: string }[] }
  | { etapa: "noticias"; rodada: number; manchetes: { texto: string; tipo: string; meu: boolean }[];
      financas: { salarios: number; patrocinio: number; parcelasPagas: number; parcelasRecebidas: number; caixa: number } }
  | { etapa: "resultados"; rodada: number; jogos: { mandante: TeamRef; visitante: TeamRef; gh: number; ga: number }[]; mudancas: string[];
      copa: null | { fase: string; perna: number | null; adiado: boolean; jogos: { mandante: TeamRef; visitante: TeamRef; gh: number | null; ga: number | null; penaltis: boolean }[] } }
  | { etapa: "copa"; fase: string; perna: number; adversario: string | null }
  | { etapa: "proposta"; jogador: { id: string; nome: string; posicao: string | null; idade: number | null; valorMercado: number | null };
      clube: { id: string; nome: string; sigla: string | null }; valor: number; parcelas: number };

// ---------- Coletiva ----------
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
// "Reputação +1 · Moral do elenco +3" — o efeito real da resposta, mostrado
// só depois de responder (decisão de 04/11).
export function pressEffect(rep: number | null, moral: number | null): string | null {
  if (rep == null && moral == null) return null;
  return `Reputação ${signed(rep || 0)} · Moral do elenco ${signed(moral || 0)}`;
}

// ---------- Notícias da rodada ----------
const NEWS_TAG: Record<string, string> = { lider: "Liderança", zebra: "Zebra", goleada: "Goleada", jejum_quebrado: "Fim de jejum", lanterna_reage: "Reação", empate_defendido: "Defesa do resultado", generico: "Rodada" };
export interface RoundNewsModel {
  sub: string;
  items: { key: string; title: string; meta: string; mine: boolean }[];
  finance: { label: string; value: string; tone?: "pos" | "neg" }[];
}
export function buildRoundNews(step: Extract<PostMatchStep, { etapa: "noticias" }>): RoundNewsModel {
  const f = step.financas;
  const finance: RoundNewsModel["finance"] = [];
  if (f.salarios) finance.push({ label: "Salários pagos", value: `−${moneyShort(f.salarios)}`, tone: "neg" });
  if (f.patrocinio) finance.push({ label: "Patrocínio", value: `+${moneyShort(f.patrocinio)}`, tone: "pos" });
  if (f.parcelasPagas) finance.push({ label: "Parcelas de contratação", value: `−${moneyShort(f.parcelasPagas)}`, tone: "neg" });
  if (f.parcelasRecebidas) finance.push({ label: "Parcelas de venda", value: `+${moneyShort(f.parcelasRecebidas)}`, tone: "pos" });
  finance.push({ label: "Caixa", value: moneyShort(f.caixa) });
  return {
    sub: `Rodada ${step.rodada} · as manchetes da rodada`,
    items: step.manchetes.map((n, i) => ({ key: `m${i}`, title: n.texto, meta: NEWS_TAG[n.tipo] || "Rodada", mine: n.meu })),
    finance,
  };
}

// ---------- Resultados da rodada ----------
export interface ResultRow { key: string; home: TeamRef; away: TeamRef; score: string; mine: boolean; note: string | null }
export interface RoundResultsModel {
  round: number;
  rows: ResultRow[];
  changes: string | null;
  cup: null | { title: string; rows: ResultRow[]; note: string | null };
}
const score = (gh: number | null, ga: number | null) => (gh == null || ga == null ? "— × —" : `${gh} – ${ga}`);
export function buildRoundResults(step: Extract<PostMatchStep, { etapa: "resultados" }>, myId: string): RoundResultsModel {
  const isMine = (a: TeamRef, b: TeamRef) => a.id === myId || b.id === myId;
  // Seu jogo primeiro (linha lima), os demais na ordem do motor.
  const rows = step.jogos.map((j, i) => ({ key: `r${i}`, home: j.mandante, away: j.visitante, score: score(j.gh, j.ga), mine: isMine(j.mandante, j.visitante), note: null }))
    .sort((a, b) => Number(b.mine) - Number(a.mine));
  const c = step.copa;
  return {
    round: step.rodada,
    rows,
    changes: step.mudancas.length ? `Mudanças no time para a próxima rodada: ${step.mudancas.join("; ")}.` : null,
    cup: c ? {
      title: `Copa do Brasil · ${CUP_PHASE_LABEL[c.fase] || c.fase}${c.perna ? ` · ${c.perna === 1 ? "Ida" : "Volta"}` : ""}`,
      rows: c.jogos.map((j, i) => ({ key: `c${i}`, home: j.mandante, away: j.visitante, score: score(j.gh, j.ga), mine: isMine(j.mandante, j.visitante), note: j.penaltis ? "Decidido nos pênaltis" : null })),
      note: c.adiado ? "Seu confronto é jogado agora, ao vivo." : null,
    } : null,
  };
}

// ---------- Perna da Copa ----------
export function cupLegTitle(step: Extract<PostMatchStep, { etapa: "copa" }>): { sub: string; line: string } {
  return {
    sub: `${CUP_PHASE_LABEL[step.fase] || step.fase} · ${step.perna === 2 ? "Volta" : "Ida"}`,
    line: step.adversario ? `Seu confronto contra o ${step.adversario} é jogado agora, ao vivo.` : "Seu confronto é jogado agora, ao vivo.",
  };
}

// ---------- Proposta por jogador ----------
export interface OfferModel {
  playerId: string; name: string; position: string | null; age: string | null;
  club: string; clubShort: string | null;
  fee: string; installments: string; market: string | null;
  diff: null | { text: string; tone: "pos" | "neg" | null };
}
export function buildOffer(step: Extract<PostMatchStep, { etapa: "proposta" }>): OfferModel {
  const j = step.jogador;
  const d = j.valorMercado != null ? step.valor - j.valorMercado : null;
  return {
    playerId: j.id, name: shortName(j.nome), position: j.posicao, age: j.idade != null ? `${j.idade} anos` : null,
    club: step.clube.nome, clubShort: step.clube.sigla,
    fee: moneyShort(step.valor),
    installments: step.parcelas > 1 ? `${step.parcelas}x` : "À vista",
    market: j.valorMercado != null ? moneyShort(j.valorMercado) : null,
    diff: d == null ? null : { text: d === 0 ? "R$ 0" : `${d > 0 ? "+" : "−"}${moneyShort(Math.abs(d))}`, tone: d > 0 ? "pos" : d < 0 ? "neg" : null },
  };
}
