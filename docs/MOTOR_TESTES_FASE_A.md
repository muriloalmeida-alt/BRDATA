# Relatório final do Claude — motor de testes BRDATA (Fase A)

> Preenchido com evidências de execuções reais em 25/10/2026. Nada aqui foi
> commitado, publicado ou implantado: as mudanças estão só na árvore de
> trabalho local, na branch local `local/motor-testes-fase-a`, aguardando a
> revisão do responsável pelo produto.
>
> Os artefatos citados ficam no scratchpad da sessão. Abaixo, `SP/motor/` =
> `/tmp/claude-0/-home-user-BRDATA/74f76862-85ee-580c-8e7d-fa924edcdf71/scratchpad/motor/`.
> Cada execução tem uma pasta com `meta.txt`, `runner.log`,
> `_last_parallel_run.json` e `server.log`.

## 1. Resumo executivo

**Status geral: APROVAR COM PENDÊNCIAS (proposta).**
- A melhoria de tempo foi medida e a integridade da suíte foi verificada.
- Ficam pendentes:
  - AT-11: não existe pipeline de CI no repositório;
  - um risco de flakiness sob carga maior, descrito na §6 e na §8.

**Commit de referência:** `bc7182cbe5c72607fa014bf853bc1ae8e713f7ba`
- É a `main`, merge do PR #41.
- A árvore estava limpa no início.

**Commit candidato:** nenhum, por instrução do usuário (sem commit).
- O candidato é a árvore de trabalho sobre `bc7182c`, com 11 arquivos alterados ou novos (§2).

**Objetivo de velocidade:** reduzir significativamente o tempo da suíte completa sem perder testes, asserções nem cobertura.
- Não foi fixada uma meta numérica antes do baseline, conforme a ESPECIFICACAO.

**Resultado observado (mesma máquina, dados vazios, 3 execuções de cada lado):**

| Métrica | Antes | Depois | Variação |
|---|---:|---:|---:|
| Suíte completa | média 412,2 s (414,1 / 412,2 / 410,4) | média 304,8 s (308,0 / 305,7 / 300,7) | **−26,1 %** |
| Rota rápida (nova, 18 testes) | — | 23,6 s / 24,6 s | — |
| Suíte completa com dados acumulados no servidor de dev (situação real de quem roda `node run_parallel.js` repetidamente) | 436,3 s, com 1 TIMEOUT | 304,8 s, sem timeout | −30 % |

Integridade e cobertura:
- Mesmo conjunto de falhas determinísticas, menos uma: `test_sportmonks_placeholder_filter.js` saiu da lista após a correção de um caminho fixo de outra máquina.
- Nenhuma falha nova nas 3 execuções candidatas.
- 128 testes passaram nos dois lados com as mesmas 706 linhas de checklist.
- Cobertura JS, por bytes executados: 79,99 % antes; 79,91 % e 80,28 % depois (detalhes na §5).

**Riscos residuais:**
1. A concorrência padrão subiu de 6 para 2,5 × CPUs (10 aqui). Isso expõe esperas fixas curtas dos testes.
   - Exemplo: `test_loja.js` falhou 1 vez nas 5 execuções completas do candidato, e foi numa execução com a coleta de cobertura ligada.
   - A causa é o pulo opcional do onboarding com janela de 2 s; esse padrão aparece em 136 arquivos.
2. `test_save_limit_001_careerstore.js` sobrescreve `server/data/careers.json` do repositório com `{}` (comportamento pré-existente).
3. Sem CI, nada roda a suíte automaticamente.

**Recomendação para revisão:**
- Aceitar a Fase A como infraestrutura.
- Manter o redesign bloqueado até que você aprove e até que a pendência de CI (AT-11) seja decidida: criar o workflow ou aceitar explicitamente a ausência.

## 2. Escopo e arquivos

Todas as mudanças estão em `tests/e2e/`. `git diff --stat`: 8 arquivos modificados (+285 / −64) e 3 novos.

