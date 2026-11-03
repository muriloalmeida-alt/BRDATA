# BRDATA — Capítulo 2 / Tela 03 — Perfil do Jogador

**Aprovação:** direção visual do capítulo aprovada; detalhamento desta tela ainda não aprovado individualmente.
**Referência:** `../assets/tela-03/REFERENCIA_DA_PRANCHA.png` (somente comparação, nunca background).
**Documento normativo:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo
Concentrar avaliação, evolução e decisões sobre um atleta sem transformar a experiência em formulário.

## 2. Composição e hierarquia
1. Hero do jogador com foto somente se licenciada/disponível, senão avatar neutro; nome, posição, idade e nacionalidade reais.
2. Faixa resumida de atributos relevantes com nomes e escalas do motor; não criar nota geral arbitrária.
3. Abas Visão geral / Atributos / Evolução / Contrato (habilitar se houver conteúdo/implementação real).
4. Contrato, salário, moral, status, condição e desempenho com períodos e unidades explícitos.
5. Área de ações contextual: negociar, renovar, conversar, colocar à venda, emprestar, comparar; regras de elegibilidade visíveis.

## 3. Interações e destinos
1. Troca de aba -> preserva atleta e save.
2. Ação contratual -> fluxo existente ou novo, com cálculo/validação no servidor.
3. Voltar -> retorna ao elenco e mantém filtros.
4. Comparar -> seleciona segundo atleta e usa métricas compatíveis.

## 4. Requisitos funcionais e dados
- Antes de implementar, mapear entidades, APIs, handlers, estado do save e permissões. Registrar tabela `elemento -> fonte -> transformação -> destino -> teste`.
- Desenvolver funcionalidade nova quando necessária para cumprir a proposta, incluindo backend, persistência, validações e testes. Evitar duplicar fluxos existentes.
- Usar escudos oficiais do repositório. Dados da prancha são ilustrativos. Não criar jogadores, nomes, salários ou resultados fictícios.
- Definir estados para carregamento, lista vazia, erro de rede, ação indisponível e sucesso.

## 5. Cenários mínimos de teste
1. Atributos ausentes e jogador recém-promovido
2. Contrato expirado, proposta pendente e indisponibilidade por regra
3. Dados persistem após reinício do save

## 6. Aceite visual e funcional
- Conferir hierarquia, densidade, tipografia, espaçamento, paleta, ícones, safe area e navegação contra a referência.
- Não recortar a interface da prancha para usá-la como conteúdo da tela.
- Cada CTA precisa ter destino, efeito, estado de erro e teste automatizado ou evidência manual documentada.
- Capturar mobile 390×844, mobile estreito 360px e desktop; registrar diferenças e correções.
- Revisar acessibilidade, zoom, teclado, foco, contraste e comportamento em telas pequenas.

## Padrões transversais obrigatórios
- Referenciar `00_DIRETRIZES_GERAIS_BRDATA.md`; usar `../assets/tela-03/REFERENCIA_DA_PRANCHA.png` apenas para comparação visual.
- Cabeçalho com clube/competição/escudo oficiais e navegação contextual consistente; respeitar safe areas.
- Mobile 360–430px, tablet e desktop; controles >=44px, foco visível, leitores de tela, zoom permitido, contrastes suficientes.
- Loading, vazio, erro, confirmação e sucesso conforme ação; feedback sem encobrir conteúdo.
- Nada de números inventados, fotos de jogadores inventadas ou interações sem efeito; dados reais do save.
- Mudanças em regras de negócio exigem testes de regressão, compatibilidade de save e documentação.
- Evidência: captura real mobile/desktop, origem de dados, mapa de handlers, testes e divergências vs. referência.
- Não usar Railway Agent, não publicar/deployar, não executar push/PR/merge sem autorização.

## 7. Entrega do Claude
`docs/RELATORIO_CAP02_TELA03.md` com arquivos alterados, mapa de dados, funcionalidades novas, testes, capturas reais, divergências, riscos e seção final **Prompt para GPT**.
