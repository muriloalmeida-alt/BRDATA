# Carreira 2.0: plano para tirar os testes da tela antiga

- **Data:** 12/11/2026.
- **Status:** aprovado pelo Murilo (12/11): D1 "conferir um a um" e a ordem dos lotes, sem pausas entre eles. D2 segue a recomendação (fora deste plano).
- **Origem:** passo 2 dos próximos passos depois do plano "sem página escondida" (concluído com o #99).
- **Objetivo:**
  - zerar a lista congelada `tests/e2e/tela_antiga_legado.json`, hoje com 181 testes;
  - com ela zerada, apagar a tela antiga (passo 3).

## 1. Onde estamos
- **A tela antiga:** a v2 e o motor não dependem mais dela.
- **Os testes:** 181 dos 189 testes de navegador (`tests/e2e/test_*.js`) ainda abrem a `carreira.html` (`/carreira-old`, que só existe no servidor de testes) direta ou indiretamente.
- **Os ajudantes de navegador:** `_startup`, `_round`, `_calendar_skip` e `newCareer` de `_v2_match` passam pela tela antiga. Por isso, quase todo teste que monta uma carreira cai na lista.

**O que já existe para substituir:**
- **`tests/e2e/_v2_carreira.js`:** conta e carreira novas pela v2 (`novaCarreiraV2`) e o save do servidor.
- **`tests/e2e/_sem_tela.js`:** a ponte sem navegador (carreira inteira, rodadas, temporada), com a mesma API do servidor de testes.
- **Testes unitários do motor** (`tests/unit/test_motor_*.js`): regras isoladas, com testes de equivalência.

## 2. Os grupos
A divisão foi feita pelo nome e pelo que o teste usa. Cada lote confere teste por teste antes de mexer.

| Grupo | Testes | O que são | Como sai da tela antiga |
|---|---|---|---|
| A. Testes da v2 | 30 (`test_v2_*`) | testam telas da v2; só **montam** a carreira pela tela antiga (`newCareer`, `_startup`) e ajustam o save pelo `CAREER` da página | trocar a montagem por `novaCarreiraV2` ou pela API (save ajustado por `PUT /api/career`) |
| B. Tela antiga em si | ~72 | testam modais, toasts, redesign, acessibilidade e telas da carreira antiga (`s4_b*`, `ux_*`, `m3_*`, `toast_*`…) que o usuário não vê mais. Alguns são do site ou da conta (`loja`, `tickets`, `pwa_manifest`, `push`, `401`, `convite`) e só usam a tela antiga para entrar | depende da decisão D1 (abaixo) |
| C. Mercado | 22 | transferências, IA de mercado, empréstimos, olheiros, teto salarial | reescrever sem navegador (`_sem_tela.js` ou unitário do motor) |
| D. Temporada e mundo | 25 | virada, divisões, rebaixamento, Copa, diretoria, calendário, balanceamento | idem |
| E. Elenco e semana | 24 | contratos, moral, lesões, treino, tática, comissão, patrocínio, coletiva, notícias, ao vivo | idem |
| F. Save e dados | 8 | save, migração, limite, ids, fonte de dados | sem navegador ou pela API |

## 3. Decisões que preciso de você
- **D1. Testes da tela antiga (grupo B).**
  - **Recomendação:** para cada um, conferir se o que ele protege ainda existe:
    - se protege uma regra ou um dado, a verificação vai para o motor ou para um teste sem navegador;
    - se protege algo da tela antiga (modal, CSS, toast, layout), o teste sai, com o equivalente da v2 apontado na tabela do relatório, quando houver;
    - os do site e da conta (`loja`, `tickets`, `pwa_manifest`…) só trocam a entrada.
  - **Alternativa:** reescrever todos pela v2, o que leva bem mais tempo e testa telas que já têm teste próprio na v2.
- **D2. Os testes de equivalência** (`test_motor_*`, `test_sem_tela`, `_motor_vm`, `_tela_falsa`). Eles carregam o `carreira.js` num `vm`, sem navegador, como referência.
  - **Recomendação:** ficam fora deste plano. Não estão na lista e não usam a tela, só o código. Decidimos o destino deles no passo 3 (apagar a tela antiga).

## 4. Lotes
Cada lote é um PR com:
- relatório;
- CI verde;
- a lista congelada diminuindo;
- a contraprova de sempre: para cada verificação reescrita, mostrar que ela falha quando a regra quebra.

| Lote | Conteúdo | Testes |
|---|---|---|
| L1 | Ajudantes novos: montar carreira e ajustar o save sem a tela antiga (`_v2_carreira`, `_sem_tela`); grupo A (testes da v2) | 30 (#102, mergeado) |
| L2 | Grupo F (save e dados) e os do site/conta do grupo B (loja, pagamento real, push e convite foram para o L6: são recursos da tela antiga) | 14 (#103, mergeado) |
| L3 | Grupo C (mercado) | 22 |
| L4 | Grupo D (temporada e mundo) | 25 |
| L5 | Grupo E (elenco e semana) | 24 |
| L6 | O resto do grupo B (tela antiga em si, mais loja, pagamento real, push e convite), conforme a D1 | ~66 |
| L7 | Lista zerada; os ajudantes antigos (`_startup`, `_round`, `_calendar_skip`, `newCareer`) saem | — |

**Ordem depois do L2 (decisão do Murilo, 12/11):** as frentes novas entram na frente (Fase 1 → Série D → Offline, ver `docs/HANDOFF_CLAUDE.md`). O L3 (mercado) vem antes da FASE1-MER, para as regras novas do mercado já nascerem com teste. L4 a L7 seguem nos intervalos.

**Os maiores lotes podem ser divididos** (como na etapa G), se ficarem grandes demais para revisar.

## 5. Riscos
- **Cobertura:** um teste antigo pode verificar sem querer uma regra que não está no nome dele.
  - **Mitigação:** ler cada teste antes de mexer, listar o que ele verifica e mostrar no relatório para onde cada verificação foi.
- **Tempo da suíte:** testes sem navegador são mais rápidos, então a suíte deve encolher, não crescer.
- **Testes instáveis:** os que hoje esperam tempo fixo (como o `test_loans` antes do #100) passam a esperar o estado real, no servidor ou no motor.

## 6. Depois deste plano (passo 3)
- **O que sai:**
  - a `carreira.html`;
  - as telas, os modais e o CSS do `carreira.js`;
  - a rota de testes `/carreira-old` (`LEGACY_UI_FOR_TESTS`);
  - a lista congelada e a verificação `verificar-tela-antiga.js`.
- **O que precisa de decisão antes:** a ponte do `carreira.js`, que é a referência dos testes de equivalência (D2).
