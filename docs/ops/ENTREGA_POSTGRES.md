# Entrega: contas, sessões e carreiras no Postgres

- **Data:** 08/11/2026.
- **Branch:** `postgres`, a partir de `main`.
- **Status:** aprovado pelo Murilo (08/11).
- **Plano:** `PLANO_POSTGRES.md`, aprovado em 08/11.

**Decisões aplicadas:**
- **Escopo:** contas, sessões e carreiras juntas.
- **Migração:** cópia única conferida, com os arquivos intocados.
- **Duas abas:** ficam para depois.
- **Testes:** usam banco também.

## Resultado principal
Com a variável `DATABASE_URL`, o servidor guarda contas, sessões e carreiras no Postgres. Sem ela, continua nos arquivos, como sempre. Por isso o código pode ir para a `main` antes de o banco existir: o HML publica sozinho e segue em arquivo até você colocar a variável.

- **O que fica igual:** a memória continua sendo a fonte de leitura, e as funções de `users.js`, `sessions.js` e `careerStore.js` não mudaram. O `server.js`, a API e o jogo não percebem a troca.
- **Gravação por registro:** cada mudança grava **só o registro que mudou** (inserir, atualizar ou apagar), numa transação, na mesma janela de 800 ms de hoje. Antes, o arquivo inteiro, com as carreiras de todas as contas, era regravado. Os registros que mudaram são achados comparando cada um com o que foi gravado da última vez, por um resumo (hash).
- **Na subida:** o servidor cria as tabelas (`contas`, `sessoes`, `carreiras`, todas `(chave, dados json, atualizado_em)`), faz a cópia conferida e carrega a memória do banco, antes de aceitar requisições.
- **Ao desligar:** espera as gravações pendentes no banco.

| Arquivo | O que é |
|---|---|
| `server/src/db.js` | conexão (`pg`, só com `DATABASE_URL`) |
| `server/src/persistencia.js` | arquivo ou banco, gravação por registro, cópia conferida e carga |
| `server/src/users.js`, `sessions.js`, `careerStore.js` | trocaram o `scheduleWrite` pela persistência nova. A carreira vinda do banco passa pela mesma normalização da carga do arquivo |
| `server/server.js` | sobe o banco antes de aceitar requisições, mostra o resumo no log e espera as gravações ao desligar |
| `server/scripts/exportar-postgres.js` | volta atrás: exporta o banco para os 3 arquivos numa pasta nova (não sobrescreve nada) |
| `server/package.json` | dependência nova: `pg` |

## Cópia dos arquivos para o banco
Na primeira subida com banco, para cada tabela vazia, o servidor:
1. lê o arquivo;
2. copia tudo numa transação;
3. relê do banco e confere quantidade e conteúdo, registro a registro;
4. grava o marco (`migracoes_arquivo`).

Se o arquivo estiver ilegível ou a conferência não bater, **desfaz tudo e o servidor não sobe**, com o motivo no log. Os arquivos nunca são alterados.

## Pontos para sua avaliação
1. **Tipo `json`, não `jsonb`:** guarda o texto exatamente como veio. O `jsonb` reordena as chaves, e numa carreira antiga ainda não comprimida isso mudava os bytes comprimidos (o conteúdo era o mesmo). O teste de comparação arquivo × banco mostrou essa diferença, e a troca para `json` a eliminou. Consultas dentro dos dados continuam possíveis.
2. **Uma instância só:** como planejado, a leitura continua na memória. Rodar mais de uma instância fica para depois.
3. **Testes interrompidos:** se a suíte for interrompida no meio, o Postgres temporário dela pode ficar de pé (numa porta livre, em `/tmp`). Numa rodada normal, ele é derrubado e apagado no fim.
4. **Subida:** com banco vazio, o banco ficou pronto em cerca de 50 ms nos testes. Com muitas carreiras, a carga depende do tamanho. Ela acontece uma vez por subida, como a leitura do arquivo hoje.

## O que precisa de você (Railway)
Passo a passo em `README-DEPLOY-RAILWAY.md`, seção "Postgres":
1. **Criar o banco:** um PostgreSQL no ambiente, primeiro no HML.
2. **Ligar ao jogo:** `DATABASE_URL = ${{Postgres.DATABASE_URL}}` no serviço do jogo.
3. **Conferir:** no log, a linha "copiados do arquivo e conferidos". Depois, testar o jogo.
4. **Produção:** repetir no PRD. Manter o Volume até decidir apagar os arquivos de reserva.

Eu não criei banco nem mexi em variável ou deploy.

## Testes
- **Novo `tests/unit/test_persistencia_postgres.js`** (7 verificações, com Postgres de verdade e os módulos reais numa cópia isolada do servidor):
  1. sem banco, tudo em arquivo, como sempre;
  2. 1ª subida: tabelas, cópia conferida (3 contas, 2 sessões e 4 carreiras, uma delas no formato antigo), memória vinda do banco, arquivos intactos;
  3. gravação por registro: só os registros mudados mudam no banco;
  4. nova subida lê do banco, e o arquivo mudado é ignorado;
  5. cópia que falha (arquivo corrompido, ou banco devolvendo outro conteúdo por um gatilho de teste): a subida falha, nada fica pela metade e o arquivo fica intacto;
  6. exportar de volta: arquivos iguais ao banco, sem sobrescrever;
  7. o mesmo roteiro com arquivo e com banco deixa os mesmos dados.
- **Testes E2E:** o servidor isolado de cada rodada sobe com um **Postgres temporário próprio** (`tests/_pg_temporario.js`). A suíte inteira roda no caminho de produção, e a cópia dos arquivos que os perfis preparam antes da subida é exercitada em toda rodada. `BRDATA_TESTE_SEM_BANCO=1` força o modo arquivo.
- **CI:** os jobs de testes ganharam um serviço Postgres 16, com um banco novo por servidor isolado.
- **Suíte completa (com Postgres):** 194/195 na 1ª rodada. A falha foi `test_save_limit_001_careerstore`, que copia o `careerStore.js` para uma pasta temporária e não levava os dois módulos novos (`persistencia.js`, `db.js`). Corrigido, passa. Total: **195/195**.
  - **O banco recebeu de fato os dados:** no fim da rodada principal, o Postgres temporário tinha 189 contas, 187 sessões e 182 carreiras. Os dois perfis de servidor também gravaram no banco.
