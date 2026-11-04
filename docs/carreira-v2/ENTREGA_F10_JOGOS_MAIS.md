# Carreira 2.0: fase 10 do plano de independência (abas Jogos e Mais)

- **Data:** 04/11/2026.
- **Branch:** `fase10-jogos-mais`, a partir de `main` (com o #67, fase 9).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências** (pranchas do complemento):
- 40, col. 3 e 41, col. 1 e 2 (CAP04-N07, Copa do Brasil em disputa, eliminado e campeão);
- 41, col. 3 e 42 (CAP04-N08, Estatísticas);
- 43 (CAP04-N09 Retrospecto H2H, CAP07-T01 Mais, CAP07-N01 Editar perfil);
- 44 (CAP07-N02 Ranking, CAP07-N03 Loja);
- 45 (CAP07-N03 Histórico de compras, CAP07-N04 Premiações, CAP07-T03 Central de ajuda).

**Decisões aplicadas** (04/11):
- **Copa:** a da prancha, com dados reais. O título acompanha a situação, e uma escolha de fase mostra o seu confronto em cada fase disputada.
- **Estatísticas:** dois seletores (Meu time ou Campeonato × Temporada ou Histórico) e todas as seções do jogo. As 4 da prancha vêm primeiro.
- **Loja:** na v2. A volta do pagamento continua em `/carreira.html` até a fase 11, sem mudança no servidor.
- **Configurações:** tudo, inclusive as notificações push.
- **Conquistas:** todas, com o cartão para compartilhar.
- **Premiações:** a prancha mais tudo o que o jogo guarda.
- **Ranking:** tudo do jogo (Todos, Amigos, convite e adicionar amigo por código).
- **Central de ajuda:** a prancha com as perguntas e a busca do jogo.
- **Saves:** a carreira atual e "Reiniciar".
- **H2H:** abre pelo Pré-jogo e pelo elenco do adversário.
- **Pedido de orçamento:** entra nesta fase, na Diretoria.

## Resultado principal
**As abas Jogos e Mais e o pedido de orçamento passaram para a v2.** Nenhuma linha dessas abas, das Finanças ou da Diretoria abre mais a versão anterior.

O que ainda leva a `/carreira-old` é só o que a fase 11 vai cortar:
- o botão principal do Início para ações antigas (`CtaLink`);
- o tipo `legacy` dos hubs, que ficou sem nenhum uso;
- o retorno do pagamento e o link de convite, que apontam para `/carreira.html`.

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Copa do Brasil** ("A caminho da taça." / "Sua campanha terminou." / "A Copa é sua.") | Jogos | Situação; escolha de fase (as que você disputou); seu confronto com escudos, ida, volta, agregado e pênaltis, do seu ponto de vista; o campeão quando a Copa termina |
| **Estatísticas** ("O jogo em números.") | Jogos | <ul><li>Meu time: retrospecto (com aproveitamento), gols, disciplina e defesa, mandante × visitante, sequências e recordes, Copa e artilheiros e garçons</li><li>Campeonato: a competição (gols, média, melhor ataque e defesa), os times e os artilheiros</li><li>No histórico: campeões, títulos por clube e artilheiros históricos</li></ul> |
| **Retrospecto** ("O histórico do duelo.") | Pré-jogo → "Histórico do duelo", ou elenco do adversário | Vitórias, empates e derrotas; os últimos 5 resultados; os últimos 10 jogos (temporada, rodada, escudos e placar) |
| **Premiações** ("Quem fez a diferença.") | Mais | Escolha da temporada; artilheiro, assistências, melhor jogador, campeão e vice do Brasileirão e da Copa; os seus títulos; ★ marca o seu clube |
| **Conquistas** ("Sua vitrine.") | Mais | As 7 conquistas do jogo, com nível ou progresso, filtro por categoria e a próxima a desbloquear; o detalhe tem "Compartilhar", que gera o mesmo cartão de imagem do jogo |
| **Ranking** ("Veja sua posição.") | Mais | <ul><li>Abas Todos e Amigos; a sua linha destacada (a pontuação é publicada ao abrir, como hoje)</li><li>Seu código e adicionar amigo pelo código</li><li>"Convidar amigo" compartilha o link (ou copia)</li></ul> |
| **Loja** ("Mais opções de jogo.") | Mais | <ul><li>Saldo de créditos</li><li>Os 5 pacotes: confirmação → Checkout Pro do Mercado Pago</li><li>Os 6 itens com créditos: confirmação; sem saldo, fica bloqueado</li><li>Histórico de compras ("Suas compras.")</li></ul> |
| **Configurações** ("Do seu jeito.") | Mais | Clube atual e Saves; 3 notificações do jogo; push (ativar, desativar e teste); efeitos sonoros; Editar perfil, Histórico de compras, Ajuda e Privacidade |
| **Editar perfil** ("Seu nome no jogo.") | Configurações | Nome do treinador (salvo na conta) e o e-mail mascarado |
| **Central de ajuda** ("Como podemos ajudar?") | Mais | As 4 perguntas do jogo (abrem e fecham), a busca e Contato |
| **Saves** ("Sua carreira salva.") | Mais ou Configurações | Clube, temporada, rodada, caixa e última gravação; "Reiniciar carreira" pede para digitar REINICIAR, apaga a carreira e abre a criação da v2 |
| **Pedido de orçamento** ("Peça reforço.") | Diretoria → "Pedir mais orçamento", ou Finanças | Teto e caixa atuais, a última resposta e a regra; "Pedir mais orçamento" mostra a resposta (aprovado: + teto e + caixa) e o intervalo de 4 rodadas |

**Capturas** (pasta `evidencias/F10-jogos-mais/`, 390×844): CAPTURAS.

**Comparativos** (prancha × v2): 15 arquivos, de `comparativo-01-copa-em-disputa.png` a `comparativo-15-ajuda.png`.

## Motor (ponte)
Os comandos novos usam as funções de sempre:
- `pedirOrcamento` e `orcamento`: `boardRequest`, extraída de `askBoard` sem mudar regras;
- `conquistas`: `evaluateAlwaysCheckableAchievements` e o catálogo;
- `pontuacaoRanking`: `computeLeaderboardScore`;
- `loja` e `comprarItem`: o débito é feito no servidor (`/api/loja/spend-credits`), e depois vêm `applyBoostEffect` e `pushPurchaseHistory`, como em `confirmPurchaseNow`;
- `preferencias`, `alternarNotificacao` e `somAtivo` (`setSfxEnabled`);
- `salvarNome`: o mesmo `PUT /api/account/name`.

**A v2 chama direto os endpoints da conta que a versão anterior já usa:**
- `/api/leaderboard`, `/api/leaderboard/publish` e `/api/friends/add`;
- `/api/loja/checkout`;
- `/api/push/*`;
- `DELETE /api/career`.

As notificações push usam o mesmo service worker (`/sw.js`). O cartão de conquista foi portado para a v2, com o mesmo desenho, porque compartilhar precisa do toque na própria página. Os dados da Copa, das estatísticas, do H2H e das premiações são lidos do save, com as mesmas fontes e regras de `renderCopa`, `renderEstatisticas`, `renderH2H` e `renderAwardsScreen`.

**Sem mudança de schema e sem endpoint novo.**

## Pontos para sua avaliação
1. **Retorno do pagamento e convite** continuam em `/carreira.html` (versão anterior) até a fase 11, como decidido.
2. **Saves:** para apagar, pedi para digitar REINICIAR, uma confirmação mais forte que o "Continuar" de hoje, porque não dá para desfazer.
3. **Estatísticas:** as tabelas (times, artilheiros, campeões) rolam na horizontal dentro da seção se ficarem largas, sem rolar a página.
4. **Copa:** a prancha mostra "Voltar ao clube"; aqui é "Voltar aos jogos", porque a tela abre pela aba Jogos.
5. **Ranking:** a fórmula da pontuação aparece embaixo da lista (pontos × 10, conquistas × 50, saldo × 2).
6. **Telas sem prancha:** Conquistas, Configurações, Saves e Pedido de orçamento seguem o padrão da v2.
7. **Camisa e barra inferior** como nas fases anteriores; as abas Jogos e Mais (hubs) mantêm a barra.

## Testes
- **Unitários:** 112/112 (`domain/games.test.ts`, novo, com 3 testes).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_jogos_mais.js`,** com 10 verificações:
  1. links das abas;
  2. Copa;
  3. estatísticas;
  4. retrospecto e premiações;
  5. conquistas e ranking;
  6. loja e histórico;
  7. configurações, nome e ajuda;
  8. pedido de orçamento;
  9. reiniciar carreira;
  10. 360 px e sem `/carreira-old`.
- **Suíte completa:** SUITE_RESULT.
