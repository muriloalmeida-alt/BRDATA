## Como funciona (economia v2)

**Onde vale.** Só em carreira nova: a criação grava `CAREER.economia` (versão, escalas, fluxos do clube). Save sem o campo segue a regra de antes, sem migração. A chave `economia.ECONOMIA_V2.ativa` desliga a v2 só nos testes de equivalência com a cópia congelada da carreira antiga.

**Salário e valor.** A regra de sempre (overall, idade e potencial: `temporada.computeContractFields`) continua dando a forma; a economia dá a escala.

- **Escala de salário da liga:** leva a soma das folhas dos elencos (pela regra de sempre) à soma das folhas-base da liga (Entrega 1).
- **Escala do clube:** a da liga × (receita do clube ÷ mediana da liga)^0,4. O clube mais rico paga mais pela mesma qualidade. A folha real de cada clube sai dos contratos (quem tem elenco melhor paga mais) e fica a ±30% da folha-base nos perfis medidos.
- **Escala de valor:** média geométrica entre a escala do clube e a da liga (expoente 1,0, `EXPOENTE_VALOR`). O preço segue o mercado da liga, com o porte de quem vende.
- **Demanda (só entre países):** quando um dos clubes é de fora do país do save, quem compra de um mercado mais caro paga parte da diferença de preço. A reserva do vendedor parte do valor × (escala de valor do comprador ÷ a do vendedor)^0,5, entre 1 e 3 (`fatorDeDemanda`). Vale igual para a proposta do técnico e para a compra da CPU. Ex.: o Real Madrid comprando do River paga cerca de 2,6× o valor. No mercado doméstico, o preço parte do valor exibido: a escala do clube já tem o porte, e uma demanda escondida faria o clube recusar o valor que a tela mostra.
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
