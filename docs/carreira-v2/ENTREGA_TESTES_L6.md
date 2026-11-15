# Entrega — testes sem a tela antiga, lote L6 (o que sobrou)

**Data:** 15/11/2026
**Plano:** `docs/carreira-v2/PLANO_TESTES_TELA_ANTIGA.md` (lote L6, conferido um a um: decisão D1 do Murilo, "Conferir um a um")
**Lista congelada:** 55 → 45 (L6a)

## L6a — site e conta (10 arquivos)

Os testes de loja, pagamento, push, convite, compartilhar, tutorial, login,
engajamento, assistente e sons entravam pela tela antiga, mas testam coisas
que a v2 também tem. Cada um foi reescrito pela tela da v2, ou saiu quando a
v2 não tem o recurso (com a decisão do Murilo).

| Teste | Antes | Agora |
|---|---|---|
| `test_loja.js` | 12 verificações pela Loja da tela antiga | 12 verificações pela Loja da v2 (`/loja`) |
| `test_loja_pagamento_real.js` | 7 verificações pela tela antiga (perfil `loja-creditos`) | 7 verificações pela Loja da v2 e pela proposta do Mercado (mesmo perfil) |
| `test_push_notifications.js` | 6 verificações pelas Configurações da tela antiga | 6 verificações pelas Configurações da v2 (`/configuracoes`) |
| `test_convite_amigo.js` | 7 verificações pelo Ranking e pelo login da tela antiga | 7 verificações pelo Ranking e pelo login da v2 |
| `test_share_cards.js` | 3 verificações (resultado, conquista, título) | 1 verificação (conquista); título em `test_v2_onboarding` item 5; resultado: lacuna (SHARE-RESULTADO-V2) |
| `test_onboarding.js` | 8 verificações pelo tutorial da tela antiga | 4 verificações pela v2; os slides, "Avançar"/"Começar" e a marca na conta já estão em `test_v2_onboarding` item 1 |
| `test_s4_b2_002_login.js` | 5 verificações: tokens e estados do login da tela antiga | 5 verificações: os mesmos estados no login da v2, com os tokens dela (`--bd-*`) |
| `test_engajamento.js` | 15 verificações (recompensa, objetivos, conquistas, ranking) | 7 verificações pela v2; objetivos: lacuna (OBJETIVOS-V2) |
| `test_assistente_inicio.js` | 13 verificações pelo assistente da tela antiga | 4 verificações pela v2; a sequência dos passos e o passo 4 já estão em `test_v2_onboarding` itens 2 e 3 |
| `test_efeitos_sonoros.js` | 8 verificações dos sons da tela antiga | **saiu:** a v2 não toca som (SONS-V2); o interruptor está em `test_v2_jogos_mais` item 7 |

### Para onde foi cada verificação

**`test_loja`:**
- 1: conta nova com 0 créditos (lido do servidor, `/api/auth/me`).
- 2, 2b, 2c: 5 pacotes; o Ouro é o "melhor valor"; preços com centavos (R$ 4,90 e R$ 149,90).
- 3, 3b: 6 itens com créditos em 3 grupos, com o Uniforme Alternativo.
- 4: confirmação do Pacote Ouro: 4.480 créditos, "Pagar R$ 34,90", Mercado Pago.
- 5: "Pagar" chama `/api/loja/checkout` (sem token: erro), avisa, fica na Loja e o saldo não muda.
- 6, 6b: confirmação do item com preço e saldo em créditos; sem saldo, "Saldo insuficiente" e a compra bloqueada (sem texto de outra loja).
- 7: Cancelar fecha.
- 8: conta freemium abre a Loja.

**`test_loja_pagamento_real`** (a conta com 5.000 créditos é criada antes do servidor subir, como antes):
- 1, 2: pacote com o Mercado Pago e o aviso de redirecionamento; "Pagar" chama o checkout de verdade (502 sem token) e não sai da Loja.
- 3: item sem saldo, bloqueado.
- 4: a conta sobe com os 5.000 créditos.
- 5: "Reset de Moral" debita 120 (4.880), põe a moral do elenco em 90 e entra no Histórico de compras (save e tela).
- 6: "Desconto de Contratação": a proposta da v2 (`/mercado/proposta`) sugere o valor com 15% a menos e mostra o aviso do desconto.
- 7: volta do Checkout Pro (`/loja?status=approved…`): URL limpa e "Pagamento aprovado!".

