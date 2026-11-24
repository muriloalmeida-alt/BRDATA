# Handoff para integrar o pacote ao BRDATA

Integre ao Modo Carreira v2 as duas primeiras divisões de Inglaterra, Espanha, Itália, Alemanha e França. Preserve as carreiras brasileiras e aplique a mesma paridade de gestão CPU às duas divisões do país ativo.

## 1. Cadastro e carregamento

- Cadastre as dez competições no backend usando os IDs de `dados/ligas.json`. Reuse `premier_league` e `la_liga` já existentes no backend. O endereço do arquivo e `providerLeagueIds.frozen` devem resolver para o mesmo ID.
- Use os dez snapshots de `integracao/snapshots` em `server/frozen-catalog/`. Os snapshots implementam a estrutura `teams`, `standings`, `playersByTeamId`. A rota atual de elencos aceita apenas dígitos no segmento do time. O mapa `integracao/ids-motor.json` traz IDs numéricos que podem ser usados nessa rota e nas referências do estado. Cheque colisões com o catálogo brasileiro antes de gravar saves. Trate os IDs externos como metadados.
- No motor, mapeie a identidade do clube uma única vez. Em partidas, pais de equipes B e mudanças de divisão, use o mesmo mapa. A composição atual da divisão vem do save depois da primeira virada. O seed é o ponto de partida.
- Acrescente um seletor país → divisão → clube. Selecione a configuração da Carreira por país. O backend e o catálogo offline devem servir as duas divisões daquele país com índice de versões. O país padrão de save antigo pode ser inferido do ID da competição brasileira. Garanta que um arquivo faltante provoque erro de carregamento claro para uma competição europeia.
- Use `assets/escudos` como fonte local preferencial depois de mover os arquivos para uma rota estática do jogo. O JSON guarda o caminho relativo ao pacote e a URL original. Preserve cores e capacidade do catálogo europeu, com fallback visual de iniciais e cores da liga se necessário.
- Para o elenco, passe `id`, `name`, `photo`, `position`, `age`, `rating`, `games`, `goals`, `assists` ao construtor real já existente. Campos auxiliares ficam no catálogo canônico para upgrades. Evite buscar provedores externos em tempo de jogo.

