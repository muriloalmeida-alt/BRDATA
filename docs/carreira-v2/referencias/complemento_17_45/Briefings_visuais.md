# BRDATA — Pendências visuais da Carreira 2.0

Referência consultada: BRDATA_Mobile_Caderno_Visual.pdf, pranchas 01_partida e 02_resultados. Pranchas 05_elenco e 06_clube fazem parte do caderno de referência. As quatro capturas da v2 atual não foram anexadas; não houve comparação com a implementação atual nem auditoria de código nesta entrega.

## Leitura e dados

As pranchas começam em 17, com três viewports de 390×844 por prancha, exportados em 390×844 px cada. Margens e legendas ficam fora da UI. Colunas são lidas da esquerda para a direita. Telas individuais estão em telas/. Recortes de rolagem preservam o mesmo ID e representam partes da mesma tela; não exigem novas rotas. Estados têm entradas próprias no inventário.

“—” é um vínculo ainda não preenchido por dados do jogo, e não um estado vazio, zero, indisponibilidade ou texto a implementar. Valores de recompensas, contratos, caixa, custos, preços, overall e estatísticas não foram fornecidos. Não foram fabricados. Na aplicação, preencher com o valor real; se ausente, seguir o tratamento do código. B. Santos, L. Freitas, E. Gomes, T. Barros, Central, União FC, Aurora e demais nomes genéricos são marcadores editoriais do estilo anterior e devem ser substituídos pelo save. As camisas mostram “—” no lugar do overall ainda não fornecido; nunca número de camisa.

VALIDAR NO CÓDIGO reconhece função real; não é condicional de implementação. COMPONENTE marca folhas/confirmadores, inclusive variantes. O escopo desta entrega é visual, sem afirmar revisão de regras ou dados do repositório.

## Sistema visual e responsividade

Navy #080E18; texto #F5F7FA; secundário #A9AEB7; divisórias #2B333F; lima #B4E64B sobre #0B1508; dourado #F0C35A; negativo #EF5C62. Barlow Condensed Bold em títulos; Barlow e Barlow SemiBold no corpo, 16px ou mais. Kicker e status de sistema são metadados menores. Escudos: círculos neutros com siglas, substituíveis por ativos oficiais quando disponíveis.

390×844 é viewport lógico. Entre 360 e 430: margens 24px (20px a 360), largura fluida, texto quebra sem truncar informação; sem ampliar toda a imagem como solução de responsividade. Corpo tem scroll vertical; CTA de 48px fica acima da navegação. Cada alvo contextual tem pelo menos 44px; campos e segmentos têm 44–48px. Safe area superior 44px e inferior 34px, ajustadas por env(safe-area-inset-*). Rodapé não cobre conteúdo: reservar padding inferior igual ao CTA + navegação + safe area. Conservar âncoras e seleção ao voltar.

Estados de seleção apresentados em abas/controles devem refletir o estado real (a renderização ilustra apenas a estrutura). Campo Selecionar abre lista curta com opções reais; não é texto para substituir um controle funcional. Na implementação, escolha precisa ter contraste, indicador além da cor, label acessível e foco visível. Contraste: as cores de texto passam AA sobre navy; divisória decorativa não é borda suficiente de controle. Adicionar borda acessível/foco com #A9AEB7 nos controles interativos.

## Decisões herdadas

1. Wordmark: manter BRDATA tipográfico, “BR” branco e “DATA” lima sobre navy. Não substituir por logo novo. Usar Barlow Condensed Bold; tamanho mínimo 72px de largura, altura de letra preservada; área livre mínima igual à altura do B. Em fundo claro usar BR #080E18 e DATA #0B1508 para contraste. Não usar lima como texto pequeno em branco. O wordmark existente permanece a referência, não há nova marca para aprovar.
2. Voltar ao clube / Voltar ao resultado / Voltar à partida são ações secundárias em texto, com hit area mínima de 44px. Seta no topo usa histórico da rota v2; nunca envia à v1. Lima fica reservado à progressão ou confirmação: Continuar, Salvar, Receber, Confirmar, Iniciar amistoso. Em leitura sem decisão, não inventar CTA só para preencher rodapé.
3. Respostas de coletiva, ações por item e escolhas podem ocupar a ação principal contextual. Não duplicar seleção com botão genérico de envio quando o jogo já executa ao tocar.
4. Folhas escuras preservam tela atual atrás. Uma confirmação obrigatória foi desenhada para mudança de clube. Não acrescentar confirmação universal a cada ação reversível.

## Implementação sem lacunas inventadas

Os endpoints/rótulos das pontas táticas, as opções por setor, os atributos, as métricas internas de estatísticas e as perguntas de ajuda não foram fornecidos: conferir no código antes de preencher. Prancha é contrato de composição, não autorização para acrescentar funções. A lista de melhorias não especifica ação de iniciar obra; validar a ação existente antes de criar um botão. Salvar/aplicar usados em seleções novas devem usar o fluxo real.

Loja: catálogo e preços reais, sem inventar valores. Mercado: janela de entrada nas rodadas 1–3 e 20–22; vendas fora da janela são permitidas. Copa: as fases são as listadas no pedido, mas formato de ida/volta depende da regra real de cada fase. Não deduzir que todas as fases possuem dois jogos.

## Telas e variantes

### CAP04-N01 | VALIDAR NO CÓDIGO

- Tela: Semana concluída. Variante: principal.
- Prancha: `17_carreira_2_0.png`, coluna 1.
- Título: A semana avançou.
- Apoio: Confira o que mudou no clube.
- Conteúdo: TREINO APLICADO; Foco / Tático; Intensidade / Moderada; CONDIÇÃO DO ELENCO; B. Santos / + —% (positivo); L. Freitas / − —% (negativo); PRAZOS E FINANÇAS; Contratos encerrados / —; Janela de transferências / —; Salários pagos / R$ —.
- Ação principal: Continuar. Secundária: Voltar ao clube. 
- Dados e validação: Foco e intensidade são exemplos usando opções fornecidas. Condição anterior/atual, nomes afetados, prazos e salários devem vir do avanço real. Renderizar virada de mês apenas quando ocorrer.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N02 | VALIDAR NO CÓDIGO

- Tela: Pré-jogo de amistoso. Variante: principal.
- Prancha: `17_carreira_2_0.png`, coluna 2.
- Título: Entre em campo.
- Apoio: Prepare seu time para o amistoso.
- Conteúdo: AMISTOSO; Não vale pontos; lesões contam.; Central / União FC / — × —; SEU TIME; Formação atual / —; Escalação / Revisar ›.
- Ação principal: Iniciar amistoso. Secundária: Voltar ao clube. 
- Dados e validação: Reutilizar composição do Pré-jogo aprovado; não inferir escalação ou formação. Sem pontos, classificação ou prêmio por vitória.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N03 | VALIDAR NO CÓDIGO

- Tela: Coletiva de imprensa. Variante: principal.
- Prancha: `17_carreira_2_0.png`, coluna 3.
- Título: Sua vez de falar.
- Apoio: Uma pergunta. Escolha sua resposta.
- Conteúdo: COLETIVA PÓS-JOGO; Como você avalia essa vitória importante?; O mérito é de todo o elenco. / Moral do elenco: —; Seguimos trabalhando. / Reputação: —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Pular. Selecionar uma resposta resolve a pergunta; Pular encerra sem resposta.
- Dados e validação: Pergunta e respostas são exemplos editoriais para o gatilho vitória importante. Claude deve substituir pelo catálogo real do jogo; não assumir sinais ou valores dos efeitos.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N04 | VALIDAR NO CÓDIGO

