# Carreira 2.0 — Entrega A3: Substituição, Ajustar tática e Lances

**Data:** 01/11/2026 · **Branch:** `carreira-v2` · **Status:** aguardando aprovação visual do Murilo

**Referências** (`pranchas/01_partida.png`, Pacote Mobile, parte 2):
- coluna 2: CAP04-T04, "Substituição em jogo";
- coluna 3: CAP04-T05, "Eventos / estatísticas".

O plano é o `PLANO_BLOCO_PARTIDA.md` (opção A, ponte). O "Iniciar partida" do Pré-jogo continua abrindo a versão atual até a A4.

**Comparativos:** pasta `evidencias/A3-ajustes/`:
- `comparativo-substituicao-lances.png`;
- `pausa-tatica.png`;
- `larguras-360-430.png`.

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Quem sai | Duas etapas. Primeiro, a lista dos titulares em campo; depois, a tela da prancha com Sai (fixo) ⇄ Entra e os reservas disponíveis, mais "Confirmar substituição" e "Cancelar". Mostra o limite real ("Substituições: 1 de 5"). |
| Tática ao vivo | Formação (as 14 do jogo) + os 4 eixos existentes em 5 passos, com os rótulos das pontas. Aviso do custo ao trocar a formação. "Aplicar" e "Cancelar". |
| Lances | Pela Pausa: 4ª linha, "Lances da partida". |

## O que foi entregue

### Na ponte (versão atual) — sem regra nova
- **`substituir(saiId, entraId)`**
  - Valida como a tela atual: substituições restantes (5 + 1 por expulsão), quem sai em campo e quem entra no banco com status "ok".
  - Executa a **mesma** `confirmLiveSub`: a troca na escalação, o contador e o evento "substituição".
- **`aplicarTatica({ formacao, eixos })`**
  - Executa a **mesma** `confirmLiveTactics`, incluindo o custo de familiaridade: −8% por 2 blocos ao trocar de esquema.
- **A partida não volta a rodar sozinha.** As duas funções originais retomam o jogo; a ponte pausa de novo, porque na v2 o ajuste é feito com a partida parada na Pausa. No intervalo nada muda, porque o jogo já fica parado até "Começar 2º tempo".
- **O estado passou a incluir `tatica`:** formação, os 4 eixos (nome, rótulos e nível atual), as formações disponíveis e os blocos de ajuste restantes.

### Na v2 (abertos pela Pausa, com a sessão da ponte viva)
- **Substituir jogador** (`?tela=sai` → `?tela=entra&sai=`):
  - **Etapa 1, "Mude o jogo.":** placar compacto, "Substituições: N de M" e os titulares com overall, posição e condição.
  - **Etapa 2, a prancha:**
    - "Sai" em vermelho e "Entra" em lima, com as setas de troca;
    - "Escolha abaixo" até escolher;
    - "Outros jogadores disponíveis" (reservas aptos);
    - "Confirmar substituição", desativado até escolher, e "Cancelar".
  - **Confirmar:** volta à Pausa já com "1 de 5". A troca aparece em "Revisar time" e nos lances.
  - **Cancelar:** volta à Pausa sem trocar.
  - **Sem substituições restantes,** a linha da Pausa fica desativada com "Sem substituições disponíveis".
- **Ajustar tática** (`?tela=tatica`):
  - "Ajuste a tática." com placar compacto;
  - grade das 14 formações, com a atual marcada;
  - os 4 eixos (Ritmo de jogo, Pressão, Linha defensiva, Estilo de passe) com 5 passos;
  - avisos:
    - ao escolher outra formação: "Trocar a formação durante o jogo faz o time perder um pouco de efetividade nos próximos 2 trechos (30 minutos)";
    - enquanto o time ainda se ajusta: "O time ainda está se ajustando à última troca de formação".
  - "Aplicar" e "Cancelar".
- **Lances da partida** (`?tela=lances`):
  - título e subtítulo da prancha e placar compacto;
  - lista com minuto em dourado, bola nos gols (lima nos seus) e o resto dos lances;
  - termina em "0' Início da partida";
  - "Voltar à partida" leva de volta à Pausa.
- **Pausa:** as linhas "Substituir jogador" e "Ajustar tática" estão ativas, e entrou a linha "Lances da partida".

## Divergências em relação às pranchas (para sua avaliação)
1. **Etapa extra antes da prancha de substituição.** A prancha mostra Sai e Entra já escolhidos, sem dizer como se escolhe quem sai.
2. **Overall na camisa,** no lugar do número, como em toda a v2. Sob o nome aparecem a posição e a **condição física** (%), como na seleção de hoje.
3. **"Substituições: N de M"** com o limite real do jogo. O briefing pede para não inventar limite; este já existe.
4. **A tela de tática não tem prancha própria.** Ela segue o padrão visual da v2 (o item CAP03-T03 da prancha é "condicional").
5. **Lances:**
   - o subtítulo diz "do mais recente ao início" (a prancha diz "em ordem cronológica", mas lista do mais recente para o mais antigo);
   - o início da partida aparece com um círculo, no lugar do apito;
   - a lista inclui chances e defesas, como a lista da Partida.
6. **Topo com voltar,** no lugar do ☰.

## Testes
- **Unitários:** 50/50 (`npm test`). O novo teste de substituição cobre:
  - titulares em campo;
  - só reservas com status ok;
  - limite real.
- **E2E novo** `tests/e2e/test_v2_ajustes.js` (5 verificações, numa partida real pela ponte):
  1. **Quem sai:** 11 titulares e "0 de 5"; Sai fixo; Confirmar fica desativado até escolher; Cancelar não troca.
  2. **Confirmar:** volta à Pausa com "1 de 5" e o jogo continua parado.
  3. **Reflexo da troca:** "Revisar time" e Lances mostram a substituição (quem entrou em campo, quem saiu no banco).
  4. **Tática:** os eixos são os mesmos da versão atual; o aviso do custo aparece; a formação 4-4-2 e a pressão 5 são aplicadas pelo motor, que indica que o time ainda está se ajustando.
  5. **360 px e alvos de toque.** Depois do fim, o save tem rodada +1, formação 4-4-2, pressão 5 e o jogador que entrou como titular.
- **E2E atualizado:** `test_v2_pausa.js` (verificação 1), porque a Pausa agora tem 4 linhas ativas.
- **Suíte E2E completa** (servidor isolado): **167/167 passaram**.

## Arquivos
- `public/js/carreira.js`: `substituir`, `aplicarTatica` e `tatica` no estado da ponte.
- `carreira-v2/src/adapters/match.ts`: `substitute`, `applyTactics` e os tipos `TacticAxis` e `CommandResult`.
- `carreira-v2/src/domain/match.ts` (`buildSubs`) e `match.test.ts`.
- `carreira-v2/src/screens/MatchAdjust.tsx`: Quem sai, Sai ⇄ Entra, Tática, Lances e placar compacto.
- `carreira-v2/src/screens/Match.tsx` (vistas e linhas da Pausa) e `match.css`.
- `carreira-v2/src/App.tsx`: `tela` e `sai`.
- `tests/e2e/test_v2_ajustes.js`, `test_v2_pausa.js` e `tools/capture/capture-v2-ajustes.js`.

## Próxima entrega (só após aprovação)
A4: Resultado da partida e pós-jogo. A A4 também liga o "Iniciar partida" do Pré-jogo à Partida da v2.
