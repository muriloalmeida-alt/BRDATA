# Redesign capítulos 1–7 — inventário de assets e pendências

> Estratégia híbrida (decisão de 27/10/2026): **WebP** para cenários e
> fotografias; **WebP/PNG com transparência** para personagens e
> sobreposições; **SVG** só para ícones e vetores simples; **HTML/CSS**
> para botões, formulários, navegação e indicadores. Escudos oficiais do
> repositório. Marca BRDATA oficial, sem recriação.
>
> Nada de screenshot inteira como fundo e nada de cenário improvisado com
> gradiente. Onde o asset cinematográfico falta, a tela roda com a
> estrutura funcional sobre o fundo vetorial limpo do pacote, e a
> fidelidade visual **não** está concluída.

## 1. Inventário — o que já existe

### No repositório (`public/img/`)

| Arquivo | Formato / tamanho | Uso no redesign |
|---|---|---|
| `brand-icon.png` | PNG RGBA 267×284, símbolo branco com fundo transparente | **Marca oficial** em todas as telas (splash, login, fluxo de escolha, topo do jogo) |
| `logo.png` | PNG RGB 480×263, símbolo + "BR DATA" empilhado **sobre fundo navy chapado** | Não usado: sem transparência, viraria um "cartão" sobre o fundo (ver MAR-01) |
| `og-image.png` | PNG 1200×630 | Compartilhamento (inalterado) |
| `icons/*.png` | ícones PWA | Inalterado |
| `teams/<id>.svg` (19 clubes da Série A) | SVG | **Escudos oficiais** — agora usados em todo o Modo Técnico via `teamLogoSrc()`/`crestImg()` (antes a carreira de exemplo mostrava monograma) |
| `teams/<id>_b.png` (11 clubes da Série B) | PNG 64×64 | Escudos oficiais da Série B (já vinham no catálogo) |
| `cbf-logo.png`, `partners/*` | — | Fora do escopo do Modo Técnico |

Clubes sem escudo no repositório (Mirassol; 9 da Série B; Série C)
continuam com o **monograma** (sigla nas cores do clube) — fallback
honesto, não um escudo inventado.

### Nos pacotes de especificação (copiados para `public/img/redesign/`)

| Arquivo | Origem | Status no pacote | Uso |
|---|---|---|---|
| `background-navy-clean.svg` | Cap. 1 `assets/shared/` (idêntico ao `tela-XX/production/background-clean.svg`) | produção | Fundo base de todas as telas com cena (`.bd-scene`) enquanto a foto não chega |
| `overlay-sombra.svg` | Cap. 1 `assets/tela-01/` | vetorial utilizável com ressalvas | Sombra de legibilidade — só entra quando houver foto (`.bd-scene.has-photo`) |
| `overlay-legibilidade.svg` | Cap. 2 `assets/tela-01/` | produção | Reserva para o hero do Início quando CEN-02 chegar |
| `icon-*.svg`, `progress-track.svg` | Cap. 1 `assets/shared/` | produção | Equivalentes já existem como SVG inline no app (mesmo traço 2px); a barra de progresso é HTML/CSS (`.bd-progress`) com valor real |

Referências (`referencia-*`, `*-recorte-referencia`, `REFERENCIA_*`) **não**
foram copiadas para o produto.

### Removido nesta revisão

As ilustrações de estádio/túnel/treinador que eu tinha gerado em SVG e
rasterizado em WebP (`public/img/scene/`, `tools/scene/`) foram
**apagadas** — contrariam a estratégia (cenário e personagem não se
desenham em SVG). O wordmark "BRDATA" recriado em texto HTML também saiu.

## 2. Assets ausentes (precisam ser fornecidos)

