# Carreira 2.0: plano para separar `/carreira` de `/carreira-old`

- **Data:** 03/11/2026.
- **Status:** proposta, aguardando as decisões D1 a D4.
- **Objetivo** (pedido do Murilo, 03/11): `/carreira` (v2) e `/carreira-old` (versão anterior) **100% independentes**, sem nenhuma transição entre a jornada nova e a antiga.

## 1. Onde a v2 depende hoje da versão anterior
Levantamento feito no código da `main` (`4b06dfe`):

| # | Ponto | O que acontece hoje |
|---|---|---|
| 1 | Sem sessão, sem carreira ou sessão expirada (`App.tsx`) | redireciona para `/carreira-old`, onde estão o login e a criação de carreira. **Foi o que aconteceu no print de 03/11** |
| 2 | Barra inferior: Jogos e Mais | abrem `/carreira-old#jogos` e `#mais` |
| 3 | Início, botão principal: Avançar semana, Ir para o amistoso, Próxima temporada | abrem a versão anterior |
| 4 | Início: avisos (mercado, proposta etc.) e Notícias | abrem a versão anterior |
| 5 | Escalação → "Tática e instruções" | abre a versão anterior |
| 6 | Elenco → filtros e ordenação | abre a versão anterior |
| 7 | Perfil → "Contrato e ações" | abre a versão anterior |
| 8 | Tabela → elenco de outro clube | abre a versão anterior |
| 9 | Finanças → Mercado; patrocínios, estádio e orçamento | abre a versão anterior |
| 10 | Pós-jogo ("Continuar") | a versão anterior aparece **em tela cheia**: coletiva, notícias, resultados da rodada, Copa ao vivo, proposta por jogador e tabela |
| 11 | Motor da partida | a versão anterior roda **escondida** num quadro (`/carreira-old?ponte=partida`) e a v2 desenha por cima |

Para eliminar as transições, cada item de 1 a 10 precisa virar tela da v2. O item 11 não aparece para o usuário, mas é dependência de código (ver D2).

## 2. Decisões necessárias (antes de começar)

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | **Save** | (a) as duas versões leem e gravam **a mesma carreira** (como hoje); (b) cada uma tem a sua | **(a).** Independência de jornada e de telas, não de dados. Com (b), quem já tem carreira começaria do zero na v2, e o servidor precisaria de um segundo save (mudança de API e de schema) |
| D2 | **Motor** (simulação, semana, mercado, temporada) | (A) **motor invisível**: a v2 comanda o motor existente num quadro escondido, ampliando a ponte que já existe na partida; (B) **motor extraído** para um módulo comum às duas versões | **A agora e B depois, em etapas** (fase 12). A entrega a independência visível sem tocar nas regras. B é a refatoração grande do arquivo de 17 mil linhas, que a constituição manda fazer de forma incremental |
| D3 | **Enquanto as telas não ficam prontas** | (i) os pontos ainda não refeitos continuam abrindo `/carreira-old`; (ii) os botões são retirados da v2; (iii) a v2 não vai para o público até ficar completa | **(iii)** para o público, com a homologação seguindo como hoje (i) para acompanhar. (ii) tira funções que existem e contraria a regra de não remover funções reais |
| D4 | **Pranchas** | (a) esperar as pranchas novas do GPT (prompt em `PROMPT_GPT_PENDENCIAS_VISUAIS.md`); (b) seguir o padrão visual da v2 nas telas sem prancha, como fiz em "Ajustar tática" e "Quem sai" | **(a) para as telas grandes** (mercado, tática, treino, contratos, pós-jogo); **(b) para folhas e confirmações simples**, sempre mostradas a você antes |

## 3. Fases
Cada fase segue o processo de sempre:
- comparar com a prancha;
- levar as não conformidades a você antes de implementar;
- uma entrega por vez, com a sua aprovação;
- testes unitários e E2E;
- relatório `ENTREGA_*.md`.

