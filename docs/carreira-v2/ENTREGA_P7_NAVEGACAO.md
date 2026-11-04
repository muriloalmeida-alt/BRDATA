# Carreira 2.0: P7 do plano de independência (mapa de navegação)

- **Data:** 04/11/2026.
- **Branch:** `p7-navegacao`, a partir de `main` (com #57, #58 e #59).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.
- **Referências:**
  - P7 (seção 6 do plano): telas desenhadas pelo Claude no padrão v2;
  - prancha 43, col. 2 (CAP07-T01) para o menu Mais.
- **Decisões aplicadas** (04/11):
  - a tela **Clube** é aberta pelo Início (linha "Clube" e escudo no topo);
  - "Voltar ao clube" nas telas do clube (Diretoria e Finanças) leva à tela Clube;
  - o menu **Mais** entra nesta entrega.

## Resultado principal
**As 4 abas da barra (Início, Elenco, Jogos, Mais) agora são telas da v2.** Antes, Jogos e Mais abriam `/carreira-old`.

As áreas que ainda não têm tela na v2 continuam abrindo a tela equivalente da versão anterior (só em homologação, D3), mas agora:
- **ficam visíveis:** cada linha aponta direto para a tela certa da versão anterior;
- **ficam marcadas:** um ↗ no fim da linha avisa que ela abre a versão anterior.

Cada fase seguinte troca o ↗ da sua área por uma tela da v2, sem mudar o mapa.

## Mapa
```text
Início ──┬─ Clube (linha "Clube" ou escudo) ─┬─ Gestão: Diretoria · Finanças · Extrato ↗
         │                                   ├─ Elenco e mercado: Mercado ↗ · Contratos ↗ ·
         │                                   │    Histórico de negociações ↗ · Base e olheiros ↗ · Comissão técnica ↗
         │                                   └─ Estrutura: Estádio ↗ · Patrocínios ↗
         ├─ (demais linhas do Início, sem mudança)
Elenco (aba) — sem mudança
Jogos (aba) ── Calendário · Tabela · Copa do Brasil ↗ · Estatísticas ↗
Mais (aba) ─── Perfil do treinador ↗ · Conquistas ↗ · Premiações ↗ · Ranking ↗ · Loja ↗ ·
               Configurações ↗ · Central de ajuda ↗ · Saves ↗ · Sair
```

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| Jogos | Aba "Jogos" | "Seus jogos.", competição e ano. Linhas com dados reais: <ul><li>Calendário: próximo jogo;</li><li>Tabela: posição, ou "Nenhuma rodada disputada";</li><li>Copa do Brasil: situação real da copa;</li><li>Estatísticas.</li></ul> |
| Clube | Linha "Clube" ou escudo do Início | "Seu clube.", clube e temporada. Três seções: <ul><li>Gestão: meta da diretoria e saldo reais;</li><li>Elenco e mercado;</li><li>Estrutura.</li></ul> |
| Mais | Aba "Mais" | "Seu jogo continua." com os 9 itens da prancha, na ordem. "Sair" encerra a sessão e mostra o login da v2 (sem passar por `/carreira-old`) |

**Capturas** (pasta `evidencias/P7-navegacao/`, 390×844):
- `01-inicio-linha-clube.png`;
- `02-jogos.png`;
- `03-clube.png`;
- `04-mais.png`;
- `05-mais-360.png`.

## Motor (ponte) e servidor
- **Sem regra nova.** Só links diretos novos na versão anterior (`V2_DEEP_LINKS`), cada um chamando a mesma função do botão de sempre:
  - `estatisticas`, `copa`, `conquistas`, `ranking`, `loja`: abrem o painel;
  - `contratos`, `comissao`, `estadio`, `patrocinios`, `olheiros`, `extrato`, `historico-negociacoes`, `perfil-treinador`, `premiacoes`, `configuracoes`, `ajuda`, `notificacoes`: abrem a tela.
- **"Sair"** usa o mesmo `POST /api/auth/logout` do portal.

## Divergências e pontos para sua avaliação
1. **Seta de voltar (para o Início) em Jogos e Mais.** É o mesmo padrão da aba Elenco, que já tinha a seta.
2. **"Saves"** abre a aba Mais da versão anterior, onde ficam "carreira atual" e "reiniciar". Não existe tela própria de saves.
3. **Ordem do Início:** a linha "Clube" ficou entre "Recompensa diária" e "Ver calendário". As linhas "Objetivo" e "Finanças" continuam no Início, como atalhos.
4. **Escudo do Início:** agora também é um alvo de toque (44 px) que abre a tela Clube.

## Testes
- **`tests/e2e/test_v2_navegacao.js` (novo), 6 verificações:**
  - abas;
  - Jogos;
  - Clube, incluindo "Voltar ao clube" da Diretoria;
  - Mais e Sair;
  - os 15 links diretos novos abrem a tela certa;
  - 360 px sem rolagem horizontal e com alvos ≥ 44 px.
- **Testes ajustados:**
  - `test_v2_diretoria.js` e `test_v2_financas.js`: "Voltar ao clube" agora espera `/carreira/clube`;
  - `test_v2_inicio.js`: sem mudança. A verificação de alvos ≥ 44 px pegou o escudo, que virou link, e o CSS foi corrigido para 44 px.
- **Resultados:**
  - unitários 67/67;
  - `tsc` limpo;
  - todos os E2E da v2: 19/19;
  - suíte completa: 175/176.
- **A falha da suíte completa é instável e não é desta entrega.** Em duas rodadas falhou um teste diferente da versão anterior (`test_ge_balance_004` na 1ª, `test_ux_fechar_voltar_inicio` na 2ª). Os dois passam sozinhos, e `test_ge_balance_004` também passa no commit base.
