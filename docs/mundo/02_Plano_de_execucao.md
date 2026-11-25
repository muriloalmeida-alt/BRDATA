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
| **M1** | Catálogo do mundo: dados dos pacotes no jogo, escudos locais, rotas do servidor, validação | — | `scripts/mundo_catalogo.js`, `server/frozen-catalog/`, `server/frozen-catalog/mundo/`, `public/img/teams/mundo/`, `server/src/mundo.js` |
| **M2** | Relógio do mundo por data: semana = segunda-feira com ano, agenda por liga (pacote na temporada 1, gerada nas seguintes), início do save e pré-simulação, calendário brasileiro no mesmo relógio | M1 | `public/js/motor/relogio.js` |
| **M3** | Motor de fases declarativo e desempates: Europa | M2 | `public/js/motor/fases.js`, `desempate.js`, configuração por liga |
| **M4** | Formatos sul-americanos fiéis: Apertura/Clausura, anual, promedios, reducido, quadrangulares, hexagonais, Intermedio | M3 | idem + configuração SA |
| **M5** | Virada por país: acesso, queda, clubes B, catálogo de 3ª divisão, proteção do humano | M3, M4 | `temporada.js`, `virada_pais.js` |
| **M6** | (M6a, feita: mundo leve `mundoleve.js`; M6b: ligação com o save e a carreira) Simulação híbrida (completa no país ativo, leve no resto), save enxuto (catálogo fora do save, delta por atleta), força comparável entre ligas; liga o relógio ao avanço de semana do save do mundo | M2 | `fechamento.js`, `carga.js`, `estado.js`, `leve.js` |
| **M7** | Moeda de jogo e finanças por país (seeds, folha normalizada, TV mensal, bilheteria pela capacidade) | M6 | `financas.js`, `moeda.js` |
| **M8** | Mercado e carreira do técnico no mundo (índice global, CPU entre países, propostas de emprego de fora, troca de país ativo) | M6, M7 | `mercado.js`, `negociacao.js`, `clube.js` |
| **M9** | Libertadores e Sul-Americana (M9a, feita: motor `continental.js`; M9b, feita: classificados, andinos, relógio, prêmios e notícias em `copasmundo.js`; M9c, feita: partidas do técnico ao vivo, na ponte e na v2) | M5, M8, **DEP-1** | `continental.js`, `copasmundo.js` |
| **M10** | (M10a, feita: motor `uefa.js`; M10b: classificados e clubes; M10c: telas da v2; M10d: liberação) Champions, Europa League e Conference; telas da v2 (seletor, calendário, fases, ligas do mundo, chaves); liberação | M9, **DEP-1/2** | `carreira-v2/src/...` |
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
2. O servidor entrega o mundo por rotas próprias
   (`/api/career/mundo` e `/api/career/mundo/elencos/<liga>`, em
   `server/src/mundo.js`), ligadas só com `MUNDO_ATIVO=true`.
   - Feito assim, e não por `server/competitions.js` como sugeriam os
     pacotes: aquele registro também alimenta o seletor do site principal, e
     18 ligas novas apareceriam lá como "em breve".
   - O resultado é o mesmo: leitura do arquivo local, sem rede.
3. Validação automática (`tests/unit/test_mundo_catalogo.js`):
   - contagem de clubes por liga igual ao regulamento;
   - IDs únicos no mundo e sem colisão com o Brasil;
   - todo clube com pelo menos 23 jogadores e 2 goleiros;
   - todo escudo citado existe;
   - todo jogo cita clubes da própria liga;
   - cada clube tem o número de jogos da fase regular previsto;
   - vínculos duplicados resolvidos (MUN-03).
4. A cópia offline do mundo no aparelho fica para a M10, junto com o
   seletor. As rotas já devolvem `{ versao, atual: true }` quando o cliente
   tem a versão, como o catálogo offline do Brasil.

## M2 — Relógio do mundo (detalhe)

- Módulo puro (`relogio.js`), sem estado da carreira. A semana é a
  segunda-feira com o ano, a mesma unidade do calendário brasileiro de hoje.
- Os módulos do motor continuam numa pasta só (`public/js/motor/`), sem
  subpasta `mundo/`: o carregador dos testes junta os módulos pelo nome.
- O Brasil não muda na M2. O relógio passa a conduzir o avanço de semana só
  no save do mundo, na M6. Até lá, o save brasileiro segue o caminho de
  hoje, que a suíte atual cobre.
- Temporadas seguintes: as semanas da temporada do pacote, k anos depois,
  sempre a partir da original (encadear ano a ano escorrega o calendário),
  com o dia de cada rodada preservado.

## M6b — Ligação com o save e a carreira (detalhe)

Levantamento no código (24/11/2026): o que prende a carreira ao Brasil.

| Ponto | Onde | Quantidade |
|---|---|---|
| Lista fixa das 3 divisões (`ALL_COMPETITIONS_ORDER`) | `carga.js`, `virada.js` | 12 usos |
| 38 rodadas fixas | `aovivo`, `carga`, `fechamento`, `financas`, `jogo`, `partida`, `ponte`, `semana`, `temporada`, `virada` | 19 lugares |
| Copa do Brasil (`CAREER.cup`) | `carga`, `fechamento`, `jogo`, `posjogo`, `virada` | 34 usos |
| Série D (`serieDPool`) | `carga`, `estado`, `fechamento`, `virada` | 14 usos |
| Janela de transferências pela fase do ano brasileiro | `semana.js` (`transferWindowStatus`), `mercado.windowByCalendar` | — |
| Moeda R$ (`fmtBRL`) | motor (55) e v2 (20 arquivos) | etapa M7 |

Passos, cada um com teste de equivalência do Brasil (o save brasileiro e o
caminho de hoje não mudam):

1. **M6b-1. Divisões do país do save.**
   - `divisoesDoPais()` no estado substitui a lista fixa.
   - O padrão é o Brasil, então não há mudança nenhuma nos saves de hoje.
2. **M6b-2. Calendário do save do mundo pelo relógio.**
   - Uma entrada por compromisso, com data e ano; a semana com 2 rodadas
     vira 2 entradas.
   - Janela de transferências pelas datas do país (`paises[].janelas`).
   - Folha mensal pela virada de mês.
   - "38" passa a ser o número de rodadas da liga.
3. **M6b-3. Carreira nova num país do mundo.**
   - Elencos pela rota `/api/career/mundo/elencos`.
   - Simulação completa nas 2 divisões do país.
   - `CAREER.mundo` com o mundo leve dos outros países.
   - Copa do Brasil desligada fora do Brasil.
   - Catálogo de 3ª do país no lugar da Série D.
4. **M6b-4. Temporada do técnico pela agenda.**
   - Europa: rodadas do pacote.
   - América do Sul: o plano de `formatos.js`. Mata-mata, quadrangular e
     hexagonal do técnico passam pelo fluxo da perna de Copa que já existe.
   - Fim de temporada: fases/formatos, `viradapais` e elenco fictício para
     quem sobe do catálogo, como a Série D.
5. **M6b-5. Brasil no mundo leve quando o técnico está fora dele.**
   - As regras das Séries A–D vêm de `temporada.js`, sem segunda
     implementação.

## Medição (vale para todas as etapas)

Da M6 em diante, cada relatório traz, no cenário de pior caso (técnico na
Argentina, com todas as ligas ativas):

- tamanho do save (JSON e comprimido) da temporada 1 à 3;
- p50 e p95 do avanço de semana, no ambiente de teste e no iPhone, quando
  disponível;

comparados com o `RELATORIO_FINAL` da PARIDADE-CPU.
