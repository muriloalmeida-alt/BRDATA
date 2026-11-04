import type { Team } from "../domain/types.ts";
import { crestSrc } from "../adapters/gateways.ts";
import { IconArrow, IconHome, IconUsers, IconCalendar, IconMore } from "./icons.tsx";
import type { HomeModel } from "../domain/home.ts";
import { legacyHref } from "../adapters/legacy.ts";
import { BASE, Link } from "./router.tsx";

export function Wordmark() {
  return <span className="wordmark" role="img" aria-label="BRDATA">BR<b>DATA</b></span>;
}

// Escudo oficial (public/img/teams/) ou monograma nas cores do clube.
export function Crest({ team, size }: { team: Team; size: number }) {
  const src = crestSrc(team);
  return (
    <span className="crest" style={{ width: size, height: size }}>
      {src
        ? <img src={src} alt="" width={size} height={size} />
        : <span className="crest-mono" style={{ background: `linear-gradient(160deg, ${team.c1 || "#5b6676"}, ${team.c2 || "#1d2430"})`, fontSize: Math.round(size * 0.32) }}>{(team.short || team.name || "?").slice(0, 3).toUpperCase()}</span>}
    </span>
  );
}

// Destinos globais — as quatro abas são telas da v2 (P7: Jogos e Mais
// passaram a ter tela de entrada própria).
export function TabBar({ current }: { current: "inicio" | "elenco" | "jogos" | "mais" }) {
  const tabs = [
    { id: "inicio", label: "Início", href: "/carreira/", Icon: IconHome },
    { id: "elenco", label: "Elenco", href: `${BASE}/elenco`, Icon: IconUsers },
    { id: "jogos", label: "Jogos", href: `${BASE}/jogos`, Icon: IconCalendar },
    { id: "mais", label: "Mais", href: `${BASE}/mais`, Icon: IconMore },
  ] as const;
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {tabs.map(({ id, label, href, Icon }) => (
        <Link key={id} className="tab" to={href} aria-current={id === current ? "page" : undefined}><Icon />{label}</Link>
      ))}
    </nav>
  );
}

// Camisa neutra (desenho próprio, não extraído das pranchas). Dentro vai o
// OVERALL real do jogador — o jogo não tem número de camisa (decisão de
// 01/11). Goleiro em verde; selecionado com contorno lima; vaga vazia
// tracejada com "+".
export function Jersey({ value, gk, selected, empty, size = 46 }: { value?: number | string; gk?: boolean; selected?: boolean; empty?: boolean; size?: number }) {
  const cls = `jersey${gk ? " jersey--gk" : ""}${selected ? " jersey--sel" : ""}${empty ? " jersey--empty" : ""}`;
  return (
    <svg className={cls} width={size} height={Math.round(size * 0.9)} viewBox="0 0 64 58" aria-hidden="true">
      <path className="jersey-body" d="M22 3 12 7 2.5 16.5l7.5 9.5 5.5-4V55h33V22l5.5 4 7.5-9.5L52 7 42 3c-2 4-5.8 6-10 6s-8-2-10-6Z" />
      <path className="jersey-collar" d="M22 3c2 4 5.8 6 10 6s8-2 10-6" />
      <text x="32" y="39" textAnchor="middle">{empty ? "+" : value}</text>
    </svg>
  );
}

// CTA principal da semana. "Preparar partida" abre o Pré-jogo da v2,
// "Avançar semana" a Semana concluída e "Ir para o amistoso" o Pré-jogo de
// amistoso (fase 3); "Próxima temporada" segue na versão atual (fase 5).
export function CtaLink({ cta, className }: { cta: HomeModel["cta"]; className: string }) {
  const inner = <>{cta.label}<IconArrow className="cta-arrow" /></>;
  // Fase 3: avançar semana e amistoso são telas da v2; só a próxima
  // temporada (fase 5) ainda abre a versão anterior.
  const to = cta.action === "preparar" ? `${BASE}/pre-jogo`
    : cta.action === "avancar-semana" ? `${BASE}/semana?avancar=semana`
    : cta.action === "amistoso" ? `${BASE}/amistoso` : null;
  return to
    ? <Link className={className} to={to}>{inner}</Link>
    : <a className={className} href={legacyHref(cta.action)}>{inner}</a>;
}
