# 03 — Dashboard: contrato visual e funcional (primeiro aceite)
Referências: `assets/referencias/dashboard_conceito.png` (direção aprovada) e `assets/qa/dashboard_hml_reprovado_2026-10-27.jpeg` (anti-referência).
A tela reprovada apresenta saudação gigante, espaçamento inconsistente, escudo escuro no header, excesso de pills, CTA desproporcional, card pesado, métrica sob a nav e aba lateral invasiva.
## Hierarquia obrigatória
1. Header leve: identidade BRDATA, clube com escudo legível, notificações/perfil; temporada como meta.
2. Saudação compacta: `Bom dia, {primeiroNome}` com tipografia 28–32px, sem caixa gigante.
3. Próximo jogo = ação principal: adversários, escudos reais, data, rodada, competição, CTA proporcional, sem perder foco do placar.
4. Indicadores em faixa contínua: classificação, jogos, gols marcados/sofridos; não cortar sob a nav.
5. Situação do clube: forma, diretoria, objetivos e notícias, em composição fluida e densidade adequada.
6. Ações secundárias e navegação.
## Proibições
Sem quatro filtros gigantes no header; sem duas barras de navegação equivalentes; sem bordas contornando tudo; sem placeholder de foto tratado como final.
Sem imagem de estádio fabricada em SVG; se o asset definitivo faltar, renderizar base navy limpa e sinalizar PENDÊNCIA VISUAL.
## Dados
Nome treinador, clube, liga, classificação, jogo, escudos, métricas e calendário vêm do save real; loading/erro/ausência de jogo têm estados próprios.
## Gate de aceite
Captura 390×844 lado a lado com referência; adicional 360×780, 430×932, 1280×800. Medir overflow horizontal, sobreposição da nav, truncamento e scroll. Validar com clube de nome longo, escudo claro/escuro e temporada avançada.
Aprovado apenas após revisão visual explícita, não por testes verdes.
