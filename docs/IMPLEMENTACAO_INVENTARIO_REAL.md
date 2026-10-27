# Carreira 2.0 — inventário real (Fase 0, fatia 1: Dashboard)

> Base: branch `carreira-v2` = merge do PR #52 (`40921ee`). Levantado no
> código (`server/server.js`, `server/src/careerStore.js`,
> `public/js/carreira.js`) e numa carreira real criada e jogada 3 rodadas no
> jogo atual (fixture recortada em
> `frontend-v2/src/domain/__fixtures__/career_r4.json`, sem dado pessoal).

## Servidor e rota

- `server.js` serve estático de `public/` (sem passo de build no deploy).
  Pasta sem `index.html` cai no `index.html` do site (`serveStatic`), então
  a v2 entra em **`/carreira-v2.html`** com assets em `/carreira-v2/` e rotas
  por hash (`#/inicio`, …). `carreira.html` continua intacto.
- MIME conhecidos: `.html .css .js .json .svg .png`. **Sem `.webp`/`.woff2`**
  (o navegador detecta imagem mesmo assim; registrar antes de usar WebP).

## APIs usadas na fatia (mesma origem, cookie de sessão HttpOnly)

| Rota | Resposta real | Uso na v2 |
|---|---|---|
| `GET /api/auth/me` | `{ authenticated: false }` ou `{ authenticated: true, user: { id, name, email, plan, … } }` | sessão |
| `POST /api/auth/login` `{ email, password }` | 200 `{ user }` + cookie; 401 `{ error: "E-mail ou senha incorretos." }` | login |
| `POST /api/auth/logout` | `{ ok: true }` | (gateway pronto) |
| `GET /api/career` | `{ career: null }` ou `{ career: {…79 campos} }` (gzip opcional) | **somente leitura** |
| `GET /api/career/slots` | `{ maxSlots: 3, slots: [{ id, active, empty, meta: { clubId, clubName, clubLogo, competitionId, seasonYear, currentRound, updatedAt } }] }` | próxima fatia (saves) |

A v2 desta fatia **não grava** (`PUT /api/career` não é chamado) — evita duas
implementações escrevendo o mesmo save.

## Campos do save lidos pelo Dashboard

| Campo | Forma real | Derivação (`frontend-v2/src/domain/dashboard.ts`) |
|---|---|---|
| `clubId`, `clubName`, `clubShort`, `clubLogo` | `"cap"`, `"Athletico Paranaense"`, `"CAP"`, `"img/teams/cap.svg"` | cabeçalho do clube |
| `competitionId`, `seasonYear`, `currentRound` | `"brasileirao"`, `2023`, `4` | contexto, próximo jogo |
| `standings[id]` | `{ id, j, v, e, d, gp, gc, sg, pts }` | `sortedStandings`/`leaguePosition` (porte), `clubRecord` |
| `schedule[rodada]` | `[{ home, away }]` | `nextMatch` |
| `calendar` | `{ year, idx, weeks: [{ d: "MM-DD", p, r, c? }] }` | data do próximo jogo |
| `divisionTeams[comp]` | `[{ id, name, short, c1, c2, logo?, venue: { name, city } }]` | times, estádio |
| `matchLog` | **mais novo primeiro**; `{ seasonYear, round, opponentId, home, gh, ga }` (gh/ga = mandante/visitante) | `recentResults` |
| `recentForm` | pontos por jogo, do mais antigo pro mais novo (`[1,3,0]`) | `boardConfidence` (porte) |
| `boardGoal`, `negativeSeasonsStreak`, `reputation` | `{ type, target, label }`, `0`, `52` | `boardConfidence` (porte), objetivos |
| `objectives.weekly` | `[{ objectiveId, title, target, currentProgress, status }]` | objetivos |
| `squad` | `{ id, name, group: G/D/M/F, overall, origin, … }` | `squadHighlights` |
| `newsFeed` | `{ type, mine, texto, round, seasonYear }` | `clubNews` |
| `notifications` | `{ id, type, text, ts, read }` | ponto de não lidas |

Escudos: `teamLogoSrc` do legado (logo do catálogo > `img/teams/<id>.svg`
dos 19 clubes com SVG oficial > sigla) — portado como `crestSrc`.

## Funções portadas do legado (equivalência testada)

`sortedStandings`, `myLeaguePosition`, `boardConfidence`, `teamLogoSrc`:
mesma fórmula; `tests/e2e/test_v2_dashboard.js` compara v2 × legado no mesmo
save (posição, pontos, campanha, adversário, confiança). Próximo passo da
extração (doc 01): mover essas funções pra um módulo compartilhado usado
pelos dois lados.
