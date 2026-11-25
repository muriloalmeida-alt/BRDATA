# Touchline — Implementação do mercado e da economia do Modo Carreira

Handoff para o Claude · 25/11/2026

## Objetivo

Calibrar salários, orçamentos e transferências conforme liga, divisão e clube. Clubes menores precisam conseguir melhorar o elenco com compras definitivas e empréstimos plausíveis. A mesma avaliação financeira e os mesmos critérios de negociação valem para treinador e CPU.

Este documento detalha as regras de mercado da proposta econômica anterior. As faixas numéricas são parâmetros iniciais de balanceamento e devem ficar em configuração versionada.

## Integração

Trabalhe no repositório `muriloalmeida-alt/BRDATA`. Identifique o SHA da implementação e confirme os pontos de entrada no código atual. Na auditoria anterior, os candidatos eram `public/js/motor/{financas,semana,estado,mercado,negociacao,carga,carreiramundo,virada,viradapais}.js`, `carreira-v2/src/screens/{Market,Finance}.tsx`, `server/frozen-catalog/mundo/` e `tests/sim/`. Reuse fluxos, lançamentos, catálogo, cache, moeda interna e formatador já adotados. Confira os consumidores e o build versionado antes de alterar telas.

## 1. Valor de mercado inicial por atleta

1. Use uma avaliação individual confiável, positiva e atual para a temporada do catálogo, com fonte, data e moeda explícitas. Use a avaliação válida mais recente disponível até a data de referência do catálogo. Uma taxa de transferência histórica serve como referência de calibração.
2. Na ausência de avaliação individual válida, aplique `valor = referência da liga/divisão de origem × qualidade × idade e potencial`. Use a liga do clube detentor dos direitos na abertura da carreira, inclusive para atletas cedidos. Para livre com histórico, use a última liga conhecida. Para livre ou fictício sem histórico, use a divisão à qual o catálogo de origem o atribui. Quando esse vínculo também faltar, exija um perfil de fallback explícito no catálogo da carreira.
3. Converta para a unidade monetária interna e arredonde uma vez na fronteira de persistência. Grave a avaliação inicial e o valor corrente no nascimento do atleta no save. A mesma versão de catálogo e as mesmas entradas devem gerar o mesmo resultado.
4. Use o valor corrente nas janelas. Aplique a regra a novos atletas quando entrarem no mundo. Jovens, jogadores de divisões menores e fictícios devem ter avaliação desde que se tornam negociáveis.

| Liga ou divisão | Referência em EUR para overall 75 |
|---|---:|
| Premier League | 15.000.000 |
| LaLiga | 8.000.000 |
| Bundesliga | 8.000.000 |
| Serie A italiana | 8.000.000 |
| Ligue 1 | 8.000.000 |
| Championship | 4.000.000 |
| Primeira divisão portuguesa | 4.000.000 |
| Brasileirão Série A | 2.500.000 |
| Primeira divisão argentina | 1.800.000 |
| Brasileirão Série B | 900.000 |
| Primeira divisão uruguaia | 700.000 |
| Brasileirão Série C | 350.000 |

Complete as demais ligas e divisões jogáveis com referências próprias ou fallback explícito por mercado comparável. Registre a procedência de cada valor como publicado, estimado ou imputado, com temporada, moeda, unidade e transformação aplicada.

| Overall | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Qualidade | 0,02 | 0,05 | 0,12 | 0,25 | 0,55 | 1,00 | 1,90 | 3,80 | 6,50 | 10,00 |

Interpole linearmente entre os pontos. Para a primeira calibração, use os multiplicadores das extremidades fora da tabela. Sem potencial conhecido, trate a diferença para o overall como zero.

| Idade | Multiplicador |
|---|---:|
| Até 23 | `min(1,60; 0,80 + 0,04 × max(0; potencial − overall))` |
| 24 a 28 | 1,00 |
| 29 a 31 | 0,80 |
| 32 a 34 | 0,55 |
| 35 ou mais | 0,30 |

Para goleiros, desloque as faixas de auge e declínio em dois anos. Assim, a faixa jovem vai até 25, o auge vai de 26 a 30 e o declínio começa aos 31.

| Caso de referência sem avaliação individual | Resultado em EUR |
|---|---:|
| Premier League, 26 anos, overall 85 | 57.000.000 |
| Série A brasileira, 26 anos, overall 80 | 4.750.000 |
| Série B brasileira, 20 anos, overall 70, potencial 85 | 693.000 |
| Série A brasileira, 33 anos, overall 75, jogador de linha | 1.375.000 |

Na virada de janela, atualize o valor corrente a partir de evolução, idade, minutos e desempenho. Para preservar a escala do atleta entre janelas, use o valor anterior multiplicado pela razão entre os multiplicadores individuais atuais e anteriores, com ajuste de minutos e desempenho calibrado em simulação. Quando faltar amostra esportiva, use ajuste neutro. Guarde os fatores da janela anterior e processe cada janela uma vez. Transferência, promoção e rebaixamento por si só preservam a avaliação. O porte do clube e a importância do jogador entram na pedida do vendedor.

