# Touchline · Primeiro Contrato
## Handoff para Claude — perfil do atleta, competições e seleção

Implemente estas três evoluções no MVP em `muriloalmeida-alt/BRDATA`, diretório `primeiro-contrato/`. Este Markdown é complementar ao handoff de evolução da carreira e ao pacote de temporada jogo a jogo. Confira o código atual e reutilize os pontos de entrada do motor, mercado, catálogo, eventos e persistência.

Preserve a identidade das pranchas e o fluxo mobile. Use apenas a logo Touchline no header, as fontes oficiais Barlow e Barlow Condensed e os nomes e escudos do catálogo por ID. Preserve saves, contratos e feitos existentes. Comece pelo perfil e sua influência nas ofertas. Valide calendário, partidas e regulamentos antes de ligar o cálculo da tabela, os títulos e a convocação.

## 1. Pé dominante e país de origem

Na criação, adicione **Pé dominante** com duas escolhas por toque, direito e esquerdo. Preserve o seletor de país e as 11 posições. Salve o pé dominante e o país de origem de forma estável. O país escolhido também define a seleção elegível no modelo inicial. Se a nacionalidade já existe no save, reutilize esse dado. Para carreiras anteriores, permita definir o pé uma vez no próximo ponto natural da jornada. Até lá, aplique compatibilidade neutra.

- **Pé dominante e encaixe no elenco.** Avalie pé, lado, posição, função tática, familiaridade e vagas abertas em conjunto. Por exemplo, clubes que precisam de um zagueiro para sair jogando pela esquerda podem priorizar um canhoto, enquanto um técnico que quer ponta invertido pela direita pode oferecer adaptação ao mesmo pé. Um ponta aberto para cruzar e um ponta invertido têm perfis diferentes. Aplique o encaixe à classificação de ofertas, ao papel previsto e às conversas de treino e adaptação. Preserve alternativas fora do encaixe ideal. O pé não concede bônus geral de nível.
- **País de origem e trajetória.** Dê mais peso ao mercado doméstico no início e amplie observação e propostas internacionais conforme minutos, reputação, observação e necessidade dos clubes. O país influencia as recomendações iniciais, a procura por empréstimo e diálogos sobre jogar fora, voltar ao país ou mudar de liga. O catálogo completo continua disponível na escolha de clube. Use regras de inscrição e vagas de estrangeiro somente quando existirem dados verificados para aquela competição e temporada. Evite penalidades genéricas por nacionalidade.
- **Explicação.** Mostre até dois motivos concretos nas propostas ou diálogos quando esses dados pesarem. Exemplos: “O técnico quer um canhoto para jogar aberto na esquerda” e “O clube acompanha você desde a Série B e tem uma vaga na sua posição”. Agrupe razões por encaixe em vez de contar o mesmo sinal duas vezes.

## 2. Competições com tabela, pontos e títulos

Cada edição jogável usa **calendário, participantes e regulamento próprios**, com referência oficial por temporada. Reaproveite regras confirmadas do catálogo Touchline. Onde faltarem regras, mantenha a edição identificada como simplificada até completar a validação. Na carreira, os resultados são simulados e seguem a estrutura real da competição. Um formato simplificado não gera título oficial.

