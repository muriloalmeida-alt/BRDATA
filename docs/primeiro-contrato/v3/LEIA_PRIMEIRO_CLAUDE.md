# Touchline · Primeiro Contrato
## Handoff para Claude — relações e evolução de carreira

### Missão

Implemente sobre o MVP existente em `muriloalmeida-alt/BRDATA`, diretório `primeiro-contrato/`. O clube deve lembrar dos compromissos assumidos, a imprensa deve lembrar das declarações relevantes e o jogador deve conseguir ligar suas escolhas a minutos, evolução e oportunidades.

Confira a revisão atual antes de editar. O PR #175 é o ponto de referência do MVP. Use o handoff anterior, `Touchline_Primeiro_Contrato_Temporada_Claude.zip`, para a reprodução jogo a jogo e os fundos. Se alguma parte já estiver implementada, use o fluxo existente. Se ainda faltar o registro de partidas, implemente primeiro o contrato mínimo de eventos esportivos verificáveis. A animação pode evoluir em paralelo.

**Preserve 100% da identidade e da composição das pranchas aprovadas.** Nos estados novos, reutilize seus componentes e submeta mudanças de composição à revisão do Murilo. Header apenas com o símbolo oficial Touchline. Barlow Condensed nos títulos, números e ações, Barlow no texto de apoio. Nomes, ligas e escudos resolvidos pelo catálogo da temporada. Jornada mobile, respostas por toque, sem formulários de negociação, caixa de entrada ou nova área de gestão.

## 1. Negociação com a diretoria

**Entradas:** proposta, renovação na janela, revisão prometida e solicitação de empréstimo. Integre às telas de contrato e comparação de propostas. Mostre papel previsto, faixa de minutos estimada, duração e salário ou bônus quando essas condições estiverem mapeadas. Valores por moeda, período e unidade consistente. Se o modelo financeiro do clube ainda não estiver completo, use as faixas configuradas do mercado e os orçamentos disponíveis, com fallback documentado por liga/divisão. O jogador sempre vê os termos antes de assinar.

### Fluxo

1. O jogador abre a proposta e escolhe **Aceitar**, **Negociar** ou **Recusar**, conforme validade da proposta e estado do vínculo.
2. Em **Negociar**, escolhe um único pedido. O motor avalia duração, fase da carreira, margem salarial, concorrência e interesse do clube.
3. A diretoria responde com aceitação, recusa ou alternativa. Apresente termos atualizados e uma razão curta. Se a proposta original continuar válida, ela permanece acessível. A alteração do vínculo ocorre ao confirmar uma proposta válida.
4. Primeira versão: uma contraproposta por oferta e nenhuma cadeia de negociação. Reabrir a tela recupera a resposta já calculada. A validade usa o tempo da carreira.

| Pedido | Decisão do clube | Consequência |
|---|---|---|
| Mais espaço | Oferecer plano de rotação e data de revisão quando houver espaço plausível | Cria compromisso de avaliação. O técnico conserva a decisão de escalação. |
| Contrato mais curto | Aceitar, recusar ou oferecer condição compatível, como salário fixo menor | Registra prazo e condições aceitos no vínculo. |
| Melhores condições | Usar orçamento, comparação com a faixa da função, histórico e concorrência de propostas | Pode aumentar o fixo ou oferecer bônus por jogos, com critério explícito e pagamento único por condição cumprida. |
| Buscar empréstimo | Autorizar procura, adiar com justificativa ou recusar conforme necessidade do elenco e janela | Gera interesse em destinos elegíveis. Oferta depende de elenco, orçamento e vínculo. O retorno mantém a passagem e o vínculo de origem. |

### Memória do compromisso

Guarde clube, origem, termos, rodada de revisão, estado e evidência. Verifique o compromisso na data combinada e ofereça a próxima ação conforme a situação. A revisão mostra os minutos reais e as avaliações do período. Se houve lesão, mudança de clube ou encerramento antecipado, registre o motivo e encerre a pendência aplicável. Compromissos de processo, como reavaliar o papel, são separados de projeções de minutos. O jogo evita prometer titularidade como resultado garantido.

