# Relatório — motor de testes BRDATA, Fase B

> Continuação da Fase A (`docs/MOTOR_TESTES_FASE_A.md`, PR #42). Autorizada
> pelo Murilo em 26/10/2026 ("pode seguir pra fase B dos testes"). Escopo
> proposto na Fase A: esperas por estado no lugar de esperas fixas,
> correção das falhas pré-existentes e isolamento do teste que apagava
> `server/data`. **Nenhum arquivo de produto (`public/`, `server/`) foi
> alterado** — os bugs de produto encontrados estão na §5, para decisão.
>
> Branch `claude/motor-testes-fase-b` (sobre `main` em `c81e97d`). Artefatos
> no scratchpad da sessão (`SP/motor/` =
> `/tmp/claude-0/-home-user-BRDATA/74f76862-85ee-580c-8e7d-fa924edcdf71/scratchpad/motor/`).

## 1. Resumo executivo

- **Achado principal: o código de saída dos testes não refletia as
  verificações.** Em 143 de 152 testes, a verificação era só
  `console.log("N) ...:", condição)` e o processo só saía com código 1 em
  **exceção**. Na medição da Fase A, 16 verificações `false` em 13 testes
  "aprovados" passavam batido; com o veredito honesto apareceram mais
  (2º veredito de uma linha, valor `undefined`, verificação que só
  imprimia valor). O "130/150 aprovados" da Fase A media "não
  quebrou", não "verificou".
- **Agora:** toda verificação numerada passa por `check()` (`_check.js`),
  que reprova `false`/`undefined`/`null`. Resultado final:
  149/153 aprovados nas 3 execuções completas finais (contra 131–132 "aprovados" antes, com verificações falsas escondidas) — as falhas restantes são **4 testes com bug/decisão de
  produto real** (§5), mantidos falhando de propósito.
- **Tempo:** 298,6 s em média (315,0 / 288,6 / 292,1 s; σ 14,4 s) contra 300,0 s antes da Fase B no mesmo código de app — tempo igual — a Fase B não tinha meta de velocidade; o ganho
  das esperas por estado (~110 s de soma serial) foi consumido por testes
  que antes abortavam cedo e agora executam o fluxo inteiro (ex.:
  `test_save` joga as 30 rodadas de verdade).
- **Commit candidato:** `410d3f9` (branch `claude/motor-testes-fase-b`).
- **Recomendação:** aprovar a Fase B como infraestrutura e decidir os 4
  itens de produto da §5 (cada um tem a correção proposta). O redesign
  continua bloqueado pelo AT-11 (CI), como na Fase A.

## 2. O que mudou

### 2.1 Infraestrutura (arquivos novos/alterados em `tests/e2e/`)

| Arquivo | Mudança | Por quê |
|---|---|---|
| `_check.js` (novo) | `check(rótulo, condição, ...detalhes)`: mesma linha de sempre; `false`/`undefined`/`null` → código 1 + lista das falhas no fim. Só rótulo = aviso, não conta. | Veredito honesto (§1). |
| `_startup.js` (novo) | `skipOnboarding`, `skipStartupWizard`, `enterGame` (tutorial → assistente → login diário pelo estado), `waitForBoot` (fim do boot após `reload`). | Substitui janelas fixas (2 s/4 s/3 s) e esperas de 500–3000 ms que falhavam sob carga. |
| `_round.js` (novo) | `playRound`/`playNextMatchRound`: rodada inteira pela interface, guiada pelo estado (tela de cima), ganchos por tela, clique curto que relê o estado, tela desconhecida faz parar. | 15+ testes usavam o fluxo antigo (botão simulava direto) e travavam 30 s por clique. |
| `run_parallel.js` | Perfis de servidor (`serverProfiles`) com `--isolated-server`. | `test_frozen_provider` (`DATA_PROVIDER=frozen`) e `test_loja_pagamento_real` (conta com créditos antes do boot) **nunca tinham rodado** em runner nenhum. |
| `suites.json` | `serverProfiles` (frozen, loja-creditos); `exclusive` vazio. | Idem; o teste exclusivo deixou de compartilhar arquivo. |
| `_grant_test_credits.js` | Aceita `SERVER_DIR`. | Prepara a conta no `data/` do servidor isolado, não no do repositório. |
| `_coverage_preload.js` / `_coverage_report.js` | Cada página instrumentada 1x; coleta perdida vira aviso (`lostCollections`) no resumo. | `browser.newPage()` passa pelo `newContext` envolvido e a mesma página era instrumentada 2x — numa medição a coleta de um teste sumiu e `app.js` caiu de 129 pra 48 funções "cobertas", sem nenhum teste ter mudado. Defeito da Fase A. |
| `README.md` | Helpers, regra do `check()`, determinismo da coletiva, perfis. | Documentação. |

### 2.2 Testes (150 arquivos `test_*.js` tocados)

| Tipo de mudança | Arquivos | Integridade |
|---|---:|---|
| `console.log("N) …")` → `check("N) …")` (conversão mecânica + 4 manuais) | 126 | Mesmas condições; só passam a reprovar. |
| Entrada no jogo por estado (`enterGame`) | 133 | Mesma sequência de telas, sem janela fixa. |
| `reload` + espera fixa → `waitForBoot` | 31 (40 trocas) | Mesma verificação depois. |
| Rodada pelo fluxo atual (`_round.js`) | 11 | Ganchos leem as mesmas telas que o teste lia. |
| Verificação que só imprimia valor → veredito booleano (mesmo critério do rótulo) | ver §3/§4 | **Fortalece**: antes nunca reprovava. |
| Expectativa atualizada para regra aprovada depois do teste | §3.1 (caso a caso) | Ver justificativa caso a caso. |
| Determinismo (coletiva, RNG da negociação, corridas de tempo) | §4 | §4. |
| `test_save_limit_001_careerstore` usa cópia do `careerStore` em diretório temporário | 1 | Antes gravava `{}` no `server/data/careers.json` do repositório a cada execução — **apagou as carreiras do dev nesta sessão** (restaurado do backup). |

**Nenhuma verificação foi removida.** Onde um passo deixou de existir no
produto (ex.: venda direta com confirmação → "Colocar à venda"), a
verificação foi reescrita para o equivalente atual e o motivo está no
comentário do teste.

## 3. Triagem das falhas (21 da Fase A + escondidas)

### 3.1 Testes desatualizados — corrigidos

| Teste | Causa | Regra aprovada que o teste não acompanhou |
|---|---|---|
| test_save, test_events, test_tickets, test_tickets_form, test_fase2b, test_modals, test_morale, test_h2h, test_s4_b3_006_resumo_rodada, test_intervalo_noticias_proposta_destino, test_loan_advanced | `#btnSimulate` + espera fixa esperando o detalhe do jogo direto | Confirmação pré-jogo + partida ao vivo + calendário (GE-CALENDAR-001) |
| test_botao_ir_pro_jogo_e_financas_noticias, test_patrocinio (6) | Linha financeira esperada em toda rodada | Finanças mensais (GE-CALENDAR-001 B1): só na rodada da virada do mês |
| test_comissao_tecnica (6) | 1/4 do custo mensal por rodada | Custo mensal cheio na virada do mês (medido: R$ 155.000) |
| test_evolucao_atributos (1, 5) | Atingir o potencial em uma "temporada" | Teto de ganho por temporada (GE-BALANCE-005) |
| test_onboarding (3) | Tutorial → login diário | Tutorial → assistente de início → login diário |
| test_treinos (5) | Marca de treino = nº da rodada | Marca = semana do calendário (`calendarTurnKey`) |
| test_tabela_modal (4), test_serie_b_escudos (3), test_pin_data_source (4), test_toast_rodape (seletor) | Supunham Flamengo como 1º clube / pré-temporada / `.mt-nextmatch` / `.mt-action-bar` | Ordem da lista, calendário, redesign M3 |
| test_confirm_modals, test_transicoes_suaves, test_ux_fechar_voltar_inicio, test_loja_pagamento_real | `#offerOverlay` estático | Proposta virou Dialog dinâmico (S4-B3-003) |
| test_mercado_negociacao (7) | Faixas sobre o valor de mercado | Faixas sobre a reserva do vendedor (Fase 1.4) |
| test_s4_b3_006_resumo_rodada (4) | Copa jogo único, fase "oitavas" (chave inexistente) | Copa ida/volta (GE-COPA-001), chave `r16` |
| test_ux_fechar_voltar_inicio (1–3) | Operação de mercado volta pro Início | Fica na tela (UX-MERCADO-001) |
| test_contract_renewal, test_reputacao_propostas | Coletiva/assistente/login diário por cima | Coletiva após renovação recusada; fila da carreira nova |
| test_frozen_provider, test_loja_pagamento_real | Pré-condição de servidor que nenhum runner preparava | Perfis de servidor (§2.1) |
| test_sportmonks_placeholder_filter | (corrigido na Fase A) | — |

### 3.2 Verificações escondidas que eram falhas reais

Todas acima em 3.1 exceto as da §5. Destaque: `test_loan_advanced` 2 —
o 2º veredito da linha ("está permanentemente no clube comprador") era
`false` e não contava; a rodada da cláusula **nem chegava a ser jogada**
(fluxo antigo). Com a rodada jogada de verdade, o produto passa.

## 4. Determinismo e intermitentes

| Causa | Testes | Correção |
|---|---|---|
| Coletiva sorteada; chance `0` virava 30% (`PRESS_CHANCE_BY_ID[id] \|\| 0.3`) | test_botoes_rodape, test_noticias_fullscreen_fluxo (intermitentes desde o baseline da Fase A), test_ajustar_escalacao_modal, test_modais_pos_jogo, test_botao_ir… | Chance `1e-12` quando a coletiva não é o objeto do teste |
| Coletiva esperada mas sorteada | test_coletiva_imprensa (7), test_toast_reposiciona | Chance 1 + resultado com gatilho garantido |
| Sorteio interno da negociação no recálculo | test_transfer_ai_valuation (10, 10c) | RNG fixo só dentro de `negotiateOffer` |
| Espera fixa curta sob carga | test_loja, test_loan_advanced (onboarding 2 s), test_s4_b2_002_login, test_engajamento, test_ge_balance_004, test_comissao_tecnica, test_play_by_play_v1, test_save_limit_001_careerstore, test_cup | Espera pelo estado (limite 10–20 s) |
| Ordem de fechamento (fechar proposta reabre a Tabela) | test_cup, test_h2h (via helper) | Proposta antes da Tabela; helper fecha Tabela que sobrou |
| Intervalo sem tela entre pré-jogo e ao vivo lido como "rodada encerrada" | test_events (9/10 jogos) via `_round.js` | Semana de jogo só termina depois do detalhe "Seu jogo" |
| Leitura da tela logo após abrir a carreira (400–500 ms fixos) | test_multi_divisao(_longwait), test_carreira_login_form, test_s4_b2_002_login, test_fix_signup_link | Espera pelos cards / fim do boot |

Repetição dirigida: test_botoes_rodape 5/5, test_noticias_fullscreen_fluxo
5/5, test_transfer_ai_valuation 10/10, test_toast_reposiciona 6/6,
test_coletiva_imprensa 3/3. Intermitentes nas execuções completas: §6.

## 5. Bugs / decisões de produto (testes mantidos falhando)

| # | Teste | Achado | Evidência | Proposta (não implementada) |
|---|---|---|---|---|
| P1 | test_toast_rodape (1, 2) | **O toast cobre o botão flutuante principal** ("Salvar escalação", "Ir para o jogo") — 557–617 px vs botão 562–608 px. Também bloqueia o "Ir para o jogo" por ~3,6 s depois de cada semana. | `toastBottomOffset()` (`carreira.js:475`) soma barra de navegação + `.mt-action-bar`, mas não `.m3-fab` | Somar a altura do `.m3-fab` visível em `toastBottomOffset()` |
| P2 | test_colocar_a_venda (4), test_historico_negociacoes | **Anúncio de titular nunca recebe proposta.** A reserva do vendedor aplica +15% de titularidade e até +15% de necessidade sobre o preço que o próprio técnico pediu; o comprador desiste em 19/19 clubes a qualquer preço (100% a 50% do valor). 8 de 24 jogadores do elenco sem nenhum comprador. | `calculateSellerReservationValue` + `negotiateOffer` (sondagem na sessão) | No anúncio, a reserva = preço pedido (sem fatores de resistência) — decisão de economia |
| P3 | test_condicao_ajuda (6) | `#helpInstrucoesTaticas` não existe mais (os outros 3 pontos de ajuda sim) | DOM | Restaurar o "?" das instruções táticas ou aceitar a remoção (atualizo o teste) |
| P4 | — (latente) | `PRESS_CHANCE_BY_ID[id] \|\| 0.3`: chance 0 vira 30% | `carreira.js:8317` | Trocar `\|\|` por `??` (sem efeito na config atual) |
| O1 | — (observação) | "Aceitar proposta recebida" ainda volta pro Início, ao contrário de comprar/anunciar/emprestar (UX-MERCADO-001) | test_ux_fechar_voltar_inicio (7) | Confirmar se é intencional |

### 5.1 Correções (26/10/2026, pedido do Murilo: "Corrija P1, P2 e P3 no jogo")

Branch `claude/correcoes-p1-p3`.

- **P1 — corrigido.** `toastBottomOffset()` sobe o toast acima do
  `.m3-fab` visível da aba (`test_toast_rodape` passa).
- **P3 — corrigido.** "?" de volta no card **Instruções de jogo** (o card
  antigo "Instruções táticas" virou esse, com 4 eixos), com texto novo
  sobre a troca ataque × defesa dos eixos (`test_condicao_ajuda` passa).
- **P2 — corrigido, com trava anti-exploit.** No anúncio, a reserva é o
  preço pedido (sem titularidade/necessidade). Medindo, apareceu um exploit
  que já existia: anunciar por 10× o valor gerava proposta de ~10× (30% das
  negociações fechavam; com só a reserva corrigida, 58%). Por isso a âncora
  do comprador no anúncio ficou limitada a 1,3× o valor de mercado
  (`LISTING_BUYER_ANCHOR_CAP`).

  Negociação de um clube por jogador anunciado (24 jogadores × clubes com
  caixa, 3 tentativas):

  | Pedido | Antes: titulares com comprador | Depois | Antes: valor médio / máx (× mercado) | Depois |
  |---|---|---|---|---|
  | 1× | 6/11 | 11/11 | 1,06 / 1,25 | 1,03 / 1,25 |
  | 1,3× | 5/11 | 11/11 | 1,37 / 1,62 | 1,35 / 1,62 |
  | 2× | 5/11 | 0/11 | 2,11 / 2,5 | sem venda |
  | 10× | 4/11 | 0/11 | 10,67 / 12,49 | sem venda |

  Na medição apareceu um 2º motivo de anúncio sem proposta: jogador com
  contrato acabando recebe oferta inicial até 15% abaixo do valor
  (`transferValuation`), a negociação interna parava sem acordo e o
  técnico nunca via o lance. Agora, num anúncio, o último lance do
  comprador vira proposta quando chega a ≥ 75% do pedido (mesmo corte de
  "muito abaixo" de `sellerNegotiationDecision`) — o técnico decide em
  Minhas vendas, como previa o desenho original do anúncio (propostas de
  55–110% do pedido).

  Pelo caminho real do jogo (`maybeSpawnListingOffer`, 150 simulações de
  uma temporada por jogador, 24 jogadores):

  | Pedido | 1ª proposta (rodadas, média) | Sem proposta na temporada | Jogadores que nunca recebem | Valor médio / máx (× mercado) |
  |---|---:|---:|---|---|
  | 1× | 14,6 | 21,8% | 0/24 | 1,00 / 1,12 |
  | 1,3× | 14,7 | 19,7% | 0/24 | 1,30 / 1,46 |
  | 2× | — | 100% | 24/24 | — |
  | 10× | — | 100% | 24/24 | — |

  O ritmo (≈ 15 rodadas até a 1ª proposta) é o da exposição já existente
  (40% por rodada × interesse do clube) — não alterado.
  `test_historico_negociacoes` passou a simular rodadas de exposição
  normais (até 200) em vez de forçar `Math.random = 0.01` (que sempre
  escolhia o mesmo clube) e a anunciar o jogador mais barato.
- **Observação (não alterada):** jogador com valor de mercado acima do
  caixa de qualquer clube CPU (ex.: R$ 56,8M contra no máximo R$ 32M de
  caixa na Série A) não vende pelo valor de mercado — só pedindo menos.

## 6. Medições

Mesma máquina (4 CPUs), `--isolated-server` (dados vazios a cada
execução), concorrência padrão 10. "Antes da Fase B" = testes do commit
`c81e97d` (mesmo código de app — a Fase B não toca no app) rodados num
worktree; "Depois" = `410d3f9`.

| Métrica | Antes da Fase B (`c81e97d`) | Depois | Evidência |
|---|---:|---:|---|
| Suíte completa | 301,8 s / 298,1 s / 303,3 s* | 315,0 s / 288,6 s / 292,1 s (média 298,6 s) | `SP/motor/preb_*`, `SP/motor/fin_*` |
| Aprovados (exit 0) | 131 / 132 / 132 de 153 | 149 / 149 / 149 de 153 | idem |
| … dos quais com verificação `false` escondida | ≥13 | 0 | `weak_checks.py` |
| Vereditos booleanos executados em testes aprovados | 710 (Fase A) | 814 | `weak_checks.py` |
| Verificações que só imprimem valor | 19 (Fase A) | 4 (informativas: estatística de lesões, meta inicial, URL, tipos v2) | idem |
| Rota rápida | 23,7 s (Fase A) | 24,3 s (18/18) | `SP/motor/fin_fast` |
| Cobertura JS (bytes) | 80,37%* | 81,69% (1.079.666 / 1.321.721 B) | `_coverage_summary.json` |
| Cobertura JS (funções) | 1776/2262 (78,51%)* | 1836/2286 (80,31%) | idem |
| Testes que nunca rodavam (pré-condição) | 2 | 0 | perfis de servidor |
| Soma serial dos testes | 2770–3008 s | 2637–2680 s | JSON |
| Esperas fixas estáticas (`waitForTimeout`) | 474,6 s | 308,5 s | `git grep` |
| Cliques opcionais de janela fixa (`.catch`) | 863 | 78 | `git grep` |

\* a 3ª "antes" é a de cobertura (`preb_cov`).

Intermitentes observados nas execuções completas finais: nenhum nas 3 execuções completas finais (só as 4 falhas de produto, idênticas nas 3). Na execução com cobertura (carga ~15% maior) falharam mais 2, residuais da mesma "cauda longa" de espera fixa, não tratados nesta fase: `test_coletiva_imprensa.js:213` (clique estourou 30 s) e `test_cup.js:168` (passo de migração, `CAREER.cup` indefinido); e 1 coleta de cobertura perdida (`test_loja_pagamento_real`, página já fechada na hora da coleta).

## 7. Critérios (mesma régua da Fase A)

| ID | Status | Evidência |
|---|---|---|
| AT-01 | APROVADO | `c81e97d` → `410d3f9`, branch `claude/motor-testes-fase-b` |
| AT-02 | APROVADO | README + `package.json` (comandos inalterados; helpers documentados) |
| AT-03 | APROVADO | "Antes" medido no mesmo código de app (worktree `c81e97d`), 3 execuções |
| AT-04 | APROVADO | Nenhuma verificação removida; vereditos fortalecidos; mudanças de expectativa justificadas por regra aprovada (§3.1) |
| AT-05 | APROVADO | Suíte completa 3× no candidato |
| AT-06 | APROVADO | Rota rápida e direcionada inalteradas, executadas |
| AT-07 | APROVADO | Cobertura 81,69% (1.079.666 / 1.321.721 B) vs 80,37% no mesmo código de app |
| AT-08 | APROVADO COM RESSALVA | Intermitentes medidos e tratados (§4, §6); sob concorrência 10 ainda podem aparecer casos novos de espera fixa (308 s estáticos restantes; 2 residuais vistos só sob cobertura, §6) |
| AT-09 | APROVADO | §6, mesma máquina/condições |
| AT-10 | APROVADO | §3 (desatualizado), §4 (determinismo), §5 (produto), ambiental: nenhum restante |
| AT-11 | APROVADO (atualizado em 26/10/2026) | CI criado na Fase C; run 12 (`40357853693`) totalmente verde — ver `docs/MOTOR_TESTES_FASE_A.md` §7 |
| AT-12 | APROVADO | `git diff c81e97d -- public server` vazio |
| AT-13 | APROVADO | Sem deploy/Railway; `server/data` do dev restaurado e não mais tocado pela suíte |
| AT-14 | APROVADO | Este documento |

## 8. Riscos e limitações

- Ainda há ~309 s de `waitForTimeout` estático nos testes (pequenas
  esperas de 100–300 ms entre cliques); sob carga maior podem surgir
  intermitentes novos do mesmo tipo dos tratados na §4.
- `_round.js` aciona o botão principal sem o teste de ponteiro do
  Playwright (por causa do P1); os testes que verificam o toque nesse
  botão continuam usando clique real.
- `check()` só reprova o 2º argumento; linhas com várias condições foram
  combinadas uma a uma (43 linhas com múltiplos vereditos hoje, nenhuma
  com `false` escondido na última medição).
- Porta 8787 fixa nos scripts (herdado).
- A cobertura de `app.js`/`engine.js` (página inicial) vem da página que o
  teste deixa pra trás ao ir pra carreira — depende de o V8 ainda guardar
  aqueles scripts na hora da coleta. Com a instrumentação corrigida voltou
  a 129/15 funções; o resumo passa a listar coletas perdidas.
- Os intermitentes apareceram em "cauda longa": cada rodada de medição
  sob concorrência 10 revelou 1–3 esperas fixas novas que falhavam sob
  carga. Foram tratados os observados; outros podem surgir (§6).

## 9. Prompt para GPT — Revisão e aprovação

Revise criticamente `docs/MOTOR_TESTES_FASE_B.md` (branch
`claude/motor-testes-fase-b`, commits sobre `c81e97d`) e as evidências em
`SP/motor/preb_*` (antes, mesmo código de app) e `SP/motor/fin_*`
(depois). Não aceite declarações sem evidência. Verifique:
1. se a troca de `console.log` por `check()` só fortalece (nenhuma
   condição removida) — amostre o diff de 10 testes;
2. se cada expectativa alterada na §3.1 corresponde a uma regra de
   produto aprovada (GE-CALENDAR-001, GE-BALANCE-005, S4-B3-003,
   UX-MERCADO-001, Fase 1.4 do mercado, GE-COPA-001);
3. se os 4 testes que seguem falhando (§5) são bugs/decisões reais de
   produto e não defeito de teste;
4. se as correções de determinismo (§4) não mascaram comportamento (ex.:
   chance 1e-12 só onde a coletiva não é o objeto do teste);
5. se tempo, aprovados e cobertura foram comparados no mesmo código de
   app;
6. se `public/` e `server/` ficaram intocados.

Responda `APROVAR`, `REPROVAR` ou `APROVAR COM PENDÊNCIAS`, citando
caminho/linha/log, e liste a decisão sugerida para P1–P4 e O1.
