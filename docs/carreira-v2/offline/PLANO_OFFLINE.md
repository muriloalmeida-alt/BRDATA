# Plano — OFFLINE-001 (Modo Carreira offline)

**Data:** 13/11/2026
**Origem:** `docs/carreira-v2/offline/BRDATA_Plano_Offline_Claude.md`, sem alteração. Decisão já registrada: a carreira fica na raiz ("/").
**Situação:** etapa 0 feita; decisões do Murilo na seção 5; em implementação.

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
