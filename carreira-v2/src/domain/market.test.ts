// Testes do mercado (fase 8): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_MARKET_FILTERS, buildHistory, buildNegotiation, buildSales, buildTarget, classifyLog, initialOffer, loanWage, marketFiltersActive, marketList, offerStatus, type MarketInfo } from "./market.ts";
import type { Career, OfferOut, Player } from "./types.ts";

const P = (id: string, name: string, group: Player["group"], overall: number, over: Partial<Player> = {}): Player => ({ id, name, group, overall, origin: "principal", age: 25, value: 5_000_000, wage: 100_000, ...over });
const info = (over: Partial<MarketInfo> = {}): MarketInfo => ({
  janela: { aberta: true, texto: "Janela aberta até a rodada 3" }, multi: true, desconto: 0, parcelas: [1, 2, 3, 4], esperaRodadas: 2, recusaEmprestimo: ["p1"],
  clubes: [{ id: "fla", nome: "Flamengo", sigla: "FLA", divisao: "brasileirao" }, { id: "pal", nome: "Palmeiras", sigla: "PAL", divisao: "brasileirao" }, { id: "cri", nome: "Criciúma", sigla: "CRI", divisao: "serie_b" }],
  ...over,
});
const offer = (over: Partial<OfferOut> = {}): OfferOut => ({ id: "o1", playerId: "p2", playerName: "Sol Pal", clubId: "pal", clubName: "Palmeiras", marketValue: 6_000_000, offerValue: 5_000_000, installments: 2, roundsLeft: 2, status: "pending", counterValue: null, ...over });
function career(): Career {
  return {
    clubId: "fla", clubName: "Flamengo", seasonYear: 2026, currentRound: 2, schedule: {}, standings: {},
    squad: [P("m1", "Meu Jogador", "F", 80)],
    leagueSquads: {
      fla: [P("x", "Não Aparece", "F", 90)],
      pal: [P("p1", "Raul Pal", "F", 84, { value: 20_000_000, age: 30 }), P("p2", "Sol Pal", "G", 77, { value: 6_000_000, age: 22 }), P("p3", "Emprestado Meu", "M", 70, { onLoanFromClubId: "fla" })],
      cri: [P("c1", "João Criciúma", "D", 68, { value: 1_000_000, age: 19 })],
    },
    pendingOffersOut: [offer()],
    pendingListings: [{ id: "l1", playerId: "m1", playerName: "Meu Jogador", askingValue: 9_000_000, marketValue: 8_000_000, offers: [{ id: "lo1", clubId: "pal", clubName: "Palmeiras", value: 8_500_000, installments: 2 }] }],
    transferLog: [
      { round: 3, text: "Você contratou Ana do Santos por R$ 5.000.000." }, { round: 3, text: "Você vendeu Bia pro Grêmio por R$ 2.000.000." },
      { round: 2, text: "Você emprestou Caio pro Vasco até o fim da temporada por R$ 100.000." }, { round: 2, text: "Santos recusou sua proposta de R$ 1.000.000 por Dudu." },
      { round: 1, text: "Bahia contratou Zé do Sport." },
    ],
  };
}

test("Lista: só reforços (sem os seus, sem quem você emprestou), ordem por valor, busca sem acento por jogador ou clube", () => {
  const c = career();
  const ids = (f = {}) => marketList(c, info(), { ...NO_MARKET_FILTERS, ...f }).map((r) => r.player.id);
  assert.deepEqual(ids(), ["p1", "p2", "c1"]);
  assert.deepEqual(ids({ q: "criciuma" }), ["c1"]);
  assert.deepEqual(ids({ q: "sol" }), ["p2"]);
  assert.equal(marketList(c, info(), NO_MARKET_FILTERS)[1].pendingOfferId, "o1");
});