- Tela: Resultados da rodada. Variante: principal.
- Prancha: `18_carreira_2_0.png`, coluna 1.
- Título: A disputa continua.
- Apoio: Confira todos os jogos da rodada.
- Conteúdo: RESULTADOS DA RODADA; Central / União FC / jogo destacado / 1 – 0; Aurora / Vila Nova / 2 – 2.
- Ação principal: Continuar. Secundária: Ver tabela. 
- Dados e validação: Lista visual reutiliza o trecho de 02_resultados col.2: escudos, nomes, placar central, divisórias. Os dois placares vêm de 02_resultados col. 2 como referência visual. Em produção, mostrar todos os jogos reais da rodada. Seu jogo tem linha lima, sem card.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T05 | VALIDAR NO CÓDIGO

- Tela: Proposta recebida. Variante: Rolagem 1/2.
- Prancha: `18_carreira_2_0.png`, coluna 2.
- Título: Uma oferta chegou.
- Apoio: Decida o futuro do seu jogador.
- Conteúdo: B. Santos / Atacante; Idade / — anos; CLUBE INTERESSADO; União FC / UNI; VALOR OFERECIDO / R$ —; Parcelamento / À vista; Valor de mercado / R$ —; Diferença para o mercado / R$ —.
- Ação principal: Aceitar. Secundária: Recusar. Aceitar; Recusar; Comparar propostas quando aplicável.
- Dados e validação: Exibir Comparar propostas somente com duas ou mais. Ação fica em linha no conteúdo. Valores e diferença derivados da proposta real.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T05 | VALIDAR NO CÓDIGO

- Tela: Proposta recebida. Variante: Rolagem 2/2.
- Prancha: `18_carreira_2_0.png`, coluna 3.
- Título: Uma oferta chegou.
- Apoio: Decida o futuro do seu jogador.
- Conteúdo: Comparar propostas / ›.
- Ação principal: Aceitar. Secundária: Recusar. Aceitar; Recusar; Comparar propostas quando aplicável.
- Dados e validação: Exibir Comparar propostas somente com duas ou mais. Ação fica em linha no conteúdo. Valores e diferença derivados da proposta real.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N05 | VALIDAR NO CÓDIGO

- Tela: Partida da Copa do Brasil. Variante: Ida.
- Prancha: `19_carreira_2_0.png`, coluna 1.
- Título: Copa do Brasil.
- Apoio: Oitavas de final · Ida
- Conteúdo: COPA DO BRASIL; Central / União FC / jogo destacado / — × —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar à partida. 
- Dados e validação: Estudo apenas do topo e placar; não redesenha corpo da Partida. Oitavas é exemplo dentre as fases dadas. Exibir agregado só na volta. Série de pênaltis usa placar real sem criar timer, cobranças ou regras de desempate.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N05 | VALIDAR NO CÓDIGO

- Tela: Partida da Copa do Brasil. Variante: Volta.
- Prancha: `19_carreira_2_0.png`, coluna 2.
- Título: Copa do Brasil.
- Apoio: Oitavas de final · Volta
- Conteúdo: COPA DO BRASIL; Central / União FC / jogo destacado / — × —; AGREGADO / Central — × — União FC.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar à partida. 
- Dados e validação: Estudo apenas do topo e placar; não redesenha corpo da Partida. Oitavas é exemplo dentre as fases dadas. Exibir agregado só na volta. Série de pênaltis usa placar real sem criar timer, cobranças ou regras de desempate.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N05 | VALIDAR NO CÓDIGO

- Tela: Partida da Copa do Brasil. Variante: Pênaltis.
- Prancha: `19_carreira_2_0.png`, coluna 3.
- Título: Copa do Brasil.
- Apoio: Oitavas de final · Volta
- Conteúdo: COPA DO BRASIL; Central / União FC / jogo destacado / — × —; AGREGADO / Central — × — União FC; PÊNALTIS / Central — × — União FC.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar à partida. 
- Dados e validação: Estudo apenas do topo e placar; não redesenha corpo da Partida. Oitavas é exemplo dentre as fases dadas. Exibir agregado só na volta. Série de pênaltis usa placar real sem criar timer, cobranças ou regras de desempate.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP01-N01 | VALIDAR NO CÓDIGO

- Tela: Recompensa diária. Variante: Disponível.
- Prancha: `20_carreira_2_0.png`, coluna 1.
- Título: Bom ter você aqui.
- Apoio: Sua sequência de recompensas.
- Conteúdo: Sequência dia 1 a 7; RECOMPENSA DO DIA / Créditos ou bônus; Receba a recompensa de hoje..
- Ação principal: Receber. Secundária: Voltar ao clube. 
- Dados e validação: Dias 1 a 7 fixos. Dia 1 destacado apenas para mostrar a seleção; dia corrente, sequência, tipo e quantidade vêm do jogo; não criar valor de créditos, multiplicador, timer ou calendário futuro. A variante recebida não oferece nova coleta.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP01-N01 | VALIDAR NO CÓDIGO

- Tela: Recompensa diária. Variante: Já recebida hoje.
- Prancha: `20_carreira_2_0.png`, coluna 2.
- Título: Bom ter você aqui.
- Apoio: Sua sequência de recompensas.
- Conteúdo: Sequência dia 1 a 7; RECOMPENSA DO DIA / Créditos ou bônus; Já recebida hoje..
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Dias 1 a 7 fixos. Dia 1 destacado apenas para mostrar a seleção; dia corrente, sequência, tipo e quantidade vêm do jogo; não criar valor de créditos, multiplicador, timer ou calendário futuro. A variante recebida não oferece nova coleta.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-T06 | COMPONENTE

- Tela: Sessão expirada. Variante: Reautenticação.
- Prancha: `20_carreira_2_0.png`, coluna 3.
- Título: Sua sessão expirou.
- Apoio: Entre novamente para continuar.
- Conteúdo: Use a mesma conta desta carreira.; E-mail / seu e-mail; Senha / ••••••••.
- Ação principal: Entrar. Secundária: nenhuma. 
- Dados e validação: Folha bloqueante sobre tela atual, preservada ao fundo. Não trocar o proprietário do save. Senha nunca deve aparecer em claro. Erro mantém os campos editáveis.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-T06 | COMPONENTE

- Tela: Sessão expirada. Variante: Conta incorreta.
- Prancha: `21_carreira_2_0.png`, coluna 1.
- Título: Sua sessão expirou.
- Apoio: Entre novamente para continuar.
- Conteúdo: Use a mesma conta desta carreira.; E-mail / seu e-mail; Senha / ••••••••; Esta carreira é de outra conta..
- Ação principal: Entrar. Secundária: nenhuma. 
- Dados e validação: Folha bloqueante sobre tela atual, preservada ao fundo. Não trocar o proprietário do save. Senha nunca deve aparecer em claro. Erro mantém os campos editáveis.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N06 | VALIDAR NO CÓDIGO

- Tela: Nova temporada. Variante: principal.
- Prancha: `21_carreira_2_0.png`, coluna 2.
- Título: Temporada AAAA.
- Apoio: Uma nova temporada começa.
- Conteúdo: VIRADA DE TEMPORADA; Elenco envelhecido / — jogadores; Contratos encerrados / —; Promovidos ou rebaixados / —; OBJETIVO DA DIRETORIA; —.
- Ação principal: Começar temporada. Secundária: Voltar ao clube. 
- Dados e validação: AAAA é vínculo ao ano real; listar nomes/idades alterados e contratos reais. Bloco de promoção/rebaixamento só quando ocorrer. Objetivo sem texto inventado.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T04 | VALIDAR NO CÓDIGO

