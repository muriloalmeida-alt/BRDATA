# Carreira 2.0 — Plano técnico do bloco da partida

**Data:** 01/11/2026 · **Status:** abordagem aprovada em 01/11 (decisões na seção 6). Entregas A1–A4 seguem uma por vez, com aprovação.

**Telas do bloco:** Partida (`referencias_anteriores/partida.png`), Pausa, Substituição em jogo e Eventos (`pranchas/01_partida.png`), e Resultado final (`pranchas/02_resultados.png`, coluna 1).

## 1. Como a partida funciona hoje (auditoria do `public/js/carreira.js`)

| Etapa | Função (linha aprox.) | O que faz |
|---|---|---|
| Disparo | `goToMatch` (~12620) | Aplica a tática da tela (`commitLineupTactics`) e o treino da semana (`applyWeeklyTraining`) e chama `simulateRound`. |
| Rodada | `simulateRound` (8891) | Sem jogo do seu clube: `resolveRoundInstant`. Com jogo: resolve na hora os outros 9 jogos e abre o ao vivo (`startLiveMatch`). |
| Ao vivo | `startLiveMatch` (9054) | Cria `LIVE_MATCH`, estado **só em memória**, nunca salvo: placar, eventos, XI do adversário, substituições, estatísticas, fila de destaques. |
| Blocos | `resolveLiveChunk` (9137) | 6 blocos (15', 30', **45' com pausa obrigatória no intervalo**, 60', 75', 90'). Em cada bloco:<br>• recalcula a força do seu time (`computeHumanStrength` lê escalação e tática **na hora**);<br>• sorteia os gols (`poissonSample(..., Math.random)`);<br>• aplica desgaste, cartões e lesões (`applyMatchWearChunk` **altera `CAREER.squad`**);<br>• atribui chances, pênaltis e VAR. |
| Controles | `pauseLiveMatch`, `resumeLiveMatch`, `continueFromHalftime`, `confirmLiveSub` (9699), `confirmLiveTactics` (9732), `skipLiveMatch` (9337) | Pausa e retoma. Substituição limitada a 5, +1 por expulsão. Troca de esquema custa −8% por 2 blocos. Velocidade 1×/2×. "Pular pro fim". |
| Fim | `finishLiveMatch` (9354) | Atualiza:<br>• tabela e resultados;<br>• estatísticas;<br>• recuperação de condição;<br>• bilheteria;<br>• `matchLog`;<br>• forma recente;<br>• moral;<br>• objetivos (com *toasts*);<br>• evolução por idade.<br>Depois chama `finishRoundTail`, pode disparar a **coletiva de imprensa**, chama `persistCareer` e abre os modais de resultado. |
| Fim da rodada | `finishRoundTail` (8698–8865) | Passa por ~25 sistemas:<br>• folha, comissão, olheiros, patrocínio, parcelas e recebíveis (`pushLedger`);<br>• outras divisões;<br>• Copa;<br>• mercado da IA, anúncios e propostas;<br>• empréstimos;<br>• estádio;<br>• calendário;<br>• notícias;<br>• disponibilidade e `autoFixLineup`. |
| Variantes | `startCupLegLive`/`finishCupLegLive` (9476/9516), `startFriendlyLive` (12479) | A perna da Copa e o amistoso usam o mesmo ao vivo, mas têm fechamento próprio. |

### Pontos que decidem a arquitetura
1. **O motor e a rodada inteira vivem no `carreira.js`.** São cerca de 1 MB, 17 mil linhas, sobre o objeto global `CAREER`. O fim da rodada sozinho mexe em cerca de 25 sistemas, e cada um puxa outras funções do mesmo arquivo.
2. **A aleatoriedade não tem semente.** O arquivo usa `Math.random` em 62 pontos, 6 deles no bloco ao vivo. Por isso a partida não é reproduzível hoje (CLAUDE.md §12/§44 pedem determinismo).
3. **O estado da partida não é persistido.** Fechar a página no meio perde a partida; nada é gravado até o fim.
4. **O fim da partida tem efeitos de interface** misturados à regra (*toasts*, coletiva, modais de resultado e de rodada, destaques de gol).

## 2. Opções

### Opção A — Ponte com a versão atual (motor intacto)
A v2 abre a versão atual num **quadro invisível, na mesma origem**, em "modo ponte". Ela conversa com o motor por uma API pequena, e a versão atual continua sendo o único motor e o único lugar que grava a rodada.

- **Na versão atual entra só a API da ponte**, sem mudar regra:
  ```text
  window.BRDATA_PONTE = {
    iniciar(), estado(), pausar(), retomar(), continuarIntervalo(),
    substituir(saiId, entraId), aplicarTatica({ formation, tactics }),
    pularParaFim(), aoMudar(callback), aoTerminar(callback)
  }
  ```
  - `estado()` devolve uma cópia do que `renderLiveMatch` já desenha: minuto, placar, eventos já com texto, intervalo, substituições restantes, titulares e banco.
  - Em modo ponte, a versão atual **não abre os próprios modais**: destaque de gol, intervalo, resultado e rodada. Ela avisa a v2, que desenha as telas.
- **Na v2:**
  - uma porta nova, `MatchGateway`, na camada anticorrupção, que esconde a ponte;
  - as telas Partida, Pausa, Substituição, Eventos e Resultado.
