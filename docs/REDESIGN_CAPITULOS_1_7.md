# Redesign BRDATA — Capítulos 1 a 7 (relatório central)

> Branch local `rebranding` (a partir de `main`). **Sem push, PR, merge ou
> deploy** e sem Railway Agent. Conclusão técnica ≠ aceite visual: as telas
> estão prontas para revisão do GPT/Murilo, não aprovadas.

Documentos ligados:
- `docs/REDESIGN_ASSETS.md` — inventário de assets, pendências (CEN/PERS/MAR) e diferenças por tela.
- `docs/relatorios/RELATORIO_CAP01.md`, `RELATORIO_CAP02.md`, `RELATORIO_CAP03_A_07.md` — por tela: dados/handlers, funcionalidades, testes, capturas, divergências e "Prompt para GPT".
- `docs/redesign-evidencias/` — folhas comparativas (referência × captura real; 390×844, 430×932, 360×780 e 1280×800). Gerar de novo: `tools/capture/dev-server.sh 8791` + `capture-cap01.js` / `capture-game.js` + `contact-sheet.js`.

## 1. Decisões de Produto tomadas nesta execução (Murilo, 27/10/2026)

| Tema | Decisão | Efeito |
|---|---|---|
| Login social (Google/Apple/PlayStation) | Não implementar agora | Botões não aparecem; divergência registrada |
| "Esqueci minha senha" | Não implementar agora (não há provedor de e-mail) | Link não aparece |
| Duração da temporada no onboarding | Não implementar | Campo omitido |
| Dificuldade inicial | Não implementar | Campo omitido |
| Estratégia de assets | Híbrida (WebP p/ cena e foto, PNG/WebP com alfa p/ personagem, SVG só p/ ícone, UI em HTML/CSS) | Cenas que eu tinha desenhado em SVG foram removidas; pendências em `REDESIGN_ASSETS.md` |

## 2. Decisões pendentes (precisam de resposta)

1. **Zoom de acessibilidade.** As diretrizes dos pacotes pedem "não bloquear zoom"; existe pedido explícito anterior do usuário para *bloquear zoom em qualquer situação* (meta viewport de `carreira.html` + `test_ux_zoom_scroll`). Mantive o bloqueio. Liberar = trocar a meta e atualizar aquele teste.
2. **Símbolo da marca (MAR-02).** As referências usam um escudo com contorno lima e estrela; o oficial no repositório é o escudo branco com seta (`img/brand-icon.png`). Usei o oficial.
3. **Escudo sem "chapinha" clara.** Para seguir a referência aprovada, escudos grandes (grade de clubes, topo, primeira entrada) aparecem sem o disco claro que um pedido antigo tinha introduzido por contraste; no lugar, contorno/sombra no próprio `<img>`. Os escudos pequenos das listas mantêm o disco. Confirmar se aceita.
4. **Confiança da diretoria.** O jogo não tinha esse número. Criei um indicador **derivado e só de leitura** (não muda regra de demissão), com as parcelas expostas: base 50; meta (+20 dentro, −4 por posição fora, máx −30, só depois da 1ª rodada); forma (média de pontos das últimas 5 − 1,3) × 12; −15 por temporada seguida sem meta; (reputação − 50) × 0,2. Validar a fórmula.

## 3. Funcionalidades criadas

