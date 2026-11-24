# BRDATA Sul-América 2026

Catálogo de integração ao Modo Carreira para Argentina, Chile, Colômbia, Equador e Uruguai. Temporada civil de 2026. Referências reunidas em 24/11/2026.

| País | Primeira | Segunda | Clubes no catálogo de reposição |
|---|---:|---:|---:|
| Argentina | 30 | 36 | 59 |
| Chile | 16 | 16 | 14 |
| Colômbia | 20 | 16 | 25 |
| Equador | 16 | 12 | 16 |
| Uruguai | 16 | 14 | 29 |
| **Total** | **98** | **94** | **143** |

O pacote inclui **192 clubes jogáveis, 6.659 jogadores, 3.392 partidas da temporada e 265 escudos locais**, dos quais 192 correspondem às divisões jogáveis. As partidas estão identificadas por competição, fase e rodada. As fases regulares e os grupos de pós-temporada com calendário completo foram validados. Chaves eliminatórias ainda em andamento e alguns jogos já disputados podem estar ausentes nas fontes. Em um save novo, gere os confrontos eliminatórios a partir dos classificados da simulação.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `BRDATA_Sul_America_2026.xlsx` | Planilha filtrável de ligas, clubes, jogadores, partidas, terceira divisão e economia. |
| `dados/ligas.json` | Regras de temporada, fases, participantes, promoção, descenso, fusos e janelas FIFA. |
| `dados/clubes.json` e `dados/elencos.json` | Cadastro, escudos, estádios quando verificados, origem dos jogadores, força e estimativas financeiras. Há também CSV. |
| `dados/partidas-2026.json` | Confrontos, datas, placares de referência e respectivas fontes. |
| `dados/tabelas-referencia.json`, `grupos-referencia.json` e `historico-tabelas.json` | Classificações de origem, composição observada por fase e 420 registros históricos para os promedios. |
| `dados/catalogo-terceira-divisao.json` | Reposição. Argentina, Chile e Uruguai usam a composição coletada. O Equador usa os 16 da fase nacional selecionada. A Colômbia inclui 25 representantes confirmados da Primera C para simulação opcional. |
| `dados/benchmarks-financeiros.json` e `referencias.json` | Parâmetros econômicos e fontes de calendário, regulamento e mercado. |
| `integracao/snapshots/` e `integracao/ids-motor.json` | Dez snapshots do provedor congelado e mapeamento persistente de clubes. |
| `assets/escudos/` | Escudos WebP. Os 70 candidatos da terceira divisão sem escudo local usam iniciais até complemento editorial. |
| `documentacao/` | Regulamentos, método financeiro, instruções para o Claude e relatório de validação. |

## Decisões e limites

- Os valores em USD são estimativas para balanceamento. A moeda local também está registrada. O arquivo financeiro explica a escolha adotada para o pacote.
- O catálogo preserva as diferentes datas e coberturas das fontes. Dados ausentes ficam vazios. Na segunda uruguaia, os promedios de 2025 ainda precisam de uma tabela oficial consolidada. Os 420 registros históricos são tabelas por fase e podem repetir um clube, exigindo seleção antes da soma.
- Todos os clubes têm ao menos 23 jogadores registrados e dois goleiros. Fotografias de jogadores são URLs, quando disponíveis. A lista pode incluir atletas utilizados durante 2026 e há um arquivo de vínculos que pedem verificação por divergência entre fontes. Escudos de todos os clubes das divisões jogáveis foram incluídos.
- O pacote é insumo de cadastro e implementação. O motor da Carreira ainda precisa executar os regulamentos e transformar esse conjunto em ligas jogáveis.
