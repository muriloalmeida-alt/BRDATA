# Touchline · Recalibração da economia do Modo Carreira

Proposta para execução pelo Claude · 25/11/2026

## Objetivo

Fazer folha, preços, receitas e capacidade de compra refletirem a liga, a divisão e o clube. A mesma qualidade esportiva pode ter salários e condições de transferência distintos. Jogador e CPU usam a mesma regra de viabilidade financeira e critérios equivalentes de negociação. Na interface, o treinador decide com poucos números e pode abrir os detalhes quando precisar.

## Ponto de partida no repositório

Use a versão atual de `muriloalmeida-alt/BRDATA` e registre o SHA no PR. A auditoria de referência usou `de4dff5`, M7. Nessa versão, a moeda estrangeira é uma conversão de apresentação e o porte financeiro ajusta uma escala-base comum orientada pelo overall. O handoff cita tetos mensais ingleses de £170–250 mil, incompatíveis com o patamar observado para clubes da Premier League. Verifique o que já foi incorporado à M8–M10 antes de escolher a integração.

| Módulo a conferir | Responsabilidade |
|---|---|
| `public/js/motor/carga.js`, `carreiramundo.js`, `virada.js`, `viradapais.js` | Criação, carga, acesso, queda e troca de clube ou país |
| `public/js/motor/financas.js`, `semana.js`, `estado.js` | Caixa, folha, prazos, receitas recorrentes e estado financeiro |
| `public/js/motor/mercado.js`, `negociacao.js` | Valor, proposta, contraproposta, limite do comprador e decisões da CPU |
| `public/js/motor/texto.js`, `carreira-v2/src/screens/Market.tsx`, `Finance.tsx` | Moeda de apresentação e impacto financeiro para o treinador |
| `server/frozen-catalog/mundo/`, `docs/mundo/`, `tests/sim/` | Catálogo local, fontes existentes e simulação de várias temporadas |

Reutilize catálogo, lançamentos, histórico, cache e regras MUNDO existentes. Faça a busca pelos consumidores reais antes de mudar campos e confirme o build versionado da v2 quando a interface mudar.

## Referências para calibração

Use os valores abaixo como âncoras. Preserve ano, moeda, recorte e natureza de cada número. Para cada parâmetro do catálogo, registre fonte, período, unidade, item medido, transformação aplicada e confiança. Use as categorias **publicado**, **estimado** e **imputado**. Receitas excepcionais, vendas de jogadores e aportes ficam fora da base recorrente. Folha-base de atletas, custo trabalhista do elenco e custo total de futebol têm escopos diferentes.

| Mercado | Âncora publicada ou estimada |
|---|---|
| Premier League | Deloitte 2024/25, £6,8 bi de receita e £4,4 bi em custo salarial dos clubes. Arsenal 2025/26, £189,3 mi anuais em salários-base estimados no FBref/Capology. Use o primeiro como agregado contábil e o segundo para a escala de elenco. |
| Championship | Deloitte 2024/25, £942 mi de receita total na divisão e £436 mi de prejuízo operacional. Separe recém-rebaixados que recebem pagamentos de transição. |
| Alemanha e Espanha | Bundesliga 2024/25, €4,3 bi de receita e €2,3 bi em custo salarial. LaLiga, €4,1 bi de receita, com aproximadamente 52% concentrados em Real Madrid e Barcelona. |
| Portugal | Benfica SAD 2024/25, €230,6 mi de rendimentos sem direitos de atletas e €348 mi com direitos. Pavlidis, €2,88 mi anuais de salário fixo bruto estimado em 2026/27. São referências de clube de ponta. |
| Brasil | Sports Value 2025, R$15 bi de receita entre os 20 maiores, incluindo mais de R$4 bi em transferências. Flamengo e Mirassol faturaram R$2,09 bi e R$180 mi. Folhas mensais apuradas pelo ge em 2026: Flamengo R$37,5 mi, Palmeiras R$30 mi, Bahia R$14 mi, Mirassol R$6 mi. Use as fontes em seus respectivos recortes. |
| Argentina, Uruguai e demais ligas | River com US$217,7 mi de faturamento anual reportado pelo ge, incluindo Mundial e vendas. No Peñarol, US$9,5 mi de sócios e US$5,5 mi de TV como âncoras de 2025. Na Colômbia, use Supersociedades para receitas e custos. Para as demais divisões, use o catálogo atual, fontes locais disponíveis e faixas imputadas explícitas quando faltarem contas comparáveis. |
| Mercado internacional | FIFA 2025, 56,5% das transferências masculinas internacionais **com taxa** até US$500 mil, 67,4% até US$1 mi e 3,8% acima de US$20 mi. Compras/vendas, em US$ mi: Inglaterra 3.821/1.775, Portugal 498/753, Brasil 433/689, Argentina 133/220. Use como referência de distribuição e direção de fluxos, sem impor a mesma proporção ao mercado doméstico. |

