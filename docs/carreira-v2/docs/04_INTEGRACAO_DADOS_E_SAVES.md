# 04 — Contratos de integração e proteção de carreiras
## Inventário antes de codificar
Mapear `CAREER`, autenticação, endpoint de leitura/gravação, competição, calendário, elenco, tática, partida, mercado, finanças e conquistas; documentar request/response real, status HTTP, versionamento e casos de erro.
Não presumir que o backend calcula a simulação: grande parte da lógica está no cliente legado.
## Estratégia anticorrupção
`CareerGateway`: `listSaves`, `loadSave`, `saveCareer` com pré-condições/versionamento; `SessionGateway`; `ClubCatalogGateway`; `GameEnginePort` para ações reais.
Criar fixtures anonimizadas: save novo, antigo, meio de temporada, fim de temporada, multi-divisão, clube trocado, mercado pendente, jogo em andamento.
Testes round-trip JSON sem perda de campos desconhecidos; comparar motor legado vs extraído para mesma seed/estado.
Em escrita, impedir duplicidade de comandos por double tap e conflitos; sem migração irreversível.
## Critérios
Login existente, retorno de sessão, carregar save sem mutação, editar escalação e salvar, simular partida e persistir, reabrir carreira e verificar invariantes.
Não criar API paralela ou novo schema sem justificativa documentada e aprovação.
