# Entrega — testes sem a tela antiga, lote L5 (elenco e semana)

**Data:** 15/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L5, dividido em partes como o L4)
**Lista congelada:** 82 → 75 (L5a) → 68 (L5b) → 63 (L5c) → 55 (L5d)

## L5a — contratos, moral e lesões (7 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_contract_renewal.js` | 5 verificações pelos modais da tela antiga (detalhe, Renovar, toast) | 7 verificações pela ponte (`ponte.renovar`, a mesma da tela de renovação da v2) |
| `test_contract_renewal_edge.js` | sem verificação: só imprimia os casos do jovem e do teto | **saiu:** virou os itens 4 e 5 do `test_contract_renewal` |
| `test_coletiva_renovacao.js` | 1 verificação: a recusa abre a coletiva 19 | **saiu:** virou os itens 2 e 6 do `test_contract_renewal` |
| `test_morale.js` | 4 verificações; "fora da súmula cai para 68" era só impresso | 7 verificações pelo motor, pela ponte e pelo Perfil do jogador da v2 |
| `test_morale_season.js` | sem verificação: só imprimia as contas da virada | **saiu:** virou o item 6 do `test_morale` |
| `test_moral_relacionamento.js` | 5 verificações (outras só impressas) e o modal de conversa da tela antiga | 6 verificações pelo motor e pela ponte (`ponte.conversar`) |
| `test_injuries.js` | 3 verificações; a distribuição das gravidades era só impressa | 4 verificações pelo motor |

### Para onde foi cada verificação

**`test_contract_renewal` (junta os três de renovação):**
- 1: fora do último ano de contrato, renovar é recusado (novo).
- 2: abaixo do mínimo: recusa com o motivo, nada muda, e abre a coletiva de renovação recusada (antes: toast da tela antiga e `test_coletiva_renovacao`).
- 3: sugerido por 2 anos: aceita, contrato até a temporada + 2 e salário sugerido, gravados no save.
- 4: até 23 anos não aceita 1 ano (antes: `_edge`, só impresso).
- 5: acima do teto salarial: recusa pelo orçamento, nada muda, sem coletiva (antes: `_edge`, só impresso).
- 6: moral muito baixa: recusa na certa, com a coletiva 19.
- As telas (Contrato e ações, Renovar, "Proposta aceita."/"Proposta recusada." e a coletiva avulsa): `test_v2_elenco_avancado` itens 2 a 4.

