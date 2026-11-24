# MUNDO-001 — Requisitos de produto

**Demanda:** ligas europeias e sul-americanas jogáveis, rodando em paralelo
num mesmo mundo, com competições continentais.
**Origem:** pedido do Murilo (24/11/2026) e três pacotes de dados anexos,
guardados sem alteração em `docs/mundo/pacotes/`:

| Pacote | Conteúdo |
|---|---|
| `europa/` | 10 ligas (1ª e 2ª de Inglaterra, Espanha, Itália, Alemanha e França), 198 clubes, 5.755 jogadores, 3.758 jogos, 162 clubes de 3ª divisão (catálogo), escudos |
| `sul-america/` | 10 ligas (1ª e 2ª de Argentina, Chile, Colômbia, Equador e Uruguai), 192 clubes, 6.659 jogadores, 3.392 jogos, 143 clubes de 3ª divisão (catálogo), escudos |
| `continentais/` | Regras, desempates, acesso, calendários e premiação de Champions, Europa League, Conference, Libertadores e Sul-Americana. Só regras e calendários, sem clubes |

Os dados pesados (JSON, CSV, planilhas e escudos) entram no repositório na
etapa M1 (ver `02_Plano_de_execucao.md`), no lugar que o jogo lê.

---

## 1. Objetivo

Passar de "um Brasil com 3 divisões" para **um mundo de 25 ligas**:

- Brasil, com Séries A, B e C, como hoje;
- 5 países europeus e 5 sul-americanos, com 1ª e 2ª divisão cada.

O jogador escolhe onde começar e todas as ligas acontecem em paralelo. Isso abre:

- trocar de clube entre países, com propostas de emprego de fora;
- contratar e vender no mundo todo;
- jogar Libertadores, Sul-Americana, Champions, Europa League e Conference.

Ciclo do jogo (CLAUDE.md, seção 11): entra em **Calendar**, **Match**,
**Standings**, **Market** e **Board / Objectives**. É a camada "WORLD AI"
da visão (seção 50).

## 2. Decisões do Murilo (24/11/2026)

| # | Pergunta | Decisão |
|---|---|---|
| D1 | Detalhe das ligas fora do país do jogador | **Híbrido.** O país do jogador tem a simulação completa de hoje (PARIDADE-CPU: jogadores, cartões, lesões, finanças da CPU). Os demais países têm resultados, tabela, fases, acesso e queda, e os elencos reais ficam disponíveis no mercado, com evolução dos atletas na virada. |
| D2 | Formatos sul-americanos | **Fiéis desde o início:** Apertura/Clausura, promedios, quadrangulares, hexagonais, Intermedio, reducido e finais, conforme `pacotes/sul-america/01_Regulamentos_e_Calendario.md`. |
| D3 | Competições continentais | **Junto com as ligas,** na mesma liberação. São implementadas em etapas próprias, mas só vão para o menu com as ligas. |
| D4 | Saves existentes | **Só saves novos.** Os saves brasileiros de hoje continuam com o mundo de 3 divisões, sem migração. |

## 3. Escopo

### 3.1 Ligas e países

| País | Divisões jogáveis | Clubes | 3ª divisão (catálogo) |
|---|---|---:|---|
| Brasil | Série A, B, C | 60 | Série D (já existe) |
| Inglaterra | Premier League, Championship | 44 | 24 |
| Espanha | LaLiga, LaLiga Hypermotion | 42 | 40 |
| Itália | Serie A, Serie B | 40 | 60 |
| Alemanha | Bundesliga, 2. Bundesliga | 36 | 20 |
| França | Ligue 1, Ligue 2 | 36 | 18 |
| Argentina | Liga Profesional, Primera Nacional | 66 | 59 |
| Chile | Liga de Primera, Liga de Ascenso | 32 | 14 |
| Colômbia | Primera A, Primera B | 36 | 25 |
| Equador | LigaPro Serie A, Serie B | 28 | 16 |
| Uruguai | Primera División, Segunda División | 30 | 29 |
| **Total** | **23 divisões** | **450** | |

A 3ª divisão de cada país é catálogo de reposição, não jogável, como a
Série D hoje.

### 3.2 Requisitos

**Catálogo e dados (MUN-01 a MUN-04)**