| Arquivo | Tipo de mudança | Motivo | Risco | Como foi validado |
|---|---|---|---|---|
| `tests/e2e/run_parallel.js` | Reescrita do runner, mantendo o comando `node run_parallel.js` = suíte completa | Concorrência proporcional às CPUs; ordem "mais longos primeiro"; timeout por classe; testes exclusivos no fim; `--isolated-server`; `--suite=fast`; `--coverage`; `--list`; filtros múltiplos; inclusão de `tests/unit` (que não tinha runner); metadados no `_last_parallel_run.json`; logs de falha em `_artifacts/`; linha final com "não executados: 0; retries: 0". **Sem retry e sem skip**: o código de saída de cada script continua sendo o veredito. | Médio: a concorrência maior expõe esperas frágeis (§6) | `node --check`; `--list` (150 full, 18 fast, 8 com filtro); 3 execuções completas, 2 rápidas, 1 direcionada, 3 com cobertura |
| `tests/e2e/suites.json` (novo) | Configuração | `fast`: 17 e2e + unitário, todos aprovados nas 3 execuções do baseline, mediana ≤ 20 s. `long`: 9 testes com timeout de 180 s, pelo critério de duração máxima medida ≥ 60 s. `exclusive`: o teste que lê e grava `careers.json` direto do disco. | Baixo: nenhuma entrada pula teste | Mesmo conjunto de testes executado: 150 em todas as execuções completas |
| `tests/e2e/_coverage_preload.js` (novo) | Instrumentação opcional | Cobertura JS (V8 via Playwright) sem editar nenhum teste. Só é carregado com `--coverage`. | Baixo: +5 % de tempo quando ativo (320,5 s e 302,3 s contra 304,8 s) | `cov_antes`, `cov_depois`, `cov_depois_2` |
| `tests/e2e/_coverage_report.js` (novo) | Agregador | União por arquivo de bytes executados e de funções executadas. Grava `_coverage_summary.json`. | Baixo | Mesmos 9 arquivos JS e mesmo total de bytes (1.304.639) nas 3 coletas |
| `tests/e2e/test_sportmonks_placeholder_filter.js` | 1 linha: caminho absoluto `/home/user/FitOS/...` → `path.join(__dirname, "..", "..", ...)` | Falha **ambiental**: lia arquivo de outra máquina. Nenhuma asserção mudou. | Nulo | Falhava nas 3 execuções do baseline (ENOENT) e passou nas 3 do candidato, imprimindo "TUDO OK" |
| `tests/e2e/sim_ge_balance_001/002/003.js` | 1–2 linhas cada: mesmo caminho fixo `/home/user/FitOS` | Simulações de balanceamento (não fazem parte da suíte) quebravam fora da máquina original | Nulo | Executam sem ENOENT (exit 0) |
| `tests/e2e/package.json` | Scripts npm | `test` (inalterado), `test:full`, `test:ci`, `test:fast`, `test:coverage`, `test:unit`, `test:list` | Nulo | Comandos equivalentes executados (§4) |
| `tests/e2e/README.md` | Documentação | Tabela de comandos oficiais, servidor isolado, `suites.json`, saídas, ausência de CI; contagem de scripts corrigida de 104 para 149 | Nulo | Revisão |
| `tests/e2e/.gitignore` | +3 linhas | `_artifacts/`, `_coverage/`, `_coverage_summary.json` | Nulo | `git status` limpo após as execuções |
| `docs/MOTOR_TESTES_FASE_A.md` (este arquivo) | Relatório | Entregável | — | — |

**Nenhum arquivo** de `public/`, `server/` ou de produto foi alterado. Prova: `git status --porcelain` lista só `tests/e2e/*` e este relatório.

## 3. Baseline e comparação

**Método:**
- Mesma máquina: 4 CPUs, 15 GiB, Ubuntu 24.04.5, Node v22.22.0, playwright-core 1.48.0, Chromium 1243.
- Servidor recém-iniciado e `server/data` vazio em cada execução.
- Execuções sequenciais, sem outra carga.
- Duração = relógio de parede do processo do runner.
- CPU média vem de deltas de `/proc/stat`; o pico de RSS do servidor vem de `/proc/PID/status`.
- Scripts de medição:
  - `SP/motor/run_measured.sh`, servidor de dev, para o baseline;
  - `SP/motor/run_candidate.sh`, servidor isolado, para o candidato.

