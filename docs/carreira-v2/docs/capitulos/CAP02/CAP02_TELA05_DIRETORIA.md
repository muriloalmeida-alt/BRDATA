# BRDATA — Capítulo 2 / Tela 05 — Diretoria

**Aprovação:** direção visual do capítulo aprovada; detalhamento desta tela ainda não aprovado individualmente.
**Referência:** `../assets/tela-05/REFERENCIA_DA_PRANCHA.png` (somente comparação, nunca background).
**Documento normativo:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo
Tornar transparentes confiança, objetivos e cobranças da diretoria e seus impactos na carreira.

## 2. Composição e hierarquia
1. Cabeçalho e abas Diretoria / Confiança / Reuniões apenas se implementadas.
2. Indicador central de confiança com percentual real e legenda acessível; sem valor ilustrativo 87% hardcoded.
3. Lista de objetivos com prioridade, prazo, progresso e estado; não marcar conquistas automaticamente.
4. Histórico de avaliações/reuniões, quando disponível; mensagens do conselho com data e contexto.
5. Ações possíveis: ver detalhes, responder cobrança, solicitar reunião somente com fluxo real e regras definidas.

## 3. Interações e destinos
1. Objetivo -> detalhe com critério, fonte de cálculo, prazo e impacto.
2. Reunião/solicitação -> fluxo persistente, não botão cenográfico.
3. Mudança de resultado da partida -> atualiza confiança/objetivos segundo regra existente ou nova explicitamente testada.

## 4. Requisitos funcionais e dados
- Antes de implementar, mapear entidades, APIs, handlers, estado do save e permissões. Registrar tabela `elemento -> fonte -> transformação -> destino -> teste`.
- Desenvolver funcionalidade nova quando necessária para cumprir a proposta, incluindo backend, persistência, validações e testes. Evitar duplicar fluxos existentes.
- Usar escudos oficiais do repositório. Dados da prancha são ilustrativos. Não criar jogadores, nomes, salários ou resultados fictícios.
- Definir estados para carregamento, lista vazia, erro de rede, ação indisponível e sucesso.

## 5. Cenários mínimos de teste
1. Objetivo sem prazo, cumprido, fracassado e em andamento
2. Confiança alta/baixa e consequências de demissão
3. Histórico coerente após mudança de temporada

## 6. Aceite visual e funcional
- Conferir hierarquia, densidade, tipografia, espaçamento, paleta, ícones, safe area e navegação contra a referência.
- Não recortar a interface da prancha para usá-la como conteúdo da tela.
- Cada CTA precisa ter destino, efeito, estado de erro e teste automatizado ou evidência manual documentada.
- Capturar mobile 390×844, mobile estreito 360px e desktop; registrar diferenças e correções.
- Revisar acessibilidade, zoom, teclado, foco, contraste e comportamento em telas pequenas.

## Padrões transversais obrigatórios
- Referenciar `00_DIRETRIZES_GERAIS_BRDATA.md`; usar `../assets/tela-05/REFERENCIA_DA_PRANCHA.png` apenas para comparação visual.
- Cabeçalho com clube/competição/escudo oficiais e navegação contextual consistente; respeitar safe areas.
- Mobile 360–430px, tablet e desktop; controles >=44px, foco visível, leitores de tela, zoom permitido, contrastes suficientes.
- Loading, vazio, erro, confirmação e sucesso conforme ação; feedback sem encobrir conteúdo.
- Nada de números inventados, fotos de jogadores inventadas ou interações sem efeito; dados reais do save.
- Mudanças em regras de negócio exigem testes de regressão, compatibilidade de save e documentação.
- Evidência: captura real mobile/desktop, origem de dados, mapa de handlers, testes e divergências vs. referência.
- Não usar Railway Agent, não publicar/deployar, não executar push/PR/merge sem autorização.

## 7. Entrega do Claude
`docs/RELATORIO_CAP02_TELA05.md` com arquivos alterados, mapa de dados, funcionalidades novas, testes, capturas reais, divergências, riscos e seção final **Prompt para GPT**.
