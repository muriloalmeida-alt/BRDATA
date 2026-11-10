# Carreira 2.0: sem página escondida, etapa G2a (hospedeiro do motor sem página)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g2a`, a partir de `main` (com o #95, etapa G1c2).
- **Status:** 1º pedaço da G2 (divisão em `PROPOSTA_ETAPA_G.md`). A v2 ainda não usa o hospedeiro: isso é a G2b.

## Resultado principal
Novo `public/js/motor/v2.js`: abre o jogo **sem a página antiga**.
- **`abrirMotor()`:**
  - monta o ambiente que a página dava ao motor;
  - entra na conta (`/api/auth/me`);
  - faz a mesma entrada da página: carga do save, liga e times, migração (ou a escolha de competição, sem carreira);
  - devolve a ponte.
- **`criarPonte()`:** monta a ponte a partir do motor. São os mesmos 97 comandos de `window.BRDATA_PONTE` (consulta e gestão, jogo, carga), mais `estado` e a porta genérica `executar`.
- **`ambienteSemPagina()`:** o ambiente sem a página.
  - **Relógio:** os timers de quem hospeda.
  - **Rede:** a gravação vai à API.
  - **Som:** a preferência é a mesma chave da página (`mt_sfx_enabled`). O som não toca, como no modo ponte de hoje.
  - **Tela antiga:** nenhuma caixa marcada e nenhum modal aberto (não há tela antiga).
  - **Botão Simular:** de mentira.

**Quem hospeda carrega o `/js/data.js` antes:** dados de exemplo, nomes e o sorteio por chave. O hospedeiro os lê pelo nome, sem `eval`, porque as `const` de topo de um script comum ficam no escopo global que os módulos enxergam.

**`continuarPosJogo`:** o caminho antigo de mostrar a página em tela cheia não existe no hospedeiro. A v2 não o usa.

**`fetchRealPlayers`** (os jogadores de cada clube, pela API ou de exemplo) também foi para o motor (`carga.js`), com o texto de antes. Era a última peça da entrada que ficava na página.

## Defeito achado e corrigido (vinha da etapa E)
- **O problema:** na E, as ações de mercado e de clube pediam a gravação como evento de tela (`tela("persistCareer")`), 16 lugares no `clube.js`. Com a página, ela gravava; sem página, ninguém atenderia, e a v2 perderia gravações depois da G2 (por exemplo, ao aceitar ou recusar uma proposta por jogador).
- **Como apareceu:** o teste novo mostrou um save diferente no servidor com os comandos iguais. O rastro mostrou a gravação vindo do ouvinte de tela da página.
- **Correção:** essas gravações agora são `ambiente.persistir()`, que na página continua sendo o `persistCareer` de sempre (sem mudança para a página).
- **Contraprova:** com aceitar e recusar proposta de volta ao evento, o teste falha.
- **Os outros pedidos de tela:** conferi todos os usados no motor (48 nomes). Fora os espelhos da G1b e da G1c2, nenhum outro grava nem muda o jogo. O do som (`setSfxEnabled`) guarda a preferência, e o hospedeiro faz o mesmo.

## Testes
- **Novo `tests/unit/test_motor_hospedeiro.js`:**
  - **Como roda:** joga a mesma carreira duas vezes, conduzida como a v2, num `vm` com a tela falsa, a mesma API de mentira, o mesmo sorteio e o mesmo relógio virtual.
    - **Página:** `data.js`, motor e `carreira.js` no modo ponte, pela `window.BRDATA_PONTE` (como a v2 usa hoje).
    - **Hospedeiro:** só `data.js` e motor, **sem `carreira.js`**, pela ponte de `abrirMotor()`.
  - **O que faz em cada um dos 40 mundos:**
    - entrada sem carreira, competições, escolher e criar;
    - recompensa;
    - semanas com amistosos;
    - 4 partidas ao vivo (pausa, velocidade, substituição, tática, intervalo, "pular pro fim") com o pós-jogo inteiro;
    - comandos de gestão pela porta genérica, preferências e som, histórico do técnico;
    - reabrir o jogo com o save do servidor.
  - **O que confere:**
    - o retorno de cada comando e o estado da ponte a cada passo;
    - o save no servidor;
    - as chamadas à API e os timers;
    - os avisos do motor e os avisos à v2.

    Tudo igual nos dois lados.
  - **Do lado da página, ficam desligados** o aviso na tela e o "carregando": são só tela, com timers próprios que atrapalhariam o relógio virtual.
  - **Contraprova:** mudei, um por vez:
    - o modo ponte;
    - a conta na entrada;
    - o relógio;
    - o nome do técnico;
    - a gravação da preferência de som;
    - a porta genérica;
    - a gravação ao aceitar ou recusar proposta.

    A verificação certa falhou em cada caso.
- **Texto idêntico:** as 357 funções e constantes movidas em todas as etapas remontam iguais, caractere por caractere (o `ambiente.persistir()` volta a `persistCareer()` na remontagem).
- **Testes do motor e da v2:** todos passam (v2: 117/117).
- **Suíte completa (com o Postgres temporário):** 211/211.
