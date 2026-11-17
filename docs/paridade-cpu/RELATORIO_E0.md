# PARIDADE-CPU · Relatório do E0 (diagnóstico, inventário e baseline)

**Data:** 17/11/2026
**Status:** REVISÃO DO PM NECESSÁRIA
**Base medida:** `d6ab99b`, que é a `main` `e7e964a` mais o PR #137 (docs e 2 testes; o motor é o da `main`).
**HEAD em produção:** não consultado. Não tenho acesso à produção daqui; o Murilo confirma.
**Requisitos da Fase 1 no repositório:** `docs/carreira-v2/fase1/01_Requisitos_Escalacao.md` (ESC) e `02_Requisitos_Mercado.md` (MER), com `PLANO_MER.md` e `CALIBRACAO_MER.md`.

## 1. O que o E0 entrega

| Entrega | Onde |
|---|---|
| Inventário completo das ações da v2: rota, comando, regra, estado, testes, CPU hoje, requisito e situação | `05_Inventario_de_acoes.md` |
| Baseline sem navegador, sob demanda e determinístico (mesma seed dá o mesmo resultado, conferido) | `node tests/sim/paridade_baseline.js` |
| Confirmação dos achados no motor de hoje | `node tests/sim/paridade_achados.js` (13/13 confirmados) |
| Servidor isolado para as simulações (cópia do `server/`, modo arquivo, porta 8787) | `tests/sim/_servidor.js` |

Os dois roteiros ficam fora da suíte padrão: o `run_parallel` só pega arquivos `test_*.js`. A suíte não fica mais lenta.

Cada etapa da paridade muda de propósito o que o `paridade_achados.js` confere. Quando uma etapa corrige um achado, o item dele passa a "não confirmado", e o relatório da etapa registra isso.

## 2. Achados confirmados (A1–A14)

Todos foram confirmados rodando o motor de verdade pela ponte, sem navegador, com o catálogo real congelado.

| # | Achado | Evidência (`paridade_achados.js`) |
|---|---|---|
| A1 | A força da CPU é só a do clube | Elenco inteiro de um clube rebaixado a overall 30: com a mesma seed, o mesmo jogo dá o mesmo placar (0×3 nos dois casos) |
| A2 | Escalação da CPU: 1-4-4-2 fixo por overall, sem banco | Escala 1/4/4/2 de 26 jogadores; um zagueiro com condição 5 continua escalado |
| A3 | Ao vivo, o XI da CPU não muda | 11 no início e 11 no fim, 0 substituições da CPU |
| A4 | A condição da CPU não se recupera | Reserva da CPU com 50 continua com 50 depois de 3 rodadas; o seu foi a 100 |
| A5 | Lesão e suspensão da CPU só acabam na virada | O lesionado da CPU com retorno vencido segue "contundido"; o seu voltou |
| A6 | Outras divisões: só o placar | Nos jogadores da outra divisão, jogos, gols, cartões e condição não mudam na rodada; na sua divisão, mudam |
| A7 | Copa CPU × CPU: ninguém leva cartão nem cansa | Num jogo de Copa entre dois clubes da CPU, nenhum jogador muda |
| A8 | Série D: grupo fixo, elenco gerado sob demanda e sempre igual | 36 clubes; elenco gerado com **12 jogadores**; só o seu adversário na Copa vai para o save |
| A9 | Mercado CPU × CPU sorteado | 35% de uma e 8% de duas transferências por rodada; não usa os avaliadores de você × CPU |
| A10 | A CPU não tem caixa nem folha guardados | Teto = folha × 1,35; caixa = 6 × teto, calculado na hora |
| A11 | A CPU não tem moral | Depois de 6 rodadas, os 1.134 jogadores da CPU seguem com 70; no seu elenco há 5 valores |
| A12 | Trocar de clube recomeça o mundo da carreira | Depois de aceitar: rodada 1, 0 ponto na tabela, números dos jogadores dos outros clubes zerados |
| A13 | Limite do save | Ver a seção 3.4: o limite que pesa é **1 MB de JSON cru no envio**, não os 768 KB |
| **A14 (novo)** | **Os elencos da CPU encolhem e enfraquecem a cada virada** | 1.134 → 884 jogadores e overall 70,2 → 67,5 em duas viradas. Em 4 viradas: 784 jogadores, 239 reais, overall 56,8 |

