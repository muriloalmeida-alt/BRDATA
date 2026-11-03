# Capítulo 01 · Tela 01 — Splash / Abertura

**Status:** composição B aprovada visualmente pelo usuário. **Referência:** `../assets/tela-01/referencia-aprovada.png`. **Diretrizes globais:** [`00_DIRETRIZES_GERAIS_BRDATA.md`](00_DIRETRIZES_GERAIS_BRDATA.md).

## Propósito
Apresentar a identidade BRDATA, criar imersão e acompanhar o carregamento inicial sem solicitar ação ao jogador.

## Composição aprovada
- Tela cheia vertical, sem cartões ou menu.
- Estádio noturno com arquibancadas e refletores ao fundo, perspectiva a partir do túnel.
- Treinador de costas em primeiro plano, eixo central, voltado para o gramado.
- Escudo BRDATA + wordmark centralizados **integrados ao cenário**, na região superior/média, com respiro e contraste.
- Assinatura visual sob o nome: `FUTEBOL · GESTÃO · RESULTADOS`.
- Mensagem em duas linhas na metade inferior: `O clube é seu.` (branco) / `A estratégia, também.` (lima).
- Barra fina de progresso próxima da base e legenda `CARREGANDO...`.
- Preservar área segura superior e inferior; nunca rasterizar textos, marca ou progresso dentro da imagem final da aplicação.

## Assets entregues
- `referencia-aprovada.png`: referência visual integral, não usar como background de produção com textos duplicados.
- `escudo-recorte-referencia.png`, `wordmark-recorte-referencia.png`, `assinatura-recorte-referencia.png`: **recortes de referência**, com fundo original; NÃO são PNGs transparentes nem marca oficial vetorial.
- `cenario-recorte-referencia.png`: recorte contextual, **não é background limpo**.
- `overlay-sombra.svg`: overlay vetorial utilizável, ajustar opacidade ao cenário final.
- `barra-progresso.svg`: exemplo vetorial estático; progresso funcional deve ser componente HTML/CSS, com valor derivado do carregamento real.

## Pendência de produção dos assets
A referência aprovada foi gerada como bitmap único. Antes da implementação final, reconstruir/obter **background sem marca, textos e barra**, personagem isolado (se a arquitetura exigir) e **logo BRDATA oficial** em SVG/PNG transparente a partir dos ativos reais do repositório. Não usar escudo fictício derivado da geração como marca definitiva sem confirmação. Evitar remover elementos por inpainting que altere o visual sem revisão. Registrar assets finais e solicitar validação visual se diferirem da referência.

## Comportamento
- Mostrar imediatamente ao abrir o app enquanto a aplicação inicializa; não impor duração artificial se o carregamento já terminou.
- Barra reflete progresso real se disponível. Se não houver medição confiável, usar indicador indeterminado, sem simular porcentagens.
- Ao concluir, avançar para o próximo destino já definido pela lógica atual (login ou sessão ativa); não forçar login indevidamente.
- Em falha recuperável, mostrar ação de tentar novamente, caso a infraestrutura atual suporte retry; caso contrário, registrar necessidade antes de criar fluxo novo.
- Preferência por movimento reduzido: animações desativadas ou discretas.

## Responsividade
- Referência 941×1672 (proporção ~0,563); testar 360×780, 390×844, 430×932 e desktop.
- Imagem `cover` com ponto focal no treinador; verificar que escudo, mensagem e progresso não se sobreponham nem fiquem sob notch/home indicator.
- Renderizar texto nativo com contraste adequado e escalonamento de fonte.

## Critérios de aceite
1. Screenshot real comparado à referência aprovada: perspectiva, escala do treinador, posição da marca e mensagem, atmosfera e cores.
2. Nenhum texto duplicado embutido no background.
3. Carregamento não fica preso; transição respeita sessão existente.
4. Safe areas e viewport mobile testados; nenhum corte/overflow.
5. Sem regressão de login, save, APIs ou navegação.
6. Entregar evidências, lista de assets finais e diferenças justificadas.

**Gate:** o usuário aprovou a composição B; a especificação foi preparada sob pedido. A implementação e substituição de ativos finais dependem da revisão dos assets reais e das autorizações operacionais vigentes.