## 2. Base financeira do clube

- Inicialize caixa, receita recorrente anual, despesas operacionais, folha contratada e parcelas separadamente. Use dados de clube quando houver e faixas por liga, divisão e porte como fallback. Use a mesma unidade monetária para avaliar a operação inteira e mostre a moeda do clube com o formatador comum.
- TV, patrocínio, sócios e bilheteria sustentam a receita recorrente. Premiações, vendas e aportes afetam o caixa quando recebidos. Inclua recebíveis firmes na projeção no mês em que vencem. Evite que vendas especulativas ou classificações futuras financiem compromissos atuais.
- Configure uma faixa-alvo de 45% a 60% da receita recorrente anual para o custo do elenco, ajustada por liga e perfil financeiro. Calcule o espaço para novas ofertas considerando encargos e compromissos existentes, inclusive propostas vinculantes e participações salariais em empréstimos.
- Uma operação precisa caber no orçamento de transferências, manter no caixa a reserva de um mês de despesas essenciais após a entrada, deixar o fluxo mensal sustentável ao longo do compromisso e respeitar o espaço de folha. Inclua entradas, parcelas, luvas e comissões nas datas de pagamento. Em clubes já acima do limite, uma nova contratação onerosa exige liberar espaço suficiente para enquadrar o saldo projetado.
- Acesso e queda alteram os fluxos futuros da divisão. Caixa, contratos e parcelas seguem vinculados ao clube. Receitas continentais entram conforme os eventos do calendário já processados pelo motor.

## 3. Compra, salário e decisão

**Valor de mercado, pedida e custo final são campos distintos.** O mercado usa a avaliação corrente como referência. O vendedor usa papel do atleta, prazo restante, demanda, profundidade do elenco, situação financeira e custo de reposição para decidir a pedida e se aceita negociar. O atleta avalia separadamente salário, papel, nível do destino e contexto contratual.

| Operação | Parâmetro inicial |
|---|---|
| Jovem com mercado | Pedida de 80% a 130% da avaliação, conforme contexto |
| Titular-chave com contrato longo | Pedida de 130% a 180%. Se faltar cobertura ou reposição plausível, o vendedor pode recusar |
| Parcelamento | Entrada de 20% a 40% como faixa inicial de oferta parcelada. Saldo em até 24 meses quando o vendedor aceitar e o fluxo comportar. Permita entrada maior e pagamento à vista |
| Percentual de revenda | 10% a 20% da próxima venda como contrapartida por taxa fixa menor quando o vendedor aceitar. Persista e liquide uma vez na próxima venda onerosa, sobre a taxa fixa acordada, proporcionalmente a cada recebimento |
| Livre ou em fim de contrato | Taxa ao clube anterior zero quando livre. Negocie salário, luvas e comissão e use a elegibilidade de pré-contrato já suportada pelo jogo |

Preencha o catálogo salarial com faixas por divisão e papel (jovem, reserva, titular e destaque). Priorize salários individuais confiáveis na inicialização. Preserve o salário vigente dos atletas já contratados. Para novas ofertas, considere faixa do destino, remuneração atual, minutos esperados, papel oferecido e situação contratual. Um veterano livre pode aceitar redução salarial por estabilidade. Um titular pode recusar uma proposta financeiramente viável para o comprador.

## 4. Empréstimos

| Modalidade | Regra inicial |
|---|---|
| Desenvolvimento | Clube de destino paga 20% a 50% do salário. O clube de origem pondera idade, potencial, espaço atual, cobertura e minutos prováveis no destino. Estime minutos pela concorrência real na posição |
| Atleta fora dos planos | Destino paga 50% a 100% do salário. Taxa de empréstimo pode cair conforme o destino assume mais salário. Inclua ambos no fluxo financeiro |
| Opção de compra | Fixe a taxa na assinatura. Na execução, revalide caixa, folha, parcelas, elegibilidade e acordo salarial quando necessário |
| Obrigação de compra | Registre o compromisso futuro ao assinar e valide a projeção incluindo custo de aquisição e de folha aplicável |

Valide elegibilidade e janela conforme o motor. Na vigência, cada clube arca com sua parcela da folha. No retorno ou conversão em compra, encerre a divisão salarial e aplique o estado contratual correspondente. O atleta mantém vínculo com o clube de origem até a compra ser concluída.

## 5. Fluxo e experiência mobile

