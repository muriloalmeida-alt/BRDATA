# Carreira 2.0: correções da auditoria de 01/11 (AUD-01 a AUD-07)

- **Data:** 03/11/2026.
- **Branch:** `carreira-v2-auditoria`. Ela parte de `carreira-v2` com a troca de rotas de 01/11 (commit `d5e4ecb`).
- **Status:** corrigido e testado localmente. Ainda **não foi integrado, publicado nem homologado em aparelho**. Veja a seção "Situação por etapa".

## Antes de ler: as rotas mudaram depois da auditoria
A auditoria foi feita quando a v2 ficava em `/carreira-v2`. Em 01/11, a pedido do Murilo, as rotas foram trocadas (commit `d5e4ecb`):

| Endereço | Abre |
|---|---|
| `/carreira` e qualquer subrota sem extensão | a v2 |
| `/carreira-old` | a versão anterior; é também a página que a ponte da partida usa |
| `/carreira-v2/…` | redireciona (302) para o mesmo caminho em `/carreira/…` |
| `/carreira.html` | continua abrindo a versão anterior (app instalado, notificações e volta do pagamento) |

O build da v2 saiu de `public/carreira-v2/` e foi para `public/carreira/`. Onde o pedido diz "/carreira-v2", leia "/carreira". Sem sessão, a v2 manda para `/carreira-old`, onde está o login.

## Situação por etapa
| Etapa | Situação |
|---|---|
| Corrigido e testado localmente | **Sim**: AUD-02 a AUD-07, mais os 2 ajustes de servidor do AUD-01 |
| Integrado (push, PR e merge) | **Não.** Depende de autorização explícita |
| Publicado em homologação | **Não** |
| Homologado em aparelho (Safari/iPhone, VoiceOver) | **Não.** Não há aparelho neste ambiente |

## Tabela

### AUD-01 · Pendente de publicação
- **Arquivos:** `server/server.js`. Um bundle inexistente sob `/carreira/` passa a responder 404 em vez do HTML do portal, e `.webp` passa a sair como `image/webp`.
- **Reprodução:** homologação não verificável daqui, porque a política de rede deste ambiente recusa `hml-brdata.up.railway.app` (403 no proxy). Localmente, `/carreira/assets/nao-existe.js` respondia **200 com o HTML do portal**.
- **Teste:** smoke local de rotas e tipos (ver AUD-01 abaixo) e a verificação 9 de `test_v2_inicio`.
- **Pendência:** push, merge e deploy autorizados, e depois o smoke na homologação real.

### AUD-02 · Resolvido localmente
- **Arquivos:** `public/js/carreira.js` (ponte), `adapters/match.ts`, `adapters/gateways.ts`, `screens/Match.tsx` e `match.css`.
- **Reprodução, no código antes da correção:** com o PUT final falhando, o botão ficava "Continuar" **desativado**, com a mensagem de erro e **nenhuma** saída. A rede voltava e nada mudava; a rodada não foi gravada.
- **Teste:** `test_v2_gravacao.js`, 10 verificações aprovadas:
  - falha de rede;
  - 5xx com 3 toques seguidos;
  - recuperação;
  - resposta perdida;
  - sessão expirada real, com troca de conta;
  - 360 e 430 px.
- **Pendência:** VoiceOver.

### AUD-03 · Resolvido localmente
- **Arquivos:** `App.tsx`, `screens/Table.tsx` e `screens/Match.tsx`.
- **Reprodução, no código antes da correção:** Resultado → Ver tabela → "Série B" levava a `/carreira/tabela?divisao=serie_b` e destruía o quadro da ponte (1 → 0 quadros), junto com o pós-jogo pendente.
- **Teste:** `test_v2_tabela_partida.js`, 5 verificações aprovadas:
  - rodada 3 com a ida da Copa pendente;
  - A → B → C → A;
  - clube;
  - lances;
  - voltar;
  - Continuar com a perna da Copa ao vivo.

### AUD-04 · Resolvido localmente
- **Arquivos:** `ui/dialog.tsx` (novo), `screens/Lineup.tsx`, `screens/Match.tsx` e `base.css`.
- **Reprodução, no código antes da correção:** na folha de Formação, o Tab **saía da folha** e o fundo **não** ficava inerte.
- **Teste:** `test_v2_foco.js` 2a, 2b e 3, além de `test_v2_gravacao` 5a (folha de login).
- **Pendência:** VoiceOver.

### AUD-05 · Resolvido localmente
- **Arquivos:** `ui/router.tsx`, `App.tsx`, `screens/Match.tsx` e `adapters/match.ts`.
- **Reprodução, no código antes da correção:** depois de Início → Elenco, o foco ficava no `BODY`. A correção revelou um segundo problema: a página escondida da ponte **roubava o foco** da v2.
- **Teste:** `test_v2_foco.js` 1 e 3.
- **Pendência:** VoiceOver.

