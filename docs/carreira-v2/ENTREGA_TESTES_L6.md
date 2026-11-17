# Entrega — testes sem a tela antiga, lote L6 (o que sobrou)

**Data:** 15/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L6, conferido um a um: decisão D1 do Murilo, "Conferir um a um")
**Lista congelada:** 55 → 45 (L6a) → 0 (L6b, 16/11/2026)

## L6a — site e conta (10 arquivos)

Os testes de loja, pagamento, push, convite, compartilhar, tutorial, login,
engajamento, assistente e sons entravam pela tela antiga, mas testam coisas
que a v2 também tem. Cada um foi reescrito pela tela da v2, ou saiu quando a
v2 não tem o recurso (com a decisão do Murilo).

| Teste | Antes | Agora |
|---|---|---|
| `test_loja.js` | 12 verificações pela Loja da tela antiga | 12 verificações pela Loja da v2 (`/loja`) |
| `test_loja_pagamento_real.js` | 7 verificações pela tela antiga (perfil `loja-creditos`) | 7 verificações pela Loja da v2 e pela proposta do Mercado (mesmo perfil) |
| `test_push_notifications.js` | 6 verificações pelas Configurações da tela antiga | 6 verificações pelas Configurações da v2 (`/configuracoes`) |
| `test_convite_amigo.js` | 7 verificações pelo Ranking e pelo login da tela antiga | 7 verificações pelo Ranking e pelo login da v2 |
| `test_share_cards.js` | 3 verificações (resultado, conquista, título) | 1 verificação (conquista); título em `test_v2_onboarding` item 5; resultado: lacuna (SHARE-RESULTADO-V2) |
| `test_onboarding.js` | 8 verificações pelo tutorial da tela antiga | 4 verificações pela v2; os slides, "Avançar"/"Começar" e a marca na conta já estão em `test_v2_onboarding` item 1 |
| `test_s4_b2_002_login.js` | 5 verificações: tokens e estados do login da tela antiga | 5 verificações: os mesmos estados no login da v2, com os tokens dela (`--bd-*`) |
| `test_engajamento.js` | 15 verificações (recompensa, objetivos, conquistas, ranking) | 7 verificações pela v2; objetivos: lacuna (OBJETIVOS-V2) |
| `test_assistente_inicio.js` | 13 verificações pelo assistente da tela antiga | 4 verificações pela v2; a sequência dos passos e o passo 4 já estão em `test_v2_onboarding` itens 2 e 3 |
| `test_efeitos_sonoros.js` | 8 verificações dos sons da tela antiga | **saiu:** a v2 não toca som (SONS-V2); o interruptor está em `test_v2_jogos_mais` item 7 |

### Para onde foi cada verificação

**`test_loja`:**
- 1: conta nova com 0 créditos (lido do servidor, `/api/auth/me`).
- 2, 2b, 2c: 5 pacotes; o Ouro é o "melhor valor"; preços com centavos (R$ 4,90 e R$ 149,90).
- 3, 3b: 6 itens com créditos em 3 grupos, com o Uniforme Alternativo.
- 4: confirmação do Pacote Ouro: 4.480 créditos, "Pagar R$ 34,90", Mercado Pago.
- 5: "Pagar" chama `/api/loja/checkout` (sem token: erro), avisa, fica na Loja e o saldo não muda.
- 6, 6b: confirmação do item com preço e saldo em créditos; sem saldo, "Saldo insuficiente" e a compra bloqueada (sem texto de outra loja).
- 7: Cancelar fecha.
- 8: conta freemium abre a Loja.

