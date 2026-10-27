# 05 — Plano por fases e entregáveis
**Fase 0 (auditoria):** mapear 52 telas/fluxos, handlers e dados; mapa de dependências; testes baseline; confirmar arquitetura do servidor.
**Fase 1 (fundação):** projeto isolado, tokens, fontes, shell, componentes, ícones, testes de layout, sessão/adaptadores.
**Fase 2 (vertical slice):** Splash/Login → seleção → Dashboard → Elenco/Tática → pré-jogo/partida, com dados reais e compatibilidade.
**Gate visual A:** Dashboard 390×844 com comparação; sem aprovação, não propagar componentes visuais.
**Fase 3:** Capítulo 2 Gestão do Clube (7 telas) e Capítulo 3 Tática (6), usando documentos anexos.
**Fase 4:** Capítulo 4 Partidas (8), Capítulo 5 Mercado (10).
**Fase 5:** Capítulo 6 Carreira (8), Capítulo 7 Sistema (6).
**Fase 6:** QA transversal, regressão, performance, acessibilidade, rollback, proposta de cutover.
Entregar por fase: código, changelog, matriz de telas, testes, screenshots reais, diferenças e pendências.
Não pedir autorização tela a tela: usuário já autorizou avançar por capítulos, **mas gate de aprovação do padrão visual do Dashboard permanece**.
