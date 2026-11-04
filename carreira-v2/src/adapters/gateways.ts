// Camada anticorrupção (docs/carreira-v2/docs/04): a v2 conversa com o
// servidor existente só por estas portas. Única escrita: a escalação
// (decisão de 01/11), pelo MESMO PUT /api/career da versão atual — sem
// API, schema ou formato novos. Antes de gravar, relê o save do servidor
// e aplica só a mudança de escalação por cima dele (o servidor não tem
// controle de conflito; ver inventário R2).
import type { Career, Team } from "../domain/types.ts";
import { applyLineupChange, type LineupChange } from "../domain/lineup.ts";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (body && body.error) || `Erro ${res.status}`);
  return body as T;
}

export interface SessionUser {
  id: string; name: string;
  // Login diário (recompensa): dia da sequência e data local da última coleta.
  dailyLogin?: { currentStreakDay: number; lastClaimDate: string | null };
}

export const SessionGateway = {
  async current(): Promise<SessionUser | null> {
    const me = await getJSON<{ authenticated: boolean; user?: SessionUser }>("/api/auth/me");
    return me.authenticated && me.user ? { ...me.user, id: String(me.user.id) } : null;
  },
  // Novo login no meio da partida (AUD-02, sessão expirada ao gravar o
  // resultado). Mesmo POST /api/auth/login do formulário da versão atual
  // (submitCtLogin), com a mesma regra de pagamento pendente.
  async login(email: string, password: string): Promise<{ user: SessionUser } | { error: string }> {
    const res = await fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, password }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (body && body.error) || "E-mail ou senha incorretos." };
    const user = body && body.user;
    if (!user) return { error: "Não foi possível entrar. Tente de novo." };
    if (user.planStatus && user.planStatus !== "active") return { error: "Sua conta tem um pagamento pendente — finalize na página inicial para liberar o acesso." };
    return { user: { id: String(user.id), name: user.name } };
  },
  // Sair (menu Mais): mesmo POST /api/auth/logout da versão anterior.
  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  },
  // Nome do treinador (configurar carreira) — mesmo PUT /api/account/name
  // da versão anterior (submitSetup).
  async updateName(name: string): Promise<SessionUser> {
    const res = await fetch("/api/account/name", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ name }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, (body && body.error) || "Não foi possível salvar seu nome.");
    return body.user as SessionUser;
  },
};

export const CareerGateway = {
  // Carreira ativa da conta (GET /api/career). null = sem carreira.
  async loadActive(): Promise<Career | null> {
    const r = await getJSON<{ career: Career | null }>("/api/career");
    return r.career;
  },
  // Relê → aplica a mudança → grava (mesmo corpo e mesmo campo updatedAt
  // que persistCareer() do legado). Devolve a carreira gravada, ou o
  // motivo do conflito (nada gravado).
  async updateLineup(change: LineupChange): Promise<{ career: Career } | { conflict: string }> {
    const fresh = await this.loadActive();
    if (!fresh) throw new HttpError(404, "Carreira não encontrada.");
    const next = applyLineupChange(fresh, change);
    if ("conflict" in next) return next;
    next.updatedAt = Date.now();
    const res = await fetch("/api/career", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(next) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, (body && body.error) || `Erro ${res.status}`);
    return { career: next };
  },
};

// Catálogo de clubes: escudos OFICIAIS do repositório (public/img/teams/),
// nunca imagens geradas. Fonte, em ordem: times gravados no próprio save
// (CAREER.divisionTeams) → catálogo de exemplo public/js/data.js →
// monograma (sigla) quando não há escudo.
const LOCAL_CRESTS = new Set(["fla", "pal", "bot", "for", "int", "sao", "cor", "cap", "cam", "flu", "san", "bra", "juv", "cui", "gre", "cru", "bah", "vas", "vit"]);

// Escudos com leitura ruim sobre o fundo escuro da v2 (contorno com
// contraste abaixo de 2:1 contra #080E18): a v2 usa a versão negativa
// (tons neutros invertidos, cores do clube mantidas), em public/img/teams/*_neg.*.
// A versão anterior desenha o escudo sobre uma chapinha clara e segue com o original.
export const NEGATIVE_CRESTS = new Set(["atc_b", "bot", "cri_b", "fla", "gre", "nvz_b", "ope_b", "san", "sao", "vas", "vit"]);
export function negativeCrest(src: string): string {
  const m = /^(\/img\/teams\/)([a-z0-9_]+)\.(svg|png)$/.exec(src);
  return m && NEGATIVE_CRESTS.has(m[2]) ? `${m[1]}${m[2]}_neg.${m[3]}` : src;
}
export function crestSrc(t: Team | undefined): string | null {
  if (!t) return null;
  if (t.logo) return t.logo.startsWith("http") ? t.logo : negativeCrest(t.logo.startsWith("/") ? t.logo : `/${t.logo}`);
  return LOCAL_CRESTS.has(String(t.id)) ? negativeCrest(`/img/teams/${t.id}.svg`) : null;
}

type DemoGlobals = Record<string, Team[] | undefined>;
let demoLoad: Promise<Team[]> | null = null;
function loadDemoCatalog(): Promise<Team[]> {
  if (!demoLoad) {
    demoLoad = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "/js/data.js";
      s.onload = () => {
        // data.js declara catálogos com `const` no escopo global de script:
        // acessíveis por nome a partir daqui, não por window.
        const g = new Function("try { return { a: DEMO_TEAMS, b: DEMO_TEAMS_SERIE_B, c: DEMO_TEAMS_SERIE_C }; } catch (e) { return {}; }")() as DemoGlobals;
        resolve([...(g.a || []), ...(g.b || []), ...(g.c || [])]);
      };
      s.onerror = () => resolve([]);
      document.head.appendChild(s);
    });
  }
  return demoLoad;
}

export const ClubCatalogGateway = {
  async forCareer(career: Career): Promise<(id: string | number) => Team> {
    const fromSave = Object.values(career.divisionTeams || {}).flat();
    const pool = fromSave.length ? fromSave : await loadDemoCatalog();
    const map = new Map(pool.map((t) => [String(t.id), t]));
    return (id) => {
      const t = map.get(String(id));
      if (t) return t;
      if (String(id) === String(career.clubId)) return { id, name: career.clubName, short: career.clubShort, logo: career.clubLogo };
      return { id, name: "Adversário" };
    };
  },
};