1. **Calendário e resultados.** Gere ou importe a agenda conforme o formato confirmado. Simule também os jogos dos outros clubes da competição disputada. Persista cada resultado uma vez por edição, fase e partida. Atuação e placar vêm do mesmo registro. Os gols e assistências do atleta devem caber no placar do clube.
2. **Tabela e fases.** Use o sistema de pontuação, os critérios de desempate e o formato da edição. Em pontos corridos ou grupos, exiba posição, jogos, vitórias, empates, derrotas, gols pró, gols contra, saldo e pontos. Quando a edição tiver fase eliminatória, mostre a chave e aplique ida e volta, prorrogação ou pênaltis conforme a regra válida. Classificação, avanço de fase, campeão e acesso ou descenso, quando implementados para a competição, são derivados dos mesmos resultados.
3. **Acesso mobile.** Em Sua temporada e no balanço, abra **Tabela** ou **Chave** pela competição correspondente, com o clube do atleta destacado. Mostre a classificação parcial após as rodadas concluídas. Em temporadas com mais de uma competição, deixe claro a qual delas cada resultado pertence.
4. **Conquistas da carreira.** Ao confirmar o campeão, grave o título na carreira com ID da edição, competição, temporada, clube e participação do atleta. Para a primeira entrega, atribua conquista ao atleta que teve minutos oficiais naquela edição pelo clube campeão, inclusive durante empréstimo; registre a fase da participação. A regra é de atribuição no jogo e pode ser substituída por regra oficial específica documentada. Empréstimo, transferência, retomada ou repetição da rotina de encerramento não duplicam títulos. Mostre os títulos no balanço, na trajetória e no legado. Preserve conquistas antigas como histórico do save, sem recalculá-las com o regulamento novo.

## 3. Convocação apenas para estrelas

**Só avalie convocação se o atleta tiver classificação esportiva de Estrela nacional ou Estrela mundial.** Remova caminhos que convoquem por overall isolado, idade, temporada concluída ou sorteio. Centralize a regra para os eventos durante a temporada e no fechamento dela. A seleção é a do país elegível gravado no save.

- **Estrela nacional.** Destaque sustentado entre atletas da mesma nacionalidade e função, com minutagem mínima, desempenho ajustado à posição e à força da competição e reputação nacional consistente. Jogar fora do país pode contribuir para esse reconhecimento.
- **Estrela mundial.** Destaque sustentado em comparação internacional por função, com amostra suficiente, nível competitivo e reputação global. Use produção por posição e contexto esportivo. Um torneio forte ou um título pode contribuir como evidência, sem substituir consistência e participação.
- **Classificação verificável.** Calibre faixas em configuração versionada e inclua janela de avaliação, minutos mínimos, amostra e critérios por função. Use uma janela móvel que atravesse temporadas. Se houver pouca cobertura de comparáveis, use referências calibradas por posição e nível de competição com amostra mínima. Um ranking de poucos nomes não pode classificar um atleta automaticamente.
- **Convocação de fato.** Ser estrela abre a elegibilidade. A convocação depende ainda da janela da seleção, disponibilidade, concorrência e vagas na função. Mostre ao jogador a razão esportiva e grave o marco somente quando houver convocação. Carreiras existentes preservam convocações históricas. Um evento de convocação legado que ainda não ocorreu deve passar pelo critério novo antes de ser exibido.

## 4. Critérios de aceite

| Área | Validação |
|---|---|
| **Perfil e ofertas** | Com a mesma semente e nível, variando pé ou país separadamente, validar diferenças explicáveis no encaixe, nas sugestões e nos diálogos. Verificar atleta com perfil neutro em save antigo e preservar a possibilidade de contrato internacional. |
| **Competições e conquistas** | Disputar liga, grupo e mata-mata em formatos suportados. Recalcular pontos e desempates pela lista de placares e conferir o campeão. Concluir temporada, recarregar e confirmar que o título elegível aparece uma vez no balanço, trajetória e legado. |
| **Seleção** | Simular atleta em boa fase abaixo do patamar de estrela e validar ausência de convocação. Simular estrela nacional e mundial em cenários elegíveis e testar também falta de vaga, lesão e janela fechada. |

Use partidas e eventos determinísticos. Avançar assistindo, acelerando ou pulando deve produzir a mesma tabela, os mesmos títulos e as mesmas chances de convocação para a mesma semente e as mesmas escolhas. Documente as fontes dos regulamentos por edição e valide no Safari do iPhone o seletor de pé, a tabela e o histórico de conquistas.

### Referências de integração

- `Touchline_Primeiro_Contrato_Evolucoes_Claude.md` — diretoria, técnico, torcida, imprensa e evolução.
- `Touchline_Primeiro_Contrato_Temporada_Claude.zip` — simulação jogo a jogo e fundos.
