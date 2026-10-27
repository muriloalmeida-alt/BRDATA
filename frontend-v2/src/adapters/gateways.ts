import { fetchJSON } from "./http";
import type { Career, SessionUser } from "../domain/contracts";

// SessionGateway — mesmas rotas do jogo atual (server/server.js).
export const SessionGateway = {
  async me(): Promise<SessionUser | null> {
    const r = await fetchJSON<{ authenticated: boolean; user?: SessionUser }>("/api/auth/me");
    return r.authenticated && r.user ? r.user : null;
  },
  async login(email: string, password: string): Promise<SessionUser> {
    const r = await fetchJSON<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return r.user;
  },
  async logout(): Promise<void> {
    await fetchJSON("/api/auth/logout", { method: "POST", body: "{}" });
  },
};

// CareerGateway — SOMENTE LEITURA nesta fatia: a v2 não grava o save
// (evita duas implementações escrevendo a mesma carreira — doc 01/04).
export const CareerGateway = {
  async loadActive(): Promise<Career | null> {
    const r = await fetchJSON<{ career: Career | null }>("/api/career");
    return r.career ?? null;
  },
};
