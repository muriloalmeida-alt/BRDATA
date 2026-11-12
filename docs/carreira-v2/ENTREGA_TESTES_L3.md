# Entrega — testes sem a tela antiga, lote L3 (mercado), partes a, b, c e d

**Data:** 12/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L3, dividido em partes como o plano permite)
**Lista congelada:** 137 → 131 (L3a) → 128 (L3b) → 122 (L3c) → 110 (L3d)

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

## L3c — negociação, concorrência, histórico, venda, comissão e teto (6 testes)

| Teste | Verificação antiga | Para onde foi |
|---|---|---|
| `test_mercado_negociacao.js` | 1) a proposta abre com o valor preenchido | "Faça sua oferta." da v2 (`#pp-v`) |
| | 2) 70% em 2x vira proposta pendente, caixa intacto | mesma tela, enviando; conferido no save |
| | 3) "Minhas propostas" com 1 | Mercado da v2: "Minhas propostas" com 1 e o jogador com "proposta enviada" |
| | 4) retirar volta ao normal | `withdrawOffer` (o mesmo do "Desistir"); a lista volta ao normal |
| | 5, 5b, 6, 7, 7c) aceite com parcelas, parcelas por rodada, recusa, contraproposta, aceitar contraproposta | os mesmos trechos, com `globaisDoMotor` |
| | 7b) contraproposta com botão de aceitar | já é o item 3 do `test_v2_mercado` |
| `test_mercado_concorrencia.js` | 1, 2, 6, 7) concorrente nasce uma vez; disputa ganha e perdida | os mesmos trechos, com `globaisDoMotor` |
| | 3) selo de concorrência em "Minhas propostas" | "Minhas propostas" da v2: "Concorrência" |
| | 4) "Comparar propostas" com as duas colunas e a análise | negociação da v2: "Proposta concorrente" (clube do rival) e a análise |
| | 5) "Aumentar" sobe para o valor do concorrente | "Aumentar proposta" da v2 sugere o valor do rival; enviar grava |
| `test_historico_negociacoes.js` | 1) vazio no início | "Seu histórico começa." da v2 |
| | 2a) o anúncio recebe proposta | o mesmo laço de rodadas de exposição, pelo motor |
| | 2) compra e venda na timeline com o ícone certo | abas "Compras" e "Vendas" da v2 |
| | 3) contador do botão e card "Transferências recentes"; 4) "Fechar" do rodapé | **saíram:** só existiam na tela antiga |
| `test_colocar_a_venda.js` | 1) abre com o valor de mercado | ficha da v2 → "Colocar à venda" (`#ls-v`) |
| | 2) anuncia sem vender | conferido no save |
| | 9/9b) "Vender" no detalhe e o botão vira "Ver anúncio de venda" | ficha da v2 (aba "A temporada em números") |
| | 3, 4b) "Minhas vendas" sem e com proposta | "Jogadores no mercado." e "Escolha a melhor oferta." da v2 |
| | 5) recusar só a proposta | "Recusar só a do …" |
| | 8) cancelar o anúncio | "Retirar do mercado", com confirmação |
| | 4, 6, 7, 7b) proposta nasce; à vista; parcelado com recebíveis | os mesmos trechos, pelo motor |

| `test_comissao_mercado_proposta.js` | 1) sugestão de Mercado da comissão clicável | tela "Fortaleça a comissão." da v2 (`/comissao`): sugestão "Mercado" com o botão "Fazer proposta" |
| | 1b) diálogo intermediário com "Fazer proposta" | **saiu:** na v2 o próprio botão da sugestão é "Fazer proposta" |
| | 2, 2b) abre a proposta real, sem comprar e sem aviso de "aplicada" | leva a "Faça sua oferta."; caixa, elenco e propostas intactos |
| | 3) confirmar cria a proposta | "Enviar proposta" → "Proposta enviada." e a proposta no save |
| `test_wagecap_block.js` | (sem verificação; só imprimia) promover da base com teto baixo | ficha da v2: "Promover ao elenco principal" com o teto em 1 mostra "estouraria o teto salarial" e o jogador continua na base (agora é uma verificação) |

**Correção no `test_loans` (do L3b, já mergeado):**
- O item 5 olhava só a primeira tela da ficha.
- Vender e emprestar ficam na aba "A temporada em números", então a ausência dessas duas ações não era conferida de fato.
- Agora o item confere as duas telas. Achei isso ao escrever o `test_colocar_a_venda`.

**Validação L3c:** `test_mercado_negociacao` 10/10, `test_mercado_concorrencia` 8/8, `test_historico_negociacoes` 4/4, `test_colocar_a_venda` 13/13, `test_comissao_mercado_proposta` 5/5, `test_wagecap_block` 2/2, `test_loans` 8/8. Todos rodados com a saída gravada.