Centralize a avaliação de ofertas em um caminho compartilhado por CPU e treinador. Em cada oferta, verifique elegibilidade, posição do vendedor, interesse do jogador e capacidade financeira. Ao concluir, revalide o estado atual e aplique uma única transação coerente para vínculo, elenco, caixa, parcelas, salário e histórico. Evite que propostas concorrentes consumam a mesma verba ou que reprocessar a semana duplique pagamentos. A CPU deve buscar alternativas compatíveis quando uma oferta falhar, reutilizando seu recorte atual de mercado.

No card do atleta, mostre **Valor de mercado**. Na oferta, mostre **Paga agora**, **Custo mensal total** e **Compromisso total**. O custo mensal inclui folha e parcelas ativas no mês apresentado. Quando variar, o detalhamento mostra período e valores. No empréstimo, o compromisso contratado inclui taxa, salário assumido e obrigação de compra aplicável. Mostre a opção facultativa separadamente. Reuse o fluxo do Mercado da v2 e mantenha detalhes em **Editar condições**. Quando bloquear, mostre o motivo concreto e, se possível, a diferença financeira.

## 6. Ordem de implementação e aceite

1. Versione o catálogo inicial de ligas, clubes, salários e referência de atleta. Acrescente a avaliação na criação da carreira e nos fluxos de geração de jogadores.
2. Integre caixa, folha, parcelas, pedidas e avaliação de oferta. Aplique a mesma lógica à CPU.
3. Integre compra definitiva, agente livre e empréstimos. Valide persistência e idempotência.
4. Atualize Mercado e Finanças da v2 e valide no iPhone ou em viewport mobile com evidência.
5. Compare cinco temporadas com a mesma seed e ambiente. Execute a simulação longa sob demanda, fora da suíte rápida. Registre volume e distribuição de negócios, folha, caixa, déficits, evolução de clubes pequenos e tempo de processamento e virada.

| Cenário | Aceite |
|---|---|
| Inicialização | Reproduzir os quatro valores da tabela em moeda de referência. Cobrir avaliação individual, fallback, interpolação, goleiro, livre e fictício |
| Diferença entre mercados | Comparar clubes grandes e pequenos da mesma divisão e clubes de ligas distintas. Verificar folha, receita, orçamento e caixa separadamente |
| Janela de um clube pequeno | Com R$ 1,2 mi livres para entrada, R$ 70 mil/mês para parcelas e R$ 130 mil/mês de folha, aprovar compra de R$ 2,4 mi com R$ 900 mil agora, 24 parcelas de R$ 62,5 mil e custo de elenco de R$ 75 mil/mês. Aprovar também empréstimo sem taxa com 30% de R$ 100 mil/mês. Saldo esperado de R$ 300 mil para entrada, R$ 7,5 mil/mês para parcelas e R$ 25 mil/mês de folha |
| Restrição esportiva | Titular-chave sem cobertura recusa saída. Jovem excedente com minutos projetados pode sair por empréstimo. Atleta pode rejeitar condições mesmo com o clube vendedor de acordo |
| Restrição financeira | Bloquear compra com caixa inicial insuficiente, déficit futuro, falta de folha ou excesso de orçamento. Aplicar a mesma decisão à CPU |
| Empréstimos, vendas e persistência | Cobrir retorno, opção, obrigação, percentual de revenda e reprocessamento. Reabrir save entre assinatura e pagamento, sem duplicar lançamentos |
| Evolução e ciclo de carreira | Mostrar compra e empréstimo úteis para clubes menores ao longo de cinco temporadas. Confirmar que acesso, rebaixamento ou mudança de clube preservam avaliação e contratos no momento do evento |
| Compatibilidade | Aplicar a nova economia primeiro a novas carreiras com versão explícita. Carreiras existentes preservam valores, saldos, contratos, parcelas e histórico. Validar abertura, jogo, save, reabertura e virada em carreiras brasileiras e internacionais |

Entregue o catálogo versionado, a implementação compartilhada, evidências de testes e o comparativo de simulação. Identifique o SHA, faixas ajustadas e seus motivos, ligas com valores imputados e comandos para reproduzir. Reaproveite a cobertura existente e acrescente testes direcionados para os novos comportamentos.

## Referências de calibração

- [FIFA · Global Transfer Report 2025](https://inside.fifa.com/transfer-system/transfer-reports?tab=Men%27s+global+transfer+report+2025)
- [Deloitte · Premier League 2024/25](https://www.deloitte.com/uk/en/services/consulting/research/annual-review-of-football-finance-premier-league-clubs.html)
- [Deloitte · As cinco grandes ligas europeias](https://www.deloitte.com/uk/en/services/consulting/research/annual-review-of-football-finance-europe-premier-league.html)
- [Sports Value · Clubes brasileiros em 2025](https://www.sportsvalue.com.br/case-studies/financas-top-20-clubes-brasileiros-em-2025-em-busca-do-crescimento-financeiro-sustentavel/)
- [Touchline · Proposta econômica anterior](https://chatgpt.com/library?file_id=libfile_1f263b828d808191b308757e4d1c4881&account_id=personal)
