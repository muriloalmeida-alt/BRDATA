# Handoff para implementar na Carreira 2.0

1. Identifique os modelos atuais de campeonato, copa, partidas, clubes, elenco, finanças e persistência. Faça um adaptador dos IDs deste pacote para os IDs do repositório. Cada clube deve ter um ID canônico, associação esportiva, histórico de participações e estádio aprovado para a fase. Cruze os cadastros anteriores por associação e identidade do clube.  
2. Importe a temporada anterior, os titulares e a lista oficial de acesso. Use a posição ao final do torneio doméstico e o vencedor da copa relevante, considerando o calendário local. Para a UEFA, converta o Anexo A e a lista aplicada em registros por competição, fase, caminho, associação, origem, rank, fonte e edição. Guarde a versão das decisões de reequilíbrio. Na América do Sul reutilize os clubes brasileiros do BRDATA. O pacote doméstico sul-americano adiciona Argentina, Chile, Colômbia, Equador e Uruguai. Bolívia, Paraguai, Peru e Venezuela ainda precisam alimentar a classificação continental. Fora das cinco ligas europeias jogáveis, adicione os elegíveis reais como clubes controlados pela CPU, com os demais dados necessários à escalação.  
3. Resolva presença e elegibilidade antes dos sorteios. Use um identificador único para cada vaga e avance os clubes por resultados, a partir do caminho e da fase de origem. A função consumidora precisa ser idempotente. Com resultados oficiais históricos, aceite participantes e partidas importados para reproduzir a edição. Em temporadas simuladas, derive novos classificados a partir das regras nacionais e dos resultados do save. Para países controlados pela CPU, materialize somente os resultados nacionais necessários ao acesso quando possível. Preserve a regra dos catálogos domésticos de terceira divisão.  
4. Resolva sorteio e calendário em etapas separadas. Use sorteio com seed persistida e registre eventos e exceções oficiais. Para a UEFA, encontre uma solução que cumpra simultaneamente potes, mandos, limites por federação e adversários distintos. A escolha isolada clube a clube pode deixar as últimas vagas impossíveis. Use a edição da regra no save e faça qualquer atualização explicitamente. Reserve as janelas continentais e evite dois jogos do mesmo clube no mesmo horário. Se houver colisão, ajuste o calendário doméstico conforme sua política ou aplique o comunicado oficial da competição. Guarde horário local do estádio e converta para UTC.  
5. Reutilize o motor de partidas e a escalação CPU para todos os clubes. Aplique inscrições, cartões, suspensões e ajustes financeiros como eventos próprios da competição. Atualize tabela e vagas ao fechar a rodada ou fase em lote. Persista tabela, potes, seeds e chaves resultantes para evitar recomputação a cada abertura de tela. Use pagamentos com chave partida ou fase, clube e tipo de prêmio para impedir duplicações após retentativa.

## Critérios de aceite

| Cenário | Resultado esperado |
|---|---|
| Liga UEFA | 36 clubes, 144 partidas em Champions ou Europa e 108 na Conference. Cada clube tem adversários distintos e exatamente metade em casa |
| Potes e associações | Sorteio respeita os limites da edição e mantém uma trilha de auditoria das exceções oficiais |
| Caminho UEFA | Clube que elimina o seed 1 herda sua posição para o mando de volta previsto em quartas e semis |
| Cortes UEFA | 8 nas oitavas, 16 no playoff, 12 eliminados. Eliminação na liga nunca gera nova inscrição em torneio paralelo |
| Transferências CONMEBOL | 4 derrotados da fase 3 da Libertadores nos grupos da Sudamericana e 8 terceiros no playoff |
| Minitabela CONMEBOL | Empate múltiplo considera partidas entre os empatados e segue os próximos critérios sem reiniciar |
| Oitavas CONMEBOL | Vencedor do grupo decide em casa. Na Sudamericana, playoff 9 × 24 e 16 × 17, com ida no estádio do vindo da Libertadores |
| Empate no mata-mata | Ida e volta da CONMEBOL termina em pênaltis quando persistir empate. UEFA e finais únicas têm prorrogação conforme os regulamentos |
| Calendário | 96 partidas de grupos por torneio da CONMEBOL. Edições completas somam 155 partidas na Libertadores e 157 na Sudamericana |
| Finanças | Uma vitória em casa nos grupos da Libertadores gera o crédito de mando e o de vitória. Reprocessar o evento mantém apenas um lançamento de cada tipo |
| Inscrição | Clube CPU e clube do jogador passam pelas mesmas regras. Inscrição fora de janela ou com atleta suspenso falha de acordo com a regra aplicável |
| Save legado | Sem temporada continental ativa, a migração mantém os dados do save. A estreia continental gera as fases e chaves uma única vez |
| Integridade | Participante obrigatório ausente, fase de entrada sem resolução ou tabela de ranking faltante bloqueia a criação da edição e identifica o dado ausente |

Priorize testes pequenos e determinísticos para sorteio, transferência, desempate, mando e retentativa. Cronometre o fechamento de rodada em um save com todas as competições ativas e compare com a linha de base antes de disponibilizar no menu.
