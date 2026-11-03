# Carreira 2.0 — Entrega A4: Resultado, pós-jogo e ligação do Pré-jogo

**Data:** 01/11/2026 · **Branch:** `carreira-v2` · **Status:** aguardando aprovação visual do Murilo

**Referência:** `pranchas/02_resultados.png`, coluna 1 (CAP04-T06 "Resultado final", Pacote Mobile, parte 1).

**Plano:** `PLANO_BLOCO_PARTIDA.md` (opção A). Esta é a última entrega do bloco da partida.

**Comparativos** (pasta `evidencias/A4-resultado/`):
- `comparativo-390.png`: referência × Resultado, Ver lances e Ver tabela.
- `fluxo-pos-jogo.png`: Resultado → sequência da versão atual → Início.
- `larguras-360-430.png`.

## Decisões aplicadas
| Tema | Decisão |
|---|---|
| Ligação | **Com a A4, o "Iniciar partida" do Pré-jogo passa a abrir a Partida da v2.** Até a A3 ele abria a versão atual. |
| Pós-jogo (D2) | **"Continuar" leva à versão atual com o que estiver pendente, funcionando como hoje.** É a própria sessão da ponte que aparece em tela cheia, e não uma página nova, porque coletiva e perna de Copa pendentes só existem na memória dessa sessão e se perderiam. |
| Saída no meio (01/11) | O voltar do sistema na Partida pergunta "Sair da partida?":<br>• "Sair e simular o resto" faz o mesmo "Pular para o fim" de hoje: a rodada é gravada e a tela vai para o Resultado.<br>• "Continuar jogando" mantém o jogo.<br>Fechar o app continua perdendo a partida, como hoje. |

## O que foi entregue

### Ponte (versão atual) — sem regra nova
- **No modo ponte, o fim da partida** (`finishLiveMatch`, depois de gravar) **não abre mais o detalhe da partida.** O resumo fica guardado e a v2 mostra o Resultado.
- **`continuarPosJogo()`** executa o mesmo caminho do botão "Continuar" do detalhe (`btnMatchDetailContinue`). A sequência é a de sempre:
  1. coletiva (se houver);
  2. notícias;
  3. resultados da rodada;
  4. perna da Copa ao vivo (se houver);
  5. proposta por jogador (se houver);
  6. tabela.
- **O estado da ponte informa** quando o resumo está pronto (`resultadoPronto`). Também informa o andamento do pós-jogo (`posJogo`: em andamento ou concluído). O pós-jogo conta como concluído quando não há mais modal aberto nem partida ao vivo.

### Na v2
- **Resultado** (`/carreira-v2/partida`, depois do fim):
  - Título pelo placar: "Vitória do Flamengo.", "Derrota do Flamengo." ou "Empate.".
  - Frase factual: "O Flamengo venceu o Cuiabá e somou três pontos no Brasileirão Série A." Na Copa e no amistoso, sem menção a pontos.
  - Faixa do placar com a foto do estádio: competição e rodada, escudos, placar, "90'" e o selo "ENCERRADO".
  - Gols em ordem de minuto (bola lima nos seus), "Ver lances", "Ver tabela" e "Continuar".
  - "Continuar" fica como "Salvando…" até a rodada ser gravada e o resumo estar pronto.
- **Ver lances:** a mesma tela da A3, com "Voltar ao resultado".
- **Ver tabela:** a Tabela da v2, já com a rodada jogada (o save é relido no fim), com "Voltar ao resultado". Isso tudo acontece **sem sair da partida**, porque a sessão da ponte guarda o pós-jogo pendente.
- **Continuar:**
  - a sessão da versão atual aparece em tela cheia e roda a sequência pós-jogo;
  - ao terminar (duas leituras seguidas sem modal aberto), a ponte some e o save é relido;
  - a tela vai para o **Início**, já na rodada seguinte.
- **Saída no meio:**
  - uma entrada extra no histórico segura o voltar do sistema na tela da Partida;
  - o pedido de confirmação abre em folha escura: "Sair da partida?", "Sair e simular o resto" e "Continuar jogando";
  - nas vistas abertas pela Pausa, o voltar continua voltando à Pausa ou à Partida, como na A2 e na A3.
