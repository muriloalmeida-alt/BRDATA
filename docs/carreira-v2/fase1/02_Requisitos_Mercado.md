# Fase 1 — Mercado, empréstimos e contratação

## Jornada mobile

- MER-01. No hub do clube, abrir Mercado com um toque. Em Elenco, colocar **Contratar jogador** com acesso direto à busca.
- MER-02. Na ficha do alvo, abrir **Fazer proposta** em um toque. Exibir compra e empréstimo conforme elegibilidade. Preservar busca, filtros e posição da lista ao voltar.
- MER-03. Exibir custo inicial, salário assumido, impacto no orçamento e duração antes de confirmar. Exibir contraproposta ou motivo de recusa com ação seguinte quando aplicável.

## Regras do motor

- MER-04. Compra exige aceite do clube e do atleta. O clube avalia importância, minutos, cobertura da posição, janela, valor e reposição. O atleta avalia salário, papel oferecido, divisão e reputação. Oferta alta pode melhorar condições, mas orçamento disponível sozinho não garante aceite.
- MER-05. No empréstimo, o clube de origem avalia minutos, cobertura, desenvolvimento, janela, duração, taxa e divisão salarial. O destino avalia orçamento e o jogador avalia papel e perspectiva de jogar. Recusa, aceite e contraproposta precisam refletir as condições efetivas.
- MER-06. Reutilizar parâmetros e estruturas existentes. Centralizar limiares configuráveis e registrar a calibração. A mesma oferta sobre o mesmo estado deve produzir a mesma resposta. Reavaliar ao alterar condições relevantes ou avançar no calendário.
- MER-07. Confirmar transferências e empréstimos por operação idempotente. Revalidar orçamento e disponibilidade ao fechar o negócio. Preservar contratos, prazos, efeitos financeiros e retorno do emprestado em saves existentes. Garantir as mesmas regras online e offline.

## Matriz de aceite

| Cenário | Resultado esperado |
|---|---|
| Clube pequeno tenta titular consolidado de divisão superior com proposta comum | Recusa justificável ou contraproposta difícil. |
| Mesmo comprador negocia atleta disponível e oferece salário/papel compatíveis | Negociação viável, respeitando orçamento. |
| Empréstimo de titular sem reposição | Resistência alta; a taxa isolada não garante aprovação. |
| Empréstimo de jovem pouco utilizado com minutos previstos | Possível com salário e duração aceitáveis. |
| Oferta idêntica reenviada e fechamento repetido | Mesma decisão e nenhuma duplicidade financeira ou de elenco. |
| Voltar da ficha após filtrar jogadores | Filtros e posição da busca preservados. |
