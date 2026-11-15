# Entrega — testes sem a tela antiga, lote L5 (elenco e semana)

**Data:** 15/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L5, dividido em partes como o L4)
**Lista congelada:** 82 → 75 (L5a)

## L5a — contratos, moral e lesões (7 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_contract_renewal.js` | 5 verificações pelos modais da tela antiga (detalhe, Renovar, toast) | 7 verificações pela ponte (`ponte.renovar`, a mesma da tela de renovação da v2) |
| `test_contract_renewal_edge.js` | sem verificação: só imprimia os casos do jovem e do teto | **saiu:** virou os itens 4 e 5 do `test_contract_renewal` |
| `test_coletiva_renovacao.js` | 1 verificação: a recusa abre a coletiva 19 | **saiu:** virou os itens 2 e 6 do `test_contract_renewal` |
| `test_morale.js` | 4 verificações; "fora da súmula cai para 68" era só impresso | 7 verificações pelo motor, pela ponte e pelo Perfil do jogador da v2 |
| `test_morale_season.js` | sem verificação: só imprimia as contas da virada | **saiu:** virou o item 6 do `test_morale` |
| `test_moral_relacionamento.js` | 5 verificações (outras só impressas) e o modal de conversa da tela antiga | 6 verificações pelo motor e pela ponte (`ponte.conversar`) |
| `test_injuries.js` | 3 verificações; a distribuição das gravidades era só impressa | 4 verificações pelo motor |

### Para onde foi cada verificação

**`test_contract_renewal` (junta os três de renovação):**
- 1: fora do último ano de contrato, renovar é recusado (novo).
- 2: abaixo do mínimo: recusa com o motivo, nada muda, e abre a coletiva de renovação recusada (antes: toast da tela antiga e `test_coletiva_renovacao`).
- 3: sugerido por 2 anos: aceita, contrato até a temporada + 2 e salário sugerido, gravados no save.
- 4: até 23 anos não aceita 1 ano (antes: `_edge`, só impresso).
- 5: acima do teto salarial: recusa pelo orçamento, nada muda, sem coletiva (antes: `_edge`, só impresso).
- 6: moral muito baixa: recusa na certa, com a coletiva 19.
- As telas (Contrato e ações, Renovar, "Proposta aceita."/"Proposta recusada." e a coletiva avulsa): `test_v2_elenco_avancado` itens 2 a 4.

**`test_morale` (junta o `test_morale_season`):**
- 1: o elenco principal nasce com moral 70. A base sobe treinando com o principal na pré-temporada (+5 por dia no grupo misto, `motor/treino.js`); o teste antigo checava "todo o elenco" antes dessa regra.
- 2: o Perfil do jogador da v2 mostra a moral (antes: detalhe da tela antiga).
- 3: depois da rodada 1, a moral dos titulares muda e quem ficou fora da súmula cai 2 × o quanto reclama (`playerComplaintFactor`, idade e overall). O teste antigo imprimia "68" (70 − 2) sem verificar; era a regra antes do amortecimento.
- 4 e 5: renovação pela moral (20: recusa mesmo generosa; 90: sugerido acima de 1,05× e 1 ano recusado), pela ponte.
- 6: virada de temporada (`seasonMorale`): 100 com salário justo → 91; mal pago → 64; bem pago → 74 (antes: `test_morale_season`, só impresso).

**`test_moral_relacionamento`:**
- 1 a 5: as mesmas regras (sequência no banco, motivo, conversa disponível, "Ouvir e apoiar", pedido de transferência, "Cobrar postura"), com a conversa pela ponte. O que era só impresso (motivo, titular sem sequência, não conversar de novo na rodada) virou verificação.
- A tela Conversa da v2: `test_v2_elenco_avancado` item 5.

**`test_injuries`:**
- 1: 20 000 sorteios: as 3 gravidades na proporção ~70/25/5 e lesão de mais de 4 rodadas (antes: só impresso).
- 2: chance de lesão pelo físico e pela condição.
- 3: lesão grave atravessando a virada: o jogador volta a "ok".
- As telas: "Lesionado · volta na rodada N" no Elenco (`test_v2_elenco` item 2) e o lesionado fora da lista de substitutos (`test_v2_escalacao` item 8).

### Junto: esperas que não esperavam
`page.waitForFunction` com função async não espera (a Promise conta como verdadeira na hora). Achado no CI do #120 (`test_ge_balance_004`, corrigido lá). Os outros dois casos:
- `test_v2_semana` item 7: "lidos no save" não era verificado; agora é.
- `test_v2_corte` item 5: a espera do convite.

Os dois usam o ajudante novo `esperarAssincrono` (`_v2_carreira.js`), que repete a consulta pelo lado do Node.

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| sem o mínimo de salário na renovação | `test_contract_renewal` 2 e 3 |
| jovem aceita contrato de 1 ano | `test_contract_renewal` 4 |
| quem fica fora da súmula perde 1× (é 2×) | `test_morale` 3 |
| mal pago perde 5 na virada (é 6) | `test_morale` 6 |
| a virada não limpa a lesão | `test_injuries` 3 |

### Validação L5a
- Todos rodados com a saída gravada, com as verificações `true`:
  - `test_contract_renewal` 7/7;
  - `test_morale` 7/7;
  - `test_moral_relacionamento` 6/6;
  - `test_injuries` 4/4;
  - `test_v2_semana` e `test_v2_corte`: todas.
- `verificar-tela-antiga.js`: 75 na lista.
