// Navegação interna da v2 (History API, sem dependência nova). Rotas:
//   /carreira-v2/                       Início
//   /carreira-v2/escalacao              Escalação
//   /carreira-v2/escalacao/trocar?…     Quem entra? (vaga=N | reserva=id)
// O servidor devolve o index.html para qualquer caminho sem extensão
// abaixo de /carreira-v2/ (server.js), então recarregar funciona.
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

export const BASE = "/carreira-v2";
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
