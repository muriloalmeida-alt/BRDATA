# Calibração — FASE1-MER (negociação do técnico)

**Data:** 13/11/2026
**Script:** `node tests/unit/calibracao_mer.js --md <arquivo>` (sai com erro se um limite falhar)
**Parâmetros:** `MER_PARAMETROS` em `public/js/motor/mercado.js` (todos os pesos e limiares num lugar só)

## Como foi medido

- Carreiras de verdade, criadas pelo motor sem página, como a v2: Série A (3 clubes), Série B (2) e Série C (1).
- As decisões do motor passaram por todos os jogadores dos outros clubes, numa grade:
  - clube vendedor: oferta de 60% a 150% do valor de mercado;
  - atleta: salário de 80% a 200% do atual, com cada papel prometido;
  - empréstimo de entrada: 50%, 75% e 100% do salário.
- Seguindo a seção 30 do CLAUDE.md, olhamos proporções, média, mediana e extremos, e não só um caso.
- As decisões são determinísticas (MER-06). O sorteio do vendedor, na faixa de 95% a 105% da reserva, usa a chave do jogador.

## Resultados

### Clube vendedor: resposta por valor oferecido / valor de mercado

| Oferta / valor | Casos | Aceita | Contrapõe | Recusa |
|---|---|---|---|---|
| 0.6 | 6576 | 0% | 0% | 100% |
| 0.7 | 6576 | 0% | 0% | 100% |
| 0.8 | 6576 | 0% | 13% | 87% |
| 0.9 | 6576 | 0% | 43% | 57% |
| 1.0 | 6576 | 12% | 72% | 16% |
| 1.1 | 6576 | 37% | 62% | 1% |
| 1.2 | 6576 | 79% | 21% | 0% |
| 1.5 | 6576 | 100% | 0% | 0% |

### Clube vendedor: resposta por papel do jogador no elenco dele (todas as ofertas)

| Papel | Casos | Aceita | Contrapõe | Recusa |
|---|---|---|---|---|
| reserva | 6768 | 49% | 26% | 25% |
| titular | 29072 | 20% | 26% | 54% |
| rotacao | 16768 | 35% | 27% | 39% |

### Reserva do vendedor / valor de mercado

| Papel | Média | Mediana | Mín. | Máx. |
|---|---|---|---|---|
| titular | 1.25 | 1.21 | 1.20 | 1.50 |
| rotacao | 1.10 | 1.08 | 1.08 | 1.21 |
| reserva | 1.00 | 1.00 | 1.00 | 1.00 |

### Atleta: resposta por salário oferecido / atual e papel prometido

| Salário / atual | Papel | Casos | Aceita | Pede mais | Recusa |
|---|---|---|---|---|---|
| 0.8 | titular | 6576 | 29% | 34% | 38% |
| 1.0 | titular | 6576 | 76% | 20% | 3% |
| 1.2 | titular | 6576 | 97% | 3% | 0% |
| 1.5 | titular | 6576 | 100% | 0% | 0% |
| 2.0 | titular | 6576 | 100% | 0% | 0% |
| 0.8 | rotacao | 6576 | 8% | 24% | 68% |
| 1.0 | rotacao | 6576 | 47% | 34% | 19% |
| 1.2 | rotacao | 6576 | 84% | 13% | 2% |
| 1.5 | rotacao | 6576 | 100% | 0% | 0% |
| 2.0 | rotacao | 6576 | 100% | 0% | 0% |
| 0.8 | reserva | 6576 | 1% | 8% | 91% |
| 1.0 | reserva | 6576 | 19% | 34% | 47% |
| 1.2 | reserva | 6576 | 58% | 29% | 13% |
| 1.5 | reserva | 6576 | 94% | 6% | 0% |
| 2.0 | reserva | 6576 | 100% | 0% | 0% |

### Atleta: resposta por mudança de divisão (todas as ofertas)

| Divisão | Casos | Aceita | Pede mais | Recusa |
|---|---|---|---|---|
| mesma | 41040 | 65% | 15% | 21% |
| sobe | 38400 | 80% | 12% | 8% |
| desce | 19200 | 49% | 15% | 36% |

### Salário pedido / atual (quando ele pede mais)

