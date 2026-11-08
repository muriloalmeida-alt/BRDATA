# Carreira 2.0: plano para tirar a página escondida

- **Data:** 06/11/2026.
- **Status:** aprovado pelo Murilo (07/11), com as 3 recomendações. Etapa A em andamento.
- **Origem:** decisão de 06/11 ("Plano à parte"). A fase 12 fecha com a etapa 6, e este plano trata do que sobra.

## 1. Onde estamos
A v2 ainda abre a página antiga (`carreira.html` com o `carreira.js`) num quadro escondido em `/carreira/motor` e conversa com ela pela ponte (`BRDATA_PONTE`, 85 comandos).

**Já fora da página** (fase 12): as regras, em `public/js/motor/`. São 8 módulos, cerca de 1.400 linhas:
- partida;
- tabela e calendário;
- rodada;
- finanças;
- treino;
- mercado;
- temporada.

**Ainda dentro da página** (`carreira.js`, cerca de 17,6 mil linhas, com perto de 1.000 pontos que mexem na tela):
| Bloco | O que é | Exemplos |
|---|---|---|
| Estado e save | o objeto `CAREER`, a carga e a gravação pela API, as migrações de saves antigos | `persistCareer`, `ponteGravar`, `migrateCareerDefaults` |
| Semana e rodada | avançar a semana, simular a rodada, fechar a rodada (resultados, tabela, moral, lesões, notícias, notificações e objetivos) | `advanceCalendarWeek`, `simulateRound`, `finishRoundTail` |
| Partida ao vivo e pós-jogo | partida em blocos, intervalo, substituições, tática no jogo, coletiva, Copa ao vivo | `goToMatch`, `LIVE_MATCH` (62 usos) |
| Mercado e clube | propostas, anúncios, empréstimos, olheiros, comissão, estádio, patrocínios, loja, conquistas | os comandos `mercado` a `loja` da ponte |
| Temporada e criação | a virada (`advanceSeason`, que já chama o motor), a Copa, a criação de carreira com jogadores reais | `advanceSeason`, `setupCup`, `startCareer`, `buildSquad` |

**Testes:** são 186 E2E. Desses, 153 usam a tela antiga, pelo servidor de testes com `BRDATA_LEGACY_UI=1`, e 30 são da v2.

## 2. Objetivo
A v2 carrega o jogo como um módulo comum, sem quadro escondido, com:
- **a mesma API de comandos:** a ponte passa a ser um objeto importado, e as telas da v2 quase não mudam;
- **o mesmo save:** sem mudança de schema, de API ou de regra.

## 3. Etapas propostas
Cada etapa é um PR, com testes de equivalência como na fase 12, e a v2 continua funcionando entre uma e outra.

| Etapa | O que faz | Como prova |
|---|---|---|
| **A. Jogo sem tela** | Dentro do `carreira.js`, separar a tela da lógica nos caminhos que a ponte usa. Num "modo sem tela", tela, avisos e modais viram eventos (o que a v2 já consome pela ponte) | teste novo que roda uma temporada inteira só pela ponte, num `vm` sem DOM |
| **B. Estado e save** | `CAREER`, a carga e a gravação e as migrações num módulo (`motor/jogo/`) | saves antigos de teste carregam e regravam idênticos |
| **C. Semana e rodada** | avançar a semana e fechar a rodada | equivalência com sorteio fixo, como nas etapas 1–6 |
| **D. Partida ao vivo e pós-jogo** | blocos, intervalo, substituições, coletiva, Copa ao vivo | equivalência e os testes de partida da v2 |
| **E. Mercado e clube** | os fluxos de propostas, anúncios, empréstimos e clube | equivalência e os testes de mercado e clube |
| **F. Temporada, Copa e criação** | `advanceSeason`, Copa e criação de carreira | equivalência e a simulação de várias temporadas |
| **G. Troca na v2** | `adapters/engine.ts` importa o módulo no lugar do quadro. `/carreira/motor` sai | testes da v2, tempo de abertura no celular e tamanho do pacote |

**Ordem recomendada:** A primeiro. É a prova de que a ponte inteira funciona sem tela, e é onde está o maior risco (os 1.000 pontos de tela). De B a F, a ordem segue a dependência. G fecha.

## 4. Riscos
- **Tamanho:** é a maior mudança desde o corte (fase 11), com cerca de 16 mil linhas a separar ou mover. Por isso vai em etapas pequenas, cada uma com equivalência.
- **Pacote da v2:** hoje tem 507 kB. Com o jogo dentro, cresce. A proposta é carregá-lo sob demanda, como o quadro faz hoje.
- **Testes da tela antiga:** os 153 testes dependem dela (ver a decisão 1).
- **Mesmo save em duas abas (D1):** continua como hoje. Não piora nem melhora.

## 5. Decisões (07/11: as 3 recomendações)
1. **Página antiga** (`carreira.html`, que só os testes usam): (a) mantê-la só para os testes, usando o mesmo módulo; ou (b) apagá-la no fim e reescrever os 153 testes pela ponte. Recomendo (a) agora e migrar os testes aos poucos.
2. **Começar pela etapa A** como prova de viabilidade e decidir o resto depois dela? Recomendo que sim.
3. **Pacote da v2:** carregar o jogo sob demanda (recomendado) ou junto com o resto?
