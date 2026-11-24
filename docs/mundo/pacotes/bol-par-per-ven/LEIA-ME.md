# BRDATA • Bolívia, Paraguai, Peru e Venezuela

Catálogo masculino da temporada 2026 com **8 competições, 135 clubes e 3.412 registros de atletas**. Levantamento consultado em 24/11/2026.
 
| País | Clubes da 1ª divisão | Clubes no acesso | Registros de atletas | Clubes do acesso sem elenco nominal |
|---|---:|---:|---:|---:|
| Bolívia | 16 | 24 | 659 | 21 |
| Paraguai | 12 | 16 | 950 | 1 |
| Peru | 18 | 18 | 1.034 | 0 |
| Venezuela | 14 | 17 | 769 | 4 |

Os 60 clubes das primeiras divisões têm elenco nominal. No acesso, a cobertura varia por clube. Para a Bolívia, o recorte do acesso é a fase nacional da Copa Simón Bolívar, com 24 clubes dos 69 inscritos na edição.

- **Planilha Excel:** abas para ligas, clubes, atletas, cobertura e fontes. As tabelas têm filtros.
- **Dados:** JSON e CSV com as chaves de competição e de clube, regras principais da temporada, elencos e fontes. Nacionalidade, idade, altura e camisa foram preenchidas quando expostas pelas fontes consultadas. Escudos da primeira divisão estão referenciados por URL.
- **Integração:** associação entre clubes e competições, relatório de possíveis vínculos coincidentes e instruções para o Claude.
- **Cobertura:** `dados/cobertura.csv` mostra os clubes abaixo do limiar de 22 atletas e 2 goleiros. Há 26 clubes sem elenco nominal. Os registros de atletas correspondem a vínculos observados em fontes públicas com datas de atualização diferentes. Podem incluir nomes abreviados e atletas que passaram pelo clube ao longo da temporada. As coincidências de nome precisam de revisão para a importação definitiva.

Os campos de estádio permanecem vazios. O pacote contém referências e configurações de cadastro. A ativação das ligas e a sincronização com as competições continentais dependem do importador e das regras do motor.
