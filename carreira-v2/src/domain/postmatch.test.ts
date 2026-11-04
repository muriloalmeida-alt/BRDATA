// Testes do pós-jogo da v2 (fase 4): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOffer, buildRoundNews, buildRoundResults, cupLegTitle, pressEffect } from "./postmatch.ts";
import { buildMatch } from "./match.ts";
import type { MatchSnapshot } from "../adapters/match.ts";

const T = (id: string, nome: string) => ({ id, nome });

test("Coletiva: efeito só depois de responder, com sinal; pular = sem efeito", () => {
  assert.equal(pressEffect(1, 3), "Reputação +1 · Moral do elenco +3");
  assert.equal(pressEffect(-2, 0), "Reputação −2 · Moral do elenco 0");
  assert.equal(pressEffect(null, null), null);
});

test("Notícias da rodada: manchetes com tipo; finanças só o que houve, caixa sempre", () => {
  const m = buildRoundNews({ etapa: "noticias", rodada: 7, manchetes: [{ texto: "Flamengo lidera", tipo: "lider", meu: true }, { texto: "Zebra no Sul", tipo: "zebra", meu: false }],
    financas: { salarios: 2_100_000, patrocinio: 0, parcelasPagas: 0, parcelasRecebidas: 500_000, caixa: 31_000_000 } });
  assert.equal(m.sub, "Rodada 7 · as manchetes da rodada");
  assert.deepEqual(m.items.map((i) => [i.title, i.meta, i.mine]), [["Flamengo lidera", "Liderança", true], ["Zebra no Sul", "Zebra", false]]);
  assert.deepEqual(m.finance.map((f) => [f.label, f.value]), [["Salários pagos", "−R$ 2,1 mi"], ["Parcelas de venda", "+R$ 500 mil"], ["Caixa", "R$ 31 mi"]]);
});

test("Resultados da rodada: seu jogo primeiro e marcado; mudanças; Copa com pênaltis e jogo adiado", () => {
  const m = buildRoundResults({
    etapa: "resultados", rodada: 7,
    jogos: [{ mandante: T("pal", "Palmeiras"), visitante: T("cor", "Corinthians"), gh: 2, ga: 2 }, { mandante: T("cui", "Cuiabá"), visitante: T("fla", "Flamengo"), gh: 0, ga: 1 }],
    mudancas: ["B. Santos (lesionado) sai, entra C. Dias"],
    copa: { fase: "r16", perna: 2, adiado: true, jogos: [{ mandante: T("bot", "Botafogo"), visitante: T("bah", "Bahia"), gh: 1, ga: 1, penaltis: true }] },
  }, "fla");
  assert.deepEqual(m.rows.map((r) => [r.home.nome, r.score, r.away.nome, r.mine]), [["Cuiabá", "0 – 1", "Flamengo", true], ["Palmeiras", "2 – 2", "Corinthians", false]]);
  assert.match(m.changes || "", /^Mudanças no time para a próxima rodada: B\. Santos/);
  assert.equal(m.cup?.title, "Copa do Brasil · Oitavas de final · Volta");
  assert.equal(m.cup?.rows[0].note, "Decidido nos pênaltis");
  assert.equal(m.cup?.note, "Seu confronto é jogado agora, ao vivo.");
  assert.equal(buildRoundResults({ etapa: "resultados", rodada: 1, jogos: [], mudancas: [], copa: null }, "fla").changes, null);
});

test("Perna da Copa: fase e perna", () => {
  assert.deepEqual(cupLegTitle({ etapa: "copa", fase: "fase1", perna: 1, adversario: "Sport" }), { sub: "1ª fase · Ida", line: "Seu confronto contra o Sport é jogado agora, ao vivo." });
});

test("Proposta: valor, à vista, valor de mercado e diferença (sinal e cor)", () => {
  const o = buildOffer({ etapa: "proposta", jogador: { id: "p1", nome: "Bruno Santos", posicao: "Atacante", idade: 24, valorMercado: 10_000_000 },
    clube: { id: "pal", nome: "Palmeiras", sigla: "PAL" }, valor: 12_500_000, parcelas: 1 });
  assert.deepEqual([o.name, o.position, o.age, o.club, o.clubShort, o.fee, o.installments, o.market], ["B. Santos", "Atacante", "24 anos", "Palmeiras", "PAL", "R$ 12,5 mi", "À vista", "R$ 10 mi"]);
  assert.deepEqual(o.diff, { text: "+R$ 2,5 mi", tone: "pos" });
  const menos = buildOffer({ etapa: "proposta", jogador: { id: "p1", nome: "Ana", posicao: null, idade: null, valorMercado: 3_000_000 }, clube: { id: "x", nome: "X", sigla: null }, valor: 2_000_000, parcelas: 1 });
  assert.deepEqual(menos.diff, { text: "−R$ 1 mi", tone: "neg" });
  assert.equal(menos.age, null);
});

test("Partida da Copa (P6/P5): agregado só na volta (ida + placar atual); decidida: pênaltis e quem passou", () => {
  const base: MatchSnapshot = { fase: "jogando", contexto: "copa", rodada: 5, mandante: { id: "cui", nome: "Cuiabá" }, visitante: { id: "fla", nome: "Flamengo" }, souMandante: false, gh: 1, ga: 0, eventos: [] };
  const ida = buildMatch({ ...base, copa: { fase: "r16", perna: 1, ida: null } })!;
  assert.equal(ida.cup, null);
  const volta = buildMatch({ ...base, copa: { fase: "r16", perna: 2, ida: { meus: 2, deles: 0 } } })!;
  assert.equal(volta.kicker, "Copa do Brasil · Oitavas de final · Volta");
  assert.deepEqual(volta.cup, { aggregate: "Agregado: Flamengo 2 × 1 Cuiabá", outcome: null });
  const pen = buildMatch({ ...base, fase: "encerrada", gh: 2, ga: 0, copa: { fase: "r16", perna: 2, ida: { meus: 2, deles: 0 }, penaltis: true, classificado: "Cuiabá", classificadoSouEu: false } })!;
  assert.deepEqual(pen.cup, { aggregate: "Agregado: Flamengo 2 × 2 Cuiabá", outcome: "Decidido nos pênaltis · Classificado: Cuiabá" });
  assert.equal(buildMatch({ ...base, contexto: "liga", copa: null })!.cup, null);
});
