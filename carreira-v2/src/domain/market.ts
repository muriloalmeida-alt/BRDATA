// Fase 8 (plano de independência) — mercado. Funções puras, só exibição, a
// partir do save e da leitura `mercado` da ponte (janela, clubes do mercado,
// recusas de empréstimo). Quem decide tudo é o motor (carreira.js).
// Pranchas: complemento 33 (Mercado e filtros), 34 (Perfil do alvo, Fazer
// proposta, Negociação), 35 (Minhas propostas, Comparar propostas, Colocar à
// venda), 36 (Minhas vendas, Empréstimo entrada/saída), 37 (Confirmar compra,
// Histórico). Decisões de 04/11: só reforços na lista; filtros da prancha +
// clube e ordenação; aumentar com valor livre (também na contraproposta);
// empréstimo de saída como o jogo; histórico em abas com a frase do jogo;
// propostas da venda: escolher (com confirmação), recusar todas ou uma;
// confirmação da compra; proposta pendente no Mercado.
import type { Career, OfferOut, Player, PlayerGroup } from "./types.ts";
import { moneyShort } from "./home.ts";
import { shortName, sortKey } from "./lineup.ts";
import { POSITION } from "./squadplus.ts";
import { potentialText } from "./potential.ts";

export interface MarketInfo {
  janela: { aberta: boolean; texto: string };
  multi: boolean;
  clubes: { id: string; nome: string; sigla: string | null; divisao: string }[];
  desconto: number;
  parcelas: number[];
  esperaRodadas: number;
  recusaEmprestimo: string[];
}
export const DIVISION: Record<string, string> = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------- Lista e filtros (CAP05-T01) ----------
export type MarketSort = "valor" | "overall" | "idade";
export interface Range { min: number | null; max: number | null }
export interface MarketFilters { q: string; pos: "todas" | PlayerGroup; div: string; club: string; ovr: Range; age: Range; val: Range; sort: MarketSort }
export const NO_MARKET_FILTERS: MarketFilters = { q: "", pos: "todas", div: "", club: "", ovr: { min: null, max: null }, age: { min: null, max: null }, val: { min: null, max: null }, sort: "valor" };
const rangeOn = (r: Range) => r.min != null || r.max != null;
const inRange = (v: number | undefined, r: Range) => (r.min == null || (v ?? -Infinity) >= r.min) && (r.max == null || (v ?? Infinity) <= r.max);
export function marketFiltersActive(f: MarketFilters): number {
  return [f.pos !== "todas", !!f.div, !!f.club, rangeOn(f.ovr), rangeOn(f.age), rangeOn(f.val), f.sort !== "valor"].filter(Boolean).length;
}
export interface MarketRow { player: Player; clubId: string; clubName: string; clubShort: string | null; division: string | null; pendingOfferId: string | null }
// Mesmo universo de allMarketPlayers (sem os seus e sem quem você emprestou)
// e a mesma ordem de renderMercado (valor; overall; idade).
export function marketList(career: Career, info: MarketInfo, f: MarketFilters): MarketRow[] {
  const pending = new Map((career.pendingOffersOut || []).map((o) => [String(o.playerId), o.id]));
  const q = norm(f.q.trim());
  const rows: MarketRow[] = [];
  for (const c of info.clubes) {
    if (c.id === String(career.clubId)) continue;
    if (f.div && c.divisao !== f.div) continue;
    if (f.club && c.id !== f.club) continue;
    const clubHit = q && (norm(c.nome).includes(q) || (c.sigla ? norm(c.sigla).includes(q) : false));
    for (const p of (career.leagueSquads || {})[c.id] || []) {
      if (p.onLoanFromClubId != null) continue;
      if (f.pos !== "todas" && p.group !== f.pos) continue;
      if (!inRange(p.overall, f.ovr) || !inRange(p.age, f.age) || !inRange(p.value, f.val)) continue;
      if (q && !clubHit && !norm(p.name).includes(q)) continue;
      rows.push({ player: p, clubId: c.id, clubName: c.nome, clubShort: c.sigla, division: DIVISION[c.divisao] || null, pendingOfferId: pending.get(String(p.id)) || null });
    }
  }
  const by = { valor: (a: MarketRow, b: MarketRow) => (b.player.value || 0) - (a.player.value || 0),
    overall: (a: MarketRow, b: MarketRow) => (b.player.overall - a.player.overall) || ((b.player.value || 0) - (a.player.value || 0)),
    idade: (a: MarketRow, b: MarketRow) => ((a.player.age || 0) - (b.player.age || 0)) || (b.player.overall - a.player.overall) }[f.sort];
  return rows.sort(by);
}
export function findTarget(career: Career, clubId: string, playerId: string): Player | null {
  return ((career.leagueSquads || {})[clubId] || []).find((p) => String(p.id) === String(playerId)) || null;
}

