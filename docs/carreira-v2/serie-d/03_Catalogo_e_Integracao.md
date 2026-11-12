# Catálogo Série D — integração com o universo da carreira

A Série D é simulada em segundo plano. O treinador pode assumir clubes das Séries A, B e C. Os 40 clubes reais do catálogo podem enfrentar o jogador na Copa do Brasil e se tornar elegíveis quando entrarem na Série C. Somente os elencos são fictícios. Força e orçamento simulados devem ser identificados como parâmetros de jogo.

## Catálogo

Os arquivos JSON e CSV contêm o mesmo recorte de 40 participantes da Série D de 2026. Os nomes de exibição foram normalizados. O estádio é um **mando publicado para um jogo da edição de 2026**, com município e número do jogo como evidência. Alguns mandos podem ser temporários. Use o campo como referência inicial de mando, sem presumir propriedade ou sede permanente.

- IDs são estáveis, independentes de fornecedor, temporada ou divisão. Antes da integração, mapear clubes já existentes por identidade e UF e evitar duplicação com as Séries A, B e C.
- Os escudos binários e a validação de nome oficial completo, fundação e cores permanecem pendentes. O catálogo informa esse estado; a integração só está completa após verificar cada escudo em fonte oficial do clube, federação ou CBF, registrar origem e empacotar o arquivo localmente. Verificar homônimos e versões do escudo. Não depender de hotlinks em execução.
- A fonte primária está em cada registro. [Tabela detalhada da CBF](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/Tabela_Detalhada_Brasileiro_Serie_D_2026_1f9d105d94.pdf)

## Regras de temporada e Copa

1. Reutilizar o fluxo existente de acesso e descenso. Simular a D sem calendário jogável ou tela de seleção de treinador. Clubes que descem da C continuam existindo com a mesma identidade. Clubes promovidos mantêm ID, identidade e estado esportivo.
2. Resolver os clubes e os respectivos assets antes de gerar calendário, sorteio ou primeira rodada. Em saves existentes, migrar somente correspondências inequívocas e manter o histórico anterior.
3. Na Copa do Brasil, inscrever uma vez cada clube ativo de A/B/C e cada clube ativo do conjunto da D. Um clube promovido ocupa uma vaga pela sua divisão atual, sem nova inscrição pelo catálogo. Usar o formato existente se suportar a quantidade; caso contrário, propor preliminares e validar o chaveamento. A D pode jogar a Copa mesmo sem ser jogável como liga.
4. Destacar Copa no hub Jogos. Manter chave, resultados, estatísticas e campeões por edição, separados das ligas. Avançar jogos da Copa pelo calendário até a final mesmo após a eliminação do usuário.
5. Validar uma carreira nova em modo avião e simular 10 temporadas com acesso, descenso, eliminação precoce na Copa e restauração do save. Conferir rodada 1 com nome, escudo e estádio corretos e medir tempo de avanço, memória e tamanho do save. Materializar elencos conforme necessário e evitar regenerar jogadores a cada abertura.

## Sequência para o Claude

Conferir branch e versão atuais. Ler os documentos 01 e 02 e implementar em commits separados, seguindo a regra de escopo do motor e da interface vigentes no repositório. Validar em homologação e no iPhone. O documento 03 define o contrato do catálogo e da integração com a Copa; manter esse trabalho separado das correções da Fase 1. Não usar Railway Agent.
