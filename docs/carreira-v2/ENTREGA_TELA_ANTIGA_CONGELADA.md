# Carreira 2.0: tela antiga descontinuada e congelada

- **Data:** 09/11/2026.
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisão de 09/11:** a carreira oficial é a nova, em `/carreira`, e fica. A antiga pode ser descontinuada. Caminho escolhido: **congelar e registrar a regra**. Os testes antigos seguem como rede de segurança e saem aos poucos.

## O que muda
**1. A regra, escrita onde os agentes leem:**
- **`CLAUDE.md`, seção 0 (nova):**
  - **Carreira oficial:** `/carreira`, com as telas em `carreira-v2/` e o motor em `public/js/motor/`.
  - **Tela antiga** (`public/carreira.html` e as telas dela no `carreira.js`): descontinuada e congelada.
  - **Regra nova** vai para o motor, e **tela nova** só para a v2.
  - **O `carreira.js` só muda para** tirar lógica dele para o motor, manter a ponte da v2 até a etapa G ou corrigir defeito que afete a v2 ou o motor.
- **Seção 4 do `CLAUDE.md`:** ganhou um aviso de que a arquitetura descrita ali é a da carreira antiga.
- **`tests/e2e/README.md`:** explica como escrever teste novo sem a tela antiga.
- **Aviso no topo** do `carreira.html` e do `carreira.js`.

**2. Uma checagem no CI que impede teste novo de depender da tela antiga** (`.github/scripts/verificar-tela-antiga.js`, primeiro passo da rota rápida):
- **Lista congelada:** os 181 testes que hoje usam a tela antiga estão em `tests/e2e/tela_antiga_legado.json`. A lista só diminui.
- **O que conta como usar a tela antiga:**
  - abrir `/carreira.html` ou `/carreira-old`;
  - entrar na página escondida (`/carreira/motor`) pelo navegador;
  - usar os ajudantes que passam por elas (`_startup`, `_round`, `_calendar_skip`, `_v2_match`).

  A checagem ignora comentários e só conta uso real (navegar, buscar, entrar no quadro).
- **Teste novo fora da lista que faça isso:** o CI falha e indica o caminho certo.
- **Teste da lista que deixou de usar a tela antiga:** aparece um aviso para tirá-lo da lista.

**3. Caminhos prontos para teste novo:**
- **`tests/e2e/_v2_carreira.js`:** `novaCarreiraV2(page, email)` cria conta e carreira só pelas telas da v2 e passa pelo tutorial, pelo assistente e pela recompensa até o Início. Provado em `test_v2_ajudante_carreira.js` (3 verificações, inclusive que nenhuma requisição vai para a tela antiga).
- **`tests/e2e/_sem_tela.js`:** os ajudantes do teste sem tela (`abrirPagina`, `criar`, `jogarRodada`), agora reutilizáveis. Servem para teste de regra pela ponte, sem navegador. O `test_sem_tela.js` passou a usá-los.

## O que não muda
- **A v2 em `/carreira`** segue igual.
- **Em produção, `/carreira-old`** já redireciona para `/carreira` desde a fase 11. A tela antiga só abre no servidor de testes.
- **A página escondida** (`/carreira/motor`) continua até a etapa G do plano sem página escondida. Ela usa o `carreira.js` sem tela (etapa A).
- **Os 181 testes antigos** continuam rodando e protegendo as regras do jogo.

## Pontos para sua avaliação
1. **A maioria dos testes da v2 também está na lista:** eles criam a carreira pela tela antiga, pelo ajudante `_v2_match.newCareer`. Teste novo já não pode fazer isso. Os antigos saem da lista quando forem reescritos com `novaCarreiraV2`.
2. **Ritmo de substituição dos testes antigos:** proponho reescrever aos poucos, junto com cada etapa do plano sem página escondida (C2 a G). Cada etapa tira da lista os testes da área que ela move para o motor.

## Testes
- **Checagem:** passa com os testes atuais e falha com um teste novo de mentira que abre `/carreira-old`.
- **Testes novos e alterados:** `test_v2_ajudante_carreira` (3/3) e `test_sem_tela` (10/10, agora com os ajudantes do módulo).
- **Aviso no topo das duas telas antigas:** é só comentário. Os testes que leem o `carreira.js` (motor e unitários) e o service worker seguem passando: 8/8 numa amostra (`test_motor_*`, `test_sw_offline_carreira`).
- **Base:** esta branch sai de `main` e não inclui a C1. Ao juntar as duas, a C1 só adiciona arquivos de motor e de teste unitário, que a checagem não conta como uso da tela antiga.
