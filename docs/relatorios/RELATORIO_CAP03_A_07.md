# Relatório — Capítulos 3 a 7 (continuidade)

Os pacotes 3–7 são "especificações de continuidade" sem referência visual
individual. Todas as jornadas já existiam no jogo; o trabalho foi auditar
cada uma contra a especificação, preencher as lacunas funcionais e alinhar
ao cabeçalho/navegação novos. Evidências: `docs/redesign-evidencias/cap03..cap07-*.jpg`
(capturas reais 390×844; 360×780 e 1280×800 na pasta de capturas).

**Status: técnico concluído; aceite visual pendente.** Nenhum asset
cinematográfico novo (opcionais CEN-04/CEN-05 em `REDESIGN_ASSETS.md`).

## Inventário por tela

| Cap/Tela | Jornada | Implementação (handler) | Lacuna encontrada → feito | Testes |
|---|---|---|---|---|
| 3·01 | Formação e escalação | aba Tática (`renderEscalacao`, chips de formação, campo, banco) | — (agora via aba de contexto "Tática") | `test_escalacao_*`, `test_s4_b2_003_tatica` |
| 3·02 | Escolha/troca | `openPicker` (bottom sheet), `openComparePicker` | — | `test_escalacao_ui2`, `test_comparar_jogadores` |
| 3·03 | Instruções táticas | eixos (`renderTacticAxisRows`) + `openSectorScreen` | — | `test_instrucoes_setor`, `test_bloco2_tatica` |
| 3·04 | Esquemas salvos | `openSchemesScreen` | **renomear** (validação de vazio/30 chars/duplicado) e **"usado na rodada X"** | `test_meus_esquemas`, `test_redesign_caps_1_7` (10) |
| 3·05 | Treinamento | painel Treinos (`applyWeeklyTraining`) | — | `test_treinos`, `test_training_evolution` |
| 3·06 | Evolução e condição | `openFatigueHistoryScreen`, `seasonEvolutionLineHTML`, aba Evolução do perfil | aba "Evolução" no perfil do jogador | `test_evolucao_atributos`, `test_injuries` |
| 4·01 | Pré-jogo | `openPreMatchConfirm` | — | `test_ao_vivo`, `test_ajustar_escalacao_modal` |
| 4·02 | Partida ao vivo | `#liveMatchOverlay` | — | `test_ao_vivo`, `test_play_by_play_*` |
| 4·03 | Intervalo e pausa | pausa no intervalo (`LIVE_MATCH.halftime`) + `openLiveTacticsModal` | — | `test_intervalo_noticias_proposta_destino` |
| 4·04 | Substituições | `openLiveSubModal` (limite real) | — | `test_ao_vivo` |
| 4·05 | Eventos e estatísticas | `showMatchDetailModal`, `openMatchReplay` | — | `test_estatisticas_completas` |
| 4·06 | Resultado final | `#matchDetailOverlay` | — | `test_modais_pos_jogo` |
| 4·07 | Tabela e rodada | painel Competições (`renderTabelaPanel`), `openRodadaScreen`, `openTabelaModal` | agora na nav inferior "Competições" | `test_tabela_modal`, `test_resumo_rodada` |
| 4·08 | Encerramento de temporada | `showSeasonModal`, `advanceSeason` | — | `test_season`, `test_multi_divisao` |
| 5·01 | Mercado | painel Mercado (busca, filtros, paginação) | rótulo acessível na busca | `test_mercado*`, `test_ux_mercado_001` |
| 5·02 | Perfil de alvo | `openPlayerCard`, `openCompareWithExternal` | — | `test_ux_nomes_clicaveis` |
| 5·03 | Fazer proposta | `openOfferModal` | — | `test_mercado_negociacao` |
| 5·04 | Negociação | contraproposta (S4-B3-003) | — | `test_s4_b3_003_negociacao` |
| 5·05 | Propostas recebidas | `openPlayerOfferModal`, `openOfferCompareScreen`, `openMySalesScreen` | — | `test_transfer_ai_offers` |
| 5·06 | Contratos | `openContratosScreen`, `openRenewModal` | — | `test_contract_renewal*`, `test_s4_b3_004_contratos` |
| 5·07 | Histórico de transferências | `openTransferHistoryScreen` | — | `test_historico_negociacoes` |
| 5·08 | Olheiros e missões | `openScoutingScreen`, `openScoutMarketScreen`, `openMissionSheet` | — | `test_scout` |
| 5·09 | Relatórios e prospectos | `openProspectSheet`, `openScoutSuggestionsScreen` | — | `test_indicacoes_olheiros` |
| 5·10 | Categorias de base | `openBaseCategoriesScreen`, promover no perfil | — | `test_scout`, `test_bloco1_reorg` |
| 6·01 | Perfil do treinador | `openCoachProfileScreen`, `openEditProfileScreen` | **foto e nacionalidade** (exibir/editar) | `test_bloco789_perfil_config`, captura |
| 6·02 | Objetivos e confiança | Diretoria (ver Cap. 2 T05) | confiança explicada | `test_board_goals`, `test_redesign_caps_1_7` (7) |
| 6·03 | Conversas | `openTalkModal`, `openPressConferenceModal` | — | `test_moral_relacionamento`, `test_coletiva_*` |
| 6·04 | Ofertas de outros clubes | `openClubProposalModal` → escolha do clube → **Primeira entrada** | primeira entrada ao assumir | `test_reputacao_propostas` |
| 6·05 | Histórico e conquistas | `openAwardsScreen`, painel Conquistas | — | `test_premiacoes`, `test_historico` |
| 6·06 | Notícias e notificações | `openNewsScreen`, `openNotificationsSheet` | sino no topo com contagem real | `test_noticias_*`, `test_s4_b4_005_noticias_newscard` |
| 6·07 | Estádio | `openStadiumScreen` (obras reais) | — | `test_tickets`, captura |
| 6·08 | Fim de carreira | `showDismissalModal` (demissão → novo clube) | — | `test_board_deny`, `test_rebaixamento` |
| 7·01 | Menu e configurações | menu "Mais" (`#topbarMenu`), `openSettingsScreen` | item "Meus saves" | `test_menu`, `test_bloco789_perfil_config` |
| 7·02 | Gerenciamento de saves | **novo** `openSavesScreen` | até 3 carreiras, continuar/nova/excluir | `test_save_limit_001_careerstore` (7–9), `test_redesign_caps_1_7` (11) |
| 7·03 | Notificações e ajuda | `openNotificationsSheet`, `openHelpCenterScreen` | — | `test_condicao_ajuda` |
| 7·04 | Bottom sheets e confirmações | `openM3BottomSheet`, `confirmModal({danger})` | detalhe de jogo e renomear esquema em sheet | `test_m3_dialog_sheet_skeleton`, `test_confirm_modals` |
| 7·05 | Carregamento, vazio e erro | splash com progresso real, vazios explícitos nas telas novas, retry em saves/competição | — | `test_loading_overlay`, `test_s4_b2_001_loading` |
| 7·06 | Sessão, acessibilidade, responsividade | sessão expirada (`test_401`), foco preso em modais, safe areas | auditoria automática nova | `test_401`, `test_a11y_modais`, `test_redesign_a11y_responsivo` |

## Pendências e divergências

- **Zoom bloqueado** por pedido anterior do usuário × diretriz "não bloquear zoom" — decisão pendente (relatório central §2.1).
- Cenas opcionais CEN-04 (partida) e CEN-05 (estádio) não existem; telas usam fundo sólido do DS.
- As telas existentes dos capítulos 3–7 mantêm a composição do redesign anterior (aprovado em 26/10); não houve recomposição visual profunda sem referência individual — o GPT pode apontar quais merecem.

## Prompt para GPT

"Revise os Capítulos 3–7 do redesign BRDATA usando a tabela de inventário
acima e as capturas `docs/redesign-evidencias/cap03..cap07-*.jpg`. Para cada
tela, diga se a jornada atende a especificação de continuidade, se há
lacuna funcional não listada e quais telas pedem recomposição visual (com
referência a criar). Confirme as novas funcionalidades: renomear esquema,
perfil do treinador com foto/nacionalidade e gerenciamento de saves."
