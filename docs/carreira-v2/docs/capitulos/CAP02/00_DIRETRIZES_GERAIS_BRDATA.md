# BRDATA — Diretrizes centrais de Produto, UX e Engenharia

## Hierarquia documental
Este arquivo é normativo para todas as telas. A especificação `CAP02_TELA01_VISAO_CLUBE.md` complementa estas regras. Em caso de conflito com regras de negócio ou dados existentes, investigar e documentar a decisão, sem sobrescrever saves.

## Direção aprovada
- Jogo de gestão de futebol, experiência premium cinematográfica mobile-first, fundo navy quase preto, verde-lima como destaque principal, branco para títulos e azul-acinzentado para apoio.
- Composição fluida: cenário como atmosfera, informações por prioridade e não uma pilha de CRUDs. Usar agrupamentos apenas onde ajudam leitura e interação.
- Manter tipografia consistente, alto contraste, ícones vetoriais coerentes, safe areas e responsividade. Evitar overflow horizontal, sobreposição da navegação, zoom bloqueado e controles minúsculos.
- Todos os dados do clube, treinador, competição, elenco, resultados, objetivos, finanças e calendário vêm da fonte real do jogo. A referência contém valores, rostos e nomes fictícios; NÃO hardcodar.
- Escudos/logos dos clubes: localizar e reutilizar EXCLUSIVAMENTE os assets oficiais já existentes no repositório, com fallback neutro. Não redesenhar, substituir ou gerar novos escudos. Marca BRDATA: reutilizar asset oficial quando disponível.
- Recursos fotográficos, estádio, treinador e torcida precisam ser arquivos independentes licenciados ou criados de forma apropriada; jamais usar a imagem de referência integral como background da UI, nem recortar blocos que contenham texto, botões, escudos ou outros elementos embutidos. O pacote contém apenas referência visual e SVGs de apoio, não fornece fotografias limpas.
- Elementos de interface (tipografia, labels, botões, gráficos, barras, ícones, cards e navegação) devem ser componentes HTML/CSS/SVG acessíveis, não pixels recortados da imagem.

## Funcionalidades e integração
- Desenvolver novas funcionalidades necessárias para cumprir o design aprovado; não restringir o trabalho a um facelift. Antes de criar, mapear o que já existe e evitar duplicidade.
- Integrar frontend, backend, persistência, autorizações, estados, testes e telemetria conforme arquitetura real. Não simular dados em produção.
- Preservar motor de partidas, regras, saves existentes, IDs, rotas e APIs; usar migrações compatíveis e reversíveis quando indispensáveis.
- Qualquer métrica não suportada por dados reais exige implementação da fonte ou estado honesto de indisponibilidade; nunca inventar valores.
- Não usar Railway Agent. Sem deploy, alteração de Railway, push, PR ou merge sem autorização explícita.

## Governança de aceite
Para cada tela: evidência de implementação mobile (390×844 e outro viewport) e desktop, comparativo lado a lado com a referência, testes funcionais e regressão, checklist de acessibilidade, lista de diferenças e prompt final para revisão GPT. Não declarar 100% fidelidade apenas por passar testes.

## Escopo do Capítulo 2 e estados de aprovação
- Tela 01: direção visual aprovada individualmente; Telas 02–07: direção geral aprovada na prancha, **não** possuem aceite individual de detalhe. Implementar conforme especificação e apresentar evidência para aceite final; não atribuir aprovação individual inexistente.
- As imagens são **referências de composição**, não fontes de dados nem bibliotecas de assets. Os recortes por tela são para consulta, não devem ser usados como background.
- Não replicar nomes, fotos, escudos ou números ilustrativos da prancha. Usar apenas dados reais do save, escudos oficiais e placeholders neutros honestos.
- Toda funcionalidade nova deve ter contrato de dados, validação, autorização, persistência compatível, estados vazios/erro e testes; sem duplicar funções existentes.
- Separar áreas: Início é visão geral da carreira; Clube é área contextual de gestão. Navegação inferior e abas internas não devem duplicar destinos contraditórios.
- Para cada CTA definir origem, ação, destino, condição de habilitação, sucesso e falha. Se um requisito depender de regra de jogo nova, documentar impacto antes de implementar.
- Priorizar componentes reaproveitáveis: cabeçalho do clube, barra inferior, filtros, listagem, gráfico acessível, bottom sheet, tela cheia, estados e feedback.
- Performance: lazy loading de mídia, WebP/AVIF, sem vídeos pesados, sem animação contínua obrigatória; respeitar reduced motion.
