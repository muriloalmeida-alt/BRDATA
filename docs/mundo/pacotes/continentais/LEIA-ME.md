# BRDATA · Competições continentais

Pacote independente para a Carreira 2.0. Edições de referência UEFA 2026/27 e CONMEBOL 2026. Fontes oficiais consultadas em 24 de novembro de 2026.

| Arquivo | Conteúdo |
|---|---|
| config/competicoes.json | Formatos, desempates, sorteios, chaveamentos e mandos |
| config/acesso-e-transferencias.json | Vagas sul-americanas por associação, início por fase e transferências entre torneios |
| config/calendarios.json | Janelas oficiais por rodada ou fase e sedes das finais |
| config/premiacao.json | Valores oficiais de Libertadores e Sudamericana e referência de distribuição UEFA |
| fontes.json | Links oficiais identificados nas configurações |
| docs/01-regulamentos.md | Regras complementares e referências por seção |
| docs/02-integracao.md | Handoff para Claude, dados necessários e critérios de aceite |

Os JSONs definem um contrato para integração. A implementação precisa ligar esses dados ao calendário, às partidas e ao histórico do save. As janelas CONMEBOL marcadas como semanas regulamentares devem ser refinadas com os boletins oficiais se o jogo reproduzir uma tabela histórica por partida.

A liberação em modo fiel depende da lista europeia de acesso por associação e fase, dos rankings oficiais, dos participantes e das listas de jogadores, além da circular UEFA de premiação de 2026/27. A URL do Anexo A e a lista oficial aplicada estão no pacote. O ZIP não traz essas tabelas europeias completas em JSON nem instala os torneios no jogo. O calendário, o acesso e as inscrições das edições futuras precisam da publicação correspondente.
