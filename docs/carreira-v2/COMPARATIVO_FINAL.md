# Carreira 2.0 — Comparativo final: previsto × implementado

- **Data:** 01/11/2026.
- **Código:** PR #55 (`carreira-v2` @ 1fc8599).
- **Captura:** 390×844, tudo numa mesma carreira (Flamengo, Série A). A pré-temporada foi pulada e as 2 primeiras rodadas foram jogadas pela versão atual. A 3ª rodada foi jogada pela v2, que é onde estão as capturas do bloco da partida.
- **Script:** `tools/capture/capture-v2-todas.js <url> <pasta> 390x844`.

As imagens ficam em `evidencias/comparativo-final/`:
- `NN-*.png`: o previsto à esquerda e o implementado à direita.
- `telas/`: as 19 capturas soltas, para comparar com o publicado.
- `sem-prancha.png`: as telas que não têm prancha.

Para comparar com o publicado, basta abrir os mesmos endereços em `https://<domínio>/carreira/…`. É preciso estar logado e ter carreira; sem isso, a v2 manda para `/carreira-old`.

**Rotas (desde 01/11/2026):** `/carreira` é a v2 e `/carreira-old` é a versão anterior. Endereços antigos `/carreira-v2/…` redirecionam para o mesmo caminho em `/carreira/…`. O arquivo `/carreira.html` continua abrindo a versão anterior (app instalado, notificações e volta do pagamento).

| # | Tela | Endereço | Previsto | Principais diferenças (todas decididas nas entregas) |
|---|---|---|---|---|
| 01 | Início | `/carreira/` | `referencias_anteriores/inicio.png` | Data sem horário ("26 MAR · RODADA 3"). Escudos oficiais. Barlow nos textos de apoio. |
| 02 | Escalação | `/carreira/escalacao` | `referencias_anteriores/escalacao.png` | Overall na camisa (o jogo não tem número de camisa). Banco completo. Linha "Tática e instruções". |
| 03 | Quem entra? | `…/escalacao/trocar?vaga=N` | `referencias_anteriores/escolher_substituto.png` | Mesma posição primeiro. Marca "Titular" e "No banco". |
| 04 | Pré-jogo | `/carreira/pre-jogo` | `referencias_anteriores/pre_jogo.png` | Nomes sob as camisas. Avisos como linhas. Sem destaque lima. |
| 05 | Tabela | `/carreira/tabela` | `02_resultados`, coluna 2 | Trecho de 6 linhas e "Ver tabela completa". Zonas. Seletor A/B/C. Copa do Brasil. |
| 06 | Calendário | `/carreira/calendario` | `06_clube`, coluna 3 | Dia e mando no lugar do horário. Linha da competição. "Ver anteriores". |
| 07 | Elenco | `/carreira/elenco` | `05_elenco`, coluna 1 | Overall na camisa. Situação no lugar da posição específica. Seção Base. |
| 08 | Perfil do jogador | `/carreira/elenco/jogador?id=…` | `05_elenco`, coluna 2 | Dados esportivos (sem idade nem salário). "Contrato e ações" abre a versão atual. |
| 09 | Diretoria | `/carreira/diretoria` | `06_clube`, coluna 1 | "Dentro da meta". Outros objetivos e temporadas anteriores. |
| 10 | Finanças | `/carreira/financas` | `06_clube`, coluna 2 | Folha × teto e últimas movimentações. Vermelho quando o saldo é negativo. |
| 11 | Partida | `/carreira/partida` (aberta pelo Pré-jogo) | `referencias_anteriores/partida.png` | Velocidade 1×/2× e "Pular para o fim". Lances com rótulos fixos. |
| 12 | Pausa | `…/partida?tela=pausa` | `01_partida`, coluna 1 | Linha extra "Lances da partida". |
| 15 | Substituição | `…/partida?tela=entra&sai=…` | `01_partida`, coluna 2 | Etapa anterior "Quem sai". Condição física. "N de M". |
| 17 | Lances da partida | `…/partida?tela=lances` | `01_partida`, coluna 3 | Inclui chances e defesas. O início aparece com um círculo. |
| 19 | Resultado | `…/partida` (fim) | `02_resultados`, coluna 1 | Frase factual, sem avaliação. Gols dos dois times. |
| — | Revisar time / Quem sai / Ajustar tática / Intervalo | `?tela=time`, `?tela=sai`, `?tela=tatica` | sem prancha | Seguem o visual da v2. O Intervalo é a própria Pausa, com "Começar 2º tempo". |

## O que continua na versão atual
Destinos que ainda abrem `/carreira-old`:
- **Pelas linhas das telas da v2:**
  - Tática e instruções;
  - Filtros e ordenação do Elenco;
  - Contrato e ações do jogador;
  - elenco de outro clube;
  - Mercado;
  - Patrocínios, estádio e orçamento.
- **Pela barra inferior:** as abas Jogos e Mais.
- **Pelo botão principal do Início:** Avançar semana, Amistoso e Próxima temporada.
- **Pós-jogo**, depois de "Continuar": notícias, resumo da rodada, coletiva e perna da Copa.
