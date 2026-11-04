# Carreira 2.0: fase 7 do plano de independência (elenco avançado)

- **Data:** 04/11/2026.
- **Branch:** `fase7-elenco`, a partir de `main` (com o #64, fase 6).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências** (pranchas do complemento):
- 28, col. 3 (Filtros do elenco);
- 29 e 30, col. 1 (CAP02-N02, Ficha completa e "A temporada em números");
- 30, col. 2 (CAP05-T06, Contratos);
- 30, col. 3 e 31, col. 1 e 2 (CAP05-N01, Renovar contrato, aceita e recusa);
- 31, col. 3 e 32, col. 1 (CAP06-T03, Conversa individual e reação);
- 32, col. 2 (CAP02-N03, Comparar jogadores);
- 32, col. 3 (CAP02-N04, Elenco de outro clube).

**Decisões aplicadas** (04/11):
- **Ficha completa:** segue as regras do jogo e traz as ações de hoje.
  - "Renovar contrato" e "Conversar" aparecem sempre; quando a regra não deixa, ficam inativos e mostram o motivo.
  - "Mais ações": banco, base/promover e dispensar (com confirmação).
  - "Colocar à venda" e "Emprestar" continuam ↗ na versão anterior até a fase 8.
- **Renovação recusada:** "Proposta recusada." com o motivo → "Continuar" → coletiva avulsa, como o jogo faz hoje.
- **Filtros:** tudo o que a prancha 28 col. 3 tem, mais a busca por nome. Valem só durante a visita; nada é gravado.
- **Elenco de outro clube:** lista, série, posição na divisão e ficha do jogador só para consulta, com "Comparar com o meu". "Fazer proposta" continua ↗ até a fase 8.

## Resultado principal
**O Perfil do jogador, os Contratos e os clubes da Tabela não abrem mais a versão anterior.** A ficha completa, a renovação (inclusive a coletiva da recusa), a conversa, as ações do jogador, os filtros, a comparação e o elenco de outro clube passaram a ser telas da v2.

O E2E novo passa por todas elas, confere cada gravação no save e verifica que nada passa por `/carreira-old`.

Ainda abrem a versão anterior (↗), como combinado, até a fase 8 (mercado):
- "Colocar à venda" e "Emprestar";
- "Fazer proposta" por jogador de outro clube.

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Elenco** (busca e filtros) | Elenco | <ul><li>Campo "Buscar jogador" (sem acento)</li><li>Botão "Filtros" com o número de filtros ativos</li><li>Com filtro ou busca: lista única com "N jogadores"</li><li>A linha "Filtros e ordenação" (↗) virou "Contratos"</li></ul> |
| **Filtros** (folha) | Elenco → "Filtros" | <ul><li>Posição</li><li>Situação: Titular, Banco, Lesionado, Suspenso, À venda</li><li>Categoria: Base, Profissional</li><li>Ordenar: Overall, Idade, Condição, Contrato</li><li>"Aplicar filtros" e "Limpar filtros"</li></ul> |
| **Ficha completa** ("Conheça seu jogador.") | Perfil → "Contrato e ações" | <ul><li>Idade, overall, potencial, moral e condição</li><li>"Atributos do jogador"</li><li>Contrato: salário mensal, término e valor de mercado (emprestado: "Emprestado ao clube")</li><li>"A temporada em números"</li><li>**Mais ações:** conforme a situação; por exemplo: tirar dos titulares, tirar do banco ou pôr no banco, mandar para a base ou promover, dispensar</li><li>"Renovar contrato" e "Conversar", inativos com o motivo quando a regra não deixa</li></ul> |
| **Atributos** ("Atributos.") | Ficha | Ataque, defesa e físico |
| **A temporada em números** | Ficha | <ul><li>Jogos, gols, assistências e cartões</li><li>Histórico de clubes</li><li>Colocar à venda / Emprestar (↗, fase 8)</li><li>Comparar</li></ul> |
| **Renovar contrato** (folha "Mantenha seu jogador.") | Ficha ou Contratos | <ul><li>Salário atual e salário sugerido (a fórmula do jogo)</li><li>Novo salário mensal (preenchido com o sugerido)</li><li>Duração de 1 a 5 anos</li><li>"Propor renovação"</li></ul> |
| **Proposta aceita / recusada** | Renovar | <ul><li>**Aceita:** novo salário, duração e "Contrato até"</li><li>**Recusada:** motivo (teto salarial, moral, salário ou duração), salário e duração propostos, e "Continuar" para a coletiva</li></ul> |
| **Coletiva avulsa** ("Sua vez de falar.") | Recusa → "Continuar" | <ul><li>A pergunta da coletiva da renovação recusada, com as respostas do jogo</li><li>Efeito na reputação e na moral, gravado</li><li>Volta para onde a renovação começou</li></ul> |
| **Contratos** ("Cuide da continuidade.") | Clube → "Contratos" ou Elenco → "Contratos" | <ul><li>Abas Todos e Vencendo (último ano)</li><li>Por jogador: salário mensal, término e "Renovar"</li><li>Sem os emprestados</li></ul> |
| **Conversa** ("Abra o diálogo.") | Ficha → "Conversar" | <ul><li>Moral atual e situação (o motivo da moral)</li><li>Ouvir e apoiar, Prometer mais chances, Cobrar postura</li></ul> |
| **Reação** ("Conversa encerrada.") | Conversa | Reação do jogador e efeito real na moral (1 conversa por rodada) |
| **Comparar** ("Compare lado a lado.") | "A temporada em números" → "Comparar", ou jogador de outro clube | <ul><li>Escolha do outro jogador (mesma posição)</li><li>Lado a lado: overall, idade, posição</li><li>Ataque, defesa, físico, salário e valor</li><li>Veredito de custo-benefício (o mesmo da versão anterior)</li></ul> |
| **Elenco de outro clube** ("Conheça o adversário.") | Tabela → clube | <ul><li>Série e posição na divisão</li><li>Jogadores por posição</li><li>Ficha do jogador só para consulta, com "Comparar com o meu" e "Fazer proposta" (↗, fase 8)</li></ul> |

**Capturas** (pasta `evidencias/F7-elenco/`, 390×844): 22 arquivos, de `01-elenco-busca-filtros.png` a `19-dispensar-confirmacao.png`.

**Comparativos** (prancha × v2): 13 arquivos, de `comparativo-01-filtros.png` a `comparativo-12-outro-clube.png`.

**Ajuste visual feito durante as capturas:** o motivo acima de "Renovar contrato" ficava sobre a última linha da lista; agora o rodapé tem fundo sólido atrás dele.

## Motor (ponte)
Os comandos novos usam as funções de sempre, sem regra nova:
- **`renovar(id, salário, anos)`:** só no último ano de contrato.
  - Usa `renewalVerdict`, extraída de `proposeRenewal` sem mudar as regras: teto, moral, salário e duração.
  - Na recusa, dispara a coletiva "19" como hoje.
- **`coletivaAtual`:** a pergunta da coletiva pendente. **`responderColetiva`** passou a funcionar também fora do pós-jogo.
- **`conversar(id, opção)`:** usa `applyTalkEffect`, extraída de `applyTalkOption`, com a regra `canTalkTo` (banco ≥ 3 jogos ou moral ≤ 30; 1 conversa por rodada).
- **`acaoJogador(id, ação)`:** usa `handlePlayerAction`, com as checagens de hoje: banco cheio (11), teto e mínimo de 14 no elenco.

`proposeRenewal` e `applyTalkOption` (versão anterior) usam as mesmas funções extraídas e continuam iguais para quem joga lá.

**Sem mudança de schema** nesta fase.

## Pontos para sua avaliação
1. **"Forma"** (prancha 29) não aparece: o save não tem esse dado. No lugar, a ficha mostra overall e condição.
2. **Comparar** oferece só jogadores da mesma posição (regra da versão anterior).
3. **Renovar** mostra também o salário atual, além do sugerido da prancha.
4. **Renovação recusada:** o botão é "Continuar" (vai para a coletiva), não "Voltar aos contratos". Na aceita, é "Voltar aos contratos" ou "Voltar ao jogador", conforme a origem.
5. **"Voltar":** a ficha e a conversa voltam ao jogador; o outro clube volta à tabela.
6. **Filtros:** cada grupo é uma fileira de botões (um toque escolhe), não um campo "Selecionar" como na prancha. O botão de baixo é "Limpar filtros", não "Cancelar"; fechar a folha cancela.
7. **Comparar:** a v2 mostra ataque, defesa, físico, salário e valor, mais o veredito; "Trocar jogador" escolhe outro.
8. **Camisa:** os jogadores aparecem com a camisa sem número da v2 (escura), não a branca da prancha.
9. **Barra inferior:** como nas fases anteriores, as telas internas não têm barra.

## Testes
- **Unitários:** 100/100 (`domain/squadplus.test.ts`, novo, com 6 testes).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_elenco_avancado.js`,** com 9 verificações:
  1. busca e filtro de posição;
  2. Perfil → Ficha, com "Renovar" inativo e o motivo;
  3. renovação aceita, gravada;
  4. renovação recusada → coletiva avulsa → resposta gravada → volta aos Contratos;
  5. conversa com efeito na moral, gravado;
  6. tirar do banco; dispensar com confirmação;
  7. comparar;
  8. Tabela → outro clube → jogador → "Comparar com o meu";
  9. 360 px e sem `/carreira-old`.
- **Ajustados:**
  - `test_v2_tabela.js` 8: o clube agora abre "Conheça o adversário." na v2;
  - `test_v2_elenco.js`: "Contrato e ações" agora abre a ficha da v2.
- **Suíte completa:** **181/181** (0 falhas, 0 retries).
