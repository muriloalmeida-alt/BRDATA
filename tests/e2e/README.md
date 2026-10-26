# Suíte de regressão E2E (Modo Técnico)

Scripts Playwright independentes (`test_*.js`; 149 em 25/10/2026) que cobrem o Modo Técnico
de ponta a ponta — cada um cria sua própria conta/carreira contra um
servidor local já rodando, então não há setup compartilhado nem ordem de
execução obrigatória entre eles.

Migrados pra dentro do repositório em 2026-09 porque viviam só em
`/tmp/pw-scratch/` (diretório efêmero do sandbox de desenvolvimento) — sem
isso, a suíte inteira seria perdida a cada reset de ambiente. 4 scripts
obsoletos (que testavam funções/atributos já removidos do app —
`buyPlayer()`, `data-sell`, `#marketBuyTable`) foram descartados na
curadoria e não fazem parte deste diretório.

## Pré-requisitos

1. **Node.js** ≥ 18.
2. **Servidor do jogo rodando localmente** em `http://localhost:8787`
   (`cd server && npm install && node server.js` a partir da raiz do
   repo — outra porta exige editar a constante `base` no topo de cada
   script). O `npm install` é necessário desde que o servidor ganhou
   `web-push` como dependência (notificações push, ver
   `server/src/push.js`).
3. **`playwright-core`** instalado nesta pasta:
   ```
   cd tests/e2e
   npm install
   ```
4. **Um binário do Chromium** compatível com a versão de `playwright-core`
   instalada. Duas opções:
   - Rodar `npx playwright install chromium` (baixa um build gerenciado
     pelo próprio Playwright) — nesse caso NÃO defina `PW_CHROMIUM_PATH`,
     o Playwright acha o binário sozinho.
   - Ou apontar pra um Chromium/Chrome já existente na máquina via
     variável de ambiente:
     ```
     export PW_CHROMIUM_PATH=/caminho/para/chrome
     ```

## Uso

Direto (um script específico):
```
node test_mercado2.js
```

Suíte inteira, em paralelo (recomendado — motivo: ver comentário no topo
de `run_parallel.js`). Comandos oficiais (`npm run ...` nesta pasta):

| Comando | O que roda | Servidor |
|---|---|---|
| `npm test` (= `node run_parallel.js`) | suíte completa: todos os `test_*.js` + `tests/unit/test_*.js` | o que já estiver em `:8787` |
| `npm run test:full` / `npm run test:ci` | suíte completa | **isolado**: o runner sobe um servidor próprio com `data/` vazio numa cópia temporária e derruba no fim (exige a porta 8787 livre) |
| `npm run test:fast` | rota rápida (`suites.json` → `fast`): smoke de fluxos críticos + unitários. **Não substitui** a suíte completa antes de merge | isolado |
| `npm run test:coverage` | suíte completa + cobertura JS do app (V8) → `_coverage_summary.json` | isolado |
| `npm run test:unit` | só o teste unitário do motor do 2048 | — |
| `npm run test:list` | lista o que rodaria, sem rodar | — |

Por que o servidor isolado: o servidor de dev grava TODAS as contas
criadas pelos testes no mesmo `server/data/careers.json`, que só cresce
(~8,5 MB por execução da suíte); com o arquivo acumulado a suíte fica
mais lenta e testes de tempo real passam a estourar timeout. O isolado
começa sempre do zero e não toca `server/data/` do dev.

Só um subconjunto (substring do nome do arquivo, vários separados por
vírgula) e/ou ajustando concorrência/timeout:
```
node run_parallel.js test_mercado,test_scout --concurrency=8 --timeout=60000
```

Várias máquinas (CI em paralelo, por exemplo): `--shard=I/N` roda só a
parte I de N — `node run_parallel.js --isolated-server --shard=1/2` numa
máquina e `--shard=2/2` na outra cobrem a suíte inteira, sem repetir
teste. A divisão usa as durações medidas versionadas em `suites.json`
(`durationsMs`), então é a mesma em qualquer máquina; atualize essa
tabela quando a suíte mudar muito.

