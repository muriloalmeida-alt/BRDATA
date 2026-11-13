# Entrega — testes sem a tela antiga, lote L4 (temporada e mundo)

**Data:** 13/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L4, dividido em partes como o L3)
**Lista congelada:** 110 → 103 (L4a) → 100 (L4b) → 93 (L4c)

## L4a — diretoria, temporada e divisões (7 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_board.js` | sem verificação: pedia orçamento pela tela antiga e só imprimia caixa, decisão e se o botão ficava desativado | 5 verificações (ver abaixo), pela tela "Peça reforço." da v2 e pelo motor |
| `test_board_deny.js` | sem verificação: forçava o 10º lugar e só imprimia o resultado de 5 pedidos | **saiu:** virou o item 3 do `test_board` |
| `test_board_goals.js` | 4 verificações pela tela antiga (modais de demissão e de nova temporada) | pelo motor (`proximaTemporada`, o "Continuar" do Encerramento da v2) e pelo Início da v2 |
| `test_rebaixamento.js` | 5 verificações: regras pelas globais da página antiga e o seletor de divisão da Tabela antiga | regras pelo motor na página da v2 (`globaisDoMotor`); o item 3 pela Tabela da v2 |
| `test_season.js` | sem verificação: avançava a temporada pela tela antiga e só imprimia o "depois" | 4 verificações pelo motor e pelo Início da v2 |
| `test_multi_divisao.js` | 5 verificações pelas telas antigas | as mesmas 5, pelas telas da v2 |
| `test_multi_divisao_longwait.js` | cópia do `test_multi_divisao`, só com uma espera maior | **saiu:** duplicado |

### Para onde foi cada verificação

**`test_board`** (as situações dos dois testes antigos viraram verificações):
1. **Briga pelo título (1º):** o pedido pela tela é aprovado.
   - Teto e caixa sobem, com o caixa subindo 3 × o aumento do teto.
   - O extrato ganha o lançamento da diretoria e a tela mostra a resposta.
2. **Logo depois:** a tela mostra "Você pode pedir de novo em 4 rodadas." e o botão fica inativo. O motor recusa com "espera".
3. **Meio da tabela (10º), sorteio fora dos 15%:** a diretoria nega, e nada muda no caixa nem no teto.
4. **Zona de rebaixamento:** aprovado com qualquer sorteio.

**`test_board_goals`:**
- 1 (meta inicial) → item 1: a meta está no save e no Início da v2.
- 4 (cenário B) → item 2: 2 temporadas ruins seguidas mais uma temporada boa não demitem. A temporada avança e a sequência zera.
- 2 (cenário A) → item 3: demite na 3ª seguida, sem avançar a temporada.
- 3 ("Escolher outro clube" apaga o save e volta à escolha) → já era o item 5 do `test_v2_temporada` ("Começar nova carreira").

**`test_rebaixamento`:**
- Itens 1, 2, 4 e 5: os mesmos trechos e critérios, pelas funções do motor.
- Item 3: na Tabela da v2, as abas das 3 divisões. Na Série B: os 20 clubes certos, legenda com "Acesso" e sem G6/Libertadores.
- O auxiliar `globaisDoMotor` ganhou os setters do mundo (`LEAGUE_TEAMS`, `ALL_TEAMS_FLAT`, `CURRENT_COMPETITION_ID`, pelas funções `definir*` do `estado.js`) e o atalho `motorTemporada`. O item 5 troca a divisão do clube.

**`test_season`:**
1. Ano + 1, rodada 1, tabela zerada, e a temporada encerrada no histórico.
2. Os 3 jogadores com contrato vencendo saem do elenco, ou renovam com contrato novo. Pelo menos um sai. Quem fica envelhece 1 ano.
3. Depois de recarregar, o Início da v2 está na rodada 1.

**`test_multi_divisao`:** as mesmas 5 verificações, pelas telas da v2:
1. Escolha de campeonato com as 3 divisões.
2. Série B lista os 20 clubes, com o Coritiba.
3. O save grava `competitionId` "serie_b".
4. Recarregar reabre no Início da Série B.
5. Saves › "Reiniciar carreira" volta à escolha de campeonato, com o save apagado.

### Contraprova
Cada regra foi quebrada no motor, o teste rodou, e o motor foi restaurado depois.

| Regra quebrada | Verificação que falhou |
|---|---|
| aporte da diretoria = 2 × o aumento (é 3 ×) | `test_board` 1 |
| meio da tabela sempre aprovado | `test_board` 3 |
| sem a espera entre pedidos | `test_board` 2 |
| temporada boa não zera a sequência | `test_board_goals` 2 |
| sem demissão por sequência | `test_board_goals` 3 |
| jogadores não envelhecem na virada | `test_season` 2 |