Use os negócios como testes de plausibilidade, com margem para casos semelhantes. Isak £125 mi, Paquetá €42 mi, Erick Pulga US$3 mi de custo com US$2 mi para o Ceará, Mastantuono €45 mi líquidos para o River, Leo Fernández US$7 mi por 80%. Esses casos representam diferentes portes e preços, sem funcionar como valores padrão de catálogo.

## Entrega 1 · Receitas, folha e capacidade de compra

1. Inventarie as ligas e divisões jogáveis no SHA de execução. Versione um perfil econômico por liga/divisão com valores em moeda de referência e período uniforme. Use dados de clube quando houver e uma faixa por porte como fallback. Dê tratamento explícito a clubes de topo, promovidos, recém-rebaixados e clubes com poucos dados. Reutilize IDs estáveis do catálogo. Gere os resultados imputados de forma determinística e mantenha o catálogo fora de cada save.
2. Inicialize separadamente receita recorrente, folha do elenco, despesas operacionais, caixa inicial, obrigações e orçamento disponível. Receita anual e saldo inicial são grandezas distintas. Modele TV, patrocínio, sócios e bilheteria só até o nível que altera decisões. Evite contabilizar a mesma verba como receita recorrente e premiação. Atribua distribuição continental pelo evento, fase e temporada já resolvidos pelo motor de competições. Use os valores da edição configurada.
3. Defina a capacidade real de compra pelo mínimo entre orçamento disponível, espaço de caixa para o pagamento imediato e capacidade de assumir parcelas futuras. Calcule o espaço de folha com contratos e compromissos já assumidos. Considere créditos de venda apenas no período em que entram, usando a regra atual para compromissos existentes. Uma venda pode liberar espaço de folha sem pagar toda a taxa ao vendedor no ato.
4. Normalize valores em uma única unidade interna, compatível com a arquitetura vigente. Converta na entrada do catálogo e na apresentação. Faça o arredondamento financeiro uma vez na fronteira da operação. Garanta que a mesma transação produza o mesmo resultado financeiro em qualquer tela.
5. Ao subir ou cair, mude os fluxos futuros pela regra da divisão e da temporada seguinte. Preserve contratos, caixa e obrigações. Ao trocar de clube ou país, mantenha as contas ligadas ao clube de origem. A primeira fase termina com um quadro de receitas, folha e caixa por perfil, antes de recalibrar preços de jogadores.

## Entrega 2 · Preços, salários e negociação