- Tela: Proposta ao treinador. Variante: principal.
- Prancha: `21_carreira_2_0.png`, coluna 3.
- Título: Um novo caminho.
- Apoio: Avalie o convite de outro clube.
- Conteúdo: CLUBE INTERESSADO; União FC / Série —; Objetivo proposto / —; SEU CLUBE ATUAL; Central / Série —; Posição atual / —.
- Ação principal: Aceitar e mudar de clube. Secundária: Recusar. 
- Dados e validação: Ao aceitar, abrir confirmação antes de mudar; a carreira continua no novo clube.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T04 | COMPONENTE

- Tela: Confirmar mudança de clube. Variante: Confirmação.
- Prancha: `22_carreira_2_0.png`, coluna 1.
- Título: Mudar de clube?
- Apoio: Sua carreira continua no novo clube.
- Conteúdo: Novo clube / União FC; Divisão / Série —; Objetivo / —; Você deixará o Central e seguirá sua carreira no União FC..
- Ação principal: Aceitar e mudar de clube. Secundária: Cancelar. 
- Dados e validação: Usar estado e dados reais da função existente; conferir bindings e rótulos no código.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T08 | VALIDAR NO CÓDIGO

- Tela: Fim de carreira / demissão. Variante: principal.
- Prancha: `22_carreira_2_0.png`, coluna 2.
- Título: O ciclo terminou.
- Apoio: A diretoria encerrou seu contrato.
- Conteúdo: MOTIVO; Resultados abaixo do objetivo.; SUA PASSAGEM; Jogos / —; Vitórias / —; Títulos / —; Ver propostas / ›.
- Ação principal: Começar nova carreira. Secundária: nenhuma. 
- Dados e validação: Ver propostas somente quando houver. Não confundir demissão com exclusão de conta ou save. Sem contagem fictícia de conquistas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T05 | VALIDAR NO CÓDIGO

- Tela: Histórico e conquistas. Variante: principal.
- Prancha: `22_carreira_2_0.png`, coluna 3.
- Título: Sua história no jogo.
- Apoio: Clubes, títulos e conquistas.
- Conteúdo: PASSAGENS POR CLUBES; Central / Temporadas —; Melhor posição / —; TÍTULOS; Título / —; CONQUISTAS DESBLOQUEADAS; Conquista / Data —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Nome, temporada e data são vínculos ao save. Não inventar conquistas, badges ou metas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T05 | VALIDAR NO CÓDIGO

- Tela: Histórico e conquistas. Variante: Sem conquistas.
- Prancha: `23_carreira_2_0.png`, coluna 1.
- Título: Sua história começa.
- Apoio: As conquistas aparecem conforme você joga.
- Conteúdo: CONQUISTAS; Você ainda não tem conquistas..
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Vazio apenas da seção conquistas; preservar passagens e títulos caso existam.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T03 | VALIDAR NO CÓDIGO

- Tela: Instruções táticas. Variante: principal.
- Prancha: `23_carreira_2_0.png`, coluna 2.
- Título: Dê seu ritmo.
- Apoio: Ajuste as instruções do seu time.
- Conteúdo: Formação atual / —; Ritmo de jogo / 1 · 2 · 3 · 4 · 5; Pressão / 1 · 2 · 3 · 4 · 5; Linha defensiva / 1 · 2 · 3 · 4 · 5; Estilo de passe / 1 · 2 · 3 · 4 · 5; Instruções por setor / ›.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Eixos de 1 a 5. Rótulos das pontas não foram fornecidos; vinculá-los ao catálogo real, sem inventar lento/rápido, alto/baixo ou curto/longo. Segmento selecionado vem da tática atual.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N01 | VALIDAR NO CÓDIGO

- Tela: Instruções por setor. Variante: Defesa · Rolagem 1/2.
- Prancha: `23_carreira_2_0.png`, coluna 3.
- Título: Ajuste cada setor.
- Apoio: Detalhe como seu time joga.
- Conteúdo: Defesa | Meio | Ataque; Linha defensiva / Selecionar; Pressão pós-perda / Selecionar; Compactação / Selecionar; Saída de bola / Selecionar.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa: Defesa. Cada campo abre escolha curta de 3 a 5 opções reais. Rótulos não informados: não criar opções. Persistência/ação Salvar deve usar o mecanismo existente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N01 | VALIDAR NO CÓDIGO

- Tela: Instruções por setor. Variante: Defesa · Rolagem 2/2.
- Prancha: `24_carreira_2_0.png`, coluna 1.
- Título: Ajuste cada setor.
- Apoio: Detalhe como seu time joga.
- Conteúdo: Bola parada defensiva / Selecionar.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa: Defesa. Cada campo abre escolha curta de 3 a 5 opções reais. Rótulos não informados: não criar opções. Persistência/ação Salvar deve usar o mecanismo existente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N01 | VALIDAR NO CÓDIGO

- Tela: Instruções por setor. Variante: Meio · Rolagem 1/2.
- Prancha: `24_carreira_2_0.png`, coluna 2.
- Título: Ajuste cada setor.
- Apoio: Detalhe como seu time joga.
- Conteúdo: Defesa | Meio | Ataque; Intensidade de marcação / Selecionar; Amplitude / Selecionar; Transição / Selecionar; Rotação de bola / Selecionar.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa: Meio. Cada campo abre escolha curta de 3 a 5 opções reais. Rótulos não informados: não criar opções. Persistência/ação Salvar deve usar o mecanismo existente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N01 | VALIDAR NO CÓDIGO

- Tela: Instruções por setor. Variante: Meio · Rolagem 2/2.
- Prancha: `24_carreira_2_0.png`, coluna 3.
- Título: Ajuste cada setor.
- Apoio: Detalhe como seu time joga.
- Conteúdo: Cobertura de espaços / Selecionar.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa: Meio. Cada campo abre escolha curta de 3 a 5 opções reais. Rótulos não informados: não criar opções. Persistência/ação Salvar deve usar o mecanismo existente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N01 | VALIDAR NO CÓDIGO

- Tela: Instruções por setor. Variante: Ataque · Rolagem 1/2.
- Prancha: `25_carreira_2_0.png`, coluna 1.
- Título: Ajuste cada setor.
- Apoio: Detalhe como seu time joga.
- Conteúdo: Defesa | Meio | Ataque; Amplitude ofensiva / Selecionar; Movimentação / Selecionar; Últimos passes / Selecionar; Finalização / Selecionar.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa: Ataque. Cada campo abre escolha curta de 3 a 5 opções reais. Rótulos não informados: não criar opções. Persistência/ação Salvar deve usar o mecanismo existente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N01 | VALIDAR NO CÓDIGO

- Tela: Instruções por setor. Variante: Ataque · Rolagem 2/2.
- Prancha: `25_carreira_2_0.png`, coluna 2.
- Título: Ajuste cada setor.
- Apoio: Detalhe como seu time joga.
- Conteúdo: Bola parada ofensiva / Selecionar.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa: Ataque. Cada campo abre escolha curta de 3 a 5 opções reais. Rótulos não informados: não criar opções. Persistência/ação Salvar deve usar o mecanismo existente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T04 | VALIDAR NO CÓDIGO

