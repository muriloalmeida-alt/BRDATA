# Carreira 2.0 — Entrega 02: Escalação + Escolher substituto

**Data:** 01/11/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

Referências: `referencias_anteriores/escalacao.png` e `escolher_substituto.png` (Pacote Mobile, parte 1).
Comparativos: `evidencias/02-escalacao/comparativo-390.png` e `evidencias/02-escalacao/estados-larguras.png`.

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Gravação | A v2 relê o save, altera só a escalação e grava pelo mesmo `PUT /api/career` da versão atual. Sem API, schema ou formato novos. |
| Entrega | Escalação e "Quem entra?" juntas |
| Dentro da camisa | Overall real do jogador (o jogo não tem número de camisa) |
| Itens da versão atual fora da prancha | Na v2: aviso de lesionado/suspenso na camisa e banco completo. Tática, instruções, escalação automática e esquemas ficam na linha "Tática e instruções", que abre a versão atual. |

## O que foi entregue

### Escalação (`/carreira-v2/escalacao`)
- Campo com a formação real do save, desenhado em SVG próprio sobre navy liso (sem foto, como pede o pacote de fundos).
- Linhas no campo: ataque em cima, goleiro embaixo, mesma ordem de vagas da versão atual.
- Camisa neutra com o overall dentro; goleiro em verde. Vaga vazia aparece tracejada com "+".
- Lesionado ou suspenso: selo vermelho "!" na camisa e no rótulo acessível.
- Formação: o seletor abre uma folha inferior escura com as 14 formações do jogo e grava na hora, como na versão atual. Os titulares continuam nas mesmas vagas.
- Banco de reservas completo (até 11) em grade de 3 colunas.
- Links da tela:
  - "Ver elenco" abre a versão atual;
  - "Tática e instruções" abre a versão atual;
  - o CTA é o mesmo do Início ("Preparar partida", "Avançar semana", …).
- Barra inferior com "Elenco" ativo, como na prancha.
- Início: "Ajustar escalação" e o alerta de escalação incompleta agora abrem a escalação da v2.

### Quem entra? (`/carreira-v2/escalacao/trocar`)
- "Vai sair" mostra o jogador da vaga, ou "Vaga vazia" com o rótulo da vaga.
- "Jogadores disponíveis" usa o mesmo universo do seletor da versão atual: todo o elenco disponível.
  - Primeiro aparece a mesma posição de quem sai, depois a ordem da versão atual (posição e overall).
  - Titulares e reservas aparecem marcados ("Titular", "No banco"). Escolher um deles faz a troca simples, como na versão atual.
- O resumo "Sai → Entra" e "Confirmar troca" aparecem só depois da escolha. "Cancelar" volta sem gravar.
- O rodapé fica fixo, porque a lista real é longa.

### Gravação e segurança do save
- `CareerGateway.updateLineup`: relê → aplica → `PUT`.
  - Muda só `lineup.formation`, `lineup.starters`, `lineup.bench`, `activeSchemeId` (desvínculo do esquema salvo, igual a `markLineupDirty`) e `updatedAt` (igual a `persistCareer`).
- **Conflito:** se a vaga mudou desde a abertura da tela (outra aba ou a versão atual), nada é gravado e a tela avisa "A escalação mudou. Revise e tente de novo."
  - Isso também vale se o jogador escolhido ficou indisponível.
- Lesão ou suspensão já cumprida conta como disponível. A v2 só deriva isso, sem regravar nada; a versão atual aplica a mesma regra antes do jogo.
- Abrir as telas não grava nada. Só "Confirmar troca" e a escolha de formação gravam.
- Risco conhecido, aceito em 01/11: uma aba da versão atual aberta com dados antigos pode sobrescrever a troca ao salvar depois.

## Divergências em relação às pranchas (para sua avaliação)
1. **Banco com 7 a 11 reservas.** A prancha mostra 3. Com o banco real a grade tem 3 ou 4 linhas, e o CTA "Preparar partida" sai da primeira dobra (é preciso rolar).
2. **Overall no lugar do número de camisa**, como decidido.
3. **Wordmark itálico nas duas telas.** A prancha da Escalação usa o wordmark reto e a do "Quem entra?" usa itálico. Mantive o itálico do Início para ficar consistente.
4. **Linha extra "Tática e instruções"** abaixo do CTA, como decidido.
5. **Nomes de posição** "Goleiro / Defesa / Meio-campo / Ataque", como na prancha. A versão atual usa "Defensor / Atacante".
6. **CTA com a seta logo após o texto**, como nas duas pranchas. No Início a seta fica na borda direita, como na prancha do Início.

## Testes
- Unitários: 19/19 (`npm test`, 10 deles da escalação). Incluem a paridade das 14 formações e do teto do banco com o `carreira.js`.
- E2E novo, `tests/e2e/test_v2_escalacao.js`, 10 verificações:
  1. Início → Escalação com os dados do save;
  2. Cancelar não grava;
  3. a troca grava;
  4. o resto do save fica intacto;
  5. a versão atual lê a troca;
  6. formação;
  7. conflito não sobrescreve;
  8. lesionado marcado e fora da lista;
  9. voltar;
  10. 360 px, alvos ≥ 44 px e folha modal com foco e Esc.
- Suíte E2E completa (servidor isolado): **158/158 passaram**.

## Arquivos
- `carreira-v2/src/domain/lineup.ts` e `lineup.test.ts`: regras espelhadas da versão atual.
- `carreira-v2/src/screens/Lineup.tsx`, `Substitute.tsx` e `lineup.css`.
- `carreira-v2/src/ui/router.tsx`: navegação interna, sem dependência nova.
- `carreira-v2/src/ui/components.tsx`: `Jersey` e aba Início interna.
- `carreira-v2/src/adapters/gateways.ts`: `updateLineup` e leitura com `no-store`.
- `carreira-v2/src/App.tsx`: rotas.
- `carreira-v2/src/screens/Home.tsx`: links da escalação.
- `carreira-v2/src/styles/base.css`: peças de telas internas.
- `tests/e2e/test_v2_escalacao.js` e `tools/capture/capture-v2-escalacao.js`.

## Próxima tela (só após aprovação)
Pré-jogo.
