# Carreira 2.0: plano para separar `/carreira` de `/carreira-old`

- **Data:** 03/11/2026 (situação atualizada em 05/11, seção 9).
- **Status:** fases 0 a 11 e P8 na `main` (#57 a #70); fase 12 em andamento (etapas 1 e 2 na `main`, etapa 3 em PR). Pendentes: as etapas 4 a 6 da fase 12. Ver a seção 9.
- **Atualização de 03/11:** chegou o pacote complementar do GPT, com as pranchas 17 a 45 (`referencias/complemento_17_45/`). Veja a seção 6.
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

## 6. Pacote complementar do GPT (03/11): o que chegou e o que falta

**O que veio** (está em `referencias/complemento_17_45/`):
- 29 pranchas (17 a 45), com 87 telas e variantes;
- `Briefings_visuais.md`;
- `Inventario_novo.csv`, idêntico ao anexo enviado à parte.

**Cobertura:** todas as telas pedidas no prompt (seções A a H), mais as duas decisões herdadas (seção I).

### 6.1 Decisões de estilo que o GPT trouxe
1. **Wordmark:** BRDATA em texto, com "BR" branco e "DATA" lima. É o mesmo da v2, então não muda nada.
2. **"Voltar ao …" vira ação secundária em texto.** O lima fica só para progressão e confirmação (Continuar, Salvar, Receber, Confirmar, Iniciar amistoso).
3. **Telas de leitura não ganham botão principal inventado.** Respostas e ações por item fazem o papel de ação principal.
4. **Confirmação obrigatória só na mudança de clube.**
5. **Acessibilidade:**
   - controles interativos com borda e foco em `#A9AEB7`;
   - campos e segmentos com 44 a 48 px;
   - safe areas pelo `env()`;
   - rodapé sem cobrir conteúdo.

### 6.2 O que eu resolvo sozinho, conferindo no código
| Dúvida do GPT | O que o jogo tem |
|---|---|
| Rótulos das pontas dos 4 eixos | Ritmo: Muito paciente ↔ Muito direto; Pressão: Baixa ↔ Alta; Linha: Recuada ↔ Adiantada; Passe: Curto ↔ Bola longa |
| Opções das instruções por setor | Cada instrução é uma escala de 5 níveis com rótulos nas pontas (ex.: Compactação: Aberta ↔ Compacta), e não uma lista de opções. Ver P4 |
| Máximo de parcelas | À vista (1x), 2x, 3x, 4x |
| Ida e volta na Copa | Todas as fases são em ida e volta (`CUP_ROUNDS_EXPANDED`) |
| Placar dos pênaltis | O jogo só registra que houve pênaltis e quem venceu; não há placar da disputa. Ver P5 |
| Contato da central de ajuda | O jogo só tem o texto "Não encontrou? Fale com o suporte pelo site."; não há canal próprio |
| Ação de iniciar obra no estádio | Existe (`startStadiumUpgrade`), com custo e prazo reais por melhoria |
| Nomes, overall e valores marcados "—" | Vêm do save, como em todas as telas da v2 |

### 6.3 Pendências que precisam da sua resposta
**P1. "Voltar ao …" como texto nas telas já aprovadas?**
A regra nova põe "Voltar ao …" como ação secundária em texto. Nas telas já aprovadas ele é **botão lima**: Tabela ("Voltar ao clube"), Lances ("Voltar à partida" / "Voltar ao resultado") e Tabela pelo Resultado.
- (a) Aplicar a regra também às telas aprovadas (recomendo, pela consistência).
- (b) Valer só para as telas novas.

**P2. Topo com "CARREIRA 2.0" à direita?**
As pranchas novas põem "CARREIRA 2.0" à direita do topo. As telas aprovadas mostram ali o contexto da tela ("Partida", "Resultado", "Tabela").
- Recomendo manter o contexto.

**P3. Margens laterais.**
O pacote pede 24 px (20 px em 360). A v2 aprovada usa 16 px.
- (a) Manter 16 px (recomendo, porque é o que você aprovou e cabe mais conteúdo).
- (b) Passar tudo para 24/20 px.

**P4. Instruções por setor.**
A prancha desenha campos "Selecionar", com lista de opções. No jogo, cada uma das 15 instruções é uma escala de 1 a 5 com rótulos nas pontas.
- Recomendo usar o mesmo controle de 5 passos da tela "Instruções táticas" (CAP03-T03), mantendo abas, títulos e rodapé da prancha.

**P5. Pênaltis na Copa (CAP04-N05).**
A prancha mostra um placar dos pênaltis, que o jogo não tem.
- Recomendo trocar a linha por "Decidido nos pênaltis · Classificado: <clube>".

**P6. Partida da Copa (CAP04-N05).**
A prancha redesenha o topo da partida sem a faixa com a foto do estádio, que você aprovou na A1.
- Recomendo manter a faixa aprovada e acrescentar só o contexto: o kicker "COPA DO BRASIL · OITAVAS · VOLTA" e a linha do agregado na volta.

**P7. Navegação: de onde se chega a cada tela nova.**
O pacote desenha as telas, mas não os pontos de entrada. Hoje a v2 tem Início, Elenco, Jogos e Mais. Faltam:
- **Jogos:** uma tela de entrada que reúna Calendário (já existe), Tabela (já existe), Copa do Brasil, Estatísticas e Retrospecto.
- **Clube:** as pranchas dizem "Voltar ao clube", mas a v2 não tem uma tela "Clube". Ela precisa reunir Diretoria, Finanças e Extrato, Comissão, Estádio, Patrocínios, Olheiros e Base, Mercado e Contratos.

Opções:
- (a) Pedir ao GPT as duas telas de entrada (Jogos e Clube) e o mapa de navegação (recomendo).
- (b) Eu desenho as duas no padrão das listas da v2 (como o Início) e te mostro antes.

**P8. Telas que ainda não têm prancha.**
Estes fluxos não foram pedidos nem desenhados:
- contratar comissão técnica (lista de candidatos);
- contratar olheiro, nova missão e indicações dos olheiros;
- detalhe de melhoria do estádio com "Iniciar obra";
- confirmação de compra na loja;
- detalhe de conquista;
- conteúdo de Configurações;
- notificações (sino);
- primeira entrada e tutorial (assistente de início).

Opções:
- (a) Mandar ao GPT num segundo lote curto (o prompt fica pronto se você quiser).
- (b) Eu sigo o padrão da v2 (folhas e listas), sempre mostrando a você antes de implementar (D4 b).

### 6.4 Efeito no plano
- **Fases 3 a 10:** agora têm prancha para quase todas as telas. A coluna "sem prancha" das tabelas da seção 3 passa a apontar para `complemento_17_45`, exceto os itens de P7 e P8.
- **Contagem:** 87 telas e variantes novas, mais as cerca de 10 do pacote anterior (acesso, notícias, encerramento, perfil do treinador, menu e saves).
- **O que pode começar logo:**
  - a fase 1 (motor invisível), sem depender de nenhuma resposta;
  - a fase 2 (acesso), assim que D1 a D4 estiverem respondidas.
- **P1 e P3 afetam telas já aprovadas.** Qualquer ajuste nelas vira uma entrega própria, com comparação e aprovação.

## 7. Decisões do Murilo (03/11)
| # | Decisão |
|---|---|
| D1 | **Mesma carreira** nas duas versões. A independência é de telas e navegação |
| D2 | **Motor escondido agora** (quadro invisível em rota própria, `/carreira/motor`), **extração em etapas depois** (fase 12) |
| D3 | **Só homologação** até a v2 ficar completa. Em homologação, os pontos ainda não refeitos continuam abrindo `/carreira-old` |
| D4 | Telas com prancha do pacote complementar seguem a prancha. As que faltam (P7, P8) são desenhadas pelo Claude no padrão v2 e mostradas antes de implementar |
| P1 | "Voltar ao …" vira **ação secundária em texto em todas as telas**, inclusive nas já aprovadas (Tabela, Lances, Tabela pelo Resultado) |
| P2 | O topo mantém o **contexto da tela** à direita ("Partida", "Tabela"…), não "CARREIRA 2.0" |
| P3 | **Margens laterais de 24 px (20 px em 360)** em toda a v2, inclusive nas telas aprovadas, no lugar dos 16 px |
| P4 | Instruções por setor com a **escala de 5 passos** e os rótulos reais, igual às Instruções táticas |
| P5 | Pênaltis na Copa: "**Decidido nos pênaltis · Classificado: <clube>**", sem placar |
| P6 | Partida da Copa: a **faixa aprovada** (estádio, escudos, placar) ganha o kicker de fase, ida/volta e a linha do agregado |
| P7 | As telas de entrada **Jogos** e **Clube** e o mapa de navegação são desenhados pelo **Claude no padrão v2**, com aprovação antes de implementar |
| P8 | Os fluxos sem prancha também ficam com o **Claude no padrão v2**, com aprovação antes de implementar: contratar comissão; contratar olheiro, nova missão e indicações; obra do estádio; compra na loja; detalhe de conquista; Configurações; notificações; assistente de primeira entrada |

**Efeito no plano:**
- **P1 e P3 mudam telas já aprovadas.** Entram numa entrega própria, **"Ajustes de sistema"**, logo antes da fase 2: margem de 24/20 px e "Voltar" em texto em todas as telas existentes, com comparativo antes × depois para aprovação.
- **P7 vira a primeira tela da fase 3:** mapa de navegação, mais as entradas Jogos e Clube. Sem elas, as telas novas não têm por onde ser abertas.
- **Ordem:**
  1. fase 1 (motor);
  2. "Ajustes de sistema" (P1, P3);
  3. fase 2 (acesso);
  4. mapa de navegação e entradas (P7);
  5. fases 3 a 11.

## 8. Situação em 03/11 (noite)

### Entregue
| Etapa | Situação | PR | CI |
|---|---|---|---|
| Fase 0: decisões D1–D4 e P1–P8, pranchas 17–45 | concluída | dentro do #57 | — |
| Fase 1: motor invisível (`/carreira/motor`, reaproveitado, save sempre atualizado) | aprovada | #57 → `main` | verde |
| Ajustes de sistema (P1 "Voltar" em texto; P3 margens 24/20 px) | aprovada | #58 → `fase1-motor` | rodando |
| Fase 2: acesso (login, criar carreira, primeira entrada, recompensa diária, sessão expirada) e bug do dia 7 corrigido | aprovada | #59 → `ajustes-sistema` | rodando |

Nenhum dos três PRs foi mesclado ainda. Eles estão em pilha, e a ordem de merge é #57 → #58 → #59.

### Pontos de dependência (seção 1)
| # | Ponto | Situação |
|---|---|---|
| 1 | Sem sessão / sem carreira / sessão expirada | **resolvido** (fase 2) |
| 11 | Motor em `/carreira-old` | **resolvido parcialmente** (fase 1). Agora fica em `/carreira/motor`, mas ainda é a página antiga escondida, até a fase 12 |
| 2 | Barra: Jogos e Mais | pendente (fase 10) |
| 3 | Início: Avançar semana, Amistoso, Próxima temporada | pendente (fases 3 e 5) |
| 4 | Início: avisos e Notícias | pendente (fases 3 e 8) |
| 5 | Escalação → Tática e instruções | pendente (fase 6) |
| 6 | Elenco → filtros | pendente (fase 7) |
| 7 | Perfil → contrato e ações | pendente (fase 7) |
| 8 | Tabela → elenco de outro clube | pendente (fase 7) |
| 9 | Finanças → mercado, patrocínio, estádio e orçamento | pendente (fases 8 e 9) |
| 10 | Pós-jogo em tela cheia da versão anterior | pendente (fase 4) |

**Resumo:** 1 dos 11 pontos resolvido, 1 resolvido em parte e 9 pendentes. Esses 9 continuam abrindo `/carreira-old` só em homologação (D3).

### Próximas entregas, nesta ordem
1. **Mapa de navegação e telas de entrada "Jogos" e "Clube" (P7).** Desenhadas por mim no padrão da v2 e mostradas antes de implementar. Sem elas, as telas das fases 3 a 10 não têm por onde ser abertas.
2. **Fase 3, a semana:**
   - Semana concluída;
   - pré-jogo de amistoso;
   - Notícias;
   - notificações.
3. **Fase 4, pós-jogo:**
   - Coletiva;
   - Resultados da rodada;
   - Copa ao vivo, com a faixa aprovada mais o contexto (P6) e o "Decidido nos pênaltis" (P5);
   - Proposta recebida.

   Ela tira a última transição em tela cheia.
4. **Fase 5,** temporada e carreira do treinador.
5. **Fase 6,** tática e treino, com a escala de 5 passos nas instruções por setor (P4).
6. **Fases 7 a 10:** elenco avançado, mercado, clube, Jogos e Mais.
7. **Fluxos sem prancha (P8),** junto da fase de cada um:
   - tutorial e assistente de início;
   - contratar comissão e olheiro;
   - obra do estádio;
   - compra na loja;
   - conquista;
   - configurações;
   - notificações.
8. **Fase 11, o corte:** a v2 sem nenhum link para `/carreira-old`. **Fase 12, opcional:** extrair o motor.

### Pendências em aberto
- **Merges** dos PRs #57, #58 e #59: só com a sua ordem.
- **Homologação:**
  - conferir a publicação pelo SHA;
  - medir o tempo de abertura do motor no celular (no servidor local, ~0,5 s depois da espera de 1,5 s);
  - testar Safari/iPhone com VoiceOver (AUD-04/05).

  A rede deste ambiente bloqueia o domínio de homologação.
- **`/carreira.html`** (app instalado, notificações e volta do pagamento) continua abrindo a versão anterior. O destino final se decide na fase 11.
- **Até a entrega P8,** quem cria carreira pela v2 não vê o tutorial nem o assistente de início.

## 9. Situação em 05/11
A seção 8 é o retrato de 03/11 e fica como histórico.

### Fases
| Fase | PR | Situação |
|---|---|---|
| 1 — motor invisível | #57 | na `main` |
| Ajustes de sistema (P1, P3) | #58 | na `main` |
| 2 — acesso | #59 | na `main` |
| P7 — navegação (Jogos, Clube, Mais) | #60 | na `main` |
| 3 — a semana | #61 | na `main` |
| 4 — pós-jogo | #62 | na `main` |
| 5 — temporada e carreira do treinador | #63 | na `main` |
| 6 — tática e treino | #64 | na `main` |
| 7 — elenco avançado | #65 | na `main` |
| 8 — mercado | #66 | na `main` |
| 9 — clube | #67 | na `main` |
| 10 — Jogos e Mais (+ favicon e escudos negativos) | #68 | na `main` |
| 11 — corte (v2 na raiz, site em `/brasileirao`, versão anterior redireciona) | #69 | na `main` |
| P8 — tutorial, assistente de início e "Compartilhar título" | #70 | na `main` |
| 12.1 — núcleo da partida em `public/js/motor/partida.js` | #71 | na `main` |
| 12.2 — tabela, calendário e rodada simples (`motor/tabela.js`, `calendario.js`, `rodada.js`) | #73 | na `main` |
| 12.3 — finanças (`motor/financas.js`) | próximo PR | `ENTREGA_F12_3_FINANCAS.md` |
| 12.4 a 12.6 — treino, mercado, temporada | — | **não iniciadas** |

### Pontos de dependência (seção 1)
- **1 a 10:** resolvidos. Nenhuma tela da v2 abre a versão anterior. O teste `test_v2_corte.js` navega por 70 telas sem nenhuma saída.
- **11 (motor):** resolvido em parte. A v2 ainda roda a página antiga escondida em `/carreira/motor`. Ela só sai com a fase 12.

### Pendências
1. **Homologação e publicação:** roteiro em `ROTEIRO_HML_PRD.md`.
   - Itens que precisam de aparelho: tempo do motor no celular e Safari com VoiceOver.
   - A publicação em produção é manual no Railway.
2. **Fase 12, extrair o motor** (ordem da seção 3): partida → rodada e tabela → finanças → treino → mercado → temporada. Enquanto ela não sai:
   - a v2 carrega o `carreira.js` escondido;
   - cerca de 150 testes de regressão do motor rodam pela tela antiga (`BRDATA_LEGACY_UI=1`, só no servidor de testes).
3. **Riscos conhecidos, sem ação agora:**
   - mesmo save nas duas abas (D1);
   - pacote da v2 com 507 kB, sem divisão por tela;
   - escudos do modo ao vivo sem versão negativa;
   - SEO de `/tabela`, `/estatisticas` e `/noticias`, que agora são telas da v2.
