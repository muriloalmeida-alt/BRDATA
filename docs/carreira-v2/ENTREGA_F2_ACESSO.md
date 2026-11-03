# Carreira 2.0: fase 2 do plano de independência (acesso)

- **Data:** 03/11/2026.
- **Branch:** `fase2-acesso`, a partir de `ajustes-sistema`.
- **Status:** aguardando aprovação do Murilo.
- **Referências:** pranchas `03_acesso` e `04_inicio_carreira` (Pacote Mobile) e pranchas 20 e 21 do pacote complementar.
- **Decisões aplicadas** (03/11): nomes reais das competições; clube sem pré-seleção; recompensa que abre sozinha uma vez por dia; tutorial e assistente de início ficam para depois (P8); "Criar conta" leva ao cadastro do portal; botão "Iniciar carreira"; primeira entrada sem horário.

## Resultado principal
**A v2 não manda mais para `/carreira-old`.** Esse era o problema do print de 03/11. Agora:
- **sem sessão:** aparece o login da própria v2, em `/carreira`;
- **sem carreira:** a criação de carreira é da v2, em `/carreira/nova…`;
- **sessão que expira durante o uso:** abre a folha de login sobre a tela.

O E2E novo percorre o caminho inteiro de uma conta nova e confere que **nenhuma navegação passou por `/carreira-old`**.

## Telas
| Tela | Prancha | O que mostra |
|---|---|---|
| Abertura (CAP01-T01) | `03_acesso` col. 1 | Túnel, wordmark, barra e "Carregando…". É a tela de carga da v2 |
| Login (CAP01-T02) | `03_acesso` col. 2 | "Volte para o jogo.", E-mail, Senha, "Entrar" e "Ainda não tem uma conta? Criar conta", que abre `/?signup=1`. Erros do servidor aparecem na própria tela |
| Competição (CAP01-T03) | `03_acesso` col. 3 | Brasileirão Série A, B e C com os subtítulos reais, taça e escudo em traço. Nada vem selecionado; o botão fica "Escolha uma competição" (inativo) até a escolha |
| Clube (CAP01-T04) | `04_inicio_carreira` col. 1 | Os 20 clubes reais da competição, em ordem alfabética, com escudo oficial e cidade. Sem pré-seleção. O botão diz "Escolha um clube" (inativo) até a escolha e depois "Continuar com <clube>" |
| Configurar (CAP01-T05) | `04_inicio_carreira` col. 2 | Clube escolhido, "Como vamos chamar você?" e "Nome do treinador" (preenchido com o nome da conta, com botão de limpar). **"Iniciar carreira"** grava o nome na conta e cria a carreira, com a tela "Criando sua carreira…" |
| Primeira entrada (CAP01-T06) | `04_inicio_carreira` col. 3 | "Seu trabalho começa agora.", escudo, clube, competição e ano, objetivo real da diretoria e próximo jogo com dia e rodada, sem horário. "Ir para o clube" leva ao Início |
| Recompensa diária (CAP01-N01) | complemento 20, col. 1 e 2 | Abre sozinha uma vez por carregamento se a recompensa do dia não foi recebida. Detalhes abaixo |
| Sessão expirada (CAP07-T06) | complemento 20 col. 3 e 21 col. 1 | Folha bloqueante "Sua sessão expirou.", com "Use a mesma conta desta carreira.", E-mail, Senha e "Entrar". Outra conta é recusada com "Esta carreira é de outra conta." |

**Detalhes da Recompensa diária:**
- **Sequência:** dias 1 a 7, com o dia de hoje em lima e os já recebidos marcados.
- **Prêmio:** o prêmio real do dia, por exemplo "R$ 500 no caixa", "Moral do elenco", "Olheiro extra" ou "Pacote de elite".
- **"Receber":** aplica o prêmio pelo motor e grava. Depois disso, a tela mostra "Recompensa recebida: …" e a variante "Já recebida hoje".
- **"Voltar ao clube":** volta ao Início.
- **No Início,** uma linha nova, "Recompensa diária", mostra "Disponível hoje" ou "Recebida hoje" e abre essa tela.

**Comparativos** (pasta `evidencias/F2-acesso/`): prancha × v2, em 390×844.
- `comparativo-01-abertura-login-competicao.png`;
- `comparativo-02-clube-configurar-primeira.png`;
- `comparativo-03-recompensa-sessao.png`;
- `inicio-linha-recompensa.png`.

## Motor (ponte), sem regra nova
- **Sem carreira, o motor também fica pronto** (fase `sem-carreira`).
- **Comandos novos**, todos usando as mesmas funções da tela de sempre:
  - `competicoes()`;
  - `escolherCompeticao(id)`: chama `loadLeague` e devolve os clubes;
  - `criarCarreira(clubId)`: chama `startCareer`. Um 2º PUT do mesmo save (idempotente) confirma a gravação;
  - `recompensa()`;
  - `receberRecompensa()`: mesmo caminho de `claimDailyLoginNow`, ou seja, o servidor decide o dia e o jogo aplica e grava.