// ---------- Perfil do alvo (CAP05-T02) ----------
export function buildTarget(career: Career, info: MarketInfo, clubId: string, p: Player) {
  const pending = (career.pendingOffersOut || []).find((o) => String(o.playerId) === String(p.id)) || null;
  const open = info.janela.aberta;
  const loanRefused = info.recusaEmprestimo.includes(String(p.id));
  return {
    short: shortName(p.name), position: POSITION[p.group],
    facts: [
      { label: "Idade", value: p.age != null ? `${p.age} anos` : "—" },
      { label: "Overall", value: String(p.overall) },
      { label: "Potencial", value: potentialText(p) || "Não avaliado" },
      { label: "Contrato", value: p.contractUntil != null ? `Até ${p.contractUntil}` : "—" },
      { label: "Salário mensal", value: p.wage != null ? moneyShort(p.wage) : "—" },
      { label: "Valor de mercado", value: p.value != null ? moneyShort(p.value) : "—" },
    ],
    attrs: [
      { label: "Ataque", value: p.atk != null ? String(p.atk) : "—" },
      { label: "Defesa", value: p.def != null ? String(p.def) : "—" },
      { label: "Físico", value: p.phys != null ? String(p.phys) : "—" },
    ],
    pendingOfferId: pending ? pending.id : null,
    propose: open && !pending ? { ok: true as const, why: null } : { ok: false as const, why: pending ? "Você já tem uma proposta por esse jogador." : "Janela de contratações fechada: só consulta." },
    loan: !open ? { ok: false as const, why: "Janela de contratações fechada." } : loanRefused ? { ok: false as const, why: "O clube não empresta: é peça importante demais." } : { ok: true as const, why: null },
    clubId,
  };
}
// Valor inicial da proposta: o de mercado, com o desconto do boost da Loja
// quando houver (openOfferModal).
export function initialOffer(p: Player, discountPct: number): number {
  const v = p.value || 0;
  return discountPct ? Math.round(v * (1 - discountPct / 100)) : v;
}
export const installmentsLabel = (n: number) => (n > 1 ? `${n}x` : "À vista (1x)");

