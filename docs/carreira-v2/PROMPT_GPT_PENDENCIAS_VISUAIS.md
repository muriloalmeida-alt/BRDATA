# Prompt para o ChatGPT: pendências visuais da Carreira 2.0

> Cole o texto abaixo, a partir de "INÍCIO DO PROMPT", no ChatGPT. Anexe junto as pranchas já aprovadas do Pacote Mobile (`01_partida`, `02_resultados`, `05_elenco`, `06_clube`, `referencias_anteriores/*`) e 4 capturas da v2 atual (Início, Escalação, Partida e Resultado), para servirem de referência de estilo.

---

## INÍCIO DO PROMPT

Você é o designer de produto do **BRDATA**, um jogo mobile de gestão de futebol (modo carreira de treinador, com clubes brasileiros das Séries A, B e C e Copa do Brasil). Preciso que você produza as **pranchas visuais que faltam** para a nova interface mobile, a **Carreira 2.0**. O formato é o mesmo do Pacote Mobile que você já entregou.

### 1. Contexto
- **A Carreira 2.0 já existe e foi aprovada tela a tela:** Início, Escalação, "Quem entra?", Pré-jogo, Tabela, Calendário, Elenco, Perfil do jogador, Diretoria, Finanças, Partida, Pausa/Intervalo, Substituição, Ajustar tática ao vivo, Lances e Resultado. As pranchas novas precisam parecer **o mesmo produto**.
- **Agora a Carreira 2.0 precisa ficar 100% independente da versão anterior:** todas as funções do jogo terão tela própria nela.
- **Mudança importante em relação ao pacote anterior:** muitas pranchas foram marcadas "CONDICIONAL — NÃO IMPLEMENTAR" e desenharam estados vazios, porque não havia evidência de que as funções existiam. **Elas existem e estão funcionando no jogo.** A seção 4 lista os dados e as ações reais de cada tela. Desenhe as telas **com esses dados e ações**, sem inventar outros.

### 2. Linguagem visual (obrigatória; manter a das telas aprovadas)
- **Celular** 390×844 (iPhone), com safe areas. Precisa funcionar de 360 a 430 px de largura.
- **Cores:**
  - fundo navy `#080E18`;
  - texto `#F5F7FA`;
  - texto secundário `#A9AEB7`;
  - linhas `#2B333F`;
  - destaque lima `#B4E64B`, com texto `#0B1508` sobre ele;
  - dourado `#F0C35A` (minuto, kickers);
  - vermelho `#EF5C62` (negativo, erro, "Sai").
- **Tipografia:** títulos em **Barlow Condensed** (600 a 700, alguns em itálico 800 como no Início); textos de apoio em **Barlow**. Corpo com 16 px ou mais.
- **Composição:**
  - listas fluidas com divisórias finas, **poucos contêineres** (sem cards dentro de cards);
  - um título de tela forte e curto em frase ("A disputa continua.", "Mude o jogo.");
  - um subtítulo de uma linha;
  - **uma ação principal** em botão lima de largura total, no rodapé (48 px);
  - ação secundária em texto.
- **Jogadores:** camisa neutra com o **overall** dentro (o jogo **não tem número de camisa**), nome abreviado ("B. Santos") e posição em grupo (Goleiro, Defensor, Meio-campo, Atacante). **Sem fotos de jogadores.**
- **Clubes:** escudos oficiais (use um círculo neutro com a sigla como marcador) e nomes reais brasileiros fictícios ou genéricos.
- **Navegação:**
  - topo com voltar (seta) + wordmark BRDATA + contexto curto à direita;
  - barra inferior com 4 abas: **Início, Elenco, Jogos, Mais**;
  - folhas inferiores (bottom sheets) escuras para escolhas curtas e confirmações.
- **Áreas de toque** de 44 px ou mais. Contraste AA.
- **Estados:** quando a tela tiver vazio, carregando ou erro, mostre o estado numa coluna própria só se ele for relevante.

### 3. Formato da entrega (igual ao pacote anterior)
1. **Pranchas PNG** com 3 telas por prancha, lado a lado, cada uma em 390×844, numeradas a partir de `17_…`.
2. **`Briefings_visuais.md`**: uma entrada por tela, no mesmo padrão de antes (ID | STATUS; título, conteúdo, ações, o que NÃO mostrar).
3. **`Inventario_novo.csv`** com as colunas `id;tela;arquivo;coluna;status`. Use os IDs da seção 4. Status:
   - `VALIDAR NO CÓDIGO` para telas com função real;
   - `COMPONENTE` para folhas e confirmações.
