# Carreira 2.0 — Fatia 1: fundação + Dashboard (Gate A)

> Pacote "BRDATA Carreira 2.0" (Drive, 27/10/2026). Branch
> `claude/carreira-v2-fatia1` sobre `carreira-v2` (PR #52). Backend, APIs,
> saves e `public/carreira.html` intactos.

## Entregue

- **Projeto isolado** `frontend-v2/` — React 19 + TypeScript + Vite 8;
  camadas `adapters/` (rede, sessão, carreira — só leitura) → `domain/`
  (contratos + derivações puras) → `screens/`/`ui/`. Build versionado em
  `public/carreira-v2.html` + `public/carreira-v2/` (`npm run build`), sem
  mudar o deploy.
- **Design system** (doc 02): tokens `--bg/--surface/--accent…`, Inter na UI e
  Space Grotesk só em números, toque ≥ 44px, safe areas, `prefers-reduced-motion`.
  Fundo: SVGs de produção `bg-atmosfera-*` (pacote Assets_Producao_v1).
- **Fluxo**: sessão → login (erro real do servidor, sem envio duplo) → sem
  carreira (estado vazio com caminho pro jogo atual) / erro com "Tentar
  novamente" → **Dashboard**. Bottom nav: Início, Clube, Jogos, Competições,
  Mais (destinos ainda não migrados mostram estado honesto + link pro modo atual).
- **Dashboard** com dados reais do save: clube e escudo oficial, saudação
  pela hora + primeiro nome, próximo jogo (escudos, data do calendário,
  rodada, mando, estádio, CTA), faixa de indicadores (posição/pts,
  jogos V-E-D, gols pró/contra e média), confiança da diretoria (anel),
  desempenho recente (últimos 5), objetivos (meta da diretoria + semanais),
  destaques do elenco, notícias e atalhos.

## Testes

- `cd frontend-v2 && npm test` — 16 testes unitários (fixture real).
  Pegaram 2 erros meus: `matchLog` vem do mais novo pro mais antigo; atacante
  no save é `F`.
- `tests/e2e/test_v2_dashboard.js` — 12 verificações: login (erro e sucesso),
  estado sem carreira, **equivalência com o jogo atual no mesmo save**
  (posição, pontos, V-E-D, gols, adversário, confiança), v2 não grava o save,
  sem scroll horizontal e último bloco acima da nav em 360/390/430/1280, sem
  erro de JS.

## Gate A — pendente de aprovação

Capturas (scratchpad da sessão): `gateA_390_ref_vs_v2.png` (referência ×
v2, primeira dobra), `dash_360/390/430/1280_full.png`.

Rodada 2 (27/10, após "está muito diferente da proposta"), com decisões do
Murilo: **seguir a imagem literalmente** (abas no topo, frase abaixo da
saudação, card do próximo jogo sobreposto ao hero, 3 painéis) e **usar
recortes da prancha de produção** como fotos provisórias.

- Hero: estádio + treinador de costas e a notícia com torcida — recortes
  de `a_cinematic…`/`a_wide…` (≈ 300×390 px, em PNG porque o servidor não
  serve `.webp`). **Provisórios**: baixa resolução; trocar quando CEN-02 /
  PERS-01 chegarem.
- Diferenças que ficam: no celular (≤ 480px) a referência é mais densa do
  que cabe legível — saudação no alto do hero e card embaixo (sem se
  sobreporem), confiança + desempenho lado a lado e objetivos na largura
  toda, destaques e notícia em linhas separadas. ≥ 700px segue a imagem
  (card ao lado da saudação, 3 painéis em linha).
- Sem fotos de jogador (o jogo não tem) → iniciais + OVR; sem busca no topo
  (não existe função de busca — botão sem ação é proibido).
- "Ver detalhes" abre o Modo Carreira atual (partida ainda não migrada).

## Próximo (após aprovação do Gate A)

Fase 2 restante: seleção de save/competição/clube, Elenco, Tática e
pré-jogo — exige começar a extrair o motor pra módulo compartilhado
(gravação controlada do save).
