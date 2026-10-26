# Relatório — motor de testes BRDATA, Fase C

> Pedido do Murilo (26/10/2026), depois da Fase B: "Remover as esperas
> fixas restantes / Ampliar máquinas / Incluir rota rápida". Branch
> `claude/motor-testes-fase-c` (sobre `claude/motor-testes-fase-b`).
> Nenhum arquivo de produto alterado. Artefatos em `SP/motor/`
> (`/tmp/claude-0/-home-user-BRDATA/74f76862-85ee-580c-8e7d-fa924edcdf71/scratchpad/motor/`).

## 1. Resumo

| Pedido | Feito | Resultado medido |
|---|---|---|
| Remover esperas fixas restantes | Implementado (1.115 trocas por espera de estado), **medido e revertido** | +5% de tempo e 1–3 falhas novas por execução (§3) |
| Ampliar máquinas | `--shard=I/N` (várias máquinas) + teto de concorrência 12 → 32 (máquina maior) | 2 máquinas: ~194 s contra ~356 s em 1 (−46%, mesmas condições) |
| Incluir rota rápida | Regra no fluxo de trabalho (skill `pm`): rota rápida + testes da área durante o desenvolvimento, suíte completa antes do merge | `npm run test:fast` ≈ 25–29 s |

## 2. Ampliar máquinas

- **Várias máquinas** — `node run_parallel.js --isolated-server --shard=1/2`
  numa e `--shard=2/2` na outra cobrem os 153 testes sem repetir (verificado:
  2 partes = 76 + 77, 3 partes = 52 + 50 + 51, união = 153, sem duplicata).
  A divisão usa só dados versionados (`suites.json → durationsMs`, mediana
  de 3 execuções), então é idêntica em qualquer máquina.
  Medido nesta máquina, cada metade sozinha: **193,6 s e 184,2 s**, contra
  350,1 s / 361,7 s da suíte inteira nas mesmas horas.
- **Máquina maior** — a concorrência padrão (2,5 × CPUs) ia até 12; agora
  até 32. Com 4 CPUs a suíte usa 76–88% de CPU, ou seja, o limite é CPU:
  mais núcleos reduzem o tempo quase na mesma proporção. Não dá pra trocar
  a máquina desta sessão (4 CPUs) daqui — o ganho só aparece rodando numa
  máquina maior ou em várias (CI).

## 3. Esperas fixas — por que ficaram

Foram trocadas por `settle(page)` (espera a interface assentar: quadros de
renderização, animações finitas, rede da página) as 1.115 esperas de
100–300 ms. Medição **pareada** (versões alternadas, mesma hora — a máquina
desta sessão ficou ~15% mais lenta ao longo do dia, então comparar com
números antigos enganaria):

| | Execução 1 | Execução 2 | Média | Aprovados |
|---|---:|---:|---:|---|
| Esperas fixas (mantido) | 364,6 s | 330,3 s | 347,5 s | 149/153 nas 2 |
| `settle` | 379,5 s | 353,0 s | 366,3 s (+5%) | 146 e 148/153 |

Isolado (um teste por vez) o `settle` foi 11% mais rápido (76,5 s vs
86,2 s em 6 testes) — mas na suíte, com 10 navegadores em 4 CPUs, a
pausa fixa era tempo ocioso que os outros aproveitavam, e o `settle`
acrescenta trabalho (quadros forçados, idas e voltas ao navegador). Três
variantes tentadas (consulta em laço, por evento, sem quadros forçados)
deram 356–368 s nas medições não pareadas. Decisão: manter as pausas curtas
fixas; espera de estado continua obrigatória pra tudo assíncrono (boot,
rede, partida ao vivo, telas em fila — Fase B). Regra registrada na skill
`pm` e no README.

## 4. Outros

- Intermitentes vistos nas medições desta fase e corrigidos: `test_h2h`
  (a Tabela reabre ao fechar a proposta em destaque e ficava por cima —
  novo `closeLeftoverTabela()` usado nos 8 testes que tratam proposta),
  `test_s4_b2_002_login` 3 (espera de estado pela resposta do login
  recusado).
- Falhas restantes: as mesmas 4 de produto da Fase B (§5 de
  `docs/MOTOR_TESTES_FASE_B.md`), aguardando decisão.

## 5. CI (GitHub Actions)

`.github/workflows/testes.yml` roda a cada push em `main`/`claude/**` e em
PR: **Rota rápida** (1 máquina) + **Suíte completa** em 4 máquinas
(`--shard=I/4`), cada uma com servidor isolado. Sem retry e sem pular
teste; o resumo de cada job lista a linha completa de cada verificação que
falhou. Execução 5 (commit 9f0f038): rota rápida 18/18 em ~30 s; partes da
suíte em 58–97 s de teste (+ ~20 s de preparo com cache) — **153 testes em
~2 min de relógio**. Falhas: só as 4 de produto conhecidas (P1
`test_toast_rodape`, P2 `test_colocar_a_venda` e
`test_historico_negociacoes`, P3 `test_condicao_ajuda`) — por isso a suíte
completa fica vermelha até a decisão sobre elas.

Ajustes para o CI (Chromium 130 + máquinas mais lentas expuseram esperas
curtas demais / um caminho não coberto): `test_onboarding`,
`test_assistente_inicio` (espera a tela do jogo), `test_engajamento`
(espera o login diário fechar), `test_loans` (espera o servidor gravar o
empréstimo), `test_ge_balance_001` (com proposta recebida, fechar a
proposta reabre a Tabela — reproduzido localmente forçando a proposta).

## 6. Prompt para GPT — Revisão e aprovação

Revise `docs/MOTOR_TESTES_FASE_C.md` (branch `claude/motor-testes-fase-c`).
Confira: (1) se `--shard` cobre a suíte inteira sem repetir e se a divisão
independe da máquina (`run_parallel.js`, `suites.json → durationsMs`);
(2) se a decisão de manter as pausas curtas fixas está sustentada pela
medição pareada da §3 (`SP/motor/pair_*`); (3) se a regra da rota rápida na
skill `pm` não substitui a suíte completa antes do merge. Responda
`APROVAR`, `REPROVAR` ou `APROVAR COM PENDÊNCIAS`, citando evidências.