- **Pré-jogo:** "Iniciar partida" agora abre `/carreira-v2/partida?iniciar=1`.

## Divergências em relação à prancha (para sua avaliação)
1. **Frase sob o título** é factual, sem a avaliação "fez uma grande partida" da prancha (o briefing diz "sem recompensas inventadas").
2. **Gols dos dois times,** com o time sob o nome. A prancha mostra só um gol.
3. **"Ver lances"** com ícone de play em traço e **"Ver tabela"** com ícone de lista, no estilo da v2.
4. **Topo** com "RESULTADO" à direita, no lugar do ☰.
5. **Depois de "Continuar", as telas são da versão atual** (notícias, resumo da rodada, tabela, coletiva), como decidido em D2. Elas vêm para a v2 só se você decidir isso no futuro.

## Limitações conhecidas
- **Sair da tela do Resultado pelo voltar do sistema, sem tocar em "Continuar",** perde o que estiver pendente só na memória da sessão (coletiva e o início automático da perna da Copa). É o mesmo que fechar hoje a página no detalhe da partida. A rodada já está gravada.
- **Fechar o app no meio da partida** perde a partida, como hoje.
- **A ponte é a versão atual inteira:** a primeira abertura da partida leva alguns segundos.

## Testes
- **Unitários:** 51/51 (`npm test`). O novo teste do Resultado cobre título e frase pelo placar (pontos só na liga), gols em ordem e a perspectiva mandante/visitante.
- **E2E novo** `tests/e2e/test_v2_resultado.js`, com 5 verificações e partida real:
  1. **Do Início ao jogo:** Início → Preparar partida → Iniciar partida abre a Partida da v2. O voltar pergunta, e "Continuar jogando" segue o jogo.
  2. **Sair e simular:** "Sair e simular o resto" leva ao Resultado, com título pelo placar gravado, gols e "Encerrado". A rodada fica gravada.
  3. **Ver lances e Ver tabela** voltam ao Resultado. A tabela já mostra a rodada jogada.
  4. **Resultado em 360 px:** sem rolagem horizontal e com alvos ≥ 44 px.
  5. **Continuar:**
     - a sessão da versão atual aparece em tela cheia (390×844) com a sequência de sempre;
     - ao terminar, volta ao Início na rodada seguinte, sem a ponte.
- **E2E atualizados** para a ligação final:
  - `test_v2_prejogo.js` (2 e 7): o Pré-jogo abre a Partida da v2;
  - `test_v2_partida.js` (1 e 5), `test_v2_pausa.js` e `test_v2_ajustes.js`: o fim leva ao Resultado.
- **Suíte E2E completa** (servidor isolado): **167/168**. A única falha é a instabilidade já registrada dos chips da aba Jogos da versão atual em 360 px (`test_redesign_a11y_responsivo.js`), que continua aguardando decisão.

## Arquivos
- `public/js/carreira.js`: `PONTE.resumo`, `continuarPosJogo`, estado `resultadoPronto` e `posJogo`; sem detalhe automático no modo ponte.
- `carreira-v2/src/adapters/match.ts`: `continuePostMatch` e `reveal`.
- `carreira-v2/src/domain/match.ts` (`buildResult`) e `match.test.ts`.
- `carreira-v2/src/screens/Match.tsx`: `ResultView`, pós-jogo, proteção de saída e Tabela dentro da partida; mais `match.css`.
- `carreira-v2/src/screens/MatchAdjust.tsx`: "Voltar ao resultado".
- `carreira-v2/src/screens/Table.tsx`: `onBack`.
- `carreira-v2/src/screens/PreMatch.tsx`: Iniciar partida → v2.
- `carreira-v2/src/App.tsx` e `carreira-v2/src/ui/icons.tsx`.
- Testes e captura: `tests/e2e/test_v2_resultado.js` (novo) e os 4 testes ajustados; `tools/capture/capture-v2-resultado.js`.

## Bloco da partida concluído
Partida (A1), Pausa e intervalo (A2), Substituição, Tática e Lances (A3) e Resultado com pós-jogo (A4) estão na v2, ligados a partir do Pré-jogo, com o motor e a gravação de sempre.