O "motor" de cada tela, com D2 = A, é o comando que a ponte precisa expor. Ele sempre usa a mesma função que o botão da versão anterior chama, sem regra nova.

### Fase 0: preparação
- **0.1** Você toma as decisões D1 a D4.
- **0.2** O GPT produz as pranchas que faltam (prompt pronto). Isso corre em paralelo com a fase 1, que não depende de prancha.
- **0.3** Eu levo ao GPT, no mesmo prompt, os dados reais de cada tela (seção 4 do prompt).

### Fase 1: motor invisível (fundação, sem tela nova)
- **Rota própria para o motor**, `/carreira/motor`. É a mesma página, em modo ponte. A v2 deixa de apontar para `/carreira-old`, que fica livre para seguir a vida dela.
- **Uma sessão de motor por uso da v2**, aberta sob demanda e reaproveitada entre telas. Hoje ela é aberta só na partida.
- **API de comandos genérica**, com resposta e estado padronizados. Os comandos de cada fase entram nela.
- **Teste:** abrir e fechar, prazo, falha e nova tentativa, conforme AUD-06.
- **Risco:** o tempo de carga do motor, de alguns segundos no 1º uso. Mitigação: carregar em segundo plano depois do Início.

### Fase 2: acesso (resolve o problema do print)
| Tela | Prancha | Motor |
|---|---|---|
| Splash / abertura (CAP01-T01) | `03_acesso` col. 1 | — |
| Login (CAP01-T02) | `03_acesso` col. 2 | `POST /api/auth/login` (já existe); "Criar conta" leva ao cadastro no portal (`/?signup=1`), como hoje |
| Seleção da competição (CAP01-T03) | `03_acesso` col. 3 | lista das 3 séries |
| Seleção do clube (CAP01-T04) | `04_inicio_carreira` col. 1 | catálogo de clubes |
| Configurar carreira / nome do treinador (CAP01-T05) | `04_inicio_carreira` col. 2 | `criarCarreira` (startCareer) |
| Primeira entrada (CAP01-T06) | `04_inicio_carreira` col. 3 | — |
| Recompensa diária (login diário) | **sem prancha** | aplicar recompensa |
| Sessão expirada (CAP07-T06) | `16_sessao` (condicional) | o login da v2 (já existe no Resultado) passa a valer para qualquer tela |

**Critério de saída:** com a sessão expirada, sem carreira ou com uma conta nova, tudo acontece em `/carreira`. Nenhum redirecionamento para `/carreira-old`.

### Fase 3: a semana
| Tela | Prancha | Motor |
|---|---|---|
| Avançar semana (semana sem jogo: treino aplicado, prazos, mês) | **sem prancha** | `avancarSemana` |
| Amistoso: pré-jogo e partida | partida já existe; **pré-jogo de amistoso sem prancha** | `iniciarAmistoso` (a partida reaproveita as telas atuais) |
| Notícias (CAP06-T06) | `13_historia` col. 2 | leitura |
| Notificações (sino) | `15_estados` (condicional) | leitura e "marcar lidas" |

### Fase 4: pós-jogo (substitui a tela cheia da versão anterior)
| Tela | Prancha | Motor |
|---|---|---|
| Coletiva de imprensa | **sem prancha** | `responderColetiva` |
| Resumo e resultados da rodada | `02_resultados` col. 2 (já usado na Tabela) | leitura |
| Perna da Copa ao vivo | partida existente + **contexto de Copa sem prancha** | `iniciarPernaCopa` |
| Proposta recebida por um jogador | `09_negociacao` col. 3 (**refazer**: condicional) | `aceitarProposta`, `recusarProposta` |
| Sequência completa | — | o motor informa a próxima etapa pendente; a v2 mostra cada uma |

