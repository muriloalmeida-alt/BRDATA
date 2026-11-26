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
import type { Career, OfferOut, OfferRole, Player, PlayerGroup } from "./types.ts";
import { offerEffectiveValue as effective } from "../../../public/js/motor/mercado.js";
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
  // EMPRESTIMO-DISPONIVEL: jogadores da CPU disponíveis para empréstimo.
  disponiveisEmprestimo?: string[];
  // VENDA-DISPONIVEL: jogadores que a CPU pôs à venda, com os motivos, a
  // chance de vir (maior = mais provável) e o valor que o clube aceita.
  aVenda?: SaleListing[];
  // PARIDADE-CPU · E3: agentes livres (sem taxa, só o salário).
  agentesLivres?: FreeAgent[];
}
export interface FreeAgent { id: string; nome: string; grupo: PlayerGroup; idade: number | null; overall: number; potencial: number | null; salario: number; ultimoClube: string | null; lesionado: boolean }
export interface SaleListing { id: string; clubeId: string; motivos: string[]; motivo: string; papelNoSeuTime: "titular" | "rotacao" | "reserva"; chance: number; valorMinimo: number }
export const DIVISION: Record<string, string> = { brasileirao: "Série A", serie_b: "Série B", serie_c: "Série C" };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------- Lista e filtros (CAP05-T01) ----------
export type MarketSort = "valor" | "overall" | "idade";
export interface Range { min: number | null; max: number | null }
export interface MarketFilters { q: string; pos: "todas" | PlayerGroup; div: string; club: string; ovr: Range; age: Range; val: Range; sort: MarketSort; loan: boolean; sale?: boolean }
export const NO_MARKET_FILTERS: MarketFilters = { q: "", pos: "todas", div: "", club: "", ovr: { min: null, max: null }, age: { min: null, max: null }, val: { min: null, max: null }, sort: "valor", loan: false, sale: false };
const rangeOn = (r: Range) => r.min != null || r.max != null;
const inRange = (v: number | undefined, r: Range) => (r.min == null || (v ?? -Infinity) >= r.min) && (r.max == null || (v ?? Infinity) <= r.max);
export function marketFiltersActive(f: MarketFilters): number {
  return [f.pos !== "todas", !!f.div, !!f.club, rangeOn(f.ovr), rangeOn(f.age), rangeOn(f.val), f.sort !== "valor", !!f.loan || !!f.sale].filter(Boolean).length;
}
export interface MarketRow { player: Player; clubId: string; clubName: string; clubShort: string | null; division: string | null; pendingOfferId: string | null; pendingRefused: boolean; loanAvailable: boolean; sale: SaleListing | null }
// Mesmo universo de allMarketPlayers (sem os seus e sem quem você emprestou)
// e a mesma ordem de renderMercado (valor; overall; idade).
export function marketList(career: Career, info: MarketInfo, f: MarketFilters): MarketRow[] {
  const pending = new Map((career.pendingOffersOut || []).map((o) => [String(o.playerId), o]));
  const q = norm(f.q.trim());
  const loanSet = new Set(info.disponiveisEmprestimo || []);
  const saleMap = new Map((info.aVenda || []).map((s) => [`${s.clubeId}:${s.id}`, s]));
  const rows: MarketRow[] = [];
  for (const c of info.clubes) {
    if (c.id === String(career.clubId)) continue;
    if (f.div && c.divisao !== f.div) continue;
    if (f.club && c.id !== f.club) continue;
    const clubHit = q && (norm(c.nome).includes(q) || (c.sigla ? norm(c.sigla).includes(q) : false));
    for (const p of (career.leagueSquads || {})[c.id] || []) {
      if (p.onLoanFromClubId != null) continue;
      const loanAvailable = loanSet.has(String(p.id));
      if (f.loan && !loanAvailable) continue;
      const sale = saleMap.get(`${c.id}:${p.id}`) || null;
      if (f.sale && !sale) continue;
      if (f.pos !== "todas" && p.group !== f.pos) continue;
      if (!inRange(p.overall, f.ovr) || !inRange(p.age, f.age) || !inRange(p.value, f.val)) continue;
      if (q && !clubHit && !norm(p.name).includes(q)) continue;
      rows.push({ player: p, clubId: c.id, clubName: c.nome, clubShort: c.sigla, division: DIVISION[c.divisao] || null,
        pendingOfferId: pending.get(String(p.id))?.id || null, pendingRefused: pending.get(String(p.id))?.status === "recusada", loanAvailable, sale });
    }
  }
  const by = { valor: (a: MarketRow, b: MarketRow) => (b.player.value || 0) - (a.player.value || 0),
    overall: (a: MarketRow, b: MarketRow) => (b.player.overall - a.player.overall) || ((b.player.value || 0) - (a.player.value || 0)),
    idade: (a: MarketRow, b: MarketRow) => ((a.player.age || 0) - (b.player.age || 0)) || (b.player.overall - a.player.overall) }[f.sort];
  // EMPRESTIMO-DISPONIVEL: com o filtro, jovens até 23 anos primeiro.
  const young = (r: MarketRow) => ((r.player.age ?? 99) <= YOUNG_LOAN_AGE ? 0 : 1);
  // VENDA-DISPONIVEL: com o filtro, mais chance de vir primeiro; depois o overall.
  if (f.sale) return rows.sort((a, b) => ((b.sale?.chance || 0) - (a.sale?.chance || 0)) || (b.player.overall - a.player.overall) || by(a, b));
  return rows.sort(f.loan ? (a, b) => (young(a) - young(b)) || by(a, b) : by);
}
export const YOUNG_LOAN_AGE = 23;
export function findTarget(career: Career, clubId: string, playerId: string): Player | null {
  return ((career.leagueSquads || {})[clubId] || []).find((p) => String(p.id) === String(playerId)) || null;
}

