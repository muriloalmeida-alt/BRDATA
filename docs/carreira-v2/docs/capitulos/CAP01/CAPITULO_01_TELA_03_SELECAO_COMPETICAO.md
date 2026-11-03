# Capítulo 01 · Tela 03 — Seleção da competição

**Status:** direção de jornada apresentada e autorizada para especificação; **não confundir com aceite de implementação.**
**Diretrizes globais:** [00_DIRETRIZES_GERAIS_BRDATA.md](00_DIRETRIZES_GERAIS_BRDATA.md).
**Referência visual:** `../assets/tela-03/referencia-prancha-recorte.png`.
**Atenção:** recorte da prancha é uma referência de direção, não um layout de produção pixel-perfect isoladamente aprovado.

## Objetivo e hierarquia
Permitir escolher a competição que determina o contexto da carreira.

## Composição e layout
Tela cheia; cabeçalho pequeno com voltar e BRDATA; título Qual competição você quer jogar?; categorias horizontais discretas; lista vertical contínua com bandeiras/identidades reais, nome, país e indicação de seleção; CTA somente se o fluxo real exigir.

## Ações e navegação
Selecionar competição, navegar entre categorias quando existentes, voltar e prosseguir para escolha de clube; destaque visual da seleção sem duplicar destinos.

## Estados e resiliência
Carregando competições, lista vazia, seleção inválida, falha de dados, lista longa e scroll.

## Integridade funcional
Não inventar ligas, torneios, bandeiras, popularidade ou busca se o código não oferecer.

## Assets e reconstrução
- Referência visual é um bitmap único com texto e UI embutidos. **Nunca** usá-lo como background final.
- Separar cenário limpo, identidade oficial e elementos de interface; textos, campos, controles, botões e dados devem ser nativos e acessíveis.
- Ver `../assets/tela-03/MANIFESTO_ASSETS.json`. Nenhum recorte é considerado asset transparente de produção.
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
