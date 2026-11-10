# Carreira 2.0: sem página escondida, etapa G1a (ponte de consulta e gestão no motor)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g1a`, a partir de `main` (com o #91, etapa F).
- **Status:** etapa G dividida em 4 entregas (G1a, G1b, G1c e G2), decisão do Murilo em 10/11 (`PROPOSTA_ETAPA_G.md`). Segue para PR e merge com CI verde, sem pausas.

## Resultado principal
Os comandos de consulta e de gestão da ponte que a v2 usa (`window.BRDATA_PONTE`) foram para `public/js/motor/ponte.js`, **sem mudar o texto**. São 56 comandos:
- **Elenco:** renovação, coletiva pendente e conversa.
- **Mercado:** propostas, contraproposta, anúncios, ofertas de venda, empréstimos e proposta recebida.
- **Clube:** comissão (contratar e demitir), estádio, patrocínio, olheiros, base, indicações, diretoria, conquistas, ranking e loja (consulta).
- **Preferências:** notificações e assistente de início.
- **Tática:** eixos, instruções por setor, sugestões da comissão (aplicar e desfazer), esquemas, escalação automática e marcação individual.
- **Treino:** dias da semana, aplicar a semana e o histórico do técnico.

**Vão junto:**
- **O estado da ponte (`PONTE`):** o que nunca é salvo, como o empréstimo em preparo.
- **19 funções e 17 constantes que só esses comandos usavam:**
  - as sugestões da comissão técnica;
  - os esquemas táticos;
  - o próximo adversário;
  - a projeção de desgaste da semana;
  - as opções de empréstimo;
  - os rótulos e os catálogos da loja.

**Na página:**
- **Os comandos viram atalhos de 1 linha** dentro da ponte.
- **As funções viram atalhos e as constantes leem do motor,** com os mesmos nomes.
- **`PONTE` lê do motor.**
- O `carreira.js` caiu de 14.799 para 14.185 linhas.

**O que vem da página:**
- **Como chega:** pelo ambiente.
- **Gravar:** a `ponteGravar` de sempre, até a G1c.
- **Também:** se o som está ligado e o nome do técnico.

**Sem mudança de regra, de save, de API nem de tela.**

## O que ficou na página e por quê
- **Partida, pós-jogo, semana e temporada:** são da G1b.
- **Entrada, recompensa diária, compra na loja e nome do técnico:** vão à API, então são da G1c.
- **Seis comandos que ainda tocam a tela antiga:** saem quando a parte de tela deles for separada.

| Comando | O que ainda usa da tela antiga |
|---|---|
| `acaoJogador` | `handlePlayerAction` |
| `aplicarModeloTreino` | o modelo de treino grava e avisa por conta própria |
| `marcarAvisosLidos` | o contador de avisos |
| `somAtivo` | o som |
| `comissao` e `aplicarSugestao` | a sugestão de escalação lê uma caixa de seleção da tela antiga |

## Decisões tomadas por mim (recomendação seguida)
1. **Um extrator geral para a G** (vai servir à G1b e à G1c). Para cada nome que o comando usa, ele resolve sozinho:
   - **Atalho para outro módulo do motor:** vira import.
   - **Atalho para um módulo de regra:** vira cópia local.
   - **Função ou constante da página sem tela:** vai junto.
   - **Função com tela:** não move, e o extrator diz o motivo.
2. **O estado da ponte mora no `ponte.js`** (não no `estado.js`), porque só a ponte usa.

## Testes
- **Novo `tests/unit/test_motor_ponte.js`:**
  - **Como roda:** roda a página **inteira** duas vezes, num `vm` com a tela falsa, no modo ponte e sem rede.
    - **Antes:** a página de hoje com os comandos e as funções de antes por cima (congelados em `tests/unit/ref_ponte_antes.js`).
    - **Depois:** a página de hoje.
  - **O que faz em cada um dos 60 mundos:** cria uma carreira e chama 140 comandos sorteados, com argumentos válidos e inválidos. Para os comandos terem o que fazer:
    - contratos vencendo;
    - jogadores insatisfeitos;
    - condição variada;
    - em parte dos mundos, elenco principal no limite;
    - contrato de patrocínio vencido.
  - **O que confere:** o retorno de cada comando, o save, o estado da ponte, os avisos e o número de gravações, todos iguais.
  - **Cobertura:** os 56 comandos tiveram sucesso; 37 também foram recusados (motivos válidos); 3.009 gravações.
  - **Contraprova:** mudei, um por vez:
    - o limite de esquemas;
    - o mínimo do elenco para anunciar;
    - a gravação depois da obra;
    - a tolerância e o desgaste das sugestões da comissão;
    - a taxa do empréstimo.

    A verificação certa falhou em cada caso.
- **Texto idêntico:**
  - **Funções e constantes:** o `paginaComoAntes` cobre também o `ponte.js`. As 291 funções e constantes movidas em todas as etapas (36 desta) remontam iguais, caractere por caractere.
  - **Comandos:** cada um dos 56, com as trocas desfeitas (`partidaAtual()` → `LIVE_MATCH`, `ponte.` → `PONTE.`, `ambiente.gravar()` → `ponteGravar()` etc.), é igual ao de antes.
- **Testes das etapas anteriores:** usam a página como era antes da F e da G1a.
- **Testes do motor:** todos passam (16 arquivos).
- **Suíte completa (com o Postgres temporário):** 206/206.