- Tela: Esquemas salvos. Variante: principal.
- Prancha: `25_carreira_2_0.png`, coluna 3.
- Título: Seu plano de jogo.
- Apoio: Aplique um esquema ou salve o atual.
- Conteúdo: ESQUEMAS SALVOS; Nome do esquema / Formação —; Ritmo — · Pressão —
Linha — · Passe —; Aplicar / ›; Renomear / ›; Excluir / › (negativo).
- Ação principal: Salvar esquema atual. Secundária: Voltar ao clube. 
- Dados e validação: Nome e resumo dos quatro eixos do save. Aplicar, renomear e excluir são ações por esquema.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T04 | VALIDAR NO CÓDIGO

- Tela: Esquemas salvos. Variante: Vazio.
- Prancha: `26_carreira_2_0.png`, coluna 1.
- Título: Guarde sua ideia.
- Apoio: Reutilize suas configurações táticas.
- Conteúdo: Você ainda não salvou esquemas..
- Ação principal: Salvar esquema atual. Secundária: Voltar ao clube. 
- Dados e validação: Usar estado e dados reais da função existente; conferir bindings e rótulos no código.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T04 | COMPONENTE

- Tela: Salvar esquema atual. Variante: Nome.
- Prancha: `26_carreira_2_0.png`, coluna 2.
- Título: Salve seu esquema.
- Apoio: Dê um nome para reconhecer depois.
- Conteúdo: Nome / Nome do esquema.
- Ação principal: Salvar esquema atual. Secundária: Cancelar. 
- Dados e validação: Mesmo campo para renomear, preenchido com nome existente. Não adicionar limite de slots ou preço.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-N02 | VALIDAR NO CÓDIGO

- Tela: Marcação individual. Variante: principal.
- Prancha: `26_carreira_2_0.png`, coluna 3.
- Título: Acompanhe de perto.
- Apoio: Defina a marcação para o próximo jogo.
- Conteúdo: PRÓXIMO ADVERSÁRIO; União FC / UNI; Seu jogador / Escolher jogador; Jogador adversário / Escolher adversário; Sem marcação.
- Ação principal: Salvar. Secundária: Voltar ao clube. 
- Dados e validação: Selecionar apenas atletas elegíveis dos elencos reais; rótulo de commit Salvar deve ser confirmado no código. Sem recomendações automáticas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T05 | VALIDAR NO CÓDIGO

- Tela: Treinamento semanal. Variante: principal.
- Prancha: `27_carreira_2_0.png`, coluna 1.
- Título: Prepare a semana.
- Apoio: Defina foco, intensidade e grupo.
- Conteúdo: ESQUEMA DA SEMANA; Segunda / Editar ›; Terça / Editar ›; Quarta / Editar ›; Quinta / Editar ›; Sexta / Editar ›; Sábado / Editar ›; Domingo / Editar ›; Elenco — condição física / Ver ›.
- Ação principal: Aplicar treino da semana. Secundária: Voltar ao clube. 
- Dados e validação: Cada dia abre folha de escolhas mostrada na variante Dia. Resumo deve incluir foco, intensidade e grupo salvos; se não houver, usar Selecionar. Aplicar envia os sete dias.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T05 | COMPONENTE

- Tela: Editar treino do dia. Variante: Dia.
- Prancha: `27_carreira_2_0.png`, coluna 2.
- Título: Treino de segunda.
- Apoio: Escolha como o grupo vai treinar.
- Conteúdo: Foco / Técnico / Físico / Tático / Descanso; Intensidade / Leve / Moderada / Intensa; Grupo / Elenco / Misto (com Sub-20) / Individual.
- Ação principal: Aplicar treino da semana. Secundária: Voltar ao treino. 
- Dados e validação: Campos exibem somente opções fornecidas; comportamento de Individual e Descanso deve ser validado no código, sem criar regra.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T05 | VALIDAR NO CÓDIGO

- Tela: Condição no treinamento. Variante: Condição.
- Prancha: `27_carreira_2_0.png`, coluna 3.
- Título: Cuide do elenco.
- Apoio: Condição física antes do treino.
- Conteúdo: ELENCO — CONDIÇÃO FÍSICA; B. Santos / Atacante; Condição / —%; Risco de lesão; L. Freitas / Atacante; Condição / —%.
- Ação principal: Aplicar treino da semana. Secundária: Voltar ao treino. 
- Dados e validação: Alerta só para quem tiver risco calculado pelo jogo; não criar limiar nem percentual de risco.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T06 | VALIDAR NO CÓDIGO

- Tela: Evolução e condição física. Variante: principal.
- Prancha: `28_carreira_2_0.png`, coluna 1.
- Título: Veja a evolução.
- Apoio: Acompanhe fadiga e desenvolvimento.
- Conteúdo: B. Santos / Atacante; Condição atual / —%; FADIGA POR RODADA; Rodada — / —; OVERALL POR TEMPORADA; Temporada — / Overall —; Potencial · teto / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Históricos em lista, sem gráfico ou tendência inventados. Potencial é teto de overall, não porcentagem.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP03-T06 | VALIDAR NO CÓDIGO

- Tela: Evolução e condição física. Variante: Sem histórico.
- Prancha: `28_carreira_2_0.png`, coluna 2.
- Título: O histórico vem aí.
- Apoio: A evolução aparece conforme você joga.
- Conteúdo: B. Santos / Atacante; Condição atual / —%; Potencial · teto / —; Ainda não há histórico de fadiga ou evolução..
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Usar estado e dados reais da função existente; conferir bindings e rótulos no código.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N01 | COMPONENTE

- Tela: Filtros do elenco. Variante: principal.
- Prancha: `28_carreira_2_0.png`, coluna 3.
- Título: Encontre seu jogador.
- Apoio: Filtre e organize o elenco.
- Conteúdo: Posição / Selecionar; Situação / Titular / Banco / Lesionado / Suspenso / À venda; Categoria / Base / Profissional; Ordenar por / Overall / Idade / Condição / Contrato.
- Ação principal: Aplicar filtros. Secundária: Cancelar. 
- Dados e validação: Posições: Goleiro, Defensor, Meio-campo, Atacante. Direção da ordenação e combinação de filtros devem seguir o código; não criar opção.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N02 | VALIDAR NO CÓDIGO

- Tela: Ficha completa do jogador. Variante: Rolagem 1/2.
- Prancha: `29_carreira_2_0.png`, coluna 1.
- Título: Conheça seu jogador.
- Apoio: Dados e trajetória no clube.
- Conteúdo: B. Santos / Atacante; Idade / — anos; Potencial / —; Moral / —; Forma / —; ATRIBUTOS; Atributos do jogador / Ver ›; CONTRATO; Salário mensal / R$ —.
- Ação principal: Renovar contrato. Secundária: Conversar. 
- Dados e validação: Atributos reais sem nomes ou notas inventados. Continuação mostra estatísticas, clubes e demais ações.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N02 | VALIDAR NO CÓDIGO

- Tela: Ficha completa do jogador. Variante: Rolagem 2/2.
- Prancha: `29_carreira_2_0.png`, coluna 2.
- Título: Conheça seu jogador.
- Apoio: Dados e trajetória no clube.
- Conteúdo: Término / —; Valor de mercado / R$ —.
- Ação principal: Renovar contrato. Secundária: Conversar. 
- Dados e validação: Atributos reais sem nomes ou notas inventados. Continuação mostra estatísticas, clubes e demais ações.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N02 | VALIDAR NO CÓDIGO

- Tela: Ficha completa do jogador. Variante: Continuação · Rolagem 1/2.
- Prancha: `29_carreira_2_0.png`, coluna 3.
- Título: A temporada em números.
- Apoio: Estatísticas e histórico de B. Santos.
- Conteúdo: ESTATÍSTICAS DA TEMPORADA; Jogos / —; Gols / —; Assistências / —; Cartões / —; HISTÓRICO DE CLUBES; Clube / Temporadas —; Colocar à venda / ›; Emprestar / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao jogador. 
- Dados e validação: Separação é recorte de rolagem da mesma ficha, não uma nova rota obrigatória.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N02 | VALIDAR NO CÓDIGO