| Casos | Média | Mediana | Mín. | Máx. |
|---|---|---|---|---|
| 13428 | 1.09 | 1.08 | 0.81 | 1.77 |

### Empréstimo de entrada: resposta por papel na origem e percentual do salário

| Papel na origem | % do salário | Casos | Aceita | Contrapõe | Recusa |
|---|---|---|---|---|---|
| reserva | 50 | 846 | 100% | 0% | 0% |
| reserva | 75 | 846 | 100% | 0% | 0% |
| reserva | 100 | 846 | 100% | 0% | 0% |
| titular | 50 | 3634 | 0% | 0% | 100% |
| titular | 75 | 3634 | 0% | 0% | 100% |
| titular | 100 | 3634 | 0% | 0% | 100% |
| rotacao | 50 | 2096 | 0% | 90% | 10% |
| rotacao | 75 | 2096 | 0% | 90% | 10% |
| rotacao | 100 | 2096 | 90% | 0% | 10% |

### Limites conferidos

- Oferta de 60% do valor: o clube recusa (≥ 95%).
- Oferta de 150% do valor: o clube aceita (≥ 95%).
- Dobro do salário como titular: o atleta aceita (≥ 90%).
- Salário 20% menor como reserva: a maioria não aceita de cara.
- Mais salário nunca piora a resposta do atleta (98640 sequências).
- O salário pedido fica sempre acima do oferecido.
- Titular do clube de origem nunca sai emprestado.


## Leitura

- **Clube vendedor.**
  - Abaixo de 80% do valor, recusa sempre.
  - Pagando o valor de mercado, contrapõe na maioria das vezes (72%).
  - Com 150%, aceita sempre.
  - O titular custa mais: reserva de 1,20 a 1,50 do valor. Rotação: 1,08 a 1,21. Reserva: o próprio valor.
- **Atleta.**
  - O papel prometido pesa tanto quanto o salário. Com o salário de hoje, aceitam:
    - prometido titular: 76%;
    - prometido rotação: 47%;
    - prometido reserva: 19%.
  - Descer de divisão afasta (36% recusam). Subir atrai (8% recusam).
  - Quando ele pede mais, pede em média 9% acima do salário atual (de 0,8 a 1,8 vezes).
  - Oferta alta ao clube não compra o aceite do atleta. São duas decisões separadas.
- **Empréstimo de entrada.** A resposta depende quase só do papel na origem:
  - titular: o clube não empresta;
  - reserva: empresta mesmo com 50% do salário;
  - rotação: com 50% ou 75%, contrapõe pedindo 100%; com 100%, aceita.
  - Os 10% de recusa na rotação são clubes que ficariam sem cobertura na posição.

## Pontos para decisão do PM (não alterados)

1. **Empréstimo da rotação, muito binário.** Com 50% ou 75%, sempre vem contraproposta de 100%. Idade (desenvolvimento) e duração quase não mudam o resultado.
   - Opção A: manter.
   - Opção B: aumentar o peso de desenvolvimento e de meia temporada, para que jovem de rotação saia com 75%.
2. **Pagar o valor de mercado quase nunca fecha de primeira** (12% aceitam, 72% contrapõem).
   - É coerente com a reserva maior de titular e rotação.
   - Se a intenção for que o valor de mercado feche mais vezes, baixar `importancia.titular` ou `importancia.rotacao`.
3. **Prometer titularidade é forte**: 76% aceitam sem aumento. A promessa cobra a moral se não for cumprida (decisão de 13/11), e esse é o contrapeso.
   - Se parecer fácil demais, reduzir `atleta.papel`.

## Limites conferidos pelo script (falham o comando se quebrarem)

- Oferta de 60% do valor: o clube recusa (≥ 95%).
- Oferta de 150% do valor: o clube aceita (≥ 95%).
- Dobro do salário como titular: o atleta aceita (≥ 90%).
- Salário 20% menor como reserva: a maioria não aceita de cara.
- Mais salário nunca piora a resposta do atleta.
- O salário pedido fica sempre acima do oferecido. A calibração achou pedidos arredondados para baixo do oferecido; já foi corrigido.
- Titular do clube de origem nunca sai emprestado.
