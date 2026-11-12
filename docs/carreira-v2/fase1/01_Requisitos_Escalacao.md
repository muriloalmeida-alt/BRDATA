# Fase 1 — Escalação e comissão técnica

**Objetivo:** aplicar a orientação lateral usando a mesma operação de troca titular–reserva da escalação manual.

- ESC-01. Uma escalação confirmada tem 11 titulares e 11 reservas distintos, com pelo menos um goleiro elegível no banco. Revalidar posições, elegibilidade e revisão do save ao confirmar.
- ESC-02. Ao promover um reserva, o antigo titular ocupa a vaga aberta no banco. Aplicar e persistir as duas alterações em uma transação, preservando formação e demais posições. Atualizar a tela após a gravação.
- ESC-03. Se a troca deixar o banco sem goleiro, sugerir uma recomposição com goleiro elegível e pedir confirmação conjunta. Sem candidato válido, explicar o bloqueio. A escalação em edição pode ter pendências visíveis. O jogo só confirma a lista válida. Nunca inventar atleta para preencher vaga.
- ESC-04. Se a sugestão ficar desatualizada, se a gravação falhar ou se houver toque repetido, preservar a última escalação confirmada. Recarregar candidatos ou oferecer nova tentativa conforme o caso. Saves antigos com banco menor abrem em modo de revisão e orientam o preenchimento antes da próxima confirmação.
- ESC-05. Preservar ajustes de formação e postura do menu lateral. A composição inicial do banco é diferente da lista de reservas ainda disponíveis após substituições durante o jogo.

## Aceite

1. Com 11 + 11 e um goleiro reserva, promover um jogador de linha e conferir a troca de vagas, IDs únicos e as contagens após reabrir em modo avião.
2. Testar troca entre goleiros, proposta que exige recomposição, ausência de goleiro elegível, atleta suspenso, save antigo e sugestão vencida após edição manual.
3. Simular falha de escrita e toque duplo. Verificar escalação inteira anterior ou inteira nova, sem duplicata ou vaga perdida.