| ID | Asset | Formato e dimensões recomendados | Onde entra | Encaixe pronto |
|---|---|---|---|---|
| **MAR-01** | Wordmark oficial "BRDATA" horizontal (BR branco + DATA lima, como na referência) e lockup com a assinatura "FUTEBOL · GESTÃO · RESULTADOS" | SVG (preferível, é vetor simples) ou PNG transparente 1200×300 @1x; versões: só wordmark, lockup vertical (símbolo + wordmark + assinatura) | Splash, login, topo do jogo, cabeçalhos do fluxo de escolha | `.bd-brand` — trocar `<img>` do símbolo pelo lockup |
| **MAR-02** | Confirmação de qual símbolo vale: a referência mostra um escudo com contorno lima e estrela; o oficial do repositório é o escudo branco com seta (`brand-icon.png`) | Se o novo for oficial: SVG + PNG transparente 512×512 | Mesmos lugares da MAR-01 | idem |
| **CEN-01** | Túnel de acesso ao gramado à noite, arquibancada e refletores ao fundo, **sem** texto, marca, UI ou pessoa | WebP retrato 1080×1920 (≤250 KB) + paisagem 2160×1215 (≤400 KB); boca do túnel entre 45–60% da altura; terço superior escuro (área da marca) | Cap. 1 T01 Splash, T02 Login; Cap. 6 T08 Fim de carreira | `.bd-scene--tunnel{ --bd-scene-photo:url(...) }` + classe `has-photo` |
| **PERS-01** | Treinador de costas (casaco escuro, sem escudo/marca), recortado | PNG ou WebP **com alfa**, 1200×1800 (2:3), bordas suaves, base cortada na altura do quadril | T01 (centro, ~60% da altura), T02 e T05 (à direita, ~55%), Início (à direita do hero) | camada `<img>` posicionada pela base; some abaixo de 360 px de largura se cobrir texto |
| **CEN-02** | Estádio noturno lotado visto do gramado, iluminação de refletores, sem bandeiras/escudos identificáveis | WebP 1080×1350 (4:5) mobile e 1920×800 desktop (≤300 KB cada) | Cap. 1 T05 Onboarding; Cap. 2 T01 hero do Início; fundo da notícia em destaque | `.bd-scene--stadium`, `.bd-home-hero` |
| **CEN-03** | Torcida em celebração (papel picado, luz), cores neutras ou tingíveis | WebP 1080×1920 + 1920×1080 | Cap. 1 T06 Primeira entrada | `.bd-scene--club` |
| **CEN-04** | Gramado/estádio em plano aberto para partida (pré-jogo, ao vivo, resultado) | WebP 1920×1080 + 1080×1350 | Cap. 4 T01, T02, T06 | a criar quando o asset existir (hoje fundo sólido do DS) |
| **CEN-05** | Estádio do clube (fachada/arquibancada) genérico | WebP 1600×900 | Cap. 6 T07 Estádio | idem |
| **FOT-01** | Fotos de jogadores | Somente com licença; PNG/WebP 512×512 com alfa | Cap. 2 T01/T02/T03, Cap. 5 | **Fora** — o jogo não tem fonte licenciada; avatar com iniciais (`.bd-avatar--mono`) |
| **FOT-02** | Imagem de notícia | WebP 1200×675 | Cap. 2 T01, Cap. 6 T06 | Sem fonte: cartão de notícia só com texto |

## 3. Por tela

Legenda de responsividade: mobile 360–430 px em uma coluna; tablet ≥760 px
com grades de 2–3 colunas; desktop ≥1000 px com largura máxima de 1180 px.
Safe areas via `env(safe-area-inset-*)`; CTAs fixos reservam espaço no fim
do conteúdo.

### Capítulo 1 — Entrada

