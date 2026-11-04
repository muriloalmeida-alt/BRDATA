# Carreira 2.0: fase 3 do plano de independência (a semana)

- **Data:** 04/11/2026.
- **Branch:** `fase3-semana`, a partir de `main` (com o #60, P7).
- **Status:** aguardando aprovação do Murilo. Commit local, sem push e sem PR.
- **Referências:**
  - complemento 17, col. 1 (CAP04-N01 Semana concluída) e col. 2 (CAP04-N02 Pré-jogo de amistoso);
  - `13_historia` col. 2 (CAP06-T06 Notícias);
  - Avisos (sino), sem prancha: P8, desenhado no padrão v2.

**Decisões aplicadas** (04/11, todas as recomendadas):
- **Treino:** resumo das sessões.
- **Condição:** média do elenco e as até 5 maiores mudanças.
- **Prazos:** só o que aconteceu, sem "Contratos encerrados".
- **Amistoso:** escolha entre os convites.
- **Notícias:** sem seta e com a situação do elenco.
- **"Avançar até o próximo jogo":** entra como ação secundária, com confirmação quando há amistosos no caminho.
- **Avisos:** sino no topo do Início.
- **Semana concluída:** só "Continuar".

## Resultado principal
**Com esta fase, a v2 não abre mais `/carreira-old` em quatro pontos:**
- o botão principal do Início nas semanas sem jogo ("Avançar semana" e "Ir para o amistoso");
- a linha de Notícias;
- o atalho "Pular para o jogo";
- o sino.

O amistoso é jogado na Partida da v2, que já existia, e termina na Semana concluída.

Ainda abrem a versão anterior:
- "Próxima temporada" (fase 5);
- os avisos de proposta do Início (fase 8).

## Telas
| Tela | Como se chega | O que mostra |
|---|---|---|
| **Semana concluída** ("A semana avançou.") | "Avançar semana" do Início, "Avançar sem amistoso" ou o fim do amistoso | <ul><li>**Treino aplicado:** as sessões do plano (ex.: "2 técnicos · 2 físicos · 2 descansos") e a intensidade mais usada. Nas férias, "Sem treino"</li><li>**Condição do elenco:** "Média do elenco 84% → 94%" e os até 5 jogadores que mais mudaram (+ em lima, − em vermelho)</li><li>**Prazos e finanças:** só o que aconteceu (janela que abriu ou fechou, salários, patrocínio, parcelas, bilheteria do amistoso) e sempre o **Caixa**. Sem nada, aparece "Nenhum prazo nesta semana"</li><li>**Na semana do amistoso,** a seção "Amistoso" com o placar e as lesões confirmadas</li><li>**Com várias semanas** (avançar até o jogo): "As semanas avançaram." e o aviso "N amistosos ficaram sem ser jogados"</li></ul>Botão único: "Continuar" → Início |
| **Pré-jogo de amistoso** ("Entre em campo.") | "Ir para o amistoso" (pré-temporada), ou a linha "Amistoso desta semana" do Início (julho, opcional) | <ul><li>"Não vale pontos; lesões contam."</li><li>Confronto com escudos</li><li>**Convites:** os 3 clubes, com escudo e divisão, um selecionado por vez. Tocar grava a escolha</li><li>**Seu time:** formação atual e "Escalação · Revisar"</li><li>"Iniciar amistoso", que abre a Partida da v2</li><li>Na pré-temporada, "Voltar ao clube" (→ Início)</li><li>Em julho, sem convite aceito: "Escolha um convite" (inativo) e "Avançar sem amistoso"</li></ul> |
| **Partida e Resultado do amistoso** | "Iniciar amistoso" | <ul><li>As telas aprovadas na A1–A4, com o kicker "Amistoso"</li><li>Sem "Ver tabela"</li><li>"Continuar" vai para a Semana concluída, porque o amistoso fecha a semana, como na versão anterior</li></ul> |
| **Avançar até o próximo jogo** | Texto embaixo do botão principal do Início, nas semanas sem jogo com mais de uma semana até o jogo ou com amistoso no caminho | <ul><li>Sem amistoso no caminho, avança direto</li><li>Com amistoso, abre a confirmação "Pular os amistosos?" ("Avançar até o próximo jogo passa 4 semanas de uma vez. Os 3 amistosos do caminho não serão jogados."), com "Voltar" em destaque e "Avançar mesmo assim"</li></ul> |
| **Notícias** ("Nos bastidores.") | Linha "Notícias do clube" do Início, que agora aparece sempre (sem notícia: "Nenhuma notícia ainda") | <ul><li>Ano, clube e "Temporada em andamento"</li><li>**Seu elenco:** lesionados e suspensos, com a rodada de volta, ou "Elenco 100% disponível"</li><li>**Manchetes,** sem seta, com tipo, rodada e temporada. As do seu clube vêm marcadas "Seu clube"</li></ul>"Voltar ao clube" → Início |
| **Avisos (sino)** | Sino no topo do Início, com o número de não lidos | <ul><li>Folha "Avisos" com ícone em traço por tipo (calendário, lesão, proposta, posição, olheiro, loja, partida), o texto e "há 2 h"</li><li>Abrir marca tudo como lido e grava, como na versão anterior</li><li>Os novos continuam destacados enquanto a folha está aberta</li></ul> |

**Capturas** (pasta `evidencias/F3-semana/`, 390×844):
- `01-inicio-amistoso-sino.png`;
- `02-avisos.png`;
- `03-noticias.png`;
- `04-amistoso.png`;
- `05-resultado-amistoso.png`;
- `06-semana-concluida.png`;
- `07-amistoso-opcional.png`;
- `08-pular-amistosos.png`.

**Comparativos prancha × v2:**
- `comparativo-01-semana-concluida.png`;
- `comparativo-02-amistoso.png`;
- `comparativo-03-noticias.png`.

## Motor (ponte), sem regra nova
Comandos novos, todos com as funções da versão anterior:
- **`avancarSemana(ateJogo)`:** o mesmo laço do "Avançar semana" e do "Pular para o jogo" (`advanceCalendarFromUI`, `runCalendarOffWeek`, amistosos do caminho abertos mão). Grava e devolve o resumo da semana. Recusa:
  - a semana de jogo;
  - a semana de amistoso obrigatório (só pelo "avançar até o jogo").
- **`escolherAmistoso(id)`:** a mesma regra de `pickFriendlyOpponent`; grava.
- **`iniciarAmistoso()`:** `startFriendlyLive`. O fim do amistoso (`finishFriendlyLive`) agora guarda o retorno do turno da semana, para montar o resumo. É a única linha alterada fora da ponte, e não muda o resultado.
- **`resumoSemana()`:** só leitura.
- **`marcarAvisosLidos()`:** o mesmo efeito de abrir a central de notificações; grava.

**Se a gravação falha,** a v2 recarrega o motor. A memória dele não fica com uma semana que o servidor não tem, e "Tentar novamente" não avança duas vezes.

## Divergências e pontos para sua avaliação
1. **Barra inferior:** a prancha mostra a barra nas três telas. Semana concluída, Pré-jogo de amistoso e Notícias seguem o padrão das telas internas já aprovadas (Diretoria, Finanças, Pré-jogo), com rodapé fixo e sem barra.
2. **Seção "Amistoso"** no topo da Semana concluída, na semana do amistoso. Não está na prancha, mas é o resultado real do jogo da semana.
3. **"Bilheteria do amistoso"** em Prazos e finanças. É a receita real (30% de um jogo oficial).
4. **Notícias sem ícone de jornal** em cada linha: a prancha usa o mesmo ícone em todas, e sem a seta ele não acrescenta nada. Se preferir, eu ponho.
5. **Sino ao lado do escudo** no topo do Início.

## Testes
- **Unitários:** 78/78 (11 novos em `domain/week.test.ts`).
- **`tsc`:** limpo.
- **Novo `tests/e2e/test_v2_semana.js`,** com 8 verificações:
  1. Avançar semana pela v2, com o caixa da tela igual ao do save, +1 semana, e recarregar não avança outra;
  2. "Continuar" volta ao Início;
  3. amistoso completo: convites, escolha gravada, partida sem "Ver tabela", semana com placar, save jogado e rodada igual;
  4. amistoso opcional;
  5. avançar até o jogo, com a confirmação;
  6. Notícias;
  7. sino;
  8. 360 px, alvos ≥ 44 px e nenhuma navegação por `/carreira-old`.
- **Ajustado:** `test_v2_inicio.js` 3c ("Avançar semana" agora vai para `/carreira/semana?avancar=semana`).
- **Resultados:**
  - E2E da v2: 20/20;
  - amistosos e calendário da versão anterior (`test_ge_calendar_001*`): 3/3;
  - suíte completa: 176/177.
- **A falha da suíte completa é instável e não é desta entrega.** O `test_h2h` (versão anterior, tabela) falhou sob carga e passa sozinho (2/2). É o mesmo padrão das rodadas anteriores.
