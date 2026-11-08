# Carreira 2.0: sem página escondida, etapa B (estado e save no módulo)

- **Data:** 08/11/2026.
- **Branch:** `sem-tela-b`, a partir de `main` (com o #80, etapa A).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (08/11):
- **O `CAREER` mora no módulo** já nesta etapa.
- **O save ganha `schemaVersion`**, com migrações numeradas (CLAUDE.md §10).
- **Gravação:** o módulo grava e devolve o motivo da falha. Os avisos na tela continuam no `carreira.js`.

## Resultado principal
O save da carreira passou a morar em `public/js/motor/estado.js`: o objeto da carreira atual, a versão do save, as migrações, a carga e a gravação.

| No módulo | O que faz |
|---|---|
| `carreiraAtual`, `definirCarreira` | a carreira atual. No `carreira.js`, o nome `CAREER` virou um atalho para estas duas funções. As cerca de 1.400 referências continuam iguais, mas ler e atribuir passam pelo módulo |
| `SCHEMA_VERSION` (1), `MIGRACOES`, `versaoDoSave`, `migrarSave` | a versão do save. Save sem o campo é a versão 0. Cada migração roda uma vez, em ordem, e só sobe a versão. Save de versão futura não é tocado |
| `carregarSave` | lê o save da conta. Sem save, ou com erro, devolve vazio, como sempre (cai na escolha de competição) |
| `gravarSave` | marca `updatedAt` e grava. Devolve `ok` ou o motivo: `sessao` (401), `grande` (413) ou `falha`. O `persistCareer` mostra os mesmos avisos de antes conforme o motivo |

**Carga do jogo:**
1. a normalização de sempre (`migrateCareerDefaults`);
2. as migrações numeradas.

**Carreira nova:** já nasce na versão atual.

**Carga dos arquivos:**
- O `carreira.html` importa o módulo.
- O service worker pré-carrega o arquivo.
- Os tipos ficam em `estado.d.ts`.

**Sem mudança de regra, de API nem de tela.** A única mudança no save é o campo novo `schemaVersion`. Saves antigos continuam abrindo e passam a gravar com ele.

## Pontos para sua avaliação
1. **A normalização de sempre continua rodando a cada carga:** o `migrateCareerDefaults` não virou a "migração 1". Ele mistura migração de save antigo com ajustes de toda carga (objetivos do dia, calendário, conquistas) e chama mais de 30 funções do jogo (Copa, divisões, calendário). A migração 1 é o marco inicial: a estrutura de hoje. Daqui em diante, mudança de estrutura entra como migração numerada.
2. **Campo antigo `version: 1`:** a carreira nova já gravava `version: 1`, que nada lê. Deixei como está, para não mexer no save sem precisar. O que vale agora é o `schemaVersion`.
3. **Modo ponte:** como antes, a página escondida não grava ao abrir. O save antigo é migrado na memória e grava com a versão na primeira jogada.

## Testes
- **Novo `tests/unit/test_motor_estado.js`** (7 verificações):
  - carreira atual;
  - versão (sem o campo, inválida);
  - migração de save antigo, save atual e save futuro;
  - ordem das migrações;
  - carga (com save, sem save, erro, sem rede);
  - gravação (`updatedAt` e o PUT do save inteiro);
  - motivos de falha (401, 413, 400, 500, sem rede).
- **`tests/e2e/test_sem_tela.js`** (agora 10 verificações), com 2 novas:
  - **8)** o `CAREER` é o objeto do módulo, e a carreira grava com `schemaVersion` 1;
  - **9)** um save antigo, sem o campo e gravado direto na API, abre migrado e grava com a versão na próxima jogada, sem perder nada (`version` e rodada conferidos).
- **Suíte completa:** 195/195 na primeira rodada.