| Tela | Existentes reutilizados | Ausentes | Posicionamento / responsivo | Diferenças vs. referência aprovada |
|---|---|---|---|---|
| T01 Splash | `brand-icon.png`; `background-navy-clean.svg`; barra HTML/CSS com progresso real das etapas do boot | CEN-01, PERS-01, MAR-01 | Marca no terço superior (18vh do topo); mensagem logo acima da barra; barra a ~9vh da base + safe area | Sem estádio/túnel nem treinador; sem wordmark (só símbolo + assinatura em texto); símbolo oficial ≠ escudo lima da referência (MAR-02) |
| T02 Login | `brand-icon.png`; fundo vetorial; ícones inline (envelope, cadeado, olho) | CEN-01, PERS-01, MAR-01 | Marca no topo, título/campos na metade inferior; campos 56 px; teclado não cobre o botão (scroll) | Sem cena/treinador; sem login social e sem "Esqueci minha senha" (decisão de Produto 27/10) |
| T03 Competição | Bandeira do Brasil em SVG simples (país, não clube); fundo vetorial | — | Lista contínua full-width; abas de categoria só com 2+ categorias | A referência lista ligas estrangeiras que o jogo não tem; abas não aparecem (só "Brasil"); selo "Mais popular" só com dado real de carreiras |
| T04 Clube | **Escudos oficiais** `teams/*.svg|png`; monograma de fallback | — | Grade 3 col (mobile) / 4 (≥560 px) / 5 (≥900 px); CTA ancorado com safe area | Sem estrelas de força (o catálogo de exemplo tem força fictícia); filtro "Regiões" só aparece com UF de 2+ estados |
| T05 Onboarding | Fundo vetorial; avatar do treinador (foto enviada pelo usuário, reduzida a 160×160 no aparelho) | CEN-02, PERS-01 | Avatar centralizado; campos 52 px; botão no fim do formulário | Sem "Dificuldade" e "Duração" (decisão de Produto); sem cena/treinador |
| T06 Primeira entrada | Escudo oficial do clube (112 px) | CEN-03 | Texto e escudo na metade inferior; CTA único na base | Sem torcida/papel picado |
| T07 Dashboard | Escudos oficiais; marca oficial; ícones inline | CEN-02 (hero), PERS-01 | Ver Cap. 2 T01 (mesma tela) | Ver Cap. 2 T01 |

### Capítulo 2 — Gestão do clube

| Tela | Existentes reutilizados | Ausentes | Posicionamento / responsivo | Diferenças |
|---|---|---|---|---|
| T01 Visão do clube (Início) | Marca, escudos oficiais, avatar do treinador, ícones inline | CEN-02, PERS-01, FOT-01, FOT-02 | Mobile: saudação → próximo jogo → faixa de desempenho → 3 painéis → destaques/notícia → tabela → ações. Desktop ≥1000 px: saudação e próximo jogo lado a lado | Hero sem foto; destaques com iniciais (sem foto); notícia só texto; sem busca global (não existe no jogo) |
| T02 Elenco | — (componentes HTML/CSS) | FOT-01 | Lista contínua, filtros roláveis na horizontal | Avatares/fotos ausentes; usa barra de condição e nota |
| T03 Jogador | — | FOT-01 | Herói com avatar 72 px, faixa de atributos 4 col | Sem foto e sem nacionalidade do atleta (o dado não existe) |
| T04 Comissão | — | FOT-01 (staff) | Atalho no Clube + tela existente | Fotos do staff → iniciais |
| T05 Diretoria | Anel de confiança em SVG simples | — | Anel + composição explicada | — |
| T06 Finanças | Barras em HTML/CSS | — | Lista de categorias com barras proporcionais | Período = lançamentos guardados (sem série mensal de 6 meses: o extrato guarda os últimos 60) |
| T07 Calendário | Escudos oficiais | — | Navegação por mês, filtro por competição | — |

### Capítulos 3 a 7

Os pacotes declaram `"new_scene_assets": "produce_separate_clean_assets_if_needed"`
e nenhuma referência individual. As telas usam só componentes HTML/CSS,
escudos oficiais e ícones SVG inline. Assets cinematográficos opcionais:
CEN-04 (partidas, Cap. 4 T01/T02/T06), CEN-05 (estádio, Cap. 6 T07) e
CEN-01 (fim de carreira, Cap. 6 T08). Sem eles, fundo sólido do DS — as
telas não dependem de imagem para funcionar.

## 4. Como plugar um asset quando chegar

1. Salvar em `public/img/scene/<nome>.webp` (ou `public/img/brand/` para marca).
2. CSS (`public/css/brdata-redesign.css`): preencher a variável do slot,
   ex. `.bd-scene--tunnel{ --bd-scene-photo:url("../img/scene/tunel.webp"); }`,
   e adicionar `has-photo` ao elemento da cena em `carreira.html`.
3. Personagem: `<img class="bd-figure" src="img/scene/treinador.webp" alt="" aria-hidden="true">`
   dentro da cena, ancorado pela base.
4. Atualizar esta tabela (status → entregue) e refazer as capturas.