- **MUN-01. Catálogo do mundo no jogo.**
  - As 20 ligas novas usam os snapshots dos pacotes, no provedor congelado.
  - Os escudos são servidos localmente pelo jogo.
  - Os IDs numéricos dos pacotes ficam como estão. Não colidem entre si
    nem com o Brasil: Europa 800–820 mi, América do Sul 820–870 mi.
  - O jogo funciona sem rede depois de baixar o catálogo (OFFLINE-001).
- **MUN-02. Força comparável entre ligas.**
  - Um clube médio da Premier League tem elenco mais forte que um médio da
    Série A, que tem elenco mais forte que um médio da Liga de Ascenso.
  - O overall dos jogadores passa a usar o nível da liga
    (`gameplayLevel`/`index` dos pacotes), na mesma escala para o mundo
    todo. Sem isso, o mercado e as copas continentais não fazem sentido.
  - Os saves brasileiros antigos não mudam.
- **MUN-03. Vínculos duplicados.**
  - Um atleta que aparece em mais de um clube (`vinculos-a-conferir.json`)
    existe uma vez só no mundo, no vínculo mais recente.
  - A regra fica documentada e testada.
- **MUN-04. Uma moeda de jogo.**
  - O motor guarda todo valor numa unidade só, o R$ de hoje.
  - Os seeds em USD, EUR e GBP são convertidos por uma tabela de câmbio fixa
    e versionada.
  - A tela mostra a moeda do país do clube do jogador, com o mesmo valor
    em todas as telas: ofertas, salários, extrato, prêmios e mercado.
  - Uma transferência entre países usa o mesmo valor nas duas pontas.

**Calendário e formatos (MUN-05 a MUN-08)**

- **MUN-05. Relógio do mundo por data.**
  - Cada jogo tem uma data e o mundo avança por data, não por "rodada 1–38".
  - Europa joga de agosto a maio. Brasil e América do Sul jogam de janeiro
    a dezembro.
  - Cada liga vira a temporada na própria data de encerramento. A virada
    não é mais global.
  - O avanço do jogador vai até o próximo compromisso dele. Os outros
    jogos até essa data são simulados no caminho.
- **MUN-06. Início do save.**
  - O mundo começa na data de início da liga escolhida.
  - As ligas que já estariam em andamento nessa data são pré-simuladas até
    ela, de forma leve, na criação do save.
  - As tabelas começam zeradas e os placares de referência dos pacotes são
    só consulta.
- **MUN-07. Formatos fiéis por regulamento.**
  - Cada liga é descrita por configuração: fases, grupos, turnos, tabela
    anual, promedio/média de pontos, reducido, quadrangulares, hexagonais
    com pontos carregados, playoffs, playout e confronto entre divisões.
  - Desempates por perfil (confronto direto, gols fora, fair play, sorteio).
  - O campeão nacional sai do regulamento, não só do líder da fase regular.
  - Os perfis do Brasil continuam como estão.
- **MUN-08. Virada por país.**
  - Acesso e queda são aplicados numa transação lógica única, depois das
    fases decisivas.
  - Os clubes B não sobem para a divisão do clube principal.
  - O catálogo de 3ª divisão é sorteado de forma determinística, sem
    repetição.
  - Clube do catálogo promovido sem elenco ganha elenco fictício (22+, 2
    goleiros), como a Série D.
  - O clube do jogador é protegido na divisão jogável mais baixa, com a
    exceção registrada no resumo.

**Simulação e mercado (MUN-09 a MUN-11)**

- **MUN-09. Simulação híbrida (D1).**
  - O país do clube do jogador roda a PARIDADE-CPU completa.
  - Os outros países rodam com o modelo leve:
    - placar pela força de jogo, com a mesma seed;
    - tabela, fases e virada;
    - artilharia agregada por clube;
    - evolução, envelhecimento, contratos e aposentadoria dos atletas na
      virada.
  - Ao trocar de país, o novo país passa para a simulação completa a partir
    da próxima rodada dele e o antigo passa para a leve, sem perder elenco,
    contratos nem caixa.
- **MUN-10. Mercado do mundo.**
  - A busca do mercado alcança os 450 clubes por índice (país, liga,
    posição, idade, valor).
  - A CPU de cada país compra e vende dentro do próprio país e, com menor
    frequência, entre países, com o mesmo modelo de decisão
    (PARIDADE-CPU, MER-04).
  - O atleta considera país, liga e divisão na decisão.
  - As janelas de transferência são as de cada país, pela data do mundo.
