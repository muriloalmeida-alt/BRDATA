# Carreira 2.0: proposta para a etapa G (sem página escondida)

- **Data:** 09/11/2026.
- **Status:** decidido pelo Murilo em 10/11: dividir (G1a, G1b, G1c e G2). No mesmo dia, ele pediu os pedaços restantes ainda menores (ver "Divisão final" no fim).

## O que a G precisava fazer
Pelo plano (`PLANO_SEM_PAGINA_ESCONDIDA.md`), a G faz o `adapters/engine.ts` da v2 importar o jogo como módulo, no lugar do quadro escondido em `/carreira/motor`, que sai.

## O que a medição mostrou (depois da F)
A v2 conversa com o jogo pela ponte (`window.BRDATA_PONTE`). Hoje a ponte:
- **Tem 1.037 linhas e 110 comandos,** dentro do `carreira.js`.
- **Ainda alcança 223 funções da página (3.968 linhas),** além das regras que já estão no motor:

| O que é | Funções | Linhas |
|---|---|---|
| Telas da página antiga, desenhadas escondidas (Central, Elenco, modais, cartões em HTML) | 104 | 2.601 |
| Fluxo da ponte e regra que sobrou (sequência do pós-jogo, resumo da semana, esquemas táticos, recompensa diária, comissão) | 109 | 1.217 |
| Rede e gravação (times e jogadores pela API, gravar o save) | 8 | 135 |
| Relógio (timers da partida) | 2 | 15 |

**Conclusão:** importar o jogo como módulo ainda não é possível. A ponte e os fluxos dela precisam sair do `carreira.js` antes da troca, e as chamadas de tela que ela faz precisam virar eventos (como na E).

**Fato que ajuda:** a v2 não mostra mais nenhuma tela antiga (o `reveal(true)` não é usado), então nada visual depende da página escondida.

## Proposta (recomendada)
Dividir a G em 4 entregas, com o mesmo método das etapas C a F (equivalência com sorteio fixo, texto idêntico, contraprova e suíte completa):

| Entrega | O que faz | Como prova |
|---|---|---|
| **G1a. Ponte de consulta e gestão** | A ponte vai para `motor/ponte.js`. Primeiro os comandos de leitura e de gestão (mercado, clube, tática, treino, esquemas, loja, preferências). Chamadas de tela viram o evento `tela` | os testes de ponte sem navegador (`_sem_tela.js`) iguais antes e depois, comando a comando |
| **G1b. Partida, pós-jogo e semana na ponte** | `iniciar`, pausa, intervalo, substituição, a sequência do pós-jogo e a semana. O relógio da partida vira do motor (ou de quem chama), sem timer na página | equivalência das partidas e do pós-jogo pela ponte |
| **G1c. Carga e gravação** | a entrada (conta, competição, times e jogadores pela API) e a gravação do save num módulo (`motor/carga.js`) | o jogo inteiro roda pela ponte importada, sem `carreira.js`, num teste sem navegador |
| **G2. Troca na v2** | `adapters/match.ts` passa a importar a ponte (sob demanda); `/carreira/motor` sai | testes da v2, tempo de abertura no celular e tamanho do pacote |

**A página antiga** continua funcionando entre uma entrega e outra (ela ouve os eventos e desenha), e só os testes a usam (decisão 1 do plano).

**Alternativas:**
- **G inteira num PR só:** menos PRs, mas o maior PR do plano, com risco alto de regressão na partida.
- **Parar depois da F e replanejar a G.**

## Divisão final (10/11)
O Murilo pediu os pedaços restantes ainda menores. Cada um é um PR com testes e é mergeado com CI verde:

| Pedaço | O que faz | Situação |
|---|---|---|
| G1a | ponte de consulta e gestão (`motor/ponte.js`) | mergeado (#92) |
| G1b | partida, pós-jogo, semana e temporada (`motor/jogo.js`) | mergeado (#93) |
| G1c1 | as variáveis da página (conta, fonte de dados, temporada real, herança do técnico) no `motor/estado.js` | mergeado (#94) |
| G1c2 | entrada, gravação e os comandos restantes (`motor/carga.js`) | mergeado (#95) |
| G2a | o hospedeiro do motor sem página (`motor/v2.js`): ambiente sem página, entrada e a ponte montada a partir do motor, testado sem navegador | mergeado (#96) |
| G2b | a v2 usa o hospedeiro atrás de uma chave, com o quadro ainda disponível | este PR |
| G2c | os testes da v2 deixam de ler o quadro escondido | a fazer |
| G2d | o quadro e `/carreira/motor` saem | a fazer |