test("Filtros: posição, divisão, clube, faixas de overall/idade/valor e ordenação; contagem dos ativos", () => {
  const c = career();
  const ids = (f = {}) => marketList(c, info(), { ...NO_MARKET_FILTERS, ...f }).map((r) => r.player.id);
  assert.deepEqual(ids({ pos: "G" }), ["p2"]);
  assert.deepEqual(ids({ div: "serie_b" }), ["c1"]);
  assert.deepEqual(ids({ club: "pal" }), ["p1", "p2"]);
  assert.deepEqual(ids({ ovr: { min: 70, max: 80 } }), ["p2"]);
  assert.deepEqual(ids({ age: { min: null, max: 22 } }), ["p2", "c1"]);
  assert.deepEqual(ids({ val: { min: 2_000_000, max: null } }), ["p1", "p2"]);
  assert.deepEqual(ids({ sort: "idade" }), ["c1", "p2", "p1"]);
  assert.equal(marketFiltersActive({ ...NO_MARKET_FILTERS, pos: "G", ovr: { min: 70, max: null }, sort: "overall" }), 3);
});

test("Perfil do alvo: fatos, proposta já enviada, janela fechada só consulta e empréstimo recusado", () => {
  const c = career();
  const t1 = buildTarget(c, info(), "pal", c.leagueSquads!.pal[0]);
  assert.deepEqual(t1.facts.map((f) => f.label), ["Idade", "Overall", "Potencial", "Contrato", "Salário mensal", "Valor de mercado"]);
  assert.equal(t1.propose.ok, true);
  assert.equal(t1.loan.ok, false, "destaque não é emprestado");
  const t2 = buildTarget(c, info(), "pal", c.leagueSquads!.pal[1]);
  assert.equal(t2.pendingOfferId, "o1");
  assert.match(t2.propose.why!, /já tem uma proposta/);
  const t3 = buildTarget(c, info({ janela: { aberta: false, texto: "Janela fechada" } }), "cri", c.leagueSquads!.cri[0]);
  assert.match(t3.propose.why!, /fechada/);
  assert.equal(t3.loan.ok, false);
  assert.equal(initialOffer(c.leagueSquads!.pal[1], 10), 5_400_000);
});

test("Negociação: estados, contraproposta, concorrência com a análise do jogo e o aumento sugerido", () => {
  assert.deepEqual(offerStatus(offer()), { text: "Aguardando", tone: null });
  const counter = buildNegotiation(offer({ status: "countered", counterValue: 5_800_000 }));
  assert.equal(counter.status.text, "Contraproposta");
  assert.equal(counter.counter, "R$ 5,8 mi");
  assert.equal(counter.wait, null);
  assert.equal(counter.suggestedRaise, 5_800_000);
  const rival = buildNegotiation(offer({ rivalOffer: { clubId: "cri", clubName: "Criciúma", offerValue: 6_000_000, installments: 1 } }));
  assert.equal(rival.status.text, "Concorrência");
  assert.match(rival.analysis!, /Criciúma paga mais rápido/);
  assert.equal(rival.suggestedRaise, 6_000_000);
  assert.equal(buildNegotiation(offer()).wait, "O Palmeiras responde em 2 rodadas.");
});

test("Vendas e histórico: anúncio com propostas; abas pela regra do jogo, sem os negócios entre outros clubes", () => {
  const c = career();
  const s = buildSales(c);
  assert.equal(s[0].asking, "R$ 9 mi");
  assert.deepEqual(s[0].offers[0], { id: "lo1", club: "Palmeiras", value: "R$ 8,5 mi", installments: "2x" });
  assert.equal(classifyLog("Bahia contratou Zé do Sport."), null);
  assert.equal(buildHistory(c, "compras").items.length, 2, "contratação + proposta recusada");
  assert.equal(buildHistory(c, "vendas").items.length, 1);
  assert.equal(buildHistory(c, "emprestimos").items[0].round, "Rodada 2");
  assert.equal(buildHistory(c, "compras").total, 4);
  assert.equal(loanWage(123_456, 75), 92_600);
});