### Validação L4a
- Os 5 arquivos rodados com a saída gravada; todas as verificações deram `true`:
  - `test_board` 5/5;
  - `test_board_goals` 4/4;
  - `test_rebaixamento` 5/5;
  - `test_season` 4/4;
  - `test_multi_divisao` 6/6.
- `verificar-tela-antiga.js`: 103 na lista, nenhum teste novo dependendo dela.

## L4b — Copa do Brasil (3 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_cup_engine.js` | sem verificação: trocava `simulateCupTie` por um placar fixo e só imprimia os 4 casos do formato antigo | 5 verificações pelo motor |
| `test_cup.js` | 6 itens, mas só o 1º valor de cada um era verificado. O resto era impresso, como "Fase 1 tem 56 clubes" e "4 cabeças de chave", que nem valem mais desde a Série D na Copa | 7 verificações pelo motor e pela Copa da v2 |
| `test_ge_copa_001.js` | 4 verificações pelas globais da página antiga, com o `#liveMatchOverlay` | as mesmas 4, pelo motor na página da v2 |

### Para onde foi cada verificação

**`test_cup_engine`** (formato antigo, de saves antigos):
- No motor, `simulateCupTie` não pode ser trocada de fora, porque é um módulo.
- O sorteio é fixado com uma semente, e a semente é escolhida até o confronto cair no resultado de cada caso.
- Os casos:
  1. vencer as oitavas: avança às quartas, com o prêmio das quartas;
  2. perder a semi: eliminado na semi, na rodada da semi, sem prêmio;
  3. vencer a final: campeão, com o prêmio de campeão;
  4. perder a final: vice, com o prêmio de vice.

**`test_cup`:**
1. **Estrutura:** a Copa tem 96 clubes e começa na preliminar (32 jogos, 64 clubes). Os outros 32 entram direto na 1ª fase, com o clube da Série A entre eles. Antes, o critério era 56 + 4, o formato sem a Série D.
2. **Até a rodada 6:** a carreira joga rodada a rodada pela ponte (`jogarRodadaV2`). Depois da volta da 1ª fase, a Copa está nos 32 avos (16 confrontos) ou o clube foi eliminado.
3. **Estado na tela:** a Copa da v2 mostra o estado certo. Antes, era o texto da aba Tabela antiga.
4. **Campeão:** "A Copa é sua." e "Copa do Brasil · Campeão".
5. **Não classificado:** "Fora desta Copa." e "Copa do Brasil · Não classificado".
6. **Migração:** num save sem Copa na rodada 20, a Copa é montada ao abrir, e a próxima fase é a de quartas.

**`test_ge_copa_001`:**
- Itens 1, 2 e 4: os mesmos trechos e critérios.
- Item 3 (perna da Copa ao vivo):
  - o antigo `#liveMatchOverlay` aberto virou o estado da ponte, "jogando" no contexto "copa" (é o que a tela Partida da v2 mostra);
  - a carreira é do Cuiabá, porque o Flamengo é cabeça de chave e não joga a 1ª fase.
- O auxiliar `globaisDoMotor` ganhou o atalho `LIVE_MATCH` (a partida em andamento no motor).

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| prêmio da fase disputada no lugar da seguinte | `test_cup_engine` 1 |
| sem prêmio de vice | `test_cup_engine` 4 |
| migração sem fechar as fases passadas | `test_cup` 6 |
| save antigo montando a Copa expandida | `test_ge_copa_001` 4 |

### Validação L4b
- Rodados com a saída gravada; todas as verificações deram `true`:
  - `test_cup_engine` 5/5;
  - `test_cup` 7/7;
  - `test_ge_copa_001` 4/4.
- `verificar-tela-antiga.js`: 100 na lista.

## L4c — balanceamento e calendário (7 arquivos)

| Teste | Antes | Agora |
|---|---|---|
| `test_ge_balance_001.js` | o aviso "Adversário motivado" era conferido no toast da tela antiga | o aviso é o evento "aviso" do motor; a partida corre pela ponte |
| `test_ge_balance_002.js` | regras pelas globais da página antiga | as mesmas verificações, pelo motor na página da v2 |
| `test_ge_balance_003.js` | idem | idem |
| `test_ge_balance_004.js` | temporada pelo `simulateRound` da tela antiga | temporada rodada a rodada pela ponte (`jogarRodadaV2`), virada pelo motor |
| `test_ge_calendar_001.js` | botões da tela antiga e `simulateRound` | o CTA do Início da v2 ("Avançar semana" / "Preparar partida") e a ponte |
| `test_ge_calendar_001_b2.js` | tela de amistosos antiga | regras pelos comandos da ponte |
| `test_ge_calendar_001_b3.js` | data no topo, lista semana a semana e rodízio da tela antiga | Início, motor e Pré-jogo da v2 |