- Tela: Ficha completa do jogador. Variante: Continuação · Rolagem 2/2.
- Prancha: `30_carreira_2_0.png`, coluna 1.
- Título: A temporada em números.
- Apoio: Estatísticas e histórico de B. Santos.
- Conteúdo: Comparar / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao jogador. 
- Dados e validação: Separação é recorte de rolagem da mesma ficha, não uma nova rota obrigatória.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T06 | VALIDAR NO CÓDIGO

- Tela: Contratos. Variante: principal.
- Prancha: `30_carreira_2_0.png`, coluna 2.
- Título: Cuide da continuidade.
- Apoio: Salários e prazos do seu elenco.
- Conteúdo: Todos | Vencendo; B. Santos / Atacante; Salário mensal / R$ —; Término / —; Renovar / ›; L. Freitas / Atacante; Salário mensal / R$ —; Término / —; Renovar / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Renovar contextual por jogador; não criar ação coletiva. Janela temporal do filtro Vencendo é a existente no jogo.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N01 | COMPONENTE

- Tela: Renovar contrato. Variante: principal.
- Prancha: `30_carreira_2_0.png`, coluna 3.
- Título: Mantenha seu jogador.
- Apoio: Faça uma proposta de renovação.
- Conteúdo: B. Santos / Atacante; Salário sugerido / R$ —; Novo salário mensal / R$ —; Duração da proposta / 1 · 2 · 3 · 4 · 5 anos.
- Ação principal: Propor renovação. Secundária: Cancelar. 
- Dados e validação: Usar estado e dados reais da função existente; conferir bindings e rótulos no código.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N01 | COMPONENTE

- Tela: Resposta à renovação. Variante: Aceita.
- Prancha: `31_carreira_2_0.png`, coluna 1.
- Título: Proposta aceita.
- Apoio: Resposta do jogador à renovação.
- Conteúdo: B. Santos / Atacante; Motivo: —; Novo salário mensal / R$ —; Duração proposta / — anos.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar aos contratos. 
- Dados e validação: Motivo exato do motor. Não garantir aceitação nem inventar contraproposta.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N01 | COMPONENTE

- Tela: Resposta à renovação. Variante: Recusa.
- Prancha: `31_carreira_2_0.png`, coluna 2.
- Título: Proposta recusada.
- Apoio: Resposta do jogador à renovação.
- Conteúdo: B. Santos / Atacante; Motivo: —; Salário proposto / R$ —; Duração proposta / — anos.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar aos contratos. 
- Dados e validação: Motivo exato do motor. Não garantir aceitação nem inventar contraproposta.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T03 | VALIDAR NO CÓDIGO

- Tela: Conversa individual. Variante: principal.
- Prancha: `31_carreira_2_0.png`, coluna 3.
- Título: Abra o diálogo.
- Apoio: Escolha como falar com o jogador.
- Conteúdo: B. Santos / Atacante; Moral atual / —; Situação: —; Ouvir e apoiar; Prometer mais chances; Cobrar postura.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao jogador. 
- Dados e validação: Situação real; não assumir cinco jogos no banco. Cada resposta executa a conversa e abre reação.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T03 | VALIDAR NO CÓDIGO

- Tela: Reação do jogador. Variante: Reação.
- Prancha: `32_carreira_2_0.png`, coluna 1.
- Título: Conversa encerrada.
- Apoio: Veja como o jogador reagiu.
- Conteúdo: B. Santos / Atacante; REAÇÃO DO JOGADOR; —; Efeito na moral / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao jogador. 
- Dados e validação: Reação e efeito resultantes do motor; sem delta inventado.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N03 | VALIDAR NO CÓDIGO

- Tela: Comparar jogadores. Variante: principal.
- Prancha: `32_carreira_2_0.png`, coluna 2.
- Título: Compare lado a lado.
- Apoio: Escolha com os dados do elenco.
- Conteúdo: Sequência dia 1 a 7; ATRIBUTOS PRINCIPAIS; Atributo / —     |     —; Salário mensal / R$ —  |  R$ —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao elenco. 
- Dados e validação: Colunas fixas para os dois jogadores selecionados; atributos seguem esquema real. Sem indicador de melhor compra ou recomendação.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N04 | VALIDAR NO CÓDIGO

- Tela: Elenco de outro clube. Variante: principal.
- Prancha: `32_carreira_2_0.png`, coluna 3.
- Título: Conheça o adversário.
- Apoio: Consulte os jogadores do clube.
- Conteúdo: União FC / Série —; Posição na divisão / —; ELENCO; B. Santos / Atacante; L. Freitas / Atacante; E. Gomes / Meio-campo; T. Barros / Defensor.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Toque em uma linha abre perfil do alvo. Clubes e atletas são marcadores provenientes do estilo anterior, substituir por elenco real.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T01 | VALIDAR NO CÓDIGO

- Tela: Mercado. Variante: Janela aberta.
- Prancha: `33_carreira_2_0.png`, coluna 1.
- Título: Busque seu reforço.
- Apoio: Encontre jogadores no mercado.
- Conteúdo: Busca / Buscar jogador; Filtros / Posição · Divisão · Overall · Idade · Valor; Janela aberta; B. Santos / Atacante; Central · valor de mercado / R$ —; L. Freitas / Atacante; União FC · valor de mercado / R$ —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Janelas: rodadas 1–3 e 20–22. Fechada bloqueia novas entradas, permite consulta. Vendas podem ocorrer fora da janela; não bloquear Minhas vendas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T01 | VALIDAR NO CÓDIGO

- Tela: Mercado. Variante: Janela fechada.
- Prancha: `33_carreira_2_0.png`, coluna 2.
- Título: Busque seu reforço.
- Apoio: Encontre jogadores no mercado.
- Conteúdo: Busca / Buscar jogador; Filtros / Posição · Divisão · Overall · Idade · Valor; Janela fechada · somente leitura; B. Santos / Atacante; Central · valor de mercado / R$ —; L. Freitas / Atacante; União FC · valor de mercado / R$ —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Janelas: rodadas 1–3 e 20–22. Fechada bloqueia novas entradas, permite consulta. Vendas podem ocorrer fora da janela; não bloquear Minhas vendas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T01 | COMPONENTE

- Tela: Filtros do mercado. Variante: Filtros.
- Prancha: `33_carreira_2_0.png`, coluna 3.
- Título: Refine sua busca.
- Apoio: Encontre o perfil que você precisa.
- Conteúdo: Posição / Selecionar; Divisão / Série A / Série B / Série C; Faixa de overall / De — até —; Idade / De — até —; Valor / R$ — até R$ —.
- Ação principal: Aplicar filtros. Secundária: Cancelar. 
- Dados e validação: Limites e tratamento de intervalos seguem o código. Não criar faixas pré-definidas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T02 | VALIDAR NO CÓDIGO

- Tela: Perfil do alvo. Variante: principal.
- Prancha: `34_carreira_2_0.png`, coluna 1.
- Título: Conheça seu reforço.
- Apoio: Avalie o jogador antes de negociar.
- Conteúdo: B. Santos / Atacante; Idade / —; Overall / —; Potencial / —; Contrato / —; Valor de mercado / R$ —; Pedir empréstimo / ›; Comparar com meu elenco / ›.
- Ação principal: Fazer proposta. Secundária: Voltar ao clube. 
- Dados e validação: Ficha completa complementar disponível por rolagem com atributos, moral, forma, salário/término, estatísticas e clubes da CAP02-N02. Reutilizar a mesma fonte; ações de entrada dependem da janela.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T03 | VALIDAR NO CÓDIGO

