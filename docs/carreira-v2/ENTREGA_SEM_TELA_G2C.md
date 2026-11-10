# Carreira 2.0: sem página escondida, etapa G2c (o módulo é o padrão)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g2c`, a partir de `main` (com o #97, etapa G2b).
- **Status:** 3º pedaço da G2 (divisão em `PROPOSTA_ETAPA_G.md`). O quadro e `/carreira/motor` ainda existem e saem na G2d.

## Resultado principal
**A v2 abre o motor como módulo por padrão**, sem o quadro escondido (`adapters/hosted.ts`, da G2b).
- **Chave (`usarModulo`):**
  - sem chave: módulo;
  - `?motor=quadro`: volta ao quadro escondido (fica guardado no `localStorage`, `brdata_motor`), até a G2d;
  - `?motor=modulo`: volta ao padrão.
- **Service worker:** `/js/motor/v2.js` entrou no app shell (o `/js/data.js` já estava), para a v2 abrir o motor offline já na 1ª vez, como os outros módulos.

**Sem mudança de regra, de save, de API nem de tela.**

## Defeito achado e corrigido (vinha da G1a, G1b e G1c2)
- **O problema:** 4 funções auxiliares copiadas da página para o motor ainda usavam a variável `CAREER` da página:
  - `technicalStaffMonthlyCost` (`carga.js`);
  - `countTitlesThisSeason` (`carga.js` e `jogo.js`);
  - `scoutsMonthlyCost` e `sponsorshipSeasonTotal` (`ponte.js`).

  Com o quadro, a página definia `CAREER` e tudo funcionava. Sem o quadro, quebram com `ReferenceError` só quando rodam.
- **Como apareceu:** com o módulo como padrão, 2 testes da v2 falharam:
  - `test_v2_clube`: a Comissão mostrava "Não foi possível carregar";
  - `test_v2_temporada`: falhava na tela do fim de temporada.
- **Por que o teste da G2a não pegou:** o roteiro de `test_motor_hospedeiro.js` não chamava esses comandos.
- **Correção:** `CAREER.` virou `carreiraAtual().` nas 5 linhas. É o mesmo valor; na página, `CAREER` já lia `carreiraAtual()` desde a G1c1.
- **Para não voltar:**
  - **Novo `carreira-v2/src/adapters/motor-globais.test.ts`:** confere sem rodar, com o compilador do TypeScript, que todo nome usado nos módulos do motor:
    - é declarado neles; ou
    - vem do navegador; ou
    - vem do `/js/data.js`, que o hospedeiro carrega antes.

    Roda no job "Carreira 2.0" do CI, que já tem o TypeScript.
    - **Contraprova:** na `main` (antes da correção), acha os 5 usos de `CAREER`. Também tem um caso que injeta um uso de `CAREER` e confere que a checagem o acha.
  - **`test_motor_hospedeiro.js`:** o roteiro agora chama `comissao`, `olheiros` e `patrocinios` dos dois lados (página e hospedeiro).
    - **Contraprova:** sem a correção, o lado do hospedeiro quebra em `technicalStaffMonthlyCost`.
- **Texto idêntico:** as 357 funções e constantes movidas remontam iguais, caractere por caractere.

## Testes da v2 que liam o quadro
Agora leem o motor na própria página. O novo `motorNaPagina(v2)` (`tests/e2e/_v2_match.js`):
- importa os módulos do motor na página (`estado`, `aovivo`, `posjogo`, `carga`, `semana`, `v2`);
- são as mesmas instâncias que a v2 usa, porque o navegador guarda um módulo por endereço;
- deixa os módulos e uma ponte montada deles em `window.__motor`.

| Teste | Antes (quadro) | Agora (módulo) |
|---|---|---|
| `test_v2_ajustes` | `MAX_SUBS_PER_MATCH` e `LIVE_MATCH` do quadro | `aovivo.MAX_SUBS_PER_MATCH` e `estado.partidaAtual()` |
| `test_v2_gravacao` | `CAREER` e a ponte do quadro; a tela de login da página escondida não aparece | a carreira em `estado.carreiraAtual()` e a ponte do módulo; nenhum quadro na página; Início sem quadro |
| `test_v2_posjogo` | força coletiva e proposta com as funções da página; quadro nunca visível | as mesmas funções do motor (`posjogo`, `estado`, `carga`); nenhum quadro na página |
| `test_v2_tabela_partida` | "mesma sessão" = a marca no quadro continua | "mesma sessão" = uma marca na carreira em memória (não enumerável, não vai para o save) continua; ela some se o motor recarregar a carreira |
| `test_v2_motor` | pré-carga escondida no quadro, reaproveitamento e recarga pela marca no quadro | pré-carga sem quadro e sem gravar; reaproveitamento e recarga (save mudado por fora) pela marca na carreira; a v2 aponta para `/js/motor/v2.js` e `data.js` |
| `test_v2_partida` | modo ponte em silêncio pelo som da página escondida | nenhum `AudioContext` criado na página, o ambiente em modo ponte e nenhum quadro |
| `test_v2_foco` (4) | documento do quadro que nunca carrega | o motor que nunca termina de abrir: a carga do save que o motor faz ao abrir não responde. Erro recuperável no prazo (~30 s) e "Tentar novamente" abre uma sessão limpa |

**Ficam como estão até a G2d:** `test_v2_inicio` e `test_v2_corte` conferem que `/carreira/motor` ainda responde.

**`test_v2_modulo`** (G2b): só o comentário mudou (agora é o padrão).

**`hosted.test.ts`:** a chave nova (padrão módulo, `?motor=quadro` volta e fica guardado, `?motor=modulo` volta ao padrão).

## Limite conhecido (registro)
Se o `/js/data.js` ou o `/js/motor/v2.js` ficarem pendurados na rede (nem carregam nem falham), a abertura estoura o prazo e mostra o erro. Mas "Tentar novamente" espera o mesmo carregamento, porque o navegador não pede de novo um script ou módulo que ainda está carregando. Só recarregar a página resolve.
- Com o quadro, cada tentativa criava uma página nova.
- São arquivos estáticos do próprio site, então o caso é raro.
- Não mudei nada: carregar o `data.js` duas vezes quebraria (as `const` de topo seriam declaradas de novo).

## Testes
- **Testes da v2:** todos passam. Inclui o novo `motor-globais.test.ts`; tipos e build ok.
- **Testes do motor:** todos passam.
- **Testes de tela da v2 (`test_v2_*`), com o módulo como padrão:** 32/32.
- **Suíte completa (com o Postgres temporário):** 211/212.
  - **A falha:** `test_v2_corte`. Sob a carga da suíte, o teste levou 92 s, e a espera de 10 s pela tela Mais estourou.
  - **Sozinho:** passou 2 de 2 (28 s).
  - **Na rodada com os 32 testes da v2 em paralelo:** passou.
