# Carreira 2.0: sem página escondida, etapa G1c1 (variáveis da página no estado do motor)

- **Data:** 10/11/2026.
- **Branch:** `sem-tela-g1c1`, a partir de `main` (com o #93, etapa G1b).
- **Status:** 1º pedaço da antiga G1c. O Murilo pediu em 10/11 a G dividida em pedaços menores; a nova divisão está em `PROPOSTA_ETAPA_G.md`.

## Resultado principal
As 5 variáveis da página que o jogo usa passam a morar em `public/js/motor/estado.js`:

| Variável da página | No estado do motor | O que é |
|---|---|---|
| `ME` | `conta()` / `definirConta()` | a conta logada (`/api/auth/me`) |
| `LIVE_MODE` | `modoReal()` / `definirModoReal()` | a fonte de dados (real ou exemplo) |
| `LIVE_MODE_BY_COMPETITION` | `modoRealPorCompeticao()` | a fonte por competição |
| `LIVE_SEASON` | `temporadaReal()` / `definirTemporadaReal()` | a temporada real dos dados |
| `TECHNICIAN_CARRY` | `herancaDoTecnico()` / `definirHerancaDoTecnico()` | a herança do técnico que trocou de clube |

**Na página:**
- **Leitura e escrita:** continuam pelos mesmos nomes. Cada variável virou um acessor para o estado, como o `CAREER` e o mundo nas etapas B e C1.
- **Valores iniciais:** os de antes.
- **O save:** nenhuma das 5 é gravada nele, como antes.

**Por que agora:** a entrada e a gravação (G1c2) e o hospedeiro da v2 (G2a) precisam dessas variáveis fora da página.

**Sem mudança de regra, de save, de API nem de tela.**

## Testes
- **Novo `tests/unit/test_motor_variaveis.js`:** roda a página inteira num `vm` com a tela falsa e confere:
  - os valores iniciais iguais aos de antes;
  - o que a página escreve, o motor lê, inclusive pelo ambiente das etapas anteriores (conta, temporada, fonte de dados, herança, nome do técnico);
  - o que o motor escreve, a página lê, inclusive o mesmo objeto da fonte por competição.
- **Testes do motor:** todos passam (20 arquivos).
- **Suíte completa (com o Postgres temporário):** 209/209.
