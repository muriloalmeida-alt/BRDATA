# ECON-001 · Entrega 1 · Quadro por perfil

Gerado por `tests/sim/economia_quadro.js` a partir do catálogo em `public/js/motor/economia.js` (versão 2 da regra econômica, período de referência 2024/25–2025/26). Valores anuais em R$ milhões (câmbio fixo do jogo: £ 1 = R$ 7,00; € 1 = R$ 6,00; US$ 1 = R$ 5,50), folha-base em R$ milhões por mês. Âncora = número de clube da proposta (publicado ou estimado).

A Entrega 1 não muda o jogo: o modelo entra nas carreiras novas com a recalibração dos preços (Entrega 2).

## Brasil

| Perfil | Receita recorrente/ano | Folha-base/mês | Despesas/ano | Resultado/ano | Caixa inicial | Orçamento de transferências | Origem |
|---|---:|---:|---:|---:|---:|---:|---|
| Flamengo (elite) | 2.090,0 | 37,5 | 1.535,5 | 104,5 | 313,5 | 141,1 | âncora |
| Palmeiras | 1.416,7 | 30,0 | 985,8 | 70,8 | 212,5 | 95,6 | âncora |
| Bahia (meio) | 803,5 | 14,0 | 595,3 | 40,2 | 120,5 | 54,2 | âncora |
| Mirassol (menor folha) | 180,0 | 6,0 | 99,0 | 9,0 | 27,0 | 12,2 | âncora |
| Maior da Série B | 217,5 | 9,1 | 97,9 | 10,9 | 32,6 | 14,7 | modelo |
| Promovido à Série A (1º ano) | 236,0 | 7,3 | 136,2 | 11,8 | 32,6 | 15,9 | modelo |

## Europa

| Perfil | Receita recorrente/ano | Folha-base/mês | Despesas/ano | Resultado/ano | Caixa inicial | Orçamento de transferências | Origem |
|---|---:|---:|---:|---:|---:|---:|---|
| Arsenal (topo da Premier League) | 4.441,0 | 110,4 | 2.982,7 | 133,2 | 666,2 | 266,5 | âncora |
| Recém-rebaixado à Championship (1º ano) (transição R$ 343,0 mi) | 899,7 | 34,7 | 573,5 | -90,0 | 242,2 | 54,0 | modelo |
| Southampton (Championship) | 453,3 | 28,2 | 159,8 | -45,3 | 68,0 | 27,2 | modelo |
| Real Madrid | 8.991,8 | 267,9 | 5.507,5 | 269,8 | 1.348,8 | 539,5 | modelo |
| Bayern | 5.084,9 | 147,3 | 3.164,5 | 152,5 | 762,7 | 305,1 | modelo |

## América do Sul

| Perfil | Receita recorrente/ano | Folha-base/mês | Despesas/ano | Resultado/ano | Caixa inicial | Orçamento de transferências | Origem |
|---|---:|---:|---:|---:|---:|---:|---|
| River Plate (grande argentino) | 660,0 | 24,8 | 363,0 | 0,0 | 99,0 | 39,6 | âncora |
| Peñarol (grande uruguaio) | 137,5 | 5,7 | 68,8 | 0,0 | 20,6 | 8,3 | âncora |
| Barcelona SC (liga com dados escassos) | 198,6 | 8,3 | 99,3 | 0,0 | 29,8 | 11,9 | modelo |

## Fontes do catálogo