**`test_loja_pagamento_real`** (a conta com 5.000 créditos é criada antes do servidor subir, como antes):
- 1, 2: pacote com o Mercado Pago e o aviso de redirecionamento; "Pagar" chama o checkout de verdade (502 sem token) e não sai da Loja.
- 3: item sem saldo, bloqueado.
- 4: a conta sobe com os 5.000 créditos.
- 5: "Reset de Moral" debita 120 (4.880), põe a moral do elenco em 90 e entra no Histórico de compras (save e tela).
- 6: "Desconto de Contratação": a proposta da v2 (`/mercado/proposta`) sugere o valor com 15% a menos e mostra o aviso do desconto.
- 7: volta do Checkout Pro (`/loja?status=approved…`): URL limpa e "Pagamento aprovado!".

**`test_push_notifications`:** o interruptor "Ativar notificações push" (desligado no início); ativar dá a assinatura completa ou, neste ambiente sem o serviço de push, falha com aviso e sem travar; desativar é seguro; o `sw.js` tem os handlers `push` e `notificationclick`; o Elenco abre normal depois.

**`test_convite_amigo`:**
- 0, 1: código de amigo no Ranking; "Convidar amigo" copia `/?convite=CÓDIGO`.
- 2: o próprio link não adiciona a si mesmo e a URL fica limpa.
- 3: sem sessão, o link mostra o login da v2 e guarda o convite na aba.
- 4, 5: entrar pelo formulário cria a amizade, uma vez, dos dois lados.
- 6: o item antigo era um bug da tela antiga (login pelo formulário sem a global ME); agora: com carreira salva, entrar pelo formulário da v2 abre o Início.

**`test_onboarding`:** "Pular" no 1º slide marca a conta e abre o assistente; a recompensa vem depois do assistente; recarregar não reabre o tutorial; depois de "Reiniciar carreira", a 2ª carreira vai direto ao assistente.

**`test_assistente_inicio`:** trocar a formação no passo 1 grava; pulando os passos 2 a 4 nada é contratado e o save fica marcado; a Escalação fora do assistente mostra a formação, sem a barra; a 2ª carreira mostra o assistente de novo. Contratar comissão e olheiro nas telas da v2: `test_v2_comissao` e `test_v2_clube`.

**`test_s4_b2_002_login`:** padrão (campos, "Entrar", "Criar conta", tokens definidos); campos vazios (erro com `--bd-danger`, sem ir ao servidor); senha errada (mensagem e botão liberado); carregando ("Entrando…", desabilitado); sucesso (conta sem carreira vai para `/nova`).

**`test_engajamento`:** recompensa diária abre sozinha (7 dias, dia 1); "Receber" dá R$ 500 e receber de novo é recusado ("Já recebida hoje"); 7 conquistas, 0 desbloqueadas, filtro "Títulos" com 2; detalhe bloqueado sem compartilhar; promover 5 da base (comando `acaoJogador`, o mesmo do Elenco da v2) desbloqueia "Joia da Base", com data e botão de compartilhar; Ranking com seu código e a sua linha.

**`test_share_cards`:** conquista bloqueada sem botão; desbloqueada, "Compartilhar" baixa `conquista-ach_joia_base.png` (um PNG de verdade) e avisa "Imagem baixada".

### Lacunas da v2 (decisões do Murilo, 15/11: "Registrar demanda")

Registradas no `docs/HANDOFF_CLAUDE.md`, aguardando priorização:
- **SONS-V2:** a v2 não toca som; o interruptor só grava a preferência.
- **OBJETIVOS-V2:** objetivos diários, semanais e da temporada sem tela na v2 (o motor ainda conta).
- **SHARE-RESULTADO-V2:** sem "Compartilhar" no resultado da rodada.

### Contraprovas

Cada uma quebra a regra de propósito, roda o teste (tem que falhar) e
restaura o arquivo:

