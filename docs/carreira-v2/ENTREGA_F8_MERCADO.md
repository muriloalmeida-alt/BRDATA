# Carreira 2.0: fase 8 do plano de independência (mercado)

- **Data:** 04/11/2026.
- **Branch:** `fase8-mercado`, a partir de `main` (com o #65, fase 7).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Referências** (pranchas do complemento):
- 33 (CAP05-T01, Mercado com janela aberta e fechada, e Filtros);
- 34 (CAP05-T02 Perfil do alvo, CAP05-T03 Fazer proposta, CAP05-T04 Negociação);
- 35 (CAP05-N02 Minhas propostas, CAP05-N03 Comparar propostas, CAP05-N04 Colocar à venda);
- 36 (CAP05-N05 Minhas vendas, CAP05-N06 Empréstimo de entrada e de saída);
- 37 (CAP05-N07 Confirmar compra, CAP05-T07 Histórico e o estado vazio);
- 18, col. 2 (CAP05-T05, Proposta recebida).

**Decisões aplicadas** (04/11):
- **Lista do mercado:** só reforços. Seus jogadores vão à venda ou ao empréstimo pela ficha e por "Minhas vendas".
- **Filtros:** os da prancha (posição, divisão e as faixas "de–até" de overall, idade e valor), mais o clube e a ordenação do jogo.
- **Aumentar proposta:** com valor livre, também na contraproposta. Usa a mesma função de hoje (`increaseOffer`), e o limite de contrapropostas do jogo continua valendo.
- **Empréstimo de saída:** como o jogo, sem o campo de %. A tela mostra o clube de destino e a taxa que você recebe.
- **Histórico:** abas Compras, Vendas e Empréstimos, com a rodada e a frase que o jogo guarda. O save não muda.
- **Propostas pelo seu jogador à venda:** como a prancha ("Escolher proposta", com confirmação, e "Recusar todas"), e cada proposta também pode ser recusada sozinha.
- **Confirmar compra:** antes de aceitar a contraproposta, uma folha mostra o impacto no caixa e na folha salarial.
- **Proposta pendente** por um jogador seu: aparece no Mercado.

## Resultado principal
**O mercado inteiro passou para a v2.** Não abrem mais a versão anterior:
- o Mercado do Clube e das Finanças;
- o Histórico de negociações;
- "Colocar à venda" e "Emprestar" na ficha;
- "Fazer proposta" no elenco de outro clube.

O E2E novo passa por compra, contraproposta, desistência, venda, empréstimos de entrada e de saída, histórico e proposta pendente. Ele confere cada gravação no save, o caixa inclusive, e verifica que nada passa por `/carreira-old`.

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Mercado** ("Busque seu reforço.") | Clube → "Mercado", ou Finanças → "Ver mercado" | <ul><li>Proposta pendente por um jogador seu, quando houver</li><li>Minhas propostas, Minhas vendas e Histórico, com contadores</li><li>Busca por jogador ou clube (sem acento) e "Filtros (n)"</li><li>A janela: "Janela aberta até…" ou "Janela fechada · reabre em … · somente leitura" (em vermelho)</li><li>Jogadores dos clubes do mercado (as 3 divisões numa carreira "multi"): posição, overall, idade, clube e valor de mercado</li><li>40 por vez, com "Carregar mais"</li></ul> |
| **Filtros** ("Refine sua busca.") | Mercado → "Filtros" | <ul><li>Posição; Divisão (só numa carreira "multi"); Clube</li><li>Faixas "de–até" de overall, idade e valor</li><li>Ordenar por valor, overall ou idade</li><li>"Aplicar filtros" e "Limpar filtros"; valem durante a visita</li></ul> |
| **Perfil do alvo** ("Conheça seu reforço.") | Mercado, ou o elenco de outro clube → "Fazer proposta" | <ul><li>Idade, overall, potencial, contrato, salário e valor de mercado; atributos</li><li>"Pedir empréstimo", inativo com o motivo quando a janela está fechada ou o clube não empresta</li><li>"Comparar com meu elenco" e o elenco do clube</li><li>"Fazer proposta" (com a janela fechada, inativo com o motivo); se já existe proposta, "Ver negociação"</li></ul> |
| **Fazer proposta** ("Faça sua oferta.") | Perfil do alvo | <ul><li>Valor de mercado e salário</li><li>Sua proposta (começa no valor de mercado; com o desconto do boost da Loja, quando houver)</li><li>Parcelamento: à vista, 2x, 3x, 4x (a lista do jogo)</li><li>"Enviar proposta" → "Proposta enviada.", com o prazo de resposta (2 rodadas)</li></ul> |
| **Minhas propostas** ("Suas negociações.") | Mercado | Cada proposta em andamento: jogador, clube, valor e situação (Aguardando; Contraproposta, em dourado; Concorrência, em vermelho) |
| **Negociação** ("A negociação continua.") | Minhas propostas | <ul><li>Sua proposta (valor, parcelamento, valor de mercado, prazo de resposta)</li><li>Contraproposta do clube</li><li>Proposta concorrente, com a análise do jogo</li><li>"Aumentar proposta" (folha com valor livre)</li><li>"Aceitar contraproposta" e "Desistir" (com confirmação)</li></ul> |
| **Confirme seu reforço.** (folha) | Negociação → "Aceitar contraproposta" | <ul><li>Valor, parcelas e quanto sai agora</li><li>Impacto no clube: caixa e folha salarial, antes → depois</li><li>"Confirmar" fecha a compra pelas regras de sempre: teto, tamanho do elenco e caixa para a 1ª parcela</li></ul> |
| **Colocar à venda** (folha "Abra as negociações.") | Ficha → "A temporada em números" | Valor de mercado e valor pedido (começa no de mercado) → "Anunciar". Já anunciado: "Ver anúncio de venda" |
| **Minhas vendas** ("Jogadores no mercado.") | Mercado | Por anúncio: valor pedido, valor de mercado, "Propostas recebidas (n)" e "Retirar do mercado" (com confirmação) |
| **Escolha a melhor oferta.** | Minhas vendas → "Propostas recebidas" | <ul><li>As propostas (clube, valor, parcelas) para escolher</li><li>"Escolher proposta" → folha "Confirme a venda." com o impacto</li><li>"Recusar só a do …" e "Recusar todas" (com confirmação); o anúncio continua</li></ul> |
| **Empréstimo** ("Combine o empréstimo.") | Entrada: Perfil do alvo → "Pedir empréstimo". Saída: Ficha → "Emprestar" | <ul><li>**Entrada:** clube, salário cheio, % do salário que você paga (50/75/100, com o valor mensal), duração, cláusula e o valor dela</li><li>**Saída:** clube interessado (sorteado ao abrir, como no jogo), taxa que você recebe (10%; 5% em 6 meses), duração, cláusula e o valor dela</li><li>"Propor empréstimo" → "Empréstimo fechado."</li></ul> |
| **Histórico** ("O mercado do clube." / vazio: "Seu histórico começa.") | Mercado, Minhas propostas ou Clube | Abas Compras, Vendas e Empréstimos, com a rodada e a frase de cada negociação |
| **Proposta pendente** ("Uma oferta chegou.") | Mercado → "Proposta recebida" | Jogador, idade, clube, valor, parcelamento, valor de mercado, diferença; "Aceitar" e "Recusar" |

**Capturas** (pasta `evidencias/F8-mercado/`, 390×844): 27 arquivos, de `01-mercado.png` a `18-proposta-pendente.png`, inclusive a recusa de empréstimo de um jogador de destaque (`16b-emprestimo-saida-recusa.png`).

**Comparativos** (prancha × v2): 16 arquivos, de `comparativo-01-mercado.png` a `comparativo-16-proposta-pendente.png`.

## Motor (ponte)
Os comandos novos usam as funções de sempre:
- `mercado`: janela (`transferWindowStatus`), clubes do mercado (`marketTeamsPool`), desconto e quem não aceita empréstimo (`isLoanOutRefused`);
- `fazerProposta`, `aumentarProposta`, `retirarProposta`, `previaCompra`, `aceitarContraproposta`;
- `anunciar`, `retirarAnuncio`, `previaVenda`, `aceitarOfertaVenda`, `recusarOfertaVenda`;
- `prepararEmprestimo`, `emprestar`, `pegarEmprestado`;
- `propostaPendente`.

As checagens antes de cada comando são as dos modais de hoje: janela, teto salarial, tamanho do elenco, mínimo de 14 e recusa de destaque. O motivo volta para a v2 em vez do aviso, que não aparece no motor escondido.

**Na versão anterior, sem mudar regras:**
- A validação e a criação da proposta (`submitOfferOut`) e do anúncio (`createListing`) saíram dos modais. Os modais usam as mesmas funções.
- `finalizeIncomingPurchase`, `acceptCounterOffer` e `acceptListingOffer` passaram a devolver o resultado, além do aviso de sempre.

**Sem mudança de schema** nesta fase.

## Pontos para sua avaliação
1. **Minhas propostas** mostra só as em andamento (Aguardando, Contraproposta, Concorrência). O jogo tira da lista as aceitas, recusadas e retiradas; elas ficam no Histórico, por isso não há "Aceita" nem "Recusada" como na prancha.
2. **Concorrência** pela mesma compra aparece dentro da negociação, com a análise do jogo. A tela "Comparar propostas" da prancha ficou para as propostas pelo seu jogador à venda.
3. **Telas sem prancha:** "Proposta enviada.", "Reforço contratado.", "Venda concluída.", "Empréstimo fechado.", "Confirme a venda." e a folha "Aumente sua proposta.", no padrão da v2.
4. **Formulários:** duração, %, cláusula e parcelas são fileiras de botões, não campos "Selecionar" como na prancha.
5. **Mercado:** além da lista, tem no topo os atalhos para Minhas propostas, Minhas vendas e Histórico.
6. **Perfil do alvo:** mostra também salário, atributos e o elenco do clube.
7. **Histórico:** tentativas de compra que não deram certo (recusa, disputa perdida, proposta retirada) ficam em Compras. Negócios entre outros clubes não aparecem.
8. **Proposta pendente:** o parcelamento é sempre "À vista", porque a proposta do jogo por um jogador seu é sempre à vista.
9. **"Voltar":** as telas do mercado voltam ao Mercado, e o Mercado volta ao Clube.
10. **Emprestar um jogador de destaque:** a tela abre e mostra a recusa do jogo ("… não aceita ser emprestado"), com "Propor empréstimo" inativo. A linha "Emprestar" da ficha não avisa antes.
11. **Camisa e barra inferior:** como nas fases anteriores.

## Testes
- **Unitários:** 105/105 (`domain/market.test.ts`, novo, com 5 testes).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_mercado.js`,** com 9 verificações:
  1. lista e filtro;
  2. proposta gravada;
  3. aumentar com valor livre, e contraproposta aceita com a confirmação, conferindo o caixa;
  4. desistir;
  5. colocar à venda;
  6. recusar uma proposta e escolher outra, conferindo o caixa;
  7. empréstimos de entrada e de saída;
  8. histórico e proposta pendente, conferindo o caixa;
  9. 360 px e sem `/carreira-old`.

  A carreira nova começa com a janela fechada, então o teste abre a janela no save (a semana atual passa a ser de pré-temporada), como já prepara o caixa. As respostas dos clubes (contraproposta, propostas pelo anúncio, proposta pendente) também são preparadas no save, porque o motor só as gera ao simular rodadas.
- **Ajustado:** `test_v2_financas.js` 4 e 5: "Ver mercado" agora abre o Mercado da v2 ("Busque seu reforço.").
- **Suíte completa:** **181/182**. A falha foi o `test_v2_financas.js`, que ainda esperava o link antigo para o mercado. Depois do ajuste, ele passa sozinho, junto com o E2E do mercado e o da fase 7.