### A14, em detalhe

Este achado não estava no pacote.

Na virada, `temporada.renewLeagueSquad` faz duas coisas:
- tira do elenco da CPU quem tem contrato vencido, sem renovação;
- repõe só até o mínimo, com profissionais gerados.

Os gerados recebem contrato contado do **ano do catálogo** (`computeContractFields(..., env.liveSeason)`, com `liveSeason = temporadaReal()`, 2023 no catálogo congelado), e não do ano da carreira. Por isso eles já nascem com contrato vencido ou perto de vencer e saem nas viradas seguintes.

O mesmo cálculo vale para quem é gerado no seu elenco (base e profissionais): no seu elenco, em 2027, há 7 contratos até 2024.

A força de jogo não muda, porque ela é a do clube (A1). O que encolhe é o mundo visto pelo jogador: o mercado, o elenco dos rivais e o nível de quem está à venda.

Quando a força passar a vir do elenco (E1a), esse encolhimento passa a afetar os resultados. Por isso pede decisão (D10).

## 3. Baseline (V10)

**Comando:** `node tests/sim/paridade_baseline.js`, com os dois modos (dados reais e Modo Exemplo).

**Amostra:** 5 seeds × 5 temporadas por modo, com o seu clube sendo o 1º da lista do Brasileirão. São 57.000 jogos de liga, 28.500 por modo e 9.500 por divisão. Cada modo leva cerca de 105 s nesta máquina (4 CPUs). Rodar de novo com as mesmas seeds dá os mesmos 57.000 placares.

### 3.1 Gols e 0×0, por divisão

| Modo | Divisão | Jogos | Gols por jogo | Desvio padrão | 0×0 | Mandante vence | Empate |
|---|---|---|---|---|---|---|---|
| Real | Brasileirão (sua divisão) | 9.500 | 2,63 | 1,64 | 7,7% | 41,3% | 25,3% |
| Real | Série B | 9.500 | 2,92 | 1,71 | 5,2% | 41,8% | 24,0% |
| Real | Série C | 9.500 | 2,84 | 1,69 | 5,7% | 41,2% | 24,6% |
| Exemplo | Brasileirão | 9.500 | 3,13 | 1,77 | 4,1% | 42,2% | 22,6% |
| Exemplo | Série B | 9.500 | 2,88 | 1,71 | 5,7% | 41,5% | 23,5% |
| Exemplo | Série C | 9.500 | 2,81 | 1,70 | 6,5% | 40,2% | 24,6% |

**Por tipo de jogo, no Brasileirão real:**
- CPU × CPU: 8.550 jogos, 2,63 gols e 7,7% de 0×0;
- CPU × você: 950 jogos, 2,64 gols e 7,4% de 0×0.

**Gols marcados por jogo, por terço de força, no Brasileirão real:** forte 1,40; médio 1,21; fraco 1,07.

**Margem de erro (95%) com 9.500 jogos por divisão:**
- cerca de ±0,03 gol por jogo;
- cerca de ±0,5 p.p. de 0×0.

O critério do plano (investigar mais de 0,15 gol ou 2 p.p.) fica bem acima do ruído. Dá para usar 3 seeds em vez de 5, se for preciso economizar tempo.

### 3.2 Taxa de zebra

A força de um clube é `atk/def` da força de jogo (`estado.forcaDeJogo`). A diferença de força é forte/fraco − 1. Conta como zebra o mais fraco vencer ou empatar.

