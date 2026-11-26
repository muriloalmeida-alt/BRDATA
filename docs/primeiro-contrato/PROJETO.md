# Projeto de produto e desenvolvimento

## Objetivo

Criar um simulador de carreira de atleta que abre no celular, com partidas simuladas e decisões rápidas. O jogador escolhe clube, administra seu espaço no elenco e constrói uma trajetória que pode atravessar divisões e continentes. A promessa é jogar uma carreira inteira em uma sessão curta e querer tentar de novo por outro caminho.

O Copero é a referência competitiva para entrada sem cadastro, avanço por temporadas e compartilhamento da trajetória. A proposta competitiva é conectar toda oferta a uma situação de elenco: concorrência na posição, papel previsto, nível da liga e oportunidades de evolução. O jogador deve conseguir explicar por que escolheu cada clube.

## Experiência do jogador

| Momento | Experiência | Ação |
|---|---|---|
| Criar atleta | Apelido opcional, nacionalidade sugerida, escolha de uma das 11 posições no campo inteiro em 4–2–3–1. Idade padrão de 16 anos. | Ver onde começar |
| Escolher clube | Três sugestões com papéis diferentes e acesso ao catálogo mundial pesquisável. | Comparar ou começar |
| Assinar | Papel previsto, minutos estimados, concorrência na posição e duração do vínculo. | Aceitar |
| Temporada | Cabeçalho com clube, liga, idade e situação. Um momento de decisão, como buscar minutos ou concentrar-se no desenvolvimento. | Simular temporada |
| Balanço | Exibir jogos, minutos, métricas da posição, nível alcançado e um fato que explique o resultado. | Abrir janela |
| Janela | Ficar, renovar, aceitar transferência definitiva ou empréstimo, conforme elegibilidade. Comparação lado a lado acessível pela mesma tela. | Decidir |
| Aposentadoria | Resumo, linha do tempo, conquistas e cartão baixável para compartilhar. | Compartilhar ou começar nova carreira |

### Catálogo na jornada

- **Primeiro clube.** Qualquer clube com inscrição confirmada no catálogo publicado pode ser escolhido. A decisão define o papel inicial. Um clube forte pode receber o atleta como promessa com baixa expectativa de minutos. A nacionalidade orienta sugestões e permanece independente do país do clube.
- **Durante a carreira.** Permita pesquisar todos os clubes e marcar interesse. Propostas geradas dependem de concorrência, desempenho, contexto da liga e capacidade do clube. Interesse não garante contrato.
- **Navegação.** Filtrar continente → país → liga/divisão → clube. Busca por nome e apelidos com e sem acentos, inclusive antes de aplicar filtros. Mostrar nome da liga, país e temporada junto ao clube. Distinguir times B, afiliados e homônimos quando constarem da inscrição ativa.
- **Celular.** Seleção em lista, controle principal ao alcance do polegar, foco visível, navegação por teclado e retorno à posição anterior da lista. Renderizar resultados em grupos paginados. Estados de carregamento, erro e falta de cobertura com formas claras de voltar ou remover filtros.

## Regras de jogo

1. **Criação.** O atleta é fictício. Nacionalidade e posição fazem parte do save. Derivar atributos iniciais e potencial de uma semente estável. Definir capacidade de goleiros e jogadores de linha por perfis próprios.
2. **Disputa por minutos.** Calcule a profundidade da posição a partir de elenco, força relativa e vagas da formação quando disponíveis. Sem elenco importado, use concorrentes fictícios persistidos, identificados como simulados, calibrados pela força do clube. Exibir expectativa como intervalo. Forma, concorrência e decisão da temporada explicam a diferença entre previsão e resultado.
3. **Simulação.** Um avanço gera minutos, jogos, evolução, estatísticas por posição e resultado esportivo. Limitar jogos e minutos ao calendário efetivamente simulado. Um atacante tem gols, um meia tem criação e assistências, goleiros têm defesas e jogos sem sofrer gol, defensores têm métricas defensivas. Não calcule conquistas de competições que a liga não oferece.
4. **Mercado.** Reaproveitar os princípios de hierarquia de ligas, clubes e orçamento do Touchline. Considerar fase da carreira, posição, necessidade, espaço salarial, vínculo e fee quando aplicável. Clubes menores contratam em definitivo ou por empréstimo quando a operação cabe no orçamento. Exibir motivos do interesse sem prometer titularidade.
5. **Empréstimo.** Manter clube de origem e clube atual separados. Gravar datas, divisão salarial e possibilidade de retorno. Devolver o atleta ao clube de origem no fim, salvo decisão válida de compra. Preservar todos os registros da passagem.
6. **Carreira longa.** Evolução por idade e minutos, pico por posição e declínio gradual, com aposentadoria voluntária após um limiar configurável e limite de idade. Expor avançar um ano; testar avançar até a próxima decisão importante após estabilizar o equilíbrio.
7. **Clareza.** Diferenciar dado observado de estimativa. Nível de jogo, chance de minutos, valor de mercado e propostas são simulações. Atletas reais, quando presentes como contexto de elenco, devem seguir as permissões da fonte.