| Métrica | Antes | Depois | Método | Evidência |
|---|---:|---:|---|---|
| Suíte completa | 412,2 s (σ ≈ 1,9 s; 3 execuções, c6, ordem alfabética) | 304,8 s (σ ≈ 3,7 s; 3 execuções, c10, mais longos primeiro, servidor isolado) — **−26,1 %** | `node run_parallel.js` vs `node run_parallel.js --isolated-server` | `SP/motor/baseline_{A,B,C}/`, `SP/motor/cand_{1,2,3}/` |
| Execução rápida | não existia | 23,6 s e 24,6 s (18/18 aprovados, 2 execuções) | `node run_parallel.js --suite=fast --isolated-server` | `SP/motor/fast_{1,2}/` |
| Execução direcionada | `node run_parallel.js test_mercado` (1 filtro) | `node run_parallel.js test_mercado,test_scout --isolated-server`: 8 testes em 41,5 s; 7 aprovados e 1 falha pré-existente (`test_mercado_negociacao.js`) | — | `SP/motor/direcionada/` |
| CI | não existe pipeline | não existe pipeline; `npm run test:ci` documentado | — | Não há `.github/` no repositório |
| Setup/boot | boot do servidor 125–264 ms; setup por teste ≈ 5,5 s (sonda de 3 execuções) | boot do servidor isolado 116–121 ms, incluindo cópia em diretório temporário; setup por teste inalterado | Instrumentação | `meta.txt`, `_last_parallel_run.json → meta.serverBootMs` |
| Cobertura (JS do app, bytes executados) | 79,99 % (1.043.544 / 1.304.639 B), funções 1719/2210 | 79,91 % e 80,28 %; funções 1716/2203 e 1730/2214 | V8 via `--coverage` | `SP/motor/cov_antes/`, `cov_depois/`, `cov_depois_2/` → `_coverage_summary.json` |
| Flakiness | 2 intermitentes em 3 execuções: `test_botoes_rodape` (2/3) e `test_noticias_fullscreen_fluxo` (2/3) | Em 3 execuções: `test_botoes_rodape` 1/3. Nas execuções com cobertura: `test_noticias_fullscreen_fluxo` 1/2 e `test_loja` 1/2. Na configuração antiga com cobertura (c6): `mercado_concorrencia` e `toast_reposiciona` 1/1 | Repetição | §6 |
| Testes ignorados | 0 | 0 ("não executados: 0; retries: 0" em todas as execuções) | Contagem do runner | `runner.log` |
| Timeouts | 0 com dados vazios; **1** com dados acumulados (`test_training_evolution`, 90 s) | 0 em 6 execuções completas | `timedOut` no JSON | `SP/motor/baseline_acumulado/`, `cand_*` |
| Reprodutibilidade | O resultado dependia do `server/data` do dev, que cresce cerca de 8,5 MB por execução: 68 MB → 436 s, CPU 60 %, RSS de 545 MB | Servidor isolado com dados vazios a cada execução (σ ≈ 3,7 s); metadados de commit, comando, concorrência e timeouts gravados | — | `meta` do `_last_parallel_run.json` |

**De onde veio o ganho:**
- Diagnóstico: a suíte é dominada por ESPERA, não por CPU. No baseline, a CPU média era 55 % a 6 workers.
- Instrumentação por teste (`SP/motor/timing_diag/`, com `_timing_preload.js`, que **não** vai para o repositório):
  - `page.waitForTimeout` fixos somam 912 s, ou 40 % de 2289 s de tempo serial. É um limite superior, porque há sleeps em paralelo dentro do mesmo teste.
  - Cliques que estouraram timeout somam 1338 s.
  - Desses cliques, 720 s vêm de 6 testes que gastam 4 × 30 s em cliques bloqueados: `test_events`, `test_tickets`, `test_tickets_form`, `test_save`, `test_loan_advanced` e `test_training_evolution`.
