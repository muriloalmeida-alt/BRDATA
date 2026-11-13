# Plano — FASE1-MER (mercado, empréstimos e contratação)

**Data:** 12/11/2026
**Origem:** `docs/carreira-v2/fase1/02_Requisitos_Mercado.md` (MER-01 a MER-07 e a matriz de aceite)
**Situação:** aprovado com as decisões do Murilo de 13/11 (seção 6). Em implementação.

## 1. O que já existe (motor e v2)

- **Clube vendedor avalia a proposta.**
  - Valor de reserva (`calculateSellerReservationValue`), com prêmio para titular.
  - Aceita, contrapõe ou recusa (`sellerNegotiationDecision`), com até 3 contrapropostas.
- **Proposta, contraproposta, aumento, retirada, concorrente e parcelas:** existem no motor e nas telas da v2.
- **Empréstimo:**
  - Entrada com 50/75/100% do salário, duração e cláusula.
  - Saída com clube interessado sorteado e taxa de 10% do valor.
  - A recusa vem de uma regra simples: "destaque não sai" (`isLoanOutRefused`).
- **Hub do Clube → Mercado:** um toque. Os filtros do Mercado ficam guardados durante a visita.

## 2. Lacunas por requisito

| Req. | Lacuna |
|---|---|
| MER-01 | O Elenco não tem "Contratar jogador". |
| MER-02 | Ao voltar do perfil, a lista volta para os primeiros 40 e para o topo. A posição não é preservada. |
| MER-03 | A proposta mostra só o valor e o salário atual. Antes de enviar, não mostra: custo inicial (1ª parcela), salário assumido, impacto no caixa e na folha (o "Impacto no clube" só aparece ao aceitar a contraproposta) e duração do contrato. A recusa não diz o motivo nem a ação seguinte. |
| MER-04 | **O atleta não decide.** Só o clube avalia, e a proposta não tem salário nem papel oferecido. Na avaliação do clube, falta pesar minutos, cobertura da posição e reposição; hoje só o prêmio de titular entra. |
| MER-05 | O empréstimo não avalia minutos, cobertura, desenvolvimento, duração, taxa nem a divisão do salário. A recusa é uma regra fixa. |
| MER-06 | **As decisões usam `Math.random`.** A mesma oferta, reenviada no mesmo estado, pode ter outra resposta. Os limiares estão espalhados pelo código, sem registro de calibração. |
| MER-07 | O fechamento não é uma operação idempotente com identificador. A revalidação de orçamento e disponibilidade ao fechar é parcial. |

## 3. Proposta de solução

**Motor, em funções puras, com testes:**
- **Parâmetros:**
  - um objeto `MER_PARAMETROS` em `motor/mercado.js`, com todos os limiares e pesos;
  - um relatório de calibração em `docs/carreira-v2/fase1/CALIBRACAO_MER.md`, com distribuições sobre muitos casos, como pede a seção 30 do CLAUDE.md.
- **Clube vendedor (MER-04):** a reserva passa a pesar também:
  - importância (titular, rotação ou reserva no elenco dele);
  - cobertura da posição (quantos sobram no grupo);
  - janela;
  - reposição (há substituto de nível próximo?).
- **Atleta (MER-04), avaliação nova:**
  - pesa o salário oferecido contra o atual, o papel oferecido, a divisão do comprador contra a dele e a reputação do clube e do técnico;
  - aceita, pede mais (contraproposta de salário) ou recusa com o motivo.
  - A compra só fecha com os dois aceites.
  - Uma oferta alta melhora as condições, mas não compra o aceite sozinha.
- **Empréstimo (MER-05), avaliação nova dos dois lados:**
  - clube de origem: minutos, cobertura, desenvolvimento (jovem pouco usado facilita), janela, duração, taxa e divisão do salário;
  - destino: orçamento;
  - jogador: papel e perspectiva de jogar;
  - resposta: aceite, contraproposta (por exemplo, "só com 75% do salário") ou recusa com o motivo.
- **Determinismo (MER-06):**
  - toda decisão vinda de uma ação do técnico usa um sorteio com chave (oferta + rodada + estado relevante), e não `Math.random`;
  - a mesma oferta no mesmo estado dá a mesma resposta;
  - a reavaliação acontece quando a oferta, o elenco, o caixa ou a rodada mudam.
- **Idempotência (MER-07):**
  - fechar compra ou empréstimo leva o id da operação;
  - repetir a mesma operação não duplica jogador, caixa nem parcela;
  - ao fechar, revalida caixa, teto, janela e disponibilidade.

**Save:**
- as propostas ganham campos opcionais (`salario`, `papel`, `anos`, `motivo`), com padrão para os saves de hoje;
- sem migração destrutiva;
- os saves muito antigos serão descartados (decisão de 12/11).

**v2:**
- **MER-01:** "Contratar jogador" no Elenco, levando direto à busca do Mercado.
- **MER-02:** a lista do Mercado guarda a quantidade carregada e a rolagem ao voltar.
- **MER-03:**
  - "Faça sua oferta." ganha o salário oferecido, o papel prometido e a duração;
  - o resumo antes de enviar mostra a 1ª parcela, o salário, o caixa e a folha antes e depois, e o teto;
  - recusa e contraproposta mostram o motivo e a ação seguinte ("Aumentar proposta", "Oferecer mais salário", "Voltar ao mercado").

**IA dos clubes (CPU x CPU):** fica como está nesta fase. MER fala das negociações do técnico.

## 4. Entregas

| Parte | Conteúdo | Testes |
|---|---|---|
| MER-a | Motor: parâmetros, clube vendedor, atleta, empréstimo, determinismo e idempotência | unitários do motor com a matriz de aceite; equivalência ajustada |
| MER-b | v2: Elenco, posição da lista, proposta completa, motivos | domínio da v2 e e2e |
| MER-c | Calibração: distribuições e ajustes, com o relatório | script de calibração |

Cada parte vai em PR próprio, para revisão e aprovação.

## 5. Decisões pedidas

1. **A proposta passa a ter salário, papel prometido e duração?** Recomendado: sim. Sem isso o atleta não tem o que avaliar (MER-04), e a tela não tem o que mostrar (MER-03).
2. **Decisões determinísticas (MER-06):** reenviar a mesma proposta deixa de ser "tentar a sorte de novo". A resposta muda só se a oferta ou o estado mudarem. Recomendado: sim, é o que MER-06 pede.
3. **O papel prometido gera cobrança depois?** Exemplo: prometeu titular, deixou no banco, a moral cai.
   - Recomendado: não nesta fase. O papel entra só na decisão do atleta.
   - A cobrança é história de moral (CLAUDE.md, seção 19) e pode vir depois.

## 6. Decisões do Murilo (13/11/2026)

1. A proposta leva salário, papel prometido e duração (recomendado).
2. Decisões determinísticas (recomendado).
3. **A promessa de papel vale já nesta fase** (diferente da recomendação):
   - prometeu titular e deixou no banco: a moral cai mais do que o banco comum;
   - com a moral baixa e a promessa quebrada por algumas rodadas, o jogador pede para sair;
   - prometeu rotação e deixou fora da lista: a moral também cai;
   - a promessa vale durante a temporada da contratação.
4. **Tudo num PR só** (diferente da recomendação). As partes da seção 4 viram commits do mesmo PR.
