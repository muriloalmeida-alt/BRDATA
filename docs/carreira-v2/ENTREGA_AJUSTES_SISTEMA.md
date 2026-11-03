# Carreira 2.0: ajustes de sistema (P1 e P3)

- **Data:** 03/11/2026.
- **Branch:** `ajustes-sistema`, a partir de `fase1-motor`.
- **Status:** aguardando aprovação do Murilo.
- **Origem:** decisões P1 e P3 de 03/11 (`PLANO_INDEPENDENCIA.md`, seção 7). Elas valem para toda a v2, inclusive para as telas já aprovadas, e por isso vêm numa entrega própria, com comparativo.

## O que mudou

### P3: margens laterais
- **Antes:** 16 px em todas as telas.
- **Agora:** **24 px**, e **20 px** em telas de até 360 px de largura.
- A mudança é feita num único token (`--bd-gutter` em `styles/tokens.css`). Todas as telas já usavam esse token, então nenhuma tela foi editada para isso.

### P1: "Voltar ao …" em texto
- **Antes:** botão lima (ou contornado, no Perfil).
- **Agora:** ação secundária **em texto**, na cor do texto, com área de toque de 44 px e contorno de foco para teclado (classe `.link-back`).
- **O lima fica reservado** para progressão e confirmação.

| Tela | Antes | Agora |
|---|---|---|
| Tabela | botão lima "Voltar ao clube" | texto "Voltar ao clube" |
| Tabela aberta pelo Resultado | botão lima "Voltar ao resultado" | texto "Voltar ao resultado" |
| Diretoria | botão lima "Voltar ao clube" | texto |
| Finanças | botão lima "Voltar ao clube" | texto |
| Lances (Pausa e Resultado) | botão lima "Voltar à partida" / "Voltar ao resultado" | texto |
| Perfil do jogador | botão contornado "Voltar ao elenco" | texto ("Ver escalação" continua lima) |

**Ficaram como estavam:**
- **"Voltar" do Pré-jogo:** já era texto.
- **"Voltar ao resultado" da folha "Sair do resultado?":** é a escolha segura de uma confirmação, não uma navegação. A regra do pacote reserva o destaque justamente para confirmar.
- **Seta de voltar no topo:** sem mudança.

**P2** (topo com o contexto da tela) não muda nada, porque já é o padrão aprovado.

## Comparativo
As folhas ficam em `evidencias/ajustes-sistema/`, de `comparativo-01.png` a `comparativo-07.png`:
- as **19 telas** da v2, antes (`fase1-motor`) × depois, em 390×844, capturadas com `tools/capture/capture-v2-todas.js`;
- os placares diferem entre as colunas porque cada captura joga a sua partida;
- o "Voltar" da Tabela fica no fim da rolagem, fora da captura. Ele é coberto pelo teste abaixo.

## Testes
- **E2E novo `test_v2_sistema.js`:**
  1. **Margem:** medida no título de 8 telas (Início, Escalação, Tabela, Calendário, Elenco, Diretoria, Finanças, Perfil). Dá 24 px em 390 e 430 px e 20 px em 360 px, sem rolagem horizontal.
  2. **"Voltar ao …":** em Tabela, Diretoria, Finanças e Perfil ele é texto, sem fundo, na cor do texto, com alvo ≥ 44 px, e não sobrou nenhum botão lima de voltar.
- **E2E ajustados:** os seletores dos botões de voltar mudaram de `.cta` / `.btn-secondary` para `.link-back`. São os testes `resultado`, `ajustes`, `tabela`, `tabela_partida`, `elenco`, `diretoria` e `financas`, mais os scripts de captura.
- **E2E da v2:** **17/17**, inclusive as verificações de 360 px e alvos de toque que já existiam em cada tela.
- **Unitários:** 65/65.
- **Suíte completa (servidor isolado):** **173/173**.

## Arquivos
- `carreira-v2/src/styles/tokens.css`: `--bd-gutter` passa a 24 px, e 20 px até 360 px.
- `carreira-v2/src/styles/base.css`: `.link-back`.
- **Telas:** `Table.tsx`, `Board.tsx`, `Finance.tsx`, `MatchAdjust.tsx` e `Profile.tsx`.
- **Testes:** `tests/e2e/test_v2_sistema.js` (novo) e os 7 E2E ajustados.
- **Captura:** `tools/capture/capture-v2-{ajustes,resultado,todas}.js`.
- **Evidências:** `docs/carreira-v2/evidencias/ajustes-sistema/`.

## Próxima entrega (depois da sua aprovação)
**Fase 2, acesso:**
- abertura;
- login;
- seleção de competição e de clube;
- configurar carreira;
- primeira entrada;
- recompensa diária;
- sessão expirada.

Com ela, a v2 deixa de mandar para `/carreira-old` quando não há sessão ou carreira, que é o problema do print de 03/11.
