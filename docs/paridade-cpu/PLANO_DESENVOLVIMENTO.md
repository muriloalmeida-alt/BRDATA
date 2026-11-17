# Plano de desenvolvimento · Paridade dos clubes CPU

**Data:** 17/11/2026
**Base:** pacote "BRDATA · Clubes geridos pela CPU" (revisão de 17/11/2026), guardado nesta pasta:
[LEIA-ME](00_LEIA_ME.md) · [briefing](BRIEFING_CLAUDE.md) · [execução](01_Plano_de_execucao.md) · [requisitos CPU-01..10](02_Requisitos_de_produto.md) · [guia técnico](03_Guia_tecnico.md) · [validação V01..V10](04_Plano_de_validacao.md) · [inventário](05_Inventario_de_acoes.md)
**Status:** APROVADO pelo Murilo em 17/11/2026. Próxima entrega: E0.

## 1. Ponto de partida

O pacote foi auditado em `e517b1f`. A `main` agora está em `e7e964a`. Entre os dois commits entraram três demandas que mudam o ponto de partida:

| Desde a auditoria | Efeito para a paridade |
|---|---|
| GOLS-REAIS (#133) | A força de jogo (`estado.forcaDeJogo`: nível de gols e suavização) já vale para os dois lados. É o "nível de gols por competição" que o CPU-02 manda preservar. |
| EXPULSAO (#134) | A regra de jogar com menos já é dos dois lados (`partida.comExpulsoes`, `golsComExpulsoes`, `aovivo.registrarExpulsoes`), inclusive em CPU × CPU. A "vaga vazia" do CPU-04 e do V03 já existe para os dois. |
| VENDA-DISPONIVEL (#136) e EMPRESTIMO-DISPONIVEL (#127) | A CPU já decide quem vende e quem empresta (`mercado.motivosAVenda`, `precisaDeMinutos`), mas só nas negociações com você. |

## 2. Achados no código atual (pré-E0)

O levantamento a seguir é rápido e serve só para dimensionar o plano. O E0 confirma cada item com teste e completa o inventário.

| # | Achado | Onde | Requisito |
|---|---|---|---|
| A1 | A força da CPU é só a do clube (`forcaDeJogo(clube)`). Escalação, formação, tática e condição não entram. O seu time usa `computeHumanStrength`, que lê `CAREER.lineup`. | `aovivo.js` (bloco), `fechamento.js` (`simulateCupLeg`, `resolveCpuFixture`) | CPU-02 |
| A2 | A escalação da CPU (`pickCpuXI`) usa um molde fixo de 1-4-4-2 (`CPU_XI_MIX`) por overall. Não olha a condição, não monta banco nem goleiro reserva e só valida "status ok". | `fechamento.js:527` | CPU-01 |
| A3 | Ao vivo, o XI da CPU fica fixo: nenhuma substituição nem troca de tática. Só os expulsos saem. | `aovivo.js` (`lm.cpuXI`) | CPU-04 |
| A4 | A recuperação de condição só roda no seu elenco. O jogador da CPU só perde condição. | `fechamento.js:858` (`applyConditionRecovery` usa `CAREER.squad`) | CPU-05 |
| A5 | Lesão e suspensão de jogador da CPU só acabam na virada da temporada: o retorno só roda no seu elenco. | `semana.js` (`refreshAvailability`); `temporada.js` zera na virada | CPU-05 |
| A6 | As outras divisões fecham a rodada só com o placar (`rodada.playSimpleRound`): sem jogadores, minutos, cartões, lesões ou autores dos gols. | `fechamento.js` (`resolveOtherDivisionsRound`) | CPU-05 |
| A7 | Na Copa simulada, só o seu lado recebe cartões e desgaste. | `fechamento.js` (`simulateCupLeg`) | CPU-05 |
| A8 | Série D: o elenco é gerado uma vez por clube e guardado no save (`elencosSerieD`), o que já cobre boa parte do CPU-06. Falta conferir identidade e reaproveitamento em promoção e reencontro. | `fechamento.js:499`, `estado.js:197` | CPU-06 |
| A9 | O mercado CPU × CPU tem fluxo próprio, sorteado (`simulateAiTransfers`: 0 a 2 transferências por rodada). Não usa os avaliadores da Fase 1 que valem com você (`reservaParaProposta`, `avaliacaoAtleta`, empréstimo). | `semana.js:323` | CPU-07 |
| A10 | A CPU não tem caixa nem folha guardados: o orçamento é derivado na hora da folha (`clubBudget`: teto = folha × 1,35; caixa = 6 × teto). Não há renovação, dispensa nem cláusula dos lados CPU. | `mercado.js:132` | CPU-07/08 |
| A11 | A CPU não tem moral própria nem treino; a evolução é anual (`temporada.js`). | `temporada.js`, `aovivo.js` (moral só do seu elenco) | CPU-09 |
| A12 | Aceitar a proposta de outro clube chama `startCareer` e monta uma carreira nova do catálogo. O mundo da carreira (elencos dos outros clubes, transferências, tabelas) recomeça. | `carga.js` (`aceitarPropostaClube` → `startCareer`) | CPU-10 |
| A13 | O save tem limite de 768 KB (`careerStore.js:66`). Guardar minutos, condição, contratos e finanças dos cerca de 1.500 jogadores das 3 divisões é o maior risco de tamanho. | `server/src/careerStore.js` | todos |

## 3. Arquitetura proposta: "um executor, dois controladores"

O guia técnico pede a mesma regra para quem decide e para quem executa. Proposta para o motor (`public/js/motor/`):

1. **Lado da partida como dado.** Hoje o lado humano lê `CAREER.lineup`, `CAREER.squad` e `CAREER.lineup.tactics` direto. A ideia é extrair uma visão `ladoDaPartida(clubId)` = `{ elenco, escalação (11+11), formação, tática, instruções }`, a mesma forma para os dois controladores.
   - **Seu clube:** a visão vem do save, como hoje.
   - **CPU:** a visão vem do controlador da CPU (item 3) e é calculada na hora; o save não ganha nada, por causa do orçamento de bytes.
2. **Executor único** (reaproveitando o que já existe):
   - a força: `computeHumanStrength` vira `computeStrength(lado)`, mantendo `forcaDeJogo` e `comExpulsoes`;
   - a escalação: `escalacao.js` (`validarEscalacao`, 11+11 da FASE1-ESC) e `autoLineup`;
   - em campo: `applyLiveSub` e `applyLiveTactics` passam a receber o lado.
3. **Controlador da CPU** (módulo novo `motor/cpu.js`, funções puras):
   - escalação e postura no pré-jogo, conforme o perfil do técnico, a disponibilidade, o adversário observável e a importância da partida;
   - reavaliação no intervalo, em janelas fixas (60', 75') e em eventos (gol, lesão, expulsão);
   - decisão de manter quando a troca não compensa;
   - motivos registrados para testes e diagnóstico, com detalhe só sob ativação.
4. **Sorteio com chave por partida e por lado.** O motor já tem `comSorteio` e `rngDaChave`. Tela e log não consomem sorteio esportivo, e o mesmo estado e a mesma seed dão a mesma decisão.
5. **Simulação direta sem tela**, nos jogos da CPU e nas outras divisões: os mesmos blocos e o mesmo executor da partida ao vivo, sem narração nem desenho. O custo é medido no E0 e no E1b, e o trabalho pesado é processado em lotes.
6. **Persistência mínima.** Só o necessário entra no save:
   - por jogador, a condição, o status e os minutos da temporada (`appsSeason`, que já existe);
   - por clube, o contrato e o caixa (E3).

   Tudo o que pode ser derivado (escalação da CPU, postura, índices de mercado) é calculado na hora. O tamanho é medido por temporada antes de cada formato novo. Migração numerada (`schemaVersion`), como na GOLS-REAIS.

## 4. Etapas e PRs

Cada PR traz os IDs dos requisitos, o baseline e as evidências, os cenários manuais, os riscos e a etapa seguinte, como pede o pacote. A estimativa é em dias úteis, revista depois do E0.

### E0 · Diagnóstico (2–3 dias) — 1 PR, só documentos e ferramentas

- O inventário (`05_Inventario_de_acoes.md`) completo, com a rota ou tela, o comando de domínio, a validação, o estado afetado e o teste de cada ação da v2. Os achados A1–A13 são confirmados com teste ou corrigidos.
- **Simulação de baseline sem navegador** (`tests/e2e/sim_paridade_baseline.js`, perfil dedicado sob demanda): reaproveita `_sem_tela` e o servidor `frozen`, com seeds fixas. Mede, para dados reais e para o Modo Exemplo:
  - gols, 0x0 e dispersão por divisão, competição e porte;
  - **taxa de zebra:** vitórias e empates do time mais fraco, por faixa de diferença de força entre os lados (por exemplo < 5%, 5–15%, 15–30%, > 30%), em CPU × CPU e em CPU × você;
  - p50 e p95 do avanço de rodada, no Node;
  - o tamanho do save da temporada 1 à 5;
  - o tempo da suíte padrão (`_last_parallel_run.json`).
- Ficam definidos as metas absolutas, a **faixa aceitável de zebras por diferença de força** (o favorito precisa vencer mais conforme a diferença cresce, sem chegar a 100%; referência: o baseline e a proporção de zebras em campeonatos reais, a validar com o Murilo), a meta de bytes e o tamanho da amostra (2.000 jogos por divisão e 5 seeds × 5 temporadas, ajustáveis pelo custo medido).
- **Fora do E0:** corrigir bugs (A4, A5). Eles ficam registrados e entram no E1a.

### E1a · Escalação e força (4–6 dias) — 2 PRs

- **PR1, convocação comum (CPU-01, V02):**
  - a CPU convoca 11 + 11 com o mesmo `autoLineup` e a mesma validação de `escalacao.js`: goleiro no banco, sem suspenso ou lesionado, sem emprestado indevido;
  - na falta de atletas, a mesma reposição pela base dos dois lados; o que for inexequível vai para decisão de produto;
  - recuperação de condição e retorno de lesão e suspensão para todos os elencos ativos (A4, A5).
- **PR2, força comum (CPU-02, V01):** `computeStrength(lado)` para os dois controladores, ao vivo, no direto e em CPU × CPU da divisão atual, preservando a calibração da GOLS-REAIS. Revisão na Liga com 3 confrontos no mesmo cenário: elenco completo, sem o goleiro titular e sem o atacante titular.
- **Baseline:** desvio acima de 0,15 gol ou de 2 p.p. de 0x0 vai a investigação antes de recalibrar.
- **Critério de zebra:** com a força vinda dos 11 em campo, a taxa de zebra de cada faixa continua dentro da faixa definida no E0. Desfalques do favorito podem aumentá-la naquele jogo, mas não a média.

### E1b · Gestão em campo (5–8 dias) — 2 PRs

- **PR1, controlador pré-jogo e intervalo (CPU-03):** perfil do técnico (ver D1) e postura pelo placar, pelo adversário e pela importância da partida. Clubes diferentes fazem escolhas justificadamente diferentes.
- **PR2, decisões durante o jogo (CPU-04, V03, V04):**
  - substituições por fadiga, lesão e plano, dentro da mesma cota;
  - troca de formação e de instruções;
  - a vaga do expulso continua vazia;
  - os lances do adversário aparecem na v2 (entradas, saídas e mudanças táticas que o fluxo atual já sabe mostrar);
  - o mesmo jogo resolvido ao vivo e direto, com as mesmas decisões, aplica força, eventos, minutos, disciplina e desgaste do mesmo jeito.
- **Demonstração no celular:** uma troca tática por placar e uma reação a lesão ou expulsão.
- **Critério de zebra e de retranca:**
  - o time mais fraco que se fecha contra o favorito ganha chance de empatar ou vencer, pagando com menos gols a favor;
  - a taxa de zebra continua dentro da faixa do E0;
  - nenhuma postura fixa (sempre fechado ou sempre aberto) rende mais pontos em todas as situações, nem para a CPU nem para você (anti-exploit): fechar compensa quando a diferença é grande e o jogo está empatado ou ganho, e cobra o preço quando é preciso buscar o resultado.

### E2 · Divisões e Copa (4–7 dias) — 1–2 PRs

- **CPU-05, V05:** as outras divisões e a Copa passam a usar a simulação direta com o executor, com minutos, cartões, lesões, autores e recuperação por atleta, uma vez por partida e na ordem do calendário (A6, A7).
- **CPU-06:** identidade e elenco estáveis dos clubes da Série D do catálogo quando entram na Copa, sobem ou voltam na temporada seguinte. O regulamento da Copa não muda.
- **Custo:** são cerca de 60 times por rodada; é a etapa de maior risco para a fluidez. Ela é medida contra o orçamento do E0, com processamento em lotes e, se preciso, um worker (decisão com medição).

### E3 · Mercado e contas (6–10 dias) — 2–3 PRs

- **CPU-07, V06:** o CPU × CPU passa a usar os mesmos avaliadores do jogador × CPU (`reservaParaProposta`, `avaliacaoAtleta`, empréstimo, à venda), com papel e cobertura nos dois elencos, janela, folha, caixa e interesse do atleta. A lista de candidatos por carência é limitada, e a reavaliação acontece só em janelas e gatilhos (A9).
- **CPU-08:** renovações, dispensas, agentes livres e cláusulas (opção facultativa por preço, contribuição, caixa e cobertura; compra obrigatória e retornos nos gatilhos), com uma única operação mesmo ao recarregar ou repetir.
- **Contas da CPU (A10):** caixa e folha por clube no save, com o modelo da decisão D2, e escrituração dos dois lados.

### E4 · Temporadas e continuidade (6–9 dias) — 2 PRs

- **CPU-09:** treino, recuperação, moral, base e minutos com os mesmos efeitos para os dois controladores. A CPU identifica carências, poupa no calendário apertado, promove a base e planeja renovações.
- **CPU-10, V07, V08 (A12):** a troca de comando carrega o clube no mundo existente, sem `startCareer`, e devolve o clube anterior à CPU com o estado dele. Saves antigos, offline, exportar e importar seguem compatíveis.
- **Fechamento:** 5 temporadas × várias seeds no perfil dedicado, duas trocas de comando num save existente e o inventário completo.

**Total:** 27–43 dias úteis, a revisar depois do E0, como no pacote.

## 5. Testes e desempenho

- **Suíte padrão:** até 5% a mais de tempo. Os casos novos são curtos, no motor (`tests/unit/`): elegibilidade, força pareada, decisão por contexto, transação única e retomada. Testes de navegador só para jornadas da v2 (lances da CPU na partida, mercado).
- **Perfil dedicado sob demanda** (novo perfil no `run_parallel`/`suites.json`): simulação estatística e 5 temporadas, sem navegador, com os mesmos cenários reaproveitados. Roda antes de cada etapa que mexe em balanceamento, economia ou save.
- **Zebras:** o perfil dedicado mede a taxa de zebra por faixa de diferença de força a cada etapa que mexe em força ou em decisão da CPU (E1a, E1b, E2, E4), com o mesmo cenário e as mesmas seeds do E0.
- **Desempenho:** p95 do avanço de rodada com até 5% de regressão sobre o baseline e dentro da meta absoluta do E0. Sem travamento novo no Safari do iPhone (V09); esse teste precisa de aparelho ou de homologação (ver D5).
- **Equivalência com as cópias congeladas do motor:** cada regra nova tem a chave de desligar, como `EXPULSAO.ativa` e `A_VENDA.ativa`, para os testes de equivalência continuarem comparando o resto.

## 6. Decisões de produto pedidas (antes ou ao longo das etapas)

| # | Decisão | Quando |
|---|---|---|
| D1 | **Perfil do técnico da CPU** (ofensivo, equilibrado, defensivo; risco): derivado do clube (porte, reputação, força) ou sorteado uma vez por clube e guardado no save. | Antes do E1b |
| D2 | **Modelo de finanças da CPU:** caixa e folha guardados por clube (mais realismo, mais bytes) ou derivados a cada janela, como hoje. | Antes do E3 |
| D3 | **O que o jogador vê das decisões da CPU:** só os lances da partida ou também notícias e diagnóstico. | E1b |
| D4 | **Itens da loja com efeito esportivo** (Reset de Moral, Desconto de Contratação): a CPU não tem equivalente. Registrar como "experiência do jogador" ou criar paridade. | E0 (inventário) |
| D5 | **Validação no iPhone (V09):** quem testa e onde (aparelho do Murilo, homologação). | A partir do E1b |
| D6 | **Meta de bytes do save** e eventual aumento do limite de 768 KB. | Depois do E0 |

## 7. Ordem e próximos passos

1. O Murilo aprova este plano (ou pede ajustes) e responde à D4, se quiser fechar já no E0.
2. Começa o E0: PR de diagnóstico, inventário completo e baseline. Depois, revisão de produto e reestimativa.
3. E1a → E1b → E2 → E3 (com o desenho do mercado podendo andar em paralelo ao E1) → E4, um PR por entrega revisável, cada um com aprovação antes do merge.
