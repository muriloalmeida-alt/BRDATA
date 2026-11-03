# Carreira 2.0 — Fase 0: inventário real do código

> Pacote: `docs/carreira-v2/` (cópia versionada do pacote "BRDATA Carreira 2.0"
> do Drive, sem os WebP provisórios). Branch `carreira-v2`, a partir de
> `40921ee` (merge do PR #52), por decisão do Murilo em 27/10/2026.
> Fase 0 = só leitura e documentação: **nenhum código de produto foi alterado**.

Reprodutível:
- `node tools/inventario/extrair.js > docs/carreira-v2/inventario.json` — rotas, chamadas do cliente, campos de `CAREER`, telas, funções.
- `node tools/inventario/grafo.js [entrada…]` — fecho de dependências de uma função do motor; `CORTES=a,b node tools/inventario/grafo.js` lista os pontos lógica → interface.

O grafo é textual (nome de função seguido de `(` dentro do corpo): pode
superestimar um pouco (callbacks, nomes citados), nunca subestima.

## 1. Tamanho do legado

| Arquivo | Linhas |
|---|---|
| `public/js/carreira.js` | 17.267 (728 funções de topo; 269 tocam DOM; 56 chamam `persistCareer`; 28 usam rede; 33 usam `Math.random`) |
| `public/carreira.html` | 6.130 (7 telas `screen*`, 13 painéis, 58 overlays) |
| `server/server.js` | 2.905 |

## 2. Servidor e sessão (o que a v2 herda)

- **Arquivos estáticos:** `serveStatic` serve `public/`; rota desconhecida cai no `index.html` do **site principal** (não da carreira). `/carreira` serve `carreira.html` explicitamente. ⇒ A v2 precisa de uma rota própria em `server.js` (`/carreira-v2` e subrotas → `public/carreira-v2/index.html`) para deep links funcionarem. Mudança pequena e isolada.
- **Sessão:** cookie de sessão `HttpOnly; SameSite=Lax; Path=/`, 30 dias (`server/src/sessions.js`). Mesma origem ⇒ a v2 reaproveita a sessão sem CORS nem token. Sem CSRF explícito (Lax cobre o caso same-site; registrar como risco aceito, igual ao legado).
- **401:** rotas protegidas devolvem `401 { error: "Login necessário.", code: "AUTH_REQUIRED" }`.
- **Service worker** (`public/sw.js`) na raiz: network-first com app shell; a v2 deve entrar no shell (ou ficar fora do escopo de cache) para não servir versão velha.
- **Build:** Dockerfile copia `server/` e `public/` e roda `npm ci` só do servidor. Não há etapa de build de front. **Decisão pendente:** React+Vite exige build (no Docker ou artefato gerado e versionado em `public/carreira-v2/`).

## 3. API usada pelo Modo Carreira (contratos reais)

| Método e rota | Uso no legado | Corpo / resposta | Erros |
|---|---|---|---|
| `GET /api/auth/me` | boot | `{ authenticated, user }` (`users.publicUser`) | — |
| `POST /api/auth/login` | login | `{ email, password }` → `{ user }` + cookie | 401 genérico |
| `POST /api/auth/logout` | sair | — | — |
| `POST /api/auth/signup` | cadastro (site principal) | nome, e-mail, senha, telefone, plano | 400 |
| `GET /api/career` | carregar save ativo | `{ career }` (null se vazio; gzip opcional) | 401 |
| `PUT /api/career` | salvar (blob inteiro) | `CAREER` → `{ career }` | 400 formato (`clubId` string + `squad` array); 413 > 768 KB comprimido |
| `DELETE /api/career` | "Reiniciar" (apaga o slot ativo) | `{ ok }` | — |
| `GET /api/career/slots` | Meus saves | `{ maxSlots: 3, slots:[{ id, active, empty, meta }] }` | — |
| `POST /api/career/slots/:id/activate` | trocar save / nova carreira | lista de slots | 400 slot inválido |
| `DELETE /api/career/slots/:id` | excluir save | lista de slots | 404 / 400 |
| `GET /api/career/competition-popularity` | selo "Mais popular" | `{ counts: { competitionId: n } }` | — |
| `GET /api/career/teams?season&competition` | catálogo do campeonato | times do fornecedor (cache) | 400 sem `season` |
| `GET /api/career/standings?season&competition` | tabela real (calibrar força) | standings do fornecedor | 400 |
| `GET /api/competitions` | registro de competições | — | — |
| `PUT /api/account/coach-profile` | nome, nacionalidade, foto | `{ name?, nationality?, avatar? }` → `{ user }` | 400, 413 |
| `PUT /api/account/career-favorites` | favoritos na escolha de clube | `{ clubIds }` | 400 |
| `PUT /api/account/name`, `POST /api/account/onboarding-seen` | perfil, tutorial | — | — |
| `GET/POST /api/daily-login[/claim]` | recompensa diária | `localDate` | 400 |
| `GET/POST /api/friends[/add]`, `GET/POST /api/leaderboard[/publish]` | ranking | — | — |
| `POST /api/loja/checkout`, `/spend-credits` | loja | — | — |
| `GET /api/push/vapid-public-key`, `POST /api/push/(un)subscribe`, `/test` | notificações push | — | — |

**Persistência:** cada `persistCareer()` envia o blob **inteiro** via `PUT /api/career`
(sem debounce no cliente; o servidor grava em disco com debounce). **Não há
controle de versão/conflito:** a última escrita vence. ⇒ Com duas interfaces
(legado + v2) gravando o mesmo save, uma pode apagar a outra. **Pré-requisito
da v2 antes de escrever:** precondição otimista (ex.: `If-Match`/`updatedAt`
esperado → 409), retrocompatível com o legado.

## 4. Estado `CAREER`

- `version: 1` fixo desde a criação; **não existe `schemaVersion` nem migração versionada** — `migrateCareerDefaults()` faz backfill campo a campo (`*` abaixo = campo com backfill).
- 80 campos de topo. Os mais referenciados: `squad`(153), `clubId`(142), `lineup`(141), `currentRound`(86), `finances*`(64), `seasonYear*`(45), `careerTotals*`(43), `leagueSquads*`(40), `standings`(33), `calendar`(33), `cup`(29), `pendingOffersOut*`(25), `reputation*`(22), `scouts*`(21), `objectives`(21). Lista completa com contagem em `docs/carreira-v2/inventario.json` (`camposCareer`).
- Tamanho: carreira "multi" nasce com ~500–560 KB de JSON (≈40 KB comprimido); `leagueSquads` ≈ 79% do total.

## 5. Motor de jogo — o quanto dá para extrair

| Entrada | Funções no fecho | Linhas | Tocam DOM | Persistem | `Math.random` |
|---|---|---|---|---|---|
| `autoLineup` | 2 | 56 | 0 | 0 | 0 |
| `computeContractFields` | 2 | 44 | 0 | 0 | 0 |
| `boardConfidence` | 4 | 44 | 0 | 0 | 0 |
| `humanFixtures` | 3 | 44 | 0 | 0 | 0 |
| `applyWeeklyTraining` | 25 | 399 | 2 (`toast`) | 0 | 1 |
| `resolveRoundInstant` / `simulateRound` / `advanceSeason` / `startCareer` / `migrateCareerDefaults` / `goToMatch` | **588** | **14.823** | 212 | 37 | 24 |

- A simulação de rodada, a virada de temporada, a criação de carreira e a migração de save **puxam o app inteiro**, porque a lógica chama a interface no meio do caminho: **111 pontos de corte para 48 funções de interface** (`toast`, `render*`, `open*Modal`, `startLiveMatch`, `confirmModal`…).
- **Determinismo:** 33 funções usam `Math.random` direto (ex.: `simulateCupTie`, `simulateAiTransfers`, `rollInjurySeverity`, `resolveLiveChunk`, `pickCommentary`); só parte do motor usa RNG com semente (`seededRngFromKey`). Teste "legado × extraído com a mesma semente" exige injetar o RNG antes.
- Extraíveis já (sem interface): escalação automática, contratos, confiança da diretoria, lista de jogos, cálculo de força, treino (com 2 cortes).

## 6. Telas legadas que a v2 substitui (52 do pacote)

Mapeamento já levantado nos relatórios do PR #52 (`docs/relatorios/`):
- Cap. 1 (7) e Cap. 2 (7): `screenLoading`, `screenLoginRequired`, `screenCompetitionPicker`, `screenPicker`, `screenSetup`, `screenFirstEntry`, painéis `central/jogos/clube/elenco` + `detailOverlay`, `commissionOverlay`, `boardGoalsOverlay`, `extratoOverlay`, `calendarOverlay`.
- Cap. 3–7 (38): tabela de inventário de `docs/relatorios/RELATORIO_CAP03_A_07.md` (cada tela → função `open*`/painel real).
- 58 overlays e 68 funções `open*` listados em `inventario.json`.

## 7. Riscos e decisões para a Fase 1

| # | Risco / decisão | Proposta |
|---|---|---|
| R1 | **Motor acoplado à interface** (111 cortes) — a v2 não pode simular partida sem extrair o motor, e o pacote proíbe carregar `carreira.js` como script global ou copiar regras | Extração incremental: (1) injetar portas de interface (`ui.toast`, `ui.openX`) no legado, mantendo o comportamento; (2) mover funções sem DOM para módulos ES compartilhados com testes; (3) só então a v2 importa o motor. Até lá, a fatia vertical da v2 cobre leitura e edição (Dashboard, Elenco, Tática) e entrega "Ir para o jogo" à tela legada |
| R2 | **Última escrita vence** no save | Antes da v2 gravar: `PUT /api/career` com precondição de versão (409 em conflito), retrocompatível |
| R3 | Sem `schemaVersion` | v2 lê sem mutar (round-trip preserva campos desconhecidos); `migrateCareer(save)` versionado proposto, sem migração irreversível |
| R4 | `Math.random` no motor | Injetar RNG (semente) nas 33 funções antes dos testes de equivalência |
| R5 | Build de front (React+Vite) — o servidor hoje é Node puro com 1 dependência | **Decisão do Murilo pendente**: build no Docker (dependências de dev só na imagem de build) ou artefato gerado em `public/carreira-v2/` |
| R6 | Rota `/carreira-v2` cai no `index.html` do site | Rota própria no `server.js` (fallback da SPA para `public/carreira-v2/index.html`) |
| R7 | Service worker na raiz pode servir versão velha da v2 | Incluir no shell com versão de deploy ou excluir do cache |
| R8 | Zoom bloqueado no legado (pedido antigo) × pacote "não bloquear zoom" | v2 nasce com zoom liberado; legado fica como está até decisão |
| R9 | Assets: só recortes provisórios | v2 com base navy limpa + "PENDÊNCIA VISUAL" (MAR-01/02, CEN-01..05, PERS-01) |

## 8. Linha de base de testes

Suíte completa (`node run_parallel.js --isolated-server`) em `40921ee`,
27/10/2026: **153/156**. Reexecução isolada das 3 falhas:

| Teste | Repetição | Leitura |
|---|---|---|
| `test_menu` | PASS | intermitente (navegação durante `evaluate` sob carga) |
| `test_assistente_inicio` | PASS | intermitente (tempo entre tutorial e assistente) |
| `test_redesign_a11y_responsivo` | FAIL | **defeito limítrofe real da base:** chips do painel Jogos com `min-height:40px` medem ~39,9 px; a diretriz pede alvos ≥ 44 px. Não corrigido na Fase 0 (só leitura); a v2 nasce com alvos de 44 px |

Na rodada final do PR #52 a mesma suíte deu 156/156 — o limite de 40 px
oscila com arredondamento de subpixel.
