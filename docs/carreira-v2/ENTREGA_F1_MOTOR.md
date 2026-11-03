# Carreira 2.0: fase 1 do plano de independência (motor invisível)

- **Data:** 03/11/2026.
- **Branch:** `fase1-motor`, a partir de `carreira-v2-independencia`.
- **Status:** aguardando aprovação do Murilo.
- **Plano:** `PLANO_INDEPENDENCIA.md`, seção 3 (fase 1) e seção 7 (D2: "motor escondido agora, extração em etapas depois").

Esta fase não tem tela nova. Ela muda **onde** e **como** a v2 roda o motor do jogo, preparando as próximas fases (semana, mercado, temporada…), que vão usar o mesmo motor.

## O que mudou

### 1. Endereço próprio para o motor: `/carreira/motor`
- **Antes:** a v2 abria o motor em `/carreira-old?ponte=partida`. **Agora:** abre em `/carreira/motor`. É a mesma página da versão anterior, em modo ponte, servida pelo servidor com `<base href="/">` (a página usa caminhos relativos) e `noindex`.
- **A v2 não aponta mais para `/carreira-old` para rodar o jogo.** Os botões que ainda abrem telas da versão anterior continuam lá até cada tela ser refeita (decisão D3).
- **`?ponte=partida` continua aceito**, por compatibilidade.

### 2. Um motor por uso da v2, reaproveitado entre telas
- **Antes:** cada partida abria um motor novo e o destruía ao sair.
- **Agora:**
  - existe **um único motor** (`adapters/engine.ts`), pré-carregado em segundo plano 1,5 s depois de a v2 carregar a carreira;
  - a partida usa esse motor, que **continua aberto, escondido e inerte** depois do pós-jogo.
- **Ao sair da Partida:**
  - partida encerrada e gravada: é **descartada** no motor (`descartar()`), para não ser reapresentada;
  - pós-jogo interrompido ou resultado não gravado: o motor é **recarregado**. É o equivalente ao que a tela fazia antes ao destruí-lo, e o próximo jogo começa limpo;
  - partida em andamento: continua. Voltar à tela retoma o jogo.

### 3. Save sempre atualizado (proteção contra perda de dados)
**O risco:** com o motor aberto entre telas, ele guarda em memória o save do momento em que abriu. Se a v2 gravar algo por fora (hoje, a escalação), o motor ficaria com o save antigo. No próximo comando que grava, como o fim da partida, ele **sobrescreveria a mudança**.

**A proteção tem duas partes:**
- **Antes de entregar a sessão,** `engine.get()` compara a versão do save no motor (`updatedAt`) com a do servidor. Se forem diferentes, o motor é recarregado.
- **O motor não grava mais ao abrir.** A gravação de "migração" da abertura ficou desligada no modo ponte, porque ela poderia chegar depois de uma gravação da v2. A migração em memória é idempotente, e o save migrado é gravado no primeiro comando que grava.

**Comprovação:** `test_v2_motor`, verificação 4, com uma prova negativa. Com a comparação desligada de propósito, o resultado gravado voltou a formação de 4-4-2 para 4-3-3, ou seja, perdeu a troca feita na v2. Com a comparação ligada, a formação nova é mantida.

### 4. Porta única de comandos
- **No motor:** `BRDATA_PONTE.executar(nome, ...args)`.
- **Na v2:** `session.run(nome, ...args)`.
- Os comandos das próximas fases (avançar semana, mercado, temporada…) entram como métodos da API da ponte e já ficam acessíveis à v2 por essa porta.
- **Novos na API:**
  - `versaoSave()`;
  - `descartar()`;
  - `executar()`;
  - `iniciar()`, que passou a limpar o resumo e o pós-jogo anteriores.

## Medida
**Abertura do motor (pré-carga), servidor local:** cerca de 2,0 s até ficar pronto, dos quais 1,5 s são a espera proposital antes de começar.

**No celular e na homologação vai ser maior.** Isso precisa ser medido na homologação, e a pré-carga existe justamente para essa espera não cair no "Iniciar partida".

**Custo:** cada abertura da v2 carrega a página do motor em segundo plano (o JavaScript da versão anterior, em cache depois da 1ª vez). Esse é o preço da decisão D2, que some na fase 12 (extração do motor).

## Testes
- **Unitários:** 65/65. São 8 novos do host do motor (`adapters/engine.test.ts`):
  - reaproveitamento;
  - recarga quando o save muda;
  - sem recarga quando não há versão;
  - abertura única com chamadas simultâneas;
  - sair da tela cancela só a espera de quem saiu;
  - nova tentativa depois de falha;
  - pré-carga que engole erro;
  - `reset`.
- **E2E novo `test_v2_motor.js`** (navegação toda dentro da v2, sem recarregar a página):
  1. `/carreira/motor` responde com `<base href="/">` e `noindex`, e o bundle da v2 não contém mais `/carreira-old?ponte`;
  2. a pré-carga no Início produz 1 quadro escondido (`aria-hidden`, `inert`, 1 px) e **nenhuma gravação** ao abrir;
  3. sem mudança no save, a partida usa o **mesmo** motor pré-carregado, que segue aberto, único e escondido depois do pós-jogo;
  4. formação gravada pela v2 com o motor aberto: o motor é recarregado e o resultado mantém a formação nova (prova negativa acima);
  5. abrir a Partida depois do pós-jogo não reapresenta o jogo encerrado;
  6. medida de abertura.
- **E2E atualizados**, porque o motor agora fica aberto: `test_v2_resultado`, `test_v2_gravacao` e `test_v2_tabela_partida`. "Sem a ponte no Início" passou a ser "no máximo um motor, escondido". O seletor do quadro também mudou, para `/carreira/motor`.
- **Suíte completa (servidor isolado):** 171/172.
  - A falha foi o `test_v2_foco`. O cenário "motor que nunca carrega" ainda interceptava o endereço antigo do motor. Corrigido para `/carreira/motor`, ele passou.
  - Depois disso, os E2E da v2 deram **16/16**.

## Arquivos
- `server/server.js`: rota `/carreira/motor`.
- `public/js/carreira.js`:
  - `V2_PONTE` também por `/carreira/motor`;
  - sem gravação de abertura no modo ponte;
  - `versaoSave()`, `descartar()`, `executar()`;
  - `iniciar()` limpa o resumo e o pós-jogo anteriores.
- `carreira-v2/src/adapters/engine.ts` (novo) e `engine.test.ts` (novo).
- `carreira-v2/src/adapters/match.ts`: endereço do motor e métodos novos da sessão.
- `carreira-v2/src/screens/Match.tsx`: usa o motor compartilhado, com descarte ou recarga ao sair.
- `carreira-v2/src/App.tsx`: pré-carga.
- **Testes:** `tests/e2e/test_v2_motor.js` (novo), `_v2_match.js`, `test_v2_resultado.js`, `test_v2_gravacao.js`, `test_v2_tabela_partida.js`, `test_v2_partida.js`, `suites.json`.
- **Captura:** `tools/capture/capture-v2-resultado.js`.

## Próxima entrega (depois da sua aprovação)
"**Ajustes de sistema**" (P1 e P3), nas telas já aprovadas:
- margens de 24 px (20 px em 360);
- "Voltar ao …" como ação em texto.

Vem com um comparativo antes × depois de cada tela. Depois disso, a **fase 2 (acesso)**.