| Liga | Item | Valor | Período | Tipo | Confiança | Fonte |
|---|---|---|---|---|---|---|
| premier_league | receita dos 20 clubes | GBP 6.800.000.000 | 2024/25 | publicado | alta | Deloitte, Annual Review of Football Finance 2025 |
| premier_league | custo salarial dos clubes (atletas e staff) | GBP 4.400.000.000 | 2024/25 | publicado | alta | Deloitte, Annual Review of Football Finance 2025 |
| premier_league | folha-base do elenco ÷ custo salarial | 0.62 | 2025/26 | imputado | media | Arsenal £189,3 mi de salários-base (FBref/Capology) contra o custo salarial médio da liga |
| premier_league | receita do maior ÷ menor clube | 4.5 | 2024/25 | imputado | media | ordem de grandeza das contas da Deloitte |
| premier_league | salários-base do elenco | GBP 189.300.000 | 2025/26 | estimado | media | FBref/Capology |
| efl_championship | receita total da divisão (inclui pagamentos de transição) | GBP 942.000.000 | 2024/25 | publicado | alta | Deloitte, Annual Review of Football Finance 2025 (Championship) |
| efl_championship | custo salarial ÷ receita (prejuízo operacional de £436 mi) | 1.15 | 2024/25 | imputado | media | Deloitte (prejuízo publicado); razão imputada |
| efl_championship | folha-base ÷ custo salarial | 0.65 | 2024/25 | imputado | baixa | mesma ordem da Premier League |
| efl_championship | maior ÷ menor (recém-rebaixados no topo) | 5 | 2024/25 | imputado | baixa | estrutura da divisão |
| efl_championship | resultado operacional ÷ receita no jogo | -0.1 | 2024/25 | imputado | media | a Deloitte publica −46% (prejuízo de £436 mi), coberto por aportes dos donos, que ficam fora da base recorrente |
| efl_championship | pagamento de transição, 1º ano após a queda | GBP 49.000.000 | 2025/26 | imputado | media | ordem de grandeza do parachute da Premier League |
| efl_championship | pagamento de transição, 2º ano | GBP 40.000.000 | 2025/26 | imputado | media | idem |
| bundesliga | receita da liga | EUR 4.300.000.000 | 2024/25 | publicado | alta | Deloitte / DFL 2024/25 |
| bundesliga | custo salarial | EUR 2.300.000.000 | 2024/25 | publicado | alta | Deloitte / DFL 2024/25 |
| bundesliga | folha-base ÷ custo salarial | 0.65 | 2024/25 | imputado | baixa | mesma ordem da Premier League |
| bundesliga | maior ÷ menor | 8 | 2024/25 | imputado | media | Bayern contra os menores |
| bundesliga_2 | receita da divisão | EUR 800.000.000 | 2024/25 | imputado | baixa | ordem de grandeza da 2. Bundesliga |
| bundesliga_2 | custo salarial ÷ receita | 0.5 | 2024/25 | imputado | baixa | — |
| bundesliga_2 | folha-base ÷ custo salarial | 0.7 | 2024/25 | imputado | baixa | — |
| bundesliga_2 | maior ÷ menor | 4 | 2024/25 | imputado | baixa | — |
| la_liga | receita da liga | EUR 4.100.000.000 | 2024/25 | publicado | alta | Deloitte 2025 (LaLiga) |
| la_liga | custo salarial ÷ receita | 0.55 | 2024/25 | imputado | media | — |
| la_liga | folha-base ÷ custo salarial | 0.65 | 2024/25 | imputado | baixa | — |
| la_liga | fatia de Real Madrid e Barcelona na receita | 0.52 | 2024/25 | publicado | alta | proposta ECON-001 (Deloitte) |
| laliga_hypermotion | receita da divisão | EUR 400.000.000 | 2024/25 | imputado | baixa | — |
| laliga_hypermotion | custo salarial ÷ receita | 0.6 | 2024/25 | imputado | baixa | — |
| laliga_hypermotion | folha-base ÷ custo salarial | 0.7 | 2024/25 | imputado | baixa | — |
| laliga_hypermotion | maior ÷ menor | 4 | 2024/25 | imputado | baixa | — |
| serie_a_italia | receita da liga | EUR 3.800.000.000 | 2023/24 | imputado | media | ordem de grandeza das contas da Deloitte (fora da proposta) |
| serie_a_italia | custo salarial ÷ receita | 0.6 | 2023/24 | imputado | media | — |
| serie_a_italia | folha-base ÷ custo salarial | 0.65 | 2023/24 | imputado | baixa | — |
| serie_a_italia | maior ÷ menor | 8 | 2023/24 | imputado | baixa | — |
| serie_b_italia | receita da divisão | EUR 350.000.000 | 2023/24 | imputado | baixa | — |
| serie_b_italia | custo salarial ÷ receita | 0.8 | 2023/24 | imputado | baixa | — |
| serie_b_italia | folha-base ÷ custo salarial | 0.7 | 2023/24 | imputado | baixa | — |
| serie_b_italia | maior ÷ menor | 4 | 2023/24 | imputado | baixa | — |
| ligue_1 | receita da liga | EUR 2.200.000.000 | 2023/24 | imputado | media | ordem de grandeza das contas da Deloitte (fora da proposta) |
| ligue_1 | custo salarial ÷ receita | 0.65 | 2023/24 | imputado | media | — |
| ligue_1 | folha-base ÷ custo salarial | 0.65 | 2023/24 | imputado | baixa | — |
| ligue_1 | maior ÷ menor (PSG muito acima) | 15 | 2023/24 | imputado | media | — |
| ligue_2 | receita da divisão | EUR 320.000.000 | 2023/24 | imputado | baixa | — |
| ligue_2 | custo salarial ÷ receita | 0.7 | 2023/24 | imputado | baixa | — |
| ligue_2 | folha-base ÷ custo salarial | 0.7 | 2023/24 | imputado | baixa | — |
| ligue_2 | maior ÷ menor | 4 | 2023/24 | imputado | baixa | — |
| brasileirao | receita recorrente dos 20 maiores (R$ 15 bi menos mais de R$ 4 bi de transferências) | BRL 11.000.000.000 | 2025 | estimado | media | Sports Value 2025 |
| brasileirao | Flamengo ÷ Mirassol (R$ 2,09 bi ÷ R$ 180 mi) | 11.6 | 2025 | publicado | media | Sports Value 2025 / ge |
| brasileirao | folha anual = a × (receita / r0)^b | {"a":450000000,"r0":2090000000,"b":0.748} | 2025–2026 | estimado | media | ajuste às folhas do ge 2026 e às receitas da Sports Value 2025 |
| brasileirao | receita | BRL 2.090.000.000 | 2025 | publicado | alta | Sports Value 2025 |
| brasileirao | folha mensal | BRL 37.500.000 | 2026 | estimado | media | ge, 14/10/2026 |
| brasileirao | folha mensal | BRL 30.000.000 | 2026 | estimado | media | ge, 14/10/2026 |
| brasileirao | folha mensal | BRL 14.000.000 | 2026 | estimado | media | ge, 14/10/2026 |
| brasileirao | receita | BRL 180.000.000 | 2025 | publicado | alta | Sports Value 2025 |
| brasileirao | folha mensal | BRL 6.000.000 | 2026 | estimado | media | ge, 14/10/2026 |
| serie_b | receita da divisão | BRL 1.400.000.000 | 2025 | imputado | baixa | ordem de grandeza (clubes de R$ 30 mi a R$ 200 mi) |
| serie_b | folha-base ÷ receita | 0.5 | 2025 | imputado | baixa | — |
| serie_b | maior ÷ menor | 6 | 2025 | imputado | baixa | — |
| serie_c | receita da divisão | BRL 350.000.000 | 2025 | imputado | baixa | — |
| serie_c | folha-base ÷ receita | 0.55 | 2025 | imputado | baixa | — |
| serie_c | maior ÷ menor | 5 | 2025 | imputado | baixa | — |
| arg_liga_profesional | receita recorrente da liga | USD 800.000.000 | 2025 | imputado | baixa | ordem de grandeza (River e Boca no topo) |
| arg_liga_profesional | folha-base ÷ receita | 0.45 | 2025 | imputado | baixa | — |
| arg_liga_profesional | maior ÷ menor | 20 | 2025 | imputado | baixa | — |
| arg_liga_profesional | receita recorrente (US$ 217,7 mi reportados incluem Mundial e vendas) | USD 120.000.000 | 2025 | imputado | media | ge, 07/08/2026, sem extraordinários |
| arg_primera_nacional | receita da divisão | USD 70.000.000 | 2025 | imputado | baixa | — |
| arg_primera_nacional | folha-base ÷ receita | 0.5 | 2025 | imputado | baixa | — |
| arg_primera_nacional | maior ÷ menor | 4 | 2025 | imputado | baixa | — |
| uru_primera | receita da liga | USD 90.000.000 | 2025 | imputado | baixa | ordem de grandeza (Peñarol e Nacional no topo) |
| uru_primera | folha-base ÷ receita | 0.5 | 2025 | imputado | baixa | — |
| uru_primera | maior ÷ menor | 15 | 2025 | imputado | baixa | — |
| uru_primera | receita recorrente (sócios US$ 9,5 mi e TV US$ 5,5 mi publicados; o resto imputado) | USD 25.000.000 | 2025 | imputado | media | El País (Uruguai), 2025 |
| uru_segunda | receita da divisão | USD 8.000.000 | 2025 | imputado | baixa | — |
| uru_segunda | folha-base ÷ receita | 0.55 | 2025 | imputado | baixa | — |
| uru_segunda | maior ÷ menor | 3 | 2025 | imputado | baixa | — |
| col_primera_a | receita da liga | USD 250.000.000 | 2025 | imputado | baixa | ordem de grandeza (Supersociedades sem os números nesta entrega) |
| col_primera_a | folha-base ÷ receita | 0.5 | 2025 | imputado | baixa | — |
| col_primera_a | maior ÷ menor | 10 | 2025 | imputado | baixa | — |
| col_primera_b | receita da divisão | USD 25.000.000 | 2025 | imputado | baixa | — |
| col_primera_b | folha-base ÷ receita | 0.55 | 2025 | imputado | baixa | — |
| col_primera_b | maior ÷ menor | 4 | 2025 | imputado | baixa | — |
| chi_liga_primera | receita da liga | USD 200.000.000 | 2025 | imputado | baixa | — |
| chi_liga_primera | folha-base ÷ receita | 0.5 | 2025 | imputado | baixa | — |
| chi_liga_primera | maior ÷ menor | 10 | 2025 | imputado | baixa | — |
| chi_liga_ascenso | receita da divisão | USD 20.000.000 | 2025 | imputado | baixa | — |
| chi_liga_ascenso | folha-base ÷ receita | 0.55 | 2025 | imputado | baixa | — |
| chi_liga_ascenso | maior ÷ menor | 4 | 2025 | imputado | baixa | — |
| ecu_ligapro_a | receita da liga | USD 150.000.000 | 2025 | imputado | baixa | — |
| ecu_ligapro_a | folha-base ÷ receita | 0.5 | 2025 | imputado | baixa | — |
| ecu_ligapro_a | maior ÷ menor | 10 | 2025 | imputado | baixa | — |
| ecu_ligapro_b | receita da divisão | USD 15.000.000 | 2025 | imputado | baixa | — |
| ecu_ligapro_b | folha-base ÷ receita | 0.55 | 2025 | imputado | baixa | — |
| ecu_ligapro_b | maior ÷ menor | 4 | 2025 | imputado | baixa | — |

## Regras imputadas

- Resultado operacional ÷ receita: {"europa":0.03,"brasil":0.05,"america_sul":0} (Championship: −10% no jogo; a Deloitte publica −46%, coberto por aportes, fora da base).
- Despesas mínimas: 12% da receita; caixa inicial: 15% da receita; orçamento: 6% da receita + 25% do caixa + 60% da sobra anual.
- Composição da receita (TV, comercial, jogo): {"europa":{"tv":0.5,"comercial":0.35,"jogo":0.15},"brasil":{"tv":0.4,"comercial":0.3,"jogo":0.3},"america_sul":{"tv":0.3,"comercial":0.3,"jogo":0.4}}.
- Distribuição na liga: lei de potência na posição financeira (ordem pelo porte do pacote; no Brasil, pela força), ajustada à concentração da liga; âncoras substituem e o resto é reescalado para manter o total.