- Separe **valor estimado**, **preço de reserva do vendedor** e **remuneração desejada**. Use overall como sinal de qualidade. Acrescente idade, potencial, tempo de contrato e demanda à estimativa. Para o vendedor, considere papel no elenco, cobertura da posição, disposição de vender e custo de reposição. Para o atleta, considere papel oferecido, nível e porte do destino, salário e contexto do contrato.
- Calibre a distribuição com operações pequenas e poucas compras grandes. Um clube menor pode disputar um titular de clube maior quando houver contexto favorável. Preço acima da capacidade do comprador, falta de cobertura ou recusa do atleta devem bloquear pelos motivos correspondentes. Preserve caminhos viáveis para empréstimos, jogadores livres e atletas em fim de contrato. Use os fluxos e componentes de custo disponíveis no motor. Documente eventual lacuna de modelagem antes de acrescentar mecânica nova.
- Use a mesma avaliação financeira em compra do treinador e da CPU. Na conclusão, atualize caixa, parcelas, salário, titularidade e histórico como uma operação coerente. Recarregar ou repetir o processamento deve conservar uma única operação, incluindo opção de compra e retorno de empréstimo nos fluxos já existentes.
- Mantenha o mundo leve por lote de decisões e recorte de mercado existentes. Carregue detalhes quando necessário. Evite varredura global por atleta a cada rodada.

## Entrega 3 · Interface de decisão e compatibilidade

Na proposta, mostre **Paga agora**, **Custo mensal** e **Caixa após o pagamento inicial**. Se houver parcela, indique o compromisso total abaixo ou em **Editar condições**. Exponha a restrição concreta quando houver bloqueio, como falta de caixa para a primeira parcela ou estouro do teto salarial. Em Finanças, priorize espaço de folha e parcelas próximas. Use o formatador de moeda compartilhado no Mercado, em Finanças e nas confirmações. Reaproveite a navegação da v2.

Sugestão de rollout para validação em homologação: aplicar o catálogo revisado primeiro a **novas carreiras**, mantendo uma versão explícita da regra econômica no save. Carreiras antigas preservam moeda interna, saldos, salários, parcelas, recebíveis, histórico e dados do clube. Se houver migração posterior, simule em cópia, explicite o que muda e torne a migração idempotente. Teste abrir, jogar, salvar, reabrir e virar temporada em saves brasileiros e internacionais já existentes.

## Validação e aceite

Reaproveite os testes de finanças, mercado, paridade, persistência e mudança de temporada. Acrescente testes direcionados onde a cobertura existente não detectar uma regressão. Faça baseline e comparação com a mesma seed e máquina, por cinco temporadas. Mantenha a simulação longa sob demanda, fora da rota rápida.

| Cenário | Aceite |
|---|---|
| Brasil | Compare elite, meio de tabela e clube de menor folha. Mostre inicialização e fechamento da temporada por perfil, com as diferenças de ordem de grandeza preservadas. |
| Europa | Compare um clube de topo da Premier League, um recém-rebaixado do Championship e um grande português. Mostre comportamento de folha, receitas, acesso/rebaixamento e capacidade de compra. |
| América do Sul | Compare clube grande argentino, uruguaio e clube de liga com dados menos completos. Rode com e sem continental e com uma janela sem vendas. Registre premiação efetivamente creditada e o efeito no caixa. |
| Mercado | Reproduza compra doméstica, internacional, agente livre e empréstimo. Cubra recusa do atleta, falta de caixa, teto salarial e reprocessamento. Compare preço fixo, parcelas, custo do salário e créditos dos vendedores. |
| Estabilidade | Por temporada, entregue distribuição de folha, receita recorrente e eventual, saldo, déficit, compra/venda por valor e quantidade, agentes livres e progressão de temporada. Explique extremos, inflação do mercado e clubes que acumulam caixa sem causa identificável. |
| Desempenho e save | Compare p50/p95 de rodada e virada, tamanho JSON/gzip e tempo de reabertura. Registre valores brutos e desvios. Investigue regressões consistentes antes da liberação e valide o caminho de save grande em navegador sem compressão quando esse caminho for suportado. |
| Mobile | No iPhone, confirme legibilidade, valores nas respectivas moedas e oferta com impacto financeiro visível antes de enviar. |

