# Capítulo 01 · Tela 06 — Primeira entrada na carreira

**Status:** direção de jornada apresentada e autorizada para especificação; **não confundir com aceite de implementação.**
**Diretrizes globais:** [00_DIRETRIZES_GERAIS_BRDATA.md](00_DIRETRIZES_GERAIS_BRDATA.md).
**Referência visual:** `../assets/tela-06/referencia-prancha-recorte.png`.
**Atenção:** recorte da prancha é uma referência de direção, não um layout de produção pixel-perfect isoladamente aprovado.

## Objetivo e hierarquia
Marcar a transição emocional entre configuração e gestão cotidiana.

## Composição e layout
Cena de torcida, iluminação e atmosfera do clube escolhido; escudo oficial em destaque; mensagem curta de boas-vindas e uma única ação principal Vamos lá. Tela cheia, sem widgets de gestão.

## Ações e navegação
Confirmar entrada e seguir para o dashboard existente. O texto deve refletir clube e competição reais; evitar afirmações sobre objetivos não existentes.

## Estados e resiliência
Carregamento dos dados da carreira, retomada de carreira já iniciada, erro de inicialização, toque repetido.

## Integridade funcional
Não inserir tela obrigatória em toda abertura; mostrar apenas quando o fluxo de primeira entrada real justificar e sem quebrar retomada de save.

## Assets e reconstrução
- Referência visual é um bitmap único com texto e UI embutidos. **Nunca** usá-lo como background final.
- Separar cenário limpo, identidade oficial e elementos de interface; textos, campos, controles, botões e dados devem ser nativos e acessíveis.
- Ver `../assets/tela-06/MANIFESTO_ASSETS.json`. Nenhum recorte é considerado asset transparente de produção.
- Respeitar safe areas, contraste, teclado, navegação por teclado, movimento reduzido e zoom de acessibilidade.

## Critérios de aceite
1. Captura real da implementação em 390×844 e 430×932 comparada lado a lado com a referência; registrar diferenças.
2. Nenhum texto ou componente funcional rasterizado no cenário; nenhuma imagem de marca fictícia substitui ativo oficial.
3. Toda funcionalidade exibida deve ser real e testada. Novas funcionalidades aprovadas devem ter implementação completa e compatível com o jogo.
4. Sem corte horizontal, sem CTA sob navegação inferior, sem conteúdo encoberto pelo teclado ou safe areas.
5. Fluxo real e seus estados testados, incluindo retorno, persistência, erro e carregamento pertinentes.
6. Relatório com arquivos alterados, testes executados, screenshots e pendências, sem alegar aceite automático.

## Gate de implementação
Não usar Railway Agent; não fazer deploy, push, PR ou merge sem autorização expressa. Implementar somente após confirmar no repositório os comportamentos reais e os assets oficiais. Quando a proposta aprovada exigir função inexistente, desenvolvê-la com escopo controlado e testes; escalar somente dependências externas, custos, credenciais ou decisões de negócio não definidas.

## Regra atualizada — novas funcionalidades e assets
- Funcionalidades novas da proposta visual aprovada **devem ser desenvolvidas**, não omitidas por inexistência prévia no código. Conferir viabilidade, dependências, segurança e retrocompatibilidade.
- Escudos de clubes: exclusivamente os arquivos existentes no repositório. Não usar logos fictícias dos mockups.
- Usar recursos de produção em `../assets/shared/` e `../assets/tela-XX/production/`. Referências `referencia-*` e `*-recorte-referencia` NÃO são assets de produção.
