# Carreira 2.0: sem página escondida, etapa G2b (v2 com o motor como módulo, atrás de uma chave)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g2b`, a partir de `main` (com o #96, etapa G2a).
- **Status:** 2º pedaço da G2 (divisão em `PROPOSTA_ETAPA_G.md`).
- **Padrão:** continua o quadro escondido. A troca do padrão vai junto com os testes da v2 (G2c).

## Resultado principal
Novo `carreira-v2/src/adapters/hosted.ts`: a sessão do motor **sem o quadro escondido**.
- **Abrir:** carrega o `/js/data.js` (uma vez só) e importa o hospedeiro `/js/motor/v2.js` sob demanda (fora do pacote da v2), que abre o jogo e devolve a ponte.
- **Contrato:** é o mesmo de `openMatchSession`. A v2 recebe a mesma `MatchSession`, com os mesmos comandos, assinatura e versão do save, e as telas não mudam.
- **Erros:**
  - sem conta logada: `sessao`;
  - prazo de 30 s: `timeout`;
  - tela desmontada: `AbortError`, como no quadro.
- **`reveal` e `destroy`:** não fazem nada, porque não há página para mostrar nem para remover.

**A chave** (`adapters/engine.ts`):
- **Liga:** `?motor=modulo` na URL (fica guardado no `localStorage`, `brdata_motor`).
- **Desliga:** `?motor=quadro`.
- **Sem chave:** o quadro de sempre.

**Pacote da v2:** o motor não entra no pacote (import dinâmico de `/js/motor/v2.js`, fora do build).

**Sem mudança de regra, de save, de API nem de tela.**

## Testes
- **Novo `carreira-v2/src/adapters/hosted.test.ts`** (sem navegador):
  - a chave liga, fica guardada e desliga;
  - o `data.js` é carregado uma vez só;
  - o hospedeiro é importado;
  - a ponte é mapeada como a do quadro (todos os comandos e a assinatura);
  - "sem conta" rejeita;
  - prazo e cancelamento funcionam.
- **Novo `tests/e2e/test_v2_modulo.js`:** pela UI real da v2, com a chave ligada e sem a tela antiga:
  - conta e carreira novas pela v2;
  - semanas até o jogo, amistoso, partida ao vivo até o fim e pós-jogo até o Início;
  - a rodada gravada no servidor (a partida no histórico e a rodada avançada);
  - nenhum quadro `/carreira/motor` aberto nem pedido;
  - `data.js` e `motor/v2.js` carregados pela v2;
  - sem erro na página.
- **Testes da v2:** 121/121.
- **Suíte completa (com o Postgres temporário):** 212/212.