Entregue em PRs pequenos na ordem **base financeira → mercado → interface e validação**. Em cada PR, informe SHA, arquivos, decisões, fontes, resultados antes/depois, casos não confirmados e comandos para reproduzir. A entrega termina com catálogo versionado, regras compartilhadas entre CPU e jogador, resumo de cinco temporadas e evidência de compatibilidade de saves em homologação.

## Fontes de referência

- [FIFA · Global Transfer Report 2025](https://inside.fifa.com/transfer-system/transfer-reports?tab=Men%27s+global+transfer+report+2025)
- [Deloitte · Premier League](https://www.deloitte.com/uk/en/services/consulting/research/annual-review-of-football-finance-premier-league-clubs.html) · [Demais grandes ligas europeias](https://www.deloitte.com/uk/en/services/consulting/research/annual-review-of-football-finance-europe-premier-league.html) · [Championship](https://www.deloitte.com/uk/en/services/consulting/research/annual-review-of-football-finance-football-league-clubs.html)
- [FBref/Capology · Folhas inglesas 2025/26](https://fbref.com/en/comps/9/2025-2026/wages/2025-2026-Premier-League-Wages) · [Benfica SAD · Relatório 2024/25](https://media.slbenfica.pt/-/media/BenficaDP/Images/Instituicao/SAD/prestacao-de-contas/anuais/20251001-relatorio-contas-24-25) · [Capology · Pavlidis](https://www.capology.com/player/vangelis-pavlidis-36120/)
- [Sports Value · Finanças dos clubes brasileiros em 2025](https://www.sportsvalue.com.br/wp-content/uploads/2026/05/Financas-clubes-2025-Publicado-em-maio-de-2026-1.pdf) · [ge · Folhas da Série A em 2026](https://ge.globo.com/sp/futebol/noticia/2026/10/14/quanto-seu-time-gasta-com-salarios-veja-ranking-e-entenda-por-que-e-tao-dificil-responder.ghtml)
- [ge · Finanças do River](https://ge.globo.com/futebol/futebol-internacional/noticia/2026/08/07/entenda-como-o-river-plate-virou-potencia-financeira-da-america-e-conseguiu-contratar-almada.ghtml) · [El País · Orçamento do Peñarol](https://www.elpais.com.uy/ovacion/futbol/los-millones-que-invirtio-penarol-para-2025-cuanto-dinero-recibio-por-ventas-y-por-que-puso-la-vara-alta) · [Supersociedades · Futebol colombiano](https://www.supersociedades.gov.co/informe-sobre-el-comportamiento-financiero-del-futbol-profesional-colombiano-2025)
- [UEFA · Distribuição 2025/26](https://editorial.uefa.com/resources/029a-1e0b5460b86d-31e6cad26358-1000/20250616_circular_2025_32_en.pdf) · [AFA/CONMEBOL · Libertadores 2026](https://www.afa.com.ar/11747/posts/la-copa-libertadores-incrementa-sus-premios-para-la-edicion-2026)
- [BBC · Isak](https://www.bbc.co.uk/sport/football/articles/cly4my21lz7o) · [ge · Paquetá](https://ge.globo.com/futebol/times/flamengo/noticia/2026/01/29/entenda-como-o-flamengo-conseguiu-fazer-investimento-recorde-para-contratar-paqueta.ghtml) · [ge · Erick Pulga](https://ge.globo.com/ce/futebol/times/ceara/noticia/2025/01/12/veja-o-top-5-de-maiores-transacoes-da-historia-do-ceara.ghtml) · [River · Mastantuono](https://www.somosriver.com/novedades/ejecuci-n-de-cl-usula-de-rescisi-n-franco-mastantuono) · [APU · Leo Fernández](https://www.apu.uy/noticias/penarol-incrementa-cuotas-sociales-para-financiar-la-continuidad-de-leo-fernandez)
