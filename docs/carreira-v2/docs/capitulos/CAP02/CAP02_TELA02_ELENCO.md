# BRDATA — Capítulo 2 / Tela 02 — Elenco

**Aprovação:** direção visual do capítulo aprovada; detalhamento desta tela ainda não aprovado individualmente.
**Referência:** `../assets/tela-02/REFERENCIA_DA_PRANCHA.png` (somente comparação, nunca background).
**Documento normativo:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo
Permitir analisar e administrar o plantel com filtros rápidos e acesso imediato a cada atleta.

## 2. Composição e hierarquia
1. Cabeçalho do clube e título Elenco; navegação contextual Elenco / Funções / Status / Relatórios apenas com destinos reais.
2. Filtros Todos, Goleiros, Defensores, Meio-campistas, Atacantes; filtro ativo em verde-lima, sem empurrar conteúdo.
3. Lista contínua, não grade de cartões: avatar/foto se disponível, nome, posição, condição/nota quando existentes e seta para detalhe.
4. Indicadores de elenco (quantidade, aptos, lesionados, suspensos) em faixa compacta se suportados, não como números fictícios.
5. Ações contextuais sobre atleta por menu/bottom sheet: contrato, conversa, venda, empréstimo, comparação, conforme permissões e regras reais.

## 3. Interações e destinos
1. Tocar atleta -> Perfil do Jogador correto com ID estável.
2. Filtros -> lista muda sem alterar dados, preserva busca/scroll quando fizer sentido.
3. Ordenar e buscar -> critérios reais, estado vazio e opção limpar filtros.
4. Ação de gestão -> confirmação e persistência quando aplicável.

## 4. Requisitos funcionais e dados
- Antes de implementar, mapear entidades, APIs, handlers, estado do save e permissões. Registrar tabela `elemento -> fonte -> transformação -> destino -> teste`.
- Desenvolver funcionalidade nova quando necessária para cumprir a proposta, incluindo backend, persistência, validações e testes. Evitar duplicar fluxos existentes.
- Usar escudos oficiais do repositório. Dados da prancha são ilustrativos. Não criar jogadores, nomes, salários ou resultados fictícios.
- Definir estados para carregamento, lista vazia, erro de rede, ação indisponível e sucesso.

## 5. Cenários mínimos de teste
1. Filtro por posição com testes em elenco misto
2. Atleta sem foto, sem avaliação, lesionado e transferido
3. Acesso por atleta e retorno à mesma posição da lista

## 6. Aceite visual e funcional
- Conferir hierarquia, densidade, tipografia, espaçamento, paleta, ícones, safe area e navegação contra a referência.
- Não recortar a interface da prancha para usá-la como conteúdo da tela.
- Cada CTA precisa ter destino, efeito, estado de erro e teste automatizado ou evidência manual documentada.
- Capturar mobile 390×844, mobile estreito 360px e desktop; registrar diferenças e correções.
- Revisar acessibilidade, zoom, teclado, foco, contraste e comportamento em telas pequenas.

## Padrões transversais obrigatórios
- Referenciar `00_DIRETRIZES_GERAIS_BRDATA.md`; usar `../assets/tela-02/REFERENCIA_DA_PRANCHA.png` apenas para comparação visual.
- Cabeçalho com clube/competição/escudo oficiais e navegação contextual consistente; respeitar safe areas.
- Mobile 360–430px, tablet e desktop; controles >=44px, foco visível, leitores de tela, zoom permitido, contrastes suficientes.
- Loading, vazio, erro, confirmação e sucesso conforme ação; feedback sem encobrir conteúdo.
- Nada de números inventados, fotos de jogadores inventadas ou interações sem efeito; dados reais do save.
- Mudanças em regras de negócio exigem testes de regressão, compatibilidade de save e documentação.
- Evidência: captura real mobile/desktop, origem de dados, mapa de handlers, testes e divergências vs. referência.
- Não usar Railway Agent, não publicar/deployar, não executar push/PR/merge sem autorização.

## 7. Entrega do Claude
`docs/RELATORIO_CAP02_TELA02.md` com arquivos alterados, mapa de dados, funcionalidades novas, testes, capturas reais, divergências, riscos e seção final **Prompt para GPT**.
