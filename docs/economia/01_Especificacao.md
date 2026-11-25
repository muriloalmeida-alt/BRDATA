# ECON-001 · Recalibração da economia do Modo Carreira (Touchline)

Especificação de PM (Claude, chapéu PM, 25/11/2026) a partir da proposta do
Murilo em `00_Proposta.md`. Ponto de partida: `main` em `c86ae26`.

## Diagnóstico (medido no SHA de partida)

| Clube (modo de medição) | Folha/mês no jogo | Caixa no jogo | Âncora real (proposta) |
|---|---|---|---|
| Flamengo (modo exemplo, elenco gerado) | R$ 0,25 mi | R$ 2,0 mi | folha R$ 37,5 mi/mês (ge, 2026) |
| Bahia (idem) | R$ 0,13 mi | R$ 1,0 mi | folha R$ 14 mi/mês |
| Mirassol (idem) | R$ 0,06 mi | R$ 0,45 mi | folha R$ 6 mi/mês |
| Arsenal (pacote Europa) | R$ 1,5 mi | R$ 13,7 mi | £189,3 mi/ano em salários-base (FBref/Capology) |
| River (pacote Sul-América) | R$ 1,3 mi | R$ 11,9 mi | US$ 217,7 mi de faturamento (com extraordinários) |

- Salário e valor saem só do overall e da idade (`temporada.computeContractFields`);
  a liga entra só pelo ajuste de overall (M6b) e pelo porte relativo (M7).
- A escala absoluta do jogo está 50–150 vezes abaixo da real, e a diferença
  entre ligas é pequena (a Premier League paga ~6x o Brasileirão do jogo, não ~3–4x).

## Decisões de PM

1. **Escala real em R$** (unidade interna de hoje), convertida na entrada do
   catálogo pelo câmbio fixo do jogo (texto.CAMBIO) e na apresentação pela
   moeda do país. Uma unidade, um arredondamento na fronteira da operação.
2. **Só carreiras novas**, com a versão da regra no save
   (`CAREER.economia.versao`). Saves existentes ficam na regra de hoje (v1).
3. **Ativação junto com os preços (Entrega 2).** A Entrega 1 entrega o
   catálogo, o modelo e o quadro por perfil sem mudar o jogo: folha em escala
   real com preços na escala antiga quebraria o mercado.
4. Catálogo versionado no repositório (fora do save), com fonte, período,
   unidade, item medido, transformação e confiança (publicado, estimado,
   imputado) para cada número.

## Entregas (PRs pequenos, nesta ordem)

1. **Base financeira** (ECON-001a): perfis por liga/divisão; receita
   recorrente, folha, despesas, caixa inicial, obrigações e orçamento por
   clube (topo, meio, base, promovido, recém-rebaixado, pouco dado);
   capacidade real de compra (mínimo entre orçamento, caixa para o
   pagamento imediato e capacidade de parcelas); fluxos na virada (sobe, cai,
   troca de clube ou país); quadro por perfil. Sem mudança de jogo.
2. **Mercado** (ECON-001b): valor estimado, preço de reserva e salário
   desejado separados; distribuição calibrada pelo relatório da FIFA; mesma
   avaliação para o técnico e a CPU; ativação da economia v2 em carreiras novas.
3. **Interface e validação** (ECON-001c): "Paga agora", "Custo mensal" e
   "Caixa após"; o motivo do bloqueio; Finanças com espaço de folha e
   parcelas; simulação de cinco temporadas; desempenho e save.

## Critérios de aceite

Os da proposta (seção "Validação e aceite"), por entrega: a Entrega 1 fecha
com o quadro de receitas, folha e caixa por perfil (Brasil, Europa, América
do Sul) e os testes do modelo; a 2, com o mercado; a 3, com a interface, as
cinco temporadas e a compatibilidade de saves.