| Funcionalidade | Onde | Backend / persistência |
|---|---|---|
| Progresso real do carregamento (etapas do boot, sem % simulada) | Cap. 1 T01 | — |
| Mostrar/ocultar senha | Cap. 1 T02 | — |
| Selo "Mais popular" com contagem real de carreiras por competição | Cap. 1 T03 | `GET /api/career/competition-popularity` |
| Escolha de clube em grade com escudos oficiais, busca por nome/cidade, Favoritos, Região (UF), estado vazio + limpar | Cap. 1 T04 | `PUT /api/account/career-favorites` (`users.careerFavorites`) |
| Configurar carreira: nome, nacionalidade, foto (reduzida a 160×160 no aparelho) | Cap. 1 T05 | `PUT /api/account/coach-profile` (`coachNationality`, `coachAvatar` ≤ 60 KB) |
| Primeira entrada (só ao criar carreira/assumir clube) | Cap. 1 T06 | — |
| Escudos oficiais de `img/teams/` em todo o Modo Técnico (antes: monograma na Série A de exemplo) | todos | — |
| Cabeçalho: marca, notificações com contagem real, perfil; abas contextuais | Cap. 2 | — |
| Navegação Início · Clube · Jogos · Competições · Mais | Cap. 2 | — |
| Início com saudação real, próximo jogo, faixa de desempenho, confiança, forma V/E/D, objetivos, destaques, notícia, mini-tabela, ações rápidas | Cap. 1 T07 / Cap. 2 T01 | — |
| Painel Jogos: calendário por mês (Brasileirão + Copa), filtro por competição, Resultados, detalhe em bottom sheet | Cap. 2 T07 | — |
| Elenco: indicadores (jogadores/aptos/lesionados/suspensos), filtros por posição, busca, ordenação | Cap. 2 T02 | — |
| Perfil do jogador em abas (Visão geral/Atributos/Evolução/Contrato), ações sempre visíveis | Cap. 2 T03 | — |
| Diretoria: confiança explicada, pressão (temporadas sem meta), objetivos da temporada | Cap. 2 T05 / Cap. 6 T02 | — |
| Finanças: receitas × despesas por categoria do extrato real, toque abre extrato filtrado | Cap. 2 T06 | — |
| Atalho da Comissão Técnica no Clube | Cap. 2 T04 | — |
| Esquemas: renomear (validação de duplicado) e "usado na rodada X" | Cap. 3 T04 | campo opcional `lastUsedRound` no esquema |
| Perfil do treinador com foto/nacionalidade e edição | Cap. 6 T01 | mesmo endpoint de perfil |
| **Gerenciamento de saves**: até 3 carreiras por conta, continuar, nova carreira em slot vazio, excluir com confirmação | Cap. 7 T02 | `careerStore` em slots (migração automática do formato antigo), `GET /api/career/slots`, `POST /api/career/slots/:id/activate`, `DELETE /api/career/slots/:id` |
| Rótulo acessível na busca do Mercado | Cap. 5 T01 | — |
| Menu "Mais" sem emojis como ícone (diretriz 3–7) | Cap. 7 T01 | — |

Compatibilidade: save antigo (envelope `{__gz}` ou objeto cru) vira o slot 1
ativo ao carregar, sem perda; `GET/PUT/DELETE /api/career` continuam
idênticos para o cliente. Campos novos são opcionais (contas e esquemas
antigos funcionam sem eles).

## 4. Arquivos alterados

- `public/carreira.html` — telas de entrada, Configurar carreira, Primeira entrada, cabeçalho/abas/nav, Início, painel Jogos, Elenco, Diretoria, Finanças, Meus saves, Editar perfil.
- `public/css/brdata-redesign.css` (novo) — componentes `bd-*` sobre os tokens `--m3-*`.
- `public/js/carreira.js` — lógica das telas acima.
- `public/img/redesign/` (novo) — vetores limpos do pacote (fundo, overlays).
- `public/sw.js` — app shell inclui a folha nova e o fundo.
- `server/server.js`, `server/src/careerStore.js`, `server/src/users.js` — endpoints e slots.
- `tests/e2e/` — helper `_startup.js` atravessa as telas novas; 11 testes atualizados para a marcação nova (com comentário do porquê); 2 testes novos (`test_redesign_caps_1_7.js`, `test_redesign_a11y_responsivo.js`).
- `tools/capture/` (novo) — servidor isolado e roteiros de captura usados nas evidências.

## 5. Testes

Suíte completa (`node run_parallel.js --isolated-server`, servidor isolado):

| Rodada | Resultado |
|---|---|
| Linha de base (`main`, antes de qualquer mudança) | 153/154 (`test_cup`, intermitente conhecido) |
| Após Cap. 1–2 | 146/154 — 8 testes presos à marcação/cor antiga (nav de 6 itens, chips do elenco, chapinha do escudo, spinner, campo do login, cor do nome no perfil); nenhum de regra de jogo. Atualizados com comentário do porquê |
| **Final (Cap. 1–7)** | **156/156** (154 anteriores + `test_redesign_caps_1_7` + `test_redesign_a11y_responsivo`) |

Testes novos:
- `test_redesign_caps_1_7.js` — 16 verificações: competição, escudos oficiais, busca/vazio/limpar, favoritos persistidos, nome obrigatório, nacionalidade e foto salvas, primeira entrada, Início sem dado inventado, confiança = soma das parcelas, Jogos, filtros do Elenco, renomear esquema, e saves (nova carreira, continuar, excluir).
- `test_redesign_a11y_responsivo.js` — em 360×780, 390×844, 430×932 e 1280×800: sem rolagem horizontal em 12 telas, campos com rótulo, alvos ≥ 40 px nos componentes novos, CTA do Início fora da navegação; zoom registrado como decisão pendente. Encontrou e corrigiu: busca do Mercado sem rótulo.
- `test_save_limit_001_careerstore.js` — +3 verificações (migração para slots, slots independentes, exclusão/popularidade).

Acessibilidade também coberta pelos testes já existentes (`test_a11y_modais`: papel de diálogo, foco preso e devolvido; `prefers-reduced-motion` global).