- Tela: Fazer proposta. Variante: principal.
- Prancha: `34_carreira_2_0.png`, coluna 2.
- Título: Faça sua oferta.
- Apoio: Negocie a taxa de transferência.
- Conteúdo: B. Santos / Atacante; Valor de mercado / R$ —; Sua proposta / R$ —; Parcelamento da taxa / À vista (1x) / 2x / 3x…; Propor menos que o valor de mercado é possível, mas o clube pode recusar..
- Ação principal: Enviar proposta. Secundária: Cancelar. 
- Dados e validação: Máximo de parcelas não informado; carregar lista real. Não criar juros, entrada ou salário neste formulário.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T04 | VALIDAR NO CÓDIGO

- Tela: Negociação e contraproposta. Variante: principal.
- Prancha: `34_carreira_2_0.png`, coluna 3.
- Título: A negociação continua.
- Apoio: Compare os valores e decida.
- Conteúdo: B. Santos / Atacante; SUA PROPOSTA; VALOR / R$ —; CONTRAPROPOSTA DO CLUBE; VALOR / R$ —; Aumentar proposta / ›.
- Ação principal: Aceitar contraproposta. Secundária: Desistir. 
- Dados e validação: Aceitar segue para confirmar compra; aumentar retorna ao campo de oferta. Não criar prazo de resposta.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N02 | VALIDAR NO CÓDIGO

- Tela: Minhas propostas. Variante: principal.
- Prancha: `35_carreira_2_0.png`, coluna 1.
- Título: Suas negociações.
- Apoio: Acompanhe cada proposta enviada.
- Conteúdo: B. Santos / Aguardando; L. Freitas / Aceita (positivo); E. Gomes / Recusada (negativo); T. Barros / Contraproposta (destaque).
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Quatro linhas demonstram estados permitidos, sem presumir propostas existentes; nomes são exemplos do caderno. Toque mostra negociação correspondente.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N03 | VALIDAR NO CÓDIGO

- Tela: Comparar propostas. Variante: principal.
- Prancha: `35_carreira_2_0.png`, coluna 2.
- Título: Escolha a melhor oferta.
- Apoio: Propostas pelo mesmo jogador.
- Conteúdo: B. Santos / Atacante; União FC / Valor R$ — · Parcelas —; Aurora / Valor R$ — · Parcelas —.
- Ação principal: Escolher proposta. Secundária: Recusar todas. 
- Dados e validação: Selecionar oferta antes de confirmar; ordenação e critérios sem recomendação automática.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N04 | COMPONENTE

- Tela: Colocar à venda. Variante: principal.
- Prancha: `35_carreira_2_0.png`, coluna 3.
- Título: Abra as negociações.
- Apoio: Defina o valor pedido pelo jogador.
- Conteúdo: B. Santos / Atacante; Valor de mercado / R$ —; Valor pedido / R$ —.
- Ação principal: Anunciar. Secundária: Cancelar. 
- Dados e validação: Permitido fora da janela conforme regra do prompt; sem comissão ou prazo inventado.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N05 | VALIDAR NO CÓDIGO

- Tela: Minhas vendas. Variante: principal.
- Prancha: `36_carreira_2_0.png`, coluna 1.
- Título: Jogadores no mercado.
- Apoio: Gerencie anúncios e ofertas recebidas.
- Conteúdo: B. Santos / Atacante; Valor pedido / R$ —; Propostas recebidas / Ver ›; Retirar do mercado / ›; L. Freitas / Atacante; Valor pedido / R$ —; Propostas recebidas / Ver ›; Retirar do mercado / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Venda pode ocorrer fora da janela. Não mostrar contador de propostas sem dado real.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N06 | VALIDAR NO CÓDIGO

- Tela: Empréstimo. Variante: Entrada.
- Prancha: `36_carreira_2_0.png`, coluna 2.
- Título: Combine o empréstimo.
- Apoio: Condições para entrada do jogador.
- Conteúdo: B. Santos / Atacante; Duração do empréstimo / Temporada inteira / 6 meses; Percentual do salário que você paga / 50% / 75% / 100%; Cláusula de compra ao fim do empréstimo / Nenhuma / Opcional / Obrigatória; Valor da cláusula / R$ —.
- Ação principal: Propor empréstimo. Secundária: Cancelar. 
- Dados e validação: 6 meses = metade da temporada. Valor da cláusula só quando Opcional/Obrigatória. Percentual sempre do salário que o usuário paga, inclusive na saída. Confirmar rótulo final e semântica de pagamento no código; sem taxa inventada.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N06 | VALIDAR NO CÓDIGO

- Tela: Empréstimo. Variante: Saída.
- Prancha: `36_carreira_2_0.png`, coluna 3.
- Título: Combine o empréstimo.
- Apoio: Condições para saída do jogador.
- Conteúdo: B. Santos / Atacante; Duração do empréstimo / Temporada inteira / 6 meses; Percentual do salário que você paga / 50% / 75% / 100%; Cláusula de compra ao fim do empréstimo / Nenhuma / Opcional / Obrigatória; Valor da cláusula / R$ —.
- Ação principal: Propor empréstimo. Secundária: Cancelar. 
- Dados e validação: 6 meses = metade da temporada. Valor da cláusula só quando Opcional/Obrigatória. Percentual sempre do salário que o usuário paga, inclusive na saída. Confirmar rótulo final e semântica de pagamento no código; sem taxa inventada.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-N07 | COMPONENTE

- Tela: Confirmar compra. Variante: principal.
- Prancha: `37_carreira_2_0.png`, coluna 1.
- Título: Confirme seu reforço.
- Apoio: Revise o impacto antes de concluir.
- Conteúdo: B. Santos / Atacante; Valor da transferência / R$ —; Parcelas / —; IMPACTO NO CLUBE; Caixa / R$ —; Folha salarial mensal / R$ —.
- Ação principal: Confirmar. Secundária: Cancelar. 
- Dados e validação: Mostrar impactos reais calculados pelo motor. Não deduzir desembolso integral quando houver parcelas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T07 | VALIDAR NO CÓDIGO

- Tela: Histórico de negociações. Variante: principal.
- Prancha: `37_carreira_2_0.png`, coluna 2.
- Título: O mercado do clube.
- Apoio: Compras, vendas e empréstimos.
- Conteúdo: Compras | Vendas | Empréstimos; B. Santos / Atacante; Rodada / —; Clubes / Central × União FC; Valor / R$ —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Categorias organizam os tipos já existentes. Não inventar filtro temporal ou total acumulado.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T07 | VALIDAR NO CÓDIGO

- Tela: Histórico de negociações. Variante: Vazio.
- Prancha: `37_carreira_2_0.png`, coluna 3.
- Título: Seu histórico começa.
- Apoio: As negociações aparecerão aqui.
- Conteúdo: Ainda não há compras, vendas ou empréstimos..
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Usar estado e dados reais da função existente; conferir bindings e rótulos no código.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-T04 | VALIDAR NO CÓDIGO

- Tela: Comissão técnica. Variante: principal.
- Prancha: `38_carreira_2_0.png`, coluna 1.
- Título: Fortaleça a comissão.
- Apoio: Profissionais que trabalham com você.
- Conteúdo: PROFISSIONAIS CONTRATADOS; Função / —; Nível / —; Salário / R$ —; Demitir comissão técnica / › (negativo).
- Ação principal: Contratar comissão técnica. Secundária: Voltar ao clube. 
- Dados e validação: Lista real por profissional com ação contextual. Não criar funções, níveis, salários ou custo de rescisão.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T07 | VALIDAR NO CÓDIGO

