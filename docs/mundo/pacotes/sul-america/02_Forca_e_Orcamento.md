# Método de força e orçamento

Os números financeiros por clube são parâmetros iniciais de simulação. O campo `localCurrency` preserva ARS, CLP, COP, USD e UYU, e a economia inicial do pacote usa USD como unidade comum. Em uma Carreira local, pode-se manter USD no ledger e converter apenas na exibição com uma taxa configurada para a temporada. A conversão de interface não deve reescrever contratos, caixa ou parcelas.

## Força

Para cada clube, a tabela de referência fornece jogos, gols marcados e gols sofridos. O modelo calcula a média de gol por clube/partida da divisão. Aplique dez jogos de peso dessa média antes de dividir, separadamente para ataque e defesa. O resultado é limitado entre 0,62 e 1,65. Em `atk`, maior é melhor. Em `def`, menor é melhor. No primeiro nível argentino e colombiano, a base de força é a fase regular do Clausura disponível. No Equador, usa a fase inicial. Os snapshots de classificação servem para calibrar e auditar, sem importar os pontos em uma carreira nova.

## Economia

1. `dados/benchmarks-financeiros.json` traz uma base anual por divisão, uma fração de TV e uma fração de bilheteria. São valores de design abaixo de um modelo completo de balanço. Ajustei a receita por capacidade conhecida do estádio e por diferença entre ataque e defesa. Capacidade ausente usa referência neutra de 12 mil lugares no cálculo, sem gravá-la como dado real.
2. A folha-alvo contém 52% da receita-modelo anual dividida por 12. O teto mensal é 118% dessa folha. O caixa inicial equivale a três folhas mensais. A verba de transferências limita o gasto a 60% desse caixa, sem criar um crédito extra. Bilheteria, TV e premiação são parâmetros de fluxo.
3. Aplique o mesmo fator salarial de normalização aos salários iniciais de um clube e use o mesmo mercado para CPU e jogador. Salário justo, propostas, renovações e compensações precisam refletir a escala local sem revalorizar retroativamente acordos persistidos.
4. Trate distribuição continental como receita contingente e mantenha os parâmetros de TV doméstica por competição. A referência Equador relata previsão agregada de **USD 20 milhões** para direitos em 2026, sem indicar divisão uniforme. A sensibilidade do modelo depende da distribuição, da bilheteria e do porte dos clubes. [Ecuavisa, direitos de TV em 2026](https://www.ecuavisa.com/futbol-nacional/equipos-de-ecuador-recibiran-usd-20-millones-por-derechos-de-tv-en-el-2026-20250709-0080.html)

## Fontes para calibrar

- [CONMEBOL, manual de clubes Libertadores 2026](https://cdn.conmebol.com/wp-content/uploads/2025/12/CL-2026-Manual-de-Clubes-POR-Fev26.pdf) e [quadro de aportes e premiações](https://cdn.conmebol.com/wp-content/uploads/2026/05/ORG_CONMEBOL_Resumen-Ejecutivo-2025-DIGITAL-FLIPBOOK-ESP.pdf) para bônus condicionados a participação e desempenho.
- [FIFA, Global Transfer Report](https://inside.fifa.com/transfer-system/transfer-reports) para comparar escala e fluxo de transferências internacionais.
- [LigaPro, regulamento](https://ligapro.ec/wp-content/uploads/2024/07/Reglamento-Competiciones-v2025.pdf) para o contexto de controle econômico equatoriano.
- [CMF Chile](https://www.cmfchile.cl/) para demonstrações de sociedades chilenas publicadas, quando aplicáveis. Use contas por clube apenas com mesma safra, moeda e definição contábil.

A entrega não verifica o caixa, a folha efetiva ou a verba de transferências de cada entidade. Os parâmetros devem ser ajustados em simulações de múltiplas temporadas antes de uso em produção.
