# Handoff técnico para o Claude

## Etapa 1 — Registrar o catálogo

- Registre as dez competições no servidor com os IDs de `dados/ligas.json` e com `providerLeagueIds.frozen` igual ao respectivo ID. Copie `integracao/snapshots` para a estrutura de snapshots do BRDATA e carregue por país. Os IDs numéricos ficam na faixa 820 a 869 milhões, acima dos clubes brasileiros verificados e fora da faixa do pacote europeu. Preserve o mapeamento entre ID numérico e ID canônico mesmo quando um clube muda de divisão.
- Adicione as competições ao seletor da Carreira, ao catálogo offline e às rotas existentes. Use os escudos locais de `assets/escudos` como prioridade. Quando faltar um estádio confirmado no catálogo, use valores de simulação identificados no save. O campo de logo é a URL de referência e o caminho local é relativo ao pacote.
- Passe `id`, `name`, `photo`, `position`, `age`, `rating`, `games`, `goals`, `assists` a `buildRealPlayer`. A folha de jogadores inclui campos auxiliares para perfil. O campo `vinculos-a-conferir.json` identifica IDs de provedor presentes em mais de um clube. Valide a janela e o vínculo mais recente antes de transformar uma ocorrência em atleta único ou manter dois vínculos. Quando um campo está vazio, use o comportamento padrão do motor.
- Evite chamadas em série para provedores durante a criação da Carreira. O catálogo por país deve ser lido e indexado por ID uma vez. Preserve o caminho de carregamento dos saves brasileiros e permita que um país já materializado funcione offline.

[Provedor congelado](https://github.com/muriloalmeida-alt/BRDATA/blob/main/server/src/providers/frozen.js) · [Contrato do jogador](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/virada.js#L64-L124)

## Etapa 2 — Modelar as fases

- Modele estado de temporada por país, competição, fase, grupo, rodada e partida. Separe classificação do torneio, tabela anual, reclasificación e promedio. Não deduza o campeão nacional apenas pelo líder da fase regular.
- No primeiro save use a programação inicial do pacote e zero pontos. Gere grupos que dependem da simulação, inclusive o Intermedio uruguaio, os quadrangulares da Colômbia, os hexagonais do Equador e chaves eliminatórias. A composição real de fases dinâmicas, publicada em `grupos-referencia.json`, serve para consulta.
- Use a janela real de cada competição separadamente. O fim do calendário do pacote é a última partida coletada, e o encerramento da temporada deve aguardar a última fase exigida pelo regulamento. Em temporadas seguintes, gere confrontos com os participantes do save. As janelas de registro são as datas FIFA de 2026, usadas como referência para parametrizar anos novos.
- Use histórico de pontos e partidas por clube e fase elegível. Agrupe dados históricos por competição, ano e pessoa jurídica do clube. Na Argentina, 2025 tem tabelas de Apertura e Clausura e 2024 tem tabela anual. Na Colômbia, some apenas as fases de todos contra todos aplicáveis. No Uruguai, conte as fases que integram a anual. Ausência de histórico é um estado próprio e não equivale a zero ponto em jogos inventados. A segunda uruguaia requer complemento oficial de 2025 para iniciar com o promedio real.
- Preserve pontos descontados quando forem parte do modo de referência. Se iniciar do zero, uma sanção real só entra se for modelada por evento ou configuração de cenário. Evite somar duas vezes fases em que a fonte já carrega pontos da etapa anterior.

## Etapa 3 — Virada de temporada e catálogo

- Execute cada transição como uma troca fechada. Resolva playoffs e desempates primeiro, aplique elegibilidade, valide contagens e grave uma nova composição em uma operação lógica. Quando o clube muda de nível, preserve caixa, contratos e elenco, com a nova política de receitas aplicada na temporada seguinte.
- No terceiro nível, reutilize a regra atual da Série D. Sorteie sem reposição usando seed de país, ano e circuito. Remova promovidos do catálogo e acrescente rebaixados. Ao materializar um promovido sem plantel persistido, crie elenco fictício com pelo menos 22 atletas, dois goleiros e escalação com 11 titulares e 11 reservas. A terceira divisão permanece indisponível no seletor.
- Argentina usa dois circuitos de origem. A amostra identifica os grupos de origem no catálogo. Para rebaixados cujo vínculo metropolitano/federal não foi confirmado, a classificação de afiliação precisa ser completada antes de aplicar quotas oficiais.
- Colômbia mantém zero trocas na configuração realista padrão entre Primera B e Primera C. Ative a amostra marcada `simulation_only` somente pela opção de produto. No Equador, bloqueie o acesso dos clubes B identificados e avance até o próximo elegível. Chile e Uruguai usam o catálogo conforme a quantidade configurada e regulamento aplicável.
- Mantenha a proteção existente para o clube humano na divisão jogável mais baixa. Quando necessário, remapeie o slot ao próximo clube elegível, registre a exceção no resumo da temporada e preserve o tamanho da divisão.

[Fluxo existente de reposição e virada](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/temporada.js#L411-L468)

## Etapa 4 — Economia, CPU e aceite

- Use o seed financeiro em USD para toda a carreira sul-americana. O motor atual calcula finanças pela folha inicial e usa moeda brasileira em caminhos legados. A integração deve usar a configuração por país para apresentação, inicialização e contabilização. Preserve as regras de caixa e salários dos clubes CPU. Mantenha a força relativa do pacote quando o carregamento atual recalibrar a partir da classificação.
- Limite simulação detalhada ao país ativo e às duas divisões. Use as cadências e rotinas de CPU existentes, e mantenha índices em memória em vez de duplicar os catálogos no save. Nenhuma rotina de jogo depende da rede.
- Rode um smoke test por país, cobrindo encerramento de fase, playoffs quando aplicáveis, acesso/queda e reabertura. Casos específicos: dois descensos por critérios distintos na Argentina, campeão e Liguilla no Chile, quatro cenários de acesso na segunda colombiana, hexagonais com pontos carregados no Equador, promedios e final anual no Uruguai.
- Valide as duas contagens de clubes após várias viradas, preserve IDs/contratos e compare tempo de avanço e tamanho do save com a linha de base. A Argentina, com 66 times jogáveis, é o caso de maior carga. Use partidas simuladas curtas nos testes para evitar aumentar a suíte sem necessidade.
