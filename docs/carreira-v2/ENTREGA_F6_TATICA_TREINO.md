# Carreira 2.0: fase 6 do plano de independência (tática e treino)

- **Data:** 04/11/2026.
- **Branch:** `fase6-tatica`, a partir de `main` (com o #63, fase 5).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências** (pranchas do complemento):
- 23, col. 2 (CAP03-T03, Instruções táticas);
- 23, col. 3 a 25, col. 2 (CAP03-N01, Instruções por setor; escala de 5 passos, P4);
- 25, col. 3 e 26, col. 1 e 2 (CAP03-T04, Esquemas salvos);
- 26, col. 3 (CAP03-N02, Marcação individual);
- 27 (CAP03-T05, Treinamento semanal, dia e condição);
- 28, col. 1 e 2 (CAP03-T06, Evolução e condição física).

**Decisões aplicadas** (04/11):
- **Entradas:** a tática abre pela Escalação; o treino, pelo Início e pelo Elenco.
- **Treino:** com tudo o que o jogo tem (jogo no sábado, folgas protegidas, duração, treino individual e os 5 modelos de semana).
- **Overall por temporada:** **passa a ser guardado** (mudança de schema autorizada; ver abaixo).
- **Escalação automática:** fica na Escalação, com confirmação.

## Resultado principal
**A linha "Tática e instruções" da Escalação não abre mais a versão anterior.** Tática, instruções por setor, esquemas, marcação, escalação automática, treino e evolução passaram a ser telas da v2.

O E2E novo passa por todas elas, confere cada gravação no save e verifica que nada passa por `/carreira-old`.

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Tática** ("Seu time em campo.") | Escalação → "Tática e instruções" | Índice: Instruções táticas, Instruções por setor, Esquemas salvos (quantos) e Marcação individual (a atual) |
| **Instruções táticas** ("Dê seu ritmo.") | Tática | <ul><li>Formação atual</li><li>Os 4 eixos com escala de 5 e os rótulos das pontas (ex.: "Muito paciente" ↔ "Muito direto")</li><li>"Instruções por setor"</li><li>"Salvar"</li></ul> |
| **Instruções por setor** ("Ajuste cada setor.") | Tática ou Instruções | <ul><li>Abas Defesa, Meio e Ataque, com as 5 instruções de cada uma na escala de 5 (P4)</li><li>"Salvar" grava os setores mudados</li></ul> |
| **Esquemas salvos** ("Seu plano de jogo." / vazio: "Guarde sua ideia.") | Tática | <ul><li>Cada esquema: nome, "Em uso", formação, eixos ("Ritmo 3 · Pressão 4 / Linha 2 · Passe 3"), quando foi salvo ou usado</li><li>Aplicar, Renomear e Excluir (com confirmação)</li><li>**"Salvar esquema atual":** folha "Salve seu esquema." com o nome; até 8 esquemas</li></ul> |
| **Marcação individual** ("Acompanhe de perto.") | Tática | <ul><li>Próximo adversário</li><li>Seu jogador (titulares de linha) e o jogador adversário (os 5 de maior overall), cada um numa folha de escolha</li><li>"Sem marcação"</li><li>Sem jogo marcado, explica que só existe na semana de um jogo do Brasileirão</li></ul> |
| **Escalar automaticamente** | Escalação | Confirmação "Escalar automaticamente?" com a opção "Incluir jovens da base" (como hoje) |
| **Treinamento semanal** ("Prepare a semana.") | Início → "Treino da semana", ou Elenco | <ul><li>**Modelo da semana:** os 5 modelos ou "Personalizado"</li><li>**Os 7 dias:** sábado "Dia de jogo" (sem edição); sexta e domingo "Folga protegida"; ocupadas, ficam em dourado com ⚠</li><li>**Elenco nesta semana:** fadiga média, moral e folgas protegidas (2/2)</li><li>"Elenco — condição física"</li><li>"Aplicar treino da semana", uma vez por semana; depois, "Treino da semana já aplicado"</li></ul> |
| **Treino do dia** ("Treino de segunda.") | Um dia | <ul><li>Foco, intensidade, duração (− 15 min +) e grupo (Elenco, Misto, Individual com a escolha do jogador)</li><li>Aviso ao ocupar folga protegida</li><li>"Salvar dia" e "Voltar ao treino"</li></ul> |
| **Condição** ("Cuide do elenco.") | Treino, ou Elenco → "Evolução e condição" | <ul><li>Elenco principal do menos ao mais descansado: posição e condição</li><li>"Risco de lesão" quando o treino da semana leva o jogador a 80% de fadiga ou mais (o mesmo limiar do aviso de hoje)</li></ul> |
| **Evolução** ("Veja a evolução." / vazio: "O histórico vem aí.") | Condição → jogador | <ul><li>Condição atual</li><li>Fadiga por rodada: últimas 8; na pré-temporada, "Rodada 1 · semana 3"</li><li>**Overall por temporada,** com overall atual · teto</li><li>Lesões recentes</li></ul> |

**Capturas** (pasta `evidencias/F6-tatica-treino/`, 390×844): 17 arquivos, de `01-escalacao-tatica-automatica.png` a `15-elenco-preparacao.png`.

**Comparativos:**
- `comparativo-01-instrucoes.png`;
- `comparativo-02-setor.png`;
- `comparativo-03-esquemas.png`;
- `comparativo-04-salvar-esquema.png`;
- `comparativo-05-marcacao.png`;
- `comparativo-06-treino.png`;
- `comparativo-07-treino-dia.png`;
- `comparativo-08-condicao.png`;
- `comparativo-09-evolucao.png`.

## Motor (ponte)
**Comandos novos,** todos com as funções de sempre:
- **Tática:**
  - `tatica`, `salvarTatica`, `salvarInstrucoesSetor`;
  - `esquemas`, `salvarEsquema`, `aplicarEsquema`, `renomearEsquema` e `excluirEsquema` (`saveTacticalScheme`, `applyTacticalScheme`, `renameTacticalScheme`, `deleteTacticalScheme`);
  - `escalarAutomaticamente` (`autoLineup`);
  - `marcacao` e `salvarMarcacao` (`CAREER.manMarking`, com as mesmas listas).
- **Treino:**
  - `treino`;
  - `salvarDiaTreino` (as regras do painel do dia);
  - `aplicarModeloTreino` (`applyTrainingScheme`);
  - `aplicarTreino` (`applyWeeklyTraining`, uma vez por semana).

**Mudança de schema (autorizada em 04/11):** `snapshotPlayerSeasonHistory` passa a guardar `overall` em cada temporada do histórico do jogador.
- É um campo novo e opcional.
- Entradas antigas ficam sem ele, e a tela mostra só as que têm. Até a primeira virada, aparece "O overall de cada temporada aparece a partir da próxima virada."
- O tamanho do save cresce um número por jogador por temporada (no máximo 15 temporadas).

## Pontos para sua avaliação
1. **Índice da Tática:** é a única tela sem prancha (P7/P8, padrão das listas da v2).
2. **"Voltar":** as telas da tática voltam à Tática, e o índice volta à Escalação. A prancha diz "Voltar ao clube".
3. **Folha do dia:** o botão é "Salvar dia". A prancha mostra "Aplicar treino da semana" dentro da folha, mas aplicar fica na tela da semana.
4. **"Excluir esquema"** pede confirmação, como na versão anterior.
5. **Camisa:** os jogadores aparecem com a camisa sem número da v2 (escura), não a branca da prancha.
6. **Barra inferior:** como nas fases anteriores, as telas internas não têm barra.

## Testes
- **Unitários:** 94/94 (`domain/prep.test.ts`, novo).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_tatica_treino.js`,** com 9 verificações:
  1. índice da Tática;
  2. instruções gravadas;
  3. setores gravados;
  4. esquemas: salvar, renomear, aplicar e excluir;
  5. marcação e "Sem marcação";
  6. escalação automática;
  7. treino: dia editado (tático, intensa, 90 min), aviso na folga ocupada, modelo, e aplicar uma vez;
  8. condição e evolução, com o overall por temporada (campo novo gravado na virada);
  9. 360 px e sem `/carreira-old`.
- **Ajustado:** `test_v2_escalacao.js` 1 ("Tática e instruções" agora vai para `/carreira/tatica`).
- **Suíte completa:** **180/180**.
