# Plano de validação

## Matriz de aceite

| ID | Caso | Evidência esperada |
|---|---|---|
| V01 | Mesmo elenco, formação, tática e condição. Alternar controlador com decisões fixadas. | Mesmo vetor de força e mesmas validações. |
| V02 | Suspensos, lesionados e goleiro titular indisponível. Banco com disponibilidade normal e depois elenco insuficiente. | Escalação respeita elegibilidade, 11+11 quando há atletas aptos, goleiro no banco e regra comum na exceção. |
| V03 | CPU perde aos 75 minutos, vence aos 75, sofre lesão, recebe vermelho ou esgota trocas. | Decisões verificáveis pelo contexto. Ninguém entra além da cota. A vaga do expulso fica vazia. Autoria de eventos corresponde a quem estava em campo. |
| V04 | Decisões e RNG equivalentes em ao vivo, direto e CPU × CPU. | Aplicação consistente de força, eventos, minutos, disciplina e desgaste. Comparar placares exatos apenas quando entradas e sequência esportiva de RNG forem equivalentes. |
| V05 | Série C e clube da Série D na Copa, rodada de liga antes/depois, clube promovido e reencontrado na temporada seguinte. | Identidade e elenco persistem. Minutos, recuperação, sanções e premiação seguem a ordem dos eventos e a regra da competição. |
| V06 | Clube pequeno tenta titular de grande; empréstimo de jovem; cláusulas facultativa e obrigatória; volta e renovação. | Motivos coerentes, orçamento respeitado, transação única e efeitos nos dois clubes. Testar em ambas as combinações de controladores. |
| V07 | Salvar offline, retomar no meio da partida, exportar/importar, repetir fechamento e negociar em concorrência conforme o fluxo vigente. | Save importável e consistente. Nenhum efeito duplicado, partida pulada ou atleta com vínculo duplicado. |
| V08 | Trocar de clube, avançar temporada e voltar; cinco temporadas por lote com mais de uma seed. | IDs e histórico estáveis, clubes com escalação funcional, finanças coerentes, evolução por idade e minutos e ausência de bloqueio de calendário. |
| V09 | Safari no iPhone via fluxo normal. | Iniciar partida, observar decisões da CPU, avançar rodada, recarregar e reabrir o save com fluidez. |
| V10 | Comparar baseline e candidato com entradas pareadas para dados reais e Modo Exemplo. | Relatório por divisão e competição, com médias de gols, 0 a 0, dispersão e recortes por porte, mais p50/p95 de avanço e bytes do save. |

## Execução e orçamento dos testes

Reaproveitar testes e fixtures existentes. Adicionar casos curtos no motor para riscos específicos de paridade, elegibilidade, transação e retomada. Medir o custo adicional no CI, incluindo dados de teste e preparação. Reservar testes de navegador para jornadas que exigem interface, reutilizando os fluxos atuais.

As simulações estatísticas e de cinco temporadas pertencem a uma execução dedicada sob demanda, antes de consolidar uma etapa que altere balanceamento, economia ou persistência. Executar sem navegador e reutilizar os mesmos cenários entre análises. Rodar novamente quando uma mudança afeta o resultado analisado ou quando surgir falha relevante. Os 2.000 jogos por divisão e 5 seeds de 5 temporadas são uma amostra inicial para essa execução dedicada. Ajustar pela variabilidade e custo medidos em E0.

Meta inicial de custo adicional da suíte padrão: até 5% do tempo total no mesmo perfil e nível de paralelismo. Registrar baseline, candidato e tempo dos testes adicionados. Se exceder, reduzir redundâncias e deslocar calibração e longevidade para a execução dedicada, mantendo cobertura curta dos riscos críticos. A duração real será confirmada em E0.

## Desempenho e balanceamento

- E0 registra commit, cenário, seed, modo, dispositivo e número de observações. Medir p50/p95 do avanço de rodada, início/retomada de partida, pico de memória, tamanho do save e travamentos perceptíveis no Safari do iPhone.
- Fixar em E0 metas absolutas em milissegundos para cada ação, considerando a experiência atual e o dispositivo de referência. Meta provisória para avanço de rodada: regressão de p95 de até 5%, considerando a variabilidade da medição, e cumprimento do orçamento absoluto acordado. Aumento acima da variabilidade exige otimização antes de concluir a etapa.
- Não publicar candidato com travamento novo perceptível no iPhone ou ultrapassagem do limite efetivo de persistência. Demonstrar margem de armazenamento com fixture de cinco temporadas. A meta de bytes será fixada após medir o limite vigente em E0.
- Investigar deslocamento superior a 0,15 gol por jogo ou 2 pontos percentuais de 0 a 0 em relação ao baseline por divisão. Examinar intervalos de confiança e efeitos intencionais antes de recalibrar.
- Cada PR apresenta apenas verificações pertinentes à mudança e os comandos exigidos pelas instruções aplicáveis do repo. A validação final inclui suítes exigidas e o inventário completo. Registrar o que passou, o que foi manual e o que permanece pendente.