| Quebra | Teste | Resultado |
|---|---|---|
| Pacote Ouro sem `featured` (`motor/ponte.js`) | `test_loja` | falhou no 2b |
| "Reset de Moral" põe 80 (`motor/clube.js`) | `test_loja_pagamento_real` | falhou no 5 |
| Desconto de 10% em vez de 15% (`motor/clube.js`) | `test_loja_pagamento_real` | falhou no 6 |
| `sw.js` sem o handler `push` | `test_push_notifications` | falhou no 5 |
| `/api/friends/add` não adiciona (`server.js`) | `test_convite_amigo` | falhou no 4 e no 5 |
| Promover não conta o revelado (`motor/carga.js`) | `test_engajamento` | falhou no 8 e no 8b |
| Promover não conta o revelado (`motor/carga.js`) | `test_share_cards` | falhou (sem conquista para compartilhar) |
| `/api/account/onboarding-seen` não marca (`server.js`) | `test_onboarding` | falhou no 1 |
| `assistenteVisto` não marca o save (`motor/ponte.js`) | `test_assistente_inicio` | falhou no 2 |
| `/api/auth/login` fora do ar (`server.js`) | `test_s4_b2_002_login` | falhou (login não conclui) |

Depois das contraprovas, `git diff` no motor, no servidor e no `sw.js` vazio.

---

## L6b — o resto da tela antiga (45 arquivos, 16/11/2026)

Os 45 testes que sobraram conferiam a **tela antiga** em si: modais, rodapés,
toasts, chips, escudos, bottom sheets, overlays, transições, foco das modais
dela. Conferidos um a um (D1), as 263 verificações caíram em três grupos:

1. **Só a tela antiga (a grande maioria):** classes, IDs, modais e textos de
   `carreira.js`/`carreira.html` que não existem na v2. Saem sem porte; o
   equivalente na v2 já tem teste (tabela abaixo).
2. **Regra do jogo escondida no teste de tela:** 4 regras sem teste no motor.
   Foram portadas para `tests/unit/test_motor_regras_tela_antiga.js`.
3. **Comportamento de produto ainda valendo na v2:** zoom e rolagem no
   celular (`test_ux_zoom_scroll.js`). Reescrito pela v2, com a decisão do
   Murilo de bloquear o zoom (abaixo).

Resultado: **44 arquivos removidos**, 1 reescrito, 1 teste unitário novo;
`tela_antiga_legado.json` → `testes: []`; `suites.json` sem as 45 referências.

### Regras portadas para o motor (`test_motor_regras_tela_antiga.js`)

| # | Regra | Vinha de | Onde está |
|---|---|---|---|
| 1 | Volta de lesão limita a condição pelo teto (`INJURY_RETURN_CONDITION`: leve 75, média 60, grave 45) | `test_condicao_ajuda` item 4 | `semana.refreshAvailability` |
| 2 | `autoLineup` com `includeBase` true preenche com a base; false não usa a base | `test_escalacao_ui2` itens 3–5 | `virada.autoLineup` |
| 3 | Lesão na partida grava a fadiga do momento (`injuryHistory.fadigaAtInjury`) | `test_bloco5_treino` item 7 | `fechamento.applyMatchWearChunk` |
| 4 | Renomear esquema recusa nome repetido (sem diferenciar maiúsculas), vazio e com mais de 30 caracteres | `test_s4_b4_002_meus_esquemas` | `ponte.renameTacticalScheme` |

As outras regras desses arquivos (evolução do treino, `autoLineup` padrão,
eixos táticos, compra e proposta, notícias da rodada, finanças da rodada,
filtro do Elenco) já tinham teste no motor (`test_motor_treino`,
`test_motor_escalacao`, `test_motor_mercado`, `test_motor_registro`,
`test_motor_noticias_rodada`, `test_motor_financas`) ou na v2.

### De-para dos 44 removidos

