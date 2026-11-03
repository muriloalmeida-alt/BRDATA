# Carreira 2.0 — Entrega 06: Elenco + Perfil do jogador

**Data:** 01/11/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

- **Referências:** `pranchas/05_elenco.png`, colunas 1 e 2 (CAP02-T02 e CAP02-T03, Pacote Mobile, parte 3).
- **Comparativos:**
  - `evidencias/06-elenco/comparativo-390.png`
  - `evidencias/06-elenco/estados-larguras.png` (páginas inteiras, 360 e 430)

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Camisa | Overall dentro, igual à Escalação (o briefing pedia "sem ratings"; foi decidido manter por consistência) |
| Linha sob o nome | Situação: Titular, Reserva ou Fora da lista. Quando houver, Lesionado/Suspenso com a rodada de volta, Pede transferência, Fim de contrato ou Emprestado. |
| Itens do Elenco atual fora da prancha | Seção "Base" no fim; filtros, busca, ordenação, resumo e moral pela linha "Filtros e ordenação", que abre a versão atual |
| Entrega | Elenco e Perfil juntos |
| Dados do Perfil | Esportivos, sem idade nem salário: Posição, Situação, Overall, Ataque, Defesa, Físico, Condição, Moral, Jogos e Gols |
| Ações do jogador | Linha "Contrato e ações do jogador", que abre a ficha da versão atual (`/carreira#jogador:id`). Na v2 ficam só "Ver escalação" e "Voltar ao elenco", como na prancha. |

## O que foi entregue

### Elenco (`/carreira-v2/elenco`)
- Título "ELENCO" com "Seu time começa aqui.".
- Seções Goleiros, Defesa, Meio-campo e Ataque, na mesma ordem da versão atual (posição e depois overall). Os emprestados entram no elenco principal, como hoje.
- Seção "Base" no fim, só quando há atletas da base.
- Cada linha tem a camisa com o overall (verde para goleiro), o nome abreviado, a situação e uma seta. Lesão e suspensão aparecem em vermelho.
- Tocar no jogador abre o Perfil.
- A linha "Filtros e ordenação" abre o Elenco da versão atual.
- O CTA "Ajustar escalação" fica fixo no rodapé e abre a Escalação da v2.
- **Ligações:**
  - a aba "Elenco" da barra inferior agora abre o Elenco da v2;
  - "Ver elenco" da Escalação também.

### Perfil do jogador (`/carreira-v2/elenco/jogador?id=…`)
- Topo "‹ Voltar" · BRDATA.
- Camisa grande com o overall, o nome abreviado e a posição ("Ataque").
- Seção "No elenco do Flamengo" com os dados esportivos em linhas simples, sem barras nem gráficos.
  - Sem dado de condição, mostra 100%; sem dado de moral, mostra 70 (os mesmos padrões da versão atual).
- "Contrato e ações do jogador" abre a ficha desse jogador na versão atual: renovar, conversar, comparar, vender, emprestar, dispensar, promover/enviar à base, tirar do time/banco.
- "Ver escalação" (primário) e "Voltar ao elenco" (secundário, contornado), como na prancha.
- Se o jogador não estiver mais no elenco (vendido, link antigo), a tela volta ao Elenco.
- **Versão atual:** o mapa de atalhos aceita `#jogador:<id>` e abre a mesma ficha (`openDetail`). Nenhuma mudança de regra.
- As duas telas são só leitura.

## Divergências em relação às pranchas (para sua avaliação)
1. **Overall na camisa** no lugar do número, que não existe no jogo, como decidido. Isso contraria o "sem ratings" do briefing.
2. **Situação no lugar da posição específica** ("Zagueiro", "Lateral"), que o jogo não tem. O grupo já aparece no título da seção.
3. **Seção "Base" e linha "Filtros e ordenação"** no Elenco; **"Contrato e ações do jogador"** e mais linhas de dados no Perfil, como decidido.
4. **Topo com voltar** no Elenco (a prancha só tem o wordmark). O Perfil segue a prancha ("‹ Voltar").
5. **CTA fixo** no rodapé do Elenco, porque a lista real tem cerca de 30 jogadores, mais a base.
6. **Barra inferior:** a prancha não mostra a barra inferior no Elenco, e ela foi omitida, como nas outras telas internas. Para trocar de seção, use o voltar ou o Início.

## Testes
- **Unitários:** 37/37 (`npm test`), 3 deles do Elenco/Perfil:
  - seções e ordem;
  - base à parte;
  - emprestado no principal;
  - todas as situações;
  - perfil sem idade/salário;
  - padrões de condição e moral.
- **E2E novo** `tests/e2e/test_v2_elenco.js` (6 verificações):
  1. a aba Elenco abre a v2 com as mesmas contagens da versão atual;
  2. situação real (lesionado com retorno em vermelho, titular) e overall;
  3. Perfil igual ao save e sem idade nem salário;
  4. navegação Perfil ↔ Escalação ↔ Elenco;
  5. jogador inexistente, 360 px, alvos de toque e nada gravado;
  6. "Contrato e ações" abre a ficha na versão atual.
- **Suíte E2E completa** (servidor isolado): **162/162 passaram**.

## Arquivos
- `carreira-v2/src/domain/squad.ts` e `squad.test.ts`
- `carreira-v2/src/screens/Squad.tsx`, `Profile.tsx` e `squad.css`
- `carreira-v2/src/App.tsx`: rotas
- `carreira-v2/src/ui/components.tsx`: aba Elenco interna
- `carreira-v2/src/screens/Lineup.tsx`: "Ver elenco" interno
- `carreira-v2/src/adapters/legacy.ts`: `legacyPlayerHref`
- `carreira-v2/src/domain/types.ts`: campos de jogador lidos
- `public/js/carreira.js`: atalho `#jogador:<id>`
- `tests/e2e/test_v2_elenco.js` e `tools/capture/capture-v2-elenco.js`

## Próxima tela (só após aprovação)
Diretoria.
