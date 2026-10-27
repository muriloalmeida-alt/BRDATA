import { Bell, House, Menu, Shield, Trophy, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionUser } from "../domain/contracts";
import { initials } from "../domain/dashboard";

const NAV = [
  { route: "inicio", label: "Início", Icon: House },
  { route: "clube", label: "Clube", Icon: Shield },
  { route: "jogos", label: "Jogos", Icon: CalendarDays },
  { route: "competicoes", label: "Competições", Icon: Trophy },
  { route: "mais", label: "Mais", Icon: Menu },
] as const;

// Bottom nav = destinos globais; sem abas no header disputando prioridade
// (doc 02/03). Notificações e perfil no header leve.
export function Shell({ route, user, unread, children }: { route: string; user: SessionUser; unread: number; children: ReactNode }) {
  return (
    <>
      <div className="shell">
        <header className="topbar">
          <a className="brand" href="#/inicio" aria-label="BRDATA — Início"><img src="/img/brand-icon.png" alt="" /><b>BR<span>DATA</span></b></a>
          <a className="icon-btn" href="#/mais" aria-label={unread ? `Notificações: ${unread} não lidas` : "Notificações"}><Bell size={22} aria-hidden />{unread > 0 && <i className="dot" />}</a>
          <a className="icon-btn" href="#/mais" aria-label="Perfil"><span className="avatar" aria-hidden>{initials(user.name || "T")}</span></a>
        </header>
        <main id="conteudo">{children}</main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {NAV.map(({ route: r, label, Icon }) => (
          <a key={r} href={`#/${r}`} aria-current={route === r ? "page" : undefined}><Icon size={22} aria-hidden /><span>{label}</span></a>
        ))}
      </nav>
    </>
  );
}