### Fase 5: temporada e carreira do treinador
| Tela | Prancha | Motor |
|---|---|---|
| Encerramento de temporada (CAP04-T08) | `02_resultados` col. 3 | leitura |
| Nova temporada / Próxima temporada | **sem prancha** | `proximaTemporada` |
| Proposta de outro clube ao treinador (CAP06-T04) | `12_carreira` col. 3 (**refazer**) | `aceitarClube`, `recusarClube` |
| Fim de carreira / demissão (CAP06-T08) | `14_sistema` col. 1 (**refazer**) | fluxo existente |
| Perfil do treinador (CAP06-T01) | `11_base_treinador` col. 3 | leitura |
| Histórico e conquistas (CAP06-T05) | `13_historia` col. 1 (**refazer**) | leitura |

### Fase 6: tática e treino
| Tela | Prancha | Motor |
|---|---|---|
| Instruções táticas (4 eixos × 5 níveis) (CAP03-T03) | `07_tatica` col. 1 (**refazer**: a prancha diz "sem controles", mas eles existem) | `salvarTatica` |
| Instruções por setor (defesa, meio, ataque: 5 cada) | **sem prancha** | `salvarInstrucoesSetor` |
| Esquemas salvos: criar, renomear, aplicar, excluir (CAP03-T04) | `07_tatica` col. 2 (**refazer**) | comandos de esquema |
| Marcação individual | **sem prancha** | `salvarMarcacao` |
| Treinamento semanal (CAP03-T05) | `07_tatica` col. 3 (**refazer**) | `salvarTreino`, `aplicarTreino` |
| Evolução e condição / histórico de fadiga (CAP03-T06) | `08_condicao_mercado` col. 1 (**refazer**) | leitura |

### Fase 7: elenco avançado
| Tela | Prancha | Motor |
|---|---|---|
| Filtros e ordenação do Elenco | **sem prancha** (folha) | leitura |
| Ficha completa do jogador: atributos, contrato, histórico | prancha atual do Perfil + **ficha completa sem prancha** | leitura |
| Contratos (lista "Todos / Vencendo") (CAP05-T06) | `10_contratos` col. 1 (**refazer**) | leitura |
| Renovar contrato (salário sugerido, duração de 1 a 5 anos) | **sem prancha** | `renovar` |
| Conversa individual (ouvir e apoiar, prometer mais chances, cobrar postura) (CAP06-T03) | `12_carreira` col. 2 (**refazer**) | `conversar` |
| Comparar jogadores | **sem prancha** | leitura |
| Elenco de outro clube | **sem prancha** | leitura |

### Fase 8: mercado
| Tela | Prancha | Motor |
|---|---|---|
| Mercado: lista e filtros (60 clubes das Séries A, B e C) (CAP05-T01) | `08_condicao_mercado` col. 2 (**refazer**) | leitura |
| Perfil do alvo (CAP05-T02) | `08_condicao_mercado` col. 3 (**refazer**) | leitura |
| Fazer proposta: valor e parcelamento da taxa (CAP05-T03) | `09_negociacao` col. 1 (**refazer**: a prancha proíbe parcelas, que existem) | `fazerProposta` |
| Negociação e contraproposta: aumentar proposta (CAP05-T04) | `09_negociacao` col. 2 (**refazer**) | `aumentarProposta`, `aceitar`, `recusar` |
| Minhas propostas / Comparar propostas | **sem prancha** | leitura |
| Colocar à venda (valor pedido) / Minhas vendas | **sem prancha** | `anunciar`, `retirar` |
| Propostas recebidas (CAP05-T05) | `09_negociacao` col. 3 (**refazer**) | `aceitar`, `recusar` |
| Empréstimo: duração, % do salário, cláusula de compra | **sem prancha** | `emprestar` (entrada e saída) |
| Confirmar compra | **sem prancha** (folha) | — |
| Histórico de negociações (CAP05-T07) | `10_contratos` col. 2 (**refazer**) | leitura |

