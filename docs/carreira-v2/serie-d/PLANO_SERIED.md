# Plano — SERIED-001 (catálogo da Série D e Copa do Brasil)

**Data:** 13/11/2026
**Origem:** `docs/carreira-v2/serie-d/03_Catalogo_e_Integracao.md` e o catálogo `serie_d_40_clubes.json`/`.csv` (40 clubes, edição 2026), sem alteração.
**Situação:** aguardando as decisões do Murilo (seção 5).

## 1. O que já existe (motor e v2)

- **Série D de exemplo:**
  - são 20 clubes em `DEMO_TEAMS_SERIE_D` (`public/js/data.js`), com sigla, cores, força (atk/def) e estádio;
  - na carreira nova, eles formam `CAREER.serieDPool` (`motor/virada.js`, `initDivisionSystem`).
- **Acesso e descenso:**
  - `applyPromotionRelegation` (com `motor/temporada.js`) troca 4 da C com 4 da D a cada virada;
  - quem sobe ganha elenco fictício (`buildLeagueSquad`), quem desce perde o elenco;
  - a D não tem calendário nem tela.
- **Copa do Brasil (formato expandido):**
  - entram os 60 clubes de A, B e C;
  - 4 cabeças de chave pulam a 1ª fase, e os outros 56 jogam a fase 1;
  - depois vêm 32 avos, oitavas, quartas, semi e final, todas em ida e volta;
  - as datas estão fixas nas rodadas 3/6, 9/12 e assim até 33/36 (`CUP_ROUNDS_EXPANDED`, em `motor/fechamento.js` e na v2);
  - **a D não joga a Copa hoje.**
- **v2:** a Copa já aparece no hub Jogos (`domain/games.ts`) e no calendário (`domain/calendar.ts`).
- **Histórico da Copa:**
  - o save guarda só a edição atual (`CAREER.cup`) e os totais do técnico (`careerTotals.copa*`);
  - não há chave, resultados nem campeão por edição.

## 2. O catálogo contra o que existe

- 40 clubes, com id estável (`manaus-am`), nome, cidade, UF e estádio de um mando de 2026, sempre com a fonte da CBF.
- **Não traz** sigla, cores nem força. O escudo está como `pendente` em todos os 40.
- **4 clubes do catálogo já estão na nossa Série C:** ABC (RN), Retrô (PE), CSA (AL) e Tombense (MG).
  - Na carreira, eles estão ativos na C, e o documento pede para não duplicar.
- **9 clubes do catálogo já estão na D de exemplo**, com outro id: Manaus FC, São Raimundo, Aparecidense, Brasiliense, Gama, Treze, Sergipe, Joinville e Brasil de Pelotas.
  - Desses, aproveitamos as cores e a força. O id passa a ser o do catálogo.
- Os outros 11 da D de exemplo não estão no catálogo de 2026 e saem do conjunto em carreiras novas.

## 3. Lacunas por item do documento

| Item | Lacuna |
|---|---|
| Catálogo | A D usa 20 clubes de exemplo, e não os 40 reais. Falta sigla, cores e força para 31 clubes. |
| Escudos | Nenhum dos 40 está verificado. O documento só considera a integração completa com cada escudo verificado em fonte oficial e empacotado no jogo. |
| Regra 1 (acesso e descenso) | Já existe. Falta manter id, identidade e estado de quem sobe e desce, com os ids do catálogo. |
| Regra 2 (resolver antes do sorteio; saves) | A carreira nova monta a D na criação. Falta a migração de saves existentes (ver decisão 4). |
| Regra 3 (Copa com A/B/C + D) | São 96 clubes (60 + 36 da D ativa). O formato atual leva 60 a 32. Com 96, precisa de uma fase a mais (ver decisão 2). |
| Regra 4 (Copa no hub; histórico por edição; seguir até a final) | O hub e o "seguir até a final" já existem. Falta guardar chave, resultados, estatísticas e campeão de cada edição, separados das ligas. |
| Regra 5 (modo avião, 10 temporadas, medidas) | O modo avião depende da OFFLINE-001 (próxima demanda). Agora: simulação de 10 temporadas sem tela (acesso, descenso, Copa, eliminação cedo, salvar e reabrir) com tempo, memória e tamanho do save. |

