# Entrega — testes sem a tela antiga, lote L3a (IA de mercado)

**Data:** 12/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L3, dividido em partes como o plano permite)
**Lista congelada:** 137 → 131

## O que mudou

O lote L3 (mercado) tem 29 arquivos, não 22 como na estimativa do plano. Ele sai em partes. Esta é a primeira: os 6 testes da IA de mercado.

| Teste | Verificações | Antes | Agora |
|---|---|---|---|
| `test_transfer_ai.js` | 7 | tela antiga como contexto JS | página da v2 + funções do motor |
| `test_transfer_ai_valuation.js` | 12 | idem | idem |
| `test_transfer_ai_offers.js` | 5 | idem | idem |
| `test_transfer_ai_negotiation.js` | 25 | idem | idem |
| `test_transfer_ai_market_dynamics.js` | 26 | idem | idem |
| `test_transfer_ai_balance_132.js` | 21 | idem | idem |

Esses testes verificam regras, não telas. Eles rodavam trechos `page.evaluate(() => transferScore(...))` na página antiga, que tinha as funções do jogo como globais. Desde a etapa G, essas globais eram só atalhos para o motor.

**Como saíram da tela antiga:**
- Carreira nova pela v2 (`newCareer`), no lugar de `carreira.html` + `enterGame`.
- Novo auxiliar `globaisDoMotor(page)` (`tests/e2e/_v2_carreira.js`). Na página da v2, ele expõe as funções dos módulos do motor com os nomes de sempre, mais `CAREER` (o save do motor) e `persistCareer`.
- Nada é reimplementado. Os atalhos da página antiga que não eram exports foram copiados um a um do `carreira.js`: `teamById`, `sortedStandings`, `squadAvgOverallOf`, `motorMercado`, `clubBudgetProxy`, e os 4 que chamavam o mercado puro com o clube montado (`transferValuation`, `adequacaoScore`, `contextoScore`, `buyerNegotiationDecision`).
- Quando dois módulos exportam o mesmo nome, vale o da camada com o save (`semana` primeiro). Era o que a página antiga chamava. Conferido nome a nome contra os embrulhos do `carreira.js`.
- `test_transfer_ai.js` abria a tela de mercado antiga antes do item 15 (dois cliques). Nenhuma verificação dependia disso. Os cliques saíram.

## Para onde foi cada verificação

Todas as 96 verificações continuam nos mesmos arquivos, com o mesmo texto e o mesmo critério. Nenhuma foi removida nem afrouxada.

**Conferência:** cada teste foi rodado com a saída gravada. As 96 verificações rodaram e deram `true`: 7 + 12 + 5 + 25 + 26 + 21. Os rótulos agrupados contam como uma linha, por exemplo "19/20/21)", "7/8)", "2/3/4/5)" e os "Cenário A–D".

## Validação

- `node run_parallel.js test_transfer_ai --isolated-server --no-unit`: 6/6.
- `verificar-tela-antiga.js`: 131 na lista, nenhum teste novo dependendo dela.

## Próximas partes do L3

- **23 arquivos restantes.** São testes de tela, com 5 a 30 interações cada. Serão lidos um a um, como decidido na D1:
  - verificação de regra → motor ou ponte;
  - verificação de tela com equivalente na v2 → tela da v2;
  - verificação de recurso que só existe na tela antiga → sai, com registro.
- **Ordem:** empréstimos (`test_loans`, `test_loan_advanced`, `test_emprestimos_idade_confirmacao`), depois negociação e propostas, depois busca e filtros.
