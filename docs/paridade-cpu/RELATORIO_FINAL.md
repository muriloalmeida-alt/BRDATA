# PARIDADE-CPU · Relatório final

**Data:** 23/11/2026
**Status:** REVISÃO DO PM NECESSÁRIA
**Plano:** `PLANO_DESENVOLVIMENTO.md`, com as etapas E0, E1a, E1b, E2, E3 e E4.
**Validação:** `tests/sim/paridade_baseline.js` (5 temporadas) e `tests/sim/paridade_achados.js`, rodados sem navegador sobre o catálogo congelado.

## 1. O que mudou para a CPU

| Etapa | PR | O que a CPU passou a fazer como você |
|---|---|---|
| E0 | #137–#139 | Diagnóstico, inventário e baseline. Elencos estáveis na virada (A14). |
| E1a | #140–#143 | Convoca 11 + 11 com a sua regra de escalação. Força de jogo pelo XI em campo. Recupera condição e volta de lesão e suspensão. Goleiro da base de emergência. |
| E1b | #144–#145 | Técnico com perfil (D1), postura no pré-jogo e mudança no intervalo. Substituições na sua partida (lesão, cansaço, plano). Lances e notícia do que o adversário fez (D3). |
| E2 | #146 | As outras divisões e os jogos de Copa entre CPUs jogam com os jogadores (cartões, lesões, autores, recuperação). |
| D6 | #147 | O save vai comprimido ao servidor (~10x menor). |
| E3 | #148–#150 | Caixa por clube (D2). Mercado CPU × CPU com os seus avaliadores, liberando excedente. Agentes livres que você e a CPU contratam. Cláusula de compra decidida por preço, caixa e papel. |
| E4 | #151–#152 | Treino semanal, evolução por rodada e moral pela sua regra. Base da CPU. Troca de clube sem recomeçar o mundo. |

Cada regra nova tem uma chave em `estado.PARIDADE_CPU` (`convocacao`, `forca`, `tecnico`, `divisoes`, `financas`, `mercado`, `contratos`, `evolucao`, `troca`). Todas ficam ligadas no jogo e desligadas nos testes de equivalência com as cópias congeladas.

## 2. Achados do E0, hoje (`paridade_achados.js`)

| # | Achado | Hoje |
|---|---|---|
| A1 | A força da CPU é só a do clube | Resolvido (E1a) |
| A2 | XI fixo 1-4-4-2, sem banco | Resolvido (E1a) |
| A3 | A CPU não substitui ao vivo | Resolvido (E1b) |
| A4 | A condição da CPU não se recupera | Resolvido (E1a) |
| A5 | Lesão da CPU não acaba na temporada | Resolvido (E1a) |
| A6 | Outras divisões só com placar | Resolvido (E2) |
| A7 | Copa CPU × CPU sem desgaste | Resolvido (E2) |
| A8 | Série D: elenco sob demanda, só o seu adversário no save | Mantido por decisão ("Gerado sob demanda") |
| A9 | Mercado CPU sorteado, sem os seus avaliadores | Resolvido (E3) |
| A10 | A CPU sem caixa guardado | Resolvido (E3, D2) |
| A11 | A CPU sem moral | Resolvido (E4) |
| A12 | Trocar de clube recomeça o mundo | Resolvido (E4) |
| A14 | Elencos encolhem na virada | Resolvido (A14) |

## 3. Validação de 5 temporadas

Base: a branch do E4 completa. Dados reais e Modo Exemplo, 3 seeds × 5 temporadas.

| Métrica | Dados reais | Modo Exemplo | Meta |
|---|---|---|---|
| Gols por jogo (A / B / C) | 2,60 / 2,97 / 2,91 | 3,16 / 2,99 / 2,88 | ±0,15 do E0 (A real 2,63) |
| Zebras por faixa | todas dentro de ±4 p.p. do E0 | idem | D13: manter o nível |
| Pico do save (JSON) | 880 KB | 838 KB | vai comprimido (~100 KB) desde a D6 |
| Rodada, p50 / p95 (Node, com gravação) | 150 / 300 ms | 152 / 279 ms | aceito pelo Murilo (E2 e E4); confirmar no iPhone |
| Problemas (demissão, falha de virada) | nenhum | nenhum | nenhum |

Overall médio dos elencos da CPU por temporada:

| Temporada | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Dados reais | 72,3 | 71,6 | 70,8 | 69,6 | 68,5 |
| Modo Exemplo | 76,4 | 75,5 | 74,6 | 73,5 | 72,2 |

## 4. Pontos em aberto

1. **Nível da CPU ao longo das temporadas.** Com o treino semanal igual ao seu e a base da CPU, o overall médio cai cerca de 0,9 a 1,1 por temporada. Antes do E4 a queda era de ~0,5, e sem a base seria de ~1,25.
   - Causa: o envelhecimento por rodada derruba os veteranos mais rápido do que os jovens crescem. Os jovens da CPU jogam pouco, e a evolução por rodada depende de jogar.
   - Opções para uma próxima etapa:
     - a CPU dar minutos aos jovens (rodízio em jogos de menor peso);
     - calibrar a evolução da base (`BASE_CPU`);
     - rever o declínio por idade para os dois lados.
2. **Validação no iPhone (D5/V09).** O tempo da rodada subiu nas etapas E2, E3 e E4. Os números do Node estão acima; falta medir no aparelho.
3. **Troca de clube:**
   - as parcelas a pagar e a receber do clube antigo deixam de existir;
   - o clube novo começa sem jogadores da base.
4. **Série D (A8):** o desgaste dos clubes da D nos jogos de Copa entre CPUs não fica guardado, por decisão.

## 5. Como reproduzir

```
node tests/sim/paridade_baseline.js --modos=real,exemplo --seeds=1,2,3 --temporadas=5
node tests/sim/paridade_achados.js
```
