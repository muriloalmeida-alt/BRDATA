# BRDATA — Capítulo 2 / Tela 07 — Calendário

**Aprovação:** direção visual do capítulo aprovada; detalhamento desta tela ainda não aprovado individualmente.
**Referência:** `../assets/tela-07/REFERENCIA_DA_PRANCHA.png` (somente comparação, nunca background).
**Documento normativo:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo
Dar visão cronológica de jogos e compromissos, com acesso direto aos detalhes e à preparação.

## 2. Composição e hierarquia
1. Cabeçalho e controles de mês anterior/próximo, com período explícito.
2. Abas Jogos / Resultados / Calendário somente se agregarem visões distintas.
3. Lista cronológica por dia: adversário com escudo oficial, casa/fora, competição, horário, estádio e status.
4. Resultado passado mostra placar real e evento de abertura do detalhe; partida futura abre pré-jogo.
5. Marcadores de vitória/empate/derrota acessíveis por texto, nunca só por cor.

## 3. Interações e destinos
1. Navegar mês -> manter calendário correto entre anos/temporadas.
2. Selecionar jogo futuro -> pré-jogo ou detalhe de preparação.
3. Selecionar jogo passado -> relatório e estatísticas existentes.
4. Filtro por competição -> mantém ordem cronológica e opção limpar.

## 4. Requisitos funcionais e dados
- Antes de implementar, mapear entidades, APIs, handlers, estado do save e permissões. Registrar tabela `elemento -> fonte -> transformação -> destino -> teste`.
- Desenvolver funcionalidade nova quando necessária para cumprir a proposta, incluindo backend, persistência, validações e testes. Evitar duplicar fluxos existentes.
- Usar escudos oficiais do repositório. Dados da prancha são ilustrativos. Não criar jogadores, nomes, salários ou resultados fictícios.
- Definir estados para carregamento, lista vazia, erro de rede, ação indisponível e sucesso.

## 5. Cenários mínimos de teste
1. Meses sem partidas, múltiplas competições no mesmo mês
2. Mudança de temporada, datas e fusos
3. Resultado e calendário atualizam após partida sem duplicar evento

## 6. Aceite visual e funcional
- Conferir hierarquia, densidade, tipografia, espaçamento, paleta, ícones, safe area e navegação contra a referência.
- Não recortar a interface da prancha para usá-la como conteúdo da tela.
- Cada CTA precisa ter destino, efeito, estado de erro e teste automatizado ou evidência manual documentada.
- Capturar mobile 390×844, mobile estreito 360px e desktop; registrar diferenças e correções.
- Revisar acessibilidade, zoom, teclado, foco, contraste e comportamento em telas pequenas.

## Padrões transversais obrigatórios
- Referenciar `00_DIRETRIZES_GERAIS_BRDATA.md`; usar `../assets/tela-07/REFERENCIA_DA_PRANCHA.png` apenas para comparação visual.
- Cabeçalho com clube/competição/escudo oficiais e navegação contextual consistente; respeitar safe areas.
- Mobile 360–430px, tablet e desktop; controles >=44px, foco visível, leitores de tela, zoom permitido, contrastes suficientes.
- Loading, vazio, erro, confirmação e sucesso conforme ação; feedback sem encobrir conteúdo.
- Nada de números inventados, fotos de jogadores inventadas ou interações sem efeito; dados reais do save.
- Mudanças em regras de negócio exigem testes de regressão, compatibilidade de save e documentação.
- Evidência: captura real mobile/desktop, origem de dados, mapa de handlers, testes e divergências vs. referência.
- Não usar Railway Agent, não publicar/deployar, não executar push/PR/merge sem autorização.

## 7. Entrega do Claude
`docs/RELATORIO_CAP02_TELA07.md` com arquivos alterados, mapa de dados, funcionalidades novas, testes, capturas reais, divergências, riscos e seção final **Prompt para GPT**.
