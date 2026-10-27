# 02 — Design System BRDATA Carreira 2.0
## Princípios
Cinematográfico, sóbrio, navy quase preto, lima como acento **funcional**, fluido e orientado à ação. Sem grades de cards genéricos.
A cena visual é uma camada fotográfica limpa; texto, controles e dados são DOM reais. Não usar screenshot inteira como background.
## Tokens iniciais (calibrar visualmente)
- `--bg:#06111c`; `--surface:#0b1927`; `--surface-2:#102235`
- `--text:#f5f7fa`; `--muted:#a5b4c4`; `--accent:#b4e64b`; `--line:rgba(170,197,220,.16)`
- `--danger:#ef5c62`; `--success:#b4e64b`
- Fonte UI: Inter ou Space Grotesk; fonte display condensada **somente** para placar/números específicos, nunca em toda saudação.
- Mobile: H1 28–32px/1.08, H2 22–24px, body 14–16px/1.45, meta 12–13px, números 22–28px.
- Espaços: 4/8/12/16/24/32/48; gutter 20px mobile; não usar valores arbitrários para compensar layout.
- Touch targets ≥44×44 CSS px; inputs 48–56px; CTA principal 48–56px.
- Radius: 12/18/24, reservando pill para ação e filtros. Evitar bordas em todos os blocos.
## Shell
Safe areas iOS: padding-top/bottom com `env(safe-area-inset-*)`; nav inferior não cobre conteúdo, com padding de reserva.
Não criar header + abas + bottom nav disputando a mesma prioridade. Bottom nav = destinos globais; tabs = contexto local, com overflow controlado.
Texto dinâmico em português; não hardcodar nomes de usuário, clubes, rodadas ou valores.
Suporte a 360, 390, 430, 768 e 1280px; altura baixa, teclado aberto, zoom do sistema, reduced-motion.
## Ícones e imagens
Lucide ou vetores simples consistentes; escudos oficiais do repo, fallback explícito.
Cenários WebP responsivos, `object-fit:cover` e overlays CSS para contraste; personagens com alfa verdadeiro somente quando fornecidos.
Nunca ampliar recorte pequeno; não converter asset provisório em “alta resolução” alterando metadados.
## Estados
Loading real, skeleton discreto, empty contextual, erro com retry, toast acima da nav, confirmação destrutiva clara, acessibilidade de foco.
