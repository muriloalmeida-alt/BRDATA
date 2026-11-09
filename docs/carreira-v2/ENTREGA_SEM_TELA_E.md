# Carreira 2.0: sem página escondida, etapa E (mercado e clube no motor)

- **Data:** 09/11/2026.
- **Branch:** `sem-tela-e`, a partir de `main` (com o #89, etapa D2).
- **Status:** etapas E, F e G aprovadas pelo Murilo em 09/11, "sem pausas". Esta entrega segue para PR e merge com CI verde.

## Resultado principal
As ações de mercado e de clube foram para `public/js/motor/clube.js`, **sem mudar regra nem texto**. São 45 funções e constantes:
- **Propostas que você faz:** enviar, aumentar, retirar e aceitar a contraproposta (`submitOfferOut`, `increaseOffer`, `withdrawOffer`, `acceptCounterOffer`), com a espera da resposta (`OFFER_WAIT_ROUNDS`).
- **Anúncios de venda:** anunciar, cancelar, aceitar e recusar oferta, e o comprador interessado (`createListing`, `cancelListing`, `acceptListingOffer`, `rejectListingOffer`, `findInterestedBuyer`, `listingFor`).
- **Empréstimos:** emprestar e pegar emprestado (`finalizeLoanOut`, `finalizeLoanIn`, `isLoanOutRefused`, `LOAN_REFUSAL_EFFECTIVE_THRESHOLD`).
- **Proposta recebida:** aceitar e recusar (`acceptOffer`, `declineOffer`, `recordDecline`).
- **Renovação e conversa:** veredito, salário sugerido, contrato vencendo, quem pode conversar e o efeito da conversa.
- **Clube:** comissão técnica, obras do estádio (`STADIUM_UPGRADES`), patrocínio, olheiros (contratar, dispensar, missão, regiões, trazer o garoto para a base), pedido de orçamento à diretoria (com a carência), loja (efeito dos itens e o histórico de compras) e a pontuação do ranking.

**Na página:** os modais e as telas. O `fireScout` continua na página (ele só confirma na tela e chama o `releaseScout` do motor).

**Pedidos de tela:**
- **O problema:** as ações misturavam regra com "grave, redesenhe esta tela, feche este painel".
- **Como ficou:** o motor emite o evento `tela` com o nome e os argumentos, e a página antiga chama a função de sempre, na mesma ordem. Fechar painel virou `fecharOverlay(id)`.
- **A v2:** não ouve o evento `tela`; ela grava e redesenha por conta própria.

**No `carreira.js`:**
- As funções viraram atalhos que chamam o motor.
- As constantes leem do motor, com os mesmos nomes.
- O arquivo caiu de 15.921 para 15.531 linhas.

**Carga:**
- O `carreira.html` importa o módulo.
- O service worker o pré-carrega.
- Os tipos estão em `clube.d.ts` (e o evento `tela` em `eventos.d.ts`).

**Sem mudança de regra, de save, de API nem de tela.**

## Defeito achado e corrigido nesta entrega
- **O que era:** o aviso do motor (`avisar`) perdia a duração própria. As duas recusas de empréstimo ("recusou o empréstimo", "recusou emprestar") ficavam 5 s na tela antes; passando pelo motor, ficariam os 3,6 s padrão.
- **Como apareceu:** o teste de equivalência novo comparou os avisos dos dois lados e acusou a diferença.
- **Correção:** o evento `aviso` agora leva `duracaoMs` quando o aviso tem duração própria, e a página antiga a repassa ao toast. Sem duração própria, nada muda.
- **Alcance:** só as mensagens movidas nesta etapa usavam duração própria; as das etapas C e D não usavam.

## Decisões tomadas por mim (recomendação seguida, conforme a aprovação de 09/11)
1. **Pedidos de tela viram evento**, como os avisos das etapas C. Assim o motor não chama nada da página.
2. **`fireScout` fica na página:** é só a confirmação na tela antes de dispensar.

## Testes
- **Novo `tests/unit/test_motor_clube.js`** compara as funções antigas (congeladas em `tests/unit/ref_clube_antes.js`) com as de hoje.
  - **Como roda:** cada lado num `vm` com o próprio motor, com a tela substituída por registros, o sorteio e o relógio fixos. São 150 mundos, cada um com um roteiro que passa por todas as ações acima (com valores válidos e inválidos).
  - **O que confere:** retornos, save, avisos (com a duração), coletivas e a sequência de pedidos de tela, todos iguais.
  - **Cobertura:** 2.116 propostas aceitas pelo jogo, 615 vendas, 816 empréstimos, 841 olheiros contratados, 114 obras, 234 avisos com duração própria e 5.302 avisos no total.
  - **Contraprova:** mudei, um por vez, a espera da proposta, a carência do pedido à diretoria, o limite do histórico da loja, o pedido de redesenho do estádio e a duração do aviso. A verificação certa falhou em cada caso.
- **Texto idêntico:** o `paginaComoAntes` cobre também o `clube.js` e os pedidos de tela. As 45 funções e constantes remontam iguais, caractere por caractere, às de antes.
- **`test_motor_mercado`** agora lê as funções de mercado pela página remontada (algumas delas saíram para o `clube.js`).
- **Testes do motor:** todos passam.
- **Suíte completa (com o Postgres temporário):** 204/204.
