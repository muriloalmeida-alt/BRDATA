# Carreira 2.0: sem página escondida, etapa D2 (pós-jogo no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-d2`, a partir de `main` (com o #87, etapa D1, e o #88, Copa antiga).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisão aplicada (09/11):** a regra da coletiva vai para o motor e o modal fica na tela. A perna da Copa ao vivo e o amistoso ao vivo terminam no motor, do mesmo jeito que a partida da D1.

## Resultado principal
O pós-jogo foi para `public/js/motor/posjogo.js`, **sem mudar regra nem texto**:
- **Coletiva de imprensa:**
  - **O que foi para o motor:** o disparo (`firePressConference`) e o efeito da resposta (`applyPressEffects`: reputação, moral do elenco e o registro no `pressLog`), mais as constantes da coletiva.
  - **Coletiva pendente:** a coletiva aguardando resposta (`PENDING_PRESS`) e o aviso de que ela faz parte do pós-jogo (`PRESS_CHAIN_TO_ROUND_RESULTS`) moram em `motor/estado.js`, como o `LIVE_MATCH`. O `carreira.js` e a ponte da v2 seguem usando os mesmos nomes.
  - **Na página:** o modal, o fechar e o aviso "Coletiva respondida".
- **Perna da Copa ao vivo:**
  - **No motor:** o início (adversário, XI dele e a partida) e o fim (placar no confronto, recuperação, renda em casa, evolução por idade e, na volta, a decisão da fase).
  - **Na página:** apito, torcida, o aviso "Copa do Brasil — Ida/Volta decidida" e a proposta ou a Tabela que vêm depois.
- **Amistoso ao vivo:**
  - **No motor:** o início (o 1º convite se nenhum foi escolhido, e o registro do que o amistoso não pode mudar) e o fim:
    - só metade das lesões vale;
    - cartões e números oficiais voltam ao que eram;
    - a bilheteria é reduzida;
    - entram o resultado no calendário e a notificação.
  - **Na página:** a virada da semana, o resumo da semana para a v2, a gravação e o aviso.

**No `carreira.js`:**
- As funções viraram atalhos ou chamam o motor.
- As constantes (escala de moral e reputação da coletiva, limite do registro, parte da bilheteria do amistoso) leem do motor, com os mesmos nomes.
- O arquivo caiu de 15.977 para 15.921 linhas.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker o pré-carrega.
- Os tipos estão em `posjogo.d.ts` e `estado.d.ts`.

**Sem mudança de regra, de save, de API nem de tela.**

## Pontos para sua avaliação
1. **Etapa D concluída.** Com a D1 e a D2, a partida e o pós-jogo têm a regra no motor. A tela da página antiga só desenha e controla o relógio.
2. **Teste antigo corrigido (`test_coletiva_imprensa`):**
   - **O problema:** quando sorteava uma proposta por jogador depois da rodada, o teste tentava fechar a Tabela antes de ela abrir, recusava a proposta, e o jogo então abria a Tabela. A Tabela aberta tapava o clique seguinte.
   - **Por que não é da D2:** o defeito era do teste e já existia antes.
   - **Correção:** o teste agora fecha a Tabela depois de recusar a proposta.
3. **Próximas etapas do plano:**
   - **E (mercado e clube):** os fluxos de propostas, anúncios, empréstimos, olheiros, comissão, estádio, patrocínio e loja.
   - **F (temporada e criação):** a virada de temporada, a montagem da Copa da temporada nova e a criação de carreira.
   - **G:** a v2 passa a importar o motor, sem a página escondida.

## Testes
- **Novo `tests/unit/test_motor_posjogo.js`** compara as funções antigas (congeladas em `tests/unit/ref_posjogo_antes.js`) com as de hoje.
  - **Como roda:** cada lado num `vm` com o próprio motor, com a tela, os sons e o relógio substituídos por registros. São 120 mundos, cada um com:
    - coletivas disparadas (com e sem pós-jogo) e respondidas (resposta válida e inválida);
    - as pernas da Copa expandida do seu time ao vivo, com blocos um a um, "pular pro fim" e a decisão da fase;
    - 6 amistosos ao vivo em semanas sem jogo.
  - **O que confere:** retornos, save, avisos e a sequência de tela, sons e timers, todos iguais.
  - **Cobertura:** 401 respostas de coletiva, 582 pernas da Copa ao vivo, 720 amistosos e 57 lesões de amistoso confirmadas.
  - **Contraprova:** mudei, um por vez, a escala da moral na coletiva, o aviso de coletiva no pós-jogo, a chance de a lesão de amistoso valer, a bilheteria do amistoso e o placar da ida da Copa. A verificação certa falhou em cada caso.
- **Texto idêntico:** o `paginaComoAntes` cobre também o `posjogo.js`. As 6 funções e constantes movidas sem mudança remontam iguais, caractere por caractere, às de antes.
- **Testes do pós-jogo (ponta a ponta):**
  - **O grupo:** são 12 testes (coletiva, coletiva na renovação, Copa, motor da Copa, Copa expandida, amistoso pelo calendário, modais do pós-jogo, pós-jogo e semana da v2, jogo sem tela, partida ao vivo e partida da v2).
  - **Resultado:** o grupo passou 3 vezes seguidas depois da correção do `test_coletiva_imprensa`.
  - **Falha isolada:** o `test_v2_semana` falhou uma vez nessas rodadas. Depois passou 4 vezes num grupo menor, e não reproduziu.
- **Testes do motor e da v2:** todos passam (v2: 117/117).
- **Suíte completa (com o Postgres temporário):** _em andamento_.
