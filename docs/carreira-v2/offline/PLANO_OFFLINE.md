# Plano — OFFLINE-001 (Modo Carreira offline)

**Data:** 13/11/2026
**Origem:** `docs/carreira-v2/offline/BRDATA_Plano_Offline_Claude.md`, sem alteração. Decisão já registrada: a carreira fica na raiz ("/").
**Situação:** implementado (13/11), aguardando a revisão do PM e a homologação no iPhone. Relatório na seção 6.

## 1. Base

- **Branch:** `offline-001`, a partir de `main` em `9e9de49` (SERIED-001 já incorporada).
- **Diferenças em relação ao SHA auditado em 11/11 (`16f63b0`):** entraram FASE1-ESC, FASE1-MER, os lotes L1–L3 de testes e SERIED-001.
  - Nenhuma delas mudou a forma de gravar ou de abrir.
  - A SERIED-001 já trouxe os escudos da Série D para dentro do jogo, com pré-carregamento no service worker.

## 2. Inventário de rede (UI da v2 e motor)

| Ação do jogador | Requisição | Lê / grava | Hoje, sem rede | Substituto offline previsto |
|---|---|---|---|---|
| Abrir o app | `GET /api/auth/me` | conta (nome, créditos, recompensa, tutorial) | resposta antiga do cache do SW | perfil de treinador local |
| Abrir o app / qualquer tela | `GET /api/career` | o save inteiro | resposta antiga do cache do SW (cópia parada) | repositório local (IndexedDB) |
| Toda ação que grava (rodada, escalação, mercado...) | `PUT /api/career` | o save inteiro | **falha**: a ação não fica gravada | transação no repositório local |
| Criar carreira | `GET /api/health`, `/api/career/teams`, `/api/career/standings`, `/api/career/teams/:id/players` | clubes e elencos (reais com chave da API-Sports; senão, `data.js`) | cai nos dados de exemplo (`data.js`) | catálogo no pacote offline (decisão 3) |
| Login / sair | `POST /api/auth/login`, `/logout` | sessão | indisponível | não se aplica: o jogo abre sem login |
| Nome do treinador | `PUT /api/account/name` | conta | falha | nome no perfil local |
| Tutorial visto | `POST /api/account/onboarding-seen` | conta | falha | marca no perfil local |
| Recompensa diária | `POST /api/daily-login/claim` | conta (sequência) e efeito no save | falha | decisão 2 |
| Loja (gastar créditos) | `POST /api/loja/spend-credits`, `/api/loja/checkout` | saldo da conta | falha | decisão 2 |
| Ranking e amigos | `/api/leaderboard*`, `/api/friends/add` | serviço conectado | falha | só com rede, com aviso na tela |
| Notificações push | `/api/push/*` | serviço conectado | falha | só com rede |
| Reiniciar carreira | `DELETE /api/career` | save | falha | apagar no repositório local |
| Fontes | `fonts.googleapis.com`, `fonts.gstatic.com` | Barlow e Barlow Condensed | sem fonte do jogo (cai na do sistema) | fontes empacotadas no jogo |
| Escudos, JS e CSS da v2, motor, `data.js` | mesmo domínio | arquivos | do cache do SW (shell pré-carregado) | inventário versionado (etapa 2) |

**Observado na linha de base** (Chromium, servidor de teste isolado, rede cortada pelo Playwright depois da instalação do SW):
- **Abertura a frio:** o Início e as subrotas (ex.: `/elenco`) abrem.
- **Por quê:** o SW devolve as cópias em cache de `/api/auth/me` e `/api/career`.
- **Problema 1:** a carreira mostrada é a da última resposta guardada. O que se faz offline não é gravado, porque o `PUT` falha.
- **Problema 2:** o cache de `/api/*` guarda respostas privadas por endereço, não por conta. Numa troca de conta no mesmo aparelho, sem rede, o app pode mostrar a carreira da conta anterior.
- **Requisições observadas:** Google Fonts (externo), `/api/auth/me`, `/api/career`, `/api/health`.
- **Ainda não foi feito:** o teste em iPhone real é do Murilo, na homologação.

## 3. Proposta (resumo das etapas do plano)

- **Etapa 1 — primeiro fluxo jogável:**
  - repositório de carreira com IndexedDB, compartilhado pela UI e pelo motor (save com id, revisão, versão do pacote e última operação confirmada);
  - fechamento da rodada em uma transação, com id da partida e revisão esperada; duas abas e dois toques não duplicam;
  - checkpoint da partida em andamento;
  - perfil local sem login.
