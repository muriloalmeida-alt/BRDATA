# Carreira 2.0 — Entrega 08: Finanças

**Data:** 01/11/2026 · **Branch:** `carreira-v2` · **Status:** aguardando aprovação visual do Murilo

- **Referência:** `pranchas/06_clube.png`, coluna 2 (CAP02-T06, Pacote Mobile, parte 2).
- **Comparativos:**
  - `evidencias/08-financas/comparativo-390.png`
  - `evidencias/08-financas/larguras-360-430.png`

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Conteúdo | Saldo, folha salarial × teto em texto (sem barra) e últimas movimentações do extrato com "Ver extrato completo". Patrocínios, estádio, comissão técnica e pedido de orçamento ficam numa linha que abre o Clube da versão atual. |
| Cor do saldo | Lima, como na prancha; vermelho quando negativo |

## O que foi entregue

### Finanças (`/carreira-v2/finanças` → rota `/carreira-v2/financas`)
- Título "FINANÇAS" com o traço dourado e "Cuide do seu clube.", como na prancha.
- **Saldo disponível:** grande, em lima, ou em vermelho quando negativo. Formato curto igual ao da versão atual (`fmtBRLShort`).
- **Folha salarial:** "R$ 4,3 mi de R$ 5,9 mi".
  - A folha é a mesma da versão atual (`wageBillOf`): elenco principal + emprestados, sem a base.
  - O teto é `finances.wageCap`.
  - Quando a folha passa do teto, aparece "Acima do teto salarial" em vermelho. É o mesmo critério do alerta vermelho de hoje.
- **Ver elenco** abre o Elenco da v2. **Ver mercado** abre o Mercado da versão atual (`#mercado`). Os dois têm seta lima, como na prancha.
- **Últimas movimentações:** os 5 lançamentos mais recentes do extrato da versão atual (`financeLedger`), na mesma ordem, com a rodada e o valor:
  - "+" em lima para entradas;
  - "−" em vermelho para saídas.
- **"Ver extrato completo":** mostra todos os lançamentos (até 60, o limite atual), agrupados por rodada.
- **"Patrocínios, estádio e orçamento":** abre o Clube da versão atual (`#financas`).
- **"Voltar ao clube":** leva ao Início e fica fixo no rodapé.
- **Ligações:**
  - a linha "Finanças" do Início agora abre esta tela;
  - na versão atual, o mapa de atalhos ganhou `mercado` (sem mudança de regra).
- **Só leitura:** a tela não grava nada e não tem nenhum controle de dinheiro.

## Divergências em relação à prancha (para sua avaliação)
1. **Folha salarial, últimas movimentações e a linha "Patrocínios, estádio e orçamento"** não estão na prancha; vieram por decisão de 01/11.
2. **Saldo em vermelho quando negativo**, como decidido. A prancha só mostra o caso positivo.
3. **Topo com voltar**, como nas outras telas internas. A prancha só tem o wordmark.
4. **Extrato completo dentro da própria tela**, expandindo a lista, sem os filtros por tipo que a versão atual tem. Os filtros continuam acessíveis pelo Clube da versão atual.

## Testes
- **Unitários:** 43/43 (`npm test`), 3 deles de Finanças:
  - saldo curto;
  - folha (principal + emprestados, base fora) × teto;
  - saldo negativo;
  - folha acima do teto;
  - ordem e sinal do extrato;
  - save sem esses campos.
- **E2E novo** `tests/e2e/test_v2_financas.js`, com 5 verificações:
  1. Início → Finanças: saldo e folha × teto iguais aos da versão atual.
  2. Últimas 5 iguais às 5 primeiras do extrato atual; "Ver extrato completo" mostra todas, agrupadas por rodada.
  3. Saldo negativo em vermelho e "Acima do teto salarial".
  4. Atalhos, 360 px, alvos de toque e nada gravado.
  5. "Ver mercado" abre o Mercado da versão atual; "Voltar ao clube".
- **Suíte E2E completa** (servidor isolado): 162/164 na primeira execução. As duas falhas foram em telas da versão atual:
  - **`test_h2h.js`:** o modal da tabela da versão atual interceptou um clique. Reexecutado isoladamente 2×, passou nas duas.
  - **`test_redesign_a11y_responsivo.js`:**
    - Mede os chips da aba Jogos da versão atual, em 360 px, contra o limite de 40 px. A altura oscila na casa decimal (≈39,x px, exibida arredondada como "40") conforme o carregamento da fonte.
    - Isoladamente passou 1 de 2 vezes.
    - É a 2ª entrega seguida em que aparece; a aba Jogos e o CSS da versão atual não foram tocados por nenhuma entrega da v2.
    - **Instabilidade registrada, não corrigida.** É candidata a ajuste do próprio teste ou do chip, que fica a seu critério.

## Arquivos
- `carreira-v2/src/domain/finance.ts` e `finance.test.ts`
- `carreira-v2/src/screens/Finance.tsx` e `finance.css`
- `carreira-v2/src/App.tsx` (rota)
- `carreira-v2/src/screens/Home.tsx` (Finanças vira link interno)
- `carreira-v2/src/adapters/legacy.ts` (`mercado`)
- `carreira-v2/src/domain/types.ts` (`wageCap`, `financeLedger`, `wage`)
- `public/js/carreira.js` (atalho `mercado`)
- `tests/e2e/test_v2_financas.js` e `tools/capture/capture-v2-financas.js`

## Sequência do pacote
Com Finanças, fecha a sequência sugerida pelo pacote: Fundação, Início, Escalação, Escolher substituto, Pré-jogo, Tabela, Calendário, Elenco, Perfil do jogador, Diretoria e Finanças.

Fica pendente, por decisão de 01/11, o bloco da partida: Partida, Pausa, Substituições e Resultado. Ele depende de um plano técnico para tirar o motor de jogo do `carreira.js`. Os demais itens do inventário só entram depois da validação dos contratos.
