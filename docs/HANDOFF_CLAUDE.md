HANDOFF_CLAUDE — Demandas vigentes e histórico

As regras de governança deste Handoff estão definidas em
docs/README_HANDOFF.md. Claude deve consultar o README_HANDOFF.md
para conhecer as regras (responsabilidades, fluxo, estados, escopo,
divergências, aprovação) — elas não são repetidas aqui.

⸻

Demandas vigentes

PC-002 — Primeiro Contrato: temporada visível, treinador e imprensa, evolução coerente

Status: APROVADO (Murilo, 26/11/2026, "Aprovado"). Código commitado na
branch `claude/new-session-ygru7q` (recriada a partir de `main` em cd175c2,
#175). Os pontos de homologação 1 a 6 do relatório foram aprovados junto com
a entrega; o ritmo dos trechos curtos pode ser ajustado depois de testado no
iPhone. Mesclado em `main` pelo #176 (ab0e0cc), na versão sem os ajustes
abaixo. Os dois ajustes pedidos pelo Murilo depois da aprovação foram
enviados à branch depois do merge e não entraram no #176 (o registro anterior
dizia o contrário, por engano). Eles entram no PR seguinte:
- rolagens desnecessárias: medido em 390×844 e 360×740, 13 estados de tela
  rolavam; agora só rolam a lista de clubes e as trajetórias longas;
- o card do jogo não fica mais sob Pausar/Acelerar: sobreposição 0 de
  390×844 a 320×568;
- no iPhone (captura do Murilo, 26/11/2026) o card ainda ficava sob os
  botões, porque o aparelho rodava a versão do #176. Mesmo assim, a
  reprodução passou a usar o fluxo normal da página:
  - foto como fundo, card e controles em sequência, sem posição fixa;
  - sobreposição 0 nos 6 tamanhos medidos;
- o escudo em branco no card (Araguaína) era o carregamento preguiçoso da
  imagem dentro de um contêiner com rolagem própria no Safari: o escudo
  passa a carregar na hora, exceto na lista de clubes.
