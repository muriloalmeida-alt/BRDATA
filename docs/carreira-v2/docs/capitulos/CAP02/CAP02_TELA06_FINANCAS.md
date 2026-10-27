# BRDATA — Capítulo 2 / Tela 06 — Finanças

**Aprovação:** direção visual do capítulo aprovada; detalhamento desta tela ainda não aprovado individualmente.
**Referência:** `../assets/tela-06/REFERENCIA_DA_PRANCHA.png` (somente comparação, nunca background).
**Documento normativo:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo
Permitir entender saldo, receitas, despesas e compromissos, e agir sobre riscos financeiros.

## 2. Composição e hierarquia
1. Resumo do saldo com moeda, período e fonte reais; destaque de tendência apenas com base comparável.
2. Gráficos de receitas e despesas em HTML/SVG acessível, meses rotulados e alternativas textuais.
3. Categorias: salários, transferências, infraestrutura, patrocínios e outras somente quando existem no modelo.
4. Orçamento por área com consumido/disponível e unidade clara; sem percentuais inventados.
5. Atalhos para extrato, contratos, transferências e propostas de patrocínio quando disponíveis.

## 3. Interações e destinos
1. Selecionar período -> recalcula gráfico e totais, sem alterar save.
2. Tocar categoria -> extrato filtrado com transações auditáveis.
3. Ação financeira -> valida permissões, saldo e regras existentes.
4. Saldo negativo -> alerta contextual e recomendações sem ações automáticas.

## 4. Requisitos funcionais e dados
- Antes de implementar, mapear entidades, APIs, handlers, estado do save e permissões. Registrar tabela `elemento -> fonte -> transformação -> destino -> teste`.
- Desenvolver funcionalidade nova quando necessária para cumprir a proposta, incluindo backend, persistência, validações e testes. Evitar duplicar fluxos existentes.
- Usar escudos oficiais do repositório. Dados da prancha são ilustrativos. Não criar jogadores, nomes, salários ou resultados fictícios.
- Definir estados para carregamento, lista vazia, erro de rede, ação indisponível e sucesso.

## 5. Cenários mínimos de teste
1. Moeda e arredondamento consistentes
2. Nenhuma transação e histórico longo
3. Transferência e salário refletidos uma única vez no saldo

## 6. Aceite visual e funcional
- Conferir hierarquia, densidade, tipografia, espaçamento, paleta, ícones, safe area e navegação contra a referência.
- Não recortar a interface da prancha para usá-la como conteúdo da tela.
- Cada CTA precisa ter destino, efeito, estado de erro e teste automatizado ou evidência manual documentada.
- Capturar mobile 390×844, mobile estreito 360px e desktop; registrar diferenças e correções.
- Revisar acessibilidade, zoom, teclado, foco, contraste e comportamento em telas pequenas.

## Padrões transversais obrigatórios
- Referenciar `00_DIRETRIZES_GERAIS_BRDATA.md`; usar `../assets/tela-06/REFERENCIA_DA_PRANCHA.png` apenas para comparação visual.
- Cabeçalho com clube/competição/escudo oficiais e navegação contextual consistente; respeitar safe areas.
- Mobile 360–430px, tablet e desktop; controles >=44px, foco visível, leitores de tela, zoom permitido, contrastes suficientes.
- Loading, vazio, erro, confirmação e sucesso conforme ação; feedback sem encobrir conteúdo.
- Nada de números inventados, fotos de jogadores inventadas ou interações sem efeito; dados reais do save.
- Mudanças em regras de negócio exigem testes de regressão, compatibilidade de save e documentação.
- Evidência: captura real mobile/desktop, origem de dados, mapa de handlers, testes e divergências vs. referência.
- Não usar Railway Agent, não publicar/deployar, não executar push/PR/merge sem autorização.

## 7. Entrega do Claude
`docs/RELATORIO_CAP02_TELA06.md` com arquivos alterados, mapa de dados, funcionalidades novas, testes, capturas reais, divergências, riscos e seção final **Prompt para GPT**.
