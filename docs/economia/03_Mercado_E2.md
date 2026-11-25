# ECON-001 · Entrega 2 · Mercado: antes e depois

Gerado por `tests/sim/economia_mercado.js` (criação da carreira, sem jogar). "Antes" = a regra de sempre (economia v1, carreiras de hoje); "depois" = economia v2 (carreiras novas). R$ milhões; folha, teto, TV e despesas por mês; patrocínio por temporada. No Brasil, o modo exemplo (sem rede) usa elencos fictícios.

| Perfil | | Folha | Teto | Caixa | TV/mês | Despesas/mês | Patrocínio | Maior salário | Maior valor | Elencos ≤ US$ 1 mi | > US$ 20 mi |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Arsenal (Premier League) | antes | 1,5 | 2,1 | 13,7 | 0,4 | 0,0 | 7,1 | 0,1 | 8,7 | 95% | 0% |
|  | depois | 140,9 | 190,2 | 355,3 | 185,0 | 218,1 | 1.603,7 | 11,2 | 679,7 | 0% | 53% |
| Southampton (Championship) | antes | 0,8 | 1,0 | 6,3 | 0,2 | 0,0 | 7,4 | 0,1 | 3,6 | 96% | 0% |
|  | depois | 32,8 | 44,3 | 36,3 | 18,9 | 8,7 | 160,6 | 2,3 | 135,2 | 0% | 35% |
| Real Madrid (LaLiga) | antes | 1,7 | 2,3 | 17,7 | 0,5 | 0,0 | 7,2 | 0,1 | 10,0 | 96% | 0% |
|  | depois | 195,1 | 263,4 | 719,3 | 374,7 | 531,7 | 2.789,1 | 15,8 | 645,3 | 4% | 20% |
| River Plate (Argentina) | antes | 1,3 | 1,8 | 11,9 | 0,3 | 0,0 | 6,8 | 0,1 | 6,5 | 99% | 0% |
|  | depois | 18,3 | 24,8 | 52,8 | 16,5 | 36,7 | 184,7 | 1,3 | 61,5 | 48% | 0% |
| Peñarol (Uruguai) | antes | 0,8 | 1,1 | 7,8 | 0,2 | 0,0 | 7,1 | 0,1 | 3,6 | 100% | 0% |
|  | depois | 4,3 | 5,8 | 11,0 | 3,4 | 7,2 | 38,5 | 0,3 | 12,6 | 91% | 0% |
| Barcelona SC (Equador) | antes | 1,1 | 1,5 | 10,4 | 0,3 | 0,0 | 7,5 | 0,1 | 4,8 | 100% | 0% |
|  | depois | 7,6 | 10,3 | 15,9 | 5,0 | 9,0 | 63,5 | 0,5 | 22,8 | 73% | 0% |
| Flamengo (Brasil, modo exemplo) | antes | 4,7 | 6,4 | 38,1 | 1,0 | 0,0 | 7,7 | 0,7 | 61,2 | 56% | 0% |
|  | depois | 42,8 | 57,8 | 167,2 | 69,7 | 122,7 | 638,6 | 6,7 | 386,2 | 34% | 4% |
| Mirassol (Brasil, modo exemplo) | antes | 1,7 | 2,2 | 13,5 | 0,3 | 0,0 | 7,0 | 0,2 | 15,9 | 55% | 0% |
|  | depois | 5,8 | 7,9 | 14,4 | 6,0 | 8,4 | 55,4 | 0,7 | 63,1 | 34% | 3% |

## Negócios de referência (plausibilidade)

| Negócio | Valor real | Motor | Perfil usado |
|---|---:|---:|---|
| Isak (Newcastle → Liverpool) | £ 125 mi | £ 88,3 mi | Newcastle, overall 77, 25 anos |
| Paquetá (West Ham → Flamengo) | € 42 mi | € 34,2 mi | clube de meio da Premier League, overall 72, 28 anos |
| Mastantuono (River → Real Madrid) | € 45 mi (cláusula) | € 16 mi | River, overall 74, 18 anos, potencial 86; demanda do Real Madrid ×2.61 |
| Leo Fernández (Peñarol, 80%) | US$ 7 mi | US$ 3,5 mi | Peñarol, overall 74, 25 anos |

## Como funciona (economia v2)