4. **Os dados da seção 4 vêm do jogo.** Onde aparece "ex.:", ou onde o texto não fixa opções exatas, o Claude confere os valores no código antes de implementar. Desenhe com os rótulos dados, sem acrescentar opções.
5. **Não invente** funções, números de camisa, notas, gráficos, recomendações de IA, contadores, timers ou preços que não estejam na seção 4. Onde houver dúvida, desenhe o mínimo e anote a dúvida no briefing.

### 4. Telas

#### A. Acesso e início
- **CAP01-N01 Recompensa diária.** Aparece ao entrar uma vez por dia. Mostra a sequência de dias (dia 1 a 7), a recompensa do dia (créditos ou bônus) e um botão "Receber". Inclua também a variante "já recebida hoje".
- **CAP07-T06 Sessão expirada (refazer).** Folha sobre a tela atual: "Sua sessão expirou." Campos E-mail e Senha, botão "Entrar", e aviso de que é preciso usar a mesma conta. Variante de erro: "Esta carreira é de outra conta."

#### B. Semana e pós-jogo
- **CAP04-N01 Semana concluída** (semana sem jogo). Resumo do que aconteceu ao avançar: treino aplicado (foco e intensidade), mudança de condição física do elenco (quem subiu e quem caiu), prazos que venceram (contratos, janela), virada de mês (salários pagos). Botão "Continuar".
- **CAP04-N02 Pré-jogo de amistoso.** Igual ao Pré-jogo aprovado, com o selo "Amistoso" e o aviso "Não vale pontos; lesões contam." Botão "Iniciar amistoso".
- **CAP04-N03 Coletiva de imprensa.** Uma pergunta do repórter, ligada ao jogo (vitória importante, derrota, jejum, lesão). De 2 a 3 respostas de tom diferente, cada uma com o efeito resumido em texto (ex.: moral do elenco, reputação). Botão de cada resposta e "Pular". Uma pergunta por tela.
- **CAP04-N04 Resultados da rodada.** Lista de todos os jogos da rodada, com placar e escudos, e o seu jogo destacado. Botão "Ver tabela" / "Continuar". (Reaproveite o trecho de resultados da prancha `02_resultados` col. 2.)
- **CAP04-N05 Partida da Copa do Brasil.** Mesmas telas da Partida, com o contexto: fase (1ª fase, 2ª fase, Oitavas de final, Quartas de final, Semifinal, Final), "Ida" ou "Volta" e placar agregado na volta. Prancha só do topo e do placar nos 3 estados: ida, volta e pênaltis.
- **CAP05-T05 Proposta recebida por um jogador (refazer).** Clube interessado, jogador (camisa com overall, posição, idade), valor oferecido, parcelamento (à vista ou em parcelas) e comparação com o valor de mercado. Ações "Aceitar", "Recusar" e "Comparar propostas" (quando houver mais de uma).

#### C. Temporada e carreira do treinador
- **CAP04-N06 Nova temporada.** "Temporada AAAA" com o resumo de virada: elenco envelhecido, contratos que terminaram, promovidos ou rebaixados (se houver), novo objetivo da diretoria. Botão "Começar temporada".
- **CAP06-T04 Proposta de outro clube ao treinador (refazer).** Clube, divisão, objetivo proposto, comparação com o clube atual (divisão e posição). Ações "Aceitar e mudar de clube" (com confirmação, porque a carreira continua no novo clube) e "Recusar".
- **CAP06-T08 Fim de carreira / demissão (refazer).** A diretoria encerra o contrato. Motivo (resultados abaixo do objetivo), resumo da passagem (jogos, vitórias, títulos). Ações "Ver propostas" (se houver) e "Começar nova carreira".
- **CAP06-T05 Histórico e conquistas (refazer).** Passagens por clubes (clube, temporadas, melhor posição), títulos e conquistas desbloqueadas (nome e data). Estado vazio para quem ainda não tem conquistas.

#### D. Tática e treino
- **CAP03-T03 Instruções táticas (refazer).** São **4 eixos de 1 a 5**, cada um com os rótulos das pontas:
  - Ritmo de jogo;
  - Pressão;
  - Linha defensiva;
  - Estilo de passe.

  Use controle segmentado de 5 passos, como no "Ajustar tática" ao vivo já aprovado, e mostre a formação atual. Link "Instruções por setor". Botão "Salvar".
- **CAP03-N01 Instruções por setor.** Três abas: Defesa, Meio e Ataque.
  - **Defesa:** linha defensiva, pressão pós-perda, compactação, saída de bola, bola parada defensiva.
  - **Meio:** intensidade de marcação, amplitude, transição, rotação de bola, cobertura de espaços.
  - **Ataque:** amplitude ofensiva, movimentação, últimos passes, finalização, bola parada ofensiva.

  Cada instrução tem 3 a 5 opções.