## L3d — busca, filtros, divisões, cards, contratos e olheiros (12 testes)

| Teste | Para onde foi |
|---|---|
| `test_mercado2.js` | **saiu:** não tinha nenhuma verificação (só imprimia). Os três cenários são conferidos em outros testes: vender (`test_colocar_a_venda`), comprar (`test_mercado_negociacao`) e filtrar por goleiro (`test_v2_mercado` item 1, `test_mercado_filtros_ampliados` item 3) |
| `test_mercado_filtros_ampliados.js` | Mercado da v2: "Mostrando 40 de N", "Carregar mais", posição, clube, faixa de overall, busca e o perfil do alvo. A regra dos filtros também está no domínio da v2 (`market.test.ts`) |
| `test_mercado_multi_divisao.js` | regras (carreira multi, três divisões, CPU x CPU, teto de 16) pelo motor; filtro de divisão e compra da Série B pelas telas da v2 |
| `test_mercado_multi_persist.js` | rodada pela ponte do motor da v2; save no servidor na rodada 2, abaixo de 768 KB |
| `test_mercado_multi_season.js` | virada pelo comando do motor; elenco de fora volta ao piso de 12 |
| `test_s4_b3_001_transfer_contract_card.js` | **saiu:** testava só a API dos componentes HTML da tela antiga (`transferCardHTML`, `contractCardHTML`). A v2 tem componentes próprios |
| `test_s4_b3_002_mercado.js` | **saiu:** testava a troca dos cards da lista antiga. Busca, abrir o perfil e propor estão nos testes acima |
| `test_s4_b3_003_negociacao.js` | **saiu:** testava o diálogo da proposta da tela antiga (Esc, camada). Propor e retirar estão no `test_mercado_negociacao`; o foco e o Esc dos diálogos da v2 estão nos testes de foco da v2 (AUD-04/05) |
| `test_s4_b3_004_contratos.js` | tela "Cuide da continuidade." da v2: acesso pelo Elenco, um contrato por jogador (sem emprestados) em ordem de vencimento, "Vencendo", nome levando à ficha, "Renovar" e o estado vazio. "Dispensar" fica na ficha da v2 (`test_v2_elenco_avancado` item 6) |
| `test_ux_mercado_001.js` | Mercado da v2: janela no topo, atalhos acima da lista, filtros com contador, ordenar por idade, as três ações no perfil do alvo e ficar no Mercado depois de propor |
| `test_scout.js` | a regra da faixa de potencial foi para o domínio da v2 (`potential.test.ts`, caso novo com os limites); a ficha da v2 mostra a faixa para o jovem e "Não avaliado" para quem não tem espaço |
| `test_indicacoes_olheiros.js` | estado sem indicação e "Contratar olheiro" pelas telas da v2; missão Profissional pelos comandos do motor, com as indicações (faixa e relatório, sem potencial exato) na tela da v2; catálogo só nacional pelo motor. "Recusar" e "Propor" são o item 8 do `test_v2_clube` |

**Diferenças da v2 em relação à tela antiga (para decisão):**
1. **Nome de jogador num lance da partida** (`test_ux_mercado_001` item 6). Na tela antiga, tocar no nome abria o perfil com as ações de negociação. Os lances da v2 não têm o nome como link.
2. **Faixa de potencial na lista do Elenco** (`test_scout` item 3). A tela antiga mostrava "pot." na linha de cada jovem da base. A v2 mostra a faixa só na ficha.
3. **Card "Mercado" no Início** (`test_ux_mercado_001` item 1). Na v2 o Mercado abre pelo hub do Clube, e a janela aparece no topo do Mercado. Este é desenho já aprovado nas fases da v2, registrado só para constar.

**Validação L3d:** todos rodados com a saída gravada; todas as verificações deram `true`. `test_mercado_filtros_ampliados` 8/8, `test_mercado_multi_divisao` 8/8, `test_mercado_multi_persist` 2/2, `test_mercado_multi_season` 2/2, `test_s4_b3_004_contratos` 7/7, `test_ux_mercado_001` 7/7, `test_scout` 3/3, `test_indicacoes_olheiros` 4/4; v2 122/122.

## Fim do L3
- Os testes de mercado saíram todos da tela antiga.
- `test_reputacao_propostas`, `test_intervalo_noticias_proposta_destino`, `test_s4_b3_005_matchcard_financialsummary` e `test_s4_b3_006_resumo_rodada` não são de mercado e vão para o L4.
- **Lista congelada:** 137 → **110**.
