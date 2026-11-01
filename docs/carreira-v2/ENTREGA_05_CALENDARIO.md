# Carreira 2.0 — Entrega 05: Calendário

**Data:** 01/11/2026 · **Branch:** `carreira-v2` (local, sem push) · **Status:** aguardando aprovação visual do Murilo

- **Referência:** `pranchas/06_clube.png`, coluna 3 (CAP02-T07, Pacote Mobile, parte 2).
- **Comparativos:**
  - `evidencias/05-calendario/comparativo-390.png`
  - `evidencias/05-calendario/estados-larguras.png` (pré-temporada, 360 e 430 px)

## Decisões alinhadas (01/11)
| Tema | Decisão |
|---|---|
| Conteúdo | Todos os seus jogos: Brasileirão, Copa do Brasil (só confronto já definido) e amistosos, com a competição em cada linha. Semanas sem jogo não aparecem. |
| Alcance | Do próximo compromisso (barra lima) até o fim da temporada, com "Ver anteriores" mostrando os disputados com placar |
| No lugar do horário | Dia da semana + mando ("DOM · Casa", "QUA · Fora") |
| Itens do calendário atual fora da prancha | Nada extra. Fase do ano, mercado, filtro por competição e visão por mês continuam só na versão atual. |

## O que foi entregue

### Calendário (`/carreira-v2/calendario`)
- Topo padrão (voltar · BRDATA).
- Título "CALENDÁRIO" com o traço dourado e o subtítulo "Seu próximo compromisso.", como na prancha.
- Lista cronológica. Cada linha mostra:
  - data;
  - dia e mando;
  - mandante × visitante;
  - competição: "Brasileirão Série A · Rodada N", "Copa do Brasil · Oitavas de final · Ida", "Amistoso · na semana".
- O próximo compromisso fica com a barra lima à esquerda.
- **Brasileirão:** a data é o domingo da semana da rodada (mesma regra da versão atual).
  - Rodadas disputadas mostram o placar do registro de partidas da temporada (`matchLog`).
- **Copa do Brasil:** a data é a quarta-feira da semana (mesma regra da versão atual). Só aparece quando o seu confronto da fase já existe.
  - Na volta, o mando inverte e o placar é exibido do ponto de vista do mandante. O save guarda esse placar relativo ao confronto.
- **Amistosos:** a data é o início da semana do convite (a versão atual não define o dia) e o mando é sempre "Casa".
  - Sem adversário escolhido, aparece "A definir".
  - Semana já passada sem jogo não aparece.
- **"Ver anteriores (N)":** mostra os jogos disputados, do mais antigo ao mais recente, emendando nos próximos.
- **Temporada encerrada:** mostra "Nenhum jogo agendado." (texto da prancha de estados).
- **CTA:** é o da semana, o mesmo do Início ("Preparar partida" abre o Pré-jogo da v2; os outros abrem a versão atual). Fica fixo no rodapé, porque a lista é longa.
- **Início:** "Ver calendário" agora abre esta tela.
- Só leitura: o Calendário não grava nada.

## Divergências em relação à prancha (para sua avaliação)
1. **Sem horário:** no lugar dele vem o dia da semana + mando, como decidido. Amistosos mostram só o mando ("Casa"), porque o jogo não define o dia.
2. **Linha de competição** sob o confronto, necessária porque a lista mistura Brasileirão, Copa e amistosos.
3. **"Ver anteriores"** no topo da lista e **CTA fixo** no rodapé; a lista real tem 38 rodadas ou mais.
4. **Topo com botão voltar**, como nas outras telas internas. A prancha mostra só o wordmark.

## Testes
- **Unitários:** 34/34 (`npm test`), 7 deles do Calendário. Cobrem:
  - data do domingo e da quarta;
  - mando;
  - placar da volta da Copa;
  - amistoso a definir e semana pulada;
  - save sem calendário;
  - temporada encerrada.
- **E2E novo** `tests/e2e/test_v2_calendario.js` (5 verificações):
  1. Início → Calendário na pré-temporada: 38 rodadas, sem anteriores, CTA "Avançar semana";
  2. depois de 2 rodadas, o próximo compromisso é igual ao da versão atual (adversário, domingo, mando);
  3. anteriores com placar igual ao `matchLog`;
  4. CTA → Pré-jogo; 360 px; nada gravado;
  5. voltar.
- **Suíte E2E completa** (servidor isolado): 160/161.
  - A falha foi em `test_s4_b2_001_loading.js`: erro de rede do ambiente (`net::ERR_TUNNEL_CONNECTION_FAILED` no proxy) durante o carregamento da versão atual.
  - O teste não passa pela v2. Reexecutado isoladamente, **passou**.

## Arquivos
- `carreira-v2/src/domain/calendar.ts` e `calendar.test.ts`
- `carreira-v2/src/screens/Calendar.tsx` e `calendar.css`
- `carreira-v2/src/App.tsx`: rota
- `carreira-v2/src/screens/Home.tsx`: "Ver calendário" vira link interno
- `carreira-v2/src/domain/types.ts` e `home.ts`: `matchLog`, resultado de amistoso, `MONTH` exportado
- `tests/e2e/test_v2_calendario.js` e `tools/capture/capture-v2-calendario.js`

## Próxima tela (só após aprovação)
Elenco.
