# Guia técnico

## Pontos de partida no repositório

Referências fixadas na versão auditada e517b1f. Conferir as linhas no checkout atual antes de editar.

| Caminho | Ponto de integração |
|---|---|
| [fechamento.js](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/public/js/motor/fechamento.js) | pickCpuXI, computeHumanStrength, resolveCpuFixture, resolveOtherDivisionsRound, simulateCupLeg, recuperação e fechamento. Auditar chamadas de recuperação, que na versão auditada referenciam CAREER.squad. |
| [aovivo.js](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/public/js/motor/aovivo.js) | Inicialização do XI da CPU, cálculo por bloco, substituição do jogador e registro de expulsões. |
| [partida.js](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/public/js/motor/partida.js) | Gols, autoria, força e efeito das expulsões. |
| [mercado.js](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/public/js/motor/mercado.js) | Avaliadores da Fase 1 e políticas CPU × CPU anteriores. |
| [carga.js](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/public/js/motor/carga.js) | Validação, escalação automática, condição, treino e recomendações. |
| [temporada.js](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/public/js/motor/temporada.js) | Evolução anual da CPU, geração e virada de temporada. |
| [CLAUDE.md do repo](https://github.com/muriloalmeida-alt/BRDATA/blob/e517b1f/CLAUDE.md) | Arquitetura da v2, restrições sobre a tela antiga e comandos de validação. |

## Integração

1. Inventariar os donos atuais de estado e as fronteiras entre ação, regra e efeitos. Extrair apenas o necessário para que a mesma ação receba explicitamente o estado do clube que a executa. Reusar as validações e formatos existentes quando coerentes.
2. O controlador CPU escolhe a ação. O executor valida e aplica os efeitos. A simulação direta pode fazer menos trabalho de apresentação; o encadeamento esportivo respeita a ordem de decisões, minutos e eventos. Usar o RNG existente ou uma entrada controlável em testes e evitar que tela, log ou renderização consumam RNG esportivo.
3. Persistir alterações sob a identidade estável do clube e do atleta. Em E0, conferir versionamento, limites de tamanho e política de gravação do servidor e do cliente. Migrar de forma repetível. Derivar campos novos de dados existentes quando possível. Para saves no meio da partida, preservar placar, relógio, eventos, atletas em campo e contadores. Testar a retomada antes de alterar o formato.
4. Validar a unicidade dos efeitos por partida, atleta e transação conforme o mecanismo de persistência vigente. Ao migrar ou trocar o clube, preservar IDs, resultados, titulares, vínculos, dinheiro e contratos existentes. Garantir ordem de processamento em rodadas que contenham jogo do jogador, jogos CPU e Copa.
5. Diagnósticos de desenvolvimento devem explicar escolhas quando ativados. Restringir crescimento de logs e histórico no save, usando os limites vigentes e o volume necessário à interface. Quando necessário, propor mudança de orçamento de armazenamento com medição e evidência.
6. Basear a publicação de bundles e o CI nas instruções do repo. Validar uma build candidata e um save descartável em homologação, se disponível, antes de propor produção. Documentar compatibilidade de rollback, especialmente para saves já migrados. Se o binário anterior não abre o formato novo, recuperar pelo caminho compatível testado em homologação.

## Riscos e tratamento

| Risco | Tratamento |
|---|---|
| Queda de fluidez no iPhone | Medir cedo. Simular decisões nos momentos relevantes e omitir trabalho exclusivo de interface em simulação direta. |
| Desvio de gols, 0 a 0 ou vantagem por porte | Comparar distribuição com o baseline da mesma divisão e modo. Inspecionar táticas extremas, expulsões, lesões e condição antes de recalibrar. |
| Clubes sem profundidade ou com caixa inviável | Testar elenco reduzido, cobertura por posição, renovação, folha e mercado por múltiplas temporadas. |
| Divergência de resultados e efeitos em retomada | Usar fixtures com checkpoint no intervalo, antes de fechamento e durante transação. Conferir contador, elenco, histórico e caixa após repetir a operação. |

## Orçamento de execução da CPU

O custo das decisões precisa caber no avanço de rodada e na fluidez da partida no iPhone. Calcular no cliente com regras locais. Usar o elenco e as informações já disponíveis no save para decidir, evitando dependência de chamadas externas por clube ou por decisão.

- Preparar escalação e plano antes da partida. Reavaliar no intervalo, em janelas discretas e quando houver evento relevante, como lesão, expulsão ou mudança de placar. Evitar processamento de decisões em cada frame da interface.
- Em jogos simulados, processar eventos e decisões esportivas sem animação ou renderização. Preservar ordem dos efeitos e critérios de validade de ambos os controladores.
- Reavaliar mercado em janelas e gatilhos relevantes, usando uma lista limitada de candidatos por carência. Invalidar índices quando o elenco ou a situação mudar. Evitar comparar todos os atletas com todos os clubes a cada rodada.
- Processar o trabalho pesado em lotes que devolvam o controle ao navegador quando necessário. Se o perfil ainda mostrar bloqueio, avaliar worker para o motor compatível, medindo custo de serialização, memória e persistência.
- Registrar eventos necessários ao save e à interface. Manter diagnóstico detalhado sob ativação explícita e limitar seu histórico. A entrada de clube ativo conserva identidade e estado durante toda a carreira.

Se o custo exceder o orçamento, ajustar frequência, estrutura de dados e execução. Preservar os efeitos esportivos exigidos para os clubes ativos. Demonstrar o ganho com o mesmo fixture e dispositivo antes de concluir a etapa.