// ---------- Minhas propostas (CAP05-N02) e negociação (CAP05-T04) ----------
export function offerStatus(o: OfferOut): { text: string; tone: "gold" | "neg" | null } {
  if (o.status === "countered") return { text: "Contraproposta", tone: "gold" };
  if (o.rivalOffer) return { text: "Concorrência", tone: "neg" };
  return { text: "Aguardando", tone: null };
}
// offerEffectiveValue (carreira.js): cada parcela extra pesa 3% para quem vende.
const effective = (v: number, n: number) => v * (1 - 0.03 * (n - 1));
export function buildNegotiation(o: OfferOut) {
  const rival = o.rivalOffer || null;
  let analysis: string | null = null;
  if (rival) {
    // offerCompareAnalysisText (carreira.js), mesmo critério.
    const mineWins = effective(o.offerValue, o.installments) >= effective(rival.offerValue, rival.installments);
    const cheaperMine = o.offerValue < rival.offerValue, fasterMine = o.installments <= rival.installments;
    analysis = mineWins
      ? (cheaperMine ? "Sua proposta é mais barata e ainda assim competitiva no pagamento: você está na frente, mas nada garantido até o clube decidir."
        : `Sua proposta paga mais rápido que a do ${rival.clubName}: isso pesa a seu favor, mesmo sem ser a mais alta.`)
      : (fasterMine ? `O ${rival.clubName} está oferecendo mais: considere aumentar sua proposta antes que o clube decida.`
        : `O ${rival.clubName} paga mais rápido (menos parcelas) e isso pesa a favor dele: considere aumentar ou pagar mais à vista.`);
  }
  return {
    short: shortName(o.playerName), club: o.clubName, status: offerStatus(o),
    mine: { value: moneyShort(o.offerValue), installments: installmentsLabel(o.installments) },
    market: moneyShort(o.marketValue),
    counter: o.status === "countered" && o.counterValue != null ? moneyShort(o.counterValue) : null,
    wait: o.status === "countered" ? null : `O ${o.clubName} responde em ${o.roundsLeft} ${o.roundsLeft === 1 ? "rodada" : "rodadas"}.`,
    rival: rival ? { club: rival.clubName, value: moneyShort(rival.offerValue), installments: installmentsLabel(rival.installments) } : null,
    analysis,
    // Aumentar: no mínimo acima da atual; sugestão = o pedido do clube, o
    // valor do concorrente ou o de mercado (increaseOffer/increaseOfferFromCompare).
    minRaise: o.offerValue + 1000,
    suggestedRaise: Math.max(o.offerValue + 1000, o.counterValue ?? (rival ? rival.offerValue : o.marketValue)),
  };
}

// ---------- Minhas vendas (CAP05-N05) e propostas recebidas (CAP05-N03) ----------
export function buildSales(career: Career) {
  return (career.pendingListings || []).filter((l) => l.id).map((l) => {
    const p = (career.squad || []).find((x) => String(x.id) === String(l.playerId));
    return {
      id: l.id!, playerId: String(l.playerId), short: shortName(l.playerName || p?.name || ""), position: p ? POSITION[p.group] : "",
      asking: moneyShort(l.askingValue || 0), market: moneyShort(l.marketValue ?? p?.value ?? 0),
      offers: (l.offers || []).map((o) => ({ id: o.id, club: o.clubName, value: moneyShort(o.value), installments: installmentsLabel(o.installments) })),
    };
  });
}

// ---------- Histórico (CAP05-T07) ----------
// Mesma classificação de transferLogIcon (carreira.js). Tentativas de compra
// que não deram certo entram em Compras; registros que não envolvem o seu
// clube (negócios entre outros clubes) não aparecem.
export type HistoryTab = "compras" | "vendas" | "emprestimos";
export function classifyLog(text: string): HistoryTab | null {
  if (/^Você contratou\b|^Você acionou a cláusula e comprou\b/.test(text)) return "compras";
  if (/^Você vendeu\b|acionou a cláusula de compra e ficou definitivamente com/.test(text)) return "vendas";
  if (/^Você emprestou\b|^Você pegou\b.*emprestado|voltou (do|pro) /.test(text)) return "emprestimos";
  if (/^Você retirou sua proposta|venceu a disputa por|recusou sua proposta/.test(text)) return "compras";
  return null;
}
export function buildHistory(career: Career, tab: HistoryTab) {
  const all = (career.transferLog || []).filter((e) => classifyLog(e.text));
  return { total: all.length, items: all.filter((e) => classifyLog(e.text) === tab).map((e) => ({ round: `Rodada ${e.round}`, text: e.text })) };
}

// ---------- Empréstimo ----------
export type LoanDuration = "temporada" | "meia";
export type LoanClause = "nenhuma" | "opcional" | "obrigatoria";
// finalizeLoanIn: salário reduzido arredondado a R$ 100.
export const loanWage = (wage: number, pct: number) => Math.round((wage * (pct / 100)) / 100) * 100;

// Seus jogadores que podem ir a mercado (venda/empréstimo) — elenco principal.
export function mySellable(career: Career): Player[] {
  return (career.squad || []).filter((p) => p.origin === "principal").sort((a, b) => sortKey(a) - sortKey(b));
}
