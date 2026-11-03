# Carreira 2.0 — Entrega 07: Diretoria

**Data:** 01/11/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

**Referência:** `pranchas/06_clube.png`, coluna 1 (CAP02-T05, "Dados existentes / sem confiança nova", Pacote Mobile, parte 2).

**Comparativos:**
- `evidencias/07-diretoria/comparativo-390.png`
- `evidencias/07-diretoria/larguras-360-430.png`

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Situação atual | Posição na tabela + "Dentro da meta" quando a posição já atende o objetivo, pelo mesmo critério da versão atual (`boardGoalMet`). Sem barra e sem percentual. Antes da 1ª rodada: "Temporada ainda não começou". |
| Outros objetivos e histórico | Seções simples: "Outros objetivos" (título + "Em andamento · 1/3" / "Cumprido") e "Temporadas anteriores" (ano · posição · meta · Cumprida/Não cumprida). Só aparecem quando há dados. |

## O que foi entregue

### Diretoria (`/carreira-v2/diretoria`)
- Título "DIRETORIA" com o traço dourado e o subtítulo "O que o clube espera.", como na prancha.
- **"Objetivo da temporada":** a meta real da diretoria (`boardGoal.label`).
- **"Situação atual":** "Nº na tabela" e, quando a posição já atende a meta, "Dentro da meta".
- **"Ver classificação":** abre a Tabela da v2. A seta fica em lima, como na prancha.
- **"Outros objetivos":** os mesmos objetivos de temporada da Diretoria atual (`objectives.season`), com o progresso limitado ao alvo, como hoje.
- **"Temporadas anteriores":** o histórico gravado pela versão atual no fim de cada temporada (`seasonHistory`).
- **"Voltar ao clube":** leva ao Início e fica fixo no rodapé.
- **Ligação:** a linha "Objetivo" do Início agora abre esta tela.
- **Só leitura:** a tela não grava nada.

## Divergências em relação à prancha (para sua avaliação)
1. **Linha "Dentro da meta"** sob a posição, como decidido. Ela não aparece quando a meta não está sendo atendida. Não há texto de "fora da meta", para não criar uma avaliação nova.
2. **Seções "Outros objetivos" e "Temporadas anteriores"** não estão na prancha; foram trazidas da Diretoria atual por decisão de 01/11.
3. **Topo com voltar**, como nas outras telas internas. A prancha só tem o wordmark.
4. **Pré-temporada:** a versão atual mostra a posição já antes da 1ª rodada (todos os clubes com 0 pontos). A v2 mostra "Temporada ainda não começou", coerente com o Início, que também não mostra posição antes da 1ª rodada.

## Testes
- **Unitários:** 40/40 (`npm test`), 3 deles da Diretoria:
  - critério de "dentro da meta";
  - pré-temporada;
  - objetivos com progresso limitado;
  - histórico;
  - save sem esses campos.
- **E2E novo:** `tests/e2e/test_v2_diretoria.js`, com 4 verificações:
  1. Início → Diretoria na pré-temporada, com a meta igual à da versão atual e sem barra nem %.
  2. Depois de 1 rodada, posição e "Dentro da meta" exatamente quando `boardGoalMet` da versão atual é verdadeiro; mesma quantidade de objetivos.
  3. Temporadas anteriores. O histórico foi injetado pela API no mesmo formato que a versão atual grava, porque fechar uma temporada inteira no teste levaria minutos.
  4. Ver classificação → Tabela; 360 px; alvos de toque; Voltar ao clube; nada gravado.
- **Suíte E2E completa** (servidor isolado): 161/163 na primeira execução. As duas falhas foram em telas da versão atual, sem relação com a v2:
  - `test_redesign_a11y_responsivo.js`: chips da aba Jogos medidos no limite de 40 px.
  - `test_regressao_gate.js`: erro de rede do ambiente (`ERR_TUNNEL_CONNECTION_FAILED`).
  - Reexecutados isoladamente, **os dois passaram**.

## Arquivos
- `carreira-v2/src/domain/board.ts` e `board.test.ts`
- `carreira-v2/src/screens/Board.tsx` e `board.css`
- `carreira-v2/src/App.tsx` (rota)
- `carreira-v2/src/screens/Home.tsx` (Objetivo vira link interno)
- `carreira-v2/src/domain/types.ts` (`objectives`, `seasonHistory`)
- `tests/e2e/test_v2_diretoria.js` e `tools/capture/capture-v2-diretoria.js`

## Próxima tela (só após aprovação)
Finanças: última da sequência do pacote; os demais itens só depois da validação dos contratos.
