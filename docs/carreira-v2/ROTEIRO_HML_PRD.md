# Carreira 2.0: roteiro de homologação e publicação (itens 2 e 3 do diagnóstico)

- **Data:** 05/11/2026.
- **Para quem executa:** Murilo. Este ambiente não alcança `hml-brdata.up.railway.app` nem `brdata.online`, porque a política de rede bloqueia. Também não tem acesso ao painel do Railway, e as regras do projeto não permitem usar o Railway Agent.
- **Base:** `docs/ops/README-DEPLOY-RAILWAY.md`.
  - O HML publica sozinho a cada push na `main`.
  - O PRD é manual ("Deploy Latest Commit").

## O que será publicado
| PR | Conteúdo |
|---|---|
| #57 a #68 | Fases 1 a 10 da v2 |
| **#69** | **Fase 11 (corte):** a raiz abre a Carreira 2.0; o site vai para `/brasileirao`; `/carreira.html` e `/carreira-old` redirecionam para `/` |
| próximo | Tutorial, assistente de início e "Compartilhar título" (`ENTREGA_P8_ONBOARDING.md`) |

**Não publicar a Fase 11 sem o item seguinte.** Sem ele, quem cria carreira não vê o tutorial nem o assistente, e o "Compartilhar título" some.

## Item 2: homologação (HML)
### 2.1 Conferir o que está no ar
1. Ver o SHA:
   ```sh
   H=https://hml-brdata.up.railway.app
   curl -s $H/api/health   # campo "commit": tem que ser o SHA do merge na main (12 primeiros caracteres)
   ```
2. Comparar com `git log -1 --format=%h origin/main`. Se não bater, o deploy do HML ainda não terminou ou falhou: ver o painel.

### 2.2 Rotas (Fase 11)
```sh
curl -sI $H/                       # 200 text/html (v2: id="root", /carreira/assets/…)
curl -sI $H/tabela                 # 200 (tela da v2)
curl -sI $H/brasileirao            # 200 (site)
curl -sI "$H/carreira.html?convite=ABC"   # 301 → /?convite=ABC
curl -sI $H/carreira-old           # 301 → /
curl -sI $H/carreira/elenco        # 301 → /elenco
curl -sI $H/times/flamengo         # 301 → /brasileirao/times/flamengo
curl -sI "$H/apoie?status=x"       # 301 → /brasileirao/apoie?status=x (e de lá → /brasileirao/seja-premium?status=x)
curl -sI $H/carreira/motor         # 200 (motor)
curl -s  $H/sitemap.xml | head     # só /brasileirao/… (e a privacidade)
curl -s  $H/robots.txt             # HML: "Disallow: /" (homologação não é rastreada)
```

### 2.3 No celular, com conta e carreira de teste
1. **Tempo de abertura do motor** (pendente desde a fase 1):
   - abrir `/`, entrar e tocar em "Preparar partida" → "Iniciar partida";
   - anotar o tempo até a partida começar, no 1º uso e no 2º;
   - meta: o 2º uso sem espera perceptível (o motor pré-carrega 1,5 s depois do Início).
2. **Fluxo novo (item 1):**
   - criar uma conta nova e uma carreira;
   - conferir tutorial → assistente (4 passos) → recompensa.
3. **App instalado:**
   - instalar pelo navegador (Android: "Adicionar à tela inicial");
   - o ícone abre `/` (Início da v2);
   - quem já tinha o app antigo instalado continua com um ícone só (o `id` não mudou).
4. **Pagamento** (com o token de teste do Mercado Pago no HML, se houver):
   - comprar um pacote na Loja;
   - a volta cai em `/loja` com o aviso do status.
5. **Push:** em Configurações, ativar e "Testar"; a notificação abre `/`.
6. **Convite:**
   - abrir `/?convite=<código de outra conta>` numa conta sem esse amigo;
   - ele aparece no Ranking → Amigos.

### 2.4 Safari/iPhone com VoiceOver (AUD-04/05, pendente desde 01/11)
- Ligar o VoiceOver e percorrer Início, Escalação, Partida e Resultado.
- Ao trocar de tela, o foco vai para o título.
- As folhas (Formação, Ajustar tática, login de sessão expirada) prendem o foco e fecham com o gesto de voltar (dois dedos em Z).

**Registrar:** data, aparelho, SHA, resultado de cada passo e, se houver, prints.

## Item 3: publicação em produção (PRD)
**Só depois do item 2 ok e com a sua decisão.**
1. **Antes:**
   - conferir que o SHA do HML aprovado é o mesmo que vai para o PRD;
   - anotar o SHA atual do PRD (`curl -s https://brdata.online/api/health`), que é o ponto de volta.
2. **Publicar:** painel do Railway → ambiente PRD → `Cmd/Ctrl + K` → "Deploy Latest Commit".
3. **Smoke:** repetir o 2.2 com `H=https://brdata.online`. No PRD o `robots.txt` lista o sitemap, e o sitemap tem só `/brasileirao/…`.
4. **Cache:**
   - o service worker é network-first e troca o nome do cache a cada deploy;
   - quem está online recebe a versão nova no 1º carregamento;
   - o app instalado pode precisar ser aberto 2 vezes.
5. **Rollback:**
   - no Railway, voltar o deployment do PRD para o anterior (Deployments → "Redeploy" no deploy antigo);
   - ou reverter os commits na `main` e publicar de novo.
   - O save não mudou de formato: **não há migração nem restauração de banco**.
6. **Depois:**
   - reenviar o sitemap no Search Console fica a seu critério (você pediu para desconsiderar);
   - acompanhar `/brasileirao` e os 301 no Analytics nos primeiros dias.

## Para eu conferir daqui
Libere `hml-brdata.up.railway.app` e `brdata.online` em **Network access**, nas configurações do ambiente desta sessão (menu do ambiente na barra de título → Edit → Allowed domains). Com isso eu rodo o 2.1, o 2.2 e o smoke do 3.3. Os itens de aparelho (2.3 e 2.4) continuam com você.
