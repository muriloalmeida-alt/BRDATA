# Carreira 2.0 — Entrega 00 (Fundação) + 01 (Início)

**Data:** 31/10/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

Referência: `referencias_anteriores/inicio.png` (Pacote Mobile, parte 3).
Comparativo lado a lado: `evidencias/01-inicio/comparativo-390.png` e `evidencias/01-inicio/larguras-360-430.png`.

## O que foi entregue

### Fundação (Entrega 00)
- Front novo em `carreira-v2/` (Vite 5.4.11 + React 18.3.1 + TypeScript 5.6.3, versões fixas).
- O build sai em `public/carreira-v2/` e é versionado. O Dockerfile não muda.
- Servido em `/carreira-v2/` pelo `server/server.js` (fallback SPA e `noindex`). `public/carreira.html` não foi substituído.
- Tokens isolados em `src/styles/tokens.css`. Fundo navy escuro; o lime `#B4E64B` é igual para todos os clubes; o dourado é só editorial.
- Componentes compartilhados em `src/styles/base.css` e `src/ui/`:
  - wordmark em texto;
  - escudo oficial com fallback em monograma;
  - linha de lista;
  - CTA;
  - barra inferior com 4 destinos;
  - estados de carregamento e de erro.
- Camada anticorrupção em `src/adapters/gateways.ts`. Sessão, carreira e catálogo de clubes são lidos pelas APIs existentes, **só leitura**.
- Domínio puro em `src/domain/home.ts` (`buildHome`), com 9 testes unitários.

### Início (Entrega 01)
- Mesma composição da referência:
  - topo com wordmark e clube/temporada;
  - título e competição;
  - faixa do confronto sobre a foto CEN-02 (estádio);
  - CTA lime;
  - linhas de ação, posição + últimos jogos, objetivo, finanças e notícias;
  - barra inferior.
- Todos os dados vêm do save real:
  - confronto, data e rodada;
  - posição;
  - forma (últimos 5);
  - objetivo da diretoria;
  - caixa;
  - notícia do clube.
- Semanas sem jogo e pré-temporada usam a mesma composição, com o texto real da etapa:
  - CTA "Avançar semana", "Ir para o amistoso" ou "Próxima temporada";
  - a linha de posição/forma some enquanto não há dados.
- Alertas da versão atual aparecem como linhas no mesmo estilo: escalação incompleta e proposta de outro clube.
- Destinos que ainda não existem na v2 abrem a tela equivalente da versão atual via `/carreira#acao`.
  - O legado ganhou `applyV2DeepLink()`, que espera os modais bloqueantes e limpa o fragmento.

### Retiradas pedidas (PR #52 → comportamento do PR #46)
- Removidos na versão atual e no servidor:
  - múltiplos saves;
  - indicador de confiança da diretoria;
  - nacionalidade e foto no onboarding;
  - busca, favoritos, região e "Mais popular" na escolha de clube.
- Saves gravados no formato de slots do #52 continuam legíveis: o slot ativo é lido e gravado. Nenhum dado é apagado.

## Decisões alinhadas (31/10)
| Tema | Decisão |
|---|---|
| Onde implementar | Front novo React em `/carreira-v2` |
| Recursos do #52 vetados pelo pacote | Retirados (como no #46) |
| Wordmark | Texto em Barlow Condensed (pendência MAR-01: não há arquivo oficial) |
| Ritmo | Uma tela por vez, com aprovação entre telas |
| Linha de data | "DD MMM · RODADA N"; a rodada sai do subtítulo |
| Semanas sem jogo | Mesma composição com textos reais; linhas sem dado somem |
| Destinos ainda inexistentes | Abrem a versão atual (`/carreira#acao`) |
| Itens extras do legado | Só os alertas, no mesmo estilo |

## Divergências conhecidas em relação à referência (para sua avaliação)
1. **Sem horário na data.** A referência mostra "18 AGO · 20:00", mas o calendário do motor não tem horário de jogo. A linha mostra data + rodada, como foi decidido.
2. **Barlow no texto de apoio.** Subtítulos, rótulos e a barra inferior usam Barlow; títulos, CTA e números usam Barlow Condensed.
3. **Escudos oficiais.** A referência usa clubes fictícios (Central × União FC). A implementação usa os escudos oficiais do jogo (`/img/teams`), conforme a regra do pacote.
4. **Recorte da foto.** O asset `cen-02-estadio-header.webp` é usado só na faixa do confronto, com gradiente de proteção. O enquadramento (holofotes, gramado) é próximo, mas não idêntico ao da prancha, porque não extraímos assets das pranchas.
5. **Tamanho do ordinal.** "1º" fica com o "º" em sobrescrito, como na referência. A proporção depende da fonte disponível.

## Testes
- Unitários (`npm test` em `carreira-v2/`): 9/9.
- E2E novo, `tests/e2e/test_v2_inicio.js`, 8 verificações, todas passando:
  1. redirecionamento sem sessão;
  2. redirecionamento sem carreira;
  3. pré-temporada com dados reais, escudo oficial e CTA;
  4. semana de jogo;
  5. **nenhuma escrita no save**;
  6. zoom liberado, 360 px sem rolagem horizontal, alvos ≥ 44 px e `lang`;
  7. link direto `/carreira#escalacao`;
  8. estado de erro com "Tentar novamente".
- Atualizados para as retiradas: `test_redesign_caps_1_7.js` e `test_save_limit_001_careerstore.js`.
- Suíte E2E completa (servidor isolado): **157/157 passaram**.

## Arquivos
- `carreira-v2/`: código-fonte do front novo.
- `public/carreira-v2/`: build servido.
- `server/server.js`: rota `/carreira-v2` e remoção dos endpoints de slots, perfil, favoritos e popularidade.
- `server/src/careerStore.js`: leitura compatível dos slots e remoção da API de slots.
- `server/src/users.js`: remoção dos campos de perfil.
- `public/carreira.html` e `public/js/carreira.js`: retiradas e `applyV2DeepLink()`.
- `tests/e2e/test_v2_inicio.js` e `tools/capture/capture-v2-inicio.js`.
- `docs/carreira-v2/evidencias/01-inicio/`: comparativos.

## Observação técnica
O service worker da raiz, registrado pela versão atual, responde `/api/career` do cache quando a rede falha. Isso é comportamento offline legítimo. Por isso, a v2 pode mostrar dados do cache em vez do estado de erro quando o usuário está offline.

## Próxima tela (só após aprovação)
Escalação.
