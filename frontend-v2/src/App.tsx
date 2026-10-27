import { useCallback, useEffect, useState } from "react";
import { CareerGateway, SessionGateway } from "./adapters/gateways";
import { HttpError } from "./adapters/http";
import type { Career, SessionUser } from "./domain/contracts";
import { Dashboard } from "./screens/Dashboard";
import { Login } from "./screens/Login";
import { ErrorState, Loading, NoCareer } from "./screens/States";
import { Soon } from "./screens/Soon";
import { Shell } from "./ui/Shell";

type Boot =
  | { s: "loading" } | { s: "anon" } | { s: "error"; msg: string }
  | { s: "ready"; user: SessionUser; career: Career | null };

const TITLES: Record<string, string> = { clube: "Clube", jogos: "Jogos", competicoes: "Competições", mais: "Mais", mercado: "Mercado", tatica: "Tática", financas: "Finanças" };
const currentRoute = () => (location.hash.replace(/^#\/?/, "").split("/")[0] || "inicio");

export function App() {
  const [boot, setBoot] = useState<Boot>({ s: "loading" });
  const [route, setRoute] = useState(currentRoute());

  const load = useCallback(async () => {
    setBoot({ s: "loading" });
    try {
      const user = await SessionGateway.me();
      if (!user) { setBoot({ s: "anon" }); return; }
      const career = await CareerGateway.loadActive();
      setBoot({ s: "ready", user, career });
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { setBoot({ s: "anon" }); return; } // sessão expirada
      setBoot({ s: "error", msg: e instanceof Error ? e.message : "Erro inesperado." });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const on = () => { setRoute(currentRoute()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  if (boot.s === "loading") return <Loading />;
  if (boot.s === "anon") return <Login onLogged={load} />;
  if (boot.s === "error") return <ErrorState message={boot.msg} onRetry={load} />;
  const { user, career } = boot;
  const unread = (career?.notifications as { read?: boolean }[] | undefined)?.filter((n) => !n.read).length ?? 0;
  return (
    <Shell route={route} user={user} unread={unread}>
      {!career ? <NoCareer />
        : route === "inicio" ? <Dashboard career={career} user={user} />
        : <Soon title={TITLES[route] ?? "Em construção"} />}
    </Shell>
  );
}