| Faixa de diferença | CPU × CPU, real: jogos · forte vence · empate · fraco vence · **zebra** | CPU × você, real: jogos · **zebra** |
|---|---|---|
| < 5% | 3.236 · 37,5% · 25,9% · 36,6% · **62,5%** | — |
| 5–15% | 6.368 · 39,8% · 25,2% · 35,0% · **60,2%** | 100 · **57,0%** |
| 15–30% | 6.512 · 43,4% · 25,4% · 31,2% · **56,6%** | 268 · **60,8%** |
| > 30% | 11.434 · 52,4% · 23,4% · 24,1% · **47,6%** | 582 · **46,2%** |

No Modo Exemplo, CPU × CPU dá 62,2%, 58,7%, 54,4% e 47,7%: o mesmo desenho.

**Leitura:** o favorito vence mais conforme a diferença cresce, mas pouco. Mesmo com mais de 30% de diferença, o mais forte vence só 52% dos jogos.

Duas coisas puxam nessa direção:
- a suavização da GOLS-REAIS aproxima as forças da média;
- o mando de campo é fraco: o mandante vence 41%, contra algo perto de 48% em campeonatos reais (referência a validar).

Isso é o comportamento de hoje, não um defeito da paridade. A faixa aceitável é uma decisão (D13).

### 3.3 Tempo (Node, sem navegador, 4 CPUs)

| Medida | p50 | p95 | Máximo | Observações |
|---|---|---|---|---|
| Rodada inteira: semana, partida (pular para o fim), pós-jogo e gravação | 96 ms | 174 ms | 306 ms | 950 rodadas, dados reais |
| Virada de temporada | 53 ms | 61 ms | 62 ms | 20 viradas |
| Memória (pico do heap do Node) | — | — | 93 MB | — |

O Modo Exemplo dá o mesmo: p50 de 94 ms e p95 de 178 ms.

Este é o custo do motor. No iPhone, somam-se o desenho da v2 e o IndexedDB, e a medida no aparelho fica para a D5 (V09).

### 3.4 Save (V07/V08)

O servidor tem **dois** limites:
1. o corpo do `PUT /api/career`: **1 MB de JSON cru** (`server.js`, `readBody`, que recusa acima de 1.048.576 bytes);
2. o save guardado: 768 KB **comprimido** (`careerStore.js`, `MAX_BYTES`).

| Fim da temporada | JSON cru, real (média · máximo) | Comprimido, real | JSON cru, Exemplo (máximo) |
|---|---|---|---|
| 1 | 750,8 KB · 756,4 KB | 74,8 KB | 693,7 KB |
| 2 | 831,6 KB · **833,8 KB** | 79,8 KB | 768,8 KB |
| 3 | 691,7 KB · 694,2 KB | 70,2 KB | 660,9 KB |
| 4 | 629,2 KB · 630,4 KB | 65,6 KB | 628,7 KB |
| 5 | 601,2 KB · 604,6 KB | 63,1 KB | 601,7 KB |

**Pico em qualquer rodada:** 833.229 bytes, ou **79,5% do limite de 1 MB do envio**. A margem é de cerca de 210 KB. Comprimido, o save fica em cerca de 10% dos 768 KB.

A queda depois da temporada 2 vem do A14 (elencos da CPU encolhendo). Se o A14 for corrigido, os elencos param de encolher e o save deixa de cair, ficando perto do pico de cerca de 830 KB em todas as temporadas.

**Para a paridade:**
- os jogadores da CPU **já guardam** condição, status, moral, cartões e jogos. O E1a e o E2 (condição, lesão e minutos da CPU) quase não somam bytes;
- caixa e folha por clube (E3) somam cerca de 3 KB para 59 clubes;
- o risco de bytes está em guardar coisas novas por jogador (histórico, contratos mais ricos) e na correção do A14. A decisão está na D6.

### 3.5 Elencos da CPU no fim de cada temporada (A14)

Média das 5 seeds:

| Fim da temporada | Real: jogadores · reais · overall | Exemplo: jogadores · reais · overall |
|---|---|---|
| 1 | 1.134 · 1.134 · 71,0 | 1.096 · 1.096 · 75,2 |
| 2 | 1.118 · 1.070 · 70,3 | 1.080 · 1.032 · 74,5 |
| 3 | 884 · 770 · 68,3 | 865 · 747 · 71,9 |
| 4 | 794 · 523 · 63,4 | 788 · 488 · 65,6 |
| 5 | 784 · 250 · 57,1 | 784 · 248 · 59,0 |

### 3.6 Tempo da suíte padrão

Suíte completa local: `node run_parallel.js --isolated-server`, 4 CPUs, concorrência 10, sobre `paridade-e0`.

**Resultado:** 172/172 em **466,8 s**, com soma serial de cerca de 3.844 s.

A meta de até +5% dá cerca de **+23 s** no mesmo perfil para toda a paridade. Os dois roteiros do E0 não entram na suíte.

## 4. Pontos de extensão encontrados

1. **Força:** `fechamento.computeHumanStrength(clube)` lê `CAREER.lineup` e `CAREER.squad` direto. Generalizar para receber um "lado" (escalação, elenco e tática) serve aos dois controladores. A CPU passa a montar o lado em vez de usar `forcaDeJogo` puro, em `aovivo.js`, `resolveCpuFixture` e `simulateCupLeg`.
2. **Escalação:** `escalacao.validarEscalacao` e `virada.autoLineup` já fazem 11+11 com goleiro no banco. Basta trocar o `pickCpuXI` por eles, passando o elenco do clube.
3. **Recuperação e disponibilidade:** `applyConditionRecovery` e `refreshAvailability` só percorrem `CAREER.squad`. Basta passar a lista de elencos ativos (`leagueSquads` e o adversário da Série D na Copa).
4. **Outras divisões e Copa:** `resolveOtherDivisionsRound` (só placar) e `simulateCupLeg` (só o seu lado) passam a usar o mesmo caminho de `resolveCpuFixture`, que já gasta jogadores, cartões e autores dos gols.
5. **Mercado:** `semana.simulateAiTransfers` é o ponto de troca para os avaliadores da Fase 1 (`mercado.reservaParaProposta`, `avaliacaoAtleta`, `negociacao.*`).
6. **Virada e contratos:** `temporada.renewLeagueSquad` e `computeContractFields(liveSeason)`. São o A14 e o CPU-08.
7. **Troca de clube:** `carga.aceitarPropostaClube` → `startCareer`. Para o CPU-10, carregar o clube dentro do mundo existente.

## 5. Decisões de produto (as do plano, mais as que o E0 abriu)