- **MUN-11. Carreira do técnico no mundo.**
  - Propostas de emprego vêm de qualquer país, pela reputação do técnico e
    pelo nível da liga.
  - Aceitar uma proposta muda o país ativo (MUN-09).

**Continentais e telas (MUN-12 a MUN-15)**

- **MUN-12. Libertadores e Sul-Americana.**
  - Seguem `pacotes/continentais`: fases 1–3, grupos, transferências entre
    torneios, oitavas com mando pelo vencedor do grupo, pênaltis no
    mata-mata e premiação idempotente.
  - Os classificados saem das ligas do save (Brasil + 5 países).
  - Os países sem liga jogável (Bolívia, Paraguai, Peru, Venezuela)
    entram com clubes da CPU. Ver a dependência DEP-1.
- **MUN-13. Champions, Europa League e Conference.**
  - Fase de liga de 36 clubes (8 rodadas, potes, limites por federação),
    mata-mata com caminho de seeds e transferências entre torneios.
  - Os classificados das 5 ligas vêm do save. As outras associações
    europeias entram com clubes da CPU. Ver DEP-1 e DEP-2.
- **MUN-14. Novo save: seletor país → divisão → clube.**
  - Fica na v2 (`carreira-v2/`), com os dados de cada liga (nível, moeda,
    calendário).
  - O Brasil continua como primeira opção.
- **MUN-15. Telas da v2.**
  - Calendário com datas e mais de um compromisso por semana.
  - Tabela por fase e grupo, tabela anual e promedio.
  - Consulta das outras ligas do mundo (tabela, resultados, clubes).
  - Chaves e grupos continentais.
  - Mercado com filtros de país e liga.
  - Tudo pelo DS (M3 + BRDATA), mobile first.

## 4. Fora de escopo

- Copas nacionais estrangeiras (FA Cup, Copa del Rey etc.). A Copa do
  Brasil continua como está.
- Ligas além das 25 listadas e 3ª divisão jogável.
- Inscrição UEFA fiel (lista A/B, formação local) e premiação UEFA pela
  circular 2026/27, que o pacote não traz. Entram como regra simplificada
  documentada: lista de 25 e premiação por fase em tabela de jogo.
- Migração de saves antigos (D4).
- Fotos de jogadores europeus e sul-americanos (os pacotes não têm).

## 5. Dependências e bloqueios

- **DEP-1. Clubes de associações sem liga jogável.**
  - A Libertadores e a Sul-Americana precisam de 32 clubes de Bolívia,
    Paraguai, Peru e Venezuela (4 + 4 por país).
  - A UEFA precisa de clubes de ~50 associações (Portugal, Países Baixos
    etc.).
  - Nenhum pacote traz esses clubes.
  - Proposta: um 4º pacote de dados, no mesmo formato (nome, escudo,
    força, estádio, elenco ≥ 23), só para os clubes continentais.
  - Alternativa de produto: nome real com elenco fictício gerado, marcado
    como tal (como a Série D).
  - **Decidido pelo Murilo (24/11/2026):**
    - CONMEBOL: o 4º pacote (Bolívia, Paraguai, Peru e Venezuela, guardado
      em `pacotes/bol-par-per-ven/`) entra só nas copas. As 4 primeiras
      divisões (60 clubes, elencos reais) são clubes da CPU na
      Libertadores e na Sul-Americana. Os classificados de cada ano saem de
      uma tabela anual simulada de forma simples. A força é estimada pelo
      elenco, porque o pacote não traz força, finanças nem jogos. Não há
      liga jogável nem segundas divisões nesses países.
    - UEFA: as associações fora das 5 ligas entram com nome real e elenco
      fictício (como a Série D), com força estimada.
