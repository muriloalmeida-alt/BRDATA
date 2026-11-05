// Testes do tutorial, assistente e título (item 1, 05/11): node --test --experimental-strip-types
import { test } from "node:test";
import assert from "node:assert/strict";
import { TUTORIAL, WIZARD, autoOpen, seasonTitles, wizardPending, wizardStepOf, wizardUrl } from "./onboarding.ts";

test("Tutorial: 4 telas, textos da navegação da v2 (sem 'Ir para o jogo' nem 'Tática/Mercado na barra')", () => {
  assert.equal(TUTORIAL.length, 4);
  const all = TUTORIAL.map((s) => s.text).join(" ");
  assert.ok(all.includes("Preparar partida") && all.includes("Elenco, Jogos e Mais"));
  assert.ok(!all.includes("Ir para o jogo"));
});

test("Assistente: 4 passos nas telas da v2; pendente só em carreira nova e na pré-temporada", () => {
  assert.deepEqual(WIZARD.map((s) => s.path), ["/escalacao", "/comissao", "/olheiros/contratar", "/tatica/instrucoes"]);
  assert.equal(wizardUrl(3), "/olheiros/contratar?assistente=3");
  assert.equal(wizardStepOf("?assistente=2")!.title, "Comissão técnica");
  assert.equal(wizardStepOf("?assistente=9"), null);
  assert.equal(wizardStepOf(""), null);
  assert.equal(wizardPending({ startupWizardSeen: false }), true);
  assert.equal(wizardPending({ startupWizardSeen: false, careerTotals: { j: 0 } as never, matchLog: [] }), true);
  assert.equal(wizardPending({ startupWizardSeen: false, careerTotals: { j: 3 } as never }), false, "já jogou: não interrompe");
  assert.equal(wizardPending({ startupWizardSeen: false, matchLog: [{ seasonYear: 2026, round: 1, opponentId: "x", home: true, gh: 1, ga: 0 }] }), false);
  assert.equal(wizardPending({ startupWizardSeen: true }), false);
  assert.equal(wizardPending({}), false, "save antigo (sem o campo): já visto");
});

test("Abre sozinho, nesta ordem: tutorial → assistente → recompensa", () => {
  assert.equal(autoOpen({ tutorialSeen: false, wizard: true, reward: true }), "/boas-vindas");
  assert.equal(autoOpen({ tutorialSeen: true, wizard: true, reward: true }), "/escalacao?assistente=1");
  assert.equal(autoOpen({ tutorialSeen: true, wizard: false, reward: true }), "/recompensa");
  assert.equal(autoOpen({ tutorialSeen: true, wizard: false, reward: false }), null);
});

test("Título: nome certo da série, Copa, os dois no mesmo ano, nenhum fora do 1º lugar", () => {
  assert.deepEqual(seasonTitles({ competitionId: "brasileirao" }, 1), ["brasileirao"]);
  assert.deepEqual(seasonTitles({ competitionId: "serie_b" }, 1), ["serie_b"]);
  assert.deepEqual(seasonTitles({ competitionId: "serie_c", cup: { championIsHuman: true } as never }, 1), ["serie_c", "copa"]);
  assert.deepEqual(seasonTitles({ competitionId: "brasileirao", cup: { championIsHuman: true } as never }, 4), ["copa"]);
  assert.deepEqual(seasonTitles({}, 2), []);
});
