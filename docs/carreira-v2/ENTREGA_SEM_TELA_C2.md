# Carreira 2.0: sem página escondida, etapa C2 (semana sem jogo no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-c2`, a partir de `main` (com o #83, etapa C1, e o #84, tela antiga congelada).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (09/11):
- **Escopo:** a semana inteira.
- **Formatação** de dinheiro e de nome: vai para o motor.
- **Coletiva** depois de uma contratação grande: vira evento.

## Resultado principal
A semana sem jogo (`runCalendarOffWeek`) e tudo o que ela chama foram para `public/js/motor/semana.js`, **sem mudar regra nem texto**:
- **Calendário:** semana atual, fase, janela de transferências e virada de mês. A virada cobra folha, comissão e olheiros e recebe patrocínio e cota de TV.
- **Elenco:** treino semanal, recuperação e volta de lesão.
- **Clube:** obras do estádio e missões de olheiro (jovens para a base e indicações para o Mercado).
- **Mercado:** negócios entre clubes da CPU, propostas recebidas, suas propostas (com concorrência e contraproposta), anúncios de venda e parcelas.
- **Registros:** extrato e histórico de transferências.

São 81 funções e constantes, cerca de 450 linhas de regra. O módulo lê e grava a carreira do módulo de estado (etapa B).

**Formatação** (`public/js/motor/texto.js`, novo): o formato de dinheiro ("R$ 1.500.000") e de nome curto ("G. Barbosa"), usados nos textos que o motor escreve.

**Sem chamar a tela:**
- **Avisos** ("Contraproposta recebida", "Proposta recebida", "Concorrência pelo alvo" e outros) viram o evento `aviso`, como na C1. A página antiga mostra o mesmo toast.
- **Coletiva:** depois de contratar um jogador de overall 82 ou mais, o motor emite o evento `coletiva`. A página antiga abre o mesmo modal, e a v2 segue recebendo a coletiva pela ponte, como hoje.

**Ambiente:** nomes de jogador gerado, sorteio por chave e o ano da temporada real vêm de fora do motor (dados do mundo real). O `carreira.js` passa esses dados na primeira vez que usa o módulo.

**No `carreira.js`:**
- As funções viraram atalhos de uma linha, com os mesmos nomes e os comentários de sempre.
- As constantes (meses, fases, limites de elenco, chances de proposta, olheiros) leem do motor, e o código antigo e os testes continuam usando os mesmos nomes.
- O arquivo caiu de 17.559 para 17.121 linhas.

**Carga:**
- O `carreira.html` importa os 2 módulos novos.
- O service worker os pré-carrega.
- Os tipos estão em `semana.d.ts` e `texto.d.ts`.

**Sem mudança de regra, de save, de API nem de tela.**

## Pontos para sua avaliação
1. **Peças da semana que a rodada também usa:** a rodada (C3) chama as mesmas funções da semana (treino, propostas, olheiros, obras, parcelas). Por enquanto ela ainda chama por meio dos atalhos do `carreira.js`. A C3 só precisa mover a sequência da rodada.
2. **Calendário do ano** (`buildSeasonCalendar`): ficou no `carreira.js`, porque só a virada de temporada e a criação de carreira o usam. Vai na etapa F.
3. **Um teste antigo precisou mudar a forma de contar:** o `test_ge_calendar_001` contava as cobranças do mês e as chamadas da IA de mercado trocando funções da página. Essas chamadas agora acontecem dentro do motor.
   - **Meses cobrados:** passam a ser contados pelos lançamentos "Folha salarial de <mês>" do extrato.
   - **IA de mercado:** passa a ser contada pelos turnos em que a regra a chama.
   - **Verificações:** são as mesmas e seguem passando. Na temporada completa, são 12 meses de folha e a IA roda em 5 a 8 semanas.

## Testes
- **Novo `tests/unit/test_motor_semana.js`** compara as funções antigas (congeladas em `tests/unit/ref_semana_antes.js`) com os atalhos de hoje, que chamam o motor.
  - **Como roda:** cada lado num `vm` com o próprio motor e o `CAREER` no módulo de estado. São 150 mundos sorteados (calendário, elencos de 40 clubes, propostas, anúncios, olheiros, obras e parcelas), com o mesmo `Math.random`.
  - **O que confere:** retornos, save, avisos de tela e coletivas, em ordem, todos iguais.
  - **Cobertura:** o roteiro passa de verdade por cada regra. Foram 409 semanas, 87 contratações, 85 contrapropostas, 434 propostas recebidas, 166 negócios entre clubes da CPU, 61 obras concluídas e 948 voltas de olheiro.
  - **Contraprova:** mudei, um por vez, a chance de concorrência, a semana alternada da IA, o tipo do aviso, a rodada da coletiva, o formato do dinheiro e o limite de jovens dos olheiros. A verificação certa falhou em cada caso.
- **Texto idêntico:** o novo `paginaComoAntes` (em `tests/e2e/_motor_vm.js`) remonta o `carreira.js` no formato da página, com o texto do motor no lugar dos atalhos. As 83 funções e constantes saem iguais, caractere por caractere, às de antes da C2.
- **Testes e simulações que recortam funções do `carreira.js` pelo nome:**
  - **O que mudou:** o `test_motor_mercado` e as simulações `sim_ge_scout_001` e `sim_ge_balance_005` passaram a ler o texto movido do motor.
  - **Resultado:** os três rodam como antes. O `test_motor_mercado` dá 4/4.
- **Suíte completa (com o Postgres temporário):** _em andamento_.
