// Fase 2 — recompensa diária: textos do prêmio pelo tipo real e "pendente hoje".
import { test } from "node:test";
import assert from "node:assert/strict";
import { localDate, rewardPending, rewardSub, rewardTitle } from "./reward.ts";

test("título e apoio pelo tipo real do prêmio (ciclo da versão anterior)", () => {
  assert.equal(rewardTitle("coins", 500), "R$ 500 no caixa");
  assert.equal(rewardTitle("coins", 1200), "R$ 1.200 no caixa");
  assert.equal(rewardTitle("boost", 0), "Moral do elenco");
  assert.equal(rewardTitle("scout_token", 0), "Olheiro extra");
  assert.equal(rewardTitle("premium_pack", 3000), "Pacote de elite");
  assert.match(rewardSub("scout_token", 0), /potencial de um jogador da base/);
  assert.match(rewardSub("premium_pack", 3000), /R\$ 3\.000 no caixa/);
});

test("pendente: nunca recebeu ou última coleta em outro dia; recebida hoje não", () => {
  const hoje = localDate(new Date(2026, 10, 3));
  assert.equal(hoje, "2026-11-03");
  assert.equal(rewardPending(undefined, hoje), true);
  assert.equal(rewardPending({ lastClaimDate: null }, hoje), true);
  assert.equal(rewardPending({ lastClaimDate: "2026-11-02" }, hoje), true);
  assert.equal(rewardPending({ lastClaimDate: "2026-11-03" }, hoje), false);
});
