# Carreira 2.0: fase 12, etapa 3 (finanças no motor)

- **Data:** 05/11/2026.
- **Branch:** `fase12-financas`, a partir de `main` (com o #73, etapa 2).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (05/11):
- **Lançamentos:** o motor calcula e devolve os lançamentos.
- **v2:** usa a folha do motor.
- **Patrocínio:** o embaralhamento das empresas fica idêntico.

## Resultado principal
As regras de dinheiro da Carreira foram para `public/js/motor/financas.js`, **sem mudar valor, regra nem texto do extrato**. O motor calcula e devolve os lançamentos (`{ tipo, rótulo, valor }`); o `carreira.js` só aplica no caixa e no extrato.

## O que foi para o motor
| Função nova | Substitui, no `carreira.js` |
|---|---|
| `wageBill`, `initialFinances` | `wageBillOf` (64 usos, agora delegam) e o orçamento inicial (teto +35% da folha, caixa de ~6 meses) |
| `staffMonthlyCost`, `scoutsMonthlyCost` | custo da comissão (5% da folha) e dos olheiros |
| `sponsorshipTier`, `sponsorProposals`, `sponsorshipSeasonTotal` e as constantes (`SPONSOR_BASE_VALUE`, nomes das empresas) | nível de patrocínio pelo desempenho, as 3 propostas e o total da temporada |
| `stadiumCapacity`, `avgTicketPrice`, `attendancePct`, `ticketRevenue` | capacidade (com obras), preço médio, ocupação pela fase e renda de bilheteria (jogo em casa e amistoso) |
| `monthEntries` | o mês do calendário: folha, comissão, olheiros, patrocínio (1/12) e cota de TV |
| `roundEntries` | a rodada das carreiras sem calendário: 1/4 do mês e 1/38 do patrocínio |
| `settleInstallments` | parcelas a pagar e a receber (`processPendingInstallments` e `processPendingReceivables`) |
| `addLedgerEntry`, `LEDGER_MAX` | o extrato: mais recente primeiro, até 60 lançamentos |

**v2:** a tela Finanças usa a folha do motor (`domain/finance.ts`), no lugar da cópia própria.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker pré-carrega o arquivo.
- Os tipos ficam em `financas.d.ts`.

**Ficam no `carreira.js`:**
- prêmios da Copa (`CUP_PRIZE`), que vão para a etapa da temporada;
- negociações de compra e venda, que vão para a etapa do mercado;
- obras do estádio;
- pedido de orçamento à diretoria.

Esses pontos aplicam valores no caixa, mas a regra deles é de outras etapas.

**Sem mudança de regra, de schema, de API nem de tela.**

## Pontos para sua avaliação
1. **Embaralhamento das propostas de patrocínio:** continua não uniforme (`sort` com comparador aleatório), como decidido. Está anotado no motor para uma entrega de balanceamento.
2. **Parcelas e extrato:** passaram a gerar listas novas em vez de alterar as antigas no lugar. O save fica igual, e o teste confirma.
3. **Teste ajustado:** `test_ge_calendar_001_b2` (verificação 2) esperava 700 ms fixos depois de "Avançar semana". Falhou uma vez sob carga e passou 3/3 sozinho. Agora espera a semana nova aparecer.
4. **Próxima etapa (treino):** levanto e trago as decisões antes.

## Testes
- **Novo `tests/unit/test_motor_financas.js`,** com 6 verificações de equivalência com o código anterior (cópia congelada), 300 carreiras sorteadas cada:
  - folha, orçamento, comissão e olheiros;
  - patrocínio, com o mesmo embaralhamento;
  - bilheteria;
  - mês do calendário (caixa, extrato, textos e limite de 60);
  - rodada sem calendário;
  - parcelas.
- **Unitários da v2:** 117/117; `tsc` limpo; build ok.
- **Testes de finanças, clube, mercado, calendário e temporada:** 24 testes (diretoria, comissão, olheiros, empréstimos, negociação, patrocínio, calendário B1–B3, temporada, Finanças, Clube, Mercado e Semana da v2).
  - Uma falha de tempo no `test_ge_calendar_001_b2`, corrigida (ponto 3).
- **Suíte completa:** 181/189 na 1ª rodada, com a máquina sobrecarregada (o contêiner reiniciou no meio e a carga média chegou a ~28). Das 8 falhas, 6 foram por tempo-limite e 2 de espera de tela. As 8, rodadas de novo junto com os testes de save, passaram: **11/11**. Total: **189/189**.
