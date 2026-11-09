# Carreira 2.0: sem página escondida, etapa F (temporada, Copa e criação no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-f`, a partir de `main` (com o #90, etapa E).
- **Status:** etapas E, F e G aprovadas pelo Murilo em 09/11, "sem pausas". Esta entrega segue para PR e merge com CI verde.

## Resultado principal
A virada de temporada, a montagem da Copa e a regra da criação de carreira foram para `public/js/motor/virada.js`, **sem mudar regra nem texto**. São 38 funções e constantes, mais a parte de regra do `startCareer`:
- **Virada de temporada (`advanceSeason`):**
  - histórico, premiações, reputação, objetivos e conquistas do fim da temporada;
  - demissão depois de 3 temporadas sem bater a meta;
  - patrocínio, empréstimos que voltam, renovação dos elencos (o seu e os da CPU) e a moral dos premiados;
  - acesso e rebaixamento entre as Séries A, B e C (e a Série D);
  - orçamento, campeões, tabela, calendário, amistosos, meta da diretoria, Copa e propostas de outros clubes.
- **Copa:** a montagem da temporada (`setupCup`), nos 2 formatos (16 clubes e 60 clubes), com o avanço rápido de save antigo.
- **Criação de carreira:**
  - os elencos (o seu e os dos 59 outros clubes, a partir dos jogadores reais ou de exemplo);
  - a escalação automática, as divisões, o patrocínio inicial e o estádio;
  - o save novo (`montarCarreira`).

**O `startCareer` foi dividido:**
- **No motor (`montarCarreira`):** do save novo até o patrocínio inicial, com o texto de antes.
- **Na página:** travar a tela de escolha, carregar os times das outras 2 divisões e o seu elenco, gravar e abrir a primeira entrada.

**O que vem da página:**
- **Como chega:** pelo mesmo ambiente das etapas C (`motor/semana.js`).
- **O que é:**
  - os jogadores de cada clube (`buscarJogadores`, que pode ir à API);
  - os times da Série D;
  - o escudo;
  - a fonte de dados (real ou exemplo);
  - a herança do técnico que trocou de clube.

**O "mundo" (divisão, liga e os 60 times):**
- **Onde mora:** em `motor/estado.js`, como nas etapas anteriores.
- **Quem muda:** o acesso e o rebaixamento trocam a divisão do seu clube por lá.

**No `carreira.js`:**
- As funções viraram atalhos que chamam o motor.
- As constantes leem do motor, com os mesmos nomes.
- O arquivo caiu de 15.531 para 14.799 linhas.
- **Comentários corrigidos:** os comentários dos atalhos das etapas C3, D1 e D2 diziam "mora em motor/semana.js" (modelo da C2 copiado). Agora apontam o módulo certo.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker o pré-carrega.
- Os tipos estão em `virada.d.ts` (e o ambiente novo em `semana.d.ts`).

**Sem mudança de regra, de save, de API nem de tela.**

## Decisões tomadas por mim (recomendação seguida, conforme a aprovação de 09/11)
1. **Um módulo só (`virada.js`)** para a virada, a Copa e a criação, porque a criação usa as mesmas peças da virada (calendário, Copa, meta, divisões).
2. **A carga dos dados fica na página nesta etapa:** buscar os times e os jogadores pela API (`loadOtherCompetitionsTeams`, `fetchRealPlayers`). O motor recebe os jogadores pelo ambiente. A etapa G decide onde essa carga mora quando a v2 importar o motor.
3. **O ambiente é preguiçoso:** cada item é uma função, chamada só quando o motor precisa (a página antiga e os testes antigos carregam sem os dados de exemplo).

## Testes
- **Novo `tests/unit/test_motor_virada.js`:**
  - **Como roda:** roda a página **inteira** duas vezes, num `vm` com a tela falsa, sem rede e com os dados de exemplo.
    - **Antes:** a página de hoje com as funções de antes por cima (congeladas em `tests/unit/ref_virada_antes.js`, com o `startCareer` inteiro).
    - **Depois:** a página de hoje.
  - **O que faz em cada um dos 100 mundos:**
    - cria uma carreira, com divisão, clube e herança do técnico sorteados;
    - monta a Copa no meio da temporada, nos 2 formatos;
    - vira até 4 temporadas, com tabela, Copa, premiações e sequências sorteadas.
  - **O que confere:** retornos, save, o mundo (divisão, liga e os 60 times com a força de cada um), avisos e o que a página grava e abre, todos iguais.
  - **Cobertura:** 258 viradas, 57 demissões, 104 trocas de divisão, 31 heranças de técnico, 48 Copas no formato antigo e 52 no novo.
  - **Contraprova:** mudei, um por vez:
    - o tamanho do histórico de temporadas;
    - os cabeças de chave da Copa;
    - a reputação inicial;
    - o aviso de objetivo do fim da temporada;
    - a troca da divisão do técnico;
    - os ids únicos na criação.

    A verificação certa falhou em cada caso.
- **Texto idêntico:** o `paginaComoAntes` cobre também o `virada.js`. Remontei a página de antes da F e a de agora, nome a nome: as 260 funções e constantes movidas em todas as etapas (38 desta) saem iguais, caractere por caractere.
- **`paginaComoAntes` mais preciso:**
  - **O problema:** os atalhos locais do cabeçalho de um módulo (como `myLeaguePosition`) podiam tomar o lugar de um atalho da página com o mesmo nome.
  - **Correção:** agora só volta para a página o que o módulo exporta.
  - **Novo parâmetro:** escolhe quais módulos voltar.
- **Testes das etapas anteriores:** os 8 que pegam funções da página (semana, fechamento, partida ao vivo, pós-jogo, clube, registro, temporada e o avanço rápido da Copa) usam a página como era antes da F. Assim continuam comparando o que comparavam.
- **Testes do motor:** todos passam.
- **Suíte completa (com o Postgres temporário):** 205/205.
