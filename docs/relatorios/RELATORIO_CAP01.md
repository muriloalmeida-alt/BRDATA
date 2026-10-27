# Relatório — Capítulo 1 (Telas 01–07): da abertura ao seu clube

Branch `rebranding` (local). Normas: `00_DIRETRIZES_GERAIS_BRDATA.md` do pacote.
Assets: `docs/REDESIGN_ASSETS.md`. Evidências: `docs/redesign-evidencias/cap01-*.jpg`
(referência aprovada × captura real 390×844; capturas também em 360×780,
430×932 e 1280×800 geradas por `tools/capture/capture-cap01.js`).

**Status: implementação técnica concluída; aceite visual pendente.** As
cenas fotográficas (estádio/túnel/treinador) não existem como assets
limpos — as telas rodam sobre o fundo vetorial do pacote.

## T01 — Splash

| Elemento | Fonte | Handler / transformação | Teste |
|---|---|---|---|
| Marca | `img/brand-icon.png` (oficial) | estática | `test_bloco789_perfil_config` (crest), `test_s4_b2_001_loading` |
| Mensagem "O clube é seu. / A estratégia, também." | texto nativo | — | captura |
| Barra de progresso | etapas reais de `boot()`/`enterAfterAuth()` (sessão → save → competição → demais divisões → montagem) | `setBootProgress(done,total,label)`; sem etapa conhecida = indeterminada | `test_s4_b2_001_loading` |
| Erro recuperável | `splashErrorHTML` (existente) com "Tentar novamente" | — | idem (estado de erro) |

Divergências: sem estádio/túnel (CEN-01) e sem treinador (PERS-01); sem
wordmark horizontal (MAR-01, não recriado em texto); símbolo oficial ≠
escudo lima da referência (MAR-02). Movimento reduzido: barra indeterminada
vira estática.

## T02 — Login

| Elemento | Fonte | Handler | Teste |
|---|---|---|---|
| E-mail/senha | `POST /api/auth/login` (existente) | `submitCtLogin` | `test_s4_b2_002_login`, `test_carreira_login_form` |
| Mostrar senha | novo | `#btnTogglePassword` (`aria-pressed`) | `test_redesign_caps_1_7` (fluxo), captura |
| Criar conta | `/?signup=1` (existente) | link | `test_fix_signup_link` |
| Erros | mensagem genérica (não revela se a conta existe) | `#ctLoginError role=alert` | `test_s4_b2_002_login` |

Divergências: sem login social e sem "Esqueci minha senha" (decisão de
Produto); sem cena/treinador.

## T03 — Seleção da competição

Dados: `CAREER_COMPETITIONS` (Série A/B/C, reais do jogo) + contagem de
carreiras por competição (`GET /api/career/competition-popularity`,
agregado anônimo). Handler `renderCompetitionPicker`/`chooseCompetition`
(agora com falha recuperável: volta à lista com aviso). Abas de categoria
só com 2+ categorias. Voltar → "Meus saves" quando a conta já tem carreira.
Testes: `test_redesign_caps_1_7` (1), 143 testes de fluxo usam o seletor.

Divergências: ligas estrangeiras e abas "Américas/Europa" da referência não
existem no jogo; selo "Mais popular" só aparece com líder isolado.

## T04 — Seleção do clube

Dados: `LEAGUE_TEAMS`; escudo por `teamLogoSrc()` (logo do fornecedor →
`img/teams/<id>.svg|_b.png` → monograma). Busca normalizada (sem acento)
por nome/sigla/cidade; Favoritos em `ME.careerFavorites`
(`PUT /api/account/career-favorites`, otimista com reversão); Região por UF
(só se houver 2+). CTA "Continuar" ancorado, só com seleção.
Testes: `test_redesign_caps_1_7` (2a–2c, 3), `test_serie_b_escudos`,
`test_escudo_monograma`, `test_remove_situacao_contraste_logo`.

Divergências: sem estrelas de força (a força do catálogo de exemplo é
fictícia); sem "clubes populares".

## T05 — Configurar carreira (nova)

Campos: nome (obrigatório), nacionalidade (ISO-3166, nomes via
`Intl.DisplayNames` pt-BR, "Não informar"), foto (JPG/PNG/WebP ≤ 10 MB,
recortada e reduzida a 160×160 WebP no aparelho; servidor aceita ≤ 60 KB).
`PUT /api/account/coach-profile` só com o que mudou; depois `startCareer`.
Erro de rede mantém o formulário com mensagem; toque repetido ignorado.
Testes: `test_redesign_caps_1_7` (4a, 4b).

Divergências: sem Dificuldade e Duração (decisão de Produto); sem cena.

## T06 — Primeira entrada (nova)

Só depois de `startCareer` (carreira nova ou novo clube por proposta);
retomar save não passa aqui. Texto com clube e competição reais, escudo
oficial 112 px, uma ação "Vamos lá" (protegida contra toque duplo).
Teste: `test_redesign_caps_1_7` (5); helper `passCareerSetup`.

Divergência: sem torcida/papel picado (CEN-03).

## T07 — Dashboard

Implementado junto com Cap. 2 T01 (mesma tela, referência individual
aprovada do Cap. 2) — ver `RELATORIO_CAP02.md`.

## Prompt para GPT

"Revise o Capítulo 1 do redesign BRDATA como responsável por Produto/Design.
Compare as folhas `docs/redesign-evidencias/cap01-*.jpg` (referência ×
captura real) e as capturas em 360/390/430/1280 com as especificações
`CAPITULO_01_TELA_0X_*.md`. Considere que cenário, treinador e wordmark
estão pendentes por falta de asset limpo (`docs/REDESIGN_ASSETS.md`) e que
login social, recuperação de senha, dificuldade e duração foram retirados
por decisão de Produto. Avalie hierarquia, legibilidade, estados (vazio,
erro, carregamento), acessibilidade e coerência com o jogo. Liste
bloqueadores, ajustes e se aceita a estrutura enquanto os assets não chegam."