- botão cortado na primeira dobra (captura do Murilo na entrevista, versão
  do #176):
  - nas decisões, as respostas ficam no conteúdo e o "Confirmar" numa barra
    fixa embaixo; nas telas com cena, o CTA também fica fixo;
  - a foto encolhe antes;
  - medido com a rolagem no topo: o botão principal fica 0 px fora da
    primeira dobra em todas as telas, em 430×932, 390×844, 390×664,
    375×667 e 360×740.

Aprovação final reconfirmada pelo Murilo em 26/11/2026 ("Aprovado").

Origem: pacote "Temporada" do Murilo (26/11/2026), versionado em
`docs/primeiro-contrato/v2/` (`LEIA_PRIMEIRO_CLAUDE.md` e `ASSETS.md`). Os 5
fundos novos (WebP) estão em `primeiro-contrato/public/fundos/`.

Especificação (chapéu PM; o pacote é a especificação, com estes recortes):
1. **Temporada visível:**
   - o motor gera o calendário da liga (rodízio entre os clubes da inscrição)
     e o placar de todos os jogos da rodada;
   - gols e assistências do atleta saem dos gols do próprio time;
   - a classificação é calculada da mesma fonte;
   - cada partida do atleta é gravada com chave estável `ano:rodada` (rodada,
     adversário, mando, placar, situação titular/entrou/banco/indisponível,
     minutos, nota e destaques da função);
   - a reprodução na tela é separada do avanço do domínio: o motor avança até
     a decisão e a tela reproduz os jogos novos em trechos de 8–15 s;
   - controles **Pausar**, **Acelerar** e **Ir à próxima decisão**;
   - o ponteiro da reprodução é persistido no save;
   - com movimento reduzido, não há animação.
2. **Treinador e imprensa**, como eventos tipados do sistema atual:
   - plano do treinador na pré-temporada;
   - disputa por vaga: é o evento de perda de espaço já existente, com a
     cena nova e os textos da prancha aprovada;
   - entrevista pós-jogo por atuação marcante ou gol decisivo do registro;
   - rumor de saída quando há interesse concreto, com reação conforme o
     desfecho real da janela;
   - volta ao treino, com a cena nova na decisão de retorno.

   Limite: uma conversa de pré-temporada e até duas interrupções novas
   (entrevista e rumor) por temporada.
3. **Evolução:**
   - nível (capacidade duradoura);
   - forma e confiança (no clube, mudam mais rápido após transferência,
     adaptação ou mudança de papel);
   - reputação (lenta; entra na observação e no mercado).
4. **Save:**
   - esquema v2 com migração v1 → v2;
   - temporadas antigas preservadas com a origem "resumo";
   - temporada em andamento migrada sem perder pendência nem jogos.

Fora deste recorte: validação no Safari de um iPhone real (fica com o
Murilo; entrego as capturas e os tempos de reprodução).

Relatório de implementação (26/11/2026)

**Temporada visível (motor):**
- módulo novo `src/engine/calendario.ts`:
  - participantes: com formato verificado, todos os inscritos da liga; na
    temporada simplificada, um grupo simulado do tamanho do calendário;
  - rodízio pelo método do círculo (turno e returno);
  - placar de cada jogo pelo perfil de ataque e defesa do catálogo e pela
    força relativa;
  - classificação calculada desses mesmos placares;
  - tudo regenerado da semente e nunca gravado inteiro.
- o simulador por jogo de `carreira.ts` foi reaproveitado:
  - situação: titular, entrou, banco ou indisponível;
  - gols e assistências do atleta saem de cada gol do próprio time com ele
    em campo, então nunca passam do placar;
  - goleiro: jogo sem sofrer gol só como titular por 90 minutos com 0 gol
    contra;
  - cada partida é gravada com chave `ano:rodada`, adversário, mando, placar,
    minutos, nota, destaques e marcos (estreia, volta da lesão, gol decisivo,
    atuação acima da média).
- **Balanço:**
  - minutos previstos × realizados, titularidades, nota média, métricas da
    posição e reputação;
  - motivo verificável, por exemplo "Você ganhou a vaga na rodada 18…",
    calculado pela sequência de titularidades;
  - campanha (V/E/D, pontos), com posição e título só com formato
    verificado;
  - jogos da temporada e classificação consultáveis.

**Reprodução (tela):**
- o motor avança até a decisão, e "Sua temporada" reproduz os jogos novos;
- CTA "Iniciar temporada" no primeiro trecho e "Continuar temporada" nos
  seguintes;
- trecho de 8 a 15 s (8 s + 0,25 s por jogo);
- Pausar, Acelerar (1×, 2×, 4×) e Ir à próxima decisão (só pula a
  exibição);
- o ponteiro `exibidos` é gravado no save a cada jogo; recarregar retoma do
  ponto (rodada 9 → 9 na captura);
- com movimento reduzido, a entrada do card não é animada;
- a cena muda com o marco: gol decisivo usa `gol-decisivo` e volta da lesão
  usa `volta-ao-treino`;
- se uma cena falhar, a tela usa o fundo original.

**Treinador e imprensa** (eventos tipados, com chave de repetição e a
referência ao fato no contexto):
- **plano do treinador:** na pré-temporada, quando há necessidade numa função
  compatível. Usa a cena `plano-treinador`, o título aprovado "O treinador te
  chamou" e as respostas da prancha. A adaptação do meio da temporada não se
  repete no mesmo ano;
- **disputa por vaga:** é o evento de perda de espaço, agora com o gatilho
  "participação recente abaixo do papel previsto", a cena `disputa-por-vaga`
  e a linha "Nos últimos 8 jogos você teve X% dos minutos; a previsão era
  Y%";
- **entrevista pós-jogo:** dispara por gol decisivo ou nota 8+ no registro.
  "Valorizar o time" dá confiança e +1 de reputação; "Assumir a ambição" dá
  +3 de reputação e expectativa, que pesa no balanço se a temporada ficar
  abaixo da previsão;
- **rumor de saída:** dispara por interesse concreto (clube com necessidade
  na posição, nível compatível e orçamento para a taxa). O rumor vira
  proposta na janela se ainda couber no orçamento, e a reação ao que o atleta
  disse é aplicada conforme o desfecho real;
- **volta ao treino:** a decisão "Voltar antes da hora?" usa a cena
  `volta-ao-treino`, com as mesmas regras de indisponibilidade e recaída;
- **limite:** uma conversa de pré-temporada e até 2 interrupções novas por
  temporada. Os eventos obrigatórios de antes continuam.

**Evolução:**
- confiança no clube (0–1):
  - entra no nível efetivo da escalação;
  - recomeça pelo papel em clube novo;
  - cai com a adaptação;
  - muda jogo a jogo;
- reputação (0–100, lenta):
  - vem de minutos, nível da liga, nota, gols, títulos, convocação e
    entrevistas;
  - amplia a observação e o teto das propostas;
  - entra no critério da convocação;
- a evolução usa os minutos ponderados pela nota e o ambiente de treino (um
  clube acima do nível do atleta acelera a evolução);
- o motivo das propostas cita a temporada ("Acompanhou seus 31 jogos, 9 gols
  e nota 7,1 em 2028").

**Calibração (60 sementes, meia de potencial 80, nível mediano):**

| Rota | Aos 20 anos | Aos 24 anos | Jogos em 8 temporadas |
|---|---|---|---|
| Titular em clube menor | 73 | 77 | 268 |
| Com empréstimo | 69 | 74 | 201 |
| Banco em clube maior | 66 | 71 | 126 |

As três rotas são viáveis. Sem o ajuste do ambiente de treino, a rota de
banco ficava em 68 aos 24 anos.

Em 200 carreiras automáticas: cerca de 470 jogos, pico mediano de 75,
cerca de uma entrevista a cada duas temporadas e 29% de convocados.

**Save v2:**
- migração v1 → v2: confiança 0,5, reputação estimada pelo histórico,
  temporadas antigas com origem "resumo";
- a temporada em andamento guarda `origemParcial` (jogos sem registro) e
  segue sem perder a pendência;
- trajetória e balanço indicam a origem.

**Testes:**
- `primeiro-contrato`: 26/26. São 8 novos, cobrindo:
  - rodízio;
  - totais = soma das partidas;
  - gols cabem no placar;
  - campanha e tabela;
  - título com formato verificado;
  - mesmos resultados com reprodução normal, acelerada ou pulada (com
    recargas);
  - sem duplicação após recarregar;
  - eventos e limite;
  - migração v1 → v2;
  - determinismo;
- E2E `test_primeiro_contrato.js`: atualizado para o CTA inicial, o card com
  placar e a reprodução; passou;
- rota rápida: 65/65;
- suíte completa: 205/206. O `test_v2_semana.js`, da carreira do treinador,
  estourou o tempo de espera; rodado de novo isolado, passou;
- `verificar-tela-antiga`: OK;
- typecheck limpo.

**Evidência** (`docs/primeiro-contrato/v2/evidencia/`):
- reprodução: início, jogando, pausado, marco e trecho seguinte;
- plano do treinador e disputa (opção selecionada e consequência);
- entrevista, rumor e volta ao treino;
- balanço com jogos e classificação;
- conjunto a 360 px;
- as 16 telas anteriores continuam alcançáveis pela interface (rodada de
  regressão sem erro).

Tempos medidos no app (log por rodada):

| Trecho | Velocidade | Tempo | Esperado pela fórmula |
|---|---|---|---|
| 9 jogos | normal | 10,1 s | 10,25 s |
| 16 jogos | normal | 11,9 s | 12 s |
| 25 jogos | normal | 14,3 s | — |
| 13 jogos | 2× | 5,7 s | — |
| temporada inteira (38 jogos) | normal | 15 s | teto de 15 s |

**Para homologação com o Murilo:**
1. O ritmo: um trecho de 1 jogo dura 8 s, o piso da faixa. Talvez valha um
   piso menor para trechos curtos.
2. As telas novas "Entrevista pós-jogo" e "Rumor de saída" não têm prancha;
   usam os mesmos componentes e tokens.
3. Na tela "O treinador te chamou" do plano, entrou o subtítulo "Plano para
   a temporada {ano}".
4. A linha de contexto da disputa por vaga (minutos recentes × previsão) é
   nova.
5. O card da partida aparece só durante a reprodução; parado, a tela mostra
   os totais.
6. Na temporada simplificada (14 ligas sem rodadas no catálogo, entre elas a
   Série B), o card mostra "simulada" e o balanço mostra a campanha sem
   classificação.

**Gaps e riscos:**
- o placar do clube não depende da atuação do atleta: é a mesma fonte para a
  tabela, ao custo de o atleta não mudar o resultado do time;
- o save cresce cerca de 8 KB por temporada com o registro jogo a jogo
  (IndexedDB, sem limite prático);
- falta validar no Safari de um iPhone real.

⸻

PC-001 — Touchline · Primeiro Contrato (carreira de atleta, app independente)

Status: APROVADO (Murilo, 26/11/2026, "Aprovado"). Código commitado na
branch `claude/new-session-ygru7q`. Base: `main` em 5060b61 (#172).
As divergências visuais 1 a 9 do relatório foram aprovadas junto com a
entrega. As fotos que faltam podem ser trocadas quando chegarem os ativos.

Origem: o Murilo enviou o pacote "Primeiro Contrato" (26/11/2026). O pacote
está versionado em `docs/primeiro-contrato/`:
- `LEIA_PRIMEIRO_CLAUDE.md` governa a parte visual;
- `PROJETO.md` traz o produto, as regras e a arquitetura;
- `CATALOGO.md` define o catálogo;
- `FUNDOS.md` define os fundos;
- `pranchas/` traz as 4 pranchas aprovadas.

Decisões do Murilo (26/11/2026, nesta sessão):
- **Prioridade:** o MERCADO-001 fica PAUSADO na etapa 2 (já mesclada); o
  PC-001 é a demanda vigente;
- **Local:** pasta nova `primeiro-contrato/` neste repositório, com Vite,
  React e TypeScript próprios (o mesmo stack da `carreira-v2`), build em
  `public/primeiro-contrato/` e rota `/primeiro-contrato`;
- **Escopo desta entrega:** as etapas 1 e 2 do `PROJETO.md` (fundação e
  carreira completa), com as 16 telas e o motor, da criação à aposentadoria.

Especificação (chapéu PM):

Objetivo: jogar uma carreira de atleta inteira no celular, numa sessão
curta. Nela o jogador:
- escolhe a posição e qualquer clube do snapshot;
- assina o contrato;
- simula as temporadas;
- decide nos momentos-chave (adaptação, lesão, perda de espaço, janela,
  convocação, aposentadoria);
- termina com o cartão de legado compartilhável.

Escopo:
1. **Fundação:**
   - app separado;
   - tokens e fontes originais (`touchline/`);
   - símbolo T original (`/img/touchline/marca-t.webp`, o mesmo da v2);
   - snapshot do catálogo versionado (795 clubes e 34 ligas);
   - escudos resolvidos por ID pelo índice `escudos-touchline.json`;
   - busca sem acentos por nome, sigla, país e liga, com filtros de país e
     liga;
   - qualquer clube pode ser escolhido.
2. **Motor puro** (`primeiro-contrato/src/engine/`, sem DOM e
   determinístico por semente):
   - atributos e potencial derivados da semente;
   - goleiro e linha com perfis próprios;
   - disputa por minutos contra concorrentes fictícios persistidos e
     marcados como simulados, calibrados pela força do clube;
   - previsão em intervalo;
   - temporada com jogos e minutos limitados ao calendário da liga e
     métricas por posição;
   - evolução por idade e minutos, com pico e declínio;
   - eventos tipados (id, condição, prioridade, chave de repetição, opções,
     efeitos, texto da consequência);
   - mercado (transferência, empréstimo, renovação ou ficar);
   - empréstimo com clube de origem e retorno;
   - primeira convocação, como marco único;
   - aposentadoria só depois de confirmada.
3. **As 16 telas do mapa do `LEIA_PRIMEIRO_CLAUDE.md`**, fiéis às pranchas.
4. **Save anônimo em IndexedDB:**
   - versão de esquema e versão de catálogo;
   - decisão pendente que volta igual depois de recarregar;
   - efeitos gravados uma vez só.
5. **Cartão de legado** em imagem exportável: compartilhamento nativo, com
   download como alternativa.

Fora de escopo nesta entrega:
- etapa 3 (cobertura mundial e API-Football);
- etapa 4 (competições continentais, desafios, sincronização);
- conta e login;
- métricas de produto (instrumentação).

Critérios de aceite:
- os do `LEIA_PRIMEIRO_CLAUDE.md` ("Evidência de aceite");
- os do `PROJETO.md` ("Aceite do MVP"), exceto os testes de usabilidade com
  pessoas, que ficam com o Murilo;
- mesma semente e mesmas decisões dão o mesmo resultado;
- decisões diferentes dão efeitos coerentes.

Riscos e lacunas conhecidos:
- as pranchas usam fotos que não vieram em `fundos/`:
  - lesão;
  - banco de reservas;
  - camisa 9 de costas;
  - convocação na escada;
  - retrato do cartão de legado.

  Nessas telas uso o fundo mais próximo do pacote ou um degradê, e registro
  como divergência visual para aprovação.
- 70 dos 795 clubes não têm escudo no índice e caem nas iniciais (fallback
  previsto). Outros 60 usam URL externa (sportmonks), que também cai nas
  iniciais se falhar.

Relatório de implementação (26/11/2026)

O que foi feito, etapas 1 e 2 completas, nas 16 telas do mapa:
- **App independente** `primeiro-contrato/`:
  - Vite, React e TypeScript nas mesmas versões da `carreira-v2`;
  - build versionado em `public/primeiro-contrato/`;
  - rota `/primeiro-contrato` no `server.js` (index da raiz do app; asset
    inexistente é 404, como na v2);
  - não importa nada do Modo Técnico: nem estado global, nem sessão, nem
    `public/js/motor`.
- **Fundação:**
  - tokens e fontes originais do pacote (WOFF2 locais, OFL);
  - símbolo T original (`marca-t.webp`, o mesmo da v2) como único elemento do
    header.
- **Catálogo:**
  - importador `scripts/importar-catalogo.mjs`, com validação de duplicata,
    país, liga e inscrição órfã;
  - snapshot imutável por versão (`public/primeiro-contrato/catalogo/2026.11-1.json`)
    e ponteiro `ativo.json`. Uma versão já publicada não é sobrescrita;
  - escudo por ID: a cópia local do BRDATA (`LOCAL_CREST_BY_ID`, ESCUDOS-001)
    tem precedência sobre a URL externa do índice. Com isso, 0 escudos externos
    e 725 locais;
  - os 70 clubes sem ativo caem nas iniciais;
  - busca sem acento por nome e sigla, também antes dos filtros;
  - filtros de país (agrupados por continente) e de liga;
  - três sugestões com papéis diferentes;
  - lista paginada de 40 em 40, com volta à posição anterior da lista.
- **Motor puro** (`src/engine/`, sem DOM, determinístico por semente):
  - atleta com perfis próprios de goleiro e de linha;
  - concorrentes fictícios persistidos, marcados como simulados e calibrados
    pela força do clube (nível da liga ± perfil de ataque e defesa do
    catálogo);
  - previsão de minutos em intervalo;
  - simulação jogo a jogo, limitada às rodadas da liga. Sem formato
    verificado (14 das 34 ligas), a temporada é "simplificada", identificada
    na tela, sem classificação nem título;
  - métricas por posição: gols, assistências, desarmes e jogos sem sofrer gol;
  - evolução por idade e minutos, com pico e declínio (goleiro mais tarde);
  - eventos tipados (id, prioridade, chave de repetição, condição, opções,
    efeitos, texto da consequência): adaptação, volta antes da hora, perda de
    espaço e primeira convocação;
  - janela com renovação, transferência (taxa dentro da capacidade do
    comprador), empréstimo (só com vaga e orçamento no destino), compra
    depois do empréstimo e agente livre;
  - empréstimo com origem e destino separados, retorno automático e passagem
    preservada;
  - aposentadoria só com confirmação: opcional a partir dos 33 anos,
    obrigatória aos 40.
- **Save** em IndexedDB (localStorage e memória como reserva):
  - versão de esquema, versão do catálogo e migração explícita v0 → v1;
  - uma única transação por avanço ou decisão;
  - a decisão pendente volta igual depois de recarregar;
  - repetir a resposta não aplica o efeito de novo.
- **Cartão de legado:** PNG de 1080×1350, com compartilhamento nativo quando o
  aparelho aceita arquivo e download como alternativa.

Testes:
- motor e importador: `npm test` em `primeiro-contrato/`, 18/18:
  - determinismo;
  - decisões divergentes;
  - pendência após recarregar;
  - efeito único;
  - empréstimo com retorno;
  - aposentadoria;
  - calendário;
  - métricas por posição;
  - convocação única;
  - migração;
  - catálogo e escudos;
- E2E novo `tests/e2e/test_primeiro_contrato.js`, PASS:
  - rota e catálogo;
  - 404 de asset;
  - header só com o T;
  - famílias e pesos computados;
  - 11 posições com seleção única;
  - busca sem acento;
  - contrato;
  - decisão;
  - retomada depois de recarregar;
- rota rápida 65/65;
- suíte completa: ver abaixo;
- `verificar-tela-antiga`: OK;
- typecheck limpo;
- balanceamento em 200 carreiras automáticas:
  - fim mediano aos 35 anos;
  - cerca de 500 jogos (p25 de 473, p75 de 521);
  - nível de pico mediano de 76;
  - 35% de convocados;
  - 83% com empréstimo, com uma política de decisões que força empréstimos.

Evidência (`docs/primeiro-contrato/evidencia/`):
- as 4 pranchas com as 4 telas reais a 390 px embaixo
  (`*_comparacao.jpg`);
- as 16 telas a 360 px com nome longo (`360/`);
- os estados selecionados (lima + Confirmar) e o detalhe da convocação
  (`estado_*.jpg`);
- o cartão exportado (`cartao_legado.jpg`).

As 16 telas foram alcançadas jogando pela interface (Playwright), sem erro de
console. Famílias computadas depois de `document.fonts.ready`:
- título: Barlow Condensed 700;
- CTA: Barlow Condensed 600;
- apoio e campos: Barlow 400;
- rótulos: Barlow 500.

A navegação só por teclado foi exercitada: foco visível e setas no campo de
posições.

Divergências visuais para aprovação do Murilo:
1. **Fotos ausentes no pacote** (`fundos/` só tem 4):
   - lesão, banco, convocação na escada e camisa 9 de costas: usei o
     02_estadio e o 01_tunel;
   - retrato do cartão de legado: usei o 04_despedida.
2. **Camisa de "Seu jogador":** é vetorial, com número dinâmico, no lugar da
   foto.
3. **Confirmação:** nas telas de decisão, a resposta escolhida fica lima e
   surge o CTA "Confirmar", conforme a regra "Decisões" do briefing. As
   pranchas mostram a ênfase direto na opção.
4. **Textos dependentes do dado:**
   - "O clássico é domingo" virou "O próximo jogo é contra {adversário da
     liga}";
   - "Tentar jogar o clássico" virou "Tentar jogar o próximo jogo";
   - "Duas propostas chegaram" conta as propostas reais.
5. **Elementos de apoio a mais:**
   - em "Escolha seu clube": os grupos "Sugestões para você" e "Todos os
     clubes · temporada 2026", e a linha do catálogo (versão e fonte);
   - linha de jogo/temporada simplificada em "Sua temporada";
   - fato explicativo e aviso de simulação no balanço (PROJETO.md: "um fato
     que explique o resultado");
   - linha "Interesse" na comparação (PROJETO.md: "exibir motivos do
     interesse");
   - nota "estimativas" na janela;
   - consequência da decisão em "Sua temporada".
6. **Título do balanço** conforme o resultado:
   - "Você ganhou espaço";
   - "Temporada de afirmação";
   - "Temporada de pouco espaço";
   - "Temporada interrompida".
7. **Métrica principal** por posição: o meia mostra assistências, enquanto a
   prancha mostra gols com MEI selecionado. A regra 3 do PROJETO.md prevalece
   sobre o exemplo.
8. **Liga com o nome canônico do catálogo** ("Brasileirão Série B"), em vez do
   curto da prancha ("Série B").
9. **Trajetória e comparação:** escudos por ID no lugar das letras.

Gaps e riscos:
- capturas no Chromium (emulação de 390 px), sem Safari iOS real: falta a
  validação em iPhone (safe areas via `env()`; zoom não bloqueado);
- "marcar interesse" em clubes durante a carreira está no motor
  (`clubesDeInteresse` aumenta a chance de proposta), mas ainda sem tela;
- métricas de produto (início, conclusão, compartilhamento) ficaram fora,
  conforme o escopo;
- a primeira convocação depende do nível (exigência de 70 a 79 pela tradição
  da seleção), e 65% das carreiras não chegam lá.

Commit: o commit do código foi barrado nesta sessão, de acordo com a regra de
governança "sem commit de código antes da aprovação". Nesta branch estão só o
handoff, o pacote e a evidência. O código está na área de trabalho do
container (efêmera) e precisa ser commitado assim que o Murilo autorizar.

Recomendação: aprovar a fundação e o motor, e decidir as divergências 1 a 9
(principalmente as fotos que faltam).

⸻

MERCADO-001 — Implementação do mercado e da economia (Touchline)

Status: PAUSADO (Murilo, 26/11/2026) depois da etapa 2 mesclada (#172), para
priorizar o PC-001. Próximo ao retomar: etapa 3. Histórico abaixo.
Status anterior: EM IMPLEMENTAÇÃO — etapa 1 (valor de mercado inicial por atleta),
branch `claude/mercado-e1-valor`. Pedido do Murilo (25/11/2026): "Faça o
merge e a seguir execute o md" (handoff em `docs/economia/04_Handoff_Mercado.md`).
Base: `main` em ba1a580 (#170).

Relatório da etapa 1, valor de mercado (25/11/2026)

O que foi feito (economia versão 4, só carreiras novas; as versões 2 e 3
seguem lidas como eram):
- catálogo `REFERENCIA_OV75` (EUR, overall 75, 24–28 anos) para as 23
  ligas jogáveis:
  - os 11 valores da tabela do handoff como "estimado";
  - os demais "imputados" por mercado comparável;
  - perfis de fallback explícitos: Série D, clube fictício das copas,
    andinos e 5º pacote da UEFA;
- `valorDeMercado` = referência da liga × qualidade(overall, interpolada) ×
  idade e potencial (goleiro com as faixas 2 anos depois), em R$ pelo câmbio
  fixo e arredondado uma vez;
- o valor nasce no save com `valorInicial` e o fator individual, na criação
  da carreira e em todo atleta gerado depois (base, olheiro, reposição e
  promoção da CPU). Liga do clube detentor; o livre, pela liga do último
  clube; o fictício, pelo fallback;
- na abertura de cada janela, o valor corrente segue a evolução e a idade
  (valor anterior × fator atual ÷ anterior), uma vez por janela. Minutos e
  desempenho ficam neutros até a calibração em simulação;
- demanda entre países pela razão das referências.

Sem avaliação individual nos catálogos: os pacotes do mundo só têm o valor
do elenco inteiro (`squadMarketValueEur`), usado aqui como conferência.

Calibração: com a tabela do handoff, os elencos ficam entre 0,42× e 0,68×
do valor do Transfermarkt (Premier League 0,42; LaLiga 0,68). A fonte do
mundo comprime os overalls no topo (máximo 78 na Premier League), então os
craques ficam baratos (topo da Premier League: € 26,8 mi). Proposta de
ajuste para a próxima etapa: deslocamento do overall do mundo ou faixas.

Testes: `test_economia_mercado` 8/8 (caso 4 novo: os 4 valores da tabela,
interpolação, goleiro, livre, fictício e a janela uma vez).

Etapa 1 mesclada (#171).

Relatório da etapa 2, caixa, folha, parcelas, pedidas e avaliação (25/11/2026)

Branch `claude/mercado-e2-financas`, base 37dae8d (#171). Economia versão 5
(carreiras novas; as anteriores seguem lidas como eram).

O que foi feito:
- teto de folha pela faixa do handoff:
  - 60% do custo do elenco, convertido à folha-base pela razão do catálogo
    (folha-base ÷ custo salarial ≈ 0,62–0,65), cerca de 39% da receita;
  - folga de abertura de 10% sobre a folha de quem abre a temporada acima
    (14 de 24 clubes da Championship);
  - sem a conversão, o espaço não usado virava lucro (R$ 1,3 bi/ano no
    Arsenal);
- despesas operacionais calculadas com a folha no teto: o resultado da base
  vale quando o clube usa todo o orçamento de folha;
- `avaliarOperacao`, a mesma para o técnico e para a CPU:
  - espaço de entrada: caixa − 1 mês de despesas essenciais − entradas
    prometidas;
  - espaço para parcelas por mês: o resultado com a folha no teto, no
    mínimo 4% da receita, menos as parcelas assumidas;
  - espaço de folha: teto − folha − salários prometidos;
  - orçamento da temporada: o da base − o gasto + as vendas da temporada;
  - projeção do caixa mês a mês, com os recebíveis firmes no mês;
  - motivo e valor que falta;
- a CPU usa o próprio estado: caixa guardado, folha, teto pela faixa e a
  receita/resultado do clube gravados no save;
- compra parcelada por mês (entrada + saldo em até 24 meses):
  - proposta e prévia com `termos.entrada` e `termos.meses`;
  - uma parcela por mês no fechamento do mês, e o vendedor da CPU recebe
    cada uma;
  - extrato e orçamento registrados;
- pedidas do vendedor pelas faixas do handoff (`mercado.pedidaV5`):
  - jovem: 80% a 130%;
  - titular com contrato longo: 130% a 180%;
  - titular sem reposição e sem cobertura: não é negociado;
  - titular em fim de contrato: 100% a 130%;
  - rotação: 100% a 110%;
  - reserva: 80% a 90%;
  - fim de janela e caixa apertado do vendedor.

Testes:
- `tests/unit/test_mercado_etapa2.js` 5/5. Inclui o aceite "janela de um
  clube pequeno" com os valores exatos (R$ 1,2 mi / 70 mil / 130 mil ->
  R$ 300 mil / 7,5 mil / 25 mil);
- `test_economia_mercado` 8/8; `test_motor_mer_integracao` 10/10 (o
  orçamento da temporada junto com o caixa do teste);
- `test_motor_serie_d` 9/9;
- rota rápida 65/65.

Riscos e pendências:
- save da Série D em 10 temporadas: 753 KB (limite 768 KB). Os campos por
  atleta foram enxugados: o `fatorValor` marca o atleta escalado, sem o
  `escalaEco`;
- a oferta parcelada por mês ainda não está na tela (etapa 4). A tela de
  hoje continua com as parcelas por rodada (1 a 4), que contam como
  entrada;
- catálogo salarial por divisão e papel, agente livre, empréstimos e
  percentual de revenda: etapa 3.

Próximo: etapa 3 (compra definitiva, agente livre e empréstimos;
persistência e idempotência).

⸻

ECON-001 — Recalibração da economia do Modo Carreira (Touchline)

Status: Entrega 1 mesclada (#167, 25/11/2026). EM IMPLEMENTAÇÃO — Entrega 2
(mercado), branch `claude/economia-e2`. Pedido do Murilo (25/11/2026): "execute esse md"
(proposta em `docs/economia/00_Proposta.md`), com o merge na main
autorizado depois do commit. Especificação e decisões de PM em
`docs/economia/01_Especificacao.md`: escala real em R$, só carreiras novas
(versão da regra no save), ativação junto com os preços na Entrega 2.

Relatório da Entrega 1, base financeira (25/11/2026)

Base: `main` em c86ae26. O jogo não muda nesta entrega: o módulo ainda não
é chamado pela carreira. Ele entra nas carreiras novas junto com os preços
(Entrega 2), com a versão da regra no save.

O que foi feito:
- `public/js/motor/economia.js` (+ `.d.ts`), módulo puro:
  - catálogo versionado (`VERSAO_ECONOMIA = 2`, período 2024/25–2025/26)
    com perfil para as 23 ligas jogáveis; todo número tem item, valor,
    moeda, período, tipo (publicado, estimado ou imputado), confiança e
    fonte;
  - `economiaDaLiga`: receita recorrente (TV, comercial, jogo), folha-base,
    despesas, resultado, caixa inicial e orçamento de transferências de
    cada clube. Distribuição por lei de potência na posição financeira,
    ajustada à concentração da liga. As âncoras da proposta (Flamengo,
    Palmeiras, Bahia, Mirassol, Arsenal, River, Peñarol) entram exatas e o
    resto é reescalado para manter o total da liga;
  - `economiaNaVirada`: subir e cair (rebaixado da Premier League com a
    transição de 3 anos; caixa e obrigações seguem com o clube);
  - `capacidadeDeCompra`: o mínimo entre orçamento, caixa para o pagamento
    imediato (com 1 mês de folha de reserva), parcelas futuras (caixa
    projetado mês a mês, recebível só no mês em que entra) e espaço de
    folha, com o motivo do bloqueio.
- Quadro por perfil e tabela de fontes: `docs/economia/02_Quadro_E1.md`
  (gerado por `node tests/sim/economia_quadro.js`).

Decisões:
- resultado operacional limitado por margem por região (Europa 3%, Brasil
  5%, América do Sul 0%; Championship −10% no jogo, porque os −46% da
  Deloitte são cobertos por aportes de donos);
- receita anual e caixa inicial são grandezas separadas (caixa = 8% da
  receita);
- no Brasil a folha segue uma curva de potência calibrada nas âncoras de
  folha (Flamengo 37,5 mi/mês, Mirassol 6 mi/mês).

Testes: `tests/unit/test_economia_base.js` 6/6 (catálogo, liga, ordens de
grandeza, virada, capacidade, pureza).

Próximo: Entrega 2 (valor, reserva e salário dos atletas na mesma escala;
CPU e técnico pela mesma regra; ativação para carreiras novas).

Relatório da Entrega 2, mercado (25/11/2026)

Base: `main` em e7fe17f (#167). Detalhe, antes × depois e negócios de
referência em `docs/economia/03_Mercado_E2.md` (gerado por
`node tests/sim/economia_mercado.js`).

O que foi feito:
- economia v2 ativada nas carreiras novas (Brasil e mundo; também na troca
  de país de quem já está nela): `CAREER.economia` com versão, escalas por
  clube, escala de valor por liga e fluxos do clube do técnico. Save sem o
  campo segue a regra de antes, sem migração;
- salário e valor: a regra de sempre (overall, idade, potencial) com a
  escala:
  - salário: a da liga (soma das folhas = soma das folhas-base) × o porte
    do clube^0,4;
  - valor: média geométrica do clube e da liga;
  - todos os contratos do save escalados uma vez; contratos gerados depois
    (base, prospecto, reposição e renovação da CPU) já na escala do clube;
  - salário justo (moral, agente livre, "à venda") na escala do clube;
- demanda entre países: comprador de mercado mais caro paga parte da
  diferença de preço na reserva do vendedor (técnico e CPU). No mercado
  doméstico, o preço parte do valor exibido;
- mesma capacidade de compra para o técnico e a CPU
  (`economia.capacidadeNoJogo`): pagamento inicial com 1 mês de folha de
  reserva, teto, e parcelas sem caixa negativo. O técnico recebe o motivo
  na proposta, na prévia e na conclusão;
- finanças do clube do técnico pela base:
  - caixa inicial;
  - TV e despesas operacionais por mês (despesas fecham a margem com a
    folha real; lançamento "Despesas operacionais");
  - patrocínio e bilheteria na escala comercial e de dia de jogo;
  - virada pela divisão nova (rebaixado à Championship com a transição de
    3 anos) e troca de clube pelos fluxos do clube novo;
- CPU: caixa inicial da base e volta ao caixa da base na virada.

Decisões:
- folha real pelos contratos (±30% da folha-base), e não igual a ela. Com a
  escala exata por clube, um clube da Championship pagava mais que o
  Arsenal pelo mesmo atleta;
- parâmetros imputados e exportados: porte salarial 0,4, expoente de valor
  1,0, demanda (expoente 0,5, teto 3).

Testes:
- `tests/unit/test_economia_mercado.js` 6/6;
- `test_economia_base` 6/6;
- `test_motor_mundo_carreira` 14/14;
- testes de equivalência com a cópia congelada (`test_motor_carga`,
  `test_motor_virada`) com a v2 desligada, como as outras chaves de
  paridade.
- testes da regra da CPU de antes (`test_paridade_financas`,
  `test_paridade_mercado`) com a v2 desligada (a regra dos saves de hoje);
  testes do mercado (`test_transfer_ai_*`, `test_mercado_negociacao`,
  `test_historico_negociacoes`) com alvos e valores na escala nova;
- suíte completa local: 204/204.

Save: carreira nova no Arsenal com 547 KB de JSON e 61 KB em gzip (sem a
v2: 530 KB e 57 KB). O campo `economia` tem cerca de 2 KB.

Casos não confirmados:
- grande português: Portugal não está nas 20 ligas do mundo;
- distribuição das transferências feitas por temporada (FIFA): na
  simulação de 5 temporadas (Entrega 3);
- valores do Brasil medidos no modo exemplo (elencos fictícios);
- custos fixos de antes em R$ (obras do estádio, prêmios da liga, recompensas
  da loja) ficam pequenos para clubes grandes. Fica para a Entrega 3.

Ajuste das divisões de baixo (25/11/2026)

Relato do Murilo: "A parte financeira ficou inviável para os times da Série
C. Com esse orçamento o clube não consegue contratar nenhum jogador".

Medição: em todas as ligas, o atleta mediano valia de 1 a 3,4 vezes o caixa
inicial inteiro do clube mediano. Duas causas:
- preço fora da escala da receita nas divisões de baixo: a curva de sempre
  dava 17% a 27% da receita anual do clube mediano, contra ~9% nas de topo;
- caixa inicial de 8% da receita (~1 mês), quase todo tomado pela reserva de
  1 mês de folha.

Correção:
- escala de valor por liga, com o atleta mediano em 9% da receita do clube
  mediano (`PRECO_SOBRE_RECEITA`) e o porte do vendedor pela raiz;
- caixa inicial de 15% da receita (~2 meses).

Resultado:
- em todas as 23 ligas, atleta mediano ≈ 60% do caixa do clube mediano;
- Série C (modo exemplo, compra em 4 parcelas):
  - mais pobre: 241 de 456 atletas da divisão ao alcance;
  - mediano: 327;
  - mais rico: 451.

Teste novo: caso 6 de `test_economia_mercado`.

Revisão de todos os orçamentos: nivelamento mundial (25/11/2026)

Relato do Murilo: "Os jogadores da Série A do Brasil estão mais caros que os
da Premier League. Esse nivelamento de orçamentos em todo o mundo precisa de
uma regra bem feita".

Medição com o catálogo real (perfil congelado, como em produção):
- a receita e a folha-base dos clubes estavam certas (Flamengo R$ 2,09 bi,
  Arsenal R$ 4,44 bi). O defeito estava no preço e no salário dos atletas;
- craque do Flamengo (overall 84): R$ 848 mi. Maior salário do Flamengo:
  R$ 9,9 mi/mês;
- os overalls do Brasil vêm de outra fonte, mais larga (mediana 67, topo 84;
  Premier League do mundo: 71 e 78), e a curva de sempre é exponencial no
  overall. O fator linear por liga mantinha esse formato.

Regra nova (economia versão 3, carreiras novas; a versão 2 segue lida):
- o nível vem do dinheiro e o formato da posição relativa na liga
  (log-normal comum);
- o valor estica ou comprime; o salário só comprime;
- a ordem é garantida:
  - na liga, o clube mais rico nunca paga menos pela mesma qualidade;
  - entre divisões, o clube de baixo não paga mais que o vizinho de cima
    em receita;
- o preço mediano é 3% da receita média dos clubes da liga.
Detalhe em `docs/economia/03_Mercado_E2.md`.

Resultado (catálogo real, R$):

| | Brasil | Premier League | LaLiga |
|---|---:|---:|---:|
| Atleta mediano | 16,5 mi | 71 mi | 37 mi |
| Topo | 274 mi | 487 mi | 303 mi |
| Overall 75 | 59 mi | 205 mi | 124 mi |

- maior salário do Flamengo: R$ 5,4 mi/mês;
- folha do Flamengo: R$ 41,6 mi/mês (base R$ 37,5 mi);
- Série C: o clube mais pobre alcança 399 de 456 atletas da divisão.

Testes: `test_economia_mercado` 8/8 (caso 7 novo: Brasil, no modo exemplo,
abaixo da Premier League no topo, na mediana e no maior salário; ordem no
país).

Próximo: Entrega 3 (interface "Paga agora / Custo mensal / Caixa após",
motivos na tela, Finanças com espaço de folha e parcelas, simulação de 5
temporadas, desempenho e save, compatibilidade de saves).

⸻

TOUCHLINE-001 — Nova marca do jogo (25/11/2026)

Pedido do Murilo: "Substitua a marca BRData por Touchline. Esse é o novo
nome do jogo. Aplique em todos os lugares que requerem logomarca", com o
ícone do app e a logo completa ("Touchline — Modo Carreira").

Escopo aplicado: o jogo (Modo Carreira, v2). O site do Brasileirão (BR
Data: `index.html`, `manifest.json` e os ícones dele) não muda; o teste
do PWA confere isso. A tela antiga da carreira está congelada (CLAUDE.md,
seção 0).

O que mudou:
- `public/img/touchline/`: ícones do app (16, 32, 48, 180, 192, 512 e os
  maskable), a logo completa (`logo-completa.webp`) e o "T" com fundo
  transparente (`marca-t.webp`), feitos a partir das imagens enviadas;
- v2:
  - cabeçalho com o "T" e o nome TOUCHLINE (`Wordmark`);
  - logo completa na abertura, no login e na escolha do novo save;
  - título "Touchline · Modo Carreira" e ícones da página;
  - textos de compartilhar e do arquivo exportado;
- manifesto do app (`manifest-treinador.json`): nome "Touchline — Modo
  Carreira", nome curto "Touchline", descrição e ícones. O `id` fica o
  mesmo, para quem já instalou não ganhar um 2º ícone;
- service worker com os arquivos da marca; histórico de atualizações.

Não mudou: nomes internos do código (BRDATA_*, pastas, repositório), as
cores do DS e o site do Brasileirão.

Ajuste (25/11/2026, pedido do Murilo: "Remova o texto touchline das
aplicações da marca e deixe apenas o 'T' com exceção da tela de login"):
o cabeçalho (`Wordmark`), a abertura e a escolha do novo save mostram só o
"T"; a logo completa (com TOUCHLINE e "Modo Carreira") fica só no login. O
nome continua no texto alternativo (leitor de tela), no título da página, no
manifesto do app e no rodapé das imagens de compartilhar (texto, não logo).

⸻

MUNDO-001 — Ligas da Europa e da América do Sul, em paralelo, com continentais

Status: M1 a M9 APROVADAS e mescladas (Murilo: #154 mesclado por ele;
#155 a #157 com "Vamos fazer os merges pendentes?", 24/11/2026; #158 com
"158 aprovado" e #159 com "Aprovado", 25/11/2026). M10a e M10b
aprovadas e mescladas (#160 e #161, "Aprovado", 25/11/2026). M10c aprovada e
mesclada (#162 e #163). M10d (liberação) aprovada e mesclada (#164, "Faça o merge completo com
a main", 25/11/2026). M11 (validação final) feita, mesclada pelo mesmo
pedido.
- Etapas M1 a M6a: PR #154 (suíte completa 191/191), mesclado.
- M6b, passos 1 a 4: PR #155, empilhado sobre o #154 (suíte completa
  191/192; a falha, instável e sem relação com o mundo, está no PR).
- M6b, passo 5 (o Brasil no mundo): PR #156, empilhado sobre o #155
  (suíte completa 192/192).
- M7, moeda e porte: PR #157, empilhado sobre o #156 (suíte completa
  192/192).
- M8, mercado e carreira do técnico no mundo: branch `claude/mundo-m8`,
  empilhada sobre o #157.

Relatório da M8a, mercado do mundo (24/11/2026)

O que foi feito (`carreiramundo.js`):
- `clubesDoMundo(CAREER, filtro)`: os clubes dos outros países (as 20 ligas
  e o Brasil), sem os do país do técnico e sem o catálogo de 3ª. Filtros
  por país, liga e nome.
- `abrirClubeDoMundo(CAREER, id)`: o clube entra no save quando o técnico o
  abre no mercado. O time vai para `CAREER.exterior.clubes` e o elenco para
  `CAREER.leagueSquads`, montado do pacote pelo construtor de sempre
  (`virada.buildLeagueSquad`), com o ajuste de nível da liga em que o clube
  está agora e a idade avançada pelos anos do save.
  - A partir daí, proposta, negociação, venda, empréstimo e a CPU do país
    usam as regras de hoje, sem regra nova.
  - O estado (`timePorId`) e o mercado (`marketTeamsPool`) passam a
    enxergar os clubes de fora. Isso também libera a CPU do país a comprar
    deles e a vender para eles (MUN-10).
- `podarExterior` na virada: sai do save o clube de fora sem vínculo com o
  técnico (atleta que veio do save, proposta, parcela ou empréstimo). Os
  atletas do pacote que saíram dele ficam anotados em
  `CAREER.exterior.saidas` e não reaparecem quando ele é aberto de novo.
- Servidor: a rota `/api/career/mundo/elencos/<liga>` também serve as 3
  divisões do Brasil.
- Defeito achado na medição e corrigido: os jovens da base da CPU
  (`basecpu_`) contavam como vínculo, e nenhum clube de fora saía do save.

Testes:
- `test_motor_mundo_carreira` 13/13. Caso novo: no Arsenal, a lista do
  mundo (300+ clubes, sem ingleses, com o Brasil); o Real Madrid no save;
  contratação de um atleta dele pelas regras de hoje; poda na virada; o
  atleta não reaparece.
- Fora da suíte: 2 temporadas na Premier League com 7 clubes de fora
  abertos (Barcelona, Lyon, Talleres, Bragantino...). A CPU inglesa negociou
  com eles. Ficaram no save só os 3 que receberam atletas do país do
  técnico; o save foi a 840 KB de JSON.
- Testes do motor: 39/39. Rota rápida: 54/54. Testes da v2: 47/47.

Limites desta etapa:
- os clubes de fora entram com o limite de elenco de "outra divisão" (16
  atletas), como as outras divisões no Brasil;
- a CPU de países no mundo leve não negocia entre si (não tem elencos);
- a tela do mercado do mundo vem com as telas (M10).

Relatório da M8b, propostas de emprego de outros países (24/11/2026)

O que foi feito (`carreiramundo.js`):
- `propostaDeFora`, chamada no fim da virada quando não há proposta da
  própria liga (gancho `ganchosMundo.propostaDeFora`). Um clube de outro
  país pode chamar o técnico:
  - prestígio exigido pelo nível da liga do clube e pela força dele nela,
    contra a reputação do técnico;
  - sorteio entre os 5 mais exigentes que ele alcança.
  - Só países com o mesmo tipo de calendário (Europa com Europa; América
    do Sul e Brasil com América do Sul) e cuja temporada nova ainda não
    começou: a troca cai entre temporadas dos dois lados.
  - O Brasil, que tem caminho próprio na carreira, não entra como destino
    nesta etapa.
- Aceitar (`ponte.aceitarPropostaClube`, por `trocarDePais`):
  - a carreira continua no clube novo, no mesmo mundo, com reputação e
    histórico herdados;
  - o país novo sai do mundo leve com a composição de agora (inclusive
    clubes que subiram do catálogo, com a força guardada);
  - o país antigo volta ao mundo leve com a composição da virada;
  - saindo do Brasil, a entrada do Brasil no mundo leve recebe a
    composição e a temporada da carreira.
- `criarCarreiraNoMundo` aceita a composição do mundo leve (`mundoLeve`)
  além da do pacote. Nova função `timeDoMundo`.

Defeito achado e corrigido (vinha da M6b): na Argentina, da 2ª temporada
em diante, o calendário do técnico lia as zonas no lugar errado
(`CAREER.mundo.zonas` em vez da entrada do país no mundo leve), e clubes
recém-promovidos podiam ficar sem jogo. Agora a Liga Profesional tem 30
clubes com 32 jogos e a Primera Nacional 36 com 36, conferido no teste.

Testes:
- `test_motor_mundo_carreira` 14/14. Caso novo: o técnico do Arsenal
  aceita um clube de outro país europeu e joga 8 rodadas lá; a Inglaterra
  segue jogando no mundo leve.
- O caso da Argentina passou a checar a temporada nova. A 1ª versão da
  checagem supunha a Liga Profesional e falhou quando o clube caiu para a
  Primera Nacional; corrigido.
- Fora da suíte: saída do Brasil para o Equador.
- Testes do motor: 39/39. Testes da v2: 47/47.

Limites (propostas para o Murilo):
1. Troca entre hemisférios (Europa ↔ América do Sul/Brasil): cairia no
   meio da temporada do destino. Ideia para depois: a proposta vale "a
   partir da próxima temporada" do destino, com o técnico terminando a sua.
2. O Brasil como destino de um técnico que está fora dele.

Relatório da M11, validação final (25/11/2026)

O que foi validado:
1. Teste rápido das 20 ligas (`test_mundo_validacao_europa` e
   `_america`, 10/10 cada, ~7 s por região).
   - Para cada liga: carreira nova no clube mais forte e a temporada
     inteira pelo relógio (mundo leve, CONMEBOL e UEFA).
   - Resultado:

     | Medida | Faixa |
     |---|---|
     | Semana do mundo | 8–15 ms |
     | Criação da carreira | 26–208 ms |
     | Save (JSON) | 475–953 KB |
     | Save (gzip) | 57–95 KB |
     | Erros nas copas | nenhum |

2. Pior caso jogado de verdade (`test_mundo_validacao_temporadas`, 3/3):
   - Primera Nacional argentina (66 elencos no save, o maior país), duas
     temporadas inteiras pela ponte e duas viradas;
   - 159 gravações; maior save 1.199 KB de JSON e 142 KB comprimido;
   - depois das viradas: 1.046 KB e depois 1.048 KB (estável).
3. Limite do envio sem compressão:
   - o navegador sem CompressionStream (Safari < 16.4, Firefox < 113)
     manda o save em JSON cru, e o pior caso passava de 1 MB. O jogador não
     conseguiria salvar;
   - o PUT da carreira sem gzip agora aceita até 3 MB (`server/server.js`,
     `CAREER_BODY_RAW_MAX`);
   - o careerStore continua com o limite de 768 KB comprimido; as outras
     rotas seguem com 1 MB;
   - teste e2e `test_save_mundo_cru` (3/3).
4. Suíte completa com o mundo ligado (na M10d): 198/198.

Resumo: o mundo cabe nos limites com folga no comprimido (142 de 768 KB) e
roda em ~10 ms por semana no Node. O ponto de atenção é o JSON cru (1,2
MB), que pesa no armazenamento do aparelho e no envio sem gzip: hoje 79%
dele são os elencos da CPU (`leagueSquads`). Se algum dia for preciso
reduzir, o caminho é guardar os elencos do pacote como diferença (planejado
na M6, "delta por atleta").

Relatório da M10d, liberação (25/11/2026)

O que foi feito:
- Servidor: o mundo fica ligado por padrão (`server/src/mundo.js`).
  `MUNDO_ATIVO=false` no `server/.env` desliga as rotas (chave de
  emergência).
- Índice offline (`public/js/motor/repositorio.js`):
  - o aparelho guarda o índice do mundo (versionado: a rota responde
    "atual" quando não mudou);
  - guarda os elencos de cada liga na 1ª vez que o jogo pede, na versão do
    índice;
  - um save do mundo abre sem rede.
- v2 (`public/js/motor/v2.js`):
  - o motor recebe `indiceDoMundo` e `elencosDoMundo` (com IndexedDB, pela
    cópia do aparelho; sem ele, direto do servidor);
  - servidor desligado e sem cópia: sem mundo, como antes.
- O que muda para o jogador quando o PR for mesclado e implantado:
  - o novo save oferece os 10 países;
  - todo save novo do Brasil nasce com o mundo em paralelo (Libertadores,
    Sul-Americana, mercado e propostas de fora);
  - saves que já existem continuam como estão (D4).

Correções que a suíte completa com o mundo ligado mostrou:
- Um erro nas copas nunca trava a carreira: o relógio das copas é isolado
  e a edição com erro é encerrada (antes, uma exceção no sorteio subia até
  o fim da partida do técnico).
- Sorteio da fase de liga da UEFA:
  - busca pelo clube com menos opções;
  - o par de potes que travou é repetido antes de recomeçar;
  - com muitos clubes de poucas associações (vaga extra e titular), o
    limite de 2 adversários de outra associação quase não tem solução.
    Depois de 15 tentativas ele sobe para 3 (regra de jogo, com a mesma
    associação continua vedado). Pior caso medido: ~0,3 s.
- CONMEBOL: a edição é montada até o começo dos grupos. Um save do Brasil
  começa depois da fase 1 e ficava sem a Libertadores do 1º ano.
- O jogo continental não trava a semana. A v2 o oferece antes (CTA do
  Início), e o "avançar até o jogo" da v2 para nele. Os chamadores antigos
  da ponte avançam, e o jogo é simulado.
- Testes atualizados para o mundo ligado:
  - a API de mentira do teste do hospedeiro responde "mundo desligado";
  - a aba Jogos ganha "Ligas do mundo";
  - os chips de país têm alvo de 44 px;
  - teste novo `test_v2_mundo` (seletor, save na Argentina, índice no
    aparelho, abertura sem rede, ligas do mundo).

Pendente (bloqueado nesta sessão): escudos locais dos 60 clubes andinos e
dos 84 do 5º pacote. Os pacotes trazem só o link da fotmob, e o download
está bloqueado na rede desta sessão. As telas mostram o escudo remoto e,
sem rede, o monograma do clube.

Relatório da M10c (parte 3), ligas do mundo, calendário e mercado (25/11/2026)

O que foi feito (MUN-15):
- Ligas do mundo:
  - motor: `ligasDoMundoNoSave` (em `copasvista.js`) dá, para cada liga do
    mundo leve, a tabela da fase em andamento (por zona quando há), os
    últimos resultados e os campeões; numa temporada nova sem jogo, a
    classificação final da anterior;
  - v2: `/carreira/mundo` (aba Jogos → "Ligas do mundo"), com seletor de
    país e liga.
- Calendário com mais de um compromisso por semana: os jogos do técnico
  nas copas continentais entram no calendário da v2, com data, dia, fase
  (grupo, rodada da fase de liga, ida/volta) e placar; o ano de cada
  semana vem do save do mundo.
- Mercado do mundo:
  - motor: `clubesDoMundo` (filtros de país e liga) e `abrirClubeDoMundo`
    (traz o clube ao save, grava), ligando a M8a às telas;
  - v2: `/carreira/mercado/mundo` (Mercado → "Clubes de outros países"),
    com chips de país e liga e busca; abrir um clube leva ao elenco dele,
    de onde sai a proposta pelo fluxo de sempre;
  - os clubes de fora que entram no save passam a ter nome e escudo nas
    telas (o catálogo de times é refeito ao recarregar a carreira).

Testes:
- `test_motor_novo_save_mundo` 3/3, com as ligas do mundo e o mercado do
  mundo pela ponte (Real Madrid trazido ao save e gravado);
- v2 148/148 (novo: jogos continentais no calendário); typecheck.

Limite: o clube de fora continua com 16 atletas (limite de "outra
divisão", da M8).

Relatório da M10c (partes 1 e 2), novo save no mundo e tela das copas (25/11/2026)

A M10c ficou em três partes:
- 1: o novo save no mundo e a v2 sem supor o Brasil;
- 2: a tela das copas continentais;
- 3: ligas do mundo, calendário com mais de um compromisso por semana e
  filtros do mercado.

Parte 1, novo save no mundo (MUN-14):
- Motor:
  - `competicoesDoMundo` devolve os 10 países com as 2 divisões (null sem
    o mundo);
  - `escolherCompeticao` de uma liga do mundo devolve os clubes do índice
    (carrega o índice se a página foi recarregada);
  - `criarCarreira` cria a carreira no país e grava;
  - o save guarda os nomes das ligas (`nomesDasLigas`).
- v2, seletor do novo save:
  - com o mundo ligado, o país vem antes (Brasil primeiro, em chips com
    rolagem horizontal), depois a divisão e o clube;
  - sem o mundo, só o Brasil, como sempre.
- v2 sem supor o Brasil:
  - rodadas da liga (`rodadasLiga`: 32 na Argentina, 46 na Championship) no
    Início, Temporada, Tabela, Semana, Calendário e Mais;
  - nome das ligas do save;
  - seletor de divisão da tabela com as 2 divisões do país;
  - ano de cada semana no dia do jogo;
  - sem a Copa do Brasil na aba Jogos do save do mundo.

Parte 2, tela das copas continentais (MUN-15):
- Motor (`copasvista.js`, comando `copasContinentais`): a edição em
  andamento de cada confederação e os campeões anteriores. Por copa, as
  fases criadas:
  - grupos: tabela por grupo;
  - fase de liga: tabela com as faixas de oitavas, playoff e eliminados;
  - mata-mata: confrontos com ida, volta, agregado e quem passou;
  - o clube do técnico marcado.
- v2, `/carreira/continental` (aba Jogos → "Copas continentais"):
  - seletor de copa (★ onde o técnico joga) e de fase;
  - tabelas, confrontos e edições anteriores, pelo DS.

Testes:
- `test_motor_novo_save_mundo` 3/3: sem o mundo; Argentina pela ponte
  (32 rodadas, nomes, moeda, gravação); mundo e depois Brasil;
- `test_motor_copas_uefa` 6/6 (novo: a visão das copas);
- v2 147/147 (novos: domínio das copas continentais, Início e Partida);
  typecheck.

Relatório da M10b, as copas da UEFA no save (25/11/2026)

O que foi feito:
- DEP-2 conferida na fonte: a França é a 5ª associação (ranking de 5
  temporadas 2020/21–2024/25), com 3 vagas diretas em 2026/27; as vagas
  extras de desempenho de 2026/27 foram de Inglaterra e Espanha.
- Catálogo (`scripts/mundo_catalogo.js --uefa-extra DIR`):
  - os 84 clubes do 5º pacote, com elencos reais, em `copas.uefa` e
    `snapshot-uefa_extra.json`;
  - 70 clubes de 20 outras associações, com nome real e elenco fictício
    (DEP-1);
  - a tabela de acesso de jogo (`scripts/dados/uefa_acesso.json`).
- `public/js/motor/copasuefa.js` (+ `.d.ts`), como `copasmundo.js` na
  CONMEBOL:
  - classificados: as 5 ligas pela classificação da temporada anterior.
    A 1ª divisão agora grava a classificação no fim da fase regular, sem
    esperar os playoffs da 2ª (a Itália terminava em julho). O 5º pacote e
    as outras associações saem de uma tabela anual simplificada;
  - vagas pela tabela de jogo. O titular já classificado passa a vaga.
    Na 1ª edição, os titulares são os 2 clubes mais fortes das 5 ligas;
  - coeficiente de jogo: por clube (2 por vitória, 1 por empate, bônus
    pela fase de liga e por fase do mata-mata, nas últimas 5 edições, para
    os potes e os cabeças de chave; na 1ª edição, a força) e por
    associação (média dos clubes; as 2 melhores das 5 ligas ganham a vaga
    extra da edição seguinte);
  - relógio: a edição da temporada é montada na 1ª semana de julho, se
    ainda dá tempo, e fecha em junho (a final pode cair na 1ª semana da
    temporada seguinte);
  - prêmios: EUR × R$ 6,00 × 0,2 (escala da Copa do Brasil), no caixa e
    no ledger do técnico e no caixa da CPU do país dele;
  - avisos e notícias.
- O jogo do técnico ao vivo, como na M9c: o adversário de fora entra no
  save. Os clubes fictícios ganham elenco gerado (o da Série D), na escala
  dos reais: +14 de overall pelo `AJUSTE_FICTICIO` (Slavia/Olympiacos
  64,6 × Celtic 65,8).
- v2: o Início e a Partida também com a Champions, a Europa League e a
  Conference ("Champions League · Fase de liga · Rodada 3").
- Desempenho: uma temporada inteira do Arsenal (mundo leve, CONMEBOL e
  UEFA) em ~0,6 s; as copas da UEFA no save até 74 KB durante a edição.

Medição (40 edições, força do índice):
- títulos da Champions: Inglaterra 10, Espanha 9, Itália 7, Alemanha 7,
  França 5, Turquia 1, Bélgica 1;
- Europa League e Conference mais espalhadas;
- 2,97 gols por jogo; o mandante vence 42%.

Testes:
- `test_motor_copas_uefa` 5/5: vagas, temporada inteira do Arsenal, a
  edição seguinte pelas classificações, escala dos elencos fictícios e o
  jogo da Champions ao vivo;
- `test_mundo_catalogo` 10/10;
- v2 144/144.

Decisões de jogo para o Murilo (podem mudar):
1. A tabela de acesso das associações fora das 5 ligas e a lista dos
   clubes delas (nomes reais, 4 por associação, 2 nas menores).
2. A força dos clubes do 5º pacote pela tabela da temporada consultada
   (início de campeonato: faixa mais estreita).

Relatório da M10a, motor das copas da UEFA (25/11/2026)

A M10 foi dividida em quatro partes:
- M10a: o motor das copas da UEFA;
- M10b: classificados, clubes do 5º pacote e das outras associações,
  coeficiente, relógio, prêmios e o jogo do técnico;
- M10c: telas da v2 (seletor do novo save, calendário, tabelas por fase,
  ligas do mundo, grupos e chaves, mercado com filtros);
- M10d: liberação (mundo ligado, índice offline, escudos andinos).

O que foi feito: `public/js/motor/uefa.js` (+ `.d.ts`), módulo puro e
serializável. Champions, Europa League e Conference de uma edição andam
juntas, pelo regulamento do pacote:
- Qualificação (Q1, Q2, Q3, PO): cabeças de chave pelo coeficiente, sem a
  mesma associação, mando da ida sorteado; o derrotado desce pelos fluxos
  do pacote (Champions Q1 → Conference Q2, Q2 → Europa League Q3, Q3 → EL
  PO, PO → fase de liga da EL; EL Q1/Q2/Q3/PO → Conference).
- Fase de liga de 36:
  - Champions e Europa League: 4 potes de 9, 2 adversários de cada pote
    (1 em casa e 1 fora), 8 rodadas;
  - Conference: 6 potes de 6, 1 adversário de cada pote, casa e fora por
    par de potes, 6 rodadas;
  - sem clube da mesma associação, no máximo 2 de outra associação, sem
    confronto repetido;
  - sorteio por busca com volta; rodadas por emparelhamentos perfeitos;
  - tabela pelos critérios do pacote (saldo, gols, gols fora, vitórias,
    vitórias fora, pontos/saldo/gols dos adversários, coeficiente).
- Mata-mata: playoff 9º–24º pelos blocos (volta do 9º–16º em casa);
  oitavas pelos blocos (volta do 1º–8º); ida e volta por saldo, prorrogação
  e pênaltis; final neutra em jogo único.
- Regras de jogo (faltam no pacote o Anexo A, o Anexo B e a circular de
  premiação 2026/27):
  - qualificação num caminho só, sem separar campeões e liga;
  - árvore depois das oitavas pela posição: quartas 1×8, 4×5, 2×7, 3×6;
    semis (1×8)×(4×5) e (2×7)×(3×6); a volta é de quem herdou a melhor
    posição;
  - premiação por fase em EUR (`PREMIACAO_UEFA`), próxima à de 2024/25:
    participação, vitória e empate na fase de liga, cada fase do mata-mata
    e o título; chave única por crédito.
- Desempenho: ~25 ms para montar e jogar uma edição inteira (~470 jogos).

Testes: `test_motor_uefa` 7/7:
- fases de liga com 144/144/108 jogos, mandos, adversários por pote e uma
  partida por rodada;
- restrições do sorteio;
- fluxos da qualificação;
- blocos e mandos do mata-mata, final neutra;
- critérios da tabela;
- premiação sem duplicar;
- determinismo, plano relido no meio, edição de 2027/28 e 30 edições
  aleatórias.

Relatório da M9a, motor das copas da CONMEBOL (25/11/2026)

A M9 foi dividida em três partes:
- M9a: o motor das copas;
- M9b: os classificados pelas ligas do save e a ligação com o mundo, as
  finanças e as notícias;
- M9c: as partidas do técnico ao vivo.

O que foi feito: `public/js/motor/continental.js` (+ `.d.ts`), módulo puro
e serializável. A Libertadores e a Sul-Americana de uma edição andam juntas,
pelo regulamento do pacote continental:
- Libertadores:
  - fase 1 (pote 1 decide em casa);
  - fase 2, sem cruzar clubes da mesma associação (só o vindo da fase 1
    pode);
  - fase 3, C1×C8 pelo ranking, volta na casa do melhor;
  - 8 grupos de 4 pelos potes do ranking, sem dois clubes da mesma
    associação (exceto quem vem da fase 3), com o padrão de mandos das
    rodadas do pacote;
  - 1º e 2º às oitavas.
- Sul-Americana:
  - 1ª fase com dois duelos nacionais por associação, jogo único e pênaltis
    no empate;
  - grupos com os 12 diretos, os 16 vencedores e os 4 derrotados da fase 3
    da Libertadores, sem a mesma associação no grupo;
  - playoff 2º da Sul-Americana × 3º da Libertadores pelos pares do pacote
    (9×24, 10×23...), com a ida na casa do 3º da Libertadores.
- Mata-mata das duas copas:
  - oitavas por potes (o líder decide em casa), rotuladas A–H;
  - quartas e semis pela chave do pacote (S1 = A×H...), volta na casa do
    melhor na ordem de performance;
  - ida e volta por pontos, saldo e pênaltis;
  - final neutra em jogo único, com prorrogação e pênaltis.
- Sorteios com seed (a chave da edição), resolvidos por busca com volta
  para as últimas vagas não travarem.
- Datas: as janelas do pacote no ano da edição (mesma semana, k anos
  depois).
- Premiação em USD do pacote: mando por fase, vitória nos grupos, campeão e
  vice. Cada crédito tem chave única (jogo, clube e tipo).

Testes: `test_motor_continental` 7/7, com os critérios de aceite do pacote:
- 155 jogos na Libertadores e 157 na Sul-Americana, 96 de grupos em cada,
  3 em casa e 3 fora;
- as transferências e os pares do playoff;
- grupos sem a mesma associação;
- oitavas com volta na casa do líder, pênaltis e final;
- premiação de mando e vitória sem duplicar;
- determinismo, plano relido no meio e edição de 2027;
- 80 edições aleatórias terminam (fora da suíte: 200).

Relatório da M9b, as copas da CONMEBOL no save (25/11/2026)

O que foi feito (`public/js/motor/copasmundo.js` + `.d.ts`):
- Catálogo (`scripts/mundo_catalogo.js --andino DIR`):
  - os 60 clubes das 1ªs divisões de Bolívia, Paraguai, Peru e Venezuela
    em `copas.conmebol` do índice, com ids próprios (870000001+);
  - elencos reais em `snapshot-conmebol_andinos.json`, servidos pela rota
    de elencos;
  - as regras do pacote continental no índice (`continentais`);
  - fontes do 4º pacote em `mundo/fonte/bol-par-per-ven/`.
- Classificação: a virada de cada país grava a classificação da 1ª
  divisão (campeões da temporada e tabela anual) no mundo leve, no país do
  técnico e no Brasil com o mundo anexado (Série A e campeão da Copa do
  Brasil, gancho `fimDaTemporada`).
- Vagas (regra de jogo, o pacote não traz as regras nacionais de acesso):
  - cada associação preenche a tabela de vagas do pacote na ordem grupos da
    Libertadores, fase 2, fase 1, grupos da Sul-Americana e 1ª fase;
  - a ordem é campeões da temporada e depois a tabela;
  - os 2 campeões da edição anterior entram nos grupos; se já estavam
    classificados, a vaga passa ao próximo;
  - 1ª edição do save, sem temporada anterior: clubes pela força, e as 2
    vagas de titulares para Brasil e Argentina.
- Andinos: tabela anual simplificada (força com uma variação sorteada por
  ano, determinística).
- Força entre ligas: força na liga × nível da liga (gameplayLevel do
  pacote; Brasil 1,20, Paraguai 0,98, Peru 0,95, Bolívia 0,90, Venezuela
  0,88), no nível de gols de 1,25 por time. Ranking da edição (potes) pela
  mesma força.
- Relógio: a edição do ano é montada na semana do save antes da fase 1 (se
  o save começa depois, como na Europa em julho, a edição do ano é pulada)
  e os jogos de cada semana são jogados junto com o mundo leve.
- Premiação: USD do pacote × R$ 5,50 × 0,2. A Copa do Brasil do jogo paga
  ~1/5 da premiação real; sem a escala, uma semifinal da Sul-Americana
  triplicava o caixa de um clube argentino médio. Vai para o caixa e o
  ledger do técnico e para o caixa da CPU dos clubes do país dele. Sem
  crédito em dobro.
- Avisos e notícias: classificação do técnico, mudança de copa,
  eliminação, título e os campeões no feed.
- Save: só a edição em andamento, sem as regras do pacote, com jogos em
  lista e confrontos sem o que se refaz (até 47 KB durante a edição; 0,2 KB
  fora dela), o histórico e os titulares.

Medição (40 edições, força do índice): títulos da Libertadores Brasil 18,
Argentina 12, Paraguai 3, Uruguai 3, Equador 2, Colômbia 1, Peru 1; 2,49
gols por jogo; mandante vence 42%.

Testes: `test_motor_copas_mundo` 6/6, `test_mundo_catalogo` 9/9; motor e
mundo 42/42; fast 56/56.

Limites e decisões para o Murilo:
1. Força dos andinos: o pacote não traz nota de atleta nem força (só nome,
   posição, idade e nacionalidade). Usei a ordem dos clubes no pacote, que
   é a tabela de 2026 consultada, para a força relativa dentro da liga, e
   o nível da associação. "Estimada pelo elenco" no sentido estrito não dá.
2. Escudos andinos: só a URL remota (fotmob); o download está bloqueado na
   rede desta sessão. Ficam para o pacote offline da M10.
3. As partidas do técnico nas copas são simuladas, como as da CPU (M9c as
   leva para o ao vivo). Sem colisão de agenda com a liga ainda.

Relatório da M9c, o jogo do técnico nas copas ao vivo (25/11/2026)

O que foi feito:
- Motor:
  - o jogo do técnico na semana não é simulado com os da CPU: fica pendente
    (`CAREER.copas.conmebol.pendente`, com copa, fase, data, adversário e
    ida) para ele jogar ao vivo;
  - se a semana passa sem ele jogar, o jogo é simulado como os da CPU (a
    copa nunca trava);
  - a partida usa o mesmo motor ao vivo da Copa do Brasil (blocos,
    substituições, tática, intervalo), com o contexto `continental`
    (`posjogo.iniciarJogoContinental`/`encerrarJogoContinental`,
    `jogo.startContinentalLive`/`finishContinentalLive`);
  - no fim, o placar vai para o plano da copa
    (`copasmundo.registrarJogoDoHumano`); prorrogação e pênaltis, quando o
    confronto pede, pelo simulador; recuperação, renda em casa (final
    neutra sem renda), evolução, prêmios e avisos como antes;
  - o adversário de fora (outro país ou andino) entra no save com o elenco
    do pacote, como no mercado do mundo (M8), e sai na virada;
  - ponte: `jogoContinental()` e `iniciarJogoContinental()`;
    `avancarSemana` para com o motivo `continental` enquanto há jogo
    pendente; o estado da partida traz `contexto: "continental"` e
    `continental` (copa, fase, perna, ida, desfecho).
- v2:
  - Início: o CTA vira "Jogar a Libertadores" (ou Sul-Americana) e uma linha
    mostra data, copa, fase e adversário;
  - Partida: `?iniciar=continental`, cabeçalho "Libertadores · Fase de
    grupos · Grupo C", agregado na volta e desfecho (pênaltis,
    prorrogação, classificado, eliminado, campeão);
  - fim do jogo volta ao Início (sem pós-jogo de rodada);
  - a semana que para no jogo continental volta ao Início;
  - os clubes de fora no save aparecem com nome e escudo.

Testes: `test_motor_copas_mundo` 7/7 (novo: o jogo ao vivo pela ponte, com
adversário andino e brasileiro carregados, placar no plano e cota de
mando); v2 142/142 (Início e Partida com o jogo continental); typecheck.

Limites:
1. Jogo da copa e da liga na mesma semana: o técnico joga os dois (a
   condição física cai pelo motor de sempre), sem rodízio automático.
2. Sem tela de chaves e grupos continentais (M10).

Relatório da M7, moeda e finanças por país (24/11/2026)

Decisões do Murilo (24/11):
- economia única pelo overall (salário, valor e orçamento pela regra de
  hoje; dos pacotes, só o porte relativo entre clubes da mesma liga);
- câmbio fixo só para exibição: 1 libra = R$ 7,00; 1 euro = R$ 6,00;
  1 dólar = R$ 5,50 (a América do Sul usa dólar, como nos pacotes).

O que foi feito:
- `texto.fmtBRL` mostra a moeda do país do save (`texto.definirMoeda`,
  `CAMBIO`). O motor continua guardando tudo em R$. Sem moeda definida
  (todo save do Brasil), o formatador é o de sempre.
  - A moeda fica em `globalThis.BRDATA_MOEDA`, para a remontagem da página
    antiga nos testes de equivalência continuar funcionando.
- Save do mundo:
  - `CAREER.moeda` (GBP, EUR ou USD);
  - caixa inicial do técnico e caixa guardado de cada clube da CPU do país
    pelo porte relativo no pacote (raiz da razão com a mediana da liga,
    entre 0,6 e 1,8, pela receita anual);
  - TV mensal pela regra do Brasil vezes o porte na TV da liga;
  - bilheteria pela capacidade real do estádio do pacote
    (`financas.stadiumCapacity`; sem capacidade, a estimativa de sempre).
- A carga e a criação no Brasil voltam a moeda para R$ (gancho
  `ganchosMundo.moeda`).
- A v2 ainda formata dinheiro por conta própria em R$. A moeda nas telas da
  v2 entra com as telas (M10).

Testes:
- `test_motor_mundo_carreira` 12/12. Caso novo: Arsenal em libras (câmbio
  conferido), porte acima da mediana, caixa da CPU, TV, capacidade real;
  Argentina em dólar; Brasil em reais.
- Testes do motor: 39/39. Rota rápida: 54/54. Testes da v2: 47/47.

Pontos para o Murilo (efeito da economia única, a tratar no balanceamento
do mercado, M8):
1. Em moeda estrangeira, os valores ficam na escala do Brasil. Exemplo: o
   teto salarial mensal de um clube da Premier League fica entre £ 170 mil
   e £ 250 mil (no real, milhões).
2. Em 2 temporadas sem o técnico mexer em nada, um clube da Ligue 2 juntou
   € 8,4 milhões de caixa, mais que clubes da Premier League. A folha baixa
   com as receitas da regra de hoje acumula caixa. Vale conferir se a
   Série C brasileira tem o mesmo comportamento antes de mudar a regra.

M6b-5a, carreira no Brasil com o mundo em paralelo (24/11/2026):
- Carreira nova no Brasil com o mundo ligado (o hospedeiro fornece o índice
  em `ambiente.indiceDoMundo`; a v2 passa a fornecê-lo na liberação, M10):
  os 10 países entram no mundo leve, pré-simulados até a semana em que a
  carreira começa, e andam junto com o calendário do Brasil.
  - A carreira continua brasileira: Copa do Brasil, Série D e o caminho de
    hoje.
- Sem o índice, a carreira nasce exatamente como hoje, sem nenhum pedido a
  mais ao servidor. A equivalência de carga (`test_motor_carga`) pegou o
  pedido extra na 1ª versão e ele saiu.
- Reabrir: o save do Brasil com o mundo carrega só o índice. Sem o índice,
  o mundo leve fica parado até ele voltar.
- Testes:
  - `test_motor_mundo_carreira` 11/11. Caso novo: carreira no Brasileirão
    sem rede, sem o índice (como sempre) e com o índice (10 países em
    paralelo, Copa mantida, 3 rodadas com o mundo na mesma semana).
  - Testes do motor: 39/39. Rota rápida: 54/54. A especificação saiu do pedido do
Murilo (24/11/2026), dos três pacotes de dados anexos e das decisões dele
na mesma data:
- D1: simulação híbrida;
- D2: formatos sul-americanos fiéis;
- D3: continentais junto com as ligas;
- D4: só saves novos.
Especificação: `docs/mundo/01_Requisitos.md` (MUN-01 a MUN-15, aceite).
Plano: `docs/mundo/02_Plano_de_execucao.md` (etapas M1 a M11, um PR por
etapa; liberação no seletor só na M10).
Pendências de decisão do Murilo (não bloqueiam M1 a M8):
- DEP-1: DECIDIDA (Murilo, 24/11/2026).
  - CONMEBOL: o 4º pacote (Bolívia, Paraguai, Peru e Venezuela, recebido em
    24/11 e guardado em `docs/mundo/pacotes/bol-par-per-ven/`) entra só nas
    copas. São 60 clubes das 1ªs divisões, com elencos reais, como CPU na
    Libertadores e na Sul-Americana, e uma tabela anual simplificada para
    os classificados. A força é estimada pelo elenco.
  - UEFA: as outras associações entram com nome real e elenco fictício.
  - 5º pacote (24/11/2026, clubes e elencos da Europa): Portugal, Países
    Baixos, Bélgica, Turquia e Escócia, 84 clubes das 1ªs divisões com
    elencos reais. Mesma regra do pacote andino (só nas copas da UEFA).
    Assim como ele, não traz jogos, força, finanças nem escudos locais.
    A importação vai com a M10.
  - Leitura do pacote: não traz jogos, força, finanças nem escudos locais;
    as segundas divisões estão incompletas (21 de 24 clubes bolivianos sem
    elenco nominal).
- DEP-2: DECIDIDA (Murilo, 24/11/2026, "Aprovado"). Tabela de jogo fixa
  com as vagas por posição na liga, +1 vaga na Champions pelo desempenho
  europeu no save, vaga dos campeões continentais e potes pelo coeficiente
  do clube no save. Detalhe em `docs/mundo/01_Requisitos.md`, DEP-2.
  Conferir na fonte qual associação é a 5ª do ranking de 2026/27 antes de
  implementar.
- DEP-3: promedio da 2ª uruguaia sem 2025. Proposta: começar sem
  histórico.
Divergência registrada: os handoffs dos pacotes supõem um país por save,
com "as outras ligas disponíveis só para outro save". O pedido do Murilo
(ligas em paralelo) prevalece (CLAUDE.md, seção 2, ordem de conflito). A
D1 (híbrido) é a forma de caber no save e no celular.

Relatório da etapa M1, catálogo do mundo (24/11/2026)

O que foi feito:
- `scripts/mundo_catalogo.js` lê os 3 pacotes e grava:
  - os 20 snapshots das ligas novas em `server/frozen-catalog/`;
  - o índice `server/frozen-catalog/mundo/mundo.json`: 10 países, 20 ligas
    com regulamento, calendário e moeda, 390 clubes, 305 da 3ª divisão e
    6.822 jogos das fases fixas com data local;
  - os JSON originais em `mundo/fonte/`, sem alteração;
  - 625 escudos em `public/img/teams/mundo/`.
- Servidor: `server/src/mundo.js` e as rotas `/api/career/mundo` (índice
  versionado, gzip ~110 KB) e `/api/career/mundo/elencos/<liga>`. Só
  respondem com `MUNDO_ATIVO=true` (`server/.env.example`). Sem a chave,
  devolvem 404 e nada muda para o jogador.
- Validação: `tests/unit/test_mundo_catalogo.js`, 8 verificações:
  - contagens por liga;
  - IDs únicos e sem colisão com o Brasil;
  - escudos existentes;
  - elencos com 22+ atletas e 2 goleiros, sem atleta repetido;
  - jogos por clube iguais em cada fase (34/38/42/46 nas europeias);
  - clubes B ligados ao clube pai;
  - versão do índice;
  - as rotas.

Decisões tomadas na M1 (para o Murilo conferir):
1. Vínculos duplicados (MUN-03): os 10 atletas listados pelo próprio pacote
   ficam no clube com menos atletas e saem do outro, que continua com 23+
   e 2 goleiros. A lista está em `mundo.json` (`vinculosResolvidos`).
   - Há ~90 homônimos de mesmo nome e idade entre clubes, inclusive com o
     Brasil, que NÃO foram mexidos: sem id de origem comum, podem ser
     pessoas diferentes.
2. Mínimo de elenco: o Everton tem 22 atletas no pacote (o pacote prometia
   23 na América do Sul, que cumpre). O teste exige 22 (11 + 11). O motor
   completa o elenco como já faz hoje.
3. Os jogos das fases que dependem de resultado ficam fora do índice: 333
   jogos de mata-mata, quadrangulares, hexagonais, Intermedio e finais. O
   motor vai gerá-los na M4. O original continua em `mundo/fonte/`.
4. O registro `server/competitions.js` não foi usado: ver o item 2 da M1 em
   `docs/mundo/02_Plano_de_execucao.md`.

Testes: `test_mundo_catalogo` 8/8; rota rápida (`test:fast`) 48/48.

Relatório da etapa M2, relógio do mundo (24/11/2026)

O que foi feito: `public/js/motor/relogio.js` (+ `.d.ts`), módulo puro.
- Semana do mundo = segunda-feira com o ano, a mesma unidade do calendário
  da carreira brasileira.
- Agenda por liga:
  - temporada 1: os jogos com data dos pacotes;
  - temporadas seguintes: as semanas e os dias de cada rodada da temporada
    do pacote, k anos depois, com os confrontos gerados para os clubes do
    save. O padrão é turno e returno, como no Brasil. Formatos com grupos
    passam o próprio gerador (M4).
- Início do save (MUN-06): 4 semanas antes do 1º jogo da liga escolhida.
  As outras ligas jogam até lá, na ordem do relógio (`jogosAntesDe`).
- O calendário brasileiro de hoje é convertido em semanas do relógio sem
  mudar nenhuma rodada.

Testes: `test_motor_relogio` 8/8, com os jogos reais das 20 ligas:
- nenhum jogo perdido e cada jogo na semana da própria data;
- temporadas geradas com um jogo por rodada e nenhum clube com dois jogos
  no mesmo dia;
- sem escorregar o calendário em 12 anos;
- Apertura/Clausura;
- Premier League começando em 20/07/2026 com a América do Sul pré-simulada;
- as 52/53 semanas do Brasil com as rodadas 1–38 intactas.

Observações:
1. Nos pacotes, há 1.517 casos de clube com 2 jogos na mesma semana
   (rodadas de meio de semana, como na Championship). A M6 trata a semana
   com 2 jogos do técnico como a semana de Copa de hoje (`w.c`).
2. Mudança de rota no plano:
   - o relógio só passa a conduzir o avanço de semana no save do mundo,
     na M6;
   - na M2, o Brasil não muda (risco zero para os saves de hoje);
   - os módulos novos ficam em `public/js/motor/` sem subpasta.

Relatório da etapa M3, desempates e fases das ligas europeias (24/11/2026)

O que foi feito (módulos puros, com `.d.ts`):
- `public/js/motor/desempate.js`: classificação pelos perfis do pacote
  (`premier`, `efl`, `spainTwo`/`spainMulti`, `italy`, `germany`,
  `france`).
  - O confronto direto usa a minitabela só dos empatados, refeita para cada
    subgrupo.
  - Os critérios "em posição decisiva" (Premier) só valem quando o empate
    disputa título, acesso, playoff ou queda.
  - Na Alemanha e na França, o confronto direto só conta com os dois jogos
    feitos.
  - O fim da lista (jogo neutro, sorteio) vira sorteio determinístico pela
    chave da temporada. Quando decide algo, volta em `sorteios`, para a tela
    explicar.
- `public/js/motor/fases.js`: o plano de fim de temporada do país, em JSON
  (vai no save), jogado perna a perna no relógio:
  - Championship: playoff de 8 (5×8 e 6×7; o 3º pega o vencedor pior
    colocado; final neutra);
  - Hypermotion: clubes B pulados, com a vaga indo ao próximo elegível;
    semis e final em ida e volta; empate = melhor campanha;
  - Serie A: jogo de título e decisão de queda com pontos iguais;
  - Serie B: 3º direto com +15; playoff 3º–8º; playout com até 4 pontos;
  - Alemanha: 16º × 3º da divisão de baixo, com mando da volta por sorteio
    (ver a nota 2);
  - França: 4º × 5º, o vencedor no 3º, e o sobrevivente × 16º da Ligue 1;
  - barrage da 2ª com o representante da 3ª, quando ele é informado.
  - Resultado: campeão, quem sobe e quem desce de cada divisão. A troca
    efetiva de clubes e o sorteio do catálogo ficam para a M5.

Testes: `test_motor_fases_europa` 11/11, com as regras reais do índice:
- cada evento do critério de aceite 3 da Europa, com placares roteirizados;
- o plano salvo e relido no meio, terminando igual;
- 5 países × 300 temporadas aleatórias: sempre termina, quem sobe = quem
  cai, e clube B nunca sobe.

Notas para o Murilo:
1. "Jogo neutro" (Premier, Espanha e Alemanha no fim da lista de
   desempate) virou sorteio determinístico. É raríssimo, e a tela vai
   dizer que foi sorteio. Os jogos de decisão que o regulamento italiano
   prevê são jogados de verdade.
2. Alemanha: o regulamento dá a volta a quem teve menos descanso. Na
   simulação, o descanso é igual para os dois, então vale o desempate do
   próprio regulamento, que é o sorteio.

Relatório da etapa M4, formatos sul-americanos fiéis (24/11/2026)

O que foi feito: `public/js/motor/formatos.js` (+ `.d.ts`). O plano é a
temporada inteira de cada liga, em JSON (vai no save). As fases que
dependem de resultado são criadas quando a anterior acaba.
- Argentina, 1ª:
  - Apertura e Clausura por zonas, com interzonais;
  - mata-mata dos 8 de cada zona (A1 e B1 só se cruzam na final);
  - tabela anual;
  - 1 queda pela anual e 1 pelo promedio de 3 temporadas, clubes distintos;
  - empate em pontos ou em promedio (fração exata) = jogo de decisão.
- Argentina, 2ª: final dos líderes em campo neutro (1º acesso) e Reducido
  com os pares do regulamento (o perdedor da final entra na 2ª fase) para o
  2º acesso; caem os 2 últimos de cada zona.
- Chile: turno e returno.
  - Na 1ª, caem 15º e 16º.
  - Na 2ª, o campeão sobe e a Liguilla (3×8, 4×7, 5×6; o 2º pega o pior
    vencedor) dá a 2ª vaga; cai o último.
  - Empate em pontos no título ou na queda = decisão.
- Colômbia:
  - 1ª: Apertura com mata-mata dos 8; Clausura com 2 quadrangulares
    (cabeças 1º e 2º, sorteio do resto) e final; caem 2 pelo promedio de 3
    temporadas (só todos contra todos);
  - 2ª: quadrangulares e final nos dois torneios, e os 4 cenários de acesso
    (campeão repetido, os dois no top 2, só um, nenhum: Gran Final e
    repechaje).
- Equador: hexagonais (e o grupo da Sul-Americana) com os pontos da 1ª fase
  carregados. Na B, o clube vinculado é pulado no acesso.
- Uruguai, 1ª:
  - Apertura;
  - Intermedio em 2 grupos (ímpares e pares do Apertura), com final;
  - Clausura;
  - anual das três fases;
  - título: semifinal Apertura × Clausura e final contra o líder da anual;
  - 3 quedas pelo promedio de 2 temporadas.
- Uruguai, 2ª: Competencia com final; sobem 1º e 2º da anual e o vencedor
  do playoff 3º–6º; caem 2 pelo promedio.
- Temporadas seguintes: gerador de confrontos por liga, para o relógio
  (zonas com interzonal na Argentina, turno único por torneio, grupos do
  Competencia).
- Catálogo (`scripts/mundo_catalogo.js`):
  - zonas da Argentina e grupos do Competencia no índice;
  - promedio inicial do histórico do pacote, sem as tabelas repetidas:
    Argentina 2024–25, Colômbia 2024–25 e Uruguai 2025.

Testes: `test_motor_formatos_sa` 8/8.
- As 10 ligas jogam 2026 (pacote) e 2027 (gerada) inteiras, com:
  - acessos e quedas certos;
  - nenhum clube com 2 jogos no mesmo dia;
  - as fases geradas nas pausas entre as fases fixas;
  - tudo dentro do ano.
- Cada caso do critério de aceite 3 da América do Sul.
- Plano relido no meio termina igual.
- Fora da suíte: 400 temporadas aleatórias, sem falha. Apareceram todos os
  jogos de decisão e 3 dos 4 cenários colombianos; o 4º está no teste.

Interpretações de regulamento (para o Murilo conferir):
1. Datas das fases geradas: um jogo a cada 3–4 dias depois da fase
   anterior. Cabem nas pausas reais (o teste confere).
2. Reducido argentino: jogo único com vantagem do melhor colocado nas duas
   primeiras fases, semis em ida e volta e final em ida e volta com
   pênaltis. O pacote remete ao "item 7" do boletim sem detalhar.
3. Liguilla chilena: ida e volta, com vantagem do melhor colocado; na final,
   pênaltis (art. 85 citado, sem os detalhes).
4. Equador: arrastre total (pontos, jogos e gols da 1ª fase).
5. Uruguai, 2ª: a anual soma os grupos do Competencia e a fase regular; a
   final do Competencia fica de fora.
6. Colômbia, 1ª: quadrangular empatado em pontos = vantagem do melhor
   colocado no Clausura. A reclassificação da B soma todos os jogos do ano,
   menos as finais.
7. Primera C colombiana: zero trocas, o padrão do pacote.

Etapa M5, a virada por país (acesso e queda aplicados, clubes B,
catálogo de 3ª divisão, proteção do clube do jogador).

Relatório da etapa M5, virada por país (24/11/2026)

O que foi feito: `public/js/motor/viradapais.js` (+ `.d.ts`), módulo puro.
A virada é uma transação só: confere contagens e conjuntos disjuntos antes
de devolver, e não mexe na entrada.
- Troca entre 1ª e 2ª pelo resultado das fases (Europa) ou dos formatos
  (América do Sul).
- Reposição da 2ª pelo catálogo de 3ª, como a Série D: sorteio
  determinístico (país + ano), sem repetição, entre os elegíveis. Quem cai
  entra no catálogo e quem sobe sai.
- Argentina: metade das vagas pela Primera B Metropolitana e metade pelo
  Federal A.
- Clubes B:
  - nunca na 1ª;
  - se o principal cai para a 2ª onde está o B, o B cai para o catálogo e
    entra mais um;
  - no catálogo, o "condicional" só é elegível com o principal na 1ª da
    temporada nova, e o "bloqueado" (II alemães) nunca;
  - Colômbia: a Primera C (`simulation_only`) fica fora.
- Representante do catálogo no barrage (Alemanha e França), sorteado ao
  montar as fases.
- Proteção do clube do jogador na divisão jogável mais baixa: cai o próximo
  da zona de baixo, e a exceção vai no resumo.
- Zonas da temporada nova (Argentina: quem chega ocupa a vaga de quem saiu),
  grupos sorteados (Competencia uruguaio) e histórico do promedio pela
  janela.

Testes: `test_motor_viradapais` 6/6.
- 3 temporadas encadeadas nos 10 países, com o calendário gerado com os
  clubes do save, as fases ou formatos de verdade e a virada:
  - tamanhos e disjunção certos;
  - o total de clubes conservado entre divisões e catálogo;
  - bloqueado e `simulation_only` nunca entram;
  - mesma seed, mesma virada.
- Cada regra de clube B, os 200 sorteios alemães, a proteção (Inglaterra e
  Uruguai pelo promedio), as zonas argentinas e os circuitos.
- O histórico do promedio pela janela, e a entrada inválida falhando sem
  mexer em nada.

Nota: o destino de quem cai da Primera Nacional (Metropolitana ou Federal
A) não vem no pacote. O clube volta ao catálogo sem circuito e conta em
qualquer um dos dois.

Relatório da etapa M6a, mundo leve (24/11/2026)

A M6 foi dividida em duas:
- M6a: o mundo leve, as ligas fora do país do técnico;
- M6b: a ligação com o save e a carreira do técnico (próxima).

O que foi feito: `public/js/motor/mundoleve.js` (+ `.d.ts`). As 20 ligas
andam semana a semana com as peças M1–M5:
- agenda pelo relógio;
- placar pela mesma conta de gols do motor (`partida.scoreGoals`), com a
  força do clube no nível de gols da liga (`partida.forcaComNivel`), como as
  divisões que o técnico não joga no Brasil;
- Europa: tabela com os desempates e o fim de temporada pelas fases;
- América do Sul: a temporada pelos formatos;
- virada por país.

Detalhes:
- O sorteio de cada jogo é pela chave (liga, temporada, jogo). Salvar e
  reabrir não muda nada.
- Save enxuto:
  - a agenda é derivada do índice e não vai no save;
  - os placares das fases fixas viram uma string (2 caracteres por jogo);
  - a tabela é recalculada a partir dos placares;
  - vão no save as fases geradas, os confrontos, o catálogo alterado, as
    zonas, o histórico do promedio e a força de quem mudou de divisão.
- Força de quem muda de divisão: pela razão do nível das ligas
  (`nivel`/gameplayLevel do pacote), amortecida (expoente 0,5, parâmetro de
  balanceamento).
- Início do save: a pré-temporada da liga escolhida. As ligas que já
  estariam em andamento são pré-simuladas até lá.
- Catálogo do mundo: o índice ganhou o nível e a média de gols de cada
  liga.

Testes: `test_motor_mundoleve` 5/5.
- Início na Premier League com a América do Sul pré-simulada até
  20/07/2026.
- 3 anos de mundo com 3 viradas por país e todas as contagens certas.
- Salvar e reabrir a cada 5 semanas igual a jogar direto.
- Gols por jogo de cada liga a menos de 25% da referência do pacote.

Medições (ambiente de teste), mundo inteiro, 3 anos:
- semana: média 3,9 ms, p95 10,3 ms, pior 16,5 ms;
- parte do mundo no save: 77 KB de JSON e 15 KB comprimida.
- A decisão D1 (híbrido) cabe com folga: o save da carreira brasileira de
  hoje tem ~830 KB de JSON e ~100 KB comprimido.

Próxima etapa: M6b, o save do mundo na carreira. O país do técnico na
simulação completa de hoje e o resto no mundo leve. O Brasil também entra
no mundo leve quando o técnico está fora dele.

Relatório da M6b, passos 1 e 2 (24/11/2026; branch `claude/mundo-m6b`,
empilhada sobre o PR #154, por decisão do Murilo)

M6b-1, divisões do país do save:
- `estado.divisoesDoPais()` no lugar da lista fixa das 3 divisões
  brasileiras: na criação da carreira, na carga, nas divisões e nos
  amistosos (`virada.js`, `carga.js`) e na divisão do clube na negociação
  (`negociacao.js`).
- Sem o campo `divisoes` no save (todos os saves de hoje), continuam as 3
  do Brasil.
- A cascata de acesso do Brasil (`applyPromotionRelegation`) não mudou: o
  save do mundo terá a virada dele (M6b-4).

M6b-2, calendário:
- `estado.rodadasDaTemporada()` no lugar do 38 fixo onde ele é o tamanho
  da temporada: fim da temporada, rodada do técnico, empréstimo de meia
  temporada, notícia de título, demissão no fim do ano.
  - Sem o campo `rodadasLiga`, continua 38.
  - Ficam como estão o calendário do Brasil, o patrocínio por rodada das
    carreiras antigas (sem calendário) e as escalas de evolução do jogador
    (`temporada.js`), que usam 38 como temporada de referência.
- Janela de transferências: a semana do save do mundo traz `j` (janela do
  país pelas datas da FIFA). Sem `j` (Brasil), vale a fase do ano, como
  sempre.
- `public/js/motor/calendariomundo.js` (+ `.d.ts`), módulo puro: monta o
  calendário do save do mundo no formato de hoje, com o ano em cada semana.
  - As rodadas da liga do técnico são numeradas em sequência: Apertura e
    Clausura viram 1–32.
  - A semana com 2 rodadas vira 2 entradas.
  - Os jogos da outra divisão vão para a entrada da semana deles.
- Testes: o carregador dos testes de equivalência (`tests/e2e/_motor_vm.js`)
  aprendeu os dois atalhos.
  - `test_motor_mundo_carreira`: 5/5 (Premier League, Championship com 46
    rodadas e semanas duplas, Argentina 1–32, janela, rodadas).
  - Testes do motor: 39/39. Rota rápida: 54/54.

M6b-3, carreira nova num país do mundo (24/11/2026):
- `public/js/motor/carreiramundo.js` (+ `.d.ts`) cria a carreira num clube
  do índice. Reaproveita a montagem de sempre (`virada.montarCarreira`) e
  troca o que é do Brasil:
  - as 2 divisões do país com simulação completa;
  - calendário, rodadas e janela pelo relógio;
  - sem Copa do Brasil e sem Série D;
  - os outros 9 países no mundo leve (`CAREER.mundoLeve`), pré-simulados
    até a pré-temporada. O mundo leve anda junto com a semana da carreira
    pelo gancho `ganchosMundo.semanaDoMundo`, chamado na virada de semana
    do calendário.
- Mudanças no núcleo, todas sem efeito no Brasil:
  - `montarCarreira` ganhou `extras` (vazio no Brasil);
  - `buildRealPlayer` soma `club.ajusteNivel` (MUN-02; os clubes do Brasil
    não têm o campo);
  - a carga não recria a Copa num save do mundo.
- Força entre ligas (MUN-02, 1ª versão): o overall do jogador ganha
  (nível da liga − 1) × 25. Medido na criação: Premier League 70,6 e
  Championship 64,8 de média.
  - O Brasil fica sem ajuste até a calibração do mercado (M8): é preciso
    pôr a Série A na mesma escala.
- Testes: `test_motor_mundo_carreira` 7/7.
  - Carreira no Arsenal: criação em ~0,15 s; save de 525 KB de JSON
    (56 KB comprimido).
  - 4 rodadas jogadas pela ponte da v2 (semana, partida, pós-jogo,
    gravação), com a Championship jogando pelas datas e o mundo leve na
    mesma semana.
  - Fora da suíte, também jogaram: a Championship (46 rodadas, semanas
    duplas) e a Argentina (save de 907 KB de JSON, o pior caso, com 66
    clubes; o envio vai comprimido).
  - Testes do motor: 39/39. Rota rápida: 54/54.
- Ainda não ligado:
  - a tela (seletor de novo save, M10);
  - a reabertura do save do mundo (carga do índice ao abrir, M6b-4);
  - as fases do técnico (a Argentina ainda joga numa tabela só) e a virada
    do país (M6b-4);
  - a moeda (o caixa ainda sai na escala do Brasil, M7).

M6b-4a, virada do país do técnico na Europa (24/11/2026):
- A virada de temporada de hoje (`virada.advanceSeason`) faz tudo o que já
  fazia (meta, prêmios, reputação, renovação dos elencos, caixa da CPU...).
  No save do mundo, troca só três pontos, todos por ganchos
  (`estado.ganchosMundo`):
  - acesso e queda: `carreiramundo.viradaDoPaisAtivo` no lugar da cascata
    do Brasil;
  - sem Copa do Brasil;
  - calendário, rodadas e tabela da temporada nova pelo relógio
    (`novaTemporadaDoMundo`).
- `viradaDoPaisAtivo`:
  - tabelas finais com os desempates da liga;
  - fim de temporada pelas fases da M3;
  - troca entre divisões e catálogo pela virada da M5, com a proteção do
    clube do técnico;
  - quem chega do catálogo ganha elenco gerado (como a Série D) e quem sai
    para o catálogo sai do save;
  - catálogo, campeões e histórico de viradas guardados na entrada do país
    no mundo leve;
  - mudança de divisão do técnico, com aviso ("Acesso! EFL Championship →
    Premier League.").
- Limite desta etapa: os jogos de fim de temporada do país são simulados
  na hora, inclusive os do técnico. Jogar o playoff ao vivo fica para uma
  etapa seguinte (registrado).
- Defeito achado e corrigido no caminho: o mundo leve aberto em memória
  regravava o catálogo antigo do país depois da virada, e a 2ª virada
  acusava clube repetido. A checagem da transação pegou o problema e agora
  diz quais clubes se repetem.
- Testes:
  - `test_motor_mundo_carreira` 8/8. Novo caso: temporada inteira na
    Championship com o técnico em 1º (sobe para a Premier League, 38
    rodadas, 2027/28, total de clubes conservado), depois em último (volta
    à Championship, 46 rodadas).
  - Fora da suíte: 2 temporadas em cada uma das 10 ligas europeias, sem
    falha. ~1,3 s por temporada; saves entre 650 e 780 KB de JSON.
  - Testes do motor: 39/39. Rota rápida: 54/54.
- Falta na M6b-4: América do Sul (fases do técnico pelo plano dos formatos
  e a virada do país); feito em seguida, ver M6b-4b abaixo.

M6b-4, reabrir o save do mundo (24/11/2026):
- A carga de hoje (`carga.enterAfterAuth`) chama
  `carreiramundo.abrirSaveDoMundo` quando o save é do mundo (gancho
  `ganchosMundo.abrirSave`). Ela carrega o índice (rota
  `/api/career/mundo`, ou o do ambiente) e monta o mundo do motor com as
  divisões gravadas no save, sem buscar times pela rota do Brasil.
- Os módulos do mundo entram no app:
  - `v2.js` importa `carreiramundo.js`, que registra os ganchos;
  - o app shell do service worker (`public/sw.js`) recebe os 8 módulos
    novos, para o modo offline;
  - o carregador dos testes (`tests/e2e/_motor_vm.js`) recebe os módulos
    na ordem de dependência e passa a aceitar `import { a as b }`.
- `fases.js` e `desempate.js` deixaram o `export { ... }` pelo formato de
  exportação dos outros módulos.
- Testes:
  - `test_motor_mundo_carreira` 9/9. Novo caso: o save reaberto mantém a
    liga, as divisões, a rodada e a semana, não recria a Copa e segue
    jogando e gravando.
  - Testes do motor: 39/39. Testes da v2: 47/47. Rota rápida: 54/54.

M6b-4b, América do Sul no país do técnico (24/11/2026):
- Cada liga do país tem o plano da temporada (`formatos.js`), guardado
  compacto em `CAREER.mundo.planos`.
- Os jogos das fases de tabela fixa são os que o motor já joga por rodada,
  na liga do técnico e na outra divisão. O placar chega ao plano por um
  gancho (`ganchosMundo.resultadoDoMundo`), colocado nos dois pontos por
  onde passa todo resultado: `applyResultToStandings` e
  `resolveOtherDivisionsRound`.
- As fases geradas (mata-matas, quadrangulares, hexagonais, Intermedio,
  finais, acesso) são jogadas pela semana, com a mesma conta de gols,
  inclusive as do técnico. A partida ao vivo nessas fases fica para uma
  etapa seguinte, como o playoff europeu.
- Virada: termina o que faltar dos planos e aplica o acesso e a queda do
  regulamento:
  - zonas argentinas novas;
  - grupos do Competencia sorteados;
  - histórico do promedio atualizado;
  - proteção do clube do técnico.
- A tabela do técnico na tela soma as fases de tabela fixa (a "anual"). As
  tabelas por zona, grupo e fase vêm com as telas (M10).
- Rodada de folga do técnico (grupos de 7 do Competencia uruguaio): o motor
  já resolvia a rodada na hora (`resolveRoundInstant`), caminho que o
  Brasil nunca usou. A tela da v2 precisa ser conferida nesse caso (M10).
- Testes:
  - `test_motor_mundo_carreira` 10/10. Caso novo: temporada inteira na Liga
    Profesional (15 jogos de mata-mata do Apertura, 480 placares de zonas no
    plano), virada com 2 quedas distintas, zonas 15/15 e 18/18, histórico de
    2026 no promedio; Segunda uruguaia com folga.
  - Fora da suíte: 2 temporadas em cada uma das 10 ligas sul-americanas,
    sem falha, ~2 s por temporada, com o técnico subindo e caindo (Chile,
    Colômbia, Uruguai).
  - Testes do motor: 39/39. Rota rápida: 54/54.

M6b-5b, o Brasil no mundo leve (24/11/2026):
- Índice do mundo (`scripts/mundo_catalogo.js`): ganhou o Brasil.
  - Séries A, B e C do catálogo congelado, com a força calculada pela mesma
    função da carreira (`carga.calibrateStrengths`, importada pelo script,
    sem segunda implementação) e a média de gols da liga.
  - A Série D do jogo (`js/data.js`).
- Mundo leve (`mundoleve.js`): o Brasil joga quando o técnico está fora
  dele.
  - Calendário pela regra da carreira (segundas do ano, rodadas 1–38 nas
    semanas de "temporada") e turno e returno de
    `calendario.generateAllRounds`.
  - Tabelas pelos critérios do Brasileirão (`tabela.sortRows`).
  - Virada pela cascata da carreira (`temporada.promotionRelegation`):
    perdão da tradição, 4 da Série D por sorteio e força de quem muda de
    divisão.
- Carreira no Brasil com o mundo (M6b-5a): o Brasil fica de fora do mundo
  leve (`ativos: ["BR"]`).
- Testes:
  - `test_motor_mundoleve` 6/6. Os 3 anos de mundo agora incluem o Brasil
    (3 viradas, 20/20/20 clubes, Série D conservada, 4 sobem e 4 descem por
    fronteira). A parte do mundo no save foi a 82 KB de JSON e 16 KB
    comprimida.
  - `test_motor_mundo_carreira` 11/11. Testes do motor: 39/39. Rota rápida:
    54/54.
  - Fora da suíte: 2 temporadas na Premier League com o Brasil jogando no
    mundo leve (2 viradas, campeões registrados).
- Com isso, a M6b está completa. Ficam registrados para as etapas
  seguintes:
  - jogar ao vivo os playoffs e as fases geradas do técnico;
  - os elencos dos clubes de fora do país do técnico, para o mercado (M8);
  - a moeda (M7). Testes da v2: 47/47.
    `test_v2_venda_disponivel` falhou uma vez em paralelo, passou 2/2
    sozinho e 47/47 numa segunda rodada (instável, sem relação com o
    mundo).
- Risco: o save argentino chega a ~1,1 MB de JSON. Ele vai comprimido
  (~120 KB) desde a D6. Um navegador sem `CompressionStream` (Safari
  anterior ao 16.4) manda o JSON cru, que passa do limite de 1 MB do
  servidor. Proposta: tratar na M7/M10 (podar o save do mundo ou recusar o
  mundo nesses navegadores).

⸻

FASE1-ESC — Fase 1: escalação e orientação da comissão técnica

Status: APROVADO (Murilo, 12/11/2026, "Aprovado" sobre a recomendação
abaixo; PR #105). Decisões:
1) REVISTA pelo Murilo (12/11): "Escalação incompleta e sem goleiro titular
   deve bloquear início do jogo". Implementação aprovada por ele em 12/11
   ("Continue", em resposta ao pedido de aprovação desta versão). Escopo escolhido por ele: qualquer
   pendência dos 11 titulares + 11 reservas (inclui banco de save antigo e
   banco sem goleiro) mais goleiro disponível entre os titulares. No
   Pré-jogo: aviso com o que falta e "Completar automaticamente".
   - Motor: `escalacao.bloqueioInicio` (liga, perna da Copa e amistoso
     recusam com motivo "escalacao"); `escalacao.completarEscalacao` e o
     comando `completarEscalacao` da ponte (corrige só as vagas com
     problema; nunca inventa atleta; falha de gravação devolve a escalação
     de antes). Nova pendência "sem-goleiro-titular".
   - v2: Pré-jogo troca "Iniciar partida" por "Completar automaticamente"
     enquanto houver pendência; a Partida (amistoso e perna da Copa)
     mostra o mesmo bloqueio com as duas ações.
   - Efeito no jogo: lesão, suspensão ou venda de quem está na escalação
     passa a exigir correção antes do próximo jogo (antes o time entrava
     com força reduzida).
   - Validação: motor 21/21 (`test_motor_escalacao`, +7 casos),
     equivalência `test_motor_jogo` 3/3 (o roteiro completa a escalação
     nos dois mundos antes de cada início), v2 121/121, `test_v2_esc`
     item 7 (Pré-jogo bloqueado e completado) e `test_v2_tabela_partida`
     item 4 (perna da Copa bloqueada no pós-jogo, completada na Partida,
     pós-jogo até o fim). Contraprova: sem o bloqueio, o item 7 falha.
     Suíte completa 210/211; a falha (`test_botoes_rodape`, tela antiga,
     espera fixa de 150 ms) passou 2/2 sozinha e não passa pelo início
     da partida do motor.
   - Ponto de atenção: com menos de 22 jogadores disponíveis (principal
     + base), "Completar" não resolve tudo e o jogo fica bloqueado até
     contratar ou recuperar alguém. A tela explica isso.
2) Revisão da escalação, não do save inteiro.
3) Aceite em modo avião fica para a OFFLINE-001.
Origem: documento do Murilo (12/11/2026), guardado sem alteração em
`docs/carreira-v2/fase1/01_Requisitos_Escalacao.md` (ESC-01 a ESC-05 e
aceite). A especificação é esse documento; abaixo, só o que o PM
acrescenta.
Prioridade: 1ª das frentes novas (decisão do Murilo, 12/11: Fase 1 →
Série D → Offline).

Leitura do PM (o que já existe e o que falta, conferido no código de
`main` em 12/11):
- "Orientação lateral" = a sugestão de escalação da comissão técnica
  (aba lateral no Início, Escalação e Pré-jogo; `comissaoAplicar` em
  `public/js/motor/ponte.js`). Hoje ela faz a própria troca, separada da
  troca manual da v2 (`applyLineupChange` em
  `carreira-v2/src/domain/lineup.ts`). ESC pede uma operação só.
- A escalação automática (`autoLineup`, `motor/virada.js`) já monta 11
  titulares + banco de 11 com goleiro (`MAX_BENCH = 11`). Falta garantir
  isso nas trocas manuais e na orientação (ESC-01/03), a recomposição com
  confirmação (ESC-03), o modo de revisão para save antigo com banco menor
  (ESC-04) e a gravação transacional com toque duplo/falha (ESC-02/04).
- Regra do jogo nova vai para `public/js/motor/` com teste; a tela, para
  `carreira-v2/` (CLAUDE.md, seção 0).
- "Reabrir em modo avião" (aceite 1) depende do Offline: até lá, o aceite
  confere reabrir o jogo (motor recarregado do servidor). Registrado como
  pendência do aceite, a fechar quando o Offline existir.

Entrega: PR próprio, relatório nesta seção e status REVISÃO DO PM
NECESSÁRIA; o merge espera a aprovação do Murilo.

Relatório de implementação (12/11/2026)

O que foi feito:
- Motor: novo módulo puro `public/js/motor/escalacao.js` (+ `.d.ts`), sem
  ler CAREER, tela ou rede. Funções:
  - `validarEscalacao`: as pendências da escalação confirmada (11
    titulares, 11 reservas, sem repetição, do elenco, disponíveis, com
    goleiro disponível no banco);
  - `trocar`: a troca titular–reserva da ESC-02, com conferência de quem
    estava na vaga; inclui a vaga vazia do banco, só para quem está fora
    da escalação;
  - `recomposicaoGoleiro` e `aplicarRecomposicao`: a ESC-03; o candidato é
    sempre um goleiro disponível de fora da escalação, nunca inventado;
  - `trocarComRecomposicao`: a confirmação conjunta.
- Uma operação só (pedido central da ESC):
  - a troca manual da v2 (`carreira-v2/src/domain/lineup.ts`, que importa
    o módulo no build) e a orientação da comissão técnica
    (`comissaoEscalacao`/`comissaoAplicar` em `motor/ponte.js`) usam a
    mesma `trocarComRecomposicao`;
  - a sugestão da comissão já traz a recomposição quando precisa ("… · X no
    banco no lugar de Y"), aplicada no mesmo toque;
  - sem goleiro para recompor, a comissão não sugere a troca e explica.
- ESC-04, falha de escrita: na comissão, a escalação confirmada volta
  inteira se a gravação falhar. Na v2, a troca já é "relê → aplica →
  grava", e na falha nada muda.
- v2, tela:
  - "Quem entra?" abre a folha "Manter um goleiro no banco" quando a troca
    tiraria o goleiro do banco (as duas trocas numa gravação) e mostra o
    bloqueio com o motivo;
  - a Escalação mostra "Revise a escalação" com as pendências (modo de
    revisão do save antigo) e as vagas vazias do banco ("Vaga no banco").
- Defeito achado e corrigido: na v2, dois toques no mesmo instante em
  "Confirmar troca" passavam os dois (a trava era estado React, que só
  vale depois do render). As duas gravações disputavam e a tela travava.
  Agora a trava é síncrona. O teste novo do aceite 3 achou o defeito.

Arquivos:
- Novos:
  - `public/js/motor/escalacao.js` e `escalacao.d.ts`;
  - `tests/unit/test_motor_escalacao.js` (14 casos do aceite);
  - `tests/e2e/test_v2_esc.js` (aceites 1 a 3 e a comissão, pelas telas e pelo motor da v2).
- Alterados:
  - `public/js/motor/ponte.js` (comissão);
  - `carreira-v2/src/domain/lineup.ts`, `adapters/gateways.ts`, `App.tsx`,
    `screens/Substitute.tsx`, `screens/Lineup.tsx`, `screens/lineup.css` e
    `domain/lineup.test.ts` (+4 casos);
  - `public/sw.js` (o módulo novo no app shell);
  - `tests/e2e/_motor_vm.js` e `_v2_carreira.js` (o módulo novo nas listas);
  - `tests/unit/test_motor_ponte.js` (o token "desfazer" da comissão, que
    mudou de formato de propósito, não entra na comparação);
  - `tests/e2e/test_v2_escalacao.js` (mensagem do item 6 mais detalhada);
  - build da v2.

Testes:
- motor 14/14;
- v2 120/120, com tipos e build;
- `test_v2_esc` (6 verificações);
- testes do motor, incluindo a equivalência da ponte em 30 mundos;
- suíte completa (com o Postgres temporário): 211/211.
- Contraprova: com a recomposição desligada no motor, 4 casos do motor e 2
  da v2 falham.

Divergências e decisões para o Murilo:
1. "O jogo só confirma a lista válida" (ESC-03).
   - Implementado: a troca que quebraria uma escalação válida não é
     gravada sem a recomposição.
   - Em revisão (save antigo, lesão nova), a edição pode gravar com
     pendência visível, como o próprio texto permite.
   - NÃO foi implementado bloquear o início da partida enquanto houver
     pendência. Isso muda a regra do jogo de hoje: o pré-jogo aceita a
     escalação como está.
   - Decisão sua: bloquear o início (com uma ação "completar
     automaticamente") ou manter como está.
2. "Revisão do save ao confirmar" (ESC-01).
   - Implementado como revisão da ESCALAÇÃO: quem estava em cada vaga mais a
     revalidação completa sobre o save relido do servidor. Não é o
     carimbo do save inteiro.
   - Motivo: assim uma mudança em outra parte do save (por exemplo, uma
     notícia lida) não invalida a troca.
   - Se preferir o save inteiro, é uma linha.
3. Aceite 1, "após reabrir em modo avião": depende da OFFLINE-001. Hoje o
   teste reabre o jogo (o motor recarrega do servidor) e confere as
   contagens. Fica pendente até existir o modo offline.

Riscos: baixos. A escalação automática (`autoLineup`) não mudou. O que
muda é a troca manual e a da comissão, cobertas pelos testes acima.

Observação de teste:
- Uma execução de `test_v2_escalacao` falhou uma vez no item 6 (formação),
  em paralelo com o teste novo.
- Não reproduziu em 6 execuções seguintes, sozinho e em paralelo.
- A mensagem do item agora mostra as duas escalações, para a causa
  aparecer se voltar.

Recomendação: aprovar com as decisões 1 e 2 acima.

⸻

V2-ANTIGA-01 — Dois recursos da tela antiga trazidos para a v2

Status: APROVADO. A demanda foi aprovada pelo Murilo em 12/11/2026
("1. Sim! 2. Sim", sobre as diferenças achadas no lote L3 de testes,
docs/carreira-v2/ENTREGA_TESTES_L3.md), e a implementação em 12/11
("Aprovado"). Mergeado no PR #109.
1. Nome do jogador nos lances da partida.
   - Na partida encerrada ("Ver lances"), o nome do jogador do lance (gol,
     cartão, lesão) é link.
   - O seu jogador abre a ficha; o do adversário, o perfil no Mercado
     ("Conheça seu reforço.", com "Fazer proposta").
   - Passa pela confirmação de saída do Resultado ("Sair e ver …"), porque
     sair pode pular o pós-jogo, como tocar num clube na Tabela.
   - Com a partida ao vivo, os nomes ficam como texto: sair simularia o
     resto do jogo.
   - Motor: os lances que vão para a v2 passam a levar `jogadorId` e
     `assistenciaId` (campos novos; o resto igual).
2. Faixa de potencial no Elenco.
   - A linha de cada jovem da base mostra "pot. …" (a mesma faixa do
     olheiro da ficha), também no texto lido pelo leitor de tela.
Testes: domínio da v2 +2 casos (123/123); motor ponte 3/3, jogo 3/3,
hospedeiro 4/4, ao vivo 3/3; e2e novo `test_v2_nomes_lances` (3/3) e os
testes da partida, do Elenco, de foco e de sistema (10/10).

⸻

FASE1-MER — Fase 1: mercado, empréstimos e contratação

Status: APROVADO (Murilo, 13/11/2026, "APROVADO"; PR #110). Balanceamento
mantido como calibrado (Murilo, 13/11: "Pode manter o balanceamento").
Plano: `docs/carreira-v2/fase1/PLANO_MER.md`.
Calibração: `docs/carreira-v2/fase1/CALIBRACAO_MER.md`. Três pontos de
balanceamento ficaram para decisão do PM e não foram alterados:
- empréstimo de rotação muito binário;
- valor de mercado raramente fecha de primeira;
- força da promessa de titularidade.
Entregue:
- motor: `motor/negociacao.js`. O clube vendedor tem reserva nova (papel,
  cobertura, reposição, fim de janela). O atleta decide salário, papel e
  duração, com motivo. Empréstimo avaliado dos dois lados. Sorteio com
  chave, operação com id (MER-07). Promessa cobrando a moral na temporada
  da contratação.
- v2:
  - Elenco > Contratar jogador;
  - lista do Mercado preservada;
  - "Faça sua oferta." com salário, papel, duração e resumo;
  - negociação com motivo e ações (Aceitar salário pedido, Fazer nova
    proposta, Dispensar);
  - empréstimo com "Aceitar N% do salário".
- testes:
  - novos: `test_motor_mer`, `test_motor_mer_integracao`, `test_v2_mer`
    e o domínio da v2;
  - equivalência ajustada só no que mudou de propósito;
  - script `tests/unit/calibracao_mer.js`.
- defeitos achados no caminho e corrigidos:
  - id de proposta podia repetir no mesmo milissegundo;
  - o Link da v2 descartava um onClick próprio (a navegação virava recarga);
  - o salário pedido podia arredondar para baixo do oferecido. Decisões do Murilo (13/11):
1) a proposta leva salário, papel prometido e duração, e o atleta decide
   junto com o clube;
2) decisões determinísticas (MER-06);
3) a promessa de papel vale já nesta fase: deixar no banco quem foi
   prometido titular derruba a moral e pode gerar pedido de saída;
4) entrega num PR só.
Origem: `docs/carreira-v2/fase1/02_Requisitos_Mercado.md` (MER-01 a
MER-07 e matriz de aceite), sem alteração.
Ordem: antes de mexer nas regras do mercado, o lote L3 do plano
`docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (os 22 testes de mercado
saem da tela antiga), para as regras novas já nascerem com teste.
Leitura do PM: o motor já tem IA de mercado, avaliação, propostas,
empréstimo e parcelamento (`motor/mercado.js`, `motor/clube.js`); MER
evolui o que existe (CLAUDE.md, seções 5 e 21), com calibração
registrada (MER-06).

⸻

SERIED-001 — Catálogo da Série D e integração com a Copa do Brasil

Status: APROVADO (Murilo, 13/11/2026, "Aprovado"; PR #111). Os 20 escudos de
uso restrito ficam no jogo (Murilo, 13/11: "Ficam no jogo").
Plano: `docs/carreira-v2/serie-d/PLANO_SERIED.md` (seção 7: decisões e relatório).
Decisões do Murilo (13/11):
1) ABC, Retrô, CSA e Tombense continuam na Série C;
2) Copa com a D: preliminar em jogo único na rodada 1;
3) escudos: revista em 13/11 para "Faça uma cópia local das logos obtidas
   na Wikipédia. Para que o jogo funcione offline". Feito:
   - os 40 escudos estão em `public/img/teams/` e no pré-carregamento do
     service worker;
   - a origem está em `docs/carreira-v2/serie-d/escudos_origem.json`;
   - atenção: 20 dos 40 vêm da Wikipédia em português, onde são de uso
     restrito (fair use), e precisam de decisão do PM antes de distribuir;
4) só carreiras novas recebem o catálogo.
Origem: `docs/carreira-v2/serie-d/03_Catalogo_e_Integracao.md` e o
catálogo `serie_d_40_clubes.json`/`.csv` (40 clubes, edição 2026), sem
alteração.
Leitura do PM: hoje a Série D é um conjunto de 20 clubes de exemplo
(`DEMO_TEAMS_SERIE_D` em `public/js/data.js`, `serieDPool` na virada,
`motor/virada.js`). O catálogo novo substitui esse conjunto. Os escudos
estão "pendente" em todos os 40 registros: pela regra do próprio
documento, a integração só fica completa com cada escudo verificado em
fonte oficial e empacotado localmente.

⸻

ESCUDOS-001 — elencos reais, escudos locais e escudo original

Status: APROVADO (Murilo, 14/11, "Aprovado"; PR #115).
Plano e relatório: `docs/carreira-v2/escudos/PLANO_ESCUDOS.md`.
Origem: relato do Murilo (13/11): elencos falsos, escudos que não carregam
e escudos em negativo.
Decisões do Murilo (13/11):
1) dados reais nas 3 divisões: o Murilo configura a produção
   (DATA_PROVIDER=frozen, ENABLED_COMPETITIONS=serie_b,serie_c,
   LIVE_SEASON=2026); passos na seção 4 do plano;
2) cópia local dos escudos das Séries A, B e C;
3) escudo original sobre chapinha clara (sem negativo).
Pendente com o Murilo: configurar as variáveis na produção.
Decisão do Murilo (14/11) sobre a licença dos escudos de uso restrito
(Séries A–D): "Manter todos" — ficam no jogo, sem nova decisão antes da loja.

⸻

NOTICIAS-RODADA — toda rodada gera notícias

Status: APROVADO (Murilo, 16/11, "Pode fazer o merge"; PR #129).
Pedido do Murilo (15/11): "As notícias precisam atualizar após todos os
jogos." Decisão (16/11): "Notícia de toda rodada" — mesmo sem fato marcante,
a rodada gera notícias (o resultado do seu jogo e um resumo). Copa, outras
divisões e a tela não foram pedidos.
Hoje: `generateRoundNews` (fechamento da rodada) só tinha manchete de fato
marcante (líder, goleada, zebra, empate defendido, lanterna, jejum); sem
nenhum, saía "Rodada N não teve grandes surpresas".
Regras: a cada rodada, (1) a notícia do seu jogo, primeiro ("X vence Y por
2 x 1 em casa", "perde para", "empata com", do seu ponto de vista); (2) as
manchetes de sempre (até 6); (3) o resumo, por último ("Rodada N: G gols em
J jogos; maior vitória: …; Z lidera com P pontos"). O "sem surpresas" saiu.
Etiquetas na v2: "Seu jogo" e "Resumo da rodada".
Relatório (16/11): `motor/registro.js` (`noticiaDoSeuJogo`,
`resumoDaRodada`); `carreira-v2/src/domain/week.ts` (etiquetas). Testes:
`tests/unit/test_motor_noticias_rodada.js` (4); `test_noticias_rodada` item 7
e `test_portal_noticias_premiacoes` item 2 passam a esperar o resumo;
`test_motor_registro` desconta as notícias novas na comparação com a cópia
congelada. Contraprovas (sem o seu jogo, sem o resumo, placar do ponto de
vista errado) falham o teste.

⸻

CONSELHO-INTERVALO — a comissão opina no intervalo

Status: APROVADO (Murilo, 16/11, "Pode fazer o merge"; PR #130).
Pedido do Murilo (16/11): "O assistente deve opinar no intervalo. Sugerir
mudanças táticas, alterações e dicas sobre o time."
Decisões do Murilo (16/11): quem opina é a comissão técnica, se contratada
(sem ela, a Pausa do intervalo convida a contratar); cobre tática pelo
placar, cansaço e cartões, desempenho do 1º tempo e formação; conselho com
mudança se aplica com um toque.
Regras (motor/conselho.js):
- Tática pelo placar: perdendo → "Partir para cima" (ritmo 4, pressão 4,
  linha 4); ganhando → "Segurar o resultado" (ritmo 2, pressão 3, linha 2);
  empate → "Seguir o plano" (sem mudança).
- Cansaço e cartões: o titular em mais risco (amarelo no jogo, condição
  abaixo de 60%) sai para o melhor reserva da mesma posição no banco; gasta
  1 substituição; sem substituição ou sem reserva da posição, explica.
- Desempenho: leitura das estatísticas do 1º tempo (finalizações, no gol,
  posse) — só texto.
- Formação: com os mesmos 11 em campo, cada um na sua posição, a formação
  que rende pelo menos 5% mais (gols a favor/contra) contra o adversário;
  aplicar troca o esquema (com a perda de efetividade de sempre).
- Aplicar confere que o conselho ainda vale (chave); se o time mudou, mostra
  o conselho atualizado. Só no intervalo.
Etapa do loop: Match (intervalo).
Relatório (16/11): `motor/conselho.js` (novo), comandos `conselhoIntervalo`
e `aplicarConselho` (`motor/jogo.js`); v2: seção "A comissão no intervalo"
na Pausa do intervalo (`screens/Match.tsx`, `match.css`); teste
`test_v2_conselho_intervalo` (6 itens: sem comissão convida a contratar;
com comissão, perdendo e com um cansado, os 4 conselhos; aplicar a tática;
aplicar o cansaço; o amarelo passa à frente do cansaço; 2º tempo e 360 px).
Contraprovas (opinar sem comissão, aplicar a tática sem mudar os eixos,
amarelo pesando menos, aplicar o cansaço sem substituir) falham o teste.
Depende da PAUSA-EVENTO (mesma tela da Pausa): branch montada sobre ela.

⸻

PAUSA-EVENTO — lesão ou expulsão sua para a partida e abre a Pausa

Status: APROVADO (Murilo, 16/11, "Pode fazer o merge"; PR #128).
Pedido do Murilo (15/11): "Quando um jogador se lesiona ou é expulso o jogo
deve pausar e abrir as mesmas opções de quando o jogo é pausado manualmente."
Decisões do Murilo (15/11): só jogador do seu time; a Pausa mostra o motivo.
Regras: no fim do bloco de 15', se um jogador seu se lesionou ou foi expulso,
a partida para como na pausa manual e a v2 abre a Pausa sozinha (uma vez por
parada), com o título "Jogo parado" e uma linha por lance ("Fulano foi
expulso (30’)"); as opções são as mesmas (Revisar time, Substituir, Ajustar
tática, Lances, Retomar). No intervalo, a Pausa do intervalo mostra o motivo.
Não para no último bloco (o jogo acaba) nem em "Pular para o fim". Retomar
ou pausar à mão tira o motivo. Lesão/expulsão do adversário só aparece nos
lances.
Relatório (16/11):
- Motor: `jogo.js` (`resolveLiveChunk` marca a parada e guarda
  `lm.pausaMotivo`; retomar/continuar o intervalo/pausar à mão apagam);
  `carga.js` (`ponteEstado` devolve `paradaPor`). `lm.pararEmEvento ===
  false` desliga a regra: só os testes de equivalência com as cópias
  congeladas (`test_motor_jogo`, `test_motor_aovivo`) usam.
- v2: `domain/match.ts` (`stoppageOf`), `screens/Match.tsx` (abre a Pausa
  sozinha e mostra a faixa), `match.css` (`.pz-stop`).
- Testes: `test_v2_pausa_evento` (5 itens: pausa manual sem faixa, parada
  com a Pausa aberta sozinha e só os seus, retomar limpa, Pular para o fim
  não para, 360 px) e `match.test.ts`. Contraprovas (não parar, contar o
  adversário, parar no Pular para o fim, retomar sem limpar) falham o teste.
- Efeito nos testes antigos: a partida agora para sozinha às vezes. Os testes
  que acompanham a partida andando (`test_v2_resultado`, `test_v2_pausa`,
  `test_v2_partida`, `test_v2_ajustes`, `test_v2_foco`, `test_v2_offline`)
  retomam essas paradas pelo ajudante `retomarParadasAutomaticas`
  (`_v2_carreira.js`): 4 rodadas seguidas, 24/24.

⸻

EMPRESTIMO-DISPONIVEL — "Disponível para empréstimo" e filtro no Mercado

Status: APROVADO (Murilo, 15/11, "Aprovado").
Pedido do Murilo (15/11): "Criar a opção 'Disponível para empréstimos' onde
os clubes podem colocar os jogadores que precisam de minutagem. Criar filtro
em mercado com a opção 'Disponível para empréstimo'."
Hoje: dá para pedir empréstimo de jogador da CPU (`avaliarPedidoDeEmprestimo`,
pelo papel na origem, cobertura e % do salário) e emprestar um seu
("Emprestar" acha um interessado). Não há marca de disponibilidade nem filtro.
O jogo não registra minutos jogados dos jogadores da CPU.
Decisões do Murilo (15/11):
1) a CPU marca sozinha e o técnico marca os dele;
2) critério da CPU: reserva no próprio elenco (a regra de papel do mercado),
   com a posição coberta sem ele; na lista, jovens até 23 anos primeiro;
3) a marca facilita e barateia: o clube da CPU aceita emprestar se o
   jogador for titular ou rotação no seu time, já a partir de 50% do
   salário; recusa se ele ficar reserva com você;
4) jogador seu marcado recebe propostas de empréstimo da CPU na janela, e
   você aceita ou recusa.
Regras (spec):
- CPU: calculado na hora, sem guardar no save (`mercado.precisaDeMinutos`):
  papel "reserva" no clube, posição com a cobertura mínima sem ele, sem estar
  emprestado.
- Pedido de empréstimo de jogador disponível: titular ou rotação no seu time
  e ≥ 50% do salário → aceita; reserva no seu time → recusa ("ele precisa de
  minutos"). A cláusula, a duração, o teto e a janela seguem a regra de hoje.
- Seu jogador: `loanListed` no jogador (só elenco principal). Na janela, a
  cada rodada (sorteio com chave), um clube da CPU em que ele seria titular
  ou rotação pode mandar proposta (até 2 abertas por jogador): temporada
  inteira, taxa igual à do "Emprestar" (10% do valor). Aceitar empresta
  (mesmo fechamento do "Emprestar"); recusar descarta. Fechada a janela, as
  propostas abertas caem. Sair do elenco, ir para a base ou tirar a marca
  descarta as propostas. O mínimo de 14 no elenco principal vale.
- v2: filtro "Disponível para empréstimo" no Mercado (e a marca na linha);
  no Perfil do jogador, o interruptor "Disponível para empréstimo"; no
  Mercado, "Meus jogadores para empréstimo" com as propostas (Aceitar ou
  Recusar).
- Etapa do loop: Market / Management.
Critérios de aceite:
1) O filtro mostra só jogadores da CPU disponíveis (reservas com a posição
   coberta), jovens até 23 anos primeiro.
2) Pedir um disponível que seria titular ou rotação no seu time, a 50%:
   aceito. Que seria reserva: recusado com o motivo.
3) Seu jogador marcado recebe proposta na janela; aceitar empresta e cobra
   a taxa; recusar descarta; fora da janela, nenhuma.
4) Tirar a marca, vender, emprestar por outro caminho ou mandar para a base
   descarta as propostas; save antigo abre sem marca nem propostas.
Anti-exploit: só durante a janela; até 2 propostas por jogador; sorteio
com chave (recarregar não muda o resultado); taxa igual à do Emprestar.
Relatório (15/11):
- Motor: `mercado.js` (`precisaDeMinutos`; `avaliacaoEmprestimo` com
  `ctx.disponivel`), `negociacao.js` (passa a marca ao avaliar o pedido),
  `semana.js` (`resolveLoanListingsRound`, propostas na janela, chamada na
  semana sem jogo e em `fechamento.js` na rodada), `clube.js`
  (`setLoanListed`, `acceptLoanOfferIn`, `rejectLoanOfferIn`), `ponte.js`
  (`disponivelEmprestimo`, `aceitarPropostaEmprestimo`,
  `recusarPropostaEmprestimo`; `mercado()` devolve `disponiveisEmprestimo`).
  Save: `loanListed` no jogador e `loanOffersIn` na carreira, só quando
  usados; save antigo abre sem nada.
- Ajuste achado nos testes: quem já recusa empréstimo pela regra de sempre
  (`isLoanOutRefused`, jogador importante demais) não pode ser marcado
  (mensagem); se passar a recusar depois de marcado, o "Aceitar" explica.
- v2: filtro "Disponibilidade" (Todos / Disponível para empréstimo) e a
  marca na linha do Mercado; "Meus jogadores para empréstimo" no Mercado
  (`/mercado/emprestimos`, Aceitar/Recusar/Tirar da lista); interruptor na
  ficha ("A temporada em números"); aviso na tela de pedir empréstimo. A
  tela "A temporada em números" passou a mostrar o erro das ações.
- Mudança de comportamento (decisão 3): pedir um reserva disponível que
  ficaria reserva no seu time agora é recusado. `test_loans`,
  `test_loan_advanced` e `test_v2_mercado` pediam justamente esse caso e
  passaram a pedir um disponível que seria titular ou rotação aqui.
- Testes: `tests/unit/test_motor_emprestimo_disponivel.js` (7),
  `market.test.ts` (filtro e ordem) e `test_v2_emprestimo_disponivel` (9
  itens, critérios 1 a 4 e 360 px). Contraprovas (precisaDeMinutos sempre
  falso, marca sem efeito na avaliação, até 3 propostas, propostas fora da
  janela, marcar quem recusa, sem a ordem dos jovens) falham os testes.

⸻

TETO-CAIXA — o técnico aumenta o teto salarial com dinheiro do caixa

Status: APROVADO (Murilo, 15/11, "Aprovado pode mergear"; PR #126).
Pedido do Murilo (15/11): "Quando tiver dinheiro em caixa o técnico deve ter
autonomia para aumentar o valor em salários e com isso diminuir o valor para
transferências. Esse cálculo deve considerar que cada real ampliado em
salários equivale a 12x que deve ser retirado do orçamento para
transferências."
Hoje: o teto salarial (`finances.wageCap`, mensal) barra contratar, renovar,
promover e pegar emprestado; as compras saem do caixa (`finances.cash`); não
existe verba de transferências separada. Só a diretoria ("Pedir mais
orçamento", com espera de 4 rodadas) aumenta o teto no meio da temporada. Na
virada, o teto é recalculado (folha × 1,35, `motor/virada.js`).
Decisões do Murilo (15/11):
1) os 12× saem do caixa (não se cria verba nova);
2) dá para desfazer só a folga não usada, devolvendo 12× o que baixar;
3) o aumento vale até a virada: o teto da temporada nova é recalculado como
   hoje e o dinheiro reservado não volta;
4) caixa mínimo: depois da troca, o caixa não pode ficar abaixo de 1 mês de
   folha.
Regras (spec):
- Aumentar o teto em X (R$ por mês, X > 0, múltiplo de R$ 1 mil): sai 12·X do
  caixa na hora; só se caixa − 12·X ≥ folha mensal atual. Lançamento no
  extrato: "Reserva para salários (teto +R$ X/mês)", −12·X.
- Devolver Y (Y > 0, múltiplo de R$ 1 mil): só até o que o técnico aumentou
  nesta temporada e sem o teto ficar abaixo da folha atual; volta 12·Y ao
  caixa, com lançamento no extrato. Aumentar e devolver não dá lucro.
- O aumento da diretoria não entra na conta do que pode ser devolvido.
- Virada: o reservado da temporada zera, sem devolver dinheiro.
- Save: campo novo `finances.wageCapBought`, gravado só quando o técnico
  usa o ajuste (e zerado na virada); ausente vale 0, então save antigo
  abre sem migração.
- CPU: não usa (o orçamento dos clubes da CPU é calculado à parte).
- Tela (v2): "Ajustar teto salarial", aberta pelas Finanças e pela tela de
  orçamento da Diretoria; mostra teto, folha, caixa e o caixa mínimo; escolhe
  o valor em passos de R$ 1 mil, com a prévia de quanto sai (ou volta) do
  caixa e o novo teto; motivo claro quando não pode.
- Etapa do loop: gestão (Market / Management), qualquer momento da temporada.
Critérios de aceite:
1) Aumentar X tira exatamente 12·X do caixa, soma X ao teto e lança no
   extrato; o teto novo libera contratar/renovar até ele.
2) Sem caixa (caixa − 12·X < folha), recusa com o motivo, e nada muda.
3) Devolver Y ≤ reservado e sem ficar abaixo da folha: volta 12·Y; acima
   disso, recusa com o motivo.
4) Na virada, o teto é recalculado como hoje e o reservado zera.
5) Save antigo abre com reservado 0.
6) A tela da v2 mostra a prévia antes de confirmar, e o resultado depois.
Anti-exploit: devolver só o que foi reservado na temporada, 12× nos dois
sentidos (sem ganho), nada volta na virada, caixa mínimo de 1 mês de folha.
Relatório (15/11):
- Motor: `financas.js` (`wageCapTrade`, `wageCapTradeLimits`,
  `WAGE_CAP_CASH_MULT = 12`, passo de R$ 1 mil; função pura); `ponte.js`
  (comandos `tetoSalarial` e `ajustarTeto`, lançamento "Reserva para
  salários" no extrato, tipo `salario`); `virada.js` (zera o reservado);
  save antigo: o campo ausente vale 0 (sem preenchimento ao carregar, para
  o save em memória continuar igual ao do servidor; ver `test_save_limit_001`).
- v2: tela "Ajuste o teto." em `/financas/teto` (`More.tsx`,
  `WageCapScreen`), com a prévia em `domain/wagecap.ts`; link nas
  Finanças e na tela de orçamento da Diretoria.
- Testes: `tests/unit/test_motor_teto.js` (8), `wagecap.test.ts` (5) e
  `test_v2_teto_caixa` (8 itens, critérios 1 a 6, save antigo e 360 px).
  Contraprovas: multiplicador 11, sem caixa mínimo, devolver além do
  reservado e virada sem zerar falham os testes.
- Não muda: o pedido à diretoria, a CPU e o mercado (as compras continuam
  saindo do caixa, agora menor).

⸻

SONS-V2 — efeitos sonoros na partida da v2

Status: REGISTRADA (Murilo, 15/11, "Registrar demanda"); aguarda priorização.
Origem: lacuna achada no lote L6a (docs/carreira-v2/ENTREGA_TESTES_L6.md).
A tela antiga tocava apito de início e fim, som de gol e torcida ambiente
(Web Audio, sem arquivo de áudio, em `public/js/carreira.js`). A v2 tem o
interruptor "Efeitos sonoros" em Configurações, com o texto "Apito, som de
gol e torcida durante a partida ao vivo", mas nenhum som toca: o interruptor
só grava a preferência (`mt_sfx_enabled`, `motor/v2.js`).
Pendente: decidir quando levar os sons para a partida da v2. O teste antigo
(`test_efeitos_sonoros`) saiu da suíte; o interruptor segue coberto por
`test_v2_jogos_mais` item 7.

⸻

OBJETIVOS-V2 — objetivos diários, semanais e da temporada na v2

Status: REGISTRADA (Murilo, 15/11, "Registrar demanda"); aguarda priorização.
Origem: lacuna achada no lote L6a (docs/carreira-v2/ENTREGA_TESTES_L6.md).
A tela antiga tinha a aba Objetivos (3 diários, 2 semanais, 2 da temporada,
com prêmio ao coletar). O motor ainda conta o progresso (`CAREER.objectives`,
`motor/registro.js` e `motor/aovivo.js`), mas a v2 não tem tela nem comando
da ponte para ver ou coletar.
Pendente: decidir se a v2 ganha a tela ou se os objetivos saem do jogo. Os
itens 3 a 5 do `test_engajamento` antigo não têm equivalente até lá.

⸻

SHARE-RESULTADO-V2 — compartilhar o resultado da rodada como imagem

Status: REGISTRADA (Murilo, 15/11, "Registrar demanda"); aguarda priorização.
Origem: lacuna achada no lote L6a (docs/carreira-v2/ENTREGA_TESTES_L6.md).
A tela antiga tinha "Compartilhar" em "Seu jogo" (cartão PNG do resultado).
A v2 compartilha conquista (`test_share_cards`) e título
(`test_v2_onboarding` item 5), mas não o resultado da rodada.
Pendente: decidir quando o Resultado da v2 ganha o cartão.

⸻

GOLS-REAIS — nível de gols real e menos 0x0 com dados reais

Status: APROVADO (Murilo, 17/11, "Aprovado"; PR #133).
Pedido (Murilo, 17/11): "Com certa frequência o jogo repete o placar de 0x0
por 5/6 partidas seguidas. Isso precisa ser evitado pois tira a realidade do
jogo."
Diagnóstico (antes de especificar):
- Gols esperados = ataque × defesa do adversário (× 1,12 do mandante). Com
  dados reais (catálogo congelado ou API), `calibrateStrengths` divide os
  gols de cada clube pela média da liga: a força vira só relativa e o motor
  perde quantos gols o campeonato faz. Toda divisão real vira ~2,1 gols por
  jogo (real: A 2,64; B 2,28; C 2,27) e ~13% de 0x0 (real: ~7–11%).
- Clubes de ataque e defesa baixos ficam com 20–23% de 0x0; com 5-4-1 e
  táticas no mínimo, ~31%.
- Medido no motor de verdade (80 temporadas, 8 clubes, catálogo congelado,
  tática padrão): 17,4% de 0x0 no seu time, liga com 2,1 gols por jogo;
  3+ 0x0 seguidos em 6 temporadas e 5 seguidos em 1.
- O Modo Exemplo não tem o problema (~2,95 gols, ~5% de 0x0).
Decisões do Murilo (17/11):
- "Calibrar + suavizar": gols no nível real de cada campeonato e extremos
  de ataque/defesa amortecidos em 30% em direção à média; sem regra
  artificial contra sequência.
- "Vale para todas": carreiras em andamento também.
Especificação:
- Força DE JOGO (só para os gols): `atk' = ((1 − 0,3) × atk + 0,3) × k`,
  `def' = ((1 − 0,3) × def + 0,3) × k`, com `k = √(2 × média de gols por
  time na liga real ÷ (1 + 1,12))` do campeonato do clube.
- A força gravada (`atk`/`def`) NÃO muda: ela também gera jogadores e base
  (overall de atacante usa `atk`, de defensor `2 − def`); escalar ali
  distorceria os elencos.
- `k` por campeonato fica no save (`CAREER.nivelGols`), só para campeonatos
  com dados reais. Sem entrada (Modo Exemplo, Série D): força de sempre.
- Carreira nova: `nivelGols` gravado na criação, pela tabela real carregada.
- Carreira em andamento: migração 2 do save (`schemaVersion` 1 → 2) preenche
  `nivelGols` dos campeonatos em modo real nesta abertura, com o `k` da
  tabela carregada; sem ela, o valor fixo do catálogo de 2026
  (A 1,115; B 1,036; C 1,034). Vale a partir da próxima partida; nada já
  jogado muda.
- Entra em todo lugar que calcula gols com a força do clube: partida ao vivo
  e direta, jogos da CPU, outras divisões, Copa, conselho do intervalo,
  prévia do confronto e sugestão de tática.
Critérios de aceite:
1. Com o catálogo congelado, a liga simulada fica perto da real (A ~2,6;
   B e C ~2,3 gols por jogo) e o 0x0 médio cai para ~7–11%.
2. 5 0x0 seguidos do seu time viram raridade (≤ 0,5% por temporada no
   pior clube, tática padrão).
3. Modo Exemplo e Série D inalterados.
4. Save antigo migra uma vez (versão 2), sem mudar resultados já jogados;
   save novo nasce na versão 2.
5. Geração de jogadores e base igual à de antes.
Fora de escopo: regra artificial contra sequência de 0x0; mudar o efeito
de táticas/formação; recalibrar a força ao longo da temporada.
Relatório (17/11):
- Motor:
  - `partida.js`: `GOLS_SUAVIZACAO` (0,3), `nivelDeGols(média)` e
    `forcaComNivel(clube, nível)`, puros.
  - `estado.js`: `SCHEMA_VERSION` 2; migração 2; `completarNivelGols`;
    `forcaDeJogo(clube)` (nível do campeonato do clube, pelo
    `competitionId`); `NIVEL_GOLS_CATALOGO`.
  - `carga.js`: `mediaGolsDaLiga`; o nível de cada liga real carregada; o
    nível gravado na criação; o mesmo completar depois da migração (só
    preenche campeonato real sem nível).
  - A força de jogo entra em `computeHumanStrength`, nos jogos da CPU
    (`resolveCpuFixture`), nas outras divisões, na Copa
    (`simulateCupLeg`), na partida ao vivo (`aovivo.js`), no conselho do
    intervalo, na prévia do confronto (`ponte.js`) e na sugestão de tática.
  - `calibrateStrengths`, a geração de jogadores e a base não mudam.
- Resultado no motor de verdade (catálogo congelado, 80 temporadas, os
  mesmos 8 clubes, quase todos os mais retrancados de cada divisão; tática
  padrão):

  | | Antes | Depois | Real |
  |---|---|---|---|
  | Gols por jogo, A | 2,13 | 2,65 | 2,64 |
  | Gols por jogo, B | 2,13 | 2,30 | 2,28 |
  | Gols por jogo, C | 2,10 | 2,30 | 2,27 |
  | 0x0 do seu time | 17,4% | 12,1% | — |
  | Temporadas com 3+ 0x0 seguidos | 5 | 4 | — |
  | Temporadas com 5+ 0x0 seguidos | 1 | 0 | — |

  Por clube, depois: Botafogo 3,4%, América-MG 7,5%, Corinthians 10,7%,
  os retrancados da B e da C 14–18% (eles também fazem poucos gols de
  verdade).
- Testes:
  - `tests/unit/test_motor_gols_reais.js` (11/11): fórmula, nível do
    catálogo, liga simulada perto da real, 5 seguidos ≤ 0,5% no pior clube
    (critério 2), migração, Modo Exemplo e Série D iguais, nível fixo,
    força humana.
  - `tests/e2e/test_gols_reais_catalogo.js`, perfil `frozen` (3/3):
    carreira nova na versão 2 com o nível; save antigo (versão 1) migra ao
    abrir sem mudar a força gravada; a rodada seguinte grava.
  - Unitários do motor (equivalência com as cópias congeladas) seguem
    iguais: sem nível (Modo Exemplo), a força é a de sempre.
  - Contraprovas: suavização 0 (falham 2, 5 e 9); força de jogo sem
    nível (9); migração vazia (6 e 7); força humana com a força crua (10).
    Depois, o motor voltou ao estado esperado.
  - v2: tipos e 137 unitários ok.
- Riscos e observações:
  - Mais gols também na Copa e nas outras divisões (é o objetivo);
    clubes reais ficam mais fortes que os da Série D na Copa (k > 1 só
    para eles), o que é coerente.
  - O conselho do intervalo e a prévia do confronto passam a usar a força
    de jogo; a comparação entre formações não muda de sentido.
  - Com dado ao vivo (API), o nível vem da tabela real do dia da criação
    e fica fixo na carreira (fora de escopo recalibrar).
  - Carreira em andamento: vale a partir da próxima partida; partida em
    andamento (checkpoint) termina com o nível novo nos blocos restantes.

⸻

PARIDADE-E4-3 — Minutos para os jovens; orçamento e base do clube na troca (PARIDADE-CPU, E4, PR3)

Status: REVISÃO DO PM NECESSÁRIA.
Decisões do Murilo (24/11), sobre os pontos em aberto do relatório final:
"1. Dar minutos para os jovens"; "2. Pode considerar concluído" (validação
no iPhone, D5/V09); "3. O orçamento e a base é do clube e não do treinador.
Não faz sentido ter mudanças porque um treinador mudou de clube".
Feito (motor):
- Minutos para os jovens (virada.minutosParaJovem, na convocação da CPU,
  JOVENS_CPU): a CPU põe até 2 jovens por jogo (até 21 anos, potencial ao
  menos 6 acima do overall, do elenco todo, não só do banco) no lugar do
  titular mais fraco da posição, se a diferença for de até 12; quem sai
  vai para o banco. Jogando, o jovem evolui pela regra da rodada jogada,
  como os seus.
- Medido: os jovens passaram a jogar (~860 escalações por temporada) e
  chegam ao potencial em 1–2 temporadas, mas só isso não segurava o nível
  (o XI caía de 77,1 para 73,6 em 5 temporadas): o teto é o potencial de
  quem sobe da base. Por isso a peneira da base da CPU foi ampliada:
  BASE_CPU.olhados 6 → 20 (sobem os 3 de maior potencial, como antes).
  Calibração (dados reais, 3 seeds × 5 temporadas; overall médio / XI):
  6 olhados 72,3→68,4 / 77,1→73,6; 12: 72,3→71,7 / 77,1→75,4;
  16: 72,3→72,3 / 77,1→75,8; 20: 72,3→73,1 / 77,1→76,7 (escolhido: o XI,
  que decide o jogo, fica estável; o overall sobe ~0,2 por temporada).
- Troca de clube (virada.trocarDeClube):
  - as parcelas a pagar e a receber ficam com o clube antigo: o saldo delas
    (a receber menos a pagar) entra no caixa guardado dele
    (saldoDasParcelas); você não leva nem paga as do clube antigo;
  - a base fica no clube antigo (CAREER.basesCpu[clube], no mundo da
    troca); na virada, ele olha primeiro a base guardada, junto com os
    gerados, e promove os de maior potencial; ela envelhece um ano e quem
    passa de 21 sem subir sai;
  - o clube novo vem com a base dele: a guardada, se um treinador a deixou
    lá; senão, 16 jovens como numa carreira nova nesse clube.
- Simplificação (registrada): as parcelas do clube antigo entram de uma vez
  no caixa dele, não rodada a rodada (a CPU não tem parcelas).
Testes:
- test_paridade_troca (7/7): itens 2 e 3 com parcelas e base; novo item 7
  (o clube antigo promove primeiro da base guardada);
- test_paridade_evolucao (6/6): novo item 6 (minutos para os jovens).
Validação de 5 temporadas (real e exemplo, 3 seeds; RELATORIO_FINAL.md):
- XI da CPU: real 77,1 → 77,1; exemplo 80,6 → 78,9;
- gols A/B/C real 2,60 / 3,02 / 2,87; zebras dentro de ±1,5 p.p. do E0;
- rodada p50/p95 168/319 ms; pico do save 883 KB (JSON), ~97 KB comprimido;
  nenhum problema.

⸻

PARIDADE-E4-2 — Troca de clube sem recomeçar o mundo (PARIDADE-CPU, E4, PR2)

Status: REVISÃO DO PM NECESSÁRIA.
Requisitos: CPU-10, V07, V08; achado A12. Decisão do Murilo (22/11): "Mundo
segue, clube novo como está".
Feito (motor, virada.trocarDeClube, chamado por aceitarPropostaClube):
- O mundo segue: temporada, rodada, calendário, tabela, divisões, Copa,
  elencos e contas da CPU, agentes livres, perfis dos técnicos, notícias,
  conquistas e objetivos (MUNDO_NA_TROCA). A reputação e o histórico do
  técnico seguem como antes (endCurrentClubStint).
- O clube antigo volta à CPU:
  - o elenco principal (pela entrada comum, com dispensa de excedente para
    os agentes livres se passar de 26);
  - o seu caixa vira o caixa guardado dele;
  - quem você pegou emprestado volta ao dono;
  - quem você emprestou volta ao elenco do clube antigo;
  - a base fica de fora (a CPU não tem base).
- Você assume o elenco e o caixa guardado do clube novo (ele sai da CPU).
  Estádio, patrocínio, meta do conselho, comissão, olheiros, esquemas e
  estatísticas da passagem começam como numa carreira nova (montarCarreira).
- Chave estado.PARIDADE_CPU.troca (sem ela, carreira nova como antes; false
  no test_motor_carga, que compara com a cópia congelada).
Ficam de fora (registrado):
- as parcelas a pagar e a receber do clube antigo deixam de existir;
- o clube novo começa sem jogadores da base.
Também neste PR (fecha o E4):
- Base da CPU (decisão do Murilo 23/11, "Base da CPU"):
  - na virada, cada clube olha 6 jovens da base (o gerador da sua base) e
    promove os 3 de maior potencial ao profissional, com 90% do potencial
    (BASE_CPU);
  - cada um entra no lugar do mais velho da posição, que vai para os
    agentes livres; o elenco não cresce;
  - quem acabou de voltar de empréstimo na virada não é substituído.
- O histórico de lesões da CPU recomeça na virada (o save não cresce
  temporada a temporada; test_motor_serie_d de 10 temporadas: 664 → 688 KB).
- paridade_achados: o A9 passa a olhar o mercado que roda com a regra
  ligada.
- Relatório final: docs/paridade-cpu/RELATORIO_FINAL.md, com a validação
  de 5 temporadas e os pontos em aberto. O principal: o overall médio da
  CPU ainda cai ~0,9–1,1 por temporada.
Testes:
- test_paridade_troca (novo, frozen, 6/6): mundo, clube antigo, clube novo,
  técnico, jogar e gravar depois da troca, chave;
- test_motor_carga com a chave desligada;
- suíte completa: 185/185 (com a base da CPU e o relatório).

⸻

PARIDADE-E4-1 — Treino, evolução e moral da CPU (PARIDADE-CPU, E4, PR1)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Requisito: CPU-09; achado A11.
Decisões do Murilo (22/11):
- "Treino semanal igual ao seu";
- "Mesma regra, sem conversas";
- custo: "Aceitar e validar no iPhone".
Feito (motor):
- Semana: a CPU treina com o plano padrão pela mesma regra do seu treino
  (treino.trainingWeek: condição, evolução com potencial, teto da temporada
  e faixa alta). Não guarda o histórico de fadiga nem a tendência, que só as
  telas do seu elenco usam.
- Depois de cada jogo de liga da CPU (direto, outras divisões e o adversário
  da sua partida), duas regras do seu elenco passam a valer para ela:
  - a evolução por rodada jogada (treino.agingWeek);
  - a moral pela regra da sua partida (aovivo.moralDaCpu): resultado;
    titular, banco ou fora da lista; fator de reclamação; "pede para sair"
    com banco seguido e moral baixa. Sem conversas e sem motivo em texto.
- Quem pede para sair entra nos motivos de venda como "Insatisfeito".
- Virada: sem a evolução anual de antes (temporada.renewLeagueSquad,
  evolucaoAnual).
- Desempenho:
  - treino.patchOf compara números e textos direto (só os objetos passam
    pelo JSON);
  - o mercado CPU × CPU monta o clube comprador uma vez por tentativa;
  - os resultados são os mesmos.
- Chave estado.PARIDADE_CPU.evolucao (false só nos testes de equivalência).
Medido (baseline, dados reais, 3 seeds × 3 temporadas):
- gols iguais aos do E3;
- overall médio da CPU 72,3 / 71,1 / 70,0 por temporada (antes: 71,1 /
  70,6 / 70,2);
- save: pico de 916 KB (o envio vai comprimido desde a D6);
- tempo da rodada (Node, com gravação, medido no mesmo momento): p50 de
  131 → 177 ms e p95 de 245 → 373 ms em relação ao E2. Disso, o E3 (mercado
  e save) responde por ~+23% e o E4 pelo resto. Aceito pelo Murilo; validar
  no iPhone (D5/V09).
Testes:
- test_paridade_evolucao (novo, frozen, 5/5);
- test_training_evolution, item 2: agora confere que o seu plano não vale
  para a CPU (ela treina pelo plano padrão dela);
- suíte completa: 184/184 (com o item 2 ajustado);
- equivalências com a regra desligada.

⸻

PARIDADE-E3-3 — Contratos da CPU e agentes livres (PARIDADE-CPU, E3, PR3)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Requisito: CPU-08. Decisão do Murilo: "Lista de agentes livres" (20/11).
Feito (motor):
- Virada (virada.renovarElencoDaCpu):
  - quem a CPU não renova (regra do A14) vai para CAREER.agentesLivres (até
    40), com o último clube;
  - a reposição usa primeiro um agente livre da mesma posição e do nível de
    quem saiu (até 2 abaixo, até 33 anos, de outro clube), com o contrato e
    o salário do gerado que ocuparia a vaga;
  - sai da lista quem está livre desde antes da temporada que acabou
    (viradaDosAgentesLivres): uma temporada sem clube.
- Você contrata um agente livre (clube.contratarAgenteLivre; ponte
  contratarAgenteLivre; a lista vem em mercado().agentesLivres):
  - sem taxa de transferência, só com o salário que ele pede (o justo pelo
    nível e pela idade, temporada.fairWageFor);
  - contrato de 2 temporadas, a qualquer momento;
  - cabendo no teto salarial e no tamanho do elenco.
- Cláusula de compra da CPU (fechamento.shouldExerciseBuyOption): a opção
  facultativa passa a ser decidida pelo preço (até 1,2× o valor), pelo caixa
  e pela contribuição (ele não seria reserva no elenco dela), sem sorteio.
  A compra obrigatória e os retornos seguem como estavam.
- Chave estado.PARIDADE_CPU.contratos (false só nos testes de equivalência).
v2:
- Mercado → "Agentes livres" (com a quantidade);
- a tela lista posição, overall, idade, último clube e salário pedido, com
  "Contratar sem taxa".
Testes:
- test_paridade_contratos (novo, frozen, 6/6);
- test_v2_agentes_livres (novo, 5/5, com 360 px);
- equivalências com a regra desligada; hospedeiro e virada (100 mundos) ok;
- suíte completa: 183/183.

⸻

PARIDADE-E3-2 — Mercado CPU × CPU com os avaliadores do seu mercado (PARIDADE-CPU, E3, PR2)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Requisitos: CPU-07 e V06; achado A9.
Decisões do Murilo:
- 20/11: "Libera excedente antes" e "Lista de agentes livres";
- 21/11: volume "Moderado" e propostas pelos seus jogadores "~35%".
Feito (motor):
- Vaga (semana.temVagaCpu): o elenco cheio (26) tem vaga se houver um
  excedente, isto é, um reserva com a posição coberta sem ele (o pior, e o
  mais velho no empate). Vale para o CPU × CPU, para as propostas da CPU
  pelos seus jogadores, para os anúncios e para os empréstimos.
- Todo jogador que chega a um elenco da CPU passa por
  semana.entrarNoElencoCpu. Se o elenco está cheio, o excedente é dispensado
  para CAREER.agentesLivres (até 40, com a data e o último clube). A
  contratação dos agentes livres vem no PR3.
- Mercado CPU × CPU (negociacao.mercadoCpuDaRodada), nas janelas, com 6
  tentativas por semana (~15–25 transferências por temporada):
  - o comprador olha 4 vendedores sorteados e ranqueia por transferScore
    (necessidade, adequação, caixa, contexto);
  - o vendedor pede a reserva da regra do seu mercado
    (reservaParaProposta: papel, cobertura, reposição, "à venda");
  - o comprador paga até o teto dele (caixa e 1,5× o valor);
  - o atleta decide pela mesma regra (avaliacaoAtleta: papel no destino,
    divisão, força, salário) e pode pedir mais salário, desde que caiba na
    folha;
  - o contrato novo é de 3 anos.
- Propostas da CPU pelos seus jogadores: 35% por semana de janela (a nota
  escolhe o clube). Dá cerca de 1 por janela; antes era sempre 0, por causa
  dos elencos cheios.
- Chave estado.PARIDADE_CPU.mercado (false só nos testes de equivalência).
Medido (1 temporada, dados congelados):
- 14–18 transferências CPU × CPU;
- uma dispensa por transferência para elenco cheio;
- caixas entre R$ 0,04 mi e R$ 30 mi;
- 2 propostas pelos seus jogadores.
Correções achadas no caminho (o teste do hospedeiro, página × motor):
- A suspensão pendente da CPU (3º amarelo) passa a valer logo no fim do jogo
  dela (fechamento.fecharSuspensoesCpu), não no fim da rodada. Antes, o jogo
  de Copa no meio da semana via o jogador disponível ou suspenso conforme o
  momento em que alguma tela chamava refreshAvailability.
- Quem leva o 3º amarelo e se lesiona no mesmo jogo cumpre a suspensão
  durante a lesão (semana.aplicarSuspensaoPendente). Antes, a lesão era
  apagada e ele virava só "suspenso".
Testes:
- test_paridade_mercado (novo, perfil frozen, 6/6);
- test_transfer_ai_balance_132, item 14: com o caixa guardado, confere que a
  negociação real não fecha (antes, a nota financeira);
- test_transfer_ai_market_dynamics, item 6: conta também os agentes livres;
- equivalências com a regra desligada; hospedeiro (40 mundos) ok;
- suíte completa: 181/181.

⸻

PARIDADE-E3-1 — Caixa da CPU guardado por clube (PARIDADE-CPU, E3, PR1)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Decisão do Murilo (20/11): D2 "Guardado por clube". Achado A10.
Feito (motor):
- semana.caixaDaCpu / moverCaixaCpu: o caixa de cada clube da CPU fica em
  CAREER.caixaCpu (por id, ~1,5 KB). Nasce no "normal" do porte (6 tetos de
  folha, mercado.caixaNormal) na primeira vez que o clube negocia. A folha
  continua derivada do elenco.
- O mercado (mercado.clubBudget) usa o caixa guardado: sem dinheiro, o
  clube não consegue pagar.
- O dinheiro mexe nos dois lados:
  - você vende para a CPU (anúncio, proposta recebida, empréstimo);
  - você compra da CPU (o vendedor recebe o valor);
  - CPU × CPU;
  - cláusula de compra exercida pela CPU ou por você.
- Virada (viradaDoCaixaCpu): as receitas da temporada menos a folha levam o
  caixa metade do caminho até o normal; quem caiu para a Série D sai da
  lista.
- Chave estado.PARIDADE_CPU.financas (false só nos testes de equivalência).
Achado para o PR2, já decidido pelo Murilo ("Libera excedente antes"):
os 59 elencos da CPU nascem com o máximo (26), e a regra de vaga travava
todo o mercado CPU × CPU e as propostas da CPU pelos seus jogadores (já era
assim na main). Dispensados vão para uma lista de agentes livres (decisão
"Lista de agentes livres", PR3).
Testes:
- test_paridade_financas (novo, perfil frozen, 6/6);
- suíte completa: 180/180;
- equivalências (clube, mercado, temporada) com a regra desligada.

⸻

PARIDADE-D6 — Save comprimido no envio (PARIDADE-CPU, antes do E3)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Decisão do Murilo (20/11): D6 "Comprimir o envio".
Feito:
- Servidor: o PUT /api/career aceita o corpo em gzip (Content-Encoding:
  gzip). Os limites são:
  - 1 MB no fio, como sempre;
  - 8 MB depois de abrir (proteção contra "zip bomb"); o careerStore segue
    limitando o comprimido a 768 KB.
  Erros: tamanho vira 413; gzip ou JSON quebrado vira 400 (antes, o corpo
  grande caía num erro genérico). A resposta (o save) também vai
  comprimida quando o cliente aceita.
- Cliente (repositorio.js, a cópia ao servidor): envia em gzip quando o
  navegador tem CompressionStream (Safari 16.4+, Chrome, Firefox). Um
  servidor que ainda não abre gzip recusa com 400 sem gravar nada (o
  formato não confere); aí vai de novo sem compressão, uma vez.
- Bundle da v2 regerado (o repositório entra no build).
Efeito: um save de ~890 KB vai ao servidor com ~100 KB. O limite de 1 MB
deixa de ser o teto do save; o novo teto é o do careerStore (768 KB
comprimidos, ~7 MB em JSON).
Não muda: o formato do save, o armazenamento, a leitura (GET já era
comprimido) e o modo offline.
Testes:
- test_save_gzip (novo, 6/6): cópia em gzip, PUT direto, gzip quebrado,
  "zip bomb", JSON puro e servidor antigo;
- suíte completa: 178/178.
PARIDADE-E2 — Outras divisões e Copa jogando com os jogadores (PARIDADE-CPU, E2)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Requisitos: CPU-05 e V05 (parte da liga e da Copa); achados A6 e A7.
Decisões do Murilo (20/11):
- tempo "Aceitar ~+6–10%";
- Série D "Gerado sob demanda";
- D6 "Comprimir o envio" (PR próprio, antes do E3);
- D2 "Guardado por clube" (E3).
Feito (motor):
- fechamento.jogoCpuComJogadores: o núcleo do CPU × CPU da sua divisão
  (postura, XI, força, cartões e lesões, autores, recuperação de quem
  jogou), agora usado também:
  - nas rodadas das outras divisões (resolveOtherDivisionsRound), uma vez
    por partida, na ordem do calendário;
  - nos jogos de Copa entre dois clubes da CPU (simulateCupLeg).
  No jogo de Copa simulado contra você, o lado da CPU também leva cartões,
  lesões, gols e recuperação.
- Série D (CPU-06, decisão "Gerado sob demanda"): o elenco do clube da D
  continua gerado na hora, sempre o mesmo. Só vai para o save quando ele
  enfrenta você ou sobe de divisão; nos jogos de Copa entre CPUs, o
  desgaste dele não fica guardado.
- Save: o jogador da CPU guarda as 3 últimas lesões, sem a fadiga (só a
  preparação física do seu elenco mostra o histórico). A condição depois
  do jogo é arredondada.
- Desempenho: busca de time por id com índice (estado.timePorId) e média da
  divisão do perfil do técnico em cache durante a rodada.
- Chave estado.PARIDADE_CPU.divisoes (false só nos testes de equivalência).
Resultado (baseline, dados reais, 5 seeds × 5 temporadas, contra a main):
- gols: A 2,54 → 2,59; B 2,88 → 2,98; C 2,85 → 2,89 (dentro de 0,15);
- 0×0: dentro de 1 p.p.;
- zebras: todas as faixas de todas as divisões dentro de ±4 p.p. (a maior
  variação é −3,7, na faixa 15–30% da Série B); o CPU × CPU geral fica
  dentro de 1,2 p.p.;
- save: pico de 863 → 892 KB (meta de 900 KB; sem o histórico enxuto, eram
  933 KB);
- tempo da rodada (Node, com gravação): p95 de 175 → 186 ms (+6%); p50 de
  93 → 103 ms (+10%). Acima da meta de +5%, aceito pelo Murilo; a V09
  (iPhone) confirma depois.
Achados: A6 e A7 "NÃO confirmado" (paridade_achados); A8 segue como está,
pela decisão.
Testes:
- test_paridade_divisoes (novo, perfil frozen, 4/4);
- suíte completa: 178/178;
- equivalências com a regra desligada.

⸻

PARIDADE-E1b-2 — Substituições da CPU na sua partida e o resumo do adversário (PARIDADE-CPU, E1b, PR2)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Requisitos: CPU-04 (substituições pela mesma cota) e V03; D3 "Lances +
resumo" (a parte do resumo).
Feito (motor):
- fechamento.substituicoesDaCpu: o adversário da sua partida ao vivo
  (Brasileirão e Copa) troca jogadores no início de cada bloco, sem sorteio
  e dentro da mesma cota do seu time (5):
  - quem se lesiona em campo sai na hora, pelo reserva da mesma posição;
  - aos 45', 60' e 75', até 2 jogadores com condição abaixo de 55 saem
    para reservas da posição mais descansados;
  - aos 75', perdendo, o pior defensor ou meia sai e entra o melhor
    atacante do banco (uma vez);
  - o expulso não volta.
  O banco é o da convocação comum (escalacaoDaCpu), que fica na partida
  (lm.cpuBench).
- Cada troca vira um lance "Substituição" nos Lances (a v2 já mostra).
- D3: a notícia do seu jogo ganha "Do outro lado, <adversário> partiu
  para o ataque no intervalo e fez N substituições". A linha só vale para
  a notícia: não vai para o resultado gravado (resultsByRound).
- Com a chave estado.PARIDADE_CPU.tecnico desligada, nada muda (os
  testes de equivalência continuam iguais).
Não muda: os jogos CPU × CPU continuam sem trocas (são de uma vez só, sem
blocos). O baseline de gols é o do PR1.
Testes:
- test_paridade_tecnico: 8/8, com o item 7 (a regra das trocas numa
  partida montada) e o item 8 (trocas, lances e notícia na sua partida);
- suíte completa: 177/177.

⸻

PARIDADE-E1b-1 — O técnico da CPU: perfil, postura no pré-jogo e intervalo (PARIDADE-CPU, E1b, PR1)

Status: REVISÃO DO PM NECESSÁRIA (mesclado dentro da autorização de 20/11).
Decisões do Murilo (20/11):
- D1 "Do clube + variação";
- D3 "Lances + resumo";
- D8 "Depois do E1b";
- D12 "Embutida no perfil".
Requisito CPU-03 (postura e decisão pelo contexto), parte do CPU-04 (o
intervalo).
Feito (motor):
- fechamento.perfilDoTecnico: ousadia de −1 a +1, que soma:
  - o porte (força de jogo contra a média da divisão);
  - uma variação de ±0,3, sorteada uma vez por clube e guardada em
    CAREER.perfisCpu (~2 KB).
- fechamento.posturaDaCpu: 4 posturas (retranca 5-4-1, defensiva 4-5-1,
  equilibrada 4-4-2, ofensiva 4-3-3), com eixos pelas tabelas do seu time.
  A escolha usa o perfil, a diferença de força para o adversário e o mando.
  Calibrada para ~51% de jogos equilibrados, 22% defensivos, 22% ofensivos
  e 4% de retranca.
- fechamento.posturaNoIntervalo: perdendo, abre um nível; ganhando, fecha
  um (o perfil ousado só com 2+ gols de vantagem); empate, mantém. A
  formação fica.
- A postura entra na convocação (formação) e na força (tacticModDe): em
  CPU × CPU, na Copa, na sua partida ao vivo (o adversário) e no conselho
  do intervalo.
- D3: a mudança do intervalo aparece nos Lances da sua partida ("Mudança
  tática · <time> parte para o ataque (...)" / "recua para segurar o
  resultado (...)"). v2: tipo "tatica" (domain/match.ts).
- Chave estado.PARIDADE_CPU.tecnico (false só nos testes de equivalência).
Critério da retranca (pedido do Murilo, conta exata pelo modelo de gols):
- contra um adversário 30% mais forte, o mais fraco que se fecha faz 0,90
  ponto por jogo (equilibrado: 0,86), e a zebra sobe de 46,5% para 50,5%,
  com menos gols a favor;
- em jogo parelho, a retranca rende menos que a postura ofensiva (1,25
  contra 1,27).
Nenhuma postura fixa domina.
Resultado (baseline, 5 seeds × 5 temporadas):
- gols, Brasileirão real: 2,54 (E0: 2,63; dentro de 0,15);
- 0×0: 8,1%;
- zebra CPU × CPU: dentro de 1,4 p.p. do E0;
- a 1ª calibração (posturas fortes demais) dava 2,44 gols e foi suavizada.
As substituições da CPU e a linha no resumo (D3) vieram no PR2
(PARIDADE-E1b-2).
Testes:
- test_paridade_tecnico (novo, perfil frozen, 6/6);
- domain/match.test.ts (lance "tatica");
- equivalências com a regra desligada.

⸻

PARIDADE-O2 — Goleiro da base de emergência (PARIDADE-CPU, fecha o E1a)

Status: APROVADO e mesclado (#143, dentro da autorização de 20/11 "Pode
trabalhar até concluir todas as atividades").
Decisão do Murilo (19/11, "Base de emergência"), observação O2 do PR #142:
com o cansaço valendo, o seu time pode ficar com um só goleiro disponível,
e a regra "goleiro no banco" (12/11) bloqueava o jogo.
Autorização (20/11): "Pode trabalhar até concluir todas as atividades".
Feito:
- virada.goleirosDeEmergencia: goleiros gerados na hora pelo gerador da
  base, sempre os mesmos por clube, temporada e ordem de subida.
- ponte.completarEscalacao ("Completar automaticamente") e
  escalarAutomaticamente(com a base): com menos de 2 goleiros disponíveis,
  sobem da base os que faltam (1 ou 2). Eles ficam no elenco (origem base).
  Há um aviso ("Goleiro da base") e uma notificação. Se a gravação
  falhar, os goleiros saem de novo.
- Nenhuma mudança na regra da escalação (validarEscalacao) nem na v2.
Testes: test_goleiro_emergencia (novo, 5/5). A baseline volta a completar
as 5 temporadas nas carreiras que travavam (seeds 1 e 3, dados reais).

⸻

PARIDADE-E1a-2 — Força comum pelo XI e condição recalibrada (PARIDADE-CPU, E1a, PR2)

Status: APROVADO (Murilo, 20/11, "Aprovado e fazer o merge"; PR #142).
Pedido: "Sim" (Murilo, 19/11), o PR2 do E1a. Requisito CPU-02, V01.
Feito (motor):
- fechamento.forcaDoLado: a força de jogo de um lado, a mesma regra para o
  seu time (computeHumanStrength vira um invólucro dela) e para a CPU
  (forcaDaCpu). Sobre a força de jogo do clube (GOLS-REAIS), entram:
  - o XI em campo contra a média do elenco principal;
  - a completude (o expulso conta na vaga);
  - a formação e a tática (a CPU fica neutra até o E1b);
  - a condição média do XI.
  Usada ao vivo, no direto, em CPU × CPU, na Copa e no conselho do
  intervalo.
- 3º amarelo acumulado da CPU: segue em campo e só suspende depois do jogo,
  como o seu.
- Defeito antigo achado (decisão do Murilo 19/11, "Corrigir e recalibrar"):
  - O problema: cada jogo CPU × CPU da rodada chamava a recuperação de
    condição do SEU elenco (~9 vezes por rodada). Por isso, o seu titular
    entrava sempre com ~100 de condição; a CPU, com ~30.
  - A correção: a chamada indevida saiu.
  - A recalibragem: quem jogou recupera 45% do que falta depois do jogo,
    dos dois lados (RECUPERACAO_POS_JOGO). Agora o titular de toda rodada
    entra com ~80, nos dois lados; com dois jogos na semana, menos.
- Decisão do Murilo (19/11, "Semana da CPU só na condição"): a CPU passa
  pela semana de treino padrão só no efeito na condição
  (treino.condicaoDaSemana) e recupera nas semanas sem jogo como o seu
  elenco (+15; férias: cheia). A evolução por treino da CPU fica no E4.
- Chave estado.PARIDADE_CPU.forca (false só nos testes de equivalência).
Resultado (baseline, 5 seeds × 5 temporadas, comparado ao PR1):
- gols: Brasileirão real 2,61 (antes 2,65), Série B 2,89, Série C 2,83;
- 0×0: Brasileirão real 8,3% (+1,0 p.p.);
- zebra CPU × CPU: dentro de 1,6 p.p. por faixa;
- tempo: rodada p95 igual à main medida na mesma hora (213 × 222 ms);
- pico do save: 841 KB.
Observação para decisão (O2): com o cansaço valendo para você, seus
titulares se lesionam mais. Em 2 de 5 carreiras simuladas, o seu time ficou
com um só goleiro disponível na temporada 3, e a regra da escalação (goleiro
no banco, decisão de 12/11) bloqueou o jogo. A simulação não contrata.
Testes: test_paridade_forca (novo, perfil frozen, 6/6); test_motor_expulsao
(3º amarelo da CPU); equivalências com a regra desligada (aovivo,
fechamento, posjogo, semana, jogo). tests/sim/paridade_achados.js: A1 agora
"não confirmado" (A1, A2, A4, A5 e A14 resolvidos).

⸻

PARIDADE-E1a-1 — Convocação comum (11+11) e recuperação da CPU (PARIDADE-CPU, E1a, PR1)

Status: APROVADO (Murilo, 19/11, "Aprovado"; PR #141).
Pedido: "Comece" (Murilo, 18/11), o E1a do plano aprovado. Requisitos
CPU-01 e CPU-05 (parte de condição e retorno), V02.
Feito (motor):
- virada.convocacaoDaCpu: a CPU convoca pela mesma escalação automática do
  seu time (autoLineup: titulares pela formação, banco de 11 com goleiro,
  principal antes da base, por posição). A formação é 4-4-2 até o perfil
  do técnico (E1b, D1). Disponível = status "ok".
- Elenco curto (D7): entram 11 jogadores da base gerados na hora
  (cpubase_<clube>_<ano>_<n>), sempre os mesmos por clube e temporada,
  fora do save. A Série D sem elenco no save usa o elenco gerado de 22.
- fechamento.escalacaoDaCpu/xiDaCpu nas partidas da CPU: ao vivo, direto,
  CPU × CPU, Copa ao vivo, Copa simulada e amistoso.
- Recuperação (A4): depois do jogo, quem não jogou recupera condição pela
  regra do seu elenco (fechamento.recuperarCpu), no CPU × CPU e no
  adversário ao vivo (liga e Copa).
- Retorno (A5): semana.refreshAvailability devolve os jogadores da CPU de
  lesão e suspensão pela mesma regra (antes, só na virada).
- Chave estado.PARIDADE_CPU.convocacao (false só nos testes de
  equivalência: aovivo, fechamento, posjogo, semana).
Igual ao seu time: a escalação automática não olha a condição (a CPU
escala um cansado, como o seu "Completar automaticamente").
A força ainda é a do clube (A1): a força pelo XI é o PR2 do E1a.
Resultado (baseline, 5 seeds × 5 temporadas, comparado ao A14):
- gols, 0×0 e zebra: dentro de 0,04 gol, 0,4 p.p. e 2 p.p.;
- rodada p95: 144 ms (antes, 183 ms; variação da medida);
- pico do save: 867 KB (antes, 837 KB; 83% do limite de 1 MB do envio,
  abaixo da meta de 900 KB). Mais jogadores da CPU se lesionam, voltam e
  guardam histórico de lesão.
- tests/sim/paridade_achados.js: A2, A4 e A5 agora "não confirmados".
Testes: test_paridade_convocacao (novo, perfil frozen, 6/6); equivalências
com a regra desligada.

⸻

PARIDADE-D7 — Elenco curto: Série D com 22 e base sob demanda (PARIDADE-CPU, antes do E1a)

Status: REVISÃO DO PM NECESSÁRIA.
Decisão do Murilo (17/11, D7): "Série D 22 + base sob demanda".
- Série D com elenco gerado de 22 (ELENCO_SERIE_D, virada.elencoSerieD):
  os 12 de sempre (mesma semente e ordem) e mais 10. Fica fora do save,
  salvo o adversário do seu time na Copa. Quem sobe para a C leva os
  mesmos jogadores (os primeiros).
- Elencos curtos dos outros clubes da CPU (16–26 na sua divisão, 12–16 nas
  outras): no E1a, o banco da CPU é completado com jogadores da base
  gerados na hora, sempre os mesmos e sem ir para o save (zero byte a
  mais), como o seu "Completar com a base". Guardar 22 para todos
  estouraria o limite de 1 MB do envio (D6).
Testes: unit/test_motor_serie_d com o item D7 (22 jogadores com ids
únicos; quem sobe leva os mesmos jogadores).

⸻

PARIDADE-A14 — Elencos da CPU estáveis na virada (PARIDADE-CPU, antes do E1a)

Status: APROVADO (Murilo, 17/11, "Aprovado para o merge"; PR #139).
Decisões do Murilo (17/11):
- D10 "Corrigir já";
- regra "Serve": na virada, a CPU renova o contrato vencido de quem tem até
  32 anos e overall ≥ média do elenco, ou de quem falta para cobrir a
  posição (G 2, D 6, M 6, F 4); os outros saem; o gerado ganha contrato
  contado do ano da carreira.
Feito (motor):
- temporada.RENOVACAO_CPU e renovacoesDaCpu; renewLeagueSquad renova
  (contrato de 1 a 4 temporadas e salário de mercado);
- virada: base e profissionais gerados na virada (seus e da CPU) com
  contrato contado do ano da carreira. Os clubes que sobem da Série D
  mantêm o elenco de sempre, com o contrato deslocado para o ano da
  carreira.
Reposição até o tamanho que o elenco tinha (não só até o mínimo): aprovada
pelo Murilo em 17/11 ("Manter"). Só com a regra, os elencos encolhiam até
o mínimo, cerca de 1.134 → 890 jogadores.
Calibração do gerado, decisão do Murilo (17/11, "Calibrar o gerado já"):
quem repõe um jogador que saiu nasce na posição dele e perto do overall
dele (−3 a +2), com atributos, potencial, salário, valor e contrato
recalculados.
Resultado (baseline, 5 seeds × 5 temporadas, comparado ao E0):
- jogadores da CPU: 1.134 → 1.103 (antes, 784);
- reais na 5ª temporada: 712 (antes, 250);
- overall médio: 71 → 67,7 (antes, 57,1; sem a calibração, 65,4);
- gols, 0×0 e zebra: dentro de 0,05 gol, 0,8 p.p. e 1,5 p.p. da baseline;
- pico do save: 837 KB (antes, 833 KB); rodada p95: 183 ms (antes,
  174 ms; a virada não roda na rodada, a diferença é variação da medida).
O que ainda cai (cerca de 0,9 de overall por temporada) é a evolução anual
da CPU: os veteranos caem e os jovens não crescem. Isso entra no E4
(treino e evolução da CPU, CPU-09).
Testes:
- unit/test_motor_a14 (novo, 7/7);
- test_motor_temporada e test_motor_virada com a regra desligada
  (equivalência);
- tests/sim/paridade_achados.js: A14 agora "não confirmado" (12/13, como
  esperado).

⸻

PARIDADE-CPU — Paridade esportiva dos clubes geridos pela CPU (nova fase)

Status: PLANO APROVADO (Murilo, 17/11: "Autorizado"). E0 APROVADO
(Murilo, 17/11, "Aprovado para o merge"; PR #138,
docs/paridade-cpu/RELATORIO_E0.md).
Pedido (Murilo, 17/11): "Temos uma nova fase do projeto pela frente que visa
melhorar a jogabilidade dando mais realismo para os times geridos pelo CPU.
Siga os docs anexos e monte um plano de desenvolvimento."
Especificação: pacote "BRDATA · Clubes geridos pela CPU" (17/11), guardado
em docs/paridade-cpu/: requisitos CPU-01..CPU-10, validação V01..V10,
etapas E0, E1a, E1b, E2, E3, E4.
Plano: docs/paridade-cpu/PLANO_DESENVOLVIMENTO.md. Em resumo:
- arquitetura "um executor, dois controladores";
- 13 achados no código atual (A1–A13), entre eles força da CPU só do
  clube, XI fixo, condição e lesão da CPU sem recuperação até a virada,
  outras divisões só com placar, troca de clube recomeçando o mundo e
  limite de 768 KB do save;
- etapas E0 a E4 em 10–12 PRs, 27–43 dias úteis (a revisar depois do E0);
- decisões de produto pedidas: D1 a D6;
- critério de zebra (pedido do Murilo, 17/11): o favorito continua
  favorito pela força do XI, mas a zebra continua possível, pela sorte e
  pela postura (o mais fraco pode jogar fechado). A taxa de zebra é
  medida por faixa de diferença de força no E0 e conferida em cada etapa.
E0 (17/11, "Pode começar o E0"):
- o inventário de ações fechado (05_Inventario_de_acoes.md);
- a baseline sob demanda (tests/sim/paridade_baseline.js): 57 mil jogos
  em 5 seeds × 5 temporadas, nos dois modos;
- os achados confirmados no motor (tests/sim/paridade_achados.js): 13/13.
Achado novo, A14: os elencos da CPU encolhem e enfraquecem a cada
virada. Saem os contratos vencidos e os repostos nascem com contrato
contado do ano do catálogo. Em 4 temporadas, 1.134 → 784 jogadores e
overall médio 71 → 57.
Limite do save: o que pesa é o 1 MB de JSON cru no envio do save. O pico
medido é de 833 KB (79,5%); comprimido fica em cerca de 10% dos 768 KB.
Decisões do Murilo (17/11):
- D4: itens da loja só para você;
- D9: a CPU joga amistosos (entra no E4);
- D10: corrigir o A14 já, num PR antes do E1a;
- D13: manter o nível atual de zebra (até 4 p.p. da baseline por faixa).
As outras decisões (D1–D3, D5–D8, D11, D12) ficam para as etapas.
Próximo passo: PR do A14; depois o E1a.

⸻

VENDA-DISPONIVEL — "Disponível para venda" e filtro no Mercado

Status: APROVADO (Murilo, 17/11, "Sim, faça o push, PR e merge").
Pedido (Murilo, 17/11): "Assim como fizemos com os 'disponíveis para
empréstimo' acho interessante criar um filtro com os 'disponíveis para
venda' onde traria todos os jogadores dos outros clubes que foram colocados
à venda e que terão maior probabilidade de aceitar uma transferência."
Hoje: nenhum clube da CPU põe jogador à venda; o vendedor sempre pede o
valor com o prêmio de importância (MER-04) e o atleta avalia salário,
papel, divisão, força e reputação.
Decisões do Murilo (17/11):
- Critério: "a CPU deve definir os critérios. Ex.: poucos jogos,
  insatisfação etc." (a CPU decide sozinha, pelos sinais do jogador).
- Efeito: "Facilita e barateia".
- Ordem: "Mais chance primeiro".
Especificação:
- A CPU põe à venda (calculado na hora, sem guardar no save,
  `mercado.motivosAVenda`) quem não é titular, tem a posição coberta sem
  ele, não está emprestado e tem pelo menos um motivo:
  - Poucos jogos: depois de 5 rodadas, jogou menos de 30% delas (só na sua
    divisão, a única em que o jogo conta os jogos de cada jogador);
  - Insatisfeito: joga pouco sendo bom o bastante para jogar (overall até
    3 abaixo do pior titular da posição);
  - Fim de contrato: último ano de contrato;
  - Excedente: reserva, 24 anos ou mais (mais novos ficam no empréstimo);
  - Salário alto: ganha mais de 1,4× o salário justo para o overall e a
    idade.
- Facilita e barateia: o clube aceita a partir de 90% do valor de mercado,
  sem prêmio de importância nem de janela; o atleta aceita o salário atual
  se o papel prometido no seu time for titular ou rotação (sem o "pede
  mais").
- Mercado da v2: "Disponibilidade" ganha "Disponível para venda"; a lista
  vem com mais chance primeiro (papel que ele teria no seu time: titular,
  depois rotação; divisão do seu clube igual ou acima da dele; depois o
  maior overall); a linha mostra "à venda" e o motivo; a proposta já abre
  com 90% do valor e o aviso.
- Trava de revenda (decisão do Murilo, 17/11, "Trava até a próxima
  janela", contra o giro "compra a 90% e revende pelo valor"): toda
  contratação marca quando o jogador chegou (`compradoEm`); ele só pode ser
  anunciado a partir da próxima janela de transferências (temporada nova
  sempre libera; jogador sem a marca, como os de saves antigos, livre).
- Etapa do loop: Market / Management.
Critérios de aceite:
1. O filtro mostra só jogadores da CPU à venda, cada um com o motivo;
   titular e quem deixaria a posição descoberta nunca aparecem.
2. Proposta de 90% do valor por um jogador à venda: o clube aceita (sem
   contraproposta); por um que não está à venda, a regra de sempre.
3. Prometendo titular ou rotação com o salário atual, o jogador à venda
   aceita; prometendo reserva, a regra de sempre.
4. Ordem: quem seria titular no seu time vem antes de quem seria rotação,
   e este antes de reserva.
5. Save: nada novo.
Fora de escopo: a CPU vender entre si por esse critério; moral própria
para os jogadores da CPU; marcar os seus jogadores "à venda" (já existe o
"Colocar à venda").
Relatório (17/11):
- Motor:
  - `mercado.js`: `A_VENDA`, `MOTIVO_A_VENDA`, `motivosAVenda` e
    `revendaLiberada`; `reservaParaProposta` (90%, sem prêmio) e
    `avaliacaoAtleta` (aceita o salário atual com titular ou rotação)
    com `ctx.aVenda`.
  - `negociacao.js`: `motivosAVendaNoClube`; `contextoDoAtleta` leva
    `aVenda`; o vendedor aceita direto a partir da reserva.
  - `semana.js`: `compradoEm` na compra e `revendaLiberadaDe`.
  - `ponte.js`: `mercado()` devolve `aVenda` (motivos, papel no seu
    time, chance e valor aceito); `anunciar` recusa o recém-contratado
    (motivo `recem-contratado`).
- v2 (`domain/market.ts`, `Market.tsx`):
  - "Disponibilidade" com "Disponível para venda";
  - ordem por chance e depois por overall;
  - "à venda (motivo)" na linha;
  - a proposta abre com 90% do valor (ou menos, com o desconto de
    contratação) e o aviso.
- Testes:
  - `tests/unit/test_motor_venda_disponivel.js` (8/8): exclusões
    (titular, posição descoberta, emprestado); excedente e idade; poucos
    jogos e insatisfeito (limites de rodada, contagem e 30%); fim de
    contrato; salário alto; vendedor a 90%; atleta; trava de revenda
    (rodadas, calendário, temporada nova); regra desligada.
  - `tests/e2e/test_v2_venda_disponivel.js` (6/6): filtro e motivo, ordem,
    proposta com 90% e aviso, envio e compra sem contraproposta, 360 px,
    trava do anúncio.
  - `domain/market.test.ts`: novo teste (139/139 na v2).
  - Contraprovas: posição descoberta liberada (falha 1); sem os 90% (5);
    atleta aceitando como reserva (6); trava liberando na mesma janela
    (7); excedente sem limite de idade (2, 3, 4). Depois, o motor voltou
    ao estado esperado.
  - `test_motor_semana` (equivalência) roda com a regra desligada.
- Observações:
  - Na pré-temporada só aparece "excedente" (sem rodadas, sem contagem de
    jogos); com a temporada andando entram poucos jogos, insatisfeito e
    os outros motivos. Num teste, 88 jogadores à venda na pré-temporada.
  - Os jogadores das outras divisões não têm jogos contados: para eles
    valem excedente, fim de contrato e salário alto.
  - Um excedente também aparece como "disponível para empréstimo" (a
    linha mostra as duas marcas).


⸻

EXPULSAO — expulso sem reposição e jogo com 1 a menos

Status: APROVADO (Murilo, 17/11, "Aprovado"; PR #134).
Pedido (Murilo, 17/11): "Jogador expulso não pode ser substituído. Após a
pausa o campo deve ser mostrado com 1 a menos e isso deve influenciar no
jogo."
Como era:
- Expulsão do seu time dava 1 substituição a mais (`subsBonus`): o técnico
  repunha o expulso e voltava a 11.
- O peso de jogar com menos era só a "completude" da força (10/11, ~9%).
- O adversário expulso não mudava nada na força dele.
- O 3º amarelo acumulado (que deveria só suspender para o próximo jogo)
  tirava o jogador de campo na hora, sem cartão vermelho no lance.
Decisões do Murilo (17/11):
- Efeito "Realista": com 1 a menos, ~25% menos gols feitos e ~35% mais
  sofridos; 2 a menos, composto. Do minuto da expulsão até o fim.
- Vale para os dois lados, também nos jogos só entre CPUs.
- Campo da Pausa: "Posição vazia", marcada com o cartão vermelho; o resto
  do time fica onde estava (formação e substituições normais seguem).
- 3º amarelo: "Corrigir" — só suspende para o próximo jogo; segue em campo.
Especificação:
- Motor (`partida.EXPULSAO`): `comExpulsoes(lado, n)` multiplica ataque por
  0,75ⁿ e "defesa" (gols sofridos) por 1,35ⁿ.
- Partida ao vivo: o seu expulso fica na vaga, marcado (`lm.expulsos`); o
  do adversário sai do time dele (`lm.expulsosCpu`). O efeito vale do bloco
  seguinte em diante, para os dois lados. Sem substituição extra.
  `substituir` recusa o expulso (motivo "expulso"). A força humana conta o
  expulso na vaga (sem o desconto de time incompleto em dobro).
- Jogos diretos (CPU x CPU, perna de Copa simulada): cartões antes dos
  autores dos gols; para cada expulso, minuto sorteado e o placar ajustado
  dali em diante (`golsComExpulsoes`, mesmo efeito médio).
- 3º amarelo: seu jogador termina o jogo; a suspensão vale no fechamento
  da rodada (`suspensaoPendente` → `refreshAvailability`); na CPU, suspenso
  para os próximos jogos, sem sair de campo.
- v2: Revisar time com a vaga vazia, cartão vermelho e "Expulso"; a lista
  de quem sai não mostra o expulso; a Pausa avisa "Seu time joga com N,
  sem reposição".
- `EXPULSAO.ativa = false` só nos testes de equivalência com as cópias
  congeladas do motor (que não têm a regra).
Critérios de aceite:
1. Expulso não pode ser substituído (tela e comando) e não há substituição
   extra.
2. Revisar time mostra 10 em campo e a vaga do expulso vazia, com o cartão.
3. Com 1 a menos: gols esperados a favor ×0,75 e contra ×1,35 (os dois
   lados; jogos diretos com o mesmo efeito médio).
4. 3º amarelo não tira de campo; suspende só o próximo jogo.
5. Save: nada novo obrigatório (campo opcional `suspensaoPendente`).
Fora de escopo: formações para 10 jogadores; limite mínimo de jogadores em
campo; mostrar ao vivo o placar "10 contra 11" fora da Pausa.
Relatório (17/11):
- Motor:
  - `partida.js`: `EXPULSAO`, `comExpulsoes` e `golsComExpulsoes`.
  - `aovivo.js`: `aplicarExpulsoes` e `registrarExpulsoes`, chamadas no
    bloco; `applyLiveSub` recusa o expulso.
  - `fechamento.js`: força humana conta o expulso na vaga; 3º amarelo;
    jogos diretos (`resolveCpuFixture`, `simulateCupLeg`) com os cartões
    antes dos autores e o placar ajustado.
  - `semana.js`: a suspensão pendente vale no fechamento da rodada.
  - `jogo.js`: o comando `substituir` recusa o expulso.
  - `carga.js`: a ponte marca o titular expulso e conta os expulsos de
    cada lado.
- v2:
  - `domain/match.ts`: vaga vazia com o nome do expulso; o expulso fora da
    lista de quem sai; o aviso "Seu time joga com N, sem reposição" na
    Pausa.
  - `ui/pitch.tsx` e `lineup.css`: o cartão vermelho sobre a camisa vazia
    (sem o "+"), "Expulso" no lugar do nome.
- Testes:
  - `tests/unit/test_motor_expulsao.js` (9/9): efeito ×0,75/×1,35 (e
    composto), os dois lados, expulso marcado e o da CPU fora do time,
    substituição recusada e sem extra, força humana sem desconto em dobro,
    jogo direto (sem expulso nada muda; com expulso a média segue a regra),
    3º amarelo seu e da CPU, regra desligada.
  - `tests/e2e/test_v2_expulsao.js` (5/5): a Pausa com o aviso, Revisar
    time com 10 e a vaga vazia com o cartão, Substituir sem o expulso,
    "0 de 5" e comando recusado, outro sai normal, 360 px.
  - `domain/match.test.ts`: novo teste (138/138 na v2).
  - Testes de equivalência (`test_motor_aovivo`, `test_motor_fechamento`)
    rodam com a regra desligada (`EXPULSAO.ativa = false`).
  - Contraprovas: efeito menor (falham 1, 2 e 6); substituição do expulso
    liberada (4); desconto de time incompleto de volta (5); 3º amarelo
    tirando de campo (7); suspensão pendente não aplicada (7); jogo direto
    sem os gols extras do adversário (6); CPU expulso seguindo no time (3).
    Depois, o motor voltou ao estado esperado.
- Suíte completa: 165/168 na primeira rodada.
  - `test_ao_vivo` item 5 conferia a substituição extra da expulsão e
    passa a conferir a regra nova (sem extra, expulso na vaga, troca
    recusada).
  - `test_v2_pausa_evento` item 2 passa a contar o aviso "Seu time joga
    com N".
  - `test_v2_prejogo` parou ao abrir o Pré-jogo (espera de 10 s sob
    carga; a expulsão não toca nele) e passou 3/3 isolado.
  - Depois do ajuste, esses e `test_v2_expulsao`/`test_v2_pausa`: 4/4.
- Riscos e observações:
  - Expulsões em série (raras) compõem o efeito: com 3 a menos, o time faz
    ~42% dos gols e sofre ~2,5×.
  - Sem limite mínimo de jogadores (fora de escopo).
  - Jogos diretos mudam a ordem dos sorteios (cartões antes dos autores
    dos gols); o resultado médio é o mesmo de antes quando não há
    expulsão.

⸻

ZOOM-V2 — bloquear o zoom no celular na v2

Status: APROVADO (Murilo, 17/11, "Faz o merge"; PR #131).
Origem: lote L6b (docs/carreira-v2/ENTREGA_TESTES_L6.md). O teste antigo
`test_ux_zoom_scroll` conferia que a tela antiga bloqueava o zoom; a v2
deixava dar zoom. Decisão do Murilo (16/11): "Bloquear zoom".
Implementado:
- `carreira-v2/index.html`: viewport com `maximum-scale=1.0,
  minimum-scale=1.0, user-scalable=no` (mantém `viewport-fit=cover`);
- `carreira-v2/src/styles/base.css`: `body { touch-action: manipulation }`
  (sem zoom de toque duplo);
- `tests/e2e/test_ux_zoom_scroll.js` reescrito pela v2 (1, 1b, 1c).
- `tests/e2e/test_v2_inicio.js` item 6 passa a conferir o zoom bloqueado
  (antes conferia "zoom liberado").
Não muda: motor, API, save.
Ponto de atenção: contraria a WCAG 1.4.4; o iOS ignora `user-scalable=no`
por padrão (zoom de pinça continua possível lá), o Android respeita.

⸻

RODADA-ATUAL — jogos da rodada atual na Tabela da v2

Status: APROVADO (Murilo, 15/11, "Aprovado"; PR #120).
Origem: diferença da v2 achada no lote L4d (docs/carreira-v2/ENTREGA_TESTES_L4.md):
o "Resumo da rodada" da tela antiga mostrava a qualquer momento os 10 jogos
da rodada atual; a v2 só os resultados da última rodada e o seu jogo.
Decisão do Murilo (14/11): "Mostrar na Tabela".
Implementação: `carreira-v2/src/domain/table.ts` (`upcoming`: os jogos do
calendário da rodada atual, o seu primeiro, com a data; só na sua divisão e
com a temporada em andamento) e `screens/Table.tsx` (seção "Próxima
rodada", depois de "Resultados da rodada", no mesmo formato, com "×").
Só leitura; nada no save. Testes: `table.test.ts` (unitário) e
`test_resumo_rodada` item 5 (antes da 1ª rodada e depois da 1ª e da 2ª);
`test_v2_tabela` passa a contar só os resultados. Contraprova: sem o "seu
primeiro" → o unitário falha.

⸻

HISTORICO-LINK — histórico de atualizações pelo Mais da v2

Status: APROVADO (Murilo, 15/11, "Aprovado"; PR #119).
Origem: diferença da v2 achada no lote L4d (docs/carreira-v2/ENTREGA_TESTES_L4.md):
a página estática `historico.html` só tinha link no menu da tela antiga, e o
"Voltar" dela levava a `carreira.html`.
Decisão do Murilo (14/11): "Link no Mais" — linha "Histórico de
atualizações" no Mais da v2 e o "Voltar" da página para o Início (/).
Implementação: `carreira-v2/src/screens/Hubs.tsx` (linha com link comum para
a página, fora da v2) e `public/historico.html` ("Voltar" para "/"). Testes:
`test_historico` (item 0 pelo Mais; item 5 "Voltar" no Início),
`test_v2_navegacao` (o Mais com 10 itens) e `test_v2_corte` (o histórico
entra, com a privacidade, nas páginas estáticas que a v2 abre de propósito).
Contraprova: "Voltar" para carreira.html → `test_historico` 5 falha.

⸻

COPIA-UNICA — a cópia da carreira no servidor sobe uma vez só

Status: APROVADO (Murilo, 15/11, "Aprovado"; PR #118).
Origem: defeito da OFFLINE-001 achado no CI do PR #116 (test_v2_escalacao
item 3 com 2 PUTs). Se a v2 relia a carreira enquanto a cópia ainda ia ao
servidor, o save aparecia "pendente" e a mesma cópia (~600 KB) subia de novo.
Decisão do Murilo (14/11): "Corrigir agora".
Implementação (`public/js/motor/repositorio.js`): uma cópia por conta de cada
vez, com o controle compartilhado pela janela (a v2 tem duas instâncias do
repositório: a do motor e a do build). Quem chama com outra a caminho marca
"conferir de novo": ao terminar, a cópia a caminho confere de novo e, se o
save mudou, sobe o mais novo (sem mudança, não sobe nada). A gravação espera
essa cópia por no máximo 15 s (depois, "andamento"; o save já está no
aparelho); a leitura não espera. Envio sem resposta há mais de 45 s não
segura as cópias. Antes, a leitura também esperava o próprio envio, e um
envio preso travava a abertura da v2. Nenhuma mudança no save nem na API.
Teste: `tests/e2e/test_v2_copia_unica.js` (envio lento de 1,5 s e envio
preso). Contraprovas: sem a correção, 2 PUTs (item 1); com o controle por
instância, 2 PUTs (1b); com quem chama esperando a cópia a caminho sem
prazo (1ª versão) ou com o código do main, a leitura trava atrás de um
envio preso (item 4).
Junto: `test_ge_balance_004` só corta a rede com o motor já aberto (ele
cortava no meio da carga e, sob carga, o motor não abria; 6 de 8 falhas
no main com 8 em paralelo, 0 de 8 depois).

⸻

AVISO-MOTIVADO — aviso "Adversário motivado" no Pré-jogo da v2

Status: APROVADO (Murilo, 14/11; PR #117).
Origem: diferença da v2 achada no lote L4c (docs/carreira-v2/ENTREGA_TESTES_L4.md):
o motor aplica o bônus do adversário em sequência invicta e emite o aviso,
mas nenhuma tela da v2 o mostra.
Decisão do Murilo (14/11): "Mostrar no Pré-jogo" (recomendado) — alerta
ao lado de "Semana de 2 jogos", com a sequência de jogos sem perder.
Implementação:
- Regra e texto num lugar só, no núcleo puro `public/js/motor/partida.js`:
  `OPPONENT_MOTIVATION_STREAK_STEPS` (os mesmos degraus: 5 → 1,04;
  8 → 1,08; 12 → 1,12), `motivacaoDoAdversario(sequencia)` e
  `avisoAdversarioMotivado(sequencia)`. `aovivo.js` (bônus na partida) e
  `jogo.js` (evento "aviso") usam essas funções; nenhuma regra mudou.
- Pré-jogo da v2 (`domain/prematch.ts`): alerta "Adversário motivado"
  com o texto do motor ("Você chega com N jogos de invencibilidade — …"),
  depois de "Semana de 2 jogos". Sem save novo nem campo novo.
- Testes: unitário da v2 (`prematch.test.ts`) e item 2b do
  `test_ge_balance_001` (Pré-jogo sem sequência e com 14). Contraprova:
  aviso desligado no núcleo → o unitário e o item 3 falham.

⸻

OFFLINE-001 — Modo Carreira offline

Status: APROVADO (Murilo, 13/11, "Aprovado"; PR #112). Homologação no
iPhone pendente com o Murilo (seção 6.5 do plano).
Plano e relatório: `docs/carreira-v2/offline/PLANO_OFFLINE.md` (seções 5 e 6).
Origem: `docs/carreira-v2/offline/BRDATA_Plano_Offline_Claude.md`, sem
alteração.
Decisões do Murilo (13/11): 1) o save do aparelho é o principal, com
cópia no servidor; a da conta só entra se o aparelho não jogou desde a
última cópia ou por pedido explícito; 2) recompensa diária e loja só com
rede; 3) carreira criada offline usa a cópia dos clubes e elencos do
servidor, gerada no deploy e versionada; 4) tudo num PR só.
Decisão anterior (12/11): a carreira continua na raiz ("/").
Pontos para o PM conferir (seção 6.2 do plano): o AUD-02 passa a bloquear
só quando o aparelho não grava; a sessão expirada vira aviso que pode ser
fechado; conflito entre aparelhos não sobrescreve nada sozinho.

⸻


S4-AUDIT-BACKLOG-001 — Auditoria de prontidão das demandas #12 a #21

Status: APROVADO

Decisão do PM (Murilo, 10/09/2026): os 4 critérios de aceite foram
cumpridos — as 10 demandas têm veredito com evidência (tabela abaixo),
9 foram formalmente aprovadas (#12,13,14,15,16,17,18,19,21 — #14 com
2 divergências de design resolvidas, ver seção `S4-B2-003`), 1 foi
redefinida com mini-spec nova (`S4-B3-004`/#20, tela não existia), e a
cadeia de dependências foi revalidada sem quebras. Auditoria concluída.
Sprint: S4 — Redesign Mobile
Fase: pós-implementação transversal (Batch 2 + Batch 3) — auditoria de
consolidação. Substitui a demanda anterior desta seção, que era
`S4-B4-000` (auditoria das 7 telas do Batch 4) — reescopada a pedido
do Murilo. Correção (mesmo pedido, 10/09/2026): esta é uma auditoria
**pós-implementação**, não um gate pré-implementação — ver Objetivo e
Contexto abaixo, ajustados.
Prioridade: P1

Objetivo

Depois que uma ou mais das 10 demandas já especificadas e abertas como
issue — `S4-B2-001` (#12), `S4-B2-002` (#13), `S4-B2-003` (#14),
`S4-B2-004` (#15), `S4-B2-005` (#16), `S4-B3-001` (#17), `S4-B3-002`
(#18), `S4-B3-003` (#19), `S4-B3-004` (#20), `S4-B3-005` (#21) — forem
implementadas por qualquer sessão, auditar o resultado real entregue:
confirmar o que foi de fato implementado/aprovado/mesclado, atualizar
o handoff de acordo, e revalidar a cadeia de dependências entre as
demandas restantes à luz do que já foi concluído.

Contexto

Esta sessão especificou as 10 demandas acima em sequência, sem
implementar nenhuma delas diretamente — mas já se confirmou 2 vezes
que sessões de implementação externas pegam demandas do handoff e as
executam sem avisar esta sessão em tempo real: `S3-DS20-S4-PREP-001` e
`S3-DS20-S4-PREP-002` foram ambas implementadas, aprovadas e mescladas
em `main` por sessões separadas — a segunda só foi descoberta porque o
Murilo pediu explicitamente pra verificar ("Veja se Perfil de Jogador
não está liberado").

Esta auditoria **não é um gate antes do trabalho começar** —
implementações acontecem de forma assíncrona, por sessões que este PM
não controla nem consegue bloquear (o próprio precedente de
PREP-001/002 mostra isso: aconteceram sem aviso, não depois de uma
autorização prévia). É, em vez disso, o processo de **consolidação que
roda depois** que qualquer uma das 10 demandas for implementada —
formalizando como demanda o mesmo processo que já foi feito
manualmente pra PREP-001/PREP-002 (checar branch/commit, confirmar
status real, atualizar o handoff, revalidar dependências), em vez de
depender de alguém lembrar de pedir a checagem.

Escopo

Quando uma ou mais das 10 demandas tiver sido implementada, Claude
deve, para cada uma que tiver progresso:

1. Verificar se existe branch, commit ou Pull Request associado no
   repositório (mesmo processo usado quando se confirmou que
   `S3-DS20-S4-PREP-002` já estava implementada) — buscar por
   referências relacionadas ao ID da demanda ou ao seu conteúdo.
2. Confirmar o status real (em implementação? pronta pra revisão? já
   aprovada e mesclada?) e atualizar a seção correspondente do handoff
   de acordo — mesmo tratamento dado a `S3-DS20-S4-PREP-002` quando
   sua conclusão foi descoberta.
3. Para as demandas que ainda não tiverem nenhum progresso: confirmar
   que a especificação continua válida — inspecionar a implementação
   atual da tela/componente relacionado e confirmar que nada mudou
   desde a especificação original que invalide o escopo, as
   dependências ou os riscos descritos nela.
4. Revalidar a cadeia de dependências entre as demandas à luz do que
   foi encontrado — em particular, se alguma das demandas do Batch 3
   já pode prosseguir porque `S4-B3-001` foi concluída, ou se a ordem
   recomendada precisa mudar dado o estado real.
5. Registrar, por demanda, um veredito único: "sem progresso externo,
   especificação continua válida" / "sem progresso externo,
   especificação precisa de ajuste (detalhar o quê)" / "progresso
   externo encontrado (detalhar o estado e a atualização feita no
   handoff)".
6. Produzir um relatório consolidado nesta mesma seção do handoff,
   com a lista das 10 demandas e o veredito de cada uma.
7. Retornar `REVISÃO DO PM NECESSÁRIA`.

Fora de escopo

* implementar qualquer coisa nova — mudanças de código só acontecem
  se decorrerem diretamente de uma demanda já aprovada encontrada com
  progresso pendente de finalização (mesmo tratamento que
  `S3-DS20-S4-PREP-001` recebeu quando sua aprovação foi processada);
* a auditoria original das 7 telas do Batch 4 (Onboarding, Comparar
  jogadores, Eixos táticos, Marcação individual, Meus esquemas,
  Notícias/Eventos, Histórico/Estatísticas) — não faz mais parte desta
  demanda (era o escopo de `S4-B4-000`, substituído); se ainda for
  necessária, precisa virar uma demanda própria depois desta.

Dependências

* as 10 demandas em si (`S4-B2-001` a `S4-B2-005`, `S4-B3-001` a
  `S4-B3-005`), já especificadas em `docs/HANDOFF_CLAUDE.md` e como
  issues #12-#21 — pelo menos uma delas precisa ter algum progresso
  real (branch/commit/PR) pra esta auditoria fazer sentido; se nenhuma
  tiver, o resultado é só confirmar que todas as specs continuam
  válidas, sem muito mais a fazer.
* `docs/sprints/S4/S4_REQUISITOS_VIGENTES.md`.

Requisitos

Mesma sequência obrigatória de sempre: inspecionar → localizar →
entender → planejar → (alterar só se decorrer de aprovação já
concluída) → testar (se houver alteração) → revisar. Cada veredito
deve vir com evidência real (branch/commit encontrado, ou trecho de
código conferido), mesmo rigor da S3.2.7 original — não presunção.

Critérios de aceite

* as 10 demandas têm veredito registrado, cada um com evidência;
* qualquer progresso externo encontrado está refletido no handoff
  (status atualizado, movido pro Histórico se aprovado);
* qualquer especificação desatualizada está corrigida ou marcada pra
  correção;
* a cadeia de dependências entre as demandas foi revalidada.

Validações

O PM deverá validar: cobertura das 10 demandas, qualidade da evidência
por trás de cada veredito, qualquer atualização de status feita no
handoff, coerência da cadeia de dependências revalidada.

Riscos

* baixo — é auditoria/verificação de estado, mudança de código só
  ocorre se decorrer de algo já formalmente aprovado e ainda não
  processado.

Observações

Esta demanda existe pra formalizar, como processo repetível, o mesmo
tipo de checagem que já foi feita manualmente 2 vezes nesta sessão
(progresso externo descoberto depois do fato) — não é um bloqueio
antes de qualquer trabalho começar, é a consolidação que roda depois
que ele acontecer. Especificar novas demandas em cima das #12-#21 não
precisa esperar esta auditoria — ela existe pra manter o handoff
alinhado com a realidade à medida que implementações forem
acontecendo, não pra travar o fluxo até rodar.

Relatório consolidado (auditoria, 10/09/2026)

Todas as 10 demandas tinham progresso real no momento desta auditoria
— nenhuma foi encontrada "sem progresso" (não existe o caso "sem
progresso, spec continua válida"/"sem progresso, spec precisa de
ajuste" nesta rodada). Evidência coletada por demanda: `git branch -r`
+ `git log origin/main..origin/<branch>` (confirma cada branch existe,
o commit exato, e quantos commits à frente de `main`), `list_pull_requests`
(nenhum PR aberto pra nenhuma das 10 — confirmado 2x, antes e depois
desta auditoria) e `get_comments` em cada uma das 10 issues (exatamente
1 comentário em cada — o meu próprio relatório técnico; nenhuma
resposta ou aprovação do usuário ainda em nenhuma delas).

| # | Demanda | Branch | Commits à frente de `main` | Veredito |
|---|---|---|---|---|
| #12 | `S4-B2-001` | `claude/s4-b2-001-loading` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #13 | `S4-B2-002` | `claude/s4-b2-002-login` | 1 | Progresso externo encontrado — implementada (sem mudança de código), aguardando revisão. Proposto: APROVADO |
| #14 | `S4-B2-003` | `claude/s4-b2-003-tatica` | 1 | Progresso externo encontrado — parcial, 2 divergências aguardando decisão do PM. Proposto: ADJUSTMENTS REQUIRED |
| #15 | `S4-B2-004` | `claude/s4-b2-004-treino` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #16 | `S4-B2-005` | `claude/s4-b2-005-perfil` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #17 | `S4-B3-001` | `claude/s4-b3-001-transfer-contract-card` | 1 | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #18 | `S4-B3-002` | `claude/s4-b3-002-mercado` | 3 (empilhada sobre #17) | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |
| #19 | `S4-B3-003` | `claude/s4-b3-003-negociacao` | 4 (empilhada sobre #17/#18) | Progresso externo encontrado — implementada, corrigiu bug crítico pré-existente. Proposto: APROVADO |
| #20 | `S4-B3-004` | `claude/s4-b3-004-contratos` | 5 (empilhada, só docs) | Progresso externo encontrado — bloqueada por decisão de produto, nenhum código alterado. Proposto: BLOQUEADO |
| #21 | `S4-B3-005` | `claude/s4-b3-005-matchcard-financialsummary` | 6 (empilhada sobre as anteriores) | Progresso externo encontrado — implementada, aguardando revisão. Proposto: APROVADO |

("Progresso externo" no sentido da demanda original — trabalho que
esta auditoria encontrou pronto, não necessariamente de uma sessão
diferente; nestes 10 casos específicos, o trabalho foi feito pela
mesma linha de sessões deste handoff, mas a auditoria trata a
verificação do mesmo jeito independente de quem implementou, que é o
ponto do processo.)

Cadeia de dependências revalidada:

* `S4-B3-002`/`003` dependiam de `S4-B3-001` (TransferCard) como
  bloqueante — confirmado: ambas as branches partem de
  `claude/s4-b3-001-transfer-contract-card` (empilhadas de propósito,
  não paralelas), então o TransferCard que elas consomem já é o mesmo
  código, sem risco de divergência entre "o que `S4-B3-001` propôs" e
  "o que `S4-B3-002`/`003` realmente usam".
* `S4-B3-004` dependia de `ContractCard` (`S4-B3-001`) — o componente
  existe, mas a dependência real que bloqueia é outra (a tela em si
  não existe), então a conclusão de `S4-B3-001` não desbloqueia
  `S4-B3-004` sozinha, como o relatório daquela demanda já registrou.
* `S4-B3-005` era o pré-requisito declarado de "Resumo da rodada" —
  confirmado concluído; "Resumo da rodada" pode ser especificada como
  demanda própria a qualquer momento agora, não depende de mais nada.
* Nenhuma dependência quebrada ou invalidada foi encontrada — a ordem
  de execução usada (Batch 2 em sequência, depois `S4-B3-001` antes de
  `002`/`003`/`004`, `S4-B3-005` em paralelo por ser independente)
  continua fazendo sentido.

Risco de coordenação identificado (não é sobre as 10 demandas em si):
`docs/sprints/S4/S4_REQUISITOS_VIGENTES.md` foi movido de
`docs/requirements/ui-ux/` pra `docs/sprints/S4/` por uma sessão
paralela (commit `ce2a25b`, depois de todas as 10 branches acima terem
sido criadas) — as 10 branches ainda editam o arquivo no caminho
antigo. Isso vai gerar um conflito de rename no merge (não um
conflito de conteúdo — o `git mv` deve resolver automaticamente na
maioria dos casos, mas quem for mesclar deve conferir). Registrado
aqui, não corrigido nas branches (mudar o caminho editado em 9
branches já com relatório fechado estaria fora do escopo desta
auditoria — é um ajuste mecânico pro momento do merge, não uma
mudança de conteúdo).

Decisão do PM (Murilo, 10/09/2026): aprovadas 8 das 10 demandas
auditadas (#12, #13, #15, #16, #17, #18, #19, #21) — todas mescladas
em `main` nesta sessão, ver `Histórico` abaixo. `S4-B2-003` (#14)
ficou como `AJUSTES NECESSÁRIOS` até o PM decidir as 2 divergências
registradas — decidido em seguida (mesma sessão do usuário) e também
mesclada. `S4-B3-004` (#20) ficou `BLOQUEADO` até decisão de produto
sobre a tela Contratos — o PM escolheu "criar do zero"; implementada
e aguardando revisão (ver seção própria acima). Risco de coordenação
do rename de `S4_REQUISITOS_VIGENTES.md` confirmado e resolvido
manualmente em cada merge, sem perda de conteúdo.

⸻

Histórico

Demanda	Data	Commit	Changelog
S4-B5-QA-001 — Batch 5: QA Visual/UX transversal (fecha a S4)	26/10/2026	branch `claude/s4-b5-qa-001` (`09a967b`)	docs/project/CHANGELOG.md (v11.0.0)

S4-B5-QA-001 — Batch 5: QA Visual/UX transversal — fecha a S4

Status: APROVADO
Sprint: S4 — Redesign Mobile
Fase: Batch 5 (QA Visual/UX) — última etapa, fecha a Sprint por inteiro
Prioridade: P1
Issue: https://github.com/muriloalmeida-alt/FitOS/issues/37

Objetivo

Revisão transversal do redesign inteiro — as 18 telas migradas (Batch
2 + Batch 3 + Batch 4) e os 5 componentes formalizados (PlayerCard,
MatchCard, TransferCard, ContractCard, NewsCard) — conforme
`docs/sprints/S3/S3_S4_MATRIZ_TELAS_MOBILE.md` (Batch 5 — QA Visual/
UX, §35 Critérios gerais de aceite). Não é uma tela nova nem um
componente novo: é a auditoria que confirma que o conjunto migrado
tela por tela também funciona como um TODO coerente, e fecha
formalmente a Sprint S4 — Redesign Mobile.

Contexto

Cada demanda de migração (S4-B2-*, S4-B3-*, S4-B4-*) validou sua
própria tela isoladamente — nenhuma validou consistência CRUZADA entre
telas, nem os eixos transversais que só aparecem quando se olha o
app inteiro (densidade de toque, ordem de leitura, uso de emoji como
ícone em vez de asset, ARIA). A matriz original já previa esta etapa
como item separado, com critérios de aceite próprios (§35): Layout,
Componentes, Interação, Acessibilidade, Produto.

Gaps já conhecidos e registrados ao longo da Sprint, que esta
auditoria deve confirmar/reavaliar com evidência (não presumir que
continuam do jeito que foram registrados — o app mudou muito desde
então):

* uso de emoji como ícone de interface (262 ocorrências na contagem
  original da S3.2.7) — nunca tratado como projeto isolado, conforme
  decidido; confirmar estado atual;
* densidade de ARIA geral baixa (achado original da S3.2.7);
* `LeagueTable` — único dos 6 BRDATA Product Patterns do CLAUDE.md §7
  ainda sem componente formal (segue tabela HTML tradicional,
  confirmado em `S4_REQUISITOS_VIGENTES.md` §3);
* `.icon-btn` abaixo de 48dp (área de toque);
* divergências já decididas mas que precisam ser conferidas como
  aplicadas de forma CONSISTENTE em todo o app, não só na tela que as
  originou: tipografia Rajdhani/Bebas Neue como BRDATA Extension
  (decidido em `S4-B2-003`, também usado em `S4-B2-004`/`S4-B4-004`/
  `S4-B4-005`) e verde do gramado como BRDATA Extension;
* setas de tendência (▲/▼) do Perfil do jogador, registradas como
  divergência aberta em `S4-B2-005` (token `--brd-*` sem equivalente
  `--m3-*` estabelecido) — nunca resolvida;
* falhas de teste pré-existentes já confirmadas (via `git stash`, não
  regressão de nenhuma demanda) em múltiplos relatórios ao longo da
  Sprint — `test_cup.js`, `test_tabela_modal.js`, 2 checks de
  `test_intervalo_noticias_proposta_destino.js`, 1 flake em
  `test_noticias_fullscreen_fluxo.js` — consolidar essa lista aqui,
  confirmar quais ainda procedem, e decidir (registrar decisão, não
  resolver sozinho se for grande) o que entra nesta demanda vs. vira
  demanda própria de dívida técnica.

Escopo

Chapéu implementador deve, para o conjunto das 18 telas + 5
componentes:

1. Layout: confirmar ausência de zoom horizontal, conteúdo cortado,
   hierarquia clara, CTAs identificáveis — em telas reais, mobile-
   first, não só nas que tiveram teste E2E dedicado.
2. Componentes: confirmar reuso real dos 5 componentes formalizados
   (nenhuma duplicação nova introduzida durante a Sprint), uso de
   tokens `--m3-*` consistente, estados (vazio/erro/carregando)
   tratados onde aplicável, ausência de padrão paralelo sem
   justificativa registrada.
3. Interação: áreas de toque adequadas (confirmar `.icon-btn` com
   evidência, não presunção), feedback presente, navegação
   consistente entre as 18 telas, ações críticas claras.
4. Acessibilidade: contraste adequado, labels quando necessário,
   informação não dependente só de cor, ordem de leitura lógica —
   medir a densidade real de ARIA (não só repetir o número da S3.2.7
   original, esse número está desatualizado).
5. Produto: confirmar que nenhuma funcionalidade existente foi
   removida e nenhuma regra de negócio alterada em nenhuma das 28
   demandas anteriores desta rodada — auditoria de regressão
   consolidada, não uma nova rodada de testes do zero.
6. Consolidar a lista de falhas de teste pré-existentes (item de
   Contexto acima) com evidência atualizada — quais ainda procedem,
   quais já não existem mais.
7. Para cada gap confirmado (emoji, ARIA, LeagueTable, `.icon-btn`,
   setas de tendência): registrar com evidência real, classificar
   P1/P2, e decidir (com o PM, não sozinho, se a correção for grande)
   o que é corrigido nesta própria demanda (pequeno, mecânico) vs. o
   que vira demanda própria depois da S4 encerrar.
8. Retornar relatório técnico nesta mesma seção, com o veredito de
   cada eixo (Layout/Componentes/Interação/Acessibilidade/Produto) e
   a lista consolidada de gaps + falhas de teste, status `REVISÃO DO
   PM NECESSÁRIA`.

Fora de escopo

* criar o componente `LeagueTable` (é um achado desta auditoria, não
  o trabalho dela — vira demanda própria se o PM priorizar);
* resolver a densidade de ARIA num único esforço monolítico, se a
  auditoria confirmar que ainda é baixa (mesmo critério: registrar,
  não resolver tudo de uma vez sem escopo definido);
* qualquer mudança de regra de negócio;
* Batch 6 ou qualquer trabalho fora do escopo original da S4 —
  Redesign Mobile (ex.: `GE-BALANCE-*`, `GE-COPA-001`, `SAVE-LIMIT-001`
  já são frentes próprias, fora da S4, não deste QA).

Dependências

* As 18 telas migradas + 5 componentes formalizados (Batches 2, 3 e
  4 — todos aprovados e mesclados).
* `docs/sprints/S3/S3_S4_MATRIZ_TELAS_MOBILE.md` (Batch 5, §35
  Critérios gerais de aceite).
* `docs/sprints/S4/S4_REQUISITOS_VIGENTES.md`.

Requisitos

Mesma sequência obrigatória: inspecionar → localizar → entender →
planejar → alterar (só o pequeno/mecânico, registrado) → testar →
revisar. Mesmo rigor de evidência de toda a Sprint — nenhum veredito
sem grep/leitura de código/teste confirmando.

Critérios de aceite

Os mesmos do §35 da matriz original: Layout, Componentes, Interação,
Acessibilidade e Produto todos com veredito registrado e evidência;
lista consolidada de gaps conhecidos revisada com estado atual; lista
de falhas de teste pré-existentes consolidada; nenhuma regressão
funcional encontrada nas 28 demandas anteriores.

Validações

O PM deverá validar: cobertura dos 5 eixos, qualidade da evidência,
classificação de gaps (P1/P2) e a decisão sobre o que é corrigido
aqui vs. vira demanda própria.

Riscos

* baixo — é auditoria transversal, mudança de código só se for
  pequena/mecânica e explicitamente registrada como tal.

Observações

**Com esta demanda concluída e aprovada, a Sprint S4 — Redesign
Mobile está formalmente encerrada** — fundação (`S3-DS20-S4-PREP-001`/
`002`), Batch 2 (8 telas), Batch 3 (5 itens), Batch 4 (6 telas) e
Batch 5 (esta), todos aprovados. Por fim: nenhuma das demandas fora
da S4 (`GE-BALANCE-*`, `GE-COPA-001`, `SAVE-LIMIT-001`) depende do
fechamento formal da S4 pra continuar evoluindo — são frentes
paralelas independentes, como já registrado desde que começaram.


**Relatório técnico (Claude, 26/10/2026)** — branch `claude/s4-b5-qa-001`,
sobre `main` 4b539c7 (já com o redesign da referência visual, PRs #47–#49).
Medição: varredura do código (fora de comentários) + script Playwright em
360×780 em 6 painéis, 5 telas e o menu (`docs` não guardam o script; ele
fica no scratchpad da sessão).

| Eixo | Veredito | Evidência |
|---|---|---|
| Layout | APROVADO | 0 px de rolagem horizontal em todos os 12 contextos medidos a 360px; hierarquia/CTA lima conferidos por captura nos blocos 1–5 (`docs/REDESIGN_BLOCOS.md`) |
| Componentes | APROVADO COM RESSALVA | tokens `--m3-*` com a paleta nova; sheets/diálogos no mesmo padrão (fundação); `LeagueTable` segue sem componente formal (a Tabela já não é `<table>` — 0 ocorrências —, é lista `.mt-tr`); 11 regras CSS ainda com `var(--brd-*)` |
| Interação | APROVADO COM RESSALVA | corrigido aqui: X das modais 26→44px, "?" de ajuda e `.mt-icon-btn` (42→44); continuam < 44px: chips de filtro, segmentos (`.mt-seg-btn`), itens do menu e botões de atalho da Início — aumentá-los muda a densidade das telas (decisão de PM) |
| Acessibilidade | APROVADO COM RESSALVA | contraste AA em todos os pares principais (texto 16,2:1; secundário 7,2–7,8:1; botão lima 11,6:1; erro 6,0:1; borda 3,6:1); corrigido aqui: botão destrutivo (`--m3-on-error` 4,1→5,4:1), nome acessível nos 57 X das modais e `role="switch"`/`aria-checked`/rótulo nos toggles de Configurações — 0 botões sem nome nos 12 contextos; ARIA geral continua baixa: 39 `aria-*` e 2 `role` pra ~300 botões, 0 `role="dialog"` nas 63 modais fixas |
| Produto | APROVADO | redesign só de apresentação (diff em `public/` = CSS/markup + paleta/tema/`confirmModal`); suíte completa 152/153 nesta branch (falha: `test_noticias_fullscreen_fluxo`, intermitente já listado) |

**Gaps conhecidos — estado atual**

| Gap | Hoje | Classe | Proposta |
|---|---|---|---|
| Emoji como ícone | 267 fora de comentários (121 HTML + 146 JS), ~igual aos 262 originais | P2 | demanda própria (troca por ícones SVG do DS) |
| ARIA baixa | ver Acessibilidade; modais sem `role="dialog"`/foco preso (só as dinâmicas `m3-*` têm) | P1 | demanda própria: `role="dialog"` + `aria-labelledby` + foco nas 63 modais |
| `LeagueTable` | lista `.mt-tr`, sem componente formal | P2 | demanda própria (fora de escopo aqui) |
| `.icon-btn` < 48dp | `.mt-icon-btn` 44px (corrigido); chips/segmentos/menu < 44px | P1 | decidir densidade (PM) |
| Rajdhani/Bebas | Bebas eliminada (redesign); Rajdhani em 66 usos como extensão BRDATA | — | manter como extensão decidida |
| Setas ▲/▼ do Perfil | 4 usos em JS; 15 `var(--brd-*)` (11 CSS + 4 JS) sem par `--m3-*` | P2 | migrar junto com a limpeza de `--brd-*` |

**Falhas de teste pré-existentes — consolidado** (10 suítes completas
locais hoje + CI): `test_tabela_modal` e
`test_intervalo_noticias_proposta_destino` **não falharam mais**;
intermitentes de carga ainda vistos 1× cada: `test_cup`,
`test_noticias_fullscreen_fluxo`, `test_h2h` (também no CI — a Tabela abre
atrasada, causa não identificada), `test_resumo_rodada`,
`test_serie_b_escudos`, `test_save`/`test_comissao_tecnica` (só no CI, com
diagnóstico já no código); `test_regressao_gate` falhou 1× por rede do
ambiente. Proposta: uma demanda própria de dívida técnica pros
intermitentes (não resolvidos aqui).

**Arquivos alterados nesta demanda:** `public/carreira.html` (aria-label
nos X, áreas de toque, `--m3-on-error`), `public/js/carreira.js` (toggles
com `role="switch"`), este handoff.

Recomendação: aprovar o fechamento da S4 com os gaps P1/P2 acima virando
demandas próprias (ARIA de modais, densidade de toque, emoji, LeagueTable,
`--brd-*`, intermitentes).

APROVADO pelo Murilo em 26/10/2026, diretamente na conversa ("Aprovado"). **Sprint S4 — Redesign Mobile formalmente encerrada.** Gaps P1/P2 acima viram demandas próprias quando priorizados.

⸻

S3-DS20-S4-READINESS-001 — S3.2.7 Readiness Review	11/09/2026	sem commit de código — demanda de auditoria/decisão; nota de fechamento registrada no commit `9ac51bf`	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026, diretamente nesta conversa
("Aprovado"). Auditoria original (09/09/2026) determinou
`AJUSTES NECESSÁRIOS` com 6 itens — os 3 bloqueantes (convergência de
tokens, Dialog/Bottom Sheet/Skeleton, migração das 9 telas P0)
resolvidos por `S3-DS20-S4-PREP-001` e pelos Batches 2/3 da S4,
completos e mesclados; os 3 não-bloqueantes (emoji, cobertura de
teste, gaps P1/P2) tratados incrementalmente conforme previsto, sem
virar projeto isolado. Relatório técnico completo (evidência original
da auditoria + nota de fechamento com o mapeamento de cada item pra
sua demanda de resolução) em `git show 9ac51bf:docs/HANDOFF_CLAUDE.md`.

S3-DS20-S4-PREP-001 — Dialog/Bottom Sheet/Skeleton (`--m3-*`) + convergência de tokens	09/09/2026	merge de `claude/s4-prep-001-tokens-components` em `main` (commit de código original `4d80d99`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 09/09/2026. Relatório técnico completo (o que
foi implementado, testes, gaps, arquivos avaliados/alterados) fica
preservado no histórico do git — `git show dc382a8:docs/HANDOFF_CLAUDE.md`
(commit em que este relatório foi registrado) — e não é reproduzido
aqui, pra manter este documento como o estado operacional atual, não um
arquivo permanente (esse é o papel do CHANGELOG.md, conforme
`docs/README.md`).

**Merge do código:** exceção pontual aberta pelo Murilo pra concluir
esta demanda já aprovada — nenhuma alteração de código nova, só a
integração em `main` do que já estava implementado, testado e
revisado na branch. A instrução geral de "não mexer em código" desta
sessão continua valendo pra qualquer outra alteração.

S3-DS20-S4-PREP-002 — Formalizar PlayerCard (`playerRow()`), retroativo em Elenco	09/09/2026	merge de `claude/s3-ds20-s4-prep-002` em `main` (commit de código original `1998f02`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 09/09/2026. Relatório técnico completo (o que
foi implementado — mudança puramente documental, zero comportamento
alterado —, testes, a divergência encontrada em relação à
especificação original, e a regressão pré-existente de
`S3-DS20-S4-PREP-001` encontrada mas fora de escopo) fica preservado no
histórico do git — `git show 1998f02:docs/HANDOFF_CLAUDE.md` (commit em
que este relatório foi registrado) — e não é reproduzido aqui, pelo
mesmo motivo do item acima.

**Merge do código:** autorizado pela aprovação formal acima
(`docs/README_HANDOFF.md` §13) — feito nesta mesma sessão, já com
chapéu implementador (diferente do caso da PREP-001, onde o merge
ficou pendente de outra sessão).

S4-B2-001 — Migrar tela Loading/Bootstrap para o Design System novo	10/09/2026	merge de `claude/s4-b2-001-loading` em `main` (commit de código original `6267fc6`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #12, junto com #13/#15/#16/
#17/#18/#19/#21). Relatório técnico completo fica preservado no
histórico do git — `git show 6267fc6:docs/HANDOFF_CLAUDE.md` — e não é
reproduzido aqui, mesmo motivo dos itens acima.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#12, executado nesta sessão junto com as outras 7 demandas aprovadas
no mesmo lote.

S4-B2-002 — Migrar tela Login/Entrada para o Design System novo	10/09/2026	merge de `claude/s4-b2-002-login` em `main` (commit de código original `7fcb3a7`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #13). Achado de inspeção: a
tela já estava migrada (`#screenLoginRequired`) — mudança puramente
documental, zero código de produção alterado. Relatório técnico
completo em `git show 7fcb3a7:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#13, executado nesta sessão junto com o lote de 8 demandas.

S4-B2-003 — Migrar tela Tática/Formação para o Design System novo	10/09/2026	merge de `claude/s4-b2-003-tatica` em `main` (commit de código original `f92a339`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #14), depois de resolvidas
as 2 divergências registradas na inspeção original (`.mt-bench-row`
mantido como padrão próprio; tipografia `Rajdhani` classificada como
BRDATA Extension). Relatório técnico completo em
`git show f92a339:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#14, executado nesta sessão.

S4-B2-004 — Migrar tela Treino para o Design System novo	10/09/2026	merge de `claude/s4-b2-004-treino` em `main` (commit de código original `6bf1467`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #15). Relatório técnico
completo em `git show 6bf1467:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#15, executado nesta sessão junto com o lote de 8 demandas.

S4-B2-005 — Migrar tela Perfil do jogador para o Design System novo	10/09/2026	merge de `claude/s4-b2-005-perfil` em `main` (commit de código original `13c0991`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #16). Relatório técnico
completo (inclui a divergência registrada sobre as setas de tendência
▲/▼ não migradas, sem token `--m3-*` equivalente) em
`git show 13c0991:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#16, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-001 — Criar os componentes TransferCard e ContractCard	10/09/2026	merge de `claude/s4-b3-001-transfer-contract-card` em `main` (commit de código original `44edc50`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #17). Relatório técnico
completo em `git show 44edc50:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#17, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-002 — Migrar tela Mercado para o Design System novo	10/09/2026	merge de `claude/s4-b3-002-mercado` em `main` (commit de código original `48289d1`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #18). Relatório técnico
completo em `git show 48289d1:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#18, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-003 — Migrar tela Negociação/Proposta para o Design System novo	10/09/2026	merge de `claude/s4-b3-003-negociacao` em `main` (commit de código original `4d3f703`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #19). Relatório técnico
completo — inclui o bug crítico pré-existente de CSS (Dialog/Bottom
Sheet sem `position:fixed`/`z-index` de verdade desde
`S3-DS20-S4-PREP-001`) encontrado e corrigido nesta demanda — em
`git show 4d3f703:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#19, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-005 — Inspecionar e formalizar MatchCard e FinancialSummary	10/09/2026	merge de `claude/s4-b3-005-matchcard-financialsummary` em `main` (commit de código original `7ef29b6`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #21). Relatório técnico
completo (MatchCard construído novo — motor de partidas só produz 2
dos 5 estados suportados pelo componente; FinancialSummary formalizado
retroativamente sobre o card "Financeiro" já existente) em
`git show 7ef29b6:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#21, executado nesta sessão junto com o lote de 8 demandas.

S4-B3-004 — Criar a tela Contratos (redefinida de "migrar" para "criar do zero")	10/09/2026	merge de `claude/s4-b3-004-contratos` em `main` (commit de código original `ba88891`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 10/09/2026 (issue #20), depois de decidir a
opção 1 (criar a tela do zero) e revisar a implementação. Relatório
técnico completo (inspeção original que bloqueou a demanda, mini-spec
do PM, e a implementação final — reaproveitando 100% da lógica já
existente, nenhuma regra de contrato nova) em
`git show ba88891:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#20, executado nesta sessão.

**Nota de governança (sessão PM, 10/09/2026):** ao contrário das
outras 9 demandas desta rodada (aprovadas pelo Murilo diretamente
nesta conversa, com a mensagem "Aprovado" registrada), o "Aprovado"
que fechou esta demanda foi postado pela sessão implementadora na
própria issue #20
(https://github.com/muriloalmeida-alt/FitOS/issues/20#issuecomment-5625550397),
sem um checkpoint externo verificável nesta conversa — o tipo exato de
situação que `docs/README_HANDOFF.md` §1 veda ("quem implementa e
especifica não pode também aprovar formalmente o próprio trabalho sem
checagem externa"). Pode ser que o Murilo tenha autorizado essa
implementação/merge diretamente com a sessão implementadora (mesmo
padrão de "passei a instrução para o dev" usado nesta conversa pras
outras 9) — mas essa sessão PM não tem como confirmar isso pelas
fontes disponíveis (GitHub, git). Registrado aqui pra transparência;
não desfeito unilateralmente (o merge de código já é fato consumado,
reverter é decisão de produto/técnica, não documental). Se o Murilo
não autorizou, é um gap de processo a corrigir daqui pra frente, não
desta demanda específica retroativamente.

**Resolução (sessão implementadora, 11/09/2026):** confirmado — o
Murilo autorizou a aprovação/merge de `S4-B3-004` diretamente na
conversa desta sessão implementadora ("Aprovar a #20", mesmo padrão
usado pras outras 9 demandas do lote). O gap era só de
visibilidade cruzada entre sessões paralelas (a sessão PM não tinha
como ver esta conversa), não uma aprovação ausente de fato. Nenhuma
ação de reversão necessária.

⸻

DOCS-REQ-001 — Povoar docs/requirements/ com regras vigentes migradas de docs/sprints/	11/09/2026	merge de `claude/docs-req-001` em `main` (commit de código original `a493286`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #23), diretamente nesta
conversa ("Pode mesclar. Aprovado pelo PM"). Relatório técnico completo
(4 documentos criados em `docs/requirements/` — um por subpasta —,
cada um citando a origem em `docs/sprints/S2/`/`S3/` e separando
estado atual confirmado de direção futura/proposta) em
`git show a493286:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#23, executado nesta sessão.

S4-B3-006 — Migrar Resumo da rodada e Rodada (menu) pro MatchCard	11/09/2026	merge de `claude/s4-b3-006-resumo-rodada` em `main` (commit de código original `29fa8f7`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #24), diretamente nesta
conversa ("Pode seguir com o desenvolvimento"). Relatório técnico
completo (3 pontos de código migrados pro MatchCard —
`showRoundResultsModal()`, `cupRoundResultsHTML()`, `renderRodada()` —
sem alterar a definição do componente; 4º ponto de `.ct-round-result-row`
confirmado fora do escopo) em `git show 29fa8f7:docs/HANDOFF_CLAUDE.md`.
Com esta demanda, o **Batch 3 (Transactional) da S4 fecha 100%**.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#24, executado nesta sessão.

SAVE-LIMIT-001 — Save de carreira "grande demais": eliminar o beco sem saída	11/09/2026	merge de `claude/save-limit-001` em `main` (commit de código original `5ab43d8`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #29), diretamente nesta
conversa ("mesclar e seguir para a próxima"). Relatório técnico
completo (medição real — `leagueSquads` responde por ~79% do save,
não estruturas acumulativas; compressão gzip 92-93% real,
`MAX_BYTES` passa a valer sobre o tamanho comprimido; poda automática
de histórico não-essencial como última linha de defesa; `clubHistory`
capado) em `git show 5ab43d8:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#29, executado nesta sessão.

GE-BALANCE-001 — Reduzir sequências de invencibilidade do clube humano	11/09/2026	merge de `claude/ge-balance-001` em `main` (commit de código original `4fc3cde`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #26), diretamente nesta
conversa ("Merge"). Relatório técnico completo (inspeção real da curva
de fadiga/rotação, achado da inversão `club.def/defMult`, mecanismo
"motivação do adversário" implementado e validado por simulação Monte
Carlo — 5000 temporadas, queda de 6.2% pra 4.0% na fração de
temporadas com sequência ≥10 jogos invicto —, recomendação de
`GE-BALANCE-003` separada pra corrigir a inversão de calibração
ataque/defesa) em `git show 4fc3cde:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#26, executado nesta sessão.

GE-BALANCE-002 — Peso da tradição/força de clube na simulação (relegação)	11/09/2026	merge de `claude/ge-balance-002` em `main` (commit de código original `830a051`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #27), diretamente nesta
conversa ("Aprovar #27"). Relatório técnico completo (club.atk/def já
reaproveitado por buildGeneratedProPlayer sem mudança, mas não é
tradição — CLUB_TRADITION_IDS novo, pequeno e curado; mecanismo de
reprieve probabilístico na zona de rebaixamento, gap encontrado e
corrigido pela própria simulação de validação — 17.3% → 40.7% de
redução medida) em `git show 830a051:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#27, executado nesta sessão.

S4-B4-READINESS-001 — Verificação individual das 7 telas do Batch 4	11/09/2026	merge de `claude/s4-b4-readiness-001` em `main` (commit de código original `38884d8`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #25), diretamente nesta
conversa ("ordem da #25 aprovada"). Relatório técnico completo
(auditoria com evidência das 7 telas — 6 existem e precisam de
migração, 1 — Eixos táticos — já está coberta dentro de Tática/
Formação; ordem de execução recomendada: Onboarding → Meus esquemas →
Marcação individual → Comparar jogadores → Notícias/Eventos →
Histórico/Estatísticas) em `git show 38884d8:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** auditoria pura, sem código de produção — merge
autorizado pela aprovação formal do PM na issue #25, executado nesta
sessão.

GE-COPA-001 — Expandir Copa do Brasil (60 clubes, ida e volta, cabeças de chave, ao vivo)	11/09/2026	merge de `claude/ge-copa-001-impl` em `main` (commit de código original `9e416d7`; checkpoint de desenho aprovado antes, `claude/ge-copa-001-design`, commit `729033f`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #28), diretamente nesta
conversa — em 2 etapas, como a especificação exigia dado o tamanho da
mudança: (1) desenho de fases validado ("desenho da #28 aprovado" +
escolha de cabeças de chave por força atual via pergunta direta), (2)
implementação + validação por simulação aprovada ("Pode fazer o merge
de 25 a 28"). Relatório técnico completo (60 clubes cruzando as 3
divisões, 4 cabeças de chave pulando a Fase 1, ida e volta em todas
as 6 fases, motor ao vivo 100% reaproveitado de resolveLiveChunk,
formato legado de 16 clubes preservado intacto pra saves antigos,
3 temporadas inteiras simuladas sem quebra de chaveamento,
`test_cup.js` reescrito por ter ficado obsoleto) em
`git show 9e416d7:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#28, executado nesta sessão.

S4-B4-001 — Migrar tela Onboarding para o Design System novo	11/09/2026	merge de `claude/s4-b4-001-onboarding` em `main` (commit de código original `d36d8e0`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #31), diretamente nesta
conversa ("Aprovado. Seguir para o próximo"). Relatório técnico
completo (3 seletores CSS migrados — `.mt-onboard-title`/`.mt-onboard-text`/
`.mt-onboard-skip`, `--mt-ivory-50`/`--mt-ink-muted` →
`--m3-on-surface`/`--m3-on-surface-variant`; tipografia Bebas Neue do
título mantida como BRDATA Extension) em
`git show d36d8e0:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#31, executado nesta sessão.

S4-B4-002 — Migrar tela Meus esquemas para o Design System novo	11/09/2026	merge de `claude/s4-b4-002-meus-esquemas` em `main` (commit de código original `c8b1b28`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #32), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (achado que corrige
a auditoria `S4-B4-READINESS-001` — a tela não era "100% legada": a
casca de modal/sheet e as linhas da lista de esquemas já estavam 100%
`--m3-*` de demandas anteriores; único token legado real era o campo
de nome do sheet "Novo esquema", `.mt-friend-input` cru fora de
`.mt-form-row`; migrado envolvendo-o em `.mt-form-row`, reaproveitando
regra que já existia pra "Editar perfil", sem CSS novo) em
`git show c8b1b28:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#32, executado nesta sessão.

S4-B4-003 — Migrar tela Marcação individual para o Design System novo	11/09/2026	merge de `claude/s4-b4-003-marcacao-individual` em `main` (commit de código original `a4cdb6d`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #33), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (mesmo achado de
`S4-B4-002` — casca de modal já `--m3-*` antes desta demanda; tokens
legados reais eram `.mt-sel-row`/`.mt-sel-name`/`.mt-info-line b`,
migrados via override CSS ESCOPADO a `#markingOverlay` em vez de mudar
a regra base, compartilhada com Comparar jogadores e o seletor de
substituição ao vivo, ambos fora de escopo; decisão registrada de NÃO
reaproveitar `playerRow()`/PlayerCard — o componente não mostra
posição/subposição, informação essencial numa lista não agrupada por
posição; guard `:not(.selected)` necessário pra não quebrar o estado
selecionado pré-existente, achado e corrigido no próprio teste antes do
merge) em `git show a4cdb6d:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#33, executado nesta sessão.

S4-B4-004 — Migrar tela Comparar jogadores para o Design System novo	11/09/2026	merge de `claude/s4-b4-004-comparar-jogadores` em `main` (commit de código original `74465a1`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #34), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (decisão registrada:
reaproveitar `playerRow()`/PlayerCard na lista de escolha — SIM, ao
contrário de `S4-B4-003`, porque aqui o pool já é sempre da mesma
subposição e o subtítulo já anuncia qual, então o chip por linha seria
redundante; achado de 3 tokens exclusivos do resultado que a auditoria
tinha marcado como "novo" — `.m3-compare-player b`/`.m3-compare-row`/
`.m3-compare-val`, migrados na regra base já que a classe é exclusiva
desta tela, sem precisar de override escopado) em
`git show 74465a1:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#34, executado nesta sessão.

S4-B4-005 — Migrar tela Notícias/Eventos e formalizar NewsCard	11/09/2026	merge de `claude/s4-b4-005-noticias-eventos` em `main` (commit de código original `4f56673`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #35), diretamente nesta
conversa ("Aprovado"). Relatório técnico completo (`NewsCard`
formalizado PARCIALMENTE retroativo — `newsItemHTML()` já cobria o
layout de linha do feed; a manchete em destaque, que nunca foi função
própria, virou a variação `featured` do MESMO componente; classes
`.mt-news-*` renomeadas `.m3-news-*`, tokens `--mt-gold-400/600` →
`--m3-secondary` e demais → `--m3-on-surface(-variant)`/
`--m3-outline-variant`; cores categóricas por tipo e destaque "mine"
preservados como cor categórica da BRDATA; verificação pós-merge
encontrou 1 flake em `test_noticias_fullscreen_fluxo.js` — timing de
simulação ao vivo, não relacionado a esta demanda, confirmado
reproduzindo isoladamente 2x limpo em seguida) em
`git show 4f56673:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#35, executado nesta sessão.

S4-B4-006 — Migrar tela Histórico/Estatísticas para o Design System novo	11/09/2026	merge de `claude/s4-b4-006-historico-estatisticas` em `main` (commit de código original `a4238b0`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #36), diretamente nesta
conversa ("Aprovado e a 30 tbm"). Relatório técnico completo
(`kpiHTML()` já tinha a variante `block:"m3"` em produção no card
Financeiro — Estatísticas nunca adotou, migração foi só passar `"m3"`
em cada chamada, zero CSS novo; `.mt-obj-tabs`/`.mt-obj-tab`/
`.mt-mini-*` migrados via override ESCOPADO a `#panel-estatisticas`,
compartilhados com Objetivos/Loja e o Histórico por temporada do
Perfil do jogador; MatchCard avaliado e não aplicável, nenhuma lista
de "resultados recentes" nesta tela) em
`git show a4238b0:docs/HANDOFF_CLAUDE.md`.

**Última tela do Batch 4 (Complementary) — fecha 100% (6/6 telas
migradas + Eixos táticos já coberto, sem demanda própria).** Resta só
o Batch 5 (QA Visual/UX transversal) pra completar a Sprint S4 por
inteiro.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#36, executado nesta sessão.

GE-BALANCE-003 — Corrigir inversão de defesa no motor de partida	11/09/2026	checkpoint de desenho mesclado (`claude/ge-balance-003-design`, commit `fe77506`); implementação mesclada em seguida (`claude/ge-balance-003-impl` em `main`, commit de código original `422d523`)	docs/project/CHANGELOG.md (a atualizar)

APROVADO pelo Murilo em 11/09/2026 (issue #30), em 2 etapas nesta
conversa — checkpoint de desenho ("Aprovada a 30") e implementação
("Aprovado"). Relatório técnico completo: causa raiz determinada com
evidência (hipótese a — o operador da fórmula de gol estava errado,
`atk/def` deveria ser `atk*def`; os ~180 valores de `def` em
`data.js` já estavam curados certos, confirmado por
`buildRealPlayer`/`buildGeneratedProPlayer`, que já fazem
`(2-club.def)` pra inverter o mesmo valor em outro lugar). Isso
revisou o item 1 original da especificação: `computeHumanStrength`
já estava correto e NÃO foi alterado. 6 funções/11 divisões
corrigidas (`simulateCupLeg`/`resolveOtherDivisionsRound`/
`attributeChances`/`resolveCpuFixture`/`resolveLiveChunk`/
`suggestTactics`), mais 2 ajustes multiplicativos encontrados durante
a implementação (penalidade de familiaridade tática e o mecanismo de
"adversário motivado" de `GE-BALANCE-001`, ambos dependiam do sentido
antigo de `def`). Validado com simulação de campeonato completo nova
(300 temporadas, 20 clubes reais do Brasileirão — achado extra: o
ranking de pontos era essencialmente achatado com o bug, e passa a
refletir a força real dos clubes depois do fix) e reexecução de
`sim_ge_balance_001.js` (atualizado, mecanismo de motivação continua
funcionando mas proporcionalmente mais fraco contra a nova baseline —
achado registrado pra uma possível demanda futura de recalibração)/
`sim_ge_balance_002.js` (inalterado, 40,7% idêntico ao já medido) em
`git show 422d523:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do PM na issue
#30, executado nesta sessão.

GE-BALANCE-005 — Evolução de jogadores realista (fim da inflação de overall)	25/10/2026	merge de `claude/ge-balance-005-impl` em `main` (commit de código original `5949f4a`, merge `ed42a7b`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, nesta conversa ("Faça o merge do
que está pronto"). Teto de ganho por temporada por idade/minutagem,
freio de faixa alta, potencial que cai a partir dos 30, base/olheiro
com potencial enviesado e evolução anual dos elencos CPU. Validado por
`tests/e2e/sim_ge_balance_005.js`: top-11 +13,8 → +4,3 em 10
temporadas; jogadores 90+ por elenco 8,9 → 0,8. Relatório técnico
completo em `git show 5949f4a:docs/HANDOFF_CLAUDE.md`. Pendências
registradas lá: ids de base repetidos na reposição anual (P0, demanda
própria a abrir) e potencial da base acima do nível de elenco de
preenchimento.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

UX-COMISSAO-001 — Acessos rápidos da Comissão com confirmação	25/10/2026	merge de `claude/ux-comissao-001` em `main` (commit de código original `c586cf5`, merge `c1e4e37`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, nesta conversa ("Faça o merge da
UX-Comissao-001"). O ícone da Comissão no Início abre um diálogo com a
sugestão completa e os botões Aplicar / Agora não / Ver na Comissão.
Relatório completo em `git show c586cf5:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

UX-MERCADO-001 — Mercado acessível e proposta de qualquer lugar	25/10/2026	PR #40 (`claude/ux-mercado-001` → `main`, commit de código original `0f77c0c`, merge `4ed8938`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026: ele mesmo fez o merge do PR #40.
Card de jogador de outro clube com proposta, empréstimo e comparar;
nomes clicáveis em lances e premiações; operações de mercado não
voltam pra home; atalhos no topo do Mercado; filtros em bottom sheet
com ordenação; card Mercado no Início. Relatório completo e o achado
de ids de jogador repetidos entre clubes em
`git show 0f77c0c:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** feito pelo Murilo (PR #40).

P0-IDS-001 — Ids de jogador únicos no save inteiro	25/10/2026	merge de `claude/ge-calendar-001-b1` (que contém `claude/p0-ids-unicos`, commit de código original `647c783`) em `main`, merge `ed04331`	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Branches Aprovadas").
`ensureUniquePlayerIds()` ao criar a carreira, ao carregar o save e na
virada de temporada; referências por (clube, jogador) atualizadas.
Relatório em `git show 647c783:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GE-SCOUT-001 — Olheiros nacionais e unificados	25/10/2026	mesmo merge `ed04331` (commit de código original `1f3bb67`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Branches Aprovadas"). Catálogo
nacional com Avaliação/Rede, missão com foco e indicações do Mercado
vindas da missão Profissional, com relatório. Ponto deixado para
decisão futura: o especialista regional acha um pouco mais que o
olheiro-chefe na própria região (mantido como está). Relatório em
`git show 1f3bb67:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GE-CALENDAR-001 (B1) — Calendário real jan–dez	25/10/2026	mesmo merge `ed04331` (commit de código original `fb21130`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Branches Aprovadas"), com as
decisões da implementação: carreira nova começa na pré-temporada;
semanas de 2 jogos = semanas de Copa; recalibração via Cota de TV.
B2 (amistosos) e B3 (tela de calendário) seguem na seção vigente da
demanda. Relatório em `git show fb21130:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GAME-2048-001 — Minijogo "BRDATA 2048" (webview, estilo 2048)	25/10/2026	PR de `claude/game-2048-spec` para `main` (commit de código original `a113f6a`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, diretamente nesta conversa
("Aprovado"), aceitando as 5 divergências do relatório: fundo nas
superfícies neutras `--m3-surface*`, sem "voltar"/menu (só "Como
jogar"), `<dialog>` nativo com o visual de `.m3-dialog`, 128 e 1024 no
mesmo fundo (1024 com contorno dourado) e gancho `window.__game2048`.
Página `/2048.html` standalone (só números, sem ligação com a
carreira, sem desfazer, sem atalho no site); tokens `--m3-*` extraídos
para `public/css/m3-tokens.css`. Testes: motor 20/20, E2E 25/25, suíte
E2E sem regressão (mesmas falhas pré-existentes antes/depois). Após
trazer o `main` (`7c253e8`) para o branch, tokens e screenshots da
carreira conferidos de novo (idênticos, exceto a animação do aviso de
recompensa). Especificação + relatório em
`git show a113f6a:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo, via PR.

GE-CALENDAR-001 (B2, B3) — Amistosos e tela Calendário	25/10/2026	merge `c44dd4c` (commits de código originais `f193c9c` B2 e `546a773` B3)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026, diretamente nesta conversa ("Faça
merge da Ge-balance-004" — a branch levava B2 e B3 empilhadas). B2: 3
amistosos na pré-temporada + até 2 opcionais em julho, com as regras
de amistoso escolhidas na implementação (sem tabela/cartões/pontos
oficiais). B3: tela Calendário por mês, data no topo e aviso de
rodízio. Especificação + relatórios em
`git show d972dc0:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.

GE-BALANCE-004 — Realismo de acesso/rebaixamento: força relativa à divisão	25/10/2026	mesmo merge `c44dd4c` (commit de código original `ec21b48`; suíte em `d972dc0`)	docs/project/CHANGELOG.md (atualizado)

APROVADO pelo Murilo em 25/10/2026 ("Faça merge da Ge-balance-004"),
com a decisão anterior "Sem convergência". Reposicionamento por degrau
na virada de temporada (issue #39). Os 2 critérios que ficaram no
limite (rebaixado volta em 50–52%; promovido à B cai de novo em
45–48%) foram ACEITOS pelo Murilo em 25/10/2026, depois do merge ("Os
critérios estão ok").
Validação no merge: testes novos 4/4, rota rápida 18/18, suíte
completa sem regressão (única falha fora da lista conhecida,
`test_loan_advanced`, é o flake de onboarding sob carga descrito em
`docs/MOTOR_TESTES_FASE_A.md` e passou 2/2 isolado). Especificação +
relatório em `git show d972dc0:docs/HANDOFF_CLAUDE.md`.

**Merge do código:** autorizado pela aprovação formal do Murilo,
executado nesta sessão.
