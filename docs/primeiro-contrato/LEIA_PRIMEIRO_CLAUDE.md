# Touchline · Primeiro Contrato
## Instruções de implementação

Implemente um produto independente de carreira de atleta, usando o catálogo e a identidade do Touchline. Leia este arquivo, PROJETO.md e CATALOGO.md antes de escrever código.

**Ordem obrigatória: reproduza com 100% de fidelidade as pranchas aprovadas pelo Murilo.** Preserve a composição, a hierarquia, o ritmo, os alinhamentos, a ordem dos elementos, o contraste, a densidade e as ações de cada tela. Use os arquivos em `pranchas/` como referência visual de revisão. Submeta qualquer mudança visual à aprovação do Murilo antes de aplicá-la. As regras explícitas abaixo corrigem detalhes ilustrativos das pranchas. Tipografia e marca devem vir dos arquivos originais, inclusive quando a renderização da prancha se aproximar deles sem correspondência exata.

- **Header universal.** Somente o símbolo oficial T do Touchline, alinhado à esquerda. Preserve as proporções e o verde-lima. Use o ativo original da marca e o símbolo já utilizado pela aplicação do Touchline. A marca completa no topo da prancha identifica a prancha. O app não repete esse título no header. Status e área segura do iOS são elementos do sistema.
- **Tipografia.** Use Barlow Condensed 700 em títulos e números destacados, Barlow Condensed 600 nos CTAs e ações, e Barlow 400/500 em textos de apoio, campos e metadados. Use os WOFF2 locais e o CSS da pasta `touchline/fonts`. Compare as famílias computadas no navegador após `document.fonts.ready`.
- **Tokens.** Reuse a base original em `touchline/tokens.css`. Em especial fundo `#080e18`, texto `#f5f7fa`, bloco profundo `#070f18` e verde-lima `#b4e64b`. Aplique margens laterais de 24 px, ou 20 px até 360 px. O CTA Touchline tem altura mínima de 48 px.
- **Identidade dos clubes.** Resolva por ID de catálogo o nome canônico e o escudo original. Substitua iniciais ilustrativas e escudos de exemplo nas listas, contratos, mercado, trajetória e legado. Renderize o nome da liga a partir da inscrição do clube na temporada correta. Use escudos de liga quando disponíveis no catálogo autorizado. Use o fallback de iniciais somente para ativo realmente ausente, indisponível ou sem autorização. Evite inserir escudos manualmente por semelhança visual.
- **Posição.** Renderize o campo inteiro em 4–2–3–1, de cima para baixo: CA / PE MEI PD / VOL E VOL D / LE ZAG E ZAG D LD / GOL. Cada alvo é independente, com nome acessível por extenso, toque mínimo de 44 px e seleção única. A posição selecionada fica lima, seu nome por extenso aparece abaixo. O botão Escolher clube avança preservando a seleção.
- **Decisões.** Respostas começam com o mesmo peso visual. A seleção recebe verde-lima e o jogador confirma. A regra vale também para adaptação de posição, proposta e aposentadoria, onde as pranchas exibem exemplos de ênfase. Quando uma ação é de navegação simples, mantenha o CTA primário já previsto.
- **Fundos.** Os arquivos em `fundos/` são imagens de produção de referência por contexto. Aplique a foto como camada independente de títulos, marcas, controles e escudos. Use recorte e degradê do tema para manter o contraste e preservar o ponto focal. Veja FUNDOS.md.

## Mapa das 16 telas

| Tela | Prancha | Comportamento |
|---|---|---|
| Sua carreira | 02 | Entrar como convidado e retomar o save existente. |
| Seu jogador | 02 | Personalizar apelido opcional, nacionalidade e número. Exibir camisa dinâmica. |
| Onde você joga? | 01 | Selecionar uma das 11 posições no campo e avançar. |
| Escolha seu clube | 01 | Busca e filtros por país e liga com clubes do snapshot ativo. |
| Seu primeiro contrato | 01 | Papel, previsão de minutos e vínculo. Assinar destrava a estreia. |
| Sua temporada | 02 | Contexto do clube, posição e métricas. Avançar até próxima decisão ou balanço. |
| O treinador te chamou | 02 | Aceitar adaptação a uma função secundária ou manter a posição. |
| Voltar antes da hora? | 03 | Escolher entre recuperação ou disponibilidade com risco residual após liberação no jogo. |
| Você perdeu espaço | 03 | Conversar, treinar ou solicitar busca de empréstimo. |
| Você ganhou espaço | 01 | Balanço de fim de temporada. O título acompanha o resultado do atleta. |
| Janela aberta | 03 | Propostas válidas, renovar/ficar quando possível e comparar. |
| Qual caminho você escolhe? | 03 | Comparar papel, minutos e vínculo. Confirmação da proposta atualiza o save. |
| Primeira convocação | 04 | Exibir o marco quando o atleta for convocado e abrir detalhes na própria tela. |
| Sua trajetória | 04 | Mostrar clubes, temporadas, marcos e estatísticas consultáveis durante a carreira. |
| Mais uma temporada? | 04 | Continuar quando houver caminho contratual válido ou confirmar aposentadoria. |
| Seu legado | 04 | Revisar a carreira concluída, compartilhar cartão e iniciar uma nova. |

## Regras para o motor narrativo

Use eventos tipados com identificador, condição, prioridade, chave de repetição, opções válidas, efeitos e texto da consequência. Gere eventos a partir de estado persistido, calendário, posição, disponibilidade e contrato. Se a mesma decisão continuar pendente após recarregar, recupere as mesmas opções. No aceite, grave a resposta e seus efeitos uma única vez. O balanço mostra consequências observadas e a previsão de minutos é estimativa.

- Adaptação surge quando o clube tem necessidade em função relacionada. Aceitar inicia familiaridade na nova função e participa da disputa por minutos. Recusar preserva a alocação do treino.
- Recuperação exige risco residual e liberação registrada na simulação. A decisão altera disponibilidade e probabilidade de recaída. Sem liberação, o atleta permanece em recuperação.
- Perda de espaço exige queda de participação em um período suficiente. Conversar revela motivo, treino afeta a próxima avaliação e empréstimo marca interesse. Só apresente proposta se o destino tiver vaga e condições financeiras.
- Janela gera propostas compatíveis com as regras do mercado. Empréstimo conserva o vínculo original. Aposentadoria encerra somente após confirmação.
- Primeira convocação exige seleção habilitada e critérios esportivos. Registrar uma vez como marco histórico.

## Evidência de aceite

Entregue capturas lado a lado das 16 telas a 390 px no Safari iOS com os dados de referência. Exercite 360 px, nomes longos, foco de teclado e safe areas. Verifique logo original e ausência de elementos extras no header, famílias e pesos reais, as 11 posições, nomes e escudos por ID, estados de escolha e contraste sobre fundos. Valide criação, retomada, uma janela, empréstimo com retorno, decisão persistida, aposentadoria e cartão. Registre e submeta à aprovação qualquer divergência visual.