- **DEP-2. Acesso UEFA por associação.**
  - O pacote continental não traz o Anexo A da UEFA nem os coeficientes em
    JSON.
  - Proposta: tabela de jogo fixa e versionada para as 5 associações
    jogáveis (vagas por posição da liga). As outras vêm da DEP-1.
  - **Decidido pelo Murilo (24/11/2026): tabela de jogo fixa, abaixo.**
  - Vagas por posição na liga:
    - Inglaterra, Espanha, Itália e Alemanha: 1º ao 4º na fase de liga da
      Champions, 5º e 6º na Europa League, 7º no playoff da Conference;
    - a 5ª associação do ranking (suposta a França; conferir na fonte
      antes de implementar): 1º ao 3º na fase de liga da Champions, 4º no
      qualificatório, 5º e 6º na Europa League, 7º no playoff da
      Conference.
    - Sem copas nacionais, a vaga do campeão da copa vai para o 6º.
  - Desempenho europeu: um coeficiente de jogo por associação (resultados
    europeus das últimas 5 temporadas do save). As 2 melhores da temporada
    ganham +1 vaga na Champions, para o 5º colocado.
  - Campeões da Champions e da Europa League: vaga na Champions do ano
    seguinte. Se já tiverem vaga pela liga, ela passa ao próximo da tabela.
  - Potes: pelo coeficiente do clube no save (na 1ª temporada, a força do
    pacote; depois, os resultados europeus). Sorteio pelas regras do pacote
    continental.
  - As vagas das outras associações dependem da DEP-1.
- **DEP-3. Promedios da 2ª uruguaia (2025).**
  - O pacote avisa que falta a tabela oficial consolidada.
  - Proposta: começar sem histórico, como estado próprio e não como zero
    ponto. Os pontos contam a partir da 1ª temporada do save.

## 6. Critérios de aceite (liberação)

1. Criar uma carreira em cada um dos 11 países, em cada divisão jogável,
   sem rede depois do catálogo baixado. Abrir escalação, calendário,
   tabela, mercado e extrato.
2. Cada liga começa com zero ponto e cada clube joga o número de jogos do
   regulamento (34, 38, 42 ou 46 nas europeias; por fase nas sul-americanas).
3. Testes pequenos e determinísticos para os eventos que mudam a
   implementação:
   - Europa: playoff de 8 no Championship, vantagem espanhola, limiares
     italianos de 14 e 4 pontos, confronto alemão entre divisões, playoffs
     franceses e restrição dos clubes B;
   - Argentina: dois descensos por critérios distintos;
   - Chile: Liguilla;
   - Colômbia: quatro cenários de acesso na B;
   - Equador: hexagonais com pontos carregados;
   - Uruguai: promedios e final anual.
4. Uma temporada inteira do mundo (todas as 25 ligas) fecha sem erro.
   Atleta, contrato e histórico sobrevivem ao acesso, à queda e ao reload.
   A reposição é determinística e sem duplicata, e o clube do jogador fica
   protegido.
5. Continentais:
   - cada torneio CONMEBOL tem 96 jogos de grupos;
   - a fase de liga UEFA tem 144 jogos (Champions e Europa League) e 108
     (Conference), com adversários distintos e metade em casa;
   - a premiação não duplica em retentativa.
6. Troca de emprego entre países: o país novo passa à simulação completa e
   o antigo à leve, sem perda de dados.
7. Desempenho e save, no pior caso (técnico na Argentina, com todas as
   ligas e continentais ativos):
   - p95 do avanço de semana no celular no máximo 1,5× a linha de base de
     hoje (RELATORIO_FINAL da PARIDADE-CPU);
   - save comprimido abaixo de 384 KB (metade do limite de 768 KB);
   - JSON enviado abaixo do limite do corpo.
8. A suíte atual do Brasil passa sem mudança de comportamento em save
   brasileiro, com `npm run test:full` verde.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Save cresce ~8× com 450 clubes e ~14 mil atletas | Simulação leve fora do país ativo. Catálogo estático fora do save: o save guarda só a identidade e o que mudou (delta por atleta). Medição a cada etapa. |
| Avanço lento no iPhone | Leve = só placar e tabela por jogo. Trabalho pesado só na virada de cada país. Medição p50/p95 por etapa. |
| Refatorar o loop de rodada para relógio por data quebra o Brasil | Etapa M2 com equivalência: o save brasileiro antigo roda no caminho de hoje e o novo save no Brasil dá os mesmos resultados com a mesma seed. |
| Formatos fiéis têm muitas exceções | Motor de fases declarativo, um teste por evento do aceite 3 e regras por configuração, não por `if` de país. |
| Clubes continentais sem dados (DEP-1) | DEP-1 e DEP-2 decididas em 24/11/2026. A força dos clubes estimados precisa de calibração e de medição na M9/M10. |