- **Na v2:**
  - `adapters/access.ts`, para falar com o motor;
  - `SessionGateway.updateName`, que usa o mesmo `PUT /api/account/name` da versão anterior;
  - `ui/session.tsx`: a folha de login da partida (AUD-02) virou componente comum e agora também atende a sessão expirada em qualquer tela.

## Divergências em relação às pranchas (para sua avaliação)
1. **Seta de voltar na tela Clube.** A prancha não tem, mas sem ela não daria para trocar de competição.
2. **Wordmark** no estilo da v2 aprovada (itálico), e não o reto da prancha.
3. **Botões inativos com texto de instrução** ("Escolha uma competição" / "Escolha um clube") até a escolha. A prancha mostra o 1º já escolhido.
4. **Recompensa:**
   - o texto "Sequência de 1 a 7 dias" ganhou "Pular um dia recomeça do dia 1.", que é a regra real do servidor;
   - o topo mostra o contexto "Recompensa" (P2), e não "CARREIRA 2.0".
5. **Sessão expirada ao trocar a formação.** A folha da Formação fecha e só a folha de login fica aberta, para não empilhar duas. Nada é gravado; depois de entrar, é só repetir a troca.

## Fica para depois (decidido em 03/11)
- **Tutorial de boas-vindas** (4 telas, 1ª conta) e **assistente de início** (a cada carreira nova): entram com o P8. Até lá, quem cria carreira pela v2 não vê esses dois.
- **Os botões que ainda abrem telas da versão anterior** (D3) continuam até cada tela ser refeita.

## Achado durante a fase: bug do dia 7, na versão anterior (preciso da sua decisão)
**O que acontece:** no dia 7 da recompensa ("pacote de elite"), o servidor manda o prêmio **sem valor** (`server/src/users.js`: `{ type: "premium_pack", id: "weekly_elite" }`). O jogo faz `caixa += reward.amount` com valor indefinido. O caixa vira `NaN` e é gravado como `null` no save.

**Onde está:** o bug existe hoje na versão anterior. A v2 usa a mesma função, então também é afetada.

**Correção mínima proposta:** no cliente, usar o valor do ciclo do próprio jogo (R$ 3.000) quando o servidor não manda valor, sem mexer no servidor. **Não apliquei sem a sua aprovação.**

## Testes
- **Unitários:** 67/67. São 2 novos, da recompensa: textos pelo tipo real e a regra de "pendente hoje".
- **E2E novo `test_v2_acesso.js`:** 7 verificações, com conta nova e sem passar pela versão anterior:
  1. login da v2: erro de senha, "Criar conta" leva a `/?signup=1`, e sem carreira vai para `/carreira/nova`;
  2. competição com os nomes reais e botão inativo até escolher;
  3. clubes reais em ordem alfabética, sem pré-seleção;
  4. configurar: nome preenchido, erro com nome vazio e a carreira criada (Série B, clube escolhido, nome gravado na conta). A primeira entrada mostra objetivo real e próximo jogo sem horário;
  5. recompensa: abre sozinha (dia 1, "R$ 500 no caixa") e "Receber" põe **R$ 500 no caixa do save**. O Início passa a mostrar "Recebida hoje", e recarregar não reabre;
  6. sessão expirada no meio do uso: aparece a folha sobre a Escalação, outra conta é recusada e a mesma conta fecha a folha;
  7. nenhuma navegação passa por `/carreira-old`, e as telas de login, competição e clube em 360 px não têm rolagem horizontal e têm alvos ≥ 44 px.
- **E2E ajustados:**
  - `test_v2_inicio` (verificações 1 e 2): sem sessão, mostra o login da v2; sem carreira, vai para `/carreira/nova`;
  - os testes da v2 que criam a carreira pela versão anterior passam a confirmar a recompensa do dia pelo servidor (`ensureDailyClaimed`). Assim a recompensa automática não abre na frente do Início. Os testes da recompensa usam conta nova.
- **E2E da v2:** 18/18.
- **Suíte completa (servidor isolado):** **174/174**.

## Arquivos
- `public/js/carreira.js`: motor pronto sem carreira e os comandos de acesso.
- **v2, novos:**
  - `carreira-v2/src/screens/Access.tsx`, `DailyReward.tsx`, `access.css`;
  - `adapters/access.ts`;
  - `domain/reward.ts` e `reward.test.ts`;
  - `ui/session.tsx`.
- **v2, alterados:**
  - `App.tsx` (login, criação, recompensa e sessão expirada);
  - `Home.tsx` (linha da recompensa);
  - `Match.tsx` (usa `ui/session.tsx`);
  - `gateways.ts`;
  - `icons.tsx`.
- **Testes:** `tests/e2e/test_v2_acesso.js` (novo), `_v2_match.js`, `test_v2_inicio.js`, os 11 E2E da v2 que criam carreira e `suites.json`.
- **Captura:** `tools/capture/capture-v2-acesso.js`.
- **Evidências:** `docs/carreira-v2/evidencias/F2-acesso/`.
