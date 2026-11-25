# ECON-001 · Entrega 2 · Mercado: antes e depois

Gerado por `tests/sim/economia_mercado.js` (criação da carreira, sem jogar). "Antes" = a regra de sempre (economia v1, carreiras de hoje); "depois" = economia v3 (carreiras novas). R$ milhões; folha, teto, TV e despesas por mês; patrocínio por temporada. No Brasil, o modo exemplo (sem rede) usa elencos fictícios.

| Perfil | | Folha | Teto | Caixa | TV/mês | Despesas/mês | Patrocínio | Maior salário | Maior valor | Elencos ≤ US$ 1 mi | > US$ 20 mi |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Arsenal (Premier League) | antes | 1,5 | 2,1 | 13,7 | 0,4 | 0,0 | 8,7 | 0,1 | 8,7 | 95% | 0% |
|  | depois | 122,4 | 165,2 | 666,2 | 185,0 | 236,6 | 1.500,9 | 9,7 | 487,1 | 14% | 17% |
| Southampton (Championship) | antes | 0,8 | 1,0 | 6,3 | 0,2 | 0,0 | 7,4 | 0,1 | 3,6 | 96% | 0% |
|  | depois | 30,1 | 40,6 | 68,0 | 18,9 | 11,5 | 140,7 | 2,1 | 52,6 | 22% | 11% |
| Real Madrid (LaLiga) | antes | 1,7 | 2,3 | 17,7 | 0,5 | 0,0 | 7,2 | 0,1 | 10,0 | 96% | 0% |
|  | depois | 185,9 | 251,0 | 1.348,8 | 374,7 | 540,9 | 3.351,2 | 15,0 | 287,9 | 30% | 6% |
| River Plate (Argentina) | antes | 1,3 | 1,8 | 11,9 | 0,3 | 0,0 | 7,5 | 0,1 | 6,5 | 99% | 0% |
|  | depois | 18,9 | 25,5 | 99,0 | 16,5 | 36,1 | 176,8 | 1,3 | 27,7 | 76% | 0% |
| Peñarol (Uruguai) | antes | 0,8 | 1,1 | 7,8 | 0,2 | 0,0 | 7,7 | 0,1 | 3,6 | 100% | 0% |
|  | depois | 4,4 | 5,9 | 20,6 | 3,4 | 7,1 | 37,4 | 0,3 | 4,8 | 100% | 0% |
| Barcelona SC (Equador) | antes | 1,1 | 1,5 | 10,4 | 0,3 | 0,0 | 7,3 | 0,1 | 4,8 | 100% | 0% |
|  | depois | 6,8 | 9,2 | 29,8 | 5,0 | 9,7 | 61,5 | 0,4 | 10,6 | 95% | 0% |
| Flamengo (Brasil, modo exemplo) | antes | 4,7 | 6,4 | 38,1 | 1,0 | 0,0 | 6,9 | 0,7 | 61,2 | 56% | 0% |
|  | depois | 30,2 | 40,8 | 313,5 | 69,7 | 135,3 | 667,6 | 3,9 | 132,3 | 60% | 0% |
| Mirassol (Brasil, modo exemplo) | antes | 1,7 | 2,2 | 13,5 | 0,3 | 0,0 | 7,3 | 0,2 | 15,9 | 55% | 0% |
|  | depois | 5,9 | 8,0 | 27,0 | 6,0 | 8,3 | 58,9 | 0,6 | 40,8 | 60% | 0% |

## Negócios de referência (plausibilidade)

| Negócio | Valor real | Motor | Perfil usado |
|---|---:|---:|---|
| Isak (Newcastle → Liverpool) | £ 125 mi | £ 68,2 mi | Newcastle, overall 77, 25 anos |
| Paquetá (West Ham → Flamengo) | € 42 mi | € 14,8 mi | clube de meio da Premier League, overall 72, 28 anos |
| Mastantuono (River → Real Madrid) | € 45 mi (cláusula) | € 6,1 mi | River, overall 74, 18 anos, potencial 86; demanda do Real Madrid ×2.90 |
| Leo Fernández (Peñarol, 80%) | US$ 7 mi | US$ 1,5 mi | Peñarol, overall 74, 25 anos |

