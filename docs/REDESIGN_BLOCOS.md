# Redesign — Blocos 1 a 5 (referência visual aprovada)

> Pacote "BRDATA_Implementacao_Visual_Claude" + imagem-composta (44 telas).
> Branch `claude/redesign-blocos`, sobre a fundação (PR #47: paleta navy +
> lima, bottom sheets). Decisões do Murilo: lima fixo pra todo clube; só
> tema escuro. Só apresentação: nenhuma regra de negócio, salvamento, API
> ou ativo alterado; nenhum fluxo novo (ex.: "Esqueci minha senha", busca
> de clube e "Reduzir movimento" nas Configurações aparecem na imagem mas
> não existem no jogo — não foram criados).

## Por bloco

| Bloco | Telas da imagem | O que mudou | Situação |
|---|---|---|---|
| 1 Entrada | 01–08 | Splash com marca BRDATA / MODO CARREIRA, slogan e luz de estádio em gradiente (o projeto não tem foto de estádio — não foi inventada); login com a marca e campos direto no fundo ("Bem-vindo de volta!"); competição e clube como lista contínua com divisores e chevron lima; título do onboarding na fonte do DS | Implementado |
| 2 Clube/Elenco | 09–16 | `--m3-primary-container` de oliva pra verde escuro sobre navy (cartões de destaque); Bebas Neue → fonte display do DS em todos os títulos/nomes (canvas das imagens de compartilhar mantido) | Implementado |
| 3 Tática/Treino | 17–24 | Nenhuma mudança específica: campo, segmentos lima, abas e botões já seguem a referência com a paleta nova | Validado por captura |
| 4 Partidas | 26–33 | Nenhuma mudança específica: pré-jogo, ao vivo (gol), resultado com estatísticas, notícias, resultados e tabela com escudos já consistentes | Validado por captura |
| 5 Estados | 35–44 | Regra global de `prefers-reduced-motion` (F15); filtro, confirmação, loading e toasts já seguem o padrão (sheet embaixo, toast acima da nav) | Implementado / validado |

## Testes

Uma suíte completa por bloco com mudança (`node run_parallel.js --isolated-server`):
bloco 1 — 152/153 (login: painel agora sem fundo, teste atualizado);
bloco 2 — 153/153; bloco 5 — 151/153 (`test_cup`, `test_resumo_rodada`:
intermitentes de carga, passam sozinhos). Capturas 390×844 por bloco no
scratchpad da sessão (`redesign/b1..b5`).

## Pendências / não feito

- **Confirmação destrutiva (F05): feito** (26/10, aprovado pelo Murilo) —
  `confirmModal(texto, rótulo, { danger: true })` deixa o botão vermelho
  (`--m3-error`); usado em Apagar esquema, Demitir comissão, Dispensar
  olheiro e Apagar e reiniciar. Coberto por `test_confirm_modals` (3).
- **Hero do jogador com foto, anel de condição em %:** a referência mostra
  foto do atleta; o jogo não tem fotos de jogadores.
- **Menu principal em tela cheia (06):** o jogo usa menu popover + nav
  inferior; arquitetura mantida (o pacote proíbe duplicar destinos).
- **Dashboard com abas Visão/Finanças/Objetivos (09):** não existem no
  jogo como abas; não criadas.
- Desktop: validado só nas sheets (fundação); telas por bloco foram
  capturadas no celular.

## Aceite

Aceite do redesign (blocos 1–5) dado pelo Murilo em 26/10/2026.

## Prompt para GPT

"Revise esta entrega como responsável por Produto/Design. Compare a
implementação (`docs/REDESIGN_FUNDACAO.md`, `docs/REDESIGN_BLOCOS.md`,
branch `claude/redesign-blocos`) com a direção visual e a imagem-composta
das 44 telas. Avalie consistência visual, usabilidade mobile, fidelidade às
funções existentes, acessibilidade, regressões, evidências e pendências
(listadas acima). Não assuma validação sem consultar testes e capturas.
Liste bloqueadores, ajustes e decisão de aceite."