[Provider congelado](https://github.com/muriloalmeida-alt/BRDATA/blob/main/server/src/providers/frozen.js#L36-L88) · [Rota numérica de elenco](https://github.com/muriloalmeida-alt/BRDATA/blob/main/server/server.js#L2067-L2077) · [Catálogo offline atual](https://github.com/muriloalmeida-alt/BRDATA/blob/main/server/src/catalogoOffline.js) · [Construção do jogador](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/virada.js#L64-L124)

## 2. Temporada e regulamentos

- O calendário europeu cruza anos. Guarde `seasonKey`, ano inicial, ano final e fuso no save. Na simulação, uma semana pode ter mais de um compromisso e o mesmo clube pode ter um confronto adiado. O identificador de rodada e a data de jogo são campos independentes.
- Em 2026/27, carregue o calendário do pacote com a tabela zerada e trate os placares de referência como consulta. Se a agenda for montada por data, converta as partidas marcadas como `UTC` para o fuso do campeonato. Trate partidas com data provisória segundo as janelas de rodada. Nos anos seguintes, gere turno e returno pelo calendário do país revisto para a composição do save.
- Substitua o fim fixo na rodada 38 e a cascata brasileira hardcoded no caminho de execução europeu. Use os regulamentos de `ligas.json` para critérios de classificação e transições. Crie confrontos de desempate e playoffs como fases distintas, com mandos e regras de resolução próprias. O fechamento só pode aplicar movimentos depois de finalizar as fases necessárias.
- Para desempate por confronto direto e gols fora, persista o mínimo necessário dos resultados por confronto. A tabela em tela deve usar a ordenação da divisão, com a mesma ordenação usada para conceder acesso e playoff. Os perfis de classificação do Brasil permanecem disponíveis para seus próprios saves.
- Copas nacionais e UEFA podem ser preparadas em uma etapa separada. O caminho europeu inicial roda as ligas, suas decisões de acesso/descenso e os amistosos existentes quando fizerem sentido no calendário.

[Calendário/virada atual](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/virada.js#L787-L889) · [Classificação atual](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/tabela.js)

## 3. Terceira divisão como catálogo

Reaproveite o comportamento da Série D. Dentro do país ativo, escolha por sorteio determinístico, sem repetição, o número de elegíveis necessário para a reposição. Acrescente ao catálogo os clubes que caíram da segunda e retire dele os promovidos. Preserve o ID e, para clube antes jogável, o estado indispensável que o modelo atual mantém. Materialize elenco fictício quando um clube do catálogo passa à segunda e não há elenco persistido, com 22 atletas, pelo menos dois goleiros e uma escalação utilizável de 11 titulares e 11 reservas.

- Inglaterra, Espanha e Itália repõem três, quatro e quatro clubes, respectivamente. Na Itália, determine primeiro as quedas diretas e o playout quando previsto. Alemanha e França sorteiam dois promovidos diretos e um terceiro elegível para enfrentar o 16º da segunda. Se o representante do catálogo perde, permanece no catálogo. Se vence, troca de lugar com o clube da segunda.
- Utilize `promotionEligibility` e `parentClubId` ao fechar a temporada. Para Espanha e Itália, avalie a posição do clube principal já resolvida para o próximo ano antes de selecionar um B. Não use a classificação pública de referência como ordem obrigatória de sorteio. No catálogo alemão, Hoffenheim II e Stuttgart II permanecem registrados e ficam bloqueados para promoção.
- Proteja o clube controlado quando cairia abaixo do último nível jogável, como já ocorre no Brasil. Em uma queda direta, transfira a vaga ao próximo clube elegível da zona inferior. Se o clube protegido for o 16º convocado para o barrage, use um clube da mesma divisão elegível ao slot pela ordem da tabela, sem repetir um clube já rebaixado. Registre a proteção no resumo da virada, como exceção de produto.
- Garanta uma transação lógica única no fechamento. IDs de clubes nas duas divisões e no catálogo formam conjuntos exclusivos. Conte vagas e valide as duas novas divisões antes de atualizar o save. O mesmo seed e os mesmos resultados devem produzir a mesma reposição após recarregar.

[Regra atual de reposição pela Série D](https://github.com/muriloalmeida-alt/BRDATA/blob/main/public/js/motor/temporada.js#L411-L468)

## 4. Finanças, CPU e desempenho

- O caminho europeu inicializa caixa, teto, folha, TV e moeda pelo seed documentado. Normalize a folha uma vez na criação, mantenha uma política de salário de mercado compatível e use as capacidades do catálogo para a bilheteria. O usuário vê a mesma moeda nas ofertas, dotações, renovações, premiações e extratos. Use as mesmas regras para salários e caixa dos CPUs.
- O mundo simulado é o país da carreira. As outras ligas ficam disponíveis para criar outro save. Faça lookup indexado por ID e carregamento por país. Empacote o catálogo offline na implantação e deixe as partidas simuladas independentes da rede. Nas semanas comuns, reaproveite as rotinas de CPU e as cadências de mercado que o projeto já usa.
- Não persista cópia completa do catálogo estático em cada save. Persista identidade, versão relevante, calendário corrente e estado de clubes/jogadores alterável. Use as proteções atuais de crescimento do save e evite nova simulação detalhada da terceira divisão.

## Critérios para concluir a implementação

1. Criar uma carreira com cada país e com início nas duas divisões, sem rede após materializar o pacote. Abrir escalação, calendário, tabela, mercado e extrato.
2. A primeira rodada começa com zero pontos. Cada clube tem um jogo por rodada regular e a divisão termina com 34, 38, 42 ou 46 jogos por clube conforme o cadastro.
3. Cobrir os eventos que mudam implementação: playoff de seis no Championship, empate espanhol com vantagem de classificação, limiares italianos de 14 e 4 pontos, confronto alemão entre divisões, playoffs franceses e restrição dos clubes B.
4. Encerrar uma temporada em cada país em smoke test curto. Verificar que atleta, contrato e histórico sobrevivem ao acesso, à queda e ao reload. Verificar reposição determinística sem duplicatas e proteção do clube humano.
5. Executar a suíte atual do Brasil com a configuração antiga. Usar casos pequenos para os novos formatos e 1 teste leve de virada por país. Comparar tempo do avanço e tamanho dos saves com a linha de base atual, incluindo o pior caso de 44 clubes na Inglaterra.
6. Tratar como decisões de produto os parâmetros de orçamento, majorantes salariais e regras para um país fora da Carreira ativa. O pacote entrega os dados e contratos de integração. A ativação ainda depende de implementar e validar estes fluxos no repositório.
