# Entrega — testes sem a tela antiga, lote L3a (IA de mercado) e L3b (empréstimos)

**Data:** 12/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L3, dividido em partes como o plano permite)
**Lista congelada:** 137 → 131 (L3a) → 128 (L3b)

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

## L3b — empréstimos (3 testes)

| Teste | Verificação antiga | Para onde foi |
|---|---|---|
| `test_loans.js` | 1) empréstimo OUT sai do elenco e vai para o comprador | comandos `prepararEmprestimo`/`emprestar` (os da tela de empréstimo da v2) |
| | 2) emprestado fora do mercado | `allMarketPlayers` do motor |
| | 3) empréstimo IN com metade do salário e salário original guardado | `pegarEmprestado` com 50% (o modal antigo fazia 50%) |
| | 4) etiqueta "emprestado" na lista do Elenco | Elenco da v2: etiqueta "Emprestado" |
| | 5) detalhe sem vender/dispensar/renovar/promover/rebaixar | ficha da v2 (`/elenco/ficha`): sem "Colocar à venda", "Emprestar", "Dispensar", "Promover", "Enviar para a base"; "Renovar contrato" desativado com o motivo |
| | 6) a folha inclui o emprestado | `financas.wageBill`, com e sem ele |
| | 7) a virada devolve os dois | `proximaTemporada` do motor |
| `test_loan_advanced.js` | 3) modal de entrada mostra o % do salário; 100% mantém o salário | tela "Combine o empréstimo" da v2, entrada: grupo "Percentual do salário", 100%, temporada inteira |
| | 1) modal de saída sem %; valor da cláusula aparece com "obrigatória" | mesma tela, saída: sem o percentual; "Valor da cláusula" aparece ao escolher "Obrigatória" |
| | 2) cláusula obrigatória vira venda definitiva na rodada da volta | rodada pela ponte (`jogarRodadaV2`) |
| | 4) a virada devolve quem veio para a temporada inteira | `proximaTemporada` |
| `test_emprestimos_idade_confirmacao.js` | 1) idade da API; 2) fator de reclamação; 3) empréstimo recusado para destaque | os mesmos trechos, com `globaisDoMotor` |
| | 4) "Emprestar" desativado no detalhe do destaque | na v2 a recusa aparece ao abrir "Combine o empréstimo": o motivo ("não aceita ser emprestado") e "Propor empréstimo" desativado |
| | 5, 5b, 5c, 6) confirmação de escalação antes de simular | **saíram:** cobertos pelo `test_v2_prejogo`, itens 2 (titulares e adversário), 3 ("Revisar escalação" e voltar) e 7 ("Iniciar partida" começa o jogo) |

**Notas:**
- Com calendário, a janela de transferências abre na pré-temporada. Por isso os 3 testes começam na pré-temporada (`carreiraV2` com `preTemporada: true`), como os antigos.
- **Observação:** em `test_loan_advanced`, chamar a virada na mesma página logo depois de saltar a rodada de 20 para 39 travou a página. O teste antigo gravava e recarregava antes da virada, e o novo faz o mesmo. O jogo real não salta rodadas, então isso não foi tratado como defeito do jogo.
- A ficha do emprestado e a tela de empréstimo do destaque foram conferidas forçando a falha uma vez e lendo o que a tela mostrava: ficha sem as ações proibidas, "Renovar contrato" desativado e motivo "Jogador emprestado: o contrato é do clube dono."

**Validação L3b:** `test_loans` 8/8, `test_loan_advanced` 5/5, `test_emprestimos_idade_confirmacao` 5/5.

## Próximas partes do L3

- **20 arquivos restantes.** São testes de tela, com 5 a 30 interações cada. Serão lidos um a um, como decidido na D1:
  - verificação de regra → motor ou ponte;
  - verificação de tela com equivalente na v2 → tela da v2;
  - verificação de recurso que só existe na tela antiga → sai, com registro.
- **Ordem:** negociação e propostas, depois busca e filtros (20 arquivos).
