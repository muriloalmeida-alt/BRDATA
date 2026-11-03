# BRDATA — Diretrizes centrais de implementação (capítulos 3–7)

## Hierarquia de referência
1. Decisões de produto aprovadas nos Capítulos 1 e 2; 2. Design System existente e tela 01 do Capítulo 2 aprovada; 3. documentos de cada capítulo; 4. implementação atual, após auditoria.

## Design
- Experiência de gestão esportiva cinematográfica, navy profundo e acento verde-lima, conteúdo fluido e hierarquia de ação. Evitar cards repetidos, ícones emoji e telas montadas com screenshots.
- Reutilizar componentes, tipografia, espaçamentos, estados e tokens existentes; não inventar identidade divergente. Bottom sheets para interações contextuais; páginas completas para fluxos extensos.
- Responsivo 360–430px, tablet e desktop, safe areas, teclado, contraste, foco visível, zoom permitido, movimento reduzido. Nenhum botão ou barra fixa deve cobrir conteúdo.
- Escudos/logos de clubes vêm do repositório, nunca de imagens sintéticas. Outros assets devem ser separados e limpos (SVG para elementos vetoriais, WebP/PNG para cenas). Não recortar texto ou UI de mockups para usar em produção.

## Engenharia e produto
- Novas funcionalidades propostas DEVEM ser desenvolvidas quando necessárias, inclusive backend, persistência, testes e migração compatível. Primeiro mapear código, rotas, handlers, save e motor de jogo para não duplicar.
- Dados exibidos são dados reais da carreira; não usar jogadores, valores, partidas, clubes ou avaliações inventados. Qualquer exemplo em documento é ilustrativo.
- Toda ação tem destino/efeito, validação, feedback, erro, estado vazio e teste. Alterações de regras de jogo precisam ser explícitas, testadas e compatíveis com saves existentes.
- Não usar Railway Agent. Sem deploy, mudanças no Railway, push, PR ou merge sem autorização explícita.
- A referência visual aprovada individualmente é apenas a Tela 01 do Capítulo 2; demais telas do Capítulo 2 têm direção de capítulo aprovada. Capítulos 3–7 são especificações de continuidade, NÃO imagens individualmente aprovadas. Claude deve apresentar capturas reais para aceite.

## Evidências de entrega
Por tela: inventário de arquivos/handlers, origem de dados, funcionalidades novas, captura real mobile e desktop, testes (unitário/integração/E2E quando aplicável), checklist de divergências, acessibilidade, risco e seção final `Prompt para GPT`.