- Subir a concorrência para 10 elevou a CPU média para 76 %.
- A ordem "mais longos primeiro" **não teve ganho mensurável** sobre a alfabética nesta máquina:
  - c10 alfabética mediu 298,4 s (1 execução, `SP/motor/conc_10/`); c10 mais longos primeiro mediu 300,7–308,0 s.
  - A simulação previa ganho, mas a contenção a c10 inflou a soma serial de 2380 s para 3044 s. O tempo total já fica no limite inferior (3044 / 10 ≈ 304 s).
  - Foi mantida porque não custa nada, mas está declarada aqui como neutra.

## 4. Comandos executados

Ambiente comum:
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`;
- cwd `tests/e2e`;
- 4 CPUs.

O exit code 1 da suíte completa é esperado: existem falhas pré-existentes (§6).

| Comando exato | Ambiente | Exit code | Duração | Resultado | Log/artefato |
|---|---|---:|---:|---|---|
| `node run_parallel.js` (runner ORIGINAL, c6) ×3 | servidor de dev com `data/` vazio | 1 / 1 / 1 | 414,1 / 412,2 / 410,4 s | 126 / 126 / 128 de 149 | `SP/motor/baseline_{A,B,C}/` |
| `node run_parallel.js` (original), `server/data` acumulado de 68 MB | servidor de dev | 1 | 436,3 s | 125/149, 1 TIMEOUT | `SP/motor/baseline_acumulado/` |
| `node run_parallel.js --concurrency=8` (original) | dev, vazio | 1 | 330,7 s | 22 falhas, 1 TIMEOUT (`test_play_by_play_v2`) | `SP/motor/conc_8/` |
| `node run_parallel.js --concurrency=10` (original) | dev, vazio | 1 | 298,4 s | 22 falhas, 0 timeouts | `SP/motor/conc_10/` |
| `NODE_OPTIONS=--require _timing_preload.js node run_parallel.js --concurrency=6 --order=alpha --no-unit` (diagnóstico) | dev, vazio | 1 | 406,2 s | 129/149 | `SP/motor/timing_diag/` |
| `node run_parallel.js --coverage --concurrency=6 --order=alpha` (cobertura "antes": configuração antiga) | dev, vazio | 1 | 417,6 s | 127/150 (3 intermitentes: `botoes_rodape`, `mercado_concorrencia`, `toast_reposiciona`) | `SP/motor/cov_antes/` |
| `node run_parallel.js --isolated-server` ×3 | isolado | 1 / 1 / 1 | 308,0 / 305,7 / 300,7 s | 130 / 129 / 130 de 150 | `SP/motor/cand_{1,2,3}/` |
| `node run_parallel.js --suite=fast --isolated-server` ×2 | isolado | **0 / 0** | 23,7 / 24,8 s | 18/18 | `SP/motor/fast_{1,2}/` |
| `node run_parallel.js test_mercado,test_scout --isolated-server` | isolado | 1 | 41,5 s | 7/8 (falha pré-existente) | `SP/motor/direcionada/` |
| `node run_parallel.js --isolated-server --coverage` ×2 | isolado | 1 / 1 | 320,5 / 302,3 s | 129 / 129 de 150 | `SP/motor/cov_depois/`, `cov_depois_2/` |
| `node run_parallel.js --list` / `--suite=fast --list` / `test_mercado,test_scout --list` | — | 0 | < 1 s | 150 / 18 / 8 | — |
| `node test_sportmonks_placeholder_filter.js` | — | 0 | < 1 s | "TUDO OK" | — |
| `node ../unit/test_game2048_engine.js` | — | 0 | < 1 s | 20/20 ok | — |
| `node sim_ge_balance_00{1,2,3}.js` (limite de 15 s) | — | 0 | — | sem ENOENT | — |

## 5. Integridade e cobertura

**Inventário:**

| | `test_*.js` (e2e) | `tests/unit/test_*.js` | Total executado por `node run_parallel.js` |
|---|---:|---:|---:|
| Antes | 149 | 1 | 149 (o unitário não tinha runner) |
| Depois | 149 | 1 | 150 |

**Testes ou asserts removidos:** nenhum. Em `tests/e2e/test_*.js`, `git diff --stat` mostra uma única linha alterada, o caminho do arquivo lido em `test_sportmonks_placeholder_filter.js`.

**Testes ou asserts alterados:** nenhum assert foi alterado; mudou só o caminho de leitura (§2).

**Equivalência de verificações:**
- 128 testes passaram em `baseline_C` e `cand_3`.
- Nesses testes, as linhas de checklist impressas (`N) ... true`) somam 706 antes e 706 depois, sem nenhuma diferença por teste.

**Cobertura antes/depois:**
- Os mesmos 9 arquivos JS e o mesmo total de bytes (1.304.639).
- `affiliates.js`, `app.js`, `data.js`, `engine.js`, `game2048/*`, `liveData.js` e `qrcode-lib.js` ficaram idênticos.
- `carreira.js` variou entre 88,78 % e 89,1 %. Duas causas:
  1. Em `cov_depois`, `test_loja` falhou no início (§6) e a loja (`renderLoja`, `openPurchaseConfirm`...) não foi exercitada. Em `cov_depois_2` ele passou: de 20 funções vistas só "antes", sobrou 1 anônima.
  2. Ofertas recebidas aleatórias do jogo (`openPlayerOfferModal`, `renderOfferCompareScreen`...) aparecem em umas execuções e não em outras. Isso é aleatoriedade do jogo, não do motor.
- Limitação: só 123–126 coletas para 147 testes com browser. Testes que encerram com `process.exit` antes de `browser.close()` não gravam cobertura. A limitação vale igualmente antes e depois.

**Fluxos críticos cobertos pela rota rápida:**
- boot e login;
- persistência e migração de save (`test_migration`, `test_save_limit_001`);
- motor de partida e Copa;
- ao vivo;
- treino;
- mercado multidivisão;
- temporada e rebaixamento;
- olheiros;
- diretoria;
- estatísticas;
- motor do 2048 (unitário).

**Fluxos não verificados:**
- Os 20 testes com falha pré-existente: seus fluxos continuam sem verificação automática, como já estavam antes.
- `test_frozen_provider`: exige `DATA_PROVIDER=frozen`.
- Push real: o ambiente não tem egress.

**Como foi confirmado que a suíte completa continua executável:** `node run_parallel.js` sem argumentos continua rodando tudo. Nas 6 execuções completas do candidato: 150 selecionados, "não executados: 0", `retries: 0`.

## 6. Falhas

| Falha | Preexistente/nova/ambiental | Evidência | Impacto | Ação |
|---|---|---|---|---|
| 19 testes: `test_colocar_a_venda`, `test_confirm_modals`, `test_contract_renewal`, `test_events`, `test_fase2b`, `test_h2h`, `test_historico_negociacoes`, `test_intervalo_noticias_proposta_destino`, `test_loja_pagamento_real`, `test_mercado_negociacao`, `test_modals`, `test_morale`, `test_reputacao_propostas`, `test_s4_b3_006_resumo_rodada`, `test_save`, `test_tickets`, `test_tickets_form`, `test_transicoes_suaves`, `test_ux_fechar_voltar_inicio` | **Preexistente** (falha nas 3 execuções do baseline e nas 3 do candidato) | Listas de falha em `SP/motor/baseline_*` e `cand_*`. Ex.: `test_save` tem o clique bloqueado por `#preMatchOverlay`, um script desatualizado em relação ao fluxo de confirmação, como o README já cataloga | Fluxos sem verificação automática; os 6 mais caros gastam cerca de 120 s cada | Fora do escopo; corrigir os testes é tarefa própria. Não mascarado |
| `test_frozen_provider` | **Ambiental** (exige `DATA_PROVIDER=frozen`, documentado) | Falha em todas as execuções | — | Mantido como falha |
| `test_sportmonks_placeholder_filter` | **Ambiental** (caminho `/home/user/FitOS`) | ENOENT nas 3 execuções do baseline | Era falso negativo | **Corrigido** (caminho relativo); passa 3/3 |
| `test_botoes_rodape` | **Preexistente intermitente** | 2/3 no baseline, 1/3 no candidato. Timeout de 5 s em `#newsOverlay.open`, provavelmente por uma coletiva aleatória entre "Seu jogo" e Notícias | Flake | Registrado. Sem retry |
| `test_noticias_fullscreen_fluxo` | **Preexistente intermitente** | 2/3 no baseline, 0/3 no candidato, 1/2 nas execuções de cobertura do candidato | Flake | Registrado. Sem retry |
| `test_loja` | **Nova manifestação de fragilidade pré-existente** (sensível a carga) | Falhou 1 vez nas 5 execuções completas do candidato: em `cov_depois`, com c10 + cobertura, levou 59,8 s contra 11–16 s nas outras. Passou em `cand_1/2/3` e `cov_depois_2` e em todo o baseline. Causa no log: `page.click("#btnOnboardSkip", { timeout: 2000 }).catch(() => {})`, um pulo opcional com janela de 2 s; sob carga o onboarding abriu depois disso e bloqueou `#btnBottomMenu` por 30 s. O padrão existe em 136 arquivos | Risco de flakiness sob concorrência alta ou em máquina lenta | **Não** contornado com retry. Mitigação disponível: `--concurrency=6` reproduz a configuração anterior. Correção recomendada para a Fase B: esperar o estado (overlay visível ou ausente) em vez de uma janela fixa |
| `test_save_limit_001_careerstore` — efeito colateral | **Preexistente** (não é falha, é risco) | O teste grava `{}` em `server/data/careers.json` **do repositório** (`freshStore()`), inclusive com `--isolated-server`, porque o servidor isolado não lê esse arquivo. No baseline ele rodava no meio da suíte, concorrendo com o servidor | Rodar a suíte apaga as carreiras locais do servidor de dev, antes e depois desta mudança | Agora roda isolado, no fim, e sem corrida. Correção recomendada: o teste usar uma cópia temporária de `careerStore` |
| `test_mercado_concorrencia`, `test_toast_reposiciona` | **Intermitente sob coleta de cobertura** (configuração antiga, c6) | Falharam só em `cov_antes`; passaram nas outras 12 execuções completas | Mostra que a sobrecarga da cobertura, e não só a concorrência 10, expõe esperas frágeis | Registrado. Sem retry. A rota de cobertura deve ser lida como medição, não como gate de flakiness |
| Conexões recusadas pelo proxy (`www.google.com`, `redirector.gvt1.com`...) | **Ambiental** | Aviso do proxy do sandbox; o Chromium tenta serviços do Google | Nenhum resultado afetado | — |

## 7. Critérios de aceite

| ID | Status | Evidência |
|---|---|---|
| AT-01 | **APROVADO** | Ver o detalhe abaixo da tabela. |
| AT-02 | **APROVADO** | Comandos reais descobertos em `tests/e2e/package.json` (`test`), em `tests/e2e/README.md` e em `server/package.json`. Não há `package.json` na raiz nem CI. Os novos estão documentados em `tests/e2e/README.md` e em `package.json`. |
| AT-03 | **APROVADO** | Baseline de 3 execuções antes de qualquer otimização: `SP/motor/baseline_{A,B,C}/meta.txt` (commit `bc7182c`, `diff_working_tree=0`). |
| AT-04 | **APROVADO** | Nenhum teste ou assert foi removido ou enfraquecido. Diff em `test_*.js`: 1 linha de caminho. As 706 linhas de checklist são iguais por teste (§5). Não há skip nem retry. |
| AT-05 | **APROVADO** | Suíte completa no candidato, 6 vezes. Exit 1 por falhas pré-existentes; resumos em `SP/motor/cand_*/runner.log`. |
| AT-06 | **APROVADO** | Rota rápida (`npm run test:fast`) e direcionada (`node run_parallel.js a,b`) documentadas e executadas (§4). |
| AT-07 | **APROVADO COM RESSALVA** | Cobertura igual ou maior em 2 de 2 dimensões na execução `cov_depois_2`. Em `cov_depois`, a queda de 0,08 pp vem de um flake (`test_loja`). A ressalva é a mesma limitação de coleta nos dois lados (§5). |
| AT-08 | **APROVADO** | Ver o detalhe abaixo da tabela. |
| AT-09 | **APROVADO** | Ver o detalhe abaixo da tabela. |
| AT-10 | **APROVADO** | Triagem na §6: preexistentes, intermitentes, ambientais e a manifestação nova sob carga. |
| AT-11 | **NÃO VERIFICADO** | Não existe workflow de CI no repositório (sem `.github/`). Não foi criado, porque está fora da autorização (sem alterações remotas) e inventar um pipeline não foi pedido. Execução local e `npm run test:ci` estão documentadas e coerentes. |
| AT-12 | **APROVADO** | `git status` só tem `tests/e2e/*` e este relatório. Nenhuma mudança em `public/`, `server/`, telas, estilos, navegação ou regras de negócio. |
| AT-13 | **APROVADO** | Ver o detalhe abaixo da tabela. |
| AT-14 | **APROVADO** | Este documento, com limitações e riscos nas §6 e §8. |

Detalhe dos critérios com mais evidência:
- **AT-01:**
  - SHA `bc7182cbe5c72607fa014bf853bc1ae8e713f7ba`;
  - branch local `local/motor-testes-fase-a`, criada a partir da `main`, sem commits;
  - árvore inicialmente limpa;
  - ambiente: Node v22.22.0, 4 CPUs, Ubuntu 24.04.5;
  - registrados em `meta.txt` e em `_last_parallel_run.json → meta`.
- **AT-08:**
  - Baseline: 3 execuções. Candidato: 3 execuções, mais 3 com cobertura, 2 rápidas e 1 direcionada.
  - Intermitentes: `botoes_rodape` 2/3 → 1/3; `noticias_fullscreen` 2/3 → 0/3 (1/2 com cobertura); `test_loja` 0/3 → 1/5, só com cobertura. A cobertura ligada também causa flakes na configuração antiga: em `cov_antes`, com c6, falharam `test_mercado_concorrencia` e `test_toast_reposiciona`, que passaram em todas as outras execuções.
- **AT-09:**
  - Mesma máquina, dados vazios e servidor fresco nos dois lados; método na §3.
  - O runner difere por definição. A comparação só da concorrência, com os mesmos testes e o runner original (`conc_10`, 298,4 s), confirma a origem do ganho.
- **AT-13:**
  - Nenhum deploy, Railway, push, PR, merge ou commit.
  - `server/data` local foi restaurado do backup inicial: 71.039.569 bytes, idêntico ao início.
  - Nenhum servidor ou diretório temporário `brdata-e2e-*` ficou ativo.

## 8. Decisões e limitações

**Decisões técnicas e justificativas:**
- **Concorrência padrão de 2,5 × CPUs, entre 2 e 12.** Medido: c6 = 412 s, c8 = 331 s, c10 = 298 s, sem novas falhas determinísticas.
  - A c8 houve 1 TIMEOUT (`play_by_play_v2`) no runner antigo, já com o limite global de 90 s.
  - Por isso foi criada a classe `long` (180 s), em vez de subir o timeout de todos: os testes rápidos continuam acusando travamento em 90 s.
- **Servidor isolado.** Elimina a dependência do `careers.json` acumulado, que causava +6 % de tempo, 1 timeout e RSS de 545 MB, e deixa os dados do dev intactos (exceto pelo teste da §6).
  - Fica opcional (`--isolated-server`) para manter `node run_parallel.js` com o comportamento original contra o servidor de pé.
- **Teste exclusivo no fim.** Elimina a corrida "Unterminated string in JSON" observada.
- **Sem retry.** Exigência explícita: flakes ficam visíveis.

**Alternativas consideradas e não feitas:**
1. Reescrever os 912 s de esperas fixas e as 814 chamadas opcionais `.click({timeout}).catch()` nos testes.
   - Seria o maior ganho potencial, mas mexe em 140+ testes e em temporização.
   - É arriscado sem aprovação e está proposto como Fase B.
2. Login via API e storage state compartilhado: muda o que os testes verificam.
3. Ordenação: mantida, mas mostrou-se neutra (§3).

**Limitações de ambiente:**
- Uma única máquina de 4 CPUs.
- Sem CI.
- Sem egress para serviços do Google e de push.
- Porta 8787 fixa nos scripts: o servidor isolado exige a porta livre e duas suítes não podem rodar em paralelo na mesma máquina.

**Medições inconclusivas:**
- Ganho da ordem "mais longos primeiro".
- Taxa real de flakiness de `test_loja` sob c10: 1 ocorrência em 5 é pouco para estimar. Também não dá para separar o efeito da concorrência do efeito da cobertura: a cobertura sozinha, a c6, já gerou 2 flakes em `cov_antes`.

**Riscos residuais:**
1. Concorrência alta expõe janelas fixas curtas (136 arquivos com o padrão de 2 s). Em máquina mais lenta, recomendo `--concurrency=6`.
2. O padrão de 2,5 × CPUs depende do hardware: com 8 CPUs dá 12.
3. Destruição de `careers.json` do dev por `test_save_limit_001_careerstore` (pré-existente).
4. 20 falhas pré-existentes deixam fluxos sem verificação.
5. A cobertura não é coletada nos testes que saem sem `browser.close()`.

**Trabalho não realizado:**
- Pipeline de CI (AT-11).
- Correção das falhas pré-existentes.
- Remoção das esperas fixas.
- Redesign visual: bloqueado, não iniciado.

## 9. Prompt para GPT — Revisão e aprovação

Revise criticamente o relatório `docs/MOTOR_TESTES_FASE_A.md` (árvore de trabalho sobre `bc7182c`, branch local `local/motor-testes-fase-a`, sem commit) e as evidências anexas: pastas `SP/motor/baseline_*`, `cand_*`, `fast_*`, `direcionada`, `cov_*` e `timing_diag`. Não aceite declarações sem evidência.

Verifique:
1. se a baseline é real e comparável: 3 execuções de 410–414 s, mesma máquina, dados vazios;
2. se a suíte completa continua executável: `node run_parallel.js` roda 150 scripts, com "não executados: 0" e "retries: 0";
3. se testes, asserções e cobertura foram preservados:
   - o diff em `test_*.js` é de 1 linha de caminho;
   - 706 linhas de checklist são idênticas por teste;
   - a cobertura vai de 79,99 % para 79,91 % / 80,28 % de bytes;
4. se houve alteração de regra de negócio ou UI: `git status` só tem `tests/e2e/*` e o relatório;
5. se tempos e flakiness melhoraram de forma comprovada:
   - −26,1 % na suíte completa;
   - rota rápida de 24 s;
   - a ordenação foi declarada neutra;
6. se as falhas estão bem classificadas: 19 preexistentes, 2 ambientais (1 corrigida), 2 intermitentes preexistentes, `test_loja` sob carga e 2 flakes só com cobertura;
7. se todos os critérios AT-01 a AT-14 estão aprovados. **AT-11 está NÃO VERIFICADO**, porque não existe CI, e AT-07 tem ressalva;
8. quais riscos permanecem:
   - concorrência 10 × janelas de 2 s em 136 arquivos;
   - `test_save_limit_001_careerstore` sobrescreve `server/data/careers.json`;
   - sem CI;
9. se a infraestrutura está apta a desbloquear o redesign.

Responda com `APROVAR`, `REPROVAR` ou `APROVAR COM PENDÊNCIAS`, citando evidências por caminho/linha/log. Se qualquer critério obrigatório estiver reprovado ou não verificado, mantenha o redesign bloqueado e indique o que precisa acontecer para fechar AT-11: criar o workflow de CI com `npm run test:ci`, ou aceitar formalmente a ausência de CI nesta fase.
