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
| E4 | #151–#153 | Treino semanal, evolução por rodada e moral pela sua regra. Base da CPU. Troca de clube sem recomeçar o mundo. Minutos para os jovens; orçamento e base ficam com o clube na troca. |

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

Base: a branch do E4 completa (com o PR3, 24/11). Dados reais e Modo Exemplo, 3 seeds × 5 temporadas.

| Métrica | Dados reais | Modo Exemplo | Meta |
|---|---|---|---|
| Gols por jogo (A / B / C) | 2,60 / 3,02 / 2,87 | 3,13 / 3,00 / 2,85 | ±0,15 do E0 (A real 2,63) |
| Zebras CPU × CPU por faixa (<5% / 5–15% / 15–30% / >30%) | 62,1 / 59,6 / 55,4 / 46,1% (E0: 62,5 / 60,2 / 56,6 / 47,6%) | todas dentro de ±4 p.p. do E0 | D13: manter o nível |
| Pico do save (JSON) | 883 KB | 844 KB | vai comprimido (~97 KB) desde a D6 |
| Rodada, p50 / p95 (Node, com gravação) | 168 / 319 ms | 172 / 319 ms | aceito pelo Murilo (E2 e E4); iPhone dado como concluído (24/11) |
| Problemas (demissão, falha de virada) | nenhum | nenhum | nenhum |

Nível dos elencos da CPU no fim de cada temporada (overall médio do elenco /
média dos 11 melhores de cada clube):

| Temporada | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Dados reais | 72,3 / 77,1 | 72,4 / 77,0 | 72,8 / 77,1 | 73,0 / 77,0 | 73,5 / 77,1 |
| Modo Exemplo | 76,4 / 80,6 | 76,3 / 80,0 | 76,2 / 79,5 | 76,3 / 79,1 | 76,3 / 78,9 |

Antes do PR3 (só com a base de 6 olhados), o overall médio caía de 72,3 para
68,5 (real) e de 76,4 para 72,2 (exemplo).

## 4. Pontos em aberto

Resolvidos no PR3 (decisões do Murilo, 24/11):

- **Nível da CPU** ("Dar minutos para os jovens"): a CPU escala até 2 jovens de potencial por jogo (`JOVENS_CPU`). Com isso eles chegam ao potencial em 1–2 temporadas; o teto passou a ser o potencial de quem sobe, e a peneira da base foi de 6 para 20 olhados (`BASE_CPU`). Resultado: o XI dos dados reais fica estável (77,1 → 77,1). Restos medidos:
  - dados reais: o overall médio do elenco sobe ~0,3 por temporada (os reservas jovens chegam ao potencial);
  - Modo Exemplo: o XI ainda cai ~0,45 por temporada (antes, ~1,1).
- **Validação no iPhone (D5/V09):** dada como concluída pelo Murilo.
- **Troca de clube** ("o orçamento e a base são do clube, não do treinador"):
  - as parcelas a pagar e a receber ficam com o clube antigo; o saldo entra de uma vez no caixa dele;
  - a base fica guardada no clube antigo e ele promove dela primeiro na virada;
  - o clube novo vem com a base dele (a guardada, ou 16 jovens como numa carreira nova).

Em aberto:

1. **Série D (A8):** o desgaste dos clubes da D nos jogos de Copa entre CPUs não fica guardado, por decisão.

## 5. Como reproduzir

```
node tests/sim/paridade_baseline.js --modos=real,exemplo --seeds=1,2,3 --temporadas=5
node tests/sim/paridade_achados.js
```