- **Etapa 2 — PWA e carreira inteira:**
  - shell e subrotas offline;
  - inventário versionado do pacote, com fontes locais;
  - atualização com a versão anterior preservada e o estado "Pronto para jogar offline";
  - todos os fluxos (criação, treino, mercado, Copa, virada) pelo repositório local;
  - conta, amigos, ranking e loja com aviso quando sem rede.
- **Etapa 3 — saves:**
  - importar o save do servidor;
  - exportar e importar arquivo com verificação;
  - pedido de armazenamento persistente.
- **Etapa 4 — homologação:**
  - matriz de cenários automatizada no runner;
  - instruções para o iPhone;
  - plano de reversão.

## 4. Decisões pedidas

1. **Qual save vale.**
   - Recomendado: o do aparelho (IndexedDB) passa a ser o principal. Quando houver rede e conta, o jogo também manda uma cópia ao servidor (backup). A cópia do servidor nunca substitui sozinha o progresso do aparelho; só por importação explícita.
   - Consequência: jogar a mesma carreira em dois aparelhos deixa de ser automático. Isso vale até a sincronização, que o plano deixa fora desta entrega. Para trocar de aparelho, usa-se a exportação ou a importação.
2. **Recompensa diária e loja sem rede.**
   - Recomendado: são serviços da conta e ficam indisponíveis offline, com aviso na tela. O que já foi comprado ou recebido e está no save (boosts, desconto) continua valendo offline. Gastar créditos exige rede. O saldo da conta fica separado do progresso local.
3. **Clubes e elencos de uma carreira criada offline.**
   - Hoje, com a chave da API-Sports, a criação usa dados reais do servidor. Sem chave, usa os de exemplo do `data.js`.
   - Recomendado: o pacote offline leva uma fotografia dos clubes e elencos que o servidor está usando, gerada no deploy e versionada. Assim, a carreira criada offline nasce igual à criada online.
   - Alternativa mais simples: criar offline só com os dados de exemplo do `data.js`.
4. **Entregas.**
   - Recomendado: um PR por etapa (0 + 1, 2, 3, 4), cada um com a sua aprovação. É o que o próprio plano pede.
   - Alternativa: tudo num PR só.

## 5. Decisões do Murilo (13/11/2026)

1. **O save do aparelho é o principal** (recomendado).
   - Com rede e conta, uma cópia vai ao servidor como backup.
   - A cópia do servidor só entra no aparelho por importação explícita, ou quando o aparelho não tiver jogado nada desde a última cópia.
2. **Recompensa diária e loja só com rede** (recomendado).
   - O que já está no save vale offline.
   - O saldo da conta fica separado do progresso.
3. **Carreira criada offline usa uma cópia dos clubes e elencos do servidor**, gerada no deploy e versionada (recomendado).
4. **Tudo num PR só** (diferente da recomendação). As etapas viram commits do mesmo PR.

## 6. Relatório da implementação (13/11/2026)

Um PR, com as etapas em commits.

### 6.1 O que mudou para o jogador

- **A carreira mora no aparelho:**
  - fica no IndexedDB, uma por conta (`public/js/motor/repositorio.js`);
  - toda ação grava primeiro no aparelho; com rede e sessão, uma cópia vai à conta;
  - sem rede, o jogo segue normalmente: abre a frio, joga rodadas, mercado e Copa.
- **A cópia da conta só entra no aparelho em dois casos (decisão 1):**
  - quando o aparelho não jogou nada desde a última cópia;
  - quando o técnico pede, em Mais › Saves › "Trazer a cópia da conta".
- **Conflito entre aparelhos:**
  - se a conta avançou em outro aparelho e este também jogou, nada é sobrescrito sozinho;
  - o jogo segue com a carreira do aparelho e mostra um aviso;
  - em Saves, o técnico escolhe: trazer a da conta ou enviar a deste aparelho.
- **Partida interrompida:** se o app fechar no meio de um jogo da liga, ao reabrir a partida volta pausada, no mesmo minuto e placar.
  - Isso também impede recomeçar o jogo para sortear outro placar.
  - Perna da Copa e amistoso voltam como antes, sem checkpoint.
- **Uma aba por carreira:**
  - a aba aberta por último assume a carreira;
  - a outra mostra "aberta em outra aba", para de gravar e pode retomar a vez ("Jogar aqui").
  - Sem isso, uma aba antiga podia desfazer a rodada jogada na outra.
- **Saves:**
  - exportar a carreira em arquivo (formato, versão e hash; sem e-mail ou nome da conta);
  - importar com verificação e confirmação: arquivo alterado, incompleto ou de versão mais nova é recusado sem mexer em nada.
- **Armazenamento persistente:** o jogo pede ao navegador para não apagar os dados sozinho.
- **Recompensa diária, loja, ranking e amigos (decisão 2):**
  - sem rede, mostram "Sem conexão" e as ações ficam inativas;
  - a recompensa não abre sozinha sem rede;
  - o que já está no save continua valendo.
