# Carreira 2.0 — Entrega A2: Pausa e intervalo

**Data:** 01/11/2026 · **Branch:** `carreira-v2` · **Status:** aguardando aprovação visual do Murilo

**Referência:** `pranchas/01_partida.png`, coluna 1 (CAP04-T03 "Pausa / Ajustes", Pacote Mobile, parte 2).

**Plano:** `PLANO_BLOCO_PARTIDA.md` (opção A, entregas incrementais). O "Iniciar partida" do Pré-jogo continua abrindo a versão atual até a A4.

**Comparativos:**
- `evidencias/A2-pausa/comparativo-390.png`: referência × Pausa no 2º tempo, intervalo e "Revisar time".
- `evidencias/A2-pausa/larguras-360-430.png`.

## O que foi entregue

### Pausa (`/carreira-v2/partida?tela=pausa`)
- **Abertura:**
  - "Pausar" e "Ajustes" da Partida pausam o jogo pela ponte (`pauseLiveMatch`) e abrem a Pausa.
  - **No intervalo, a Pausa abre sozinha**, uma vez por intervalo, com o título "Intervalo" e o botão "Começar 2º tempo" (`continueFromHalftime`). A partida continua parada aos 45', como hoje.
- **Conteúdo:**
  - placar compacto: escudos, minuto (ou "Intervalo") em dourado e o placar;
  - "Partida pausada" e "Ajuste seu time e retorne quando estiver pronto.", como na prancha;
  - três linhas da prancha:
    - **Revisar time:** abre a escalação em campo.
    - **Substituir jogador:** mostra as substituições usadas (ex.: "0 de 5 usadas") e fica **desativada até a A3**.
    - **Ajustar tática:** **desativada até a A3**.
  - "Retomar partida" (`resumeLiveMatch`) volta à Partida.

### Revisar time (`?tela=time`)
- Mostra a **escalação ao vivo**, que vem da ponte: o estado da partida passou a incluir formação, titulares e banco (`ponteJogador`).
- Ela pode diferir do save, porque substituições e trocas de esquema feitas no jogo só são gravadas no fim.
- Usa o campo da Escalação (só leitura) com overall, nome e selo de indisponível, mais a lista do banco.

### Navegação sem perder a partida
- Partida, Pausa e Revisar time são **vistas da mesma rota** (`?tela=`). A sessão da ponte continua viva entre elas.
- O voltar do sistema leva de Revisar time → Pausa → Partida, que continua pausada, com o botão "Retomar". Nada reinicia.

## Divergências em relação à prancha (para sua avaliação)
1. **"Substituir jogador" e "Ajustar tática" aparecem desativados** até a A3, com o texto "disponível na próxima entrega". O jogador não tem acesso a essas telas enquanto o Pré-jogo não estiver ligado à v2, ou seja, até a A4.
2. **Subtítulo de "Revisar time":** "Veja a escalação em campo." A prancha diz "Veja a escalação e faça ajustes.", mas os ajustes ficam nas outras duas linhas.
3. **Ícones** "Revisar time", "Substituir" e "Ajustar tática" em traço, no lugar dos preenchidos da prancha, no mesmo estilo dos ícones da v2.
4. **Topo com voltar**, no lugar do ☰ da prancha; a v2 não tem menu.
5. **No intervalo:** a mesma tela, com título "Intervalo", subtítulo "Ajuste seu time antes do 2º tempo." e "Começar 2º tempo".

## Testes
- **Unitários:** 49/49 (`npm test`), com o novo teste de "Revisar time" (formação, titulares, indisponível, vaga vazia e banco).
- **E2E novo:** `tests/e2e/test_v2_pausa.js`, com 5 verificações, numa partida real pela ponte:
  1. Pausar abre a Pausa e o minuto fica parado;
  2. Revisar time mostra a escalação igual à do save antes do jogo;
  3. o voltar do sistema retorna à Partida pausada; Ajustes abre a Pausa; Retomar volta a jogar;
  4. no intervalo a Pausa abre sozinha e "Começar 2º tempo" segue;
  5. 360 px, alvos de toque, fim e gravação da rodada.
- **E2E atualizado:** `test_v2_partida.js` (verificações 3 e 4), porque Pausar e o intervalo agora passam pela Pausa.
- **Suíte E2E completa** (servidor isolado): **166/166 passaram**. Desta vez passou também o `test_redesign_a11y_responsivo.js`, a instabilidade intermitente já registrada.

## Arquivos
- `public/js/carreira.js`: escalação ao vivo no estado da ponte (`ponteJogador`, `escalacao`)
- `carreira-v2/src/adapters/match.ts`: tipo `LivePlayer`
- `carreira-v2/src/domain/match.ts` (`buildLiveLineup`) e `match.test.ts`
- `carreira-v2/src/screens/Match.tsx` (`PauseView`, `TeamView`, vistas `?tela=`) e `match.css`
- `carreira-v2/src/ui/icons.tsx`: ícones de troca e tática
- `carreira-v2/src/App.tsx`: `tela`
- `tests/e2e/test_v2_pausa.js`, `test_v2_partida.js` e `tools/capture/capture-v2-partida.js`

## Próxima entrega (só após aprovação)
A3: Substituição em jogo, Ajustar tática e Eventos.
