# Plano de execução

**Objetivo**  
Fazer com que as decisões da CPU apareçam no campo, no mercado e no histórico da carreira, inclusive quando o jogador muda de clube.

| Etapa | Entrega revisável | Dependência | Estimativa inicial |
|---|---|---|---|
| E0 · Diagnóstico | Inventário completo de ações, caminhos de simulação e baseline de partidas, mercado, save e tempo por rodada | Checkout atualizado e fixtures reaproveitáveis | 2–3 dias |
| E1a · Escalação e força | Validação compartilhada, 11+11, goleiro no banco, convocação elegível e força derivada do onze e da tática para ambos | E0 | 4–6 dias |
| E1b · Gestão em campo | CPU decide substituições e ajustes e reage a eventos com a mesma execução esportiva, ao vivo e em simulação direta na divisão atual | E1a | 5–8 dias |
| E2 · Divisões e Copa | Propagação para A/B/C e Copa, calendário compartilhado, estatísticas e clubes da Série D do catálogo quando ativos | E1b | 4–7 dias |
| E3 · Mercado e contas | Negociação jogador × CPU e CPU × CPU, contratos, empréstimos, folha e escrituração dos dois clubes | E0 para desenho e E2 para integração | 6–10 dias |
| E4 · Temporadas e continuidade | Treino, moral, base, evolução, transição de comando e simulação de várias temporadas | E2 e E3 | 6–9 dias |

Faixa inicial de **27–43 dias úteis de engenharia**. Refinar após E0. O tempo de revisão e a disponibilidade de ambiente podem afetar a data de entrega.

## Ordem de trabalho

- **E0** — Registrar o commit real de partida e o HEAD em produção, localizar a última versão dos requisitos da Fase 1 no repo, fechar o inventário e medir o baseline com as mesmas seeds e fixtures que serão usadas na comparação. Entregar relatório curto com pontos de extensão e lacunas. Produto valida cenário de aceite e eventual ajuste de meta.
- **E1a** — Revisar a Liga atual com três confrontos no mesmo cenário: elenco completo, goleiro titular indisponível e atacante titular indisponível. Confirmar que aptidão, escalação e atributos afetam a força.
- **E1b** — Demonstrar no celular uma troca tática por placar e uma reação a lesão ou expulsão. Comparar o mesmo confronto resolvido pelas duas entradas com decisões equivalentes.
- **E2** — Demonstrar Copa entre divisões e sequência de três partidas em calendário apertado. Validar acesso/rebaixamento e entrada de clube do catálogo sem reinicializar estado já ativo.
- **E3** — Validar negociação acessível e difícil com vários perfis econômicos. Revisar evolução de orçamento, disponibilidade de posições e retorno de empréstimos.
- **E4** — Rodar cinco temporadas em lote e transferir o comando duas vezes em save existente. Validar persistência, curva de evolução e conclusão de todo o inventário.

Cada etapa entrega PR próprio, descrição da mudança, evidências e lista do que ainda depende da etapa seguinte. Se uma regra já cobrir a CPU, registrar a evidência no inventário. Uma mudança de regra de competição ou de balanceamento fora dos critérios deste pacote deve ser apresentada à revisão de produto antes da publicação.

## Condição de conclusão por etapa

Além do aceite esportivo, medir o custo adicional da suíte padrão e a execução do jogo. Usar as metas do plano de validação, com baseline em E0 e revisão no dispositivo de referência. A etapa só é concluída quando atende aos orçamentos de desempenho e cobertura crítica. A calibração estatística e a longevidade rodam em perfil dedicado sob demanda. A estimativa de 27–43 dias é preliminar e será revisada após o diagnóstico de desempenho.
