# BRDATA — Diretrizes gerais de Produto, Design e implementação

**Documento central e cumulativo.** Todas as telas devem referenciar este arquivo. Em conflito entre a documentação e o jogo existente, não presumir que a documentação autoriza mudança de regra de negócio: registrar divergência e pedir decisão de Produto.

## Governança
- GPT: Produto, direção visual, especificação e revisão de aceite. Usuário: validação e aprovação. Claude: implementação após aprovação.
- Implementar somente telas aprovadas, respeitando os arquivos específicos `docs/CAPITULO_XX_TELA_YY_*.md`.
- Preservar mecânicas e dados existentes; **é permitido ampliar APIs, banco e modelo de save de forma retrocompatível** para viabilizar funcionalidades aprovadas, com migração segura e testes. Não alterar balanceamento ou dados históricos sem necessidade explícita.
- **Novas funcionalidades estão autorizadas e devem ser desenvolvidas quando previstas nas telas aprovadas.** Antes de codificar, mapear dependências, UX, API, banco, autenticação, segurança, migrações e testes. Não substituir por botões decorativos. Se uma funcionalidade for inviável, reportar impedimento e alternativa, sem omiti-la silenciosamente.
- Não usar Railway Agent; não alterar Railway, não fazer deploy, push, PR ou merge sem autorização expressa.
- Não declarar fidelidade visual com base apenas em commits, testes unitários ou documentação: comparar screenshot real com referência aprovada.

## Linguagem visual
- Experiência de videogame de futebol cinematográfico, com composição orientada à ação e narrativa, não dashboard de cartões.
- Base escura navy/preto; destaque verde-lima fixo da interface, independente do clube. Escudos e marcas de clubes permanecem autênticos.
- Tokens iniciais de referência: `--br-bg: #03101D`, `--br-lime: #B4E64B`, `--br-text: #F0F3F6`, `--br-muted: #94A3B8`. Ajustar por amostragem visual e contraste em implementação, sem presumir precisão cromática da imagem gerada.
- Tipografia: usar fonte já licenciada e disponível no projeto; títulos fortes e concisos, texto legível. Não incluir arquivos de fonte de terceiros.
- Respeitar safe areas, teclado, diferentes proporções de tela e preferências de movimento reduzido. Não bloquear zoom de acessibilidade.
- Componentes contextuais em bottom sheets quando apropriados; telas de fluxo integral permanecem tela cheia. Evitar modais centralizados.
- Textos e UI devem ser elementos reais em HTML/CSS (não embutidos no background).

## Qualidade e evidências
- Capturas reais mobile e desktop com viewport e commit identificados; testes de navegação, persistência e acessibilidade; comparação lado a lado.
- Manter assets organizados por tela e um manifesto indicando origem, licença, status e restrições.
- Referências compostas são imagens achatadas. O pacote inclui recursos vetoriais e fundos limpos utilizáveis em produção; os recortes de referência continuam identificados como NÃO utilizáveis diretamente. Qualquer personagem/foto que ainda esteja incorporado na composição deve ser reconstruído como asset limpo, sem texto/UI.
- Não criar uma tela apenas aplicando filtros e bordas à estrutura antiga; redesenhar composição mantendo funcionalidades.

## Convenções
`assets/tela-XX/` para recursos da tela; `docs/CAPITULO_XX_TELA_YY_NOME.md` para especificação individual. A especificação individual deve apontar este documento central e não duplicar regras globais.

## Precedência e validação das telas 02–07
- Tela 02: referência individual aprovada tem precedência sobre a prancha coletiva.
- Telas 03–07: a prancha representa direção visual de jornada; validar fidelidade e adequação à aplicação antes do aceite final.
- Telas 02–07: referências rasterizadas NÃO são assets de produção. Usar os SVGs e fundos limpos fornecidos; para arte fotográfica específica não isolável, produzir versão limpa antes da implementação. UI sempre nativa.
- A prancha apresenta novas funcionalidades candidatas (login social, busca, filtros, dificuldade, duração etc.). **Implementá-las quando fizerem parte da proposta aprovada**, com backend real e testes; identificar dependências externas e segredos necessários. PlayStation e outros provedores exigem viabilidade e autorização do provedor, nunca simular autenticação.
- Tela 06 é primeira entrada contextual, distinta do dashboard recorrente da Tela 07.

## Origem dos escudos de clubes
- **Todos os escudos/logos de clubes devem vir do repositório BRDATA**; localizar o asset correto e preservar identificação, proporção e transparência. Não usar escudos gerados por IA nem recortados de mockups.
- Marca BRDATA: preferir original do repositório quando disponível; recortes da referência não substituem arquivo oficial.

## Desenvolvimento de novas funcionalidades
- Para cada ação nova: especificar regra, validação, estado vazio/erro, acessibilidade, contrato de API, autorização, persistência, testes e fallback.
- Entregar código funcional, não apenas telas ou protótipos. Implementar em branch local, sem publicação remota sem autorização.
- Login social: somente provedores efetivamente habilitados e configurados; recuperação de senha com token de uso único e expiração; nunca expor segredos no front.