| Removido (tela antiga) | O que conferia | Equivalente na v2 / motor |
|---|---|---|
| `test_a11y_modais`, `test_m3_dialog_sheet_skeleton`, `test_confirm_modals`, `test_modals`, `test_modais_pos_jogo` | role/aria-modal, foco preso e devolvido, cores das confirmações, modais do pós-jogo da tela antiga | foco dos diálogos e da navegação: `test_v2_escalacao`, `test_v2_foco` (AUD-04/05); confirmações e sheets: `test_v2_clube`, `test_v2_mercado`, `test_v2_elenco_avancado`; pós-jogo: `test_v2_posjogo`, `test_v2_resultado` |
| `test_ajustar_escalacao_modal`, `test_bloco2_tatica`, `test_escalacao_ui2`, `test_s4_b2_003_tatica`, `test_s4_b4_002_meus_esquemas`, `test_s4_b4_003_marcacao_individual` | chips de formação, campinho, eixos 1–5, salvar tática, esquemas salvos, marcação individual, "Ajustar escalação" no pré-jogo | `test_v2_escalacao`, `test_v2_esc`, `test_v2_tatica_treino`, `test_v2_prejogo`, `test_v2_ajustes`; regras 2 e 4 acima |
| `test_bloco5_treino`, `test_s4_b2_004_treino`, `test_condicao_ajuda` | resumo semanal, foco tático, duração, aviso de risco, histórico de fadiga, nota de condição, textos de ajuda | `test_v2_tatica_treino`, `test_v2_semana`, `test_motor_treino`; regras 1 e 3 acima |
| `test_bloco1_reorg`, `test_s4_b4_004_comparar_jogadores`, `test_ux_nomes_clicaveis` | escolha de clube em 2 passos, filtros do Elenco, perfil do jogador, comparar, nomes clicáveis | `test_v2_acesso`, `test_v2_elenco`, `test_v2_elenco_avancado`, `test_v2_tatica_treino` |
| `test_bloco789_hooks`, `test_bloco789_perfil_config`, `test_s4_b2_005_perfil` | Configurações, perfil, ajuda, histórico de compras, central de notificações, splash | `test_v2_jogos_mais`, `test_v2_navegacao`, `test_loja_pagamento_real` (histórico) |
| `test_m3_bloco1_inicio`, `test_menu`, `test_redesign_caps_1_7`, `test_remove_situacao_contraste_logo`, `test_escudo_monograma`, `test_ux_fechar_voltar_inicio` | barra inferior, topo com o clube, Início, menu, escudos, "Fechar/Voltar" ao Início | `test_v2_inicio`, `test_v2_navegacao`, `test_v2_sistema`, `test_v2_dados_reais` (escudos), `test_v2_clube` |
| `test_botao_ir_pro_jogo_e_financas_noticias`, `test_botoes_rodape`, `test_fase2b`, `test_tabela_modal`, `test_noticias_fullscreen_fluxo`, `test_portal_noticias_premiacoes`, `test_s4_b4_005_noticias_newscard` | "Ir para o jogo", rodapés fixos, rodada até os Resultados, Tabela em modal, Notícias em tela cheia, portal de notícias | `test_v2_prejogo`, `test_v2_posjogo`, `test_v2_resultado`, `test_v2_tabela`, `test_v2_tabela_partida`, `test_v2_semana`; notícias: `test_motor_noticias_rodada`, `test_motor_registro`, `test_noticias_rodada` |
| `test_s4_b4_006_estatisticas`, `test_ux_estatisticas_check` | tela de estatísticas | `test_v2_jogos_mais`, `test_v2_navegacao` |
| `test_toast_novo_componente`, `test_toast_placar_led`, `test_toast_reposiciona`, `test_toast_rodape` | toast da tela antiga (posição, placar LED, rodapé) | avisos da v2: `test_v2_gravacao`, `test_v2_financas`, `test_v2_ajustes`; placar da partida: `test_v2_partida` |
| `test_loading_overlay`, `test_s4_b2_001_loading`, `test_transicoes_suaves` | overlay de carregamento com atraso, splash, transições CSS | carregamento e erro da v2: `test_v2_modulo`, `test_v2_motor`, `test_v2_offline` |
| `test_redesign_a11y_responsivo` | contraste e largura no celular da tela antiga | `test_v2_sistema` (margens, largura 390 px), `test_ux_zoom_scroll` (reescrito) |
| `test_s4_b4_001_onboarding` | tutorial da tela antiga | `test_v2_onboarding`, `test_onboarding` (L6a) |