**Onde vale.** Só em carreira nova: a criação grava `CAREER.economia` (versão, escalas, fluxos do clube). Save sem o campo segue a regra de antes, sem migração. A chave `economia.ECONOMIA_V2.ativa` desliga a v2 só nos testes de equivalência com a cópia congelada da carreira antiga.

**Salário e valor.** A regra de sempre (overall, idade e potencial: `temporada.computeContractFields`) continua dando a forma; a economia dá a escala.

- **Escala de salário da liga:** leva a soma das folhas dos elencos (pela regra de sempre) à soma das folhas-base da liga (Entrega 1).
- **Escala do clube:** a da liga × (receita do clube ÷ mediana da liga)^0,4. O clube mais rico paga mais pela mesma qualidade. A folha real de cada clube sai dos contratos (quem tem elenco melhor paga mais) e fica a ±30% da folha-base nos perfis medidos.
- **Escala de valor:** média geométrica entre a escala do clube e a da liga (expoente 1,0, `EXPOENTE_VALOR`). O preço segue o mercado da liga, com o porte de quem vende.
- **Demanda:** quem compra de um mercado mais caro paga parte da diferença de preço. A reserva do vendedor parte do valor × (escala de valor do comprador ÷ a do vendedor)^0,5, entre 1 e 3 (`fatorDeDemanda`). Vale igual para a proposta do técnico e para a compra da CPU. Ex.: o Real Madrid comprando do River paga cerca de 2,6× o valor.
- **Aplicação:** todos os contratos do save são escalados uma vez na criação (`p.escalaEco` evita escalar de novo). Contratos gerados depois (base, prospecto do olheiro, reposição da CPU, promoção da base da CPU, renovação da CPU) já nascem na escala do clube. O salário justo (moral da virada, agente livre, "à venda") usa a escala do clube.
- **Clubes que entram depois:** quem entra no save (subiu do catálogo ou da Série D, ou foi aberto no mercado do mundo) recebe a escala da liga dele na entrada ou na virada.

**Reserva do vendedor e pedido do atleta.** As regras de hoje (`mercado.reservaParaProposta`, `avaliacaoAtleta`) não mudam: elas partem do valor (com a demanda) e do salário do atleta, que agora estão na escala. Ex.: um atleta de um clube menor pede mais para ir a um clube maior. Um do clube maior recusa um salário de clube menor, com o motivo "O salário oferecido está abaixo do que ele ganha".

**Finanças do clube do técnico.**

- **Caixa inicial:** o da base financeira.
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

- Folha real pelos contratos (±30% da base), e não igual à base. Com a escala exata por clube, um clube pequeno pagava mais que o Arsenal pelo mesmo atleta, porque o elenco dele vale pouco na regra antiga. A escala pela liga com o porte do clube preserva a ordem (mesma qualidade, clube mais rico paga mais).
- O expoente de valor (1,0), o porte salarial (0,4) e a demanda (expoente 0,5, teto 3) são parâmetros imputados, exportados e documentados (`EXPOENTE_VALOR`, `PORTE_SALARIAL`, `DEMANDA`). A calibração usou os negócios de referência: sem a demanda, a venda do River ao Real Madrid saía a € 5 mi.
- Os negócios de referência ficam entre 0,35× e 0,8× do valor real antes do prêmio da reserva do vendedor (titular, falta de reposição, fim de janela: até +50%). Recordes como Isak e cláusulas como a de Mastantuono continuam acima do que o motor pede.
- Receita de venda de atletas, aportes e prêmios continentais seguem fora da base recorrente. Os prêmios das copas continuam creditados pelo motor de competições.

## Casos não confirmados

- **Grande português:** Portugal não está entre as 20 ligas do mundo. O Benfica fica no catálogo só como referência (`REFERENCIAS.benfica`).
- **Distribuição da FIFA:** ela mede transferências internacionais com taxa. A tabela acima mede os elencos dos saves. A distribuição das transferências feitas (técnico e CPU) por temporada vem na simulação de 5 temporadas (Entrega 3).
- **Brasil:** sem rede, o modo exemplo tem elencos fictícios (overall até 92), e os valores do Brasil na tabela são desses elencos. Com os elencos reais, a ordem de grandeza segue a dos clubes do mundo.
- **Interface:** "Paga agora", "Custo mensal", "Caixa após", o filtro de despesas no extrato e os motivos na tela ficam para a Entrega 3. Por enquanto, a mensagem de recusa da proposta já traz o motivo.
