# Handoff para Claude · Paridade dos clubes CPU

Trabalhe no repositório muriloalmeida-alt/BRDATA, na Carreira 2.0 em /carreira. Use a versão atual da main e leia o CLAUDE.md da raiz e demais instruções aplicáveis. Preserve as instruções do repositório. Este arquivo é o briefing da entrega.

## Missão

Implemente paridade esportiva para todo clube ativo. Jogador e CPU devem dispor das mesmas ações, validações e efeitos esportivos. As escolhas da CPU devem depender de contexto observável, elenco, orçamento e perfil do treinador. O jogo deve continuar operando offline e abrir saves existentes.

## Leia antes de editar

- [Planejamento e ordem dos PRs](01_Plano_de_execucao.md)
- [Requisitos e critérios CPU-01 a CPU-10](02_Requisitos_de_produto.md)
- [Código, integração e persistência](03_Guia_tecnico.md)
- [Casos V01 a V10](04_Plano_de_validacao.md)
- [Inventário inicial de ações](05_Inventario_de_acoes.md)

## Execute em etapas

1. Comece por E0. Confirme o HEAD, a arquitetura atual, o catálogo vigente e as regras da Fase 1. Complete o inventário. Localize as suítes e os fluxos reais de fechamento, partidas e mercado. Registre baseline com fixtures e seeds reproduzíveis.
2. Entregue E1a primeiro. Faça força e convocação passarem pelas mesmas regras. Prove o efeito da ausência de goleiro ou atacante titular e valide os 11+11 com goleiro no banco. Em E1b acrescente decisões durante o jogo.
3. Prossiga na ordem E2, E3 e E4 conforme as dependências do plano. Reuse motor, regras, catálogo e testes existentes. Integre a mudança por meio das entradas reais da v2. Demonstre paridade com saves novos e existentes.
4. Em cada PR, inclua IDs dos requisitos, baseline e evidências, cenários manuais, riscos remanescentes e etapa seguinte. Se houver divergência entre o diagnóstico e o código atual, descreva a evidência e ajuste o plano técnico preservando o critério de produto.
5. A entrega termina quando todas as ações esportivas inventariadas têm equivalência comprovada ou decisão de produto registrada, os casos de cinco temporadas e retomada passam e as diferenças de balanço e desempenho estão explicadas.

## Limites da entrega

Implemente no motor compartilhado e na v2 conforme a arquitetura do repo. A Série D participa como origem de clubes de catálogo e continua fora da seleção de ligas jogáveis. Preserve o regulamento de Copa e a calibração atual como baseline. Mudanças de UX devem se limitar a tornar observáveis ações esportivas relevantes. Submeta mudanças de regras de competição e decisões de monetização à revisão de produto. Use a rotina de publicação já definida no repositório para propor o deploy após validação.

## Restrições confirmadas pelo produto

O jogo deve permanecer fluido e a suíte de testes deve ter crescimento controlado. Trate desempenho e custo de testes como critérios de conclusão. Meça em E0 e use os orçamentos do plano de validação. Reaproveite testes, acrescente casos curtos para riscos específicos e execute estatística e cinco temporadas em perfil dedicado sob demanda. Otimize decisões por evento e janela de processamento, com dados locais e simulação sem renderização dos jogos CPU. Comprove no Safari do iPhone a ausência de novo bloqueio perceptível. Estas restrições se aplicam a todas as etapas.
