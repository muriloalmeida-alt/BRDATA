# Carreira 2.0 — Entrega A1: ponte da partida + tela Partida

**Data:** 01/11/2026 · **Branch:** `carreira-v2` · **Status:** aguardando aprovação visual do Murilo

- **Referência:** `referencias_anteriores/partida.png` (CAP04-T02, Pacote Mobile, parte 3).
- **Plano:** `PLANO_BLOCO_PARTIDA.md`, opção A (ponte com o motor intacto), com as decisões D1–D4 de 01/11.
- **Comparativos:**
  - `evidencias/A1-partida/comparativo-390.png`: referência × partida rodando, intervalo, pausada e encerrada;
  - `evidencias/A1-partida/larguras-360-430.png`.

## Decisões aplicadas (01/11)
| Tema | Decisão |
|---|---|
| Abordagem | Ponte com a versão atual; motor, regras e gravação intactos |
| Entregas | Incrementais: A1 Partida, A2 Pausa/intervalo, A3 Substituição + Tática + Lances, A4 Resultado. **O "Iniciar partida" do Pré-jogo continua abrindo a versão atual até a A4 ser aprovada**, para que nada se perca no meio do caminho. |
| Som | A partida da v2 é silenciosa (o som continua na versão atual) |
| Controles extras | Velocidade 1×/2× e "Pular para o fim", de forma discreta. Sem estatísticas de posse e finalizações. |
| Semente | Fora por enquanto |
| Depois do Resultado | "Continuar" seguirá na versão atual com o que estiver pendente (definido para a A4) |

## O que foi entregue

### Ponte na versão atual (`public/js/carreira.js`, modo `?ponte=partida`)
- A v2 abre `/carreira?ponte=partida` num quadro invisível. Nesse modo, a versão atual:
  - **não abre** o onboarding nem o assistente de início, e não os marca como vistos; eles aparecem na próxima abertura normal;
  - **não toca sons** (`sfxCtx` devolve nulo só nesse modo);
  - expõe a API `window.BRDATA_PONTE`.
- **Comandos da API** (os mesmos dos botões da tela ao vivo atual, sem regra nova):

  | Comando | Função da versão atual |
  |---|---|
  | `iniciar()` | `goToMatch`, só em semana de jogo |
  | `pausar()` | `pauseLiveMatch` |
  | `retomar()` | `resumeLiveMatch` |
  | `continuarIntervalo()` | `continueFromHalftime` |
  | `velocidade(1\|2)` | `LIVE_MATCH.speed` |
  | `pularParaFim()` | `skipLiveMatch` |
  | `estado()` / `aoMudar()` | leitura e aviso de mudanças |

- **O estado** sai como dados (tipo, minuto, jogador) e não como o texto sorteado do feed atual, que muda a cada redesenho.
- **Avisos à v2:** a ponte avisa a cada desenho da partida (`renderLiveMatch`) e ao fim de cada partida, depois da gravação. Isso vale para a liga (`finishLiveMatch`), a perna de Copa e o amistoso.
- **Fora do modo ponte**, a página é idêntica à de antes.

