# Touchline · Primeiro Contrato
## Handoff da próxima versão

Implemente no MVP existente, em `muriloalmeida-alt/BRDATA`, diretório `primeiro-contrato/`. Use como referência inicial o deploy do PR #175, commit `cd175c2ddf5f8cc4c0ebc22b1899625dfa51b028`, e confira o estado atual da branch antes de editar. Preserve o acesso pelo caminho `/primeiro-contrato/`, o catálogo versionado, as carreiras existentes e a identidade aprovada.

Seja 100% fiel às pranchas já aprovadas, disponíveis em `docs/primeiro-contrato/pranchas/`. Os novos estados devem usar os mesmos tokens e componentes. Cabeçalho só com o símbolo oficial Touchline. Barlow Condensed 700 em títulos e números, 600 em CTAs, Barlow 400/500 no texto de apoio. Use nomes e escudos do catálogo por ID. Veja ASSETS.md para os novos fundos e aceite de imagem.

## 1. Temporada visível

- O primeiro CTA é **Iniciar temporada**. Nos trechos seguintes, **Continuar temporada**. A reprodução avança automaticamente entre decisões, com faixa inicial de teste de 8–15 s por trecho. Dê ênfase a marcos como estreia, retorno de lesão, gol decisivo ou atuação acima da média.
- Mostre rodada, adversário, escudos, placar, minutos e destaques da função. Distinga titular, entrou, banco sem jogar e indisponível. Preserve os jogos como histórico consultável no balanço.
- Inclua **Pausar**, **Acelerar** e **Ir à próxima decisão**. O último pula a visualização, aplica o mesmo resultado e respeita a decisão pendente. Retome no último ponto persistido após recarregar. Dê suporte a movimento reduzido.
- Reuse o simulador por jogo de `src/engine/carreira.ts`. Separe o avanço do domínio da reprodução. Registre resultado e atuação com chave estável de partida. Use a mesma fonte para linha do tempo, estatísticas e classificação. Se precisar introduzir placares de clube, garanta que gols e assistências do atleta sejam compatíveis com eles. Para ligas simplificadas, sinalize a simulação e exiba resultados esportivos suportados pelo formato. Preserve a origem dos resultados de temporadas antigas.
- No fim, mostre minutos previstos × realizados, titularidades, nota média, métricas da posição, variação de nível e um motivo verificável. Exemplo: “Você ganhou a vaga na rodada 18 e terminou com 64% dos minutos.”

## 2. Treinador e imprensa

Use o sistema atual de eventos tipados. Cada evento precisa de gatilho verificável, prioridade, opções, consequência, referência ao fato de origem e controle de repetição. Grave a resposta e seus efeitos uma vez. Ao reabrir o save, recupere a pergunta e as mesmas opções.

| Evento | Gatilho | Respostas e efeitos |
|---|---|---|
| Plano do treinador | Pré-temporada e necessidade em função compatível | Disputar vaga na posição original ou aceitar adaptação. Muda treino e elegibilidade para a nova função. |
| Disputa por vaga | Participação recente abaixo do papel previsto | Perguntar o que falta, focar no treino ou procurar empréstimo. A resposta revela critério, muda avaliação futura ou sinaliza interesse. |
| Entrevista pós-jogo | Atuação marcante confirmada no registro | Valorizar o time, assumir ambição ou evitar a questão. Muda repercussão e expectativa pública. |
| Rumor de saída | Há interesse concreto de outro clube | Declarar intenção de ficar, manter a porta aberta ou evitar o assunto. A reação depende do desfecho real da janela. |
| Volta ao treino | Liberação e volta ao treino no motor | Usar a cena de recuperação quando o retorno for válido. Preservar regras atuais de indisponibilidade e recaída. |

No primeiro recorte, use uma conversa de pré-temporada e até duas novas interrupções relevantes por temporada. Preserve eventos obrigatórios que já existem. Mostre as respostas com o mesmo peso visual até a seleção. A entrevista influencia reputação e cobertura. A escalação continua ligada à disponibilidade, à concorrência, ao desempenho e à confiança esportiva.

## 3. Evolução coerente

- **Nível:** capacidade duradoura, com idade, potencial, minutos de qualidade, treino e experiência na função.
- **Forma e confiança:** desempenho recente e avaliação esportiva no clube. A confiança pode mudar mais rápido após transferência, adaptação ou mudança de papel.
- **Reputação:** efeito mais lento dos feitos, visibilidade da competição e cobertura. Alimenta observação e mercado junto da necessidade de cada clube.
- Preserve a viabilidade das rotas de titular em clube menor, banco em clube maior e empréstimo com minutos. Compare atletas de mesmo potencial em simulações repetíveis. Ao gerar propostas, observe concorrência na posição, condição financeira e papel plausível.
- Reuse o que existe em `atleta.ts`, `estado.ts` e `mercado.ts`. Migre saves com valores compatíveis ao introduzir estado novo e preserve eventos pendentes e registros históricos.

## Entregas e aceite

1. **Jogo a jogo e balanço.** Execute uma temporada inteira no fluxo normal e compare os totais com a soma dos jogos. Confira placar, tabela e conquistas quando o formato estiver disponível.
2. **Interações.** Demonstre uma conversa de pré-temporada, uma disputa de vaga e uma entrevista. Mostre a consequência no momento em que ela se torna observável.
3. **Mercado e calibração.** Compare as três rotas de carreira. Verifique empréstimo com retorno e explicação de pelo menos uma proposta em função da temporada.
4. **Regressão e mobile.** Mesma semente e respostas produzem o mesmo resultado com reprodução normal, acelerada ou pulada. Após pausa ou recarga, não duplique jogos, consequências nem balanços. Rode os testes existentes do motor e do fluxo. Acrescente cobertura focada para persistência e a consistência de placares, estatísticas e classificação. Valide a jornada no Safari do iPhone, com safe areas, contraste e toque.
5. **Homologação.** Entregue evidências das telas e tempos por trecho para validar o ritmo com Murilo.
