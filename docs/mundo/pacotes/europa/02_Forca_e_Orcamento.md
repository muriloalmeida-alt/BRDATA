# Força e orçamento

O pacote guarda força e orçamento por clube. A força usa resultados da liga. O orçamento é um ponto de partida para a economia do jogo. A planilha mantém os benchmarks observados separados das estimativas.

## Força inicial

A classificação de referência fornece jogos, gols pró e gols contra. Usei a tabela ESPN da divisão na temporada 2026/27 e, quando o mesmo clube disputou aquela divisão em 2025/26, até oito partidas equivalentes da média anterior. Acrescentei dez partidas equivalentes na média atual da liga para reduzir o peso de uma sequência curta. Assim um recém-promovido sem dados anteriores na nova divisão recebe a mesma regularização pela média.

- `atk` divide os gols pró ajustados pela média de gols por clube e por partida na divisão. Maior indica melhor ataque.
- `def` faz o cálculo com gols sofridos. Menor indica melhor defesa. Ambos os fatores dos 198 clubes ficam entre 0,62 e 1,65.
- `index` é a nota de referência, derivada da diferença entre os fatores e do nível da divisão. `gameplayLevel` é um parâmetro de balanceamento escolhido para o jogo, sem pretensão de representar uma classificação oficial.
- A terceira divisão usa a mesma ideia de regularização, com a tabela do próprio grupo, DFB, ESPN ou FotMob. O número serve à materialização do clube e aos playoffs entre divisões. A escolha dos promovidos continua seguindo o sorteio da regra atual.

Use a taxa de gols como parâmetro de volume ofensivo do campeonato. No BRDATA, o código atual calcula força por classificação e sobrescreve `atk` e `def` recebidos. A integração deve dar precedência à força calibrada do catálogo europeu e manter o cálculo atual para saves brasileiros. [Normalização atual](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/carga.js#L156-L174)

## Referências financeiras observadas

| Mercado | Referência | Fonte |
|---|---:|---|
| Premier League | £6,8 bilhões de receitas e £3,4 bilhões de transmissão em 2024/25 | [Deloitte](https://www.deloitte.com/uk/en/about/press-room/european-football-revenues-surpass-40bn-for-the-first-time.html) |
| Championship | £942 milhões de receitas e £903 milhões de custo salarial em 2024/25 | [Deloitte](https://www.deloitte.com/uk/en/about/press-room/european-football-revenues-surpass-40bn-for-the-first-time.html) |
| LaLiga | €4,1 bilhões de receitas em 2024/25 | [Deloitte](https://www.deloitte.com/uk/en/about/press-room/european-football-revenues-surpass-40bn-for-the-first-time.html) |
| LaLiga Hypermotion | Contas agregadas próprias e limites de custo de plantel publicados por clube | [Informe econômico LaLiga](https://assets.laliga.com/assets/2026/03/18/originals/5658090da03d3a5134540accdc341c89.pdf) · [Limites de plantel](https://www.laliga.com/transparencia/gestion-economica/limite-coste-plantilla) |
| Serie A e Serie B | €3 bilhões de receitas agregadas da A em 2024/25. ReportCalcio como referência complementar da B | [Deloitte](https://www.deloitte.com/uk/en/about/press-room/european-football-revenues-surpass-40bn-for-the-first-time.html) · [ReportCalcio FIGC](https://www.figc.it/media/277126/report-calcio-2025.pdf) |
| Bundesliga e 2. Bundesliga | €5,123 bilhões e €1,209 bilhão, respectivamente, na definição de receita total da DFL de 2024/25 | [DFL](https://report.dfl.de/2425/en/_assets/downloads/entire-dfl-er25.pdf?h=t5VA6-_4) |
| Ligue 1 e Ligue 2 | €2,2 bilhões de receitas da Ligue 1 em 2024/25. Contas DNCG como referência complementar da Ligue 2 | [Deloitte](https://www.deloitte.com/uk/en/about/press-room/european-football-revenues-surpass-40bn-for-the-first-time.html) · [DNCG](https://www.sta.lfp.fr/reports-dncg) |

Os conceitos de receita podem divergir entre os relatórios, especialmente no tratamento de transferências. Os tetos espanhóis incluem custos de pessoal, aquisições, amortizações e outros componentes. A receita do clube inclui compromissos e despesas que não viram verba de transferências. Os valores do Transfermarkt ajudam a distinguir o porte dos elencos da primeira divisão e não representam dinheiro disponível. [UEFA, panorama financeiro](https://ecfil.uefa.com/) · [Retrato dos valores de mercado](https://huggingface.co/datasets/minmaxxxer/transfermarkt-player-market-values-2026-11)

## Aplicação ao jogo

1. A receita operacional de referência é uma base por divisão em GBP ou EUR, ponderada por porte do estádio, força e valor do elenco quando há cobertura. Nas segundas divisões, a estimativa usa estádio e força. A fórmula comprime as diferenças entre clubes para manter jogo e mercado viáveis.
2. A folha-alvo mensal vale 54% da receita anual estimada, dividida por 12. O teto mensal vale 118% da folha-alvo. O caixa inicial equivale a três folhas mensais. A parcela destinada a transferências é 65% desse caixa e funciona como limite de gasto dentro dele. A verba não é somada como uma entrada no extrato.
3. TV mensal, meta sazonal de bilheteria e reserva de premiação vêm no seed. Bilheteria entra por partida em casa. Compense a verba de TV que hoje é sintetizada para fechar o calendário brasileiro. No novo fluxo, lance a TV uma vez por mês. Receita anual de referência é a base de planejamento, sem crédito integral no primeiro mês. A reserva de prêmio limita a premiação do modelo e não é renda garantida.
4. Calcule o salário preliminar de todos os jogadores do elenco principal pela regra atual. Para criar a carreira, aplique em cada clube um fator único que ajuste a soma à folha-alvo, preservando a distribuição interna. Congele o fator de moeda/divisão usado por salário justo e propostas para técnicos e CPU. Use a mesma economia nas duas pontas de cada negociação.
5. A moeda do save deve ficar estável. A Inglaterra usa GBP e os demais países usam EUR. O Brasil continua com BRL nos saves legados. A data de contrato precisa usar o fim da temporada, por exemplo junho de 2029 para um acordo que cobre três temporadas a partir de 2026/27, sem fechar em dezembro.
6. Na virada, ajuste receitas à nova divisão, com transição para o clube recém-promovido ou rebaixado. Caixa, obrigações, elenco e acordos permanecem no mesmo clube. A contratação continua submetida a orçamento, folha e valor, inclusive para clubes CPU.

[Motor financeiro atual](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/financas.js#L19-L37)