### Na v2
- **`MatchGateway`** (`adapters/match.ts`): abre a ponte e espera o motor ficar pronto (até 30 s). Expõe iniciar, pausar, retomar, intervalo, velocidade, pular e o estado. Se um dia vier a opção B, só esta porta muda.
- **Tela Partida** (`/carreira-v2/partida`, iniciada por `?iniciar=1`):
  - **Topo:** BRDATA e "PARTIDA".
  - **Faixa do placar** com a foto CEN-02 (a mesma do Início e do Pré-jogo):
    - competição e rodada (ou "Copa do Brasil · fase · Ida/Volta" ou "Amistoso");
    - escudos oficiais;
    - placar grande;
    - minuto em lima;
    - "1º tempo", "2º tempo", "Intervalo" ou "Encerrado".
  - **"Último evento":** o lance mais importante mais recente (gol > vermelho > pênalti perdido > lesão > amarelo > substituição). No mesmo minuto, o gol vem antes do cartão.
    - Gol: bola, em lima quando é do seu time; "Gol do Flamengo" e o autor.
  - **"Lances da partida":** linha do tempo, do mais recente ao mais antigo, com rótulos fixos ("Gol · B. Santos", "Cartão amarelo · …", "Finalização defendida · …"). Termina em "0' Início da partida — Mandante × Visitante", como na prancha.
  - **Rodapé:**
    - "Pausar" ↔ "Retomar";
    - no intervalo, "Começar 2º tempo" (a partida para sozinha aos 45', como hoje);
    - "Ajustes" (nesta entrega pausa a partida; na A2 abre a tela de Pausa);
    - velocidade 1×/2×;
    - "Pular para o fim".
  - **No fim:** "Continuar" leva à versão atual. Isso é provisório; a A4 define o pós-jogo (coletiva e rodada) sem perder nada.
  - **Recarregar a página** não começa outra partida: o `?iniciar` sai do endereço. Sem partida em andamento, a tela mostra "Nenhuma partida em andamento".
- Ao terminar e gravar, a v2 relê o save.

## Divergências em relação à referência (para sua avaliação)
1. **Faixa de velocidade e "Pular para o fim"** acima dos botões (decisão D3). Não estão na prancha.
2. **Lances** com rótulos fixos por tipo, como na prancha. A versão atual usa frases sorteadas.
3. **"Ajustes" só pausa nesta entrega;** a tela de Pausa vem na A2.
4. **"Continuar" provisório**, que leva à versão atual; o pós-jogo fica para a A4.
5. **Wordmark itálico,** como nas demais telas da v2. A referência mostra o wordmark reto.
6. **Topo sem botão de voltar,** como na prancha. Sair no meio perde a partida, como hoje.

## Limitações conhecidas da ponte
- A versão atual inteira carrega durante a partida (~1,4 MB sem compressão). Na primeira abertura, "Preparando a partida…" leva alguns segundos.
- Os avisos que a versão atual mostra como *toast* durante e no fim da partida (objetivo concluído, adversário motivado) não aparecem na v2 nesta entrega.
- A Copa e o amistoso já funcionam pela ponte, mas a v2 só os mostra quando a partida é iniciada por ela. A ligação a partir do Pré-jogo e do Início fica para a A4.

## Testes
- **Unitários:** 48/48 (`npm test`), 5 deles da Partida:
  - cabeçalho, minuto e tempo, inclusive Copa;
  - último evento;
  - ordem e rótulos dos lances;
  - gol antes do cartão no mesmo minuto;
  - sem partida.
- **E2E novo** `tests/e2e/test_v2_partida.js` (7 verificações, partida real pela ponte):
  1. o Pré-jogo ainda abre a versão atual, `/partida` sem início não começa nada e a versão atual normal não tem a ponte;
  2. a partida começa, o endereço fica limpo, o cabeçalho é o da rodada e os lances terminam em "Início da partida";
  3. Pausar segura o minuto, a velocidade 2× fica marcada e Retomar continua;
  4. o intervalo segura a partida até "Começar 2º tempo";
  5. "Pular para o fim" encerra, e a rodada é gravada pelo motor de sempre: rodada +1, `matchLog` e tabela com o placar mostrado;
  6. a ponte fica em silêncio e não mexe no onboarding da conta;
  7. 360 px e alvos de toque.
- **Suíte E2E completa** (servidor isolado): **164/165**. Passaram todos os testes de partida, rodada, Copa e amistoso da versão atual. A única falha é a mesma instabilidade já registrada nas Entregas 07 e 08: os chips da aba Jogos em 360 px ficam no limite de 40 px (`test_redesign_a11y_responsivo.js`). Ela segue aguardando decisão.

## Arquivos
- `public/js/carreira.js`: modo ponte (`V2_PONTE`, `PONTE`, `ponteEstado`, `BRDATA_PONTE`) e avisos em `renderLiveMatch` e nos três fins de partida
- `carreira-v2/src/adapters/match.ts`: `MatchGateway`
- `carreira-v2/src/domain/match.ts` e `match.test.ts`
- `carreira-v2/src/screens/Match.tsx` e `match.css`
- `carreira-v2/src/ui/icons.tsx`: pausa, play, ajustes e bola
- `carreira-v2/src/App.tsx`: rota e releitura do save
- `tests/e2e/test_v2_partida.js` e `tools/capture/capture-v2-partida.js`

## Próxima entrega (só após aprovação)
A2: Pausa e intervalo (Revisar time, Substituir jogador, Ajustar tática, Retomar).
