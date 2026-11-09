# Carreira 2.0: sem página escondida, etapa C3 (fechamento da rodada no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-c3`, a partir de `main` (com o #85, etapa C2).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (09/11):
- **Copa:** entra na C3.
- **Fora da C3:** só a partida ao vivo. Os empréstimos que voltam no meio da temporada entram, com os avisos virando eventos.

## Resultado principal
O fechamento da rodada (`finishRoundTail`) e tudo o que ele chama foram para `public/js/motor/fechamento.js`, **sem mudar regra nem texto**:
- **Jogos da CPU:** escalação, gols, autores, cartões, lesões, desgaste e recuperação de condição, e a tabela.
- **Outras divisões:** a tabela das duas divisões que você não joga avança junto com a sua.
- **Copa do Brasil:** formato antigo (16 clubes) e expandido (60 clubes), ida e volta, pênaltis, premiação e campeão. Também o avanço rápido de um save antigo no meio da temporada.
- **Escalação:** ajuste automático quando um titular fica indisponível.
- **Empréstimos:** os que acabam no meio da temporada, com a cláusula de compra.
- **Força do seu time:** formação, os 4 eixos de tática e as instruções por setor.
- **O resto do fechamento:** finanças da rodada, histórico do caixa, mercado, propostas, notícias, notificações de posição e de próximo jogo, e a virada da semana. Isso usa as peças da C2 (`semana.js`).

São 49 funções e constantes, cerca de 740 linhas de regra.

**Sem chamar a tela:** os avisos de empréstimo ("voltou do empréstimo", "comprado em definitivo") viram o evento `aviso`, como na C1 e na C2.

**O que ficou na página até a etapa D:**
- O `simulateRound`, porque abre a partida ao vivo quando o seu time joga.
- A partida ao vivo em si.

Os dois chamam o fechamento do motor quando a partida acaba.

**Ambiente:** o fechamento usa o mesmo ambiente da semana. Ele ganhou a data de criação da conta, que a conquista "Veterano" usa. O `semana.js` passou a exportar o ambiente e o `avisar`, para os dois módulos não repetirem código.

**No `carreira.js`:**
- As funções viraram atalhos.
- As constantes (formações, táticas, instruções por setor, fases e prêmios da Copa, gravidade de lesão) leem do motor, com os mesmos nomes.
- O arquivo caiu de 17.121 para 16.450 linhas.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker o pré-carrega.
- Os tipos estão em `fechamento.d.ts`.

**Sem mudança de regra, de save, de API nem de tela.**

## Pontos para sua avaliação
1. **Defeito antigo encontrado, ainda não corrigido.**
   - **Onde:** uma carreira criada antes de existir a Copa ganha a Copa ao carregar o save (`migrateCareerDefaults`). Se ela estiver depois da rodada 6, a Copa é avançada por trás até a rodada atual.
   - **O problema:** no formato antigo (16 clubes), se o seu clube não estiver entre os 16 classificados, esse avanço nunca termina e a página trava. A fase não anda quando o seu clube está fora da Copa.
   - **Desde quando:** já era assim antes da C3. Só afeta saves muito antigos.
   - **Correção sugerida:** avançar a fase mesmo sem o seu clube. É uma mudança de regra pequena, numa entrega própria. Decide se corrijo.
2. **Etapa F menor:** a parte da Copa saiu da etapa F. A F fica com a virada de temporada, a montagem da Copa da temporada nova e a criação de carreira.
3. **Etapa D:** é a próxima (partida ao vivo e pós-jogo). Com ela, o `simulateRound` também sai da página.

## Testes
- **Novo `tests/unit/test_motor_fechamento.js`** compara as funções antigas (congeladas em `tests/unit/ref_fechamento_antes.js`) com os atalhos de hoje, que chamam o motor.
  - **Como roda:** cada lado num `vm` com o próprio motor. São 120 mundos sorteados, com 3 divisões, Copa nos dois formatos, empréstimos nos dois sentidos, formações e táticas sorteadas, e até 18 rodadas cada.
  - **O que confere:** retornos, save e avisos de tela, em ordem, todos iguais.
  - **Cobertura:** foram 2.160 rodadas, 120 Copas (68 expandidas e 52 antigas), 208 fases de Copa, 172 voltas de empréstimo, 74 trocas automáticas na escalação, cerca de 6.800 lesões e cerca de 7.000 notícias.
  - **Contraprova:** mudei, um por vez, a notificação de posição, o tipo do aviso de empréstimo, a limpeza dos resultados antigos, o tamanho do histórico de caixa e o peso da condição na força do time. A verificação certa falhou em cada caso.
- **Texto idêntico:** o `paginaComoAntes` passou a cobrir também o `fechamento.js`. As 49 peças da C3 e as 83 da C2 remontam iguais, caractere por caractere, ao código de antes.
- **Testes do motor:** todos passam, inclusive os da C1 e da C2.
- **Simulações:** todas as que rodam sem navegador passam (`sim_ge_balance_001` a `005` e `sim_ge_scout_001`).
- **Suíte completa (com o Postgres temporário):** 200/200 na terceira rodada.
  - **Primeira rodada (197/200):** pegou um erro meu. O extrator levou, junto com `SECTOR_IDS`, a linha seguinte, `SECTOR_LABEL` (os nomes dos setores), porque o comentário no fim da linha tinha aspas. A ponte da v2 usa esses nomes, e as telas de instruções táticas e o passo 4 do assistente não abriam. Corrigi o extrator e gerei a C3 de novo. O `SECTOR_LABEL` voltou para a página, e a remontagem segue idêntica ao código de antes. Conferi que a C2 não tem o mesmo problema.
  - **Segunda rodada (196/200):** 4 testes da v2 (`calendario`, `escalacao`, `elenco_avancado`, `clube`) estouraram o tempo no mesmo momento. Depois passaram 2 vezes sozinhos e 2 vezes junto com os outros testes da v2 (31/31).
  - **Terceira rodada:** 200/200.