### AUD-06 · Resolvido localmente
- **Arquivos:** `adapters/match.ts` e `screens/Match.tsx`.
- **Reprodução, no código antes da correção:** com o documento da ponte travado, a tela continuava em "Preparando a partida…" depois de **40 s**, com o quadro pendurado.
- **Teste:**
  - `adapters/match.test.ts`: 6 unitários aprovados;
  - `test_v2_foco.js` 4: erro em cerca de 30 s, sem quadro, e uma tentativa nova limpa.

### AUD-07 · Resolvido localmente
- **Arquivos:** `.github/workflows/testes.yml` (job "Carreira 2.0"), `.github/scripts/verificar-bundle-v2.sh` e `carreira-v2/package.json`.
- **Reprodução:** o CI não instalava, testava nem compilava a v2.
- **Teste:** demonstração do script em 5 casos, descrita abaixo.
- **Pendência:** a 1ª execução no GitHub Actions, que acontece com o push.

## O que mudou, item a item

### AUD-02: falha ao salvar o resultado
O ponto de partida é que o resultado já fica aplicado **uma vez** no save em memória da ponte (`CAREER`), no fim da partida. O PUT `/api/career` substitui o save inteiro. Por isso, repetir **só o PUT** daquele mesmo save não simula de novo e não aplica nada em dobro. Isso vale também quando a resposta se perdeu depois de o servidor gravar.

**Na ponte** (`carreira.js`), as mudanças são mínimas e não mexem na simulação:
- **`persistCareer`** guarda o motivo da falha: `sessao` (401) ou `falha`. No modo ponte, o 401 não troca para a tela de login do quadro escondido, porque ninguém a veria.
- **`finishLiveMatch`** guarda o resumo do pós-jogo **antes** de gravar. Uma falha não perde mais o pós-jogo.
- **`salvarDeNovo()`** (novo):
  1. confere a sessão (`/api/auth/me`);
  2. se a conta logada for outra, devolve `outra-conta` e **não grava**;
  3. com a mesma conta, chama `persistCareer()` de novo;
  4. uma trava impede gravações paralelas.
- **`continuarPosJogo()`** recusa (`nao-salvo`) enquanto a gravação não estiver confirmada.
- **`conta()`** (novo) informa a conta dona do save em memória.

**Na v2** (Resultado), o rodapé tem um único botão, conforme o estado:

| Estado | Botão | Mensagem |
|---|---|---|
| salvando | "Salvando…" (inativo) | anúncio discreto para leitor de tela |
| salvo | "Continuar" | — |
| falha | "Tentar salvar novamente" | "Não foi possível salvar o resultado. Ele continua guardado aqui — tente de novo." |
| sessão expirada | "Entrar para salvar" | "Sua sessão expirou. Entre de novo, com a mesma conta, para salvar o resultado." |
| outra conta | "Entrar para salvar" | "Outra conta entrou neste navegador. Entre com a conta em que a partida foi jogada…" |

Sobre o login para salvar:
- **"Entrar para salvar"** abre uma folha com e-mail e senha. Ela usa o mesmo `POST /api/auth/login` da versão anterior e a mesma regra de pagamento pendente.
- **Com outra conta**, a folha avisa e não grava nada. A sessão passa a ser da outra conta, e a pessoa pode entrar de novo com a certa.
- **Com a mesma conta**, a folha fecha e a gravação é repetida.
- **Por que o login fica na v2:** o formulário da versão anterior chamaria `enterAfterAuth`, que recarrega a carreira do servidor e apagaria o resultado em memória.

### AUD-03: Tabela aberta pelo Resultado
- **A Tabela do Resultado fica na rota da partida:** `/carreira/partida?tela=tabela&divisao=…`. Trocar a divisão só troca a consulta (`replace`). A tela da partida, e com ela o quadro da ponte e o pós-jogo pendente, continua montada. O foco fica na aba escolhida.
- **Tocar num clube** abre a confirmação "Sair do resultado?", com foco em ficar:
  - saindo, abre o elenco na versão anterior, como antes;
  - ficando, nada muda.
- **O voltar do sistema no Resultado** também pergunta, até "Continuar". Antes ele saía em silêncio e perdia o pós-jogo pendente; essa era uma limitação documentada na A4.
- **O texto da confirmação diz o que se perde:**
  - salvo: coletiva, resumo da rodada e jogo de Copa pendente;
  - não salvo: o próprio resultado.
- **A Tabela normal, aberta fora da partida,** continua como antes.

