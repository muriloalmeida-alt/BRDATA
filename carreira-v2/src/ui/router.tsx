// Navegação interna da v2 (History API, sem dependência nova). Rotas:
//   /carreira/                       Início
//   /carreira/escalacao              Escalação
//   /carreira/escalacao/trocar?…     Quem entra? (vaga=N | reserva=id)
// O servidor devolve o index.html para qualquer caminho sem extensão
// abaixo de /carreira/ (server.js), então recarregar funciona.
import { useEffect, useRef, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

export const BASE = "/carreira";
const EVT = "bd:navigate";

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const state = { v2from: location.pathname + location.search };
  if (opts.replace) history.replaceState(history.state, "", to);
  else history.pushState(state, "", to);
  window.dispatchEvent(new Event(EVT));
  window.scrollTo(0, 0);
}

// Voltar para `to`: usa o histórico quando a tela anterior é exatamente
// essa (o botão "voltar" do sistema continua coerente); senão substitui.
export function goBackTo(to: string) {
  if (history.state && history.state.v2from === to) history.back();
  else navigate(to, { replace: true });
}

// Voltar para a tela anterior da v2, qualquer que seja; aberta direto (sem
// histórico da v2), vai para `fallback`.
export function goBack(fallback: string) {
  if (history.state && history.state.v2from) history.back();
  else navigate(fallback, { replace: true });
}

export function useLocation() {
  const read = () => ({ path: location.pathname.replace(/\/+$/, "") || "/", search: location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener("popstate", on);
    window.addEventListener(EVT, on);
    return () => { window.removeEventListener("popstate", on); window.removeEventListener(EVT, on); };
  }, []);
  return loc;
}

export function Link({ to, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={onClick} {...rest} />;
}

// Foco ao trocar de tela (AUD-05). Depois de uma navegação (link, voltar ou
// avançar do navegador), o foco vai para o título da nova tela (o 1º <h1>,
// ou [data-screen-title]) — quem usa leitor de tela ouve onde está, e o Tab
// recomeça do topo da tela nova. tabIndex -1: focável só por programa; o
// contorno aparece só para quem navega por teclado (:focus-visible).
// Não roda na primeira carga nem quando só o estado da tela muda (minuto,
// placar, gravação): só quando caminho ou consulta mudam.
export function focusScreen(): boolean {
  const root = document.getElementById("root");
  if (!root || root.hasAttribute("inert")) return false;
  const target = root.querySelector<HTMLElement>("[data-screen-title], h1");
  if (!target) return false;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  return document.activeElement === target;
}

export function useScreenFocus(key: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    focusScreen();
  }, [key]);
}

// Foco perdido (o elemento focado sumiu numa troca de estado — ex.: o
// "Preparando a partida…" deu lugar à partida): recoloca no título.
export function refocusIfLost() {
  const a = document.activeElement;
  // Também conta como perdido: foco dentro da página escondida da ponte.
  const inHiddenFrame = !!a && a.tagName === "IFRAME" && a.getAttribute("aria-hidden") === "true";
  if (!a || a === document.body || !a.isConnected || inHiddenFrame) focusScreen();
}
