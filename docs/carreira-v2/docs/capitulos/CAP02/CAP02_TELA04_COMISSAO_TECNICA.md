# BRDATA — Capítulo 2 / Tela 04 — Comissão Técnica

**Aprovação:** direção visual do capítulo aprovada; detalhamento desta tela ainda não aprovado individualmente.
**Referência:** `../assets/tela-04/REFERENCIA_DA_PRANCHA.png` (somente comparação, nunca background).
**Documento normativo:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo
Visualizar funções, qualificação, custos e tomar decisões de contratação e desligamento.

## 2. Composição e hierarquia
1. Cabeçalho e navegação contextual Comissão / Funções / Desempenho, sem páginas vazias.
2. Lista editorial de profissionais por função, com avatar neutro quando não houver foto; nome, cargo e vínculo reais.
3. Resumo discreto de cobertura das funções e eventuais vagas, baseado no modelo real.
4. Detalhe de profissional em tela completa ou bottom sheet conforme profundidade: especialidade, contrato, custo, efeito no jogo se modelado.
5. Ação principal contextual Contratar / Substituir / Gerenciar, condicionada a regras de orçamento e elenco técnico.

## 3. Interações e destinos
1. Abrir profissional -> detalhes e ações permitidas.
2. Contratar -> catálogo real, orçamento, confirmação e atualização do save.
3. Demitir -> confirmação destrutiva, consequências/custos documentados.
4. Filtros de função -> atualização da lista.

## 4. Requisitos funcionais e dados
- Antes de implementar, mapear entidades, APIs, handlers, estado do save e permissões. Registrar tabela `elemento -> fonte -> transformação -> destino -> teste`.
- Desenvolver funcionalidade nova quando necessária para cumprir a proposta, incluindo backend, persistência, validações e testes. Evitar duplicar fluxos existentes.
- Usar escudos oficiais do repositório. Dados da prancha são ilustrativos. Não criar jogadores, nomes, salários ou resultados fictícios.
- Definir estados para carregamento, lista vazia, erro de rede, ação indisponível e sucesso.

## 5. Cenários mínimos de teste
1. Comissão vazia, completa e com cargos duplicáveis
2. Orçamento insuficiente e tentativa de demissão bloqueada
3. Efeitos na simulação somente quando suportados e testados

## 6. Aceite visual e funcional
- Conferir hierarquia, densidade, tipografia, espaçamento, paleta, ícones, safe area e navegação contra a referência.
- Não recortar a interface da prancha para usá-la como conteúdo da tela.
- Cada CTA precisa ter destino, efeito, estado de erro e teste automatizado ou evidência manual documentada.
- Capturar mobile 390×844, mobile estreito 360px e desktop; registrar diferenças e correções.
- Revisar acessibilidade, zoom, teclado, foco, contraste e comportamento em telas pequenas.

## Padrões transversais obrigatórios
- Referenciar `00_DIRETRIZES_GERAIS_BRDATA.md`; usar `../assets/tela-04/REFERENCIA_DA_PRANCHA.png` apenas para comparação visual.
- Cabeçalho com clube/competição/escudo oficiais e navegação contextual consistente; respeitar safe areas.
- Mobile 360–430px, tablet e desktop; controles >=44px, foco visível, leitores de tela, zoom permitido, contrastes suficientes.
- Loading, vazio, erro, confirmação e sucesso conforme ação; feedback sem encobrir conteúdo.
- Nada de números inventados, fotos de jogadores inventadas ou interações sem efeito; dados reais do save.
- Mudanças em regras de negócio exigem testes de regressão, compatibilidade de save e documentação.
- Evidência: captura real mobile/desktop, origem de dados, mapa de handlers, testes e divergências vs. referência.
- Não usar Railway Agent, não publicar/deployar, não executar push/PR/merge sem autorização.

## 7. Entrega do Claude
`docs/RELATORIO_CAP02_TELA04.md` com arquivos alterados, mapa de dados, funcionalidades novas, testes, capturas reais, divergências, riscos e seção final **Prompt para GPT**.
