# Carreira 2.0: sem página escondida, etapa D1 (partida ao vivo no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-d`, a partir de `main` (com o #86, etapa C3).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (09/11):
- **Corte:** a etapa D foi dividida em 2 partes. A D1 é a partida; a D2 é o pós-jogo.
- **Relógio:** é da tela.
- **Estado da partida:** mora no módulo de estado.

## Resultado principal
A partida do seu time ao vivo foi para `public/js/motor/aovivo.js`:
- **Início:** adversário, XI do adversário e os outros jogos da rodada.
- **Cada bloco de 15 minutos:**
  - força, gols e autores, chances, pênaltis perdidos, cartões, lesões, desgaste e estatísticas;
  - marcação individual, adversário motivado e penalidade de troca de esquema.
- **Durante o jogo:** substituição e tática.
- **Fim do jogo:** tabela, estatísticas do time e do clube, renda em casa, histórico de confrontos, forma, moral do elenco, objetivos, evolução por idade, o fechamento da rodada (C3) e a coletiva que o jogo pede.
- **A rodada:** sem jogo seu, resolve na hora. Com jogo seu, abre a partida ao vivo.

**Como ficou dividido:**
- **Regras auxiliares** (moral depois do jogo, estatísticas, gatilhos da coletiva com a biblioteca de perguntas, renda, motivação, marcação, substituição, tática): foram movidas com o texto igual. São 36 funções e constantes.
- **As 4 funções que misturavam regra e tela** (`startLiveMatch`, `resolveLiveChunk`, `finishLiveMatch`, `simulateRound`):
  - **No motor:** a parte de regra (`iniciarPartida`, `resolverBloco`, `encerrarPartida`, `simulateRound`), com o texto de antes.
  - **Na página:** a parte de tela continua, com a mesma ordem: abrir a partida, desenhar, apito, torcida, destaque de gol, intervalo, timers, detalhe do jogo e gravação.

**O relógio é da tela:**
- **O motor não tem timer:** resolve o próximo bloco quando pedem.
- **A página antiga:** continua com os timers de sempre (0,9 s ou 0,45 s por bloco e a pausa no intervalo).
- **A v2:** poderá ter o dela na etapa G.

**O estado da partida (`LIVE_MATCH`):**
- **Onde mora:** em `motor/estado.js`, como o `CAREER`.
- **No `carreira.js`:** continua lendo e escrevendo pelo mesmo nome.
- **Testes e ponte:** continuam funcionando sem mudança.

**Avisos:** o "Objetivo concluído!" da sequência de 3 vitórias e o aviso de troca de esquema viram o evento `aviso`, como nas etapas C.

**Na página até a D2:** a perna da Copa ao vivo, o amistoso ao vivo e a coletiva em si (o modal e as respostas).

**No `carreira.js`:**
- As constantes (minutos dos blocos, limite de substituições, biblioteca da coletiva etc.) leem do motor, com os mesmos nomes.
- O arquivo caiu de 16.450 para 15.977 linhas.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker o pré-carrega.
- Os tipos estão em `aovivo.d.ts` e `estado.d.ts`.

**Sem mudança de regra, de save, de API nem de tela.**

## Decisões tomadas depois da entrega (09/11)
1. **Comentários das regras:** copiados para o motor. Os comentários de cada passo do bloco e do fim do jogo voltaram para junto das regras, em `motor/aovivo.js`. Conferi que o código, sem os comentários, ficou idêntico ao de antes.
2. **Coletiva na D2:** a regra vai para o motor e o modal fica na tela. O motor guarda a coletiva pendente e aplica a resposta, e a página antiga mostra o modal e chama o motor. A perna da Copa ao vivo e o amistoso ao vivo terminam no motor, do mesmo jeito que a partida da D1.
3. **Defeito antigo da Copa (achado na C3):** vai ser corrigido numa entrega própria, separada da D2, com teste que mostra o travamento antes da correção e o fim dele depois.

## Testes
- **Novo `tests/unit/test_motor_aovivo.js`** compara as funções antigas (congeladas em `tests/unit/ref_aovivo_antes.js`, inclusive as 5 da página que mudaram) com as de hoje.
  - **Como roda:** cada lado num `vm` com o próprio motor, com a tela, os sons e o relógio substituídos por registros. São 120 mundos e 480 partidas, cada uma com:
    - alguns blocos um a um (com intervalo);
    - substituições válidas e inválidas;
    - troca de tática e de esquema;
    - "pular pro fim", fim do jogo e fechamento da rodada.
  - **O que confere:** retornos, o estado da partida a cada passo, save, avisos, coletivas e a sequência de tela, sons e timers, todos iguais.
  - **Cobertura:** 480 partidas, 234 intervalos, 479 destaques de gol, 1.101 substituições, 172 coletivas e 480 registros no histórico de confrontos.
  - **Contraprova:** mudei, um por vez, o limite do histórico de confrontos, o objetivo de vitória, a penalidade de troca de esquema, a contagem de substituições e os lesionados de antes do jogo. A verificação certa falhou em cada caso.
- **Texto idêntico:** o `paginaComoAntes` cobre também o `aovivo.js`. As 37 funções e constantes movidas sem mudança remontam iguais, caractere por caractere, às de antes.
- **Testes da partida (ponta a ponta):** 13/13 (`test_ao_vivo`, `test_v2_partida`, `test_v2_ajustes`, `test_v2_pausa`, `test_play_by_play_v1/v2`, `test_sem_tela`, `test_coletiva_imprensa`, `test_v2_resultado`, `test_marcacao_individual`, `test_save`, `test_ge_calendar_001`, `test_cup_engine`).
- **Testes do motor e da v2:** todos passam (v2: 117/117).
- **Suíte completa (com o Postgres temporário):** 200/201.
  - **A falha:** `test_noticias_fullscreen_fluxo`. O modal da tabela ficou na frente de um clique do menu.
  - **Depois:** o teste passou 3 vezes seguidas, sozinho.
  - **Por que não é da D1:** o teste só passa pela partida para chegar ao pós-jogo, e a equivalência acima cobre esse caminho.
