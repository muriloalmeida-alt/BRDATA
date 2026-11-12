# Carreira 2.0: testes sem a tela antiga, lote L2 (save, dados e conta)

- **Data:** 12/11/2026.
- **Branch:** `testes-l2`, a partir de `main` (com o #102, lote L1).
- **Plano:** `PLANO_TESTES_TELA_ANTIGA.md` (D1 "conferir um a um").
- **Resultado:** a lista congelada cai de **151 para 137**.

## O que mudou no lote
A loja, o pagamento real, as notificações push e o convite de amigo **foram para o L6**. São recursos da tela antiga (loja, configurações, ranking), com regras misturadas, e precisam da mesma conferência verificação por verificação dos outros testes da tela antiga.

## Os 14 testes
| Teste | O que protege | Agora |
|---|---|---|
| `test_save` | 30 rodadas seguidas; todo save responde 200 | **reescrito**: rodadas pela ponte do motor da v2 (`jogarRodadaV2`); também confere a rodada no servidor |
| `test_save_limit_001` | save "multi" sem 413, GET comprimido e igual à memória, limite de 15 no histórico de clubes, save antigo normalizado | **reescrito** pelo motor (`noMotor`), mesmas 5 verificações |
| `test_p0_ids_001` | ids de jogador únicos (carreira nova, save antigo corrigido ao carregar, reposição da base) | **reescrito** pelo motor, mesmas verificações |
| `test_migration` | save muito antigo (sem os campos das fases 2/3) completado ao carregar | **reescrito com verificações**: antes só imprimia o resultado e sempre passava. Agora confere a memória do motor e o save gravado |
| `test_pin_data_source` | carreira em Modo Exemplo não troca de fonte de dado ("Time #ope") | **reescrito** pelo motor (`loadLeague`, `timePorId`); o passo 4 confere o Início da v2 |
| `test_frozen_provider` | fornecedor "frozen": lista e elenco reais | **reescrito**: escolha de competição e criação pelos comandos das telas da v2 |
| `test_tickets` | jogo em casa gera bilheteria | **reescrito**: confere o lançamento "bilheteria" do extrato, que a v2 mostra em Finanças → Extrato, e que jogo fora não gera |
| `test_tickets_form` | bilheteria com a forma recente forçada | **reescrito** como o anterior |
| `test_recompensa_dia7` | prêmio do dia 7 vira caixa numérico (+R$ 3.000) | **reescrito**: `applyDailyLoginReward` e `receberRecompensa`, o comando da tela de Recompensa da v2 |
| `test_pwa_manifest` | manifest próprio da carreira, ícones e o manifest do site intacto | **ajustado**: a verificação 1 olha a v2 (raiz) em vez do `carreira.html`; o resto igual |
| `test_fix_signup_link` | "Criar conta" leva ao cadastro do portal, o cadastro funciona e a URL fica limpa | **ajustado**: começa no login da v2 em vez do login da tela antiga |
| `test_save2` | mudar a formação na tela antiga e recarregar | **saiu** (D1): sem verificação nenhuma. A v2 confere o mesmo em `test_v2_escalacao` 6 (formação gravada) e 5 (o motor recarregado lê) |
| `test_401` | sessão expirada na tela antiga | **saiu** (D1): sem verificação nenhuma. A v2 confere em `test_v2_gravacao` 5 (sessão expirada) e `test_v2_inicio` 1 (login) |
| `test_carreira_login_form` | formulário de login da tela antiga | **saiu** (D1): a v2 confere o login em `test_v2_acesso` 1 |

**Também mudaram:**
- **`_bilheteria_v2.js`:** ajudante novo dos dois testes de bilheteria.
- **`suites.json`:** sem os 3 testes que saíram.

## Contraprovas
Quebrei a regra no motor, uma por vez; o teste reescrito falhou em todas:
- **Limite do histórico de clubes de 15 para 20:** `test_save_limit_001` falha.
- **`ensureUniquePlayerIds` desligado:** `test_p0_ids_001` falha.
- **Prêmio do dia 7 com outro valor:** `test_recompensa_dia7` falha.
- **Bilheteria não registrada no jogo em casa:** `test_tickets` falha.
- **Migração sem completar salário e contrato:** `test_migration` falha.

O `test_pin_data_source` já tem a sua dentro: o passo 2 reproduz o defeito sem a correção.

## Achado para decisão (não mudei o motor)
- **O problema:** um save **sem os elencos dos outros clubes** (`leagueSquads`), de antes da fase 2, volta da migração com o objeto vazio, e nada os reconstrói. Nessa carreira, o mercado e as propostas por jogadores dos outros clubes ficariam vazios.
- **Origem:** é o comportamento de antes, o mesmo da tela antiga, e o teste antigo não olhava esse campo. O `test_migration` confere só que o campo existe.
- **Opções:**
  - reconstruir os elencos na carga (o `buildLeagueSquads` que a criação usa); ou
  - deixar como está, se não houver mais saves tão antigos em produção.
- **Decisão do Murilo (12/11/2026):** "Saves antigos serão descartados". O motor fica como está, sem reconstrução. O descarte dos saves é uma operação de banco, feita por ele; o agente não apaga nada.

## Testes
- **Os 11 reescritos ou ajustados:** passam.
- **Checagem da tela antiga:** 137 de 137.
- **Suíte completa (com o Postgres temporário):** 209/209 (3 testes a menos).