- **Carreira criada sem rede (decisão 3):**
  - usa a cópia dos clubes, tabelas e elencos do servidor, guardada no aparelho;
  - a cópia é gerada uma vez por deploy, com versão pelo conteúdo, e só é baixada de novo quando muda (`GET /api/career/catalogo-offline`, `server/src/catalogoOffline.js`);
  - sem dados reais no servidor (modo exemplo), vale o `data.js`, igual ao online.
- **Fontes:** Barlow e Barlow Condensed vão no pacote (`public/fonts`, licença OFL). O app não usa mais o Google Fonts.

### 6.2 Mudanças de comportamento para o PM conferir

1. **AUD-02 (falha ao salvar o resultado):**
   - "Tentar salvar novamente" agora só aparece quando o aparelho não consegue gravar.
   - Se só a cópia da conta falhar (sem rede, servidor fora, sessão expirada), o resultado já está salvo e "Continuar" segue.
2. **Sessão expirada no meio do uso:**
   - a folha "Sua sessão expirou." continua, mas pode ser fechada: o progresso já está no aparelho;
   - entrar de novo com a mesma conta manda a cópia; outra conta é recusada e nada é gravado nela.
3. **Sem rede e sem carreira no aparelho:**
   - se o aparelho já viu, com rede, que a conta não tinha carreira, a criação segue offline;
   - senão, aparece "Não foi possível carregar" com "Tentar novamente", para não criar uma carreira que apagaria a da conta.
4. **Reiniciar sem rede:** apaga no aparelho, e a carreira da conta é apagada quando a rede voltar.

### 6.3 Service worker

- O cache da API guarda só dados públicos (lista fechada). O cache antigo (v1), que tinha respostas privadas por endereço, é apagado na atualização.
- Conta, sessão, carreira, loja, amigos, ranking e push vão sempre à rede.
- O shell pré-carrega o motor (com `repositorio.js`) e as fontes.
- Uma subrota nunca aberta online abre sem rede com a página do app.

### 6.4 Testes

- **Novos:**
  - `tests/e2e/test_v2_offline.js`: matriz de 10 cenários, incluindo:
    - SW sem dado privado e fontes locais;
    - abertura a frio e subrota sem rede;
    - rodada sem rede e cópia quando a rede volta;
    - loja e ranking;
    - checkpoint;
    - duas abas;
    - exportar e importar;
    - conflito;
    - 360 px.
  - `tests/e2e/test_v2_offline_catalogo.js` (perfil de servidor frozen): rota do catálogo; carreira criada sem rede com os clubes e elencos reais; cópia quando a rede volta.
- **Adaptados à decisão 1:**
  - `test_v2_gravacao` (AUD-02);
  - `test_v2_esc` (falha de escrita no aparelho).
- **Suíte completa:** resultado na descrição do PR.
- **Testes de duas páginas da v2:** o auxiliar `noMotor` reabre a página quando outra tomou a vez. É o que o técnico faria.

### 6.5 Homologação no iPhone (Murilo)

1. Com rede, abrir o app na homologação, entrar e jogar uma rodada. Adicionar à Tela de Início.
2. Abrir pelo ícone uma vez com rede (instala o pacote e o catálogo).
3. **Modo avião:**
   - fechar o app de vez e abrir pelo ícone: o Início deve aparecer;
   - jogar uma rodada inteira;
   - abrir Elenco, Tabela e Calendário.
4. Ainda em modo avião, começar uma partida e fechar o app no meio. Ao reabrir, ela volta pausada no mesmo minuto.
5. **Tirar o modo avião:**
   - abrir o app;
   - em Mais › Saves, "Cópia na conta" deve ficar "Em dia".
6. Exportar a carreira em Saves (o iOS oferece salvar em Arquivos).

### 6.6 Reversão

- Reverter o commit do PR volta o comportamento anterior: tudo pelo servidor.
- Os saves não se perdem:
  - o servidor continua com a última cópia recebida;
  - o que ficou só no aparelho, sem cópia, não aparece na versão antiga.
- Para não perder isso, antes de reverter: abrir o app com rede (manda a cópia pendente), ou exportar em Saves.
- O cache v2 do service worker é trocado sozinho no deploy seguinte.

### 6.7 Fora desta entrega

- **Sincronização automática** entre aparelhos (fusão de progresso): o conflito é resolvido por escolha do técnico.
- **Checkpoint da perna da Copa e do amistoso.**
- **Partida ao vivo determinística:** o placar ainda usa `Math.random`. O checkpoint impede o recomeço, mas não torna a partida reproduzível.
