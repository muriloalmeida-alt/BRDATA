# ESCUDOS-001 — elencos reais, escudos locais e escudo original

**Data:** 13/11/2026
**Origem:** relato do Murilo (13/11): "Ao criar um novo jogo percebi que os elencos estão fakes, várias as logos não estão sendo carregadas e algumas estão em negativo tirando a identidade do clube".

## 1. Diagnóstico

O diagnóstico foi feito com um servidor de teste que usa o catálogo real congelado (`DATA_PROVIDER=frozen`).

1. **Elencos falsos:**
   - A Série A sai com clubes e elencos reais.
   - As Séries B e C saem com clubes e elencos de exemplo (`public/js/data.js`), porque estão desligadas no servidor (`ENABLED_COMPETITIONS`). Isso vale tanto para escolher B ou C na criação quanto para as outras divisões de uma carreira na Série A.
   - O catálogo congelado (`server/frozen-catalog`) já tem B e C reais de 2026: 20 clubes cada, com escudo e cerca de 600 jogadores.
   - Sem chave da API e sem o catálogo congelado, tudo sai de exemplo.
2. **Escudos que não carregam:**
   - Com dados reais, os escudos vêm de um site externo (`cdn.sportmonks.com`). Se ele falha, bloqueia ou o aparelho está sem internet, aparece o monograma (a sigla).
   - Com dados de exemplo, a Série C não tem escudo nenhum e a Série B só tem 11.
3. **Escudos em negativo:**
   - Desde 01/11, 11 escudos (Flamengo, Botafogo, Grêmio, Santos, São Paulo, Vasco, Vitória e 4 da Série B) aparecem em versão negativa no fundo escuro da v2.
   - O motivo era o contorno original sumir no fundo escuro.

## 2. Decisões do Murilo (13/11/2026)

1. **Dados reais nas 3 divisões (recomendado).**
   - O Murilo configura o servidor de produção, e eu não altero variável nenhuma.
   - Eu deixo os passos (seção 4) e um teste que confere as 3 divisões reais.
2. **Cópia local dos escudos das Séries A, B e C (recomendado).** Como a da Série D: abrem offline e sem o site externo.
3. **Escudo original sobre uma chapinha clara (recomendado).** A versão negativa sai.

## 3. O que foi feito

- **Escudos locais:**
  - O mapa `carreira-v2/src/domain/crests.ts` liga cada id de clube a um arquivo em `public/img/teams`. Vale para os ids dos dados reais (fornecedor) e para os dos dados de exemplo (`data.js`).
  - O mapa é gerado e conferido por `scripts/escudos_catalogo.js`.
  - A v2 usa sempre o escudo local. O link externo fica só como último recurso.
  - Os escudos que faltavam foram copiados da Wikipédia em português. A origem e a licença de cada um ficam em `escudos_origem.json`, nesta pasta.
  - O service worker pré-carrega todos eles, para abrir offline. A lista agora ignora repetidos: o `cache.addAll` recusava a instalação inteira quando um escudo da Série D também estava na C.
  - **Resultado:** 31 escudos novos (23 do Wikimedia Commons, 8 da Wikipédia em português), PNG reduzidos a 160 px. Ao todo, 120 ids apontam para 64 arquivos.
- **Chapinha clara:**
  - Todo escudo da v2 aparece original, sobre um círculo claro discreto (`.crest-plate`).
  - As versões `_neg` e o Maringá branco deixaram de ser usados.
- **Teste:**
  - `tests/e2e/test_v2_dados_reais.js` roda no perfil de servidor `dados-reais`, configurado como a produção deve ficar.
  - Confere os 20 clubes reais por divisão na criação, os elencos reais nas 3 divisões e os 60 escudos locais na Tabela.

## 4. Passos para o Murilo: dados reais na produção

No painel do serviço do servidor, defina as variáveis:

| Variável | Valor | Para quê |
|---|---|---|
| `DATA_PROVIDER` | `frozen` | usa o catálogo real congelado do repositório (`server/frozen-catalog`), sem depender da chave da API |
| `ENABLED_COMPETITIONS` | `serie_b,serie_c` | liga as Séries B e C (hoje desligadas: saem de exemplo) |
| `LIVE_SEASON` | `2026` | a temporada do catálogo congelado; sem ela, a carreira mostra 2023 |

Depois:
1. Faça o redeploy.
2. Confira `GET /api/health`: deve mostrar `"provider":"frozen"`, `"hasKey":true` e `"season":"2026"`.
3. Crie uma carreira nova. As carreiras já criadas continuam com os clubes e elencos com que nasceram.

Se a produção usar a chave da API em vez do catálogo congelado, o efeito de `ENABLED_COMPETITIONS` é o mesmo, mas os dados dependem do plano da API.

## 5. Ponto de atenção (licença)

- Assim como na Série D, os escudos são marcas dos clubes.
- Os copiados nesta demanda vêm da Wikipédia em português, e o arquivo de origem registra a licença de cada um. Vários são de uso restrito (fair use).
- Antes de distribuir o app em loja, convém decidir se ficam.
