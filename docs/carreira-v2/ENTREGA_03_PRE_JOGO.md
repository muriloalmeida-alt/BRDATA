# Carreira 2.0 — Entrega 03: Pré-jogo

**Data:** 01/11/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

- **Referência:** `referencias_anteriores/pre_jogo.png` (Pacote Mobile, parte 1).
- **Comparativos:** `evidencias/03-pre-jogo/comparativo-390.png` e `evidencias/03-pre-jogo/larguras-360-430.png`.

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Titulares no campo | Com nome, igual à Escalação (overall na camisa) |
| Iniciar partida | Começa direto: abre a versão atual na partida ao vivo (atalho `#iniciar` → `goToMatch`) |
| Avisos da confirmação atual | Linhas de alerta no estilo do Início, só quando existirem |
| Camisa em lima da prancha | Sem destaque (o jogo não guarda "quem entrou por último") |

## O que foi entregue

### Pré-jogo (`/carreira-v2/pre-jogo`)
- Topo: voltar · wordmark · "PRÉ-JOGO".
- Título "É hora de jogar." e "Brasileirão Série A · Rodada N".
- Faixa do confronto com a foto CEN-02 (a mesma do Início), escudos oficiais e data sem horário ("12 MAR").
- "SUA ESCALAÇÃO" mostra a formação real e o campo só leitura com os 11 titulares, usando o mesmo componente da Escalação, em versão compacta.
- Avisos (os mesmos critérios e textos da confirmação atual):
  - escalação incompleta (`N/11 titulares…`);
  - titular indisponível (lesionado/suspenso);
  - semana de 2 jogos com titulares cansados.
  - Cada aviso leva à Escalação da v2.
- "Revisar escalação" abre a Escalação da v2, e o voltar retorna ao Pré-jogo.
- "Iniciar partida" leva para `/carreira#iniciar`. A versão atual executa a mesma função de "Ir para o jogo" de hoje: aplica a tática, aplica o treino da semana e abre a partida ao vivo.
- "Voltar" retorna à tela anterior.
- Fora da semana de jogo (pré-temporada, folga, temporada encerrada), `/pre-jogo` volta ao Início.
- O pré-jogo não grava nada no save.

### Ligações
- "Preparar partida" (Início e Escalação) agora abre o Pré-jogo da v2.
  - Os outros CTAs ("Avançar semana", amistoso, "Próxima temporada") continuam na versão atual.
- O voltar da Escalação passou a retornar à tela de onde se veio (Início ou Pré-jogo).
- Versão atual: novo atalho `iniciar` no mapa `V2_DEEP_LINKS`.
  - Fora de semana de jogo, ele cai no botão principal de sempre.
  - Nenhuma mudança no motor.

## Divergências em relação à prancha (para sua avaliação)
1. **Data sem horário** ("12 MAR"): o calendário não tem hora de jogo. A rodada fica no subtítulo, como na prancha.
2. **Nomes sob as camisas**, como decidido. Com isso o campo fica um pouco mais denso que o da prancha.
3. **Overall na camisa** no lugar do número, como na Escalação.
4. **Linhas de aviso** aparecem só quando o aviso existe. Na prancha não há avisos.
5. **Wordmark itálico**, como nas demais telas da v2 (a prancha do Pré-jogo também usa itálico).

## Testes
- **Unitários:** 22/22 (`npm test`), 3 deles do Pré-jogo.
- **E2E novo** `tests/e2e/test_v2_prejogo.js` (7 verificações):
  1. pré-temporada volta ao Início;
  2. Início → Pré-jogo com os dados do save;
  3. Revisar escalação e volta;
  4. avisos;
  5. sem gravação;
  6. 360 px e alvos ≥ 44 px;
  7. Iniciar partida abre a partida ao vivo.
- **Atualizados:** `test_v2_inicio.js` (4) e `test_v2_escalacao.js` (1). O CTA "Preparar partida" agora aponta para o Pré-jogo.
- **Suíte E2E completa** (servidor isolado): 158/159 na primeira execução. A falha foi em `test_botoes_rodape.js`: o modal aleatório de proposta por jogador (`#playerOfferOverlay`) abriu depois da rodada e interceptou o clique do menu. O teste não passa por nenhuma tela da v2 nem pelo atalho `iniciar`. Reexecutado isoladamente 3×: **3/3 passaram**. É uma instabilidade já existente do teste, registrada aqui, mas não corrigida nesta entrega.

## Arquivos
- `carreira-v2/src/domain/prematch.ts` e `prematch.test.ts`
- `carreira-v2/src/screens/PreMatch.tsx` e `prematch.css`
- `carreira-v2/src/ui/pitch.tsx`: campo extraído da Escalação, com modo só leitura
- `carreira-v2/src/ui/components.tsx`: `CtaLink`
- `carreira-v2/src/ui/router.tsx`: `goBack`
- `carreira-v2/src/App.tsx`: rota
- `public/js/carreira.js`: atalho `iniciar`
- `tests/e2e/test_v2_prejogo.js` e `tools/capture/capture-v2-prejogo.js`

## Próxima tela (só após aprovação)
Partida.