## 4. Proposta de solução

**Dados:**
- `public/js/data.js` ganha `CATALOGO_SERIE_D`, gerado a partir do JSON, com:
  - id do catálogo;
  - nome, UF e estádio;
  - sigla, cores e força: dos 9 que já existiam, os mesmos; dos outros 31, sigla de 3 letras e força por faixa;
  - marca "parâmetro de jogo" em força e orçamento, como pede o documento;
  - origem do escudo.
- Script `scripts/serie_d_catalogo.js`: gera o bloco de dados a partir do JSON e confere o catálogo:
  - ids únicos;
  - os 4 que já estão na C mapeados;
  - nenhum hotlink de escudo.

**Motor:**
- **Montagem da D:** `initDivisionSystem` monta a D pelo catálogo, sem os clubes que já estão em A/B/C. São 36 ativos no início.
- **Acesso e descenso:** continuam como hoje. Um clube que sobe para a C e depois cai mantém id, nome e força.
- **Copa:** nova fase preliminar (decisão 2). O sorteio e o chaveamento são validados por teste com 96 clubes, e com qualquer total entre 60 e 100.
- **Histórico:** `CAREER.copaHistorico` guarda por edição o campeão, o vice, a fase do técnico e os placares do técnico. É pequeno e limitado (15 edições, como `MAX_SEASON_HISTORY`).

**v2:**
- no hub Jogos, as edições passadas da Copa (campeão e campanha);
- a preliminar aparece no calendário e na Copa;
- o escudo provisório aparece onde não houver escudo (decisão 3).

**Testes:**
- motor: catálogo, montagem da D, chaveamento com 96 e 10 temporadas sem tela com as medidas;
- v2: hub e calendário com a fase nova.

## 5. Decisões pedidas

1. **Os 4 clubes do catálogo que já estão na nossa Série C** (ABC, Retrô, CSA, Tombense).
   - Recomendado: continuam na C. O catálogo os mapeia pela identidade e UF, e a D ativa começa com 36.
   - Alternativa: tirá-los da C e repor a C com outros clubes, o que muda a Série C de hoje.
2. **Formato da Copa com 96 clubes.**
   - Recomendado: fase preliminar em jogo único, na rodada 1, com 64 clubes (os 36 da D, os 20 da C e os 8 mais fracos da B). Os 32 vencedores enfrentam os outros 32 (12 da B e 20 da A) na fase 1, que segue como hoje.
   - Com isso, os 4 cabeças de chave deixam de pular a fase 1.
   - Alternativa: preliminar em ida e volta. Isso exige mudar as datas de todas as fases.
3. **Escudos.** Daqui não consigo verificar com segurança o escudo oficial de cada clube. O documento também proíbe depender de link externo.
   - Recomendado: um escudo provisório gerado no jogo (sigla com as cores), marcado como "provisório" no catálogo. A integração fica parcial até você enviar os 40 arquivos verificados, com a origem de cada um. Quando chegarem, eu os empacoto e marco "verificado".
   - Alternativa: não integrar a D até os escudos chegarem.
4. **Saves existentes.** Em 12/11 você decidiu que os saves antigos serão descartados.
   - Recomendado: só carreiras novas recebem o catálogo. As existentes continuam com a D de exemplo, sem migração.
   - Alternativa: migrar as correspondências inequívocas (os 9 clubes que já existiam), como sugere o documento.

## 6. Entrega

Um PR com commits separados:
1. dados e script;
2. montagem da D;
3. Copa com a fase nova;
4. histórico por edição;
5. v2;
6. simulação de 10 temporadas e medidas.

O relatório fica no handoff. O merge espera a aprovação do Murilo.
