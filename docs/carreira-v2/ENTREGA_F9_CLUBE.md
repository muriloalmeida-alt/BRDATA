# Carreira 2.0: fase 9 do plano de independência (clube)

- **Data:** 04/11/2026.
- **Branch:** `fase9-clube`, a partir de `fase8-mercado` (PR #66, ainda aberto).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências** (pranchas do complemento):
- 38 (CAP02-T04 Comissão técnica; CAP06-T07 Estádio e Obras);
- 39 (CAP06-N01 Propostas de patrocínio; CAP02-N05 Extrato financeiro; CAP05-T08 Olheiros e missões);
- 40, col. 1 e 2 (CAP05-T09 Relatórios e prospectos; CAP05-T10 Categorias de base).

**Decisões aplicadas** (04/11):
- **Comissão técnica:** como o jogo. É uma comissão só, com o custo mensal (5% da folha) e Contratar/Demitir com confirmação. Contratada, traz as 4 sugestões (Escalação, Treinos, Tática e Mercado) com "Aplicar"; a de Mercado abre "Faça sua oferta." na v2.
- **Patrocínios:** como o jogo. Mostra os dois contratos, master e material esportivo. Quando um vence, aparecem as 3 propostas para assinar, com confirmação; não existe "Recusar".
- **Olheiros:** como o jogo. A missão não custa nada; o custo é o salário de cada olheiro.
- **Extrato:** o da prancha, mais os filtros por tipo do jogo.
- **Estádio:** a obra começa só depois de uma confirmação, que mostra o caixa antes e depois.
- **Categorias de base:** abas Sub-15, Sub-17 e Sub-20. Cada atleta abre a ficha da v2, com promover e dispensar.
- **Entradas:** pelo Clube e pelas Finanças.

## Resultado principal
**Comissão técnica, Estádio, Patrocínios, Extrato e Base e olheiros passaram para a v2.** Os cinco itens do Clube e os atalhos das Finanças não abrem mais a versão anterior.

O E2E novo passa por todas as telas, confere cada gravação no save, o caixa inclusive, e verifica que nada passa por `/carreira-old`.

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Comissão técnica** ("Fortaleça a comissão.") | Clube, ou Finanças | <ul><li>Situação, custo mensal e por rodada</li><li>Não contratada: "Contratar comissão técnica" (com confirmação)</li><li>Contratada: as 4 sugestões com o texto do jogo e "Aplicar" (Mercado: "Fazer proposta")</li><li>"Demitir comissão técnica" (com confirmação)</li></ul> |
| **Estádio** ("Faça o clube crescer.") | Clube, ou Finanças | Nome, capacidade, obra em andamento e as 3 melhorias (situação, custo e prazo), com o pré-requisito dos Camarotes |
| **Obra** ("O clube em obras.") | Estádio → melhoria | <ul><li>Melhoria selecionada: custo, prazo, lugares a mais e situação</li><li>Obra em andamento, com as rodadas restantes</li><li>Melhorias concluídas</li><li>"Iniciar obra" → confirmação com o caixa antes → depois</li></ul> |
| **Patrocínios** ("Novas parcerias.") | Clube, ou Finanças | <ul><li>Master e Material esportivo: empresa, valor por temporada e temporadas restantes</li><li>Contrato vencido: as 3 propostas (empresa, valor, duração) → "Assinar" (com confirmação)</li><li>Total por temporada</li></ul> |
| **Extrato** ("Cada movimento conta.") | Clube, ou Finanças → "Ver extrato completo" | Saldo, filtros do jogo (Tudo, Salários, Transferências, Patrocínio, Bilheteria e os demais tipos que aparecerem) e lançamentos por rodada (tipo · descrição, + ou − valor) |
| **Olheiros** ("Amplie seu alcance.") | Clube → "Base e olheiros" | <ul><li>Olheiros em campo: livre ou em missão, com o retorno</li><li>Tocar num olheiro: avaliação, rede, salário, regiões, "Enviar em missão" e "Dispensar" (com confirmação; em missão, não dá)</li><li>Contratar olheiro, com o total de salários</li><li>Nova missão, Enviar olheiro ao mercado, Indicações, Relatórios e Categorias de base, com contadores</li></ul> |
| **Contratar olheiro** ("Monte sua rede.") | Olheiros | Os 8 olheiros do jogo (especialidade, avaliação, rede e salário) → "Contratar" (com confirmação) |
| **Nova missão** ("Planeje a missão.") | Olheiros | Olheiro livre, tipo (Sub-17, Sub-20 ou Profissional), posição, duração (2, 4 ou 6 rodadas) e região (as do olheiro) → "Enviar olheiro" |
| **Indicações dos olheiros** | Olheiros | <ul><li>Jogador, clube, overall, idade, potencial estimado, valor e o relatório</li><li>"Propor" abre "Faça sua oferta." na v2 (com a janela fechada, fica inativo)</li><li>"Recusar"</li></ul> |
| **Relatórios** ("Veja os prospectos.") e **prospecto** | Olheiros | Overall e potencial estimado; no prospecto, os atributos, a nota do olheiro e o relatório → "Trazer para a base" |
| **Categorias de base** ("O futuro está aqui.") | Olheiros | Abas Sub-15, Sub-17 e Sub-20 (com contagem): idade, overall e potencial estimado; tocar abre a ficha |

**Capturas** (pasta `evidencias/F9-clube/`, 390×844): CAPTURAS.

**Comparativos** (prancha × v2): de `comparativo-01-comissao.png` a `comparativo-08-base.png`.

## Correção: potencial como o jogo mostra
Ao montar a base, vi que a v2 mostrava o **potencial real** do jogador em três lugares:
- na ficha completa (fase 7);
- no perfil do alvo do mercado (fase 8);
- em "Evolução", como "teto" (fase 6).

O jogo nunca mostra esse número. Ele mostra a faixa estimada pelo olheiro ("potencial entre 76 e 82"), ou nada, quando o jogador já está no teto. Era um erro meu.

Agora a v2 usa a mesma faixa do jogo nos três lugares e na base: "76–82", ou "Não avaliado". A fórmula (`scoutedPotentialRange`, com a mesma semente) foi espelhada só para exibir. Um teste unitário a compara com as funções originais da versão anterior, lidas do próprio `carreira.js` e `data.js`.

## Motor (ponte)
Os comandos novos usam as funções de sempre:
- Comissão: `comissao`, `contratarComissao`, `demitirComissao`, `aplicarSugestao` (`COMMISSION_AREAS`; na de Mercado, só devolve o alvo);
- Estádio: `estadio`, `iniciarObra` (`STADIUM_UPGRADES`, `startStadiumUpgrade`);
- Patrocínios: `patrocinios` (gera as propostas de um contrato vencido, como o modal de hoje), `assinarPatrocinio`;
- Olheiros: `olheiros`, `contratarOlheiro`, `dispensarOlheiro`, `enviarMissao`, `trazerParaBase`, `indicacao` (propor ou recusar).

**Na versão anterior, sem mudar regras:**
- A sugestão de Mercado também devolve o jogador e o clube.
- A regra de dispensar olheiro (`releaseScout`) saiu de `fireScout`, que continua igual.

**Sem mudança de schema** nesta fase.

## Pontos para sua avaliação
1. **Pedido de orçamento à diretoria** continua na versão anterior (↗), agora com esse nome, nas Finanças. Ele não está em nenhuma fase do plano; onde você quer encaixá-lo?
2. **Finanças:** "Ver extrato completo" agora abre a tela Extrato, em vez de abrir a lista ali mesmo.
3. **Comissão:** sem função, nível e salário por profissional, que o jogo não tem; a lista é das 4 sugestões.
4. **Estádio:** cada melhoria abre "O clube em obras." com o detalhe dela, a obra em andamento e as concluídas.
5. **Telas sem prancha:** Contratar olheiro, Nova missão, Indicações, ficha do prospecto, a folha do olheiro e "Olheiro em campo." / "Bem-vindo à base.", no padrão da v2.
6. **Formulários** em fileiras de botões; **camisa e barra inferior** como nas fases anteriores.

## Testes
- **Unitários:** 109/109.
  - Novos: `domain/club.test.ts`, com 3 testes, e `domain/potential.test.ts`, que compara a faixa com o código do jogo.
  - Ajustado: `prep.test.ts`, que agora espera "teto estimado".
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_clube.js`,** com 9 verificações:
  1. links do Clube;
  2. comissão;
  3. obra com caixa;
  4. patrocínio;
  5. extrato pelas Finanças;
  6. olheiro e missão;
  7. prospecto para a base;
  8. indicações;
  9. 360 px e sem `/carreira-old`.
- **Ajustado:** `test_v2_financas.js` 2 e 4 ("Ver extrato completo" abre o Extrato da v2; atalhos do Clube nas Finanças).
- **Suíte completa:** SUITE_RESULT.