### Para onde foi cada verificação

**`test_ge_balance_001`:**
- 1 (degraus): o mesmo critério.
- 2 e 3: a partida começa pela ponte, ouvindo o evento "aviso" do motor. Sem sequência, nenhum "Adversário motivado". Com 14 jogos invicto, o aviso sai com o 14.
- 5 → 4: a partida termina e grava. A rodada avança.

**`test_ge_balance_002` e `003`:**
- As mesmas 6 verificações.
- `globaisDoMotor` ganhou os atalhos `applyTraditionReprieve` (com a semente por chave, como na página antiga) e `sortedDivisionRows`.

**`test_ge_balance_004`:**
- As mesmas 4 verificações (promovidos, força dos promovidos e dos rebaixados, persistência).
- A temporada é jogada rodada a rodada pela ponte, no lugar do `simulateRound` da tela antiga.

**`test_ge_calendar_001`:**
- **1:** pré-temporada, janela aberta e "Avançar semana" no Início da v2.
- **2:** "Avançar até o próximo jogo" (a ponte) leva à rodada 1, e o Início mostra "Preparar partida".
- **3 a 3d (3 temporadas):** o mesmo laço, com o jogo da semana pela ponte (`jogarPartidaDaRodada`, novo auxiliar em `globaisDoMotor`). As semanas sem jogo continuam no `runCalendarOffWeek` de sempre.
- **4 (save sem calendário):** o mesmo critério.
- **Ajuste na contagem:** o estado dos contadores (lançamentos e chamadas da IA) é guardado antes de abrir o Início, que recarrega a página, e reinstalado depois.
- Entrou na classe de testes longos (cerca de 50 s).

**`test_ge_calendar_001_b2`:**
- As regras pelos comandos da ponte:
  - 3 amistosos obrigatórios e 2 opcionais;
  - o obrigatório recusa o avanço sem jogar;
  - o amistoso jogado não mexe em tabela, gols e cartões, e rende bilheteria;
  - "Avançar até o próximo jogo" marca os amistosos pulados;
  - o de julho é opcional.
- As telas do amistoso estão no `test_v2_semana`, itens 3 a 5.

**`test_ge_calendar_001_b3`:**
- **1:** Início na pré-temporada, com "Pré-temporada · semana N de M".
- **2:** o calendário do ano pelo motor: 12 meses, 5 amistosos, 13 semanas de Copa e 38 rodadas.
  - A lista semana a semana era da tela antiga.
  - O Calendário da v2 está no `test_v2_calendario`, e a Copa nele no `test_v2_serie_d`.
- **3:** na 1ª semana de 2 jogos em que o clube joga a Copa:
  - o Pré-jogo da v2 mostra "Semana de 2 jogos" ("Copa do Brasil na quarta");
  - o Início mostra a data com a rodada.

### Diferença da v2 para decisão
- **Aviso "Adversário motivado"** (`test_ge_balance_001`):
  - na tela antiga, era um toast antes da partida;
  - na v2, o motor emite o aviso, mas nenhuma tela o mostra (os eventos "aviso" do motor não aparecem na v2);
  - a regra (o bônus do adversário) continua valendo.
- **Para decidir:** mostrar o aviso no Pré-jogo da v2 (por exemplo, como alerta, ao lado de "Semana de 2 jogos"), ou deixar como está.
- Pelo princípio de explicabilidade (CLAUDE.md §45), a recomendação é mostrar.

### Contraprova

| Regra quebrada | Verificação que falhou |
|---|---|
| adversário nunca motivado | `test_ge_balance_001` 1 e 3 |
| sem o aviso antes da partida | `test_ge_balance_001` 3 |
| Flamengo fora da lista de tradição | `test_ge_balance_002` 1 e 2 |
| promovidos chegam fortes e rebaixados fracos | `test_ge_balance_004` 2 e 3 |
| amistoso pulado não fica marcado | `test_ge_calendar_001_b2` 4 |

### Validação L4c
- Todos rodados com a saída gravada, com as verificações `true`:
  - `test_ge_balance_001` 5/5;
  - `test_ge_balance_002` 4/4;
  - `test_ge_balance_003` 2/2;
  - `test_ge_balance_004` 4/4;
  - `test_ge_calendar_001` 7/7;
  - `test_ge_calendar_001_b2` 7/7;
  - `test_ge_calendar_001_b3` 3/3.
- `verificar-tela-antiga.js`: 93 na lista.
