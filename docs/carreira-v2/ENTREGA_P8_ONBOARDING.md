# Carreira 2.0: tutorial, assistente de início e "Compartilhar título" (item 1 do diagnóstico)

- **Data:** 05/11/2026.
- **Branch:** `p8-onboarding`, a partir de `main` (com o #69, fase 11).
- **Origem:** item 1 do diagnóstico de 05/11. As três funções existiam só na versão anterior e sumiram para o usuário com o corte da fase 11.

**Decisões aplicadas** (05/11):
- **Tutorial:** textos adaptados à navegação da v2.
- **Assistente:** sequência guiada pelas telas que a v2 já tem.
- **Saves atuais:** o assistente abre só em carreira que ainda não jogou partida oficial.
- **Título:** o cartão mostra o nome certo da série; com campeonato e Copa no mesmo ano, um botão para cada.

## Telas
| Tela | Quando abre | O que mostra |
|---|---|---|
| **Tutorial** (`/boas-vindas`) | Na 1ª carreira da conta, logo depois de "Ir para o clube" | <ul><li>4 telas: boas-vindas, central de comando, como funciona uma rodada e legado</li><li>"Avançar" e "Começar", com "Pular" no topo</li><li>Fechar marca a conta (`POST /api/account/onboarding-seen`, como na versão anterior)</li></ul> |
| **Assistente de início** | Em toda carreira nova, na pré-temporada, depois do tutorial | <ul><li>Passo 1: Escalação (formação favorita)</li><li>Passo 2: Comissão técnica</li><li>Passo 3: Contratar olheiro</li><li>Passo 4: Instruções táticas</li><li>Em cada passo, a tela da v2 de sempre mais a barra "Assistente de início · Passo N de 4", com "Continuar" e "Pular esta etapa"</li><li>A barra de baixo some enquanto o assistente está aberto</li></ul> |
| **Compartilhar título** | No Encerramento da temporada, quando você termina em 1º e/ou ganha a Copa | <ul><li>Uma linha "Compartilhar título" para cada título: Campeão brasileiro, da Série B, da Série C ou da Copa do Brasil</li><li>O cartão (1080×1350) tem o mesmo desenho da versão anterior: título, escudo no hexágono, clube, temporada e taça</li><li>No celular abre o compartilhar; sem ele, baixa a imagem</li></ul> |

**Ordem do que abre sozinho ao entrar** (a mesma da versão anterior):
1. tutorial;
2. assistente;
3. recompensa diária.

Isso acontece uma vez por carregamento. Sair do assistente pelo "Voltar" da tela não prende ninguém: ele volta na próxima abertura, enquanto a carreira não tiver jogado.

**Capturas** (pasta `evidencias/P8-onboarding/`, 390×844, conta "Treinador Exemplo"):
- de `01-tutorial-1.png` a `04-tutorial-4.png`;
- de `05-assistente-1-formacao.png` a `08-assistente-4-taticas.png`;
- `09-depois-recompensa.png`;
- `10-encerramento-compartilhar.png`;
- `11-cartao-titulo.png`, o cartão gerado de verdade.

## Motor (ponte)
- **Comando novo `assistenteVisto`:** é o mesmo `CAREER.startupWizardSeen = true` de `finishStartupWizard`, gravado.
- **Passo 4:** "Começar a temporada" grava as instruções mexidas e ainda não salvas (`salvarTatica`), como o "Continuar" da versão anterior. Os passos 1 a 3 já gravam na própria tela (formação, contratar comissão, contratar olheiro).
- **Sem mudança de schema e sem endpoint novo.** O campo `startupWizardSeen` já existia no save.

## Pontos para sua avaliação
1. **Assistente nas telas de sempre:** cada passo é a tela normal da v2. Por isso ela mantém o próprio "Voltar" e o próprio "Salvar". "Voltar" sai do assistente.
2. **Carreira nova depois de aceitar outro clube ou de reiniciar:** o assistente abre de novo, como na versão anterior ("toda carreira nova").
3. **Recompensa não recebida** continua reabrindo a cada carregamento. É o comportamento de antes.

## Testes
- **Unitários:** 116/116 (`domain/onboarding.test.ts`, novo, com 4 testes).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_onboarding.js`,** com 7 verificações:
  1. tutorial;
  2. passos 1 a 3;
  3. passo 4 grava as instruções e marca o save;
  4. recarregar não reabre, e carreira em andamento não é interrompida;
  5. títulos da Série A e da Copa, com o cartão baixado;
  6. (5b) Série B;
  7. (6) 360 px.
- **Ajustados:**
  - `test_v2_acesso` 5: tutorial e assistente antes da recompensa;
  - `test_v2_temporada`: a carreira nova no outro clube abre o assistente;
  - `_v2_match.skipAutoOpen`.
- **Suíte completa:** **186/186**.
- **Depois do ajuste visual da barra** (botões empilhados): os 7 testes da v2 mais afetados passaram 2 vezes seguidas, sob carga.