## Como funciona (economia v2)

**Onde vale.** Só em carreira nova: a criação grava `CAREER.economia` (versão, escalas, fluxos do clube). Save sem o campo segue a regra de antes, sem migração. A chave `economia.ECONOMIA_V2.ativa` desliga a v2 só nos testes de equivalência com a cópia congelada da carreira antiga.

**Salário e valor (regra de nivelamento mundial, versão 3, 25/11).** A regra de sempre (overall, idade e potencial: `temporada.computeContractFields`) dá a **ordem** dos atletas. A economia dá o **nível** (pelo dinheiro) e o **formato** (pela posição relativa na liga), para valer igual em qualquer fonte de dados. Os overalls de cada fonte têm escalas próprias (Brasil: mediana 67, topo 84; Premier League do mundo: mediana 71, topo 78), e a curva de sempre é exponencial no overall. Sem normalizar, o craque do Flamengo saía a R$ 848 mi, acima do topo da Premier League.

- **Posição relativa:** z = (ln(valor de sempre) − mediana da liga) ÷ dispersão da liga, com a mesma conta para o salário.
- **Valor:** preço mediano da liga × e^(σv·z), com σv = 0,86 (percentil 90 ≈ 3× a mediana; topo de uma liga, 10 a 15×). O valor estica ou comprime: a fonte do mundo comprime o topo da Premier League, e a do Brasil é larga demais.
- **Preço mediano da liga:** 3% da receita **média** dos clubes (`PRECO_SOBRE_RECEITA`). É a média, e não a mediana, porque nas ligas concentradas o clube mediano fatura pouco e o topo do Real Madrid saía a € 27 mi.
- **Salário:** nível do clube × e^(k·z). O expoente só comprime (k ≤ 1). Esticar o salário fazia a diferença de qualidade entre divisões pesar mais que a de dinheiro.
- **Nível de salário:**
  - da liga: a soma das folhas dos contratos = a soma das folhas-base;
  - do clube: o da liga puxado 75% para a folha-base do próprio clube (`AJUSTE_CLUBE`);
  - na mesma liga: regressão isotônica na receita, para o clube mais rico nunca pagar menos pela mesma qualidade;
  - entre divisões: o clube de baixo não paga mais pela mesma qualidade que o clube da divisão de cima mais próximo dele em receita (`ordemNoPais`).