### AUD-04: diálogos
- **`ui/dialog.tsx`** é a folha modal compartilhada, com o mesmo visual de antes. Ela:
  - leva o foco a `data-autofocus` ou ao 1º elemento focável;
  - prende Tab e Shift+Tab;
  - deixa o `#root` inerte, porque a folha é renderizada em um portal;
  - fecha com Escape e com toque no fundo **só** quando pode ser dispensada (nunca durante uma gravação);
  - devolve o foco a quem a abriu, ou ao título da tela quando não há acionador (ex.: o voltar do sistema).
- **Folhas que passaram a usar esse componente:**
  - Formação;
  - "Sair da partida?";
  - "Sair do resultado?" (nova);
  - "Entre para salvar" (nova).
- **Na Formação, o foco é "roving":**
  - só a opção marcada entra no Tab;
  - ↑↓←→, Home e End movem o foco;
  - Enter ou Espaço escolhem.
  - **Diferença em relação ao padrão ARIA, de propósito:** as setas não escolhem sozinhas. Escolher grava na hora, como no legado, e passar por 13 formações viraria 13 gravações.

### AUD-05: foco ao navegar
- **A cada troca de caminho ou consulta,** o foco vai para o `<h1>` da nova tela. Isso vale para link, voltar e avançar. O contorno só aparece para quem usa teclado (`:focus-visible`).
- **Não há troca de foco:**
  - na primeira carga;
  - quando só mudam o minuto, o placar ou a gravação;
  - na troca de divisão da Tabela.
- **A Partida ao vivo** ganhou um `<h1>` só para leitor de tela ("Partida ao vivo").
- **Quando a tela muda sem mudar a rota** (carregando → partida, jogo → Resultado), o foco é recolocado no título se o elemento focado sumiu.
- **Achado durante a correção:** a página escondida da ponte foca os próprios elementos e roubava o foco da v2. Agora:
  - o quadro escondido fica `inert`;
  - um guarda devolve o foco a quem o tinha, ou ao título.
- **O `?iniciar=1` da partida** agora sai pelo roteador. Antes, o 1º voltar parecia troca de tela.

### AUD-06: prazo da ponte
- **O prazo de 30 s conta desde a criação do quadro,** inclusive o carregamento do documento. A verificação começa logo, e o `load` só a antecipa.
- **A abertura resolve ou rejeita uma única vez.** Timer, polling, listener e guarda de foco são limpos em todos os caminhos. Em caso de falha, o quadro é removido.
- **Sair da tela antes da prontidão** (`AbortController` no `Match`) remove o quadro na hora, e eventos tardios são ignorados.
- **"Tentar novamente"** abre uma única sessão nova.

### AUD-07: CI
**Estratégia:** o build continua **versionado** em `public/carreira/` (o Dockerfile não muda) e passa a ter verificação determinística no CI.

**Job "Carreira 2.0 (unitários, tipos e build)",** em Node 22 (os unitários usam `--experimental-strip-types`). Ele roda:
1. `npm ci`;
2. `npm test`;
3. `npm run typecheck`;
4. `.github/scripts/verificar-bundle-v2.sh`.

**O script recompila e falha** se qualquer arquivo da saída for **alterado, removido ou novo**. Ele usa `git status --porcelain --untracked-files=all`, então um asset novo também é pego. Os E2E de sempre usam `public/carreira/`, que esse job garante ser o da fonte.

**`npm test`** passou a usar o glob do próprio Node (`'src/**/*.test.ts'`) e pega testes em qualquer profundidade.

**Demonstração do script (local, 03/11):**

| Caso | Resultado |
|---|---|
| A) estado commitado | **passa** (exit 0) |
| B) fonte alterada sem atualizar o bundle | **falha** (exit 1): `D …index-CIm7Y83d.js`, `M index.html`, `?? …index-BgBlNuCP.js` |
| C) arquivo versionado na saída que a fonte não gera | **falha** (exit 1): `D public/carreira/assets/sobra.js` |
| D) fonte e bundle atualizados juntos | **passa** (exit 0) |
| E) asset novo na fonte sem versionar a saída | **falha** (exit 1): `?? public/carreira/assets-scene/novo.txt` |

## Testes executados (03/11, servidor isolado, contas descartáveis)
- **Unitários da v2:** 57/57 (`npm test`). Inclui os 6 novos do watchdog, com um DOM falso e prazos curtos:
  - documento que nunca carrega;
  - API que nunca fica pronta;
  - sucesso sem `load`;
  - cancelamento antes da prontidão;
  - já cancelada antes de abrir;
  - nova tentativa limpa.
- **`npm ci`, `npm run typecheck` e `npm run build`:** sem erro.
- **E2E da v2:** 15/15 (`node run_parallel.js test_v2_ --no-unit --concurrency=3`). Inclui os 3 novos:
  - `test_v2_gravacao`;
  - `test_v2_tabela_partida`;
  - `test_v2_foco`.