- Tela: Estádio e infraestrutura. Variante: principal.
- Prancha: `38_carreira_2_0.png`, coluna 2.
- Título: Faça o clube crescer.
- Apoio: Capacidade, obras e melhorias.
- Conteúdo: Nome do estádio / —; Capacidade / — lugares; MELHORIAS; Setor Norte +3.000 lugares / Ver ›; Iluminação LED completa / Ver ›; Camarotes premium / Ver ›; Camarotes premium exige o Setor Norte..
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Cada melhoria expõe custo e prazo em detalhe/continuação. Nenhum custo ou prazo foi informado; não inventar retorno financeiro.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-T07 | VALIDAR NO CÓDIGO

- Tela: Obras e melhorias. Variante: Obras.
- Prancha: `38_carreira_2_0.png`, coluna 3.
- Título: O clube em obras.
- Apoio: Acompanhe o andamento das melhorias.
- Conteúdo: MELHORIA SELECIONADA; Setor Norte +3.000 lugares; Custo / R$ —; Prazo / — rodadas; EM ANDAMENTO; Obra / —; Rodadas restantes / —; CONCLUÍDAS; Melhoria concluída / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Estados demonstram estrutura e não afirmam obras contratadas; dados são do save. Ação de compra/início não foi especificada; validar no código antes de acrescentar.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP06-N01 | VALIDAR NO CÓDIGO

- Tela: Propostas de patrocínio. Variante: principal.
- Prancha: `39_carreira_2_0.png`, coluna 1.
- Título: Novas parcerias.
- Apoio: Avalie as propostas para o clube.
- Conteúdo: PROPOSTA DE PATROCÍNIO; Empresa / —; Valor por temporada / R$ —; Duração / —; Aceitar / › (positivo); Recusar / › (negativo).
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Aceitar e Recusar por proposta, com área de toque de 44 px. Empresa e duração reais; sem preços inventados.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP02-N05 | VALIDAR NO CÓDIGO

- Tela: Extrato financeiro. Variante: principal.
- Prancha: `39_carreira_2_0.png`, coluna 2.
- Título: Cada movimento conta.
- Apoio: Entradas, saídas e saldo por rodada.
- Conteúdo: SALDO / R$ —; RODADA —; Tipo · descrição / + R$ — (positivo); Tipo · descrição / − R$ — (negativo).
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Sequência real das movimentações. Cor semântica acompanhada de +/−. Sem receitas ou despesas inventadas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T08 | VALIDAR NO CÓDIGO

- Tela: Olheiros e missões. Variante: principal.
- Prancha: `39_carreira_2_0.png`, coluna 3.
- Título: Amplie seu alcance.
- Apoio: Organize a observação de jogadores.
- Conteúdo: OLHEIROS EM CAMPO; Olheiro contratado / —; Contratar olheiro / ›; MISSÕES; Região ou posição / —; Custo / R$ —; Prazo / — rodadas; Nova missão / ›; Indicações dos olheiros / ›; Enviar olheiro ao mercado / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Regiões, posições, níveis e custos reais. Não inventar missão, avaliação automática ou desbloqueio.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T09 | VALIDAR NO CÓDIGO

- Tela: Relatórios e prospectos. Variante: principal.
- Prancha: `40_carreira_2_0.png`, coluna 1.
- Título: Veja os prospectos.
- Apoio: Relatórios das missões de observação.
- Conteúdo: RELATÓRIOS DAS MISSÕES; B. Santos / Atacante; Overall estimado / —; Potencial estimado / —; Ver jogador / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Estimativas identificadas por extenso; não apresentar como overall/potencial exatos. Sem preço, confiança ou estrelas inventadas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP05-T10 | VALIDAR NO CÓDIGO

- Tela: Categorias de base. Variante: principal.
- Prancha: `40_carreira_2_0.png`, coluna 2.
- Título: O futuro está aqui.
- Apoio: Acompanhe os atletas da base.
- Conteúdo: B. Santos / Atacante; Idade / — anos; Overall / —; Potencial / —; Promover ao profissional / › (positivo); Dispensar / › (negativo).
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Promoção/dispensa por jogador. Camisa usa overall; não usar número nem foto. Não inventar idade ou limite de atletas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N07 | VALIDAR NO CÓDIGO

- Tela: Copa do Brasil. Variante: Em disputa.
- Prancha: `40_carreira_2_0.png`, coluna 3.
- Título: A caminho da taça.
- Apoio: Copa do Brasil · Em disputa
- Conteúdo: Fase / Oitavas de final; SEU CONFRONTO; Central / União FC / jogo destacado / — × —; Ida / — × —; Volta / — × —; Agregado / — × —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Seletor: 1ª fase, 2ª fase, Oitavas de final, Quartas de final, Semifinal, Final. Chaveamento completo em rolagem por fase. Ida/volta apenas nas fases em que o código prevê; não inventar formato para fases iniciais.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N07 | VALIDAR NO CÓDIGO

- Tela: Copa do Brasil. Variante: Eliminado.
- Prancha: `41_carreira_2_0.png`, coluna 1.
- Título: Sua campanha terminou.
- Apoio: Copa do Brasil · Eliminado
- Conteúdo: Fase / Oitavas de final; SEU CONFRONTO; Central / União FC / jogo destacado / — × —; Ida / — × —; Volta / — × —; Agregado / — × —; Eliminado.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Seletor: 1ª fase, 2ª fase, Oitavas de final, Quartas de final, Semifinal, Final. Chaveamento completo em rolagem por fase. Ida/volta apenas nas fases em que o código prevê; não inventar formato para fases iniciais.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N07 | VALIDAR NO CÓDIGO

- Tela: Copa do Brasil. Variante: Campeão.
- Prancha: `41_carreira_2_0.png`, coluna 2.
- Título: A Copa é sua.
- Apoio: Copa do Brasil · Campeão
- Conteúdo: Fase / Oitavas de final; SEU CONFRONTO; Central / União FC / jogo destacado / — × —; Ida / — × —; Volta / — × —; Agregado / — × —; CAMPEÃO / Central.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Seletor: 1ª fase, 2ª fase, Oitavas de final, Quartas de final, Semifinal, Final. Chaveamento completo em rolagem por fase. Ida/volta apenas nas fases em que o código prevê; não inventar formato para fases iniciais.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N08 | VALIDAR NO CÓDIGO

- Tela: Estatísticas. Variante: Meu Time.
- Prancha: `41_carreira_2_0.png`, coluna 3.
- Título: O jogo em números.
- Apoio: Consulte os dados da competição.
- Conteúdo: Meu Time | Campeonato; Temporada Atual | Histórico; RETROSPECTO; Dados do retrospecto / —; GOLS; Dados de gols / —; DISCIPLINA E DEFESA; Dados de disciplina e defesa / —; MANDANTE × VISITANTE; Mandante / —; Visitante / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Quatro abas exclusivas, quebradas em duas linhas por largura. Ativa: Meu Time. Campos internos não especificados: bindar exatamente as métricas existentes em cada bloco. Sem gráficos, ratings ou métricas novas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N08 | VALIDAR NO CÓDIGO