// ---------- Perfil do alvo (CAP05-T02) ----------
export function buildTarget(career: Career, info: MarketInfo, clubId: string, p: Player) {
  // Uma proposta recusada não impede outra (a nova substitui a recusada).
  const pending = (career.pendingOffersOut || []).find((o) => String(o.playerId) === String(p.id) && o.status !== "recusada") || null;
  const refused = (career.pendingOffersOut || []).find((o) => String(o.playerId) === String(p.id) && o.status === "recusada") || null;
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
    refused: refused ? { id: refused.id, motivo: refused.motivo || null } : null,
    propose: open && !pending ? { ok: true as const, why: null } : { ok: false as const, why: pending ? "Você já tem uma proposta por esse jogador." : "Janela de contratações fechada: só consulta." },
    loan: !open ? { ok: false as const, why: "Janela de contratações fechada." } : loanRefused ? { ok: false as const, why: "O clube não empresta: é peça importante demais." } : { ok: true as const, why: null },
    clubId,
  };
}
// Valor inicial da proposta: o de mercado, com o desconto do boost da Loja
// quando houver (openOfferModal).
export function initialOffer(p: Player, discountPct: number, sale?: SaleListing | null): number {
  const v = p.value || 0;
  const comDesconto = discountPct ? Math.round(v * (1 - discountPct / 100)) : v;
  // VENDA-DISPONIVEL: à venda, abre com o valor que o clube aceita (90%).
  return sale && sale.valorMinimo > 0 ? Math.min(comDesconto, sale.valorMinimo) : comDesconto;
}
export function saleOf(info: MarketInfo | null | undefined | "erro", clubId: string, playerId: string): SaleListing | null {
  if (!info || info === "erro") return null;
  return (info.aVenda || []).find((s) => s.clubeId === String(clubId) && s.id === String(playerId)) || null;
}
export const installmentsLabel = (n: number) => (n > 1 ? `${n}x` : "À vista (1x)");

// ---------- Termos para o atleta (FASE1-MER, MER-03/04) ----------
export const ROLE: Record<OfferRole, string> = { titular: "Titular", rotacao: "Rotação", reserva: "Reserva" };
export const ROLES: OfferRole[] = ["titular", "rotacao", "reserva"];
export const YEARS = [1, 2, 3, 4, 5];
export const yearsLabel = (n: number) => `${n} ${n === 1 ? "temporada" : "temporadas"}`;
// O que o atleta deve achar do salário, pela prévia do motor (o salário que
// ele aceitaria em cada papel). Só orienta: quem decide é o motor.
export function wageHint(offered: number, expected: number | undefined, current: number | undefined): { text: string; tone: "pos" | "neg" | null } | null {
  if (!expected || !offered) return null;
  if (offered >= expected) return { text: `Salário dentro do que ele espera para esse papel (cerca de ${moneyShort(expected)}).`, tone: "pos" };
  const gap = Math.round((1 - offered / expected) * 100);
  return { text: `Ele deve esperar cerca de ${moneyShort(expected)} para esse papel${current ? ` (hoje ganha ${moneyShort(current)})` : ""}. Abaixo disso (${gap}% a menos), pode pedir mais ou recusar.`, tone: "neg" };
}