- **Suíte de regressão completa:** veja "Suíte completa" no fim deste documento.
- **Reprodução no código antes da correção:** worktree em `d5e4ecb` com servidor isolado. As saídas estão na tabela, coluna "Reprodução".
- **Larguras:**
  - Resultado com falha em 360 px;
  - folha de login em 360 e 430 px;
  - Resultado em 360 px (`test_v2_resultado` 4);
  - sem rolagem horizontal, alvos ≥ 44 px.
  - **Safe areas e texto ampliado:** não há aparelho neste ambiente; **pendente** na homologação em iPhone.

## AUD-01: passos de publicação (não executados: falta autorização)
1. **Integrar.** Precisa de autorização explícita do Murilo. São dois caminhos:
   - (a) push de `carreira-v2-auditoria` e PR para `carreira-v2`, que já está no PR #55 → `main`;
   - (b) push direto em `carreira-v2`, que atualiza o PR #55.

   Nos dois casos, esperar o CI verde, inclusive o job novo "Carreira 2.0".
2. **Registrar o SHA exato** do merge na `main`. É ele que a homologação deve mostrar, conferido por SHA, não pelo nome da branch nem pelo status SUCCESS. Na auditoria, o deployment `d17df8cb…` estava em SUCCESS, mas a partir de uma `main` sem a v2.
3. **Homologação:** projeto Railway `br-data`, serviço "BR Data", ambiente **staging**. **Não mexer em produção.**
   - Conferir no painel ou na CLI (`railway status` ou `railway deployment list`, sem Railway Agent) que o deployment ativo é do SHA do passo 2.
4. **Smoke na homologação.** A rede deste ambiente bloqueia o domínio; rodar de uma máquina com acesso:
   ```sh
   H=https://hml-brdata.up.railway.app
   curl -sI $H/carreira            # 200 text/html (index da v2: id="root", /carreira/assets/…)
   curl -sI $H/carreira/tabela     # 200 text/html (deep link — recarga funciona)
   curl -sI "$H/carreira-v2/tabela?divisao=serie_b"  # 302 → /carreira/tabela?divisao=serie_b
   curl -sI $H/carreira-old        # 200 text/html (versão anterior)
   JS=$(curl -s $H/carreira | grep -o '/carreira/assets/[^"]*\.js')
   curl -sI $H$JS                  # 200 application/javascript (NÃO text/html)
   curl -sI $H/carreira/assets/nao-existe.js   # 404 text/plain (NÃO o HTML do portal)
   curl -sI $H/carreira/assets-scene/cen-02-estadio-header.webp  # 200 image/webp
   ```
   Depois, com conta e carreira **de teste**:
   1. abrir `/carreira/` e uma subrota direto, e recarregar;
   2. sem sessão, conferir que vai para `/carreira-old` (login);
   3. jogar uma partida pela v2 até o Início.
5. **Cache:** o service worker é network-first e troca o nome do cache a cada deploy (`__DEPLOY_VERSION__`). Quem está online recebe a v2 nova sem limpeza manual. O `index.html` da v2 sai com `no-cache`.
6. **Rollback:** reverter o merge na `main` (um novo commit de revert) e deixar a homologação republicar. O save não muda de formato nesta correção, então **não há migração nem restauração de banco**. Saves gravados pela v2 continuam legíveis pela versão anterior.
7. **Registrar:** ambiente, deployment, SHA, URL, saídas do smoke e o caminho de rollback.

## Limitações mantidas (fora do escopo, como pedido)
- **Fechar ou recarregar o app no meio da partida** perde a partida, porque o estado está em memória da ponte.
- **Login e criação de carreira,** Jogos, Mais, mercado, contratos, filtros e parte do pós-jogo continuam na versão anterior.
- **Escrita simultânea do save entre abas:** risco já conhecido, sem migração nesta correção.
- **Pendências visuais** (wordmark em texto × logo final; ênfase dos botões de retorno): não tocadas. Precisam do material atual para reconciliar.

## Suíte completa (servidor isolado, 03/11)
- **1ª execução, commit `547c733`:** 170/171. A única falha foi a verificação 9 de `test_v2_inicio`. Ela tinha sido ampliada durante a execução, enquanto o servidor ainda era a cópia sem o ajuste do AUD-01: webp saía como `application/octet-stream` e o bundle inexistente vinha como `200 text/html`. Ou seja, a falha reproduziu o achado. Com o servidor corrigido, a v2 (15/15) e os testes de estático e service worker (game2048, push, pwa_manifest, sw_offline_carreira, redesign) passaram.
- **Execução final, commit `ec7dc25`:** 170/171. A única falha foi `test_h2h.js`, da versão anterior, que não passa pela v2: um clique foi interceptado pelo modal da Tabela da versão anterior com a máquina carregada. Isolado, ele passou 2/2 (13,5 s e 13,7 s). Na 1ª execução completa, também tinha passado.