- **Aplicação:** todos os contratos do save são escalados uma vez na criação (`p.escalaEco` evita escalar de novo). Contratos gerados depois (base, prospecto do olheiro, reposição, promoção e renovação da CPU) já nascem na escala do clube. O salário justo (moral da virada, agente livre, "à venda") usa a escala do clube.
- **Clubes que entram depois:** recebem o nível da liga pelo porte (subiu do catálogo ou da Série D). O clube aberto no mercado do mundo recebe o nível que fecha a folha-base dele e o preço mediano da liga dele, com o formato da 1ª divisão do técnico (aproximação: a liga de fora não tem os elencos no save).
- **Saves da versão 2** (escala linear, carreiras criadas entre o #168 e esta regra): continuam lidos como eram.
- **Demanda (só entre países):** quando um dos clubes é de fora do país do save, quem compra de um mercado mais caro paga parte da diferença. A reserva do vendedor parte do valor × (preço mediano da liga do comprador ÷ o da do vendedor)^0,5, entre 1 e 3 (`fatorDeDemanda`). Vale igual para a proposta do técnico e para a compra da CPU. No mercado doméstico, o preço parte do valor exibido.

**Reserva do vendedor e pedido do atleta.** As regras de hoje (`mercado.reservaParaProposta`, `avaliacaoAtleta`) não mudam: elas partem do valor (com a demanda) e do salário do atleta, que agora estão na escala. Ex.: um atleta de um clube menor pede mais para ir a um clube maior. Um do clube maior recusa um salário de clube menor, com o motivo "O salário oferecido está abaixo do que ele ganha".

**Finanças do clube do técnico.**

- **Caixa inicial:** o da base financeira, 15% da receita anual (~2 meses). Era 8% até o ajuste das divisões de baixo (25/11).
- **Teto salarial:** 35% acima da folha (a regra de sempre).
- **TV e despesas operacionais:** pela base, todo mês. As despesas aparecem no extrato como "Despesas operacionais de <mês>" e fecham a margem do clube com a folha real: receita − folha − despesas = resultado da base.
- **Patrocínio e bilheteria:** na escala comercial e de dia de jogo do clube. As propostas de patrocínio e o preço do ingresso são multiplicados pelo fator do clube.
- **Na virada:** os fluxos seguem a divisão nova. O rebaixado à Championship recebe a transição de 3 anos. Caixa e contratos ficam.
- **Troca de clube:** os fluxos passam a ser os do clube novo.

**CPU.** O caixa de cada clube nasce no da base financeira. Na virada ele volta metade do caminho até esse caixa (antes, até 6 tetos de folha).

**Mesma capacidade de compra.** Técnico e CPU usam `economia.capacidadeNoJogo`, sobre a `capacidadeDeCompra` da Entrega 1. Ela barra a compra em três casos:

- o pagamento inicial deixa no caixa menos de 1 mês de folha;
- o salário passa do teto;
- as parcelas (as já assumidas e as novas) deixam o caixa negativo em alguma rodada.

O técnico recebe o motivo na proposta, na prévia (`capacidade`) e na conclusão. A CPU só compra quando passa.

## Decisões

- **Nivelamento mundial pela posição relativa e pelo dinheiro**, e não por um fator linear por liga. O fator linear mantinha o formato da fonte de dados, e o Brasil (overall mais largo) ficava com craques mais caros que a Premier League.
- **O valor estica e o salário só comprime.** No valor, a diferença de preço entre divisões (~9×) supera a de qualidade. No salário, cuja folha fecha por divisão, esticar invertia a ordem entre divisões.
- **Folha real pelos contratos**, a ±30% da folha-base nos perfis medidos: Arsenal +11%, Flamengo +11%, Real Madrid −31%, River −24%.
- **Desvio conhecido do West Ham.** Recém-rebaixado à Championship, com elenco e folha-base de Premier League, fica com 0,4× da folha-base: não pode pagar pela mesma qualidade mais que o clube da Premier League de receita parecida. Na vida real, o rebaixado carrega a folha da divisão de cima.
- **Parâmetros imputados, exportados e documentados:**
  - preço sobre a receita média: 3%;
  - dispersão: valor 0,86 e salário 0,72;
  - ajuste do clube: 0,75;
  - porte: 0,4;
  - demanda: expoente 0,5, teto 3.
- **Receitas fora da base recorrente:** venda de atletas, aportes e prêmios continentais. Os prêmios das copas continuam creditados pelo motor de competições.

## Casos não confirmados

- **Grande português:** Portugal não está entre as 20 ligas do mundo. O Benfica fica no catálogo só como referência (`REFERENCIAS.benfica`).
- **Distribuição da FIFA:** ela mede transferências internacionais com taxa. A tabela acima mede os elencos dos saves. A distribuição das transferências feitas (técnico e CPU) por temporada vem na simulação de 5 temporadas (Entrega 3).
- **Brasil:** sem rede, o modo exemplo tem elencos fictícios (overall até 92), e os valores do Brasil na tabela são desses elencos. Com os elencos reais, a ordem de grandeza segue a dos clubes do mundo.
- **Interface:** "Paga agora", "Custo mensal", "Caixa após", o filtro de despesas no extrato e os motivos na tela ficam para a Entrega 3. Por enquanto, a mensagem de recusa da proposta já traz o motivo.
