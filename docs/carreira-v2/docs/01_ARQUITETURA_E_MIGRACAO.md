# 01 — Arquitetura e migração segura
## Estado atual a preservar
- `public/carreira.html`: interface antiga; manter disponível.
- `public/js/carreira.js`: lógica de interface **misturada** com regras de simulação e estado CAREER.
- `server/src/careerStore.js`: persistência do estado da carreira; preservar formato e migração reversível.
- Rotas `/api/auth/*`, `/api/career/*` e outras: inventariar em código, não assumir contratos.
- Reutilizar catálogo de times, escudos e serviços existentes. Sem duplicar motor de futebol.
## Alvo
Frontend React + TypeScript + Vite (proposta sujeita a compatibilidade com o servidor existente). SPA servida em rota separada.
Camadas: `ui` (componentes) → `features` (casos de uso) → `adapters` (contratos API/legado) → serviços existentes.
Extrair gradualmente funções puras do motor atual para módulo compartilhado testado. Não importar `carreira.js` como script global no React nem copiar suas regras.
Camada de compatibilidade com serialização/deserialização da carreira: testes de equivalência com saves reais anonimizados, sem alterar estado persistido na leitura.
Modelo de estado: query/cache remoto para API; estado efêmero de interface isolado; saves somente via mecanismos existentes.
## Estratégia
1. Mapear handlers, eventos, rotas, campos CAREER, persistência e side effects.
2. Criar `docs/IMPLEMENTACAO_INVENTARIO_REAL.md` com rastreabilidade.
3. Contratos TS e adaptadores + testes, antes de telas complexas.
4. Montar shell responsivo, Dashboard real, jogo real.
5. Migrar capítulo a capítulo; feature flag/rota paralela.
6. Só propor cutover após QA, rollback testado e autorização.
## Restrições
Sem alteração destrutiva de DB, sem recriar carreiras, sem gravar no mesmo save por duas implementações simultaneamente sem controle de versão/conflito.
Verificar cookies, CORS, CSRF, token, refresh e expiração de sessão na mesma origem.