### Fase 9: clube
| Tela | Prancha | Motor |
|---|---|---|
| Comissão técnica: contratar e demitir (CAP02-T04) | `05_elenco` col. 3 (**refazer**) | comandos existentes |
| Estádio e infraestrutura (CAP06-T07) | `13_historia` col. 3 (**refazer**) | comandos existentes |
| Propostas de patrocínio | **sem prancha** | `aceitarPatrocinio` |
| Extrato financeiro | **sem prancha** (a Finanças da v2 mostra só as últimas movimentações) | leitura |
| Olheiros: contratar, missões, indicações (CAP05-T08) | `10_contratos` col. 3 (**refazer**) | comandos existentes |
| Relatórios e prospectos (CAP05-T09) | `11_base_treinador` col. 1 (**refazer**) | leitura |
| Categorias de base (CAP05-T10) | `11_base_treinador` col. 2 (**refazer**) | comandos existentes |

### Fase 10: abas Jogos e Mais
| Tela | Prancha | Motor |
|---|---|---|
| Jogos: calendário (já existe), Copa do Brasil (chaveamento), estatísticas, retrospecto (H2H) | **Copa, estatísticas e H2H sem prancha** | leitura |
| Mais: menu e configurações (CAP07-T01) | `14_sistema` col. 2 | — |
| Editar perfil | **sem prancha** | comando de perfil |
| Saves, só a carreira atual (CAP07-T02) | `14_sistema` col. 3 | reiniciar carreira |
| Conquistas / premiações | **sem prancha** (`13_historia` col. 1 a refazer) | leitura |
| Ranking (todos / amigos) e convite de amigos | **sem prancha** | leitura e convite |
| Loja, créditos e histórico de compras | **sem prancha** | checkout existente (volta do pagamento para a v2) |
| Central de ajuda (CAP07-T03) | `15_estados` col. 1 (**refazer**) | — |

### Fase 11: corte
- Remover `adapters/legacy.ts` e todo link da v2 para `/carreira-old`.
- **Teste novo:** varrer o build da v2 e falhar se houver "carreira-old". Navegar por todas as telas e garantir que nenhuma navegação sai de `/carreira`.
- **Na versão anterior:** retirar o tratamento de links vindos da v2 (`V2_DEEP_LINKS`) e decidir com você o destino de `/carreira.html` (app instalado, notificações e volta do pagamento). Hoje ele aponta para a versão anterior. Com a v2 completa, o natural é o app instalado e as notificações abrirem `/carreira`.
- `/carreira-old` continua funcionando sozinha, sem nenhuma ligação com a v2.

### Fase 12 (D2 = B): extrair o motor, em etapas
Monólito → extrair função → testar → extrair módulo → testar → migrar chamadas → remover código antigo (CLAUDE.md §40). As duas versões passam a usar o mesmo módulo, e a v2 deixa de carregar a página antiga escondida.

**Ordem sugerida:**
1. partida;
2. rodada e tabela;
3. finanças;
4. treino;
5. mercado;
6. temporada.

## 4. Tamanho e ordem
- **Telas novas ou refeitas:** cerca de 60. São cerca de 10 com prancha pronta, 20 com prancha a refazer e 30 sem prancha (contagem final quando o GPT entregar o inventário).
- **Ordem recomendada:** 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8 → 9 → 10 → 11 (→ 12).
  - A fase 2 resolve o problema atual.
  - A fase 4 tira a última transição em tela cheia.
- Sem prancha, nenhuma tela grande começa (D4). Enquanto o GPT trabalha, sigo pela fase 1 e pelas telas com prancha pronta (fase 2).

## 5. Riscos
- **Motor invisível (A):** a v2 continua carregando o código antigo por baixo. O tempo de carga e o consumo no celular precisam ser medidos na fase 1.
- **Mesmo save (D1 = a):** gravações simultâneas em duas abas ou nas duas versões. É risco já conhecido; nenhuma migração será feita sem aprovação.
- **Escopo:** é praticamente o jogo inteiro. Cada fase tem entrega e aprovação próprias, para não virar um "reescrever tudo".
