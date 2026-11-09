# Copa antiga: avanço rápido que travava a página (correção)

- **Data:** 09/11/2026.
- **Branch:** `copa-avanco-rapido`, a partir de `main` (com o #86, etapa C3).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisão de 09/11:** corrigir numa entrega própria, separada da D2.

## O defeito
- **Quando aparece:** ao carregar uma carreira criada antes de existir a Copa do Brasil. A Copa é montada na carga do save (`migrateCareerDefaults`, que chama `setupCup(rodada atual)`).
- **O avanço rápido:** se a carreira já passou da rodada 6, as fases que ficaram para trás são fechadas por trás.
- **Por que travava:** no formato antigo (16 clubes), quando o seu clube não está entre os 16 mais fortes, a Copa nasce inativa. O `resolveCupPhase` não resolve Copa inativa, e o laço do avanço rápido esperava a fase andar. A fase nunca andava, o laço não terminava e a página travava.
- **Quem pegava:** só saves muito antigos, que não tinham Copa, carregados depois da rodada 6, com o clube fora dos 16. O formato novo (60 clubes) não tem o problema, porque lá a Copa está sempre ativa.
- **Como foi achado:** pelo teste de equivalência da etapa C3, num mundo sorteado.

## A correção
- **O que mudou:** uma condição a mais no laço de `setupCupLegacy` (`public/js/carreira.js`), que agora só avança enquanto a Copa estiver ativa.
- **Por que é segura:** Copa inativa já não era resolvida em nenhum outro momento da temporada. Com o clube fora dos 16, ela fica parada na fase inicial, que é o que a temporada inteira já faria.
- **Com o clube entre os 16:** nada muda.
- **Sem mudança de save, de API nem de tela.**

**Por que no `carreira.js`:** a montagem da Copa (`setupCup`) ainda não foi para o motor, e vai na etapa F. A regra do `CLAUDE.md` permite mudar o `carreira.js` para corrigir defeito que afete a v2. A v2 carrega o save pela página escondida, então também travava.

## Testes
- **Novo `tests/unit/test_copa_avanco_rapido.js`** roda o `carreira.js` de hoje, com e sem a correção, cada um num `vm` com o motor:
  - **Antes da correção:** com o clube fora dos 16 e o save depois da rodada 6, o avanço rápido trava em todos os 36 casos (passa do limite de tempo).
  - **Depois:** termina sempre. Com o clube fora, a Copa fica inativa e na fase inicial.
  - **Com o clube entre os 16:** o resultado é igual ao do código antigo nos 15 casos (mesmas fases fechadas, mesmo sorteio).
- **Outros testes:** todos os testes unitários passam, e os de ponta a ponta de migração, Copa, save e temporada da v2 também (4/4).