- **Prós:**
  - zero mudança de regra ou de motor;
  - o save continua gravado pelo mesmo `persistCareer`;
  - a Copa e o amistoso vêm junto.
- **Contras:**
  - carrega a versão atual inteira (~1,4 MB sem compressão) no celular, só durante a partida;
  - acopla a v2 ao formato de `LIVE_MATCH`;
  - no modo ponte, os modais que abrem sozinhos ao entrar (tutorial, assistente, login diário) precisam ficar para a próxima abertura normal.
- **Esforço:** médio, com 4 entregas de tela e a ponte na primeira.

### Opção B — Extrair o motor para um módulo comum (incremental, CLAUDE.md §40)
Mover para `public/js/engine/` as funções da partida e, depois, do fim da rodada, **sem DOM e sem mudar regras**. A versão atual e a v2 passariam a usar o mesmo arquivo.

1. **B1:** a aleatoriedade vira parâmetro (`rng`, padrão `Math.random`, com o mesmo comportamento). Abre caminho para semente e testes reproduzíveis.
2. **B2:** o bloco ao vivo vira função pura, `resolverBloco(estado, contexto, rng) → { gols, eventos, desgaste }`. Teste de equivalência: mesmo `rng` semeado, motor antigo × novo, N partidas, saída idêntica.
3. **B3:** o fim da partida e o fim da rodada viram `aplicarResultado(career, resultado, rng)`. Os efeitos de interface viram uma lista de "avisos" devolvida, não mais *toasts* diretos.
4. **B4:** as telas da v2 rodam a partida e gravam a rodada pelo `PUT` atual.

- **Prós:** é a arquitetura certa a longo prazo (determinismo, testes, servidor no futuro); tira o peso do celular.
- **Contras:**
  - mexe no código do motor (sem mudar regra), o que o pacote proíbe sem a sua autorização;
  - B3 é a maior parte do `carreira.js`;
  - várias entregas antes de qualquer tela nova;
  - risco de regressão, controlado pelos testes de equivalência;
  - a v2 passa a gravar a rodada inteira.
- **Esforço:** alto: 4 etapas técnicas e depois as telas.

### Opção C — Só o visual da tela ao vivo atual
Aplicar o visual das pranchas ao `#liveMatchOverlay` de `carreira.html`, só HTML/CSS, com o motor intacto.

- **Prós:** rápido e sem risco de regra.
- **Contras:** evolui a versão antiga, não a v2, e não remove a dependência.

## 3. Recomendação
**A agora, com B como caminho posterior.** As telas usam a porta `MatchGateway` desde a primeira entrega. Quando (e se) a opção B for feita, troca-se só o que está atrás da porta, sem refazer as telas. A opção A respeita a regra do pacote ("não alterar motor, regras, cálculos, schema, persistência") e entrega as telas do bloco sem risco de regra.

## 4. Entregas propostas (opção A, uma por vez, com aprovação)
| # | Entrega | Conteúdo |
|---|---|---|
| A1 | Ponte + **Partida** | Modo ponte na versão atual. `MatchGateway`. "Iniciar partida" do Pré-jogo passa a abrir a Partida da v2. Tela com placar, minuto, tempo, último evento, lances e as ações Pausar e Ajustes. |
| A2 | **Pausa** + intervalo | "Partida pausada", Revisar time, Substituir jogador, Ajustar tática, Retomar. O intervalo dos 45' usa a mesma tela. |
| A3 | **Substituição** + **Eventos** | Sai e Entra, com o limite real de 5 (+1 por expulsão) e o custo de familiaridade da troca de esquema, além da lista de lances. |
| A4 | **Resultado** | Placar final, gols, "Ver lances", "Ver tabela" e "Continuar". O que vier depois na versão atual (coletiva de imprensa, resultados da rodada, notícias, propostas) segue a decisão D2 abaixo. |

**Testes de cada entrega:**
- E2E jogando partidas reais pela v2, comparando o save gravado com o de uma partida igual pela versão atual (mesmos sistemas tocados);
- a suíte completa da versão atual, que precisa continuar 100%.

## 5. Decisões que preciso de você
- **D1 — Abordagem:** A (recomendada), B ou C.
- **D2 — O que vem depois do resultado:**
  - opção 1: a v2 mostra o Resultado e "Continuar" abre na versão atual o que estiver pendente (coletiva, resumo da rodada);
  - opção 2: essas telas também entram na v2 em entregas futuras.
- **D3 — Controles que existem e não estão nas pranchas:** velocidade 1×/2×, "Pular pro fim" e estatísticas de posse e finalizações. Essas estatísticas são decorativas no motor, e o briefing proíbe estatísticas não verificadas. Ficam, saem ou vão para a versão atual?
- **D4 — Semente/determinismo:** fica fora (A não muda o motor) ou entra já como B1, isolado e com teste de equivalência?

## 6. Decisões do Murilo (01/11)
| # | Decisão |
|---|---|
| D1 | **Opção A, a ponte com o motor intacto.** B fica como caminho futuro, atrás da porta `MatchGateway`. |
| D2 | **Depois do Resultado, "Continuar" abre a versão atual** com o que estiver pendente (coletiva, resumo da rodada), funcionando como hoje. |
| D3 | **Velocidade 1×/2× e "Pular pro fim" entram, de forma discreta.** As estatísticas de posse e finalizações ficam fora da v2. |
| D4 | **Semente e determinismo ficam fora por enquanto.** Entram na futura etapa B1. |
