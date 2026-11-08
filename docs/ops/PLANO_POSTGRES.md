# Plano: contas, sessões e carreiras no Postgres

- **Data:** 08/11/2026.
- **Status:** proposta para aprovação do Murilo. Nada foi implementado. Infraestrutura (banco, variáveis, deploy) só com sua autorização explícita, feita por você no Railway.

**Decisões já tomadas** (08/11):
- **Escopo:** contas, sessões e carreiras juntas.
- **Migração:** cópia única conferida, com o arquivo intocado como reserva.
- **Mesma carreira em duas abas (D1):** fica para uma entrega própria.
- **Testes:** usam banco também.

## 1. Como é hoje
Os três dados da conta ficam em arquivos JSON na pasta `server/data` (volume do Railway em `/app/server/data`):

| Arquivo | Módulo | O que guarda |
|---|---|---|
| `users.json` | `server/src/users.js` | contas (login, plano, créditos, amigos, push...) |
| `sessions.json` | `server/src/sessions.js` | sessões de login |
| `careers.json` | `server/src/careerStore.js` | carreiras, cada uma comprimida (gzip), com limite de 768 KB |

Os três funcionam do mesmo jeito:
- **Na subida do servidor:** tudo é lido para a memória.
- **Durante o uso:** o servidor lê da memória, sem esperar o disco. São 80 usos no `server.js`.
- **A cada mudança:** o arquivo **inteiro** é regravado, com um pequeno atraso para juntar gravações seguidas.

**Problemas**
- **Gravação cresce com o número de contas:** salvar uma carreira regrava as carreiras de todos.
- **Perda total no deploy:** se o volume não estiver montado num ambiente, um deploy apaga tudo.
- **Sem backup nem consulta:** não há backup nem consulta sem baixar o arquivo inteiro.

## 2. Como fica
**O que fica igual e o que muda**
- **Igual:** a memória continua sendo a fonte de leitura, e as funções dos três módulos não mudam. O `server.js`, a API e o jogo não percebem a troca.
- **Muda:** o lugar onde os dados ficam guardados. Em vez de regravar o arquivo inteiro, cada mudança grava **só aquele registro** no Postgres (inserir, atualizar ou apagar), com o mesmo pequeno atraso de hoje para juntar gravações seguidas.

**Tabelas** (uma por módulo, cada registro como está hoje):
- `contas (id text primary key, dados jsonb, atualizado_em timestamptz)`;
- `sessoes (token text primary key, dados jsonb, expira_em timestamptz)`;
- `carreiras (user_id text primary key, dados jsonb, atualizado_em timestamptz)`.

A carreira continua comprimida dentro de `dados`, como no arquivo, para não mexer no limite de tamanho nem no formato do save. Consultas dentro da carreira ficam para depois.

**Quando o servidor usa banco ou arquivo:** com a variável `DATABASE_URL`, usa o Postgres. Sem ela, usa os arquivos, como hoje. Isso vale para desenvolvimento local e serve de reserva.

**Subida do servidor:** cria as tabelas, se faltarem, e carrega tudo para a memória antes de aceitar requisições. Hoje a carga do arquivo já é feita antes de aceitar requisições.

**Falha ao gravar no banco:** registra no log e tenta de novo. Nunca derruba a requisição. Hoje a gravação do arquivo também acontece depois da resposta.

## 3. Migração dos dados que já existem
Na primeira subida com banco, para cada tabela vazia:
1. lê o arquivo correspondente;
2. copia cada registro para o banco;
3. relê do banco e confere registro a registro (mesmo conteúdo, mesma quantidade);
4. grava um marco (`migracoes_arquivo`) para não repetir;
5. registra no log quantos registros foram copiados e conferidos.

Se a conferência falhar, o servidor não sobe com o banco e avisa no log. Os arquivos **não são apagados nem alterados**: ficam como reserva até você mandar apagar.

**Voltar atrás:** a partir da migração, as gravações vão só para o banco, e o arquivo para no tempo. Para voltar ao arquivo, um script (`server/scripts/exportar-postgres.js`) grava o conteúdo do banco nos arquivos. Depois é só tirar a `DATABASE_URL`.

## 4. Testes
- **Unitários com Postgres de verdade:** usam um banco temporário criado na hora (`initdb`, disponível aqui). Cobrem carga, gravação por registro, apagar, a migração com conferência, conferência que falha e o modo arquivo sem `DATABASE_URL`.
- **E2E:** o servidor isolado dos testes sobe um Postgres temporário e passa a `DATABASE_URL`. A suíte inteira roda no caminho de produção.
- **CI:** os workflows ganham um serviço Postgres.
- **Comparação:** o mesmo roteiro de uso (criar conta, entrar, jogar, sair) com arquivo e com banco tem de deixar os mesmos dados.

## 5. O que precisa de você (Railway)
1. **Criar o banco:** um Postgres em cada ambiente (homologação e produção).
2. **Ligar o banco ao jogo:** colocar a `DATABASE_URL` no serviço do jogo de cada ambiente. Pelo Railway, isso é uma referência à variável do banco.
3. **Publicar:** primeiro em homologação, conferir no log a linha da migração ("N contas, N sessões, N carreiras copiadas e conferidas"), testar o jogo; depois produção.
4. **Volume:** manter o volume atual montado até você decidir apagar os arquivos de reserva.

Eu não crio banco nem mexo em variável ou deploy. Também não uso o agente do Railway.

## 6. Etapas
| Etapa | O que faz |
|---|---|
| P1 | `server/src/db.js` (conexão, criação das tabelas), dependência `pg`, Postgres temporário para os testes |
| P2 | sessões, contas e carreiras gravando por registro no banco, com o arquivo como alternativa |
| P3 | migração com conferência e o script de exportar de volta |
| P4 | servidor isolado dos E2E e CI com Postgres, suíte inteira e relatório |

São um PR só, com as quatro etapas, porque só faz sentido publicar tudo junto.

## 7. Riscos
- **Subida mais lenta:** carregar tudo do banco para a memória pode ser um pouco mais lento que ler o arquivo. Medido nos testes.
- **Mais de uma instância:** com a memória como fonte de leitura, o servidor continua sendo **uma instância só**. Rodar mais de uma exige ler do banco a cada requisição, o que fica para uma entrega futura.
- **Dependência nova:** o driver `pg`. Hoje o servidor depende só de `web-push`.
