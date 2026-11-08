# Carreira 2.0: sem página escondida, etapa C1 (registro e mundo no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-c`, a partir de `main` (com o #81, etapa B, e o #82, Postgres).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (09/11):
- **Corte:** a etapa C (semana e rodada) foi dividida em 3 subetapas, e esta é a C1.
- **Avisos de tela:** viram **eventos**.
- **"Mundo" da carreira:** passa a morar no **módulo de estado**.

## Resultado principal
Os serviços que a semana e a rodada usam para registrar coisas na carreira foram para `public/js/motor/registro.js`, **sem mudar regra nem texto**:
- **Notificações:** a central de avisos, com filtro pelas Configurações e limite de 30.
- **Objetivos:** diário, semanal e de temporada, com modelos, renovação pela data local, progresso e recompensa.
- **Conquistas:** catálogo e progresso.
- **Notícias da rodada:** líder novo, goleada, zebra, reação do lanterna, fim de jejum e empate defendido, mais as sequências sem vitória.

O módulo lê e grava a carreira do módulo de estado (etapa B).

**Avisos como eventos** (`public/js/motor/eventos.js`, novo):
- **Antes:** "Objetivo concluído!" e "Conquista desbloqueada!" chamavam a tela (`toast`) direto da lógica.
- **Agora:** a lógica emite o evento `aviso`, e a página antiga o mostra como o mesmo toast de sempre, porque passa a ouvi-lo ao iniciar. A v2 pode ouvir os mesmos eventos quando importar o motor (etapa G).

**O "mundo" da carreira no módulo de estado:** os times da liga atual, todos os times das divisões e a competição atual (`LEAGUE_TEAMS`, `ALL_TEAMS_FLAT`, `CURRENT_COMPETITION_ID`) passaram a morar em `motor/estado.js`.
- **Atalhos:** no `carreira.js`, os nomes de sempre viraram atalhos (como o `CAREER` na etapa B). Ler e atribuir passam pelo módulo.
- **Funções que foram junto:** a busca de time (`teamById`), a força média do elenco e a média de overall.

**Carga:**
- O `carreira.html` importa os módulos novos.
- O service worker pré-carrega os arquivos.
- Os tipos ficam em `eventos.d.ts`, `registro.d.ts` e `estado.d.ts`.

**Sem mudança de regra, de save, de API nem de tela.**

## Pontos para sua avaliação
1. **Função duplicada:** `localWeekStartStr` estava escrita duas vezes no `carreira.js`, igual nas duas. Agora existe uma vez só, no motor. O `carreira.js` não a usa mais.
2. **Recompensa de objetivo:** o efeito (dinheiro, moral, condição) é do motor. O texto do aviso ("+R$ … · moral do elenco em alta") continua montado no `carreira.js`, porque usa a formatação de dinheiro da tela.
3. **"Veterano":** a conquista usa a data de criação da **conta**, que não é do save. O `carreira.js` passa essa data para o motor.

## Testes
- **Novo `tests/unit/test_motor_registro.js`:** compara as funções antigas (congeladas em `tests/unit/ref_registro_antes.js`) com as atuais do `carreira.js`, que agora chamam o motor, com o `CAREER` e o mundo morando no módulo. São 150 mundos sorteados com o mesmo roteiro:
  - **o roteiro:** objetivos (renovação, progresso e as 3 recompensas), 40 notificações com filtro e limite, conquistas (com e sem conta de 1 ano), notícias de 6 rodadas, buscas de time e força;
  - **o que confere:** retornos, save e **avisos de tela na mesma ordem**, todos iguais. Também confere que o barramento de eventos isola um ouvinte com erro.
  - **Contraprova:** mudei, um por vez, a margem da zebra, o limite de notificações, o aviso de objetivo e o bônus de moral. A verificação certa falhou em cada caso.
- **Testes ligados à C1:** 24/24. Entram objetivos, conquistas, engajamento, notícias, notificações, reputação, rebaixamento, troca de fonte de dados (que atribuem o mundo pela página), multi-divisão, Semana, Pós-jogo, Mais e Temporada da v2, resumo da rodada, premiações e o jogo sem tela.
- **Suíte completa (com o Postgres temporário):** 196/197.
  - **A falha:** `test_v2_clube` (verificação 8, esperando a lista de Indicações dos olheiros). Rodado de novo sozinho, passou 3/3.
  - **Causa:** não consegui reproduzir. O teste não passa pelo que esta etapa mudou (notícias, objetivos, conquistas e notificações), mas fica registrado como intermitente.