- **CAP03-T04 Esquemas salvos (refazer).** Lista de esquemas (nome, formação, resumo dos eixos), com ações "Aplicar", "Renomear" e "Excluir", e o botão "Salvar esquema atual" (folha com o campo nome). Inclua o estado vazio.
- **CAP03-N02 Marcação individual.** Escolha de um jogador seu para marcar um jogador adversário do próximo jogo, ou "Sem marcação".
- **CAP03-T05 Treinamento semanal (refazer).** Inclui:
  - **"Esquema da semana":** de segunda a domingo, cada dia com três escolhas:
    - **Foco:** Técnico, Físico, Tático ou Descanso;
    - **Intensidade:** Leve, Moderada ou Intensa;
    - **Grupo:** Elenco, Misto (com Sub-20) ou Individual;
  - **Lista "Elenco — condição física"** em %, com alerta de risco de lesão;
  - **Botão "Aplicar treino da semana".**
- **CAP03-T06 Evolução e condição física (refazer).** Por jogador: condição atual (%), histórico de fadiga das últimas rodadas e evolução de overall por temporada, com potencial como teto. Inclua o estado vazio.

#### E. Elenco avançado e contratos
- **CAP02-N01 Filtros e ordenação do Elenco** (folha):
  - **filtrar por:** posição, situação (titular, banco, lesionado, suspenso, à venda), base ou profissional;
  - **ordenar por:** overall, idade, condição, contrato.
- **CAP02-N02 Ficha completa do jogador.** Complementa o Perfil aprovado:
  - atributos;
  - idade;
  - potencial;
  - moral;
  - forma;
  - contrato (salário mensal e término);
  - valor de mercado;
  - estatísticas da temporada (jogos, gols, assistências, cartões);
  - histórico de clubes.

  Ações: "Renovar contrato", "Conversar", "Colocar à venda", "Emprestar", "Comparar".
- **CAP05-T06 Contratos (refazer).** Lista com filtro "Todos / Vencendo". Cada linha mostra jogador, salário mensal e término. Ação "Renovar".
- **CAP05-N01 Renovar contrato** (folha): campo "Novo salário mensal" (com o salário sugerido ao lado) e "Duração da proposta" (1 a 5 anos). Botão "Propor renovação". Inclua a resposta: aceita ou recusa, com o motivo.
- **CAP06-T03 Conversa individual (refazer).** Jogador, moral atual e situação (ex.: no banco há 5 jogos). Três respostas: "Ouvir e apoiar", "Prometer mais chances", "Cobrar postura". Depois, a reação do jogador e o efeito na moral.
- **CAP02-N03 Comparar jogadores.** Dois jogadores lado a lado: overall, idade, posição, atributos principais e salário.
- **CAP02-N04 Elenco de outro clube.** Escudo, nome, divisão e posição; elenco em lista (camisa com overall, posição). Tocar num jogador abre o perfil de alvo (mercado).

#### F. Mercado (janelas: rodadas 1 a 3 e 20 a 22; a venda pode ocorrer fora da janela)
- **CAP05-T01 Mercado (refazer).** Busca. Filtros: posição, divisão (Série A, B, C), faixa de overall, idade e valor. Cada linha mostra jogador, clube, overall e valor de mercado. Inclua o aviso de janela fechada (só leitura).
- **CAP05-T02 Perfil do alvo (refazer).** Dados da ficha completa (idade, overall, potencial, contrato, valor de mercado). Ações "Fazer proposta", "Pedir empréstimo" e "Comparar com meu elenco".
- **CAP05-T03 Fazer proposta (refazer).** Campo "Sua proposta" (R$) e "Parcelamento da taxa" (À vista (1x), 2x, 3x…). Aviso: "Propor menos que o valor de mercado é possível, mas o clube pode recusar." Botão "Enviar proposta".
- **CAP05-T04 Negociação e contraproposta (refazer).** Sua proposta × contraproposta do clube. Ações "Aceitar contraproposta", "Aumentar proposta" e "Desistir".
- **CAP05-N02 Minhas propostas.** Propostas enviadas e o status de cada uma: aguardando, aceita, recusada, contraproposta.
- **CAP05-N03 Comparar propostas** (recebidas pelo mesmo jogador): valor, parcelas e clube. Escolher uma ou recusar todas.
- **CAP05-N04 Colocar à venda** (folha): jogador, valor de mercado, campo "Valor pedido", botão "Anunciar".
- **CAP05-N05 Minhas vendas.** Jogadores anunciados, com o valor pedido e as propostas recebidas. Ação "Retirar do mercado".
- **CAP05-N06 Empréstimo** (entrada e saída):
  - "Duração do empréstimo" (Temporada inteira, ou 6 meses (metade da temporada));
  - "Percentual do salário que você paga" (50%, 75%, 100%);
  - "Cláusula de compra ao fim do empréstimo" (Nenhuma, Opcional, Obrigatória) e "Valor da cláusula".
