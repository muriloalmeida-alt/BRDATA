# Carreira 2.0: fase 12, etapa 5 (núcleo do mercado no motor)

- **Data:** 05/11/2026.
- **Branch:** `f12-mercado`, a partir de `main` (com o #77, etapa 4).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (05/11):
- **Escopo:** só o núcleo de regras.
- **Contexto:** chega por parâmetro.
- **Sorteio:** vem de fora, sem mudar a ordem.

## Resultado principal
As regras de decisão do mercado foram para `public/js/motor/mercado.js`, **sem mudar regra, número nem texto**. O motor não lê o save. Cada clube chega como um objeto de dados que o `carreira.js` monta (`marketClub`):
- elenco e limites de tamanho;
- força média e ambição;
- titulares, só no seu clube;
- elenco considerado na reserva do vendedor.

A força e a ambição só são calculadas quando a regra precisa, com o mesmo custo de antes.

## O que foi para o motor
| Função nova | Substitui, no `carreira.js` |
|---|---|
| `windowByRound`, `windowByCalendar`, `TRANSFER_WINDOWS`, `urgencyMultiplier` | a janela (rodadas 1–3 e 20–22, ou a fase do ano com calendário) e a urgência no fim dela |
| `necessidadeScore` (déficit de grupo e de qualidade, tamanho do elenco), `adequacaoScore`, `financeiroScore`, `clubBudget`, `contextoScore`, `tablePositionFactor`, `strengthAmbition`, `transferScore` | o interesse do clube (TransferScore: 35/30/20/15) |
| `pickWeightedByScore`, `offerProbabilityFromScore` | a escolha ponderada entre os 5 melhores e a chance de a proposta nascer |
| `transferValuation`, `calculateSellerReservationValue`, `calculateCounterOffer`, `sellerNegotiationDecision`, `buyerHardCap`, `buyerNegotiationDecision`, `negotiateOffer`, `MAX_NEGOTIATION_ROUNDS` | avaliação, reserva do vendedor, contraproposta, decisões dos dois lados e a negociação de até 3 rodadas |
| `offerEffectiveValue` | o peso de uma proposta parcelada (-3% por parcela extra) |

**No `carreira.js`:** as funções antigas ficaram com o mesmo nome e os mesmos parâmetros e só chamam o motor. Por isso propostas, listagens, IA entre clubes CPU, empréstimos, olheiros e a ponte da v2 não mudaram. Os textos da janela ("até o fim de …", "reabre em …") continuam no `carreira.js`.

**v2:** a negociação (Comparar propostas) usa o `offerEffectiveValue` do motor, no lugar da cópia própria.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker pré-carrega o arquivo.
- Os tipos ficam em `mercado.d.ts`.

**Ficam no `carreira.js`** (decisão de escopo):
- propostas enviadas e recebidas;
- listagens;
- IA entre clubes CPU (`simulateAiTransfers`);
- empréstimos;
- olheiros.

**Sem mudança de regra, de schema, de API nem de tela.**

## Pontos para sua avaliação
1. **Testes ajustados:** 2 testes e 1 simulação liam `TRANSFER_WINDOWS` e `MAX_NEGOTIATION_ROUNDS` como variáveis globais da página: `test_transfer_ai_market_dynamics`, `test_transfer_ai_negotiation` e `sim_transfer_ai_market_dynamics`. Agora leem do motor.
2. **Referência congelada em arquivo:** o código antigo ficou em `tests/unit/ref_mercado_antes.js`, porque tem textos com crase que não cabem dentro do teste. O executor só roda os arquivos `test_*`, então ele não roda sozinho.
3. **Etapa 6 (temporada):** é a última. Levanto e trago as decisões antes.
4. **`test_v2_ajustes` intermitente:** o teste acha quem entrou pelo nome curto ("G. Costa"). Com elenco sorteado, dois jogadores podem ter o mesmo nome curto, e o teste pegava o do banco. A causa mais provável é essa, mas não consegui reproduzir. Agora, entre homônimos, ele prefere o que está entre os titulares. A regra do jogo não mudou.

## Testes
- **Novo `tests/unit/test_motor_mercado.js`:** compara as funções antigas (congeladas) com as novas (do `carreira.js` atual, já chamando o motor). As duas rodam no mesmo mundo sorteado, com 14 clubes, tabela, outra divisão e o seu clube, e com o mesmo `Math.random`. São 120 mundos por verificação, todas iguais:
  1. janela por rodada e pelo calendário, com os textos, e a urgência;
  2. TransferScore e as 4 partes, orçamento e ambição;
  3. avaliação, reserva, contraproposta, teto e decisão do comprador, vendendo você ou um CPU, com âncora, concorrência e pedido;
  4. negociação completa e sorteios: decisão do vendedor, `negotiateOffer`, escolha ponderada e comprador interessado.
  - **Contraprova:** mudei 0,10 → 0,11 num fator da avaliação, e as verificações 3 e 4 falharam.
- **Testes de mercado:** 29/29, entre eles:
  - Transfer AI (oferta, avaliação, negociação, dinâmica, balanço 1.3.2);
  - mercado multi-divisão e entre temporadas;
  - concorrência, negociação, empréstimos, olheiros, colocar à venda e histórico;
  - Mercado e Comissão da v2.
- **v2:** 117/117 unitários, `tsc` limpo, build regenerado e `verificar-bundle-v2` idêntico. Mercado, Comissão e corte da v2 passaram de novo depois do build (4/4).
- **Suíte completa:** 191/192. A falha foi `test_v2_ajustes` (verificação 5: quem entrou na substituição tinha de estar entre os titulares depois da partida). Rodado de novo, passou 3/3 (ponto 4).
