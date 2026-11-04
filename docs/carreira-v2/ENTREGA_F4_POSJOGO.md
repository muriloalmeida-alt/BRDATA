# Carreira 2.0: fase 4 do plano de independência (pós-jogo)

- **Data:** 04/11/2026.
- **Branch:** `fase4-posjogo`, a partir de `fase3-semana` (PR #61, ainda não mesclado).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências:**
- complemento 17, col. 3 (CAP04-N03, Coletiva);
- complemento 18, col. 1 (CAP04-N04, Resultados da rodada) e col. 2 (CAP05-T05, Proposta recebida);
- complemento 19, col. 2 (CAP04-N05, Copa, volta), aplicado como decidido em P6 e P5.

**Decisões aplicadas** (04/11, todas as recomendadas):
- **Coletiva:** o efeito só aparece depois de responder.
- **Notícias da rodada:** no padrão "Nos bastidores.".
- **Tabela:** só pelo "Ver tabela" dos resultados.
- **Proposta:** Aceitar, Recusar e "Decidir depois".

## Resultado principal
**Acabou a última transição em tela cheia para a versão anterior.**

Antes, o "Continuar" do Resultado mostrava a página antiga por cima da v2 (coletiva, notícias, resultados, Copa, proposta, tabela). Agora cada etapa é uma tela da v2, com o motor sempre escondido, e a sequência termina no Início.

O E2E novo confere duas coisas: o motor nunca aparece e nenhuma navegação passa por `/carreira-old`.

## Sequência
A ordem é a mesma da versão anterior. Cada etapa só aparece quando existe.

| Etapa | Tela | O que mostra |
|---|---|---|
| 1. Coletiva (só quando o jogo sorteia uma) | "Sua vez de falar." | <ul><li>"Coletiva pós-jogo"</li><li>A pergunta e as 3 respostas da biblioteca do jogo (`PRESS_LIBRARY`)</li><li>Ao escolher, a resposta fica marcada e aparece o efeito real ("Reputação +1 · Moral do elenco +3"), com "Continuar"</li><li>"Pular" = sem comentário e sem efeito, como o X de sempre</li></ul> |
| 2. Notícias da rodada | "Nos bastidores." | <ul><li>"Rodada N · as manchetes da rodada"</li><li>Até 3 manchetes, com "Seu clube" quando for o seu</li><li>**Finanças da rodada:** só o que aconteceu (salários, patrocínio, parcelas) e o caixa</li><li>"Continuar"</li></ul> |
| 3. Resultados da rodada | "A disputa continua." | <ul><li>Todos os jogos da rodada, com escudos e placar</li><li>**O seu jogo vem primeiro,** com faixa e nomes em lima</li><li>Mudanças forçadas na escalação, quando houver</li><li>Bloco da Copa do Brasil nas rodadas de Copa: outros confrontos, "Decidido nos pênaltis" e "Seu confronto é jogado agora, ao vivo"</li><li>"Continuar" e "Ver tabela" (a Tabela da v2, que volta aos resultados)</li></ul> |
| 4. Perna da Copa (quando a sua ficou para ser jogada ao vivo) | A Partida da v2 | <ul><li>A faixa aprovada com "Copa do Brasil · 1ª fase · Volta"</li><li>**Na volta, a linha "Agregado: Cuiabá 0 × 1 Ferroviária"** (ida + placar atual)</li><li>Encerrada a volta, "Classificado: X" ou "Decidido nos pênaltis · Classificado: X" (P5, sem placar de pênaltis)</li><li>Sem "Ver tabela"</li><li>"Continuar" volta à sequência</li></ul> |
| 5. Proposta por jogador (quando há) | "Uma oferta chegou." | <ul><li>Jogador (camisa sem número, nome, posição; abre o Perfil) e idade</li><li>Clube interessado e sigla</li><li>**Valor oferecido** em destaque</li><li>Parcelamento (à vista, como o jogo faz)</li><li>Valor de mercado e diferença para o mercado (+ em lima, − em vermelho)</li><li>Botões "Aceitar", "Recusar" e "Decidir depois"</li></ul> |

**Capturas** (pasta `evidencias/F4-posjogo/`, 390×844):
- `01-coletiva.png`;
- `02-coletiva-respondida.png`;
- `03-noticias-rodada.png`;
- `04-resultados-rodada.png` e `04b-resultados-rodada-fim.png`;
- `05-copa-volta-ao-vivo.png`;
- `06-copa-volta-resultado.png`;
- `07-proposta.png`.

**Comparativos prancha × v2:**
- `comparativo-01-coletiva.png`;
- `comparativo-02-resultados.png`;
- `comparativo-03-proposta.png`;
- `comparativo-04-copa-volta.png`.

**Como as capturas foram preparadas:** a coletiva e a proposta foram forçadas na memória do motor. Para mostrar a volta com agregado, a perna pendente da Copa virou "volta" com uma ida 1 × 0. Tudo isso foi feito numa conta de teste, no servidor isolado.

## Motor (ponte), sem regra nova
**Comandos novos:**
- **`iniciarPosJogo`:** ocupa o lugar do antigo `continuarPosJogo` (tela cheia), que continua existindo e não é mais chamado pela v2.
- **`posJogo` (etapa pendente) e `concluirEtapa`:** só leitura.
- **`responderColetiva(letra | null)`:** o mesmo efeito de `applyPressAnswer`; grava.
- **`iniciarPernaCopa`:** `maybeStartPendingCupLegLive`; o fim é `finishCupLegLive`, que grava.
- **`responderProposta("aceitar" | "recusar" | "depois")`:** `acceptOffer` / `declineOffer`; grava.
- **`encerrarPosJogo`.**

**Duas mudanças pequenas na versão anterior, sem efeito nela:**
- O efeito da coletiva saiu de `applyPressAnswer` para `applyPressEffects`, que a ponte também usa. O código foi só movido, sem mudança.
- `finishCupLegLive` não abre os modais de proposta e tabela quando a perna foi iniciada pelo pós-jogo da v2. A ordem é da v2.

O estado da Partida passou a levar o contexto da perna de Copa (ida, pênaltis, quem passou), para a faixa.

## Pontos para sua avaliação
1. **Coletiva:** a prancha mostra 2 respostas; o jogo tem 3 por pergunta, e as 3 aparecem.
2. **Barra inferior:** a prancha mostra a barra nas telas da sequência. Como no resto do fluxo da partida, elas não têm barra nem seta de voltar: são etapas, e o caminho é "Continuar".
3. **Perna da Copa** abre direto na Partida, como hoje, sem uma tela antes.
4. **Bloco da Copa nos Resultados da rodada:** vem da versão anterior e não está na prancha 18.
5. **Recarregar a página no meio do pós-jogo** encerra a sequência, como na versão anterior:
   - o que já foi decidido está gravado;
   - a coletiva e as notícias não respondidas se perdem;
   - uma perna de Copa pendente continua no save, como já acontecia antes.

## Testes
- **Unitários:** 84/84 (6 novos em `domain/postmatch.test.ts`, incluindo agregado e pênaltis da Copa).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_posjogo.js`,** com 6 verificações:
  1. coletiva real, com o efeito igual ao gravado;
  2. notícias da rodada, com o caixa do save;
  3. 10 resultados, o seu primeiro, e "Ver tabela" indo e voltando;
  4. proposta: aceitar vende, com o caixa + valor, e termina no Início na rodada seguinte;
  5. "Pular" não muda nada e "Decidir depois" mantém a proposta no save;
  6. 360 px, sem `/carreira-old` e com o motor nunca visível.
- **Ajustados para o pós-jogo da v2:**
  - `test_v2_resultado.js` (5);
  - `test_v2_tabela_partida.js` (4: a perna da Copa agora é jogada na Partida da v2);
  - `test_v2_gravacao.js` (1: `iniciarPosJogo` bloqueado sem gravação);
  - o helper `continueToHome` (`_v2_match.js`).
- **Suíte completa:** **178/178**.