Máquina maior: a concorrência padrão (2,5 × CPUs) vai até 32 processos,
então a suíte escala sozinha. Nesta suíte o limite é CPU (≈ 76–88% de uso
com 10 processos em 4 CPUs), então mais núcleos reduzem o tempo quase na
mesma proporção; as pausas fixas curtas dos testes não são o gargalo
(trocá-las por espera de estado deixou a suíte mais lenta em 4 CPUs).

Outras opções: `--order=alpha` (ordem alfabética; o padrão roda os mais
longos primeiro, pela duração da última execução), `--no-unit`.
Concorrência padrão = 2,5 × CPUs (entre 2 e 32) — em 4 CPUs isso dá 10
processos e ~76% de CPU: o paralelismo já ocupa a máquina (ver "Máquina
maior" acima).

Configuração em `suites.json` (nada lá pula teste):
- `fast` — lista da rota rápida;
- `long` — testes com timeout próprio (180 s), escolhidos pela duração
  máxima medida (≥ 60 s);
- `exclusive` — testes que rodam sozinhos, depois dos demais (leem o
  `careers.json` do servidor direto do disco).

Saídas (todas gitignored): `_last_parallel_run.json` (metadados da
execução — commit, comando, concorrência, timeouts, retries — e o
resultado de cada script), `_artifacts/<teste>.log` (stdout/stderr de
cada teste que falhou) e `_artifacts/server.log` (servidor isolado),
`_coverage/` + `_coverage_summary.json` (com `--coverage`; `__total.lostCollections` lista testes cuja coleta de cobertura se perdeu — compare cobertura só quando estiver vazio).
Não há retry automático: um teste que falha conta como falha.

CI: o repositório ainda não tem pipeline (não existe `.github/workflows`);
`npm run test:ci` é o comando pronto pra quando houver — servidor
isolado, suíte completa, código de saída ≠ 0 se qualquer teste falhar.

Cada script imprime um checklist numerado (`1) ... true/false`) e sai com
código 0 (tudo passou) ou 1 (alguma verificação falhou/exceção). O runner
paralelo agrega isso num resumo final e grava `_last_parallel_run.json`
(gitignored) com o detalhe de cada execução.

Até a Fase B do motor de testes (10/2026) isso NÃO era verdade: as
verificações eram só `console.log("N) ...:", condição)` e 143 de 152
scripts saíam com código 0 mesmo com verificação `false` (só exceção
reprovava). Desde então toda verificação numerada passa por `check()`
(ver abaixo) — o código de saída reflete as verificações.

## Helpers compartilhados (arquivos `_*.js`, não são testes)

- `_check.js` — `check("N) descrição:", condição, ...detalhes)`: imprime a
  mesma linha de sempre e, se a condição for `false`/`undefined`/`null`,
  faz o script sair com código 1 e lista as verificações que falharam.
  `check("N) ... pulado")` só com o rótulo é aviso, não conta. **Toda
  verificação nova deve usar `check()`, nunca `console.log`.**
- `_startup.js` — `enterGame(page)`: entrada numa carreira nova pelo
  estado da tela (tutorial → assistente de início → login diário,
  `{ claimDailyLogin: false }` pra não coletar). Também
  `skipOnboarding(page)` e `skipStartupWizard(page)` avulsos.
- `_round.js` — `playRound(page, ganchos)` / `playNextMatchRound(page,
  ganchos)`: uma rodada inteira pela interface, guiada pelo estado
  (pré-jogo → ao vivo → "Seu jogo" → coletiva → Notícias → Resultados →
  Tabela; amistosos e semanas sem jogo no caminho). Ganchos
  `onMatchDetail`/`onPress`/`onNews`/`onRoundResults`/`onPlayerOffer`/
  `onTabela` leem cada tela; devolver `"stop"` para ali. Tela desconhecida
  faz parar (`stoppedAt`), nunca é fechada às cegas.
- `_startup.js` → `waitForBoot(page)`: depois de `page.reload()`/abrir a
  carreira, espera o fim do boot (e o `CAREER` carregado na tela do jogo)
  — use no lugar de `waitForTimeout` fixo.
- `_calendar_skip.js` — `skipPreseason(page)`: pula as semanas sem jogo
  da pré-temporada (carreira nova começa nela, GE-CALENDAR-001).
- `_grant_test_credits.js` — preparação do perfil de servidor
  `loja-creditos` (ver `suites.json` → `serverProfiles`).

Determinismo: a coletiva de imprensa é sorteada
(`PRESS_CHANCE_BY_ID`); teste que não é sobre ela deve desligá-la com
chance `1e-12` (não `0` — o jogo usa `|| 0.3`, então `0` vira 30%), e
teste sobre ela deve forçar chance `1` e um resultado que gere gatilho.

## Convenções destes scripts

- Cada teste faz seu próprio signup (`/api/auth/signup` + `/api/auth/login`
  via `fetch` direto no `page.evaluate`, e-mail único com `Date.now()`) —
  contas de teste não interferem entre si, mesmo rodando em paralelo,
  porque o estado por conta vive isolado no servidor.
- Viewport padrão `390×844`/`390×900` (mobile) — o Modo Técnico é
  desenhado mobile-first.
- Screenshots (quando o script tira algum) são salvos como `*.png` neste
  mesmo diretório — gitignored, servem só de inspeção manual local.
- Diálogos nativos do navegador (`window.confirm`/`alert`) são
  auto-dispensados via `page.on("dialog", ...)` na maioria dos scripts —
  o app usa modais próprias (`confirmModal()`) pra confirmação desde antes
  desta suíte existir; alguns scripts mais antigos ainda esperam diálogo
  nativo num fluxo específico e podem falhar por isso (falha catalogada,
  não uma regressão real do app).

## Achados conhecidos, não-regressivos

Alguns scripts têm falhas pré-existentes catalogadas ao longo do
desenvolvimento (não indicam bug no app):
- Fluxo de confirmação pré-jogo: `#btnSimulate`/`#btnAdvanceSeason` abrem
  uma confirmação (`#preMatchOverlay`/`confirmModal()`) antes de simular —
  scripts que simulam rodada devem usar `_round.js` (os que clicavam
  direto foram migrados na Fase B).
- `test_frozen_provider.js` precisa de `DATA_PROVIDER=frozen` no servidor
  e `test_loja_pagamento_real.js` de uma conta com créditos criada antes
  do boot — com `--isolated-server` o runner faz os dois sozinho
  (`suites.json` → `serverProfiles`); contra o servidor de dev, falham
  por design.
- Timing de partida ao vivo em velocidade natural (`test_training_evolution.js`,
  `test_play_by_play_v1.js`/`v2.js`) pode ser sensível a CPU disponível
  sob alta concorrência — rode com `--concurrency` menor ou `--timeout`
  maior se aparecerem timeouts isolados nesses arquivos.
- Flakiness de rede/proxy em ambientes com acesso restrito a
  `fonts.googleapis.com`/`fonts.gstatic.com` — a maioria dos scripts já
  bloqueia isso via `--host-resolver-rules`, mas nem todos.
- `test_push_notifications.js` (notificações push) usa
  `launchPersistentContext` (não incognito — o Push API é bloqueado de
  propósito em contexto incognito, crbug.com/401439) e aceita 2
  desfechos pro clique de ativar: assinatura de verdade (rede alcança o
  serviço de push do navegador) OU falha de rede tratada com elegância
  (ambientes com egress restrito, como este sandbox) — os dois contam
  como PASS, só muda qual branch do log aparece.
