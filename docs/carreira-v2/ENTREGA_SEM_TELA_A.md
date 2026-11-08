# Carreira 2.0: sem página escondida, etapa A (jogo sem tela)

- **Data:** 08/11/2026.
- **Branch:** `sem-tela-a`, a partir de `main` (com o #79, fim da fase 12).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.
- **Plano:** `PLANO_SEM_PAGINA_ESCONDIDA.md`, aprovado em 07/11 com as 3 recomendações (página antiga só para testes, começar pela etapa A, jogo sob demanda na v2).

## Resultado principal
**O jogo roda inteiro sem tela, só pela ponte.**

O teste novo carrega o `carreira.js` num `vm` do Node, fora do navegador, com uma tela de mentira e a API de verdade do servidor de testes. Pela ponte, como a v2 faz, ele:
- cria a carreira;
- joga as 38 rodadas (semana, partida ao vivo, pós-jogo, Copa e propostas);
- vira a temporada e joga a 1ª rodada da temporada nova.

Tudo isso leva cerca de 5 s. É a prova de viabilidade que a etapa pedia: a lógica não precisa do navegador.

## O que mudou no jogo
No modo ponte (a página escondida da v2, `/carreira/motor`), ninguém vê a página. Por isso ela **deixou de desenhar** (`SEM_TELA`), e a lógica que estava escondida no desenho continuou:

| Onde | Antes | Agora, sem tela |
|---|---|---|
| `renderAll` (todas as telas da página) | desenhava as 11 abas a cada comando. Dentro disso, renovava os objetivos do dia e da semana e criava as conquistas que faltassem | só renova os objetivos e cria as conquistas |
| `renderLiveMatch` (partida ao vivo) | desenhava placar, posse e narração, e no fim avisava a v2 | só avisa a v2 (`PONTE.ultimo`, `ponteAvisar`) |
| `commitLineupTactics` ("Ir para o jogo") | copiava a tática dos campos da tela para o save | não lê a tela: a tática vem do save, que a v2 grava pela ponte (`salvarTatica`). Os campos já vinham vazios, então nada muda na prática |
| Substituição ao vivo (`substituir`) | a ponte abria o modal, preenchia os seletores e "clicava" em confirmar | a regra virou `applyLiveSub`, que o modal e a ponte usam. A ponte não toca na tela |
| Tática ao vivo (`aplicarTatica`) | a ponte abria o modal, marcava os eixos nas linhas desenhadas e lia de volta | a regra virou `applyLiveTactics`, que o modal e a ponte usam. A ponte monta os 4 eixos como o modal montava |

**Custo do desenho:** numa temporada medida fora do navegador, a página gastava 1,7 s desenhando o que ninguém via. Agora gasta 4 ms. No celular, com o DOM de verdade, a economia deve ser maior. Isso não foi medido em aparelho.

**A tela antiga** (`/carreira-old`, só testes) continua desenhando e funcionando como antes. `SEM_TELA` só vale no modo ponte.

**Sem mudança de regra, de schema, de API nem de tela da v2.**

## Pontos para sua avaliação
1. **Narração da partida e sorteio:** a narração da página escondida (`pickCommentary`) sorteava o texto com o mesmo `Math.random` do jogo, então desenhar deslocava os sorteios seguintes. Sem tela, ela não sorteia mais.
   - **O que muda:** a sequência de números sorteados, não as regras nem as chances. Uma partida com o mesmo começo pode ter outro desfecho em relação a antes, como já acontece de uma vez para outra.
   - **O que não muda para você:** a v2 recebe os lances como dados e não mostrava essa narração.
2. **Comando sem uso que depende de tela:** `continuarPosJogo`, o pós-jogo antigo, "clica" num botão da página. A v2 o declara no adaptador, mas nenhuma tela o chama (ela usa `iniciarPosJogo`/`posJogo`). Deixei como está. Proponho retirá-lo na etapa G, quando a ponte for importada direto.
3. **O que a lógica ainda pede da tela** (levantado pelo teste): sem contar desenho, só sobram:
   - leituras de classe para posicionar avisos (`toast`), que não decidem nada no jogo;
   - o `ponteEstado` do pós-jogo antigo (item 2).

## Testes
- **Novo `tests/e2e/test_sem_tela.js`** (usa `_tela_falsa.js`), com 8 verificações:
  1. a ponte fica pronta sem navegador;
  2. cria a carreira;
  3. uma rodada inteira;
  4. a temporada inteira (38 rodadas, save no servidor na rodada 39);
  5. a virada de temporada (ano +1, rodada 1);
  6. a 1ª rodada da temporada nova;
  7. **o desenho não muda o jogo:** a mesma carreira, com o mesmo sorteio, jogada com a página desenhando (como antes) e sem tela, dá saves idênticos (8 rodadas, fora os carimbos de hora). Para essa comparação, a narração da versão com tela usa um sorteio à parte (ponto 1). Um controle, com a mesma página duas vezes, também dá igual;
  8. substituição e tática ao vivo pela ponte, sem tela: troca, eixo inválido ignorado, custo de familiaridade, partida parada, lance na ponte e save gravado.
- **v2 e partida ao vivo no navegador:** 34/34. Entram todos os testes da v2 (a página escondida agora sem tela) e os da partida ao vivo da tela antiga (modal de substituição e tática).
- **Suíte completa:** 194/194 na primeira rodada.
