# BRDATA — Capítulo 2 / Tela 01 — Visão do Clube

**Estado:** direção visual aprovada pelo usuário; implementação pendente.
**Referência obrigatória:** `../assets/tela-01/REFERENCIA_VISUAL_APROVADA.png` (imagem de composição, não asset de produção).
**Diretrizes:** `00_DIRETRIZES_GERAIS_BRDATA.md`.

## 1. Objetivo da experiência
Criar um centro de comando do treinador: identificar clube e competição, compreender situação atual, acessar próximo jogo e tomar decisões de elenco, tática, mercado e clube. Priorizar ação e leitura, sem reduzir a tela a blocos empilhados.

## 2. Composição visual aprovada (ordem e intenção)
1. **Cabeçalho integrado ao cenário:** marca BRDATA, pesquisa/notificações/perfil se suportados ou implementados; clube e competição com escudo oficial. Respeitar safe area.
2. **Navegação contextual horizontal:** Visão geral (ativa), Elenco, Tática, Calendário, Competições, Finanças. Permitir scroll horizontal deliberado com indicador e alvos íntegros; nunca truncar textos sem affordance. Rotas reais e sem destinos duplicados.
3. **Hero cinematográfico:** estádio e treinador em plano de fundo independente, saudação personalizada com nome do treinador. Visual deve respirar, com contraste por gradiente.
4. **Próximo jogo em destaque, lado direito do hero em telas largas:** escudos oficiais, competição, rodada, data/hora, local e CTA “Ver detalhes”. Em mobile estreito, posicionar abaixo da saudação, sem sobreposição. CTA abre detalhe/pré-jogo real.
5. **Faixa de desempenho:** posição, jogos, gols marcados e sofridos. Só exibir estatísticas que tenham dados reais; derivar métricas de fonte confiável e explicitar período.
6. **Faixa analítica:** confiança da diretoria, desempenho recente (sequência V/E/D) e objetivos da temporada com progresso verificável. Os gráficos devem ser HTML/SVG, acessíveis e com rótulos.
7. **Destaques do elenco:** até quatro jogadores reais, com nome, posição e avaliação/condição apenas se disponível. Fotos reais somente quando existentes/licenciadas; caso contrário avatar neutro. Ao tocar, abrir jogador.
8. **Notícias do clube:** notícia real da carreira; na ausência, estado vazio útil sem manchete inventada.
9. **Ações rápidas:** Ajustar tática, Mercado e Relatório do elenco; cada ação abre destino funcional.
10. **Navegação inferior:** Início, Clube, Jogos, Competições, Mais. Fixa com safe area, sem cobrir conteúdo; reservar padding inferior no scroll. Não duplicar a navegação contextual de modo confuso.

## 3. Responsividade
- Mobile principal: 360–430 px CSS; composição em uma coluna, hero e jogo sem colisões, indicadores em grid adaptativo, faixas roláveis somente quando justificadas.
- Tablet: duas colunas onde couberem com conforto; dashboard continua orientado a ação.
- Desktop: largura máxima controlada, hero e próximo jogo lado a lado, análises distribuídas sem alongar linhas.
- Barra inferior não pode esconder último conteúdo; suporte a orientação, fontes ampliadas e teclado.

## 4. Estados e interações
- Carregando: skeleton discreto sem saltos de layout.
- Erro: mensagem contextual e tentar novamente, sem apagar a carreira.
- Sem partida futura: estado informativo com acesso ao calendário.
- Sem objetivos/notícias/avaliações: estado vazio honesto, não zeros artificiais.
- Notificações: badge só com contagem real e ação para a lista.
- Cards clicáveis: semântica de botão/link, foco visível, feedback de toque e destino real.
- Todos os dados mudam com o save/clube selecionado e atualizam após partidas e transações.

## 5. Engenharia e critérios de aceite
1. Inspecionar `public/carreira.html`, `public/js/carreira.js`, estilos e backend reais; documentar origem de cada dado e handler.
2. Desenvolver lacunas funcionais identificadas, incluindo endpoints, persistência e testes quando necessários; não apenas copiar layout.
3. Reusar logos dos clubes do repositório; validar escudos para todos os clubes mostrados.
4. Reconstruir cenário como recurso limpo separado e otimizado (WebP/AVIF, tamanhos responsivos); não extrair a foto com texto sobreposto da referência.
5. Usar CSS/SVG para gráficos, badges, barras e ícones. Os SVGs fornecidos são apoio, não substituem os ícones da biblioteca do projeto.
6. Testar com saves distintos, clube sem próximo jogo, competição diferente, elenco incompleto e rede lenta.
7. Verificar sobreposição, scroll horizontal, safe areas, contraste, teclado, leitor de tela e texto ampliado.
8. Apresentar screenshots reais de mobile e desktop, comparativo com a referência e matriz item a item (fiel / divergente / bloqueado).
9. Rodar suíte existente + testes novos, documentando comandos e resultados.
10. Não realizar deploy ou operações remotas sem autorização.

## 6. Entrega do Claude
- Código e testes locais, assets de produção com origem documentada.
- `docs/RELATORIO_CAP02_TELA01.md` com decisões, arquivos alterados, funcionalidades criadas, evidências e pendências.
- Seção final **Prompt para GPT** para auditoria independente de fidelidade visual e funcional.
