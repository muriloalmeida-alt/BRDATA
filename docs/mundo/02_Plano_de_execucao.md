# MUNDO-001 — Plano de execução

Épico em etapas, um PR por etapa (como na PARIDADE-CPU). Cada etapa:

- deixa o Brasil funcionando como hoje;
- tem testes próprios;
- registra o relatório em `docs/HANDOFF_CLAUDE.md` (seção MUNDO-001).

O merge de cada PR espera a aprovação do Murilo. As ligas novas só aparecem
no seletor de novo save na **M10**, com tudo pronto (decisão D3: continentais
junto). Até lá, ficam atrás de uma chave de desenvolvimento
(`MUNDO_ATIVO`), desligada em produção.

| Etapa | Entrega | Depende de | Arquivos principais |
|---|---|---|---|
| **M1** | Catálogo do mundo: dados dos pacotes no jogo, escudos locais, registro das competições, validação | — | `scripts/mundo_catalogo.js`, `server/frozen-catalog/`, `server/frozen-catalog/mundo/`, `public/img/teams/mundo/`, `server/src/competitions.js` |
| **M2** | Relógio do mundo por data e virada por liga; Brasil equivalente | M1 | `public/js/motor/mundo/relogio.js`, `calendario.js`, `semana.js`, `fechamento.js`, `virada.js` |
| **M3** | Motor de fases declarativo e desempates: Europa | M2 | `public/js/motor/mundo/fases.js`, `desempate.js`, configuração por liga |
| **M4** | Formatos sul-americanos fiéis: Apertura/Clausura, anual, promedios, reducido, quadrangulares, hexagonais, Intermedio | M3 | idem + configuração SA |
| **M5** | Virada por país: acesso, queda, clubes B, catálogo de 3ª divisão, proteção do humano | M3, M4 | `temporada.js`, `mundo/virada_pais.js` |
| **M6** | Simulação híbrida (completa no país ativo, leve no resto), save enxuto (catálogo fora do save, delta por atleta), força comparável entre ligas | M2 | `fechamento.js`, `carga.js`, `estado.js`, `mundo/leve.js` |
| **M7** | Moeda de jogo e finanças por país (seeds, folha normalizada, TV mensal, bilheteria pela capacidade) | M6 | `financas.js`, `mundo/moeda.js` |
| **M8** | Mercado e carreira do técnico no mundo (índice global, CPU entre países, propostas de emprego de fora, troca de país ativo) | M6, M7 | `mercado.js`, `negociacao.js`, `clube.js` |
| **M9** | Libertadores e Sul-Americana | M5, M8, **DEP-1** | `mundo/continental.js`, `mundo/sorteio.js` |
| **M10** | Champions, Europa League e Conference; telas da v2 (seletor, calendário, fases, ligas do mundo, chaves); liberação | M9, **DEP-1/2** | `carreira-v2/src/...` |
| **M11** | Validação final: smoke por país, temporada inteira do mundo, desempenho e save no pior caso, `test:full` | todas | `tests/` |

## M1 — Catálogo do mundo (detalhe)

1. Um script (`scripts/mundo_catalogo.js`) lê os 3 pacotes de uma pasta
   informada e grava no repositório:
   - os 20 snapshots em `server/frozen-catalog/` (formato `teams`,
     `standings`, `playersByTeamId`, como o Brasil);
   - em `server/frozen-catalog/mundo/`:
     - a configuração das ligas (regulamentos, calendário e moeda);
     - os jogos de 2026 e 2026/27 com data;
     - o catálogo de 3ª divisão;
     - os seeds financeiros;
     - as regras continentais;
     - o mapa de IDs;
   - os escudos em `public/img/teams/mundo/`.
   Os dados dos pacotes não são editados: o que o jogo acrescenta fica
   marcado como tal.
2. As 20 competições entram em `server/competitions.js` com
   `providerLeagueIds.frozen` igual ao próprio ID. As entradas antigas
   `premier_league` e `la_liga` são reaproveitadas.
3. Validação automática (`tests/unit/test_mundo_catalogo.js`):
   - contagem de clubes por liga igual ao regulamento;
   - IDs únicos no mundo e sem colisão com o Brasil;
   - todo clube com pelo menos 23 jogadores e 2 goleiros;
   - todo escudo citado existe;
   - todo jogo cita clubes da própria liga;
   - cada clube tem o número de jogos da fase regular previsto;
   - vínculos duplicados resolvidos (MUN-03).
4. O catálogo offline (`catalogoOffline.js`) passa a servir as ligas do
   mundo quando `MUNDO_ATIVO` estiver ligado. O Brasil não muda.

## Medição (vale para todas as etapas)

Da M6 em diante, cada relatório traz, no cenário de pior caso (técnico na
Argentina, com todas as ligas ativas):

- tamanho do save (JSON e comprimido) da temporada 1 à 3;
- p50 e p95 do avanço de semana, no ambiente de teste e no iPhone, quando
  disponível;

comparados com o `RELATORIO_FINAL` da PARIDADE-CPU.
