# Matriz de navegação — Capítulo 2

| Origem | Ação | Destino | Condição |
|---|---|---|---|
| Visão do clube | Elenco | Tela 02 | Sempre |
| Visão do clube | Destaque do jogador | Tela 03 | Jogador existe no save |
| Visão do clube | Diretoria / Objetivos | Tela 05 | Save ativo |
| Visão do clube | Finanças | Tela 06 | Save ativo |
| Visão do clube | Calendário / Próximo jogo | Tela 07 ou pré-jogo existente | Partida disponível |
| Elenco | Jogador | Tela 03 | ID válido |
| Jogador | Voltar | Elenco | Preservar filtro e scroll |
| Comissão | Contratar / Demitir | Fluxo real de gestão | Permissões, orçamento e confirmação |
| Diretoria | Objetivo | Detalhe e progresso | Objetivo existe |
| Finanças | Extrato | Fluxo financeiro real | Transações existentes ou vazio |
| Calendário | Jogo futuro | Pré-jogo | Partida futura |
| Calendário | Jogo passado | Detalhe da partida | Resultado existente |

**Nota:** não inventar rotas sem inspecionar arquitetura real. Atualizar matriz com nomes concretos de handlers/rotas na implementação.
