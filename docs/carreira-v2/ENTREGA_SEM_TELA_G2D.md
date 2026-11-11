# Carreira 2.0: sem página escondida, etapa G2d (o quadro e `/carreira/motor` saem)

- **Data:** 11/11/2026.
- **Branch:** `sem-tela-g2d`, a partir de `main` (com o #98, etapa G2c).
- **Status:** último pedaço da G2 e da etapa G (divisão em `PROPOSTA_ETAPA_G.md`). Com ela, o plano "sem página escondida" chega ao fim: a v2 não abre mais a página antiga em nenhum caminho.

## Resultado principal
**A v2 abre o motor só como módulo** (`/js/motor/v2.js` com o `/js/data.js`).

**Saiu da v2 (`carreira-v2/`):**
- **`adapters/match.ts`:** o quadro escondido (`openMatchSession`), com o prazo e a verificação dele e a proteção de foco contra a página escondida (AUD-05). Ficam só os tipos da sessão e do estado da partida.
- **`MatchSession`:** saem `reveal`, que mostrava a página em tela cheia, e `continuePostMatch`, o caminho antigo do pós-jogo. O hospedeiro já não os suportava.
- **A chave `?motor=` (`usarModulo`):** sai. Um `brdata_motor` antigo guardado no navegador não tem mais efeito.
- **`adapters/engine.ts`:** sai o aviso de foco (`setFocusHandler`), que só existia por causa da página escondida.
- **`match.test.ts`:** sai, porque testava o quadro.

**Sem mudança de tela:** o prazo (30 s), o cancelamento e o "Tentar novamente" continuam no `hosted.ts` e no `engine.ts`.

**Servidor (`server.js`):**
- Saiu a rota `/carreira/motor`, que servia o `carreira.html` com `<base href="/">` e `noindex`.
- O endereço agora cai no redirecionamento que já existia para `/carreira/…` (301 para `/motor`, que abre a v2).
- A página antiga de testes (`/carreira-old`, só com `LEGACY_UI_FOR_TESTS`) continua como está.

**Service worker:** `carreira.js` saiu do app shell. Nenhuma página do app o carrega mais. O motor da v2 (`motor/v2.js`, com `data.js` e os outros módulos) já estava no shell desde a G2c.

**O que não muda:**
- **`carreira.js` e `carreira.html`:** ficam como estão (congelados). A ponte deles (`BRDATA_PONTE`, modo ponte) continua sendo a referência dos testes de equivalência sem navegador (`_sem_tela.js`, `test_motor_hospedeiro.js` e os outros `test_motor_*`). O `pathname "/carreira/motor"` que esses testes usam é o de uma janela falsa, não a rota do servidor.
- **Regra do jogo, save, API e telas:** nenhuma mudança.

## Critérios do plano para a etapa G
Medi o tempo de abertura e o tamanho do que é baixado, com CPU 4× mais lenta (perto de um celular) e sem service worker. Foram 4 aberturas do Início com a mesma carreira, do Início até o motor pronto (já inclui a espera de 1,5 s da pré-carga):

| | Quadro (antes, G2b) | Módulo (agora) |
|---|---|---|
| Início na tela | 0,69–0,95 s | 0,68–0,84 s |
| Motor pronto | 3,03–3,43 s | 2,46–2,62 s |
| JS, HTML e CSS baixados | 1,34–1,49 MB | 0,60–0,75 MB |

- **Pacote da v2:** 526 KB → 524 KB (144 KB com gzip). O motor não entra no pacote.
- **Motor como módulo:** `data.js` e `motor/*.js` somam 539 KB (157 KB com gzip).
- **O que deixou de ser baixado:** a página antiga (`carreira.js` e `carreira.html`, 335 KB com gzip) e o CSS dela.

## Testes
- **Ajustados para a rota que saiu:**
  - `test_v2_motor` (1): o pacote da v2 aponta para `/js/motor/v2.js` e `data.js`, e não para `/carreira-old` nem `/carreira/motor`. `/carreira/motor` leva à v2.
  - `test_v2_inicio` (9): `/carreira/motor` leva à v2.
  - `test_v2_corte`:
    - (1) o build não cita mais `/carreira/motor`;
    - (2) em produção, `/carreira/motor` responde 301 para `/motor`, que é a v2.
  - `test_sw_offline_carreira` (1): o motor (`motor/v2.js` e `data.js`) está no cache desde a instalação, e `carreira.js` não.
  - `test_v2_modulo`: não liga mais a chave (não existe).
  - `hosted.test.ts`: sem o teste da chave e sem `reveal`.
- **Testes da v2:** 116/116 (antes 123: saíram os 6 testes do quadro e o da chave). Tipos ok; build ok e idêntico ao versionado.
- **Testes de tela da v2 (`test_v2_*`):** 32/32.
- **Suíte completa (com o Postgres temporário):** 211/212 na primeira rodada.
  - A única falha foi `test_sw_offline_carreira`, que ainda esperava o `carreira.js` no cache. Foi ajustado e passou.

## Fica para depois (não mudei, precisa de decisão)
- **`CLAUDE.md`, seção 0, regra 3:** fala em "manter a ponte que a v2 usa enquanto a página escondida existir (`/carreira/motor`, até a etapa G)". A página escondida não existe mais. A ponte do `carreira.js` hoje só serve de referência para os testes de equivalência. O texto da constituição é do Murilo; sugiro atualizar a regra.
- **`tools/capture/capture-v2-resultado.js`:** ferramenta de capturas da entrega A4, fora do CI. Ainda procura o quadro `/carreira/motor` para atravessar o pós-jogo antigo, que já tinha saído na fase 4. Está obsoleta; pode ser apagada ou reescrita quando precisar de capturas de novo.
- **Limite já registrado na G2c:** se `data.js` ou `motor/v2.js` ficarem pendurados na rede, o "Tentar novamente" só funciona recarregando a página.