**`test_push_notifications`:** o interruptor "Ativar notificações push" (desligado no início); ativar dá a assinatura completa ou, neste ambiente sem o serviço de push, falha com aviso e sem travar; desativar é seguro; o `sw.js` tem os handlers `push` e `notificationclick`; o Elenco abre normal depois.

**`test_convite_amigo`:**
- 0, 1: código de amigo no Ranking; "Convidar amigo" copia `/?convite=CÓDIGO`.
- 2: o próprio link não adiciona a si mesmo e a URL fica limpa.
- 3: sem sessão, o link mostra o login da v2 e guarda o convite na aba.
- 4, 5: entrar pelo formulário cria a amizade, uma vez, dos dois lados.
- 6: o item antigo era um bug da tela antiga (login pelo formulário sem a global ME); agora: com carreira salva, entrar pelo formulário da v2 abre o Início.

**`test_onboarding`:** "Pular" no 1º slide marca a conta e abre o assistente; a recompensa vem depois do assistente; recarregar não reabre o tutorial; depois de "Reiniciar carreira", a 2ª carreira vai direto ao assistente.

**`test_assistente_inicio`:** trocar a formação no passo 1 grava; pulando os passos 2 a 4 nada é contratado e o save fica marcado; a Escalação fora do assistente mostra a formação, sem a barra; a 2ª carreira mostra o assistente de novo. Contratar comissão e olheiro nas telas da v2: `test_v2_comissao` e `test_v2_clube`.

**`test_s4_b2_002_login`:** padrão (campos, "Entrar", "Criar conta", tokens definidos); campos vazios (erro com `--bd-danger`, sem ir ao servidor); senha errada (mensagem e botão liberado); carregando ("Entrando…", desabilitado); sucesso (conta sem carreira vai para `/nova`).

**`test_engajamento`:** recompensa diária abre sozinha (7 dias, dia 1); "Receber" dá R$ 500 e receber de novo é recusado ("Já recebida hoje"); 7 conquistas, 0 desbloqueadas, filtro "Títulos" com 2; detalhe bloqueado sem compartilhar; promover 5 da base (comando `acaoJogador`, o mesmo do Elenco da v2) desbloqueia "Joia da Base", com data e botão de compartilhar; Ranking com seu código e a sua linha.

**`test_share_cards`:** conquista bloqueada sem botão; desbloqueada, "Compartilhar" baixa `conquista-ach_joia_base.png` (um PNG de verdade) e avisa "Imagem baixada".

### Lacunas da v2 (decisões do Murilo, 15/11: "Registrar demanda")

Registradas no `docs/HANDOFF_CLAUDE.md`, aguardando priorização:
- **SONS-V2:** a v2 não toca som; o interruptor só grava a preferência.
- **OBJETIVOS-V2:** objetivos diários, semanais e da temporada sem tela na v2 (o motor ainda conta).
- **SHARE-RESULTADO-V2:** sem "Compartilhar" no resultado da rodada.

### Contraprovas

Cada uma quebra a regra de propósito, roda o teste (tem que falhar) e
restaura o arquivo:

| Quebra | Teste | Resultado |
|---|---|---|
| Pacote Ouro sem `featured` (`motor/ponte.js`) | `test_loja` | falhou no 2b |
| "Reset de Moral" põe 80 (`motor/clube.js`) | `test_loja_pagamento_real` | falhou no 5 |
| Desconto de 10% em vez de 15% (`motor/clube.js`) | `test_loja_pagamento_real` | falhou no 6 |
| `sw.js` sem o handler `push` | `test_push_notifications` | falhou no 5 |
| `/api/friends/add` não adiciona (`server.js`) | `test_convite_amigo` | falhou no 4 e no 5 |
| Promover não conta o revelado (`motor/carga.js`) | `test_engajamento` | falhou no 8 e no 8b |
| Promover não conta o revelado (`motor/carga.js`) | `test_share_cards` | falhou (sem conquista para compartilhar) |
| `/api/account/onboarding-seen` não marca (`server.js`) | `test_onboarding` | falhou no 1 |
| `assistenteVisto` não marca o save (`motor/ponte.js`) | `test_assistente_inicio` | falhou no 2 |
| `/api/auth/login` fora do ar (`server.js`) | `test_s4_b2_002_login` | falhou (login não conclui) |

Depois das contraprovas, `git diff` no motor, no servidor e no `sw.js` vazio.