## Design system inicial

- Design system Touchline, conforme LEIA_PRIMEIRO_CLAUDE.md e tokens e fontes originais em `touchline/`.
- Componentes: seletor de posição, lista de clubes, proposta comparável, barra de ação, resumo de temporada, histórico e cartão compartilhável. Preferir uma decisão principal por tela. Ruídos como notificações viram contexto da próxima ação.
- Mobile first, teste com Safari no iPhone em largura de 390 px e com zoom a 200%. Respeitar áreas seguras nos controles fixos, toque mínimo de 44 px e preferência por movimento reduzido.

## Arquitetura proposta

App web/PWA em TypeScript. Use um motor puro separado da interface e do importador, executado localmente ou em Web Worker se o perfil de execução exigir. Adote três contratos: catálogo imutável por versão, save com estado do atleta e saída determinística da simulação. O front não depende de chamada a provedor esportivo para jogar.

- Catálogo indexado por país, competição e temporada, índice de busca separado, pacotes carregados sob demanda. CDN ou servidor do app serve os snapshots publicados.
- Save anônimo em IndexedDB com versão de esquema, versão de catálogo, semente, temporada atual, vínculo, histórico e decisões pendentes. Gravar o avanço e os efeitos da decisão numa transação. Reabrir a última decisão após fechar o app. Atualização de catálogo mantém saves antigos legíveis.
- Compartilhamento via imagem exportada e compartilhamento nativo quando disponível, com botão de download como alternativa. Conta e sincronização entre dispositivos entram depois da primeira versão.
- Hospedar como app independente. Compartilhar dados e regras extraídas por contratos, evitando dependência do estado global, sessão ou runtime do Modo Técnico do Touchline.

## Entregas

| Etapa | Entrega verificável |
|---|---|
| 1 — Fundação | App separado, design tokens, importação do snapshot Touchline e busca completa por clube, país e liga, com seleção de qualquer clube disponível para começar. |
| 2 — Carreira completa | Da criação à aposentadoria, motor por posição, disputa de minutos, empréstimo, transferência, save retomável e cartão final. |
| 3 — Cobertura mundial | Inventário de escopo, integrações por provedor, revisão editorial das lacunas, validação por confederação e publicação dos snapshots com relatório de cobertura. A ingestão pode avançar em paralelo à Etapa 2. |
| 4 — Evolução | Competições continentais onde houver calendário, seleção, desafios de carreira e sincronização opcional. |

## Aceite do MVP e publicação

- Criar uma carreira sem conta em menos de 45 segundos nos testes de usabilidade. Meta inicial de 5–10 minutos para concluir no ritmo rápido.
- Encontrar por busca e iniciar com clubes fora do Brasil, em divisões superiores e inferiores. Cada inscrição do snapshot publicado precisa resolver para clube, liga, país e temporada.
- Comparar dois saves de mesma semente com decisões divergentes. Cada decisão deve produzir efeito coerente. Repetir a mesma sequência deve produzir os mesmos resultados.
- Simular um empréstimo, retomar o save após recarregar, verificar o retorno e concluir uma carreira com cartão exportável no iPhone.
- Verificar importador com fixtures pequenas, integridade do snapshot completo e um smoke test de ponta a ponta. Evitar ampliar a suíte de simulação do Touchline para testar a nova interface.
- Acompanhar início de carreira, primeira temporada concluída, conclusão, nova carreira e compartilhamento. Medir carregamento e duração das etapas, evitando coletar apelidos.
