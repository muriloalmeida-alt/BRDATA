# Carreira 2.0: comissão técnica (sugestões rápidas)

- **Data:** 05/11/2026.
- **Branch:** `comissao-sugestoes`, a partir de `main`.
- **Origem:** pacote `BRDATA_Comissao_Tecnica_Claude.zip`, com `IMPLEMENTAR_COMISSAO_TECNICA.md` e a imagem `01_referencia_visual.png`.

**Decisões aplicadas** (05/11):
- **Disponibilidade:** a aba aparece sempre, mas as sugestões só com a comissão contratada.
- **Escalação:** uma troca por vez, na ordem indisponível → desgaste → ganho.
- **Formação:** calculada pela força do próprio motor.
- **Postura:** usa a regra que o jogo já tem (`suggestTactics`).

## Comportamento
**Aba fechada** (Início, Escalação e Pré-jogo):
- **Forma:** botão estreito na borda direita, a meio da altura útil. Só o chevron; 20×64 px visíveis e toque de 44×64. Sem texto, contador nem animação.
- **Acessibilidade:** nome "Abrir comissão técnica", `aria-expanded` e `aria-controls`.
- **Quando some:** com outra folha aberta, durante o assistente de início e com a sessão expirada.
- **Fora dessas 3 telas** ela não aparece, inclusive na Partida.

**Painel aberto** (a folha da v2):
- **Fechar:** pelo X, pelo toque no fundo e pelo Escape. O foco fica preso no painel e volta para a aba ao fechar.
- **Altura:** começa em 65% da tela, pode crescer e rola por dentro.
- **Movimento:** curto, e desligado com `prefers-reduced-motion`.
- **Cabeçalho:** "Comissão técnica" e "Sugestões para o próximo jogo · contra o <adversário>".
- **Linhas:** Escalação, Formação e Postura, nesta ordem, uma aberta por vez. Abre primeiro a que tem mudança.
- **Conteúdo de cada linha:**
  - motivo;
  - troca (sai → entra), ou formação atual → nova com quem entra e quem sai;
  - nota;
  - "Aplicar sugestão".
- **Sem mudança:** mostra "Manter escalação/formação/postura atual" com a justificativa e sem botão.
- **Sem dados:** "Sem dados suficientes para sugerir uma mudança".
- **Sem próximo jogo:** estado vazio.
- **Sem comissão contratada:** explica e leva para Clube → Comissão técnica.

**Aplicar:**
- **Gravação:** o motor recalcula e só grava se a sugestão ainda for a mesma.
  - Se o save mudou (outra tela ou outra aba), não grava: avisa e mostra a recomendação nova.
  - Toque duplo grava uma vez só.
- **O que muda:** só a mudança apresentada.
  - Escalação: troca a vaga, e quem sai vai para o lugar de quem entra no banco.
  - Formação: aplica formação, titulares e banco mostrados.
  - Postura: ritmo, pressão e linha defensiva.
- **Persistência:** a mesma de sempre (`ponteGravar`). A tela é atualizada, e a sugestão aplicada deixa de aparecer como pendente.
- **Confirmação:** "Sugestão aplicada: …" com **Desfazer**.
  - Desfazer volta só aquela mudança, e só se ela ainda está como ficou.
  - Se o técnico mudou depois, avisa e não sobrescreve.
- **Falha de gravação:** explica e permite tentar de novo; nada é alterado.

## Regras (motor, `carreira.js`)
| Categoria | Regra |
|---|---|
| **Escalação** | <ol><li>Titular lesionado, suspenso ou ausente → melhor reserva **disponível** da mesma posição.</li><li>Titular com condição abaixo de 70% → reserva da mesma posição com condição ≥ 85% e overall até 3 pontos menor.</li><li>A troca de maior ganho de overall que a escalação automática (`autoLineup`) faria.</li></ol> Só elenco principal e emprestados, sem repetir jogador. |
| **Formação** | Para cada uma das 14 formações suportadas, monta a escalação automática e calcula a força pela fórmula do jogo (`computeHumanStrength`). Sugere a melhor se a razão de gols esperados contra o próximo adversário (com mando) melhorar ≥ 3% sobre a formação atual. |
| **Postura** | A regra de `suggestTactics`, pela força relativa contra o próximo adversário: Ofensiva (nível 4), Equilibrada (3) ou Cautelosa (2) em ritmo, pressão e linha defensiva. O passe não muda. |

**Comandos da ponte:** `comissaoSugestoes`, `comissaoAplicar(categoria, chave)` e `comissaoDesfazer(desfazer)`.
- Sem endpoint novo, sem schema novo e sem IA externa.
- A v2 tem `adapters/comissao.ts`, `screens/Commission.tsx` e `commission.css`. A folha (`Sheet`) ganhou `id` e `className` opcionais.

## Dados que o motor ainda não fornece
- **Perfil do adversário** (estilo, desfalques, forma recente): a postura usa só a força bruta do catálogo, como a comissão já fazia.
- **Posição específica** (ponta, lateral, volante): o motor só tem 4 grupos (G, D, M, F). Por isso a formação não fala em "pontas", e sim no ganho de ataque e defesa.

## Pontos para sua avaliação
1. **Área de toque:** os 44 px de toque cobrem os 24 px da margem lateral e ~20 px da borda direita do conteúdo. Na altura da aba, isso pega o fim de uma linha (o chevron), e a linha continua tocável no resto. Se preferir, desloco a aba para uma altura sem linhas.
2. **Safari/iPhone:** não testei, porque não tenho aparelho aqui. O teste automático é Chromium em 320, 390 e 430 px.
3. **Arrastar para baixo** para fechar: a folha da v2 não tem esse gesto, então não foi incluído.

**Capturas** (pasta `evidencias/comissao-tecnica/`):
- `390-1-fechado.png` e `390-2-aberto.png`;
- `390-3-aplicado-desfazer.png` e `390-4-formacao.png`;
- `320-*` e `430-*`, aberto e fechado.

## Testes
- **Novo `tests/e2e/test_v2_comissao.js`,** com 8 verificações:
  1. aba (nome, aria e medidas) só no Início, Escalação e Pré-jogo;
  2. sem comissão contratada;
  3. titular lesionado → troca, ordem das categorias e toque duplo = 1 gravação;
  4. desfazer;
  5. sugestão desatualizada não grava;
  6. postura;
  7. Escape devolve o foco à aba, em 320, 390 e 430 px;
  8. desgaste e formação.
- **Unitários da v2:** 117/117; `tsc` limpo; build ok.
- **Suíte completa:** 181/189 na primeira rodada, com a máquina sobrecarregada (as 8 falhas foram tempo esgotado). Rodadas de novo com `--concurrency=4`, as 8 passaram (11/11, contando os testes de save).
