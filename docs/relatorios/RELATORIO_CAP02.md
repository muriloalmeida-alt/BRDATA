# Relatório — Capítulo 2: Gestão do clube (Telas 01–07)

Branch `rebranding` (local). Evidências: `docs/redesign-evidencias/cap02-*.jpg`
(T01 com a referência individual aprovada; T02–T07 com a prancha). Capturas
de uma carreira real com 2 rodadas jogadas pela interface
(`tools/capture/capture-game.js`, 390×844, 360×780, 1280×800).

**Status: implementação técnica concluída; aceite visual pendente** (T02–T07
nunca tiveram aceite individual; T01 depende de CEN-02/PERS-01).

## Navegação (matriz do capítulo, com handlers reais)

| Origem | Ação | Destino real | Condição |
|---|---|---|---|
| Qualquer tela do jogo | Abas do topo | `switchToPanel("central"|"elenco"|"escalacao"|"mercado"|"jogos"|"tabela"|"clube")` | sempre |
| Nav inferior | Início/Clube/Jogos/Competições/Mais | `central`/`clube`/`jogos`/`tabela`/menu `#topbarMenu` | sempre |
| Início | Destaque do jogador | `openPlayerCard(id)` | jogador no elenco |
| Início | Confiança / Objetivos | `openBoardGoalsScreen()` | save ativo |
| Início | Próximo jogo → "Ir para o jogo" | `#btnSimulate` → pré-jogo existente | partida disponível |
| Início | Notícia | `openNewsScreen()` | há notícia |
| Elenco | Jogador | `openDetail(id)` (preserva filtro/busca/ordem) | ID válido |
| Clube | Comissão técnica | `openCommissionScreen()` | sempre |
| Finanças | Categoria | `openExtratoScreen()` com `EXTRATO_FILTER` | lançamentos existentes |
| Jogos | Jogo futuro / passado | bottom sheet com H2H e "Ir para o jogo" (se for o próximo) / resumo de eventos reais | — |

## T01 — Visão do clube (Início)

| Elemento | Fonte | Transformação | Vazio honesto |
|---|---|---|---|
| Saudação | `ME.name` (1º nome), relógio local | "Bom dia/Boa tarde/Boa noite" | — |
| Próximo jogo | `CAREER.schedule`, calendário | existente (`renderCentral`) | pré-temporada mostra semana/mercado |
| Faixa de desempenho | `CAREER.standings[clube]` | posição, J (V/E/D), gols pró/contra e média | antes do 1º jogo: aviso, sem zeros |
| Confiança da diretoria | `boardConfidence()` (derivado, ver relatório central) | anel SVG com rótulo textual | — |
| Desempenho recente | `CAREER.recentForm` (últimos 5) | barras + letra V/E/D (texto, não só cor) | "Sem jogos ainda" |
| Objetivos | `CAREER.boardGoal` + `CAREER.objectives.season` | status cumprido/andamento | — |
| Destaques | 4 maiores overalls do elenco principal | iniciais (sem foto) | — |
| Notícia | `CAREER.newsFeed` (prioriza `mine`) | — | "aparecem depois da 1ª rodada" |
| Mini-tabela | `CAREER.standings` | top 4 + o seu clube | — |
| Ações rápidas | Ajustar tática / Mercado / Relatório do elenco | `switchToPanel` | — |
| Topo | marca, notificações (`unreadNotificationCount`), avatar do treinador; posição só após jogo real ("Pré-jogo" antes) | — | — |

Divergências: hero sem foto de estádio/treinador; destaques sem fotos;
notícia sem imagem; sem busca global (não existe no jogo). Desktop ≥1000 px:
saudação e próximo jogo lado a lado.

## T02 — Elenco

Indicadores reais (jogadores, aptos, lesionados, suspensos); filtros Todos /
Goleiros / Defensores / Meio-campistas / Atacantes / Titulares / Lesionados /
Base (posições = os 4 grupos que os dados informam); busca sem acento;
ordenação por posição, nota, idade, condição. Ações contextuais seguem no
perfil (contrato, conversa, venda, empréstimo, comparar — fluxos
existentes). Testes: `test_redesign_caps_1_7` (9), `test_bloco1_reorg`.

## T03 — Perfil do jogador

Herói (avatar com iniciais, nome, posição/idade/origem, nota), faixa de
atributos do motor (Ataque/Defesa/Físico/Moral), abas Visão geral /
Atributos / Evolução / Contrato (aba volta para "Visão geral" ao trocar de
atleta). Ações sempre visíveis abaixo das abas. Testes:
`test_s4_b2_005_perfil`, `test_s4_b3_001_transfer_contract_card` e demais
fluxos de venda/empréstimo/renovação. Divergência: sem foto e sem
nacionalidade do atleta (dado inexistente).

## T04 — Comissão técnica

Tela existente (`openCommissionScreen`: contratar/demitir com confirmação
destrutiva, custo mensal) + atalho no Clube com status real. Testes:
`test_comissao_tecnica`, `test_confirm_modals`.

## T05 — Diretoria

"Diretoria" com: meta da temporada (barra de progresso), confiança com
composição exposta, pressão real (temporadas sem meta / limite de
demissão), objetivos extras da temporada, avaliações das temporadas
anteriores. Pedido de orçamento continua no Clube (`askBoard`, com
cooldown real). Testes: `test_board*`, `test_redesign_caps_1_7` (7).
Divergência: não há "reuniões" no jogo — aba não criada.

## T06 — Finanças

Caixa, mini-gráfico e folha × teto (existentes) + "Receitas e despesas" por
categoria do extrato real (`CAREER.financeLedger`, período explícito = os
lançamentos guardados), toque abre extrato filtrado (filtros passam a
incluir toda categoria presente). Divergência: sem série de 6 meses (o
extrato guarda os últimos 60 lançamentos). Testes: `test_patrocinio`,
`test_s4_b3_005_matchcard_financialsummary`, captura.

## T07 — Calendário (painel Jogos)

Jogos do clube por mês (rodada no domingo, Copa do Brasil na quarta),
escudos oficiais, mando, competição, estádio, resultado com V/E/D em texto;
filtros Todas/Brasileirão/Copa; Resultados; "Semana a semana" abre o
calendário completo existente. Teste: `test_redesign_caps_1_7` (8).

## Prompt para GPT

"Revise o Capítulo 2 do redesign BRDATA. Compare `docs/redesign-evidencias/cap02-*.jpg`
com a referência aprovada da Tela 01 e a prancha do capítulo. Verifique a
matriz de navegação acima contra o app, a honestidade dos dados (nada
inventado; vazios explícitos), a fórmula da confiança da diretoria
(relatório central §2.4), a nova navegação (Início/Clube/Jogos/Competições/
Mais + abas de contexto) e a responsividade em 360/390/1280. Liste
bloqueadores e ajustes; o aceite visual depende dos assets CEN-02/PERS-01."