## 2. Técnico — plano, oportunidade e devolutiva

Amplie o sistema de eventos tipados. Cada conversa nasce de um fato e gera, quando aplicável, um **plano com janela de avaliação**, critério por função e uma devolutiva. Primeira calibração sugerida: quatro partidas elegíveis. Se houver poucos minutos por lesão ou falta de oportunidade, a devolutiva indica amostra insuficiente e permite encerrar ou revisar o plano sem penalização automática.

| Gatilho verificável | Respostas | Efeito a mostrar |
|---|---|---|
| Vaga aberta por ausência de concorrente | Disputar a posição de origem ou cobrir função compatível | Muda função elegível, foco de treino e possibilidade de escalação. |
| Sequência de boas entradas | Aceitar a missão da primeira titularidade ou pedir ajuste de função | Técnico define expectativa adequada à posição. A oportunidade depende de disponibilidade e escalação. |
| Reforço na posição | Disputar espaço, treinar segunda função ou conversar sobre empréstimo | Muda o plano e a comparação com os concorrentes. |
| Chegou a revisão | Conversar sobre o resultado ou seguir o plano revisado | Feedback usa os jogos da janela e explica a decisão de papel. |
| Espera por minutos abaixo do papel previsto | Pedir critério, focar no treino ou procurar empréstimo | Revela o motivo esportivo, ajusta a próxima avaliação ou sinaliza interesse no mercado. |

Use metas compreensíveis por função, como desarmes ou interceptações para volantes, criação para meias e defesas para goleiros. Normalize por minutos e calibre a amostra. Evite exigir gols de defensores ou confundir concorrência simulada com jogadores reais. Preserve a posição escolhida entre as 11 existentes. Adaptação é familiaridade em uma função compatível e pode coexistir com a posição de origem.

## 3. Imprensa e torcida — memória por clube e por carreira

A **imprensa** altera visibilidade, expectativa e tom da cobertura. A **torcida** tem identificação por clube, que evolui com atuação, regularidade, tempo de casa, jogos marcantes e a forma como o atleta saiu. Dê peso limitado às declarações. O efeito de escalação vem do contexto esportivo.

| Cena | Condição | Escolhas e retorno |
|---|---|---|
| Primeiro gol em clássico | Rivalidade cadastrada e gol confirmado | Valorizar o grupo, falar da disputa por espaço ou assumir ambição. A manchete reflete o que foi dito. |
| Sequência ruim e reação da arquibancada | Amostra recente suficiente e desempenho abaixo da expectativa | Falar, reconhecer a fase ou seguir ao vestiário. Uma boa sequência pode recuperar a identificação. |
| Rumor de saída | Interesse ou oferta registrados | Dizer que quer ficar, deixar a porta aberta ou evitar o assunto. Declaração relevante pode reaparecer no desfecho da mesma janela. |
| Volta ao antigo estádio | Calendário confirma rival atual e mando do ex-clube | Exibir aplausos, vaias ou recepção dividida com base na passagem e na saída. Pode ser só uma reação no jogo a jogo. |

Use reações breves no fluxo das rodadas. Reserve telas completas para momentos que pedem resposta. Mostre duas ou três escolhas com o mesmo peso visual antes da seleção. Reuse os fundos do pacote anterior por cena. Se não existir evidência de rivalidade, resultado, interesse ou estádio, use um evento compatível com os fatos disponíveis.

## 4. Evolução e mercado

Modele quatro dimensões com papéis definidos:

- **Nível e familiaridade.** Nível muda devagar com idade, potencial, treino, qualidade da participação e continuidade. Familiaridade evolui por função. Considere declínio por idade e posição. A liga calibra a exigência, sem produzir ganho automático por prestígio.
- **Forma e confiança.** Forma representa rendimento recente e tende a voltar ao normal. Confiança é do vínculo com o contexto técnico do clube. Ela reflete o que o atleta entregou, com peso limitado na disputa de vaga. Ao mudar de clube, recompute a expectativa de papel e calibre a confiança inicial.
- **Reputação.** Acompanha o atleta e cresce com feitos sustentados, contexto competitivo e exposição. Afeta observação e interesse, junto da necessidade e do orçamento do destino.
- **Identificação com a torcida.** Pertence ao par carreira–clube. Pode sobreviver à saída e ser consultada no reencontro.

No balanço, mostre previsão versus participação real, comparação de papel, métricas por função e causa concreta. Na oferta, mostre **por que o clube procurou o atleta** e qual vaga existe. Exemplo: “Você ganhou a vaga na rodada 18 e disputou 64% dos minutos. O Ceará busca um meia para a rotação.” Os valores e fatos vêm dos registros do save.

## 5. Integração técnica

- Confira os pontos de entrada atuais em `src/engine/{carreira,atleta,estado,mercado,save}.ts`, `src/screens/` e `src/store/persistencia.ts`. Reutilize o sistema existente de decisões e propostas. Acrescente lógica ao domínio antes de ligá-la à interface.
- Eventos e respostas devem referenciar clube, temporada e rodada/partida ou janela. Guarde identificador estável, tipo, motivo, opções válidas, efeito, prazo e estado. Compromissos, planos e declarações precisam se ligar à decisão que os originou.
- Use sorteio determinístico por semente, fato e tipo de evento. Priorize pendências contratuais e esportivas sobre repercussões de imprensa. Controle repetição por tipo e contexto. Reações sem decisão entram como destaque, sem interromper a temporada.
- Grave a decisão e seus efeitos atomicamente. Duplo toque, retomada e múltiplas abas não devem duplicar contrato, recompensa, plano ou consequência. Mantenha os controles de avanço independentes da simulação.
- Versione a persistência com migração de saves existentes. Inicialize novos estados com valores neutros, preserve andamento, histórico, pendências válidas e versão do catálogo. Evite reconstruir retrospectivamente dados que não existem.

## 6. Ordem de entrega e aceite

| Entrega | Cenário de aceite |
|---|---|
| **A. Diretoria e técnico** | Negociar papel, salvar e recarregar. O clube reabre o assunto na rodada prevista e explica a devolutiva com minutos e desempenho reais. Validar também contraproposta rejeitada, bônus e oferta expirada. |
| **B. Imprensa e torcida** | Entrevista nasce de fato registrado. Uma declaração sobre permanência reaparece após transferência. O ex-clube reage em reencontro confirmado no calendário. |
| **C. Evolução e mercado** | Comparar, com mesma semente inicial e potencial, três trajetórias: titular em clube menor, reserva em clube maior e emprestado com minutos. Registrar minutos, papel, nível, reputação e ofertas, e explicar diferenças. Cada rota precisa ter vantagens e custos plausíveis. |
| **D. Jornada completa** | Atleta começa reserva, sai emprestado, ganha espaço, retorna com histórico intacto e renegocia seu papel. Os fatos da jornada coincidem com a temporada jogo a jogo e os balanços. |
| **E. Validação mobile** | No Safari do iPhone, aceitar e recusar propostas, resolver decisões, retomar save e revisar balanço. Conferir header, fontes, escudos, áreas seguras, contraste e ações por toque. |

Rode a suíte existente do motor. Acrescente cobertura focada para migração, aplicação única de decisões, retorno de empréstimo e memória de compromisso. Compare pausado, acelerado e pulado para a mesma semente e mesmas respostas. Registre a diferença de tempo de simulação e faça smoke test em homologação antes de liberar.

### Referência de produto

Guia visual anterior em `docs/primeiro-contrato/pranchas/`. Handoff de temporada e cinco novos fundos em `Touchline_Primeiro_Contrato_Temporada_Claude.zip`. Esta especificação complementa o jogo a jogo, o balanço, o catálogo versionado e as regras de empréstimo já definidos.
