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

Outras opções: `--order=alpha` (ordem alfabética; o padrão roda os mais
longos primeiro, pela duração da última execução), `--no-unit`.
Concorrência padrão = 2,5 × CPUs (entre 2 e 12) — a suíte passa a maior
parte do tempo esperando (timers do app, esperas fixas), não em CPU.

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
`_coverage/` + `_coverage_summary.json` (com `--coverage`).
Não há retry automático: um teste que falha conta como falha.

CI: o repositório ainda não tem pipeline (não existe `.github/workflows`);
`npm run test:ci` é o comando pronto pra quando houver — servidor
isolado, suíte completa, código de saída ≠ 0 se qualquer teste falhar.

Cada script imprime um checklist numerado (`1) ... true/false`) e sai com
código 0 (tudo passou) ou 1 (alguma asserção falhou/exceção). O runner
paralelo agrega isso num resumo final e grava `_last_parallel_run.json`
(gitignored) com o detalhe de cada execução.

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
  scripts escritos antes dessa mudança que não clicam em
  `#btnPreMatchGo`/`#confirmOkBtn` primeiro travam esperando a tela
  seguinte.
- `test_frozen_provider.js` precisa de `DATA_PROVIDER=frozen` configurado
  no servidor (usa o catálogo real congelado) — sem isso, falha por
  design.
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