- Tela: Estatísticas. Variante: Campeonato.
- Prancha: `42_carreira_2_0.png`, coluna 1.
- Título: O jogo em números.
- Apoio: Consulte os dados da competição.
- Conteúdo: Meu Time | Campeonato; Temporada Atual | Histórico; RETROSPECTO; Dados do retrospecto / —; GOLS; Dados de gols / —; DISCIPLINA E DEFESA; Dados de disciplina e defesa / —; MANDANTE × VISITANTE; Mandante / —; Visitante / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Quatro abas exclusivas, quebradas em duas linhas por largura. Ativa: Campeonato. Campos internos não especificados: bindar exatamente as métricas existentes em cada bloco. Sem gráficos, ratings ou métricas novas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N08 | VALIDAR NO CÓDIGO

- Tela: Estatísticas. Variante: Temporada Atual.
- Prancha: `42_carreira_2_0.png`, coluna 2.
- Título: O jogo em números.
- Apoio: Consulte os dados da competição.
- Conteúdo: Meu Time | Campeonato; Temporada Atual | Histórico; RETROSPECTO; Dados do retrospecto / —; GOLS; Dados de gols / —; DISCIPLINA E DEFESA; Dados de disciplina e defesa / —; MANDANTE × VISITANTE; Mandante / —; Visitante / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Quatro abas exclusivas, quebradas em duas linhas por largura. Ativa: Temporada Atual. Campos internos não especificados: bindar exatamente as métricas existentes em cada bloco. Sem gráficos, ratings ou métricas novas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N08 | VALIDAR NO CÓDIGO

- Tela: Estatísticas. Variante: Histórico.
- Prancha: `42_carreira_2_0.png`, coluna 3.
- Título: O jogo em números.
- Apoio: Consulte os dados da competição.
- Conteúdo: Meu Time | Campeonato; Temporada Atual | Histórico; RETROSPECTO; Dados do retrospecto / —; GOLS; Dados de gols / —; DISCIPLINA E DEFESA; Dados de disciplina e defesa / —; MANDANTE × VISITANTE; Mandante / —; Visitante / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Quatro abas exclusivas, quebradas em duas linhas por largura. Ativa: Histórico. Campos internos não especificados: bindar exatamente as métricas existentes em cada bloco. Sem gráficos, ratings ou métricas novas.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP04-N09 | VALIDAR NO CÓDIGO

- Tela: Retrospecto H2H. Variante: principal.
- Prancha: `43_carreira_2_0.png`, coluna 1.
- Título: O histórico do duelo.
- Apoio: Central × União FC.
- Conteúdo: CONFRONTOS DIRETOS; Vitórias / —; Empates / —; Derrotas / —; ÚLTIMOS JOGOS; Central / União FC / — × —; União FC / Central / — × —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Vitórias/derrotas pela perspectiva do primeiro clube, com identificação clara. Datas, quantidade e placares reais.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-T01 | VALIDAR NO CÓDIGO

- Tela: Mais / menu. Variante: principal.
- Prancha: `43_carreira_2_0.png`, coluna 2.
- Título: Seu jogo continua.
- Apoio: Conta, carreira e preferências.
- Conteúdo: Perfil do treinador / ›; Conquistas / ›; Premiações / ›; Ranking / ›; Loja / ›; Configurações / ›; Central de ajuda / ›; Saves / ›; Sair / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: nenhuma. 
- Dados e validação: Exatamente os nove itens solicitados. Sair é ação de conta, não navegação legada. Configurações e Saves sem requisitos de conteúdo neste escopo; não redesenhá-los por suposição.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-N01 | VALIDAR NO CÓDIGO

- Tela: Editar perfil. Variante: principal.
- Prancha: `43_carreira_2_0.png`, coluna 3.
- Título: Seu nome no jogo.
- Apoio: Atualize o nome do treinador.
- Conteúdo: Nome do treinador / Nome atual.
- Ação principal: Salvar. Secundária: Cancelar. 
- Dados e validação: Único campo: nome. Sem foto, avatar, e-mail ou senha.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-N02 | VALIDAR NO CÓDIGO

- Tela: Ranking. Variante: Todos.
- Prancha: `44_carreira_2_0.png`, coluna 1.
- Título: Veja sua posição.
- Apoio: Treinadores e pontos no ranking.
- Conteúdo: Todos | Amigos; POSIÇÃO   TREINADOR                  PONTOS; —     Treinador / —; —     Treinador / —; —     Treinador / —.
- Ação principal: Convidar amigo. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa Todos. Convidar gera link pelo fluxo real; sem enviar mensagem automaticamente, inventar amigo, nome ou pontuação.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-N02 | VALIDAR NO CÓDIGO

- Tela: Ranking. Variante: Amigos.
- Prancha: `44_carreira_2_0.png`, coluna 2.
- Título: Veja sua posição.
- Apoio: Treinadores e pontos no ranking.
- Conteúdo: Todos | Amigos; POSIÇÃO   TREINADOR                  PONTOS; —     Treinador / —; —     Treinador / —; —     Treinador / —.
- Ação principal: Convidar amigo. Secundária: Voltar ao clube. 
- Dados e validação: Aba ativa Amigos. Convidar gera link pelo fluxo real; sem enviar mensagem automaticamente, inventar amigo, nome ou pontuação.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-N03 | VALIDAR NO CÓDIGO

- Tela: Loja. Variante: principal.
- Prancha: `44_carreira_2_0.png`, coluna 3.
- Título: Mais opções de jogo.
- Apoio: Créditos e itens disponíveis.
- Conteúdo: SEU SALDO / — créditos; PACOTES DE CRÉDITOS; Pacote do catálogo / R$ —; ITENS COM CRÉDITOS; Boosts / — créditos; Olheiro extra / — créditos; Histórico de compras / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Quantidade de pacotes, nomes, valores, duração e efeito dos boosts vêm do catálogo. Não criar preço, promoção, assinatura ou moeda nova. Compra via linha contextual, sem CTA de compra genérico.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-N03 | VALIDAR NO CÓDIGO

- Tela: Histórico de compras. Variante: Histórico.
- Prancha: `45_carreira_2_0.png`, coluna 1.
- Título: Suas compras.
- Apoio: Consulte os registros da loja.
- Conteúdo: HISTÓRICO DE COMPRAS; Item comprado / —; Data / —; Valor pago / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar à loja. 
- Dados e validação: Campos visuais mínimos; confirmar quais dados existem no histórico real. Sem inventar reembolso, comprovante ou status.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-N04 | VALIDAR NO CÓDIGO

- Tela: Premiações. Variante: principal.
- Prancha: `45_carreira_2_0.png`, coluna 2.
- Título: Quem fez a diferença.
- Apoio: Prêmios da temporada.
- Conteúdo: Temporada / —; PREMIAÇÕES; Artilheiro / —; Melhor jogador / —.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: Adicionar apenas prêmios reais do catálogo; etc. não autoriza inventar categorias. Sem nota ou ranking de prêmio.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 

### CAP07-T03 | VALIDAR NO CÓDIGO

- Tela: Central de ajuda. Variante: principal.
- Prancha: `45_carreira_2_0.png`, coluna 3.
- Título: Como podemos ajudar?
- Apoio: Encontre respostas e entre em contato.
- Conteúdo: Pergunta frequente / +; Pergunta frequente / −; Resposta da central de ajuda: —; Contato / ›.
- Ação principal: sem CTA global; ações contextuais. Secundária: Voltar ao clube. 
- Dados e validação: FAQ expansível com pergunta/resposta do conteúdo real; canal de contato não informado. Não inventar telefone, e-mail ou chat.
- Não mostrar: números de camisa, fotos, valores inventados, notas, gráficos, IA, timers, preços ou opções não especificados. 