- **CAP05-N07 Confirmar compra** (folha): resumo do jogador, valor, parcelas, impacto no caixa e na folha salarial. Ações "Confirmar" e "Cancelar".
- **CAP05-T07 Histórico de negociações (refazer).** Compras, vendas e empréstimos, com data (rodada), valor e clubes. Inclua o estado vazio.

#### G. Clube
- **CAP02-T04 Comissão técnica (refazer).** Profissionais contratados (função, nível e salário). Ações "Contratar comissão técnica" e "Demitir comissão técnica".
- **CAP06-T07 Estádio e infraestrutura (refazer).** Nome e capacidade do estádio, e as melhorias, com custo e prazo em rodadas:
  - "Setor Norte +3.000 lugares";
  - "Iluminação LED completa";
  - "Camarotes premium", que exige o Setor Norte.

  Inclua a obra em andamento (rodadas restantes) e as concluídas.
- **CAP06-N01 Propostas de patrocínio.** Lista de propostas: empresa, valor por temporada e duração. Ações "Aceitar" e "Recusar".
- **CAP02-N05 Extrato financeiro.** Movimentações por rodada (tipo, descrição, valor + ou −) e saldo. Use as cores da Finanças aprovada: lima para positivo e vermelho para negativo.
- **CAP05-T08 Olheiros e missões (refazer).** Olheiros contratados ("Olheiros em campo"), ação "Contratar olheiro" e missões (região ou posição, custo, prazo em rodadas, botão "Nova missão"). Inclui também "Indicações dos olheiros" e "Enviar olheiro ao mercado".
- **CAP05-T09 Relatórios e prospectos (refazer).** Relatórios das missões, com jogador, posição, overall estimado e potencial estimado. Ação "Ver jogador".
- **CAP05-T10 Categorias de base (refazer).** Atletas da base, com idade, posição, overall e potencial. Ações "Promover ao profissional" e "Dispensar".

#### H. Abas Jogos e Mais
- **CAP04-N07 Copa do Brasil.** Chaveamento por fase (1ª fase, 2ª fase, Oitavas de final, Quartas de final, Semifinal, Final), com ida e volta e o seu confronto destacado. Inclua o estado "eliminado" e o estado "campeão".
- **CAP04-N08 Estatísticas.** Abas: Meu Time, Campeonato, Temporada Atual e Histórico. Blocos: Retrospecto, Gols, Disciplina e defesa, Mandante × visitante. Sem gráficos inventados; números em lista.
- **CAP04-N09 Retrospecto (H2H).** Confrontos entre dois clubes: vitórias, empates, derrotas e últimos jogos.
- **CAP07-T01 Mais / menu (refazer, se preciso).** Itens:
  - Perfil do treinador;
  - Conquistas;
  - Premiações;
  - Ranking;
  - Loja;
  - Configurações;
  - Central de ajuda;
  - Saves;
  - Sair.
- **CAP07-N01 Editar perfil:** nome do treinador.
- **CAP07-N02 Ranking:** abas Todos e Amigos. Cada linha mostra posição, treinador e pontos. Ação "Convidar amigo" (gera um link).
- **CAP07-N03 Loja.** Pacotes de créditos com preço; itens que usam créditos (boosts, olheiro extra); saldo de créditos; histórico de compras.
- **CAP07-N04 Premiações:** prêmios da temporada (artilheiro, melhor jogador, etc.).
- **CAP07-T03 Central de ajuda (refazer):** perguntas frequentes em lista expansível e contato.

#### I. Pendências visuais herdadas
1. **Wordmark × logo final.** A v2 usa o wordmark "BRDATA" em texto. Defina se ele fica, ou entregue o arquivo final do logo (SVG, versões clara e escura, tamanho mínimo).
2. **Botões de voltar.** Defina a ênfase das ações de retorno ("Voltar ao clube", "Voltar ao resultado", "Voltar à partida"): lima de largura total, como está hoje, ou ação secundária em texto. Aplique a mesma regra em todas as pranchas.

### 5. Prioridade de entrega
Entregue nesta ordem, em lotes de 3 telas por prancha:
1. **B.** Semana e pós-jogo.
2. **A.** Acesso.
3. **C.** Temporada.
4. **D.** Tática e treino.
5. **E.** Elenco e contratos.
6. **F.** Mercado.
7. **G.** Clube.
8. **H.** Jogos e Mais.
9. **I.** Pendências.

## FIM DO PROMPT
