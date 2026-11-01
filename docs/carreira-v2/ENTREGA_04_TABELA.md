# Carreira 2.0 — Entrega 04: Tabela

**Data:** 01/11/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

- **Referência:** `pranchas/02_resultados.png`, coluna 2 (CAP04-T07, Pacote Mobile, parte 1).
- **Comparativos:**
  - `evidencias/04-tabela/comparativo-390.png`
  - `evidencias/04-tabela/estados-larguras.png`: tabela completa, outra divisão, 360 e 430.

## Bloco da partida adiado (decisão de 01/11)
Partida, Pausa, Substituições e Resultado continuam na versão atual. O motor de jogo vive dentro do `carreira.js`: o sorteio não tem semente, o estado fica só em memória e ~20 sistemas são atualizados no fim do jogo. A v2 não consegue rodá-lo sem mexer nesse código. O bloco volta depois, com um plano técnico próprio para aprovação. A sequência seguiu para a Tabela.

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Linhas e colunas | Trecho de 6 clubes ao redor do seu, com Pos · Clube · P · J (como a prancha), e "Ver tabela completa" |
| Zonas | Mantidas, discretas: fio fino à esquerda da posição e legenda curta, com os critérios de hoje |
| Outros itens da Tabela atual | Trazidos para a v2: seletor de divisão e Copa do Brasil. Tocar num clube abre o elenco dele na versão atual. |
| Topo e entrada | Topo padrão (voltar · BRDATA · "TABELA"), sem ☰. Entrada pela posição no Início; "Voltar ao clube" leva ao Início. |

## O que foi entregue

### Tabela (`/carreira-v2/tabela`)
- Título "A disputa continua." com o traço dourado da prancha e o subtítulo com o nome real da competição.
- **Seletor Série A/B/C:** só aparece em carreira com o sistema de acesso e rebaixamento. A divisão escolhida vai para o endereço (`?divisao=`), sem gravar nada.
- **Nome da competição + "Rodada N":** N é a última rodada disputada. Antes da 1ª rodada aparece "Nenhuma rodada disputada".
- **Trecho da classificação:** 6 linhas ao redor do seu clube, que aparece em lima com sublinhado. Nas pontas da tabela, o trecho encosta no topo ou no fim.
- **"Ver tabela completa":** mostra os 20 clubes; o botão inverte para "Ver só perto do seu clube".
- **Ordem e zonas:** a ordem é a mesma da versão atual (pontos, vitórias, saldo, gols pró). As zonas também:
  - Série A: 1º–6º Libertadores, 7º–12º Pré-Libertadores, 4 últimos rebaixados;
  - Série B/C: 4 primeiros com acesso, 4 últimos rebaixados.
- **Toque num clube:** abre o elenco dele na versão atual (`/carreira#clube:<id>` → `openClubRoster`). O seu próprio clube abre a aba Elenco, como hoje.
- **Resultados da rodada:** todos os jogos da última rodada da sua divisão, o seu primeiro. Não aparece quando você vê outra divisão.
- **Copa do Brasil:**
  - status e histórico dos seus confrontos, com os mesmos textos da versão atual;
  - "Classificado" e "Eliminado" aparecem como texto colorido, no lugar dos emojis ✅/❌.
- **"Voltar ao clube"** leva ao Início.
- **Início:** a posição ("Nº na tabela") agora abre a Tabela.
- **Versão atual:** o mapa de atalhos aceita `#clube:<id>`. Nenhuma mudança de regra.

## Divergências em relação à prancha (para sua avaliação)
1. **Linhas de 44 px**, um pouco mais altas que na prancha, para respeitar o alvo de toque (cada linha abre o elenco do clube).
2. **Seletor de divisão, legenda de zonas e seção Copa do Brasil** não estão na prancha; vieram por decisão de 01/11.
3. **V, E, D e SG não aparecem na v2.** A versão atual mostra essas colunas; a v2 segue a prancha (P e J) também na tabela completa.
4. **Sem ícone ☰ e sem barra inferior.** O topo é o padrão das telas internas.
5. **Copa, cabeça de chave:** o clube cabeça de chave não tem confronto na 1ª fase. A versão atual mostra "Próximo confronto: rodada undefined contra ?". A v2 mostra "Seu clube é cabeça de chave e entra na 2ª fase (rodada 9)", tirado dos dados do sorteio. **O bug da versão atual não foi corrigido** (fora do escopo); fica registrado aqui.

## Testes
- **Unitários:** 28/28 (`npm test`), 6 deles da Tabela.
  - Verificam a paridade de `RELEGATION_N` e das faixas de zona com o `carreira.js`.
  - Verificam a janela do trecho nas pontas, os resultados, as outras divisões e todos os estados da Copa.
- **E2E novo `tests/e2e/test_v2_tabela.js`** (8 verificações, depois de 2 rodadas jogadas pela interface):
  1. Início → Tabela, com o trecho igual à classificação da versão atual;
  2. tabela completa e zonas;
  3. resultados da rodada e Copa sem texto quebrado;
  4. seletor de divisão;
  5. 360 px, alvos de toque e papéis de tabela;
  6. nada gravado;
  7. "Voltar ao clube";
  8. toque num clube abre o elenco na versão atual.
- **Suíte E2E completa** (servidor isolado): 158/160 na primeira execução. A máquina estava lenta: a suíte levou 490 s, contra 385 s na entrega anterior.
  - `test_historico_jogador.js`: o assistente de início ainda estava aberto no momento do clique.
  - `test_save.js`: estourou o limite de 180 s na rodada 29.
  - Nenhum dos dois passa pela v2. Reexecutados isoladamente, **os dois passaram** (`test_save` em 88 s).
- **Ajuste nos testes da v2:** `test_v2_tabela` e a captura recusam a proposta aleatória por jogador (`#playerOfferOverlay`) entre as rodadas, como já fazem outros testes da suíte.

## Arquivos
- `carreira-v2/src/domain/table.ts` e `table.test.ts`
- `carreira-v2/src/screens/Table.tsx` e `table.css`
- `carreira-v2/src/styles/tokens.css`: cores de zona
- `carreira-v2/src/App.tsx`: rota
- `carreira-v2/src/screens/Home.tsx` e `home.css`: posição vira link
- `carreira-v2/src/adapters/legacy.ts`: `legacyClubHref`
- `public/js/carreira.js`: atalho `#clube:<id>`
- `tests/e2e/test_v2_tabela.js` e `tools/capture/capture-v2-tabela.js`

## Próxima tela (só após aprovação)
Calendário.
