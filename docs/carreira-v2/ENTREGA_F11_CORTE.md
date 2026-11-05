# Carreira 2.0: fase 11 do plano de independência (corte)

- **Data:** 05/11/2026.
- **Branch:** `fase11-corte`, a partir de `main` (com o #68, fase 10).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.

**Decisões aplicadas** (04/11):
- **Raiz:** o domínio principal abre a v2, servida na própria raiz.
- **Site:** o site do Brasileirão (tabela, jogos, estatísticas, times, jogadores, notícias, Seja Premium) mudou inteiro para `/brasileirao/*`.
- **Versão anterior:** `/carreira.html` e `/carreira-old` redirecionam para a raiz, mantendo a query.
- **App instalado e push:** abrem a v2.
- **Pagamento:** a volta do Mercado Pago cai na Loja da v2.
- **Legado:** sai o tratamento dos links que vinham da v2 (`V2_DEEP_LINKS`).

## Resultado principal
**A v2 é a Carreira, na raiz do domínio, e não depende mais de nenhuma tela da versão anterior.**
- A página antiga só existe como motor escondido em `/carreira/motor`, até a fase 12.
- O build da v2 não cita mais `carreira-old` nem `carreira.html`, e nenhuma navegação sai da v2. O teste novo verifica as duas coisas.

## Endereços
| Endereço | Antes | Agora |
|---|---|---|
| `/` | site do Brasileirão | **Carreira 2.0** (login, Início etc.) |
| `/tabela`, `/estatisticas`, `/noticias`, `/jogos`, `/loja`… | site (os 3 primeiros) ou nada | telas da v2 |
| `/brasileirao`, `/brasileirao/tabela`, `/brasileirao/times/…`… | — | **site do Brasileirão** |
| `/times/…`, `/jogadores/…`, `/jogos/<id>…`, `/seja-premium`, `/apoie` | site | **301** para `/brasileirao/…`, com a query |
| `/carreira.html`, `/carreira-old` | versão anterior | **301** para `/`, com a query (convite, status do pagamento, `source=pwa`) |
| `/carreira`, `/carreira/<tela>` | v2 | **301** para `/<tela>`, com a query |
| `/carreira-v2/<tela>` | 302 para `/carreira/<tela>` | 301 para `/<tela>` |
| `/carreira/motor` | motor | motor (sem mudança) |
| `/admin`, `/api/*`, `/privacidade.html` | — | sem mudança |

**Os 301 de `/tabela`, `/estatisticas` e `/noticias` não existem**, porque esses endereços agora são telas da v2. Quem tinha esses links salvos cai na tela equivalente da Carreira. Ver o ponto 2.

## O que mudou
**Servidor (`server/server.js`):**
- O prefixo `/brasileirao` é retirado antes das rotas do site, que continuam iguais.
- Fora dele, qualquer caminho sem extensão serve o index da v2, exceto `/api`, `/admin` e `/carreira/motor`.
- Os redirecionamentos da tabela acima.

**SEO:**
- Canonical, `og:url`, JSON-LD, os links do resumo em HTML e o 301 de jogador passam a usar `/brasileirao/…`.
- O `sitemap.xml` lista só o site em `/brasileirao/…` (e a privacidade).
- A v2 segue com `noindex`.

**Pagamento e push:**
- A volta do Mercado Pago para créditos vai para `/loja`. A Loja da v2 lê o status (aprovado, pendente, em análise, recusado), mostra o aviso e limpa a URL. No aprovado, recarrega o saldo depois de 4 s.
- A volta da assinatura do site vai direto para `/brasileirao/seja-premium`.
- O lembrete de sequência, o teste de push e o clique na notificação abrem `/`.

**App instalado:**
- `manifest-treinador.json`: `start_url` passou a `/?source=pwa`. O `id` continua `/carreira.html`, para quem já instalou não ganhar um segundo ícone.
- A v2 declara esse manifest e registra o `/sw.js`.
- O `manifest.json` do site abre em `/brasileirao?source=pwa`.

**Service worker:**
- Pré-carrega a v2 (documento e JS/CSS do build). A lista de arquivos é injetada pelo servidor, porque os nomes mudam a cada build. Assim, o app abre offline já na primeira vez.
- `/carreira.html` saiu do pré-carregamento, porque agora é um redirecionamento. O `carreira.js` continua, porque o motor usa.

**Convite por link:**
- O link de convite passou a ser `/?convite=CÓDIGO`. Links antigos (`/carreira.html?convite=…`) chegam igual pelo 301.
- A v2 guarda o código, limpa a URL e adiciona o amigo uma vez, depois do login ou cadastro (mesma mecânica da versão anterior).

**"Criar conta":**
- O link da v2 e o da versão anterior apontam para `/brasileirao?signup=1`, o cadastro do site.
- O "Modo Técnico" do menu do site aponta para `/`. O "Voltar pro app" do admin aponta para `/brasileirao`.

**v2:**
- `BASE` passou de `/carreira` para "".
- Saíram `adapters/legacy.ts`, o tipo `legacy` dos hubs e o último uso do `CtaLink` para a versão anterior. O botão principal do Início agora sempre leva a uma tela da v2.

**Versão anterior (`carreira.js`):** saíram `V2_DEEP_LINKS` e `applyV2DeepLink`.

**Sem mudança de motor, schema, banco ou endpoint.**

**Capturas** (pasta `evidencias/F11-corte/`, 390×844, conta anonimizada como "Treinador Exemplo"):
- `00-raiz-login-v2.png`
- `01-site-brasileirao.png`
- `02-site-tabela.png`
- `03-carreira-html-redireciona.png`
- `04-redirecionamentos.png`
- `05-raiz-inicio-v2.png`
- `06` e `07`: Loja com pagamento aprovado e pendente
- `08-mais.png`

## Pontos para sua avaliação
1. **Testes da versão anterior.** Cerca de 150 testes de regressão do motor abrem `/carreira.html` e usam a tela antiga.
   - Para não perder essa cobertura até a fase 12, o servidor dos testes (só ele, com `BRDATA_LEGACY_UI=1`) continua abrindo a versão anterior nesses dois endereços.
   - Em produção a variável não existe e os dois redirecionam.
   - O teste novo confere o roteamento de produção pelo cabeçalho `x-brdata-producao`, que só vale com essa variável ligada.
2. **`/tabela`, `/estatisticas` e `/noticias`:**
   - Antes eram páginas do site indexadas no Google; agora são telas da v2, atrás de login e com `noindex`.
   - O Google vai achar os endereços novos pelo sitemap e pelos canonicals.
   - Os resultados antigos dessas 3 URLs abrem a Carreira até o Google atualizar.
   - **Alternativa:** mover essas 3 telas da v2 para outro nome e redirecionar as URLs para `/brasileirao/…`. Não fiz sem alinhar.
3. **`/jogos`** (sem número) é a aba Jogos da v2. `/jogos/<id>` (partida do site) redireciona para `/brasileirao/jogos/<id>`.
4. **Retorno do pagamento sem sessão:** se a sessão tiver caído durante o pagamento, a v2 pede login e o aviso do status não aparece. Os créditos entram do mesmo jeito, pelo webhook.
5. **`/carreira/motor`** continua público (sem `noindex` no robots.txt, mas com a meta `noindex`), como desde a fase 1.

## Testes
- **Unitários:** 112/112.
- **`tsc`:** limpo. **Build e `verificar-bundle-v2.sh`:** ok (bundle idêntico ao fonte).
- **Novo `tests/e2e/test_v2_corte.js`,** com 8 verificações:
  1. varredura do build;
  2. roteamento de produção (13 endereços);
  3. sitemap e canonical;
  4. 70 telas e 177 links da v2 sem nenhuma saída;
  5. convite pelo link antigo;
  6. volta do pagamento na Loja;
  7. site em `/brasileirao`;
  8. `sw.js`.
- **Ajustados:**
  - os testes da v2 trocaram `/carreira/<tela>` por `/<tela>`;
  - `test_v2_inicio` 7 e 9 e `test_v2_navegacao` 5: os links diretos saíram e as rotas mudaram;
  - `test_v2_acesso` 1: link de cadastro;
  - `test_sw_offline_carreira`: a v2 abre offline;
  - `test_pwa_manifest`: `start_url` e o manifest da v2;
  - `test_regressao_gate`: o site em `/brasileirao`;
  - `run_parallel.js` (`BRDATA_LEGACY_UI=1` no servidor isolado);
  - `suites.json` (o teste novo é longo).
- **Suíte completa:** **185/185** (`run_parallel.js --isolated-server`), sem falhas e sem retries.
