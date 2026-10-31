import type { Team } from "../domain/types.ts";
import { crestSrc } from "../adapters/gateways.ts";
import { IconHome, IconUsers, IconCalendar, IconMore } from "./icons.tsx";
import { legacyHref } from "../adapters/legacy.ts";

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

// Destinos globais. Enquanto Elenco/Jogos/Mais não existem na v2, abrem a
// tela equivalente na versão atual (decisão de 31/10).
export function TabBar({ current }: { current: "inicio" | "elenco" | "jogos" | "mais" }) {
  const tabs = [
    { id: "inicio", label: "Início", href: "/carreira-v2/", Icon: IconHome },
    { id: "elenco", label: "Elenco", href: legacyHref("elenco"), Icon: IconUsers },
    { id: "jogos", label: "Jogos", href: legacyHref("jogos"), Icon: IconCalendar },
    { id: "mais", label: "Mais", href: legacyHref("mais"), Icon: IconMore },
  ] as const;
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {tabs.map(({ id, label, href, Icon }) => (
        <a key={id} className="tab" href={href} aria-current={id === current ? "page" : undefined}><Icon />{label}</a>
      ))}
    </nav>
  );
}
