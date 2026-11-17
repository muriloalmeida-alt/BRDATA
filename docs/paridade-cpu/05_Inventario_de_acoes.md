# Inventário de ações da Carreira 2.0 · paridade CPU

**Fechado no E0 em 17/11/2026, sobre a base `d6ab99b`** (a `main` `e7e964a` mais o PR #137).

O pacote pedia, para cada ação do jogador, a rota ou tela, o comando de domínio, a validação, o estado afetado e o teste. O levantamento foi feito no código da v2 (`carreira-v2/src/App.tsx`, 70 rotas), nos 100 comandos da ponte (`window.BRDATA_PONTE`, montada em `public/js/motor/`) e nas regras do motor.

Os achados citados (A1 a A14) estão confirmados no motor de hoje por `node tests/sim/paridade_achados.js` (relatório em `RELATORIO_E0.md`).

**Legenda da última coluna:**
- **Paridade:** a CPU precisa ganhar o equivalente, no requisito indicado.
- **Já igual:** os dois lados já usam a mesma regra.
- **Interface:** é forma de o jogador operar o jogo, e a CPU decide direto no motor, sem tela.
- **Decisão:** precisa de decisão de produto antes da etapa (D1 a D12, no relatório).

## Partida e escalação

| Ação do jogador | Rota da v2 | Comando (ponte) | Regra e validação no motor | Estado afetado | Testes de hoje | CPU hoje | Requisito · etapa | Situação |
|---|---|---|---|---|---|---|---|---|
| Escalar à mão (titulares) | `/escalacao`, `/escalacao/trocar` | `executar` (troca), `escalarAutomaticamente` | `escalacao.validarEscalacao` (11+11, goleiro no banco), `virada.autoLineup` | `CAREER.lineup.starters` | `test_v2_escalacao`, `test_v2_esc`, `unit/test_motor_escalacao` | `fechamento.pickCpuXI`: 1-4-4-2 fixo por overall, ignora condição (A2) | CPU-01 · E1a | Paridade |
| Montar o banco (11 reservas, goleiro no banco) | `/escalacao` | `escalarAutomaticamente(true)` | `validarEscalacao` | `CAREER.lineup.bench` | `test_v2_esc`, `test_escalacao_avancada` | Sem banco nem goleiro reserva (A2). Série D com elenco gerado de 12 (A8) | CPU-01 · E1a | Paridade. Elenco curto: **D7** |
| Formação e eixos (ritmo, pressão, linha, passe) | `/tatica` | `aplicarTatica`, `salvarTatica` | força humana (`fechamento.computeHumanStrength`) | `CAREER.lineup.formation/tactics` | `test_v2_tatica_treino`, `test_v2_ajustes` | Força só do clube (A1) | CPU-02/03 · E1a/E1b | Paridade |
| Instruções por setor | `/tatica/setor` | `salvarInstrucoesSetor` | força humana (setores) | `CAREER.lineup.sectorTactics` | `test_instrucoes_setor` | Nenhuma (A1) | CPU-03 · E1b | Paridade |
| Esquemas salvos | `/tatica/esquemas` | `salvarEsquema`, `aplicarEsquema`, `renomearEsquema`, `excluirEsquema` | `CAREER.tacticalSchemes` | esquemas | `test_meus_esquemas` | — | — | Interface (atalho para a mesma tática) |
| Marcação individual | `/tatica/marcacao` | `marcacao`, `salvarMarcacao` | `CAREER.manMarking` (só a rodada) | marcação | `test_marcacao_individual` | Nenhuma | CPU-04 · E1b | Paridade quando disponível. Escopo: **D8** |
| Substituir ao vivo (cota, expulso não volta) | `/partida?tela=sai/entra` | `substituir` | `aovivo.applyLiveSub` (cota, expulso recusado) | escalação e `lm.subsUsed` | `test_v2_ajustes`, `test_ao_vivo`, `test_v2_expulsao` | XI fixo, só sai o expulso (A3) | CPU-04 · E1b | Paridade |
| Mudar tática ao vivo | `/partida?tela=tatica` | `aplicarTatica` | `aovivo.applyLiveTactics` (custo de troca) | tática da partida | `test_v2_ajustes` | Nenhuma (A3) | CPU-04 · E1b | Paridade |
| Conselho da comissão no intervalo | `/partida?tela=pausa` | `aplicarSugestao`, `continuarIntervalo` | `conselho.js` | tática e escalação | `test_v2_conselho_intervalo` | — | CPU-03/04 · E1b | A CPU decide no intervalo pelo próprio controlador. Equivalente: janela de decisão |
| Pausar, velocidade, pular para o fim | `/partida` | `pausar`, `retomar`, `velocidade`, `pularParaFim` | `jogo.js` | relógio da partida | `test_v2_pausa`, `test_v2_partida` | — | — | Interface |
| Jogo com 1 a menos | `/partida` | — | `partida.comExpulsoes`, `golsComExpulsoes` | `lm.expulsos`, `lm.expulsosCpu` | `unit/test_motor_expulsao`, `test_v2_expulsao` | Igual (#134), inclusive em CPU × CPU | CPU-04 | Já igual |
| Nível de gols por competição | — | — | `estado.forcaDeJogo` | `CAREER.nivelGols` | `unit/test_motor_gols_reais` | Igual (#133) | CPU-02 | Já igual |

## Semana, condição e calendário

| Ação do jogador | Rota da v2 | Comando (ponte) | Regra no motor | Estado afetado | Testes de hoje | CPU hoje | Requisito · etapa | Situação |
|---|---|---|---|---|---|---|---|---|
| Avançar a semana | `/semana` | `avancarSemana` | `semana.js` (treino, mercado CPU, disponibilidade) | rodada e calendário | `test_v2_semana`, `unit/test_motor_semana` | Mercado CPU × CPU sorteado (A9) | CPU-05/07 | Paridade (A9 no E3) |
| Treino semanal (foco, intensidade, grupos, dia) | `/treino` | `aplicarTreino`, `aplicarModeloTreino`, `salvarDiaTreino`, `treino` | `treino.js` | `CAREER.trainingPlan` e atributos | `test_v2_tatica_treino`, `test_treinos`, `test_training_evolution` | Evolução só na virada (`temporada.applyCpuAnnualEvolution`) | CPU-09 · E4 | Paridade |
| Recuperar condição e descansar | `/treino/condicao` | — | `fechamento.applyConditionRecovery` (só o seu elenco) | `p.condition` | `test_v2_tatica_treino` | Não recupera (A4) | CPU-05 · E1a | Paridade |
| Volta de lesão e suspensão | — | — | `semana.refreshAvailability` (só o seu elenco) | `p.status`, `outUntilRound` | `test_injuries`, `unit/test_motor_expulsao` | Só volta na virada (A5) | CPU-05 · E1a | Paridade |
| Amistoso | `/amistoso` | `escolherAmistoso`, `iniciarAmistoso` | `jogo.js` | condição e moral | `test_v2_semana` | Não joga amistoso | — | **Decisão D9** (amistoso da CPU ou não) |
| Calendário e próximas partidas (poupar) | `/calendario`, `/jogos` | — | `calendario.js` | — | `test_v2_calendario` | Não prioriza competições | CPU-05 · E4 | Paridade (decisão por calendário) |
| Copa: jogar a perna | `/copa`, pós-jogo | `iniciarPernaCopa` | `fechamento.simulateCupLeg` | chave da Copa | `test_cup`, `test_ge_copa_001`, `test_v2_posjogo` | Em CPU × CPU, ninguém leva cartão nem cansa (A7) | CPU-05 · E2 | Paridade |
| Outras divisões | `/tabela` | — | `rodada.playSimpleRound` | tabelas | `test_multi_divisao` | Só o placar (A6) | CPU-05 · E2 | Paridade |

## Elenco, moral e contratos

| Ação do jogador | Rota da v2 | Comando (ponte) | Regra no motor | Estado afetado | Testes de hoje | CPU hoje | Requisito · etapa | Situação |
|---|---|---|---|---|---|---|---|---|
| Conversar com o jogador | `/elenco/conversa` | `conversar` | moral (`clube.js`) | `p.morale` | `test_moral_relacionamento`, `test_morale` | Moral parada em 70 (A11) | CPU-09 · E4 | Paridade |
| Coletiva de imprensa | pós-jogo, `/coletiva` | `responderColetiva` | moral do elenco | `CAREER.pressLog`, moral | `test_coletiva_imprensa` | — | — | Interface (efeito na moral entra pelo CPU-09) |
| Renovar contrato | `/contratos` | `renovar` | `clube.js` (renovação) | `p.contractUntil`, `p.wage` | `test_contract_renewal`, `test_s4_b3_004_contratos` | Não renova: sai quem vence. Os repostos nascem com contrato já vencido (A14) | CPU-08 · E3 | Paridade. **A14: D10** |
| Dispensar | `/elenco/jogador` | `descartar` | `clube.js` | elenco e caixa | `test_v2_elenco_avancado` | Não dispensa | CPU-08 · E3 | Paridade |
| Base: trazer, promover, desenvolver | `/base`, `/olheiros/prospecto` | `trazerParaBase` | `virada` (base do seu elenco) | `origin: "base"` | `test_v2_elenco_avancado`, `test_scout` | Sem base: a reposição é de profissionais gerados (`temporada.renewLeagueSquad`) | CPU-09 · E4 | Paridade |
| Olheiros (contratar, missão, indicações) | `/olheiros/*` | `contratarOlheiro`, `dispensarOlheiro`, `enviarMissao`, `indicacao`, `olheiros` | `clube.js` | `CAREER.scouts` | `test_scout`, `test_indicacoes_olheiros` | A CPU vê o mercado inteiro | — | **Decisão D11** (informação perfeita da CPU) |
| Comissão técnica | `/comissao` | `contratarComissao`, `demitirComissao`, `comissaoAplicar`, `comissaoDesfazer`, `comissaoSugestoes` | `clube.js`, `conselho.js` | `CAREER.technicalStaff` | `test_v2_comissao`, `test_comissao_tecnica` | Sem comissão | — | **Decisão D12** (comissão da CPU entra no perfil do técnico, D1?) |

## Mercado

| Ação do jogador | Rota da v2 | Comando (ponte) | Regra no motor | Estado afetado | Testes de hoje | CPU hoje | Requisito · etapa | Situação |
|---|---|---|---|---|---|---|---|---|
| Comprar (proposta, aumentar, contraproposta, retirar) | `/mercado`, `/mercado/proposta` | `fazerProposta`, `aumentarProposta`, `aceitarContraproposta`, `retirarProposta`, `previaCompra` | `mercado.reservaParaProposta`, `avaliacaoAtleta`, `negociacao.js` | `pendingOffersOut`, elencos e caixa | `test_v2_mer`, `test_v2_mercado`, `unit/test_motor_mer`, `unit/test_motor_mer_integracao` | CPU × CPU: fluxo próprio sorteado (A9) | CPU-07 · E3 | Paridade |
| Vender e anunciar | `/elenco/jogador`, `/mercado` | `anunciar`, `retirarAnuncio`, `aceitarOfertaVenda`, `recusarOfertaVenda`, `previaVenda` | `semana.js` (ofertas da CPU), `mercado.js` | `pendingListings`, `pendingReceivables` | `test_colocar_a_venda`, `test_v2_venda_disponivel` | A CPU põe à venda (`motivosAVenda`), mas só vale com você | CPU-07 · E3 | Paridade |
| Empréstimo (pegar, emprestar, cláusulas) | `/mercado/proposta`, `/elenco/jogador` | `pegarEmprestado`, `emprestar`, `prepararEmprestimo` | `negociacao.avaliarPedidoDeEmprestimo`, `fechamento.shouldExerciseBuyOption` | `onLoanFromClubId`, `loanBuyOption` | `test_loans`, `test_loan_advanced`, `test_v2_emprestimo_disponivel` | Não há empréstimo CPU × CPU. A opção facultativa da CPU é 55% fixos | CPU-07/08 · E3 | Paridade |
| Pedir orçamento à diretoria | `/diretoria/orcamento` | `pedirOrcamento`, `orcamento` | `financas.js` | `CAREER.finances` | `test_v2_diretoria`, `test_board`, `test_wagecap_block` | Orçamento derivado da folha na hora (A10) | CPU-07/08 · E3 | **Decisão D2** (finanças da CPU) |

## Clube e economia

| Ação do jogador | Rota da v2 | Comando (ponte) | Regra no motor | Estado afetado | Testes de hoje | CPU hoje | Requisito · etapa | Situação |
|---|---|---|---|---|---|---|---|---|
| Estádio (obras) | `/estadio`, `/estadio/obra` | `iniciarObra`, `estadio` | `clube.js` | `CAREER.stadium` | `test_v2_clube` | — | — | **Decisão D2** (entra nas contas da CPU?) |
| Patrocínio | `/patrocinios` | `assinarPatrocinio`, `patrocinios` | `financas.js` | `CAREER.sponsorship` | `test_patrocinio` | — | — | **Decisão D2** |
| Loja: itens com efeito esportivo (Reset de Moral, Desconto de Contratação) | `/loja` | `comprarItem`, `loja` | `clube.js` | moral e mercado | `test_loja`, `test_loja_pagamento_real` | — | — | **Decisão D4** |

## Temporada e carreira do técnico

| Ação do jogador | Rota da v2 | Comando (ponte) | Regra no motor | Estado afetado | Testes de hoje | CPU hoje | Requisito · etapa | Situação |
|---|---|---|---|---|---|---|---|---|
| Virar a temporada | `/temporada`, `/temporada/nova` | `proximaTemporada` | `virada.js`, `temporada.renewLeagueSquad` / `renewHumanSquad` | tudo | `test_v2_temporada`, `unit/test_motor_temporada`, `unit/test_motor_virada` | Elencos encolhem e enfraquecem a cada virada (A14) | CPU-09 · E4 | Paridade. **A14: D10** |
| Trocar de clube | `/proposta-clube` | `aceitarPropostaClube`, `recusarPropostaClube` | `carga.aceitarPropostaClube` → `startCareer` | carreira inteira | `test_v2_temporada`, `test_reputacao_propostas` | Monta uma carreira nova e o mundo recomeça (A12) | CPU-10 · E4 | Paridade |
| Demissão | `/demissao` | `demitir` | `carga.demitir` | carreira | `test_v2_temporada` | — | CPU-10 · E4 | O clube volta à CPU: entra no CPU-10 |

## Fora da paridade (interface ou conta)

Estas ações ficam fora da paridade e não precisam de equivalente da CPU:

- **Conta e sessão:** `conta`, `criarCarreira`, `escolherCompeticao`, `competicoes`.
- **Recompensa diária e ranking:** `recompensa`, `receberRecompensa`, `pontuacaoRanking`.
- **Preferências, som e notificações:** `preferencias`, `somAtivo`, `alternarNotificacao`, `marcarAvisosLidos`.
- **Tutorial e assistente:** `assistenteVisto`.
- **Save:** `salvarNome`, `salvarDeNovo`, `versaoSave`.
- **Telas de consulta:** histórico, conquistas, estatísticas e notícias.