### Zoom no celular (decisão do Murilo, 16/11: "Bloquear zoom")

O `test_ux_zoom_scroll` antigo conferia que a tela antiga bloqueava o zoom.
A v2 deixava dar zoom. Por decisão do Murilo, a v2 agora também bloqueia:
- `carreira-v2/index.html`: viewport com `maximum-scale=1.0, minimum-scale=1.0, user-scalable=no`;
- `carreira-v2/src/styles/base.css`: `body { touch-action: manipulation }` (sem zoom de toque duplo);
- `test_ux_zoom_scroll.js` reescrito pela v2: itens 1 (viewport), 1b (`touch-action`) e 1c (a página rola sem largura extra).
- `test_v2_inicio` item 6 conferia o contrário ("zoom liberado"); agora confere o zoom bloqueado.

Observação de acessibilidade: o bloqueio de zoom contraria a WCAG 1.4.4
(o iOS ignora `user-scalable=no` por padrão desde o iOS 10; o Android respeita).
Fica registrado como escolha de produto.

### Contraprovas (L6b)

| Quebra | Teste | Resultado |
|---|---|---|
| Teto da lesão grave 45 → 60 (`motor/semana.js`) | `test_motor_regras_tela_antiga` | falhou no 1 |
| `autoLineup` ignora `includeBase` (`motor/virada.js`) | `test_motor_regras_tela_antiga` | falhou no 2 |
| Sem `fadigaAtInjury` no histórico (`motor/fechamento.js`) | `test_motor_regras_tela_antiga` | falhou no 3 |
| Renomear aceita repetido (`motor/ponte.js`) | `test_motor_regras_tela_antiga` | falhou no 4 |

Depois das contraprovas, `git status` no motor limpo.

### Ajuste de dois testes da PAUSA-EVENTO

A suíte completa achou dois testes que liam a tela no meio de uma parada
automática (lesão ou expulsão do seu time, PAUSA-EVENTO), sem relação com o
L6b:
- `test_v2_pausa` item 4 lia a primeira Pausa que aparecia e pegava
  "Jogo parado" antes de o gancho retomar; agora espera o título "Intervalo".
- `test_v2_resultado` usava o voltar do sistema com o jogo parado; agora só
  volta com a partida rodando.

Depois do ajuste, 3 rodadas seguidas dos dois testes passaram.

### Fica para o L7

Os ajudantes da tela antiga (`_startup.js`, `_round.js`, `_calendar_skip.js`,
`_v2_match.js`) não são mais usados por nenhum teste. Saem no L7, com o
`verificar-tela-antiga.js` e o README.

---

## L7 — os ajudantes da tela antiga saem (17/11/2026)

- Saem `tests/e2e/_startup.js`, `_round.js`, `_calendar_skip.js` e
  `_v2_match.js`: nenhum teste os usava desde o L6b.
- O `newCareer` (`_v2_carreira.js`) fica, por decisão do Murilo (17/11,
  "Manter"). O plano previa tirá-lo, mas desde o L1 ele cria a carreira
  pelo motor da v2, sem a tela antiga, e 79 testes o usam.
- `verificar-tela-antiga.js`: a regra contra esses ajudantes fica, para
  barrar quem tentar recriá-los; o comentário registra a saída.
- `tests/e2e/README.md`: sai a descrição dos ajudantes antigos (e o aviso
  do fluxo de confirmação da tela antiga); entra a dos ajudantes de hoje
  (`_v2_carreira.js`, `_sem_tela.js`).
- Ficam como estão: as cópias congeladas do motor (`tests/unit/ref_*_antes.js`,
  que citam `_round` em comentário) e os documentos de entregas anteriores
  (histórico).
- Com isso o plano "testes sem a tela antiga" termina: lista congelada em 0
  e nenhum ajudante que passa pela tela antiga.
