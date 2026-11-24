# BRDATA Europa 2026/27

Pacote de cadastro e integração para o Modo Carreira. Recorte reunido em 24 de novembro de 2026.

| País | Primeira divisão | Segunda divisão | Clubes de reposição |
|---|---:|---:|---:|
| Inglaterra | 20 | 24 | 24 |
| Espanha | 20 | 22 | 40 |
| Itália | 20 | 20 | 60 |
| Alemanha | 18 | 18 | 20 |
| França | 18 | 18 | 18 |
| **Total** | **96** | **102** | **162** |

As dez ligas têm **198 clubes, 5.755 jogadores e 3.758 confrontos de fase regular**. A terceira divisão é um catálogo de **162 clubes não jogáveis**, com elegibilidade registrada por clube. O pacote anterior tinha 192 clubes. Este inclui Watford, Burnley, Derby County, Preston North End, Albacete e Ceuta.

## Arquivos

| Caminho | Conteúdo |
|---|---|
| `BRDATA_Europa_2026-27.xlsx` | Visão filtrável de ligas, clubes, atletas, partidas, terceira divisão e referências financeiras. |
| `dados/ligas.json` | Países, moedas, fusos, janelas, regulamentos e parâmetros de temporada. |
| `dados/clubes.json`, `dados/elencos.json` | Cadastro, fontes, estádio, capacidade, escudo, cores, força, orçamento de jogo, jogadores e vínculos. |
| `dados/partidas-2026-27.json` | Confrontos por rodada com data, hora quando disponível, fuso ou base de hora, fonte e placar de referência parcial. |
| `dados/catalogo-terceira-divisao.json` | Clubes por país e, quando aplicável, grupo, clube principal e elegibilidade. |
| `dados/benchmarks-financeiros.json` | Valores observados das fontes e parâmetros de simulação. |
| `dados/classificacao-referencia.csv` | Tabela de referência da coleta, separada da classificação de uma carreira nova. |
| `dados/referencias.json` | URLs de regulamentos, calendários, participantes e benchmarks. |
| `integracao/snapshots/` | Dez arquivos no formato lido pelo provedor congelado. |
| `integracao/ids-motor.json` | IDs numéricos permanentes para adaptar o catálogo à rota atual do BRDATA. |
| `assets/escudos/` | Escudos locais WebP, com URL de origem preservada nos cadastros. |
| `documentacao/01_Regulamentos_e_Calendario.md` | Regras em português, exceções e recortes das fontes. |
| `documentacao/02_Forca_e_Orcamento.md` | Fórmulas, unidades, hipóteses e ajustes do motor. |
| `documentacao/03_Handoff_Claude.md` | Contrato de integração e critérios de aceite. |
| `documentacao/04_Validacao.json` | Resultados das verificações de consistência do pacote. |

Os CSVs usam UTF-8 com BOM e ponto e vírgula. Os IDs de catálogo são estáveis quando um clube muda de divisão. As inscrições e contratos gerados devem usar o ano inicial da temporada mais o contexto de encerramento em junho.

## Uso dos dados

- Para iniciar uma carreira, use a composição e os confrontos com tabela zerada. Datas de jogos futuros podem mudar. Resultados de referência são parciais e pertencem à consulta esportiva.
- O orçamento por clube é uma **estimativa de jogo**. As referências públicas descrevem receitas, custos e valores de mercado sob conceitos diferentes. Nenhum orçamento é apresentado como caixa oficial.
- Os elencos representam o recorte das fontes, que podem ter datas diferentes. Os nove campos consumidos pelo motor já estão nos snapshots. Fotos e estatísticas individuais de desempenho ficam sem preenchimento. Alguns atletas também não têm idade confirmada.
- Os vínculos da terceira divisão seguem a regra de reposição descrita na documentação. Os clubes elegíveis podem ganhar um elenco fictício quando forem promovidos, como no modelo atual da Série D.
