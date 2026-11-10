# Carreira 2.0: sem página escondida, etapa G1b (partida, pós-jogo, semana e temporada da ponte no motor)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g1b`, a partir de `main` (com o #92, etapa G1a).
- **Status:** 2ª das 4 entregas da etapa G (decisão de 10/11). Segue para PR e merge com CI verde, sem pausas.

## Resultado principal
Os comandos da ponte que conduzem o jogo foram para `public/js/motor/jogo.js`, **sem mudar o texto**. São 22 comandos:
- **Rodada:** `iniciar`.
- **Partida ao vivo:** pausar, retomar, intervalo, velocidade, pular para o fim, substituição, tática e descartar a partida encerrada.
- **Pós-jogo:** iniciar, etapa atual, concluir etapa, coletiva, perna da Copa, proposta e encerrar.
- **Semana:** avançar, escolher e iniciar o amistoso, e o resumo.
- **Temporada:** temporada nova e recusar proposta de clube.

**Vão junto 26 funções de condução da página:**
- ir para o jogo e simular a rodada;
- o relógio da partida (agendar o próximo bloco, pausa, retomada, intervalo e pular para o fim);
- os destaques de gol;
- o fim da partida, da perna da Copa e do amistoso;
- o início da partida, da perna e do amistoso;
- a sequência do pós-jogo e o resumo da semana.

**O resumo da rodada (`PENDING_ROUND_SUMMARY`)** passa a morar em `motor/estado.js`, como o `LIVE_MATCH`.

**O que era da página entra assim:**
- **Relógio:** `ambiente.agendar` e `ambiente.cancelar`. É o `setTimeout` e o `clearTimeout` de quem hospeda o motor: a página antiga hoje, a v2 na G2.
- **Gravar:** `ambiente.persistir` (a `persistCareer` de sempre, até a G1c).
- **Modo ponte e botão Simular:** pelo ambiente. A v2 vai passar um objeto vazio no lugar do botão.
- **Desenho, sons, overlays e modais da página antiga:** viram o evento `tela`, na mesma ordem.

**3 funções de tela tinham lógica no modo ponte.** No motor, cada uma ganhou um espelho que, no modo ponte, faz a mesma lógica e, fora dele, pede o desenho. Assim nada se perde quando a v2 deixar de ter a página:

| Função da página | O que fazia no modo ponte | Espelho no motor |
|---|---|---|
| `renderAll` | renovava os objetivos e criava as conquistas que faltam | `desenharTudo` |
| `renderLiveMatch` | guardava a partida para a v2 e a avisava | `desenharPartida` |
| `commitLineupTactics` | nada (a tática vem do save) | `lerTaticaDaTela` |

**No `carreira.js`:** o arquivo caiu de 14.185 para 13.707 linhas.

**Sem mudança de regra, de save, de API nem de tela.**

## O que ficou na página e por quê
- **`continuarPosJogo`:** clica no botão do detalhe do jogo da tela antiga (o caminho antigo de mostrar a página em tela cheia). A v2 não chama esse comando, que sai com a página na G2.
- **Para a G1c:**
  - `demitir` e `aceitarPropostaClube`, que vão à API;
  - a entrada e a gravação.

## Defeito achado no extrator (corrigido antes de gerar)
- **O problema:** uma função de 1 linha que chama o motor era tratada como atalho simples, mesmo passando argumentos a mais. O `simulateRound` da página passa `startLiveMatch` ao motor, e esse argumento se perderia.
- **Como apareceu:** o teste de equivalência da G1b acusou (a partida não abria ao vivo).
- **Correção:** agora atalho só quando repassa exatamente os próprios parâmetros.
- **Efeito na G1a:** reconferi a análise da G1a com a correção, e o resultado é o mesmo.

## Defeito achado na suíte (corrigido)
- **O problema:** o `jogo.js` importava `PONTE` do `ponte.js`, que exporta o estado como `ponte`. No navegador, o módulo não carregava e quase toda a suíte falhou.
- **Por que os testes do motor não pegaram:** o carregador dos testes junta os módulos num script só e não confere os imports.
- **Correções:**
  - o import errado saiu (o texto já usa `ponte.`);
  - o extrator importa com o nome certo quando o acessor da página tem outro nome;
  - **novo `tests/unit/test_motor_modulos_esm.js`:** carrega os 20 módulos do motor como ES module de verdade, como o navegador faz, e falha se um import não bater com um export.

## Testes
- **Novo `tests/unit/test_motor_jogo.js`:**
  - **Como roda:** roda a página **inteira** duas vezes, num `vm` com a tela falsa, no modo ponte, sem rede e com **relógio virtual** (os timers ficam numa fila e o teste os dispara um a um, na mesma ordem).
    - **Antes:** a página de hoje com os comandos e as funções de antes por cima (congelados em `tests/unit/ref_jogo_antes.js`).
    - **Depois:** a página de hoje.
  - **O que faz em cada um dos 30 mundos:** cria uma carreira e joga semana a semana como a v2, da pré-temporada até 7 rodadas:
    - amistosos;
    - partidas ao vivo, com pausa, intervalo, velocidade, substituições, tática e "pular pro fim" sorteados entre os blocos;
    - o pós-jogo inteiro: coletiva, notícias, resultados, perna da Copa ao vivo e proposta;
    - no fim, a virada de temporada e a recusa de proposta de clube.
  - **O que confere:**
    - o retorno de cada comando e a partida bloco a bloco;
    - o save e o estado da ponte;
    - os timers (quando e quanto);
    - as chamadas de desenho e de som, com os argumentos;
    - os avisos à tela e à v2, e as gravações.

    Tudo igual nos dois lados.
  - **Cobertura:** 159 partidas, 40 pernas da Copa ao vivo, 33 amistosos, 276 intervalos, 233 substituições, 51 "pular pro fim", 55 coletivas, 68 propostas respondidas, 30 viradas, 319 gols e 2.995 timers.
  - **Contraprova:** mudei, um por vez:
    - o ritmo do bloco;
    - o tempo do destaque de gol;
    - o minuto do intervalo;
    - o aviso à v2 na pausa;
    - o apito final;
    - o espelho do `renderLiveMatch`.

    A verificação certa falhou em cada caso.
- **Texto idêntico:** o `paginaComoAntes` cobre também o `jogo.js`. Agora ele remonta cada atalho com a definição do módulo que ele chama (há nomes iguais em módulos diferentes, como o `simulateRound` da regra e o da página).
  - **Funções e constantes:** as 318 movidas em todas as etapas (26 desta) saem iguais, caractere por caractere.
  - **Comandos:** os 22, com as trocas desfeitas, são iguais aos de antes.
- **Testes das etapas anteriores:** usam a página como era antes da F e da G.
- **Testes do motor:** todos passam (17 arquivos).
- **Suíte completa (com o Postgres temporário):** 208/208.
- **Teste antigo corrigido (`test_modals`):** falhou no CI da G1b pelo mesmo defeito de ordem já corrigido no `test_coletiva_imprensa` (D2) e no `test_noticias_fullscreen_fluxo` (E). Recusada a proposta por jogador, o pós-jogo abre a Tabela, que tapa o menu. O teste agora fecha a Tabela depois de recusar; passou 3 vezes seguidas.
