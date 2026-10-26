# Redesign — Fundação e bottom sheets (1ª entrega)

> Pacote "BRDATA_Implementacao_Visual_Claude" (26/10/2026). Escopo combinado
> com o Murilo: **fundação + regra global de bottom sheets**. As telas
> (composição, cores finais) esperam a imagem de referência, que não veio
> no zip.

## 1. Auditoria dos overlays (`public/carreira.html`)

60 overlays fixos + o diálogo dinâmico (`m3OpenOverlay` em
`public/js/carreira.js`). Padrão base `.ct-modal-overlay` **já era bottom
sheet** (ancorado embaixo, animação de baixo pra cima, `prefers-reduced-motion`,
safe area no rodapé).

**Bottom sheets (22):** `dailyLoginOverlay` (Recompensa diária), `achievementDetailOverlay` (—), `pickerOverlay` (Escolher jogador), `renewOverlay` (Renovar contrato), `talkOverlay` (Conversa individual), `pressOverlay` (Coletiva de imprensa), `listOverlay` (Colocar à venda), `loanOverlay` (Empréstimo), `sponsorProposalsOverlay` (Propostas de patrocínio), `purchaseConfirmOverlay` (Confirmar compra), `liveSubOverlay` (Substituição), `liveTacticsOverlay` (Ajustar tática), `matchReplayOverlay` (Rever lances), `newSchemeSheet` (Novo esquema), `scoutMissionSheet` (Nova missão), `scoutProspectSheet` (—), `notificationsSheetOverlay` (Notificações), `clubProposalOverlay` (Proposta de outro clube), `playerOfferOverlay` (Proposta por um jogador), `seasonOverlay` (Nova temporada!), `dismissalOverlay` (Fim de carreira), `confirmOverlay` (Confirmar).

**Tela cheia (38)** — páginas completas por natureza (listas,
históricos, partida ao vivo, fluxos de entrada): exceção prevista no pacote.
`onboardingOverlay` (Recompensa diária), `startupWizardOverlay` (—), `detailOverlay` (—), `myOffersOverlay` (Minhas propostas), `contratosOverlay` (Contratos), `offerCompareOverlay` (Comparar propostas), `mySalesOverlay` (Minhas vendas), `scoutSuggestionsOverlay` (Indicações dos olheiros), `calendarOverlay` (Calendário), `transferHistoryOverlay` (Histórico de negociações), `fatigueHistoryOverlay` (Histórico de fadiga), `stadiumOverlay` (Estádio), `boardGoalsOverlay` (Metas da diretoria), `extratoOverlay` (Extrato financeiro), `liveMatchOverlay` (—), `preMatchOverlay` (Confirmar escalação), `adjustLineupOverlay` (Ajustar escalação), `matchDetailOverlay` (Seu jogo), `roundResultsOverlay` (Resultados da rodada), `rodadaOverlay` (Resumo da rodada), `schemesOverlay` (Meus esquemas), `markingOverlay` (Marcação individual), `sectorOverlay` (Instruções por setor), `commissionOverlay` (Comissão Técnica), `scoutingOverlay` (Base e Olheiros), `scoutMarketOverlay` (Contratar olheiro), `baseCategoriesOverlay` (Categorias de base), `tabelaModalOverlay` (Tabela da carreira), `awardsOverlay` (Premiações), `newsOverlay` (Notícias), `settingsOverlay` (Configurações), `editProfileOverlay` (Editar perfil), `purchaseHistoryOverlay` (Histórico de compras), `helpCenterOverlay` (Central de ajuda), `clubRosterOverlay` (—), `coachProfileOverlay` (Perfil do Técnico), `h2hOverlay` (Histórico de confrontos), `compareOverlay` (Comparar jogadores).

## 2. O que mudou

| Item | Antes | Depois | Arquivo |
|---|---|---|---|
| Diálogo dinâmico `.m3-dialog-overlay` (Fazer proposta, jogador de outro clube, etc. — `openM3Dialog`) | Centralizado (420px) | Bottom sheet: ancorado embaixo, cantos superiores, grabber, safe area | `public/carreira.html` (CSS) |
| `pickerOverlay` (Escolher jogador / Trocar reserva / Treino individual) | Tela cheia | Bottom sheet (seleção = F01 da matriz) | `public/carreira.html` |
| Sheets em tela larga (≥ 720px) | Esticavam a largura toda | Máx. 640px, ainda ancoradas embaixo (limite M3) | `public/carreira.html` (CSS) |

Sem mudança de JS, regra de negócio, persistência, ativos ou IDs.

## 3. Testes

- Suíte completa (`node run_parallel.js --isolated-server`): 150/153. As 3
  falhas: `test_escalacao_ui2` 6 (exigia o seletor em tela cheia — regra
  antiga, atualizada pra exigir bottom sheet ancorada embaixo; passa) e 2
  intermitentes de carga já conhecidos (`test_serie_b_escudos`,
  `test_noticias_fullscreen_fluxo` — passam sozinhos).
- Capturas mobile (390×844) e desktop (1280×800) do diálogo de proposta e do
  seletor: no scratchpad da sessão (`redesign/*.png`).

## 4. Pendências

- Imagem de referência (para composição/cores das telas — etapa 2 do plano).
- Matriz A–G completa, por tela — próximas entregas, por bloco.
