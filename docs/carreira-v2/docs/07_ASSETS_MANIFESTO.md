# 07 — Assets, proveniência e status
## Conteúdo deste pacote
- `assets/referencias/`: quatro PNGs de direção visual, **somente referência**.
- `assets/qa/`: captura real reprovada, **somente anti-referência**.
- `assets/provisorios/`: 38 arquivos WebP (8 cenários, 9 personagens, 9 texturas, 12 elementos), recortados de prancha gerada; resolução limitada e fundos incorporados. **Não aptos para hero full-screen nem personagens transparentes.**
- Não contém escudos oficiais nem logo oficial: consumir do repositório existente para evitar duplicação/desatualização.
## Pendências reais para produção
- MAR-01: wordmark horizontal BRDATA transparente e lockup aprovado.
- MAR-02: confirmar símbolo oficial (escudo atual vs conceito visual).
- CEN-01: túnel noturno, retrato + paisagem em WebP alta resolução.
- PERS-01: treinador de costas com canal alfa verdadeiro, PNG/WebP.
- CEN-02: estádio noturno cheio, mobile + desktop.
- CEN-03: torcida celebrando.
- CEN-04: campo em plano aberto para partidas.
- CEN-05: estádio para gestão.
- Fotos de jogadores/notícias: usar somente com direitos de uso e fonte confiável; fallback com iniciais/texto.
## Política de uso
Não servir referências ou recortes provisórios como hero final. Não fazer upscale e afirmar que virou produção. Não extrair escudos de imagem gerada. Usar assets oficiais já versionados em `public/img/teams/`.
Ao receber novos assets: validar dimensões, alfa, licença, compressão, foco, contraste e recorte mobile/desktop; atualizar manifesto e screenshots.
