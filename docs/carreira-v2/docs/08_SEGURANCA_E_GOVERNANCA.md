# 08 — Governança de implementação
- Não utilizar Railway Agent, diagnósticos por IA pagos ou ações equivalentes.
- Não fazer deploy, push, PR, merge, alterações de domínio ou DB sem autorização explícita.
- Não substituir `public/carreira.html` enquanto a v2 não for aprovada.
- Não expor tokens/segredos em frontend, logs, fixtures ou screenshots.
- Preservar dados pessoais e saves; anonimizar evidências.
- Não alterar motor, API ou schema silenciosamente. Documentar mudanças e impacto.
- Testes automatizados e screenshots reais obrigatórios por fase.
- Reverter facilmente via feature flag/rota anterior; documentar rollback.
- As especificações antigas são fonte de requisitos, mas a diretriz atual de novo frontend e as limitações dos assets prevalecem.
