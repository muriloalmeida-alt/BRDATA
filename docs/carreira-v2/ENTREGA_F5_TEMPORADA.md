# Carreira 2.0: fase 5 do plano de independência (temporada e carreira do treinador)

- **Data:** 04/11/2026.
- **Branch:** `fase5-temporada`, a partir de `main` (com o #62, fase 4).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências:**
- `02_resultados` col. 3 (CAP04-T08, Encerramento);
- complemento 21, col. 2 (CAP04-N06, Nova temporada) e col. 3 (CAP06-T04, Proposta ao treinador);
- complemento 22, col. 1 (confirmação), col. 2 (CAP06-T08, Demissão) e col. 3 (CAP06-T05, Histórico);
- complemento 23, col. 1 (Histórico sem conquistas);
- `11_base_treinador` col. 3 (CAP06-T01, Perfil do treinador).

**Decisões aplicadas** (04/11, todas as recomendadas):
- **Ao avançar a temporada:** aviso na tela, sem diálogo.
- **Nova temporada:** a prancha mais os dados reais de hoje.
- **Proposta ao treinador:** o orçamento no lugar do "objetivo proposto".
- **Perfil:** mostra a reputação e o status.
- **Demissão:** só "Começar nova carreira".
- **Histórico:** como a prancha; a aba Conquistas completa fica para a fase 10.
- **Encerramento:** sem louros.

## Resultado principal
**"Próxima temporada" não abre mais a versão anterior.** O fim de temporada, a virada, a demissão e a proposta de outro clube passaram a ser telas da v2, assim como o perfil e o histórico do treinador.

O E2E novo leva uma carreira pelos três caminhos:
- virada de temporada;
- mudança de clube por proposta;
- demissão e nova carreira.

Ele confere o save em cada passo e que nada passa por `/carreira-old`.

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Encerramento** ("Temporada encerrada.") | "Próxima temporada" do Início, com a temporada no fim | <ul><li>"O Cuiabá concluiu a temporada de 2023 em 5º lugar no Brasileirão Série A."</li><li>Faixa com a foto aprovada: "BRASILEIRÃO SÉRIE A 2023", a posição grande e o clube</li><li>**Meta da temporada,** com ✓ lima ou ✕ vermelho, pela regra do jogo (posição ≤ alvo)</li><li>"Ver classificação" e "Ver histórico"</li><li>Aviso "Ao continuar, a temporada 2024 começa: o elenco envelhece, contratos vencidos saem e a base renova."</li><li>"Continuar"</li></ul> |
| **Nova temporada** ("Temporada 2024.") | "Continuar" do Encerramento (`advanceSeason`) | <ul><li>**Virada de temporada:** elenco envelhecido, contratos encerrados (nomes embaixo) e acesso ou rebaixamento só quando houve</li><li>**Objetivo da diretoria**</li><li>**Temporada anterior:** posição e meta cumprida ou não</li><li>**Base e elenco:** jovens novos e contratações</li><li>**Finanças:** teto salarial e caixa</li><li>"Começar temporada" leva à proposta, se houver, ou ao Início</li></ul> |
| **Proposta ao treinador** ("Um novo caminho.") | Depois da Nova temporada (quando houver), ou pelo aviso "Proposta do X" no Início | <ul><li>**Clube interessado:** escudo, nome, série e orçamento para salários</li><li>**Seu clube atual:** nome, série, posição atual e sua reputação</li><li>"Aceitar e mudar de clube" e "Recusar"</li></ul> |
| **Confirmação** ("Mudar de clube?") | "Aceitar e mudar de clube" | <ul><li>Novo clube, divisão e orçamento</li><li>"Você deixará o Cuiabá e seguirá sua carreira no Palmeiras."</li><li>"Aceitar e mudar de clube" e "Cancelar"</li><li>Confirmado, abre a primeira entrada ("Seu trabalho começa agora.") no novo clube</li></ul> |
| **Demissão** ("O ciclo terminou.") | "Continuar" do Encerramento, na 3ª temporada seguida sem meta | <ul><li>**Motivo:** "3 temporadas seguidas sem cumprir a meta. Em 2026: Não cair (terminar fora do Z4), e o time terminou em 20º lugar."</li><li>**Sua passagem:** jogos, vitórias e títulos</li><li>"Sua reputação e as passagens por clubes seguem com você na nova carreira."</li><li>"Começar nova carreira" leva à criação de carreira da v2</li></ul> |
| **Perfil do treinador** | Mais → "Perfil do treinador" (antes ↗) | <ul><li>Inicial em círculo dourado, nome, "Treinador do Cuiabá" e temporada</li><li>**Reputação:** "57 · Estabelecido"</li><li>"Ver histórico" e "Ver objetivos" (a Diretoria)</li><li>"Voltar ao clube"</li></ul> |
| **Histórico e conquistas** ("Sua história no jogo.") | Perfil ou Encerramento → "Ver histórico" | <ul><li>**Passagens por clubes:** o atual (temporadas, melhor posição, títulos) e os anteriores (posição média, títulos, saída por demissão ou por proposta)</li><li>**Títulos,** quando há</li><li>**Conquistas desbloqueadas,** com data</li><li>Sem conquistas: "Você ainda não tem conquistas." Na primeira temporada, o título vira "Sua história começa."</li></ul> |

**Capturas** (pasta `evidencias/F5-temporada/`, 390×844):
- `01-inicio-temporada-encerrada.png`;
- `02-encerramento.png`;
- `03-nova-temporada.png` e `03b-nova-temporada-fim.png`;
- `04-proposta-clube.png`;
- `05-confirmar-mudanca.png`;
- `06-perfil.png`;
- `07-historico.png`;
- `08-demissao.png`.

**Comparativos prancha × v2:**
- `comparativo-01-encerramento.png`;
- `comparativo-02-nova-temporada.png`;
- `comparativo-03-proposta-clube.png`;
- `comparativo-04-confirmar-mudanca.png`;
- `comparativo-05-demissao.png`;
- `comparativo-06-historico.png`;
- `comparativo-07-perfil.png`.

**Como as capturas foram preparadas:** o fim de temporada e a proposta foram ajustados no save de uma conta de teste, no servidor isolado.

## Motor (ponte), sem regra nova
**Comandos novos:**
- **`proximaTemporada`:** o mesmo `advanceSeason` do botão, sem o diálogo; grava e devolve o resumo ou a demissão.
- **`demitir`:** o mesmo de "Escolher outro clube" da demissão. `endCurrentClubStint("dismissed")` apaga o save do clube e o treinador segue com a reputação e as passagens para a criação seguinte, no mesmo motor.
- **`aceitarPropostaClube`:** `endCurrentClubStint("accepted_proposal")` e `startCareer` no novo clube, o que a versão anterior faz pelo seletor com só esse clube.
- **`recusarPropostaClube`:** o mesmo de `declineClubProposal`.
- **`historicoTreinador`:** só leitura (reputação, status, passagens, títulos e conquistas com o nome do catálogo do jogo).

**Na v2, demissão decidida e ainda não confirmada** (temporada no fim e 3 temporadas sem meta no save) abre direto a tela de demissão, sem rodar `advanceSeason` de novo. Na versão anterior, fechar o aviso e avançar de novo registrava a temporada outra vez. Isso continua igual lá, mas não acontece pela v2.

## Pontos para sua avaliação
1. **Barra inferior:** como nas fases 3 e 4, as telas de etapa (Encerramento, Nova temporada, Demissão) não têm barra inferior.
2. **"Compartilhar título"** (quando campeão) fica para a fase de Conquistas, como decidido. Até lá, só existe na versão anterior.
3. **Ano da nova carreira:** ao mudar de clube ou começar depois da demissão, a carreira nova começa no ano-base do jogo (por exemplo 2026), não no ano em que a anterior estava. É o comportamento de `startCareer` na versão anterior, e não mudei.
4. **"Ver propostas"** da demissão não aparece: o jogo não gera propostas no momento da demissão (a prancha diz "somente quando houver").
5. **Perfil:** "Editar nome" continua só em Configurações da versão anterior (P8).

## Testes
- **Unitários:** 91/91 (7 novos em `domain/season.test.ts`).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_temporada.js`,** com 6 verificações:
  1. Encerramento;
  2. Nova temporada: save no ano seguinte, rodada 1, e recarregar não repete;
  3. proposta: recusar, cancelar e aceitar, com a carreira no novo clube e o anterior no histórico;
  4. perfil e histórico;
  5. demissão: recarregar não avança de novo e a nova carreira mantém o histórico com "dismissed";
  6. 360 px e sem `/carreira-old`.
- **Suíte completa:** **179/179**.