// ---------- Minhas propostas (CAP05-N02) e negociação (CAP05-T04) ----------
export function offerStatus(o: OfferOut): { text: string; tone: "gold" | "neg" | null } {
  if (o.status === "recusada") return { text: o.recusadoPor === "atleta" ? "Recusada pelo jogador" : "Recusada", tone: "neg" };
  if (o.status === "pede-salario") return { text: "Pede mais salário", tone: "gold" };
  if (o.status === "countered") return { text: "Contraproposta", tone: "gold" };
  if (o.rivalOffer) return { text: "Concorrência", tone: "neg" };
  return { text: "Aguardando", tone: null };
}
export function buildNegotiation(o: OfferOut) {
  const rival = o.rivalOffer || null;
  let analysis: string | null = null;
  if (rival) {
    // offerCompareAnalysisText (carreira.js), mesmo critério.
    // Peso da proposta parcelada: offerEffectiveValue do motor (-3% por parcela extra).
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
    wait: o.status !== "pending" ? null : `O ${o.clubName} responde em ${o.roundsLeft} ${o.roundsLeft === 1 ? "rodada" : "rodadas"}.`,
    // FASE1-MER: termos oferecidos ao atleta, a resposta e o que dá para fazer.
    terms: o.salario != null ? [
      { label: "Salário oferecido", value: `${moneyShort(o.salario)}/mês` },
      { label: "Papel prometido", value: ROLE[o.papel || "rotacao"] },
      { label: "Contrato", value: yearsLabel(o.anos || 3) },
    ] : null,
    reason: o.motivo || null,
    askedWage: o.status === "pede-salario" && o.salarioPedido ? moneyShort(o.salarioPedido) : null,
    refused: o.status === "recusada",
    open: o.status === "pending" || o.status === "countered",
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

// ---------- MERCADO-001, etapa 4: custo da oferta (economia v5) ----------
// A avaliação do motor (ponte.previaProposta com termos { entrada, meses }):
// o que se paga agora, a parcela mensal e o espaço antes e depois.
export interface Envelopes { reserva: number; entrada: number; parcelas: number; folha: number; orcamento: number | null }
export interface Capacity {
  ok: boolean;
  motivo: "orcamento" | "caixa" | "parcelas" | "folha" | "fluxo" | null;
  faltam?: number;
  mensagem: string | null;
  paga?: { agora: number; porMes: number; meses: number; total: number; salario: number };
  antes?: Envelopes;
  depois?: Envelopes;
}
export interface PayTerms { parcelado: boolean; entradaPct: number; meses: number }
// Condições iniciais (handoff, seção 3): à vista; parcelado abre com 30% de
// entrada (faixa 20%–40%) e 12 meses (até 24).
export const ENTRY_PCTS = [20, 30, 40, 60, 100];
export const MONTHS = [6, 12, 18, 24];
export const DEFAULT_TERMS: PayTerms = { parcelado: false, entradaPct: 30, meses: 12 };
// Os termos para o motor: à vista, sem termos (a taxa inteira é a entrada).
export function engineTerms(t: PayTerms, value: number): { entrada: number; meses: number } | null {
  if (!t.parcelado) return null;
  return { entrada: Math.round((value * t.entradaPct) / 100 / 1000) * 1000, meses: Math.max(1, Math.min(24, t.meses)) };
}
// Os três números da oferta e o detalhe.
// - Paga agora: a entrada (ou a taxa à vista).
// - Custo mensal total: salário + parcela do mês (o mês apresentado é o 1º).
// - Compromisso total: a taxa inteira + o salário pelo contrato (anos × 12).
export function offerCost(c: Capacity | undefined | null, years: number) {
  if (!c || !c.paga) return null;
  const p = c.paga;
  const mensal = p.salario + p.porMes;
  const meses = Math.max(1, years) * 12;
  const compromisso = p.total + p.salario * meses;
  const detalheMensal = p.porMes > 0
    ? `${moneyShort(mensal)}/mês por ${p.meses} ${p.meses === 1 ? "mês" : "meses"} (salário ${moneyShort(p.salario)} + parcela ${moneyShort(p.porMes)}); depois ${moneyShort(p.salario)}/mês`
    : `Só o salário: ${moneyShort(p.salario)}/mês`;
  const detalheTotal = `Taxa ${moneyShort(p.total)}${p.porMes > 0 ? ` (${moneyShort(p.agora)} agora + ${p.meses}× ${moneyShort(p.porMes)})` : ""} + salário por ${years} ${years === 1 ? "ano" : "anos"}`;
  return {
    rows: [
      { label: "Paga agora", value: moneyShort(p.agora) },
      { label: "Custo mensal total", value: `${moneyShort(mensal)}/mês` },
      { label: "Compromisso total", value: moneyShort(compromisso) },
    ],
    detalheMensal, detalheTotal,
    bloqueio: c.ok ? null : { motivo: c.motivo, texto: c.mensagem || "A operação não cabe nas finanças do clube.", faltam: c.faltam || 0 },
    espacos: c.antes && c.depois ? [
      { label: "Caixa livre para entradas", antes: c.antes.entrada, depois: c.depois.entrada },
      { label: "Espaço para parcelas (mês)", antes: c.antes.parcelas, depois: c.depois.parcelas },
      { label: "Espaço na folha (mês)", antes: c.antes.folha, depois: c.depois.folha },
    ] : [],
  };
}
