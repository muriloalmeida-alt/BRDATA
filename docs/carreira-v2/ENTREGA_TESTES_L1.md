# Carreira 2.0: testes sem a tela antiga, lote L1 (testes da v2)

- **Data:** 12/11/2026.
- **Branch:** `plano-testes-legado`, a partir de `main` (com o #101).
- **Plano:** `PLANO_TESTES_TELA_ANTIGA.md`, aprovado pelo Murilo em 12/11 (D1 "conferir um a um", lotes na ordem, sem pausas).
- **Resultado:** a lista congelada `tela_antiga_legado.json` cai de **181 para 151** testes. Os 30 testes da v2 (`test_v2_*`) não abrem mais a tela antiga.

## Ajudantes novos (`tests/e2e/_v2_carreira.js`)
O motor roda como módulo na própria página da v2 (desde a G2d). Os ajudantes usam as mesmas instâncias que a v2 usa.
- **`motorPronto(page)`:** espera a v2 abrir o motor (ambiente, conta e carreira carregadas).
- **`noMotor(page, fn, arg)`:** roda `fn(M, arg)` na página. `M` traz:
  - `M.CAREER`;
  - `M.persistir()`, que grava como o jogo grava;
  - `M.ponte`, os mesmos comandos de `_sem_tela.js`;
  - os módulos do motor.

  Substitui o `page.evaluate(() => CAREER…)` + `persistCareer()` da tela antiga.
- **`carreiraV2(page, email, { competicao, clube, preTemporada })`:** conta e carreira de um clube escolhido.
  - **Criação:** pelos comandos da tela de criação (`escolherCompeticao`, `criarCarreira`).
  - **Primeira entrada:** pelos mesmos comandos das telas dela, sem passar por elas:
    - tutorial visto (o mesmo `POST` da tela);
    - `assistenteVisto`;
    - `receberRecompensa`.
  - **Pré-temporada:** pulada como o `skipPreseason` da tela antiga, salvo com `preTemporada: true`.
- **`newCareer(page, email, clube)`:** o mesmo ponto em que o `newCareer` antigo deixava: rodada 1, recompensa recebida, conta "Murilo Almeida".
- **`jogarRodadaV2(page)`:** uma rodada inteira pela ponte: semana, partida, pós-jogo e Copa. São os passos de `_sem_tela.jogarRodada` e substituem o `playRound` da tela antiga.
- **`ateOInicio(page)`:** a primeira entrada pelas telas da v2, usada pelo `novaCarreiraV2`. Agora tem prazo por tempo e diz onde parou se não chegar ao Início.
- **Ganchos que eram do `_v2_match.js`:** foram para `_v2_carreira.js`: `signup`, `serverCareer`, `playV2MatchToEnd`, `continueToHome`, `motorNaPagina`, `sameSave`, `ensureDailyClaimed`, `skipAutoOpen`.
- **`_v2_match.js`:** fica só com o `newCareer` da tela antiga e reexporta o resto. É usado por `test_recompensa_dia7` (lote L2).

## Os 30 testes
- **14 só montavam a carreira pela tela antiga** (`newCareer`). Trocaram de ajudante; `sistema` e `tatica_treino` também trocaram uma leitura do `CAREER` por `noMotor`:
  - acesso, clube, comissao, elenco_avancado, foco, gravacao;
  - jogos_mais, mercado, motor, onboarding, posjogo;
  - sistema, tatica_treino, temporada.
- **16 montavam a carreira à mão pela tela antiga.** Agora usam `newCareer` ou `carreiraV2`, `noMotor` e `jogarRodadaV2`, com as mesmas verificações:
  - ajustes, calendario, corte, diretoria, elenco, escalacao;
  - financas, inicio, navegacao, partida, pausa, prejogo;
  - resultado, semana, tabela, tabela_partida.

  Os valores de referência que a tela antiga calculava agora vêm das funções do motor que ela já chamava, então são os mesmos números:
  - `fmtBRLShort` → `clube.fmtBRLShort`;
  - `teamById` → `estado.timePorId`;
  - `boardGoalMet` → `temporada.boardGoalMet`;
  - `myLeaguePosition` → `fechamento.myLeaguePosition`;
  - `calendarDateLabel` → `jogo.calendarDateLabel`;
  - `pushLedger` e `pushNotification`.

## O que cada verificação mudada protege agora (D1)
| Teste | Verificação | Antes | Agora |
|---|---|---|---|
| `test_v2_navegacao` | 5 | a tela antiga não abria telas por links vindos da v2 | **saiu**: protegia só a tela antiga, que não é mais aberta |
| `test_v2_inicio` | 7 | a tela antiga não tratava `#escalacao` vindo da v2 | **saiu**: idem |
| `test_v2_partida` | 1 | a "versão atual" (tela antiga) sem ponte | a página da v2 não tem ponte global (`BRDATA_PONTE`, `V2_PONTE`): o motor é módulo |
| `test_v2_escalacao` | 5 | a tela antiga lê a troca feita na v2 | o motor, recarregado do servidor, lê a troca feita na v2 |

As outras verificações dos 30 testes não mudaram.

## A checagem `verificar-tela-antiga.js`
- **Sai o sinal "entra na página escondida"** (`/carreira/motor`). Desde a G2d o endereço leva à v2, e pedir por ele não abre mais a tela antiga. `test_v2_inicio` e `test_v2_motor` pedem `/carreira/motor` justamente para conferir isso.
- **Nova lista explícita `soRedirecionamento`** (em `tela_antiga_legado.json`): testes que só abrem `/carreira.html` ou `/carreira-old` com o cabeçalho de produção, para conferir que os links antigos levam à v2 (301).
  - Hoje é só o `test_v2_corte` (convite pelo link antigo).
  - Esses testes continuam proibidos de usar os ajudantes antigos.
- **Contraprova:** um teste novo que abre `/carreira-old` e usa `_startup` é barrado. O `test_v2_corte` com um `require("./_startup")` também.
- **`tests/e2e/README.md`:** atualizado com os ajudantes novos e a exceção.

## Problemas achados no caminho
- **`waitForFunction` com função `async`:** a Promise conta como verdadeira na hora. O primeiro `motorPronto` "esperava" sem esperar. Agora a espera é um laço próprio.
- **Primeira entrada pelas telas, sob carga:** passar pelo tutorial, pelo assistente e pela recompensa em cada teste custava cerca de 10 s. Com a suíte inteira em paralelo, 4 testes longos estouraram o limite de 90 s, e um ficou preso no tutorial. Por isso o `carreiraV2` faz a primeira entrada pelos comandos. As telas dela continuam testadas em `test_v2_onboarding`, `test_v2_acesso` e `test_v2_modulo`.

## Testes
- **Testes da v2 + `test_recompensa_dia7`:** 33/33, duas vezes seguidas (a suíte em paralelo leva 101 s).
- **Checagem da tela antiga:** 151 de 151, nenhum teste novo depende dela.
- **Suíte completa (com o Postgres temporário):** 212/212.
