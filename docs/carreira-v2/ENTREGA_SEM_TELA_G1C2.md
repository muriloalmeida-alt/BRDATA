# Carreira 2.0: sem página escondida, etapa G1c2 (entrada, gravação e os comandos restantes da ponte no motor)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g1c2`, a partir de `main` (com o #94, etapa G1c1).
- **Status:** 2º pedaço da antiga G1c (a G foi dividida em pedaços menores em 10/11, ver `PROPOSTA_ETAPA_G.md`). Segue para PR e merge com CI verde.

## Resultado principal
Foram para `public/js/motor/carga.js`, **sem mudar o texto**:
- **A entrada:**
  - o convite e o retorno da loja pendentes;
  - a carga do save;
  - a liga e os times das 3 divisões pela API (ou os de exemplo), com a força de cada time;
  - a migração de save antigo (`enterAfterAuth`, `loadLeague`, `loadOtherCompetitionsTeams`, `migrateCareerDefaults`).
- **Gravar:** `persistCareer` e `ponteGravar`.
- **O estado que a ponte mostra à v2** (`ponteEstado`).
- **Os 19 comandos que restavam:**
  - conta, versão do save, competições, escolher a competição e criar a carreira;
  - recompensa diária, compra na loja e nome do técnico;
  - demissão, proposta de clube aceita e gravar de novo;
  - e os que ainda tocavam a tela antiga: ação no jogador, comissão (ver e aplicar sugestão), modelo de treino, avisos lidos e som.
- **No total:** 28 funções e 10 constantes da página.
- **A criação de carreira inteira:** o `startCareer` da página, que a F tinha deixado com a carga e a tela.

**As variáveis da página** (conta, fonte de dados, temporada real, herança do técnico) já estão no `motor/estado.js` desde a G1c1.

**Rede:** vai direto à API (`fetch`, mesma origem), sem passar pela página.

**Viram pedidos de tela (evento `tela`):**
- a tela de carregamento;
- travar e destravar a escolha de clube;
- a troca de tela;
- o som.

**Mais um espelho (como os da G1b):**
- **O que fazia:** no modo ponte, o `showGameScreen` da página é quem marca a ponte como pronta e avisa a v2.
- **No motor:** o espelho `mostrarJogo` faz essa lógica no modo ponte e, fora dele, pede o desenho.
- **Checagem:** conferi todas as funções que viraram pedido de tela na G1b e na G1c2, e nenhuma outra tem lógica no modo ponte.

**Entram pelo ambiente** (a página lê da tela antiga; a v2 vai responder "não"):
- a caixa "incluir base" da sugestão de escalação;
- se há modal aberto (só no caminho antigo do `continuarPosJogo`).

**No `carreira.js`:** o arquivo caiu para 12.782 linhas (eram 13.707 depois da G1b).

**Sem mudança de regra, de save, de API nem de tela.**

## O que ainda fica na página
- **`boot`:** a abertura da página, com a conta via `/api/auth/me`. Na v2 isso já é da própria v2.
- **A ponte em si** (o objeto `window.BRDATA_PONTE`): a G2 o monta a partir do motor. Hoje, cada comando já é um atalho de 1 linha.
- **`continuarPosJogo`**, que a v2 não usa.

## Defeito evitado (achado na geração, antes de testar)
- **O problema:** em `criarCarreira` e `aceitarPropostaClube`, a página lia a carreira de novo depois do `await startCareer(...)`, que troca a carreira inteira. No motor, a cópia lida no começo ficaria velha: criar carreira sempre "falharia".
- **Correção:** nessas funções `CAREER` é `let` e é relida logo depois do `startCareer`.
- **Contraprova:** o teste novo pega o erro se a releitura sair.

## Mudança nos testes da F, da G1a e da G1b
- **O que mudou:** quem grava agora é o motor. Então os testes não trocam mais o `persistCareer` da página por um falso: usam uma rede de mentira que aceita o `PUT /api/career` e conta as gravações.
- **`test_motor_ponte`:** caiu para 30 mundos (antes, 60), porque cada gravação agora serializa o save inteiro, como o jogo de verdade. Os 56 comandos continuam todos com sucesso.

## Testes
- **Novo `tests/unit/test_motor_carga.js`:**
  - **Como roda:** roda a página **inteira** duas vezes, num `vm` com a tela falsa, no modo ponte e com uma **API de mentira** determinística: conta, save no servidor, recompensa diária (a 2ª no mesmo dia é recusada), loja (debita ou recusa sem créditos) e nome (recusa nome longo).
    - **Antes:** a página de hoje com as funções e os comandos de antes por cima (congelados em `tests/unit/ref_carga_antes.js`).
    - **Depois:** a página de hoje.
  - **O que faz em cada um dos 30 mundos:**
    - a entrada sem carreira;
    - competições, escolher a competição e criar a carreira (com escolhas inválidas);
    - recompensa duas vezes, loja, nome;
    - ações no jogador, comissão e sugestões, modelo de treino, avisos e som;
    - gravar de novo;
    - recarregar a carreira salva;
    - no fim, demissão ou proposta de clube aceita.
  - **O que confere:**
    - o retorno de cada comando;
    - o save, na memória e no servidor;
    - a conta, o mundo (divisão, liga, times, fonte de dados, herança) e o estado da ponte;
    - as chamadas à API, na ordem;
    - os avisos.

    Tudo igual nos dois lados.
  - **Cobertura:** todos os comandos com sucesso e os principais também recusados (criar carreira, recompensa, loja, nome, ação no jogador, sugestão, demissão, gravar de novo).
  - **Contraprova:** mudei, um por vez:
    - a releitura da carreira depois do `startCareer`;
    - o endereço da recompensa;
    - a migração do save na entrada;
    - o rebaixar para a base;
    - o motivo do nome vazio.

    A verificação certa falhou em cada caso.
- **Texto idêntico:**
  - **Funções e constantes:** o `paginaComoAntes` cobre também o `carga.js`, e as reversões novas (variáveis no estado, carreira trocada, pedidos de tela, ambiente) foram acrescentadas. As 356 funções e constantes movidas em todas as etapas (38 desta) remontam iguais, caractere por caractere.
  - **Comandos:** os 19 desta etapa saem iguais aos de antes.
- **Os módulos carregam como ES module de verdade** (`test_motor_modulos_esm`, agora com 21 módulos).
- **Testes do motor:** todos passam (19 arquivos).
- **Suíte completa (com o Postgres temporário):** 210/210 na 2ª rodada.
  - **Na 1ª rodada (209/210), falhou o `test_ge_balance_004`, no item 4 ("força reposicionada persiste no save, recarregado"):**
    - **Sozinho:** passou 3 vezes seguidas.
    - **O que o item faz:** grava, espera até 20 s o servidor ter a força nova e recarrega a página.
    - **Por que falhou:** se a espera estoura, o teste engole o erro e recarrega o save velho. O retorno 0 indica que a gravação não chegou a tempo sob carga, ou que uma gravação anterior chegou depois.
    - **Situação:** a equivalência da gravação está coberta pelo `test_motor_carga` (mesmas chamadas à API, na mesma ordem). Fica registrado para observar no CI.
