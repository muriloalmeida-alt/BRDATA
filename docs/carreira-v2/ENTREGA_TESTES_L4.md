# Entrega — testes sem a tela antiga, lote L4 (temporada e mundo)

**Data:** 13/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L4, dividido em partes como o L3)
**Lista congelada:** 110 → 103 (L4a)

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
