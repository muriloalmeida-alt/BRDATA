# BRDATA — Capítulo 5 / Tela 03 — Fazer proposta

**Norma central:** `00_DIRETRIZES_GERAIS_BRDATA.md`.
**Status:** especificação de continuidade, aguardando evidência e aceite visual da implementação.
**Cobertura de referência:** E03 da matriz de telas/estados existente; validar IDs e expandir conforme código real.

## 1. Propósito e resultado
Permitir ao treinador executar a jornada **fazer proposta** com decisões claras, feedback imediato e continuidade da carreira.

## 2. Composição visual
Condições, valores, orçamento e consequências. Cabeçalho contextual com clube e competição quando pertinente, área de ação principal em destaque e navegação consistente. Evitar blocos decorativos e scroll horizontal não intencional. Dados e fotos de jogadores apenas de fontes existentes no produto.

## 3. Ações e fluxo
Editar termos; validar; enviar. Mapear cada CTA para handler, pré-condição, efeito no motor, resposta da API, persistência no save e destino de navegação. Exibir confirmação para decisões irreversíveis; sheets para ações contextuais. Implementar funcionalidades ausentes que sejam necessárias, com testes e sem duplicação.

## 4. Dados, integração e regras
- Inspecionar componentes, endpoints, modelo de carreira e regras existentes antes de codificar.
- Criar tabela `campo | fonte | cálculo | persistência | estado vazio | teste`.
- Não inventar valores, jogadores, times, resultados ou capacidades. Se a funcionalidade for nova, modelar sua regra e compatibilidade com saves antigos.
- Usar escudos oficiais do repositório; produzir assets independentes sem texto/interface embutidos.

## 5. Estados e acessibilidade
Loading, vazio, erro recuperável, desabilitado com motivo, sucesso e confirmação quando aplicáveis. Navegação por teclado, foco visível, controles acessíveis, contraste, zoom e `prefers-reduced-motion`. Safe area superior/inferior, teclado virtual e barra de navegação não podem ocultar ações.

## 6. Testes mínimos
1. Fluxo principal do início ao resultado, inclusive retorno à tela anterior.
2. Dados ausentes, save antigo, condição de erro e repetição da ação sem duplicar efeitos.
3. Regras/permissões/limites específicos do motor do jogo e persistência após recarregar.
4. Capturas reais em 360px, 390×844 e desktop; comparar com design system e documentar divergências.

## 7. Critérios de aceite
- Experiência orientada à ação, visual coeso com BRDATA e sem UI estática de imagem única.
- Todos os CTAs operacionais, dados reais, integridade do save e testes comprovados.
- Assets de cenário/ícones entregues individualmente e manifestados; escudos do repositório.
- Documentação e evidências com seção final `Prompt para GPT`.

## 8. Relatório obrigatório
Criar `docs/RELATORIO_CAP05_TELA03.md` com arquivos alterados, mapa de dados/handlers, funcionalidades criadas, testes, screenshots, pendências e riscos.
