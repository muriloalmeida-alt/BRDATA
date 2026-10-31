import { useCallback, useEffect, useState } from "react";
import { CareerGateway, ClubCatalogGateway, HttpError, SessionGateway } from "./adapters/gateways.ts";
import { buildHome, type HomeModel } from "./domain/home.ts";
import { Home } from "./screens/Home.tsx";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "home"; model: HomeModel };

// Sessão → carreira ativa → Início. Sem sessão ou sem carreira, a v2 ainda
// não tem login/criação próprios: volta para a versão atual, que trata os
// dois casos (e retorna aqui depois, se aberta por /carreira-v2).
export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const user = await SessionGateway.current();
      if (!user) { location.replace("/carreira"); return; }
      const career = await CareerGateway.loadActive();
      if (!career) { location.replace("/carreira"); return; }
      const teamById = await ClubCatalogGateway.forCareer(career);
      setState({ kind: "home", model: buildHome(career, teamById) });
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { location.replace("/carreira"); return; }
      setState({ kind: "error", message: "Não foi possível carregar." });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state.kind === "loading") {
    return <div className="state" role="status" aria-live="polite"><div className="state-line" />Carregando…</div>;
  }
  if (state.kind === "error") {
    return <div className="state" role="alert">{state.message}<button className="state-btn" onClick={load}>Tentar novamente</button></div>;
  }
  return <Home m={state.model} />;
}
