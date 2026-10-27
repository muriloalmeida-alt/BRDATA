# 06 — Plano de QA e critérios objetivos
## Visual
Capturar 360×780, 390×844, 430×932, 768×1024, 1280×800; screenshot full page + primeira dobra.
Checklist: nenhuma barra invadindo conteúdo, nenhum scroll horizontal acidental, safe areas, tipografia proporcionada, hierarquia, contraste, estados.
Comparação humana referência × implementação, com lista de divergências; pixel-diff pode apoiar, não substituir.
## Funcional
Login/expiração/401, múltiplos saves, seleção de competição e clube, elenco, substituição, tática, treino, pré-jogo, jogo ao vivo, temporada, transferências, contrato, diretoria, finanças, notificações, configurações.
Preservar todos os dados de saves antigos; testes com fixture e backup. Verificar não duplicação de efeitos.
## Acessibilidade
WCAG AA como objetivo: foco visível, labels, contraste, teclado, leitor de tela, targets, reduced-motion; não bloquear zoom por padrão (resolver conflito com legado antes de alterar).
## Performance
WebP responsivo, lazy load de imagens não críticas, evitar fontes/efeitos excessivos; medir LCP, CLS, INP em aparelho real ou emulação.
## Evidência obrigatória
Para cada tela: nome, rota, screenshot, viewport, estado, dados utilizados, testes executados, problemas, aceite visual.
Não afirmar “100%” sem evidências reproduzíveis.