| # | Decisão | Recomendação | Quando |
|---|---|---|---|
| D1 | Perfil do técnico da CPU | Derivado do clube (porte e força) com uma variação sorteada uma vez por clube e guardada: cerca de 60 bytes por clube | Antes do E1b |
| D2 | Finanças da CPU: caixa e folha guardados ou derivados. Estádio e patrocínio da CPU entram? | Guardar caixa e folha por clube (cerca de 3 KB). Estádio e patrocínio da CPU como receita derivada do porte, sem obras | Antes do E3 |
| D3 | O que o jogador vê das decisões da CPU | Lances na partida (substituição e mudança de tática do adversário) mais uma linha no resumo da rodada | E1b |
| D4 | Itens da loja com efeito esportivo | **Decidido (Murilo, 17/11): só para você.** A CPU não tem equivalente | Agora |
| D5 | Teste no iPhone (V09): quem testa e onde | Murilo, em homologação, a cada etapa com mudança na partida | A partir do E1b |
| D6 | Limite do save: **o que pesa é o 1 MB do envio**, com cerca de 210 KB de margem | Comprimir o envio (gzip no cliente, com o servidor aceitando os dois) ou subir o limite do corpo para 2 MB. É mudança de servidor: só com sua aprovação | Antes do E3 ou da correção do A14 |
| **D7** (nova) | Elenco curto: Série D com 12 jogadores gerados, e a CPU pode ficar sem 22 aptos | Gerar até 22 na Série D (mesma semente, mesmo elenco) e, na falta de aptos, a mesma reposição pela base dos dois lados | Antes do E1a |
| **D8** (nova) | Marcação individual pela CPU | Fica para depois do E1b, porque precisa de um alvo "observável" | E1b |
| **D9** (nova) | Amistosos da CPU | **Decidido (Murilo, 17/11): sim, a CPU joga amistosos** nas semanas livres, com efeito em condição, moral e minutos. A recomendação era "não". Entra no E4 (CPU-09), junto com treino e moral | E4 |
| **D10** (nova) | **A14:** elencos da CPU encolhem a cada virada | **Decidido (Murilo, 17/11): corrigir já**, num PR pequeno antes do E1a: contrato do gerado contado do ano da carreira, e a CPU renovando quem ainda serve (regra simples até o E3) | Agora |
| **D11** (nova) | Olheiros: a CPU vê o mercado inteiro | Aceitar a informação completa da CPU. O jogador tem olheiros como ferramenta | E3 |
| **D12** (nova) | Comissão técnica da CPU | Embutida no perfil do técnico (D1), sem contratação | E1b |
| **D13** (nova) | **Faixa aceitável de zebra** | **Decidido (Murilo, 17/11): manter o nível atual** (até 4 p.p. da baseline por faixa). Opções na época: A: manter a de hoje (±4 p.p. por faixa) e só garantir que a paridade não a quebre. Opção B: deixar o favorito mais favorito (por exemplo, zebra abaixo de 40% acima de 30% de diferença), o que é calibração e vira uma demanda própria | Antes do E1a |

**Observação O1 (fora do escopo, para registro):** o mando de campo está fraco (mandante vence 41%). Se quiser mais realismo aqui, é uma calibração à parte, ligada à D13.

## 6. Custo da suíte e metas propostas

**Suíte padrão (referência para a meta de até +5%):** 466,8 s locais (seção 3.6). Cada etapa mede os testes que acrescenta. O CI também é referência: as 4 partes levam cerca de 1,5 a 2 min cada.

**Metas propostas, a validar:**
- **Gols e 0×0:** desvio de até 0,15 gol por jogo e 2 p.p. de 0×0 por divisão contra esta baseline. Acima disso, investigar antes de recalibrar.
- **Zebra:** conforme a D13.
- **Rodada no Node (este perfil):** p95 de até 183 ms (+5% sobre 174 ms) e teto absoluto de 250 ms.
- **Virada:** p95 de até 100 ms.
- **Save:** pico abaixo de 900 KB de JSON cru (cerca de 86% do envio) enquanto a D6 não for decidida. Comprimido abaixo de 384 KB (metade do limite).
- **iPhone:** sem travamento novo perceptível (V09, D5).

## 7. Reestimativa

O E0 não mudou o desenho das etapas. Ele trouxe três itens que entram no plano:

1. **A14 (D10):** um PR pequeno antes do E1a, de 1 a 2 dias.
2. **D7:** gerar 22 jogadores na Série D, dentro do E1a, cerca de meio dia.
3. **D6:** se for o caso, comprimir o envio do save, de 1 a 2 dias e com mudança no servidor.

**Total revisado:** 28 a 46 dias úteis, contra os 27 a 43 do plano.

## 8. Próximos passos

1. Decididos em 17/11: D4 (só para você), D9 (a CPU joga amistosos, no E4), D10 (corrigir o A14 já) e D13 (manter o nível de zebra). As outras decisões vêm ao longo das etapas.
2. Se a D10 for "corrigir já": PR do A14, com teste no motor e as cinco temporadas da baseline mostrando os elencos estáveis.
3. Depois, o E1a: convocação comum (11+11), força pelo XI, recuperação de condição e retorno de lesão para todos os elencos.