**`test_morale` (junta o `test_morale_season`):**
- 1: o elenco principal nasce com moral 70. A base sobe treinando com o principal na pré-temporada (+5 por dia no grupo misto, `motor/treino.js`); o teste antigo checava "todo o elenco" antes dessa regra.
- 2: o Perfil do jogador da v2 mostra a moral (antes: detalhe da tela antiga).
- 3: uma rodada de verdade muda a moral dos titulares; e, na partida (vitória, `applyMoraleAfterMatch`), o titular ganha 5 e quem ficou fora da súmula cai 2 × o quanto reclama (`playerComplaintFactor`, idade e overall). O teste antigo imprimia "68" (70 − 2) sem verificar; era a regra antes do amortecimento. A conta exata é só da partida: o pós-jogo (resposta da coletiva) também mexe na moral do elenco inteiro (falha do item no 1º CI do #121).
- 4 e 5: renovação pela moral (20: recusa mesmo generosa; 90: sugerido acima de 1,05× e 1 ano recusado), pela ponte.
- 6: virada de temporada (`seasonMorale`): 100 com salário justo → 91; mal pago → 64; bem pago → 74 (antes: `test_morale_season`, só impresso).

**`test_moral_relacionamento`:**
- 1 a 5: as mesmas regras (sequência no banco, motivo, conversa disponível, "Ouvir e apoiar", pedido de transferência, "Cobrar postura"), com a conversa pela ponte. O que era só impresso (motivo, titular sem sequência, não conversar de novo na rodada) virou verificação.
- A tela Conversa da v2: `test_v2_elenco_avancado` item 5.

**`test_injuries`:**
- 1: 20 000 sorteios: as 3 gravidades na proporção ~70/25/5 e lesão de mais de 4 rodadas (antes: só impresso).
- 2: chance de lesão pelo físico e pela condição.
- 3: lesão grave atravessando a virada: o jogador volta a "ok".
- As telas: "Lesionado · volta na rodada N" no Elenco (`test_v2_elenco` item 2) e o lesionado fora da lista de substitutos (`test_v2_escalacao` item 8).

### Junto: esperas que não esperavam
`page.waitForFunction` com função async não espera (a Promise conta como verdadeira na hora). Achado no CI do #120 (`test_ge_balance_004`, corrigido lá). Os outros dois casos:
- `test_v2_semana` item 7: "lidos no save" não era verificado; agora é.
- `test_v2_corte` item 5: a espera do convite.

Os dois usam o ajudante novo `esperarAssincrono` (`_v2_carreira.js`), que repete a consulta pelo lado do Node.

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| sem o mínimo de salário na renovação | `test_contract_renewal` 2 e 3 |
| jovem aceita contrato de 1 ano | `test_contract_renewal` 4 |
| quem fica fora da súmula perde 1× (é 2×) | `test_morale` 3 |
| mal pago perde 5 na virada (é 6) | `test_morale` 6 |
| a virada não limpa a lesão | `test_injuries` 3 |

### Validação L5a
- Todos rodados com a saída gravada, com as verificações `true`:
  - `test_contract_renewal` 7/7;
  - `test_morale` 7/7;
  - `test_moral_relacionamento` 6/6;
  - `test_injuries` 4/4;
  - `test_v2_semana` e `test_v2_corte`: todas.
- `verificar-tela-antiga.js`: 75 na lista.

## L5b — treino e tática (7 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_treinos.js` | 11 verificações pela aba Treinos e pelo menu da tela antiga | 8 verificações pela ponte (`treino`, `aplicarModeloTreino`, `salvarDiaTreino`, `aplicarTreino`) |
| `test_training_evolution.js` | 5 verificações (2 pelas setas da tela antiga), rodada pela tela antiga | 4 verificações pelo motor |
| `test_evolucao_atributos.js` | 7 verificações pelas globais da tela antiga | as mesmas 7, pelo motor na página da v2 |
| `test_marcacao_individual.js` | 6 verificações pelo modal da tela antiga | 6 verificações pela ponte (`marcacao`, `salvarMarcacao`) e pelo motor |
| `test_instrucoes_setor.js` | 5 verificações pelas abas da tela antiga | 5 verificações pela ponte (`salvarInstrucoesSetor`) e pelo motor |
| `test_meus_esquemas.js` | 6 verificações pela tela de esquemas antiga | 8 verificações pela ponte (`esquemas`, `salvarEsquema`, `aplicarEsquema`, `excluirEsquema`) |
| `test_escalacao_avancada.js` | 8 verificações pela Escalação da tela antiga | 5 verificações pelo motor e pela ponte (`escalarAutomaticamente`) |

### Para onde foi cada verificação

**`test_treinos`:**
- O modelo padrão, os 5 modelos e os 7 dias; sábado (jogo) sem treino; trocar de modelo; editar um dia vira "Personalizado"; ocupar a folga protegida; treino individual; aplicar 1× por semana (idempotente): pela ponte.
- A navegação da tela antiga (Treinos no menu "Mais", Tabela pelo menu, lista com barra de condição) saiu: não existe na v2.
- A tela Treino da semana da v2: `test_v2_tatica_treino` item 7.

**`test_training_evolution`:**
- 1 e 2: o ganho do treino técnico (+2 no overall, −6 de condição, ataque e defesa iguais) e o da CPU parado, pelo motor (`applyWeeklyTraining`). "Ataque e defesa iguais" e a condição eram só impressos.
- 3: o declínio do veterano que não jogou (`applyNaturalAgingEvolution`).
- As setas de tendência do detalhe antigo saíram; a Evolução da v2 está no `test_v2_tatica_treino` item 8.

**`test_evolucao_atributos`:**
- As mesmas 7 verificações (potencial no nascimento, convergência para o teto, veterano sem espaço, ganho com pouco espaço, migração, maturação, declínio), pelo motor na página da v2. `attributeTrainingGain` do motor recebe o sorteio (a tela antiga passava `Math.random`).

**`test_marcacao_individual`:**
- Adversário, os 10 meus de linha e os 5 dele; salvar e reabrir; o efeito real no sorteio de autor de gol (4 000 sorteios); "Sem marcação": pela ponte e pelo motor. Novo: jogador fora das listas é recusado.
- A tela Marcação da v2: `test_v2_tatica_treino` item 5.

**`test_instrucoes_setor`:**
- 3 setores × 5 instruções, neutras; salvar; o efeito nos modificadores; a migração do save antigo: pela ponte e pelo motor. Novo: valor fora de 1 a 5 é ignorado.
- A tela da v2: `test_v2_tatica_treino` item 3.

**`test_meus_esquemas`:**
- Vazio; salvar ativo; mexer desvincula; aplicar volta formação e táticas; excluir; limite de 8: pela ponte. Novo: nome repetido é recusado.
- A tela Esquemas da v2: `test_v2_tatica_treino` item 4.

**`test_escalacao_avancada`:**
- 14 formações; 11 posições com 1 goleiro em todas (antes, só a 4-2-2-2 no campinho); escalar automaticamente mantém formação e táticas; o melhor zagueiro titular.
- As trocas na Escalação: `test_v2_escalacao` itens 2 e 3. As marcas "(titular)" e "(banco)" do seletor antigo saíram.

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| editar um dia não desvincula o modelo | `test_treinos` 4 |
| ganho base do treino 3 (é 2) | `test_training_evolution` 1 |
| marcação sem efeito no sorteio | `test_marcacao_individual` 4 |
| limite de 9 esquemas (é 8) | `test_meus_esquemas` 1 e 7 |

### Validação L5b
- Todos rodados com a saída gravada, com as verificações `true`:
  - `test_treinos` 8/8;
  - `test_training_evolution` 4/4;
  - `test_evolucao_atributos` 7/7;
  - `test_marcacao_individual` 6/6;
  - `test_instrucoes_setor` 5/5;
  - `test_meus_esquemas` 8/8;
  - `test_escalacao_avancada` 5/5.
- `verificar-tela-antiga.js`: 68 na lista.

## L5c — comissão, patrocínio, coletiva e notícias (5 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_comissao_tecnica.js` | 8 verificações pela tela de comissão antiga; o custo medido rodando a rodada duas vezes pela tela antiga | 6 verificações pelo motor e pela ponte (`contratarComissao`, `demitirComissao`) |
| `test_comissao_resumo_inicio.js` | o card da comissão no Início da tela antiga | **saiu:** na v2 é o painel de sugestões rápidas (`test_v2_comissao`) |
| `test_patrocinio.js` | 6 verificações pelos cards e modais da tela antiga | 5 verificações pelo motor e pela ponte (`patrocinios`, `assinarPatrocinio`) |
| `test_coletiva_imprensa.js` | 8 verificações (2 pelo modal da tela antiga) | 7 verificações pelo motor e pela ponte (`responderColetiva`) |
| `test_noticias_rodada.js` | 8 verificações (1 pelo modal de resultados da tela antiga) | 8 verificações pelo motor |

### Para onde foi cada verificação

**`test_comissao_tecnica`:**
- Contratar e demitir: pela ponte (antes: estados da tela antiga).
- Sugestão de treino da rodada 1 (Pré-Temporada Física) e aplicar; tática contra o próximo adversário; escalação calculada: pelo motor.
- O custo: no fechamento do mês, a diferença de caixa com e sem comissão é exatamente o custo mensal (antes: a mesma rodada jogada duas vezes pela tela antiga, com o sorteio gravado).
- As telas: Clube → Comissão no `test_v2_clube` item 2 e o painel de sugestões no `test_v2_comissao`.

**`test_comissao_resumo_inicio`:**
- O card no Início da tela antiga (ícones, diálogo, "Agora não", toast) não existe na v2. O equivalente da v2, o painel de sugestões rápidas (aplicar, desfazer, sugestão desatualizada), está no `test_v2_comissao`.

**`test_patrocinio`:**
- Nasce com os dois contratos; na virada o vencido vira 3 propostas e o outro continua; assinar; o patrocínio entra no caixa no fechamento do mês: pelo motor e pela ponte. Os valores por temporada e "o outro continua" eram só impressos.
- A tela Patrocínios da v2: `test_v2_clube` item 4.

**`test_coletiva_imprensa`:**
- A biblioteca (21 situações) e os gatilhos (goleada 12, zebra 10, lanterna 09/08, meta em risco 20/08): os mesmos critérios, pelo motor.
- A resposta A sobe reputação e moral e fica no histórico: pela ponte (`responderColetiva`). O histórico era só impresso.
- O modal e o X da tela antiga: a coletiva da v2 (pergunta, efeito depois de responder, "Pular" sem efeito) está no `test_v2_posjogo` itens 1 e 5.

**`test_noticias_rodada`:**
- Líder, zebra (agora também a goleada, antes só impressa), empate defendido, jejum quebrado, lanterna reage, a do meu clube primeiro e a genérica: pelo motor (`generateRoundNews`).
- A tela Notícias da rodada da v2: `test_v2_posjogo` item 2. O bloco "Rádio Data FM" dos Resultados da tela antiga já tinha saído.

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| sugestão de treino da rodada 1 não é a pré-temporada | `test_comissao_tecnica` 2 |
| comissão não cobrada no mês | `test_comissao_tecnica` 5 |
| goleada só com 5 gols de diferença (é 3) | `test_coletiva_imprensa` 2 |
| sem manchete do lanterna | `test_noticias_rodada` 5 |

### Validação L5c
- Todos rodados com a saída gravada, com as verificações `true`:
  - `test_comissao_tecnica` 6/6;
  - `test_patrocinio` 5/5;
  - `test_coletiva_imprensa` 7/7;
  - `test_noticias_rodada` 8/8.
- `verificar-tela-antiga.js`: 63 na lista.

## L5d — partida ao vivo, lances e estatísticas (8 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_ao_vivo.js` | 7 verificações pelos modais e selects da tela antiga | 8 verificações pela ponte (`iniciar`, `substituir`, `aplicarTatica`, `pularParaFim`) e pelo motor |
| `test_play_by_play_v1.js` | 7 verificações pela tela ao vivo e o "Seu jogo" antigos | 5 verificações pela ponte e pelo que o motor guarda da partida |
| `test_play_by_play_v2.js` | 2 verificações da barra de posse; os lances raros só impressos | **saiu:** a posse virou o item 4 do `test_play_by_play_v1` |
| `test_events.js` | 2 verificações pelo modal "Seu jogo" em 10 rodadas | 3 verificações em 6 rodadas pela ponte |
| `test_historico_jogador.js` | 4 verificações; a temporada inteira pela tela antiga | 4 verificações pelo motor (3 rodadas e a virada) |
| `test_estatisticas_completas.js` | 9 verificações pela tela de estatísticas antiga | 4 verificações pelo motor |
| `test_comparar_jogadores.js` | 4 verificações pelo modal de comparação antigo | **saiu:** a comparação da v2 está no `test_v2_elenco_avancado` itens 7 e 8 |
| `test_timing.js` | sem verificação: só imprimia tempos | **saiu** |

### Para onde foi cada verificação

**`test_ao_vivo`:**
- A partida ao vivo, a substituição (quem sai deixa de ser titular, 1 usada), a troca de esquema com 2 tempos de penalidade e a penalidade zerando, a expulsão liberando substituição extra, pular para o fim gravando a rodada e os 10 jogos da rodada: pela ponte e pelo motor.
- As telas: Partida no `test_v2_partida` e no `test_v2_pausa`; Substituição e Ajustar tática no `test_v2_ajustes`; Resultados da rodada no `test_v2_posjogo` item 3.

**`test_play_by_play_v1` (junta o `_v2`):**
- Velocidade 2×, lances variados (chance perdida, defesa), gol com assistência (autor e id) e as estatísticas (finalizações no alvo ≤ finalizações; posse entre 0 e 100%): pela ponte e pelo motor.
- As telas (feed, "Ver lances", Resultado): `test_v2_partida` e `test_v2_resultado`.
- Os lances raros (lesão, pênalti, VAR) eram só impressos (são sorteados) e não viraram verificação.

**`test_events`:**
- Em 6 rodadas, o seu jogo gravado com o placar igual ao do registro de partidas, e todo jogo com gol guarda os lances (um gol por gol do placar).

**`test_historico_jogador`:**
- Sem histórico na 1ª temporada; os jogos da temporada acumulam; a virada grava a linha (jogos, gols, assistências) e zera os contadores. A linha do detalhe antigo saiu; a Ficha da v2 lê o mesmo histórico.

**`test_estatisticas_completas`:**
- Zeradas na carreira nova; depois de 1 jogo, o resultado do lado certo na temporada e na carreira, jogo sem sofrer gol e sequências; na virada, 1 temporada de campeões e 1 temporada jogada: pelo motor.
- A tela Estatísticas da v2 (Meu time/Campeonato, Temporada/Histórico): `test_v2_jogos_mais` item 3.

**`test_comparar_jogadores`:**
- Comparar com outro do elenco (mesma posição) e com um do adversário: `test_v2_elenco_avancado` itens 7 e 8.

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| expulsão sem substituição extra | `test_ao_vivo` 5 |
| histórico da temporada sem os jogos | `test_historico_jogador` 3 |
| jogo sem sofrer gol não conta na temporada | `test_estatisticas_completas` 2 (falha quando a partida termina sem gol sofrido; no caso, 2x0) |

### Validação L5d
- Todos rodados com a saída gravada, com as verificações `true`:
  - `test_ao_vivo` 8/8;
  - `test_play_by_play_v1` 5/5;
  - `test_events` 3/3;
  - `test_historico_jogador` 4/4;
  - `test_estatisticas_completas` 4/4.
- `verificar-tela-antiga.js`: 55 na lista.
